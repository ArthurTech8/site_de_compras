<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { carrinhosApi } from '@/api/carrinhos'
import { contaApi } from '@/api/conta'
import type { Endereco, EnderecoSalvo, FormaPagamento, OpcoesPagamento } from '@/api/types'
import EtapasCompra from '@/components/EtapasCompra.vue'
import FormularioEndereco from '@/components/FormularioEndereco.vue'
import { useCarrinhoStore } from '@/stores/carrinho'
import { useSessaoStore } from '@/stores/sessao'
import { alertaErro, carregando as mostrarProcessando, confirmar, escapar, fecharAlerta } from '@/utils/alertas'
import { formatarPercentual, formatarPreco } from '@/utils/formatar'
import { UFS, cidadeEndereco, linhaEndereco } from '@/utils/logistica'

const carrinho = useCarrinhoStore()
const sessao = useSessaoStore()
const router = useRouter()

// ---------- Entrega ----------
const enderecosSalvos = ref<EnderecoSalvo[]>([])
/** Id do endereço salvo escolhido, ou 'novo' para digitar um. */
const escolhido = ref<number | 'novo'>('novo')
const novoEndereco = ref<Endereco>({
  destinatario: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
})
const salvarNaConta = ref(true)
const errosEndereco = ref<Partial<Record<keyof Endereco, string>>>({})

const enderecoEntrega = computed<Endereco>(() =>
  escolhido.value === 'novo'
    ? novoEndereco.value
    : (enderecosSalvos.value.find((e) => e.id === escolhido.value)?.endereco ?? novoEndereco.value),
)

async function carregarEnderecos() {
  if (!sessao.logado) {
    enderecosSalvos.value = []
    escolhido.value = 'novo'
    return
  }
  try {
    enderecosSalvos.value = await contaApi.enderecos()
    if (enderecosSalvos.value.length) escolhido.value = enderecosSalvos.value[0].id
  } catch {
    // Sem a lista, o cliente ainda pode digitar o endereço.
    enderecosSalvos.value = []
  }
}

/** As mesmas regras do backend, para avisar antes de enviar. */
function validarEndereco(e: Endereco): Partial<Record<keyof Endereco, string>> {
  const erros: Partial<Record<keyof Endereco, string>> = {}
  if (e.destinatario.trim().length < 2) erros.destinatario = 'Informe o nome de quem vai receber.'
  if (e.cep.replace(/\D/g, '').length !== 8) erros.cep = 'O CEP precisa ter 8 dígitos.'
  if (!e.logradouro.trim()) erros.logradouro = 'Informe a rua.'
  if (!e.numero.trim()) erros.numero = 'Informe o número.'
  if (!e.bairro.trim()) erros.bairro = 'Informe o bairro.'
  if (!e.cidade.trim()) erros.cidade = 'Informe a cidade.'
  if (!(UFS as readonly string[]).includes(e.uf)) erros.uf = 'Escolha a UF.'
  return erros
}

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

const nomesForma: Record<FormaPagamento, string> = { Pix: 'Pix', Debito: 'Débito', Credito: 'Crédito' }

function resumoConfirmacao(): string {
  const e = enderecoEntrega.value
  const linhas: [string, string][] = [
    ['Entrega', `${e.cidade}, ${e.uf}`],
    ['Forma', nomesForma[forma.value]],
  ]
  if (forma.value === 'Credito' && parcelamento.value)
    linhas.push(['Parcelas', `${parcelamento.value.parcelas}x de ${formatarPreco(parcelamento.value.valorParcela)}`])
  if (forma.value === 'Pix' && opcoes.value)
    linhas.push(['Desconto', `− ${formatarPreco(opcoes.value.pix.desconto)}`])
  linhas.push(['Total', formatarPreco(totalAPagar.value)])
  return `<div class="resumo-alerta">${linhas
    .map(([r, v]) => `<span>${escapar(r)}</span><strong>${escapar(v)}</strong>`)
    .join('')}</div>`
}

async function pagar() {
  errosEndereco.value = escolhido.value === 'novo' ? validarEndereco(novoEndereco.value) : {}
  if (Object.keys(errosEndereco.value).length) {
    erro.value = 'Confira o endereço de entrega.'
    document.getElementById('entrega')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  const ok = await confirmar({
    titulo: 'Confirmar pagamento?',
    html: resumoConfirmacao(),
    confirmar: 'Pagar agora',
    cancelar: 'Revisar',
    icone: 'info',
  })
  if (!ok) return

  pagando.value = true
  erro.value = null
  mostrarProcessando('Processando pagamento…', 'Só um instante, estamos confirmando com o banco.')
  try {
    const endereco = { ...enderecoEntrega.value }
    if (escolhido.value === 'novo' && sessao.logado && salvarNaConta.value)
      // Guardar é conveniência: se falhar (ex.: limite de endereços), a compra segue.
      await contaApi.salvarEndereco(endereco).catch(() => {})
    const pedido = await carrinho.finalizar(forma.value, forma.value === 'Credito' ? parcelas.value : undefined, endereco)
    fecharAlerta()
    await router.push({ name: 'pedido', params: { id: pedido.id }, query: { novo: '1' } })
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível finalizar a compra.'
    void alertaErro('Pagamento não concluído', erro.value)
  } finally {
    pagando.value = false
  }
}

onMounted(() => {
  void carregarOpcoes()
  void carregarEnderecos()
})
watch(() => sessao.logado, carregarEnderecos)
// O carrinho pode terminar de carregar depois que a página abre (ex.: F5 direto no /checkout).
watch(() => carrinho.carrinho?.atualizadoEm, (atual, anterior) => {
  if (atual !== anterior && !pagando.value) carregarOpcoes()
})
</script>

<template>
  <section>
    <EtapasCompra v-if="!carrinho.vazio" :atual="2" />
    <h2 class="titulo-pagina">Entrega e pagamento</h2>

    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>

    <div v-if="carrinho.vazio" class="vazio">
      <span class="icone-vazio" aria-hidden="true">🛒</span>
      <p>Seu carrinho está vazio.</p>
      <RouterLink to="/" class="botao">Ver produtos</RouterLink>
    </div>

    <p v-else-if="carregando && !opcoes">Calculando as formas de pagamento…</p>

    <div v-else-if="opcoes" class="checkout">
      <div class="coluna">
      <section id="entrega" class="entrega" aria-labelledby="titulo-entrega">
        <h3 id="titulo-entrega"><span class="icone" aria-hidden="true">📦</span>Entrega</h3>

        <div v-if="enderecosSalvos.length" class="salvos" role="radiogroup" aria-label="Endereço de entrega">
          <label v-for="s in enderecosSalvos" :key="s.id" class="salvo" :class="{ selecionado: escolhido === s.id }">
            <input v-model="escolhido" type="radio" name="endereco" :value="s.id" />
            <span>
              <strong>{{ s.endereco.destinatario }}</strong>
              <span>{{ linhaEndereco(s.endereco) }}</span>
              <span>{{ cidadeEndereco(s.endereco) }}</span>
            </span>
          </label>
          <label class="salvo" :class="{ selecionado: escolhido === 'novo' }">
            <input v-model="escolhido" type="radio" name="endereco" value="novo" data-testid="novo-endereco" />
            <span><strong>Usar outro endereço</strong></span>
          </label>
        </div>

        <template v-if="escolhido === 'novo'">
          <FormularioEndereco v-model="novoEndereco" :erros="errosEndereco" />
          <label v-if="sessao.logado" class="salvar-conta">
            <input v-model="salvarNaConta" type="checkbox" />
            Salvar este endereço na minha conta
          </label>
          <p v-else class="nota">
            <RouterLink :to="{ name: 'entrar', query: { voltar: '/checkout' } }">Entre</RouterLink>
            para usar endereços salvos e acompanhar o pedido em "Meus pedidos".
          </p>
        </template>
      </section>

      <h3 class="titulo-secao"><span class="icone" aria-hidden="true">💰</span>Pagamento</h3>
      <div class="formas" role="radiogroup" aria-label="Forma de pagamento">
        <!-- Pix -->
        <div class="forma" :class="{ selecionada: forma === 'Pix' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Pix" />
            <span class="titulo">
              <span class="icone pix" aria-hidden="true">⚡</span>
              Pix
              <span v-if="opcoes.pix.descontoPercentual > 0" class="selo">{{ opcoes.pix.descontoPercentual }}% off</span>
            </span>
            <strong class="valor" data-testid="total-pix">{{ formatarPreco(opcoes.pix.total) }}</strong>
          </label>
          <Transition name="expandir">
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
          </Transition>
        </div>

        <!-- Débito -->
        <div class="forma" :class="{ selecionada: forma === 'Debito' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Debito" />
            <span class="titulo"><span class="icone debito" aria-hidden="true">🏦</span>Débito</span>
            <strong class="valor" data-testid="total-debito">{{ formatarPreco(opcoes.debito.total) }}</strong>
          </label>
        </div>

        <!-- Crédito -->
        <div class="forma" :class="{ selecionada: forma === 'Credito' }">
          <label class="cabecalho">
            <input v-model="forma" type="radio" name="forma" value="Credito" />
            <span class="titulo"><span class="icone credito" aria-hidden="true">💳</span>Crédito</span>
            <strong class="valor">
              de {{ opcoes.credito.parcelasMinimas }}x a {{ opcoes.credito.parcelasMaximas }}x
            </strong>
          </label>
          <Transition name="expandir">
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
          </Transition>
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
        <button type="button" class="botao destaque grande" :disabled="pagando || carregando" @click="pagar">
          {{ pagando ? 'Processando…' : `Pagar ${formatarPreco(totalAPagar)}` }}
        </button>
        <p class="nota">🔒 Pagamento simulado: nenhuma cobrança real é feita.</p>
        <RouterLink to="/carrinho">Voltar ao carrinho</RouterLink>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.coluna {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.entrega {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
  padding: 18px 20px;
  box-shadow: var(--sombra-sm);
  scroll-margin-top: 110px;
  animation: surgir 0.5s var(--ease-suave) backwards;
}
.entrega h3,
.titulo-secao {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.0625rem;
}
.titulo-secao {
  margin-top: 6px;
}
.salvos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.salvo {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-md);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.salvo.selecionado {
  border-color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}
.salvo input {
  accent-color: var(--cor-primaria);
  margin-top: 3px;
}
.salvo > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.875rem;
  color: var(--cor-texto-suave);
}
.salvo strong {
  color: var(--cor-texto);
  font-weight: 500;
}
.salvar-conta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  cursor: pointer;
}
.salvar-conta input {
  accent-color: var(--cor-primaria);
}
.checkout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  margin-top: 20px;
  align-items: start;
}
.formas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.forma {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
  padding: 18px 20px;
  box-shadow: var(--sombra-sm);
  transition:
    border-color 0.3s,
    box-shadow 0.3s var(--ease-suave),
    transform 0.3s var(--ease-suave);
  animation: surgir 0.5s var(--ease-suave) backwards;
}
.forma:nth-child(2) {
  animation-delay: 60ms;
}
.forma:nth-child(3) {
  animation-delay: 120ms;
}
.forma:hover {
  border-color: #b8c4d2;
  transform: translateY(-2px);
  box-shadow: var(--sombra-md);
}
.forma.selecionada {
  border-color: var(--cor-primaria);
  box-shadow:
    0 0 0 1px var(--cor-primaria),
    var(--sombra-md);
  background: linear-gradient(180deg, #f6faff, var(--cor-superficie) 70%);
}
.forma.selecionada::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 16px;
  bottom: 16px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--gradiente-destaque);
}
.cabecalho {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.cabecalho input {
  accent-color: var(--cor-primaria);
  width: 18px;
  height: 18px;
}
.titulo {
  font-weight: 500;
  font-size: 1.0625rem;
  display: flex;
  align-items: center;
  gap: 10px;
}
.icone {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 1.125rem;
  background: var(--cor-primaria-suave);
  transition: transform 0.4s var(--ease-mola);
}
.icone.pix {
  background: var(--cor-sucesso-suave);
}
.icone.credito {
  background: var(--cor-destaque-suave);
}
.forma.selecionada .icone {
  transform: scale(1.1) rotate(-6deg);
}
.selo {
  background: var(--gradiente-sucesso);
  color: #fff;
  border-radius: 999px;
  font-size: 0.75rem;
  padding: 3px 9px;
  box-shadow: 0 2px 6px rgba(43, 138, 62, 0.3);
}
.valor {
  color: var(--cor-primaria);
  font-size: 1.0625rem;
}
.detalhe {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9375rem;
  padding-top: 12px;
  border-top: 1px dashed var(--cor-borda);
}
.expandir-enter-active {
  transition:
    opacity 0.35s var(--ease-suave),
    transform 0.35s var(--ease-suave);
}
.expandir-enter-from {
  opacity: 0;
  transform: translateY(-8px);
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
  padding: 6px 10px;
  border-radius: var(--raio-sm);
}
.descontos li.aplicado {
  color: var(--cor-sucesso);
  font-weight: 700;
  background: var(--cor-sucesso-suave);
}
.campo select {
  max-width: 260px;
}
.resumo-credito {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: start;
  gap: 6px 20px;
  padding: 12px 14px;
  background: var(--cor-fundo);
  border-radius: var(--raio-md);
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
  position: sticky;
  top: 100px;
  background: var(--cor-superficie);
  border: 1px solid var(--cor-borda);
  border-radius: var(--raio-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--sombra-md);
  border-top: 4px solid var(--cor-primaria);
  animation: surgir 0.5s 0.15s var(--ease-suave) backwards;
}
.resumo h3 {
  font-size: 1.125rem;
}
.resumo ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.875rem;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cor-borda);
}
.resumo li,
.linha {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.linha.total {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--cor-primaria);
  border-top: 1px solid var(--cor-borda);
  padding-top: 12px;
  margin-top: 2px;
}
.resumo .botao {
  margin-top: 6px;
}

@media (max-width: 800px) {
  .checkout {
    grid-template-columns: 1fr;
  }
  .resumo {
    position: static;
  }
}
</style>
