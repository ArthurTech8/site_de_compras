<script setup lang="ts">
// 4 = todas as etapas concluídas (pedido confirmado).
defineProps<{ atual: 1 | 2 | 3 | 4 }>()

const etapas = ['Carrinho', 'Pagamento', 'Confirmação']
</script>

<template>
  <ol class="etapas" aria-label="Etapas da compra">
    <li
      v-for="(nome, i) in etapas"
      :key="nome"
      :class="{ feita: i + 1 < atual, atual: i + 1 === atual }"
      :aria-current="i + 1 === atual ? 'step' : undefined"
    >
      <span class="marcador">{{ i + 1 < atual ? '✓' : i + 1 }}</span>
      <span class="nome">{{ nome }}</span>
    </li>
  </ol>
</template>

<style scoped>
.etapas {
  list-style: none;
  display: flex;
  align-items: center;
  max-width: 520px;
  margin: 0 auto 28px;
}
li {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
/* linha que liga uma etapa à próxima */
li + li::before {
  content: '';
  position: absolute;
  top: 15px;
  right: 50%;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: var(--cor-borda);
  z-index: 0;
}
li.feita + li::before,
li.feita + li.atual::before {
  background: var(--gradiente-primario);
}
.marcador {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--cor-superficie);
  border: 2px solid var(--cor-borda);
  font-weight: 700;
  transition:
    transform 0.4s var(--ease-mola),
    background 0.3s;
}
li.feita .marcador {
  background: var(--gradiente-primario);
  border-color: var(--cor-primaria);
  color: #fff;
}
li.atual {
  color: var(--cor-primaria);
  font-weight: 500;
}
li.atual .marcador {
  border-color: var(--cor-destaque);
  color: var(--cor-destaque);
  transform: scale(1.12);
  box-shadow: 0 0 0 5px var(--cor-destaque-suave);
}
</style>
