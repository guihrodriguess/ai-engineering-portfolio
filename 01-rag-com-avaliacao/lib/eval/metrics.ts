import type { ItemEval } from './dataset';
import type { ResultadoRag } from '../rag/pipeline';

export interface ItemResultadoEval {
  id: string;
  pergunta: string;
  docsEsperados: string[];
  respondivelEsperado: boolean;
  respondivel: boolean;
  fontes: string[];
  resposta: string | null;
  fallback: string | null;
  /** Posição (1-based) do primeiro chunk relevante no ranking de rerank; null se não apareceu nos N recuperados. */
  rankPrimeiroRelevante: number | null;
  citacaoCorreta: boolean | null;
}

export interface MetricasRag {
  total: number;
  respondiveisNoDataset: number;
  naoRespondiveisNoDataset: number;
  /** Entre as respondíveis: a categoria correta apareceu entre os top-K usados como contexto. */
  recallAtK: number;
  /** Mean Reciprocal Rank do primeiro doc relevante, no ranking pós-rerank. */
  mrr: number;
  /** Entre as não-respondíveis do dataset: % em que o sistema corretamente recusou responder. */
  taxaFallbackCorreto: number;
  /** Entre as respondíveis do dataset: % em que o sistema recusou por engano (falso negativo — cautela excessiva). */
  taxaFalsoFallback: number;
  /** Entre as respondidas de fato (respondivel=true) com pergunta respondível: % que citou a fonte certa. */
  taxaCitacaoCorreta: number;
}

const TOP_K_CONTEXTO = 3;

export function avaliarItem(item: ItemEval, resultado: ResultadoRag): ItemResultadoEval {
  const ranking = resultado.chunksRerankeados;
  const indiceRelevante = ranking.findIndex(c => item.docsEsperados.includes(c.docId));
  const rankPrimeiroRelevante = indiceRelevante === -1 ? null : indiceRelevante + 1;

  const citacaoCorreta =
    item.respondivelEsperado && resultado.respondivel
      ? resultado.fontes.some(f => item.docsEsperados.includes(f))
      : null;

  return {
    id: item.id,
    pergunta: item.pergunta,
    docsEsperados: item.docsEsperados,
    respondivelEsperado: item.respondivelEsperado,
    respondivel: resultado.respondivel,
    fontes: resultado.fontes,
    resposta: resultado.resposta,
    fallback: resultado.fallback,
    rankPrimeiroRelevante,
    citacaoCorreta,
  };
}

export function calcularMetricas(itens: ItemResultadoEval[]): MetricasRag {
  const respondiveis = itens.filter(i => i.respondivelEsperado);
  const naoRespondiveis = itens.filter(i => !i.respondivelEsperado);

  const recallAtK = respondiveis.length
    ? respondiveis.filter(i => i.rankPrimeiroRelevante !== null && i.rankPrimeiroRelevante <= TOP_K_CONTEXTO).length /
      respondiveis.length
    : 0;

  const mrr = respondiveis.length
    ? respondiveis.reduce((soma, i) => soma + (i.rankPrimeiroRelevante ? 1 / i.rankPrimeiroRelevante : 0), 0) /
      respondiveis.length
    : 0;

  const taxaFallbackCorreto = naoRespondiveis.length
    ? naoRespondiveis.filter(i => !i.respondivel).length / naoRespondiveis.length
    : 0;

  const taxaFalsoFallback = respondiveis.length
    ? respondiveis.filter(i => !i.respondivel).length / respondiveis.length
    : 0;

  const respondidasDeFato = respondiveis.filter(i => i.respondivel);
  const taxaCitacaoCorreta = respondidasDeFato.length
    ? respondidasDeFato.filter(i => i.citacaoCorreta).length / respondidasDeFato.length
    : 0;

  return {
    total: itens.length,
    respondiveisNoDataset: respondiveis.length,
    naoRespondiveisNoDataset: naoRespondiveis.length,
    recallAtK,
    mrr,
    taxaFallbackCorreto,
    taxaFalsoFallback,
    taxaCitacaoCorreta,
  };
}
