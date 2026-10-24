import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { carrinhosApi } from '@/api/carrinhos'
import { pedidosApi } from '@/api/pedidos'
import { ApiError } from '@/api/http'
import type { Carrinho, Endereco, FormaPagamento, Pedido } from '@/api/types'

const CHAVE_STORAGE = 'carrinhoId'

function lerIdSalvo(): string | null {
  try {
    return localStorage.getItem(CHAVE_STORAGE)
  } catch {
    return null
  }
}

function salvarId(id: string | null) {
  try {
    if (id) localStorage.setItem(CHAVE_STORAGE, id)
    else localStorage.removeItem(CHAVE_STORAGE)
  } catch {
    // Sem storage (modo privado etc.): o carrinho vive só nesta aba.
  }
}

/**
 * O carrinho mora no backend; aqui guardamos só o id (no localStorage) e o último estado
 * devolvido pela API. Toda alteração devolve o carrinho inteiro, então não há cálculo local.
 */
export const useCarrinhoStore = defineStore('carrinho', () => {
  const carrinho = ref<Carrinho | null>(null)
  const carregando = ref(false)
  const erro = ref<string | null>(null)

  const itens = computed(() => carrinho.value?.itens ?? [])
  const quantidadeTotal = computed(() => carrinho.value?.quantidadeTotal ?? 0)
  const total = computed(() => carrinho.value?.total ?? 0)
  const vazio = computed(() => itens.value.length === 0)

  function definir(c: Carrinho) {
    carrinho.value = c
    salvarId(c.id)
  }

  async function executar(acao: () => Promise<void>) {
    carregando.value = true
    erro.value = null
    try {
      await acao()
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro inesperado.'
      throw e
    } finally {
      carregando.value = false
    }
  }

  /** Carrega o carrinho salvo. Se ele não existir mais no backend, esquece o id. */
  async function carregar() {
    const id = lerIdSalvo()
    if (!id) return
    await executar(async () => {
      try {
        definir(await carrinhosApi.obter(id))
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          carrinho.value = null
          salvarId(null)
          return
        }
        throw e
      }
    })
  }

  async function garantirId(): Promise<string> {
    if (carrinho.value) return carrinho.value.id
    const novo = await carrinhosApi.criar()
    definir(novo)
    return novo.id
  }

  async function adicionar(produtoId: number, quantidade = 1) {
    await executar(async () => {
      const id = await garantirId()
      try {
        definir(await carrinhosApi.adicionarItem(id, produtoId, quantidade))
      } catch (e) {
        // Carrinho expirou/foi excluído no backend: cria outro e tenta de novo.
        if (e instanceof ApiError && e.status === 404 && e.message.startsWith('Carrinho')) {
          carrinho.value = null
          const novoId = await garantirId()
          definir(await carrinhosApi.adicionarItem(novoId, produtoId, quantidade))
          return
        }
        throw e
      }
    })
  }

  async function alterarQuantidade(produtoId: number, quantidade: number) {
    if (!carrinho.value) return
    if (quantidade < 1) return remover(produtoId)
    const id = carrinho.value.id
    await executar(async () => definir(await carrinhosApi.alterarQuantidade(id, produtoId, quantidade)))
  }

  async function remover(produtoId: number) {
    if (!carrinho.value) return
    const id = carrinho.value.id
    await executar(async () => definir(await carrinhosApi.removerItem(id, produtoId)))
  }

  async function limpar() {
    if (!carrinho.value) return
    const id = carrinho.value.id
    await executar(async () => definir(await carrinhosApi.limpar(id)))
  }

  /**
   * Fecha o carrinho em um pedido com a forma de pagamento escolhida. O backend recalcula os
   * valores e esvazia o carrinho; aqui só recarregamos o estado.
   */
  async function finalizar(formaPagamento: FormaPagamento, parcelas: number | undefined, enderecoEntrega: Endereco): Promise<Pedido> {
    if (!carrinho.value) throw new Error('O carrinho está vazio.')
    const carrinhoId = carrinho.value.id
    let pedido: Pedido | undefined
    await executar(async () => {
      pedido = await pedidosApi.fechar({ carrinhoId, formaPagamento, parcelas, enderecoEntrega })
      definir(await carrinhosApi.obter(carrinhoId))
    })
    return pedido!
  }

  return {
    carrinho,
    carregando,
    erro,
    itens,
    quantidadeTotal,
    total,
    vazio,
    carregar,
    adicionar,
    alterarQuantidade,
    remover,
    limpar,
    finalizar,
  }
})
