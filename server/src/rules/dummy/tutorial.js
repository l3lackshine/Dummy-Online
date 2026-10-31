// บทสอนดัมมี่: สำรับจัดไว้ล่วงหน้า + บอททิ้งไพ่ตามสคริปต์ → ผู้เล่นได้ลองครบทุกอย่างในตาเดียว (ใช้เฉพาะห้องสอนเล่น ห้ามใช้ในตาจริง)
//   ตาแรก: จั่ว J♣ → เกิดตอง 9 → ทิ้ง 3♠
//   บอท: 3♥ · 9♣ · 3♦ (ตีเต็ม! ในกองมี 3♠ 3♥ แล้วทิ้ง 3♦ ครบชุด)
//   ตาสอง: เก็บตั้งแต่ 3♠ → เกิดตอง 3 (ป้าน็อกเสีย 50) → ฝาก 9♣ → ทิ้ง J♣
//   บอท: 2♦ · K♣ · 7♥
//   ตาสาม: เก็บ 7♥ → เกิดเรียง 5♥ 6♥ 7♥ → คว่ำ Q♠ น็อก
const id = (r, s) => s * 13 + r - 1;   // s: 0♠ 1♥ 2♦ 3♣ · r: 1=A..13=K
const S = 0, H = 1, D = 2, C = 3;
const HANDS = [
  [id(9, S), id(9, H), id(9, D), id(5, H), id(6, H), id(12, S), id(3, S)],   // ผู้เล่น
  [id(3, H), id(2, D), id(4, S), id(8, D), id(10, C), id(13, D), id(6, C)],   // น้องมี่
  [id(9, C), id(13, C), id(5, S), id(7, D), id(10, H), id(1, D), id(4, C)],   // ลุงหัว
  [id(3, D), id(7, H), id(8, C), id(11, H), id(5, D), id(2, S), id(10, S)],  // ป้าน็อก
];
const HEAD = id(13, H), FIRST_DRAW = id(11, C);
function deck() {
  const used = new Set([...HANDS.flat(), HEAD, FIRST_DRAW]);
  const rest = [...Array(52).keys()].filter(x => !used.has(x));
  // ลำดับ: มือ 4 คน (28 ใบ) → กองจั่ว (จั่วจากท้าย) · ใบท้ายสุด = หัว · ก่อนหัว = ใบแรกที่ผู้เล่นจั่ว
  return [...HANDS.flat(), ...rest, FIRST_DRAW, HEAD];
}
const SCRIPT = { 1: [id(3, H), id(2, D)], 2: [id(9, C), id(13, C)], 3: [id(3, D), id(7, H)] };
module.exports = { deck, script: () => JSON.parse(JSON.stringify(SCRIPT)), id };
