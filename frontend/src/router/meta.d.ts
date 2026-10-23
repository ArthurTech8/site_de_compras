import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Tela só para quem não está logado (entrar, cadastro). */
    somenteVisitante?: boolean
  }
}
