# Privacy — Mel Maia (integração WayMB)

Landing page com integração ao gateway **WayMB** (MB WAY + Multibanco), pronta para deploy no **Vercel**.

## Estrutura

```
.
├── index.html              # Landing page (PT-PT)
├── obrigado.html           # Página de sucesso
├── api/
│   ├── create-payment.js   # POST  /api/create-payment    → cria transação
│   ├── payment-status.js   # GET   /api/payment-status?id → consulta status
│   └── webhook.js          # POST  /api/webhook           → callback WayMB
├── vercel.json
├── package.json
├── .env.example
├── .gitignore
└── (imagens, vídeo, logo)
```

## Deploy passo-a-passo

### 1. Criar repositório Git

```bash
cd "<esta pasta>"
git init
git add .
git commit -m "Privacy Mel Maia + WayMB"
git branch -M main
git remote add origin https://github.com/<utilizador>/<repo>.git
git push -u origin main
```

### 2. Importar no Vercel

1. Aceder a https://vercel.com/new
2. **Import Git Repository** → escolher o repo
3. Preset: **Other** (Vercel deteta automaticamente as funções em `/api`)
4. Não é necessário configurar build commands. Clicar **Deploy**

### 3. Configurar variáveis de ambiente

No painel Vercel → **Project Settings → Environment Variables**, adicionar:

| Nome | Valor | Obrigatório |
|---|---|---|
| `WAYMB_CLIENT_ID` | (do painel WayMB > API) | ✅ |
| `WAYMB_CLIENT_SECRET` | (do painel WayMB > API) | ✅ |
| `WAYMB_ACCOUNT_EMAIL` | E-mail da conta WayMB onde o dinheiro entra | ✅ |
| `WAYMB_BASE_URL` | `https://api.waymb.com` | opcional |
| `CALLBACK_URL` | `https://<teu-dominio>.vercel.app/api/webhook` | recomendado |
| `SUCCESS_URL` | URL absoluta da página de obrigado | opcional |
| `FAILED_URL` | URL absoluta para falhas | opcional |

⚠️ Após adicionar/alterar variáveis: **Deployments → Redeploy** (sem cache).

### 4. Obter credenciais WayMB

1. Login em https://waymb.com/
2. Painel → **API** (ou Developers / Integrations)
3. Copiar `Client ID` e `Client Secret`
4. Confirmar o `account_email` no perfil da conta

### 5. Testar

1. Abrir o URL Vercel produzido (ex: `https://<projeto>.vercel.app`)
2. Clicar num plano → preencher formulário com dados reais → escolher MB WAY
3. Confirmar no telemóvel
4. A página deve mostrar **"Pagamento confirmado"** e redirecionar para `/obrigado.html`

## Fluxo técnico

```
Browser                            Vercel /api               WayMB
  │  clique no botão de plano       │                          │
  │ ──────────────────────────────▶ │                          │
  │  formulário: nome, email,       │                          │
  │  NIF, telemóvel, método         │                          │
  │                                 │                          │
  │  POST /api/create-payment       │                          │
  │ ──────────────────────────────▶ │  POST /transactions/create
  │                                 │ ──────────────────────▶ │
  │                                 │ ◀────────────────────── │
  │                                 │   { id, referenceData,  │
  │                                 │     generatedMBway, … } │
  │ ◀────────────────────────────── │                          │
  │                                 │                          │
  │  GET /api/payment-status?id=X   │                          │
  │ ──────────────────────────────▶ │  POST /transactions/info │
  │     (a cada 3s)                 │ ──────────────────────▶ │
  │ ◀────────────────────────────── │ ◀────────────────────── │
  │                                 │                          │
  │                              (em paralelo, WayMB envia)    │
  │                                 │ ◀────────────────────── │
  │                                 │   POST /api/webhook      │
  │                                 │   { status: COMPLETED }  │
  │  status === COMPLETED           │                          │
  │  → redirect /obrigado.html      │                          │
```

## Preços (alterar em 2 sítios sincronizados)

- `index.html` (UI): linhas com `<span class="price">…</span>`
- `api/create-payment.js`: objeto `PLAN_PRICES`

## Métodos de pagamento

A WayMB aceita `mbway` e `multibanco` (apenas EUR). O selector está visível no formulário; para ocultar um método, esconde o botão correspondente em `.method-selector`.

## Webhook

A função `/api/webhook` regista no log do Vercel cada notificação recebida (Vercel Dashboard → **Logs**). Adiciona aí a tua lógica de pós-pagamento (envio de email, libertação de acesso, sincronização com CRM, etc.).

⚠️ Quando a WayMB documentar como assina os webhooks, validar o campo `signature` antes de processar — o ficheiro tem um `TODO` marcado.

## Local dev (opcional)

```bash
npm i -g vercel
vercel dev
```

Cria um `.env` baseado em `.env.example` com as credenciais de sandbox/teste.

## Segurança

- `client_secret` **só** é usado no backend (variáveis de ambiente).
- Nada de credenciais é devolvido ao browser.
- O `.gitignore` impede commit acidental de `.env`.
- Headers de segurança definidos em `vercel.json`.
