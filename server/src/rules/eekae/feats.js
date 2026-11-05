/* feats.js (อีแก่) — ท่าพิเศษของที่นั่งหนึ่งตอนจบตา ส่งไปบันทึกเพื่อนับความสำเร็จ (ไม่มีผลกับเกม)
   Public: feats(G, seat) → ['first', 'safe', 'oldmaid']
   EXTEND: ท่าใหม่ = เพิ่มชื่อ (a-z 0-9 _) ที่นี่ แล้วเพิ่มความสำเร็จใน client/public/skin/achievements.json */
function feats(G, seat) {
  if (!G || !G.over || !G.res) return [];
  if (G.res.loser === seat) return ['oldmaid'];
  const out = ['safe'];
  if ((G.out || [])[0] === seat) out.push('first');
  return out;
}

module.exports = { feats };
