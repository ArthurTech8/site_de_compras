<script setup lang="ts">
import EtapasCompra from '@/components/EtapasCompra.vue'
import { useCarrinhoStore } from '@/stores/carrinho'
import { confirmar, toastSucesso } from '@/utils/alertas'
import { formatarPreco, urlImagem } from '@/utils/formatar'

const carrinho = useCarrinhoStore()

// Os erros ficam em carrinho.erro e são exibidos abaixo; aqui só evitamos a promessa rejeitada solta.
const ignorar = () => {}

async function remover(produtoId: number, nome: string) {
  await carrinho.remover(produtoId).then(() => toastSucesso('Item removido', { texto: nome }), ignorar)
}

async function esvaziar() {
  const ok = await confirmar({
    titulo: 'Esvaziar o carrinho?',
    texto: `Os ${carrinho.quantidadeTotal} itens serão removidos. Você pode adicioná-los de novo depois.`,
    confirmar: 'Sim, esvaziar',
    cancelar: 'Manter itens',
    perigo: true,
  })
  if (ok) await carrinho.limpar().catch(ignorar)
}

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
    <EtapasCompra v-if="!carrinho.vazio" :atual="1" />
    <h2 class="titulo-pagina">Carrinho</h2>

    <p v-if="carrinho.erro" class="erro" role="alert">{{ carrinho.erro }}</p>

    <div v-if="carrinho.vazio" class="vazio">
      <span class="icone-vazio" aria-hidden="true">🛒</span>
      <p>Seu carrinho está vazio.</p>
      <RouterLink to="/" class="botao">Ver produtos</RouterLink>
    </div>

    <template v-else>
      <table class="tabela cartao" :class="{ carregando: carrinho.carregando }">
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
          <tr v-for="(item, i) in carrinho.itens" :key="item.produtoId" class="surgir" :style="{ '--i': i }">
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
            <td data-rotulo="Subtotal" class="subtotal">{{ formatarPreco(item.subtotal) }}</td>
            <td>
              <button
                type="button"
                class="botao secundario"
                :disabled="carrinho.carregando"
                @click="remover(item.produtoId, item.nomeProduto)"
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
        <button type="button" class="botao secundario" :disabled="carrinho.carregando" @click="esvaziar">
          Esvaziar carrinho
        </button>
        <RouterLink to="/checkout" class="botao destaque grande" :class="{ desativado: carrinho.carregando }">Finalizar compra →</RouterLink>
      </div>
    </template>
  </section>
</template>

<style scoped>
.tabela {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 16px;
  overflow: hidden;
  border-radius: var(--raio-lg);
  transition: opacity 0.15s;
}
.tabela.carregando {
  opacity: 0.6;
}
th,
td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--cor-borda);
}
th {
  background: linear-gradient(180deg, var(--cor-primaria-suave), #f3f7fc);
  color: var(--cor-primaria-escura);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}
tbody tr {
  transition: background 0.2s;
}
tbody tr:hover {
  background: #fafcff;
}
.produto {
  display: flex;
  align-items: center;
  gap: 14px;
}
.produto img {
  mix-blend-mode: multiply;
  width: 64px;
  height: 64px;
  object-fit: contain;
  padding: 6px;
  border-radius: var(--raio-md);
  background: linear-gradient(160deg, var(--cor-primaria-suave), #f8fafc);
}
input[type='number'] {
  width: 80px;
}
.subtotal {
  font-weight: 500;
}
tfoot td {
  background: #fafcff;
  border-bottom: none;
}
.total {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--cor-primaria);
}
.acoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}
.desativado {
  opacity: 0.5;
  pointer-events: none;
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
    padding: 12px 16px;
  }
  td {
    border: none;
    padding: 4px 0;
  }
  tfoot td {
    padding: 8px 16px;
  }
  td[data-rotulo]::before {
    content: attr(data-rotulo) ': ';
    color: var(--cor-texto-suave);
  }
}
</style>
