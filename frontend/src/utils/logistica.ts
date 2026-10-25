import type { RouteLocationRaw } from 'vue-router'
import { ETAPAS_ENVIO, type Endereco, type EnvioResumo, type StatusEnvio, type StatusPedido } from '@/api/types'

/** Tom do selo: dentro do centro de distribuição, com a transportadora, ou concluído. */
export type TomStatus = 'cd' | 'transporte' | 'concluido'

export const STATUS_ENVIO: Record<StatusEnvio, { nome: string; cliente: string; tom: TomStatus }> = {
  AguardandoSeparacao: { nome: 'Aguardando separação', cliente: 'Pagamento aprovado', tom: 'cd' },
  EmSeparacao: { nome: 'Em separação', cliente: 'Separando os produtos', tom: 'cd' },
  Separado: { nome: 'Separado', cliente: 'Produtos separados', tom: 'cd' },
  Embalado: { nome: 'Embalado', cliente: 'Pacote embalado', tom: 'cd' },
  ProntoParaEnvio: { nome: 'Pronto para envio', cliente: 'Aguardando a transportadora', tom: 'cd' },
  Expedido: { nome: 'Expedido', cliente: 'Coletado pela transportadora', tom: 'transporte' },
  EmTransito: { nome: 'Em trânsito', cliente: 'A caminho', tom: 'transporte' },
  SaiuParaEntrega: { nome: 'Saiu para entrega', cliente: 'Saiu para entrega', tom: 'transporte' },
  Entregue: { nome: 'Entregue', cliente: 'Entregue', tom: 'concluido' },
}

export const STATUS_PEDIDO: Record<StatusPedido, { nome: string; tom: TomStatus }> = {
  Pago: { nome: 'Pagamento aprovado', tom: 'cd' },
  EmPreparacao: { nome: 'Em preparação', tom: 'cd' },
  Enviado: { nome: 'A caminho', tom: 'transporte' },
  Entregue: { nome: 'Entregue', tom: 'concluido' },
}

/** O que o cliente vê na linha do tempo: os marcos, sem o detalhe interno do centro de distribuição. */
export const MARCOS_CLIENTE: StatusEnvio[] = ['AguardandoSeparacao', 'EmSeparacao', 'ProntoParaEnvio', 'EmTransito', 'SaiuParaEntrega', 'Entregue']

export function proximaEtapa(status: StatusEnvio): StatusEnvio | null {
  const i = ETAPAS_ENVIO.indexOf(status)
  return i < ETAPAS_ENVIO.length - 1 ? ETAPAS_ENVIO[i + 1] : null
}

export function etapaAtingida(atual: StatusEnvio, etapa: StatusEnvio): boolean {
  return ETAPAS_ENVIO.indexOf(atual) >= ETAPAS_ENVIO.indexOf(etapa)
}

/** "30130010" → "30130-010". */
export function formatarCep(cep: string): string {
  const d = cep.replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep
}

/** Enquanto digita: só dígitos, com o hífen depois do quinto. */
export function mascararCep(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function linhaEndereco(e: Endereco): string {
  return `${e.logradouro}, ${e.numero}${e.complemento ? ` · ${e.complemento}` : ''} · ${e.bairro}`
}

export function cidadeEndereco(e: Endereco): string {
  return `${e.cidade}, ${e.uf} · CEP ${formatarCep(e.cep)}`
}

const dataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const diaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

export function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dataHora.format(d).replace(',', '')
}

/** "Chega amanhã", "Chega hoje" ou "Chega quarta-feira, 28 de outubro". */
export function textoPrevisao(iso: string, agora = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dias = Math.round((dia(d) - dia(agora)) / 86_400_000)
  if (dias === 0) return 'Chega hoje'
  if (dias === 1) return 'Chega amanhã'
  if (dias < 0) return `Previsto para ${diaLongo.format(d)}`
  return `Chega ${diaLongo.format(d)}`
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

/** Dentro do CD o envio anda pelas telas: diz para qual tela levar cada etapa. */
export function acaoNoCentro(envio: Pick<EnvioResumo, 'id' | 'status'>): { rotulo: string; rota: RouteLocationRaw } | null {
  switch (envio.status) {
    case 'AguardandoSeparacao':
    case 'EmSeparacao':
      return { rotulo: 'Separação', rota: { name: 'logistica-separacao' } }
    case 'Separado':
    case 'Embalado':
      return { rotulo: 'Embalagem', rota: { name: 'logistica-embalagem', params: { envioId: envio.id } } }
    case 'ProntoParaEnvio':
      return { rotulo: 'Expedição', rota: { name: 'logistica-expedicao' } }
    default:
      return null
  }
}

/** "#1F126056": o número do pedido que a loja mostra e que o embalador bipa. */
export function numeroPedido(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

/** 1180 → "1,18 kg"; 420 → "420 g". */
export function formatarPeso(gramas: number): string {
  return gramas < 1000 ? `${gramas} g` : `${(gramas / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}
