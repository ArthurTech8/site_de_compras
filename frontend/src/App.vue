<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { useCarrinhoStore } from '@/stores/carrinho'

const carrinho = useCarrinhoStore()
onMounted(() => carrinho.carregar().catch(() => {}))
</script>

<template>
  <AppHeader />
  <main class="container">
    <RouterView />
  </main>
  <footer class="rodape">
    <p>&copy; {{ new Date().getFullYear() }} Loja Online. Todos os direitos reservados.</p>
  </footer>
</template>
