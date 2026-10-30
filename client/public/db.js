/* db.js — เชื่อม Supabase ฝั่งเกม (บัญชีผู้เล่น + ข้อมูลที่เก็บในฐานข้อมูล)
   - ใช้เฉพาะ auth + rpc: ข้อมูลทั้งหมดอ่านผ่าน get_profile() และเขียนผ่านฟังก์ชันที่ตรวจสิทธิ์ในฐานข้อมูล (ดู supabase/schema.sql)
   - ไม่ได้ตั้งค่า SUPABASE_URL/SUPABASE_KEY ใน config.js → DB.enabled = false และเกมทำงานแบบเดิม (เหรียญเก็บในเครื่อง) */
(function () {
  'use strict';
  const CFG = window.DUMMY_CONFIG || {};
  const DB = window.DB = { enabled: false, loading: false, user: null, P: null, last: null };
  const url = String(CFG.SUPABASE_URL || '').trim(), key = String(CFG.SUPABASE_KEY || '').trim();
  if (!url || !key || !window.supabase || !window.supabase.createClient) return;
  DB.enabled = true; DB.loading = true;
  const sb = DB.client = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const DOMAIN = String(CFG.AUTH_EMAIL_DOMAIN || 'example.com').replace(/^@/, '');
  const th = m => {
    m = String(m || '');
    const map = [[/invalid login credentials/i, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], [/already registered|already been registered/i, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'],
      [/at least (\d+) characters/i, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'], [/email not confirmed/i, 'บัญชียังไม่ยืนยัน — เจ้าของเกมต้องปิด "Confirm email" ที่ Supabase (Authentication › Providers › Email)'],
      [/rate limit|too many/i, 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่'], [/email.*(invalid|format)|unable to validate email/i, 'ระบบอีเมลปฏิเสธชื่อนี้ — ตั้ง AUTH_EMAIL_DOMAIN ใน config.js เป็นโดเมนที่ใช้งานได้'],
      [/failed to fetch|networkerror|network request failed|load failed/i, 'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ต']];
    for (const [re, t] of map) if (re.test(m)) return t; return m || 'เกิดข้อผิดพลาด';
  };
  const emailOf = u => { u = String(u || '').trim(); return u.includes('@') ? u.toLowerCase() : u.toLowerCase() + '@' + DOMAIN; };
  DB.validUser = u => /^[a-z0-9_]{3,20}$/.test(String(u || '').trim().toLowerCase());

  async function call(fn, args) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) { const e = new Error(th(error.message)); e.raw = error; throw e; }
    return data;
  }
  DB.call = call;
  DB.token = async () => { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : null; };

  // ---- ซิงก์ข้อมูลจากฐานข้อมูลเข้าตัวแปรของเกม (sv / nick / ของที่ใส่อยู่) ----
  function sync() {
    const P = DB.P; if (!P) return;
    try {
      sv.coins = Number(P.coins) || 0; sv.mcash = Number(P.mcash) || 0; sv.name = P.display_name; nick = P.display_name;
      sv.own = (P.inventory || []).filter(i => (Number(i.qty) || 0) >= 1).map(i => i.kind + ':' + i.item_id);
      localStorage.setItem('dummyName', P.display_name);
      for (const [kind, , lsKey] of KINDS) { const id = (P.equipped || {})[kind]; if (id) localStorage.setItem(lsKey, id); }
      applyTheme();
    } catch (e) { /* app.js ยังโหลดไม่เสร็จ */ }
  }
  DB.sync = sync;
  const repaint = () => { try { render(); } catch (e) {} };
  DB.refresh = async () => { DB.P = await call('get_profile'); sync(); repaint(); return DB.P; };

  DB.stars = id => Math.max(1, Number(DB.P && DB.P.characters && DB.P.characters[id]) || 1);

  // ---- บัญชี ----
  async function start() {
    DB.loading = true; DB.user = null;
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) { DB.user = data.session.user; await afterLogin(); }
    } catch (e) { DB.error = e.message; }
    DB.loading = false; repaint();
  }
  async function afterLogin() {
    const r = await call('record_login');          // อัปเดตเวลาล็อกอินล่าสุด + จำนวนวันติดกัน
    DB.last = r;
    DB.P = await call('get_profile'); sync();
    authed = true;
    if (typeof window.onDbLogin === 'function') try { window.onDbLogin(r); } catch (e) {}
  }
  DB.signIn = async (u, pw) => {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailOf(u), password: String(pw || '') });
    if (error) throw new Error(th(error.message));
    DB.user = data.user; await afterLogin(); repaint();
  };
  DB.signUp = async (u, pw, name) => {
    u = String(u || '').trim().toLowerCase();
    if (!DB.validUser(u)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 _ ความยาว 3-20 ตัว');
    if (String(pw || '').length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    const dn = String(name || u).trim().slice(0, 14) || u;
    const bad = window.NameFilter && NameFilter.check(dn); if (bad) throw new Error(bad);
    const { data, error } = await sb.auth.signUp({ email: emailOf(u), password: pw, options: { data: { username: u, display_name: dn } } });
    if (error) throw new Error(th(error.message));
    if (!data.session) throw new Error('สมัครแล้ว แต่ต้องยืนยันอีเมลก่อน — เจ้าของเกมต้องปิด "Confirm email" ที่ Supabase (Authentication › Providers › Email)');
    DB.user = data.user; await afterLogin(); repaint();
  };
  DB.signOut = async () => {
    try { await sb.auth.signOut(); } catch (e) {}
    DB.user = null; DB.P = null; authed = false; if (window.auReset) auReset();
    try { if (typeof leave === 'function') leave(); if (sock) { sock.close(); sock = null; } } catch (e) {}
    repaint();
  };

  // ลบบัญชีถาวร: ฐานข้อมูลตรวจว่าพิมพ์ชื่อผู้ใช้ตรงก่อนลบ (ย้อนกลับไม่ได้) แล้วล้างข้อมูลในเครื่องและออกจากระบบ
  DB.deleteAccount = async confirmName => {
    await call('delete_my_account', { p_confirm: String(confirmName || '') });
    try { Object.keys(localStorage).filter(k => /^dummy/i.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    await DB.signOut();
  };

  // ---- การกระทำของผู้เล่น (ทุกอย่างตรวจและหักเหรียญที่ฝั่งฐานข้อมูล) ----
  // กาชา: สุ่ม/ขายตัวซ้ำ (ราคา โอกาส การันตี ตรวจที่ฐานข้อมูลทั้งหมด)
  DB.gacha = async () => { DB.G = await call('get_gacha'); return DB.G; };
  DB.pull = async (banner, n, cur) => { const r = await call('gacha_pull', { p_banner: banner, p_count: n, p_currency: cur || 'coins' }); await DB.refresh(); DB.gacha().then(repaint).catch(() => {}); return r; };
  DB.sell = async (kind, id, qty) => { const r = await call('sell_dupes', { p_kind: kind, p_id: id, p_qty: qty }); await DB.refresh(); return r; };
  DB.qty = (kind, id) => { const i = ((DB.P && DB.P.inventory) || []).find(x => x.kind === kind && x.item_id === id); return i ? Number(i.qty) || 0 : 0; };
  DB.equip = async (kind, id) => { try { await call('set_equipped', { p_kind: kind, p_id: id }); if (DB.P) DB.P.equipped = Object.assign({}, DB.P.equipped, { [kind]: id }); } catch (e) { /* ใส่ไม่ได้ → ซิงก์กลับ */ DB.refresh().catch(() => {}); } };
  DB.upStar = async id => { const r = await call('upgrade_star', { p_char: id }); await DB.refresh(); return r; };
  let nt = null, tt = null;
  // เปลี่ยนชื่อ: ครั้งแรกฟรี ครั้งต่อไปเสียเหรียญ → กดบันทึกเองเท่านั้น (ไม่บันทึกอัตโนมัติระหว่างพิมพ์)
  DB.renameCost = () => (DB.P && Number(DB.P.name_changes) >= 1 ? Number(DB.P.rename_cost) || 500 : 0);
  DB.saveName = async v => { const r = await call('update_profile', { p_name: v }); await DB.refresh(); return r; };
  DB.setName = () => {};
  DB.setTitle = v => { clearTimeout(tt); tt = setTimeout(() => call('update_profile', { p_title: v }).then(r => { if (DB.P) DB.P.title = r.title; }).catch(e => { if (window.dbToast && e && e.message) dbToast(e.message); }), 600); };
  DB.claimLogin = async () => { const r = await call('claim_login_reward'); await DB.refresh(); return r; };
  DB.quests = () => call('get_quests');
  DB.claimQuest = async id => { const r = await call('claim_quest', { p_id: id }); await DB.refresh(); return r; };
  DB.claimBonus = async p => { const r = await call('claim_quest_bonus', { p_period: p }); await DB.refresh(); return r; };

  // เซิร์ฟเวอร์เกมบันทึกผลตาที่จบแล้ว → แจ้งยอดใหม่ (รวมโบนัสเหรียญของตัวละคร)
  DB.onWallet = d => {
    if (!d || !DB.P) return;
    if (d.coins != null) DB.P.coins = d.coins; if (d.mcash != null) DB.P.mcash = d.mcash;
    sync();
    try { if (S && d.gid && S.gid === d.gid && !d.duplicate) coinDelta = (Number(d.delta) || 0) + (Number(d.bonus) || 0); } catch (e) {}
    if (window.Progress) Progress.onWallet(d);
    if (d.level != null) { DB.P.level = d.level; if (d.player_exp != null) DB.P.player_exp = d.player_exp; }
    if (d.level_up && window.dbToast) dbToast('⬆ เลเวล ' + d.level + '!' + (d.level_mcash ? ' +' + d.level_mcash + ' 💎' : '') + (d.level_coins ? ' +' + d.level_coins + ' 🪙' : ''));
    DB.refresh().catch(() => repaint());   // ดึงสถิติ/เกมล่าสุด/ยอดล่าสุดมาแสดง
  };

  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && DB.user) { DB.user = null; DB.P = null; authed = false; repaint(); } });
  // app.js โหลดหลัง db.js → เริ่มตรวจเซสชันหลังโหลดสคริปต์ทั้งหมด
  window.addEventListener('load', start);
})();
