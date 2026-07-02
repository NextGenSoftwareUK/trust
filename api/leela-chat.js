'use strict';

const WEB6_API = (process.env.WEB6_API_URL || 'https://api.web6.oasisomniverse.one').replace(/\/$/, '');
const USE_FAHRN = (process.env.LEELA_USE_FAHRN || 'false').toLowerCase() === 'true';
const USE_HOLONIC_BRAID = (process.env.LEELA_USE_HOLONIC_BRAID || 'false').toLowerCase() === 'true';

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

async function web6Fetch(path, options = {}) {
  const res = await fetch(`${WEB6_API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: { message: text } }; }
}

async function getHolonicBraidGraph(taskType) {
  try {
    const r = await web6Fetch(`/v1/holonic-braid/graph/${encodeURIComponent(taskType)}`);
    if (r.ok && r.data?.result?.MermaidDiagram) return r.data.result.MermaidDiagram;
  } catch { /* non-fatal */ }
  return null;
}

async function fahnDispatch(problem, avatarId) {
  try {
    const r = await web6Fetch('/v1/reasoning-network/dispatch', {
      method: 'POST',
      body: JSON.stringify({ Problem: problem, TaskType: 'trust-guidance', AvatarId: avatarId || '00000000-0000-0000-0000-000000000000' }),
    });
    if (r.ok && r.data?.result?.FinalMermaidPlan) return r.data.result.FinalMermaidPlan;
  } catch { /* non-fatal — fall through to plain complete */ }
  return null;
}

async function web6Complete(messages) {
  const r = await web6Fetch('/v1/complete', {
    method: 'POST',
    body: JSON.stringify({
      Provider: 'openai',
      Model: 'gpt-4o',
      Messages: messages,
      Routing: { Fallback: true },
    }),
  });
  if (!r.ok) throw new Error(`WEB6 /v1/complete error ${r.status}: ${r.data?.message || 'unknown'}`);
  const content = r.data?.result?.Content ?? r.data?.Content;
  if (!content) throw new Error('WEB6 returned an empty completion response');
  return content;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages, context, avatarId } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages[] is required' });
  }

  try {
    let systemContent = LEELA_SYSTEM;

    // Inject page context so Leela knows where the user is in the flow.
    if (context) {
      const parts = [];
      if (context.page) parts.push(`Current page: ${context.page}`);
      if (context.step != null) parts.push(`Builder step: ${context.step + 1}`);
      if (context.trustName) parts.push(`Trust name: ${context.trustName}`);
      if (context.jurisdiction) parts.push(`Jurisdiction: ${context.jurisdiction}`);
      if (parts.length) systemContent += `\n\nCurrent session context:\n${parts.join('\n')}`;
    }

    // Holonic Braid: inject cached reasoning graph if available.
    if (USE_HOLONIC_BRAID) {
      const graph = await getHolonicBraidGraph('trust-guidance');
      if (graph) {
        systemContent += `\n\nThe following Holonic BRAID reasoning graph has been pre-generated for trust-guidance tasks. Use it to structure your reasoning:\n\`\`\`mermaid\n${graph}\n\`\`\``;
      }
    }

    const systemMessage = { Role: 'system', Content: systemContent };

    // Map client-side { role, content } to WEB6 { Role, Content }.
    const historyMessages = messages.map(m => ({ Role: m.role, Content: m.content }));

    // FAHRN: get a reasoning plan for the latest user message, inject into context.
    if (USE_FAHRN) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        const plan = await fahnDispatch(lastUserMsg.content, avatarId);
        if (plan) {
          systemContent += `\n\nFAHRN has produced the following reasoning execution plan for this query. Follow this plan to structure your response:\n\`\`\`mermaid\n${plan}\n\`\`\``;
          systemMessage.Content = systemContent;
        }
      }
    }

    const reply = await web6Complete([systemMessage, ...historyMessages]);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[leela-chat]', err);
    return res.status(500).json({ error: err.message });
  }
};
