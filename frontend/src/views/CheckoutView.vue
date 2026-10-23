<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { carrinhosApi } from '@/api/carrinhos'
import type { FormaPagamento, OpcoesPagamento } from '@/api/types'
import { useCarrinhoStore } from '@/stores/carrinho'
import { formatarPercentual, formatarPreco } from '@/utils/formatar'

const carrinho = useCarrinhoStore()
const router = useRouter()

const opcoes = ref<OpcoesPagamento | null>(null)
const carregando = ref(false)
const erro = ref<string | null>(null)
const forma = ref<FormaPagamento>('Pix')
const parcelas = ref(0)
const pagando = ref(false)

// Todos os valores vêm do backend; a tela só escolhe qual mostrar.
const parcelamento = computed(() =>
  opcoes.value?.credito.parcelamentos.find((p) => p.parcelas === parcelas.value),
)

const totalAPagar = computed(() => {
  if (!opcoes.value) return 0
  if (forma.value === 'Pix') return opcoes.value.pix.total
  if (forma.value === 'Debito') return opcoes.value.debito.total
  return parcelamento.value?.total ?? 0
})

async function carregarOpcoes() {
  const id = carrinho.carrinho?.id
  if (!id || carrinho.vazio) {
    opcoes.value = null
    return
  }
  carregando.value = true
  erro.value = null
  try {
    opcoes.value = await carrinhosApi.opcoesPagamento(id)
    parcelas.value = opcoes.value.credito.parcelasMinimas
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível calcular as formas de pagamento.'
  } finally {
    carregando.value = false
  }
}

async function pagar() {
  pagando.value = true
  erro.value = null
  try {
    const pedido = await carrinho.finalizar(forma.value, forma.value === 'Credito' ? parcelas.value : undefined)
    await router.push({ name: 'pedido', params: { id: pedido.id } })
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível finalizar a compra.'
  } finally {
    pagando.value = false
  }
}

onMounted(carregarOpcoes)
// O carrinho pode terminar de carregar depois que a página abre (ex.: F5 direto no /checkout).
watch(() => carrinho.carrinho?.atualizadoEm, (atual, anterior) => {
  if (atual !== anterior && !pagando.value) carregarOpcoes()
})
</script>

<template>
  <section>
    <h2>Pagamento</h2>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <div v-if="carrinho.vazio" class="vazio">
      <p>Seu carrinho está vazio.</p>
      <RouterLink to="/" class="botao">Ver produtos</RouterLink>
    </div>

    <p v-else-if="carregando && !opcoes">Calculando as formas de pagamento…</p>

    <div v-else-if="opcoes" class="checkout">
      <div class="formas" role="radiogroup" aria-label="Forma de pagamento">
        <!-- Pix -->
        <div class="forma" :class="{ selecionada: forma === 'Pix' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Pix" />
            <span class="titulo">
              Pix
              <span v-if="opcoes.pix.descontoPercentual > 0" class="selo">{{ opcoes.pix.descontoPercentual }}% off</span>
            </span>
            <strong class="valor" data-testid="total-pix">{{ formatarPreco(opcoes.pix.total) }}</strong>
          </label>
          <div v-if="forma === 'Pix'" class="detalhe">
            <p>
              Desconto de <strong>{{ opcoes.pix.descontoPercentual }}%</strong>
              ({{ formatarPreco(opcoes.pix.desconto) }}) sobre o total.
              <template v-if="opcoes.pix.descontosPorProduto.length > 1">
                Os descontos não se somam: vale o maior, de
                <strong>{{ opcoes.pix.produtoDoDesconto?.nomeProduto }}</strong>.
              </template>
            </p>
            <ul class="descontos">
              <li
                v-for="d in opcoes.pix.descontosPorProduto"
                :key="d.produtoId"
                :class="{ aplicado: d.produtoId === opcoes.pix.produtoDoDesconto?.produtoId }"
              >
                <span>{{ d.nomeProduto }}</span>
                <span>{{ d.descontoPercentual }}%</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Débito -->
        <div class="forma" :class="{ selecionada: forma === 'Debito' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Debito" />
            <span class="titulo">Débito</span>
            <strong class="valor" data-testid="total-debito">{{ formatarPreco(opcoes.debito.total) }}</strong>
          </label>
        </div>

        <!-- Crédito -->
        <div class="forma" :class="{ selecionada: forma === 'Credito' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Credito" />
            <span class="titulo">Crédito</span>
            <strong class="valor">
              de {{ opcoes.credito.parcelasMinimas }}x a {{ opcoes.credito.parcelasMaximas }}x
            </strong>
          </label>
          <div v-if="forma === 'Credito'" class="detalhe">
            <label class="campo">
              Parcelas
              <select v-model.number="parcelas" data-testid="parcelas">
                <option v-for="p in opcoes.credito.parcelamentos" :key="p.parcelas" :value="p.parcelas">
                  {{ p.parcelas }}x de {{ formatarPreco(p.valorParcela) }}
                </option>
              </select>
            </label>
            <dl v-if="parcelamento" class="resumo-credito">
              <dt>Valor de cada parcela</dt>
              <dd data-testid="valor-parcela">{{ parcelamento.parcelas }}x de {{ formatarPreco(parcelamento.valorParcela) }}</dd>
              <dt>Total no crédito</dt>
              <dd data-testid="total-credito">{{ formatarPreco(parcelamento.total) }}</dd>
              <dt>Diferença com juros</dt>
              <dd class="juros" data-testid="juros">+ {{ formatarPreco(parcelamento.juros) }}</dd>
            </dl>
            <p class="nota">
              Juros de {{ formatarPercentual(opcoes.credito.taxaJurosMensal) }} ao mês (Tabela Price) sobre
              {{ formatarPreco(opcoes.subtotal) }}.
            </p>
          </div>
        </div>
      </div>

      <aside class="resumo">
        <h3>Resumo do pedido</h3>
        <ul>
          <li v-for="item in carrinho.itens" :key="item.produtoId">
            <span>{{ item.quantidade }}x {{ item.nomeProduto }}</span>
            <span>{{ formatarPreco(item.subtotal) }}</span>
          </li>
        </ul>
        <p class="linha"><span>Total do carrinho</span><span>{{ formatarPreco(opcoes.subtotal) }}</span></p>
        <p v-if="forma === 'Pix'" class="linha desconto">
          <span>Desconto Pix</span><span>− {{ formatarPreco(opcoes.pix.desconto) }}</span>
        </p>
        <p v-if="forma === 'Credito' && parcelamento" class="linha juros">
          <span>Juros</span><span>+ {{ formatarPreco(parcelamento.juros) }}</span>
        </p>
        <p class="linha total">
          <span>A pagar</span><span data-testid="total-a-pagar">{{ formatarPreco(totalAPagar) }}</span>
        </p>
        <button type="button" class="botao" :disabled="pagando || carregando" @click="pagar">
          {{ pagando ? 'Processando…' : 'Pagar' }}
        </button>
        <p class="nota">Pagamento simulado: nenhuma cobrança real é feita.</p>
        <RouterLink to="/carrinho">Voltar ao carrinho</RouterLink>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.checkout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  margin-top: 16px;
  align-items: start;
}
.formas {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.forma {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 12px;
  padding: 16px;
}
.cabecalho {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.forma.selecionada {
  border-color: var(--cor-primaria);
  box-shadow: 0 0 0 1px var(--cor-primaria);
}
.titulo {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.selo {
  background: var(--cor-sucesso);
  color: #fff;
  border-radius: 999px;
  font-size: 0.75rem;
  padding: 2px 8px;
}
.valor {
  color: var(--cor-primaria);
}
.detalhe {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9375rem;
}
.descontos {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.descontos li {
  display: flex;
  justify-content: space-between;
  color: var(--cor-texto-suave);
}
.descontos li.aplicado {
  color: var(--cor-sucesso);
  font-weight: 700;
}
.campo select {
  max-width: 260px;
}
.resumo-credito {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: start;
  gap: 4px 16px;
}
.resumo-credito dt {
  color: var(--cor-texto-suave);
}
.resumo-credito dd {
  font-weight: 500;
}
.juros {
  color: var(--cor-destaque);
}
.desconto {
  color: var(--cor-sucesso);
}
.nota {
  color: var(--cor-texto-suave);
  font-size: 0.8125rem;
}
.resumo {
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.resumo h3 {
  font-size: 1.125rem;
}
.resumo ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
}
.resumo li,
.linha {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.linha.total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--cor-primaria);
  border-top: 1px solid var(--cor-borda);
  padding-top: 10px;
}
.vazio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
}

@media (max-width: 800px) {
  .checkout {
    grid-template-columns: 1fr;
  }
}
</style>
