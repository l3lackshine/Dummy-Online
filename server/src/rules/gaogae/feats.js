/* feats.js (เก้าเก) — ท่าพิเศษของที่นั่งหนึ่งตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับเกม)
   Public: feats(G, seat) → ['tong', 'seq', 'sean', 'colour', 'allfold']
   นับไพ่ในมือเฉพาะคนที่ไม่หมอบ (หมอบ = ไม่ได้ใช้มือนั้นสู้)
   EXTEND: ท่าใหม่ = เพิ่มชื่อ (a-z 0-9 _) ที่นี่ แล้วเพิ่มความสำเร็จใน client/public/skin/achievements.json */
const { evalHand } = require('./engine');

const HAND_FEATS = ['tong', 'seq', 'sean', 'colour'];

function feats(G, seat) {
  const player = G && G.P[seat];
  if (!G || !G.over || !G.res || !player || player.folded) return [];
  const out = [];
  const hand = evalHand(player.h);
  if (HAND_FEATS.includes(hand.type)) out.push(hand.type);
  if (!G.shown && G.res.k === seat) out.push('allfold'); // ทุกคนหมอบ เหลือเราคนเดียว
  return out;
}

module.exports = { feats };
