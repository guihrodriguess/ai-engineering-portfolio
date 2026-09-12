import { gerarCandidatos, gerarCandidatosSimulado, type Candidato } from './candidates';
import { rerankComIA, rerankSimulado } from './rerank';
import { LIMIAR_CONFIANCA, validarRegras, type Veredicto } from './rules';
import type { Categoria } from '../domain/categorias';

export interface ResultadoClassificacao {
  texto: string;
  valor: number;
  candidatos: Candidato[];
  categoriaEscolhida: Categoria;
  confianca: number;
  justificativa: string;
  baixaConfianca: boolean;
  veredicto: Veredicto;
  motivos: string[];
  simulado: boolean;
}

export interface ClassificarInput {
  texto: string;
  valor: number;
  simular?: boolean;
}

/**
 * Orquestra as 3 etapas do pipeline:
 *  1. gerarCandidatos  — embedding + similaridade, reduz 8 categorias a `k`
 *  2. rerank           — IA decide entre o shortlist e calibra confiança
 *  3. validarRegras    — regras determinísticas de negócio (valor, proibição)
 *
 * Confiança abaixo de LIMIAR_CONFIANCA força ATENCAO mesmo que a regra de
 * valor aprovasse — espelha o "confianca_leitura=baixa → revisão manual" de
 * pipelines de classificação em produção: a régua de negócio nunca aprova
 * algo que a classificação não tem certeza do que é.
 */
export async function classificar({ texto, valor, simular = false }: ClassificarInput): Promise<ResultadoClassificacao> {
  const candidatos = simular ? gerarCandidatosSimulado(texto) : await gerarCandidatos(texto);
  const rerank = simular ? rerankSimulado(candidatos) : await rerankComIA(texto, candidatos);

  const baixaConfianca = rerank.confianca < LIMIAR_CONFIANCA;
  const regra = validarRegras(rerank.categoriaEscolhida, valor);

  const veredicto: Veredicto = baixaConfianca && regra.veredicto === 'APROVADO' ? 'ATENCAO' : regra.veredicto;
  const motivos = baixaConfianca
    ? [...regra.motivos, `Confiança da classificação (${(rerank.confianca * 100).toFixed(0)}%) abaixo do limiar de ${(LIMIAR_CONFIANCA * 100).toFixed(0)}% — revisão humana recomendada.`]
    : regra.motivos;

  return {
    texto,
    valor,
    candidatos,
    categoriaEscolhida: rerank.categoriaEscolhida,
    confianca: rerank.confianca,
    justificativa: rerank.justificativa,
    baixaConfianca,
    veredicto,
    motivos,
    simulado: simular,
  };
}
