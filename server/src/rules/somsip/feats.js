/* feats.js (ผสมสิบ) — ท่าพิเศษของผู้ชนะตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับเกม)
   Public: feats(G, seat) → ['special', 'sp_aces', 'sp_suit', 'nojoker']
   EXTEND: มือพิเศษใหม่ใน engine.js special() = เพิ่มชื่อใน SPECIAL_FEATS ที่นี่ + ความสำเร็จใน client/public/skin/achievements.json */
const { winKind, wildFn } = require('./engine');

const SPECIAL_FEATS = { 'A สามใบ': 'sp_aces', 'ดอกเดียวกัน 6 ใบ': 'sp_suit' };

function feats(G, seat) {
  if (!G || !G.over || !G.res || G.res.k !== seat || !G.P[seat]) return [];
  const hand = G.P[seat].h;
  const win = winKind(G, hand);
  if (!win) return [];
  if (win.kind === 'special') return ['special', SPECIAL_FEATS[win.name]].filter(Boolean);
  const isWild = wildFn(G);
  return hand.some(isWild) ? [] : ['nojoker'];
}

module.exports = { feats };
