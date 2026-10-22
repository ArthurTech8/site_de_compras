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

Em produção, sirva `dist/` e defina `VITE_API_URL` no build se a API estiver em outro domínio
(e libere esse domínio em `Cors:Origens` no backend).

## Estrutura

```
src/
  api/          Cliente HTTP (fetch + erros ProblemDetails) e um módulo por recurso da API
  stores/       Estado global com Pinia (carrinho; o id fica no localStorage)
  composables/  Lógica reaproveitável (filtros de produto sincronizados com a URL)
  components/   Componentes de interface (cabeçalho, card de produto, paginação)
  views/        Páginas ligadas às rotas
  router/       Rotas (carregadas sob demanda)
  utils/        Formatação de preço e de imagem
public/imagens  Imagens dos produtos (o backend guarda o caminho relativo)
```

Para uma nova área (ex.: pedidos): crie `api/pedidos.ts`, os tipos em `api/types.ts`,
uma store se o estado for compartilhado, a view e a rota.

## Páginas

- `/` lista os produtos com busca, faixa de preço, ordenação e paginação. Os filtros ficam na URL
  (`/?busca=note&ordenacao=MaiorPreco`), então dá para compartilhar o link.
- `/carrinho` mostra os itens, permite alterar quantidade, remover, esvaziar e exibe o total.
  Erros de regra de negócio do backend (ex.: estoque insuficiente) aparecem na tela.
