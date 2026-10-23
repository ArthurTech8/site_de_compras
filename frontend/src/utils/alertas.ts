import Swal, { type SweetAlertOptions } from 'sweetalert2'

/**
 * Todos os alertas da loja passam por aqui, para manter o visual igual ao resto do site:
 * os botões usam as mesmas classes .botao do styles.css e o popup ganha a classe .alerta.
 */
const base = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusConfirm: true,
  customClass: {
    popup: 'alerta',
    confirmButton: 'botao',
    cancelButton: 'botao secundario',
    denyButton: 'botao secundario',
  },
})

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: 'toast-loja' },
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer)
    el.addEventListener('mouseleave', Swal.resumeTimer)
  },
})

/** Nomes vêm do backend: escapa antes de montar HTML. */
export function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

export function toastSucesso(titulo: string, opcoes: { texto?: string; imagem?: string } = {}) {
  const texto = opcoes.texto ? `<span>${escapar(opcoes.texto)}</span>` : ''
  const imagem = opcoes.imagem ? `<img src="${escapar(opcoes.imagem)}" alt="" />` : ''
  return toast.fire({
    icon: 'success',
    iconColor: 'var(--cor-sucesso)',
    title: titulo,
    html: texto || imagem ? `<div class="toast-produto">${imagem}${texto}</div>` : undefined,
  })
}

export function toastErro(titulo: string, texto?: string) {
  return toast.fire({
    icon: 'error',
    title: titulo,
    text: texto,
    customClass: { popup: 'toast-loja erro-toast' },
  })
}

export function alertaErro(titulo: string, texto?: string) {
  return base.fire({
    icon: 'error',
    iconColor: 'var(--cor-erro)',
    title: titulo,
    text: texto,
    confirmButtonText: 'Entendi',
    customClass: { popup: 'alerta perigo', confirmButton: 'botao' },
  })
}

/** Devolve true quando o usuário confirma. */
export async function confirmar(opcoes: {
  titulo: string
  texto?: string
  html?: string
  confirmar?: string
  cancelar?: string
  perigo?: boolean
  icone?: SweetAlertOptions['icon']
}): Promise<boolean> {
  const { isConfirmed } = await base.fire({
    icon: opcoes.icone ?? (opcoes.perigo ? 'warning' : 'question'),
    iconColor: opcoes.perigo ? 'var(--cor-destaque)' : 'var(--cor-primaria)',
    title: opcoes.titulo,
    text: opcoes.html ? undefined : opcoes.texto,
    html: opcoes.html,
    showCancelButton: true,
    confirmButtonText: opcoes.confirmar ?? 'Confirmar',
    cancelButtonText: opcoes.cancelar ?? 'Cancelar',
    // Só sobrescreve quando precisa: um customClass undefined apagaria o do mixin.
    ...(opcoes.perigo && {
      customClass: { popup: 'alerta perigo', confirmButton: 'botao destaque', cancelButton: 'botao secundario' },
    }),
  })
  return isConfirmed
}

/** Modal de "processando" sem botões; feche com fecharAlerta(). */
export function carregando(titulo: string, texto?: string) {
  void base.fire({
    title: titulo,
    text: texto,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  })
}

export function fecharAlerta() {
  Swal.close()
}
