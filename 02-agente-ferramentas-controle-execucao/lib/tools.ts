import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { TimeoutError, TransientError, withControls } from './engine/controls';
import {
  buscarPedidoPorId,
  cancelarPedidoPorId,
  estoque,
  reembolsosEmitidos,
} from './data/pedidos';
import { sleep } from './engine/time';

/**
 * Ferramentas do agente de suporte. Cada `execute` é envolvido por
 * `withControls`, que adiciona retry com backoff, timeout por tentativa,
 * dedupe por idempotência e tracing — sem que a lógica de negócio da
 * ferramenta precise saber disso.
 *
 * `buildTools` recebe o `chatId` da conversa atual e o injeta no contexto
 * passado a `withControls`, para que o tracing e a idempotência fiquem
 * isolados por conversa.
 */
export function buildTools(chatId: string): ToolSet {
  return {
    buscarPedido: tool({
      description:
        'Busca os dados de um pedido pelo ID (status, valor, itens). Use antes de qualquer outra ação sobre o pedido.',
      inputSchema: z.object({
        pedidoId: z.string().describe('ID do pedido, ex: PED-1001'),
      }),
      execute: async ({ pedidoId }, { toolCallId }) =>
        withControls(
          'buscarPedido',
          async (input: { pedidoId: string }, signal: AbortSignal, attempt: number) => {
            // Simula uma falha transitória na primeira tentativa, para
            // demonstrar o retry com backoff de forma determinística.
            if (attempt === 1) {
              throw new TransientError(
                'Serviço de pedidos indisponível momentaneamente',
              );
            }
            await sleep(150, signal);
            const pedido = buscarPedidoPorId(input.pedidoId);
            if (!pedido) {
              // Erro de negócio (pedido não existe) — não é transitório,
              // não deve ser tentado de novo.
              throw new Error(`Pedido ${input.pedidoId} não encontrado`);
            }
            return pedido;
          },
          { maxAttempts: 3, timeoutMs: 3000 },
        )({ pedidoId }, { chatId, toolCallId }),
    }),

    verificarEstoque: tool({
      description: 'Verifica a quantidade em estoque de um SKU.',
      inputSchema: z.object({
        sku: z.string().describe('SKU do produto, ex: SKU-MOUSE'),
      }),
      execute: async ({ sku }, { toolCallId }) =>
        withControls(
          'verificarEstoque',
          async (input: { sku: string }, signal: AbortSignal) => {
            // SKU-SLOW simula um sistema de estoque lento, que excede o
            // timeout por tentativa — demonstra o TimeoutError + retry.
            const delayMs = input.sku === 'SKU-SLOW' ? 6000 : 200;
            await sleep(delayMs, signal);
            return {
              sku: input.sku,
              quantidade: estoque[input.sku] ?? 0,
            };
          },
          { maxAttempts: 3, timeoutMs: 2000 },
        )({ sku }, { chatId, toolCallId }),
    }),

    emitirReembolso: tool({
      description:
        'Emite reembolso para um pedido. Reembolsos acima de R$150 exigem aprovação humana antes de executar.',
      inputSchema: z.object({
        pedidoId: z.string(),
        valor: z.number().positive(),
        motivo: z.string().describe('Motivo do reembolso, para o registro'),
      }),
      execute: async ({ pedidoId, valor, motivo }, { toolCallId }) =>
        withControls(
          'emitirReembolso',
          async (input: { pedidoId: string; valor: number; motivo: string }) => {
            // Invariante de negócio: nunca reembolsar o mesmo pedido duas
            // vezes — mesmo que o dedupe genérico de call não pegue (ex:
            // o motivo do segundo pedido é diferente do primeiro).
            const existente = reembolsosEmitidos.get(input.pedidoId);
            if (existente) {
              return {
                pedidoId: input.pedidoId,
                status: 'ja_reembolsado' as const,
                ...existente,
              };
            }
            const registro = {
              valor: input.valor,
              motivo: input.motivo,
              emitidoEm: Date.now(),
            };
            reembolsosEmitidos.set(input.pedidoId, registro);
            return {
              pedidoId: input.pedidoId,
              status: 'reembolsado' as const,
              ...registro,
            };
          },
          { maxAttempts: 2, timeoutMs: 3000 },
        )({ pedidoId, valor, motivo }, { chatId, toolCallId }),
    }),

    cancelarPedido: tool({
      description:
        'Cancela um pedido. Ação destrutiva: sempre exige aprovação humana antes de executar.',
      inputSchema: z.object({
        pedidoId: z.string(),
        motivo: z.string(),
      }),
      execute: async ({ pedidoId, motivo }, { toolCallId }) =>
        withControls(
          'cancelarPedido',
          async (input: { pedidoId: string; motivo: string }) => {
            const pedido = cancelarPedidoPorId(input.pedidoId);
            if (!pedido) {
              throw new Error(`Pedido ${input.pedidoId} não encontrado`);
            }
            return { pedido, motivo: input.motivo };
          },
          { maxAttempts: 2, timeoutMs: 3000 },
        )({ pedidoId, motivo }, { chatId, toolCallId }),
    }),
  } satisfies ToolSet;
}

export { TimeoutError, TransientError };
