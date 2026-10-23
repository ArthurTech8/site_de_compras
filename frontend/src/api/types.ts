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
  /** Desconto (%) no pagamento via Pix, de 5 a 15. */
  descontoPix: number
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

export type FormaPagamento = 'Pix' | 'Debito' | 'Credito'

export interface DescontoPixProduto {
  produtoId: number
  nomeProduto: string
  descontoPercentual: number
}

export interface Parcelamento {
  parcelas: number
  valorParcela: number
  total: number
  /** Quanto o total parcelado fica acima do total do carrinho. */
  juros: number
}

/** Formas de pagamento calculadas pelo backend sobre o total do carrinho. */
export interface OpcoesPagamento {
  carrinhoId: string
  subtotal: number
  pix: {
    descontoPercentual: number
    desconto: number
    total: number
    produtoDoDesconto: DescontoPixProduto | null
    descontosPorProduto: DescontoPixProduto[]
  }
  debito: { total: number }
  credito: {
    /** Fração ao mês: 0.0299 = 2,99% a.m. */
    taxaJurosMensal: number
    parcelasMinimas: number
    parcelasMaximas: number
    parcelamentos: Parcelamento[]
  }
}

export interface CondicaoPagamento {
  forma: FormaPagamento
  subtotal: number
  descontoPercentual: number
  desconto: number
  taxaJurosMensal: number
  juros: number
  total: number
  parcelas: number
  valorParcela: number
}

export interface ItemPedido {
  produtoId: number
  nomeProduto: string
  imagemUrl: string | null
  precoUnitario: number
  quantidade: number
  subtotal: number
}

export interface Pedido {
  id: string
  status: 'Pago'
  criadoEm: string
  itens: ItemPedido[]
  pagamento: CondicaoPagamento
}
