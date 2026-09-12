import { generateObject } from 'ai';
import { z } from 'zod';

const MODEL = process.env.CLASSIFICACAO_MODEL ?? 'anthropic/claude-haiku-4-5';
const TIMEOUT_MS = 6000;

// Preços ilustrativos (USD por 1M tokens) só para a demo de tracing de
// custo ter um número — não são o preço oficial do modelo. Em produção,
// isto viria da tabela de preços real do AI Gateway.
const CUSTO_ENTRADA_POR_1M = 1.0;
const CUSTO_SAIDA_POR_1M = 5.0;

export const CategoriaFeedback = z.enum(['bug', 'sugestao', 'elogio', 'duvida', 'reclamacao']);
export const SentimentoFeedback = z.enum(['positivo', 'neutro', 'negativo']);
export const PrioridadeFeedback = z.enum(['baixa', 'media', 'alta']);

export interface ClassificacaoFeedback {
  categoria: z.infer<typeof CategoriaFeedback>;
  sentimento: z.infer<typeof SentimentoFeedback>;
  prioridade: z.infer<typeof PrioridadeFeedback>;
}

export interface ResultadoClassificacao {
  classificacao: ClassificacaoFeedback;
  /** true = a IA falhou/expirou e isto veio do fallback heurístico, não do modelo. */
  fallback: boolean;
  sucesso: boolean;
  latenciaMs: number;
  modelo: string;
  custoEstimadoUsd: number;
  erro?: string;
}

/**
 * Classifica com IA, com timeout e fallback heurístico determinístico se a
 * IA falhar ou expirar — a aplicação nunca fica sem resposta só porque o
 * provedor de IA teve um problema. `fallback: true` fica registrado no
 * resultado e na tabela `chamadas_ia` (ver lib/ai/tracing.ts), visível no
 * dashboard de observabilidade — controle de qualidade honesto, não
 * escondido atrás de uma resposta que parece normal.
 */
export async function classificarFeedback(texto: string): Promise<ResultadoClassificacao> {
  const inicio = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resultado = await generateObject({
      model: MODEL,
      abortSignal: controller.signal,
      schema: z.object({
        categoria: CategoriaFeedback,
        sentimento: SentimentoFeedback,
        prioridade: PrioridadeFeedback,
      }),
      prompt: `Classifique o feedback de cliente a seguir — categoria, sentimento e prioridade de resposta:\n\n${texto}`,
    });

    return {
      classificacao: resultado.object,
      fallback: false,
      sucesso: true,
      latenciaMs: Date.now() - inicio,
      modelo: MODEL,
      custoEstimadoUsd: estimarCusto(resultado.usage.inputTokens, resultado.usage.outputTokens),
    };
  } catch (err) {
    return {
      classificacao: classificarHeuristico(texto),
      fallback: true,
      sucesso: false,
      latenciaMs: Date.now() - inicio,
      modelo: MODEL,
      custoEstimadoUsd: 0,
      erro: limparAnsi(err instanceof Error ? err.message : String(err)),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** O AI SDK formata alguns erros com cores de terminal (ANSI) — sem sentido persistir/exibir isso na tabela de observabilidade. */
function limparAnsi(texto: string): string {
  return texto.replace(/\x1b\[[0-9;]*m/g, '').trim();
}

function estimarCusto(inputTokens: number | undefined, outputTokens: number | undefined): number {
  const entrada = ((inputTokens ?? 0) / 1_000_000) * CUSTO_ENTRADA_POR_1M;
  const saida = ((outputTokens ?? 0) / 1_000_000) * CUSTO_SAIDA_POR_1M;
  return Number((entrada + saida).toFixed(6));
}

/**
 * Fallback determinístico por palavra-chave — deliberadamente simples.
 * Existe pra garantir uma resposta válida quando a IA falha, não pra ser
 * tão boa quanto a IA (se fosse, não precisaríamos da IA).
 */
export function classificarHeuristico(texto: string): ClassificacaoFeedback {
  const t = texto.toLowerCase();

  const categoria: ClassificacaoFeedback['categoria'] = /erro|bug|quebrou|travou|não funciona/.test(t)
    ? 'bug'
    : /sugir|sugest|poderia ter|seria bom|seria legal/.test(t)
      ? 'sugestao'
      : /ótimo|otimo|adorei|excelente|parabéns|parabens/.test(t)
        ? 'elogio'
        : /\?|como fa|dúvida|duvida|não sei|nao sei/.test(t)
          ? 'duvida'
          : 'reclamacao';

  const sentimento: ClassificacaoFeedback['sentimento'] = /ótimo|otimo|adorei|excelente|parabéns|parabens/.test(t)
    ? 'positivo'
    : /péssimo|pessimo|horrível|horrivel|erro|bug|travou|quebrou/.test(t)
      ? 'negativo'
      : 'neutro';

  const prioridade: ClassificacaoFeedback['prioridade'] = categoria === 'bug' ? 'alta' : categoria === 'reclamacao' ? 'media' : 'baixa';

  return { categoria, sentimento, prioridade };
}
