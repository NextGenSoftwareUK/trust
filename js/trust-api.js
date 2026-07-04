/* ═══════════════════════════════════════════════════════
   SovereignTrust — OASIS Data/Karma API client
   Requires js/auth.js to be loaded first (getSession()).
   ═══════════════════════════════════════════════════════ */

async function trustApiFetch(path, options = {}, _retried = false) {
  const session = getSession();
  if (!session?.token) throw new Error('Not signed in.');

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {})
    }
  });

  // Auto-refresh JWT on 401 and retry once.
  if (res.status === 401 && !_retried) {
    const newToken = await refreshSession();
    if (newToken) return trustApiFetch(path, options, true);
    // Refresh failed — force logout so the user sees the login page.
    authLogout();
    throw new Error('Session expired. Please sign in again.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function saveTrust({ id, name, status, data }) {
  const session = getSession();
  return trustApiFetch('/api/trust-save', {
    method: 'POST',
    body: JSON.stringify({ id, avatarId: session.avatarId, name, status, data })
  });
}

async function listTrusts() {
  const session = getSession();
  const json = await trustApiFetch(`/api/trust-list?avatarId=${encodeURIComponent(session.avatarId)}`, {
    method: 'GET'
  });
  return json.trusts || [];
}

async function deleteTrust(id) {
  return trustApiFetch('/api/trust-delete', {
    method: 'POST',
    body: JSON.stringify({ id })
  });
}

async function getTrustById(id) {
  const json = await trustApiFetch(`/api/trust-list?id=${encodeURIComponent(id)}`, { method: 'GET' });
  return json.trust || null;
}

async function createCheckoutSession({ id, name }) {
  const session = getSession();
  return trustApiFetch('/api/checkout-session', {
    method: 'POST',
    body: JSON.stringify({ trustId: id, trustName: name, avatarId: session.avatarId })
  });
}

async function checkCheckoutStatus(stripeSessionId) {
  return trustApiFetch(`/api/checkout-status?session_id=${encodeURIComponent(stripeSessionId)}`, {
    method: 'GET'
  });
}

/** Fetches the generated trust deed PDF (auth'd binary download) and triggers a browser save. */
async function downloadTrustDocument(id, filename, stripeSessionId) {
  const session = getSession();
  if (!session?.token) throw new Error('Not signed in.');

  const sessionParam = stripeSessionId ? `&session_id=${encodeURIComponent(stripeSessionId)}` : '';
  const res = await fetch(`/api/trust-document?id=${encodeURIComponent(id)}&avatarId=${encodeURIComponent(session.avatarId)}${sessionParam}`, {
    headers: { Authorization: `Bearer ${session.token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Document download failed (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'Trust_Deed.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function awardKarma(action) {
  const session = getSession();
  try {
    await trustApiFetch('/api/karma-award', {
      method: 'POST',
      body: JSON.stringify({ avatarId: session.avatarId, action })
    });
  } catch (err) {
    // Karma is a bonus, never block the user's flow on it failing.
    console.error('[awardKarma]', err);
  }
}
