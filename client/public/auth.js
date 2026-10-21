// ระบบบัญชีผู้เล่น (Supabase) — ล็อกอิน · เหรียญ/MCash · สถิติแยกเกม · รางวัลล็อกอิน · เควสต์ · ซื้อของ
// ตั้งค่าใน config.js: SUPABASE_URL, SUPABASE_ANON_KEY (ว่างไว้ = ปิดระบบ เล่นแบบเดิม)
// การเขียนข้อมูลสำคัญทั้งหมดผ่านฟังก์ชัน RPC ใน supabase/schema.sql (ไม่แก้ตารางตรง)
(() => {
  const C = window.DUMMY_CONFIG || {}, URL_ = (C.SUPABASE_URL || '').replace(/\/+$/, ''), KEY = C.SUPABASE_ANON_KEY || '';
  const ON = !!(URL_ && KEY), AK = 'dummyAuth', GK = 'dummyGuest';
  let A = null, ACC = null, pushT = null, busy = false, msg = '', tab = { m: 'in' }, accTab = 'login', toast = '', popup = false;
  try { A = JSON.parse(localStorage.getItem(AK) || 'null'); } catch (e) {}
  const isGuest = () => localStorage.getItem(GK) === '1';
  const keep = a => { A = a; try { a ? localStorage.setItem(AK, JSON.stringify(a)) : localStorage.removeItem(AK); } catch (e) {} };
  // คีย์แบบ sb_publishable_… ไม่ใช่ JWT จึงส่งใน apikey เท่านั้น; Authorization ส่งเฉพาะ token ของผู้ใช้
  const H = tok => ({ apikey: KEY, ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': 'application/json' });
  const eMsg = (j, d) => { const m = String((j && (j.msg || j.error_description || j.message || j.error)) || '');
    if (/invalid login/i.test(m)) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'; if (/already registered|already been/i.test(m)) return 'อีเมลนี้สมัครไว้แล้ว';
    if (/password/i.test(m)) return 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'; if (/confirm/i.test(m)) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'; return m || d; };
  async function call(path, body, tok, method = 'POST', extra = {}) {
    const r = await fetch(URL_ + path, { method, headers: { ...H(tok), ...extra }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, j };
  }
  const setSession = j => keep({ at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000 - 60000, uid: j.user && j.user.id, email: j.user && j.user.email });
  async function token() {
    if (!A) return null;
    if (Date.now() < A.exp) return A.at;
    const r = await call('/auth/v1/token?grant_type=refresh_token', { refresh_token: A.rt }).catch(() => null);
    if (r && r.ok && r.j.access_token) { setSession(r.j); return A.at; }
    if (r && (r.status === 400 || r.status === 401)) { keep(null); ACC = null; }
    return A ? A.at : null;
  }
  async function rpc(fn, args) { const t = await token(); if (!t) return null; const r = await call('/rest/v1/rpc/' + fn, args || {}, t).catch(() => null); return r && r.ok ? r.j : null; }
  const eqKeys = () => (typeof KINDS !== 'undefined' ? KINDS.map(k => k[2]) : []);
  const n0 = x => Number(x) || 0, fmt = x => n0(x).toLocaleString('th-TH');
  const gname = id => { const r = (typeof RULES !== 'undefined' ? RULES : []).find(x => x.id === id); return r ? r.name : id || '-'; };

  // ---- ซิงก์ข้อมูลทั้งหมดจากเซิร์ฟเวอร์ ----
  async function sync(isLogin) {
    const d = await rpc('app_sync', { p_login: !!isLogin }); if (!d || !d.profile) return false;
    ACC = d; const p = d.profile;
    sv.name = p.name || sv.name; nick = sv.name; sv.coins = n0(p.coins);
    sv.own = [...new Set([...(Array.isArray(p.owned) ? p.owned : ['classic']), ...(d.purchases || [])])];
    const e = p.equipped || {}; if (e.__eq) sv.eq = e.__eq;
    for (const k of eqKeys()) if (e[k]) localStorage.setItem(k, e[k]);
    try { localStorage.setItem('dummyCoins', sv.coins); localStorage.setItem('dummyOwned', JSON.stringify(sv.own)); localStorage.setItem('dummySkin', sv.eq); localStorage.setItem('dummyName', sv.name); applyTheme(); } catch (x) {}
    if (isLogin && !d.login.claimed_today) popup = true;
    render(); return true;
  }
  function push() { // ชื่อ + สกินที่ใช้อยู่ (เหรียญ/ของที่ซื้อ ไม่ส่งจากเครื่อง)
    if (!A || !ACC) return; clearTimeout(pushT);
    pushT = setTimeout(() => { const eq = { __eq: sv.eq }; for (const k of eqKeys()) { const v = localStorage.getItem(k); if (v) eq[k] = v; } rpc('set_profile', { p_name: String(sv.name || '').slice(0, 14), p_equipped: eq }); }, 1500);
  }
  const say = t => { toast = t; render(); setTimeout(() => { if (toast === t) { toast = ''; render(); } }, 3500); };

  // ---- การกระทำ ----
  window.cloudActive = () => !!(ON && A && ACC);
  window.cloudPush = push;
  window.cloudGame = async (gid, game, result, delta) => { // จบเกม: บันทึกผล สถิติ เควสต์
    if (!window.cloudActive()) return;
    const d = await rpc('record_game', { p_game: String(game || 'dummy').toLowerCase(), p_gid: String(gid || ('g' + Date.now() + Math.random().toString(36).slice(2, 6))), p_result: result, p_delta: Math.trunc(delta) || 0 });
    if (d && d.ok) { sv.coins = n0(d.coins); try { localStorage.setItem('dummyCoins', sv.coins); } catch (e) {} await sync(false); }
  };
  window.cloudBuy = async (key, name) => {
    const d = await rpc('buy_item', { p_key: key });
    if (d && d.ok) { sv.coins = n0(d.coins); if (!sv.own.includes(key)) sv.own.push(key); shopNote = 'ซื้อ ' + name + ' แล้ว! ไปเลือกใช้ที่หน้าโปรไฟล์'; await sync(false); }
    else { shopNote = ({ poor: 'เหรียญไม่พอ', owned: 'มีของชิ้นนี้แล้ว', unknown: 'ไม่พบสินค้านี้' })[d && d.error] || 'ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง'; render(); }
  };
  window.cloudClaimLogin = async () => {
    const d = await rpc('claim_login'); popup = false; const o = document.getElementById('lgov'); if (o) o.remove();
    if (d && d.ok) { sv.coins = n0(d.balance); await sync(false); say(`🎁 วันที่ ${d.day}: +${fmt(d.coins)} 🪙${d.mcash ? ' +' + d.mcash + ' 💎' : ''}`); } else { await sync(false); }
  };
  window.cloudClaimQuest = async id => { const d = await rpc('claim_quest', { p_quest: id }); if (d && d.ok) { sv.coins = n0(d.coins); await sync(false); say('✅ รับรางวัลเควสต์ +' + fmt(d.reward) + ' 🪙'); } else say('รับรางวัลไม่ได้'); };
  window.cloudTabAcct = t => { accTab = t; render(); };
  window.cloudClosePopup = () => { popup = false; const o = document.getElementById('lgov'); if (o) o.remove(); };

  // ---- ล็อกอิน/สมัคร/ออก ----
  async function submit(mode) {
    if (busy) return; const e = ($('lg_e').value || '').trim(), p = $('lg_p').value || '', n = ($('lg_n') && $('lg_n').value || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) { msg = 'กรอกอีเมลให้ถูกต้อง'; return render(); }
    if (p.length < 6) { msg = 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'; return render(); }
    busy = true; msg = 'กำลังดำเนินการ…'; render();
    try {
      const r = mode === 'up' ? await call('/auth/v1/signup', { email: e, password: p, data: { name: n || 'ผู้เล่น' } }) : await call('/auth/v1/token?grant_type=password', { email: e, password: p });
      if (!r.ok) msg = eMsg(r.j, 'ทำรายการไม่สำเร็จ');
      else if (r.j.access_token) { setSession(r.j); localStorage.removeItem(GK); msg = ''; busy = false; await sync(true); if (typeof sock !== 'undefined' && sock) cloudSock(); return render(); }
      else msg = 'สมัครแล้ว — โปรดยืนยันอีเมล แล้วกลับมาเข้าสู่ระบบ';
    } catch (x) { msg = 'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง'; }
    busy = false; render();
  }
  window.cloudLogin = submit;
  window.cloudGuest = () => { localStorage.setItem(GK, '1'); render(); };
  window.cloudLogout = () => { keep(null); ACC = null; popup = false; localStorage.removeItem(GK); try { sock && sock.emit('auth:token', ''); } catch (e) {} render(); };
  window.cloudSock = async () => { try { const t = await token(); if (t && sock) sock.emit('auth:token', t); } catch (e) {} };
  window.cloudTab = m => { tab.m = m; msg = ''; render(); };

  // ---- ส่วนแสดงผล ----
  const claimable = () => !!ACC && (!ACC.login.claimed_today || ACC.quests.some(q => !q.claimed && q.progress >= q.target));
  window.cloudHudR = coin => !(A && ACC) ? coin : `<span class=hud-r><button class="gift-btn" onclick="go('acct')" aria-label="รางวัล">🎁${claimable() ? '<i>!</i>' : ''}</button><span class="coin-pill mc">💎 ${fmt(ACC.profile.mcash)}</span>${coin}</span>`;
  const bkk = () => new Date(Date.now() + 7 * 3600e3);
  const left = ms => { const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? `${d} วัน ${h} ชม.` : `${h} ชม. ${m % 60} นาที`; };
  const resetIn = per => { const t = bkk(), dayMs = 86400000, since = t.getTime() % dayMs; if (per === 'daily') return left(dayMs - since); const wd = (t.getUTCDay() + 6) % 7; return left((7 - wd) * dayMs - since); };
  const rewardGrid = () => { const L = ACC.login, cd = L.cycle_day; return `<div class=rw-grid>${L.rewards.map(r => { const st = r.day < cd || (r.day === cd && L.claimed_today) ? 'done' : r.day === cd ? 'now' : '';
    return `<div class="rw ${st}${r.day === 7 ? ' big' : ''}"><small>วัน ${r.day}</small><b>🪙 ${fmt(r.coins)}</b>${r.mcash ? `<em>💎 ${r.mcash}</em>` : ''}${st === 'done' ? '<u>✓</u>' : ''}</div>`; }).join('')}</div>`; };
  const loginTab = () => { const L = ACC.login; return `<div class=streak>🔥 ล็อกอินต่อเนื่อง <b>${L.streak}</b> วัน <small>(สูงสุด ${ACC.profile.best_streak} · รวม ${ACC.profile.total_login_days} วัน)</small></div>${rewardGrid()}
    ${L.claimed_today ? '<p class=acct-note>✅ รับรางวัลวันนี้แล้ว — กลับมาพรุ่งนี้เพื่อรับต่อ (ตัดวันเที่ยงคืนเวลาไทย)</p>' : '<button class="wbtn go" onclick="cloudClaimLogin()">🎁 รับรางวัลวันนี้</button>'}
    <p class=acct-note>ถ้าขาดล็อกอิน 1 วัน จะเริ่มนับวันที่ 1 ใหม่ · วันที่ 7 ได้รางวัลใหญ่</p>`; };
  const qRow = q => { const pc = Math.min(100, Math.round(n0(q.progress) * 100 / q.target)), done = q.progress >= q.target;
    return `<div class="qrow${q.claimed ? ' cl' : ''}"><div class=qt><b>${esc(q.title)}</b><small>${fmt(q.progress)}/${fmt(q.target)} · 🪙 ${fmt(q.reward_coins)}</small><i class=bar><s style="width:${pc}%"></s></i></div>
      ${q.claimed ? '<span class=qdone>รับแล้ว ✓</span>' : done ? `<button class="wbtn" onclick="cloudClaimQuest('${esc(q.id)}')">รับ</button>` : '<span class=qwait>…</span>'}</div>`; };
  const questTab = () => '<div class=qcols>' + ['daily', 'weekly'].map(p => `<h3 class=sec>${p === 'daily' ? '☀️ รายวัน' : '📅 รายสัปดาห์'} <small>รีเซ็ตใน ${resetIn(p)}</small></h3>${ACC.quests.filter(q => q.period === p).map(qRow).join('')}`).join('') + '</div>';
  const statTab = () => { const P = ACC.profile, st = ACC.stats, dt = t => t ? new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    return `<div class=cards><div class=card><small>🪙 เหรียญ</small><b>${fmt(P.coins)}</b></div><div class=card><small>💎 MCash</small><b>${fmt(P.mcash)}</b><button class="wbtn" disabled>เติมเงิน (เร็วๆ นี้)</button></div>
      <div class=card><small>🕒 ล็อกอินล่าสุด</small><b class=sm>${dt(P.last_login_at)}</b></div><div class=card><small>🎮 เล่นล่าสุด</small><b class=sm>${esc(gname(P.last_game))}</b></div></div>
      <h3 class=sec>📊 สถิติแยกตามเกม</h3>${st.length ? `<table class=stt><tr><th>เกม</th><th>เล่น</th><th>ชนะ</th><th>แพ้</th><th>เสมอ</th><th>เหรียญสุทธิ</th></tr>${st.map(g => `<tr><td>${esc(gname(g.game))}</td><td>${g.plays}</td><td>${g.wins}</td><td>${g.losses}</td><td>${g.draws}</td><td class="${n0(g.coins_won) < 0 ? 'neg' : 'pos'}">${n0(g.coins_won) > 0 ? '+' : ''}${fmt(g.coins_won)}</td></tr>`).join('')}</table>` : '<p class=acct-note>ยังไม่มีสถิติ — ไปเล่นเกมกันเลย!</p>'}`; };
  const acctView = () => {
    const tabs = [['login', '🎁 รางวัลล็อกอิน'], ['quests', '📜 เควสต์'], ['stats', '📊 สถิติ']];
    page2('บัญชีของฉัน', `<div class="panel acct-root"><div class=tabs>${tabs.map(([k, l]) => `<button class="${accTab === k ? 'on' : ''}" onclick="cloudTabAcct('${k}')">${l}${k === 'login' && !ACC.login.claimed_today ? ' <i>!</i>' : ''}${k === 'quests' && ACC.quests.some(q => !q.claimed && q.progress >= q.target) ? ' <i>!</i>' : ''}</button>`).join('')}</div>
      <div class=acct-body>${accTab === 'quests' ? questTab() : accTab === 'stats' ? statTab() : loginTab()}</div></div>`, 'home');
  };
  const rewardPopup = () => { if (document.getElementById('lgov')) return; document.body.insertAdjacentHTML('beforeend', `<div class=ov id=lgov><div class="box rw-pop"><h2>🎁 รางวัลล็อกอินประจำวัน</h2><div class=streak>🔥 ติดต่อกัน <b>${ACC.login.streak}</b> วัน</div>${rewardGrid()}<button class="wbtn go" onclick="cloudClaimLogin()">รับรางวัล</button><button class="wbtn" onclick="cloudClosePopup()">ไว้ก่อน</button></div></div>`); };
  const loginView = () => wrap(`<div class=logo>Dummy Dummy<small>เข้าสู่ระบบ</small></div>
    ${tab.m === 'up' ? '<input id=lg_n placeholder="ชื่อเล่นในเกม" maxlength=14 autocomplete=nickname>' : ''}
    <input id=lg_e type=email placeholder="อีเมล" autocomplete=email><input id=lg_p type=password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" autocomplete=${tab.m === 'up' ? 'new-password' : 'current-password'}>
    <button onclick="cloudLogin('${tab.m}')">${tab.m === 'up' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button>
    <button class=g onclick="cloudTab('${tab.m === 'up' ? 'in' : 'up'}')">${tab.m === 'up' ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}</button>
    <button class=g onclick="cloudGuest()">เล่นแบบผู้เล่นชั่วคราว (ไม่บันทึกข้ามเครื่อง)</button>
    ${msg ? `<p style="color:var(--gold)">${esc(msg)}</p>` : ''}`);

  if (ON) {
    const _r = render;
    render = function () {
      if (!A && !isGuest()) return loginView();
      if (A && ACC && screen === 'acct') acctView(); else _r();
      if (screen === 'profile' && !document.getElementById('lgOut')) { const p = document.querySelector('.pg-body .panel'); if (p) p.insertAdjacentHTML('beforeend', A ? `<button class="wbtn" onclick="go('acct')">📊 สถิติ · เควสต์ · รางวัล</button><button id=lgOut class="wbtn" onclick="cloudLogout()">ออกจากระบบ (${esc(A.email || '')})</button>` : `<button id=lgOut class="wbtn" onclick="cloudLogout()">เข้าสู่ระบบ / สมัครสมาชิก</button>`); }
      const t = document.getElementById('lgToast'); if (t) t.remove();
      if (toast) document.body.insertAdjacentHTML('beforeend', `<div id=lgToast class=lg-toast>${esc(toast)}</div>`);
      if (popup && A && ACC && screen === 'home') rewardPopup();
    };
    if (A) sync(true);
  }
})();
