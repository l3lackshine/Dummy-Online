// เทสเกมไพ่ไทยอื่นนอกจากดัมมี่ (ป๊อกเด้ง · เก้าเก · ผสมสิบ · อีแก่) เล่นผ่านเซิร์ฟเวอร์จริงจนจบตา
// ขั้นตอน: สร้างห้อง (เติมบอท) → สับไพ่ → เริ่มเกม → ผู้เล่นหลุด ให้บอทเล่นแทนจนจบ → ตรวจผลชิปที่เซิร์ฟเวอร์คิด
// ทำไม: เดิมไฟล์นี้ทดสอบระบบกระเป๋าเหรียญผ่าน socket (wallet:spend) กับเกมอีแก่รุ่นแรก ซึ่งถูกเอาออกแล้ว จึงล้มทุกครั้ง
'use strict';
const assert = require('assert');
const M = require('./test-mock-sio');
const Rules = require('./src/rules');

const sleep = ms => new Promise(done => setTimeout(done, ms));
async function until(check, ms = 10000, step = '') {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (check()) return;
    await sleep(10);
  }
  throw Error('timeout ' + step);
}

(async () => {
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 2, EMPTY_ROOM_TTL_MS: 30000, RATE_PER_SEC: 1000 });
  const rooms = require.cache[require.resolve('./src/index.js')].exports.rooms;
  const games = Rules.list()
    .map(rule => rule.id)
    .filter(id => id !== 'dummy');
  assert.ok(games.length >= 4, 'มีเกมอื่นอย่างน้อย 4 เกม: ' + games);

  for (const rule of games) {
    const sock = M.client(srv);
    let joined = null;
    let state = null;
    const errors = [];
    sock.on('room:joined', data => (joined = data));
    sock.on('game:state', data => (state = data));
    sock.on('system:error', message => errors.push(message));
    sock.emit('room:create', { name: 'ทดสอบ ' + rule, rule, options: {} });
    await until(() => joined, 10000, rule + ' joined');

    const room = rooms.get(joined.code);
    sock.emit('game:shuffle');
    await until(() => room.deck || room.game, 10000, rule + ' shuffled');
    sock.emit('game:start');
    await until(() => state, 10000, rule + ' started'); // บางตาจบทันทีหลังแจก (เช่น ป๊อกเด้งได้ป๊อก) — ถือว่าปกติ

    sock.close(); // หลุดกลางเกม → บอทรับช่วงเล่นจนจบ
    await until(() => room.game && room.game.over, 15000, rule + ' finished');

    const coin = room.game.res && room.game.res.coin;
    assert.ok(coin && Array.isArray(coin.delta), rule + ': มีผลชิปที่เซิร์ฟเวอร์คิด');
    assert.strictEqual(coin.delta.length, room.game.P.length, rule + ': ผลชิปครบทุกที่นั่ง');
    assert.strictEqual(
      coin.delta.reduce((sum, v) => sum + v, 0),
      0,
      rule + ': ชิปรวมทั้งโต๊ะเป็นศูนย์'
    );
    assert.deepStrictEqual(errors, [], rule + ': ไม่มีข้อความผิดพลาด');
    console.log(`  ✓ ${rule}: สร้างห้อง → สับ → เริ่ม → บอทเล่นแทนจนจบ · ชิป ${coin.delta.join(' / ')}`);
  }
  console.log('simple online tests passed');
  process.exit(0);
})().catch(e => {
  console.error('simple online tests failed:', e.message);
  process.exit(1);
});
