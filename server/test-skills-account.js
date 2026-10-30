// โหมดบัญชี (Supabase เปิด): ตรวจว่าเซิร์ฟเวอร์เช็กคลังจริงก่อนให้ใช้ตัวละคร/กรอบ และด่านสกิลใช้ตัวละครที่ผ่านการตรวจแล้ว
const assert = require('assert'), M = require('./test-mock-sio'), SB = require('./src/supabase');
const OWN = { u1: ['characters:arya-01', 'frames:sakura-gem'], u2: [] };
SB.enabled = () => true;
SB.verifyToken = async t => (OWN[t] ? { id: t, name: t } : null);
SB.ownsItem = async (u, k, id) => (OWN[u] || []).includes(k + ':' + id);
SB.rpc = async () => ({}); SB.rpcRetry = async () => ({});
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 100000 }), rooms = () => [...require.cache[require.resolve('./src/index.js')].exports.rooms.values()];
  async function join(uid, ch, fr) {
    const c = M.client(srv, { token: uid }); let lob = null; c.on('room:lobby', l => { lob = l; });
    await sleep(20); c.emit('room:create', { name: uid, ch, fr, bots: true }); await sleep(60);
    const me = lob && lob.players.find(p => p.you); return { c, me, room: rooms().find(r => r.players.some(p => p.id === c.id)) };
  }
  const a = await join('u1', 'arya-01', 'sakura-gem');
  ok(a.me && a.me.ch === 'arya-01' && a.me.fr === 'sakura-gem', 'มีอายะและกรอบในคลัง → ใช้ได้');
  const b = await join('u2', 'arya-01', 'sakura-gem');
  ok(b.me && b.me.ch === null && b.me.fr === null, 'ไม่มีในคลัง → เซิร์ฟเวอร์ไม่ให้ใช้อายะ/กรอบ (เป็นค่าว่าง)');
  const g = await join('u2', 'girl', null);
  ok(g.me && g.me.ch === 'girl', 'ตัวละครฟรี (สาวหางม้า) ใช้ได้โดยไม่ต้องมีในคลัง');
  // ด่านสกิล: คนที่ถูกตัดเป็นค่าว่างกดฝากออโต้ไม่ได้
  let res = null; b.c.on('game:action-result', r => { if (r.action === 'autodep') res = r; });
  b.c.emit('game:start'); await sleep(60); const G = b.room.game, p = b.room.players.find(x => x.id === b.c.id);
  G.cur = p.seat; G.phase = 'play'; G.P[p.seat].melded = true; b.c.emit('game:act', { t: 'autodep' }); await sleep(40);
  ok(res && !res.ok && /มือไว/.test(res.error), 'ตัวละครที่ไม่ผ่านการตรวจ → ใช้สกิลฝากออโต้ไม่ได้');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`); process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
