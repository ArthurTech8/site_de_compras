<script setup lang="ts">
import type { TomStatus } from '@/utils/logistica'

defineProps<{ texto: string; tom: TomStatus; atrasado?: boolean }>()
</script>

<template>
  <span class="selo-status" :class="[tom, { atrasado }]">{{ atrasado ? `${texto} · atrasado` : texto }}</span>
</template>

<style scoped>
.selo-status {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.cd {
  color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}
.transporte {
  color: var(--cor-destaque);
  background: var(--cor-destaque-suave);
}
.concluido {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-suave);
}
.atrasado {
  color: var(--cor-erro);
  background: var(--cor-erro-suave);
}
</style>
