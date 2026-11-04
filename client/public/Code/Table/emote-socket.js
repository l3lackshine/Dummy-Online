/* emote-socket.js — ส่งอีโมจิ (room:emote) + แสดงอีโมจิที่คนอื่นส่ง: บนโต๊ะใช้ Emote.showTable (Code/Table/emote.js) · หน้าอื่นลอยกลางจอ
   Public: sendEmote(e)
   Extend: เพิ่มอีโมจิที่ gamegx.js (รายการปุ่ม) และ server/src/events/emote-events.js */
(function () {
  'use strict';
  window.sendEmote = function (e) {
    if (sock && sock.connected) sock.emit('room:emote', { e });
  };
  // ---------- อีโมจิลอยกลางโต๊ะ ----------
  function hook() {
    if (typeof sock === 'undefined' || !sock || sock._lb) return;
    sock._lb = 1;
    sock.on('room:emote', d => {
      if (!d) return;
      if (typeof screen !== 'undefined' && screen === 'game' && window.Emote && Emote.showTable(d)) return;
      const el = document.createElement('div');
      el.className = 'lb-emote';
      el.innerHTML = (window.Emote ? Emote.html(d) : '<span>' + d.e + '</span>') + '<small></small>';
      el.querySelector('small').textContent = d.from;
      el.style.left = 30 + Math.random() * 40 + '%';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    });
  }
  setInterval(hook, 700);
})();
