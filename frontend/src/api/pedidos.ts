import { request } from './http'
import type { FormaPagamento, Pedido } from './types'

const base = '/api/v1/pedidos'

export interface FecharPedido {
  carrinhoId: string
  formaPagamento: FormaPagamento
  /** Só no crédito: de 6 a 16. */
  parcelas?: number
}

export const pedidosApi = {
  /** Finaliza o carrinho. O pagamento é simulado e aprovado na hora. */
  fechar: (dados: FecharPedido) => request<Pedido>('POST', base, { body: dados }),
  obter: (id: string) => request<Pedido>('GET', `${base}/${id}`),
}
