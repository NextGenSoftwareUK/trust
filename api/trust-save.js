const { getBearerToken, createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { id, avatarId, name, status, data } = req.body || {};

  console.log('[trust-save] status:', status, 'name:', name, 'full data:', JSON.stringify(data || {}));

  if (!avatarId || !name || !data) {
    return res.status(400).json({ error: 'avatarId, name and data are required.' });
  }

  const holon = {
    Id: id || '00000000-0000-0000-0000-000000000000',
    Name: name,
    Description: `SovereignTrust trust profile (${status || 'Draft'})`,
    HolonType: 141,
    ParentHolonId: avatarId,
    MetaData: {
      trustData: JSON.stringify(data),
      status: status || 'Draft',
      updatedAt: new Date().toISOString()
    }
  };

  try {
    const oasis = createClient(token);
    const saveRes = await oasis.data.saveHolon({ Holon: holon, SaveChildren: true });

    console.log('[trust-save] OASIS result: isError=', saveRes.isError, 'message=', saveRes.message, 'resultId=', saveRes.result?.id || saveRes.result?.Id || '(none)');

    if (saveRes.isError) {
      return res.status(400).json({ error: saveRes.message || 'Save failed.' });
    }

    return res.status(200).json({ success: true, trust: saveRes.result });

  } catch (err) {
    console.error('[trust-save]', err);
    return res.status(500).json({ error: 'Failed to save trust. Please try again.' });
  }
};
