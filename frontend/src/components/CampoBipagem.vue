<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

/** O que o último bipe respondeu, para quem está com o leitor na mão. */
export interface RetornoBipe {
  tipo: 'ok' | 'erro'
  texto: string
}

const props = defineProps<{
  rotulo: string
  placeholder?: string
  desabilitado?: boolean
  retorno?: RetornoBipe | null
}>()
const emit = defineEmits<{ bipar: [codigo: string] }>()

const campo = ref<HTMLInputElement | null>(null)
const valor = ref('')

// Um leitor de código de barras "digita" o código e tecla Enter, igual a uma pessoa.
async function enviar() {
  const codigo = valor.value.trim()
  if (!codigo || props.desabilitado) return
  valor.value = ''
  emit('bipar', codigo)
  await nextTick()
  campo.value?.focus()
}

onMounted(() => campo.value?.focus())
defineExpose({ focar: () => campo.value?.focus() })
</script>

<template>
  <form class="bipagem" @submit.prevent="enviar">
    <label class="campo">
      {{ rotulo }}
      <span class="entrada">
        <span class="icone" aria-hidden="true">▍▌▍▍▌</span>
        <input
          ref="campo"
          v-model="valor"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="40"
          :placeholder="placeholder ?? 'Bipe ou digite e tecle Enter'"
          :disabled="desabilitado"
          data-testid="bipagem"
        />
        <button type="submit" class="botao" :disabled="desabilitado || !valor.trim()">OK</button>
      </span>
    </label>
    <p v-if="retorno" class="retorno" :class="retorno.tipo" role="status" aria-live="polite">
      {{ retorno.tipo === 'ok' ? '✓' : '✕' }} {{ retorno.texto }}
    </p>
  </form>
</template>

<style scoped>
.bipagem {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.entrada {
  display: flex;
  align-items: stretch;
  gap: 8px;
  border: 2px solid var(--cor-primaria);
  border-radius: var(--raio-sm);
  background: var(--cor-superficie);
  padding: 4px 4px 4px 12px;
  box-shadow: var(--sombra-foco);
}
.icone {
  align-self: center;
  font-size: 0.75rem;
  letter-spacing: -2px;
  color: var(--cor-primaria);
}
.entrada input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  box-shadow: none;
  padding: 8px 4px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: transparent;
}
.entrada .botao {
  padding: 6px 16px;
}
.retorno {
  font-size: 0.875rem;
  font-weight: 700;
  padding: 8px 12px;
  border-radius: var(--raio-sm);
}
.retorno.ok {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-suave);
}
.retorno.erro {
  color: var(--cor-erro);
  background: var(--cor-erro-suave);
}
</style>
