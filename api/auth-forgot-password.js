const { createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const origin = req.headers['origin'] || '';
  const returnUrl = origin ? `${origin}/reset-password.html` : null;

  try {
    const oasis = createClient();
    await oasis.avatar.forgotPassword({ email, ...(returnUrl && { returnUrl }) });

    // Return success regardless of whether the email exists to prevent enumeration
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[auth-forgot-password]', err);
    return res.status(200).json({ success: true }); // don't leak errors
  }
};
