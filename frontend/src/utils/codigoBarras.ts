// Code 128 (conjunto B), o código de barras das etiquetas dos Correios e das transportadoras.
// Cada símbolo são 3 barras e 3 espaços; os números são as larguras, em módulos.
const PADROES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
]
const INICIO_B = 104
const PARADA = '2331112'

/** Valores dos símbolos: início, dados, dígito verificador. Só aceita ASCII imprimível. */
export function simbolosCode128(texto: string): number[] {
  const dados = [...texto].map((c) => {
    const codigo = c.charCodeAt(0)
    if (codigo < 32 || codigo > 126) throw new Error(`Caractere fora do Code 128 B: "${c}"`)
    return codigo - 32
  })
  const verificador = dados.reduce((soma, v, i) => soma + v * (i + 1), INICIO_B) % 103
  return [INICIO_B, ...dados, verificador]
}

/** Larguras alternando barra e espaço, começando por barra e terminando na parada. */
export function largurasCode128(texto: string): number[] {
  const padroes = [...simbolosCode128(texto).map((v) => PADROES[v]), PARADA]
  return padroes.join('').split('').map(Number)
}
