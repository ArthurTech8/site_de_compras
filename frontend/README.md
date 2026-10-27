# Site de compras - frontend

SPA em **Vue 3 + TypeScript** (Vite, Pinia, Vue Router) que consome a API do
[backend em .NET](https://github.com/ArthurTech8/Site_de_Compras_Backend).

## Como rodar

Requer Node 20+ e o backend rodando em `http://localhost:5285` (veja o README do backend).

```bash
npm install
npm run dev        # http://localhost:5173
```

Em desenvolvimento o Vite repassa `/api/*` para o backend, então não é preciso configurar CORS.
Para apontar para outro endereço, copie `.env.example` para `.env` e ajuste `VITE_API_PROXY`.

```bash
npm test           # testes (Vitest)
npm run build      # checagem de tipos + build de produção em dist/
```

Em produção, o ideal é servir `dist/` e a API no mesmo domínio (proxy reverso), porque a sessão
é um cookie `SameSite=Strict`. Se a API ficar em outro subdomínio do mesmo site, defina
`VITE_API_URL` no build e libere a origem em `Cors:Origens` no backend.

## Rodar com Docker

O `docker-compose.yml` na raiz do repositório sobe o site e a API juntos. O site é servido por nginx,
que repassa `/api` para o backend, igual ao proxy do Vite em desenvolvimento. Ele espera o backend
clonado ao lado deste repositório (`../Site_de_Compras_Backend`).

```bash
cp .env.docker.example .env   # preencha ADMIN_EMAIL e ADMIN_SENHA
docker compose up -d --build
```

O site fica em `http://localhost:8080`. O banco SQLite e as chaves das sessões ficam em volumes do
Docker, então sobrevivem a `docker compose down` (só `docker compose down -v` apaga tudo).

O cookie de sessão é `Secure` fora do modo desenvolvimento: o navegador aceita em `http://localhost`,
mas para abrir o site por outro endereço (IP da rede, domínio) é preciso HTTPS na frente.

## Estrutura

```
src/
  api/          Cliente HTTP (fetch + erros ProblemDetails) e um módulo por recurso da API
  stores/       Estado global com Pinia (carrinho, com o id no localStorage; sessão do usuário)
  composables/  Lógica reaproveitável (filtros de produto sincronizados com a URL)
  components/   Componentes de interface (cabeçalho, card de produto, paginação)
  views/        Páginas ligadas às rotas
  router/       Rotas (carregadas sob demanda)
  utils/        Formatação, alertas (SweetAlert2) e segurança (redirecionamento, força da senha)
public/imagens  Imagens dos produtos (o backend guarda o caminho relativo)
```

Para uma nova área (ex.: pedidos): crie `api/pedidos.ts`, os tipos em `api/types.ts`,
uma store se o estado for compartilhado, a view e a rota.

## Páginas

- `/` lista os produtos com busca, faixa de preço, ordenação e paginação. Os filtros ficam na URL
  (`/?busca=note&ordenacao=MaiorPreco`), então dá para compartilhar o link.
- `/carrinho` mostra os itens, permite alterar quantidade, remover, esvaziar e exibe o total.
  Erros de regra de negócio do backend (ex.: estoque insuficiente) aparecem na tela.
- `/checkout` pede o endereço de entrega (logado, dá para escolher um salvo ou salvar o novo) e mostra as formas de pagamento calculadas pelo backend sobre o total do carrinho:
  Pix com o maior desconto entre os produtos (5% a 15%, sem acumular), débito sem alteração e
  crédito de 6x a 16x com juros, exibindo o valor da parcela e a diferença para o total. O pagamento
  é simulado; a tela só envia a forma, as parcelas e o endereço, e os valores são recalculados no servidor.
- `/pedidos/:id` confirma o pedido (com confete, quando vem do checkout) e acompanha a entrega:
  previsão, código de rastreio, endereço e a linha do tempo do envio, atualizada a cada 20 segundos.
- `/pedidos` lista os pedidos da conta (pede login).
- `/rastreio/:codigo` é o rastreio aberto, sem login: só cidade de destino, previsão e eventos.
- `/admin/logistica` é o back-office da equipe (admin, operador do CD, entregador e atendimento):
  envios por etapa, despachos atrasados, fila com busca e filtros, histórico de cada envio e o botão
  que leva o envio para a próxima etapa. O atendimento só consulta.
- `/entrar` e `/cadastro` abrem a sessão. Quem já está logado é levado para a loja. Depois do login a
  tela volta para `?voltar=`, aceitando só caminhos do próprio site.

## Sessão e segurança

- A sessão é um cookie `HttpOnly` criado pelo backend. O frontend não guarda token, senha ou dados do
  usuário no `localStorage`: ao abrir o site ele pergunta a `/api/v1/conta` quem está logado.
- Toda chamada à API leva `credentials: 'include'` e o cabeçalho `X-Requested-With`, que o backend
  exige em `POST`/`PUT`/`DELETE` contra CSRF.
- Texto vindo da API só entra em HTML do SweetAlert2 depois de passar por `escapar()`.
- A força da senha na tela de cadastro é só uma dica; quem valida é o backend.
