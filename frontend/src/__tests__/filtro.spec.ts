import { describe, expect, it } from 'vitest'
import { filtroDaQuery, queryDoFiltro } from '@/composables/useFiltroProdutos'

describe('filtro de produtos na URL', () => {
  it('usa padrões quando a query está vazia', () => {
    expect(filtroDaQuery({})).toMatchObject({ ordenacao: 'Nome', pagina: 1, busca: undefined })
  })

  it('ignora valores inválidos', () => {
    const f = filtroDaQuery({ ordenacao: 'Hackear', pagina: '-3', precoMin: 'abc' })
    expect(f).toMatchObject({ ordenacao: 'Nome', pagina: 1, precoMin: undefined })
  })

  it('faz ida e volta sem perder informação', () => {
    const query = { busca: 'note', precoMin: '100', precoMax: '5000', ordenacao: 'MaiorPreco', pagina: '2' }
    expect(queryDoFiltro(filtroDaQuery(query))).toEqual(query)
  })

  it('omite os padrões da URL', () => {
    expect(queryDoFiltro({ ordenacao: 'Nome', pagina: 1 })).toEqual({})
  })
})
