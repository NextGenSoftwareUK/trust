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
