// ทดสอบ src/index.js ตัวจริงแบบหลาย client พร้อมกัน (ผ่านตัวจำลอง socket.io ในหน่วยความจำ — ดู test-mock-sio.js)
const assert = require('assert'), M = require('./test-mock-sio');
const E = require('./src/engine');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cardOf = id => ({ id, r: id % 13 + 1, s: (id / 13) | 0 });
let passed = 0; const ok = (c, m) => { assert(c, m); passed++; console.log('  ✓', m); };

// client ที่จำสถานะล่าสุดและเก็บ log เหตุการณ์
function mk(srv, name, opts = {}) {
  const c = { name, S: null, lob: null, joined: null, errors: [], states: 0, auto: opts.auto !== false, sock: M.client(srv) };
  c.sock.on('room:joined', d => { c.joined = d; if (c.autoReady !== false) c.sock.emit('game:ready', { ready: true }); }); // ผู้เล่นกดพร้อมอัตโนมัติ (flow ใหม่: เจ้าของเริ่มได้เมื่อทุกคนพร้อม)
  c.sock.on('room:lobby', l => { c.lob = l; const me = l.players.find(x => x.you); if (me && !l.started && !me.host && !me.ready && c.autoReady !== false) c.sock.emit('game:ready', { ready: true }); }); // จำลองไคลเอนต์ที่กดพร้อม/เล่นต่อให้อัตโนมัติ
  c.sock.on('system:error', m => c.errors.push(m));
  c.sock.on('game:state', s => { if (!c.first || c.first.gid !== s.gid) c.first = s; c.S = s; c.states++; if (c.auto) setTimeout(() => play(c), 0); });
  c.emit = (ev, d) => c.sock.emit(ev, d);
  c.connected = Promise.resolve();
  return c;
}
// ผู้เล่นอัตโนมัติ ตัดสินใจจากสถานะที่เซิร์ฟเวอร์ส่งมาอย่างเดียว (เหมือนหน้าเว็บ)
function play(c) {
  const S = c.S; if (!S || S.over || S.cur !== S.my || !c.sock.connected) return;
  const hand = S.hand.map(cardOf), must = S.must != null ? cardOf(S.must) : null;
  if (S.phase === 'draw') { const i = S.ok.findIndex(Boolean); return c.emit('game:act', i >= 0 && Math.random() < .7 ? { t: 'take', i } : { t: 'draw' }); }
  if (S.phase === 'play') {
    const fitOf = m => { if (hand.length - m.length >= 1) return m; for (const x of m) { if (must && x.id === must.id) continue; const r = m.filter(y => y !== x); if (E.ord(r) && hand.length - r.length >= 1) return r; } return null; };
    let ms = E.cands(hand).filter(m => !must || m.some(x => x.id === must.id)).map(fitOf).filter(Boolean);
    if (ms.length) return c.emit('game:act', { t: 'meld', ids: ms[0].map(x => x.id) });
    if (must) { c.errors.push('STUCK'); return; }
    if (hand.length === 1) return c.emit('game:act', { t: 'knock' });
    return c.emit('game:act', { t: 'dis', id: hand[Math.floor(Math.random() * hand.length)].id });
  }
}
const until = async (fn, ms = 8000, what = '') => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return true; await sleep(15); } throw new Error('timeout: ' + what); };

(async () => {
  // A: เล่นจริง (rate สูง) / B: ทดสอบ rate limit (ค่าเริ่มต้น 20/วินาที)
  const A = M.load({ NEXT_MS: 0, OPENING_MS: 0, BOT_DELAY_MS: 15, EMPTY_ROOM_TTL_MS: 600, RATE_PER_SEC: 5000 });
  const roomsA = require.cache[require.resolve('./src/index.js')].exports.rooms; // เข้าไปตรวจสถานะห้องฝั่งเซิร์ฟเวอร์ (สำรับที่สับ ฯลฯ)
  const health = async srv => M.callRoute(srv, '/health');
  const B = M.load({ NEXT_MS: 0, OPENING_MS: 0, BOT_DELAY_MS: 15, EMPTY_ROOM_TTL_MS: 500, RATE_PER_SEC: 20 });
  try {
    console.log('\n[1] เล่นคนเดียวกับบอท 5 เกมติด (ผ่าน Socket.IO จริง)');
    for (let g = 0; g < 5; g++) {
      const h = mk(A, 'solo'); await h.connected; h.emit('room:create', { name: 'solo', ch: 'boy', bg: 'gold' }); await until(() => h.joined, 3000, 'joined');
      ok(h.lob.shuffle.needed === false, 'flow ใหม่: ไม่ต้องกดสับไพ่เอง เซิร์ฟเวอร์สับให้ตอนเริ่มเกม');
      h.emit('game:start'); await until(() => h.S && h.S.over, 20000, 'solo game ' + g);
      assert(!h.errors.includes('STUCK')); h.sock.close();
    }
    ok(true, 'เล่นคนเดียวกับบอท (สับก่อนเริ่ม) จบครบ 5 เกม ไม่มี STUCK');

    console.log('\n[2] 3 คนจริงในห้องเดียว + บอทเติม 1 ที่นั่ง, ความเป็นส่วนตัวของไพ่');
    const p = [mk(A, 'P1'), mk(A, 'P2'), mk(A, 'P3')]; await Promise.all(p.map(x => x.connected));
    p[0].emit('room:create', { name: 'P1', ch: 'girl', bg: 'room-day' }); await until(() => p[0].joined);
    const code = p[0].joined.code; ok(/^[0-9A-F]{6}$/.test(code), 'ได้รหัสห้อง ' + code);
    p[1].emit('room:join', { code, name: 'P2' }); p[2].emit('room:join', { code: code.toLowerCase(), name: 'P3' });
    await until(() => p[1].joined && p[2].joined, 3000, 'join'); await until(() => p[0].lob && p[0].lob.players.length === 3);
    ok(p[0].lob.players[0].host && p[0].joined.host === true, 'ผู้สร้างห้องเป็นเจ้าของห้อง');
    p[1].emit('game:start'); await sleep(80); ok(p[1].errors.includes('เฉพาะเจ้าของห้องเริ่มเกมได้') && !p[1].S, 'คนที่ไม่ใช่เจ้าของห้องเริ่มเกมไม่ได้');
    const lateGuy = mk(A, 'Late', { auto: false }); await lateGuy.connected;
    ok(p[0].lob.shuffle.needed === false && p[0].lob.allReady === true, 'flow ใหม่: ทุกคนพร้อมแล้ว เริ่มเกมได้โดยไม่ต้องสับ');
    ok(p[0].lob.players.every(x => x.ready), 'ทุกที่นั่งขึ้นสถานะพร้อม');
    ok(p[0].lob.shuffle.shuffler === 'P1' && p[0].lob.shuffle.youShuffler === true && p[1].lob.shuffle.youShuffler === false, 'ตาแรก: สิทธิ์สับ (แบบเดิม) ยังเป็นของเจ้าของห้อง');
    p[1].errors.length = 0; p[1].emit('game:shuffle'); await sleep(80); ok(p[1].errors.some(e => /สิทธิ์สับไพ่เป็นของ P1/.test(e)) && !roomsA.get(code).deck, 'คนที่ไม่ใช่เจ้าของห้องกดสับไพ่ไม่ได้');
    let shufEv = null; p[1].sock.on('room:shuffled', d => { shufEv = d; });
    p[0].emit('game:shuffle'); await until(() => p[0].lob.shuffle.ready && p[1].lob.shuffle.ready && shufEv, 3000, 'shuffled');
    const deck1 = roomsA.get(code).deck.slice();
    ok(deck1.length === 52 && new Set(deck1).size === 52 && shufEv.by === 'P1' && shufEv.steps.includes('riffle') && p[1].lob.shuffle.by === 'P1', 'เจ้าของห้องสับไพ่สำเร็จ สำรับ 52 ใบครบ ทุกคนในห้องเห็นว่าสับแล้ว');
    ok(!JSON.stringify([shufEv, p[0].lob, p[1].lob]).includes(deck1.join(',')) && !JSON.stringify([shufEv, p[1].lob]).includes(require('./src/shuffle').toLetters(deck1)), 'ลำดับไพ่ที่สับไม่รั่วไปหา client');
    p[0].emit('game:shuffle'); await sleep(80); ok(roomsA.get(code).deck.join() !== deck1.join(), 'สับซ้ำก่อนเริ่มเกมได้ (ได้สำรับใหม่)'); const deck = roomsA.get(code).deck.slice();
    p[0].emit('game:start'); await until(() => p.every(x => x.S), 3000, 'state');
    ok(roomsA.get(code).deck === null, 'สำรับถูกใช้แล้วหมดไป ตาถัดไปต้องสับใหม่');
    ok(p.every((x, i) => x.first.hand.join() === deck.slice(i * 7, i * 7 + 7).join()) && p[0].first.disc[0][0] === deck[51], 'ไพ่ที่แจกจริงตรงกับสำรับที่เจ้าของห้องสับ (ผู้เล่น 3 คน + หัว)');
    ok(p.every((x, i) => x.first.my === i && x.first.hand.length === 7 && x.first.P.length === 4 && x.first.my === x.S.my), 'ทุกคนได้ที่นั่งตรงลำดับ ไพ่ 7 ใบ และมีโต๊ะ 4 ที่นั่ง');
    ok(p[0].S.P.filter(q => q.bot).length === 1, 'เติมบอทให้ครบ 4 ที่นั่ง');
    const allStateJson = JSON.stringify(p.map(x => x.S));
    ok(!('P' in {}) && p.every(x => x.S.P.every(q => q.h === undefined) && x.S.stock >= 0 && typeof x.S.stock === 'number'), 'state ไม่ส่งไพ่ในมือคนอื่น/กองจั่ว (ส่งแค่จำนวน)');
    lateGuy.emit('room:join', { code, name: 'Late' }); await sleep(80); ok(lateGuy.errors.includes('เกมเริ่มแล้ว เข้าห้องไม่ได้'), 'เข้าห้องระหว่างเกมไม่ได้');
    await until(() => p.every(x => x.S.over), 25000, 'game over 3 humans');
    ok(p.every(x => !x.errors.includes('STUCK')) && p.every(x => x.S.res.pts.length === 4), 'เกม 3 คนจริงจบ ไม่ค้าง ผลคะแนนครบ 4 ที่นั่ง');

    { const R = roomsA.get(code), seat = R.game.res.k != null ? R.game.res.k : R.game.res.pts.indexOf(Math.max(...R.game.res.pts)), expect = seat < 3 ? ['P1', 'P2', 'P3'][seat] : 'P1';
      await sleep(60); ok(p[1].lob.shuffle.shuffler === expect && p[1].lob.shuffle.round === 1, `จบตา: สิทธิ์สับไพ่ตาถัดไปเป็นของผู้ชนะ (${seat < 3 ? expect + ' ที่นั่ง ' + seat : 'ผู้ชนะเป็นบอท → กลับเป็นเจ้าของห้อง P1'})`); }
    console.log('\n[3] หลังจบเกม: คนมาใหม่ต้องไม่เห็นไพ่บอท / ย้ายเจ้าของห้อง / เล่นอีกตา');
    lateGuy.emit('room:join', { code, name: 'Late' }); await until(() => lateGuy.joined, 3000, 'late join'); await sleep(100);
    ok(lateGuy.S === null, 'คนที่เข้าห้องหลังเกมจบไม่ได้รับ state ของที่นั่งใครเลย (บั๊กเดิม: เห็นไพ่บอท)');
    p[0].emit('room:leave'); await sleep(120);
    ok(p[1].lob.players.find(x => x.host)?.name === 'P2' && p[1].lob.youHost === true && p[2].lob.youHost === false, 'เจ้าของห้องออก → P2 ได้เป็นเจ้าของห้อง และ client รู้ (บั๊กเดิม: ปุ่มเริ่มไม่ขึ้น)');
    lateGuy.auto = true; p[2].S = null; p[1].S = null;
    ok(p[1].lob.shuffle.needed === false, 'ตาถัดไป: ไม่ต้องสับก่อนเริ่มเช่นกัน');
    const sh = [p[1], p[2], lateGuy].find(x => x.lob.shuffle.youShuffler); ok(!!sh, 'มีผู้มีสิทธิ์สับไพ่ตาถัดไปพอดี 1 คน (' + sh.name + ')');
    const other = [p[1], p[2], lateGuy].find(x => x !== sh); other.errors.length = 0; other.emit('game:shuffle'); await sleep(80); ok(other.errors.some(e => /สิทธิ์สับไพ่เป็นของ/.test(e)), 'คนอื่นที่ไม่ใช่ผู้มีสิทธิ์สับไพ่กดสับไม่ได้');
    sh.emit('game:shuffle'); await until(() => p[1].lob.shuffle.ready, 3000, 'shuffle round 2');
    p[1].emit('game:start'); await until(() => p[1].S && p[2].S && lateGuy.S, 3000, 'rematch');
    ok(p[1].S.my === 0 && p[2].S.my === 1 && lateGuy.S.my === 2, 'ตาใหม่จัดที่นั่งใหม่ถูกต้อง (P1 ที่ออกไปไม่ถูกนับ)');
    await until(() => p[1].S.over, 25000, 'rematch over'); ok(true, 'เล่นอีกตาจบได้');
    p.forEach(x => x.sock.close()); lateGuy.sock.close();

    console.log('\n[4] หลุดกลางเกม → บอทรับช่วง → เชื่อมต่อกลับด้วย token ได้ที่นั่งเดิม');
    const q1 = mk(A, 'Q1', { auto: false }), q2 = mk(A, 'Q2'); await Promise.all([q1.connected, q2.connected]);
    q1.emit('room:create', { name: 'Q1' }); await until(() => q1.joined); const code2 = q1.joined.code, tok = q1.joined.token;
    q2.emit('room:join', { code: code2, name: 'Q2' }); await until(() => q2.joined);
    q1.emit('game:shuffle'); await until(() => q1.lob && q1.lob.shuffle.ready, 3000, 'q1 shuffle'); q1.emit('game:start'); await until(() => q1.S && q2.S);
    q1.sock.close(); await sleep(150);
    ok(q2.S.P[0].bot === true && /บอท/.test(q2.S.P[0].n), 'Q1 หลุด → ที่นั่งกลายเป็นบอท เกมไม่หยุด');
    const q1b = mk(A, 'Q1b'); await q1b.connected; q1b.emit('room:rejoin', { code: code2, token: tok });
    await until(() => q1b.S, 3000, 'rejoin state');
    ok(q1b.S.my === 0 && q1b.S.hand.length > 0 && q1b.joined.rejoined === true, 'เชื่อมต่อกลับได้ที่นั่งและไพ่เดิม');
    await sleep(100); ok(q2.S.P[0].bot === false && q2.S.P[0].n === 'Q1', 'บอทถูกปลด ที่นั่งกลับเป็นคนจริง ชื่อเดิม');
    const thief = mk(A, 'Thief'); await thief.connected; let failed = false; thief.sock.on('room:rejoin-failed', () => failed = true);
    thief.emit('room:rejoin', { code: code2, token: 'deadbeef' }); await sleep(100); ok(failed && !thief.S, 'token ปลอมใช้เชื่อมกลับไม่ได้');
    await until(() => q1b.S.over && q2.S.over, 25000, 'game over after rejoin');
    ok(q1b.S.res && !q1b.errors.includes('STUCK'), 'เกมที่มีคนหลุด-กลับ จบสมบูรณ์');
    q1b.sock.close(); q2.sock.close(); thief.sock.close();

    console.log('\n[5] กดออกเอง = ไม่ให้กลับที่นั่งเดิม, ห้องว่างถูกลบเอง');
    const r1 = mk(A, 'R1'); await r1.connected; r1.emit('room:create', { name: 'R1' }); await until(() => r1.joined); r1.emit('game:shuffle'); await until(() => r1.lob.shuffle.ready); r1.emit('game:start'); await until(() => r1.S);
    const rcode = r1.joined.code, rtok = r1.joined.token; r1.emit('room:leave'); await sleep(100);
    const r1b = mk(A, 'R1b'); await r1b.connected; let f2 = false; r1b.sock.on('room:rejoin-failed', () => f2 = true); r1b.emit('room:rejoin', { code: rcode, token: rtok }); await sleep(100);
    ok(f2, 'ออกจากห้องเอง แล้วใช้ token เดิมกลับเข้าไม่ได้');
    const before = (await health(A)).rooms; await sleep(900); const after = (await health(A)).rooms;
    ok(after < before && after === 0, `ห้องที่ไม่มีคนจริงถูกลบหลัง TTL (ห้อง ${before} → ${after})`); r1b.sock.close();

    console.log('\n[6] ความทนทาน: payload ขยะ, สแปม, ห้องไม่ซ้ำ');
    const g = mk(B, 'G', { auto: false }); await g.connected; g.emit('room:create', { name: '\u0000\u0007<b>' + 'x'.repeat(50) }); await until(() => g.joined);
    ok(g.lob.players[0].name.length <= 14 && !/[\u0000-\u001f]/.test(g.lob.players[0].name), 'ชื่อถูกตัดความยาว/ล้างอักขระควบคุม');
    g.emit('game:shuffle'); await until(() => g.lob.shuffle.ready); g.emit('game:start'); await until(() => g.S);
    for (const bad of [null, 'str', 42, [], { t: 5 }, { t: 'meld', ids: { a: 1 } }, { t: 'meld', ids: new Array(5000).fill(1) }, { t: 'take', i: 'NaN' }, { t: 'dep', k: {}, ids: 'x' }]) { g.emit('game:act', bad); await sleep(60); }
    ok((await health(B)).ok === true, 'ส่ง action ขยะ 9 แบบ เซิร์ฟเวอร์ยังอยู่ดี');
    const z = mk(B, 'Z', { auto: false }); await z.connected; await sleep(10);
    for (const ev of ['room:create', 'room:join', 'room:rejoin', 'game:start', 'game:act', 'room:leave', 'no:such:event']) for (const bad of [null, 'x', 7, [], [1, 2], { code: {} , token: [] , name: {} }]) { z.emit(ev, bad); await sleep(3); }
    await sleep(50); ok((await health(B)).ok === true, 'ส่ง null/สตริง/เลข/อาร์เรย์ ให้ทุก event เซิร์ฟเวอร์ไม่ล้ม (บั๊กใหม่ที่ดักไว้: destructure null)'); z.sock.close();
    g.errors.length = 0; for (let i = 0; i < 200; i++) g.emit('game:act', { t: 'draw' }); await sleep(300);
    ok(g.errors.includes('ส่งคำสั่งเร็วเกินไป'), 'ยิงคำสั่ง 200 ครั้งใน ~0 วินาที → ถูก rate limit');
    await sleep(1100); g.errors.length = 0; g.emit('game:act', { t: 'draw' }); await sleep(100); ok(!g.errors.includes('ส่งคำสั่งเร็วเกินไป'), 'หลังหยุดสั้น ๆ ใช้งานได้ปกติ');
    const codes = new Set(); const cs = []; for (let i = 0; i < 30; i++) { const c = mk(B, 'c' + i, { auto: false }); cs.push(c); await c.connected; c.emit('room:create', { name: 'c' }); } await sleep(500);
    cs.forEach(c => c.joined && codes.add(c.joined.code)); ok(codes.size === 30, 'สร้างห้อง 30 ห้องพร้อมกัน รหัสไม่ซ้ำ'); cs.forEach(c => c.sock.close()); g.sock.close();
    console.log('\n[7] สิทธิ์สับไพ่ตามผู้ชนะ (บังคับผลแพ้ชนะเพื่อทดสอบทุกกรณี)');
    { const H = mk(A, 'H', { auto: false }), W = mk(A, 'W', { auto: false }); W.autoReady = false; await Promise.all([H.connected, W.connected]);
      H.emit('room:create', { name: 'H' }); await until(() => H.joined); const rc = H.joined.code; W.emit('room:join', { code: rc, name: 'W' }); await until(() => W.joined && H.lob.players.length === 2);
      const R = roomsA.get(rc), force = k => { R.game.over = true; R.game.res = { k, nt: [[], [], [], []], pts: [0, k === 1 ? 60 : 0, 0, k === 3 ? 60 : 0] }; };
      ok(H.lob.allReady === false && H.lob.waitingFor.join() === 'W' && H.lob.players.find(x => x.host).ready === true, 'ล็อบบี้: เจ้าของห้องพร้อมเสมอ, W ยังไม่พร้อม');
      H.errors.length = 0; H.emit('game:start'); await sleep(80); ok(H.errors.some(e => /ยังมีผู้เล่นที่ยังไม่พร้อม: W/.test(e)) && !H.S, 'เจ้าของห้องเริ่มเกมไม่ได้ถ้ายังมีคนไม่พร้อม');
      W.emit('game:ready', { ready: true }); await until(() => H.lob.allReady, 3000, 'all ready'); ok(H.lob.waitingFor.length === 0, 'W กดพร้อม → ทุกคนพร้อม');
      W.emit('game:ready', { ready: false }); await until(() => !H.lob.allReady, 3000, 'unready'); W.emit('game:ready', { ready: true }); await until(() => H.lob.allReady, 3000, 'ready again');
      H.emit('game:start'); await until(() => H.S && W.S, 3000, 'start'); const h1 = H.S.hand.join();
      ok(R.deck === null && H.lob.players.find(x => x.name === 'W').ready === false, 'เริ่มเกมแล้ว: เซิร์ฟเวอร์สับเอง (ไม่ใช้สำรับค้าง) และรีเซ็ตสถานะพร้อม');
      force(1); const J = mk(A, 'J', { auto: false }); J.autoReady = false; await J.connected; J.emit('room:join', { code: rc, name: 'J' }); await until(() => J.joined && H.lob.shuffle.round === 1); ok(H.lob.players.find(x => x.name === 'W').ready === false, 'จบเกม: ต้องกดพร้อม (เล่นต่อ) ใหม่');
      H.errors.length = 0; H.emit('game:start'); await sleep(80); ok(H.errors.some(e => /ยังไม่พร้อม: W, J|ยังไม่พร้อม: J, W|ยังไม่พร้อม/.test(e)), 'ตาถัดไป: W/J ยังไม่ยืนยัน → เริ่มไม่ได้');
      W.emit('game:ready', { ready: true }); J.emit('game:ready', { ready: true }); await until(() => H.lob.allReady); W.S = H.S = null; H.emit('game:start'); await until(() => H.S && W.S, 3000, 'round 2');
      ok(H.S.hand.join() !== h1, 'ตาที่ 2 สับใหม่ (ไพ่ในมือต่างจากตาแรก)');
      let em = null; W.sock.on('room:emote', d => { em = d; }); H.emit('room:emote', { e: '😎' }); await until(() => em, 2000, 'emote'); ok(em.from === 'H' && em.e === '😎', 'อีโมจิในห้องส่งถึงทุกคน');
      em = null; H.emit('room:emote', { e: '<script>' }); await sleep(80); ok(em === null, 'อีโมจิที่ไม่อยู่ในรายการถูกทิ้ง'); H.sock.close(); W.sock.close(); J.sock.close(); }
    console.log('\n[8] หน้าสรุป: ทุกคนกด "เล่นต่อ" / คนออก → ที่เหลือกลับล็อบบี้ / หมดเวลา');
    { const C = M.load({ NEXT_MS: 700, OPENING_MS: 0, BOT_DELAY_MS: 15, EMPTY_ROOM_TTL_MS: 600, RATE_PER_SEC: 5000 }), roomsC = require.cache[require.resolve('./src/index.js')].exports.rooms;
      const open = async nm => { const H = mk(C, 'H' + nm, { auto: false }), W = mk(C, 'W' + nm, { auto: false }); H.autoReady = W.autoReady = false; await Promise.all([H.connected, W.connected]);
        H.emit('room:create', { name: 'H' + nm }); await until(() => H.joined); const rc = H.joined.code; W.emit('room:join', { code: rc, name: 'W' + nm }); await until(() => W.joined && H.lob.players.length === 2);
        W.emit('game:ready', { ready: true }); await until(() => H.lob.allReady); H.emit('game:start'); await until(() => H.S && W.S, 3000, 'start');
        const R = roomsC.get(rc); R.game.over = true; R.game.res = { k: 1, nt: [[], [], [], []], pts: [0, 60, 0, 0] }; R.game.v++;
        H.emit('game:ready', { ready: true }); await until(() => H.lob.next, 3000, 'next window'); return { H, W, R, rc }; };
      // (1) ทุกคนกดเล่นต่อ → เริ่มตาใหม่เอง
      { const { H, W, R, rc } = await open('a'); H.emit('game:again', { yes: true }); await sleep(60);
        const g1 = R.game; ok(H.lob.next && H.lob.next.leftMs > 0 && H.lob.next.leftMs <= 700, 'หลังจบตา: เปิดหน้าต่างยืนยันเล่นต่อ (มีเวลานับถอยหลัง)');
        W.S = H.S = null; W.emit('game:again', { yes: true }); await until(() => H.S && W.S && !H.S.over, 3000, 'next'); ok(R.game !== g1 && R.next === null, 'ทุกคนกดเล่นต่อ → เริ่มตาใหม่อัตโนมัติ');
        H.sock.close(); W.sock.close(); }
      // (2) คนหนึ่งกดออก → ที่เหลือกลับล็อบบี้ (ผู้ที่กดเล่นต่อไว้แล้วถือว่าพร้อม)
      { const { H, W, R } = await open('b'); let back = null; H.sock.on('room:lobbyback', d => { back = d; }); H.emit('game:again', { yes: true }); await sleep(60);
        W.emit('game:again', { yes: false }); await until(() => back, 2000, 'lobbyback'); await sleep(60);
        ok(back.notice.length > 0 && H.lob.players.length === 1 && R.game === null && R.next === null, 'W กดออก → H กลับล็อบบี้ในห้องเดิม (ไม่มีเกมค้าง)'); ok(H.lob.players[0].ready === true, 'คนที่กดเล่นต่อไว้ ยังมีสถานะพร้อมในล็อบบี้'); H.sock.close(); W.sock.close(); }
      // (3) หมดเวลา: คนที่ไม่กดถูกเชิญออก คนที่กดอยู่ต่อ
      { const { H, W, R } = await open('c'); let kicked = null, back = null; W.sock.on('room:kicked', d => { kicked = d; }); H.sock.on('room:lobbyback', d => { back = d; });
        H.emit('game:again', { yes: true }); await until(() => kicked && back, 3000, 'timeout'); await sleep(40);
        ok(kicked.reason.length > 0 && H.lob.players.length === 1 && H.lob.players[0].name === 'Hc', 'หมดเวลา: W ถูกเชิญออก H อยู่ต่อในล็อบบี้'); ok(R.players.length === 1 && R.next === null, 'ห้องไม่ค้าง: เหลือแต่คนที่ยังอยู่'); H.sock.close(); W.sock.close(); }
      // (4) เล่นคนเดียวกับบอท: ไม่มีเวลาหมด ต้องกดเล่นต่อเอง
      { const S1 = mk(C, 'solo8'); await S1.connected; S1.emit('room:create', { name: 'solo8' }); await until(() => S1.joined); S1.emit('game:start'); await until(() => S1.S && S1.S.over, 20000, 'solo over'); await sleep(900);
        ok(S1.lob.next && S1.lob.next.leftMs === null && S1.lob.players.length === 1, 'เล่นกับบอท: หน้าสรุปไม่มีนับถอยหลัง ไม่ถูกเตะออก'); S1.S = null; S1.emit('game:again', { yes: true }); await until(() => S1.S && !S1.S.over, 3000, 'solo next'); ok(true, 'กดเล่นต่อ → เริ่มตาใหม่ทันที'); S1.sock.close(); }
    }
const connectedPlayersCount = r => r.players.filter(p => p.connected && p.id).length;
    console.log('\n[9] Find Match: จับคู่ · นับถอยหลัง · ยกเลิกนับ · โหวตเติมบอท · ออกแล้วกลับไปหาคน');
    { const D = M.load({ NEXT_MS: 700, OPENING_MS: 0, BOT_DELAY_MS: 15, MATCH_WAIT_MS: 400, MATCH_PROMPT_MS: 400, MATCH_CD_MS: 300, EMPTY_ROOM_TTL_MS: 600, RATE_PER_SEC: 5000 }), roomsD = require.cache[require.resolve('./src/index.js')].exports.rooms;
      const cl = async nm => { const c = mk(D, nm, { auto: false }); c.autoReady = false; c.nm = nm; await c.connected; return c; };
      const find = (c, stake) => c.emit('match:find', { name: c.nm, rule: 'dummy', options: { stake } });
      const [A, B, C, E, F] = await Promise.all(['A9', 'B9', 'C9', 'E9', 'F9'].map(cl));
      find(A, 20); await until(() => A.joined && A.lob); ok(A.lob.match && A.lob.match.state === 'searching' && A.lob.match.humans === 1, 'กดหาแมตช์: เข้าห้องจับคู่ สถานะกำลังค้นหา');
      E.errors.length = 0; E.emit('room:join', { code: A.joined.code, name: 'E9' }); await sleep(80); ok(E.errors.length > 0 && !E.joined, 'ห้องจับคู่เข้าด้วยรหัสห้องไม่ได้');
      find(B, 20); await until(() => B.joined); ok(B.joined.code === A.joined.code && A.lob.match.humans === 2, 'ตัวเลือกเดียวกัน (เดิมพัน 20) → เข้าห้องเดียวกัน');
      find(C, 50); await until(() => C.joined); ok(C.joined.code !== A.joined.code, 'เดิมพันต่างกัน (50) → คนละห้อง'); C.emit('room:leave'); await sleep(60);
      find(E, 20); find(F, 20); await until(() => A.lob.match && A.lob.match.state === 'countdown', 3000, 'countdown'); ok(A.lob.match.cdLeftMs > 0 && A.lob.match.humans === 4, 'ครบ 4 คน → นับถอยหลังเริ่ม');
      await until(() => A.S && B.S && E.S && F.S, 3000, 'auto start'); ok(roomsD.get(A.joined.code).game.P.length === 4 && A.lob.match.state === 'playing', 'หมดเวลานับ → เริ่มเกมเอง ไม่ต้องมีใครกด');
      { const [G, H, I, J] = await Promise.all(['G9', 'H9', 'I9', 'J9'].map(cl)); [G, H, I, J].forEach(c => find(c, 30)); await until(() => G.lob && G.lob.match && G.lob.match.state === 'countdown', 3000, 'cd2');
        J.emit('room:leave'); await until(() => G.lob.match.state === 'searching', 2000, 'cancel cd'); await sleep(450); ok(!G.S && G.lob.match.humans === 3, 'มีคนออกระหว่างนับถอยหลัง → ยกเลิกนับ กลับไปหาคน (ไม่เริ่มเกม)'); [G, H, I, J].forEach(c => c.sock.close()); }
      { const [K, L, M2] = await Promise.all(['K9', 'L9', 'M9'].map(cl)); find(K, 40); find(L, 40); await until(() => K.lob && K.lob.match && K.lob.match.prompt && L.lob.match.prompt, 3000, 'prompt');
        ok(K.lob.match.humans === 2 && K.lob.match.prompt.leftMs > 0, 'หาไม่ครบในเวลา → ถามผู้เล่นว่า รอต่อ/เติมบอท');
        K.emit('match:choice', { c: 'bots' }); L.emit('match:choice', { c: 'wait' }); await until(() => !K.lob.match.prompt, 2000, 'resolve'); ok(!K.S && K.lob.match.state === 'searching', 'คนหนึ่งเลือกรอ → ไม่เติมบอท ยังรอต่อ');
        await until(() => K.lob.match.prompt && L.lob.match.prompt, 3000, 'prompt2'); K.emit('match:choice', { c: 'bots' }); L.emit('match:choice', { c: 'bots' });
        await until(() => K.S && L.S, 3000, 'fill bots'); const R = roomsD.get(K.joined.code); ok(R.game.P.length === 4 && connectedPlayersCount(R) === 2, 'ทุกคนเลือกเติมบอท → เริ่มเกม 2 คนจริง + บอท 2');
        // จบตา แล้ว L กดออก → K กลับไปหาคน และคนใหม่เข้าห้องเดิมได้
        R.game.over = true; R.game.res = { k: 0, nt: [[], [], [], []], pts: [60, 0, 0, 0] }; R.game.v++; K.emit('game:ready', { ready: true }); await until(() => K.lob.next, 3000, 'next');
        let back = null; K.sock.on('room:lobbyback', d => { back = d; }); L.emit('game:again', { yes: false }); await until(() => back, 2000, 'back'); await sleep(80);
        ok(K.lob.match && K.lob.match.state === 'searching' && K.lob.match.humans === 1, 'มีคนออกหลังจบตา → ที่เหลือกลับไปหาแมตช์ (กำลังหาผู้เล่นเพิ่ม)');
        find(M2, 40); await until(() => M2.joined); ok(M2.joined.code === K.joined.code && K.lob.match.humans === 2, 'ผู้เล่นใหม่เข้าห้องเดิมเพื่อเติมที่ว่างได้'); [K, L, M2].forEach(c => c.sock.close()); }
      [A, B, C, E, F].forEach(c => c.sock.close()); }
    console.log(`\nผ่านทั้งหมด ${passed} จุดตรวจ`);
  } finally { setTimeout(() => process.exit(0), 50); }
})().catch(e => { console.error('\n✗ ล้มเหลว:', e.message); process.exit(1); });
