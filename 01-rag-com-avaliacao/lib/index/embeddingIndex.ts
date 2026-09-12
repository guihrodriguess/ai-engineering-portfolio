import { embed, embedMany } from 'ai';
import { construirChunks, type Chunk, type EstrategiaChunking } from '../chunking/chunk';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';

export interface ChunkRecuperado extends Chunk {
  score: number;
}

function cosseno(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Um índice de embeddings por estratégia de chunking (fixo/seção), cacheado
 * no processo — os embeddings dos chunks não mudam entre chamadas, só a
 * pergunta do usuário precisa ser embedada a cada consulta. Um corpus maior
 * trocaria isto por um banco vetorial de verdade (pgvector, etc.); aqui o
 * índice inteiro cabe em memória.
 */
const indices = new Map<EstrategiaChunking, Promise<{ chunk: Chunk; embedding: number[] }[]>>();

function obterIndice(estrategia: EstrategiaChunking) {
  if (!indices.has(estrategia)) {
    const chunks = construirChunks(estrategia);
    indices.set(
      estrategia,
      embedMany({ model: EMBEDDING_MODEL, values: chunks.map(c => c.texto) }).then(({ embeddings }) =>
        chunks.map((chunk, i) => ({ chunk, embedding: embeddings[i] })),
      ),
    );
  }
  return indices.get(estrategia)!;
}

/** Recuperação (etapa 1): embeda a pergunta e retorna os `topN` chunks mais próximos por similaridade de cosseno. */
export async function recuperar(pergunta: string, estrategia: EstrategiaChunking, topN = 6): Promise<ChunkRecuperado[]> {
  const [indice, { embedding: consulta }] = await Promise.all([
    obterIndice(estrategia),
    embed({ model: EMBEDDING_MODEL, value: pergunta }),
  ]);

  return indice
    .map(({ chunk, embedding }) => ({ ...chunk, score: cosseno(consulta, embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Versão sem chamada de IA (modo simulação): sobreposição de palavras entre
 * pergunta e chunk. Mais fraca de propósito — mesmo racional do modo
 * simulação nos projetos 2 e 3: permite rodar demo/avaliação sem custo, e a
 * diferença de qualidade aparece nas métricas.
 */
export function recuperarSimulado(pergunta: string, estrategia: EstrategiaChunking, topN = 6): ChunkRecuperado[] {
  const chunks = construirChunks(estrategia);
  const palavrasPergunta = new Set(
    pergunta
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3),
  );

  return chunks
    .map(chunk => {
      const palavrasChunk = new Set(
        chunk.texto
          .toLowerCase()
          .split(/\W+/)
          .filter(w => w.length > 3),
      );
      const intersecao = [...palavrasPergunta].filter(p => palavrasChunk.has(p)).length;
      return { ...chunk, score: intersecao / Math.max(1, palavrasPergunta.size) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
