const { createClient } = require('./_oasis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, token, password, confirmPassword } = req.body || {};

  // ── Forgot password ──────────────────────────────────
  if (action === 'forgot') {
    if (!email) return res.status(400).json({ error: 'Email address is required.' });

    const origin = req.headers['origin'] || '';
    const returnUrl = origin ? `${origin}/reset-password.html` : null;

    try {
      const oasis = createClient();
      await oasis.avatar.forgotPassword({ email, ...(returnUrl && { returnUrl }) });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[auth-password/forgot]', err);
      return res.status(200).json({ success: true }); // don't leak errors
    }
  }

  // ── Reset password ───────────────────────────────────
  if (action === 'reset') {
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (confirmPassword && password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    try {
      const oasis = createClient();
      const result = await oasis.avatar.resetPassword({
        token,
        newPassword: password,
        confirmNewPassword: confirmPassword || password
      });

      if (result?.isError) {
        return res.status(400).json({ error: result.message || 'Password reset failed. The link may have expired.' });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[auth-password/reset]', err);
      return res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
  }

  return res.status(400).json({ error: 'Invalid action.' });
};
