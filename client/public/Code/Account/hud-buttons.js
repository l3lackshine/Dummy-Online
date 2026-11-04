/* hud-buttons.js — ปุ่มเควส 📜 และรางวัลล็อกอิน 🎁 บนแถบ HUD (โหมดบัญชีเท่านั้น) พร้อมป้ายจำนวนที่รอรับ
   วาดหลัง render() ทุกครั้ง (ห่อ render) — HUD ถูกวาดใหม่ทุกหน้า
   Public: HudButtons.paint() */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;

  // สร้างปุ่มครั้งแรก (วางก่อนป้ายเหรียญ) แล้วอัปเดตเฉพาะเนื้อในเมื่อเปลี่ยน
  function ensureButton(hud, cssClass, label, onClick, html) {
    let button = hud.querySelector('.' + cssClass);
    if (!button) {
      button = document.createElement('button');
      button.className = 'hud-sk ' + cssClass;
      button.setAttribute('aria-label', label);
      button.onclick = onClick;
      const coin = hud.querySelector('.coin-pill');
      if (coin) hud.insertBefore(button, coin);
      else hud.appendChild(button);
    }
    if (button.innerHTML !== html) button.innerHTML = html;
  }

  function paint() {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    const login = (DB.P && DB.P.login) || null;
    const ready = window.dummyQuests && dummyQuests.claimable ? dummyQuests.claimable() : 0;
    ensureButton(hud, 'hud-q', 'เควส', () => openQuests(), '📜' + (ready ? '<i>' + ready + '</i>' : ''));
    ensureButton(hud, 'hud-dl', 'รางวัลล็อกอิน', () => openDaily(), '🎁' + (login && !login.claimed ? '<i>!</i>' : ''));
  }

  if (typeof render === 'function') {
    const previousRender = render;
    window.render = render = function () {
      const result = previousRender.apply(this, arguments);
      try {
        paint();
      } catch (e) {}
      return result;
    };
  }

  window.HudButtons = { paint };
})();
