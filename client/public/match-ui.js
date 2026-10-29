/* match-ui.js — Find Match ฝั่งไคลเอนต์: ส่งคำขอหาแมตช์ · โหวตรอต่อ/เติมบอท · นับเวลา (ค้นหา/นับถอยหลัง/โหวต)
   ตัวห้องล็อบบี้ที่แสดงสถานะอยู่ใน gamegx.js (gxRoom) · ฝั่งเซิร์ฟเวอร์: match:find / match:choice ใน server/src/index.js
   Public: matchFind() · matchVote('wait'|'bots') */
(function () {
  'use strict';
  window.matchFind = function () {
    conn(); if (!sock) return; nick = (($('au') && $('au').value) || nick || 'ผู้เล่น').trim().slice(0, 14) || 'ผู้เล่น'; sv.name = nick; try { localStorage.setItem('dummyName', nick); } catch (e) {}
    const m = ruleMeta(createSel.rule); soloRoom = false;
    sock.emit('match:find', { name: nick, ch: myChar(), bg: myBg(), fr: (typeof myFrame === 'function' ? myFrame() : null), rule: m ? m.id : undefined, options: m ? ruleOpts(m) : {} });
  };
  window.matchVote = function (c) { if (sock && sock.connected) sock.emit('match:choice', { c }); };
  const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  setInterval(() => {
    const M = typeof lob !== 'undefined' && lob && lob.match; if (!M) return; const dt = Date.now() - (lob._t0 || Date.now());
    document.querySelectorAll('.mm-el').forEach(e => { e.textContent = mmss((M.waitedMs + dt) / 1000); });
    document.querySelectorAll('.mm-cdn').forEach(e => { if (M.cdLeftMs != null) e.textContent = Math.max(1, Math.ceil((M.cdLeftMs - dt) / 1000)); });
    document.querySelectorAll('.mm-pl').forEach(e => { if (M.prompt) e.textContent = Math.max(0, Math.ceil((M.prompt.leftMs - dt) / 1000)); });
  }, 250);
})();
