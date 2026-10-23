<script setup lang="ts">
import type { Produto } from '@/api/types'
import { formatarPreco, urlImagem } from '@/utils/formatar'

defineProps<{ produto: Produto; adicionando?: boolean }>()
defineEmits<{ adicionar: [produto: Produto] }>()
</script>

<template>
  <article class="card" :class="{ esgotado: produto.estoque === 0 }">
    <div class="vitrine">
      <span v-if="produto.descontoPix > 0" class="etiqueta">-{{ produto.descontoPix }}% Pix</span>
      <img :src="urlImagem(produto.imagemUrl)" :alt="produto.nome" loading="lazy" />
    </div>
    <div class="info">
      <h3>{{ produto.nome }}</h3>
      <p class="preco">{{ formatarPreco(produto.preco) }}</p>
      <p class="pix">
        <strong>{{ formatarPreco(produto.preco * (1 - produto.descontoPix / 100)) }}</strong>
        no Pix ({{ produto.descontoPix }}% de desconto)
      </p>
      <p v-if="produto.estoque === 0" class="aviso-estoque">Esgotado</p>
      <p v-else-if="produto.estoque <= 5" class="aviso-estoque poucos">Últimas {{ produto.estoque }} unidades</p>
    </div>
    <button
      type="button"
      class="botao"
      :class="{ adicionando }"
      :disabled="adicionando || produto.estoque === 0"
      @click="$emit('adicionar', produto)"
    >
      <span v-if="adicionando" class="giro" aria-hidden="true" />
      {{ adicionando ? 'Adicionando…' : produto.estoque === 0 ? 'Indisponível' : 'Adicionar ao carrinho' }}
    </button>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 14px 16px;
  box-shadow: var(--sombra-sm);
  transition:
    transform 0.35s var(--ease-suave),
    box-shadow 0.35s var(--ease-suave),
    border-color 0.35s;
}
.card:hover {
  transform: translateY(-6px);
  box-shadow: var(--sombra-lg);
  border-color: rgba(28, 126, 214, 0.35);
}
.vitrine {
  position: relative;
  display: grid;
  place-items: center;
  height: 180px;
  border-radius: var(--raio-md);
  background:
    radial-gradient(circle at 50% 60%, #fff 0%, transparent 70%),
    linear-gradient(160deg, var(--cor-primaria-suave), #f8fafc);
  overflow: hidden;
}
img {
  width: 82%;
  height: 150px;
  object-fit: contain;
  mix-blend-mode: multiply;
  transition: transform 0.5s var(--ease-suave);
}
.card:hover img {
  transform: scale(1.08) translateY(-4px);
}
.etiqueta {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  background: var(--gradiente-sucesso);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  box-shadow: 0 3px 8px rgba(43, 138, 62, 0.35);
}
.info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 4px;
}
h3 {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.3;
  min-height: 2.6em;
}
.preco {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--cor-primaria);
  letter-spacing: -0.01em;
}
.pix {
  color: var(--cor-texto-suave);
  font-size: 0.8125rem;
}
.pix strong {
  color: var(--cor-sucesso);
}
.aviso-estoque {
  color: var(--cor-erro);
  font-size: 0.8125rem;
  font-weight: 500;
}
.aviso-estoque.poucos {
  color: var(--cor-destaque);
}
.botao {
  margin-top: auto;
  width: 100%;
}
.card.esgotado .vitrine img {
  filter: grayscale(1) opacity(0.6);
}
.giro {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 0.7s linear infinite;
}
@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
</style>
