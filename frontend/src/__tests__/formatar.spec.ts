import { describe, expect, it } from 'vitest'
import { formatarPreco, urlImagem } from '@/utils/formatar'

describe('formatação', () => {
  it('formata em reais', () => {
    expect(formatarPreco(2229.89).replace(/\s/g, ' ')).toBe('R$ 2.229,89')
  })

  it('resolve imagens relativas para a pasta public', () => {
    expect(urlImagem('imagens/ps4.webp')).toBe('/imagens/ps4.webp')
    expect(urlImagem('https://cdn.exemplo.com/a.webp')).toBe('https://cdn.exemplo.com/a.webp')
    expect(urlImagem(null)).toBe('/imagens/carrinho-de-compras.png')
  })
})
