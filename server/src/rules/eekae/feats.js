/* feats.js (อีแก่) — ท่าพิเศษของที่นั่งหนึ่งตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับเกม)
   Public: feats(G, seat) → ['first', 'safe', 'close', 'oldmaid']
   close = หนีรอดเป็นคนสุดท้าย (เหลือสองคนสู้กันแล้วรอด) — แยกจาก first เพราะคนหมดไพ่คนแรกคือผู้ชนะอันดับ 1 อยู่แล้ว
   EXTEND: ท่าใหม่ = เพิ่มชื่อ (a-z 0-9 _) ที่นี่ แล้วเพิ่มความสำเร็จใน client/public/skin/achievements.json */
function feats(G, seat) {
  if (!G || !G.over || !G.res) return [];
  if (G.res.loser === seat) return ['oldmaid'];
  const out = ['safe'];
  const escaped = G.out || [];
  if (escaped[0] === seat) out.push('first');
  if (escaped.length > 1 && escaped[escaped.length - 1] === seat) out.push('close');
  return out;
}

module.exports = { feats };
