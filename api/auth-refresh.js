'use strict';

const { createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required.' });
  }

  try {
    const oasis = createClient();
    const { isError, message, result } = await oasis.avatar.refreshToken({ Token: refreshToken });

    if (isError || !result) {
      return res.status(401).json({ error: message || 'Session expired. Please sign in again.' });
    }

    const avatar = result;
    return res.status(200).json({
      token:        avatar.jwtToken      || avatar.JwtToken,
      refreshToken: avatar.refreshToken  || avatar.RefreshToken || refreshToken,
    });

  } catch (err) {
    console.error('[auth-refresh]', err);
    return res.status(500).json({ error: 'Token refresh failed. Please sign in again.' });
  }
};
