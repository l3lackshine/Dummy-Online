// ทดสอบชั้นข้อมูล (src/db.js) โหมดหน่วยความจำ: โปรไฟล์ · ซื้อของ · ชำระผลเกม · ตรวจ patch โปรไฟล์ — กติกาเดียวกับฟังก์ชัน SQL ใน supabase/migrations
const assert = require('assert'), Db = require('./src/db');
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222';
(async () => {
  const db = Db.create({ url: '', serviceKey: '' });
  ok(db.mode === 'memory', 'ไม่มี env Supabase → โหมดหน่วยความจำ');
  db._setShop([['characters:boy', 0], ['characters:rina-01', 1500], ['backs:gold', 700], ['tables:wood', 400], ['themes:classic', 0]]);

  console.log('\n[1] โปรไฟล์');
  let p = await db.getProfile(U1, '  อลิซ  ');
  ok(p.name === 'อลิซ' && p.coins === 5000 && p.own.length === 0 && p.games === 0, 'บัญชีใหม่: ชื่อถูกตัดช่องว่าง, ได้ 5000 เหรียญ, ยังไม่มีของ');
  ok(db._ledger.filter(l => l.userId === U1 && l.kind === 'grant').length === 1, 'บันทึกเหรียญเริ่มต้นลง ledger ครั้งเดียว');
  p = await db.getProfile(U1, 'ชื่ออื่น'); ok(p.name === 'อลิซ' && db._ledger.length === 1, 'เรียกซ้ำไม่สร้างบัญชี/เหรียญซ้ำ และไม่เปลี่ยนชื่อ');
  ok(Db.cleanName('x'.repeat(50)).length === 14 && Db.cleanName('\u0000\u0007 ') === 'ผู้เล่น', 'ชื่อถูกจำกัด 14 ตัวและล้างอักขระควบคุม');

  console.log('\n[2] ซื้อของ');
  ok((await db.buy(U1, 'characters', 'nope')).error === 'unknown_item', 'สินค้าที่ไม่มีในร้าน ซื้อไม่ได้ (client บอกราคาเองไม่ได้)');
  ok((await db.buy(U2, 'backs', 'gold')).error === 'no_profile', 'ไม่มีบัญชี ซื้อไม่ได้');
  let r = await db.buy(U1, 'characters', 'rina-01'); ok(r.ok && r.coins === 3500, 'ซื้อสำเร็จ หักตามราคาในร้าน (1500)');
  r = await db.buy(U1, 'characters', 'rina-01'); ok(r.ok && r.already && r.coins === 3500, 'ซื้อซ้ำ ไม่หักซ้ำ');
  db._profiles.get(U1).coins = 100; r = await db.buy(U1, 'backs', 'gold');
  ok(!r.ok && r.error === 'insufficient' && (await db.getProfile(U1)).coins === 100 && !(await db.getProfile(U1)).own.includes('backs:gold'), 'เหรียญไม่พอ → ไม่หัก ไม่ได้ของ');
  p = await db.getProfile(U1); ok(p.own.join() === 'characters:rina-01', 'รายการของที่ซื้อเก็บเป็น kind:id');

  console.log('\n[3] ชำระผลเกม');
  db._profiles.get(U1).coins = 1000; await db.getProfile(U2, 'บ๊อบ');
  const m = { gid: 'g1', rule: 'dummy', stake: 20, seats: 4, humans: 2, players: [
    { user_id: U1, seat: 0, name: 'อลิซ', delta: 60, won: true, place: 1 }, { user_id: U2, seat: 1, name: 'บ๊อบ', delta: -20, won: false, place: 2 },
    { user_id: null, seat: 2, name: 'บอท', delta: -20, won: false, place: 2 }, { user_id: null, seat: 3, name: 'บอท', delta: -20, won: false, place: 2 }] };
  r = await db.settleMatch(m); ok(r.ok && !r.duplicate && r.balances[U1] === 1060 && r.balances[U2] === 4980, 'จ่ายเหรียญทุกคนตาม delta');
  p = await db.getProfile(U1); ok(p.games === 1 && p.wins === 1 && (await db.getProfile(U2)).wins === 0 && (await db.getProfile(U2)).games === 1, 'นับจำนวนตาและตาที่ชนะ');
  r = await db.settleMatch(m); ok(r.ok && r.duplicate && (await db.getProfile(U1)).coins === 1060, 'gid เดิมซ้ำ → ไม่จ่ายซ้ำ (idempotent)');
  ok(db._matches.get('g1').players.length === 4 && db._matches.get('g1').players[2].userId === null, 'บันทึกครบทุกที่นั่ง รวมบอทเป็นแถวไม่มี user_id');
  db._profiles.get(U2).coins = 10;
  r = await db.settleMatch({ gid: 'g2', rule: 'dummy', stake: 20, seats: 2, humans: 2, players: [{ user_id: U2, seat: 0, name: 'บ๊อบ', delta: -50, won: false, place: 2 }, { user_id: U1, seat: 1, name: 'อลิซ', delta: 50, won: true, place: 1 }] });
  ok((await db.getProfile(U2)).coins === 0 && db._matches.get('g2').players.find(x => x.userId === U2).applied === -10, 'ยอดไม่ติดลบ: หักได้เท่าที่มี (applied = -10) ส่วน delta เดิมยังเก็บไว้');
  ok(!(await db.settleMatch({ players: [] })).ok, 'ไม่มี gid → ปฏิเสธ');

  console.log('\n[4] ตรวจ patch โปรไฟล์จาก client');
  const prof = await db.getProfile(U1);
  let patch = db.cleanProfilePatch({ name: 'อลิซ2', equipped: { dummyCharacterSkin: 'rina-01', dummyBackSkin: 'gold', dummyTableSkin: 'wood', dummySkin: 'classic', dummyBackgroundSkin: 'ไม่รู้จัก', evil: 'x', dummyTitle: 'นักเล่น' } }, prof);
  ok(patch.name === 'อลิซ2' && patch.equipped.dummyCharacterSkin === 'rina-01' && patch.equipped.dummySkin === 'classic', 'ใส่ของที่ซื้อแล้ว/ของฟรีได้');
  ok(!('dummyBackSkin' in patch.equipped) && !('dummyTableSkin' in patch.equipped) && !('dummyBackgroundSkin' in patch.equipped) && !('evil' in patch.equipped), 'ของที่ยังไม่ซื้อ/ไม่รู้จัก/คีย์แปลก ถูกทิ้ง');
  ok(patch.equipped.dummyTitle === 'นักเล่น' && db.cleanProfilePatch({ equipped: { dummyTitle: 'x'.repeat(40) } }, prof).equipped.dummyTitle.length === 16, 'ฉายาจำกัด 16 ตัว');
  ok(Object.keys(db.cleanProfilePatch(null, prof)).length === 0 && Object.keys(db.cleanProfilePatch([], prof)).length === 0, 'payload ขยะ → ไม่มีอะไรถูกแก้');
  await db.saveProfile(U1, patch); ok((await db.getProfile(U1)).name === 'อลิซ2', 'บันทึกชื่อใหม่ได้');
  ok(db.meOf(await db.getProfile(U1)).eq === 'classic' && db.meOf(prof).stats.games === 2 && db.meOf(prof).stats.wins === 2, 'รูป me ตรงกับ sv ของ client (name/coins/own/eq)');

  console.log('\n[5] เลือกที่เก็บ + ความปลอดภัยของโทเคนทดสอบ');
  delete process.env.DB_TEST_TOKENS; ok((await db.verifyToken('test:' + U1)) === null, 'โทเคนทดสอบใช้ไม่ได้ถ้าไม่ได้เปิด DB_TEST_TOKENS');
  process.env.DB_TEST_TOKENS = '1'; ok((await db.verifyToken('test:' + U1)).userId === U1 && (await db.verifyToken('test:ไม่ใช่uuid')) === null, 'เปิดแล้วรับเฉพาะ uuid ถูกรูปแบบ'); delete process.env.DB_TEST_TOKENS;
  // โหมด Supabase: ตรวจว่าเรียก rpc/ตารางถูกชื่อ ด้วย client ปลอม
  const calls = []; const q = t => { const o = { select: () => o, eq: () => o, update: () => o, maybeSingle: async () => ({ data: { name: 'N', coins: '5000', equipped: {}, games: 0, wins: 0 }, error: null }), then: res => res({ data: t === 'purchases' ? [{ kind: 'backs', item_id: 'gold' }] : [{ kind: 'backs', id: 'gold', price: 700 }], error: null }) }; return o; };
  const fake = { from: t => { calls.push('from:' + t); return q(t); }, rpc: async (n, a) => { calls.push('rpc:' + n + ':' + Object.keys(a).join(',')); return { data: { ok: true }, error: null }; }, auth: { getUser: async t => (t === 'good' ? { data: { user: { id: U1, email: 'a@b.c' } }, error: null } : { data: null, error: { message: 'bad' } }) } };
  const sdb = Db.create({ url: 'https://x.supabase.co', serviceKey: 'k', createClient: () => fake });
  ok(sdb.mode === 'supabase', 'มี SUPABASE_URL + SERVICE_ROLE_KEY → โหมด Supabase');
  ok((await sdb.verifyToken('good')).userId === U1 && (await sdb.verifyToken('bad')) === null, 'ตรวจโทเคนผ่าน auth.getUser');
  const sp = await sdb.getProfile(U1); ok(sp.coins === 5000 && sp.own[0] === 'backs:gold', 'อ่านโปรไฟล์ + รายการที่ซื้อ (coins แปลงเป็นตัวเลข)');
  await sdb.buy(U1, 'backs', 'gold'); await sdb.settleMatch({ gid: 'x' }); await sdb.loadShop();
  ok(calls.includes('rpc:buy_item:p_user,p_kind,p_item') && calls.includes('rpc:settle_match:p_match') && calls.includes('from:shop_items') && sdb.priceOf('backs', 'gold') === 700, 'เรียกฟังก์ชัน buy_item / settle_match และอ่านราคาจาก shop_items');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
