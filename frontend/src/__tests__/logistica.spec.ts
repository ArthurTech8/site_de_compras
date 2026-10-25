import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LinhaDoTempo from '@/components/LinhaDoTempo.vue'
import type { EventoRastreio } from '@/api/types'
import { etapaAtingida, formatarCep, mascararCep, proximaEtapa, textoPrevisao } from '@/utils/logistica'

describe('utilitários de logística', () => {
  it('formata e mascara o CEP', () => {
    expect(formatarCep('30130010')).toBe('30130-010')
    expect(mascararCep('30130')).toBe('30130')
    expect(mascararCep('301300109')).toBe('30130-010')
    expect(mascararCep('30a13-0010')).toBe('30130-010')
  })

  it('sabe a próxima etapa e quais já passaram', () => {
    expect(proximaEtapa('AguardandoSeparacao')).toBe('EmSeparacao')
    expect(proximaEtapa('Entregue')).toBeNull()
    expect(etapaAtingida('EmTransito', 'Expedido')).toBe(true)
    expect(etapaAtingida('EmTransito', 'SaiuParaEntrega')).toBe(false)
  })

  it('escreve a previsão como o Mercado Livre', () => {
    const agora = new Date(2026, 9, 23, 10, 0) // sexta, 23/10
    expect(textoPrevisao(new Date(2026, 9, 23, 18).toISOString(), agora)).toBe('Chega hoje')
    expect(textoPrevisao(new Date(2026, 9, 24, 18).toISOString(), agora)).toBe('Chega amanhã')
    expect(textoPrevisao(new Date(2026, 9, 28, 18).toISOString(), agora)).toBe('Chega quarta-feira, 28 de outubro')
  })
})

describe('linha do tempo', () => {
  const eventos: EventoRastreio[] = [
    { data: '2026-10-23T12:00:00Z', status: 'AguardandoSeparacao', descricao: 'Pagamento aprovado.', local: 'São Paulo, SP', publico: true },
    { data: '2026-10-23T15:00:00Z', status: 'EmSeparacao', descricao: 'Estamos separando os seus produtos.', local: 'São Paulo, SP', publico: true },
  ]

  it('mostra o que aconteceu e, apagado, o que ainda falta', () => {
    const wrapper = mount(LinhaDoTempo, { props: { eventos, status: 'EmSeparacao' } })

    const feitos = wrapper.findAll('li.feito')
    expect(feitos).toHaveLength(2)
    expect(feitos[1].classes()).toContain('atual')
    expect(wrapper.findAll('li.pendente').map((l) => l.text())).toEqual([
      'Aguardando a transportadora',
      'A caminho',
      'Saiu para entrega',
      'Entregue',
    ])
  })
})
