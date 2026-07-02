'use strict';

// ─── Leela AI chat assistant ───────────────────────────────────────────────
// Powers the floating chat panel on every page of SovereignTrust.
// Calls /api/leela-chat which routes to the WEB6 OASIS AI API.

(function () {
  let isOpen = false;
  let isSending = false;
  const history = []; // { role: 'user'|'assistant', content: string }
  let _context = {};  // page context injected by each page

  // Called by page scripts to supply current trust/step context.
  window.setLeelaContext = function (ctx) {
    _context = Object.assign(_context, ctx);
  };

  // ── DOM refs (populated after DOMContentLoaded) ──────────────────────────
  function panel()    { return document.getElementById('leelaPanel'); }
  function msgArea()  { return document.getElementById('leelaMessages'); }
  function inputEl()  { return document.getElementById('leelaInput'); }
  function sendBtn()  { return document.getElementById('leelaSend'); }

  // ── Toggle ────────────────────────────────────────────────────────────────
  window.toggleLeela = function () {
    isOpen = !isOpen;
    const p = panel();
    if (p) p.classList.toggle('open', isOpen);
    if (isOpen) setTimeout(() => { const i = inputEl(); if (i) i.focus(); }, 150);
  };

  // Keep backwards-compat if any page still references toggleLumina.
  window.toggleLumina = window.toggleLeela;

  // ── Render helpers ────────────────────────────────────────────────────────
  function appendMessage(role, text) {
    const area = msgArea();
    if (!area) return;

    const bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'leela-bubble leela-bubble--user' : 'leela-bubble leela-bubble--assistant';
    bubble.textContent = text;
    area.appendChild(bubble);
    area.scrollTop = area.scrollHeight;
  }

  function showTyping() {
    const area = msgArea();
    if (!area) return;
    const el = document.createElement('div');
    el.className = 'leela-bubble leela-bubble--assistant leela-typing';
    el.id = 'leelaTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('leelaTyping');
    if (el) el.remove();
  }

  function renderSuggestions(suggestions) {
    const area = msgArea();
    if (!area || !suggestions || !suggestions.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'leela-suggestions';
    wrap.id = 'leelaSuggestions';
    suggestions.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'leela-suggestion-btn';
      btn.textContent = s;
      btn.onclick = () => {
        wrap.remove();
        window.leelaMsg(s);
      };
      wrap.appendChild(btn);
    });
    area.appendChild(wrap);
    area.scrollTop = area.scrollHeight;
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  async function send(text) {
    text = (text || '').trim();
    if (!text || isSending) return;

    const sugg = document.getElementById('leelaSuggestions');
    if (sugg) sugg.remove();

    isSending = true;
    const btn = sendBtn();
    const inp = inputEl();
    if (btn) btn.disabled = true;
    if (inp) { inp.value = ''; inp.disabled = true; }

    history.push({ role: 'user', content: text });
    appendMessage('user', text);
    showTyping();

    try {
      const res = await fetch('/api/leela-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, context: _context }),
      });

      hideTyping();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage('assistant', `Sorry, I ran into a problem: ${err.error || res.statusText}. Please try again.`);
        history.pop(); // remove the failed user message
      } else {
        const { reply } = await res.json();
        history.push({ role: 'assistant', content: reply });
        appendMessage('assistant', reply);
      }
    } catch (err) {
      hideTyping();
      appendMessage('assistant', 'Sorry, I couldn\'t connect right now. Please check your connection and try again.');
      history.pop();
    }

    isSending = false;
    if (btn) btn.disabled = false;
    if (inp) inp.disabled = false;
    if (inp) inp.focus();
  }

  // Public: called by quick-question buttons.
  window.leelaMsg = send;
  // Backwards compat.
  window.luminaMsg = send;

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    const area = msgArea();
    const inp  = inputEl();
    const btn  = sendBtn();

    if (!area) return; // page doesn't have the Leela panel

    // Initial greeting.
    const greeting = area.dataset.greeting ||
      "Hello! I'm Leela, your trust document assistant. I can explain trust concepts, guide you through each step of the builder, and help clarify any terminology. What would you like to know?";
    appendMessage('assistant', greeting);
    history.push({ role: 'assistant', content: greeting });

    // Initial suggestion buttons (passed via data-suggestions JSON on the area element).
    try {
      const sugg = JSON.parse(area.dataset.suggestions || '[]');
      if (sugg.length) renderSuggestions(sugg);
    } catch { /* ignore bad JSON */ }

    // Send on button click.
    if (btn) btn.addEventListener('click', () => send(inp?.value));

    // Send on Enter (not Shift+Enter).
    if (inp) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inp.value); }
      });
    }
  });
})();
