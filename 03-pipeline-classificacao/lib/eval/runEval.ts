import { DATASET_AVALIACAO } from '../domain/dataset';
import { classificar } from '../pipeline/pipeline';
import { avaliarItem, calcularMetricas, type ItemResultado, type Metricas } from './metrics';

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

export interface ResultadoAvaliacao {
  itens: ItemResultado[];
  metricas: Metricas;
  simulado: boolean;
}

/**
 * Roda o pipeline de classificação sobre todo o dataset rotulado e agrega as
 * métricas. Concorrência limitada (5 por vez) — em modo real são 2 chamadas
 * de IA por item (embedding + rerank); sem limite, 40 itens disparariam 80
 * chamadas simultâneas contra o AI Gateway.
 */
export async function rodarAvaliacao(simular = false): Promise<ResultadoAvaliacao> {
  const itens = await comConcorrenciaLimitada(DATASET_AVALIACAO, 5, async item => {
    const resultado = await classificar({ texto: item.texto, valor: item.valor, simular });
    return avaliarItem(item, resultado);
  });

  return { itens, metricas: calcularMetricas(itens), simulado: simular };
}
