<script setup lang="ts">
import { ref, watch } from 'vue'
import { centroApi } from '@/api/centroDistribuicao'
import type { Etiqueta } from '@/api/types'
import CodigoBarras from '@/components/CodigoBarras.vue'
import { cidadeEndereco, formatarDataHora, formatarPeso, linhaEndereco, numeroPedido } from '@/utils/logistica'

const props = defineProps<{ envioId: string }>()

const etiqueta = ref<Etiqueta | null>(null)
const erro = ref<string | null>(null)

watch(
  () => props.envioId,
  async (id) => {
    erro.value = null
    try {
      etiqueta.value = await centroApi.etiqueta(id)
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Não foi possível carregar a etiqueta.'
    }
  },
  { immediate: true },
)

const imprimir = () => window.print()
const nomeCaixa = (codigo: string) => (codigo === 'AVULSO' ? 'Volume avulso' : `Caixa ${codigo}`)
</script>

<template>
  <div class="pagina-etiqueta">
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <template v-if="etiqueta">
      <div class="acoes nao-imprimir">
        <RouterLink :to="{ name: 'logistica-embalagem' }" class="voltar">← Próximo da bancada</RouterLink>
        <button type="button" class="botao destaque" @click="imprimir">🖨 Imprimir etiqueta</button>
        <RouterLink :to="{ name: 'logistica-expedicao' }" class="botao secundario">Levar para a expedição →</RouterLink>
      </div>

      <!-- 10×15 cm, o tamanho das etiquetas térmicas de transportadora -->
      <article class="etiqueta" data-testid="etiqueta">
        <header class="faixa">
          <span class="transportadora">{{ etiqueta.transportadora }}</span>
          <span class="servico">PADRÃO</span>
        </header>

        <section class="codigo">
          <CodigoBarras :valor="etiqueta.codigoRastreio" :altura="60" />
          <strong>{{ etiqueta.codigoRastreio.replace(/^(SC)(\d{3})(\d{3})(\d{3})(BR)$/, '$1 $2 $3 $4 $5') }}</strong>
        </section>

        <section class="destinatario">
          <small>DESTINATÁRIO</small>
          <strong>{{ etiqueta.destino.destinatario }}</strong>
          <span>{{ linhaEndereco(etiqueta.destino) }}</span>
          <span class="cidade">{{ cidadeEndereco(etiqueta.destino) }}</span>
        </section>

        <section class="dados">
          <span><small>PEDIDO</small>{{ numeroPedido(etiqueta.pedidoId) }}</span>
          <span><small>VOLUME</small>{{ etiqueta.pacote ? nomeCaixa(etiqueta.pacote.caixa) : '—' }}</span>
          <span><small>PESO</small>{{ etiqueta.pacote ? formatarPeso(etiqueta.pacote.pesoGramas) : '—' }}</span>
          <span><small>ITENS</small>{{ etiqueta.unidades }}</span>
        </section>

        <section class="remetente">
          <small>REMETENTE</small>
          <span>{{ etiqueta.remetente.nome }}</span>
          <span>{{ etiqueta.remetente.linha1 }}</span>
          <span>{{ etiqueta.remetente.linha2 }}</span>
        </section>

        <footer class="rodape-etiqueta">Gerada em {{ formatarDataHora(etiqueta.geradaEm) }} · Despachar até {{ formatarDataHora(etiqueta.prazoDespacho) }}</footer>
      </article>
    </template>
  </div>
</template>

<style scoped>
.pagina-etiqueta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.acoes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
}
.voltar {
  font-size: 0.875rem;
  font-weight: 600;
}
.etiqueta {
  width: 100mm;
  max-width: 100%;
  min-height: 150mm;
  display: flex;
  flex-direction: column;
  color: #000;
  background: #fff;
  border: 2px solid #000;
  font-family: Arial, Helvetica, sans-serif;
  box-shadow: var(--sombra-lg);
}
.etiqueta > * {
  padding: 3mm 4mm;
  border-bottom: 1.5px solid #000;
}
.etiqueta > *:last-child {
  border-bottom: 0;
}
small {
  display: block;
  font-size: 7pt;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.faixa {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
}
.transportadora {
  font-size: 13pt;
}
.servico {
  padding: 1mm 3mm;
  border: 1.5px solid #000;
  font-size: 9pt;
}
.codigo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2mm;
}
.codigo strong {
  font-size: 15pt;
  letter-spacing: 0.06em;
}
.destinatario,
.remetente {
  display: flex;
  flex-direction: column;
  gap: 0.5mm;
  font-size: 10pt;
}
.destinatario strong {
  font-size: 13pt;
}
.cidade {
  font-weight: 700;
  font-size: 11pt;
}
.remetente {
  font-size: 8pt;
}
.dados {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2mm;
  font-size: 10pt;
  font-weight: 700;
}
.rodape-etiqueta {
  margin-top: auto;
  font-size: 7pt;
  text-align: center;
}
@media print {
  @page {
    size: 100mm 150mm;
    margin: 0;
  }
  .pagina-etiqueta {
    display: block;
  }
  .etiqueta {
    box-shadow: none;
    border: 0;
    width: 100mm;
    height: 150mm;
  }
}
</style>
