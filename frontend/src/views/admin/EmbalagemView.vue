<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { centroApi } from '@/api/centroDistribuicao'
import { logisticaApi } from '@/api/logistica'
import type { Embalagem, EnvioResumo } from '@/api/types'
import CampoBipagem, { type RetornoBipe } from '@/components/CampoBipagem.vue'
import StatusSelo from '@/components/StatusSelo.vue'
import { useSessaoStore } from '@/stores/sessao'
import { toastErro, toastSucesso } from '@/utils/alertas'
import { urlImagem } from '@/utils/formatar'
import { STATUS_ENVIO, formatarDataHora, formatarPeso, numeroPedido } from '@/utils/logistica'

const props = defineProps<{ envioId?: string }>()
const router = useRouter()
const sessao = useSessaoStore()

const fila = ref<EnvioResumo[]>([])
const aEtiquetar = ref<EnvioResumo[]>([])
const bancada = ref<Embalagem | null>(null)
const erro = ref<string | null>(null)
const ocupado = ref(false)
const retorno = ref<RetornoBipe | null>(null)
const caixa = ref('')
const peso = ref<number | null>(null)

const faltamConferir = computed(() => bancada.value?.itens.reduce((t, i) => t + i.quantidade - i.conferidas, 0) ?? 0)
const caixaEscolhida = computed(() => bancada.value?.caixas.find((c) => c.codigo === caixa.value))

async function carregar() {
  erro.value = null
  retorno.value = null
  try {
    if (props.envioId) {
      bancada.value = await centroApi.embalagem(props.envioId)
      caixa.value = bancada.value.pacote?.caixa ?? bancada.value.caixaSugerida
      peso.value = bancada.value.pacote?.pesoGramas ?? caixaEscolhida.value?.pesoEsperadoGramas ?? null
    } else {
      bancada.value = null
      const [separados, embalados] = await Promise.all([
        logisticaApi.envios({ status: 'Separado', tamanhoPagina: 50 }),
        logisticaApi.envios({ status: 'Embalado', tamanhoPagina: 50 }),
      ])
      fila.value = separados.itens
      aEtiquetar.value = embalados.itens
    }
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a embalagem.'
  }
}
watch(() => props.envioId, carregar, { immediate: true })

// Sem balança de verdade: trocar a caixa preenche o peso esperado com ela.
watch(caixa, () => {
  if (bancada.value?.status === 'Separado' && caixaEscolhida.value) peso.value = caixaEscolhida.value.pesoEsperadoGramas
})

/** Bipe do número do pedido (ou do código do envio) para abrir a bancada. */
async function abrirPorCodigo(codigo: string) {
  const busca = codigo.replace(/^#/, '').trim()
  const achados = [...fila.value, ...aEtiquetar.value].filter(
    (e) => e.pedidoId.toUpperCase().startsWith(busca.toUpperCase()) || e.id.toUpperCase().startsWith(busca.toUpperCase()),
  )
  if (achados.length === 1) {
    await router.push({ name: 'logistica-embalagem', params: { envioId: achados[0].id } })
  } else {
    retorno.value = {
      tipo: 'erro',
      texto: achados.length ? 'Mais de um envio começa com esse número. Bipe o número completo.' : `Nenhum envio separado com o pedido #${busca.toUpperCase()}.`,
    }
  }
}

async function conferir(codigo: string) {
  if (!bancada.value) return
  ocupado.value = true
  try {
    const antes = new Map(bancada.value.itens.map((i) => [i.produtoId, i.conferidas]))
    bancada.value = await centroApi.conferir(bancada.value.envioId, codigo)
    const item = bancada.value.itens.find((i) => i.conferidas !== antes.get(i.produtoId))
    retorno.value = { tipo: 'ok', texto: item ? `${item.nome}: ${item.conferidas} de ${item.quantidade}.` : 'Conferido.' }
  } catch (e) {
    retorno.value = { tipo: 'erro', texto: e instanceof Error ? e.message : 'Bipe recusado.' }
  } finally {
    ocupado.value = false
  }
}

async function fecharCaixa() {
  if (!bancada.value || !peso.value) return
  ocupado.value = true
  try {
    bancada.value = await centroApi.embalar(bancada.value.envioId, caixa.value, peso.value)
    toastSucesso('Caixa fechada', { texto: `${caixaEscolhida.value?.nome} · ${formatarPeso(peso.value)}` })
  } catch (e) {
    toastErro('Não foi possível fechar a caixa', e instanceof Error ? e.message : undefined)
  } finally {
    ocupado.value = false
  }
}

async function gerarEtiqueta() {
  if (!bancada.value) return
  ocupado.value = true
  try {
    const etiqueta = await centroApi.gerarEtiqueta(bancada.value.envioId)
    toastSucesso('Etiqueta gerada', { texto: etiqueta.codigoRastreio })
    await router.push({ name: 'logistica-etiqueta', params: { envioId: etiqueta.envioId } })
  } catch (e) {
    toastErro('Não foi possível gerar a etiqueta', e instanceof Error ? e.message : undefined)
  } finally {
    ocupado.value = false
  }
}
</script>

<template>
  <div class="embalagem">
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <!-- Fila da bancada -->
    <template v-if="!envioId">
      <div class="cartao bloco">
        <CampoBipagem
          rotulo="Bipe o número do pedido que chegou da separação"
          placeholder="Ex.: 1F126056"
          :retorno="retorno"
          @bipar="abrirPorCodigo"
        />
      </div>

      <section>
        <h3>Separados, esperando a bancada <span class="contador">{{ fila.length }}</span></h3>
        <p v-if="!fila.length" class="nota">Nenhum envio separado agora.</p>
        <ul class="fila">
          <li v-for="e in fila" :key="e.id">
            <RouterLink :to="{ name: 'logistica-embalagem', params: { envioId: e.id } }" class="cartao linha" :class="{ atrasado: e.atrasado }">
              <strong>#{{ numeroPedido(e.pedidoId) }}</strong>
              <span>{{ e.destinatario }} · {{ e.cidade }}, {{ e.uf }}</span>
              <small>Despachar até {{ formatarDataHora(e.prazoDespacho) }}</small>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="aEtiquetar.length">
        <h3>Embalados, sem etiqueta <span class="contador">{{ aEtiquetar.length }}</span></h3>
        <ul class="fila">
          <li v-for="e in aEtiquetar" :key="e.id">
            <RouterLink :to="{ name: 'logistica-embalagem', params: { envioId: e.id } }" class="cartao linha">
              <strong>#{{ numeroPedido(e.pedidoId) }}</strong>
              <span>{{ e.destinatario }} · {{ e.cidade }}, {{ e.uf }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>

    <!-- Bancada de um envio -->
    <template v-else-if="bancada">
      <div class="topo">
        <RouterLink :to="{ name: 'logistica-embalagem' }" class="voltar">← Bancada</RouterLink>
        <h3>Pedido #{{ numeroPedido(bancada.pedidoId) }} · {{ bancada.destinatario }}, {{ bancada.cidade }}/{{ bancada.uf }}</h3>
        <StatusSelo :texto="STATUS_ENVIO[bancada.status].nome" :tom="bancada.status === 'ProntoParaEnvio' ? 'concluido' : 'cd'" />
      </div>

      <ol class="passos" aria-label="Etapas da bancada">
        <li :class="{ feito: faltamConferir === 0, atual: faltamConferir > 0 }">1. Conferir itens</li>
        <li :class="{ feito: bancada.status !== 'Separado', atual: faltamConferir === 0 && bancada.status === 'Separado' }">2. Caixa e peso</li>
        <li :class="{ feito: bancada.status === 'ProntoParaEnvio', atual: bancada.status === 'Embalado' }">3. Etiqueta</li>
      </ol>

      <div class="colunas">
        <section class="cartao bloco">
          <h4>Conferência</h4>
          <CampoBipagem
            v-if="sessao.operaCentro && bancada.status === 'Separado' && faltamConferir > 0"
            rotulo="Bipe cada unidade ao colocar na caixa"
            placeholder="SKU do produto"
            :desabilitado="ocupado"
            :retorno="retorno"
            @bipar="conferir"
          />
          <ul class="itens">
            <li v-for="i in bancada.itens" :key="i.produtoId" :class="{ ok: i.conferidas === i.quantidade }" data-testid="item-conferencia">
              <img :src="urlImagem(i.imagemUrl)" alt="" />
              <span class="produto">
                <strong>{{ i.nome }}</strong>
                <code>{{ i.sku }}</code>
              </span>
              <span class="contagem">{{ i.conferidas }}/{{ i.quantidade }}</span>
            </li>
          </ul>
        </section>

        <section class="cartao bloco">
          <h4>Caixa e balança</h4>
          <fieldset class="caixas" :disabled="bancada.status !== 'Separado' || faltamConferir > 0 || !sessao.operaCentro">
            <legend class="sr-only">Caixa</legend>
            <label
              v-for="c in bancada.caixas"
              :key="c.codigo"
              class="caixa"
              :class="{ escolhida: caixa === c.codigo, nao: !c.cabe }"
            >
              <input v-model="caixa" type="radio" name="caixa" :value="c.codigo" :disabled="!c.cabe" />
              <span class="caixa-nome">
                <strong>{{ c.nome }}</strong>
                <small v-if="c.codigo !== 'AVULSO'">{{ c.alturaCm }}×{{ c.larguraCm }}×{{ c.comprimentoCm }} cm</small>
                <small v-else>Sem caixa, só a etiqueta</small>
              </span>
              <span v-if="c.codigo === bancada.caixaSugerida" class="sugerida">sugerida</span>
              <span v-else-if="!c.cabe" class="nao-cabe">não cabe</span>
            </label>
          </fieldset>

          <form v-if="bancada.status === 'Separado' && sessao.operaCentro" class="balanca" @submit.prevent="fecharCaixa">
            <label class="campo">
              Peso na balança (g)
              <input id="peso" v-model.number="peso" type="number" min="1" max="300000" step="1" required :disabled="faltamConferir > 0" />
            </label>
            <small v-if="caixaEscolhida" class="nota">Esperado: {{ formatarPeso(caixaEscolhida.pesoEsperadoGramas) }}, com 20% de tolerância.</small>
            <button type="submit" class="botao destaque" :disabled="ocupado || faltamConferir > 0 || !peso" data-testid="fechar-caixa">
              Fechar caixa
            </button>
          </form>

          <div v-else-if="bancada.pacote" class="pacote">
            <p>
              <strong>{{ bancada.caixas.find((c) => c.codigo === bancada!.pacote!.caixa)?.nome ?? bancada.pacote.caixa }}</strong>
              · {{ formatarPeso(bancada.pacote.pesoGramas) }}
            </p>
            <button
              v-if="bancada.status === 'Embalado' && sessao.operaCentro"
              type="button"
              class="botao destaque grande"
              :disabled="ocupado"
              data-testid="gerar-etiqueta"
              @click="gerarEtiqueta"
            >
              Gerar etiqueta
            </button>
            <RouterLink
              v-else-if="bancada.codigoRastreio"
              :to="{ name: 'logistica-etiqueta', params: { envioId: bancada.envioId } }"
              class="botao secundario"
            >
              Ver etiqueta {{ bancada.codigoRastreio }}
            </RouterLink>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.embalagem {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
h3 {
  font-size: 1.125rem;
  margin-bottom: 10px;
}
.contador {
  display: inline-block;
  min-width: 24px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.8125rem;
  text-align: center;
  color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
}
.bloco {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.bloco h4 {
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--cor-texto-suave);
}
.fila {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.linha {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  color: inherit;
  transition:
    transform 0.2s var(--ease-suave),
    box-shadow 0.2s;
}
.linha:hover {
  color: inherit;
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}
.linha strong {
  font-family: 'Zen Dots', sans-serif;
  font-size: 0.875rem;
  color: var(--cor-primaria);
}
.linha span,
.linha small {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.linha.atrasado {
  border-color: #ffc9c9;
}
.linha.atrasado small {
  color: var(--cor-erro);
  font-weight: 700;
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
  margin: 0;
}
.voltar {
  font-size: 0.875rem;
  font-weight: 600;
}
.passos {
  list-style: none;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.passos li {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--cor-texto-suave);
  background: var(--cor-fundo);
  border: 1px solid var(--cor-borda);
}
.passos li.atual {
  color: var(--cor-destaque);
  border-color: var(--cor-destaque);
  background: var(--cor-destaque-suave);
}
.passos li.feito {
  color: var(--cor-sucesso);
  border-color: #b2f2bb;
  background: var(--cor-sucesso-suave);
}
.colunas {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.itens {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.itens li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-sm);
}
.itens li.ok {
  background: var(--cor-sucesso-suave);
  border-color: #b2f2bb;
}
.itens img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}
.produto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
code {
  font-size: 0.75rem;
  color: var(--cor-texto-suave);
}
.contagem {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.caixas {
  border: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.caixa {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 2px solid var(--cor-borda);
  border-radius: var(--raio-sm);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.caixa input {
  accent-color: var(--cor-primaria);
}
.caixa.escolhida {
  border-color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}
.caixa.nao {
  opacity: 0.55;
  cursor: not-allowed;
}
.caixas:disabled .caixa {
  cursor: default;
}
.caixa-nome {
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
}
.caixa-nome small {
  color: var(--cor-texto-suave);
  font-size: 0.75rem;
}
.sugerida,
.nao-cabe {
  position: absolute;
  top: -9px;
  right: 8px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
}
.sugerida {
  color: #fff;
  background: var(--cor-sucesso);
}
.nao-cabe {
  color: var(--cor-erro);
  background: var(--cor-erro-suave);
}
.balanca {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pacote {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
@media (max-width: 760px) {
  .colunas {
    grid-template-columns: 1fr;
  }
}
</style>
