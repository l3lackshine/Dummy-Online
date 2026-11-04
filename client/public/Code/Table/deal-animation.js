/* deal-animation.js — แจกไพ่ทีละใบ (ภาพเคลื่อนไหวเท่านั้น ผลการแจกจริงมาจากเซิร์ฟเวอร์แล้ว)
   ลดการเคลื่อนไหว (prefers-reduced-motion) หรือ CFG.DEAL_MS = 0 → ข้ามแอนิเมชัน
   Public: startDeal(state) · clearDeal() · dealView(state) · dealBegin() · skipDeal() */

// ===== แจกไพ่ทีละใบ: ไพ่ใบละใบบินจากกองจั่วไปหาผู้เล่นทีละคนวนรอบ (ผลการแจกจริงมาจากเซิร์ฟเวอร์แล้ว นี่คือภาพเคลื่อนไหวเท่านั้น) =====
const dealMs = () => (CFG.DEAL_MS != null ? Number(CFG.DEAL_MS) : 85);
const reducedMotion = () => {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
};
const qa = q => (document.querySelectorAll ? document.querySelectorAll(q) : []);
function dealView(r) {
  return Object.assign({}, r, {
    hand: [],
    stock: 52,
    disc: [],
    melds: [],
    ok: [],
    phase: null,
    must: null,
    cur: -1,
    logs: ['กำลังแจกไพ่...'],
    P: r.P.map(p => Object.assign({}, p, { n_cards: 0 })),
  });
}
function startDeal(s) {
  if (dealMs() <= 0 || reducedMotion()) return;
  clearDeal();
  closePile();
  deal = {
    gid: s.gid,
    seats: s.P.length,
    total: 7 * s.P.length,
    launched: 0,
    landed: 0,
    cnt: s.P.map(() => 0),
    built: false,
    t: null,
    t2: null,
    safe: null,
  };
}
function clearDeal() {
  if (!deal) return;
  clearTimeout(deal.t);
  clearTimeout(deal.t2);
  clearTimeout(deal.safe);
  deal = null;
  qa('.fly').forEach(e => e.remove());
}
function dealBegin() {
  const d = deal;
  const ar = document.querySelector('.arena');
  if (ar && ar.setAttribute) ar.setAttribute('onclick', 'skipDeal()');
  d.t = setTimeout(() => dealTick(d), 350);
  d.safe = setTimeout(() => {
    if (deal === d) skipDeal();
  }, 9000);
}
function dealTick(d) {
  if (deal !== d || d.launched >= d.total) return;
  const seat = d.launched % d.seats;
  d.launched++;
  paintStock();
  flyCard(d, seat);
  d.t = setTimeout(() => dealTick(d), dealMs());
}
function seatTarget(seat) {
  return seat === S.my ? document.querySelector('.dock .hand') : document.querySelector('[data-seat="' + seat + '"]');
}
function flyCard(d, seat) {
  const from = document.querySelector('.felt .piles .back'),
    to = seatTarget(seat);
  if (!from || !to || !document.createElement) return dealLand(d, seat);
  const a = from.getBoundingClientRect(),
    b = to.getBoundingClientRect(),
    el = document.createElement('div');
  el.className = 'fly';
  el.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2),
    dy = b.top + b.height / 2 - (a.top + a.height / 2),
    rot = Math.round((Math.random() - 0.5) * 50);
  let done = false;
  const fin = () => {
    if (done) return;
    done = true;
    el.remove();
    dealLand(d, seat);
  };
  if (el.animate)
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg) scale(1)' },
        { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.82)` },
      ],
      { duration: 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
    ).onfinish = fin;
  setTimeout(fin, 420);
}
function dealLand(d, seat) {
  if (deal !== d) return;
  d.cnt[seat]++;
  d.landed++;
  paintDeal();
  if (d.landed >= d.total && !d.t2) d.t2 = setTimeout(() => finishDeal(d), 320);
}
function paintStock() {
  const b = document.querySelector('.felt .piles .back');
  if (b && deal) b.textContent = 52 - deal.launched;
}
function paintDeal() {
  if (!deal || !S) return;
  deal.cnt.forEach((n, i) =>
    qa('[data-pc="' + i + '"]').forEach(e => {
      e.textContent = n;
    })
  );
  const h = document.querySelector('.dock .hand');
  if (h && h.children && h.insertAdjacentHTML)
    for (let k = h.children.length; k < deal.cnt[S.my] && k < S.hand.length; k++)
      h.insertAdjacentHTML('beforeend', face(S.hand[k], ' new'));
}
function finishDeal(d) {
  if (!deal || (d && deal !== d)) return;
  clearDeal();
  render();
}
function skipDeal() {
  finishDeal();
}
