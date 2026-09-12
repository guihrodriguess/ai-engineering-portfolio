import { ToolLoopAgent, isStepCount, type InferAgentUIMessage } from 'ai';
import { z } from 'zod';
import { buildTools } from './tools';
import { appendTrace } from './engine/traceStore';

const MODEL = process.env.AGENT_MODEL ?? 'anthropic/claude-sonnet-5';

const INSTRUCTIONS = `Você é um agente de suporte ao cliente de um e-commerce.

Regras:
- Sempre busque o pedido (buscarPedido) antes de falar sobre status, valor ou itens.
- Nunca emita reembolso ou cancele um pedido sem ter certeza do pedidoId correto.
- Se uma ferramenta não for aprovada pelo humano, NÃO tente chamá-la de novo na mesma conversa — explique ao cliente que a ação requer aprovação e ficará pendente.
- Seja direto e objetivo nas respostas, em português.`;

/**
 * Agente de suporte com controle de execução:
 *
 * - `toolApproval`: reembolsos acima de R$150 e qualquer cancelamento de
 *   pedido exigem aprovação humana (Human-in-the-Loop) antes de executar.
 * - `stopWhen`: limite de passos para evitar loops descontrolados.
 * - Callbacks de ciclo de vida: emitem eventos de trace por passo e por
 *   chamada de ferramenta, além do tracing já feito dentro de cada
 *   ferramenta por `withControls` (retry/timeout/idempotência).
 *
 * `callOptionsSchema` + `prepareCall` fixam o `chatId` da conversa nas
 * ferramentas (para isolar trace e idempotência por conversa).
 */
export const supportAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: INSTRUCTIONS,
  tools: buildTools('__default__'),
  stopWhen: isStepCount(8),
  toolApproval: {
    cancelarPedido: 'user-approval',
    emitirReembolso: async ({ valor }) =>
      valor > 150
        ? { type: 'user-approval', requestReason: `Reembolso de R$${valor.toFixed(2)} acima do limite de autoaprovação (R$150)` }
        : undefined,
  },
  callOptionsSchema: z.object({ chatId: z.string() }),
  prepareCall: ({ options, ...settings }) => {
    const { chatId } = options;
    return {
      ...settings,
      tools: buildTools(chatId),
      onStart: () => {
        appendTrace({ type: 'agent-start', chatId, ts: Date.now() });
      },
      onStepStart: ({ stepNumber }: { stepNumber: number }) => {
        appendTrace({ type: 'step-start', chatId, ts: Date.now(), stepNumber });
      },
      onStepEnd: ({
        stepNumber,
        toolCalls,
        finishReason,
        content,
      }: {
        stepNumber: number;
        toolCalls: Array<{ toolName: string }>;
        finishReason: string;
        content: Array<{
          type: string;
          isAutomatic?: boolean;
          toolCall?: { toolName: string; toolCallId: string };
          approvalId?: string;
          reason?: string;
        }>;
      }) => {
        appendTrace({
          type: 'step-end',
          chatId,
          ts: Date.now(),
          stepNumber,
          toolCalls: toolCalls.map(tc => tc.toolName),
          finishReason,
        });
        for (const part of content) {
          if (part.type === 'tool-approval-request' && !part.isAutomatic && part.toolCall) {
            appendTrace({
              type: 'approval-requested',
              chatId,
              ts: Date.now(),
              toolName: part.toolCall.toolName,
              toolCallId: part.toolCall.toolCallId,
              approvalId: part.approvalId ?? 'sem-id',
              reason: part.reason,
            });
          }
        }
      },
      onEnd: ({ steps }: { steps: unknown[] }) => {
        appendTrace({ type: 'agent-end', chatId, ts: Date.now(), steps: steps.length });
      },
    };
  },
});

export type SupportAgentUIMessage = InferAgentUIMessage<typeof supportAgent>;
