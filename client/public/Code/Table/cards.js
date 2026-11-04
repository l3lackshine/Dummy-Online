/* cards.js — ไพ่ 52 ใบ (ชุดไพ่ · แต้ม · สเปโต) + HTML ของไพ่ 1 ใบ
   Public: SU · RK · ALL · sp(card) · cn(card) · face(id, cls, attrs) · mini(id) */
const SU = ['♠', '♥', '♦', '♣'],
  RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL = Array.from({ length: 52 }, (_, i) => ({ id: i, r: (i % 13) + 1, s: (i / 13) | 0 }));
const sp = c => (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0),
  cn = c => RK[c.r] + SU[c.s];
const face = (id, cls = '', x = '') => {
  const c = ALL[id];
  return `<button ${x} class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}${cls}">${RK[c.r]}<span>${SU[c.s]}</span></button>`;
};
const mini = id => {
  const c = ALL[id];
  return `<span class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}">${RK[c.r]}<span>${SU[c.s]}</span></span>`;
};
