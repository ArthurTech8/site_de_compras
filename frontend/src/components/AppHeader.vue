<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCarrinhoStore } from '@/stores/carrinho'

const carrinho = useCarrinhoStore()

// O selo "pula" sempre que a quantidade muda.
const pulando = ref(false)
watch(
  () => carrinho.quantidadeTotal,
  (atual, anterior) => {
    if (atual === anterior) return
    pulando.value = false
    requestAnimationFrame(() => (pulando.value = true))
  },
)

// Ao rolar a página, o cabeçalho fica compacto.
const compacto = ref(false)
const aoRolar = () => (compacto.value = window.scrollY > 24)
onMounted(() => window.addEventListener('scroll', aoRolar, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', aoRolar))
</script>

<template>
  <header class="cabecalho nao-imprimir" :class="{ compacto }">
    <RouterLink to="/" class="marca">
      <span class="logo"><img src="/imagens/carrinho-de-compras.png" alt="" /></span>
      <h1>Loja Online</h1>
    </RouterLink>
    <nav>
      <RouterLink to="/">Loja</RouterLink>
      <RouterLink to="/carrinho" class="link-carrinho">
        Carrinho
        <Transition name="badge">
          <span
            v-if="carrinho.quantidadeTotal"
            class="badge"
            :class="{ pulando }"
            data-testid="badge-carrinho"
            @animationend="pulando = false"
          >
            {{ carrinho.quantidadeTotal }}
          </span>
        </Transition>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.cabecalho {
  position: sticky;
  top: 0;
  z-index: 50;
  background:
    linear-gradient(100deg, rgba(6, 42, 82, 0.92) 0%, rgba(11, 79, 156, 0.72) 60%, rgba(11, 79, 156, 0.55) 100%),
    url('/imagens/fundo-dados-azul.jpg') 50% 39% / cover;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px clamp(16px, 4vw, 40px);
  box-shadow: 0 6px 24px rgba(6, 42, 82, 0.25);
  border-bottom: 3px solid var(--cor-destaque);
  transition: padding 0.3s var(--ease-suave);
}
.cabecalho.compacto {
  padding-top: 10px;
  padding-bottom: 10px;
}
.marca {
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
}
.marca:hover {
  color: inherit;
}
.logo {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  transition: transform 0.4s var(--ease-mola);
}
.marca:hover .logo {
  transform: rotate(-8deg) scale(1.06);
}
.logo img {
  height: 26px;
  filter: brightness(0) invert(1);
}
h1,
nav {
  font-family: 'Zen Dots', sans-serif;
}
h1 {
  font-size: clamp(1rem, 3vw, 1.5rem);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
nav {
  display: flex;
  gap: 8px;
}
nav a {
  position: relative;
  color: rgba(255, 255, 255, 0.85);
  padding: 8px 14px;
  border-radius: 999px;
  transition:
    background 0.2s,
    color 0.2s;
}
nav a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}
nav a.router-link-exact-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
.link-carrinho {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.badge {
  background: var(--gradiente-destaque);
  color: #fff;
  border-radius: 999px;
  font-family: 'Roboto', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 22px;
  padding: 2px 7px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(232, 89, 12, 0.5);
}
.badge.pulando {
  animation: pulo 0.5s var(--ease-mola);
}
.badge-enter-active,
.badge-leave-active {
  transition:
    transform 0.3s var(--ease-mola),
    opacity 0.2s;
}
.badge-enter-from,
.badge-leave-to {
  transform: scale(0);
  opacity: 0;
}
@keyframes pulo {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.45);
  }
  100% {
    transform: scale(1);
  }
}
</style>
