<script setup lang="ts">
defineProps<{ pagina: number; totalPaginas: number }>()
defineEmits<{ mudar: [pagina: number] }>()
</script>

<template>
  <nav v-if="totalPaginas > 1" class="paginacao" aria-label="Paginação">
    <button type="button" class="botao secundario" :disabled="pagina <= 1" @click="$emit('mudar', pagina - 1)">
      Anterior
    </button>
    <span>Página {{ pagina }} de {{ totalPaginas }}</span>
    <button
      type="button"
      class="botao secundario"
      :disabled="pagina >= totalPaginas"
      @click="$emit('mudar', pagina + 1)"
    >
      Próxima
    </button>
  </nav>
</template>

<style scoped>
.paginacao {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}
</style>
