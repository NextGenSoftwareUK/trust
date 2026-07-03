const { getBearerToken, createClient } = require('./_oasis');

function parseHolon(holon) {
  const meta = holon.metaData || holon.MetaData || {};
  let data = {};
  try { data = JSON.parse(meta.trustData || meta.TrustData || '{}'); } catch {}

  return {
    id: holon.id || holon.Id,
    name: holon.name || holon.Name,
    status: meta.status || meta.Status || 'Draft',
    updatedAt: meta.updatedAt || meta.UpdatedAt || holon.modifiedDate || holon.ModifiedDate || null,
    createdAt: holon.createdDate || holon.CreatedDate || null,
    data
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { avatarId, id } = req.query || {};

  // Single trust lookup by ID — use GET endpoint (simpler code path than POST)
  if (id) {
    try {
      const { OASIS_API } = require('./_oasis');
      // loadChildren=false to avoid truncated/circular response from large child trees
      const apiRes = await fetch(`${OASIS_API}/api/data/load-holon/${encodeURIComponent(id)}/false/false/0/true/0`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const text = await apiRes.text();
      let json;
      let parseErr = null;
      try { json = text ? JSON.parse(text) : null; } catch (e) { parseErr = e.message; }
      if (!apiRes.ok || !json) {
        return res.status(apiRes.ok ? 404 : apiRes.status).json({ error: 'Trust not found.', _debug: { status: apiRes.status, parseErr, bodyLen: text.length, body: text.slice(0, 800) } });
      }
      // Unwrap OASISHttpResponseMessage -> OASISResult -> payload
      const inner = json?.result ?? json;
      const holon = inner?.result ?? inner;
      if (!holon || inner?.isError) {
        return res.status(404).json({ error: 'Trust not found.', _debug: { inner } });
      }
      return res.status(200).json({ success: true, trust: parseHolon(holon) });
    } catch (err) {
      console.error('[trust-list/get]', err);
      return res.status(500).json({ error: err.message, _stack: err.stack });
    }
  }

  if (!avatarId) {
    return res.status(400).json({ error: 'avatarId or id is required.' });
  }

  try {
    const oasis = createClient(token);
    const { isError, message, result } = await oasis.data.loadHolonsForParent({ Id: avatarId, HolonType: 'Trust' });

    if (isError) {
      return res.status(400).json({ error: message || 'Failed to load trusts.' });
    }

    const holons = Array.isArray(result) ? result : [];
    const trusts = holons.map(parseHolon);

    return res.status(200).json({ success: true, trusts });

  } catch (err) {
    console.error('[trust-list]', err);
    return res.status(500).json({ error: 'Failed to load trusts. Please try again.' });
  }
};
