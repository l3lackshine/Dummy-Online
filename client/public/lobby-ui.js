/* lobby-ui.js — ล็อบบี้ห้องเพื่อน: ปุ่มพร้อม · ชวนเพื่อน (คัดลอกลิงก์/รหัส) · อีโมจิ · เปิดลิงก์เชิญ ?room=CODE
                 + แอนิเมชันสับไพ่ก่อนแจกไพ่ "ทุกตา" (ผลการสับ/แจกจริงมาจากเซิร์ฟเวอร์ — นี่คือภาพเคลื่อนไหวเท่านั้น)
   Public: toggleReady() · copyInvite() · sendEmote(e)
   Extend: เพิ่มอีโมจิที่ gamegx.js (รายการปุ่ม) และ server/src/index.js (EMOTES) · ปรับเวลาสับที่ SHUFFLE_MS */
(function () {
  'use strict';
  const SHUFFLE_MS = 1700;
  const toast = t => { const d = document.createElement('div'); d.className = 'sk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); };
  const me = () => (typeof lob !== 'undefined' && lob && lob.players ? lob.players.find(p => p.you) : null);
  window.toggleReady = function () { if (!sock || !sock.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'); const m = me(); sock.emit('game:ready', { ready: !(m && m.ready) }); };
  window.sendEmote = function (e) { if (sock && sock.connected) sock.emit('room:emote', { e }); };
  window.copyInvite = function () {
    const link = location.origin + location.pathname + '?room=' + encodeURIComponent(code), text = 'ชวนเล่นไพ่ดัมมี่ออนไลน์ รหัสห้อง ' + code + '\n' + link;
    const done = () => toast('คัดลอกลิงก์เชิญแล้ว — ส่งให้เพื่อนได้เลย');
    try { if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ title: 'Dummy Online', text, url: link }).catch(() => {}); return; } } catch (e) {}
    try { navigator.clipboard.writeText(text).then(done, () => toast('รหัสห้อง: ' + code)); } catch (e) { toast('รหัสห้อง: ' + code); }
  };
  // ---------- อีโมจิลอยกลางโต๊ะ ----------
  function hook() {
    if (typeof sock === 'undefined' || !sock || sock._lb) return; sock._lb = 1;
    sock.on('room:emote', d => { if (!d) return; const el = document.createElement('div'); el.className = 'lb-emote'; el.innerHTML = '<span>' + d.e + '</span><small></small>'; el.querySelector('small').textContent = d.from; el.style.left = (30 + Math.random() * 40) + '%'; document.body.appendChild(el); setTimeout(() => el.remove(), 2200); });
  }
  setInterval(hook, 700);
  // ---------- ลิงก์เชิญ ?room=CODE → เปิดช่องใส่รหัสให้ (ผู้เล่นกดเข้าห้องเอง) ----------
  try { const m = /[?&]room=([A-Za-z0-9]{4,8})/.exec(location.search); if (m) { const c = m[1].toUpperCase(); let n = 0; const t = setInterval(() => { if (typeof joinCode !== 'undefined' && typeof render === 'function' && typeof authed !== 'undefined') { clearInterval(t); joinCode = c; joinOpen = true; if (typeof screen !== 'undefined' && !code) screen = 'play'; render(); history.replaceState(null, '', location.pathname); } else if (++n > 50) clearInterval(t); }, 200); } } catch (e) {}
  // ---------- แอนิเมชันสับไพ่ก่อนแจก (ทุกตา) ----------
  function showShuffle() {
    if (document.getElementById('shfx')) return;
    const d = document.createElement('div'); d.id = 'shfx';
    d.innerHTML = '<div class="deckbox go">' + Array.from({ length: 12 }, (_, i) => '<i style="--i:' + i + ';--s:' + (i % 2 ? 1 : -1) + '"></i>').join('') + '</div><b>กำลังสับไพ่…</b>';
    document.body.appendChild(d); try { if (window.Assets) Assets.play('shuffle'); } catch (e) {}
  }
  const hideShuffle = () => { const d = document.getElementById('shfx'); if (d) { d.classList.add('out'); setTimeout(() => d.remove(), 250); } };
  if (typeof dealBegin === 'function' && typeof dealMs === 'function') {
    const orig = dealBegin;
    window.dealBegin = dealBegin = function () {
      if (dealMs() <= 0 || (typeof reducedMotion === 'function' && reducedMotion())) return orig.apply(this, arguments);
      const d = deal; showShuffle();
      setTimeout(() => { hideShuffle(); if (deal === d && d) orig(); }, SHUFFLE_MS);
    };
  }
})();
