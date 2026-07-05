// ─── Version badge ────────────────────────────────────────
const SITE_VERSION = 'v1.1.0';

(function injectVersionBadge() {
  const badge = document.createElement('div');
  badge.id = 'version-badge';
  badge.textContent = SITE_VERSION;
  badge.style.cssText = [
    'position:fixed',
    'bottom:12px',
    'right:14px',
    'z-index:9000',
    'font-family:"DM Sans",sans-serif',
    'font-size:10px',
    'font-weight:500',
    'letter-spacing:0.06em',
    'color:rgba(74,74,68,0.45)',
    'background:rgba(250,248,243,0.82)',
    'border:1px solid rgba(138,138,133,0.2)',
    'border-radius:4px',
    'padding:3px 7px',
    'pointer-events:none',
    'user-select:none',
  ].join(';');
  document.body.appendChild(badge);
})();

// ─── Mobile nav ───────────────────────────────────────────
function toggleMobileMenu() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

// Close mobile menu when clicking outside nav
document.addEventListener('click', function (e) {
  const nav = document.querySelector('nav');
  if (nav && !nav.contains(e.target)) {
    const links = document.getElementById('navLinks');
    if (links) links.classList.remove('open');
  }
});

// ─── Lumina assistant ─────────────────────────────────────
let luminaOpen = false;

function toggleLumina() {
  luminaOpen = !luminaOpen;
  const panel = document.getElementById('luminaPanel');
  if (panel) panel.classList.toggle('open', luminaOpen);
}

function luminaMsg(q) {
  alert(
    'Lumina: Great question!\n\n"' + q + '"\n\n' +
    'In the full version, Lumina will provide a detailed, plain-English ' +
    'explanation here, powered by the OASIS Avatar AI API.'
  );
}
