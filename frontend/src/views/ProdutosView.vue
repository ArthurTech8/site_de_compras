<script setup lang="ts">
import { ref, watch } from 'vue'
import { produtosApi } from '@/api/produtos'
import type { PagedResult, Produto } from '@/api/types'
import Paginacao from '@/components/Paginacao.vue'
import ProdutoCard from '@/components/ProdutoCard.vue'
import { ORDENACOES, useFiltroProdutos } from '@/composables/useFiltroProdutos'
import { useCarrinhoStore } from '@/stores/carrinho'

const { filtro, atualizar, limpar } = useFiltroProdutos()
const carrinho = useCarrinhoStore()

const resultado = ref<PagedResult<Produto> | null>(null)
const carregando = ref(false)
const erro = ref<string | null>(null)
const aviso = ref<string | null>(null)
const adicionandoId = ref<number | null>(null)

// Campos do formulário: a busca espera o usuário parar de digitar antes de ir para a URL.
const busca = ref(filtro.value.busca ?? '')
let temporizador: ReturnType<typeof setTimeout> | undefined
watch(busca, (valor) => {
  clearTimeout(temporizador)
  temporizador = setTimeout(() => atualizar({ busca: valor.trim() || undefined }), 300)
})
watch(
  () => filtro.value.busca,
  (valor) => {
    if ((valor ?? '') !== busca.value.trim()) busca.value = valor ?? ''
  },
)

function lerPreco(evento: Event): number | undefined {
  const valor = (evento.target as HTMLInputElement).value
  return valor === '' ? undefined : Math.max(0, Number(valor))
}

let controlador: AbortController | undefined
async function buscar() {
  controlador?.abort()
  controlador = new AbortController()
  carregando.value = true
  erro.value = null
  try {
    resultado.value = await produtosApi.listar(filtro.value, controlador.signal)
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    erro.value = 'Não foi possível carregar os produtos. Verifique se a API está rodando.'
  } finally {
    carregando.value = false
  }
}
watch(filtro, buscar, { immediate: true, deep: true })

async function adicionar(produto: Produto) {
  adicionandoId.value = produto.id
  aviso.value = null
  try {
    await carrinho.adicionar(produto.id)
    aviso.value = `${produto.nome} foi adicionado ao carrinho.`
  } catch {
    aviso.value = carrinho.erro ?? 'Não foi possível adicionar o produto.'
  } finally {
    adicionandoId.value = null
  }
}
</script>

<template>
  <section>
    <h2>Produtos em destaque</h2>

    <form class="filtros" @submit.prevent>
      <label class="campo busca">
        <span>Buscar</span>
        <input v-model="busca" type="search" placeholder="Nome do produto" />
      </label>
      <label class="campo">
        <span>Preço mínimo</span>
        <input
          type="number"
          min="0"
          step="0.01"
          :value="filtro.precoMin ?? ''"
          @change="atualizar({ precoMin: lerPreco($event) })"
        />
      </label>
      <label class="campo">
        <span>Preço máximo</span>
        <input
          type="number"
          min="0"
          step="0.01"
          :value="filtro.precoMax ?? ''"
          @change="atualizar({ precoMax: lerPreco($event) })"
        />
      </label>
      <label class="campo">
        <span>Ordenar por</span>
        <select
          :value="filtro.ordenacao"
          @change="atualizar({ ordenacao: ($event.target as HTMLSelectElement).value as never })"
        >
          <option v-for="o in ORDENACOES" :key="o.valor" :value="o.valor">{{ o.rotulo }}</option>
        </select>
      </label>
      <button type="button" class="botao secundario" @click="limpar">Limpar filtros</button>
    </form>

    <p v-if="aviso" class="aviso" role="status">
      {{ aviso }} <RouterLink to="/carrinho">Ver carrinho</RouterLink>
    </p>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <template v-else-if="resultado">
      <p class="contagem">
        {{ resultado.totalItens }} {{ resultado.totalItens === 1 ? 'produto encontrado' : 'produtos encontrados' }}
      </p>
      <p v-if="resultado.itens.length === 0" class="vazio">Nenhum produto corresponde aos filtros.</p>
      <div class="grade" :class="{ carregando }">
        <ProdutoCard
          v-for="p in resultado.itens"
          :key="p.id"
          :produto="p"
          :adicionando="adicionandoId === p.id"
          @adicionar="adicionar"
        />
      </div>
      <Paginacao
        :pagina="resultado.pagina"
        :total-paginas="resultado.totalPaginas"
        @mudar="(pagina) => atualizar({ pagina })"
      />
    </template>

    <p v-else-if="carregando">Carregando produtos…</p>
  </section>
</template>

<style scoped>
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin: 16px 0 24px;
}
.busca {
  flex: 1 1 220px;
}
.contagem {
  color: var(--cor-texto-suave);
  margin-bottom: 12px;
}
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  transition: opacity 0.15s;
}
.grade.carregando {
  opacity: 0.5;
}
</style>
