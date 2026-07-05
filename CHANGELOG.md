# SovereignTrust — Changelog

---

## v1.2.0 — 5 July 2026

### Homepage & Messaging

- **Strengthened hero section** — headline rewritten to *"Protect What Matters Most With Your Own Private Trust"*; subtext now clearly explains what the platform is, who it is for, and how Leela helps
- **New "Why Sovereign Trust" section** — 6-card grid added below the hero answering the key visitor questions: What it is, Why it exists, Who it's for, What problem it solves, What makes it different, Why you can trust it — expanded to 8 cards to fill the layout (Plain English, Always & One Clear Price)
- **Improved disclaimer** — rewritten into two clear paragraphs per team feedback: what the platform does, followed by the professional advice referral sentence
- **Improved call to action** — "Begin Your Trust" updated to **"Begin Your Sovereign Trust →"** throughout the site
- **"What's Included" grid filled** — added Auto-Save Draft and Instant Download cards to complete the 8-card grid

### Leela AI — Conversational Onboarding

- **New conversational pre-step added to the Trust Builder** — when starting a new trust, Leela now introduces herself and asks three questions before the form opens:
  1. *What are you hoping to protect?*
  2. *Who would you like your trust to benefit?*
  3. *What kind of assets are you planning to place into the trust?*
- Leela delivers a personalised trust structure recommendation based on answers
- Answers are used to **intelligently pre-fill the Trust Purpose field** in the builder
- Pre-filled field is highlighted in gold and scrolled into view so it is immediately visible
- A **Skip** link is available for returning users; onboarding is bypassed automatically when editing an existing trust

### Dashboard

- **Loading state** — animated spinner now displayed to the right of "Loading your trust profiles…" text while trusts are being fetched from the API
- **Additional Coming Soon modules** — Deed of Variation and Beneficiary Notification cards added to fill the locked modules grid

### Downloads

- **DOCX download added** — the downloads page now shows both a PDF card and a Word document (DOCX) card
- **`docx` npm package integrated** — proper DOCX generation implemented server-side using the `docx` library; the document mirrors the PDF in structure with all 7 sections (Trust Identification, Purpose, Settlor, Trustees, Beneficiaries, Protector, Execution)
- **API updated** — `/api/trust-document` now accepts a `format=docx` query parameter and responds with the correct `Content-Type` and file extension; defaults to PDF

### Version

- Version badge `v1.2.0` added to all pages

---

## v1.1.0 — 3–4 July 2026

### Leela AI Integration

- **Leela AI assistant wired to Web6 API** — real AI responses powered by the OASIS Web6 backend
- Fixed JWT forwarding: user session token now passed to Web6 API on every Leela request
- Fixed Web6 API key injection via custom `fetchImpl` interceptor
- Resolved token bleed: Web6 client now created per-request rather than shared
- Fixed 401 auth errors by aligning header format with Web6 expectations

### Trust Save & Load

- Fixed trust save always creating a new document instead of updating the existing one
- Simplified save flow: removed load-before-update workaround that caused duplicate records
- Fixed OASIS `loadHolon` call: switched to direct POST with `LoadChildren: false` for reliable data retrieval

### Payment & Document Generation

- Fixed downloads page showing "unpaid" status after successful Stripe checkout — trust status now updated locally after payment verified
- Added Stripe `session_id` fallback verification in `trust-document` API for cases where OASIS status is stale
- Fixed PDF download: `loadHolon` response now correctly parsed to extract `metaData.trustData`

### General

- WIP notice banner added to homepage
- Debug logging added and subsequently cleaned up across `trust-save`, `trust-document`, and `karma-award` APIs

---

*Changelog maintained by the SovereignTrust development team.*
