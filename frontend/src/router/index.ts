import { createRouter, createWebHistory } from 'vue-router'
import { useSessaoStore } from '@/stores/sessao'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'produtos', component: () => import('@/views/ProdutosView.vue') },
    { path: '/carrinho', name: 'carrinho', component: () => import('@/views/CarrinhoView.vue') },
    { path: '/checkout', name: 'checkout', component: () => import('@/views/CheckoutView.vue') },
    { path: '/entrar', name: 'entrar', component: () => import('@/views/EntrarView.vue'), meta: { somenteVisitante: true } },
    { path: '/cadastro', name: 'cadastro', component: () => import('@/views/CadastroView.vue'), meta: { somenteVisitante: true } },
    { path: '/pedidos/:id', name: 'pedido', component: () => import('@/views/PedidoView.vue'), props: true },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrado', component: () => import('@/views/NaoEncontradoView.vue') },
  ],
})

// Quem já está logado não precisa ver as telas de entrar e cadastro.
router.beforeEach(async (to) => {
  if (!to.meta.somenteVisitante) return
  const sessao = useSessaoStore()
  if (!sessao.verificada) await sessao.carregar().catch(() => {})
  if (sessao.logado) return { name: 'produtos' }
})
