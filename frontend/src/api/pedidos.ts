import { request } from './http'
import type { Endereco, Envio, FormaPagamento, Pedido } from './types'

const base = '/api/v1/pedidos'

export interface FecharPedido {
  carrinhoId: string
  formaPagamento: FormaPagamento
  /** Só no crédito: de 6 a 16. */
  parcelas?: number
  enderecoEntrega: Endereco
}

export const pedidosApi = {
  /** Finaliza o carrinho. O pagamento é simulado e aprovado na hora. */
  fechar: (dados: FecharPedido) => request<Pedido>('POST', base, { body: dados }),
  obter: (id: string) => request<Pedido>('GET', `${base}/${id}`),
  /** Envios do pedido, cada um com o histórico de rastreio. */
  rastreio: (id: string) => request<Envio[]>('GET', `${base}/${id}/rastreio`),
}
