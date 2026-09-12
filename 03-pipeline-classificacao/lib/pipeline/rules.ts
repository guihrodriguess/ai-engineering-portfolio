import { CATEGORIAS_PROIBIDAS, CATEGORIA_LABEL, LIMITE_VALOR, type Categoria } from '../domain/categorias';

export type Veredicto = 'APROVADO' | 'REPROVADO' | 'ATENCAO';

export interface ResultadoRegra {
  veredicto: Veredicto;
  motivos: string[];
}

/**
 * Camada de regras determinísticas — a mesma categoria escolhida pela IA
 * pode terminar em veredictos diferentes dependendo do valor. A IA decide
 * "o que é"; a regra decide "o que fazer com isso" — separação deliberada
 * (a regra de valor não deveria mudar com a versão do modelo).
 */
export function validarRegras(categoria: Categoria, valor: number): ResultadoRegra {
  if (CATEGORIAS_PROIBIDAS.has(categoria)) {
    return {
      veredicto: 'REPROVADO',
      motivos: [`Categoria "${CATEGORIA_LABEL[categoria]}" não é reembolsável por política.`],
    };
  }

  if (categoria === 'outro') {
    return {
      veredicto: 'ATENCAO',
      motivos: ['Categoria não identificada com segurança — requer revisão manual.'],
    };
  }

  const limite = LIMITE_VALOR[categoria];
  if (limite !== undefined && valor > limite) {
    return {
      veredicto: 'ATENCAO',
      motivos: [
        `Valor de R$ ${valor.toFixed(2)} acima do teto de R$ ${limite.toFixed(2)} para ${CATEGORIA_LABEL[categoria]}.`,
      ],
    };
  }

  return {
    veredicto: 'APROVADO',
    motivos: [`Dentro da política para ${CATEGORIA_LABEL[categoria]}.`],
  };
}

/** Confiança de classificação abaixo disto força revisão humana, independente do valor. */
export const LIMIAR_CONFIANCA = 0.55;
