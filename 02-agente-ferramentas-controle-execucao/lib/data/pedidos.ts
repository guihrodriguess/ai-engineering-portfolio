/**
 * "Banco de dados" sintético em memória — dados fictícios só para a demo,
 * sem qualquer relação com clientes ou pedidos reais.
 */

export type StatusPedido = 'processando' | 'em_transporte' | 'entregue' | 'cancelado';

export interface Pedido {
  id: string;
  cliente: string;
  status: StatusPedido;
  valor: number;
  itens: { sku: string; nome: string; quantidade: number }[];
}

export const pedidos: Pedido[] = [
  {
    id: 'PED-1001',
    cliente: 'Ana Pereira',
    status: 'entregue',
    valor: 89.9,
    itens: [{ sku: 'SKU-CANECA', nome: 'Caneca térmica 500ml', quantidade: 1 }],
  },
  {
    id: 'PED-1002',
    cliente: 'Bruno Costa',
    status: 'em_transporte',
    valor: 249.5,
    itens: [{ sku: 'SKU-FONE', nome: 'Fone de ouvido bluetooth', quantidade: 1 }],
  },
  {
    id: 'PED-1003',
    cliente: 'Carla Dias',
    status: 'entregue',
    valor: 412.0,
    itens: [
      { sku: 'SKU-TECLADO', nome: 'Teclado mecânico', quantidade: 1 },
      { sku: 'SKU-MOUSE', nome: 'Mouse sem fio', quantidade: 1 },
    ],
  },
  {
    id: 'PED-1004',
    cliente: 'Diego Martins',
    status: 'processando',
    valor: 59.9,
    itens: [{ sku: 'SKU-SLOW', nome: 'Carregador USB-C 65W', quantidade: 1 }],
  },
];

export const estoque: Record<string, number> = {
  'SKU-CANECA': 42,
  'SKU-FONE': 7,
  'SKU-TECLADO': 0,
  'SKU-MOUSE': 18,
  'SKU-SLOW': 15,
};

export function buscarPedidoPorId(id: string): Pedido | undefined {
  return pedidos.find(p => p.id === id);
}

export function cancelarPedidoPorId(id: string): Pedido | undefined {
  const pedido = buscarPedidoPorId(id);
  if (!pedido) return undefined;
  if (pedido.status !== 'cancelado') {
    pedido.status = 'cancelado';
  }
  return pedido;
}

// Ledger de reembolsos já emitidos — chave é o pedidoId. Simula a
// invariante de negócio "um pedido nunca é reembolsado duas vezes",
// independente de qualquer dedupe genérico de chamada de ferramenta.
export const reembolsosEmitidos = new Map<
  string,
  { valor: number; motivo: string; emitidoEm: number }
>();
