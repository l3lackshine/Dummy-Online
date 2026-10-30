/* account.js — หน้าเข้าสู่ระบบ/สมัคร · รางวัลล็อกอินรายวัน · เควสรายวัน/รายสัปดาห์ (ข้อมูลจากฐานข้อมูล) · ปุ่มบน HUD
   ทำงานเฉพาะเมื่อเปิดใช้ Supabase (DB.enabled) — ไม่งั้นเกมใช้ระบบเดิมในเครื่อง (quests.js) */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $id = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  function toast(t, cls) { const d = document.createElement('div'); d.className = 'sk-toast q-toast ' + (cls || ''); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3400); }
  window.dbToast = toast;
  const pad = n => String(n).padStart(2, '0');
  const fmtLeft = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return d ? d + ' วัน ' + h + ' ชม.' : pad(h) + ':' + pad(m) + ':' + pad(ss); };
  window.fmtDateTime = v => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };

  // ================= หน้าเข้าสู่ระบบ / สมัครสมาชิก =================
  let mode = 'login', busy = false, msg = '', vals = { u: '', n: '' };
  const readVals = () => { const u = $id('au_u'), n = $id('au_n'); if (u) vals.u = u.value; if (n) vals.n = n.value; };
  window.auMode = m => { readVals(); mode = m; msg = ''; paintAuth(true); };
  window.auReset = () => { mode = 'login'; msg = ''; busy = false; vals = { u: '', n: '' }; };
  window.auShow = () => { const p = $id('au_p'), q = $id('au_p2'), t = p && p.type === 'password' ? 'text' : 'password'; if (p) p.type = t; if (q) q.type = t; };
  window.auSubmit = async ev => {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (busy) return false;
    const u = ($id('au_u') || {}).value || '', p = ($id('au_p') || {}).value || '', n = ($id('au_n') || {}).value || '', p2 = ($id('au_p2') || {}).value || '';
    vals.u = u; vals.n = n; msg = '';
    if (!u.trim() || !p) { msg = 'กรอกชื่อผู้ใช้และรหัสผ่านให้ครบ'; paintAuth(true); return false; }
    if (mode === 'register' && p !== p2) { msg = 'รหัสผ่านสองช่องไม่ตรงกัน'; paintAuth(true); return false; }
    busy = true; paintAuth(true);
    try { mode === 'register' ? await DB.signUp(u, p, n) : await DB.signIn(u, p); busy = false; msg = ''; }
    catch (e) { busy = false; msg = e.message || 'เข้าสู่ระบบไม่สำเร็จ'; paintAuth(true); }
    return false;
  };
  function paintAuth(force) {
    const app = $id('app'); if (!app) return;
    const sig = [mode, busy, msg, DB.loading].join('|');
    if (!force && app.dataset.auSig === sig && $id('au_u')) return;
    if (!DB.loading) readVals();
    app.dataset.auSig = sig; app.className = 'auth';
    const reg = mode === 'register';
    const body = DB.loading ? '<p class=au-load>⏳ กำลังตรวจสอบบัญชี...</p>' : `
      <div class=au-tabs role=tablist><button type=button class="${reg ? '' : 'on'}" onclick="auMode('login')">เข้าสู่ระบบ</button><button type=button class="${reg ? 'on' : ''}" onclick="auMode('register')">สมัครสมาชิก</button></div>
      <form class=au-form onsubmit="return auSubmit(event)" autocomplete="on" novalidate>
        <label><span>ชื่อผู้ใช้</span><input id=au_u name=username value="${E(vals.u)}" maxlength=${reg ? 20 : 60} placeholder="${reg ? 'a-z 0-9 _ (3-20 ตัว)' : 'ชื่อผู้ใช้'}" autocomplete=username autocapitalize=none autocorrect=off spellcheck=false ${busy ? 'disabled' : ''}></label>
        ${reg ? `<label><span>ชื่อที่แสดงในเกม</span><input id=au_n name=nickname value="${E(vals.n)}" maxlength=14 placeholder="ชื่อเล่น (ไม่เกิน 14 ตัว)" autocomplete=nickname ${busy ? 'disabled' : ''}></label>` : ''}
        <label><span>รหัสผ่าน</span><input id=au_p name=password type=password placeholder="${reg ? 'อย่างน้อย 6 ตัวอักษร' : 'รหัสผ่าน'}" autocomplete="${reg ? 'new-password' : 'current-password'}" ${busy ? 'disabled' : ''}></label>
        ${reg ? `<label><span>ยืนยันรหัสผ่าน</span><input id=au_p2 name=password2 type=password placeholder="พิมพ์รหัสผ่านอีกครั้ง" autocomplete=new-password ${busy ? 'disabled' : ''}></label>` : ''}
        <label class=au-show><input type=checkbox onchange="auShow()"> แสดงรหัสผ่าน</label>
        <button class=au-go type=submit ${busy ? 'disabled' : ''}>${busy ? '⏳ กำลังดำเนินการ...' : reg ? '🎁 สมัครสมาชิก' : '▶ เข้าสู่ระบบ'}</button>
        ${msg ? `<p class=au-err role=alert>⚠️ ${E(msg)}</p>` : ''}
        <small class=au-hint>${reg ? 'สมัครใหม่รับเหรียญเริ่มต้นไปเล่นได้ทันที · ข้อมูลเหรียญ ตัวละคร และเควสผูกกับบัญชี เล่นได้ทุกเครื่อง' : 'ยังไม่มีบัญชี? กด "สมัครสมาชิก" ด้านบน'}</small>
      </form>`;
    app.innerHTML = `<div class=au-wrap><div class=au-card><div class=au-logo><span class=au-ic>🂡</span><b>ไพ่ดัมมี่</b><small>ออนไลน์</small></div>${body}</div><span class=au-ver>v${E(window.DUMMY_VERSION || '')}</span></div>`;
    if (!DB.loading && !busy) { const f = $id(vals.u ? 'au_p' : 'au_u'); if (f && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) f.focus(); }
  }
  window.authView = () => paintAuth(false);

  // ================= รางวัลล็อกอินรายวัน =================
  const rw = r => [r.coins ? `<i>🪙 ${fmt(r.coins)}</i>` : '', r.mcash ? `<i class=mc>💎 ${fmt(r.mcash)}</i>` : ''].join('');
  const loginInfo = () => (DB.P && DB.P.login) || null;
  window.openDaily = function (flash) {
    const L = loginInfo(); if (!L) return;
    const cyc = L.cycle_day, claimed = L.claimed, streak = L.streak;
    const cells = (L.rewards || []).map(r => {
      const st = r.day < cyc || (r.day === cyc && claimed) ? 'past' : r.day === cyc ? 'today' : 'next';
      return `<div class="dl-cell ${st}${r.day === 7 ? ' big' : ''}"><small>วันที่ ${r.day}</small><div class=dl-r>${rw(r) || '—'}</div>${st === 'past' ? '<span class=dl-ok>✓</span>' : ''}</div>`;
    }).join('');
    const ms = L.milestones || [], nxt = ms.find(m => m.streak > streak);
    const chips = ms.map(m => `<span class="dl-ms${streak >= m.streak ? ' got' : ''}" title="${E(m.label)}">${m.streak} วัน ${streak >= m.streak ? '✓' : ''}</span>`).join('');
    const html = `<div class="sk-box dl-box"><button class=q-x onclick="closeDaily()" aria-label="ปิด">✕</button><h3>🎁 รางวัลล็อกอินรายวัน</h3>
      <div class=dl-streak><b>🔥 ${streak}</b> วันติดต่อกัน<small>สถิติสูงสุด ${(DB.P && DB.P.best_streak) || streak} วัน</small></div>
      <div class=dl-grid>${cells}</div>
      ${flash ? `<p class=dl-flash>${flash}</p>` : ''}
      <button class="dl-claim" ${claimed ? 'disabled' : ''} onclick="claimDaily()">${claimed ? 'รับรางวัลวันนี้แล้ว ✓ — พรุ่งนี้มารับต่อ' : '🎁 รับรางวัลวันนี้'}</button>
      <h4>โบนัสล็อกอินต่อเนื่อง</h4><div class=dl-mss>${chips}</div>
      <small class=dl-note>${nxt ? `อีก ${nxt.streak - streak} วัน ถึง “${E(nxt.label)}” รับ ${rw(nxt)}` : 'คุณรับโบนัสต่อเนื่องครบทุกขั้นแล้ว!'} · ขาดวันเดียว streak จะเริ่มนับ 1 ใหม่ (นับวันตามเวลาไทย)</small></div>`;
    let m = document.querySelector('.dl-modal'); if (!m) { m = document.createElement('div'); m.className = 'sk-modal dl-modal'; m.onclick = e => { if (e.target === m) closeDaily(); }; document.body.appendChild(m); }
    m.innerHTML = html;
  };
  window.closeDaily = () => { const m = document.querySelector('.dl-modal'); if (m) m.remove(); };
  let claiming = false;
  window.claimDaily = async () => {
    if (claiming) return; claiming = true;
    try {
      const r = await DB.claimLogin();
      const bonus = (r.bonus_coins || r.bonus_mcash) ? ` + โบนัส ${r.bonus_label || 'ล็อกอินต่อเนื่อง'}` : '';
      const parts = [r.coins + r.bonus_coins ? '🪙 +' + fmt(r.coins + r.bonus_coins) : '', r.mcash + r.bonus_mcash ? '💎 +' + fmt(r.mcash + r.bonus_mcash) : ''].filter(Boolean).join('  ');
      toast('🎁 ' + parts + bonus); openDaily('ได้รับ ' + parts + bonus);
    } catch (e) { toast(e.message); } finally { claiming = false; }
  };
  window.onDbLogin = () => { setTimeout(() => { const L = loginInfo(); if (L && !L.claimed) openDaily(); loadQ(); }, 700); };

  // ================= เควส =================
  let Q = null, curTab = 'd', qOpen = false;
  const kindOf = t => (t === 'w' ? 'weekly' : 'daily');
  async function loadQ() { try { Q = await DB.quests(); paintHud(); if (qOpen) drawQ(); } catch (e) { /* เซสชันหมดอายุ ฯลฯ ไม่ต้องแจ้ง */ } }
  const claimable = () => { let n = 0; if (Q) ['daily', 'weekly'].forEach(k => { const b = Q[k]; (b.quests || []).forEach(q => { if (q.progress >= q.target && !q.claimed) n++; }); if (b.bonus && b.bonus.ready) n++; }); return n; };
  function qRow(kind, q) {
    const done = q.progress >= q.target, pct = Math.min(100, Math.floor(q.progress / q.target * 100));
    const reward = [q.reward_coins ? '🪙 ' + fmt(q.reward_coins) : '', q.reward_mcash ? '💎 ' + fmt(q.reward_mcash) : '', q.points ? '⚡' + q.points : '', q.reward_bp ? '🎖 ' + fmt(q.reward_bp) : ''].filter(Boolean).join(' ');
    return `<div class="q-row${done ? ' done' : ''}${q.claimed ? ' got' : ''}"><div class=q-ic>${E(q.icon)}</div><div class=q-mid><b>${E(q.name)}</b><small>${E(q.description)}</small><div class=q-bar><i style="width:${pct}%"></i></div><small class=q-num>${q.progress} / ${q.target}</small></div>`
      + (q.claimed ? '<span class="q-btn got">รับแล้ว ✓</span>' : `<button class="q-btn${done ? ' go' : ''}" ${done ? '' : 'disabled'} onclick="qClaim('${E(q.id)}')">${reward}</button>`) + '</div>';
  }
  function drawQ() {
    const m = document.querySelector('.q-modal'); if (!m) return;
    if (!Q) { m.innerHTML = '<div class=sk-box><button class=q-x onclick="closeQuests()">✕</button><h3>📜 เควส</h3><p class=au-load>⏳ กำลังโหลด...</p></div>'; return; }
    const kind = kindOf(curTab), b = Q[kind], qs = b.quests || [], doneN = qs.filter(q => q.claimed).length;
    const bb = b.bonus, bonusTxt = ['🪙 ' + fmt(bb.coins), bb.mcash ? '💎 ' + fmt(bb.mcash) : '', bb.bp ? '🎖 ' + fmt(bb.bp) : ''].filter(Boolean).join(' ');
    const bonusBtn = bb.claimed ? '<span class="q-btn got">รับแล้ว ✓</span>' : `<button class="q-btn${bb.ready ? ' go' : ''}" ${bb.ready ? '' : 'disabled'} onclick="qBonus('${kind}')">${bonusTxt}</button>`;
    // แต้มกิจกรรมรายวัน (ครบ 100 = รับโบนัส: เหรียญ + เพชร + EXP แบทเทิลพาส)
    const act = kind === 'daily' && b.points_max ? `<div class=q-act><b>⚡ แต้มกิจกรรม ${fmt(b.points)}/${fmt(b.points_max)}</b><i><u style="width:${Math.min(100, Math.round(b.points / b.points_max * 100))}%"></u></i><small>ครบแล้วรับโบนัสด้านล่าง · 🎖 = EXP แบทเทิลพาส</small></div>` : '';
    m.innerHTML = `<div class=sk-box><button class=q-x onclick="closeQuests()" aria-label="ปิด">✕</button><h3>📜 เควส <span class=sk-coin>🪙 ${fmt(sv.coins)}</span></h3>
      <div class=q-tabs><button class="q-tab${kind === 'daily' ? ' on' : ''}" onclick="openQuests('d')">รายวัน</button><button class="q-tab${kind === 'weekly' ? ' on' : ''}" onclick="openQuests('w')">รายสัปดาห์</button></div>
      <div class=q-left id=qLeft>⏰ ${leftText()}</div>${act}${qs.map(q => qRow(kind, q)).join('')}
      <div class="q-row q-bonus${b.bonus.claimed ? ' got' : ''}"><div class=q-ic>🎁</div><div class=q-mid><b>${kind === 'daily' ? 'โบนัสกิจกรรมครบ 100' : 'โบนัสครบทุกเควส'}</b><small>รับรางวัลครบทุกเควสของ${kind === 'daily' ? 'วันนี้' : 'สัปดาห์นี้'}</small><small class=q-num>${doneN} / ${qs.length}</small></div>${bonusBtn}</div>
      <small class=q-note>รีเซ็ตรายวันทุกเที่ยงคืน · รายสัปดาห์ทุกวันจันทร์ (เวลาไทย) · ความคืบหน้านับจากผลเกมที่บันทึกบนเซิร์ฟเวอร์</small></div>`;
  }
  const leftText = () => { if (!Q) return ''; const t = new Date(Q[kindOf(curTab)].resets_at).getTime(); return 'รีเซ็ตใน ' + fmtLeft(t - Date.now()); };
  window.openQuests = function (tab) {
    if (tab === 'd' || tab === 'w') curTab = tab; qOpen = true;
    let m = document.querySelector('.q-modal'); if (!m) { m = document.createElement('div'); m.className = 'sk-modal q-modal'; m.onclick = e => { if (e.target === m) closeQuests(); }; document.body.appendChild(m); }
    drawQ(); if (!tab || !Q) loadQ();
  };
  window.closeQuests = () => { qOpen = false; const m = document.querySelector('.q-modal'); if (m) m.remove(); };
  window.qClaim = async id => { try { const r = await DB.claimQuest(id); toast('🪙 +' + fmt(r.coins) + (r.mcash ? '  💎 +' + fmt(r.mcash) : '') + (r.points ? '  ⚡+' + r.points : '') + (r.bp ? '  🎖 +' + fmt(r.bp) : '')); } catch (e) { toast(e.message); } loadQ(); };
  window.qBonus = async p => { try { const r = await DB.claimBonus(p); toast('🎁 โบนัส +' + fmt(r.coins) + ' 🪙' + (r.mcash ? '  +' + fmt(r.mcash) + ' 💎' : '') + (r.bp ? '  +' + fmt(r.bp) + ' EXP แบทเทิลพาส' : '')); } catch (e) { toast(e.message); } loadQ(); };
  window.dummyQuests = { reload: loadQ, claimable };

  // ================= ปุ่มบน HUD =================
  function paintHud() {
    const h = document.querySelector('.hud'); if (!h) return;
    const mk = (cls, label, fn, html) => { let b = h.querySelector('.' + cls); if (!b) { b = document.createElement('button'); b.className = 'hud-sk ' + cls; b.setAttribute('aria-label', label); b.onclick = fn; const coin = h.querySelector('.coin-pill'); coin ? h.insertBefore(b, coin) : h.appendChild(b); } if (b.innerHTML !== html) b.innerHTML = html; };
    const L = loginInfo(), n = claimable();
    mk('hud-q', 'เควส', () => openQuests(), '📜' + (n ? '<i>' + n + '</i>' : ''));
    mk('hud-dl', 'รางวัลล็อกอิน', () => openDaily(), '🎁' + (L && !L.claimed ? '<i>!</i>' : ''));
  }
  if (typeof render === 'function') { const _r = render; window.render = render = function () { const r = _r.apply(this, arguments); try { paintHud(); } catch (e) {} return r; }; }
  setInterval(() => { try { const l = $id('qLeft'); if (l && Q) { l.textContent = '⏰ ' + leftText(); if (new Date(Q[kindOf(curTab)].resets_at) <= Date.now()) loadQ(); } } catch (e) {} }, 1000);
  setInterval(() => { if (DB.user && !document.hidden) loadQ(); }, 90000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && DB.user && (typeof screen === 'undefined' || screen !== 'game')) { DB.call('record_login').then(() => DB.refresh()).then(loadQ).catch(() => {}); } });
  const _rf = DB.refresh; DB.refresh = async function () { const r = await _rf.apply(this, arguments); loadQ(); return r; };
})();
