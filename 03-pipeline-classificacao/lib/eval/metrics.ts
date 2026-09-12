import type { Categoria } from '../domain/categorias';
import type { Candidato } from '../pipeline/candidates';
import type { Veredicto } from '../pipeline/rules';

export interface ItemResultado {
  id: string;
  texto: string;
  valor: number;
  categoriaCorreta: Categoria;
  candidatos: Candidato[];
  categoriaPrevista: Categoria;
  confianca: number;
  baixaConfianca: boolean;
  veredicto: Veredicto;
  top1Correto: boolean;
  topKCorreto: boolean;
}

export interface Metricas {
  total: number;
  top1Accuracy: number;
  topKAccuracy: number;
  taxaBaixaConfianca: number;
  /** matrizConfusao[correta][prevista] = contagem */
  matrizConfusao: Record<string, Record<string, number>>;
  /** Falsos positivos por categoria prevista: previu X, mas a categoria correta não era X. */
  falsosPositivosPorCategoria: Record<string, number>;
}

export function avaliarItem(
  item: { id: string; texto: string; valor: number; categoriaCorreta: Categoria },
  resultado: { candidatos: Candidato[]; categoriaEscolhida: Categoria; confianca: number; baixaConfianca: boolean; veredicto: Veredicto },
): ItemResultado {
  const top1Correto = resultado.categoriaEscolhida === item.categoriaCorreta;
  const topKCorreto = resultado.candidatos.some(c => c.categoria === item.categoriaCorreta);

  return {
    id: item.id,
    texto: item.texto,
    valor: item.valor,
    categoriaCorreta: item.categoriaCorreta,
    candidatos: resultado.candidatos,
    categoriaPrevista: resultado.categoriaEscolhida,
    confianca: resultado.confianca,
    baixaConfianca: resultado.baixaConfianca,
    veredicto: resultado.veredicto,
    top1Correto,
    topKCorreto,
  };
}

export function calcularMetricas(itens: ItemResultado[]): Metricas {
  const total = itens.length;
  const top1 = itens.filter(i => i.top1Correto).length;
  const topK = itens.filter(i => i.topKCorreto).length;
  const baixaConfianca = itens.filter(i => i.baixaConfianca).length;

  const matrizConfusao: Record<string, Record<string, number>> = {};
  const falsosPositivosPorCategoria: Record<string, number> = {};

  for (const item of itens) {
    matrizConfusao[item.categoriaCorreta] ??= {};
    matrizConfusao[item.categoriaCorreta][item.categoriaPrevista] =
      (matrizConfusao[item.categoriaCorreta][item.categoriaPrevista] ?? 0) + 1;

    if (!item.top1Correto) {
      falsosPositivosPorCategoria[item.categoriaPrevista] =
        (falsosPositivosPorCategoria[item.categoriaPrevista] ?? 0) + 1;
    }
  }

  return {
    total,
    top1Accuracy: total ? top1 / total : 0,
    topKAccuracy: total ? topK / total : 0,
    taxaBaixaConfianca: total ? baixaConfianca / total : 0,
    matrizConfusao,
    falsosPositivosPorCategoria,
  };
}
