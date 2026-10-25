import { request } from './http'
import type { Embalagem, Etiqueta, Expedicao, Inventario, Manifesto, Onda, OndaResumo, PosicaoEstoque, ResultadoOnda } from './types'

const base = '/api/v1/admin/logistica'

/**
 * Operação dentro do centro de distribuição. A equipe consulta; só o admin e o operador do CD
 * mexem (os outros recebem 403).
 */
export const centroApi = {
  // Estoque
  estoque: () => request<PosicaoEstoque[]>('GET', `${base}/estoque`),
  mover: (produtoId: number, local: string | null) =>
    request<PosicaoEstoque>('PUT', `${base}/estoque/${produtoId}/local`, { body: { local } }),
  inventariar: (produtoId: number, quantidadeContada: number) =>
    request<Inventario>('POST', `${base}/estoque/${produtoId}/inventario`, { body: { quantidadeContada } }),

  // Separação
  ondas: () => request<OndaResumo[]>('GET', `${base}/ondas`),
  gerarOnda: (envios: number) => request<Onda>('POST', `${base}/ondas`, { body: { envios } }),
  onda: (id: number) => request<Onda>('GET', `${base}/ondas/${id}`),
  biparNaOnda: (id: number, codigo: string) => request<ResultadoOnda>('POST', `${base}/ondas/${id}/bipar`, { body: { codigo } }),
  falta: (id: number, produtoId: number) => request<ResultadoOnda>('POST', `${base}/ondas/${id}/falta`, { body: { produtoId } }),
  concluirOnda: (id: number) => request<Onda>('POST', `${base}/ondas/${id}/concluir`),

  // Embalagem
  embalagem: (envioId: string) => request<Embalagem>('GET', `${base}/envios/${envioId}/embalagem`),
  conferir: (envioId: string, codigo: string) => request<Embalagem>('POST', `${base}/envios/${envioId}/conferir`, { body: { codigo } }),
  embalar: (envioId: string, caixa: string, pesoGramas: number) =>
    request<Embalagem>('POST', `${base}/envios/${envioId}/embalar`, { body: { caixa, pesoGramas } }),
  gerarEtiqueta: (envioId: string) => request<Etiqueta>('POST', `${base}/envios/${envioId}/etiqueta`),
  etiqueta: (envioId: string) => request<Etiqueta>('GET', `${base}/envios/${envioId}/etiqueta`),

  // Expedição
  expedicao: () => request<Expedicao>('GET', `${base}/manifestos`),
  abrirManifesto: () => request<Manifesto>('POST', `${base}/manifestos`),
  manifesto: (id: number) => request<Manifesto>('GET', `${base}/manifestos/${id}`),
  biparPacote: (id: number, codigo: string) => request<Manifesto>('POST', `${base}/manifestos/${id}/pacotes`, { body: { codigo } }),
  retirarPacote: (id: number, envioId: string) => request<Manifesto>('DELETE', `${base}/manifestos/${id}/pacotes/${envioId}`),
  fecharManifesto: (id: number) => request<Manifesto>('POST', `${base}/manifestos/${id}/fechar`),
  coletar: (id: number) => request<Manifesto>('POST', `${base}/manifestos/${id}/coletar`),
}
