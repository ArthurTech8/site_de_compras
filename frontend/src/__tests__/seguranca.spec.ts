import { describe, expect, it } from 'vitest'
import { avaliarSenha, destinoSeguro } from '@/utils/seguranca'

describe('destinoSeguro', () => {
  it('aceita caminhos do próprio site', () => {
    expect(destinoSeguro('/checkout')).toBe('/checkout')
    expect(destinoSeguro('/pedidos/abc?x=1')).toBe('/pedidos/abc?x=1')
  })

  it.each(['https://golpe.com', '//golpe.com', '/\\golpe.com', 'javascript:alert(1)', 'checkout', '/a\nb', undefined, ['/x']])(
    'recusa %s',
    (valor) => {
      expect(destinoSeguro(valor)).toBe('/')
    },
  )
})

describe('avaliarSenha', () => {
  it('dá mais pontos para senhas longas', () => {
    expect(avaliarSenha('abc').nivel).toBe(0)
    expect(avaliarSenha('aaaaaaaaaaaa').nivel).toBe(0)
    expect(avaliarSenha('cafezinho').nivel).toBe(1)
    expect(avaliarSenha('cafe com pao de queijo').nivel).toBeGreaterThanOrEqual(3)
  })
})
