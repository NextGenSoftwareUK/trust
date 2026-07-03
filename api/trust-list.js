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

  // Single trust lookup by ID
  if (id) {
    try {
      const oasis = createClient(token);
      const { isError, message, result } = await oasis.data.loadHolon({ Id: id });
      if (isError) return res.status(400).json({ error: message || 'Failed to load trust.' });
      if (!result) return res.status(404).json({ error: 'Trust not found.' });
      return res.status(200).json({ success: true, trust: parseHolon(result) });
    } catch (err) {
      console.error('[trust-list/get]', err);
      return res.status(500).json({ error: 'Failed to load trust. Please try again.' });
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
