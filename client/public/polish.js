/* polish.js — เอฟเฟกต์ตกแต่ง: กลีบซากุระลอยบนหน้าโต๊ะ + พลุกระดาษเมื่อชนะ (ไม่ยุ่งกับสถานะเกม) */
(() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduce) return;
  const app = document.getElementById('app');
  const fx = document.createElement('div'); fx.id = 'pl-fx'; fx.style.display = 'none';
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;--dx:${(Math.random() * 16 - 8)}vw;--rot:${360 + Math.random() * 540}deg;` +
      `animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 14}s;transform:scale(${.7 + Math.random() * .8})`;
    fx.appendChild(p);
  }
  document.body.appendChild(fx);
  const COL = ['#ffd25a', '#ff7aa8', '#6fc2ff', '#78e08f', '#fff'];
  let lastWin = null;
  const confetti = () => {
    const w = document.createElement('div'); w.id = 'pl-win';
    for (let i = 0; i < 70; i++) {
      const b = document.createElement('b');
      b.style.cssText = `left:${Math.random() * 100}%;background:${COL[i % COL.length]};--dx:${(Math.random() * 30 - 15)}vw;--rot:${Math.random() * 900}deg;` +
        `animation-duration:${2.2 + Math.random() * 2}s;animation-delay:${Math.random() * .8}s`;
      w.appendChild(b);
    }
    document.body.appendChild(w); setTimeout(() => w.remove(), 5500);
  };
  const tick = () => {
    fx.style.display = app.classList.contains('gx') ? '' : 'none';
    try {
      if (typeof S !== 'undefined' && S && S.over && S.gid && S.gid !== lastWin) {
        lastWin = S.gid;
        const c = S.res && S.res.coin, win = c && c.delta ? (c.delta[S.my] || 0) > 0 : (S.res && S.res.k === S.my);
        if (win) confetti();
      }
    } catch (e) { /* ไม่ให้เอฟเฟกต์ทำเกมพัง */ }
  };
  new MutationObserver(tick).observe(app, { childList: true, attributes: true, attributeFilter: ['class'] });
  tick();
})();
