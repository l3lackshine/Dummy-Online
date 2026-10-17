const meta = {
  id: 'pokdeng', name: 'ป๊อกเด้ง', icon: '🃏', desc: 'ป๊อกเด้ง Basic · ไพ่ 2 ใบแรกเป็นป๊อก 8/9 ได้เปรียบ · เดิมพันเหรียญเสมือน',
  minPlayers: 2, maxPlayers: 6,
  options: [{ key: 'stake', label: 'เดิมพันต่อคน (เหรียญ)', type: 'number', default: 20, min: 1, max: 10000, step: 1, presets: [5, 10, 20, 50, 100] }],
  scoring: ['🏆 เทียบกับเจ้ามือ: ชนะได้ {stake} 🪙 · แพ้เสีย {stake} 🪙 · เสมอไม่เปลี่ยนเหรียญ', '♠ ป๊อก 9 ชนะป๊อก 8 · ป๊อกมีเฉพาะไพ่ 2 ใบแรก · รุ่น Basic ยังไม่ใช้ตัวคูณเด้ง']
};
module.exports = { meta };
