const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarPreco(valor: number): string {
  return moeda.format(valor)
}

/** O backend guarda caminhos relativos (ex.: "imagens/ps4.webp") servidos pela pasta public/. */
export function urlImagem(caminho: string | null): string {
  if (!caminho) return '/imagens/carrinho-de-compras.png'
  if (/^(https?:)?\/\//.test(caminho) || caminho.startsWith('/')) return caminho
  return `/${caminho}`
}
