import { request } from './http'
import type { RastreioPublico } from './types'

export const rastreioApi = {
  /** Aberto, sem login. 404 quando o código não existe. */
  obter: (codigo: string) => request<RastreioPublico>('GET', `/api/v1/rastreio/${encodeURIComponent(codigo.trim())}`),
}
