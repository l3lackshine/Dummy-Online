/* landscape.js — บังคับเล่นแนวนอนตั้งแต่หน้าแรก
   - แอป Android (Capacitor): ล็อกที่ AndroidManifest (ดู mobile/prepare.js)
   - เว็บมือถือ: แตะครั้งแรกเพื่อเข้าเต็มจอ + ล็อกแนวนอน (ทำได้เฉพาะเบราว์เซอร์ที่รองรับ) · ถ้ายังเป็นแนวตั้ง จะมีหน้าจอบอกให้หมุนเครื่อง */
(function () {
  var so = screen.orientation, de = document.documentElement;
  function lock() {
    try { var p = so && so.lock && so.lock('landscape'); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function goFull() {
    try {
      var rq = de.requestFullscreen || de.webkitRequestFullscreen;
      if (rq && !document.fullscreenElement) { var r = rq.call(de); if (r && r.then) r.then(lock, lock); else lock(); } else lock();
    } catch (e) { lock(); }
  }
  lock();
  var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  if (coarse) addEventListener('pointerdown', function once() { removeEventListener('pointerdown', once); goFull(); }, { passive: true });
  function mk() {
    if (document.getElementById('rotHint')) return;
    var d = document.createElement('div'); d.id = 'rotHint';
    d.innerHTML = '<div class=rh-ico>📱</div><b>กรุณาหมุนเครื่องเป็นแนวนอน</b><small>เกมนี้เล่นแนวนอนเท่านั้น</small><button type=button>แตะเพื่อเต็มจอ</button>';
    d.querySelector('button').onclick = goFull; document.body.appendChild(d);
  }
  if (document.body) mk(); else addEventListener('DOMContentLoaded', mk);
})();
