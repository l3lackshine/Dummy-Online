// ตรวจระบบสกิล v3: ตารางฝั่งเซิร์ฟเวอร์ตรงกับ skin/skills.json · ฝากออโต้ต้องมีสกิลมือไว · ป่วนสายตาถูกปิด · ไม่มีโบนัสเหรียญ
const fs = require('fs'), path = require('path'), assert = require('assert'), M = require('./test-mock-sio');
const Core = require('../client/public/skills-core.js'), Sk = require('./src/skills');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../client/public/skin/skills.json'), 'utf8'));
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const [ch, sid] of Object.entries(Sk.CHAR_SKILL)) assert.strictEqual(Core.charCfg(data, ch).skill, sid, 'skill ของ ' + ch);
  ok(Object.keys(data.characters).every(ch => Sk.CHAR_SKILL[ch] === data.characters[ch].skill), 'ตารางตัวละคร→สกิล ฝั่งเซิร์ฟเวอร์ตรงกับ skills.json');
  ok(Object.keys(data.characters).every(ch => (Sk.MAX_STARS_OF[ch] || 5) === Core.charCfg(data, ch).maxStars), 'ดาวสูงสุดฝั่งเซิร์ฟเวอร์ (ใช้ตรวจฉาก 5 ดาว) ตรงกับ skills.json');
  for (const [rule, acts] of Object.entries(Sk.ACTION_SKILL)) for (const [t, sids] of Object.entries(acts))
    ok(sids.every(s => (data.skills.find(x => x.id === s).games[rule].mods || []).includes(t)), `คำสั่ง ${rule}/${t} ผูกกับสกิลที่มีโมดูล ${t} จริง`);
  ok(Object.keys(data.characters).every(ch => Core.bonusPct(data, ch).every(v => v === 0)), 'ไม่มีโบนัสเหรียญจากตัวละครแล้ว');
  ok(data.skills.every(s => ['dummy', 'pokdeng', 'gaogae', 'somsip', 'eekae'].every(g => s.games[g] && s.games[g].mods.length)), 'ทุกสกิลมีผลในทุกเกม (5 เกม)');
  const fake = (own, fail) => ({ enabled: () => true, ownsItem: async (u, k, id) => { if (fail) throw new Error('down'); return own.includes(k + ':' + id); } });
  ok(await Sk.verifyOwned(fake([]), 'u1', 'characters', 'boy') === 'boy', 'ตัวละครฟรีใช้ได้เสมอ');
  ok(await Sk.verifyOwned(fake([]), 'u1', 'characters', 'arya-01') === null, 'โหมดบัญชี: ไม่มีอายะในคลัง → ใช้อายะไม่ได้');
  ok(await Sk.verifyOwned(fake(['characters:arya-01']), 'u1', 'characters', 'arya-01') === 'arya-01', 'โหมดบัญชี: มีอายะในคลัง → ใช้ได้');
  ok(await Sk.verifyOwned(fake(['frames:sakura-gem'], true), 'u1', 'frames', 'sakura-gem') === null, 'ตรวจคลังไม่ได้ (ฐานข้อมูลล่ม) → ไม่อนุญาต');
  const srv = M.load({ OPENING_MS: 0, BOT_DELAY_MS: 100000 }), R = require('./src/rules/dummy');
  async function tryAutodep(ch) {
    const a = M.client(srv); let res = null, st = null; a.on('game:action-result', r => { if (r.action === 'autodep') res = r; }); a.on('game:state', s => { st = s; });
    a.emit('room:create', { name: 'T', ch, bots: true }); await sleep(30); a.emit('game:start'); await sleep(50);
    const room = [...require.cache[require.resolve('./src/index.js')].exports.rooms.values()].find(r => r.players.some(p => p.id === a.id));
    if (!room.game) { a.emit('game:begin'); await sleep(50); }
    const G = room.game, me = room.players.find(p => p.id === a.id); G.cur = me.seat; G.phase = 'play'; G.P[me.seat].melded = true;
    a.emit('game:act', { t: 'autodep' }); await sleep(30); a.close(); return res;
  }
  const rb = await tryAutodep('boy'), rg = await tryAutodep('girl');
  ok(rb && !rb.ok && /มือไว/.test(rb.error), 'ตัวละครที่ไม่มีสกิลมือไว (หนุ่มน้อย) กดฝากออโต้ไม่ได้');
  ok(rg && !/มือไว/.test(rg.error || ''), 'สาวหางม้า (มือไว) ฝากออโต้ได้ — ผ่านด่านสกิลไปถึงกติกาเกม');
  const c = M.client(srv); let sr = null; c.on('skill:result', r => { sr = r; }); c.emit('skill:use', { id: 'scramble', to: 1 }); await sleep(20);
  ok(sr && sr.ok === false, 'ป่วนสายตาถูกปิดแล้ว (เซิร์ฟเวอร์ตอบว่าใช้ไม่ได้)');
  console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`); process.exit(0);
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
