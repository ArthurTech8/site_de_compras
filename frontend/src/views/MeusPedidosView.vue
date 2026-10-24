<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { contaApi } from '@/api/conta'
import type { PedidoResumo } from '@/api/types'
import StatusSelo from '@/components/StatusSelo.vue'
import { formatarPreco, urlImagem } from '@/utils/formatar'
import { STATUS_PEDIDO } from '@/utils/logistica'

const pedidos = ref<PedidoResumo[] | null>(null)
const erro = ref<string | null>(null)

const data = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
  try {
    pedidos.value = await contaApi.pedidos()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar os seus pedidos.'
  }
})
</script>

<template>
  <section class="meus-pedidos">
    <h2 class="titulo-pagina">Meus pedidos</h2>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>
    <p v-else-if="!pedidos" class="carregando">Carregando os seus pedidos…</p>

    <div v-else-if="!pedidos.length" class="vazio">
      <span class="icone-vazio" aria-hidden="true">📦</span>
      <p>Você ainda não fez nenhum pedido com esta conta.</p>
      <RouterLink to="/" class="botao">Ver produtos</RouterLink>
    </div>

    <ul v-else class="lista">
      <li v-for="(p, i) in pedidos" :key="p.id" class="surgir" :style="{ '--i': i }">
        <RouterLink :to="{ name: 'pedido', params: { id: p.id } }" class="cartao linha" data-testid="linha-pedido">
          <img :src="urlImagem(p.imagemUrl)" :alt="p.primeiroItem" />
          <div class="info">
            <strong>
              {{ p.primeiroItem }}
              <template v-if="p.quantidadeItens > 1"> e mais {{ p.quantidadeItens - 1 }}</template>
            </strong>
            <span>Pedido #{{ p.id.slice(0, 8).toUpperCase() }} · {{ data.format(new Date(p.criadoEm)) }}</span>
          </div>
          <StatusSelo :texto="STATUS_PEDIDO[p.status].nome" :tom="STATUS_PEDIDO[p.status].tom" />
          <span class="total">{{ formatarPreco(p.total) }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.meus-pedidos {
  max-width: 860px;
  margin: 0 auto;
}
.carregando {
  margin-top: 20px;
  color: var(--cor-texto-suave);
}
.lista {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}
.linha {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  color: inherit;
  transition:
    transform 0.2s var(--ease-suave),
    box-shadow 0.2s;
}
.linha:hover {
  color: inherit;
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}
.linha img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.info strong {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info span {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.total {
  font-weight: 700;
  color: var(--cor-primaria);
  font-variant-numeric: tabular-nums;
}
@media (max-width: 560px) {
  .linha {
    grid-template-columns: 48px minmax(0, 1fr) auto;
  }
  .linha img {
    width: 48px;
    height: 48px;
  }
  .total {
    display: none;
  }
}
</style>
