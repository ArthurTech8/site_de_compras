import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCarrinhoStore } from '@/stores/carrinho'
import type { Carrinho } from '@/api/types'

function carrinho(id: string, itens: Carrinho['itens'] = []): Carrinho {
  return {
    id,
    itens,
    quantidadeTotal: itens.reduce((s, i) => s + i.quantidade, 0),
    total: itens.reduce((s, i) => s + i.subtotal, 0),
    atualizadoEm: '2026-10-22T00:00:00Z',
  }
}

const geladeira = (quantidade: number) => ({
  produtoId: 1,
  nomeProduto: 'Geladeira',
  imagemUrl: 'imagens/Geladeira.webp',
  precoUnitario: 2300,
  quantidade,
  subtotal: 2300 * quantidade,
})

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('store do carrinho', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('cria o carrinho no primeiro item e guarda o id', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(201, carrinho('abc')))
      .mockResolvedValueOnce(resposta(200, carrinho('abc', [geladeira(1)])))

    const store = useCarrinhoStore()
    await store.adicionar(1)

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/carrinhos')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/carrinhos/abc/itens')
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ produtoId: 1, quantidade: 1 })
    expect(localStorage.getItem('carrinhoId')).toBe('abc')
    expect(store.quantidadeTotal).toBe(1)
    expect(store.total).toBe(2300)
  })

  it('esquece o id salvo quando o carrinho não existe mais', async () => {
    localStorage.setItem('carrinhoId', 'velho')
    fetchMock.mockResolvedValueOnce(resposta(404, { title: 'Recurso não encontrado', detail: "Carrinho 'velho' não encontrado." }))

    const store = useCarrinhoStore()
    await store.carregar()

    expect(store.carrinho).toBeNull()
    expect(localStorage.getItem('carrinhoId')).toBeNull()
  })

  it('recria o carrinho se ele sumiu no backend ao adicionar', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(201, carrinho('a')))
      .mockResolvedValueOnce(resposta(404, { detail: "Carrinho 'a' não encontrado." }))
      .mockResolvedValueOnce(resposta(201, carrinho('b')))
      .mockResolvedValueOnce(resposta(200, carrinho('b', [geladeira(1)])))

    const store = useCarrinhoStore()
    await store.adicionar(1)

    expect(store.carrinho?.id).toBe('b')
    expect(store.itens).toHaveLength(1)
  })

  it('quantidade zero remove o item', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(201, carrinho('abc')))
      .mockResolvedValueOnce(resposta(200, carrinho('abc', [geladeira(1)])))
      .mockResolvedValueOnce(resposta(200, carrinho('abc')))

    const store = useCarrinhoStore()
    await store.adicionar(1)
    await store.alterarQuantidade(1, 0)

    expect(fetchMock.mock.calls[2][0]).toBe('/api/v1/carrinhos/abc/itens/1')
    expect(fetchMock.mock.calls[2][1]!.method).toBe('DELETE')
    expect(store.vazio).toBe(true)
  })

  it('expõe a mensagem de regra de negócio do backend', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(201, carrinho('abc')))
      .mockResolvedValueOnce(resposta(200, carrinho('abc', [geladeira(1)])))
      .mockResolvedValueOnce(resposta(422, { title: 'Regra de negócio violada', detail: 'Estoque insuficiente.' }))

    const store = useCarrinhoStore()
    await store.adicionar(1)
    await expect(store.alterarQuantidade(1, 50)).rejects.toThrow('Estoque insuficiente.')

    expect(store.erro).toBe('Estoque insuficiente.')
    expect(store.itens[0].quantidade).toBe(1)
  })
})
