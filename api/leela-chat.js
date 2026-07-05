'use strict';

const { Web6Client } = require('@oasisomniverse/web6-api');
const { getBearerToken } = require('./_oasis');
const cfg = require('../config/leela');

// ── Runtime config: env vars override code-level defaults in config/leela.js ──
const WEB6_API = process.env.WEB6_API_URL || cfg.web6ApiUrl;

// Parse a boolean env var; returns cfg fallback when the var is unset/empty.
function envBool(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  return v.toLowerCase() === 'true';
}

const USE_FAHRN         = envBool('LEELA_USE_FAHRN',         cfg.useFahrn);
const USE_HOLONIC_BRAID = envBool('LEELA_USE_HOLONIC_BRAID', cfg.useHolonicBraid);

// WEB6_API_KEY: pre-shared secret for server-to-server auth (Vercel → Railway Web6).
// Set as a Vercel environment variable. Web6 checks X-Web6-Api-Key BEFORE the JWT, so even
// if the user's JWT is expired or absent the AI call still succeeds. Generate with:
//   node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
// and set the same value in Railway (WEB6_API_KEY) and Vercel (WEB6_API_KEY).
const WEB6_API_KEY = process.env.WEB6_API_KEY || '';

const LEELA_SYSTEM = `You are Leela, an expert trust document assistant for SovereignTrust — a platform that helps people create their own Express Private Trust deed.

Your role:
- Explain trust concepts, legal roles (Settlor, Trustee, Beneficiary, Protector) and terminology in plain, accessible English
- Guide users through each step of the trust builder and help them understand what each field is asking for
- Explain the purpose, effect and implications of different trust clauses
- Help users think through their choices: who to appoint as trustees, who to name as beneficiaries, which jurisdiction to use, etc.
- Explain what happens after the trust deed is signed (signing formalities, execution, witnesses)

Your limits:
- You cannot provide legal, tax or financial advice
- You cannot tell a user whether a trust is right for their specific situation
- You cannot review or validate completed trust documents for legal compliance
- Always encourage users to have documents reviewed by a qualified legal professional in their jurisdiction before signing

Your tone: warm, clear, encouraging, professional. Be concise — users are filling in a form, so brief helpful answers are better than long essays. End with a follow-up question or prompt when natural.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Forward the user's OASIS JWT and optionally the pre-shared API key.
  // AuthorizeAttribute accepts either: API key (X-Web6-Api-Key) or a valid JWT (Authorization: Bearer).
  const userToken = getBearerToken(req);
  const web6 = new Web6Client({
    baseUrl: WEB6_API,
    persistSession: false,
    fetchImpl: (url, init) => {
      if (WEB6_API_KEY) init.headers['X-Web6-Api-Key'] = WEB6_API_KEY;
      if (userToken) init.headers['Authorization'] = `Bearer ${userToken}`;
      return fetch(url, init);
    },
  });

  const { messages, context, avatarId } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  try {
    let systemContent = LEELA_SYSTEM;

    // Inject page context so Leela knows where the user is in the flow.
    if (context) {
      const parts = [];
      if (context.page)         parts.push(`Current page: ${context.page}`);
      if (context.step != null) parts.push(`Builder step: ${context.step + 1}`);
      if (context.trustName)    parts.push(`Trust name: ${context.trustName}`);
      if (context.jurisdiction) parts.push(`Jurisdiction: ${context.jurisdiction}`);
      if (parts.length) systemContent += `\n\nCurrent session context:\n${parts.join('\n')}`;
    }

    // Build the message list: system prompt first, then conversation history.
    const chatMessages = [
      { Role: 'system', Content: systemContent },
      ...messages.map(m => ({ Role: m.role, Content: m.content })),
    ];

    // FAHRN and Holonic BRAID are now handled server-side inside /v1/complete.
    // Passing UseFAHRN / UseHolonicBraid / FahrnTaskType lets the WEB6 API
    // orchestrate the reasoning pipeline before calling the provider — same
    // outcome as the old explicit client-side calls but in a single round-trip.
    const r = await web6.completion.complete({
      Provider:        cfg.provider,
      Model:           cfg.model,
      Messages:        chatMessages,
      AvatarId:        avatarId || undefined,
      UseFAHRN:        USE_FAHRN,
      UseHolonicBraid: USE_HOLONIC_BRAID,
      FahrnTaskType:   'trust-guidance',
      Routing: {
        Fallback:    true,
        UseOpenServ: cfg.useOpenServ ?? undefined,
      },
    });

    // OASISResult properties may be PascalCase or camelCase depending on API/client version.
    const isError   = r.isError   ?? r.IsError   ?? false;
    const content   = r.result?.content ?? r.result?.Content ?? r.Result?.content ?? r.Result?.Content;
    const msg       = r.message   || r.Message   || r.detailedMessage || r.DetailedMessage;

    if (isError || !content) {
      console.error('[leela-chat] WEB6 error — isError:', isError, '| content:', content, '| msg:', msg, '| raw:', JSON.stringify(r.raw));
      throw new Error(msg || `WEB6 returned an empty completion response. Keys: ${JSON.stringify(Object.keys(r))}`);
    }

    return res.status(200).json({ reply: content });

  } catch (err) {
    console.error('[leela-chat]', err);
    return res.status(500).json({ error: err.message });
  }
};

// ── OLD explicit client-side FAHRN + Braid orchestration (kept for reference) ─
//
// Previously leela-chat made three separate round-trips:
//   1. GET /v1/holonic-braid/graph/trust-guidance  → inject MermaidDiagram into system context
//   2. POST /v1/reasoning-network/dispatch          → inject FinalMermaidPlan into system context
//   3. POST /v1/complete                            → actual LLM call
//
// The WEB6 /v1/complete endpoint now handles steps 1 and 2 internally when
// UseFAHRN / UseHolonicBraid are set, collapsing three round-trips into one.
//
// async function getHolonicBraidGraph() {
//   try {
//     const r = await web6.holonicBraid.getGraph({ taskType: 'trust-guidance' });
//     if (!r.isError && r.result?.MermaidDiagram) return r.result.MermaidDiagram;
//   } catch { }
//   return null;
// }
//
// async function fahnDispatch(problem, avatarId) {
//   try {
//     const r = await web6.reasoningNetwork.dispatch({
//       Problem:  problem,
//       TaskType: 'trust-guidance',
//       AvatarId: avatarId || '00000000-0000-0000-0000-000000000000',
//     });
//     if (!r.isError && r.result?.FinalMermaidPlan) return r.result.FinalMermaidPlan;
//   } catch { }
//   return null;
// }
