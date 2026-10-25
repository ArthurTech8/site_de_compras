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
  /** Código bipado no centro de distribuição. */
  sku: string
  pesoGramas: number
  alturaCm: number
  larguraCm: number
  comprimentoCm: number
  /** Prateleira no CD, como "A-03-2". */
  localEstoque: string | null
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

export type StatusPedido = 'Pago' | 'EmPreparacao' | 'Enviado' | 'Entregue'

export interface Endereco {
  destinatario: string
  /** Só os 8 dígitos. Ao enviar, o backend também aceita com hífen. */
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
}

export interface EnderecoSalvo {
  id: number
  endereco: Endereco
  criadoEm: string
}

export interface Pedido {
  id: string
  status: StatusPedido
  criadoEm: string
  itens: ItemPedido[]
  pagamento: CondicaoPagamento
  /** Nulo só em pedidos feitos antes da logística existir. */
  enderecoEntrega: Endereco | null
}

/** Uma linha de "Meus pedidos". */
export interface PedidoResumo {
  id: string
  status: StatusPedido
  criadoEm: string
  total: number
  quantidadeItens: number
  primeiroItem: string
  imagemUrl: string | null
}

/** Etapas do envio, na ordem em que acontecem. */
export const ETAPAS_ENVIO = [
  'AguardandoSeparacao',
  'EmSeparacao',
  'Separado',
  'Embalado',
  'ProntoParaEnvio',
  'Expedido',
  'EmTransito',
  'SaiuParaEntrega',
  'Entregue',
] as const

export type StatusEnvio = (typeof ETAPAS_ENVIO)[number]

export interface EventoRastreio {
  data: string
  status: StatusEnvio
  descricao: string
  /** Cidade e UF, como "São Paulo, SP". */
  local: string
  /** Falso para o que só a equipe vê, como a falta de um item na prateleira. */
  publico: boolean
}

export interface Envio {
  id: string
  pedidoId: string
  /** Nasce junto com a etiqueta, em ProntoParaEnvio. */
  codigoRastreio: string | null
  status: StatusEnvio
  destino: Endereco
  criadoEm: string
  atualizadoEm: string
  prazoDespacho: string
  previsaoEntrega: string
  atrasado: boolean
  eventos: EventoRastreio[]
}

/** Uma linha da fila de envios do back-office. */
export interface EnvioResumo {
  id: string
  pedidoId: string
  codigoRastreio: string | null
  status: StatusEnvio
  destinatario: string
  cidade: string
  uf: string
  criadoEm: string
  atualizadoEm: string
  prazoDespacho: string
  previsaoEntrega: string
  atrasado: boolean
}

/** O rastreio aberto: sem nome, rua ou itens. */
export interface RastreioPublico {
  codigoRastreio: string
  status: StatusEnvio
  cidadeDestino: string
  ufDestino: string
  previsaoEntrega: string
  eventos: EventoRastreio[]
}

export interface PainelLogistica {
  porStatus: Record<StatusEnvio, number>
  atrasados: number
  despachoVenceHoje: number
  entreguesHoje: number
  divergenciasAbertas: number
}

export interface EnvioFiltro {
  status?: StatusEnvio
  atrasados?: boolean
  busca?: string
  pagina?: number
  tamanhoPagina?: number
}

// ---------- Centro de distribuição ----------

export interface PosicaoEstoque {
  produtoId: number
  sku: string
  nome: string
  imagemUrl: string | null
  local: string | null
  /** Pode ser vendido. */
  disponivel: number
  /** Vendido e ainda na prateleira, esperando a separação. */
  reservado: number
  /** Unidades que o separador não achou, até o inventário. */
  divergencia: number
  divergenciaDesde: string | null
}

export interface Inventario {
  posicao: PosicaoEstoque
  ajuste: number
  mensagem: string
}

export type StatusOnda = 'Aberta' | 'Concluida'

export interface OndaResumo {
  id: number
  status: StatusOnda
  criadaEm: string
  concluidaEm: string | null
  envios: number
  unidades: number
  separadas: number
}

/** Uma parada da rota de coleta. */
export interface ItemColeta {
  produtoId: number
  sku: string
  nome: string
  imagemUrl: string | null
  local: string | null
  quantidade: number
  separadas: number
}

export interface EnvioDaOnda {
  id: string
  pedidoId: string
  status: StatusEnvio
  destinatario: string
  unidades: number
  separadas: number
}

export interface Onda {
  id: number
  status: StatusOnda
  criadaEm: string
  concluidaEm: string | null
  coleta: ItemColeta[]
  envios: EnvioDaOnda[]
}

export interface ResultadoOnda {
  onda: Onda
  mensagem: string
}

export interface Caixa {
  codigo: string
  nome: string
  alturaCm: number
  larguraCm: number
  comprimentoCm: number
  cabe: boolean
  pesoEsperadoGramas: number
}

export interface ItemConferencia {
  produtoId: number
  sku: string
  nome: string
  imagemUrl: string | null
  quantidade: number
  conferidas: number
}

export interface Pacote {
  caixa: string
  pesoGramas: number
  alturaCm: number
  larguraCm: number
  comprimentoCm: number
}

export interface Embalagem {
  envioId: string
  pedidoId: string
  status: StatusEnvio
  destinatario: string
  cidade: string
  uf: string
  itens: ItemConferencia[]
  caixaSugerida: string
  caixas: Caixa[]
  pacote: Pacote | null
  codigoRastreio: string | null
}

export interface Etiqueta {
  envioId: string
  pedidoId: string
  codigoRastreio: string
  transportadora: string
  remetente: { nome: string; linha1: string; linha2: string }
  destino: Endereco
  pacote: Pacote | null
  unidades: number
  geradaEm: string
  prazoDespacho: string
  previsaoEntrega: string
}

export type StatusManifesto = 'Aberto' | 'Fechado' | 'Coletado'

export interface ManifestoResumo {
  id: number
  transportadora: string
  status: StatusManifesto
  criadoEm: string
  fechadoEm: string | null
  coletadoEm: string | null
  volumes: number
  pesoGramas: number
}

export interface PacoteManifesto {
  envioId: string
  pedidoId: string
  codigoRastreio: string
  destinatario: string
  cidade: string
  uf: string
  caixa: string | null
  pesoGramas: number | null
}

export interface Manifesto {
  id: number
  transportadora: string
  status: StatusManifesto
  criadoEm: string
  fechadoEm: string | null
  coletadoEm: string | null
  pacotes: PacoteManifesto[]
  prontosForaDoManifesto: number
}

export interface Expedicao {
  manifestos: ManifestoResumo[]
  prontosSemManifesto: number
}

export type PapelUsuario = 'Cliente' | 'Admin' | 'OperadorCD' | 'Entregador' | 'Atendimento'

/** O backend nunca devolve hash, bloqueio ou qualquer dado da senha. */
export interface Usuario {
  id: string
  nome: string
  email: string
  papel: PapelUsuario
}
