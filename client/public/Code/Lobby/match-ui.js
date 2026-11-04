/* match-ui.js — Find Match ฝั่งไคลเอนต์: ส่งคำขอหาแมตช์ · โหวตรอต่อ/เติมบอท · นับเวลา (ค้นหา/นับถอยหลัง/โหวต)
   ตัวห้องล็อบบี้ที่แสดงสถานะอยู่ใน gamegx.js (gxRoom) · ฝั่งเซิร์ฟเวอร์: match:find / match:choice ใน server/src/index.js
   ห้องแรงก์ (matchFind(true)): ต้องล็อกอิน · กติกามาตรฐาน · ไม่มีบอท · ครบ 4 คนมีหน้าต่างกดพร้อม (ห้องธรรมดาก็ใช้หน้าต่างนี้)
   Public: matchFind(ranked) · rankedFind(rule) · matchAccept() · matchVote('wait'|'bots') */
(function () {
  'use strict';
  window.matchFind = function (ranked) {
    conn(); if (!sock) return; nick = (($('au') && $('au').value) || nick || 'ผู้เล่น').trim().slice(0, 14) || 'ผู้เล่น'; sv.name = nick; try { localStorage.setItem('dummyName', nick); } catch (e) {}
    const m = ruleMeta(createSel.rule); soloRoom = false;
    sock.emit('match:find', { name: nick, s5: (typeof skStar5 === 'function' ? skStar5(myChar()) : false), e2: (typeof skStars === 'function' && skStars(myChar()) >= 2), ch: myChar(), bg: myBg(), fr: (typeof myFrame === 'function' ? myFrame() : null), rule: m ? m.id : undefined, options: m ? ruleOpts(m) : {}, farm: window.Farm ? Farm.get() : 'coins', ranked: ranked === true });
  };
  // ปุ่มแรงก์: เกมที่เลือกอยู่ (หรือเกมที่ส่งมาจากหน้าอันดับ)
  window.rankedFind = function (rule) {
    if (!(window.DB && DB.enabled && DB.P)) { lerr = 'ต้องล็อกอินก่อนเล่นแรงก์'; if (window.dbToast) dbToast('🔒 ต้องล็อกอินก่อนเล่นแรงก์'); return render(); }
    if (rule && ruleMeta(rule)) createSel.rule = rule;
    conn(); if (sock && sock.connected) { lerr = ''; window.matchFind(true); } else { lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ ลองอีกครั้ง'; if (window.dbToast) dbToast(lerr); render(); }
  };
  window.matchAccept = function () { if (sock && sock.connected) sock.emit('match:accept'); };
  window.matchVote = function (c) { if (sock && sock.connected) sock.emit('match:choice', { c }); };
  const mmss = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  setInterval(() => {
    const M = typeof lob !== 'undefined' && lob && lob.match; if (!M) return; const dt = Date.now() - (lob._t0 || Date.now());
    document.querySelectorAll('.mm-el').forEach(e => { e.textContent = mmss((M.waitedMs + dt) / 1000); });
    document.querySelectorAll('.mm-rl').forEach(e => { if (M.readyLeftMs != null) e.textContent = Math.max(0, Math.ceil((M.readyLeftMs - dt) / 1000)); });
    document.querySelectorAll('.mm-rbar i').forEach(e => { if (M.readyLeftMs != null) e.style.width = Math.max(0, (M.readyLeftMs - dt) / (M.readyMs || 15000) * 100) + '%'; });
    document.querySelectorAll('.mm-pl').forEach(e => { if (M.prompt) e.textContent = Math.max(0, Math.ceil((M.prompt.leftMs - dt) / 1000)); });
  }, 250);
})();
