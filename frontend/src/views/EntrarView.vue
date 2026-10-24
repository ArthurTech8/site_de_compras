<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import CampoSenha from '@/components/CampoSenha.vue'
import { useSessaoStore } from '@/stores/sessao'
import { toastSucesso } from '@/utils/alertas'
import { destinoSeguro } from '@/utils/seguranca'

const sessao = useSessaoStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const senha = ref('')
const enviando = ref(false)
const erro = ref<string | null>(null)

const destino = computed(() => destinoSeguro(route.query.voltar))

async function entrar() {
  enviando.value = true
  erro.value = null
  try {
    await sessao.entrar(email.value.trim(), senha.value)
    senha.value = ''
    void toastSucesso(`Olá, ${sessao.primeiroNome}!`, { texto: 'Você entrou na sua conta.' })
    await router.replace(destino.value)
  } catch (e) {
    erro.value =
      e instanceof ApiError && e.status === 429
        ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
        : e instanceof Error
          ? e.message
          : 'Não foi possível entrar.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="pagina-conta">
    <div class="painel-marca" aria-hidden="true">
      <span class="selo-conta">🔐</span>
      <p class="chamada">Bem-vindo de volta</p>
      <p>Entre para acompanhar seus pedidos e comprar mais rápido.</p>
    </div>

    <form class="cartao formulario-conta" novalidate @submit.prevent="entrar">
      <h2 class="titulo-pagina">Entrar</h2>

      <p v-if="erro" class="erro" role="alert" data-testid="erro-login">{{ erro }}</p>

      <div class="campo">
        <label for="login-email">E-mail</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="username"
          inputmode="email"
          maxlength="254"
          required
          autofocus
        />
      </div>

      <CampoSenha id="login-senha" v-model="senha" rotulo="Senha" autocomplete="current-password" />

      <button type="submit" class="botao destaque grande" :disabled="enviando || !email || !senha">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>

      <p class="alternativa">
        Ainda não tem conta?
        <RouterLink :to="{ name: 'cadastro', query: route.query.voltar ? { voltar: destino } : {} }">Criar conta</RouterLink>
      </p>
    </form>
  </section>
</template>
