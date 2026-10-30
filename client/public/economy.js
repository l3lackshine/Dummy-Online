/* economy.js — กติกาเศรษฐกิจของเกม "เล่นแล้วได้ ไม่มีเสีย" (ใช้ไฟล์เดียวกันทั้งเซิร์ฟเวอร์และตัวเกม)
   สำเนาเดียวกันอยู่ที่ client/public/economy.js (เทสต์ test-economy.js ตรวจว่าตรงกัน)
   - ไม่มีการเดิมพันระหว่างผู้เล่น: แต้ม/ชิปในโต๊ะใช้จัดอันดับในตานั้นเท่านั้น
   - จบตาได้เหรียญตามอันดับ (ทุกคนได้ คนแพ้ได้น้อยกว่า) · ห้องที่มีคนจริง ≥2 คนได้ ×1.5
   - วันละได้เต็มจำนวนถึง DAILY_CAP หลังจากนั้นได้ตาละ OVER_CAP (ฐานข้อมูลเป็นคนตัดสินจริง ค่าในนี้ใช้แสดงผล/โหมดไม่ล็อกอิน)
   - EXP ผู้เล่น: ตาละ EXP_PLAY (+EXP_WIN ถ้าได้ที่ 1) · เลเวลถัดไปต้องใช้ 100 + 25×(เลเวล−1)
   Public: Economy.ranks(scores) · Economy.reward(rank, seats, humans) · Economy.expFor(rank) · Economy.levelOf(exp) · Economy.CFG */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Economy = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const CFG = { TOP: 60, BOTTOM: 15, TWO_PLAYER: [50, 20], HUMAN_MULT: 1.5, DAILY_CAP: 1500, OVER_CAP: 5,
    EXP_PLAY: 20, EXP_WIN: 10, LV_BASE: 100, LV_STEP: 25, LV_GEMS: 5, LV10_GEMS: 30, LV10_COINS: 1000 };
  // อันดับแบบแข่งขัน (คะแนนเท่ากัน = อันดับเท่ากัน): [30, 10, 30, -5] → [1, 3, 1, 4]
  function ranks(scores) {
    const s = (scores || []).map(v => Number(v) || 0);
    return s.map(v => 1 + s.filter(x => x > v).length);
  }
  // เหรียญตามอันดับ: ไล่จาก TOP ลงไป BOTTOM เป็นเส้นตรงตามจำนวนที่นั่ง
  function reward(rank, seats, humans) {
    seats = Math.max(2, Math.floor(Number(seats) || 2)); rank = Math.min(seats, Math.max(1, Math.floor(Number(rank) || seats)));
    const base = seats === 2 ? CFG.TWO_PLAYER[rank - 1] : CFG.TOP - (CFG.TOP - CFG.BOTTOM) * (rank - 1) / (seats - 1);
    return Math.round(base * ((Number(humans) || 0) >= 2 ? CFG.HUMAN_MULT : 1));
  }
  const expFor = rank => CFG.EXP_PLAY + (rank === 1 ? CFG.EXP_WIN : 0);
  const needFor = level => CFG.LV_BASE + CFG.LV_STEP * (level - 1);
  // exp สะสม → { level, into (exp ในเลเวลนี้), need (ต้องใช้ทั้งหมดของเลเวลนี้) }
  function levelOf(exp) {
    let lv = 1, left = Math.max(0, Math.floor(Number(exp) || 0));
    while (left >= needFor(lv) && lv < 999) { left -= needFor(lv); lv++; }
    return { level: lv, into: left, need: needFor(lv) };
  }
  // รางวัลขึ้นเลเวล (ได้ตอนขึ้นถึงเลเวลนั้น)
  const levelReward = lv => (lv % 10 === 0 ? { mcash: CFG.LV10_GEMS, coins: CFG.LV10_COINS } : { mcash: CFG.LV_GEMS, coins: 0 });
  return { CFG, ranks, reward, expFor, needFor, levelOf, levelReward };
});
