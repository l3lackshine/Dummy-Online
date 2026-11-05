/* feats.js (ป๊อกเด้ง) — ท่าพิเศษของที่นั่งหนึ่งตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับเกม)
   Public: feats(G, seat) → ['pok', 'pok9', 'tong', 'sflush', 'straight', 'sam', 'dealer_win']
   EXTEND: ท่าใหม่ = เพิ่มชื่อ (a-z 0-9 _) ที่นี่ แล้วเพิ่มความสำเร็จใน client/public/skin/achievements.json */
const { evalHand } = require('./engine');

function feats(G, seat) {
  if (!G || !G.over || !G.res || !G.P[seat]) return [];
  const out = [];
  const hand = evalHand(G.P[seat].h, G.straights);
  if (hand.type === 'pok') out.push('pok');
  if (hand.type === 'pok' && hand.taem === 9) out.push('pok9');
  if (['tong', 'sflush', 'straight', 'sam'].includes(hand.type)) out.push(hand.type);
  const delta = (G.res.coin && G.res.coin.delta) || [];
  if (seat === G.dealer && delta[seat] > 0) out.push('dealer_win');
  return out;
}

module.exports = { feats };
