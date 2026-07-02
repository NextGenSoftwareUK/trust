const { OASISClient } = require('@oasisomniverse/web4-api');

//const OASIS_API = process.env.OASIS_API_URL || 'https://api.oasisweb4.one';
const OASIS_API = process.env.OASIS_API_URL || 'api.web4.oasisomniverse.one';

function getBearerToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

/** New OASISClient per request - serverless functions are stateless, so there's no session to persist between calls. */
function createClient(token) {
  const client = new OASISClient({ baseUrl: OASIS_API, persistSession: false });
  if (token) client.setToken(token);
  return client;
}

module.exports = { OASIS_API, getBearerToken, createClient };
