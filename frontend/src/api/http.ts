const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Erro no formato ProblemDetails (application/problem+json) devolvido pelo backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly erros?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Query = Record<string, string | number | undefined | null>

function montarUrl(caminho: string, query?: Query): string {
  const params = new URLSearchParams()
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor))
  }
  const qs = params.toString()
  return `${baseUrl}${caminho}${qs ? `?${qs}` : ''}`
}

async function lerErro(resposta: Response): Promise<ApiError> {
  try {
    const problema = await resposta.json()
    const erros = problema.errors as Record<string, string[]> | undefined
    const detalhe = erros ? Object.values(erros).flat().join(' ') : undefined
    return new ApiError(
      resposta.status,
      problema.detail ?? detalhe ?? problema.title ?? 'Erro inesperado.',
      erros,
    )
  } catch {
    return new ApiError(resposta.status, `Erro ${resposta.status} ao chamar a API.`)
  }
}

export async function request<T>(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  caminho: string,
  opcoes: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    // O backend recusa POST/PUT/DELETE sem este cabeçalho (defesa contra CSRF).
    'X-Requested-With': 'fetch',
  }
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json'

  const resposta = await fetch(montarUrl(caminho, opcoes.query), {
    method: metodo,
    headers,
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    // A sessão é um cookie HttpOnly: o navegador envia sozinho e o JavaScript nunca o vê.
    credentials: 'include',
    signal: opcoes.signal,
  })

  if (!resposta.ok) throw await lerErro(resposta)
  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}
