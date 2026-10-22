/* quests.js — เควสรายวัน / รายสัปดาห์
   - ฝั่ง client ล้วน เก็บใน localStorage เหมือนเหรียญและสกิลตอนนี้ (ไม่แตะกติกา/เซิร์ฟเวอร์)
   - นับความคืบหน้าจาก "จบตา" (S.over) ครั้งละ 1 ตา อ้างอิง S.gid กันนับซ้ำเมื่อรีเฟรช
   - รีเซ็ตรายวันทุกเที่ยงคืน · รายสัปดาห์ทุกวันจันทร์ 00:00 (เวลาเครื่องผู้เล่น)
   - ปรับรางวัล/เป้าหมายได้ที่ตาราง DAILY / WEEKLY ด้านล่าง */
(function () {
  'use strict';
  if (window.DB && DB.enabled) return; // โหมดบัญชี: เควสอยู่ในฐานข้อมูล ดู account.js
  const LS = window.localStorage, KEY = 'dummyQuests', GKEY = 'dummyQuestGid';
  const DAILY_BONUS = 100, WEEKLY_BONUS = 500;

  // m = ตัวชี้วัด: play ตาที่เล่นจบ · win ตาที่ชนะ(ได้เหรียญ) · coins เหรียญที่ได้จากการชนะ · rules จำนวนเกมต่างชนิด
  //     melds ชุดที่เกิด(ดัมมี่) · knock น็อก(ดัมมี่) · days จำนวนวันที่เล่น(รายสัปดาห์) · login เช็คอิน
  // t = เป้าหมาย · r = รางวัลเหรียญ · g:1 = ใช้ได้เฉพาะดัมมี่ (แต่ละช่วงสุ่มได้ไม่เกิน 1 เควสแบบนี้)
  const DAILY_FIXED = [{ id: 'd_login', m: 'login', t: 1, r: 20, n: 'เช็คอินรายวัน', d: 'เข้าเกมวันนี้', ic: '📅' }];
  const DAILY = [
    { id: 'd_play3', m: 'play', t: 3, r: 50, n: 'วอร์มอัป', d: 'เล่นให้จบ 3 ตา', ic: '🎴' },
    { id: 'd_play5', m: 'play', t: 5, r: 100, n: 'นักเล่นตัวยง', d: 'เล่นให้จบ 5 ตา', ic: '🎴' },
    { id: 'd_win1', m: 'win', t: 1, r: 60, n: 'ชัยชนะแรก', d: 'ชนะ 1 ตา', ic: '🏆' },
    { id: 'd_win2', m: 'win', t: 2, r: 130, n: 'ชนะรัว', d: 'ชนะ 2 ตา', ic: '🏆' },
    { id: 'd_coin100', m: 'coins', t: 100, r: 80, n: 'หาเหรียญ', d: 'ได้เหรียญจากการชนะรวม 100 🪙', ic: '🪙' },
    { id: 'd_rules2', m: 'rules', t: 2, r: 90, n: 'ลองเกมใหม่', d: 'เล่น 2 เกมต่างชนิดกัน', ic: '🎲' },
    { id: 'd_melds5', m: 'melds', t: 5, r: 60, g: 1, n: 'นักเกิดไพ่', d: 'เกิดไพ่ 5 ชุด (ดัมมี่)', ic: '🃏' },
    { id: 'd_knock1', m: 'knock', t: 1, r: 100, g: 1, n: 'น็อกเอาท์', d: 'น็อกให้สำเร็จ 1 ครั้ง (ดัมมี่)', ic: '👊' }
  ];
  const WEEKLY = [
    { id: 'w_play20', m: 'play', t: 20, r: 300, n: 'มาราธอน', d: 'เล่นให้จบ 20 ตา', ic: '🎴' },
    { id: 'w_win8', m: 'win', t: 8, r: 400, n: 'เจ้าโต๊ะ', d: 'ชนะ 8 ตา', ic: '🏆' },
    { id: 'w_coin800', m: 'coins', t: 800, r: 400, n: 'เศรษฐีหน้าใหม่', d: 'ได้เหรียญจากการชนะรวม 800 🪙', ic: '💰' },
    { id: 'w_rules3', m: 'rules', t: 3, r: 300, n: 'นักสำรวจ', d: 'เล่น 3 เกมต่างชนิดกัน', ic: '🧭' },
    { id: 'w_days5', m: 'days', t: 5, r: 350, n: 'ขาประจำ', d: 'เล่นอย่างน้อย 5 วันในสัปดาห์นี้', ic: '🔥' },
    { id: 'w_melds40', m: 'melds', t: 40, r: 300, g: 1, n: 'เซียนเกิดไพ่', d: 'เกิดไพ่ 40 ชุด (ดัมมี่)', ic: '🃏' },
    { id: 'w_knock3', m: 'knock', t: 3, r: 400, g: 1, n: 'จอมน็อก', d: 'น็อกให้สำเร็จ 3 ครั้ง (ดัมมี่)', ic: '👊' }
  ];
  const BY_ID = {}; [...DAILY_FIXED, ...DAILY, ...WEEKLY].forEach(q => { BY_ID[q.id] = q; });

  // ---------- เวลา ----------
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const dayKey = t => ymd(new Date(t));
  const weekKey = t => { const d = new Date(t); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }; // วันจันทร์ของสัปดาห์นั้น
  const nextDay = t => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const nextWeek = t => { const d = new Date(nextDay(t)); while (d.getDay() !== 1) d.setDate(d.getDate() + 1); return d.getTime(); };

  // ---------- สุ่มแบบคงที่ตามวัน/สัปดาห์ (ทุกเครื่องได้ชุดเควสเดียวกันในช่วงเดียวกัน) ----------
  function rng(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0;
    return function () { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(pool, n, seed) {
    const R = rng(seed), a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const out = [], used = new Set(); let dummyOnly = 0;
    for (const q of a) { if (out.length >= n) break; if (used.has(q.m)) continue; if (q.g) { if (dummyOnly >= 1) continue; dummyOnly++; } used.add(q.m); out.push(q); }
    return out.sort((x, y) => x.r - y.r);
  }

  // ---------- สถานะ ----------
  let ST = (function () { try { const v = JSON.parse(LS.getItem(KEY)); if (v && typeof v === 'object') return v; } catch (e) {} return { seen: 0, d: null, w: null }; })();
  const persist = () => { try { LS.setItem(KEY, JSON.stringify(ST)); } catch (e) {} };
  const newPeriod = (kind, key) => ({ key, ids: (kind === 'd' ? [...DAILY_FIXED, ...pick(DAILY, 3, 'd:' + key)] : pick(WEEKLY, 4, 'w:' + key)).map(q => q.id),
    c: { play: 0, win: 0, coins: 0, melds: 0, knock: 0, login: 0 }, rules: [], days: [], claimed: {}, bonus: false });
  const metric = (p, m) => (m === 'rules' ? p.rules.length : m === 'days' ? p.days.length : (p.c && p.c[m]) || 0);
  const questsOf = p => (p ? p.ids.map(id => BY_ID[id]).filter(Boolean) : []);
  const isDone = (p, q) => metric(p, q.m) >= q.t;
  const allClaimed = p => questsOf(p).every(q => p.claimed[q.id]);

  // รีเซ็ตเมื่อข้ามวัน/สัปดาห์ · ถ้านาฬิกาเครื่องย้อนหลังเกิน 5 นาที จะไม่รีเซ็ต (กันย้อนเวลาเพื่อรีเควส)
  function roll() {
    const now = Date.now(); if (now < (ST.seen || 0) - 300000) return false;
    let ch = false; const dk = dayKey(now), wk = weekKey(now);
    if (!ST.d || ST.d.key !== dk) { ST.d = newPeriod('d', dk); ch = true; }
    if (!ST.w || ST.w.key !== wk) { ST.w = newPeriod('w', wk); ch = true; }
    if (!ST.d.c.login) { ST.d.c.login = 1; ch = true; }
    ST.seen = Math.max(ST.seen || 0, now);
    if (ch) persist();
    return ch;
  }

  // ---------- นับความคืบหน้า ----------
  const doneSet = () => { const s = new Set(); [['d', ST.d], ['w', ST.w]].forEach(([k, p]) => questsOf(p).forEach(q => { if (isDone(p, q)) s.add(k + q.id); })); return s; };
  function record(g) {
    roll(); const before = doneSet();
    [ST.d, ST.w].forEach(p => { const c = p.c; c.play++; if (g.won) c.win++; c.coins += Math.max(0, g.delta | 0); c.melds += g.melds | 0; if (g.knock) c.knock++; if (g.rule && !p.rules.includes(g.rule)) p.rules.push(g.rule); });
    const dk = dayKey(Date.now()); if (!ST.w.days.includes(dk)) ST.w.days.push(dk);
    persist();
    const fin = []; [['d', ST.d], ['w', ST.w]].forEach(([k, p]) => questsOf(p).forEach(q => { if (isDone(p, q) && !before.has(k + q.id)) fin.push(q.n); }));
    if (fin.length) toast('📜 เควสสำเร็จ: ' + fin.join(', ') + ' — ไปรับรางวัลได้เลย');
    paintHud(); if (modalOpen()) openQuests(curTab);
  }
  // ตรวจว่าจบตาใหม่ที่ยังไม่เคยนับหรือไม่ (เรียกหลัง render ทุกครั้ง)
  function scan() {
    if (typeof S === 'undefined' || !S || !S.over || !S.res) return;
    const gid = String(S.gid || ('v' + S.v + ':' + (typeof code === 'string' ? code : ''))); if (LS.getItem(GKEY) === gid) return;
    try { LS.setItem(GKEY, gid); } catch (e) {}
    const rule = S.rule || 'dummy', c = S.res.coin, delta = c && c.delta ? Number(c.delta[S.my]) || 0 : 0, isD = rule === 'dummy';
    record({ rule, delta, won: delta > 0, melds: isD ? (S.melds || []).filter(m => m.o === S.my).length : 0, knock: isD && S.res.k === S.my });
  }

  // ---------- รับรางวัล ----------
  const pay = n => { sv.coins = Math.max(0, sv.coins + n); save(); };
  const periodOf = k => (k === 'd' ? ST.d : ST.w);
  window.qClaim = function (kind, id) {
    roll(); const p = periodOf(kind), q = BY_ID[id]; if (!p || !q || !p.ids.includes(id) || p.claimed[id] || !isDone(p, q)) return;
    p.claimed[id] = 1; persist(); pay(q.r); toast('🪙 +' + q.r + ' เหรียญ'); afterClaim();
  };
  window.qBonus = function (kind) {
    roll(); const p = periodOf(kind); if (!p || p.bonus || !allClaimed(p)) return;
    const n = kind === 'd' ? DAILY_BONUS : WEEKLY_BONUS; p.bonus = true; persist(); pay(n); toast('🎁 โบนัสครบทุกเควส +' + n + ' เหรียญ'); afterClaim();
  };
  function afterClaim() { paintHud(); if (modalOpen()) openQuests(curTab); try { if (typeof render === 'function') render(); } catch (e) {} } // render ใหม่เพื่ออัปเดตตัวเลขเหรียญบน HUD

  // ---------- UI ----------
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let curTab = 'd';
  const modalEl = () => document.querySelector('.q-modal');
  const modalOpen = () => !!modalEl();
  function toast(t) { const d = document.createElement('div'); d.className = 'sk-toast q-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  const claimable = () => { let n = 0; [['d', ST.d], ['w', ST.w]].forEach(([, p]) => { if (!p) return; questsOf(p).forEach(q => { if (isDone(p, q) && !p.claimed[q.id]) n++; }); if (!p.bonus && allClaimed(p)) n++; }); return n; };
  function paintHud() {
    const h = document.querySelector('.hud'); if (!h) return;
    let b = h.querySelector('.hud-q');
    if (!b) { b = document.createElement('button'); b.className = 'hud-sk hud-q'; b.setAttribute('aria-label', 'เควส'); b.onclick = () => openQuests(); const coin = h.querySelector('.coin-pill'); coin ? h.insertBefore(b, coin) : h.appendChild(b); }
    const n = claimable(), html = '📜' + (n ? '<i>' + n + '</i>' : ''); if (b.innerHTML !== html) b.innerHTML = html;
  }
  function fmtLeft(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return d ? d + ' วัน ' + h + ' ชม.' : pad(h) + ':' + pad(m) + ':' + pad(ss); }
  const leftText = () => 'รีเซ็ตใน ' + fmtLeft((curTab === 'd' ? nextDay(Date.now()) : nextWeek(Date.now())) - Date.now());
  function row(kind, p, q) {
    const cur = metric(p, q.m), done = cur >= q.t, got = !!p.claimed[q.id], pct = Math.min(100, Math.floor(cur / q.t * 100));
    return `<div class="q-row${done ? ' done' : ''}${got ? ' got' : ''}"><div class=q-ic>${E(q.ic)}</div><div class=q-mid><b>${E(q.n)}</b><small>${E(q.d)}</small><div class=q-bar><i style="width:${pct}%"></i></div><small class=q-num>${Math.min(cur, q.t)} / ${q.t}</small></div>`
      + (got ? '<span class="q-btn got">รับแล้ว ✓</span>' : `<button class="q-btn${done ? ' go' : ''}" ${done ? '' : 'disabled'} onclick="qClaim('${kind}','${E(q.id)}')">🪙 ${q.r}</button>`) + '</div>';
  }
  window.openQuests = function (tab) {
    roll(); if (tab === 'd' || tab === 'w') curTab = tab;
    const kind = curTab, p = periodOf(kind), qs = questsOf(p), bonus = kind === 'd' ? DAILY_BONUS : WEEKLY_BONUS, doneN = qs.filter(q => p.claimed[q.id]).length;
    const bonusBtn = p.bonus ? '<span class="q-btn got">รับแล้ว ✓</span>' : `<button class="q-btn${allClaimed(p) ? ' go' : ''}" ${allClaimed(p) ? '' : 'disabled'} onclick="qBonus('${kind}')">🪙 ${bonus}</button>`;
    const html = `<div class=sk-box><button class=q-x onclick="closeQuests()" aria-label="ปิด">✕</button><h3>📜 เควส <span class=sk-coin>🪙 ${typeof sv !== 'undefined' ? sv.coins : 0}</span></h3>`
      + `<div class=q-tabs><button class="q-tab${kind === 'd' ? ' on' : ''}" onclick="openQuests('d')">รายวัน</button><button class="q-tab${kind === 'w' ? ' on' : ''}" onclick="openQuests('w')">รายสัปดาห์</button></div>`
      + `<div class=q-left id=qLeft>⏰ ${leftText()}</div>${qs.map(q => row(kind, p, q)).join('')}`
      + `<div class="q-row q-bonus${p.bonus ? ' got' : ''}"><div class=q-ic>🎁</div><div class=q-mid><b>โบนัสครบทุกเควส</b><small>รับรางวัลครบทุกเควสของ${kind === 'd' ? 'วันนี้' : 'สัปดาห์นี้'}</small><small class=q-num>${doneN} / ${qs.length}</small></div>${bonusBtn}</div>`
      + `<small class=q-note>รีเซ็ตรายวันทุกเที่ยงคืน · รายสัปดาห์ทุกวันจันทร์ (ตามเวลาเครื่อง)</small></div>`;
    let m = modalEl(); if (!m) { m = document.createElement('div'); m.className = 'sk-modal q-modal'; m.onclick = e => { if (e.target === m) closeQuests(); }; document.body.appendChild(m); }
    m.innerHTML = html;
  };
  window.closeQuests = function () { const m = modalEl(); if (m) m.remove(); };

  const css = document.createElement('style');
  css.textContent = `.hud-q{position:relative;font-size:18px;line-height:1.5}.hud-q i{position:absolute;top:-5px;right:-5px;min-width:17px;height:17px;border-radius:9px;background:#e8383d;color:#fff;font:700 11px/17px Sarabun,sans-serif;text-align:center;font-style:normal;padding:0 4px;box-shadow:0 0 0 2px #0008}
.q-toast{top:22%!important;max-width:88vw;text-align:center;white-space:normal}.q-x{position:absolute;right:10px;top:8px;border:0;background:#0006;color:#fff;border-radius:50%;width:30px;height:30px;font-size:15px;cursor:pointer}
.q-tabs{display:flex;gap:8px;margin:8px 0 4px}.q-tab{flex:1;border:2px solid #cdbcff55;border-radius:99px;padding:7px 0;background:#0004;color:#cfd3ff;font:700 14px Sarabun,sans-serif;cursor:pointer}.q-tab.on{background:linear-gradient(#a487f0,#5b3cb3);color:#fff;border-color:#cdbcff}
.q-left{font-size:12px;color:#9fe8ff;margin:4px 0 6px;text-align:center}.q-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #ffffff1f}
.q-ic{font-size:26px;width:38px;text-align:center;flex:none}.q-mid{flex:1;min-width:0}.q-mid b{display:block;font-size:15px}.q-mid small{display:block;color:#cfd3ff;font-size:12px}
.q-bar{height:7px;border-radius:4px;background:#ffffff2a;margin:5px 0 2px;overflow:hidden}.q-bar i{display:block;height:100%;background:linear-gradient(#ffd978,#f0a020);border-radius:4px}.q-row.done .q-bar i{background:linear-gradient(#4cd36f,#1f9c4a)}
.q-num{color:#ffd978!important}.q-btn{border:0;border-radius:99px;padding:8px 14px;font:700 14px Sarabun,sans-serif;color:#fff;background:#4a5886;white-space:nowrap;opacity:.7}.q-btn.go{opacity:1;background:linear-gradient(#4cd36f,#1f9c4a);box-shadow:0 3px 0 #14703a;cursor:pointer}
.q-btn.got{background:transparent;color:#9fe8ff;opacity:1;padding:8px 4px}.q-row.got{opacity:.6}.q-bonus{border-bottom:0;margin-top:4px;background:#ffd9781a;border-radius:12px;padding:9px 8px}.q-note{display:block;margin-top:10px;color:#9aa3d6;font-size:11px;text-align:center}`;
  document.head.appendChild(css);

  // ---------- เชื่อมกับเกม ----------
  roll(); persist();
  if (typeof render === 'function') { const _r = render; window.render = render = function () { const r = _r.apply(this, arguments); try { scan(); paintHud(); } catch (e) {} return r; }; }
  setInterval(() => { try { const ch = roll(); if (ch) { paintHud(); if (modalOpen()) openQuests(curTab); } const l = document.getElementById('qLeft'); if (l) l.textContent = '⏰ ' + leftText(); } catch (e) {} }, 1000);
  document.addEventListener('visibilitychange', () => { try { if (!document.hidden && roll()) { paintHud(); if (modalOpen()) openQuests(curTab); } } catch (e) {} });
  try { scan(); paintHud(); } catch (e) {}
  window.dummyQuests = { state: () => ST, roll, record, claimable };
})();
