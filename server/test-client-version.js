// ทดสอบด่านเวอร์ชันเกม (src/net/client-version.js): เทียบเลขเวอร์ชัน + เซิร์ฟเวอร์จริงปฏิเสธ client เก่าเมื่อตั้ง MIN_CLIENT_VERSION
const assert = require('assert');
const { parseVersion, isOutdated } = require('./src/net/client-version');
const M = require('./test-mock-sio');

let passed = 0;
const ok = (condition, message) => {
  assert(condition, message);
  passed++;
  console.log('  ✓', message);
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function testCompare() {
  console.log('เทียบเลขเวอร์ชัน');
  ok(JSON.stringify(parseVersion('Beta 0.18.1')) === '[0,18,1]', 'อ่าน "Beta 0.18.1" ได้ [0,18,1]');
  ok(JSON.stringify(parseVersion('1.2')) === '[1,2,0]', 'ไม่มีเลขท้าย = 0');
  ok(parseVersion('ไม่ใช่เลข') === null, 'อ่านไม่ได้ = null');
  ok(!isOutdated('Beta 0.18.1', ''), 'ไม่ตั้งขั้นต่ำ = ผ่านทุกเวอร์ชัน');
  ok(!isOutdated('', ''), 'ไม่ตั้งขั้นต่ำ + client ไม่ส่งเลข = ผ่าน (เหมือนเดิม)');
  ok(!isOutdated('Beta 0.18.1', '0.18.1'), 'เท่าขั้นต่ำพอดี = ผ่าน');
  ok(!isOutdated('Beta 0.19.0', '0.18.9'), 'ใหม่กว่า = ผ่าน');
  ok(!isOutdated('Beta 0.18.10', '0.18.9'), 'เทียบเป็นตัวเลข ไม่ใช่ตัวอักษร (10 > 9)');
  ok(isOutdated('Beta 0.18.0', '0.18.1'), 'เก่ากว่าเลขท้าย = ไม่ผ่าน');
  ok(isOutdated('Beta 0.9.9', '0.18.0'), 'เก่ากว่าเลขกลาง = ไม่ผ่าน');
  ok(isOutdated(undefined, '0.18.1'), 'client เก่าที่ไม่ส่งเลข = ไม่ผ่าน');
  ok(isOutdated('x'.repeat(5000) + '9.9.9', '0.18.1'), 'ข้อความยาวผิดปกติ = ไม่ผ่าน');
}

async function testServer() {
  console.log('เซิร์ฟเวอร์ปฏิเสธ client เก่า (MIN_CLIENT_VERSION=0.18.2)');
  const srv = M.load({ OPENING_MS: 0, MIN_CLIENT_VERSION: '0.18.2' });
  require('./src/index.js');

  const old = srv.connect({ version: 'Beta 0.18.1' });
  await sleep(20);
  ok(old.err && old.err.message === 'outdated', 'เวอร์ชันเก่า → เชื่อมต่อไม่ได้ (outdated)');
  ok(old.err.data && old.err.data.min === '0.18.2', 'บอกเลขขั้นต่ำกลับไปให้ client');

  const legacy = srv.connect({});
  await sleep(20);
  ok(legacy.err && legacy.err.message === 'outdated', 'client ที่ไม่ส่งเลขเวอร์ชัน → เชื่อมต่อไม่ได้');

  const fresh = srv.connect({ version: 'Beta 0.18.2' });
  await sleep(20);
  ok(!fresh.err && fresh.connected, 'เวอร์ชันถึงขั้นต่ำ → เชื่อมต่อได้');
}

(async () => {
  testCompare();
  await testServer();
  console.log(`\nผ่าน ${passed} ข้อ`);
  process.exit(0);
})().catch(error => {
  console.error('✗', error.message);
  process.exit(1);
});
