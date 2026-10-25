<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { centroApi } from '@/api/centroDistribuicao'
import type { Expedicao, Manifesto, PacoteManifesto, StatusManifesto } from '@/api/types'
import CampoBipagem, { type RetornoBipe } from '@/components/CampoBipagem.vue'
import StatusSelo from '@/components/StatusSelo.vue'
import { useSessaoStore } from '@/stores/sessao'
import { confirmar, toastErro, toastSucesso } from '@/utils/alertas'
import type { TomStatus } from '@/utils/logistica'
import { formatarDataHora, formatarPeso, numeroPedido } from '@/utils/logistica'

const props = defineProps<{ id?: string }>()
const router = useRouter()
const sessao = useSessaoStore()

const doca = ref<Expedicao | null>(null)
const manifesto = ref<Manifesto | null>(null)
const erro = ref<string | null>(null)
const ocupado = ref(false)
const retorno = ref<RetornoBipe | null>(null)

const STATUS: Record<StatusManifesto, { nome: string; tom: TomStatus }> = {
  Aberto: { nome: 'Aberto na doca', tom: 'cd' },
  Fechado: { nome: 'Fechado, aguardando coleta', tom: 'transporte' },
  Coletado: { nome: 'Coletado', tom: 'concluido' },
}

const pesoTotal = computed(() => manifesto.value?.pacotes.reduce((t, p) => t + (p.pesoGramas ?? 0), 0) ?? 0)
const temAberto = computed(() => doca.value?.manifestos.some((m) => m.status === 'Aberto') ?? false)

async function carregar() {
  erro.value = null
  retorno.value = null
  try {
    const [lista, atual] = await Promise.all([centroApi.expedicao(), props.id ? centroApi.manifesto(Number(props.id)) : Promise.resolve(null)])
    doca.value = lista
    manifesto.value = atual
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a expedição.'
  }
}
watch(() => props.id, carregar, { immediate: true })

async function abrir() {
  ocupado.value = true
  try {
    const novo = await centroApi.abrirManifesto()
    await router.push({ name: 'logistica-expedicao', params: { id: novo.id } })
  } catch (e) {
    toastErro('Não foi possível abrir o manifesto', e instanceof Error ? e.message : undefined)
  } finally {
    ocupado.value = false
  }
}

async function bipar(codigo: string) {
  if (!manifesto.value) return
  ocupado.value = true
  try {
    manifesto.value = await centroApi.biparPacote(manifesto.value.id, codigo)
    retorno.value = { tipo: 'ok', texto: `${codigo.toUpperCase()} na doca. ${manifesto.value.pacotes.length} volume(s) no manifesto.` }
  } catch (e) {
    retorno.value = { tipo: 'erro', texto: e instanceof Error ? e.message : 'Bipe recusado.' }
  } finally {
    ocupado.value = false
  }
}

async function retirar(p: PacoteManifesto) {
  if (!manifesto.value) return
  try {
    manifesto.value = await centroApi.retirarPacote(manifesto.value.id, p.envioId)
    retorno.value = { tipo: 'ok', texto: `${p.codigoRastreio} saiu do manifesto.` }
  } catch (e) {
    toastErro('Não foi possível tirar o pacote', e instanceof Error ? e.message : undefined)
  }
}

async function fechar() {
  if (!manifesto.value) return
  const ok = await confirmar({
    titulo: `Fechar o manifesto #${manifesto.value.id}?`,
    texto: `${manifesto.value.pacotes.length} volume(s). Depois de fechado, nenhum pacote entra ou sai.`,
    confirmar: 'Fechar manifesto',
  })
  if (!ok) return
  try {
    manifesto.value = await centroApi.fecharManifesto(manifesto.value.id)
  } catch (e) {
    toastErro('Não foi possível fechar', e instanceof Error ? e.message : undefined)
  }
}

async function coletar() {
  if (!manifesto.value) return
  const ok = await confirmar({
    titulo: 'Confirmar a coleta?',
    texto: `A ${manifesto.value.transportadora} levou os ${manifesto.value.pacotes.length} volume(s). Os pedidos passam para "A caminho".`,
    confirmar: 'Coleta feita',
  })
  if (!ok) return
  try {
    manifesto.value = await centroApi.coletar(manifesto.value.id)
    toastSucesso('Coleta confirmada', { texto: `${manifesto.value.pacotes.length} pacote(s) expedido(s)` })
  } catch (e) {
    toastErro('Não foi possível confirmar a coleta', e instanceof Error ? e.message : undefined)
  }
}
</script>

<template>
  <div class="expedicao">
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <!-- Doca -->
    <template v-if="!id && doca">
      <div class="cartao bloco resumo-doca">
        <div>
          <strong class="numero">{{ doca.prontosSemManifesto }}</strong>
          <span>pacote(s) etiquetado(s) fora de manifesto</span>
        </div>
        <button v-if="sessao.operaCentro && !temAberto" type="button" class="botao destaque" :disabled="ocupado" data-testid="abrir-manifesto" @click="abrir">
          Abrir manifesto de coleta
        </button>
      </div>

      <p v-if="!doca.manifestos.length" class="nota">Nenhum manifesto ainda.</p>
      <ul class="manifestos">
        <li v-for="m in doca.manifestos" :key="m.id">
          <RouterLink :to="{ name: 'logistica-expedicao', params: { id: m.id } }" class="cartao item">
            <span class="linha1">
              <strong>Manifesto #{{ m.id }}</strong>
              <StatusSelo :texto="STATUS[m.status].nome" :tom="STATUS[m.status].tom" />
            </span>
            <span>{{ m.transportadora }} · {{ m.volumes }} volume(s) · {{ formatarPeso(m.pesoGramas) }}</span>
            <small>{{ m.coletadoEm ? `Coletado ${formatarDataHora(m.coletadoEm)}` : `Aberto ${formatarDataHora(m.criadoEm)}` }}</small>
          </RouterLink>
        </li>
      </ul>
    </template>

    <!-- Um manifesto -->
    <template v-else-if="manifesto">
      <div class="topo">
        <RouterLink :to="{ name: 'logistica-expedicao' }" class="voltar">← Doca</RouterLink>
        <h3>Manifesto #{{ manifesto.id }} · {{ manifesto.transportadora }}</h3>
        <StatusSelo :texto="STATUS[manifesto.status].nome" :tom="STATUS[manifesto.status].tom" />
      </div>

      <div class="totais">
        <span><strong>{{ manifesto.pacotes.length }}</strong> volume(s)</span>
        <span><strong>{{ formatarPeso(pesoTotal) }}</strong> no total</span>
        <span v-if="manifesto.status === 'Aberto'"><strong>{{ manifesto.prontosForaDoManifesto }}</strong> pronto(s) ainda fora</span>
      </div>

      <div v-if="sessao.operaCentro && manifesto.status === 'Aberto'" class="cartao bloco">
        <CampoBipagem
          rotulo="Bipe cada etiqueta ao colocar o pacote na doca"
          placeholder="Ex.: SC123456789BR"
          :desabilitado="ocupado"
          :retorno="retorno"
          @bipar="bipar"
        />
      </div>

      <div class="cartao tabela">
        <table>
          <thead>
            <tr>
              <th>Rastreio</th>
              <th class="col-pedido">Pedido</th>
              <th>Destino</th>
              <th>Volume</th>
              <th><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in manifesto.pacotes" :key="p.envioId" data-testid="pacote">
              <td>
                <code>{{ p.codigoRastreio }}</code>
                <small class="so-celular">Pedido #{{ numeroPedido(p.pedidoId) }}</small>
              </td>
              <td class="col-pedido">#{{ numeroPedido(p.pedidoId) }}</td>
              <td>
                {{ p.destinatario }}
                <small>{{ p.cidade }}, {{ p.uf }}</small>
              </td>
              <td>{{ p.caixa ?? '—' }} · {{ p.pesoGramas ? formatarPeso(p.pesoGramas) : '—' }}</td>
              <td class="acoes">
                <button v-if="sessao.operaCentro && manifesto.status === 'Aberto'" type="button" class="botao secundario" @click="retirar(p)">Tirar</button>
              </td>
            </tr>
            <tr v-if="!manifesto.pacotes.length">
              <td colspan="5" class="nota">Nenhum pacote bipado ainda.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="sessao.operaCentro" class="botoes">
        <button v-if="manifesto.status === 'Aberto'" type="button" class="botao" :disabled="!manifesto.pacotes.length" data-testid="fechar-manifesto" @click="fechar">
          Fechar manifesto
        </button>
        <button v-if="manifesto.status === 'Fechado'" type="button" class="botao destaque grande" data-testid="confirmar-coleta" @click="coletar">
          Confirmar coleta
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.expedicao {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.bloco {
  padding: 16px 18px;
}
.resumo-doca {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.resumo-doca div {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--cor-texto-suave);
}
.numero {
  font-size: 1.75rem;
  color: var(--cor-primaria);
}
.manifestos {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  color: inherit;
  font-size: 0.875rem;
  transition:
    transform 0.2s var(--ease-suave),
    box-shadow 0.2s;
}
.item:hover {
  color: inherit;
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}
.linha1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.linha1 strong {
  color: var(--cor-primaria);
}
.item small {
  color: var(--cor-texto-suave);
}
.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}
.topo h3 {
  flex: 1;
  min-width: 220px;
  font-size: 1.125rem;
}
.voltar {
  font-size: 0.875rem;
  font-weight: 600;
}
.totais {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.totais strong {
  color: var(--cor-texto);
  font-size: 1.125rem;
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
}
th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cor-texto-suave);
  background: var(--cor-fundo);
  white-space: nowrap;
}
td small {
  display: block;
  color: var(--cor-texto-suave);
  font-size: 0.75rem;
}
code {
  font-size: 0.8125rem;
}
.acoes {
  text-align: right;
}
.acoes .botao {
  padding: 4px 10px;
  font-size: 0.75rem;
}
.botoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.so-celular {
  display: none;
}
/* No celular o número do pedido vai para baixo do rastreio: a tabela cabe sem rolar de lado. */
@media (max-width: 600px) {
  .col-pedido {
    display: none;
  }
  td small.so-celular {
    display: block;
  }
  th,
  td {
    padding: 10px 8px;
  }
}
</style>
