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

// ─── Logout ────────────────────────────────────────────
function authLogout() {
  clearSession();
  window.location.href = '/';
}

// ─── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', updateNav);
