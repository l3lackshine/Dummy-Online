// ทดสอบท่าพิเศษตอนจบตา (rules/<เกม>/feats.js) ที่ใช้นับความสำเร็จ
//  - ทุกเกมมี feats() · บอทเล่นกันเองหลายพันตา: ผลเป็นรายการชื่อที่ถูกรูปแบบ ไม่ซ้ำ ไม่ throw
//  - ท่าที่ใช้ใน client/public/skin/achievements.json ต้องมีโอกาสเกิดจริง (เจออย่างน้อยครั้งหนึ่ง ยกเว้นท่าหายาก)
//  - ตอนเกมยังไม่จบ feats() ต้องคืนรายการว่าง
const assert = require('assert');
const path = require('path');
const Rules = require('./src/rules');

const GAMES = ['dummy', 'pokdeng', 'gaogae', 'somsip', 'eekae'];
const GAMES_PER_RULE = 1500;
const FEAT_NAME = /^[a-z0-9_]{1,24}$/;
// ท่าหายากที่บอทอาจเล่นไม่ถึงในจำนวนตาที่ทดสอบ (ไม่บังคับให้ต้องเจอ)
const RARE = new Set(['sp_aces', 'sp_suit', 'knock_suit', 'sflush', 'special']);

let passed = 0;
const ok = (condition, message) => {
  assert(condition, message);
  passed++;
  console.log('  ✓', message);
};

const humans = [{ id: 'a', n: 'A' }];

function playOne(rule) {
  const options = Rules.cleanOptions(rule.meta.id, {});
  const G = rule.newGame(humans, { options });
  // ป๊อกเด้งจบได้ทันทีตอนแจก (เจ้ามือป๊อก) จึงตรวจเฉพาะตาที่ยังไม่จบ
  if (!G.over) assert.deepStrictEqual(rule.feats(G, 0), [], rule.meta.id + ': ยังไม่จบตาต้องไม่มีท่าพิเศษ');
  let turns = 0;
  while (!G.over) {
    rule.botTurn(G);
    if (++turns > 5000) throw new Error(rule.meta.id + ' เล่นไม่จบ');
  }
  return G;
}

function collectFeats(id) {
  const rule = Rules.get(id);
  const seen = new Map();
  for (let g = 0; g < GAMES_PER_RULE; g++) {
    const G = playOne(rule);
    for (let seat = 0; seat < G.P.length; seat++) {
      const list = rule.feats(G, seat);
      assert(Array.isArray(list), id + ': feats ต้องคืน array');
      assert.strictEqual(new Set(list).size, list.length, id + ': ท่าพิเศษห้ามซ้ำในตาเดียว');
      for (const name of list) {
        assert(FEAT_NAME.test(name), id + ': ชื่อท่าไม่ถูกรูปแบบ ' + name);
        seen.set(name, (seen.get(name) || 0) + 1);
      }
    }
  }
  return seen;
}

const achievements = require(path.join(__dirname, '../client/public/skin/achievements.json'));

console.log('\n[A] ทุกเกมมี feats()');
ok(GAMES.every(id => typeof Rules.get(id).feats === 'function'), 'ทั้ง 5 เกมมีฟังก์ชัน feats');

console.log('\n[B] บอทเล่นกันเอง ' + GAMES_PER_RULE + ' ตาต่อเกม');
for (const id of GAMES) {
  const seen = collectFeats(id);
  const summary = [...seen].map(([name, count]) => name + '=' + count).join(' ');
  ok(true, id + ': ' + (summary || '(ไม่มีท่าพิเศษ)'));
  const needed = achievements.list.filter(a => a.metric === 'feat' && a.game === id).map(a => a.feat);
  for (const feat of needed) {
    if (RARE.has(feat)) continue;
    ok(seen.has(feat), id + ': ท่า "' + feat + '" ที่ความสำเร็จใช้ เกิดได้จริง');
  }
}

console.log('\n[C] ข้อมูลความสำเร็จ');
const ids = achievements.list.map(a => a.id);
ok(new Set(ids).size === ids.length, 'id ความสำเร็จไม่ซ้ำ (' + ids.length + ' อย่าง)');
ok(
  achievements.list.every(a => a.metric !== 'feat' || (a.feat && GAMES.includes(a.game))),
  'ความสำเร็จแบบท่าพิเศษผูกกับเกมเสมอ'
);

console.log('\nผ่านทั้งหมด ' + passed + ' จุดตรวจ');
