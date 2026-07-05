// ─── Version badge ────────────────────────────────────────
(function () {
  const badge = document.createElement('div');
  badge.textContent = 'v1.2.0';
  badge.style.cssText = 'position:fixed;bottom:10px;right:12px;z-index:9000;font-family:"DM Sans",sans-serif;font-size:11px;color:rgba(74,74,68,0.4);pointer-events:none;user-select:none;';
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
