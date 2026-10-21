/* account.js — บัญชีผู้เล่น (Supabase Auth)
   - client ล็อกอินกับ Supabase (อีเมล+รหัสผ่าน) แล้วส่ง access_token ให้เกมเซิร์ฟเวอร์ผ่าน socket (event auth:token)
   - เซิร์ฟเวอร์ตรวจโทเคนแล้วส่ง `me` กลับมา = { name, coins, own, eq, equipped, stats } ซึ่งแทน sv ใน app.js
   - เมื่อ "เซิร์ฟเวอร์ยืนยันบัญชีแล้ว" (on() = true) เหรียญ/ของที่ซื้อเป็นของเซิร์ฟเวอร์ทั้งหมด: client ไม่หักบวกเอง
   - ไม่ได้ตั้ง SUPABASE_URL / SUPABASE_ANON_KEY ใน config.js → ไม่แสดงแผงบัญชี เล่นแบบแขกเหมือนเดิม (เหรียญเก็บในเครื่อง)
   - ใส่ได้เฉพาะ anon key (ปลอดภัยที่จะเปิดเผย; สิทธิ์ถูกคุมด้วย RLS) ห้ามใส่ service_role key ที่นี่ */
(function () {
  'use strict';
  const CFG = window.DUMMY_CONFIG || {}, LS = window.localStorage;
  const KEYS = ['dummySkin', 'dummyCharacterSkin', 'dummyBackSkin', 'dummyTableSkin', 'dummyBackgroundSkin', 'dummyCardSkin', 'dummyDockSkin'];
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  let sb = null, session = null, acct = null, msg = '', busy = false, pending = false, confirmedSock = null, pushT = null, failed = false, booting = false;
  // booting: เครื่องนี้มี session Supabase ค้างอยู่ (คีย์ sb-<ref>-auth-token) แต่ยังไม่รู้ผลยืนยันกับเซิร์ฟเวอร์ — ช่วงนี้ห้ามจ่ายเหรียญเข้าเครื่องเอง
  // (ตอนรีเฟรชกลางเกม สถานะ "เกมจบ" อาจมาถึงก่อนที่ me จะมา; ถ้าตัดสินใจเร็วเกินไปจะนับเป็นแขกแล้วบวกเหรียญซ้ำในเครื่อง)
  const configured = () => !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
  const theSock = () => (typeof sock !== 'undefined' ? sock : null);
  const inRoom = () => typeof code === 'string' && !!code;
  const redraw = () => { try { if (typeof render === 'function') render(); } catch (e) { /* ยังไม่พร้อมวาด */ } };
  const TH = { 'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Email not confirmed': 'ยังไม่ได้ยืนยันอีเมล — เช็คกล่องจดหมายก่อน', 'User already registered': 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ' };
  const thMsg = m => { m = String(m || ''); if (TH[m]) return TH[m]; if (/at least 6/i.test(m)) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว'; if (/valid email|invalid.*email/i.test(m)) return 'รูปแบบอีเมลไม่ถูกต้อง'; if (/rate limit/i.test(m)) return 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่'; return m || 'เกิดข้อผิดพลาด'; };

  function sendToken() {
    if (!session || !session.access_token || pending) return;
    const s = theSock();
    if (!s) { if (typeof conn === 'function') conn(); return; }   // conn() จะเรียก attach() และส่งโทเคนเองตอน connect
    if (!s.connected || (confirmedSock && s.id === confirmedSock)) return;
    pending = true; failed = false;
    s.emit('auth:token', { token: session.access_token, name: session.user && session.user.user_metadata ? session.user.user_metadata.display_name : undefined });
  }
  function toGuest() {   // กลับเป็นแขก: เหรียญ/ของจาก localStorage ของเครื่องนี้ (ไม่เคยถูกแตะระหว่างล็อกอิน)
    try { sv = { name: LS.getItem('dummyName') || 'ผู้เล่น', coins: Number(LS.getItem('dummyCoins') || '5000'), own: JSON.parse(LS.getItem('dummyOwned') || '["classic"]'), eq: LS.getItem('dummySkin') || 'classic' }; } catch (e) { /* ใช้ค่าเดิม */ }
    try { applyTheme(); } catch (e) { /* ยังไม่พร้อม */ }
  }
  function attach(s) {   // เรียกจาก conn() ใน app.js ทันทีที่สร้าง socket
    s.on('connect', () => { confirmedSock = null; pending = false; sendToken(); });
    s.on('auth:ok', () => { pending = false; confirmedSock = s.id; msg = ''; redraw(); });
    s.on('auth:error', m => { pending = false; failed = true; msg = String(m || 'เข้าสู่ระบบไม่สำเร็จ'); redraw(); });
    s.on('shop:result', r => { if (!r) return; try { shopNote = r.ok ? 'ซื้อสำเร็จ ไปเลือกใช้ที่โปรไฟล์ได้เลย' : (r.error || 'ซื้อไม่สำเร็จ'); } catch (e) { /* ไม่มีหน้าร้าน */ } redraw(); });
  }
  // เซิร์ฟเวอร์ส่งข้อมูลบัญชี: เก็บสกินที่ใส่ลง localStorage (โค้ดวาดหน้าอ่านจากคีย์เดิม) และตั้งชื่อเล่นให้ตรงกับบัญชี
  function onMe(m) {
    if (!m || !m.account) return;
    acct = m; const eq = m.equipped || {};
    try {
      KEYS.forEach(k => { eq[k] ? LS.setItem(k, eq[k]) : LS.removeItem(k); });
      eq.dummyTitle != null ? LS.setItem('dummyTitle', eq.dummyTitle) : LS.removeItem('dummyTitle');
      LS.setItem('dummyName', m.name); nick = m.name;
    } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ — ข้ามได้ */ }
  }
  function push() {   // ส่งชื่อ + สกินที่ใส่อยู่ไปบันทึกที่บัญชี (รวมหลายครั้งที่กดติดกัน)
    if (!acct) return; clearTimeout(pushT);
    pushT = setTimeout(() => {
      const s = theSock(); if (!s || !s.connected) return;
      const eq = {}; KEYS.forEach(k => { const v = LS.getItem(k); if (v) eq[k] = v; });
      const t = LS.getItem('dummyTitle'); if (t != null) eq.dummyTitle = t;
      s.emit('profile:save', { name: (typeof sv !== 'undefined' && sv && sv.name) || undefined, equipped: eq });
    }, 600);
  }
  const val = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  async function run(fn) { if (busy) return; busy = true; msg = ''; redraw(); try { await fn(); } catch (e) { msg = thMsg(e && e.message); } busy = false; redraw(); }
  const login = () => run(async () => {
    if (!sb) return; if (inRoom()) { msg = 'ออกจากห้องก่อนเข้าสู่ระบบ'; return; }
    const { error } = await sb.auth.signInWithPassword({ email: val('acEmail').trim(), password: val('acPass') }); if (error) throw error;
  });
  const signup = () => run(async () => {
    if (!sb) return; if (inRoom()) { msg = 'ออกจากห้องก่อนสมัครสมาชิก'; return; }
    const name = String((typeof nick !== 'undefined' && nick) || 'ผู้เล่น').trim().slice(0, 14) || 'ผู้เล่น';
    const { data, error } = await sb.auth.signUp({ email: val('acEmail').trim(), password: val('acPass'), options: { data: { display_name: name } } }); if (error) throw error;
    if (!data.session) msg = 'สมัครแล้ว — เช็คอีเมลเพื่อยืนยัน แล้วกลับมาเข้าสู่ระบบ';
  });
  const logout = () => run(async () => {
    if (!sb) return; if (inRoom()) { msg = 'ออกจากห้องก่อนออกจากระบบ'; return; }
    const { error } = await sb.auth.signOut(); if (error) throw error;
  });
  function panel() {
    if (!sb) return '';
    const head = '<h3 class=sec>👤 บัญชี</h3>', note = m => `<p class=note>${m}</p>`, err = msg ? note(E(msg)) : '';
    if (acct) {
      const st = acct.stats || { games: 0, wins: 0 };
      return `<section class=ksec>${head}${note(E(acct.email || acct.name) + '<br>🪙 ' + E(acct.coins) + ' · เล่น ' + E(st.games) + ' ตา · ชนะ ' + E(st.wins))}${err}<button class=g ${busy ? 'disabled' : ''} onclick="dummyAcctLogout()">ออกจากระบบ</button></section>`;
    }
    if (session) return `<section class=ksec>${head}${note('กำลังเชื่อมต่อบัญชีกับเซิร์ฟเวอร์…')}${err}<button class=g onclick="dummyAcctRetry()">ลองใหม่</button> <button class=g onclick="dummyAcctLogout()">ออกจากระบบ</button></section>`;
    return `<section class=ksec>${head}${note('เล่นแบบแขกอยู่: เหรียญเก็บในเครื่องนี้เท่านั้น · เข้าสู่ระบบเพื่อเก็บเหรียญ ของที่ซื้อ และสถิติแพ้/ชนะบนเซิร์ฟเวอร์ (เหรียญแขกไม่ย้ายเข้าบัญชี)')}<input id=acEmail type=email autocomplete=email placeholder="อีเมล" style="width:100%;margin:4px 0"><input id=acPass type=password autocomplete=current-password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" style="width:100%;margin:4px 0">${err}<button class=wbtn ${busy ? 'disabled' : ''} onclick="dummyAcctLogin()">เข้าสู่ระบบ</button> <button class=g ${busy ? 'disabled' : ''} onclick="dummyAcctSignup()">สมัครสมาชิก</button></section>`;
  }
  window.dummyAcctLogin = login; window.dummyAcctSignup = signup; window.dummyAcctLogout = logout;
  window.dummyAcctRetry = () => { pending = false; msg = ''; sendToken(); redraw(); };
  window.dummyAcct = { on: () => !!acct, waiting: () => (booting || !!session) && !acct && !failed, panel, push, attach, onMe, session: () => session };

  if (configured()) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    const ref = (/^https?:\/\/([^./]+)/.exec(CFG.SUPABASE_URL) || [])[1];
    try { booting = !!(ref && LS.getItem('sb-' + ref + '-auth-token')); } catch (e) { /* อ่านไม่ได้ = ถือว่าไม่มี */ }
    if (booting) setTimeout(() => { booting = false; }, 5000);   // กันค้างถ้า supabase-js ไม่ตอบ
    sb.auth.onAuthStateChange((ev, s) => {
      booting = false;   // ในนี้ห้าม await เรียก Supabase ต่อ (ตามคำแนะนำของ supabase-js) — แค่ตั้งสถานะ/ส่ง socket
      session = s || null;
      if (session) sendToken();
      else if (ev === 'SIGNED_OUT') {
        const had = !!acct; acct = null; confirmedSock = null; pending = false; failed = false;
        const sk = theSock(); if (sk && sk.connected) sk.emit('auth:logout');
        if (had) toGuest(); redraw();
      }
      redraw();
    });
  }
})();
