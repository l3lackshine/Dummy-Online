/* จำลอง supabase-js + socket.io ฝั่ง browser (เฉพาะ auth + rpc) ไว้ทดสอบหน้าเว็บโดยไม่ต่อ Supabase จริง
   ใช้กับ client/test/e2e.js ผ่าน Playwright — ตรรกะเลียนแบบ supabase/schema.sql แบบย่อ */
(function () {
  const day = () => new Date().toISOString().slice(0, 10);
  const db = JSON.parse(localStorage.getItem('mockdb') || 'null') || { users: {}, session: null };
  const save = () => localStorage.setItem('mockdb', JSON.stringify(db));
  const REW = [[100, 0], [150, 0], [200, 0], [250, 0], [300, 0], [400, 0], [500, 20]];
  const MS = [{ streak: 3, coins: 100, mcash: 0, label: 'ครบ 3 วันติด' }, { streak: 7, coins: 300, mcash: 10, label: 'ครบ 7 วันติด' }, { streak: 14, coins: 600, mcash: 20, label: 'ครบ 14 วันติด' }];
  const SHOP = { 'characters:rina-01': 1500, 'backs:gold': 700, 'tables:wood': 400 };
  const FREE = ['characters:boy', 'characters:girl'];
  const me = () => db.users[db.session && db.session.user.id];
  const err = m => ({ data: null, error: { message: m } });
  const QD = [{ id: 'd_login', name: 'เช็คอินรายวัน', description: 'เข้าเกมวันนี้', icon: '📅', metric: 'login', target: 1, reward_coins: 20, reward_mcash: 0 },
    { id: 'd_play3', name: 'วอร์มอัป', description: 'เล่นให้จบ 3 ตา', icon: '🎴', metric: 'play', target: 3, reward_coins: 50, reward_mcash: 0 },
    { id: 'd_win1', name: 'ชัยชนะแรก', description: 'ชนะ 1 ตา', icon: '🏆', metric: 'win', target: 1, reward_coins: 60, reward_mcash: 0 }];
  const owns = (u, k) => FREE.includes(k) || u.inv.some(i => i.kind + ':' + i.item_id === k);
  const R = {
    record_login(u) { const t = day(); if (u.last_login_day !== t) { u.login_streak = u.last_login_day === 'y' ? u.login_streak + 1 : (u.login_streak || 0) + 1; u.last_login_day = t; u.total_login_days++; u.best_streak = Math.max(u.best_streak, u.login_streak); u.cycle = ((u.login_streak - 1) % 7) + 1; u.claimed = false; } u.last_login_at = new Date().toISOString(); return { streak: u.login_streak, new_day: true }; },
    get_profile(u) { return { id: u.id, username: u.username, display_name: u.display_name, title: u.title || '', coins: u.coins, mcash: u.mcash, equipped: u.equipped, last_login_at: u.last_login_at, login_streak: u.login_streak, best_streak: u.best_streak, total_login_days: u.total_login_days, last_game: u.last_game, stats: u.stats, inventory: u.inv, characters: u.chars,
      login: { today: day(), streak: u.login_streak, claimed: !!u.claimed, cycle_day: u.cycle || 1, rewards: REW.map((r, i) => ({ day: i + 1, coins: r[0], mcash: r[1], label: '' })), milestones: MS } }; },
    claim_login_reward(u) { if (u.claimed) throw new Error('วันนี้รับรางวัลล็อกอินไปแล้ว'); const r = REW[(u.cycle || 1) - 1], m = MS.find(x => x.streak === u.login_streak); u.claimed = true; u.coins += r[0] + (m ? m.coins : 0); u.mcash += r[1] + (m ? m.mcash : 0);
      return { streak: u.login_streak, cycle_day: u.cycle, coins: r[0], mcash: r[1], bonus_coins: m ? m.coins : 0, bonus_mcash: m ? m.mcash : 0, bonus_label: m ? m.label : '' }; },
    get_quests(u) { const q = QD.map(d => ({ ...d, progress: Math.min(d.target, d.metric === 'login' ? 1 : (u.qp || 0)), claimed: !!(u.qc || {})[d.id] }));
      const blk = k => ({ key: day(), resets_at: new Date(Date.now() + (k === 'daily' ? 3 : 90) * 3600e3).toISOString(), quests: q, bonus: { coins: 100, ready: false, claimed: false } }); return { daily: blk('daily'), weekly: blk('weekly'), now: new Date().toISOString() }; },
    claim_quest(u, a) { const d = QD.find(x => x.id === a.p_id); u.qc = u.qc || {}; u.qc[d.id] = 1; u.coins += d.reward_coins; return { coins: d.reward_coins, mcash: 0 }; },
    buy_item(u, a) { const k = a.p_kind + ':' + a.p_id, p = SHOP[k]; if (!p) throw new Error('ไม่มีสินค้านี้ในร้าน'); if (owns(u, k)) throw new Error('คุณมีของชิ้นนี้แล้ว'); if (u.coins < p) throw new Error('เหรียญไม่พอ'); u.coins -= p; u.inv.unshift({ kind: a.p_kind, item_id: a.p_id, currency: 'coins', price_paid: p, acquired_at: new Date().toISOString() }); return { paid: p }; },
    set_equipped(u, a) { if (!owns(u, a.p_kind + ':' + a.p_id)) throw new Error('คุณยังไม่มีของชิ้นนี้'); u.equipped[a.p_kind] = a.p_id; return u.equipped; },
    update_profile(u, a) { if (a.p_name != null) u.display_name = a.p_name; if (a.p_title != null) u.title = a.p_title; return { display_name: u.display_name, title: u.title }; },
    upgrade_star(u, a) { const st = u.chars[a.p_char] || 1, cost = [500, 1000, 2000, 4000][st - 1]; if (st >= 5) throw new Error('ตัวละครนี้ดาวเต็มแล้ว'); if (u.coins < cost) throw new Error('เหรียญไม่พอ (ต้องใช้ ' + cost + ' เหรียญ)'); u.coins -= cost; u.chars[a.p_char] = st + 1; return { character: a.p_char, stars: st + 1, cost }; },
  };
  const client = { auth: {
    async getSession() { return { data: { session: db.session } }; },
    async signInWithPassword({ email, password }) { const u = Object.values(db.users).find(x => x.email === email); if (!u || u.pw !== password) return err('Invalid login credentials'); db.session = { access_token: 'tok-' + u.id, user: { id: u.id } }; save(); return { data: { user: { id: u.id }, session: db.session }, error: null }; },
    async signUp({ email, password, options }) { if (Object.values(db.users).some(x => x.email === email)) return err('User already registered'); const id = 'u' + (Object.keys(db.users).length + 1), un = options.data.username;
      db.users[id] = { id, email, pw: password, username: un, display_name: options.data.display_name, coins: 5000, mcash: 0, equipped: {}, inv: [], chars: {}, stats: [], login_streak: 0, best_streak: 0, total_login_days: 0 }; db.session = { access_token: 'tok-' + id, user: { id } }; save(); return { data: { user: { id }, session: db.session }, error: null }; },
    async signOut() { db.session = null; save(); return { error: null }; }, onAuthStateChange() { return { data: {} }; } },
    async rpc(fn, args) { try { const u = me(); if (!u) return err('กรุณาเข้าสู่ระบบ'); const out = R[fn](u, args || {}); save(); return { data: out, error: null }; } catch (e) { return err(e.message); } } };
  window.supabase = { createClient: () => client };
  window.io = () => { const h = {}; return { connected: false, on(e, f) { (h[e] = h[e] || []).push(f); return this; }, emit() {}, close() {} }; };
  window.__mockdb = db;
})();
