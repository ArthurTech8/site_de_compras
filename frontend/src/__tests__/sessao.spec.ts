import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import EntrarView from '@/views/EntrarView.vue'
import { useSessaoStore } from '@/stores/sessao'
import type { Usuario } from '@/api/types'

vi.mock('@/utils/alertas', () => ({ toastSucesso: vi.fn() }))

const maria: Usuario = { id: 'u1', nome: 'Maria Silva', email: 'maria@exemplo.com', papel: 'Cliente' }

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('sessão', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('sem cookie de sessão, fica deslogado sem erro', async () => {
    fetchMock.mockResolvedValueOnce(resposta(401, { title: 'Unauthorized', status: 401 }))
    const sessao = useSessaoStore()

    await sessao.carregar()

    expect(sessao.logado).toBe(false)
    expect(sessao.verificada).toBe(true)
  })

  it('envia o cookie e o cabeçalho anti-CSRF, sem guardar nada no localStorage', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, maria))
    const sessao = useSessaoStore()

    await sessao.entrar('maria@exemplo.com', 'Cafe-com-pao')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/auth/login')
    expect(init?.credentials).toBe('include')
    expect((init?.headers as Record<string, string>)['X-Requested-With']).toBe('fetch')
    expect(sessao.primeiroNome).toBe('Maria')
    expect(JSON.stringify({ ...localStorage })).not.toContain('Cafe-com-pao')
  })

  async function montarEntrar(voltar: string) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'produtos', component: { template: '<p>loja</p>' } },
        { path: '/checkout', name: 'checkout', component: { template: '<p>checkout</p>' } },
        { path: '/entrar', name: 'entrar', component: EntrarView },
        { path: '/cadastro', name: 'cadastro', component: { template: '<p>cadastro</p>' } },
      ],
    })
    await router.push({ path: '/entrar', query: { voltar } })
    const wrapper = mount(EntrarView, { global: { plugins: [router] } })
    await wrapper.find('#login-email').setValue('maria@exemplo.com')
    await wrapper.find('#login-senha').setValue('Cafe-com-pao')
    return { wrapper, router }
  }

  it('depois de entrar volta para a página pedida', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, maria))
    const { wrapper, router } = await montarEntrar('/checkout')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/checkout')
  })

  it('não redireciona para outro site depois do login', async () => {
    fetchMock.mockResolvedValueOnce(resposta(200, maria))
    const { wrapper, router } = await montarEntrar('//golpe.com/login')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('mostra a mensagem do backend quando o login é recusado', async () => {
    fetchMock.mockResolvedValueOnce(
      resposta(401, { status: 401, title: 'Não foi possível entrar', detail: 'E-mail ou senha inválidos.' }),
    )
    const { wrapper } = await montarEntrar('/')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="erro-login"]').text()).toBe('E-mail ou senha inválidos.')
  })
})
