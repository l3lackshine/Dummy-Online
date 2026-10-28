/* playon.js — หน้าสรุปผล: ปุ่ม "เล่นต่อ" ให้ทุกคนยืนยัน + นับถอยหลัง + กลับล็อบบี้เมื่อมีคนออก
   Flow: จบตา → เซิร์ฟเวอร์เปิดหน้าต่างยืนยัน (lob.next) → ทุกคนกดเล่นต่อ = เริ่มตาใหม่เอง
         มีคนกดออก → ที่เหลือกลับล็อบบี้ (room:lobbyback) · ไม่กดทันเวลา → ถูกเชิญออก (room:kicked)
   Public: nextFoot() (ใช้ในหน้าสรุปทั้งดัมมี่และเกมอื่น) · playOn()
   ถ้าเซิร์ฟเวอร์ไม่ส่ง lob.next (ปิดระบบ/รุ่นเก่า) → ใช้ปุ่ม "เล่นอีกตา" ของเจ้าของห้องแบบเดิม */
(function () {
  'use strict';
  const toast = t => { const d = document.createElement('div'); d.className = 'sk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); };
  let seen = null, until = null;
  const secs = () => (until == null ? null : Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  window.playOn = function () { if (sock && sock.connected) sock.emit('game:again', { yes: true }); else toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'); };
  window.nextFoot = function () {
    if (!(typeof lob !== 'undefined' && lob && lob.next && lob.players)) return typeof startBtn === 'function' ? startBtn('▶ เล่นอีกตา') : '';
    if (lob.next !== seen) { seen = lob.next; until = lob.next.leftMs == null ? null : Date.now() + lob.next.leftMs; }
    const me = lob.players.find(p => p.you) || {}, left = secs(), esc2 = typeof esc === 'function' ? esc : String;
    const who = lob.players.filter(p => p.connected !== false).map(p => `<span class="po-p${p.again ? ' y' : ''}">${p.again ? '✅' : '⏳'} ${esc2(p.you ? 'คุณ' : p.name)}</span>`).join('');
    return `<div class=po><button class="po-go${me.again ? ' done' : ''}" onclick=playOn() ${me.again ? 'disabled' : ''}>${me.again ? '✓ ยืนยันแล้ว — รอผู้เล่นอื่น' : '▶ เล่นต่อ'} <span class="po-cd">${left == null ? '' : '(' + left + ')'}</span></button>${lob.players.length > 1 ? `<div class=po-st>${who}</div>` : ''}</div>`;
  };
  setInterval(() => { const s = secs(); document.querySelectorAll('.po-cd').forEach(e => { e.textContent = s == null ? '' : '(' + s + ')'; e.classList.toggle('hot', s != null && s <= 5); }); }, 500);
  function hook() {
    if (typeof sock === 'undefined' || !sock || sock._po) return; sock._po = 1;
    sock.on('room:lobbyback', d => { S = null; if (typeof render === 'function') render(); if (d && d.notice) toast(d.notice); });
    sock.on('room:kicked', d => { toast((d && d.reason) || 'ถูกเชิญออกจากห้อง'); try { leave(); } catch (e) {} });
  }
  setInterval(hook, 700);
})();
