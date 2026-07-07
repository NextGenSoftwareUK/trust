const { createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, password, confirmPassword } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (password !== (confirmPassword || password)) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const oasis = createClient();
    const result = await oasis.avatar.resetPassword({
      token,
      password,
      confirmPassword: confirmPassword || password
    });

    if (result?.isError) {
      return res.status(400).json({ error: result.message || 'Password reset failed. The link may have expired.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[auth-reset-password]', err);
    return res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
};
