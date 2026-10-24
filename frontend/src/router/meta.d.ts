import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** Tela só para quem não está logado (entrar, cadastro). */
    somenteVisitante?: boolean
    /** Exige login; sem sessão, vai para a tela de entrar e volta depois. */
    requerLogin?: boolean
    /** Só para a equipe da loja (logística). */
    somenteEquipe?: boolean
  }
}
