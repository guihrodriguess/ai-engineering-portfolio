import type { Categoria } from './categorias';

export interface ItemAvaliacao {
  id: string;
  texto: string;
  valor: number;
  /** Ground truth — usado só para calcular métricas, nunca entra no pipeline. */
  categoriaCorreta: Categoria;
}

/**
 * Dataset sintético rotulado para a avaliação do pipeline.
 *
 * Inclui de propósito casos ambíguos (ex: "cerveja no jantar com o cliente",
 * "aplicativo de transporte até o show") — um dataset onde tudo é óbvio não
 * mede nada. As métricas de avaliação (ver lib/eval) devem refletir isso: não
 * é esperado 100% de acerto, e os casos ambíguos são exatamente os que devem
 * aparecer como falso positivo ou baixa confiança.
 */
export const DATASET_AVALIACAO: ItemAvaliacao[] = [
  // ── alimentação — casos claros ──────────────────────────────────────────
  { id: 'd01', texto: 'Almoço executivo durante reunião com fornecedor', valor: 48, categoriaCorreta: 'alimentacao' },
  { id: 'd02', texto: 'Jantar sozinho no hotel após o expediente', valor: 35, categoriaCorreta: 'alimentacao' },
  { id: 'd03', texto: 'Lanche da tarde no aeroporto entre conexões', valor: 18, categoriaCorreta: 'alimentacao' },
  { id: 'd04', texto: 'Café da manhã não incluso na diária do hotel', valor: 22, categoriaCorreta: 'alimentacao' },
  { id: 'd05', texto: 'Almoço em restaurante por quilo perto do cliente', valor: 32, categoriaCorreta: 'alimentacao' },
  // alimentação — acima do teto (deve virar ATENCAO nas regras, categoria ainda é certa)
  { id: 'd06', texto: 'Jantar em restaurante japonês com a equipe de projeto', valor: 95, categoriaCorreta: 'alimentacao' },

  // ── hospedagem ───────────────────────────────────────────────────────────
  { id: 'd07', texto: 'Diária de hotel em visita técnica à filial', valor: 240, categoriaCorreta: 'hospedagem' },
  { id: 'd08', texto: 'Pousada durante auditoria de dois dias fora da base', valor: 180, categoriaCorreta: 'hospedagem' },
  { id: 'd09', texto: 'Hotel próximo ao aeroporto para voo cedo no dia seguinte', valor: 150, categoriaCorreta: 'hospedagem' },
  { id: 'd10', texto: 'Hospedagem em resort durante convenção de vendas', valor: 420, categoriaCorreta: 'hospedagem' },

  // ── transporte ───────────────────────────────────────────────────────────
  { id: 'd11', texto: 'Passagem de ônibus para visita à unidade regional', valor: 85, categoriaCorreta: 'transporte' },
  { id: 'd12', texto: 'Corrida de aplicativo do hotel até o cliente', valor: 24, categoriaCorreta: 'transporte' },
  { id: 'd13', texto: 'Passagem aérea para o congresso do setor', valor: 640, categoriaCorreta: 'transporte' },
  { id: 'd14', texto: 'Táxi do aeroporto até o escritório em outra cidade', valor: 55, categoriaCorreta: 'transporte' },
  { id: 'd15', texto: 'Pedágio e estacionamento durante viagem a serviço', valor: 40, categoriaCorreta: 'transporte' },

  // ── combustível ──────────────────────────────────────────────────────────
  { id: 'd16', texto: 'Abastecimento do carro da empresa para visita técnica', valor: 180, categoriaCorreta: 'combustivel' },
  { id: 'd17', texto: 'Gasolina para deslocamento entre duas bases regionais', valor: 210, categoriaCorreta: 'combustivel' },
  { id: 'd18', texto: 'Combustível do veículo de apoio durante a semana de campo', valor: 320, categoriaCorreta: 'combustivel' },

  // ── material de escritório ───────────────────────────────────────────────
  { id: 'd19', texto: 'Compra de papelaria para a equipe do projeto', valor: 65, categoriaCorreta: 'material_escritorio' },
  { id: 'd20', texto: 'Cartucho de impressora para o escritório da filial', valor: 130, categoriaCorreta: 'material_escritorio' },
  { id: 'd21', texto: 'Pastas e cadernos para reunião com o cliente', valor: 45, categoriaCorreta: 'material_escritorio' },
  { id: 'd22', texto: 'Notebook novo para a equipe de campo', valor: 3800, categoriaCorreta: 'material_escritorio' },

  // ── entretenimento (proibido) ────────────────────────────────────────────
  { id: 'd23', texto: 'Ingresso de cinema durante a viagem a trabalho', valor: 30, categoriaCorreta: 'entretenimento' },
  { id: 'd24', texto: 'Entrada em casa noturna após o jantar da equipe', valor: 80, categoriaCorreta: 'entretenimento' },
  { id: 'd25', texto: 'Parque de diversões no fim de semana da convenção', valor: 60, categoriaCorreta: 'entretenimento' },

  // ── bebidas alcoólicas (proibido) ────────────────────────────────────────
  { id: 'd26', texto: 'Garrafa de vinho para o jantar de confraternização', valor: 90, categoriaCorreta: 'bebidas_alcoolicas' },
  { id: 'd27', texto: 'Cerveja no bar do hotel depois do expediente', valor: 25, categoriaCorreta: 'bebidas_alcoolicas' },

  // ── outro ────────────────────────────────────────────────────────────────
  { id: 'd28', texto: 'Despesa sem descrição, apenas o valor no comprovante', valor: 50, categoriaCorreta: 'outro' },
  { id: 'd29', texto: 'Presente comprado para cliente em data comemorativa', valor: 120, categoriaCorreta: 'outro' },
  { id: 'd30', texto: 'Multa de trânsito do carro da empresa', valor: 195, categoriaCorreta: 'outro' },

  // ── casos ambíguos de propósito (fronteira entre categorias) ────────────
  // "cerveja no jantar" — é alimentação (jantar) ou bebida alcoólica (item citado)?
  // Rótulo correto = bebidas_alcoolicas (política trata o item citado como o fato relevante).
  { id: 'd31', texto: 'Jantar com o cliente onde foi pedida uma cerveja para acompanhar', valor: 70, categoriaCorreta: 'bebidas_alcoolicas' },
  // "aplicativo de transporte até o show" — o deslocamento é transporte, mas o destino é entretenimento.
  { id: 'd32', texto: 'Aplicativo de transporte até o show da convenção anual', valor: 28, categoriaCorreta: 'transporte' },
  // hospedagem descrita de forma pouco usual (Airbnb, não "hotel/pousada")
  { id: 'd33', texto: 'Aluguel de apartamento por temporada durante projeto de dois meses', valor: 260, categoriaCorreta: 'hospedagem' },
  // combustível descrito como "abastecimento" sem mencionar carro — pode soar genérico
  { id: 'd34', texto: 'Abastecimento durante deslocamento a serviço', valor: 150, categoriaCorreta: 'combustivel' },
  // pode ser confundido com material de escritório (é compra de equipamento, mas de informática de campo)
  { id: 'd35', texto: 'Cabo e adaptador para notebook usado em campo', valor: 40, categoriaCorreta: 'material_escritorio' },
  // frase muito curta, pouco contexto — deve puxar confiança pra baixo
  { id: 'd36', texto: 'Nota de R$38 sem estabelecimento legível', valor: 38, categoriaCorreta: 'outro' },
  // menção a "bar" mas o item em si é comida, não bebida
  { id: 'd37', texto: 'Petisco no bar do hotel entre reuniões, sem bebida alcoólica', valor: 22, categoriaCorreta: 'alimentacao' },
  // transporte de longa distância que soa como hospedagem por causa da palavra "noturno"
  { id: 'd38', texto: 'Passagem de ônibus noturno para a cidade da filial', valor: 110, categoriaCorreta: 'transporte' },
  { id: 'd39', texto: 'Cabine de hotel-cápsula para pernoite entre dois voos', valor: 95, categoriaCorreta: 'hospedagem' },
  { id: 'd40', texto: 'Compra de mochila para transportar equipamento de campo', valor: 180, categoriaCorreta: 'material_escritorio' },
];
