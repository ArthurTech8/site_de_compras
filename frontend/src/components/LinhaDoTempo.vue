<script setup lang="ts">
import { computed } from 'vue'
import type { EventoRastreio, StatusEnvio } from '@/api/types'
import { MARCOS_CLIENTE, STATUS_ENVIO, etapaAtingida, formatarDataHora } from '@/utils/logistica'

const props = defineProps<{ eventos: EventoRastreio[]; status: StatusEnvio }>()

// O que já aconteceu, na ordem, e depois os marcos que ainda faltam, apagados.
const pendentes = computed(() => MARCOS_CLIENTE.filter((m) => !etapaAtingida(props.status, m)))
</script>

<template>
  <ol class="linha-do-tempo" aria-label="Histórico do envio">
    <li
      v-for="(e, i) in eventos"
      :key="`${e.status}-${e.data}`"
      class="feito"
      :class="{ atual: i === eventos.length - 1 && status !== 'Entregue', entregue: e.status === 'Entregue', interno: e.publico === false }"
    >
      <span class="ponto" aria-hidden="true" />
      <div>
        <strong>{{ e.descricao }}<span v-if="e.publico === false" class="tag-interno">só a equipe vê</span></strong>
        <small>{{ formatarDataHora(e.data) }} · {{ e.local }}</small>
      </div>
    </li>
    <li v-for="m in pendentes" :key="m" class="pendente">
      <span class="ponto" aria-hidden="true" />
      <div>
        <strong>{{ STATUS_ENVIO[m].cliente }}</strong>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.linha-do-tempo {
  list-style: none;
  display: flex;
  flex-direction: column;
}
li {
  position: relative;
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 12px;
  padding-bottom: 16px;
}
li:last-child {
  padding-bottom: 0;
}
/* A linha vertical que liga os pontos */
li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 16px;
  bottom: -2px;
  width: 2px;
  background: var(--cor-borda);
}
li.feito:not(:last-child)::before {
  background: var(--cor-sucesso-claro);
}
.ponto {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--cor-borda);
  background: var(--cor-superficie);
  margin-top: 1px;
}
.feito .ponto {
  border-color: var(--cor-sucesso);
  background: var(--cor-sucesso);
  box-shadow: inset 0 0 0 3px var(--cor-superficie);
}
.atual .ponto {
  border-color: var(--cor-destaque);
  background: var(--cor-destaque);
  box-shadow:
    inset 0 0 0 3px var(--cor-superficie),
    0 0 0 4px var(--cor-destaque-suave);
}
li div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
strong {
  font-weight: 500;
  font-size: 0.9375rem;
}
.entregue strong {
  color: var(--cor-sucesso);
  font-weight: 700;
}
small {
  color: var(--cor-texto-suave);
  font-size: 0.8125rem;
}
.pendente strong {
  color: var(--cor-texto-suave);
  font-weight: 400;
}
.interno .ponto {
  border-color: var(--cor-erro);
  background: var(--cor-erro-suave);
  box-shadow: none;
}
.tag-interno {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 700;
  vertical-align: middle;
  color: var(--cor-erro);
  background: var(--cor-erro-suave);
}
</style>
