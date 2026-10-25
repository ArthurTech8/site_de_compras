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
    { path: '/pedidos', name: 'meus-pedidos', component: () => import('@/views/MeusPedidosView.vue'), meta: { requerLogin: true } },
    { path: '/rastreio/:codigo?', name: 'rastreio', component: () => import('@/views/RastreioView.vue'), props: true },
    {
      path: '/admin/logistica',
      component: () => import('@/views/admin/LogisticaLayout.vue'),
      meta: { requerLogin: true, somenteEquipe: true },
      children: [
        { path: '', name: 'logistica', component: () => import('@/views/admin/LogisticaView.vue') },
        { path: 'separacao/:id?', name: 'logistica-separacao', component: () => import('@/views/admin/SeparacaoView.vue'), props: true },
        { path: 'embalagem/:envioId?', name: 'logistica-embalagem', component: () => import('@/views/admin/EmbalagemView.vue'), props: true },
        { path: 'etiqueta/:envioId', name: 'logistica-etiqueta', component: () => import('@/views/admin/EtiquetaView.vue'), props: true },
        { path: 'expedicao/:id?', name: 'logistica-expedicao', component: () => import('@/views/admin/ExpedicaoView.vue'), props: true },
        { path: 'estoque', name: 'logistica-estoque', component: () => import('@/views/admin/EstoqueView.vue') },
      ],
    },
    { path: '/pedidos/:id', name: 'pedido', component: () => import('@/views/PedidoView.vue'), props: true },
    { path: '/:pathMatch(.*)*', name: 'nao-encontrado', component: () => import('@/views/NaoEncontradoView.vue') },
  ],
})

// Quem já está logado não precisa ver as telas de entrar e cadastro; quem não está, vai para
// elas antes das telas que pedem login. A permissão de verdade é sempre conferida no backend.
router.beforeEach(async (to) => {
  if (!to.meta.somenteVisitante && !to.meta.requerLogin) return
  const sessao = useSessaoStore()
  if (!sessao.verificada) await sessao.carregar().catch(() => {})
  if (to.meta.somenteVisitante && sessao.logado) return { name: 'produtos' }
  if (to.meta.requerLogin && !sessao.logado) return { name: 'entrar', query: { voltar: to.fullPath } }
  if (to.meta.somenteEquipe && !sessao.equipe) return { name: 'produtos' }
})
