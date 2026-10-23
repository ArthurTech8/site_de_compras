<script setup lang="ts">
import { ref, watch } from 'vue'
import { produtosApi } from '@/api/produtos'
import type { PagedResult, Produto } from '@/api/types'
import Paginacao from '@/components/Paginacao.vue'
import ProdutoCard from '@/components/ProdutoCard.vue'
import { ORDENACOES, useFiltroProdutos } from '@/composables/useFiltroProdutos'
import { useCarrinhoStore } from '@/stores/carrinho'
import { toastErro, toastSucesso } from '@/utils/alertas'
import { urlImagem } from '@/utils/formatar'

const { filtro, atualizar, limpar } = useFiltroProdutos()
const carrinho = useCarrinhoStore()

const resultado = ref<PagedResult<Produto> | null>(null)
const carregando = ref(false)
const erro = ref<string | null>(null)
const adicionandoId = ref<number | null>(null)
// Muda a cada resultado novo, para a grade refazer a entrada em cascata.
const versao = ref(0)

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
    versao.value++
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
  try {
    await carrinho.adicionar(produto.id)
    toastSucesso('Adicionado ao carrinho', { texto: produto.nome, imagem: urlImagem(produto.imagemUrl) })
  } catch {
    toastErro('Não foi possível adicionar', carrinho.erro ?? undefined)
  } finally {
    adicionandoId.value = null
  }
}
</script>

<template>
  <section>
    <div class="hero">
      <div class="hero-texto">
        <span class="sobretitulo">Ofertas da semana</span>
        <h2>Tudo o que você precisa, <span class="realce">com desconto no Pix</span></h2>
        <p>Até 15% off pagando no Pix e parcelamento em até 16x no cartão de crédito.</p>
        <ul class="vantagens">
          <li><span aria-hidden="true">⚡</span> Pix com até 15% off</li>
          <li><span aria-hidden="true">💳</span> Até 16x no crédito</li>
          <li><span aria-hidden="true">🔒</span> Compra segura</li>
        </ul>
      </div>
      <div class="hero-arte" aria-hidden="true">
        <span class="bolha b1" />
        <span class="bolha b2" />
        <img src="/imagens/carrinho-de-compras.png" alt="" />
      </div>
    </div>

    <form class="filtros cartao" @submit.prevent>
      <label class="campo busca">
        <span>Buscar</span>
        <input v-model="busca" type="search" placeholder="🔍  Nome do produto" />
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

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <template v-else-if="resultado">
      <div class="cabecalho-lista">
        <h3 class="titulo-pagina">Produtos em destaque</h3>
        <p class="contagem">
          {{ resultado.totalItens }} {{ resultado.totalItens === 1 ? 'produto encontrado' : 'produtos encontrados' }}
        </p>
      </div>
      <div v-if="resultado.itens.length === 0" class="vazio">
        <span class="icone-vazio" aria-hidden="true">🔎</span>
        <p>Nenhum produto corresponde aos filtros.</p>
        <button type="button" class="botao secundario" @click="limpar">Limpar filtros</button>
      </div>
      <div :key="versao" class="grade" :class="{ carregando }">
        <ProdutoCard
          v-for="(p, i) in resultado.itens"
          :key="p.id"
          class="surgir"
          :style="{ '--i': i }"
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

    <div v-else-if="carregando" class="grade" aria-busy="true" aria-label="Carregando produtos">
      <div v-for="n in 8" :key="n" class="esqueleto">
        <span class="bloco imagem" />
        <span class="bloco linha" />
        <span class="bloco linha curta" />
        <span class="bloco botao-falso" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 24px;
  padding: clamp(24px, 4vw, 44px);
  border-radius: var(--raio-lg);
  background:
    radial-gradient(500px 220px at 85% 20%, rgba(253, 126, 20, 0.35), transparent 70%),
    var(--gradiente-primario);
  color: #fff;
  overflow: hidden;
  box-shadow: var(--sombra-lg);
  animation: surgir 0.6s var(--ease-suave) backwards;
}
.hero::after {
  /* textura de pontos discreta */
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: linear-gradient(90deg, transparent 30%, #000);
  pointer-events: none;
}
.hero-texto {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 560px;
}
.sobretitulo {
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 4px 12px;
  border-radius: 999px;
}
.hero h2 {
  font-size: clamp(1.5rem, 3.5vw, 2.25rem);
  line-height: 1.15;
  margin: 0;
}
.realce {
  background: linear-gradient(90deg, #ffd8a8, var(--cor-destaque-claro));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero p {
  color: rgba(255, 255, 255, 0.85);
}
.vantagens {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.vantagens li {
  font-size: 0.8125rem;
  background: rgba(6, 42, 82, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 6px 12px;
  backdrop-filter: blur(4px);
}
.hero-arte {
  position: relative;
  width: 170px;
  height: 170px;
  display: grid;
  place-items: center;
}
.hero-arte img {
  position: relative;
  width: 110px;
  filter: brightness(0) invert(1) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.3));
  animation: flutuar 4s ease-in-out infinite;
}
.bolha {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.b1 {
  inset: 0;
  animation: flutuar 6s ease-in-out infinite reverse;
}
.b2 {
  width: 60px;
  height: 60px;
  top: -6px;
  right: -14px;
  background: var(--gradiente-destaque);
  opacity: 0.85;
  border: none;
  animation: flutuar 5s ease-in-out infinite;
}

.filtros {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin: -22px clamp(12px, 3vw, 28px) 32px;
  padding: 16px 18px;
  box-shadow: var(--sombra-md);
  animation: surgir 0.6s 0.1s var(--ease-suave) backwards;
}
.busca {
  flex: 1 1 220px;
}
.cabecalho-lista {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}
.contagem {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 20px;
  transition: opacity 0.2s;
}
.grade.carregando {
  opacity: 0.5;
}

.esqueleto {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
}
.bloco {
  display: block;
  border-radius: var(--raio-sm);
  background: linear-gradient(90deg, #edf1f6 25%, #f8fafc 50%, #edf1f6 75%);
  background-size: 200% 100%;
  animation: brilho-esqueleto 1.4s linear infinite;
}
.bloco.imagem {
  height: 180px;
  border-radius: var(--raio-md);
}
.bloco.linha {
  height: 14px;
}
.bloco.curta {
  width: 55%;
  height: 22px;
}
.bloco.botao-falso {
  height: 38px;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .hero-arte {
    display: none;
  }
  .filtros {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
