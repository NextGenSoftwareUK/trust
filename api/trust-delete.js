const { getBearerToken, createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ error: 'id is required.' });
  }

  try {
    const oasis = createClient(token);
    const { isError, message } = await oasis.data.deleteHolon({ Id: id });

    if (isError) {
      return res.status(400).json({ error: message || 'Delete failed.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[trust-delete]', err);
    return res.status(500).json({ error: 'Failed to delete trust. Please try again.' });
  }
};
