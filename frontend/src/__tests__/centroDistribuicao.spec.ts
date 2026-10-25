import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CampoBipagem from '@/components/CampoBipagem.vue'
import { largurasCode128, simbolosCode128 } from '@/utils/codigoBarras'
import { acaoNoCentro, formatarPeso, numeroPedido } from '@/utils/logistica'

describe('código de barras Code 128', () => {
  it('calcula o dígito verificador do conjunto B', () => {
    // Exemplo clássico: "Wikipedia" termina com o verificador 88.
    const simbolos = simbolosCode128('Wikipedia')
    expect(simbolos[0]).toBe(104)
    expect(simbolos[simbolos.length - 1]).toBe(88)
    expect(simbolos).toHaveLength(11)
  })

  it('cada símbolo soma 11 módulos e a parada 13', () => {
    const larguras = largurasCode128('SC123456789BR')
    const total = larguras.reduce((a, b) => a + b, 0)
    expect(total).toBe((13 + 2) * 11 + 13)
  })

  it('recusa caractere fora do conjunto B', () => {
    expect(() => simbolosCode128('Ação')).toThrow()
  })
})

describe('centro de distribuição', () => {
  it('leva cada etapa do CD para a tela certa', () => {
    expect(acaoNoCentro({ id: 'e1', status: 'AguardandoSeparacao' })?.rotulo).toBe('Separação')
    expect(acaoNoCentro({ id: 'e1', status: 'Embalado' })?.rota).toEqual({ name: 'logistica-embalagem', params: { envioId: 'e1' } })
    expect(acaoNoCentro({ id: 'e1', status: 'ProntoParaEnvio' })?.rotulo).toBe('Expedição')
    expect(acaoNoCentro({ id: 'e1', status: 'Expedido' })).toBeNull()
  })

  it('formata número do pedido e peso', () => {
    expect(numeroPedido('1f126056-aaaa-bbbb')).toBe('1F126056')
    expect(formatarPeso(420)).toBe('420 g')
    expect(formatarPeso(1180)).toBe('1,18 kg')
  })

  it('o campo de bipagem envia o código aparado e se limpa', async () => {
    const wrapper = mount(CampoBipagem, { props: { rotulo: 'Bipe' } })
    const input = wrapper.get('[data-testid="bipagem"]')
    await input.setValue('  CEL-0003 ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('bipar')).toEqual([['CEL-0003']])
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('não envia quando está desabilitado', async () => {
    const wrapper = mount(CampoBipagem, { props: { rotulo: 'Bipe', desabilitado: true } })
    await wrapper.get('[data-testid="bipagem"]').setValue('X')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('bipar')).toBeUndefined()
  })
})
