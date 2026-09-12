export interface ItemEval {
  id: string;
  pergunta: string;
  /** Documentos onde a resposta correta está — vazio se `respondivelEsperado: false`. */
  docsEsperados: string[];
  /** Se o corpus contém, de fato, informação suficiente pra responder. */
  respondivelEsperado: boolean;
}

/**
 * Dataset de avaliação: 20 perguntas respondíveis (cobrindo os 10 documentos
 * do corpus) + 6 perguntas propositalmente fora de escopo. As perguntas fora
 * de escopo são a parte mais importante do dataset — um RAG que "responde"
 * tudo com confiança, mesmo o que não está na base, é o problema clássico
 * que threshold + fallback existem pra evitar. Ver lib/eval/metrics.ts
 * (`taxaFallbackCorreto` mede exatamente isso).
 */
export const DATASET_EVAL: ItemEval[] = [
  { id: 'q01', pergunta: 'Qual o prazo de primeiro atendimento para um chamado crítico?', docsEsperados: ['doc-sla'], respondivelEsperado: true },
  { id: 'q02', pergunta: 'A cobertura de SLA funciona 24 horas por dia para chamados de prioridade normal?', docsEsperados: ['doc-sla'], respondivelEsperado: true },
  { id: 'q03', pergunta: 'Qual o teto de glosa mensal previsto no contrato?', docsEsperados: ['doc-penalidades'], respondivelEsperado: true },
  { id: 'q04', pergunta: 'Quantos dias úteis a contratada tem para contestar uma glosa aplicada?', docsEsperados: ['doc-penalidades'], respondivelEsperado: true },
  { id: 'q05', pergunta: 'Geradores de emergência de que capacidade estão cobertos pela manutenção elétrica?', docsEsperados: ['doc-eletrica'], respondivelEsperado: true },
  { id: 'q06', pergunta: 'A troca de um transformador está inclusa no contrato sem custo adicional?', docsEsperados: ['doc-eletrica'], respondivelEsperado: true },
  { id: 'q07', pergunta: 'Com que frequência a caixa d\'água precisa ser limpa?', docsEsperados: ['doc-hidraulica'], respondivelEsperado: true },
  { id: 'q08', pergunta: 'Um vazamento com risco de dano patrimonial é tratado como qual prioridade de chamado?', docsEsperados: ['doc-hidraulica'], respondivelEsperado: true },
  { id: 'q09', pergunta: 'Que treinamento é obrigatório para um técnico trabalhar em altura?', docsEsperados: ['doc-seguranca'], respondivelEsperado: true },
  { id: 'q10', pergunta: 'Em quanto tempo um acidente sem afastamento deve ser comunicado ao fiscal do contrato?', docsEsperados: ['doc-seguranca'], respondivelEsperado: true },
  { id: 'q11', pergunta: 'Por qual índice de inflação o valor do contrato é reajustado anualmente?', docsEsperados: ['doc-pagamento'], respondivelEsperado: true },
  { id: 'q12', pergunta: 'Qual o prazo de vencimento da fatura mensal a partir do recebimento da nota fiscal?', docsEsperados: ['doc-pagamento'], respondivelEsperado: true },
  { id: 'q13', pergunta: 'Para onde um chamado escala se o técnico não atender dentro do prazo de SLA?', docsEsperados: ['doc-chamados'], respondivelEsperado: true },
  { id: 'q14', pergunta: 'É possível abrir um chamado urgente por e-mail?', docsEsperados: ['doc-chamados'], respondivelEsperado: true },
  { id: 'q15', pergunta: 'A emissão de laudo de segurança NR-35 pode ser feita por um subcontratado?', docsEsperados: ['doc-subcontratacao'], respondivelEsperado: true },
  { id: 'q16', pergunta: 'Se a contratada subcontratar um serviço, ela deixa de ser responsável pelo SLA desse serviço?', docsEsperados: ['doc-subcontratacao'], respondivelEsperado: true },
  { id: 'q17', pergunta: 'Com quantos dias de antecedência é preciso avisar pra não renovar o contrato automaticamente?', docsEsperados: ['doc-vigencia'], respondivelEsperado: true },
  { id: 'q18', pergunta: 'A rescisão do contrato sem justa causa gera multa pra parte que rescindiu?', docsEsperados: ['doc-vigencia'], respondivelEsperado: true },
  { id: 'q19', pergunta: 'Em quanto tempo uma troca de equipamento deve ser registrada no inventário de ativos?', docsEsperados: ['doc-ativos'], respondivelEsperado: true },
  { id: 'q20', pergunta: 'De quem é a propriedade do histórico de manutenção ao final do contrato?', docsEsperados: ['doc-ativos'], respondivelEsperado: true },

  // ── fora de escopo — o corpus não tem essa informação ────────────────────
  { id: 'q21', pergunta: 'Qual a cor padrão do uniforme da equipe técnica?', docsEsperados: [], respondivelEsperado: false },
  { id: 'q22', pergunta: 'Quantos técnicos a contratada é obrigada a manter fixos em cada site?', docsEsperados: [], respondivelEsperado: false },
  { id: 'q23', pergunta: 'O contrato cobre manutenção de elevadores?', docsEsperados: [], respondivelEsperado: false },
  { id: 'q24', pergunta: 'Qual o horário de almoço da equipe de manutenção?', docsEsperados: [], respondivelEsperado: false },
  { id: 'q25', pergunta: 'O contrato permite faturamento em dólar?', docsEsperados: [], respondivelEsperado: false },
  { id: 'q26', pergunta: 'Quantas filiais o contratante possui no total?', docsEsperados: [], respondivelEsperado: false },
];
