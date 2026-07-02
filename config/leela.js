'use strict';

// Leela AI assistant — code-level configuration.
//
// These are the defaults baked into the code. Vercel (or any hosting platform)
// environment variables always win at runtime:
//
//   WEB6_API_URL           — override the WEB6 API base URL
//   LEELA_USE_FAHRN        — "true" / "false" to override useFahrn
//   LEELA_USE_HOLONIC_BRAID — "true" / "false" to override useHolonicBraid
//
// Change values here to update the defaults without needing to touch env vars.
module.exports = {
  // WEB6 OASIS AI API base URL.
  web6ApiUrl: 'https://api.web6.oasisomniverse.one',

  // AI provider and model for standard completions.
  // "openai" routes to GPT-4o. Set to "auto" to let WEB6 pick based on routing priority.
  provider: 'openai',
  model: 'gpt-4o',

  // FAHRN — Fractal Adaptive Holonic Reasoning Network.
  // When true, each Leela message is first dispatched through the FAHRN reasoning
  // network (POST /v1/reasoning-network/dispatch, TaskType: "trust-guidance") to
  // produce a structured Mermaid execution plan. That plan is injected into the system
  // context before the final completion call, improving multi-step reasoning quality.
  // Trade-off: adds roughly 1–3 s of extra latency per message.
  useFahrn: true,

  // Holonic BRAID shared reasoning graph.
  // When true, Leela fetches the global shared reasoning graph for the "trust-guidance"
  // task type (GET /v1/holonic-braid/graph/trust-guidance) before each completion and
  // injects it as system context. Reasoning patterns are therefore shared and compound
  // across all users and sessions — the more it is used, the better it gets.
  // Falls back silently if no graph has been seeded yet.
  useHolonicBraid: true,
};
