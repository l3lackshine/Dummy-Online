// ไพ่ 52 ใบของดัมมี่: id 0..51 → เลข r (1=A..13=K) และดอก s (0♠ 1♥ 2♦ 3♣)
const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const card = id => ({ id, r: id % 13 + 1, s: (id / 13) | 0 });
const cn = c => RK[c.r] + SU[c.s];
const sp = c => (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0); // สเปโต 2♣ Q♠
const val = c => (sp(c) ? 50 : c.r === 1 ? 15 : c.r >= 10 ? 10 : 5);   // แต้มไพ่ค้างมือ
const sc = (c, head) => (head ? (sp(c) ? 100 : 50) : val(c));          // แต้มตอนวางลงโต๊ะ

module.exports = { SU, RK, card, cn, sp, val, sc };
