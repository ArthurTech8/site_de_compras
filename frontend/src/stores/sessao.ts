import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi, type DadosCadastro } from '@/api/auth'
import { ApiError } from '@/api/http'
import type { PapelUsuario, Usuario } from '@/api/types'

const EQUIPE: PapelUsuario[] = ['Admin', 'OperadorCD', 'Entregador', 'Atendimento']
const OPERACAO: PapelUsuario[] = ['Admin', 'OperadorCD', 'Entregador']

/**
 * Quem está logado. Não guardamos token nem dados do usuário no localStorage: a sessão é um
 * cookie HttpOnly e, ao abrir o site, perguntamos ao backend quem é o dono dele.
 */
export const useSessaoStore = defineStore('sessao', () => {
  const usuario = ref<Usuario | null>(null)
  const verificada = ref(false)

  const logado = computed(() => usuario.value !== null)
  const admin = computed(() => usuario.value?.papel === 'Admin')
  /** Pode abrir a logística. O backend confere de novo em cada rota. */
  const equipe = computed(() => !!usuario.value && EQUIPE.includes(usuario.value.papel))
  /** Pode mover envios; o atendimento só consulta. */
  const operaLogistica = computed(() => !!usuario.value && OPERACAO.includes(usuario.value.papel))
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

  return { usuario, verificada, logado, admin, equipe, operaLogistica, primeiroNome, carregar, entrar, cadastrar, sair }
})
