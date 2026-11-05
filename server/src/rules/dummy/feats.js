/* feats.js (ดัมมี่) — ท่าพิเศษของที่นั่งหนึ่งตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับแต้ม/เหรียญ/กติกา)
   Public: feats(G, seat) → ['knock', 'knock_dark', 'knock_suit', 'head', 'speto']
   EXTEND: ท่าใหม่ = เพิ่มชื่อ (a-z 0-9 _) ในฟังก์ชันนี้ แล้วเพิ่มความสำเร็จที่ใช้ "feat": "<ชื่อ>" ใน client/public/skin/achievements.json */
const { sp } = require('./cards');

function feats(G, seat) {
  if (!G || !G.over || !G.res) return [];
  const out = [];
  const myMelds = (G.melds || []).filter(meld => meld.o === seat);
  if (G.res.k === seat) {
    out.push('knock');
    if (!G.startM) out.push('knock_dark'); // น็อกโดยตานั้นยังไม่เคยเกิดมาก่อน (คิดแต้มคูณ 2 ใน engine.js)
    if (G.P[seat].suits && G.P[seat].suits.size === 1) out.push('knock_suit');
  }
  if (myMelds.some(meld => meld.cs.some(card => card.head))) out.push('head');
  if (myMelds.some(meld => meld.cs.some(sp))) out.push('speto');
  return out;
}

module.exports = { feats };
