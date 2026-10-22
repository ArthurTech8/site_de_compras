import { request } from './http'
import type { PagedResult, Produto, ProdutoFiltro } from './types'

export const produtosApi = {
  listar: (filtro: ProdutoFiltro = {}, signal?: AbortSignal) =>
    request<PagedResult<Produto>>('GET', '/api/v1/produtos', { query: { ...filtro }, signal }),

  obter: (id: number) => request<Produto>('GET', `/api/v1/produtos/${id}`),
}
