//const OASIS_API = process.env.OASIS_API_URL || 'https://api.oasisweb4.one';
const OASIS_API = process.env.OASIS_API_URL || 'https://oasisapionode-hseudrexdvbhenhv.canadacentral-01.azurewebsites.net';

// ─── Helpers ───────────────────────────────────────────
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
  //console.log("response = ", res);
  console.log("text = ", text);
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, json };
}

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
    // 1. Look up avatar by email to get the OASIS username
    // const { res: lookupRes, json: lookupData } = await oasisFetch(
    //   `/api/Avatar/get-by-email/${encodeURIComponent(email)}`
    // );

    // if (!lookupRes.ok) {
    //   return res.status(401).json({
    //     error: 'No account found with this email address. Please check or create an account.'
    //   });
    // }

    // const avatar    = extractAvatar(lookupData);
    // const username  = avatar?.username;
    // const avatarId  = avatar?.avatarId || avatar?.id;
    // const firstName = avatar?.firstName || '';
    // const lastName  = avatar?.lastName  || '';

    // if (!username) {
    //   return res.status(401).json({
    //     error: 'Account not found. Please check your email or create a new account.'
    //   });
    // }

    const username  = email;

    // 2. Authenticate with OASIS (uses username, not email)
    const { res: authRes, json: authData } = await oasisFetch('/api/avatar/authenticate', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (!authRes.ok || authData?.result?.isError) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = extractJwt(authData);

    if (!token) {
      return res.status(401).json({ error: 'Authentication failed. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      session: { token, avatarId, username, email, firstName, lastName }
    });

  } catch (err) {
    console.error('[auth-login]', err);
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
};
