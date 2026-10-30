/* economy.js — กติกาเศรษฐกิจของเกม "เล่นแล้วได้ ไม่มีเสีย" (ใช้ไฟล์เดียวกันทั้งเซิร์ฟเวอร์และตัวเกม)
   สำเนาเดียวกันอยู่ที่ client/public/economy.js (เทสต์ test-economy.js ตรวจว่าตรงกัน)
   - ไม่มีการเดิมพันระหว่างผู้เล่น: แต้ม/ชิปในโต๊ะใช้จัดอันดับในตานั้นเท่านั้น
   - จบตาได้เหรียญตามอันดับ (ทุกคนได้ คนแพ้ได้น้อยกว่า) · ห้องที่มีคนจริง ≥2 คนได้ ×1.5
   - วันละได้เต็มจำนวนถึง DAILY_CAP หลังจากนั้นได้ตาละ OVER_CAP (ฐานข้อมูลเป็นคนตัดสินจริง ค่าในนี้ใช้แสดงผล/โหมดไม่ล็อกอิน)
   - EXP ผู้เล่น: ตาละ EXP_PLAY (+EXP_WIN ถ้าได้ที่ 1) · เลเวลถัดไปต้องใช้ 100 + 25×(เลเวล−1)
   - สตามิน่า: เล่นกับบอทใช้ตาละ STAMINA.COST · ฟื้น 1 ทุก REGEN_SEC วินาที · สูงสุด 80 +20 ทุก 5 เลเวล (ตันที่ 300) · ชาใช้เติม
     เล่นกับบอท = ฟาร์มของ (เลือก FARM ก่อนเริ่ม) · สตามิน่าไม่พอ = โหมดซ้อม ไม่ได้อะไรเลย · เล่นกับคน = ไม่ใช้สตามิน่า มีเพดานเหรียญรายวัน
   - เลเวลตัวละคร: ใช้คัมภีร์ (ITEMS.charExp) + เหรียญ · เลเวลถึงแล้วปลดช่องชุดแต่งประจำตัวละคร (CHAR.SLOTS)
   ค่า STAMINA/ITEMS/FARM/CHAR ถูกเขียนลงฐานข้อมูลด้วย scripts/gen-economy-sql.js → supabase/v7_config.sql (เทสต์ตรวจว่าตรงกัน)
   Public: Economy.ranks(scores) · Economy.reward(rank, seats, humans) · Economy.expFor(rank) · Economy.levelOf(exp) · Economy.CFG
           Economy.staminaMax(level) · Economy.farmReward(farm, rank, seats) · Economy.charLevelOf(exp) · Economy.charCost(exp) · STAMINA ITEMS FARM CHAR */
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

  // ---------- สตามิน่า ----------
  const STAMINA = { COST: 10, REGEN_SEC: 360, BASE: 80, STEP: 20, EVERY: 5, CAP: 300, HOLD_MAX: 999 };
  const staminaMax = lv => Math.min(STAMINA.CAP, STAMINA.BASE + STAMINA.STEP * Math.floor((Math.max(1, Math.floor(Number(lv) || 1)) - 1) / STAMINA.EVERY));
  // ---------- ไอเทม (kind = 'items' ในคลัง) ----------
  const ITEMS = {
    'tea-g': { name: 'ชาเขียว', desc: 'เติมสตามิน่า 60', stamina: 60, rarity: 'rare' },
    'tea-m': { name: 'ชามัทฉะ', desc: 'เติมสตามิน่า 120', stamina: 120, rarity: 'epic' },
    'exp-s': { name: 'คัมภีร์ฝึกขั้นต้น', desc: 'EXP ตัวละคร 100', charExp: 100, rarity: 'common' },
    'exp-m': { name: 'คัมภีร์ฝึกขั้นกลาง', desc: 'EXP ตัวละคร 500', charExp: 500, rarity: 'rare' },
    'exp-l': { name: 'คัมภีร์ฝึกขั้นสูง', desc: 'EXP ตัวละคร 2,000', charExp: 2000, rarity: 'epic' },
  };
  // ---------- ฟาร์มกับบอท: ของที่ได้ตามอันดับ (ชั้น 0 = ที่ 1 · ชั้น 3 = ที่สุดท้าย) ----------
  const FARM = {
    coins: { name: 'เหรียญ', mult: 2 },
    exp: { name: 'คัมภีร์ตัวละคร', tiers: [{ 'exp-m': 1, 'exp-s': 3 }, { 'exp-m': 1, 'exp-s': 1 }, { 'exp-s': 4 }, { 'exp-s': 3 }] },
  };
  const tierOf = (rank, seats) => { seats = Math.max(2, Number(seats) || 2); return rank <= 1 ? 0 : rank >= seats ? 3 : rank === 2 ? 1 : 2; };
  function farmReward(farm, rank, seats) {
    const f = FARM[farm] ? farm : 'coins';
    if (f === 'coins') return { farm: f, coins: reward(rank, seats, 1) * FARM.coins.mult, items: {} };
    return { farm: f, coins: 0, items: Object.assign({}, FARM[f].tiers[tierOf(rank, seats)]) };
  }
  // ---------- เลเวลตัวละคร ----------
  const CHAR = { MAX: 30, BASE: 100, STEP: 50, COIN_PER_EXP: 0.2, SLOTS: { frames: 5, backs: 10, tables: 20, backgrounds: 30 } };
  const charNeed = lv => CHAR.BASE + CHAR.STEP * (lv - 1);
  function charLevelOf(exp) {
    let lv = 1, left = Math.max(0, Math.floor(Number(exp) || 0));
    while (lv < CHAR.MAX && left >= charNeed(lv)) { left -= charNeed(lv); lv++; }
    return { level: lv, into: lv >= CHAR.MAX ? 0 : left, need: lv >= CHAR.MAX ? 0 : charNeed(lv), max: lv >= CHAR.MAX };
  }
  const charMaxExp = () => { let t = 0; for (let l = 1; l < CHAR.MAX; l++) t += charNeed(l); return t; };
  const charCost = exp => Math.floor(Math.max(0, Number(exp) || 0) * CHAR.COIN_PER_EXP);
  return { CFG, ranks, reward, expFor, needFor, levelOf, levelReward, STAMINA, staminaMax, ITEMS, FARM, tierOf, farmReward, CHAR, charNeed, charLevelOf, charMaxExp, charCost };
});
