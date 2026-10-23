<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { pedidosApi } from '@/api/pedidos'
import type { Pedido } from '@/api/types'
import { formatarPercentual, formatarPreco } from '@/utils/formatar'

const props = defineProps<{ id: string }>()

const pedido = ref<Pedido | null>(null)
const erro = ref<string | null>(null)

const nomesForma = { Pix: 'Pix', Debito: 'Débito', Credito: 'Crédito' } as const

const descricaoPagamento = computed(() => {
  const p = pedido.value?.pagamento
  if (!p) return ''
  if (p.forma === 'Credito')
    return `${p.parcelas}x de ${formatarPreco(p.valorParcela)} (juros de ${formatarPercentual(p.taxaJurosMensal)} a.m.)`
  if (p.forma === 'Pix') return `à vista com ${p.descontoPercentual}% de desconto`
  return 'à vista'
})

onMounted(async () => {
  try {
    pedido.value = await pedidosApi.obter(props.id)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar o pedido.'
  }
})
</script>

<template>
  <section>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <template v-if="pedido">
      <h2>Pedido confirmado</h2>
      <p class="aviso">Pagamento aprovado no {{ nomesForma[pedido.pagamento.forma] }}, {{ descricaoPagamento }}.</p>

      <table class="tabela">
        <tbody>
          <tr v-for="item in pedido.itens" :key="item.produtoId">
            <td>{{ item.quantidade }}x {{ item.nomeProduto }}</td>
            <td class="valor">{{ formatarPreco(item.subtotal) }}</td>
          </tr>
          <tr>
            <td>Total do carrinho</td>
            <td class="valor">{{ formatarPreco(pedido.pagamento.subtotal) }}</td>
          </tr>
          <tr v-if="pedido.pagamento.desconto > 0">
            <td>Desconto Pix ({{ pedido.pagamento.descontoPercentual }}%)</td>
            <td class="valor">− {{ formatarPreco(pedido.pagamento.desconto) }}</td>
          </tr>
          <tr v-if="pedido.pagamento.juros > 0">
            <td>Juros do parcelamento</td>
            <td class="valor">+ {{ formatarPreco(pedido.pagamento.juros) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total pago</strong></td>
            <td class="valor total">{{ formatarPreco(pedido.pagamento.total) }}</td>
          </tr>
        </tfoot>
      </table>

      <p class="numero">Pedido nº {{ pedido.id }}</p>
      <RouterLink to="/" class="botao">Continuar comprando</RouterLink>
    </template>
  </section>
</template>

<style scoped>
.tabela {
  width: 100%;
  max-width: 560px;
  border-collapse: collapse;
  margin: 16px 0;
}
td {
  padding: 8px;
  border-bottom: 1px solid var(--cor-borda);
}
.valor {
  text-align: right;
}
.total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--cor-primaria);
}
.numero {
  color: var(--cor-texto-suave);
  font-size: 0.875rem;
  margin-bottom: 16px;
}
</style>
