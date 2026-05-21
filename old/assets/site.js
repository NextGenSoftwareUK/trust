document.querySelectorAll('[data-tabs]').forEach((tabset) => {
  const tabs = tabset.querySelectorAll('[data-tab]');
  const panels = tabset.querySelectorAll('[data-panel]');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.toggle('active', t === tab));
    panels.forEach((panel) => panel.hidden = panel.dataset.panel !== tab.dataset.tab);
  }));
});

document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const topbar = btn.closest('.topbar');
    topbar?.classList.toggle('open');
  });
});

document.querySelectorAll('[data-step]').forEach((stepButton) => {
  stepButton.addEventListener('click', () => {
    const step = stepButton.dataset.step;
    document.querySelectorAll('[data-step]').forEach((b) => b.classList.toggle('active', b === stepButton));
    document.querySelectorAll('[data-step-panel]').forEach((panel) => panel.hidden = panel.dataset.stepPanel !== step);
  });
});
