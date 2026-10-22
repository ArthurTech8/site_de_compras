<script setup lang="ts">
import { useCarrinhoStore } from '@/stores/carrinho'

const carrinho = useCarrinhoStore()
</script>

<template>
  <header class="cabecalho">
    <RouterLink to="/" class="marca">
      <img src="/imagens/carrinho-de-compras.png" alt="" />
      <h1>Loja Online</h1>
    </RouterLink>
    <nav>
      <RouterLink to="/">Loja</RouterLink>
      <RouterLink to="/carrinho" class="link-carrinho">
        Carrinho
        <span v-if="carrinho.quantidadeTotal" class="badge" data-testid="badge-carrinho">
          {{ carrinho.quantidadeTotal }}
        </span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.cabecalho {
  background: url('/imagens/fundo-dados-azul.jpg') 50% 39% / cover;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px clamp(16px, 4vw, 40px);
}
.marca {
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
}
.marca img {
  height: 40px;
  filter: brightness(0) invert(1);
}
h1,
nav {
  font-family: 'Zen Dots', sans-serif;
}
h1 {
  font-size: clamp(1rem, 3vw, 1.5rem);
}
nav {
  display: flex;
  gap: 20px;
}
nav a {
  color: #fff;
}
nav a.router-link-exact-active {
  text-decoration: underline;
  text-underline-offset: 6px;
}
.link-carrinho {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.badge {
  background: var(--cor-destaque);
  color: #fff;
  border-radius: 999px;
  font-family: 'Roboto', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 22px;
  padding: 2px 7px;
  text-align: center;
}
</style>
