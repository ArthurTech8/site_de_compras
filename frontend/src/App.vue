<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { useCarrinhoStore } from '@/stores/carrinho'
import { useSessaoStore } from '@/stores/sessao'

const carrinho = useCarrinhoStore()
const sessao = useSessaoStore()
onMounted(() => {
  carrinho.carregar().catch(() => {})
  if (!sessao.verificada) sessao.carregar().catch(() => {})
})

// Cada troca de tela começa do topo, depois que a anterior saiu.
const voltarAoTopo = () => window.scrollTo({ top: 0 })
</script>

<template>
  <AppHeader />
  <main class="container">
    <RouterView v-slot="{ Component, route }">
      <Transition name="pagina" mode="out-in" @after-leave="voltarAoTopo">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </main>
  <footer class="rodape nao-imprimir">
    <p>
      <RouterLink :to="{ name: 'rastreio' }" class="link-rodape">Rastrear pacote</RouterLink>
    </p>
    <p>&copy; {{ new Date().getFullYear() }} Loja Online. Todos os direitos reservados.</p>
  </footer>
</template>

<style scoped>
.link-rodape {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.rodape p + p {
  margin-top: 6px;
}
</style>
