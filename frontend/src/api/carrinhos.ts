import { request } from './http'
import type { Carrinho } from './types'

const base = '/api/v1/carrinhos'

export const carrinhosApi = {
  criar: () => request<Carrinho>('POST', base),
  obter: (id: string) => request<Carrinho>('GET', `${base}/${id}`),
  adicionarItem: (id: string, produtoId: number, quantidade = 1) =>
    request<Carrinho>('POST', `${base}/${id}/itens`, { body: { produtoId, quantidade } }),
  alterarQuantidade: (id: string, produtoId: number, quantidade: number) =>
    request<Carrinho>('PUT', `${base}/${id}/itens/${produtoId}`, { body: { quantidade } }),
  removerItem: (id: string, produtoId: number) =>
    request<Carrinho>('DELETE', `${base}/${id}/itens/${produtoId}`),
  limpar: (id: string) => request<Carrinho>('DELETE', `${base}/${id}/itens`),
}
