<script setup lang="ts">
import type { Endereco } from '@/api/types'
import { UFS, mascararCep } from '@/utils/logistica'

/** Campos do endereço de entrega. O pai guarda o objeto; aqui só se edita. */
const endereco = defineModel<Endereco>({ required: true })
defineProps<{ erros?: Partial<Record<keyof Endereco, string>> }>()

function aoDigitarCep(evento: Event) {
  const campo = evento.target as HTMLInputElement
  campo.value = mascararCep(campo.value)
  endereco.value.cep = campo.value
}
</script>

<template>
  <div class="formulario-endereco">
    <label class="campo largo">
      Quem vai receber
      <input id="end-destinatario" v-model.trim="endereco.destinatario" autocomplete="name" maxlength="100" required />
      <small v-if="erros?.destinatario" class="erro-campo">{{ erros.destinatario }}</small>
    </label>
    <label class="campo">
      CEP
      <input
        id="end-cep"
        :value="endereco.cep"
        inputmode="numeric"
        autocomplete="postal-code"
        placeholder="00000-000"
        maxlength="9"
        required
        @input="aoDigitarCep"
      />
      <small v-if="erros?.cep" class="erro-campo">{{ erros.cep }}</small>
    </label>
    <label class="campo largo">
      Rua
      <input id="end-logradouro" v-model.trim="endereco.logradouro" autocomplete="address-line1" maxlength="150" required />
      <small v-if="erros?.logradouro" class="erro-campo">{{ erros.logradouro }}</small>
    </label>
    <label class="campo">
      Número
      <input id="end-numero" v-model.trim="endereco.numero" maxlength="20" required />
      <small v-if="erros?.numero" class="erro-campo">{{ erros.numero }}</small>
    </label>
    <label class="campo">
      Complemento
      <input id="end-complemento" v-model.trim="endereco.complemento" autocomplete="address-line2" placeholder="Opcional" maxlength="100" />
    </label>
    <label class="campo">
      Bairro
      <input id="end-bairro" v-model.trim="endereco.bairro" maxlength="100" required />
      <small v-if="erros?.bairro" class="erro-campo">{{ erros.bairro }}</small>
    </label>
    <label class="campo">
      Cidade
      <input id="end-cidade" v-model.trim="endereco.cidade" autocomplete="address-level2" maxlength="100" required />
      <small v-if="erros?.cidade" class="erro-campo">{{ erros.cidade }}</small>
    </label>
    <label class="campo">
      UF
      <select id="end-uf" v-model="endereco.uf" autocomplete="address-level1" required>
        <option value="" disabled>Escolha</option>
        <option v-for="uf in UFS" :key="uf" :value="uf">{{ uf }}</option>
      </select>
      <small v-if="erros?.uf" class="erro-campo">{{ erros.uf }}</small>
    </label>
  </div>
</template>

<style scoped>
.formulario-endereco {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 14px;
}
.largo {
  grid-column: span 2;
}
.campo input,
.campo select {
  width: 100%;
}
.erro-campo {
  color: var(--cor-erro);
  font-size: 0.8125rem;
}
@media (max-width: 560px) {
  .formulario-endereco {
    grid-template-columns: 1fr 1fr;
  }
  .largo {
    grid-column: 1 / -1;
  }
}
</style>
