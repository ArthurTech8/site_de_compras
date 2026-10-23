<script setup lang="ts">
import { useCarrinhoStore } from '@/stores/carrinho'
import { formatarPreco, urlImagem } from '@/utils/formatar'

const carrinho = useCarrinhoStore()

// Os erros ficam em carrinho.erro e são exibidos abaixo; aqui só evitamos a promessa rejeitada solta.
const ignorar = () => {}

function mudarQuantidade(produtoId: number, evento: Event) {
  const input = evento.target as HTMLInputElement
  const quantidade = Math.floor(Number(input.value))
  if (!Number.isFinite(quantidade)) return
  carrinho.alterarQuantidade(produtoId, quantidade).catch(() => {
    // Volta o campo para o valor que o backend aceitou.
    const item = carrinho.itens.find((i) => i.produtoId === produtoId)
    if (item) input.value = String(item.quantidade)
  })
}
</script>

<template>
  <section>
    <h2>Carrinho</h2>

    <p v-if="carrinho.erro" class="erro" role="alert">{{ carrinho.erro }}</p>

    <div v-if="carrinho.vazio" class="vazio">
      <p>Seu carrinho está vazio.</p>
      <RouterLink to="/" class="botao">Ver produtos</RouterLink>
    </div>

    <template v-else>
      <table class="tabela" :class="{ carregando: carrinho.carregando }">
        <thead>
          <tr>
            <th>Item</th>
            <th>Preço</th>
            <th>Quantidade</th>
            <th>Subtotal</th>
            <th><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in carrinho.itens" :key="item.produtoId">
            <td class="produto">
              <img :src="urlImagem(item.imagemUrl)" :alt="item.nomeProduto" />
              <strong>{{ item.nomeProduto }}</strong>
            </td>
            <td data-rotulo="Preço">{{ formatarPreco(item.precoUnitario) }}</td>
            <td data-rotulo="Quantidade">
              <input
                type="number"
                min="1"
                max="999"
                :value="item.quantidade"
                :aria-label="`Quantidade de ${item.nomeProduto}`"
                :disabled="carrinho.carregando"
                @change="mudarQuantidade(item.produtoId, $event)"
              />
            </td>
            <td data-rotulo="Subtotal">{{ formatarPreco(item.subtotal) }}</td>
            <td>
              <button
                type="button"
                class="botao secundario"
                :disabled="carrinho.carregando"
                @click="carrinho.remover(item.produtoId).catch(ignorar)"
              >
                Remover
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3">
              <strong>Total</strong> ({{ carrinho.quantidadeTotal }}
              {{ carrinho.quantidadeTotal === 1 ? 'item' : 'itens' }})
            </td>
            <td colspan="2" class="total" data-testid="total">{{ formatarPreco(carrinho.total) }}</td>
          </tr>
        </tfoot>
      </table>

      <div class="acoes">
        <button type="button" class="botao secundario" :disabled="carrinho.carregando" @click="carrinho.limpar().catch(ignorar)">
          Esvaziar carrinho
        </button>
        <RouterLink to="/checkout" class="botao" :class="{ desativado: carrinho.carregando }">Finalizar compra</RouterLink>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tabela {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
  transition: opacity 0.15s;
}
.tabela.carregando {
  opacity: 0.6;
}
th,
td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid var(--cor-borda);
}
.produto {
  display: flex;
  align-items: center;
  gap: 12px;
}
.produto img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}
input[type='number'] {
  width: 80px;
}
.total {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--cor-primaria);
}
.acoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
.desativado {
  opacity: 0.5;
  pointer-events: none;
}
.vazio {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
}

/* No celular cada item vira um bloco, com o rótulo da coluna ao lado do valor. */
@media (max-width: 640px) {
  thead {
    display: none;
  }
  tr,
  td {
    display: block;
  }
  tbody tr {
    border-bottom: 1px solid var(--cor-borda);
    padding: 8px 0;
  }
  td {
    border: none;
    padding: 4px 0;
  }
  td[data-rotulo]::before {
    content: attr(data-rotulo) ': ';
    color: var(--cor-texto-suave);
  }
}
</style>
