<script setup lang="ts">
import { computed } from 'vue'
import { largurasCode128 } from '@/utils/codigoBarras'

const props = withDefaults(defineProps<{ valor: string; altura?: number }>(), { altura: 60 })

// Zona de silêncio de 10 módulos de cada lado, exigida pelos leitores.
const MARGEM = 10

const barras = computed(() => {
  const lista: { x: number; largura: number }[] = []
  let x = MARGEM
  largurasCode128(props.valor).forEach((largura, i) => {
    if (i % 2 === 0) lista.push({ x, largura })
    x += largura
  })
  return { lista, total: x + MARGEM }
})
</script>

<template>
  <svg
    class="codigo-barras"
    :viewBox="`0 0 ${barras.total} ${altura}`"
    preserveAspectRatio="none"
    role="img"
    :aria-label="`Código de barras ${valor}`"
  >
    <rect v-for="(b, i) in barras.lista" :key="i" :x="b.x" y="0" :width="b.largura" :height="altura" />
  </svg>
</template>

<style scoped>
.codigo-barras {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 1;
  fill: #000;
  background: #fff;
}
</style>
