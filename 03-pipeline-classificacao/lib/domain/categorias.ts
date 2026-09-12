/**
 * Domínio sintético: política de reembolso de despesas corporativas.
 * Nenhuma relação com política ou dado real de cliente.
 */

export type Categoria =
  | 'alimentacao'
  | 'hospedagem'
  | 'transporte'
  | 'combustivel'
  | 'material_escritorio'
  | 'entretenimento'
  | 'bebidas_alcoolicas'
  | 'outro';

export const CATEGORIAS: Categoria[] = [
  'alimentacao',
  'hospedagem',
  'transporte',
  'combustivel',
  'material_escritorio',
  'entretenimento',
  'bebidas_alcoolicas',
  'outro',
];

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  alimentacao: 'Alimentação',
  hospedagem: 'Hospedagem',
  transporte: 'Transporte',
  combustivel: 'Combustível',
  material_escritorio: 'Material de escritório',
  entretenimento: 'Entretenimento',
  bebidas_alcoolicas: 'Bebidas alcoólicas',
  outro: 'Outro',
};

/** Categorias proibidas por política — reprovação automática, não é sobre limite de valor. */
export const CATEGORIAS_PROIBIDAS: ReadonlySet<Categoria> = new Set([
  'entretenimento',
  'bebidas_alcoolicas',
]);

/** Teto de valor por categoria (R$). Ausente = sem teto de valor definido. */
export const LIMITE_VALOR: Partial<Record<Categoria, number>> = {
  alimentacao: 60,
  hospedagem: 300,
  transporte: 200,
  combustivel: 250,
  material_escritorio: 150,
};

/**
 * Frases-exemplo por categoria, usadas como índice para a geração de
 * candidatos por similaridade de embedding (etapa 1 do pipeline). Não é o
 * dataset de avaliação — são só âncoras semânticas da categoria.
 */
export const EXEMPLARES: Record<Categoria, string[]> = {
  alimentacao: [
    'almoço em restaurante',
    'jantar de trabalho com cliente',
    'lanche da tarde durante viagem a serviço',
    'refeição no aeroporto entre conexões',
  ],
  hospedagem: [
    'diária de hotel durante viagem a trabalho',
    'pousada para pernoite em visita técnica',
    'hospedagem em cidade diferente da base',
  ],
  transporte: [
    'passagem de ônibus para outra cidade',
    'corrida de aplicativo até o aeroporto',
    'táxi entre o hotel e o escritório do cliente',
    'passagem aérea para viagem a trabalho',
  ],
  combustivel: [
    'abastecimento do carro da empresa',
    'gasolina para veículo de visita técnica',
    'combustível para deslocamento entre bases',
  ],
  material_escritorio: [
    'compra de papelaria para o escritório',
    'cartucho de impressora e material de escritório',
    'itens de papelaria para a equipe',
  ],
  entretenimento: [
    'ingresso de cinema',
    'show ou casa noturna',
    'entrada em parque de diversões',
  ],
  bebidas_alcoolicas: [
    'cerveja ou drinque em bar',
    'garrafa de vinho',
    'consumo de bebida alcoólica em restaurante',
  ],
  outro: [
    'despesa não identificada',
    'item fora das categorias de viagem a trabalho',
    'compra sem descrição clara do motivo',
  ],
};
