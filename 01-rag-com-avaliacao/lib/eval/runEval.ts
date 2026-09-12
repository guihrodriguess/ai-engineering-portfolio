import { DATASET_EVAL } from './dataset';
import { perguntar } from '../rag/pipeline';
import { avaliarItem, calcularMetricas, type ItemResultadoEval, type MetricasRag } from './metrics';
import type { EstrategiaChunking } from '../chunking/chunk';

/** Roda `fn` sobre `items` com no máximo `limite` execuções concorrentes. */
async function comConcorrenciaLimitada<T, R>(items: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let proximo = 0;
  async function worker() {
    while (true) {
      const i = proximo++;
      if (i >= items.length) return;
      resultados[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, worker));
  return resultados;
}

export interface ResultadoAvaliacaoRag {
  estrategia: EstrategiaChunking;
  simulado: boolean;
  itens: ItemResultadoEval[];
  metricas: MetricasRag;
}

export async function rodarAvaliacao(estrategia: EstrategiaChunking, simular = false): Promise<ResultadoAvaliacaoRag> {
  const itens = await comConcorrenciaLimitada(DATASET_EVAL, 4, async item => {
    const resultado = await perguntar({ pergunta: item.pergunta, estrategia, simular });
    return avaliarItem(item, resultado);
  });

  return { estrategia, simulado: simular, itens, metricas: calcularMetricas(itens) };
}

/** Roda a avaliação para as duas estratégias de chunking, pra comparação lado a lado. */
export async function rodarAvaliacaoComparativa(simular = false): Promise<ResultadoAvaliacaoRag[]> {
  return Promise.all([rodarAvaliacao('fixo', simular), rodarAvaliacao('secao', simular)]);
}
