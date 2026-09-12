import { generateObject } from 'ai';
import { z } from 'zod';
import type { ChunkRecuperado } from '../index/embeddingIndex';

const RERANK_MODEL = process.env.RERANK_MODEL ?? 'anthropic/claude-haiku-4-5';

export interface ChunkRerankeado {
  chunkId: string;
  docId: string;
  docTitulo: string;
  texto: string;
  scoreRetrieval: number;
  scoreRerank: number;
}

/**
 * Reranking (etapa 2): similaridade de embedding é uma aproximação lexical
 * grosseira — dois trechos podem ter embeddings próximos sem um responder à
 * pergunta de fato. Um modelo de linguagem julga, um por um, a relevância
 * real de cada chunk recuperado (0 a 1) — o mesmo papel de um cross-encoder
 * de rerank num buscador.
 *
 * O score de rerank, não o de retrieval, é o que se compara ao limiar de
 * similaridade (ver rag/pipeline.ts) — é a etapa que efetivamente decide "dá
 * pra responder com isso ou não".
 */
export async function rerankComIA(pergunta: string, chunks: ChunkRecuperado[]): Promise<ChunkRerankeado[]> {
  const { object } = await generateObject({
    model: RERANK_MODEL,
    schema: z.object({
      avaliacoes: z
        .array(
          z.object({
            chunkId: z.string(),
            relevancia: z
              .number()
              .min(0)
              .max(1)
              .describe('0 = não ajuda a responder a pergunta; 1 = responde diretamente'),
          }),
        )
        .length(chunks.length),
    }),
    prompt: `Pergunta do usuário: "${pergunta}"\n\nAvalie a relevância de cada trecho abaixo para responder essa pergunta específica — não se é um texto bem escrito, mas se ele contém informação que ajuda a responder.\n\n${chunks
      .map(c => `[${c.chunkId}] (doc: ${c.docTitulo})\n${c.texto}`)
      .join('\n\n')}`,
  });

  const porId = new Map(object.avaliacoes.map(a => [a.chunkId, a.relevancia]));
  return chunks
    .map(c => ({
      chunkId: c.chunkId,
      docId: c.docId,
      docTitulo: c.docTitulo,
      texto: c.texto,
      scoreRetrieval: c.score,
      scoreRerank: porId.get(c.chunkId) ?? 0,
    }))
    .sort((a, b) => b.scoreRerank - a.scoreRerank);
}

/** Rerank determinístico do modo simulação: mantém a ordem de retrieval, score de rerank = score de retrieval. */
export function rerankSimulado(chunks: ChunkRecuperado[]): ChunkRerankeado[] {
  return chunks
    .map(c => ({
      chunkId: c.chunkId,
      docId: c.docId,
      docTitulo: c.docTitulo,
      texto: c.texto,
      scoreRetrieval: c.score,
      scoreRerank: c.score,
    }))
    .sort((a, b) => b.scoreRerank - a.scoreRerank);
}
