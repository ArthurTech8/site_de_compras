<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/http'
import CampoSenha from '@/components/CampoSenha.vue'
import { useSessaoStore } from '@/stores/sessao'
import { toastSucesso } from '@/utils/alertas'
import { avaliarSenha, destinoSeguro } from '@/utils/seguranca'

const sessao = useSessaoStore()
const route = useRoute()
const router = useRouter()

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmacao = ref('')
const enviando = ref(false)
const erro = ref<string | null>(null)

const forca = computed(() => avaliarSenha(senha.value))
const senhasDiferentes = computed(() => confirmacao.value.length > 0 && confirmacao.value !== senha.value)
const podeEnviar = computed(
  () =>
    nome.value.trim().length >= 2 &&
    email.value.includes('@') &&
    senha.value.length >= 8 &&
    confirmacao.value === senha.value &&
    !enviando.value,
)

async function cadastrar() {
  if (!podeEnviar.value) return
  enviando.value = true
  erro.value = null
  try {
    await sessao.cadastrar({ nome: nome.value.trim(), email: email.value.trim(), senha: senha.value })
    senha.value = confirmacao.value = ''
    void toastSucesso('Conta criada!', { texto: `Bem-vindo, ${sessao.primeiroNome}.` })
    await router.replace(destinoSeguro(route.query.voltar))
  } catch (e) {
    erro.value =
      e instanceof ApiError && e.status === 429
        ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
        : e instanceof Error
          ? e.message
          : 'Não foi possível criar a conta.'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="pagina-conta">
    <div class="painel-marca" aria-hidden="true">
      <span class="selo-conta">✨</span>
      <p class="chamada">Crie sua conta</p>
      <p>Seus pedidos ficam guardados no seu nome e só você consegue vê-los.</p>
    </div>

    <form class="cartao formulario-conta" novalidate @submit.prevent="cadastrar">
      <h2 class="titulo-pagina">Cadastro</h2>

      <p v-if="erro" class="erro" role="alert" data-testid="erro-cadastro">{{ erro }}</p>

      <div class="campo">
        <label for="cadastro-nome">Nome</label>
        <input id="cadastro-nome" v-model="nome" type="text" autocomplete="name" maxlength="100" required autofocus />
      </div>

      <div class="campo">
        <label for="cadastro-email">E-mail</label>
        <input
          id="cadastro-email"
          v-model="email"
          type="email"
          autocomplete="email"
          inputmode="email"
          maxlength="254"
          required
        />
      </div>

      <CampoSenha
        id="cadastro-senha"
        v-model="senha"
        rotulo="Senha"
        autocomplete="new-password"
        descricao="No mínimo 8 caracteres. Uma frase longa é mais segura que símbolos."
      >
        <div v-if="senha" class="forca" :data-nivel="forca.nivel" data-testid="forca-senha">
          <span class="barras" aria-hidden="true"><i v-for="n in 4" :key="n" :class="{ cheia: n <= forca.nivel }" /></span>
          <span>{{ forca.rotulo }}</span>
        </div>
      </CampoSenha>

      <CampoSenha id="cadastro-confirmacao" v-model="confirmacao" rotulo="Confirme a senha" autocomplete="new-password" />
      <p v-if="senhasDiferentes" class="aviso-campo" role="status">As senhas não são iguais.</p>

      <button type="submit" class="botao destaque grande" :disabled="!podeEnviar">
        {{ enviando ? 'Criando conta…' : 'Criar conta' }}
      </button>

      <p class="alternativa">
        Já tem conta?
        <RouterLink :to="{ name: 'entrar', query: route.query.voltar ? { voltar: destinoSeguro(route.query.voltar) } : {} }">
          Entrar
        </RouterLink>
      </p>
    </form>
  </section>
</template>

<style scoped>
.forca {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: var(--cor-texto-suave);
}
.barras {
  display: flex;
  gap: 4px;
}
.barras i {
  width: 34px;
  height: 6px;
  border-radius: 3px;
  background: var(--cor-borda);
  transition: background 0.3s var(--ease-suave);
}
.forca[data-nivel='1'] .cheia {
  background: var(--cor-erro);
}
.forca[data-nivel='2'] .cheia {
  background: var(--cor-destaque-claro);
}
.forca[data-nivel='3'] .cheia,
.forca[data-nivel='4'] .cheia {
  background: var(--cor-sucesso-claro);
}
.aviso-campo {
  color: var(--cor-erro);
  font-size: 0.8125rem;
  margin-top: -6px;
}
</style>
