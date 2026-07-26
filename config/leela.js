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
  // WEB4 OASIS API base URL.
  web4ApiUrl: 'https://dev.api.web4.oasisomniverse.one',

  // WEB6 OASIS AI API base URL.
  web6ApiUrl: 'https://dev.api.web6.oasisomniverse.one',

  // AI provider and model for standard completions.
  // "LeelaAI" routes to the Leela AI Lambda endpoint via WEB6.
  provider: 'LeelaAI',
  model: 'leela',

  // FAHRN and Holonic BRAID are disabled for LeelaAI — Leela's own RAG (leela_citations)
  // handles knowledge retrieval natively. Enable only when routing through a WEB6 provider.
  useFahrn: false,
  useHolonicBraid: false,

  // Route through OpenServ gateway instead of calling the provider API directly.
  // null = use OASIS_DNA.Web6.PreferOpenServ default (recommended for production).
  // true = always route via OpenServ (one SERV_API_KEY covers all models).
  // false = always call the provider directly (requires the provider's own API key).
  useOpenServ: null,
};
