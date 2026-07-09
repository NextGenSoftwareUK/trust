/* ═══════════════════════════════════════════════════════
   SovereignTrust — client auth
   Loaded in <head> on every page.
   ═══════════════════════════════════════════════════════ */

const ST_KEY = 'st_session';

// ─── Session ───────────────────────────────────────────
function getSession() {
  try {
    const raw = localStorage.getItem(ST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setSession(data) {
  try { localStorage.setItem(ST_KEY, JSON.stringify(data)); } catch {}
}

function clearSession() {
  try { localStorage.removeItem(ST_KEY); } catch {}
}

// ─── Route guards ──────────────────────────────────────

/** Call in <head> of every protected page — redirects immediately if not signed in. */
function requireAuth() {
  if (!getSession()) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace('/login.html?next=' + next);
  }
}

/** Call in <head> of login / register — skips form if already signed in. */
function redirectIfAuthed() {
  if (getSession()) {
    const params = new URLSearchParams(window.location.search);
    window.location.replace(params.get('next') || '/dashboard.html');
  }
}

// ─── Nav ───────────────────────────────────────────────
function updateNav() {
  const session = getSession();
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  if (session) {
    const name = session.firstName || session.email?.split('@')[0] || 'User';
    navLinks.innerHTML = `
      <a class="nav-link" href="/education.html">Education</a>
      <a class="nav-link" href="/dashboard.html">Dashboard</a>
      <span class="nav-link nav-greeting">Hi, ${name}</span>
      <button class="nav-cta nav-cta--ghost" onclick="authLogout()">Sign Out</button>
    `;
  }
  // Not signed in: keep static HTML from the page (Education / Sign in / Create Account)
}

// ─── Token expiry check ───────────────────────────────
function jwtExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

// Returns true if the token is expired or expires within the next 60 seconds.
function tokenNeedsRefresh(token) {
  const exp = jwtExpiresAt(token);
  return exp === null || Date.now() >= exp - 60_000;
}

// Ensures the session token is fresh before making an API call.
// Returns the current token, or null if refresh failed (caller should logout).
async function ensureFreshToken() {
  const session = getSession();
  if (!session?.token) return null;
  if (!tokenNeedsRefresh(session.token)) return session.token;
  return refreshSession();
}

// ─── Token refresh ────────────────────────────────────
// Returns the new JWT token string, or null if refresh failed (caller should logout).
async function refreshSession() {
  const session = getSession();
  if (!session?.refreshToken) return null;
  try {
    const res = await fetch('/api/auth-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.token) return null;
    setSession({ ...session, token: data.token, refreshToken: data.refreshToken || session.refreshToken });
    return data.token;
  } catch {
    return null;
  }
}

// ─── Logout ────────────────────────────────────────────
function authLogout() {
  clearSession();
  window.location.href = '/';
}

// ─── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', updateNav);
