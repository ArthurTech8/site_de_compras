<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  rotulo: string
  autocomplete: 'current-password' | 'new-password'
  id: string
  descricao?: string
}>()
const senha = defineModel<string>({ required: true })
const visivel = ref(false)
</script>

<template>
  <div class="campo">
    <label :for="id">{{ rotulo }}</label>
    <div class="campo-senha">
      <input
        :id="id"
        v-model="senha"
        :type="visivel ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :aria-describedby="descricao ? `${id}-descricao` : undefined"
        maxlength="128"
        required
        spellcheck="false"
        autocapitalize="off"
      />
      <button
        type="button"
        class="alternar"
        :aria-label="visivel ? 'Esconder senha' : 'Mostrar senha'"
        :aria-pressed="visivel"
        @click="visivel = !visivel"
      >
        {{ visivel ? '🙈' : '👁️' }}
      </button>
    </div>
    <small v-if="descricao" :id="`${id}-descricao`" class="dica">{{ descricao }}</small>
    <slot />
  </div>
</template>

<style scoped>
.campo-senha {
  position: relative;
  display: flex;
}
.campo-senha input {
  flex: 1;
  padding-right: 46px;
}
.alternar {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: var(--raio-sm);
  font-size: 1rem;
  line-height: 1;
}
.alternar:hover {
  background: var(--cor-primaria-suave);
}
.alternar:focus-visible {
  outline: none;
  box-shadow: var(--sombra-foco);
}
.dica {
  font-weight: 400;
  color: var(--cor-texto-suave);
}
</style>
