<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { pedidosApi } from '@/api/pedidos'
import type { Pedido } from '@/api/types'
import EtapasCompra from '@/components/EtapasCompra.vue'
import { toastErro, toastSucesso } from '@/utils/alertas'
import { formatarPercentual, formatarPreco, urlImagem } from '@/utils/formatar'

const props = defineProps<{ id: string }>()

const pedido = ref<Pedido | null>(null)
const erro = ref<string | null>(null)

const nomesForma = { Pix: 'Pix', Debito: 'Débito', Credito: 'Crédito' } as const
const iconesForma = { Pix: '⚡', Debito: '🏦', Credito: '💳' } as const

const descricaoPagamento = computed(() => {
  const p = pedido.value?.pagamento
  if (!p) return ''
  if (p.forma === 'Credito')
    return `${p.parcelas}x de ${formatarPreco(p.valorParcela)} (juros de ${formatarPercentual(p.taxaJurosMensal)} a.m.)`
  if (p.forma === 'Pix') return `à vista com ${p.descontoPercentual}% de desconto`
  return 'à vista'
})

const quantidadeItens = computed(() => pedido.value?.itens.reduce((soma, i) => soma + i.quantidade, 0) ?? 0)

const dataPedido = computed(() => {
  if (!pedido.value) return ''
  const data = new Date(pedido.value.criadoEm)
  if (Number.isNaN(data.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(data)
})

/** Número curto para exibir; o id completo continua disponível para copiar. */
const numeroCurto = computed(() => pedido.value?.id.slice(0, 8).toUpperCase() ?? '')

const passos = [
  { titulo: 'Pedido realizado', texto: 'Recebemos o seu pedido.', estado: 'feito' },
  { titulo: 'Pagamento aprovado', texto: 'O pagamento foi confirmado.', estado: 'feito' },
  { titulo: 'Em separação', texto: 'Estamos preparando os seus produtos.', estado: 'andamento' },
  { titulo: 'Enviado', texto: 'Você será avisado quando sair para entrega.', estado: 'pendente' },
] as const

// Confete com as cores da paleta; posições fixas por peça para não sortear a cada render.
const coresConfete = ['#0b4f9c', '#1c7ed6', '#e8590c', '#fd7e14', '#2b8a3e', '#40c057']
const confete = Array.from({ length: 36 }, (_, i) => ({
  cor: coresConfete[i % coresConfete.length],
  esquerda: (i * 37) % 100,
  atraso: (i % 9) * 0.12,
  duracao: 2.2 + (i % 5) * 0.35,
  giro: (i * 47) % 360,
  largura: 6 + (i % 3) * 3,
}))

async function copiarNumero() {
  if (!pedido.value) return
  try {
    await navigator.clipboard.writeText(pedido.value.id)
    toastSucesso('Número do pedido copiado')
  } catch {
    toastErro('Não foi possível copiar', pedido.value.id)
  }
}

const imprimir = () => window.print()

onMounted(async () => {
  try {
    pedido.value = await pedidosApi.obter(props.id)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível carregar o pedido.'
  }
})
</script>

<template>
  <section class="pedido">
    <div v-if="erro" class="vazio">
      <span class="icone-vazio" aria-hidden="true">📦</span>
      <p class="erro" role="alert">{{ erro }}</p>
      <RouterLink to="/" class="botao">Voltar para a loja</RouterLink>
    </div>

    <div v-else-if="!pedido" class="carregando-pedido" aria-busy="true">
      <span class="anel" />
      <p>Carregando o seu pedido…</p>
    </div>

    <template v-else>
      <EtapasCompra :atual="4" class="nao-imprimir" />

      <div class="celebracao">
        <div class="confete" aria-hidden="true">
          <i
            v-for="(c, i) in confete"
            :key="i"
            :style="{
              background: c.cor,
              left: `${c.esquerda}%`,
              width: `${c.largura}px`,
              animationDelay: `${c.atraso}s`,
              animationDuration: `${c.duracao}s`,
              '--giro': `${c.giro}deg`,
            }"
          />
        </div>

        <svg class="check" viewBox="0 0 52 52" aria-hidden="true">
          <circle class="check-circulo" cx="26" cy="26" r="24" />
          <path class="check-marca" d="M15 27 l7 7 l15 -16" />
        </svg>

        <h2>Pedido confirmado!</h2>
        <p class="subtitulo">
          Obrigado pela compra. Pagamento aprovado no
          <strong>{{ nomesForma[pedido.pagamento.forma] }}</strong>, {{ descricaoPagamento }}.
        </p>

        <div class="meta">
          <button type="button" class="numero" title="Copiar número completo" @click="copiarNumero">
            Pedido <strong>#{{ numeroCurto }}</strong>
            <span class="copiar" aria-hidden="true">⧉</span>
            <span class="sr-only">Copiar número do pedido</span>
          </button>
          <span v-if="dataPedido" class="data">{{ dataPedido }}</span>
        </div>
      </div>

      <div class="grade-pedido">
        <article class="cartao bloco itens surgir" style="--i: 2">
          <header>
            <h3>Itens do pedido</h3>
            <span class="contador">{{ quantidadeItens }} {{ quantidadeItens === 1 ? 'item' : 'itens' }}</span>
          </header>
          <ul>
            <li v-for="(item, i) in pedido.itens" :key="item.produtoId" class="surgir" :style="{ '--i': i + 3 }">
              <img :src="urlImagem(item.imagemUrl)" :alt="item.nomeProduto" />
              <div class="item-info">
                <strong>{{ item.nomeProduto }}</strong>
                <span>{{ item.quantidade }} × {{ formatarPreco(item.precoUnitario) }}</span>
              </div>
              <span class="item-valor">{{ formatarPreco(item.subtotal) }}</span>
            </li>
          </ul>
        </article>

        <article class="cartao bloco pagamento surgir" style="--i: 3">
          <header>
            <h3>Pagamento</h3>
            <span class="status">✓ Aprovado</span>
          </header>

          <div class="forma">
            <span class="icone" :class="pedido.pagamento.forma.toLowerCase()" aria-hidden="true">
              {{ iconesForma[pedido.pagamento.forma] }}
            </span>
            <div>
              <strong>{{ nomesForma[pedido.pagamento.forma] }}</strong>
              <span>{{ descricaoPagamento }}</span>
            </div>
          </div>

          <dl class="valores">
            <div>
              <dt>Total do carrinho</dt>
              <dd>{{ formatarPreco(pedido.pagamento.subtotal) }}</dd>
            </div>
            <div v-if="pedido.pagamento.desconto > 0" class="desconto">
              <dt>Desconto Pix ({{ pedido.pagamento.descontoPercentual }}%)</dt>
              <dd>− {{ formatarPreco(pedido.pagamento.desconto) }}</dd>
            </div>
            <div v-if="pedido.pagamento.juros > 0" class="juros">
              <dt>Juros do parcelamento</dt>
              <dd>+ {{ formatarPreco(pedido.pagamento.juros) }}</dd>
            </div>
            <div class="total">
              <dt>Total pago</dt>
              <dd>{{ formatarPreco(pedido.pagamento.total) }}</dd>
            </div>
          </dl>

          <p v-if="pedido.pagamento.desconto > 0" class="economia">
            🎉 Você economizou <strong>{{ formatarPreco(pedido.pagamento.desconto) }}</strong> pagando no Pix!
          </p>
          <p v-else-if="pedido.pagamento.forma === 'Credito'" class="parcelas">
            {{ pedido.pagamento.parcelas }} parcelas de <strong>{{ formatarPreco(pedido.pagamento.valorParcela) }}</strong>
          </p>
        </article>

        <article class="cartao bloco passos surgir" style="--i: 4">
          <header>
            <h3>Próximos passos</h3>
          </header>
          <ol>
            <li v-for="p in passos" :key="p.titulo" :class="p.estado">
              <span class="ponto" aria-hidden="true">{{ p.estado === 'feito' ? '✓' : '' }}</span>
              <div>
                <strong>{{ p.titulo }}</strong>
                <span>{{ p.texto }}</span>
              </div>
            </li>
          </ol>
        </article>
      </div>

      <div class="acoes nao-imprimir surgir" style="--i: 6">
        <button type="button" class="botao secundario" @click="imprimir">🖨 Imprimir comprovante</button>
        <RouterLink to="/" class="botao destaque grande">Continuar comprando →</RouterLink>
      </div>
    </template>
  </section>
</template>

<style scoped>
.pedido {
  max-width: 980px;
  margin: 0 auto;
}

/* ---------- Topo comemorativo ---------- */
.celebracao {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: 40px 24px 32px;
  border-radius: var(--raio-lg);
  color: #fff;
  background:
    radial-gradient(420px 200px at 50% 0%, rgba(64, 192, 87, 0.35), transparent 70%),
    radial-gradient(400px 200px at 100% 100%, rgba(253, 126, 20, 0.3), transparent 70%),
    var(--gradiente-primario);
  box-shadow: var(--sombra-lg);
  animation: entrar-celebracao 0.7s var(--ease-mola) backwards;
}
.celebracao::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}
.celebracao > *:not(.confete) {
  position: relative;
  z-index: 1;
}
.celebracao h2 {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  margin: 14px 0 8px;
  animation: surgir 0.6s 0.55s var(--ease-suave) backwards;
}
.subtitulo {
  max-width: 560px;
  margin: 0 auto;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.5;
  animation: surgir 0.6s 0.65s var(--ease-suave) backwards;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  animation: surgir 0.6s 0.75s var(--ease-suave) backwards;
}
.numero {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition:
    background 0.2s,
    transform 0.2s var(--ease-suave);
}
.numero:hover {
  background: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}
.numero strong {
  font-family: 'Zen Dots', sans-serif;
  letter-spacing: 0.06em;
}
.copiar {
  opacity: 0.75;
}
.data {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
}

/* Check animado: o círculo é desenhado e depois a marca */
.check {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.06);
  animation: pulsar-check 0.6s 1.1s var(--ease-mola) backwards;
}
.check-circulo {
  fill: none;
  stroke: var(--cor-sucesso-claro);
  stroke-width: 3;
  stroke-dasharray: 151;
  stroke-dashoffset: 151;
  animation: desenhar 0.6s 0.25s var(--ease-suave) forwards;
}
.check-marca {
  fill: none;
  stroke: #fff;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: desenhar 0.4s 0.8s var(--ease-suave) forwards;
}

.confete {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.confete i {
  position: absolute;
  top: -16px;
  height: 12px;
  border-radius: 2px;
  opacity: 0;
  animation-name: cair;
  animation-timing-function: cubic-bezier(0.25, 0.6, 0.5, 1);
  animation-fill-mode: forwards;
}

/* ---------- Cartões ---------- */
.grade-pedido {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 20px;
  margin-top: 24px;
}
.bloco {
  padding: 20px;
  border-radius: var(--raio-lg);
  box-shadow: var(--sombra-md);
}
.bloco header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cor-borda);
}
.bloco h3 {
  font-size: 1.0625rem;
}
.contador {
  font-size: 0.8125rem;
  color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
  padding: 3px 10px;
  border-radius: 999px;
}
.status {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-suave);
  padding: 3px 10px;
  border-radius: 999px;
}
.itens ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.itens li {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 8px;
  border-radius: var(--raio-md);
  transition: background 0.2s;
}
.itens li:hover {
  background: var(--cor-fundo);
}
.itens img {
  mix-blend-mode: multiply;
  width: 56px;
  height: 56px;
  object-fit: contain;
  padding: 6px;
  border-radius: var(--raio-md);
  background: linear-gradient(160deg, var(--cor-primaria-suave), #f8fafc);
}
.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-info strong {
  font-weight: 500;
}
.item-info span {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.item-valor {
  font-weight: 700;
}

.pagamento {
  border-top: 4px solid var(--cor-sucesso);
}
.forma {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--raio-md);
  background: var(--cor-fundo);
  margin-bottom: 14px;
}
.forma div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.forma div span {
  font-size: 0.8125rem;
  color: var(--cor-texto-suave);
}
.icone {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  font-size: 1.25rem;
  background: var(--cor-primaria-suave);
}
.icone.pix {
  background: var(--cor-sucesso-suave);
}
.icone.credito {
  background: var(--cor-destaque-suave);
}
.valores {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.valores div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.valores dt {
  color: var(--cor-texto-suave);
}
.valores .desconto,
.valores .desconto dt {
  color: var(--cor-sucesso);
}
.valores .juros,
.valores .juros dt {
  color: var(--cor-destaque);
}
.valores .total {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--cor-borda);
  align-items: baseline;
}
.valores .total dt {
  color: var(--cor-texto);
  font-weight: 700;
}
.valores .total dd {
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--cor-primaria);
  letter-spacing: -0.01em;
}
.economia,
.parcelas {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--raio-md);
  font-size: 0.875rem;
  text-align: center;
}
.economia {
  background: var(--cor-sucesso-suave);
  color: var(--cor-sucesso);
  border: 1px solid #b2f2bb;
}
.parcelas {
  background: var(--cor-destaque-suave);
  color: var(--cor-destaque);
  border: 1px solid #ffd8a8;
}

/* Linha do tempo */
.passos {
  grid-column: 1 / -1;
}
.passos ol {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.passos li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.875rem;
}
.passos li + li::before {
  content: '';
  position: absolute;
  top: 13px;
  right: calc(100% - 14px);
  width: calc(100% - 16px);
  height: 3px;
  border-radius: 2px;
  background: var(--cor-borda);
}
.passos li.feito + li::before {
  background: var(--gradiente-sucesso);
}
.passos li div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.passos li span:not(.ponto) {
  color: var(--cor-texto-suave);
  font-size: 0.8125rem;
}
.ponto {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--cor-borda);
  background: var(--cor-superficie);
  font-size: 0.8125rem;
  font-weight: 700;
  color: #fff;
}
.feito .ponto {
  background: var(--gradiente-sucesso);
  border-color: var(--cor-sucesso);
}
.andamento .ponto {
  border-color: var(--cor-destaque);
  background: var(--cor-destaque-suave);
  animation: pulsar-anel 1.6s ease-out infinite;
}
.andamento strong {
  color: var(--cor-destaque);
}
.pendente strong {
  color: var(--cor-texto-suave);
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.carregando-pedido {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 0;
  color: var(--cor-texto-suave);
}
.anel {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid var(--cor-primaria-suave);
  border-top-color: var(--cor-primaria);
  animation: girar 0.8s linear infinite;
}

@keyframes desenhar {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes pulsar-check {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes entrar-celebracao {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(12px);
  }
}
@keyframes cair {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(340px) rotate(calc(var(--giro) + 540deg));
  }
}
@keyframes pulsar-anel {
  0% {
    box-shadow: 0 0 0 0 rgba(232, 89, 12, 0.45);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(232, 89, 12, 0);
  }
}
@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .grade-pedido {
    grid-template-columns: 1fr;
  }
  .passos ol {
    grid-template-columns: 1fr;
  }
  .passos li {
    flex-direction: row;
    align-items: flex-start;
  }
  .passos li + li::before {
    display: none;
  }
}

@media print {
  .nao-imprimir,
  .confete {
    display: none;
  }
  .celebracao {
    color: var(--cor-texto);
    background: none;
    box-shadow: none;
  }
  .subtitulo,
  .data,
  .numero {
    color: var(--cor-texto);
  }
}
</style>
