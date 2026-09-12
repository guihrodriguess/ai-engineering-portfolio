import { embed, embedMany } from 'ai';
import { CATEGORIAS, EXEMPLARES, type Categoria } from '../domain/categorias';

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';

export interface Candidato {
  categoria: Categoria;
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
 * Índice de embeddings dos exemplares por categoria, calculado uma vez e
 * cacheado no processo (poucas dezenas de frases curtas — cabe em memória e
 * não muda em runtime). Um cache real entre instâncias trocaria isto por um
 * banco vetorial; aqui o índice é pequeno o bastante para não precisar.
 */
let indicePromise: Promise<{ categoria: Categoria; texto: string; embedding: number[] }[]> | null = null;

function construirIndice() {
  if (!indicePromise) {
    const entradas: { categoria: Categoria; texto: string }[] = [];
    for (const categoria of CATEGORIAS) {
      for (const texto of EXEMPLARES[categoria]) {
        entradas.push({ categoria, texto });
      }
    }
    indicePromise = embedMany({
      model: EMBEDDING_MODEL,
      values: entradas.map(e => e.texto),
    }).then(({ embeddings }) =>
      entradas.map((e, i) => ({ ...e, embedding: embeddings[i] })),
    );
  }
  return indicePromise;
}

/**
 * Geração de candidatos (etapa 1): embeda o texto de entrada e mede
 * similaridade de cosseno contra o índice de exemplares. O score de cada
 * categoria é o máximo entre seus exemplares (nearest-neighbor por
 * categoria, não centróide) — evita que uma categoria com exemplares muito
 * diversos "dilua" seu próprio score.
 *
 * Retorna os `k` candidatos mais próximos, ordenados por score desc.
 */
export async function gerarCandidatos(texto: string, k = 3): Promise<Candidato[]> {
  const [indice, { embedding: consulta }] = await Promise.all([
    construirIndice(),
    embed({ model: EMBEDDING_MODEL, value: texto }),
  ]);

  const melhorPorCategoria = new Map<Categoria, number>();
  for (const entrada of indice) {
    const score = cosseno(consulta, entrada.embedding);
    const atual = melhorPorCategoria.get(entrada.categoria) ?? -Infinity;
    if (score > atual) melhorPorCategoria.set(entrada.categoria, score);
  }

  return [...melhorPorCategoria.entries()]
    .map(([categoria, score]) => ({ categoria, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Versão determinística, sem chamar nenhum modelo — usada no modo simulação
 * (`--simular` equivalente) pra rodar a demo e a avaliação sem custo/latência
 * de API. Conta ocorrência de palavras-chave dos exemplares no texto de
 * entrada; é deliberadamente mais fraca que a versão real (não entende
 * sinônimo ou contexto), o que é o ponto: mostrar visivelmente a diferença de
 * qualidade entre o modo simulado e o pipeline real nas métricas de avaliação.
 */
export function gerarCandidatosSimulado(texto: string, k = 3): Candidato[] {
  const textoNorm = texto.toLowerCase();
  const scores = CATEGORIAS.map(categoria => {
    const palavras = EXEMPLARES[categoria]
      .join(' ')
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3);
    const unicas = [...new Set(palavras)];
    const hits = unicas.filter(p => textoNorm.includes(p)).length;
    return { categoria, score: hits / unicas.length };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, k);
}
