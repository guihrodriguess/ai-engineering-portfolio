import { generateObject } from 'ai';
import { z } from 'zod';
import { recuperar, recuperarSimulado, type ChunkRecuperado } from '../index/embeddingIndex';
import { rerankComIA, rerankSimulado, type ChunkRerankeado } from './rerank';
import type { EstrategiaChunking } from '../chunking/chunk';

const GERACAO_MODEL = process.env.GERACAO_MODEL ?? 'anthropic/claude-haiku-4-5';

/** Score de rerank abaixo disto = contexto não confiável o suficiente pra responder. */
export const LIMIAR_SIMILARIDADE = 0.4;
const TOP_N_RETRIEVAL = 6;
const TOP_K_CONTEXTO = 3;

export type MotivoFallback = 'sem_contexto_relevante' | 'modelo_sem_confianca' | null;

export interface ResultadoRag {
  pergunta: string;
  estrategia: EstrategiaChunking;
  chunksRecuperados: ChunkRecuperado[];
  chunksRerankeados: ChunkRerankeado[];
  chunksUsados: ChunkRerankeado[];
  ultrapassouLimiar: boolean;
  respondivel: boolean;
  resposta: string | null;
  fontes: string[];
  fallback: MotivoFallback;
  simulado: boolean;
}

export interface PerguntarInput {
  pergunta: string;
  estrategia: EstrategiaChunking;
  simular?: boolean;
}

/**
 * Pipeline RAG completo, em 4 etapas:
 *
 *  1. Retrieval  — top-N chunks por similaridade de embedding (index/embeddingIndex.ts)
 *  2. Rerank     — IA rejulga a relevância real dos N chunks (rag/rerank.ts)
 *  3. Threshold  — corta em top-K, mas só os que passam do LIMIAR_SIMILARIDADE de rerank;
 *                  se nenhum passar, fallback "duro" — nem chama o modelo de geração
 *                  (economiza a chamada mais cara e evita alucinar sobre contexto ruim)
 *  4. Geração    — responde citando a fonte; o próprio modelo pode se recusar
 *                  (`respondivel: false`) se, mesmo com contexto acima do limiar,
 *                  achar que não responde à pergunta — fallback "suave"
 */
export async function perguntar({ pergunta, estrategia, simular = false }: PerguntarInput): Promise<ResultadoRag> {
  const chunksRecuperados = simular
    ? recuperarSimulado(pergunta, estrategia, TOP_N_RETRIEVAL)
    : await recuperar(pergunta, estrategia, TOP_N_RETRIEVAL);

  const chunksRerankeados = simular ? rerankSimulado(chunksRecuperados) : await rerankComIA(pergunta, chunksRecuperados);

  const acimaDoLimiar = chunksRerankeados.filter(c => c.scoreRerank >= LIMIAR_SIMILARIDADE);
  const chunksUsados = acimaDoLimiar.slice(0, TOP_K_CONTEXTO);

  if (chunksUsados.length === 0) {
    return {
      pergunta,
      estrategia,
      chunksRecuperados,
      chunksRerankeados,
      chunksUsados: [],
      ultrapassouLimiar: false,
      respondivel: false,
      resposta: null,
      fontes: [],
      fallback: 'sem_contexto_relevante',
      simulado: simular,
    };
  }

  const docIdsDisponiveis = [...new Set(chunksUsados.map(c => c.docId))] as [string, ...string[]];

  const geracao = simular
    ? gerarRespostaSimulada(pergunta, chunksUsados)
    : await gerarRespostaComIA(pergunta, chunksUsados, docIdsDisponiveis);

  return {
    pergunta,
    estrategia,
    chunksRecuperados,
    chunksRerankeados,
    chunksUsados,
    ultrapassouLimiar: true,
    respondivel: geracao.respondivel,
    resposta: geracao.respondivel ? geracao.resposta : null,
    fontes: geracao.respondivel ? geracao.fontes : [],
    fallback: geracao.respondivel ? null : 'modelo_sem_confianca',
    simulado: simular,
  };
}

interface Geracao {
  respondivel: boolean;
  resposta: string;
  fontes: string[];
}

async function gerarRespostaComIA(pergunta: string, contexto: ChunkRerankeado[], docIds: [string, ...string[]]): Promise<Geracao> {
  const contextoTexto = contexto.map(c => `[fonte: ${c.docId} — ${c.docTitulo}]\n${c.texto}`).join('\n\n');

  const { object } = await generateObject({
    model: GERACAO_MODEL,
    schema: z.object({
      respondivel: z
        .boolean()
        .describe('false se o contexto abaixo, mesmo relevante, não contém a informação específica pra responder com segurança'),
      resposta: z.string().describe('Resposta direta, citando a regra específica. Vazio se respondivel=false.'),
      fontes: z.array(z.enum(docIds)).describe('IDs dos documentos realmente usados na resposta — não liste um documento que não sustentou a resposta.'),
    }),
    prompt: `Responda à pergunta usando SOMENTE o contexto abaixo. Não use conhecimento externo. Se o contexto não contiver a resposta específica (mesmo que fale do assunto em geral), marque respondivel=false em vez de inferir ou generalizar.\n\nContexto:\n${contextoTexto}\n\nPergunta: ${pergunta}`,
  });

  return object;
}

/** Geração determinística do modo simulação: nunca infere, só ecoa o chunk de maior score de rerank. */
function gerarRespostaSimulada(_pergunta: string, contexto: ChunkRerankeado[]): Geracao {
  const melhor = contexto[0];
  return {
    respondivel: true,
    resposta: `[modo simulação — sem IA] Trecho mais relevante encontrado: "${melhor.texto}"`,
    fontes: [melhor.docId],
  };
}
