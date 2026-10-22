import { computed } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import type { OrdenacaoProduto, ProdutoFiltro } from '@/api/types'

export const ORDENACOES: { valor: OrdenacaoProduto; rotulo: string }[] = [
  { valor: 'Nome', rotulo: 'Nome (A–Z)' },
  { valor: 'MenorPreco', rotulo: 'Menor preço' },
  { valor: 'MaiorPreco', rotulo: 'Maior preço' },
  { valor: 'MaisRecentes', rotulo: 'Mais recentes' },
]

export const TAMANHO_PAGINA = 12

function texto(v: LocationQuery[string]): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  return s ? String(s) : undefined
}

function numero(v: LocationQuery[string]): number | undefined {
  const s = texto(v)
  if (s === undefined) return undefined
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Converte a query string da URL em filtro da API (e vice-versa), para que a busca seja compartilhável. */
export function filtroDaQuery(query: LocationQuery): ProdutoFiltro {
  const ordenacao = texto(query.ordenacao) as OrdenacaoProduto | undefined
  const pagina = numero(query.pagina)
  return {
    busca: texto(query.busca),
    precoMin: numero(query.precoMin),
    precoMax: numero(query.precoMax),
    ordenacao: ORDENACOES.some((o) => o.valor === ordenacao) ? ordenacao : 'Nome',
    pagina: pagina && pagina >= 1 ? Math.floor(pagina) : 1,
    tamanhoPagina: TAMANHO_PAGINA,
  }
}

export function queryDoFiltro(filtro: ProdutoFiltro): Record<string, string> {
  const query: Record<string, string> = {}
  if (filtro.busca) query.busca = filtro.busca
  if (filtro.precoMin !== undefined) query.precoMin = String(filtro.precoMin)
  if (filtro.precoMax !== undefined) query.precoMax = String(filtro.precoMax)
  if (filtro.ordenacao && filtro.ordenacao !== 'Nome') query.ordenacao = filtro.ordenacao
  if (filtro.pagina && filtro.pagina > 1) query.pagina = String(filtro.pagina)
  return query
}

export function useFiltroProdutos() {
  const route = useRoute()
  const router = useRouter()

  const filtro = computed(() => filtroDaQuery(route.query))

  /** Atualiza o filtro na URL. Qualquer mudança que não seja de página volta para a página 1. */
  function atualizar(parcial: Partial<ProdutoFiltro>) {
    const novo = { ...filtro.value, ...parcial }
    if (!('pagina' in parcial)) novo.pagina = 1
    router.replace({ query: queryDoFiltro(novo) })
  }

  function limpar() {
    router.replace({ query: {} })
  }

  return { filtro, atualizar, limpar }
}
