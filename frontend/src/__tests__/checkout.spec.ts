import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CheckoutView from '@/views/CheckoutView.vue'
import { useCarrinhoStore } from '@/stores/carrinho'
import type { Carrinho, OpcoesPagamento } from '@/api/types'
import { confirmar } from '@/utils/alertas'

// Os modais do SweetAlert2 não importam aqui: o teste decide se o usuário confirmou.
vi.mock('@/utils/alertas', () => ({
  confirmar: vi.fn(async () => true),
  carregando: vi.fn(),
  fecharAlerta: vi.fn(),
  alertaErro: vi.fn(),
  escapar: (t: string) => t,
}))

const carrinho: Carrinho = {
  id: 'abc',
  itens: [
    { produtoId: 5, nomeProduto: 'Caneca', imagemUrl: null, precoUnitario: 59, quantidade: 2, subtotal: 118 },
    { produtoId: 1, nomeProduto: 'Geladeira', imagemUrl: null, precoUnitario: 2300, quantidade: 1, subtotal: 2300 },
  ],
  quantidadeTotal: 3,
  total: 2418,
  atualizadoEm: '2026-10-22T00:00:00Z',
}

const opcoes: OpcoesPagamento = {
  carrinhoId: 'abc',
  subtotal: 2418,
  pix: {
    descontoPercentual: 10,
    desconto: 241.8,
    total: 2176.2,
    produtoDoDesconto: { produtoId: 1, nomeProduto: 'Geladeira', descontoPercentual: 10 },
    descontosPorProduto: [
      { produtoId: 5, nomeProduto: 'Caneca', descontoPercentual: 5 },
      { produtoId: 1, nomeProduto: 'Geladeira', descontoPercentual: 10 },
    ],
  },
  debito: { total: 2418 },
  credito: {
    taxaJurosMensal: 0.0299,
    parcelasMinimas: 6,
    parcelasMaximas: 16,
    parcelamentos: [
      { parcelas: 6, valorParcela: 446.21, total: 2677.26, juros: 259.26 },
      { parcelas: 10, valorParcela: 283.32, total: 2833.2, juros: 415.2 },
    ],
  },
}

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const semEspacos = (texto: string) => texto.replace(/\s/g, ' ')

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/carrinho', component: { template: '<div />' } },
      { path: '/checkout', component: CheckoutView },
      { path: '/pedidos/:id', name: 'pedido', component: { template: '<div />' } },
    ],
  })
  await router.push('/checkout')
  const wrapper = mount(CheckoutView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('checkout', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useCarrinhoStore().carrinho = carrinho
  })

  it('mostra o Pix com o maior desconto e o débito sem alteração', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, opcoes))

    const { wrapper } = await montar()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/carrinhos/abc/pagamento')
    expect(semEspacos(wrapper.get('[data-testid="total-pix"]').text())).toBe('R$ 2.176,20')
    expect(semEspacos(wrapper.get('[data-testid="total-debito"]').text())).toBe('R$ 2.418,00')
    expect(wrapper.get('.descontos .aplicado').text()).toContain('Geladeira')
    expect(semEspacos(wrapper.get('[data-testid="total-a-pagar"]').text())).toBe('R$ 2.176,20')
  })

  it('no crédito mostra a parcela, o total e a diferença com juros', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, opcoes))
    const { wrapper } = await montar()

    await wrapper.get('input[value="Credito"]').setValue()
    await wrapper.get('[data-testid="parcelas"]').setValue('10')

    expect(semEspacos(wrapper.get('[data-testid="valor-parcela"]').text())).toBe('10x de R$ 283,32')
    expect(semEspacos(wrapper.get('[data-testid="total-credito"]').text())).toBe('R$ 2.833,20')
    expect(semEspacos(wrapper.get('[data-testid="juros"]').text())).toBe('+ R$ 415,20')
    expect(semEspacos(wrapper.get('[data-testid="total-a-pagar"]').text())).toBe('R$ 2.833,20')
  })

  it('finaliza enviando só a forma e as parcelas', async () => {
    fetchMock
      .mockResolvedValueOnce(resposta(200, opcoes))
      .mockResolvedValueOnce(resposta(201, { id: 'p1' }))
      .mockResolvedValueOnce(resposta(200, { ...carrinho, itens: [], quantidadeTotal: 0, total: 0, atualizadoEm: 'x' }))
    const { wrapper, router } = await montar()

    await wrapper.get('input[value="Credito"]').setValue()
    await wrapper.get('[data-testid="parcelas"]').setValue('10')
    await wrapper.get('.resumo .botao').trigger('click')
    await flushPromises()

    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/pedidos')
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({
      carrinhoId: 'abc',
      formaPagamento: 'Credito',
      parcelas: 10,
    })
    expect(router.currentRoute.value.fullPath).toBe('/pedidos/p1')
  })

  it('não paga quando o usuário cancela a confirmação', async () => {
    vi.mocked(confirmar).mockResolvedValueOnce(false)
    fetchMock.mockResolvedValueOnce(resposta(200, opcoes))
    const { wrapper, router } = await montar()

    await wrapper.get('.resumo .botao').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.fullPath).toBe('/checkout')
  })
})
