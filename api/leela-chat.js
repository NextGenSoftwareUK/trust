'use strict';

const { Web6Client } = require('@oasisomniverse/web6-api');
const { getBearerToken } = require('./_oasis');
const cfg = require('../config/leela');

const WEB6_API     = process.env.WEB6_API_URL    || cfg.web6ApiUrl;
const WEB6_API_KEY = process.env.WEB6_API_KEY    || '';
const LEELA_API_KEY = process.env.LEELA_API_KEY  || '';
const LEELA_BASE_URL = (process.env.LEELA_BASE_URL || 'https://namozyqyvwf62hqxpzujt7e5hq0njhge.lambda-url.eu-west-1.on.aws').replace(/\/+$/, '');

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

// Provider configs used when routing through WEB6.
const WEB6_PROVIDERS = {
  openai:    { provider: 'OpenAI',    model: 'gpt-4o' },
  anthropic: { provider: 'Anthropic', model: 'claude-sonnet-4-6' },
  groq:      { provider: 'Groq',      model: 'llama-3.3-70b-versatile' },
  openserv:  { provider: 'OpenServ',  model: 'gpt-5.4' },
};

// ── Direct Leela call (bypasses WEB6 entirely) ─────────────────────────────
async function callLeelaDirect(systemContent, messages) {
  if (!LEELA_API_KEY) throw new Error('LEELA_API_KEY is not configured on the server.');

  const payload = {
    model: 'leela',
    messages: [
      { role: 'system', content: systemContent },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
  };

  const response = await fetch(`${LEELA_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LEELA_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = body?.error?.message || `Leela returned ${response.status}`;
    throw new Error(msg);
  }

  return body.choices?.[0]?.message?.content || '';
}

// ── WEB6-routed call (OpenAI, Anthropic, Groq, OpenServ, …) ───────────────
async function callViaWeb6(providerCfg, systemContent, messages, avatarId, userToken) {
  const web6 = new Web6Client({
    baseUrl: WEB6_API,
    persistSession: false,
    fetchImpl: (url, init) => {
      if (WEB6_API_KEY) init.headers['X-Web6-Api-Key'] = WEB6_API_KEY;
      if (userToken)    init.headers['Authorization']  = `Bearer ${userToken}`;
      return fetch(url, init);
    },
  });

  const r = await web6.completion.complete({
    Provider:        providerCfg.provider,
    Model:           providerCfg.model,
    Messages: [
      { role: 'system', content: systemContent },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    AvatarId:        avatarId || undefined,
    UseFAHRN:        providerCfg.useFahrn    ?? false,
    UseHolonicBraid: providerCfg.useBraid    ?? false,
    FahrnTaskType:   'trust-guidance',
    Routing: { Fallback: true },
  });

  const isError = r.isError ?? r.IsError ?? false;
  const content = r.result?.content ?? r.result?.Content ?? r.Result?.content ?? r.Result?.Content;
  const msg     = r.message || r.Message || r.detailedMessage || r.DetailedMessage;

  if (isError || !content) {
    console.error('[leela-chat] WEB6 error:', msg, '| raw:', JSON.stringify(r.raw));
    throw new Error(msg || 'WEB6 returned an empty completion response.');
  }

  return content;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, context, avatarId, provider: reqProvider, useWeb6, useFahrn, useHolonicBraid } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  // Ensure there is at least one user message before calling any provider.
  const hasUserMsg = messages.some(m => (m.role || '').toLowerCase() === 'user');
  if (!hasUserMsg) {
    return res.status(400).json({ error: 'messages[] must contain at least one user message.' });
  }

  try {
    // Build system context, optionally enriched with page/step info.
    let systemContent = LEELA_SYSTEM;
    if (context) {
      const parts = [];
      if (context.page)         parts.push(`Current page: ${context.page}`);
      if (context.step != null) parts.push(`Builder step: ${context.step + 1}`);
      if (context.trustName)    parts.push(`Trust name: ${context.trustName}`);
      if (context.jurisdiction) parts.push(`Jurisdiction: ${context.jurisdiction}`);
      if (parts.length) systemContent += `\n\nCurrent session context:\n${parts.join('\n')}`;
    }

    // Resolve provider.
    // If useWeb6 is true: always go through WEB6 (even Leela AI).
    // If useWeb6 is false: Leela AI → direct; everything else → WEB6.
    const providerKey = (reqProvider || 'leelaai').toLowerCase();
    let reply;

    const isLeela = providerKey === 'leelaai' || providerKey === 'leela';

    if (isLeela && !useWeb6) {
      reply = await callLeelaDirect(systemContent, messages);
    } else {
      // For Leela via WEB6 we use the LeelaAI provider name; others use WEB6_PROVIDERS.
      let providerCfg;
      if (isLeela) {
        providerCfg = { provider: 'LeelaAI', model: 'leela' };
      } else {
        providerCfg = WEB6_PROVIDERS[providerKey];
        if (!providerCfg) return res.status(400).json({ error: `Unknown provider: ${reqProvider}` });
      }
      providerCfg = { ...providerCfg, useFahrn: !!useFahrn, useBraid: !!useHolonicBraid };
      const userToken = getBearerToken(req);
      reply = await callViaWeb6(providerCfg, systemContent, messages, avatarId, userToken);
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[leela-chat]', err);
    return res.status(500).json({ error: err.message });
  }
};
