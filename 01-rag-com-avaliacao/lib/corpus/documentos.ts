/**
 * Corpus sintético: contrato fictício de manutenção predial (facilities).
 * Nenhuma relação com contrato ou cliente real. Cada documento usa marcações
 * `## Seção` internas de propósito — são o que a estratégia de chunking por
 * seção (ver lib/chunking) usa como fronteira, em vez de cortar por tamanho
 * fixo de caractere.
 */

export interface Documento {
  id: string;
  titulo: string;
  texto: string;
}

export const CORPUS: Documento[] = [
  {
    id: 'doc-sla',
    titulo: 'SLA — Tempos de Atendimento por Prioridade',
    texto: `
## Classificação de prioridade
Todo chamado aberto é classificado em uma de três prioridades: Crítica (risco à segurança ou parada total de operação), Alta (falha que compromete parte relevante da operação) e Normal (manutenção de rotina ou item sem impacto imediato).

## Tempo de resposta
Chamados Críticos devem ter o primeiro atendimento em até 2 horas úteis a partir da abertura. Chamados de prioridade Alta, em até 8 horas úteis. Chamados Normais, em até 48 horas úteis.

## Tempo de solução
A solução definitiva (não apenas o primeiro atendimento) deve ocorrer em até 24 horas para prioridade Crítica, 72 horas para Alta, e 10 dias úteis para Normal, salvo dependência de peça importada, que suspende a contagem mediante comunicação formal ao contratante.

## Horário de cobertura
A cobertura de SLA vale 24 horas por dia, 7 dias por semana, para chamados Críticos. Chamados Alta e Normal seguem o horário comercial do contrato (08h às 18h, dias úteis), salvo acordo específico por site.
`.trim(),
  },
  {
    id: 'doc-penalidades',
    titulo: 'Política de Penalidades e Glosas',
    texto: `
## Glosa por descumprimento de SLA
O descumprimento do tempo de resposta ou de solução definido no SLA gera glosa proporcional ao atraso, aplicada sobre o valor da fatura do mês de referência: 2% por hora de atraso em chamado Crítico, 0,5% por hora em chamado Alta, e 1% por dia de atraso em chamado Normal.

## Teto de glosa mensal
A soma das glosas em um mês não pode ultrapassar 20% do valor total faturado naquele mês, exceto em caso de reincidência grave (mais de 3 descumprimentos de chamado Crítico no mesmo mês), quando o teto deixa de valer.

## Reincidência e rescisão
3 meses consecutivos com glosa acima de 15% do faturamento autorizam o contratante a rescindir o contrato por justa causa, sem multa rescisória para o contratante.

## Contestação de glosa
A contratada pode contestar uma glosa em até 5 dias úteis da notificação, mediante evidência técnica do que causou o atraso (ex: acesso negado ao local, falta de informação do solicitante).
`.trim(),
  },
  {
    id: 'doc-eletrica',
    titulo: 'Escopo de Serviços — Elétrica',
    texto: `
## Serviços cobertos
Manutenção preventiva e corretiva de quadros de distribuição de baixa tensão, iluminação predial, tomadas e circuitos internos, nobreaks até 20kVA, e geradores de emergência até 150kVA.

## Serviços não cobertos
Não estão no escopo: intervenção em rede de média/alta tensão da concessionária, projetos de expansão de carga (que exigem projeto elétrico à parte), e manutenção de equipamentos de terceiros não integrados à infraestrutura predial.

## Periodicidade de preventiva
Inspeção termográfica de quadros elétricos a cada 6 meses. Teste de acionamento de gerador de emergência mensal, com registro fotográfico e de horímetro.

## Materiais
Peças de reposição de baixo valor (disjuntores, lâmpadas, tomadas) estão inclusas no contrato. Peças de médio/alto valor (transformadores, geradores completos, quadros novos) são orçadas à parte e dependem de aprovação do contratante.
`.trim(),
  },
  {
    id: 'doc-hidraulica',
    titulo: 'Escopo de Serviços — Hidráulica',
    texto: `
## Serviços cobertos
Manutenção de bombas de recalque, caixas d'água, rede hidráulica interna, sistema de esgoto predial e calhas/rufos. Limpeza de caixa d'água semestral com laudo de potabilidade.

## Serviços não cobertos
Obras de reforma estrutural do sistema hidráulico e intervenção na rede pública de saneamento não estão no escopo.

## Periodicidade de preventiva
Inspeção de bombas de recalque mensal. Limpeza de calhas trimestral, ou após qualquer evento de chuva forte reportado.

## Emergências
Vazamento com risco de dano patrimonial é tratado como chamado Crítico (ver SLA — Tempos de Atendimento), mesmo fora do horário comercial.
`.trim(),
  },
  {
    id: 'doc-seguranca',
    titulo: 'Política de Segurança do Trabalho',
    texto: `
## EPIs obrigatórios
Todo técnico em campo deve portar: capacete, óculos de proteção, luvas adequadas à atividade, calçado de segurança e, em atividades elétricas, luva isolante e detector de tensão. A ausência de EPI obrigatório autoriza a paralisação do serviço pelo fiscal do contrato.

## Trabalho em altura
Atividades acima de 2 metros exigem treinamento NR-35 válido, cinto de segurança tipo paraquedista e ponto de ancoragem certificado. É proibido trabalho em altura sozinho, sem observador.

## Bloqueio e etiquetagem (LOTO)
Toda intervenção em equipamento energizado ou pressurizado exige bloqueio físico da fonte de energia e etiquetagem visível antes do início do serviço, mesmo para testes rápidos.

## Acidentes
Qualquer acidente, mesmo sem afastamento, deve ser comunicado ao fiscal do contrato em até 1 hora e registrado em formulário próprio em até 24 horas.
`.trim(),
  },
  {
    id: 'doc-pagamento',
    titulo: 'Condições de Pagamento e Reajuste',
    texto: `
## Faturamento
O faturamento é mensal, com vencimento em 30 dias corridos a partir do recebimento da nota fiscal, desde que sem glosa pendente de resolução.

## Reajuste
O valor do contrato é reajustado anualmente pelo IPCA acumulado dos 12 meses anteriores à data-base, ou por índice setorial específico caso definido em aditivo.

## Serviços extras
Serviços fora do escopo (ver documentos de escopo por disciplina) são orçados à parte e faturados separadamente, mediante aprovação prévia por escrito do contratante antes do início da execução.

## Retenção de tributos
Impostos e contribuições retidos na fonte seguem a legislação vigente à época de cada faturamento; mudanças na legislação tributária não caracterizam reequilíbrio automático do contrato.
`.trim(),
  },
  {
    id: 'doc-chamados',
    titulo: 'Procedimento de Chamados Emergenciais',
    texto: `
## Abertura de chamado
Chamados podem ser abertos pelo portal do contratante, por telefone da central 24h, ou por e-mail para casos não urgentes. Chamados por telefone geram número de protocolo imediato, informado ao solicitante.

## Escalonamento
Se o primeiro atendimento não ocorrer dentro do prazo de SLA (ver SLA — Tempos de Atendimento), o chamado escala automaticamente para o supervisor regional, e em seguida para o gerente de contrato após o dobro do prazo original.

## Comunicação durante o atendimento
A contratada deve informar o solicitante sobre o andamento a cada atualização relevante de status, e obrigatoriamente ao concluir o atendimento, mesmo que a solução seja provisória.

## Chamados fora do escopo
Um chamado aberto para serviço fora do escopo contratual (ver documentos de escopo por disciplina) é reclassificado como orçamento e sai da contagem de SLA.
`.trim(),
  },
  {
    id: 'doc-subcontratacao',
    titulo: 'Política de Subcontratação',
    texto: `
## Autorização prévia
A subcontratação de qualquer serviço previsto no escopo depende de autorização prévia e por escrito do contratante, indicando o subcontratado e o serviço específico.

## Responsabilidade
A contratada permanece integralmente responsável, perante o contratante, pela qualidade e pelo SLA do serviço subcontratado — a subcontratação não transfere nem dilui essa responsabilidade.

## Serviços que não podem ser subcontratados
Atividades de segurança do trabalho (ex: emissão de laudo NR-35) e a gestão do relacionamento com o contratante (fiscal de contrato) não podem ser subcontratadas em nenhuma hipótese.

## Subcontratados recorrentes
Um subcontratado usado em mais de 3 chamados no mesmo mês deve ser formalmente cadastrado no contrato, com os mesmos requisitos de EPI e treinamento exigidos da contratada.
`.trim(),
  },
  {
    id: 'doc-vigencia',
    titulo: 'Vigência, Renovação e Rescisão',
    texto: `
## Vigência
O contrato tem vigência de 12 meses a partir da data de assinatura, renovável automaticamente por períodos iguais, salvo manifestação em contrário de qualquer parte com 60 dias de antecedência do vencimento.

## Rescisão sem justa causa
Qualquer parte pode rescindir sem justa causa mediante aviso prévio de 90 dias, sem multa, desde que os serviços já executados sejam quitados normalmente.

## Rescisão por justa causa
Descumprimento grave e reiterado do SLA (ver Política de Penalidades e Glosas), subcontratação não autorizada, ou violação grave de segurança do trabalho autorizam rescisão imediata por justa causa.

## Transição
Em caso de rescisão, a contratada deve garantir suporte de transição por até 30 dias à nova contratada, incluindo entrega de histórico de manutenção e cadastro de ativos.
`.trim(),
  },
  {
    id: 'doc-ativos',
    titulo: 'Cadastro e Gestão de Ativos',
    texto: `
## Inventário
A contratada deve manter inventário atualizado de todos os ativos sob manutenção (equipamentos elétricos, hidráulicos e de climatização), com número de patrimônio, data de instalação e vida útil estimada.

## Atualização do inventário
Toda troca de equipamento, mesmo por peça de reposição, deve ser registrada no inventário em até 5 dias úteis, incluindo baixa do item substituído.

## Relatório de saúde dos ativos
Um relatório trimestral de saúde dos ativos, com recomendação de substituição para equipamentos além da vida útil estimada, deve ser entregue ao contratante — recomendação que não vincula automaticamente o contratante a aprovar a substituição.

## Propriedade dos dados
O inventário e o histórico de manutenção são propriedade do contratante e devem ser entregues em formato aberto (planilha ou banco de dados) ao final do contrato, independente do motivo do encerramento.
`.trim(),
  },
];
