/* shuffle-animation.js — แอนิเมชันสับไพ่ก่อนแจกไพ่ "ทุกตา" (ผลการสับ/แจกจริงมาจากเซิร์ฟเวอร์ — นี่คือภาพเคลื่อนไหวเท่านั้น)
   ห่อ dealBegin ของ Code/Table/deal-animation.js · ปรับเวลาสับที่ SHUFFLE_MS */
(function () {
  'use strict';
  const SHUFFLE_MS = 1700;
  // ---------- แอนิเมชันสับไพ่ก่อนแจก (ทุกตา) ----------
  function showShuffle() {
    if (document.getElementById('shfx')) return;
    const d = document.createElement('div');
    d.id = 'shfx';
    d.innerHTML =
      '<div class="deckbox go">' +
      Array.from({ length: 12 }, (_, i) => '<i style="--i:' + i + ';--s:' + (i % 2 ? 1 : -1) + '"></i>').join('') +
      '</div><b>กำลังสับไพ่…</b>';
    document.body.appendChild(d);
    try {
      if (window.Assets) Assets.play('shuffle');
    } catch (e) {}
  }
  const hideShuffle = () => {
    const d = document.getElementById('shfx');
    if (d) {
      d.classList.add('out');
      setTimeout(() => d.remove(), 250);
    }
  };
  if (typeof dealBegin === 'function' && typeof dealMs === 'function') {
    const orig = dealBegin;
    window.dealBegin = dealBegin = function () {
      if (dealMs() <= 0 || (typeof reducedMotion === 'function' && reducedMotion())) return orig.apply(this, arguments);
      const d = deal;
      showShuffle();
      setTimeout(() => {
        hideShuffle();
        if (deal === d && d) orig();
      }, SHUFFLE_MS);
    };
  }
})();
