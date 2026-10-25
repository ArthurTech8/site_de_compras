<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { centroApi } from '@/api/centroDistribuicao'
import type { ItemColeta, Onda, OndaResumo } from '@/api/types'
import CampoBipagem, { type RetornoBipe } from '@/components/CampoBipagem.vue'
import StatusSelo from '@/components/StatusSelo.vue'
import { useSessaoStore } from '@/stores/sessao'
import { confirmar, toastErro, toastSucesso } from '@/utils/alertas'
import { urlImagem } from '@/utils/formatar'
import { STATUS_ENVIO, formatarDataHora, numeroPedido } from '@/utils/logistica'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const sessao = useSessaoStore()

const ondas = ref<OndaResumo[]>([])
const onda = ref<Onda | null>(null)
const erro = ref<string | null>(null)
const ocupado = ref(false)
const retorno = ref<RetornoBipe | null>(null)
const tamanho = ref(10)

const abertas = computed(() => ondas.value.filter((o) => o.status === 'Aberta'))
const concluidas = computed(() => ondas.value.filter((o) => o.status === 'Concluida'))
const unidades = computed(() => onda.value?.coleta.reduce((t, c) => t + c.quantidade, 0) ?? 0)
const separadas = computed(() => onda.value?.coleta.reduce((t, c) => t + c.separadas, 0) ?? 0)
const pronta = computed(() => !!onda.value && onda.value.envios.every((e) => e.status !== 'EmSeparacao'))
/** A próxima parada da rota: a primeira prateleira que ainda tem unidade para pegar. */
const proxima = computed(() => onda.value?.coleta.find((c) => c.separadas < c.quantidade)?.produtoId)

async function carregar() {
  erro.value = null
  try {
    const [lista, atual] = await Promise.all([centroApi.ondas(), props.id ? centroApi.onda(Number(props.id)) : Promise.resolve(null)])
    ondas.value = lista
    onda.value = atual
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a separação.'
  }
}
watch(() => props.id, () => {
  retorno.value = null
  void carregar()
}, { immediate: true })

async function gerar() {
  ocupado.value = true
  try {
    const nova = await centroApi.gerarOnda(tamanho.value)
    toastSucesso(`Onda #${nova.id} criada`, { texto: `${nova.envios.length} envios para separar` })
    await router.push({ name: 'logistica-separacao', params: { id: nova.id } })
  } catch (e) {
    toastErro('Não foi possível gerar a onda', e instanceof Error ? e.message : undefined)
  } finally {
    ocupado.value = false
  }
}

async function bipar(codigo: string) {
  if (!onda.value) return
  ocupado.value = true
  try {
    const r = await centroApi.biparNaOnda(onda.value.id, codigo)
    onda.value = r.onda
    retorno.value = { tipo: 'ok', texto: r.mensagem }
  } catch (e) {
    retorno.value = { tipo: 'erro', texto: e instanceof Error ? e.message : 'Bipe recusado.' }
  } finally {
    ocupado.value = false
  }
}

async function falta(item: ItemColeta) {
  if (!onda.value) return
  const ok = await confirmar({
    titulo: `Registrar falta de ${item.nome}?`,
    texto: `Os envios que ainda esperam este produto voltam para a fila e só entram em nova onda depois do inventário da prateleira ${item.local ?? 'sem endereço'}.`,
    confirmar: 'Registrar falta',
    cancelar: 'Voltar',
    icone: 'warning',
  })
  if (!ok) return
  try {
    const r = await centroApi.falta(onda.value.id, item.produtoId)
    onda.value = r.onda
    retorno.value = { tipo: 'erro', texto: r.mensagem }
  } catch (e) {
    toastErro('Não foi possível registrar a falta', e instanceof Error ? e.message : undefined)
  }
}

async function concluir() {
  if (!onda.value) return
  try {
    await centroApi.concluirOnda(onda.value.id)
    toastSucesso(`Onda #${onda.value.id} concluída`, { texto: 'Os pacotes seguem para a embalagem.' })
    await router.push({ name: 'logistica-separacao' })
  } catch (e) {
    toastErro('Não foi possível concluir', e instanceof Error ? e.message : undefined)
  }
}
</script>

<template>
  <div class="separacao">
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <!-- Lista de ondas -->
    <template v-if="!id">
      <div class="cartao gerar">
        <div>
          <h3>Gerar onda de separação</h3>
          <p class="nota">Junta os envios com o menor prazo de despacho e monta a rota pela ordem das prateleiras.</p>
        </div>
        <form v-if="sessao.operaCentro" class="gerar-form" @submit.prevent="gerar">
          <label class="campo">
            Envios na onda
            <select id="tamanho-onda" v-model.number="tamanho">
              <option v-for="n in [5, 10, 20, 30]" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
          <button type="submit" class="botao destaque" :disabled="ocupado" data-testid="gerar-onda">Gerar onda</button>
        </form>
      </div>

      <h3 class="subtitulo">Ondas abertas</h3>
      <p v-if="!abertas.length" class="nota">Nenhuma onda aberta.</p>
      <ul class="ondas">
        <li v-for="o in [...abertas, ...concluidas]" :key="o.id">
          <RouterLink :to="{ name: 'logistica-separacao', params: { id: o.id } }" class="cartao onda-item" :class="{ concluida: o.status === 'Concluida' }">
            <strong>Onda #{{ o.id }}</strong>
            <span>{{ o.envios }} envios · {{ o.separadas }}/{{ o.unidades }} unidades</span>
            <small>{{ o.status === 'Aberta' ? `Aberta ${formatarDataHora(o.criadaEm)}` : `Concluída ${formatarDataHora(o.concluidaEm!)}` }}</small>
            <span class="barra" aria-hidden="true"><span :style="{ width: `${o.unidades ? (o.separadas / o.unidades) * 100 : 0}%` }" /></span>
          </RouterLink>
        </li>
      </ul>
    </template>

    <!-- Uma onda -->
    <template v-else-if="onda">
      <div class="topo-onda">
        <RouterLink :to="{ name: 'logistica-separacao' }" class="voltar">← Ondas</RouterLink>
        <h3>Onda #{{ onda.id }} · {{ onda.envios.length }} envios · {{ unidades }} unidades</h3>
        <button
          v-if="sessao.operaCentro && onda.status === 'Aberta'"
          type="button"
          class="botao destaque"
          :disabled="!pronta"
          data-testid="concluir-onda"
          @click="concluir"
        >
          Concluir onda
        </button>
        <StatusSelo v-else :texto="onda.status === 'Aberta' ? 'Aberta' : 'Concluída'" :tom="onda.status === 'Aberta' ? 'cd' : 'concluido'" />
      </div>

      <div class="progresso" role="progressbar" :aria-valuenow="separadas" :aria-valuemax="unidades" aria-label="Unidades separadas">
        <span :style="{ width: `${unidades ? (separadas / unidades) * 100 : 0}%` }" />
      </div>

      <CampoBipagem
        v-if="sessao.operaCentro && onda.status === 'Aberta'"
        rotulo="Bipe o SKU do produto ao tirá-lo da prateleira"
        placeholder="Ex.: CAN-0005"
        :desabilitado="ocupado || pronta"
        :retorno="retorno"
        @bipar="bipar"
      />

      <div class="colunas">
        <section class="cartao bloco">
          <h4>Rota de coleta</h4>
          <ol class="coleta">
            <li
              v-for="c in onda.coleta"
              :key="c.produtoId"
              :class="{ feito: c.separadas >= c.quantidade, proxima: c.produtoId === proxima }"
              data-testid="parada"
            >
              <span class="local">{{ c.local ?? 'S/ end.' }}</span>
              <img :src="urlImagem(c.imagemUrl)" alt="" />
              <span class="produto">
                <strong>{{ c.nome }}</strong>
                <code>{{ c.sku }}</code>
              </span>
              <span class="contagem">{{ c.separadas }}/{{ c.quantidade }}</span>
              <button
                v-if="sessao.operaCentro && onda.status === 'Aberta' && c.separadas < c.quantidade"
                type="button"
                class="botao secundario falta"
                @click="falta(c)"
              >
                Falta
              </button>
            </li>
          </ol>
          <p v-if="!onda.coleta.length" class="nota">Nada a coletar.</p>
        </section>

        <section class="cartao bloco">
          <h4>Envios da onda</h4>
          <ul class="envios">
            <li v-for="e in onda.envios" :key="e.id">
              <span>
                <strong>#{{ numeroPedido(e.pedidoId) }}</strong>
                <small>{{ e.destinatario }}</small>
              </span>
              <span class="contagem">{{ e.separadas }}/{{ e.unidades }}</span>
              <StatusSelo :texto="STATUS_ENVIO[e.status].nome" :tom="e.status === 'Separado' ? 'concluido' : 'cd'" />
            </li>
          </ul>
          <p v-if="!onda.envios.length" class="nota">Todos os envios saíram da onda.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.separacao {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
h3 {
  font-size: 1.125rem;
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.gerar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 18px 20px;
}
.gerar h3 {
  margin-bottom: 4px;
}
.gerar-form {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.subtitulo {
  margin-top: 4px;
}
.ondas {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.onda-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  color: inherit;
  transition:
    transform 0.2s var(--ease-suave),
    box-shadow 0.2s;
}
.onda-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
  color: inherit;
}
.onda-item strong {
  color: var(--cor-primaria);
}
.onda-item span,
.onda-item small {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.onda-item.concluida {
  opacity: 0.7;
}
.barra,
.progresso {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: var(--cor-primaria-suave);
  overflow: hidden;
}
.barra span,
.progresso span {
  display: block;
  height: 100%;
  background: var(--gradiente-sucesso);
  transition: width 0.4s var(--ease-suave);
}
.progresso {
  height: 10px;
}
.topo-onda {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.topo-onda h3 {
  flex: 1;
  min-width: 220px;
}
.voltar {
  font-size: 0.875rem;
  font-weight: 600;
}
.colunas {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.bloco {
  padding: 16px 18px;
}
.bloco h4 {
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cor-texto-suave);
  margin-bottom: 10px;
}
.coleta,
.envios {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.coleta li {
  display: grid;
  grid-template-columns: auto 40px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  transition:
    background 0.2s,
    border-color 0.2s;
}
.coleta li.proxima {
  border-color: var(--cor-destaque);
  background: var(--cor-destaque-suave);
}
.coleta li.feito {
  background: var(--cor-sucesso-suave);
  border-color: #b2f2bb;
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
.feito .local {
  background: var(--cor-sucesso);
}
.coleta img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.produto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.produto strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
code {
  font-size: 0.75rem;
  color: var(--cor-texto-suave);
}
.contagem {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.falta {
  padding: 4px 10px;
  font-size: 0.75rem;
}
.envios li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cor-borda);
}
.envios li:last-child {
  border-bottom: 0;
}
.envios li > span:first-child {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.envios small {
  color: var(--cor-texto-suave);
  font-size: 0.75rem;
}
@media (max-width: 760px) {
  .colunas {
    grid-template-columns: 1fr;
  }
  .coleta li {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .coleta img {
    display: none;
  }
  .coleta .falta {
    grid-column: 1 / -1;
    justify-self: end;
  }
}
</style>
