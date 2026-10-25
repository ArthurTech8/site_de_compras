import { request } from './http'
import type { Envio, EnvioFiltro, EnvioResumo, PagedResult, PainelLogistica } from './types'

const base = '/api/v1/admin/logistica'

/** Back-office: só para a equipe da loja (admin, operador do CD, entregador e atendimento). */
export const logisticaApi = {
  painel: () => request<PainelLogistica>('GET', `${base}/painel`),
  envios: (filtro: EnvioFiltro = {}, signal?: AbortSignal) =>
    request<PagedResult<EnvioResumo>>('GET', `${base}/envios`, {
      query: { ...filtro, atrasados: filtro.atrasados ? 'true' : undefined },
      signal,
    }),
  envio: (id: string) => request<Envio>('GET', `${base}/envios/${id}`),
  /** Leva o envio para a próxima etapa. O atendimento não tem permissão (403). */
  avancar: (id: string) => request<Envio>('POST', `${base}/envios/${id}/avancar`),
}
