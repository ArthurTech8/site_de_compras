<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import { rastreioApi } from '@/api/rastreio'
import type { RastreioPublico } from '@/api/types'
import LinhaDoTempo from '@/components/LinhaDoTempo.vue'
import StatusSelo from '@/components/StatusSelo.vue'
import { STATUS_ENVIO, textoPrevisao } from '@/utils/logistica'

const props = defineProps<{ codigo?: string }>()
const router = useRouter()

const digitado = ref(props.codigo ?? '')
const rastreio = ref<RastreioPublico | null>(null)
const erro = ref<string | null>(null)
const buscando = ref(false)

async function buscar(codigo: string | undefined) {
  rastreio.value = null
  erro.value = null
  if (!codigo) return
  buscando.value = true
  try {
    rastreio.value = await rastreioApi.obter(codigo)
  } catch (e) {
    erro.value =
      e instanceof ApiError && e.status === 404
        ? 'Não encontramos esse código. Confira se digitou igual ao da etiqueta, como SC123456789BR.'
        : e instanceof Error
          ? e.message
          : 'Não foi possível consultar o rastreio.'
  } finally {
    buscando.value = false
  }
}

// O código fica na URL para o link poder ser compartilhado.
function enviar() {
  const codigo = digitado.value.trim().toUpperCase()
  if (codigo) void router.push({ name: 'rastreio', params: { codigo } })
}

watch(
  () => props.codigo,
  (codigo) => {
    digitado.value = codigo ?? ''
    void buscar(codigo)
  },
  { immediate: true },
)
</script>

<template>
  <section class="rastreio">
    <h2 class="titulo-pagina">Rastrear pacote</h2>

    <form class="busca cartao" role="search" @submit.prevent="enviar">
      <label class="campo">
        Código de rastreio
        <input id="codigo-rastreio" v-model="digitado" placeholder="SC123456789BR" maxlength="20" autocomplete="off" />
      </label>
      <button type="submit" class="botao" :disabled="buscando">{{ buscando ? 'Buscando…' : 'Rastrear' }}</button>
    </form>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <article v-if="rastreio" class="cartao resultado surgir">
      <header>
        <div>
          <span class="codigo">{{ rastreio.codigoRastreio }}</span>
          <p class="destino">Para {{ rastreio.cidadeDestino }}, {{ rastreio.ufDestino }}</p>
        </div>
        <StatusSelo :texto="STATUS_ENVIO[rastreio.status].cliente" :tom="STATUS_ENVIO[rastreio.status].tom" />
      </header>
      <p v-if="rastreio.status !== 'Entregue'" class="previsao">{{ textoPrevisao(rastreio.previsaoEntrega) }}</p>
      <LinhaDoTempo :eventos="rastreio.eventos" :status="rastreio.status" />
    </article>
  </section>
</template>

<style scoped>
.rastreio {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.busca {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
}
.busca .campo {
  flex: 1;
}
.busca input {
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.resultado {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.resultado header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cor-borda);
}
.codigo {
  font-family: 'Zen Dots', sans-serif;
  letter-spacing: 0.06em;
}
.destino {
  font-size: 0.875rem;
  color: var(--cor-texto-suave);
}
.previsao {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--cor-sucesso);
}
.previsao::first-letter {
  text-transform: uppercase;
}
@media (max-width: 480px) {
  .busca {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
