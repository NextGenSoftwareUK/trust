const { createClient } = require('./_oasis');

// ─── Handler ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fullName, email, password } = req.body || {};

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || 'User';
  const lastName  = nameParts.slice(1).join(' ') || 'User';

  try {
    const oasis = createClient();
    const { isError, message, session } = await oasis.auth.register({
      firstName,
      lastName,
      email,
      password,
      confirmPassword: password,
      avatarType: 'User'
    });

    if (isError || !session) {
      return res.status(400).json({ error: message || 'Registration failed. Please try again.' });
    }

    // Seed karma for new accounts (best-effort, doesn't block registration on failure)
    if (session.avatarId && session.jwtToken) {
      try {
        const authed = createClient(session.jwtToken);
        await authed.karma.addKarmaToAvatar({
          avatarId: session.avatarId,
          KarmaType: 'Other',
          karmaSourceType: 'Website',
          KaramSourceTitle: 'SovereignTrust Account Created',
          KarmaSourceDesc: 'Awarded for creating a SovereignTrust account.'
        });
      } catch (karmaErr) {
        console.error('[auth-register] karma award failed', karmaErr);
      }
    }

    return res.status(200).json({
      success: true,
      session: {
        token: session.jwtToken,
        refreshToken: session.refreshToken || '',
        avatarId: session.avatarId,
        username: session.username,
        email: session.email || email,
        firstName: session.firstName || firstName,
        lastName: session.lastName || lastName
      }
    });

  } catch (err) {
    console.error('[auth-register]', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};
