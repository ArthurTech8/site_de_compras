<script setup lang="ts">
import type { Produto } from '@/api/types'
import { formatarPreco, urlImagem } from '@/utils/formatar'

defineProps<{ produto: Produto; adicionando?: boolean }>()
defineEmits<{ adicionar: [produto: Produto] }>()
</script>

<template>
  <article class="card">
    <img :src="urlImagem(produto.imagemUrl)" :alt="produto.nome" loading="lazy" />
    <h3>{{ produto.nome }}</h3>
    <p class="preco">{{ formatarPreco(produto.preco) }}</p>
    <p class="pix">{{ produto.descontoPix }}% de desconto no Pix</p>
    <p v-if="produto.estoque === 0" class="esgotado">Esgotado</p>
    <button
      type="button"
      class="botao"
      :disabled="adicionando || produto.estoque === 0"
      @click="$emit('adicionar', produto)"
    >
      {{ adicionando ? 'Adicionando…' : 'Adicionar ao carrinho' }}
    </button>
  </article>
</template>

<style scoped>
.card {
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}
img {
  width: 100%;
  height: 160px;
  object-fit: contain;
}
h3 {
  font-size: 1rem;
  font-weight: 500;
}
.preco {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--cor-primaria);
}
.pix {
  color: var(--cor-sucesso);
  font-size: 0.875rem;
}
.esgotado {
  color: var(--cor-erro);
  font-size: 0.875rem;
}
.botao {
  margin-top: auto;
}
</style>
