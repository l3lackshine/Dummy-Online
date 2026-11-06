/* db.js — เชื่อม Supabase ฝั่งเกม (บัญชีผู้เล่น + ข้อมูลที่เก็บในฐานข้อมูล)
   - ใช้เฉพาะ auth + rpc: ข้อมูลทั้งหมดอ่านผ่าน get_profile() และเขียนผ่านฟังก์ชันที่ตรวจสิทธิ์ในฐานข้อมูล (ดู supabase/schema.sql)
   - ไม่ได้ตั้งค่า SUPABASE_URL/SUPABASE_KEY ใน config.js → DB.enabled = false และเกมทำงานแบบเดิม (เหรียญเก็บในเครื่อง) */
(function () {
  'use strict';
  const CFG = window.DUMMY_CONFIG || {};
  const DB = (window.DB = { enabled: false, loading: false, user: null, P: null, last: null });
  const url = String(CFG.SUPABASE_URL || '').trim(),
    key = String(CFG.SUPABASE_KEY || '').trim();
  if (!url || !key || !window.supabase || !window.supabase.createClient) return;
  DB.enabled = true;
  DB.loading = true;
  // จำ ?query ตอนเปิดหน้าไว้ก่อน — ไลบรารีแลก ?code= แล้วลบออกจาก URL เอง ช้าหรือเร็วกว่า 'load' ก็ได้แล้วแต่เน็ต
  const launchSearch = location.search;
  const libraryWillExchange = hasCodeVerifier(); // ต้องดูก่อนสร้าง client — ไลบรารีลบ verifier ทิ้งหลังแลกรหัส
  const sb = (DB.client = window.supabase.createClient(url, key, {
    // flowType pkce: ล็อกอิน Google กลับมาเป็น ?code= · ไลบรารีแลกเป็นเซสชันเองตอนสร้าง client (ทำแม้ detectSessionInUrl: false
    // เมื่อมี code verifier ในเครื่อง) — finishOAuthRedirect() จึงรอผลนั้น แล้วแลกเองเฉพาะตอนไลบรารีไม่ได้แลก
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
  }));
  // ไลบรารีแลก ?code= เองเมื่อมี "<storageKey>-code-verifier" ใน localStorage (เก็บไว้ตอนกดไปหน้า Google)
  function hasCodeVerifier() {
    try {
      if (!new URLSearchParams(launchSearch).get('code')) return false;
      return Object.keys(localStorage).some(name => name.endsWith('-code-verifier'));
    } catch (e) {
      return false;
    }
  }
  const DOMAIN = String(CFG.AUTH_EMAIL_DOMAIN || 'example.com').replace(/^@/, '');
  const th = m => {
    m = String(m || '');
    const map = [
      [/invalid login credentials/i, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'],
      [/already registered|already been registered/i, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'],
      [/at least (\d+) characters/i, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'],
      [
        /email not confirmed/i,
        'บัญชียังไม่ยืนยัน — เจ้าของเกมต้องปิด "Confirm email" ที่ Supabase (Authentication › Providers › Email)',
      ],
      [/rate limit|too many/i, 'ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่'],
      [
        /email.*(invalid|format)|unable to validate email/i,
        'ระบบอีเมลปฏิเสธชื่อนี้ — ตั้ง AUTH_EMAIL_DOMAIN ใน config.js เป็นโดเมนที่ใช้งานได้',
      ],
      [/failed to fetch|networkerror|network request failed|load failed/i, 'เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจสอบอินเทอร์เน็ต'],
      [/identity is already linked|already linked to another user/i, 'บัญชี Google นี้ผูกกับผู้เล่นคนอื่นอยู่แล้ว'],
      [/manual linking is disabled/i, 'ยังไม่ได้เปิดการผูกบัญชี — เจ้าของเกมต้องเปิด "Allow manual linking" ที่ Supabase'],
      [/provider is not enabled|unsupported provider/i, 'ยังไม่ได้เปิดล็อกอินด้วย Google — เจ้าของเกมต้องเปิดที่ Supabase'],
      [/access_denied|access denied|user cancelled|cancelled/i, 'ยกเลิกการเข้าสู่ระบบด้วย Google'],
      [/code verifier|flow state/i, 'ลิงก์ล็อกอินหมดอายุ ลองกดเข้าสู่ระบบด้วย Google ใหม่'],
    ];
    for (const [re, t] of map) if (re.test(m)) return t;
    return m || 'เกิดข้อผิดพลาด';
  };
  const emailOf = u => {
    u = String(u || '').trim();
    return u.includes('@') ? u.toLowerCase() : u.toLowerCase() + '@' + DOMAIN;
  };
  DB.validUser = u =>
    /^[a-z0-9_]{3,20}$/.test(
      String(u || '')
        .trim()
        .toLowerCase()
    );

  async function call(fn, args) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) {
      const e = new Error(th(error.message));
      e.raw = error;
      throw e;
    }
    return data;
  }
  DB.call = call;
  DB.token = async () => {
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  };

  // ---- ซิงก์ข้อมูลจากฐานข้อมูลเข้าตัวแปรของเกม (sv / nick / ของที่ใส่อยู่) ----
  function sync() {
    const P = DB.P;
    if (!P) return;
    try {
      sv.coins = Number(P.coins) || 0;
      sv.mcash = Number(P.mcash) || 0;
      sv.name = P.display_name;
      nick = P.display_name;
      sv.own = (P.inventory || []).filter(i => (Number(i.qty) || 0) >= 1).map(i => i.kind + ':' + i.item_id);
      localStorage.setItem('dummyName', P.display_name);
      for (const [kind, , lsKey] of KINDS) {
        const id = (P.equipped || {})[kind];
        if (id) localStorage.setItem(lsKey, id);
      }
      applyTheme();
    } catch (e) {
      /* ไฟล์แกนหน้าเกม (Code/Core) ยังโหลดไม่เสร็จ */
    }
  }
  DB.sync = sync;
  const repaint = () => {
    try {
      render();
    } catch (e) {}
  };
  DB.refresh = async () => {
    DB.P = await call('get_profile');
    sync();
    repaint();
    return DB.P;
  };

  DB.stars = id => Math.max(1, Number(DB.P && DB.P.characters && DB.P.characters[id]) || 1);

  // ---- ล็อกอิน / ผูกบัญชีด้วย Google (OAuth) ----
  // ขั้นตอน: กดปุ่ม → ไปหน้า Google → Google ส่งกลับมาที่ Supabase → Supabase ส่งกลับมาหน้าเกมพร้อม ?code=
  // EXTEND: ผู้ให้บริการอื่น (เช่น Facebook) = เพิ่มชื่อใน OAUTH_PROVIDERS แล้วเรียก startOAuth('<ชื่อ>', 'login')
  const OAUTH_PROVIDERS = ['google'];
  const OAUTH_PARAMS = ['code', 'error', 'error_code', 'error_description', 'state'];
  const OAUTH_RETURN_KEY = 'dummyOauthReturn'; // จำ ?query เดิม (เช่น ?room=ลิงก์ชวน) และว่ากำลัง "ล็อกอิน" หรือ "ผูกบัญชี"

  // แอป Android (WebView) ใช้ล็อกอิน Google ไม่ได้ — Google บล็อกหน้าเว็บที่ฝังในแอป
  DB.oauthAvailable = () => {
    const cap = window.Capacitor;
    const isApp = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    return !isApp;
  };

  DB.hasGoogle = () => {
    const identities = (DB.user && DB.user.identities) || [];
    return identities.some(identity => identity.provider === 'google');
  };

  // ชื่ออัตโนมัติที่ฐานข้อมูลตั้งให้บัญชีใหม่ที่ไม่ได้กรอกชื่อ (u + รหัส 10 ตัว · ดู handle_new_user ใน schema.sql)
  const AUTO_NAME = /^u[0-9a-f]{10}$/;
  DB.needsNickname = () => {
    const P = DB.P;
    if (!P) return false;
    if (Number(P.name_changes) >= 1) return false; // เคยตั้งชื่อเองแล้ว
    return AUTO_NAME.test(String(P.display_name || ''));
  };

  function rememberOAuthReturn(intent) {
    try {
      sessionStorage.setItem(OAUTH_RETURN_KEY, JSON.stringify({ intent, search: location.search }));
    } catch (e) {}
  }

  function takeOAuthReturn() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(OAUTH_RETURN_KEY) || 'null');
      sessionStorage.removeItem(OAUTH_RETURN_KEY);
      return saved || {};
    } catch (e) {
      return {};
    }
  }

  // ส่งกลับมาที่หน้าเดิมแบบไม่มี ?query — ต้องตรงกับ Redirect URLs ที่ตั้งไว้ใน Supabase
  const oauthRedirectUrl = () => location.origin + location.pathname;

  async function startOAuth(provider, intent) {
    if (!OAUTH_PROVIDERS.includes(provider)) throw new Error('ไม่รองรับการล็อกอินแบบนี้');
    if (!DB.oauthAvailable()) throw new Error('ล็อกอินด้วย Google ได้เฉพาะบนเว็บ ยังใช้ในแอปไม่ได้');
    rememberOAuthReturn(intent);
    const options = { redirectTo: oauthRedirectUrl() };
    const request =
      intent === 'link' ? sb.auth.linkIdentity({ provider, options }) : sb.auth.signInWithOAuth({ provider, options });
    const { error } = await request;
    if (error) throw new Error(th(error.message));
    // สำเร็จ = หน้าเว็บกำลังเปลี่ยนไปหน้า Google (ไม่ต้องทำอะไรต่อ)
  }

  DB.signInGoogle = () => startOAuth('google', 'login');
  DB.linkGoogle = () => startOAuth('google', 'link');

  // ลบพารามิเตอร์ OAuth ออกจากแถบที่อยู่ (กันรีเฟรชแล้วแลกรหัสซ้ำ) แล้วคืน ?query เดิมก่อนออกไปหน้า Google
  function cleanOAuthUrl(savedSearch) {
    const params = new URLSearchParams(savedSearch || location.search);
    OAUTH_PARAMS.forEach(name => params.delete(name));
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }

  // เรียกตอนเปิดหน้าเกม: ถ้าเพิ่งกลับมาจาก Google ให้แลก ?code= เป็นเซสชัน
  // ผลลัพธ์เก็บไว้ที่ DB.oauthError (หน้าล็อกอินแสดง) และ DB.oauthLinked (แจ้งว่าผูกบัญชีแล้ว)
  async function finishOAuthRedirect() {
    const params = new URLSearchParams(launchSearch);
    const code = params.get('code');
    const failure = params.get('error_description') || params.get('error');
    if (!code && !failure) return;
    const saved = takeOAuthReturn();
    // รอไลบรารีอ่าน ?code= จาก URL ให้เสร็จก่อนลบออก — ถ้าลบก่อน ไลบรารีจะไม่ได้แลก
    const libraryResult = failure ? {} : await sb.auth.initialize();
    cleanOAuthUrl(saved.search);
    if (failure) {
      DB.oauthError = th(failure);
      return;
    }
    const error = libraryResult.error || (await exchangeIfLibraryDidNot(code));
    if (error) {
      DB.oauthError = th(error.message);
      return;
    }
    DB.oauthLinked = saved.intent === 'link';
  }

  // ไลบรารีแลกรหัสไปแล้ว = ห้ามแลกซ้ำ (รหัสใช้ได้ครั้งเดียว → ขึ้น "ลิงก์ล็อกอินหมดอายุ" ทั้งที่เข้าได้แล้ว)
  // ไลบรารีไม่ได้แลก (ไม่มี code verifier ในเครื่องนี้ เช่น เปิดลิงก์คนละเบราว์เซอร์) → แลกเองเพื่อได้ข้อความผิดพลาดที่ตรงเหตุ
  async function exchangeIfLibraryDidNot(code) {
    if (libraryWillExchange) return null;
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return error || null;
  }

  // ---- บัญชี ----
  async function start() {
    DB.loading = true;
    DB.user = null;
    try {
      await finishOAuthRedirect();
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        DB.user = data.session.user;
        await afterLogin();
      }
    } catch (e) {
      DB.error = e.message;
    }
    DB.loading = false;
    repaint();
    announceOAuthResult();
  }
  // กลับมาจาก Google ขณะล็อกอินอยู่แล้ว (ผูกบัญชี) → แจ้งผลด้วยข้อความลอย · ถ้ายังไม่ล็อกอิน หน้าล็อกอินจะแสดง DB.oauthError เอง
  function announceOAuthResult() {
    if (!authed || !window.dbToast) return;
    if (DB.oauthLinked) dbToast('ผูกบัญชี Google แล้ว ใช้ปุ่ม Google เข้าเกมได้เลย');
    else if (DB.oauthError) dbToast(DB.oauthError);
    DB.oauthLinked = false;
    DB.oauthError = '';
  }
  async function afterLogin() {
    const r = await call('record_login'); // อัปเดตเวลาล็อกอินล่าสุด + จำนวนวันติดกัน
    DB.last = r;
    DB.P = await call('get_profile');
    sync();
    authed = true;
    if (typeof window.onDbLogin === 'function')
      try {
        window.onDbLogin(r);
      } catch (e) {}
    // บัญชีใหม่จาก Google ยังมีแค่ชื่ออัตโนมัติ (u…) → เปิดหน้าต่างตั้งชื่อเล่น (Account/first-nickname.js)
    if (DB.needsNickname() && typeof window.openFirstNickname === 'function')
      try {
        window.openFirstNickname();
      } catch (e) {}
  }
  DB.signIn = async (u, pw) => {
    const { data, error } = await sb.auth.signInWithPassword({ email: emailOf(u), password: String(pw || '') });
    if (error) throw new Error(th(error.message));
    DB.user = data.user;
    await afterLogin();
    repaint();
  };
  DB.signUp = async (u, pw, name) => {
    u = String(u || '')
      .trim()
      .toLowerCase();
    if (!DB.validUser(u)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 _ ความยาว 3-20 ตัว');
    if (String(pw || '').length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    const dn =
      String(name || u)
        .trim()
        .slice(0, 14) || u;
    const bad = window.NameFilter && NameFilter.check(dn);
    if (bad) throw new Error(bad);
    const { data, error } = await sb.auth.signUp({
      email: emailOf(u),
      password: pw,
      options: { data: { username: u, display_name: dn } },
    });
    if (error) throw new Error(th(error.message));
    if (!data.session)
      throw new Error(
        'สมัครแล้ว แต่ต้องยืนยันอีเมลก่อน — เจ้าของเกมต้องปิด "Confirm email" ที่ Supabase (Authentication › Providers › Email)'
      );
    DB.user = data.user;
    await afterLogin();
    repaint();
  };
  DB.signOut = async () => {
    try {
      await sb.auth.signOut();
    } catch (e) {}
    DB.user = null;
    DB.P = null;
    authed = false;
    if (window.auReset) auReset();
    try {
      if (typeof leave === 'function') leave();
      if (sock) {
        sock.close();
        sock = null;
      }
    } catch (e) {}
    repaint();
  };

  // ลบบัญชีถาวร: ฐานข้อมูลตรวจว่าพิมพ์ชื่อผู้ใช้ตรงก่อนลบ (ย้อนกลับไม่ได้) แล้วล้างข้อมูลในเครื่องและออกจากระบบ
  DB.deleteAccount = async confirmName => {
    await call('delete_my_account', { p_confirm: String(confirmName || '') });
    try {
      Object.keys(localStorage)
        .filter(k => /^dummy/i.test(k))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    await DB.signOut();
  };

  // ---- การกระทำของผู้เล่น (ทุกอย่างตรวจและหักเหรียญที่ฝั่งฐานข้อมูล) ----
  // กาชา: สุ่ม/ขายตัวซ้ำ (ราคา โอกาส การันตี ตรวจที่ฐานข้อมูลทั้งหมด)
  DB.gacha = async () => {
    DB.G = await call('get_gacha');
    return DB.G;
  };
  DB.pull = async (banner, n, cur) => {
    const r = await call('gacha_pull', { p_banner: banner, p_count: n, p_currency: cur || 'coins' });
    await DB.refresh();
    DB.gacha()
      .then(repaint)
      .catch(() => {});
    return r;
  };
  // ตั๋วสุ่ม (แลกด้วยเพชร) · ร้านของแต่งรายสัปดาห์ (ซื้อด้วยเหรียญ)
  DB.buyTicket = async (id, qty) => {
    const r = await call('buy_ticket', { p_id: id, p_qty: qty });
    await DB.refresh();
    await DB.gacha().catch(() => {});
    repaint();
    return r;
  };
  DB.weekly = async () => {
    DB.W = await call('get_weekly_shop');
    return DB.W;
  };
  DB.buyWeekly = async (kind, id) => {
    const r = await call('buy_weekly', { p_kind: kind, p_id: id });
    await DB.refresh();
    await DB.weekly().catch(() => {});
    repaint();
    return r;
  };
  DB.sell = async (kind, id, qty) => {
    const r = await call('sell_dupes', { p_kind: kind, p_id: id, p_qty: qty });
    await DB.refresh();
    return r;
  };
  DB.qty = (kind, id) => {
    const i = ((DB.P && DB.P.inventory) || []).find(x => x.kind === kind && x.item_id === id);
    return i ? Number(i.qty) || 0 : 0;
  };
  DB.equip = async (kind, id) => {
    try {
      await call('set_equipped', { p_kind: kind, p_id: id });
      if (DB.P) DB.P.equipped = Object.assign({}, DB.P.equipped, { [kind]: id });
    } catch (e) {
      /* ใส่ไม่ได้ → ซิงก์กลับ */ DB.refresh().catch(() => {});
    }
  };
  DB.upStar = async id => {
    const r = await call('upgrade_star', { p_char: id });
    await DB.refresh();
    return r;
  };
  let nt = null,
    tt = null;
  // เปลี่ยนชื่อ: ครั้งแรกฟรี ครั้งต่อไปเสียเหรียญ → กดบันทึกเองเท่านั้น (ไม่บันทึกอัตโนมัติระหว่างพิมพ์)
  DB.renameCost = () => (DB.P && Number(DB.P.name_changes) >= 1 ? Number(DB.P.rename_cost) || 500 : 0);
  DB.saveName = async v => {
    const r = await call('update_profile', { p_name: v });
    await DB.refresh();
    return r;
  };
  DB.setName = () => {};
  DB.setTitle = v => {
    clearTimeout(tt);
    tt = setTimeout(
      () =>
        call('update_profile', { p_title: v })
          .then(r => {
            if (DB.P) DB.P.title = r.title;
          })
          .catch(e => {
            if (window.dbToast && e && e.message) dbToast(e.message);
          }),
      600
    );
  };
  DB.claimLogin = async () => {
    const r = await call('claim_login_reward');
    await DB.refresh();
    return r;
  };
  DB.quests = () => call('get_quests');
  DB.claimQuest = async id => {
    const r = await call('claim_quest', { p_id: id });
    await DB.refresh();
    return r;
  };
  DB.claimBonus = async p => {
    const r = await call('claim_quest_bonus', { p_period: p });
    await DB.refresh();
    return r;
  };

  // เซิร์ฟเวอร์เกมบันทึกผลตาที่จบแล้ว → แจ้งยอดใหม่ (รวมโบนัสเหรียญของตัวละคร)
  DB.onWallet = d => {
    if (!d || !DB.P) return;
    if (d.coins != null) DB.P.coins = d.coins;
    if (d.mcash != null) DB.P.mcash = d.mcash;
    sync();
    try {
      if (S && d.gid && S.gid === d.gid && !d.duplicate) coinDelta = (Number(d.delta) || 0) + (Number(d.bonus) || 0);
    } catch (e) {}
    if (window.Progress) Progress.onWallet(d);
    if (d.level != null) {
      DB.P.level = d.level;
      if (d.player_exp != null) DB.P.player_exp = d.player_exp;
    }
    if (d.level_up && window.dbToast)
      dbToast(
        '⬆ เลเวล ' +
          d.level +
          '!' +
          (d.level_mcash ? ' +' + d.level_mcash + ' 💎' : '') +
          (d.level_coins ? ' +' + d.level_coins + ' 🪙' : '')
      );
    DB.refresh().catch(() => repaint()); // ดึงสถิติ/เกมล่าสุด/ยอดล่าสุดมาแสดง
  };

  sb.auth.onAuthStateChange(ev => {
    if (ev === 'SIGNED_OUT' && DB.user) {
      DB.user = null;
      DB.P = null;
      authed = false;
      repaint();
    }
  });
  // ไฟล์แกนหน้าเกม (Code/Core/state.js …) โหลดหลัง db.js → เริ่มตรวจเซสชันหลังโหลดสคริปต์ทั้งหมด
  window.addEventListener('load', start);
})();
