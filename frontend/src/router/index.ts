import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'produtos', component: () => import('@/views/ProdutosView.vue') },
    { path: '/carrinho', name: 'carrinho', component: () => import('@/views/CarrinhoView.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('@/views/CheckoutView.vue') },
    { path: '/pedidos/:id', name: 'pedido', component: () => import('@/views/PedidoView.vue'), props: true },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrado', component: () => import('@/views/NaoEncontradoView.vue') },
  ],
})
