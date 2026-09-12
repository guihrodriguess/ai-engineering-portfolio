import { generateObject } from 'ai';
import { z } from 'zod';
import { CATEGORIA_LABEL, type Categoria } from '../domain/categorias';
import type { Candidato } from './candidates';

const RERANK_MODEL = process.env.RERANK_MODEL ?? 'anthropic/claude-haiku-4-5';

export interface Rerank {
  categoriaEscolhida: Categoria;
  confianca: number;
  justificativa: string;
}

/**
 * Reranking (etapa 2): a geração de candidatos (embedding) já reduziu o
 * espaço de 8 categorias pra um shortlist de `k`. Um modelo de linguagem
 * (mais caro por chamada, mas chamado só sobre `k` opções, não as 8) decide
 * entre elas e calibra uma confiança — papel equivalente a um cross-encoder
 * de rerank num pipeline de busca.
 *
 * Usa um modelo mais barato/rápido (Haiku) de propósito: reranking sobre um
 * shortlist pequeno não precisa do modelo mais caro — é uma decisão de custo
 * consciente, não uma limitação.
 */
export async function rerankComIA(texto: string, candidatos: Candidato[]): Promise<Rerank> {
  const opcoes = candidatos.map(c => `- ${c.categoria}: ${CATEGORIA_LABEL[c.categoria]}`).join('\n');

  const { object } = await generateObject({
    model: RERANK_MODEL,
    schema: z.object({
      categoriaEscolhida: z.enum(candidatos.map(c => c.categoria) as [Categoria, ...Categoria[]]),
      confianca: z
        .number()
        .min(0)
        .max(1)
        .describe('Confiança calibrada de 0 a 1 — não infle: 0.5 é "não tenho certeza", não "meio errado".'),
      justificativa: z.string().describe('Uma frase curta explicando a escolha.'),
    }),
    prompt: `Uma despesa corporativa foi descrita como:\n"${texto}"\n\nEscolha, entre as categorias candidatas abaixo (já pré-selecionadas por similaridade semântica), a que melhor descreve essa despesa:\n${opcoes}\n\nSe o texto menciona explicitamente um item proibido (bebida alcoólica, entretenimento), esse item pesa mais que o contexto geral da frase (ex: "jantar onde foi pedida uma cerveja" é bebida alcoólica, não alimentação — a política olha o item, não a ocasião).`,
  });

  return object;
}

/**
 * Rerank determinístico do modo simulação: pega o candidato de maior score
 * da etapa de embedding simulada e deriva uma "confiança" pela distância
 * entre o 1º e o 2º colocado (gap grande = mais confiante). Não entende
 * nuance de política (ex: item proibido citado de passagem) — de novo, de
 * propósito, pra a diferença de qualidade aparecer nas métricas.
 */
export function rerankSimulado(candidatos: Candidato[]): Rerank {
  const [primeiro, segundo] = candidatos;
  const gap = primeiro.score - (segundo?.score ?? 0);
  const confianca = Math.max(0.3, Math.min(0.95, 0.5 + gap * 2));
  return {
    categoriaEscolhida: primeiro.categoria,
    confianca: Number(confianca.toFixed(2)),
    justificativa: 'Modo simulação — escolha por maior score de palavra-chave, sem chamada de IA.',
  };
}
