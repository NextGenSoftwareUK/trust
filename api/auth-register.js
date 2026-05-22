const crypto = require('crypto');

//const OASIS_API = process.env.OASIS_API_URL || 'https://api.oasisweb4.one';
const OASIS_API = process.env.OASIS_API_URL || 'https://oasisapionode-hseudrexdvbhenhv.canadacentral-01.azurewebsites.net';

// ─── Helpers ───────────────────────────────────────────
function generateUsername(fullName, email) {
  const base = (fullName || email || '')
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12) || 'user';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

function extractAvatar(data) {
  return data?.result?.result?.avatar
    || data?.result?.avatar
    || data?.avatar
    || data?.result
    || null;
}

function extractJwt(data) {
  return data?.result?.result?.jwtToken
    || data?.result?.jwtToken
    || data?.jwtToken
    || data?.token
    || null;
}

async function oasisFetch(path, options = {}) {
  const res = await fetch(`${OASIS_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, json };
}

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

  try {
    // 1. Check if avatar already exists with this email
    const { res: lookupRes, json: lookupData } = await oasisFetch(
      `/api/Avatar/get-by-email/${encodeURIComponent(email)}`
    );
    if (lookupRes.ok) {
      const existing = extractAvatar(lookupData);
      if (existing?.avatarId || existing?.id) {
        return res.status(409).json({
          error: 'An account with this email already exists. Please sign in instead.'
        });
      }
    }

    // 2. Parse name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName  = nameParts.slice(1).join(' ') || 'User';
    const username  = generateUsername(fullName, email);

    // 3. Register avatar with OASIS
    const { res: regRes, json: regData } = await oasisFetch('/api/Avatar/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password,
        confirmPassword: password,
        firstName,
        lastName,
        title: 'Mx',
        avatarType: 'User',
        acceptTerms: true,
        privacyMode: false
      })
    });

    if (!regRes.ok || regData?.result?.isError) {
      const msg = regData?.result?.message || regData?.message || regData?.error
        || `Registration failed (${regRes.status})`;
      return res.status(400).json({ error: msg });
    }

    const avatar  = extractAvatar(regData);
    const token   = extractJwt(regData);
    const avatarId = avatar?.avatarId || avatar?.id || null;

    return res.status(200).json({
      success: true,
      session: { token, avatarId, username, email, firstName, lastName }
    });

  } catch (err) {
    console.error('[auth-register]', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};
