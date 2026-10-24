import { request } from './http'
import type { Endereco, EnderecoSalvo, PedidoResumo } from './types'

const base = '/api/v1/conta'

/** Tudo aqui é do usuário logado; sem sessão, o backend responde 401. */
export const contaApi = {
  pedidos: () => request<PedidoResumo[]>('GET', `${base}/pedidos`),
  enderecos: () => request<EnderecoSalvo[]>('GET', `${base}/enderecos`),
  salvarEndereco: (endereco: Endereco) => request<EnderecoSalvo>('POST', `${base}/enderecos`, { body: endereco }),
  removerEndereco: (id: number) => request<void>('DELETE', `${base}/enderecos/${id}`),
}
