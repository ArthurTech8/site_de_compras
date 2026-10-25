<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { logisticaApi } from '@/api/logistica'
import { ETAPAS_ENVIO, type Envio, type EnvioResumo, type PagedResult, type PainelLogistica, type StatusEnvio } from '@/api/types'
import LinhaDoTempo from '@/components/LinhaDoTempo.vue'
import Paginacao from '@/components/Paginacao.vue'
import StatusSelo from '@/components/StatusSelo.vue'
import { useRouter } from 'vue-router'
import { useSessaoStore } from '@/stores/sessao'
import { toastErro, toastSucesso } from '@/utils/alertas'
import { STATUS_ENVIO, acaoNoCentro, cidadeEndereco, formatarDataHora, linhaEndereco, proximaEtapa } from '@/utils/logistica'

const sessao = useSessaoStore()
const router = useRouter()

const painel = ref<PainelLogistica | null>(null)
const fila = ref<PagedResult<EnvioResumo> | null>(null)
const erro = ref<string | null>(null)
const carregando = ref(false)
const filtro = reactive<{ status: StatusEnvio | ''; atrasados: boolean; busca: string; pagina: number }>({
  status: '',
  atrasados: false,
  busca: '',
  pagina: 1,
})

/** Envio aberto na linha, com o histórico completo. */
const aberto = ref<Envio | null>(null)
const avancando = ref<string | null>(null)

const noCentro = ETAPAS_ENVIO.slice(1, 5)
const comTransportadora = ETAPAS_ENVIO.slice(5, 8)
const soma = (etapas: readonly StatusEnvio[]) => etapas.reduce((t, s) => t + (painel.value?.porStatus[s] ?? 0), 0)

const indicadores = computed(() => [
  { chave: 'fila', rotulo: 'Na fila de separação', valor: painel.value?.porStatus.AguardandoSeparacao ?? 0 },
  { chave: 'cd', rotulo: 'Em preparação no CD', valor: soma(noCentro) },
  { chave: 'atrasados', rotulo: 'Despacho atrasado', valor: painel.value?.atrasados ?? 0, alerta: true },
  { chave: 'hoje', rotulo: 'Despacho vence hoje', valor: painel.value?.despachoVenceHoje ?? 0 },
  { chave: 'transporte', rotulo: 'Com a transportadora', valor: soma(comTransportadora) },
  { chave: 'entregues', rotulo: 'Entregues hoje', valor: painel.value?.entreguesHoje ?? 0 },
  { chave: 'divergencias', rotulo: 'Faltas no estoque', valor: painel.value?.divergenciasAbertas ?? 0, alerta: true },
])

/** Só os indicadores que correspondem exatamente a um filtro da lista (ou a uma tela) viram botão. */
const filtraveis = ['fila', 'atrasados', 'divergencias']

function filtrarPorIndicador(chave: string) {
  if (chave === 'divergencias') {
    void router.push({ name: 'logistica-estoque' })
    return
  }
  filtro.atrasados = chave === 'atrasados'
  filtro.status = chave === 'fila' ? 'AguardandoSeparacao' : ''
}

/** Depois da coleta, o envio ainda anda pelo "avançar" até existir o simulador de transporte. */
const avancavel = (status: StatusEnvio) => !!proximaEtapa(status) && ETAPAS_ENVIO.indexOf(status) >= ETAPAS_ENVIO.indexOf('Expedido')

let controle: AbortController | undefined
async function carregar() {
  controle?.abort()
  controle = new AbortController()
  carregando.value = true
  erro.value = null
  try {
    const [p, f] = await Promise.all([
      logisticaApi.painel(),
      logisticaApi.envios(
        { status: filtro.status || undefined, atrasados: filtro.atrasados, busca: filtro.busca.trim() || undefined, pagina: filtro.pagina },
        controle.signal,
      ),
    ])
    painel.value = p
    fila.value = f
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a logística.'
  } finally {
    carregando.value = false
  }
}

async function alternar(linha: EnvioResumo) {
  if (aberto.value?.id === linha.id) {
    aberto.value = null
    return
  }
  try {
    aberto.value = await logisticaApi.envio(linha.id)
  } catch (e) {
    toastErro('Não foi possível abrir o envio', e instanceof Error ? e.message : undefined)
  }
}

async function avancar(linha: EnvioResumo) {
  const proxima = proximaEtapa(linha.status)
  if (!proxima) return
  avancando.value = linha.id
  try {
    const envio = await logisticaApi.avancar(linha.id)
    if (aberto.value?.id === envio.id) aberto.value = envio
    toastSucesso(`Envio em "${STATUS_ENVIO[envio.status].nome}"`, {
      texto: envio.codigoRastreio && envio.status === 'ProntoParaEnvio' ? `Código ${envio.codigoRastreio}` : undefined,
    })
    await carregar()
  } catch (e) {
    toastErro('Não foi possível avançar', e instanceof Error ? e.message : undefined)
  } finally {
    avancando.value = null
  }
}

// Busca espera a pessoa parar de digitar; os outros filtros recarregam na hora.
let espera: ReturnType<typeof setTimeout> | undefined
watch(
  () => filtro.busca,
  () => {
    clearTimeout(espera)
    espera = setTimeout(() => (filtro.pagina === 1 ? carregar() : (filtro.pagina = 1)), 350)
  },
)
watch(
  () => [filtro.status, filtro.atrasados],
  () => (filtro.pagina === 1 ? carregar() : (filtro.pagina = 1)),
)
watch(() => filtro.pagina, carregar)

onMounted(carregar)
onBeforeUnmount(() => {
  clearTimeout(espera)
  controle?.abort()
})
</script>

<template>
  <section class="logistica">
    <div class="topo">
      <h3>Painel e fila de envios</h3>
      <button type="button" class="botao secundario" :disabled="carregando" @click="carregar">↻ Atualizar</button>
    </div>
    <p v-if="!sessao.operaLogistica" class="nota">Você pode consultar os envios, mas não movê-los.</p>

    <ul class="indicadores">
      <li v-for="i in indicadores" :key="i.chave">
        <component
          :is="filtraveis.includes(i.chave) ? 'button' : 'div'"
          :type="filtraveis.includes(i.chave) ? 'button' : undefined"
          class="indicador cartao"
          :class="{ alerta: i.alerta && i.valor > 0, filtravel: filtraveis.includes(i.chave) }"
          :data-testid="`indicador-${i.chave}`"
          @click="filtraveis.includes(i.chave) && filtrarPorIndicador(i.chave)"
        >
          <strong>{{ i.valor }}</strong>
          <span>{{ i.rotulo }}{{ filtraveis.includes(i.chave) ? ' ›' : '' }}</span>
        </component>
      </li>
    </ul>

    <div class="filtros">
      <label class="campo">
        Etapa
        <select id="filtro-status" v-model="filtro.status">
          <option value="">Todas</option>
          <option v-for="s in ETAPAS_ENVIO" :key="s" :value="s">{{ STATUS_ENVIO[s].nome }}</option>
        </select>
      </label>
      <label class="campo busca">
        Buscar
        <input id="filtro-busca" v-model="filtro.busca" type="search" placeholder="Pedido, código, nome ou cidade" maxlength="100" />
      </label>
      <label class="so-atrasados">
        <input id="filtro-atrasados" v-model="filtro.atrasados" type="checkbox" />
        Só atrasados
      </label>
    </div>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <div v-if="fila && !fila.itens.length" class="vazio">
      <span class="icone-vazio" aria-hidden="true">📭</span>
      <p>Nenhum envio com esses filtros.</p>
    </div>

    <div v-else-if="fila" class="tabela-envios cartao">
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Destino</th>
            <th>Etapa</th>
            <th>Despachar até</th>
            <th>Previsão</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="linha in fila.itens" :key="linha.id">
            <tr :class="{ aberto: aberto?.id === linha.id }" data-testid="linha-envio">
              <td>
                <button type="button" class="link" :aria-expanded="aberto?.id === linha.id" @click="alternar(linha)">
                  #{{ linha.pedidoId.slice(0, 8).toUpperCase() }}
                </button>
                <small v-if="linha.codigoRastreio">{{ linha.codigoRastreio }}</small>
              </td>
              <td>
                {{ linha.destinatario }}
                <small>{{ linha.cidade }}, {{ linha.uf }}</small>
              </td>
              <td>
                <StatusSelo :texto="STATUS_ENVIO[linha.status].nome" :tom="STATUS_ENVIO[linha.status].tom" :atrasado="linha.atrasado" />
              </td>
              <td :class="{ atrasado: linha.atrasado }">{{ formatarDataHora(linha.prazoDespacho) }}</td>
              <td>{{ formatarDataHora(linha.previsaoEntrega) }}</td>
              <td class="acoes">
                <RouterLink
                  v-if="acaoNoCentro(linha)"
                  :to="acaoNoCentro(linha)!.rota"
                  class="botao secundario"
                  data-testid="acao-cd"
                >
                  {{ acaoNoCentro(linha)!.rotulo }} →
                </RouterLink>
                <button
                  v-else-if="sessao.operaLogistica && avancavel(linha.status)"
                  type="button"
                  class="botao"
                  :disabled="avancando === linha.id"
                  data-testid="avancar"
                  @click="avancar(linha)"
                >
                  {{ STATUS_ENVIO[proximaEtapa(linha.status)!].nome }} →
                </button>
              </td>
            </tr>
            <tr v-if="aberto?.id === linha.id" class="detalhe">
              <td colspan="6">
                <div class="detalhe-envio">
                  <address>
                    <strong>{{ aberto.destino.destinatario }}</strong>
                    <span>{{ linhaEndereco(aberto.destino) }}</span>
                    <span>{{ cidadeEndereco(aberto.destino) }}</span>
                    <RouterLink :to="{ name: 'pedido', params: { id: aberto.pedidoId } }">Ver pedido</RouterLink>
                  </address>
                  <LinhaDoTempo :eventos="aberto.eventos" :status="aberto.status" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Paginacao v-if="fila" :pagina="fila.pagina" :total-paginas="fila.totalPaginas" @mudar="filtro.pagina = $event" />
  </section>
</template>

<style scoped>
.logistica {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.topo h3 {
  font-size: 1.125rem;
}
.topo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.indicadores {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.indicador {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  font: inherit;
  text-align: left;
  color: inherit;
  transition:
    transform 0.2s var(--ease-suave),
    box-shadow 0.2s;
}
.indicador.filtravel {
  cursor: pointer;
}
.indicador.filtravel:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}
.indicador strong {
  font-size: 1.75rem;
  line-height: 1;
  color: var(--cor-primaria);
  font-variant-numeric: tabular-nums;
}
.indicador span {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.indicador.alerta {
  border-color: #ffc9c9;
  background: var(--cor-erro-suave);
}
.indicador.alerta strong {
  color: var(--cor-erro);
}
.filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
}
.busca {
  flex: 1;
  min-width: 220px;
}
.busca input {
  width: 100%;
}
.so-atrasados {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 10px;
  font-size: 0.875rem;
  cursor: pointer;
}
.so-atrasados input {
  accent-color: var(--cor-erro);
}
.tabela-envios {
  /* Relativo para o texto só de leitor de tela não escapar da rolagem e alargar a página. */
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
td small {
  display: block;
  color: var(--cor-texto-suave);
  font-size: 0.75rem;
}
td.atrasado {
  color: var(--cor-erro);
  font-weight: 700;
}
tr.aberto td {
  background: var(--cor-primaria-suave);
}
.link {
  font: inherit;
  font-weight: 700;
  color: var(--cor-primaria);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: 'Zen Dots', sans-serif;
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
}
.acoes {
  text-align: right;
}
.acoes .botao {
  padding: 6px 12px;
  font-size: 0.8125rem;
  white-space: nowrap;
}
.detalhe td {
  background: var(--cor-fundo);
}
.detalhe-envio {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 24px;
  padding: 8px 0;
}
address {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-style: normal;
  color: var(--cor-texto-suave);
}
address strong {
  color: var(--cor-texto);
}
@media (max-width: 700px) {
  .detalhe-envio {
    grid-template-columns: 1fr;
  }
}
</style>
