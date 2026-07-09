# SovereignTrust

Private trusts have long been a tool available only to the wealthy — requiring expensive solicitors, opaque processes, and weeks of back-and-forth. SovereignTrust changes that.

SovereignTrust is a guided web platform that allows everyday people — with no legal background — to create their own express private trust documentation in a single session. It walks users through every concept and field in plain English, powered by **Leela**, an AI assistant built on the OASIS WEB6 API, so users understand what they're creating rather than just what they're signing.

Users can safeguard assets, provide for loved ones, define their legacy, and download a completed trust deed as a PDF or Word document — all without a solicitor appointment. Documents are stored securely against the user's OASIS avatar and are never shared or monetised.

> Educational and administrative document preparation only. Does not constitute legal, tax, or financial advice.

Built on the [OASIS WEB4 API](https://github.com/NextGenSoftwareUK/OASIS) for avatar authentication, holon data storage, and karma rewards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hosting | Vercel (Hobby — max 12 serverless functions) |
| Auth & Data | OASIS WEB4 API (`@oasisomniverse/web4-api`) |
| AI Assistant | OASIS WEB6 API — Leela (`@oasisomniverse/web6-api`) |
| Payments | Stripe |
| Documents | `pdf-lib` (PDF), `docx` (Word) |
| Frontend | Vanilla JS / HTML / CSS — no framework |

---

## Project Structure

```
/
├── api/                    # Vercel serverless functions
│   ├── _oasis.js           # Shared OASIS client helper (not a function)
│   ├── auth-login.js       # POST /api/auth-login
│   ├── auth-register.js    # POST /api/auth-register
│   ├── auth-refresh.js     # POST /api/auth-refresh
│   ├── auth-password.js    # POST /api/auth-password (forgot + reset)
│   ├── trust-save.js       # POST /api/trust-save
│   ├── trust-list.js       # GET  /api/trust-list
│   ├── trust-delete.js     # POST /api/trust-delete
│   ├── trust-document.js   # GET  /api/trust-document (PDF/DOCX download)
│   ├── checkout-session.js # POST /api/checkout-session (Stripe)
│   ├── checkout-status.js  # GET  /api/checkout-status (Stripe)
│   ├── karma-award.js      # POST /api/karma-award
│   └── leela-chat.js       # POST /api/leela-chat
├── css/
│   └── main.css
├── js/
│   ├── auth.js             # Session management, JWT refresh, route guards
│   ├── trust-api.js        # Authenticated fetch wrapper + trust/karma helpers
│   └── leela.js            # Leela AI chat widget
├── config/
│   └── leela.js            # Leela feature flags (FAHRN, Holonic BRAID)
├── img/
├── index.html              # Marketing / landing page
├── login.html
├── register.html
├── forgot-password.html
├── reset-password.html
├── dashboard.html          # User's trust list
├── builder.html            # Trust document builder
├── checkout.html           # Stripe payment flow
├── downloads.html          # Download completed trust documents
├── education.html
├── demo.html
└── preview.html
```

---

## API Routes

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth-login` | Sign in with email + password. Returns JWT session. |
| POST | `/api/auth-register` | Create a new OASIS avatar account. |
| POST | `/api/auth-refresh` | Exchange a refresh token for a new JWT. |
| POST | `/api/auth-password` | Forgot password (`action: "forgot"`) or reset password (`action: "reset"`). |

### Trusts

| Method | Route | Description |
|---|---|---|
| POST | `/api/trust-save` | Create or update a trust (stored as an OASIS Holon). |
| GET | `/api/trust-list` | List all trusts for an avatar, or fetch a single trust by `id`. |
| POST | `/api/trust-delete` | Delete a trust by `id`. |
| GET | `/api/trust-document` | Generate and download a trust deed as PDF or DOCX. |

### Payments

| Method | Route | Description |
|---|---|---|
| POST | `/api/checkout-session` | Create a Stripe checkout session for a trust. |
| GET | `/api/checkout-status` | Check the status of a Stripe checkout session. |

### Other

| Method | Route | Description |
|---|---|---|
| POST | `/api/karma-award` | Award OASIS karma to an avatar for a completed action. |
| POST | `/api/leela-chat` | Send a message to the Leela AI assistant. |

---

## Authentication Flow

Session tokens are stored in `localStorage` under the key `st_session`. The `js/auth.js` module handles:

- **`requireAuth()`** — redirects to `/login.html` if no session exists. Call in `<head>` of protected pages.
- **`redirectIfAuthed()`** — redirects to `/dashboard.html` if already signed in. Call in `<head>` of login/register pages.
- **`ensureFreshToken()`** — decodes the JWT expiry client-side and proactively refreshes if expired or within 60 seconds of expiry. Called automatically by `trustApiFetch`.
- **`authLogout()`** — clears session and redirects to home.

All authenticated API calls go through `trustApiFetch()` in `js/trust-api.js`, which attaches the Bearer token and handles logout on hard 401s.

### Password Reset Flow

1. User submits email on `/forgot-password.html` → `POST /api/auth-password` (`action: "forgot"`)
2. OASIS sends a reset email with a link to `/reset-password.html?token=...`
3. User submits new password → `POST /api/auth-password` (`action: "reset"`)
4. On success, user is redirected to `/login.html`

---

## Setup

### Prerequisites

- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- A Stripe account
- Access to the OASIS WEB4 API

### Local Development

```bash
npm install
cp .env.example .env.local
# Fill in STRIPE_SECRET_KEY in .env.local
vercel dev
```

The app runs on `http://localhost:3000` by default.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OASIS_API_URL` | No | OASIS WEB4 API base URL. Defaults to `https://api.web4.oasisomniverse.one` |
| `WEB6_API_URL` | No | OASIS WEB6 API base URL. Defaults to `https://api.web6.oasisomniverse.one` |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...` for dev, `sk_live_...` for prod) |
| `LEELA_USE_FAHRN` | No | Enable FAHRN reasoning network for Leela. Defaults to `true`. |
| `LEELA_USE_HOLONIC_BRAID` | No | Enable Holonic BRAID context for Leela. Defaults to `true`. |

### Deployment

```bash
vercel --prod
```

Set environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

> **Note:** The Vercel Hobby plan supports a maximum of 12 serverless functions. The project is currently at the limit — upgrade to Pro if additional API routes are needed.

---

## Powered By

Built on the [OASIS Omniverse](https://oasisomniverse.one) — the world's first true open decentralised distributed internet (WEB4/5/6+), Non-Fungible Distributed Operating System (NFDOS), and Smart Contract between Humanity and the Earth.
