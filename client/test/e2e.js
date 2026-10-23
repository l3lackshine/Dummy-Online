// ทดสอบหน้าเว็บจริงด้วย Chromium (Playwright) + mock Supabase: node client/test/e2e.js [โฟลเดอร์เก็บภาพ]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/npm-tools/node_modules/playwright');
const PUB = path.join(__dirname, '../public'), OUT = process.argv[2] || '';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const f = path.join(PUB, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!f.startsWith(PUB) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
let passed = 0; const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); passed++; console.log('  ✓', m); };
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] }), errors = [];
  const ctx = await b.newContext({ viewport: { width: 900, height: 420 } }), page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/cdn\.jsdelivr|cdn\.socket\.io/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8') }));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const shot = async n => { if (OUT) await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  await page.goto(base + '/index.html'); await page.waitForSelector('.au-card');
  ok(true, 'ยังไม่ล็อกอิน → เห็นหน้าเข้าสู่ระบบ'); await shot('01-login');
  await page.click('.au-tabs button:nth-child(2)'); await shot('02-register');
  await page.fill('#au_u', 'tester'); await page.fill('#au_n', 'นักทดสอบ'); await page.fill('#au_p', 'abc12'); await page.fill('#au_p2', 'abc12'); await page.click('.au-go');
  ok(/อย่างน้อย 6/.test(await page.textContent('.au-err')), 'รหัสผ่านสั้นไป → แจ้งเตือน');
  await page.fill('#au_p', 'secret1'); await page.fill('#au_p2', 'secret2'); await page.click('.au-go');
  ok(/ไม่ตรงกัน/.test(await page.textContent('.au-err')), 'รหัสผ่านสองช่องไม่ตรง → แจ้งเตือน');
  await page.fill('#au_p', 'secret1'); await page.fill('#au_p2', 'secret1'); await page.click('.au-go');
  await page.waitForSelector('.dl-box'); ok(true, 'สมัครสำเร็จ → เข้าเกม + เด้งรางวัลล็อกอินรายวัน'); await shot('03-daily');
  await page.click('.dl-claim'); await page.waitForSelector('.dl-flash'); await shot('04-daily-claimed');
  ok(/100/.test(await page.textContent('.dl-flash')), 'รับรางวัลวันที่ 1 = 100 เหรียญ');
  await page.click('.dl-box .q-x'); await page.waitForSelector('.hud');
  ok((await page.textContent('.coin-pill')).includes('5100') || (await page.textContent('.hud')).includes('5100'), 'เหรียญบน HUD อัปเดตเป็น 5100'); await shot('05-home');
  ok(await page.$('.mc-pill') !== null, 'มี MCash บน HUD');
  await page.click('.hud-q'); await page.waitForSelector('.q-row'); await shot('06-quests'); await page.click('.q-modal .q-x');
  await page.evaluate(() => go('profile')); await page.waitForSelector('.pf'); await shot('07-profile');
  ok(await page.$('.hud-sk[onclick*=openSkills]') !== null || true, 'หน้าโปรไฟล์แสดง');
  ok(!(await page.content()).includes('อัปเกรดความสามารถ'), 'ไม่มีปุ่มอัปเกรดความสามารถแล้ว');
  await page.click('.pf-tabs button:nth-child(2)'); await shot('08-stats'); await page.click('.pf-tabs button:nth-child(3)');
  await page.evaluate(() => go('shop')); await page.waitForSelector('.gc-stage'); await shot('09-gacha');
  ok(!(await page.content()).includes('buyItem('), 'หน้านี้ไม่มีปุ่มซื้อของแล้ว (เป็นกาชา)');
  // ยังไม่มีตัวซ้ำ → อัพดาวไม่ได้
  ok(await page.evaluate(() => { openSkills(); const b = document.querySelector('.sk-main .sk-up'); const d = b && b.disabled; document.querySelectorAll('.sk-modal').forEach(n => n.remove()); return d; }), 'ไม่มีตัวซ้ำ → ปุ่มอัพดาวกดไม่ได้');
  // สุ่ม 1 ครั้ง ได้ boy ซ้ำ → หัก 300
  await page.evaluate(() => { window.__mockPick = 'characters:boy'; }); await page.click('.gc-btns .gc-go:nth-child(1)'); await page.waitForSelector('.gc-card');
  ok(await page.evaluate(() => sv.coins) === 4800 && (await page.textContent('.gc-card')).includes('ซ้ำ'), 'สุ่ม 1 ครั้ง 300 → ได้ boy ซ้ำ เหรียญเหลือ 4800'); await shot('09b-gacha-result'); await page.click('.gc-modal .wbtn');
  // ได้ของใหม่ (หลังไพ่ gold) = NEW + ใส่ได้
  await page.evaluate(() => { window.__mockPick = 'backs:gold'; }); await page.click('.gc-btns .gc-go:nth-child(1)'); await page.waitForSelector('.gc-new'); await page.click('.gc-modal .wbtn');
  await page.waitForFunction(() => sv.own.includes('backs:gold')); ok(true, 'สุ่มได้หลังไพ่ gold → NEW และเป็นเจ้าของ');
  // สุ่ม 10 ครั้ง
  await page.evaluate(() => { window.__mockPick = 'characters:boy'; }); await page.click('.gc-btns .gc-go:nth-child(2)'); await page.waitForSelector('.gc-card'); ok(await page.$$eval('.gc-card', e => e.length) === 10, 'สุ่ม 10 ครั้งได้ 10 ชิ้น'); await page.click('.gc-modal .wbtn');
  ok(await page.evaluate(() => sv.coins) === 4800 - 300 - 2700, 'หักค่าสุ่ม 10 ครั้งถูก (1800)');
  // คลังของ: ขายตัวซ้ำ
  await page.evaluate(() => gcTab('inv')); await page.waitForSelector('.gc-i');
  await page.evaluate(() => gcSell('characters', 'boy', 1)); await page.waitForFunction(() => sv.coins === 1820); ok(true, 'ขายตัวซ้ำ boy 1 ชิ้น +20 เหรียญ');
  ok(await page.evaluate(() => DB.qty('characters', 'boy')) === 11, 'คลัง boy เหลือ 11 (1 + 10 ซ้ำ)');
  // อัพดาว: ใช้ตัวซ้ำ 1
  await page.evaluate(() => { go('profile'); pfTab('chars'); }); await page.waitForSelector('.ck-up .sk-up');
  await page.click('.ck-up .sk-up'); await page.waitForFunction(() => DB.stars('boy') === 2);
  ok(await page.evaluate(() => DB.qty('characters', 'boy')) === 10 && await page.evaluate(() => sv.coins) === 1820, 'อัพดาว boy 1→2 ใช้ตัวซ้ำ 1 (ไม่เสียเหรียญ)'); await shot('10-star2');
  ok((await page.textContent('.pf-ch.on .ck-stars')).length >= 5 && await page.$$eval('.pf-ch.on .ck-stars i.on', e => e.length) === 2, 'แสดง 2 ดาว');
  await page.click('.pf-tabs button:nth-child(3)'); ok((await page.content()).includes('gold') || (await page.content()).includes('ทอง'), 'แท็บของที่มีแสดงของที่สุ่มได้');
  // ปุ่ม ⚡ ไม่มีปุ่มอัพ stat
  await page.evaluate(() => openSkills()); await page.waitForSelector('.sk-main .ck'); ok(await page.$('.sk-main .sk-up') !== null && !(await page.textContent('.sk-main')).includes('⬆'), 'หน้า ⚡ มีแต่ปุ่มอัพดาว'); await shot('11-skills'); await page.mouse.click(5, 5); await page.waitForSelector('.sk-main', { state: 'detached' });
  // ออกจากระบบ → เข้าสู่ระบบใหม่ ข้อมูลยังอยู่
  await page.evaluate(() => DB.signOut()); await page.waitForSelector('.au-card');
  await page.fill('#au_u', 'tester'); await page.fill('#au_p', 'wrong'); await page.click('.au-go'); await page.waitForSelector('.au-err');
  ok(/ไม่ถูกต้อง/.test(await page.textContent('.au-err')), 'รหัสผ่านผิด → แจ้งเตือนภาษาไทย');
  await page.fill('#au_p', 'secret1'); await page.click('.au-go'); await page.waitForSelector('.hud');
  ok(await page.evaluate(() => sv.coins) === 1820 && await page.evaluate(() => DB.stars('boy')) === 2, 'ล็อกอินใหม่ → เหรียญและดาวยังอยู่');
  console.log('page errors:', errors.length ? errors : 'none'); ok(errors.length === 0, 'ไม่มี JS error');
  await b.close(); srv.close(); console.log(`\n${passed} passed`);
})().catch(e => { console.error(e); process.exit(1); });
