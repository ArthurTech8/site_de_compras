import { request } from './http'
import type { Usuario } from './types'

export interface DadosCadastro {
  nome: string
  email: string
  senha: string
}

export const authApi = {
  cadastrar: (dados: DadosCadastro) => request<Usuario>('POST', '/api/v1/auth/cadastro', { body: dados }),
  entrar: (email: string, senha: string) =>
    request<Usuario>('POST', '/api/v1/auth/login', { body: { email, senha } }),
  sair: () => request<void>('POST', '/api/v1/auth/logout'),
  /** Quem está logado. 401 quando não há sessão. */
  conta: () => request<Usuario>('GET', '/api/v1/conta'),
}
