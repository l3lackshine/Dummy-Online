// เอนจิ้นสับไพ่ (แยกจากกติกาเกม) — จำลองการสับไพ่จริงบนสำรับตัวอักษร 52 ตัว
//
// แทนไพ่ id 0..51 ด้วยตัวอักษร A-Z a-z (52 ตัวพอดี) แล้วสับ "สตริง" นั้นด้วยท่าสับจริง:
//   • cut      — ตัดไพ่ (ยกครึ่งบนไปไว้ล่าง) ตำแหน่งตัดไม่ตรงกลางเป๊ะแบบมือคน
//   • riffle   — สับแบบรีฟเฟิล (แบ่งสองกอง แล้วปล่อยสลับ) ใช้โมเดล Gilbert–Shannon–Reeds
//                ซึ่งเป็นโมเดลทางคณิตศาสตร์ของการสับแบบรีฟเฟิลจริง: แบ่งกองตามทวินาม แล้วปล่อยใบถัดไปจากกองใด
//                ด้วยความน่าจะเป็นตามสัดส่วนไพ่ที่เหลือในกองนั้น (ปล่อยได้ทีละใบหรือเป็นก้อนเหมือนมือจริง)
//   • overhand — สับแบบโอเวอร์แฮนด์ (ดึงก้อนเล็ก ๆ จากบนสำรับไปกองใหม่ทีละก้อน ลำดับก้อนกลับด้าน)
// แผนมาตรฐาน: riffle รวม 12 ครั้ง แทรก cut/overhand ระหว่างทาง — เกณฑ์ 7 ครั้งของ Bayer–Diaconis เป็นแค่จุดที่ "เริ่มดูสุ่ม" (ระยะห่างจากสุ่มสมบูรณ์ ≈ 0.33)
// ทดสอบจริงพบว่า 8 ครั้งยังมีความเอนเอียงที่วัดได้ (test-shuffle.js) สำหรับเกมออนไลน์ที่ต้องยุติธรรมจึงใช้ 12 ครั้ง (≈ 0.01)
// ตัวสุ่มใช้ crypto.randomInt (เดาล่วงหน้าไม่ได้) และฉีด rnd เองได้เพื่อทดสอบแบบกำหนดผลล่วงหน้า
const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DECK_SIZE = ALPHABET.length; // 52
const FRESH = ALPHABET;            // สำรับใหม่เรียงตาม id: ตัวที่ i = ไพ่ id i
const defaultRnd = n => crypto.randomInt(n);

const idToLetter = id => ALPHABET[id];
const letterToId = ch => ALPHABET.indexOf(ch);
const toLetters = ids => ids.map(idToLetter).join('');
const toIds = letters => Array.from(letters, letterToId);
// สำรับที่ใช้ได้ต้องมี 52 ตัว ไม่ซ้ำ และมีครบทุกตัวอักษร
const isValidLetters = s => typeof s === 'string' && s.length === DECK_SIZE && new Set(s).size === DECK_SIZE && [...s].every(ch => ALPHABET.includes(ch));
const isValidIds = a => Array.isArray(a) && a.length === DECK_SIZE && a.every(n => Number.isInteger(n) && n >= 0 && n < DECK_SIZE) && new Set(a).size === DECK_SIZE;

// ตัดไพ่: ยกก้อนบน k ใบไปไว้ใต้สำรับ (k ไม่ใกล้ขอบเกินไป เหมือนคนตัดจริง)
function cut(deck, rnd = defaultRnd) {
  const k = 10 + rnd(DECK_SIZE - 19); // 10..42
  return { deck: deck.slice(k) + deck.slice(0, k), step: { t: 'cut', at: k } };
}

// รีเฟรฟเฟิล (GSR): แบ่งซ้าย k ใบ (k ~ Binomial(52, ½)) แล้วปล่อยสลับ โดยความน่าจะเป็นปล่อยจากกองเท่ากับ (ใบที่เหลือในกอง)/(ใบที่เหลือทั้งหมด)
function riffle(deck, rnd = defaultRnd) {
  const n = deck.length; let k = 0; for (let i = 0; i < n; i++) k += rnd(2);
  const L = deck.slice(0, k), R = deck.slice(k); let l = 0, r = 0, out = '';
  while (l < L.length || r < R.length) {
    const ll = L.length - l, rr = R.length - r;
    if (rnd(ll + rr) < ll) out += L[l++]; else out += R[r++];
  }
  return { deck: out, step: { t: 'riffle', split: k } };
}

// โอเวอร์แฮนด์: ดึงก้อนบน 1..9 ใบทีละก้อนไปวางทับกองใหม่ → ลำดับก้อนกลับด้าน ภายในก้อนคงเดิม
function overhand(deck, rnd = defaultRnd) {
  let rest = deck, out = '', chunks = 0;
  while (rest.length) { const c = Math.min(rest.length, 1 + rnd(9)); out = rest.slice(0, c) + out; rest = rest.slice(c); chunks++; }
  return { deck: out, step: { t: 'overhand', chunks } };
}

const OPS = { cut, riffle, overhand };
const R3 = Array(3).fill('riffle');
const PLAN = Object.freeze(['cut', ...R3, 'overhand', ...R3, 'cut', ...R3, 'overhand', ...R3, 'overhand', 'cut']); // riffle รวม 12 ครั้ง

// สับสำรับตัวอักษร → { letters, ids, steps }  (ids = ลำดับไพ่จากบนสุดถึงล่างสุด ใช้แจกได้ทันที)
// opts.deck: สตริงตัวอักษรเริ่มต้น (ค่าเริ่มต้น = สำรับใหม่เรียงลำดับ) · opts.plan: ลำดับท่าสับ · opts.rnd: ตัวสุ่ม
function shuffle(opts = {}) {
  const rnd = opts.rnd || defaultRnd, plan = opts.plan || PLAN;
  let deck = opts.deck == null ? FRESH : opts.deck;
  if (!isValidLetters(deck)) throw new Error('สำรับต้องมีตัวอักษร A-Z a-z ครบ 52 ตัวไม่ซ้ำ');
  const steps = [];
  for (const name of plan) { const op = OPS[name]; if (!op) throw new Error('ไม่รู้จักท่าสับ: ' + name); const r = op(deck, rnd); deck = r.deck; steps.push(r.step); }
  return { letters: deck, ids: toIds(deck), steps };
}

module.exports = { ALPHABET, DECK_SIZE, FRESH, PLAN, idToLetter, letterToId, toLetters, toIds, isValidLetters, isValidIds, cut, riffle, overhand, shuffle };
