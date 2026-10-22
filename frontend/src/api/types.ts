// Espelham os contratos do backend (SiteDeCompras.Application). Os nomes chegam em camelCase.

export interface PagedResult<T> {
  itens: T[]
  pagina: number
  tamanhoPagina: number
  totalItens: number
  totalPaginas: number
}

export interface Produto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  imagemUrl: string | null
  estoque: number
  criadoEm: string
  atualizadoEm: string
}

export type OrdenacaoProduto = 'Nome' | 'MenorPreco' | 'MaiorPreco' | 'MaisRecentes'

export interface ProdutoFiltro {
  busca?: string
  precoMin?: number
  precoMax?: number
  ordenacao?: OrdenacaoProduto
  pagina?: number
  tamanhoPagina?: number
}

export interface ItemCarrinho {
  produtoId: number
  nomeProduto: string
  imagemUrl: string | null
  precoUnitario: number
  quantidade: number
  subtotal: number
}

export interface Carrinho {
  id: string
  itens: ItemCarrinho[]
  quantidadeTotal: number
  total: number
  atualizadoEm: string
}
