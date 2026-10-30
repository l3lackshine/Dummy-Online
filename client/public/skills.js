/* skills.js — ระบบสกิล v3 (ฝั่งหน้าจอ)
   ตัวละคร 1 ตัว = สกิล 1 อย่าง · สกิลบอกว่าแต่ละเกมเปิด "โมดูล" อะไร (skin/skills.json → skills[].games[rule].mods)
   หลักการทุกโมดูล: ช่วยจำและช่วยดู ไม่ทำนาย ไม่ตัดสินใจแทน · ใช้แค่ไพ่ในมือตัวเอง + สิ่งที่ทุกคนเห็นบนโต๊ะ
   ตัวช่วยเดิมที่ย้ายมาเป็นสกิล: ไฮไลต์ไพ่ที่เก็บได้ (โมดูล takeable) · ปุ่มฝากออโต้ (โมดูล autodep — เซิร์ฟเวอร์เช็กซ้ำ)
   เพิ่มโมดูลใหม่: เขียนฟังก์ชันใน MOD['<rule>']['<ชื่อ>'] แล้วใส่ชื่อใน skills.json — ไม่ต้องแก้ส่วนอื่น
   Public: openSkills() · skCharCard(id, opt) · skUpStar(id) · skMods() */
(function () {
  'use strict';
  const EMPTY = { version: 3, skills: [], characters: {} };
  let SK = EMPTY; const LS = window.localStorage;
  const jget = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const dbOn = () => !!(window.DB && DB.enabled);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const charId = () => (typeof myChar === 'function' ? myChar() : '') || '';
  const stars0 = jget('dummyStars', {}), dupes0 = jget('dummyDupes', {});
  const cfgOf = id => SkillCore.charCfg(SK, id);
  const maxStars = id => cfgOf(id).maxStars;
  window.skStar5 = id => !!id && starsOf(id) >= maxStars(id); // ปลดครบดาว → ใช้ฉาก 5 ดาวได้
  const starsOf = id => Math.min(maxStars(id), Math.max(1, dbOn() ? DB.stars(id) : (Number(stars0[id]) || 1)));
  const starCost = (id, st) => { const c = cfgOf(id).starCosts; return Math.max(1, Number(c[Math.min(st, c.length) - 1]) || 1); };
  const dupesOf = id => (dbOn() ? Math.max(0, DB.qty('characters', id) - 1) : Math.max(0, Number(dupes0[id]) || 0));
  const TIER = { common: 'Common', rare: 'Rare', sr: 'SR', ssr: 'SSR' };
  const GAME = { dummy: 'ดัมมี่', pokdeng: 'ป๊อกเด้ง', gaogae: 'เก้าเก', somsip: 'ผสมสิบ', eekae: 'อีแก่' };

  function load() {
    fetch('./skin/skills.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : EMPTY)).then(j => { SK = j && Array.isArray(j.skills) ? j : EMPTY; if (typeof render === 'function') render(); }).catch(() => {});
  }
  const ruleNow = () => (typeof S !== 'undefined' && S && S.rule) || 'dummy';
  const mods = (rule) => SkillCore.modsOf(SK, charId(), rule || ruleNow());
  window.skMods = mods;
  const has = m => mods().includes(m);

  // ---------- ไพ่ ----------
  const RKs = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUs = ['♠', '♥', '♦', '♣'];
  const C = id => (id >= 52 ? { id, r: 0, s: -1, joker: true } : { id, r: id % 13 + 1, s: (id / 13) | 0 });
  const cn = id => (id >= 52 ? '🃏' : RKs[C(id).r] + SUs[C(id).s]);
  const tally = ids => { const t = {}; ids.forEach(id => { const r = C(id).r; if (r) t[r] = (t[r] || 0) + 1; }); return t; };
  const nm = i => (i === S.my ? 'คุณ' : (S.P[i] && S.P[i].n) || '?');

  // ---------- ตัวเก็บข้อมูลระหว่างเกม (ต่อห้อง / ต่อเกม) ----------
  let ACC = { room: null, gid: null, lines: new Set(), n: 0, game: {}, room_: {} };
  function acc() {
    const room = (typeof code !== 'undefined' && code) || '-', gid = S && S.gid;
    if (ACC.room !== room) ACC = { room, gid: null, lines: new Set(), n: 0, game: {}, room_: {} };
    if (ACC.gid !== gid) { ACC.gid = gid; ACC.lines = new Set(); ACC.n = 0; ACC.game = {}; }
    return ACC;
  }
  // บรรทัด log ใหม่ (ดัมมี่เก็บแค่ 30 บรรทัดล่าสุด → กันซ้ำด้วยข้อความ · เกมอื่นใช้ลำดับ)
  function newLines() {
    const a = acc(), L = (S && S.logs) || [], out = [];
    if (ruleNow() === 'dummy') { L.forEach(l => { if (!a.lines.has(l)) { a.lines.add(l); out.push(l); } }); }
    else { for (let i = a.n; i < L.length; i++) out.push(L[i]); a.n = L.length; }
    return out;
  }

  // ---------- เมลด์ดัมมี่ (เหมือน engine: A สูงอย่างเดียว) ----------
  const ord = cs => {
    if (cs.length < 3) return false;
    if (cs.every(c => c.r === cs[0].r)) return cs.length <= 4 && new Set(cs.map(c => c.s)).size === cs.length;
    if (!cs.every(c => c.s === cs[0].s)) return false;
    const v = cs.map(c => (c.r === 1 ? 14 : c.r)).sort((a, b) => a - b); return v.every((x, i) => !i || x === v[i - 1] + 1);
  };
  function meldCards(ids) {
    const h = ids.map(C), on = new Set();
    for (let r = 1; r <= 13; r++) { const g = h.filter(c => c.r === r); if (g.length >= 3) g.forEach(c => on.add(c.id)); }
    for (let s = 0; s < 4; s++) {
      const a = h.filter(c => c.s === s).map(c => ({ c, v: c.r === 1 ? 14 : c.r })).sort((x, y) => x.v - y.v); let run = [];
      const flush = () => { if (run.length >= 3) run.forEach(c => on.add(c.id)); };
      a.forEach((x, i) => { if (i && x.v === a[i - 1].v + 1) run.push(x.c); else { flush(); run = [x.c]; } }); flush();
    }
    return on;
  }
  const dval = id => { const c = C(id); return (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0) ? 50 : c.r === 1 ? 15 : c.r >= 10 ? 10 : 5; };
  const SPETO = [40, 11]; // 2♣ Q♠

  // ---------- ตั้งค่าของโมดูลอัตโนมัติ ----------
  const setv = Object.assign({ pdDraw: 0, ggCall: 0, ssWin: 0, ekPick: 0 }, jget('dummySkillSet', {})); // ตัวช่วยอัตโนมัติทุกอันเริ่มต้น = ปิด
  window.skSet = (k, v) => { setv[k] = Math.max(0, Math.round(Number(v) || 0)); jset('dummySkillSet', setv); render(); };
  const tog = (k, label) => `<label class=sk-tog><input type=checkbox ${setv[k] ? 'checked' : ''} onchange="skSet('${k}',this.checked?1:0)"> ${label}</label>`;
  let autoKey = '';
  const once = (k, fn, ms) => { const key = (S && S.gid) + ':' + (S && S.v) + ':' + k; if (autoKey === key) return; autoKey = key; setTimeout(() => { if (S && (S.gid + ':' + S.v + ':' + k) === key) fn(); }, ms || 700); };

  // ---------- โมดูล: แต่ละอันคืน { lines:[html], hi:[ids], warn:[ids] } ----------
  const MOD = {
    dummy: {
      takeable: () => ({}),                       // ทำงานผ่าน S.ok (ดูที่ gate())
      autodep: () => ({}),                        // ทำงานผ่านปุ่มฝากออโต้ (ดูที่ gate())
      count: () => { const seen = tally([...S.hand, ...S.disc.map(d => d[0]), ...S.melds.flatMap(m => m.cs)]);
        const rs = [...new Set(S.hand.map(i => C(i).r))].sort((a, b) => a - b);
        return { lines: rs.length ? ['ยังไม่เห็น: ' + rs.map(r => `<b>${RKs[r]}</b>×${Math.max(0, 4 - (seen[r] || 0))}`).join(' ')] : [] }; },
      speto: () => ({ lines: [SPETO.map(id => { const m = S.melds.find(x => x.cs.includes(id));
        const w = S.hand.includes(id) ? 'อยู่ในมือคุณ' : S.disc.some(d => d[0] === id) ? 'อยู่ในกองทิ้ง' : m ? 'เกิดแล้ว (' + E(nm(m.o)) + ')' : 'ยังไม่ออก';
        return `<b>${cn(id)}</b> ${w}`; }).join(' · ')] }),
      log: () => { const a = acc(); a.game.take = a.game.take || []; newLines().forEach(l => { if (/ เก็บ /.test(l)) a.game.take.push(l); });
        return { lines: a.game.take.length ? ['เก็บจากกองทิ้ง: ' + a.game.take.slice(-5).map(E).join(' · ')] : ['ยังไม่มีใครเก็บจากกองทิ้ง'] }; },
      danger: () => { const d = S.P.filter(p => p.i !== S.my && p.n_cards <= 2);
        return { lines: d.length ? [`<em class=sk-w>⚠ ${d.map(p => E(p.n) + ' เหลือ ' + p.n_cards + ' ใบ').join(' · ')}</em>`] : [] }; },
      clear: () => { const top = S.hand.slice().sort((a, b) => dval(b) - dval(a)).filter(id => dval(id) >= 10).slice(0, 3);
        return { warn: S.P.some(p => p.i !== S.my && p.n_cards <= 2) ? top : [] }; },
      score: () => { const pen = S.hand.reduce((a, id) => a + dval(id), 0), me = S.P[S.my] || {};
        return { lines: [`แต้มบนโต๊ะ <b>${me.pts || 0}</b> · ถ้าจบตอนนี้ค้างมือ <b>-${pen}</b>`] }; },
      melds: () => ({ hi: [...meldCards(S.hand)] }),
      deposit: () => ({ hi: S.hand.filter(id => S.melds.some(m => ord([...m.cs, id].map(C)))) }),
    },
    pokdeng: {
      'pd-deng': () => { const h = S.hand.map(C); if (h.length !== 2 || !S.canDraw) return {};
        const o = []; if (h[0].s === h[1].s) o.push(`จั่วได้ ${SUs[h[0].s]} → สามเด้ง`);
        if (h[0].r === h[1].r) o.push(`จั่วได้ ${RKs[h[0].r]} → ตอง`);
        if (h.every(c => c.r >= 11)) o.push('จั่วได้ไพ่ภาพ → สามเหลือง');
        return { lines: o.length ? ['ถ้าจั่วเพิ่ม: ' + o.join(' · ')] : ['ไม่มีเด้งพิเศษจากใบที่ 3'] }; },
      'pd-autodraw': () => { const th = setv.pdDraw || 0;
        if (th > 0 && S.canDraw && S.mine && S.mine.type !== 'pok' && S.mine.taem < th && typeof gxAct === 'function') once('pdraw', () => gxAct('draw'));
        return { lines: [`จั่วอัตโนมัติถ้าแต้มต่ำกว่า <input class=sk-n type=number min=0 max=9 value="${th}" onchange="skSet('pdDraw',this.value)"> (0 = ปิด)`] }; },
      'pd-log': () => { const a = acc(), r = a.room_.pok = a.room_.pok || {}, g = a.game; g.pok = g.pok || new Set();
        S.P.forEach(p => { if (p.pok && !g.pok.has(p.i)) { g.pok.add(p.i); r[p.n] = (r[p.n] || 0) + 1; } });
        const k = Object.keys(r); return { lines: [k.length ? 'ป๊อกในห้องนี้: ' + k.map(n => E(n) + '×' + r[n]).join(' · ') : 'ยังไม่มีใครป๊อกในห้องนี้'] }; },
      'pd-key': () => { const t = tally([...S.hand, ...S.P.flatMap(p => p.cards || [])]); return { lines: [`เห็นแล้วรอบนี้: 8 ×${t[8] || 0} · 9 ×${t[9] || 0}`] }; },
      'pd-count': () => { const t = tally(S.P.flatMap(p => (p.i === S.my ? [] : p.cards || [])));
        const k = Object.keys(t); return { lines: [k.length ? 'ไพ่คนอื่นที่เปิดแล้ว: ' + k.map(r => RKs[r] + '×' + t[r]).join(' ') : 'ยังไม่มีใครเปิดไพ่'] }; },
      'pd-danger': () => { const p = S.P.filter(x => x.i !== S.my && x.pok); return { lines: p.length ? [`<em class=sk-w>⚠ ${p.map(x => E(x.n) + (x.i === S.dealer ? ' (เจ้ามือ)' : '')).join(', ')} ป๊อก!</em>`] : [] }; },
      'pd-score': () => (S.mine ? { lines: [`มือคุณ <b>${E(S.mine.name)}</b> · ${S.mine.deng || 1} เด้ง${S.my !== S.dealer ? ` · ถ้าชนะเจ้ามือ +${(S.stake || 0) * (S.mine.deng || 1)}` : ''}`] } : {}),
    },
    gaogae: {
      'gg-ladder': () => { const L = [['tong', 'ตอง'], ['seq', 'เรียง'], ['sean', 'เซียน'], ['colour', 'สี'], ['point', 'แต้ม']], t = S.mine && S.mine.type, k = L.findIndex(x => x[0] === t);
        return { lines: [L.map((x, i) => (i === k ? `<b class=sk-on>${x[1]}</b>` : x[1])).join(' › ') + (k >= 0 ? ` · มือคุณอันดับ ${k + 1}/5` : '')] }; },
      'gg-autocall': () => { const lim = setv.ggCall || 0;
        if (lim > 0 && S.cur === S.my && !S.over && S.phase === 'bet' && S.toCall > 0 && S.toCall <= lim && typeof gxAct === 'function') once('gcall', () => gxAct('call'));
        return { lines: [`ตามอัตโนมัติไม่เกิน <input class=sk-n type=number min=0 value="${lim}" onchange="skSet('ggCall',this.value)"> เหรียญ (0 = ปิด)`] }; },
      'gg-log': () => { const a = acc(), r = a.room_.style = a.room_.style || {};
        newLines().forEach(l => { const m = /^(.+?) (หมอบ|ตาม|สู้|เกทับ)/.exec(l); if (m) { const o = r[m[1]] = r[m[1]] || { f: 0, c: 0, r: 0 }; m[2] === 'หมอบ' ? o.f++ : m[2] === 'เกทับ' ? o.r++ : o.c++; } });
        const k = Object.keys(r); return { lines: [k.length ? k.map(n => `${E(n)}: หมอบ${r[n].f} ตาม${r[n].c} เกทับ${r[n].r}`).join(' · ') : 'ยังไม่มีข้อมูลการเล่นในห้องนี้'] }; },
      'gg-key': () => { const t = tally([...S.hand, ...S.P.flatMap(p => (p.i === S.my ? [] : p.cards || []))]); return { lines: [`ไพ่ภาพที่เห็นแล้ว: J×${t[11] || 0} Q×${t[12] || 0} K×${t[13] || 0}`] }; },
      'gg-count': () => { const n = S.P.reduce((a, p) => a + (p.i === S.my ? 0 : (p.cards || []).length), 0); return { lines: [`ไพ่คนอื่นที่หงายแล้ว: ${n} ใบ`] }; },
      'gg-danger': () => (S.raises > 0 ? { lines: [`<em class=sk-w>⚠ มีการเกทับแล้ว ${S.raises} ครั้ง · เดิมพันตอนนี้ ${S.cb}</em>`] } : {}),
      'gg-score': () => ({ lines: [`กองกลาง <b>${S.pot || 0}</b> · ต้องตาม <b>${S.toCall || 0}</b>`] }),
    },
    somsip: {
      'ss-pairs': () => { const W = new Set(S.wild || []), h = S.hand.slice(), used = new Set(), hi = [];
        const ok = (a, b) => { if (W.has(a) || W.has(b)) return true; const x = C(a), y = C(b); return (x.r <= 9 && y.r <= 9 && x.r + y.r === 10) || (x.r === 10 && y.r === 10) || (x.r >= 11 && x.r === y.r); };
        for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) if (!used.has(h[i]) && !used.has(h[j]) && ok(h[i], h[j])) { used.add(h[i]); used.add(h[j]); hi.push(h[i], h[j]); }
        const need = h.filter(id => !used.has(id)).map(id => { const c = C(id); return c.joker ? null : c.r <= 9 ? RKs[10 - c.r] : RKs[c.r]; }).filter(Boolean);
        return { hi, lines: need.length ? ['ใบที่ขาด: ' + [...new Set(need)].join(' ')] : [] }; },
      'ss-autowin': () => { if (setv.ssWin && S.canWin && S.cur === S.my && !S.over && typeof gxAct === 'function') once('swin', () => gxAct('win'));
        return { lines: [tog('ssWin', 'ประกาศชนะให้อัตโนมัติเมื่อครบ')] }; },
      'ss-log': () => { const a = acc(); a.game.dis = a.game.dis || []; newLines().forEach(l => { if (/ ทิ้ง /.test(l)) a.game.dis.push(l); });
        return { lines: a.game.dis.length ? ['ทิ้งล่าสุด: ' + a.game.dis.slice(-5).map(E).join(' · ')] : [] }; },
      'ss-key': () => { const W = S.wildRank, seen = [...S.hand, ...S.P.flatMap(p => p.pile || [])], n = seen.filter(id => id >= 52 || (W && C(id).r === W)).length;
        return { lines: [S.wildOn ? `ไวลด์ที่เห็นแล้ว ${n} ใบ` : 'ห้องนี้ไม่มีไวลด์'] }; },
      'ss-count': () => { const seen = tally([...S.hand, ...S.P.flatMap(p => p.pile || [])]), rs = [...new Set(S.hand.map(id => C(id)).filter(c => c.r).map(c => (c.r <= 9 ? 10 - c.r : c.r)))].sort((a, b) => a - b);
        return { lines: rs.length ? ['ไพ่ที่ต้องการยังไม่เห็น: ' + rs.map(r => `<b>${RKs[r]}</b>×${Math.max(0, 4 - (seen[r] || 0))}`).join(' ')] : [] }; },
      'ss-danger': () => (S.stock <= 8 ? { lines: [`<em class=sk-w>⚠ กองจั่วเหลือ ${S.stock} ใบ</em>`] } : {}),
      'ss-score': () => { const r = MOD.somsip['ss-pairs'](); return { lines: [`ครบแล้ว <b>${Math.min(3, (r.hi || []).length / 2)}</b>/3 คู่`] }; },
    },
    eekae: {
      'ek-new': () => { const a = acc(), prev = a.game.hand || [], now = S.hand; a.game.hand = now.slice();
        const nw = prev.length ? now.filter(id => !prev.includes(id)) : []; if (nw.length) a.game.fresh = { ids: nw, until: Date.now() + 4000 };
        const f = a.game.fresh; return { hi: f && Date.now() < f.until ? f.ids : [] }; },
      'ek-autopick': () => { if (setv.ekPick && S.src >= 0 && S.srcN > 0 && S.cur === S.my && !S.over && typeof gxPick === 'function') once('epick', () => gxPick(Math.floor(Math.random() * S.srcN)), 900);
        return { lines: [tog('ekPick', 'จั่วไพ่ให้อัตโนมัติเมื่อถึงตา')] }; },
      'ek-log': () => { const a = acc(); a.game.ev = a.game.ev || []; newLines().forEach(l => { if (/ จั่วจาก /.test(l)) a.game.ev.push(l); });
        return { lines: a.game.ev.length ? [a.game.ev.slice(-4).map(E).join(' · ')] : [] }; },
      'ek-key': () => { const n = ((S.logs || []).join('\n').match(/ได้คู่ Q /g) || []).length; return { lines: [`ควีนถูกจับคู่ไปแล้ว ${n} คู่`] }; },
      'ek-count': () => { const t = {}; (S.logs || []).forEach(l => { const m = / ได้คู่ (\S+) /.exec(l); if (m) t[m[1]] = (t[m[1]] || 0) + 1; });
        const k = Object.keys(t); return { lines: [k.length ? 'คู่ที่ทิ้งระหว่างเกม: ' + k.map(r => r + '×' + t[r]).join(' ') : 'ยังไม่มีคู่ที่ทิ้งระหว่างเกม'] }; },
      'ek-danger': () => { const d = S.P.filter(p => p.i !== S.my && !p.out && p.n_cards <= 2); return { lines: d.length ? [`<em class=sk-w>⚠ ${d.map(p => E(p.n) + ' เหลือ ' + p.n_cards + ' ใบ').join(' · ')}</em>`] : [] }; },
      'ek-score': () => ({ lines: [`ไพ่ในมือ <b>${S.hand.length}</b> ใบ${S.hand.some(id => C(id).r === 12) ? ' · มีควีนในมือ' : ''}`] }),
    },
  };

  // ---------- ตัวช่วยเดิมที่ตอนนี้เป็นสกิล: ปิดถ้าไม่มีโมดูล ----------
  function gate() {
    if (typeof S === 'undefined' || !S || S.over) return;
    if ((S.rule || 'dummy') !== 'dummy' || !Array.isArray(S.ok)) return;
    if (!S._ok0) Object.defineProperty(S, '_ok0', { value: S.ok.slice(), enumerable: false }); // เก็บค่าจากเซิร์ฟเวอร์ไว้ (ไฟล์สกิลอาจยังโหลดไม่เสร็จ)
    S.ok = has('takeable') ? S._ok0.slice() : [];
  }
  function gateDom() {
    if ((typeof S === 'undefined' || !S) || (S.rule && S.rule !== 'dummy')) return;
    if (!has('autodep')) document.querySelectorAll('button[onclick^="adep("]').forEach(b => b.remove());
  }

  // ---------- วาดผล ----------
  window.skInfoMin = rule => { const el = document.querySelector('.sk-info'), min = !(el && el.classList.contains('min')); try { localStorage.setItem('dummySkMin:' + rule, min ? '1' : '0'); } catch (e) {} paint(); };
  function paint() {
    document.querySelectorAll('.sk-info').forEach(n => n.remove());
    document.querySelectorAll('.c.hk,.c.sk-hi').forEach(n => n.classList.remove('hk', 'sk-hi'));
    gateDom();
    if (typeof S === 'undefined' || !S || typeof screen === 'undefined' || screen !== 'game' || S.over) return;
    const rule = ruleNow(), ms = mods(rule), lib = MOD[rule] || {}, s = SkillCore.skillOf(SK, charId()); if (!ms.length || !s) return;
    const lines = [], hi = new Set(), warn = new Set();
    ms.forEach(m => { const f = lib[m]; if (!f) return; let r = {}; try { r = f() || {}; } catch (e) { r = {}; }
      (r.lines || []).forEach(l => lines.push(l)); (r.hi || []).forEach(id => hi.add(id)); (r.warn || []).forEach(id => warn.add(id)); });
    document.querySelectorAll('.hand .c[data-id], .gx-dock .c[data-id]').forEach(b => { const id = Number(b.dataset.id); if (hi.has(id)) b.classList.add('hk'); if (warn.has(id)) b.classList.add('sk-hi'); });
    if (!lines.length) return;
    const host = document.querySelector('.gx-stage') || document.getElementById('app'); if (!host) return;
    // แผงพับได้: แตะหัวแผงเพื่อพับ/กาง · จำแยกตามเกม · ดัมมี่ (โต๊ะมีที่ว่าง) กางไว้ตั้งแต่แรก เกมอื่นพับไว้ก่อน
    let min = rule !== 'dummy'; try { const v = localStorage.getItem('dummySkMin:' + rule); if (v != null) min = v === '1'; } catch (e) {}
    const d = document.createElement('div'); d.className = 'sk-info sk-t-' + (s.tier || 'common') + (rule === 'dummy' ? ' sk-wide' : ' sk-narrow') + (min ? ' min' : '');
    d.innerHTML = `<b class=sk-ttl onclick="skInfoMin('${E(rule)}')">${E(s.icon || '')} ${E(s.name)}<span class=sk-tg>${min ? '▸ แตะเพื่อดู' : '▾ พับ'}</span></b>${lines.map(l => `<div>${l}</div>`).join('')}`;
    host.appendChild(d);
  }

  // ---------- การ์ดตัวละคร (หน้าสกิล / ช่องเก็บของ) ----------
  // เหรียญที่ใช้อัปดาว (ต้องตรงกับ game_config.star_coin_cost ในฐานข้อมูล)
  const coinCost = st => { const a = (dbOn() && Array.isArray(DB.P.star_coin_cost) ? DB.P.star_coin_cost : null) || [500, 1000, 2000, 4000]; return Number(a[Math.min(st - 1, a.length - 1)]) || 0; };
  const coinsNow = () => (dbOn() ? Number(DB.P.coins) || 0 : (typeof sv !== 'undefined' ? sv.coins : 0));
  const starsHtml = (n, max) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  window.skCharCard = function (id, opt) {
    opt = opt || {}; const ch = (typeof SKIN_REGISTRY !== 'undefined' ? SKIN_REGISTRY.characters || [] : []).find(x => x.id === id), s = SkillCore.skillOf(SK, id);
    const st = starsOf(id), max = maxStars(id), full = st >= max, cost = full ? 0 : starCost(id, st), have = dupesOf(id), cc = full ? 0 : coinCost(st), can = !full && have >= cost && coinsNow() >= cc;
    const games = s ? Object.keys(GAME).filter(g => s.games && s.games[g]).map(g => `<div class=ck-g><b>${GAME[g]}</b><small>${E(s.games[g].desc || '')}</small></div>`).join('') : '';
    const un = (SK.starUnlocks || []).filter(u => u.star <= max).map(u => `<li class="${st >= u.star ? 'on' : ''}">${'★'.repeat(u.star)} ${E(u.name)} <em>เร็ว ๆ นี้</em></li>`).join('');
    const up = full ? '<button class="sk-up" disabled>⭐ ดาวเต็มแล้ว</button>' : `<button class="sk-up" ${can ? '' : 'disabled'} onclick="skUpStar('${E(id)}')">⭐ อัพเป็น ${st + 1} ดาว · ตัวซ้ำ ${cost} (มี ${have}) + ${cc.toLocaleString('en-US')} 🪙</button>${!can && dbOn() ? `<button class="sk-up" onclick="document.querySelectorAll('.sk-modal').forEach(n=>n.remove());go('shop')">🎰 ไปสุ่มกาชาเพื่อหาตัวซ้ำ</button>` : ''}`;
    return `<div class="ck${opt.compact ? ' compact' : ''}"><div class=ck-h>${ch && ch.asset ? `<img src="${E(ch.asset)}" alt="">` : ''}<div><b>${E((ch && ch.name) || id || 'ตัวละคร')}</b><div class=ck-stars>${starsHtml(st, max)}</div></div></div>
      ${s ? `<div class=ck-sk2><span class="ck-tier ${E(s.tier)}">${TIER[s.tier] || ''}</span><b>${E(s.icon || '')} ${E(s.name)}</b><small>${E(s.desc || '')}</small></div>${opt.compact ? '' : games}` : '<small class=ck-none>ตัวละครนี้ยังไม่มีสกิล</small>'}
      ${opt.compact ? '' : `<h4>ดาวปลดของแต่ง (ไม่เพิ่มพลัง)</h4><ul class=ck-un>${un}</ul>`}<div class=ck-up>${up}</div></div>`;
  };
  window.skUpStar = async function (id) {
    const st = starsOf(id); if (st >= maxStars(id)) return; const cost = starCost(id, st);
    if (dbOn()) { try { const r = await DB.upStar(id); if (window.dbToast) dbToast('⭐ ' + r.stars + ' ดาว!'); } catch (e) { if (window.dbToast) dbToast(e.message); } }
    else { const cc = coinCost(st); if (dupesOf(id) < cost || sv.coins < cc) return; sv.coins -= cc; dupes0[id] = dupesOf(id) - cost; jset('dummyDupes', dupes0); stars0[id] = st + 1; jset('dummyStars', stars0); if (typeof save === 'function') save(); }
    const m = document.querySelector('.sk-modal.sk-main'); if (m) fill(m); render();
  };
  function fill(m) {
    const id = charId();
    m.innerHTML = `<div class=sk-box><button class=sk-x onclick="this.closest('.sk-modal').remove()">✕</button><h3>สกิลตัวละคร</h3>${id ? skCharCard(id) : '<small>ยังไม่ได้เลือกตัวละคร</small>'}
      <small class=sk-rule>สกิลช่วยจำและช่วยดูเท่านั้น ไม่เห็นไพ่คนอื่น ไม่ทำนาย และไม่เปลี่ยนกติกา · เปลี่ยนตัวละครได้ที่ช่องเก็บของ</small></div>`;
  }
  window.openSkills = function () {
    document.querySelectorAll('.sk-modal.sk-main').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'sk-modal sk-main'; m.onclick = e => { if (e.target === m) m.remove(); };
    fill(m); document.body.appendChild(m);
  };
  // ล้างค่าเก่าของระบบเดิม (โหมดทดสอบ / ไฟล์สกิลที่ทับในเครื่อง) — ไม่ใช้แล้ว
  try { LS.removeItem('dummySkillTest'); LS.removeItem('dummySkillsOverride'); } catch (e) {}

  if (typeof render === 'function') { const _r = render; window.render = render = function () { try { gate(); } catch (e) {} const r = _r.apply(this, arguments); try { paint(); } catch (e) {} return r; }; }
  load();
})();
