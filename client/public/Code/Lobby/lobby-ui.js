/* lobby-ui.js — ล็อบบี้ห้องเพื่อน: ปุ่มพร้อม · ชวนเพื่อน (คัดลอกลิงก์/รหัส) · เปิดลิงก์เชิญ ?room=CODE
   Public: toggleReady() · copyInvite()
   อีโมจิอยู่ที่ Code/Table/emote-socket.js · แอนิเมชันสับไพ่อยู่ที่ Code/Table/shuffle-animation.js */
(function () {
  'use strict';
  const toast = t => {
    const d = document.createElement('div');
    d.className = 'sk-toast';
    d.textContent = t;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  };
  const me = () => (typeof lob !== 'undefined' && lob && lob.players ? lob.players.find(p => p.you) : null);
  window.toggleReady = function () {
    if (!sock || !sock.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์');
    const m = me();
    sock.emit('game:ready', { ready: !(m && m.ready) });
  };
  window.copyInvite = function () {
    const link = location.origin + location.pathname + '?room=' + encodeURIComponent(code),
      text = 'ชวนเล่นไพ่ดัมมี่ออนไลน์ รหัสห้อง ' + code + '\n' + link;
    const done = () => toast('คัดลอกลิงก์เชิญแล้ว — ส่งให้เพื่อนได้เลย');
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        navigator.share({ title: 'Dummy Online', text, url: link }).catch(() => {});
        return;
      }
    } catch (e) {}
    try {
      navigator.clipboard.writeText(text).then(done, () => toast('รหัสห้อง: ' + code));
    } catch (e) {
      toast('รหัสห้อง: ' + code);
    }
  };
  // ---------- ลิงก์เชิญ ?room=CODE → เปิดช่องใส่รหัสให้ (ผู้เล่นกดเข้าห้องเอง) ----------
  try {
    const m = /[?&]room=([A-Za-z0-9]{4,8})/.exec(location.search);
    if (m) {
      const c = m[1].toUpperCase();
      let n = 0;
      const t = setInterval(() => {
        if (typeof joinCode !== 'undefined' && typeof render === 'function' && typeof authed !== 'undefined') {
          clearInterval(t);
          joinCode = c;
          joinOpen = true;
          if (typeof screen !== 'undefined' && !code) screen = 'play';
          render();
          history.replaceState(null, '', location.pathname);
        } else if (++n > 50) clearInterval(t);
      }, 200);
    }
  } catch (e) {}
})();
