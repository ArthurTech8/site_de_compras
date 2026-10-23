/**
 * Destino depois do login (?voltar=...). Só aceita caminhos deste site: "https://golpe.com",
 * "//golpe.com" e "/\\golpe.com" levariam o usuário para fora logo após digitar a senha
 * (open redirect, muito usado em phishing).
 */
export function destinoSeguro(valor: unknown, padrao = '/'): string {
  if (typeof valor !== 'string') return padrao
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return padrao
  if (/[\u0000-\u001f]/.test(valor)) return padrao
  return valor
}

export interface ForcaSenha {
  /** 0 a 4 */
  nivel: number
  rotulo: string
}

const rotulos = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

/**
 * Só uma dica visual enquanto a pessoa digita. Quem decide se a senha serve é o backend.
 * Tamanho pesa mais que variedade de caracteres, como recomenda o NIST.
 */
export function avaliarSenha(senha: string): ForcaSenha {
  if (!senha) return { nivel: 0, rotulo: '' }
  let pontos = 0
  if (senha.length >= 8) pontos++
  if (senha.length >= 12) pontos++
  if (senha.length >= 16) pontos++
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(senha)).length
  if (tipos >= 3) pontos++
  if (new Set(senha).size < 4 || senha.length < 8) pontos = 0
  const nivel = Math.min(pontos, 4)
  return { nivel, rotulo: rotulos[nivel] }
}
