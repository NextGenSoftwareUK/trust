const { createClient } = require('./_oasis');

// ─── Handler ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const oasis = createClient();
    // OASIS Authenticate accepts either username or email in the username field.
    const { isError, message, session } = await oasis.auth.login({ username: email, password });

    if (isError || !session) {
      return res.status(401).json({ error: message || 'Authentication failed. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      session: {
        token: session.jwtToken,
        refreshToken: session.refreshToken || '',
        avatarId: session.avatarId,
        username: session.username || email,
        email: session.email || email,
        firstName: session.firstName || '',
        lastName: session.lastName || ''
      }
    });

  } catch (err) {
    console.error('[auth-login]', err);
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
};
