/* seatfx.js — ป้ายแต้มลอยตรงที่นั่ง (ดัมมี่): ทุกคนในโต๊ะเห็นเหมือนกัน
   ข้อมูลจากเซิร์ฟเวอร์ S.ev = [{s: ลำดับ, i: ที่นั่ง, t: การกระทำ, d: แต้ม}] (engine.js ev())
   ข้อความ: "<ชื่อ> <การกระทำ> +N แต้ม" (บวกสีเขียว ลบสีแดง) · ตัวเราเองแสดงว่า "คุณ" */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  let gid = null, last = 0;
  const busy = {};   // ที่นั่ง → เวลาที่ป้ายล่าสุดเริ่ม (ซ้อนป้ายไม่ให้ทับกัน)
  function seatEl(i) { return i === S.my ? document.querySelector('.gx-me') : document.querySelector(`.gx-seat[data-seat="${i}"]`); }
  function show(e) {
    const el = seatEl(e.i), r = el && el.getBoundingClientRect();
    const name = e.i === S.my ? 'คุณ' : ((S.P[e.i] || {}).n || '');
    const f = document.createElement('div'); f.className = 'seat-fx' + (e.d > 0 ? ' up' : ' down');
    f.innerHTML = `<span>${E(name)} ${E(e.t)}</span> <b>${e.d > 0 ? '+' : '−'}${Math.abs(e.d)}</b> <span>แต้ม</span>`;
    const now = Date.now(), k = busy[e.i] && now - busy[e.i].t < 900 ? busy[e.i].n + 1 : 0; busy[e.i] = { t: now, n: k };
    const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top - 6 : innerHeight * 0.4;
    f.style.left = Math.max(80, Math.min(innerWidth - 80, x)) + 'px'; f.style.top = Math.max(30, y - k * 30) + 'px';
    document.body.appendChild(f); setTimeout(() => f.remove(), 2800);
  }
  setInterval(() => {
    if (typeof S === 'undefined' || !S || typeof screen === 'undefined' || screen !== 'game' || (S.rule && S.rule !== 'dummy')) return;
    if (S.gid !== gid) { gid = S.gid; last = 0; }
    if (typeof deal !== 'undefined' && deal) return;
    (S.ev || []).forEach(e => { if (e.s > last) { last = e.s; try { show(e); } catch (x) {} } });
  }, 150);
})();
