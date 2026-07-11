# Portal Porto de Galinhas

Portal web para divulgacao de turismo, hoteis, restaurantes, passeios e comercios
de Porto de Galinhas (PE). Comerciantes podem cadastrar seus negocios (com
periodo de degustacao gratuita) e assinar planos pagos via Mercado Pago para
manter seus anuncios visiveis. Turistas podem navegar por categorias, visualizar
comerciantes/anuncios e assinar um plano Turista com beneficios exclusivos.

## Estrutura do Projeto

```
portal-porto-galinhas/
├── backend/            # API Node.js + Express + SQLite (node:sqlite nativo)
│   ├── src/
│   │   ├── server.js        # entrypoint da API
│   │   ├── db/               # conexao, migrations e seed do SQLite
│   │   ├── routes/           # categorias, comerciantes, anuncios, pagamentos
│   │   ├── middleware/        # autenticacao JWT e upload (multer)
│   │   └── utils/            # regras de planos e status de degustacao
│   ├── data/                 # arquivo portal.db (SQLite, gerado em runtime)
│   ├── package.json
│   └── .env.example
├── frontend/            # site estatico (HTML + CSS + JS puro, sem build step)
│   ├── index.html            # Home
│   ├── pages/                 # demais paginas (painel, comerciante, planos, legais...)
│   ├── css/styles.css
│   ├── js/                   # config, i18n, layout (header/footer), logica por pagina
│   ├── i18n/                 # pt.json, en.json, es.json, fr.json
│   └── serve.js               # servidor estatico simples para dev local
├── assets/               # SVGs de logo/icones/ilustracoes + uploads de fotos dos anuncios
│   ├── icons/
│   ├── img/
│   └── uploads/               # fotos enviadas pelos comerciantes (gerado em runtime)
└── docs/
    └── README.md (este arquivo)
```

## Requisitos

- Node.js **>= 22.5** (o backend usa o modulo nativo `node:sqlite`, disponivel
  de forma estavel a partir do Node 22.5+; testado com Node 24).
- Nao ha dependencia de compiladores nativos (Python/MSVC) -- **nao usamos**
  `better-sqlite3` ou `sqlite3` para evitar problemas de build em Windows.

## Como rodar localmente

### 1. Backend (API)

```bash
cd backend
npm install
copy .env.example .env      # (Windows) ou: cp .env.example .env (Linux/Mac)
npm run seed                 # cria o banco SQLite e popula com dados de exemplo
npm start                    # inicia a API em http://localhost:3000
```

Edite o arquivo `.env` para configurar:
- `MP_ACCESS_TOKEN`: seu Access Token de **sandbox** do Mercado Pago
  (obtenha em https://www.mercadopago.com.br/developers/panel/app). Enquanto
  nao configurado com um token real, a rota de checkout retorna um
  **checkout simulado** (util para testes locais sem conta no Mercado Pago).
- `JWT_SECRET`: troque por um segredo forte antes de ir para producao.
- `FRONTEND_URL` / `BACKEND_URL`: usados para montar as URLs de retorno do
  Mercado Pago (`back_urls`) e o `notification_url` do webhook.

### 2. Frontend (site estatico)

Em outro terminal:

```bash
cd frontend
node serve.js                 # inicia em http://localhost:5500
```

Abra `http://localhost:5500` no navegador. O frontend consome a API em
`http://localhost:3000` (configuravel em `frontend/js/config.js`).

> O frontend nao possui build step (HTML/CSS/JS puro), entao qualquer
> servidor estatico funciona (Live Server do VS Code, `npx serve`, etc.),
> desde que a pasta `assets/` (irma de `frontend/`) tambem seja acessivel em
> `/assets/*`. O `serve.js` incluso ja resolve isso automaticamente.

## Contas de teste (apos rodar `npm run seed`)

Senha para todas: `senha123`

| E-mail | Status |
|---|---|
| contato@recifemar.com.br | Ativo (plano premium) |
| contato@buggytourporto.com.br | Em degustacao gratuita |
| contato@sabordomar.com.br | Expirado (fora do periodo de degustacao) |

## Principais rotas da API

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/health` | Healthcheck |
| GET | `/api/categorias` | Lista categorias |
| POST/PUT/DELETE | `/api/categorias/:id` | CRUD de categorias |
| POST | `/api/comerciantes/cadastro` | Cadastro de comerciante (inicia degustacao) |
| POST | `/api/comerciantes/login` | Login (retorna JWT) |
| GET | `/api/comerciantes/me` | Dados do comerciante autenticado + tempo de degustacao |
| GET | `/api/comerciantes/:id` | Dados publicos de um comerciante |
| GET | `/api/anuncios` | Lista publica de anuncios (respeita status do comerciante) |
| GET | `/api/anuncios/comerciante/:id` | Anuncios de um comerciante (pagina publica) |
| GET | `/api/anuncios/meus/lista` | Anuncios do comerciante logado (painel) |
| POST/PUT | `/api/anuncios` | Cria/edita anuncio (multipart, campo `fotos`) |
| GET | `/api/pagamentos/planos` | Lista planos e valores |
| POST | `/api/pagamentos/checkout` | Cria preferencia de pagamento (Mercado Pago Checkout Pro) |
| POST | `/api/pagamentos/webhook` | Recebe notificacoes do Mercado Pago |
| POST | `/api/pagamentos/simular-aprovacao` | Aprova um pagamento manualmente (uso local/teste) |

## Regras de negocio

- Todo comerciante recebe **5 dias** (`DIAS_DEGUSTACAO` no `.env`) de
  degustacao gratuita a partir do cadastro.
- Apos o periodo, se nao houver pagamento aprovado, o status muda
  automaticamente para `expirado` e os anuncios deixam de aparecer nas
  listagens publicas (mas o comerciante ainda pode logar no painel para
  renovar o plano).
- Ao aprovar um pagamento (via webhook real ou via
  `/api/pagamentos/simular-aprovacao`), o comerciante e ativado por 30 dias
  (`status = ativo`, `plano` atualizado, `data_expiracao` definida).

## Deploy (Vercel / Netlify)

- **Frontend**: aponte o "Publish/Build directory" para a pasta `frontend/`.
  Como e site 100% estatico (sem bundler), nenhum comando de build e
  necessario. Ajuste `frontend/js/config.js` (`API_BASE_URL`) para a URL do
  backend em producao.
- **Assets**: publique a pasta `assets/` tambem, ou configure o backend para
  servir `/assets/*` (ja implementado em `backend/src/server.js` via
  `express.static`) e aponte o frontend para consumir os assets a partir do
  backend em producao.
- **Backend**: pode ser publicado como Serverless Function (Vercel) ou
  Node App (Netlify Functions / Render / Railway). Configure as variaveis de
  ambiente do `.env.example` no painel do provedor. Atencao: o SQLite baseado
  em arquivo (`node:sqlite`) exige um filesystem persistente -- em ambientes
  serverless efemeros, considere migrar para um banco gerenciado (Postgres,
  Turso, etc.) antes de escalar em producao.

## Integracao com Mercado Pago

A integracao usa o SDK oficial `mercadopago` (Node) com Checkout Pro:
1. `POST /api/pagamentos/checkout` cria uma `Preference` com os dados do
   plano escolhido e retorna a `init_point` (URL de checkout hospedada pelo
   Mercado Pago).
2. O usuario e redirecionado, paga, e volta para uma das paginas
   `frontend/pages/pagamento-{sucesso,pendente,erro}.html` (`back_urls`).
3. O Mercado Pago tambem notifica o backend via `notification_url`
   (`POST /api/pagamentos/webhook`), que consulta o pagamento pela API do MP
   e ativa o comerciante quando `status == approved`.
4. **Sem token configurado**: o endpoint de checkout retorna um payload
   `simulado: true` para permitir testar todo o fluxo (inclusive o endpoint
   auxiliar `/api/pagamentos/simular-aprovacao`) sem depender de credenciais
   reais do Mercado Pago.

## Internacionalizacao (i18n)

Os textos da interface estao em `frontend/i18n/{pt,en,es,fr}.json`. O menu
superior possui um seletor de idioma que troca os textos em tempo real (via
`data-i18n="chave.aninhada"` nos elementos HTML), sem reload de pagina.
