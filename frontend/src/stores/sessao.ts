import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, type DadosCadastro } from '@/api/auth'
import { ApiError } from '@/api/http'
import type { Usuario } from '@/api/types'

/**
 * Quem está logado. Não guardamos token nem dados do usuário no localStorage: a sessão é um
 * cookie HttpOnly e, ao abrir o site, perguntamos ao backend quem é o dono dele.
 */
export const useSessaoStore = defineStore('sessao', () => {
  const usuario = ref<Usuario | null>(null)
  const verificada = ref(false)

  const logado = computed(() => usuario.value !== null)
  const admin = computed(() => usuario.value?.papel === 'Admin')
  const primeiroNome = computed(() => usuario.value?.nome.split(' ')[0] ?? '')

  async function carregar() {
    try {
      usuario.value = await authApi.conta()
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e
      usuario.value = null
    } finally {
      verificada.value = true
    }
  }

  async function entrar(email: string, senha: string) {
    usuario.value = await authApi.entrar(email, senha)
  }

  async function cadastrar(dados: DadosCadastro) {
    usuario.value = await authApi.cadastrar(dados)
  }

  async function sair() {
    try {
      await authApi.sair()
    } finally {
      usuario.value = null
    }
  }

  return { usuario, verificada, logado, admin, primeiroNome, carregar, entrar, cadastrar, sair }
})
