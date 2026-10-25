<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { centroApi } from '@/api/centroDistribuicao'
import type { PosicaoEstoque } from '@/api/types'
import { useSessaoStore } from '@/stores/sessao'
import { toastErro, toastSucesso } from '@/utils/alertas'
import { urlImagem } from '@/utils/formatar'
import { formatarDataHora } from '@/utils/logistica'

const sessao = useSessaoStore()

const posicoes = ref<PosicaoEstoque[]>([])
const erro = ref<string | null>(null)
const soDivergencias = ref(false)

/** Uma linha por vez em edição: mover de prateleira ou contar. */
const editando = ref<{ produtoId: number; modo: 'mover' | 'contar'; valor: string } | null>(null)

const visiveis = computed(() => (soDivergencias.value ? posicoes.value.filter((p) => p.divergencia > 0) : posicoes.value))
const comDivergencia = computed(() => posicoes.value.filter((p) => p.divergencia > 0).length)

async function carregar() {
  erro.value = null
  try {
    posicoes.value = await centroApi.estoque()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar o estoque.'
  }
}
onMounted(carregar)

function editar(p: PosicaoEstoque, modo: 'mover' | 'contar') {
  editando.value = { produtoId: p.produtoId, modo, valor: modo === 'mover' ? (p.local ?? '') : String(p.disponivel + p.reservado) }
}

function substituir(nova: PosicaoEstoque) {
  posicoes.value = posicoes.value.map((p) => (p.produtoId === nova.produtoId ? nova : p))
}

async function salvar() {
  const e = editando.value
  if (!e) return
  try {
    if (e.modo === 'mover') {
      substituir(await centroApi.mover(e.produtoId, e.valor.trim() || null))
      toastSucesso('Endereço atualizado')
    } else {
      const contada = Number(e.valor)
      if (!Number.isInteger(contada) || contada < 0) {
        toastErro('Contagem inválida', 'Informe um número inteiro de unidades.')
        return
      }
      const r = await centroApi.inventariar(e.produtoId, contada)
      substituir(r.posicao)
      ;(r.posicao.divergencia > 0 ? toastErro : toastSucesso)('Inventário registrado', r.mensagem)
    }
    editando.value = null
  } catch (err) {
    toastErro('Não foi possível salvar', err instanceof Error ? err.message : undefined)
  }
}
</script>

<template>
  <div class="estoque">
    <div class="topo">
      <h3>Estoque endereçado</h3>
      <label class="filtro">
        <input v-model="soDivergencias" type="checkbox" />
        Só com falta ({{ comDivergencia }})
      </label>
    </div>
    <p class="nota">
      A contagem do inventário inclui as unidades vendidas que ainda estão na prateleira (reservadas). O disponível para venda é o
      contado menos o reservado.
    </p>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <div class="cartao tabela">
      <table>
        <thead>
          <tr>
            <th>Prateleira</th>
            <th>Produto</th>
            <th class="num">Disponível</th>
            <th class="num">Reservado</th>
            <th>Situação</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visiveis" :key="p.produtoId" :class="{ divergente: p.divergencia > 0 }" data-testid="posicao">
            <td>
              <span class="local" :class="{ vazio: !p.local }">{{ p.local ?? 'sem endereço' }}</span>
            </td>
            <td>
              <span class="produto">
                <img :src="urlImagem(p.imagemUrl)" alt="" />
                <span>
                  <strong>{{ p.nome }}</strong>
                  <code>{{ p.sku }}</code>
                </span>
              </span>
            </td>
            <td class="num">{{ p.disponivel }}</td>
            <td class="num">{{ p.reservado }}</td>
            <td>
              <span v-if="p.divergencia > 0" class="selo-falta">Falta de {{ p.divergencia }} desde {{ formatarDataHora(p.divergenciaDesde!) }}</span>
              <span v-else class="selo-ok">Confere</span>
            </td>
            <td class="acoes">
              <form
                v-if="editando?.produtoId === p.produtoId"
                class="edicao"
                @submit.prevent="salvar"
                @keydown.esc="editando = null"
              >
                <label class="sr-only" :for="`edicao-${p.produtoId}`">{{ editando.modo === 'mover' ? 'Nova prateleira' : 'Unidades contadas' }}</label>
                <input
                  :id="`edicao-${p.produtoId}`"
                  v-model="editando.valor"
                  :type="editando.modo === 'mover' ? 'text' : 'number'"
                  :placeholder="editando.modo === 'mover' ? 'A-03-2' : 'Contadas'"
                  :min="editando.modo === 'contar' ? 0 : undefined"
                  maxlength="8"
                  autofocus
                />
                <button type="submit" class="botao">Salvar</button>
                <button type="button" class="botao secundario" @click="editando = null">Cancelar</button>
              </form>
              <template v-else-if="sessao.operaCentro">
                <button type="button" class="botao secundario" @click="editar(p, 'mover')">Mover</button>
                <button type="button" class="botao" :class="{ destaque: p.divergencia > 0 }" @click="editar(p, 'contar')">Inventariar</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.estoque {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.topo {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.topo h3 {
  font-size: 1.125rem;
}
.filtro {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}
.filtro input {
  accent-color: var(--cor-erro);
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.tabela {
  position: relative;
  overflow-x: auto;
  min-width: 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
th,
td {
  text-align: left;
  padding: 10px 14px;
  border-bottom: 1px solid var(--cor-borda);
  vertical-align: middle;
}
th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cor-texto-suave);
  background: var(--cor-fundo);
  white-space: nowrap;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
tr.divergente td {
  background: var(--cor-erro-suave);
}
.local {
  font-family: 'Zen Dots', sans-serif;
  font-size: 0.8125rem;
  padding: 4px 8px;
  border-radius: 6px;
  color: #fff;
  background: var(--cor-primaria);
  white-space: nowrap;
}
.local.vazio {
  font-family: inherit;
  color: var(--cor-texto-suave);
  background: var(--cor-fundo);
  border: 1px dashed var(--cor-borda);
}
.produto {
  display: flex;
  align-items: center;
  gap: 10px;
}
.produto img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.produto > span {
  display: flex;
  flex-direction: column;
}
code {
  font-size: 0.75rem;
  color: var(--cor-texto-suave);
}
.selo-falta,
.selo-ok {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}
.selo-falta {
  color: var(--cor-erro);
  background: #ffe3e3;
}
.selo-ok {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-suave);
}
.acoes {
  text-align: right;
  white-space: nowrap;
}
.acoes .botao {
  padding: 5px 12px;
  font-size: 0.8125rem;
  margin-left: 6px;
}
.edicao {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.edicao input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid var(--cor-borda);
  border-radius: 6px;
  font: inherit;
  text-transform: uppercase;
}
</style>
