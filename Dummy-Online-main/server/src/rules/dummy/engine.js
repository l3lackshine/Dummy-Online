// กติกาดัมมี่ — ฝั่งเซิร์ฟเวอร์เป็นผู้ตัดสินทั้งหมด (ไฟล์นี้คือ "กติกาเล่น" ส่วนการนับเหรียญอยู่ที่ scoring.js)
const crypto = require('crypto');
const Shuffle = require('../../shuffle');
const { CHARS, BGS, rnd, rndBg, rndChar } = require('../common');
const { card, cn, sp, val, sc } = require('./cards');
const Scoring = require('./scoring');
const { defaults } = require('./meta');
const BOTS = ['น้องมี่', 'ลุงหัว', 'ป้าน็อก', 'ตาโอ', 'พี่เกิด'];

// เรียงชุด: ตอง (เลขเดียวกัน ≤4 ดอกต่างกัน) หรือ เรียงดอกเดียวกัน ≥3 (A ต่ำหรือสูงได้ ไม่วนรอบ)
// กติกา: A เป็นไพ่สูงเท่านั้น (Q-K-A เกิดได้ แต่ A-2-3 และ K-A-2 เกิดไม่ได้)
function ord(cs) {
  if (cs.length < 3) return null;
  if (cs.every(c => c.r === cs[0].r)) return cs.length <= 4 && new Set(cs.map(c => c.s)).size === cs.length ? cs : null;
  if (!cs.every(c => c.s === cs[0].s)) return null;
  for (const hi of [1]) {
    const a = cs.map(c => ({ c, v: hi && c.r === 1 ? 14 : c.r })).sort((x, y) => x.v - y.v);
    if (a.every((x, i) => !i || x.v === a[i - 1].v + 1)) return a.map(x => x.c);
  }
  return null;
}
function cands(h) {
  const o = [];
  for (let r = 1; r <= 13; r++) { const g = h.filter(c => c.r === r); if (g.length >= 3) o.push(g); }
  for (let s = 0; s < 4; s++) {
    const g = h.filter(c => c.s === s);
    for (const hi of [1]) {
      const a = g.map(c => ({ c, v: hi && c.r === 1 ? 14 : c.r })).sort((x, y) => x.v - y.v); let run = [];
      a.forEach((x, i) => { if (i && x.v === a[i - 1].v + 1) run.push(x.c); else { if (run.length >= 3) o.push(run); run = [x.c]; } });
      if (run.length >= 3) o.push(run);
    }
  }
  return o;
}
const fit = (m, h, must) => {
  if (h.length - m.length >= 1) return m;
  for (const c of m) { if (c === must) continue; const r = m.filter(x => x !== c); if (ord(r) && h.length - r.length >= 1) return r; }
  return null;
};
// เก็บได้ก็ต่อเมื่อมีชุดที่ใช้ใบแรกที่เลือก และเกิดแล้วยังเหลือไพ่ในมือ ≥ 1 ใบ (ไม่งั้นผู้เล่นจะเกิดไม่ได้และทิ้งไม่ได้ = เกมค้าง)
const canTake = (G, p, i) => { const first = G.disc[i]; if (!first) return false; const available = [...p.h, ...G.disc.slice(i)]; return cands(available).some(m => m.includes(first) && !!fit(m, available, first)); };
const lg = (G, t) => { G.logs.push(t); if (G.logs.length > 30) G.logs.shift(); };

// players: [{id, n}] (คนจริง) — เติมบอทให้ครบอย่างน้อย 4 คน
// opts.deck = ลำดับไพ่ (id จากบนสุดถึงล่างสุด) ที่สับมาแล้วจากเอนจิ้น shuffle.js — ถ้าไม่ส่งมาหรือไม่ถูกต้อง จะสับใหม่ด้วยเอนจิ้นเดียวกัน
function newGame(humans, opts) {
  const o = Object.assign(defaults(), opts && opts.options), stake = Math.max(1, Math.round(Number(o.stake)) || defaults().stake);
  const order = opts && Shuffle.isValidIds(opts.deck) ? opts.deck : Shuffle.shuffle().ids;
  const d = order.map(card);
  const total = Math.max(4, humans.length);
  const P = Array.from({ length: total }, (_, i) => ({
    i, id: humans[i] ? humans[i].id : null, n: humans[i] ? humans[i].n : BOTS[i - humans.length],
    bg: humans[i] && BGS.includes(humans[i].bg) ? humans[i].bg : rndBg(),
    ch: humans[i] && CHARS.includes(humans[i].ch) ? humans[i].ch : rndChar(), // ผู้เล่นเลือกเอง / บอทสุ่ม
    bot: !humans[i], h: d.splice(0, 7), pts: 0, melded: false, suits: new Set(),
  }));
  const hd = d.pop(); hd.head = true;
  // DUMMY_FIRST (env) ใช้เฉพาะตอนทดสอบ เพื่อกำหนดคนเริ่ม
  const G = { P, melds: [], stock: d, disc: [hd], cur: typeof process !== 'undefined' && process.env.DUMMY_FIRST ? +process.env.DUMMY_FIRST % total : rnd(total), over: false, res: null, gid: crypto.randomBytes(6).toString('hex'), logs: ['หัวคือ ' + cn(hd) + ' เริ่มเลย!'], v: 0, stake, spetoMode: o.spetoMode === 'knocker' ? 'knocker' : 'all', ledger: [] };
  G.logs.push('สุ่มได้ ' + P[G.cur].n + ' เริ่มก่อน!'); begin(G); return G;
}
function begin(G) {
  G.phase = 'draw'; G.must = null; G.pack = []; G.takenBy = null; G.startM = G.P[G.cur].melded;
  if (!G.stock.length) end(G, null);
}
const nxt = G => { G.cur = (G.cur + 1) % G.P.length; begin(G); };
function lay(p, c, head) { p.pts += sc(c, head); p.suits.add(c.s); }
// ตีปี้: "ตี" (ทิ้ง) โต (2♣/Q♠) แล้วมีคนเก็บไปเกิดได้ → คนตีจ่าย 50 ให้คนเกิด
// ตีปี้หัว: ไพ่ที่ตีแล้วทำให้อีกคนเกิดหัวได้ → คนตีจ่ายค่าหัว (50, หัวเป็นโต 100) ให้คนเกิด
function pee(G, from, to, n, why) { G.P[from].pts -= n; G.P[to].pts += n; lg(G, G.P[from].n + ' ' + why + ' เสีย ' + n + ' ให้ ' + G.P[to].n); }
function peeBill(G, p, cs) {
  const pack = G.pack || [];
  // เหรียญ: ไพ่ทุกใบที่คนอื่นทิ้งไว้ แล้วถูกเก็บมาใช้เกิดในชุดนี้ = ตีปี้ (คนทิ้งจ่ายคนเกิด 1 เดิมพันต่อใบ)
  cs.forEach(c => { if (pack.includes(c) && c.by != null && c.by !== p.i) { const a = Scoring.pee(G, c.by, p.i, c); lg(G, G.P[c.by].n + ' ตีปี้ ' + cn(c) + ' จ่าย ' + a + ' 🪙 ให้ ' + p.n); } });
  cs.forEach(c => { if (pack.includes(c) && c.by != null && c.by !== p.i && sp(c)) pee(G, c.by, p.i, 50, 'ตีโต ' + cn(c)); });
  const h = G.must; if (!h || !h.head || !cs.includes(h)) return;
  const bonus = sp(h) ? 100 : 50, seen = new Set();
  cs.forEach(c => { if (c !== h && pack.includes(c) && c.by != null && c.by !== p.i && !sp(c) && !seen.has(c.by)) { seen.add(c.by); pee(G, c.by, p.i, bonus, 'ตีปี้หัว ' + cn(c)); } });
}
function doMeld(G, p, cs) {
  const m = ord(cs); p.h = p.h.filter(c => !cs.includes(c));
  G.melds.push({ o: p.i, cs: m }); cs.forEach(c => lay(p, c, c.head)); p.melded = true;
  peeBill(G, p, cs); if (G.must && cs.includes(G.must)) G.must = null; lg(G, p.n + ' เกิด ' + m.map(cn).join(' '));
}
function doDep(G, p, cs, m) {
  let n = 0;
  for (const c of cs) {
    if (p.h.length <= 1) break; const o = ord([...m.cs, c]); if (!o) continue;
    m.cs = o; p.h = p.h.filter(x => x !== c); lay(p, c, false); n++; lg(G, p.n + ' ฝาก ' + cn(c));
    if (sp(c) && m.o !== p.i) { G.P[m.o].pts -= 50; lg(G, G.P[m.o].n + ' ถูกฝากสเปโต -50'); }
  }
  return n;
}
function end(G, k) {
  G.over = true; const nt = G.P.map(() => []);
  G.P.forEach((p, i) => { if (i !== k) { const d = p.h.reduce((a, c) => a + val(c), 0); if (d) { p.pts -= d; nt[i].push('ไพ่ค้างมือ -' + d); } } });
  if (k != null) {
    const p = G.P[k]; p.pts += 50; nt[k].push('น็อก +50'); let m = 1;
    if (!G.startM) { m *= 2; nt[k].push('น็อกมืด ×2'); }
    if (p.suits.size === 1) { m *= 2; nt[k].push('น็อกสี ×2'); }
    p.pts *= m;
    if (G.takenBy != null && G.takenBy !== k) { G.P[G.takenBy].pts -= 50; nt[G.takenBy].push('ทิ้งโง่ -50'); }
    G.P.forEach((q, i) => { if (i !== k && !q.melded) { q.pts = -2 * Math.abs(q.pts); nt[i].push('ลบมืด ×2'); } });
  }
  G.res = { k, nt, pts: G.P.map(p => p.pts) };
  G.res.coin = Scoring.settle(G, k); // เหรียญแพ้ชนะของตานี้ (ledger ตีปี้ + น็อก + อมสเปโต)
}
function discard(G, p, c) {
  p.h = p.h.filter(x => x !== c); c.head = false; c.by = p.i;
  if (!p.h.length) { lg(G, p.n + ' คว่ำไพ่น็อก!'); G.down = c; end(G, p.i); return; } // ใบสุดท้ายคว่ำลงโต๊ะ ไม่เข้ากองทิ้ง
  G.disc.push(c); lg(G, p.n + ' ทิ้ง ' + cn(c)); nxt(G);
}

// การกระทำของผู้เล่น — คืน null เมื่อสำเร็จ หรือข้อความผิดพลาด
function act(G, seat, a) {
  const p = G.P[seat]; if (!p || G.over) return 'เกมจบแล้ว'; if (G.cur !== seat) return 'ยังไม่ใช่ตาของคุณ';
  const byId = ids => (Array.isArray(ids) ? ids : []).map(id => p.h.find(c => c.id === id));
  switch (a.t) {
    case 'draw':
      if (G.phase !== 'draw') return 'จั่วไปแล้ว'; if (!G.stock.length) return 'กองจั่วหมด';
      p.h.push(G.stock.pop()); G.phase = 'play'; return null;
    case 'take': {
      if (G.phase !== 'draw') return 'เก็บไม่ได้ในตอนนี้'; const i = a.i | 0;
      if (!canTake(G, p, i)) return 'ต้องเกิดชุดกับใบที่เก็บได้ก่อน';
      const g = G.disc.splice(i); G.pack = g; p.h.push(...g); G.must = g[0]; G.takenBy = g[0].by == null ? null : g[0].by;
      G.phase = 'play'; lg(G, p.n + ' เก็บ ' + cn(g[0]) + (g.length > 1 ? ' พร้อมอีก ' + (g.length - 1) + ' ใบ' : '')); return null;
    }
    case 'meld': {
      if (G.phase !== 'play') return 'จั่วก่อน'; const cs = byId(a.ids);
      if (cs.some(c => !c) || new Set(a.ids).size !== cs.length || !ord(cs)) return 'ชุดไม่ถูกต้อง';
      if (G.must && !cs.includes(G.must)) return 'ต้องใช้ ' + cn(G.must) + ' ในชุดที่เกิด';
      if (p.h.length - cs.length < 1) return 'ต้องเหลือไพ่ในมืออย่างน้อย 1 ใบ';
      doMeld(G, p, cs); return null;
    }
    case 'dep': {
      if (G.phase !== 'play') return 'จั่วก่อน'; if (!p.melded) return 'ต้องเกิดก่อนถึงจะฝากได้'; if (G.must) return 'เกิดไพ่ที่เก็บมาก่อน';
      const m = G.melds[a.k], cs = byId(a.ids); if (!m || cs.some(c => !c)) return 'ข้อมูลไม่ถูกต้อง';
      return doDep(G, p, cs, m) ? null : 'ฝากไม่ได้';
    }
    case 'dis': {
      if (G.phase !== 'play') return 'จั่วก่อน'; if (G.must) return 'ต้องเกิดไพ่ที่เก็บมาก่อน';
      if (p.h.length === 1) return 'ใบสุดท้ายต้องคว่ำเพื่อน็อก'; const c = p.h.find(x => x.id === a.id); if (!c) return 'ไม่พบไพ่ใบนี้'; discard(G, p, c); return null;
    }
    case 'autodep': { // ฝากออโต้: ฝากทุกใบที่ฝากได้ จนไม่มีใบไหนฝากได้อีก (เหลือไพ่ในมือ ≥ 1 ใบเสมอ)
      if (G.phase !== 'play') return 'จั่วก่อน'; if (!p.melded) return 'ต้องเกิดก่อนถึงจะฝากได้'; if (G.must) return 'เกิดไพ่ที่เก็บมาก่อน';
      let n = 0, mv = true;
      while (mv && p.h.length > 1) { mv = false; for (const c of [...p.h]) { const m = G.melds.find(x => ord([...x.cs, c])); if (m && doDep(G, p, [c], m)) { n++; mv = true; break; } } }
      return n ? null : 'ไม่มีไพ่ที่ฝากได้';
    }
    case 'knock': {
      if (G.phase !== 'play') return 'จั่วก่อน'; if (G.must) return 'ต้องเกิดไพ่ที่เก็บมาก่อน';
      if (p.h.length !== 1) return 'ต้องเหลือไพ่ 1 ใบ จึงจะคว่ำน็อกได้'; discard(G, p, p.h[0]); return null;
    }
  }
  return 'คำสั่งไม่ถูกต้อง';
}

const keep = (c, h) => { let k = 0; h.forEach(o => { if (o === c) return; if (o.r === c.r) k += 2; if (o.s === c.s) { const d = Math.abs(o.r - c.r); if (d === 1 || d === 12) k += 2; else if (d === 2) k += 1; } }); return sp(c) ? k + 9 : k; };
// บอท (และตัวแทนผู้เล่นที่หลุด) เล่นครบหนึ่งตา
function botTurn(G) {
  const p = G.P[G.cur]; let ti = -1;
  for (let j = G.disc.length - 1; j >= 0 && j >= G.disc.length - 4; j--) if (canTake(G, p, j)) { ti = j; break; }
  if (ti >= 0) act(G, p.i, { t: 'take', i: ti }); else if (G.stock.length) act(G, p.i, { t: 'draw' });
  for (let g = 0; g < 6 && !G.over; g++) {
    let cs = cands(p.h); if (G.must) cs = cs.filter(m => m.includes(G.must)); cs.sort((a, b) => b.length - a.length);
    let pk = null; for (const m of cs) { const f = fit(m, p.h, G.must); if (f) { pk = f; break; } }
    if (!pk) break; doMeld(G, p, pk);
  }
  if (p.melded) { let mv = true; while (mv && p.h.length > 1) { mv = false; for (const c of [...p.h]) { const m = G.melds.find(m => ord([...m.cs, c])); if (m && doDep(G, p, [c], m)) { mv = true; break; } } } }
  if (G.must) { // เกิดกับใบที่เก็บไม่ได้ (ข้อจำกัดเหลือไพ่ ≥1) — เลิกบังคับเพื่อไม่ให้เกมค้าง
    G.must = null; }
  const h = [...p.h].sort((a, b) => keep(a, p.h) - keep(b, p.h) || val(b) - val(a)); discard(G, p, h[0]);
}

// ผู้ชนะตา: คนน็อก (ถ้าไพ่หมดกอง = คนแต้มสูงสุด) — คืนเลขที่นั่ง
function winner(G) { if (!G || !G.over || !G.res) return null; if (G.res.k != null) return G.res.k; const m = Math.max(...G.res.pts); return G.res.pts.indexOf(m); }

// มุมมองเฉพาะผู้เล่น — ไม่ส่งไพ่ในมือคนอื่น/กองจั่ว
function view(G, seat) {
  const me = G.P[seat], pub = c => [c.id, c.head ? 1 : 0];
  return {
    v: G.v, gid: G.gid, rule: 'dummy', stake: G.stake, my: seat, cur: G.cur, phase: G.cur === seat ? G.phase : null, must: G.cur === seat && G.must ? G.must.id : null, over: G.over, res: G.res, down: G.over && G.down ? G.down.id : null, logs: G.logs,
    hand: me.h.map(c => c.id), stock: G.stock.length, disc: G.disc.map(pub),
    melds: G.melds.map(m => ({ o: m.o, cs: m.cs.map(c => c.id) })),
    P: G.P.map(p => ({ i: p.i, n: p.n, ch: p.ch, bg: p.bg, bot: p.bot, n_cards: p.h.length, pts: p.pts, melded: p.melded })),
    // ไพ่ที่เก็บแล้วเกิดได้ (ใช้ไฮไลต์) — คำนวณจากไพ่ของตัวเองเท่านั้น
    ok: G.cur === seat && G.phase === 'draw' && !G.over ? G.disc.map((_, i) => canTake(G, me, i)) : [],
  };
}
module.exports = { newGame, act, botTurn, view, winner, ord, cands, canTake, CHARS, BGS };

