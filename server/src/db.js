'use strict';
// ชั้นข้อมูลบัญชี / เหรียญ / ร้านค้า / ประวัติเกม
//   • มี SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → ใช้ Supabase (ตาราง/ฟังก์ชันใน supabase/migrations)
//   • ไม่มี                                          → ใช้หน่วยความจำ (เทสต์ / รันในเครื่อง) พฤติกรรมเหมือนกัน แต่ข้อมูลหายเมื่อรีสตาร์ต
// service_role key ใช้ที่เซิร์ฟเวอร์เท่านั้น ห้ามใส่ใน client / config.js
const fs = require('fs');
const path = require('path');

const INITIAL_COINS = 5000;
// คีย์ที่ client เก็บสกินที่ใส่อยู่ (localStorage) → หมวดสินค้าใน shop_items
const EQUIP_KINDS = {
  dummySkin: 'themes', dummyCharacterSkin: 'characters', dummyBackSkin: 'backs', dummyTableSkin: 'tables',
  dummyBackgroundSkin: 'backgrounds', dummyCardSkin: 'cards', dummyDockSkin: 'docks',
};
const TITLE_KEY = 'dummyTitle';
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHOP_TTL_MS = 60000;

const cleanText = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
const cleanName = s => cleanText(s, 14) || 'ผู้เล่น';
const profileId = id => String(id || '');

// รูปที่ส่งให้ client ผ่าน event 'me' (ชื่อฟิลด์ตรงกับ sv ใน client/public/app.js: name, coins, own, eq)
function meOf(p, email) {
  return {
    account: true, email: email || undefined, name: p.name, coins: p.coins, own: p.own.slice(),
    eq: (p.equipped && p.equipped.dummySkin) || 'classic', equipped: Object.assign({}, p.equipped),
    stats: { games: p.games, wins: p.wins },
  };
}

// ตรวจค่าที่ client ขอบันทึก — ใส่ได้เฉพาะของฟรี หรือของที่ซื้อแล้ว; ของที่ไม่รู้จักถูกทิ้ง
function cleanProfilePatch(input, profile, priceOf) {
  const d = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const patch = {};
  if (d.name != null) patch.name = cleanName(d.name);
  if (d.equipped && typeof d.equipped === 'object' && !Array.isArray(d.equipped)) {
    const eq = Object.assign({}, profile.equipped);
    for (const [key, kind] of Object.entries(EQUIP_KINDS)) {
      const v = d.equipped[key];
      if (typeof v !== 'string' || !ID_RE.test(v)) continue;
      const price = priceOf(kind, v);
      if (price == null) continue;
      if (price <= 0 || profile.own.includes(kind + ':' + v)) eq[key] = v;
    }
    if (typeof d.equipped[TITLE_KEY] === 'string') eq[TITLE_KEY] = cleanText(d.equipped[TITLE_KEY], 16);
    patch.equipped = eq;
  }
  return patch;
}

// ───────────── หน่วยความจำ ─────────────
function memoryStore(opts = {}) {
  const profiles = new Map(), purchases = new Map(), matches = new Map(), ledger = [];
  let shop = new Map();
  const shopFile = opts.shopFile === undefined ? path.join(__dirname, '../../client/public/skin/skins.json') : opts.shopFile;
  const loadShopFile = () => {
    const m = new Map();
    try {
      const skins = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
      for (const [kind, list] of Object.entries(skins)) if (Array.isArray(list)) for (const x of list) if (x && x.id) m.set(kind + ':' + x.id, Math.max(0, Math.floor(Number(x.price) || 0)));
    } catch (e) { /* ไม่มีไฟล์ = ไม่มีสินค้า */ }
    return m;
  };
  shop = shopFile ? loadShopFile() : new Map();
  const view = id => {
    const p = profiles.get(id); if (!p) return null;
    return { id, name: p.name, coins: p.coins, equipped: Object.assign({}, p.equipped), games: p.games, wins: p.wins, own: [...(purchases.get(id) || new Map()).keys()] };
  };
  const addLedger = (userId, amount, balanceAfter, kind, ref) => {
    if (!ledger.some(l => l.userId === userId && l.kind === kind && l.ref === ref)) ledger.push({ userId, amount, balanceAfter, kind, ref });
  };
  return {
    mode: 'memory', _ledger: ledger, _matches: matches, _profiles: profiles,
    async verifyToken(token) {
      // โหมดหน่วยความจำไม่มีผู้ออกโทเคนจริง: เปิดรับโทเคนทดสอบ "test:<uuid>" เฉพาะเมื่อตั้ง DB_TEST_TOKENS=1
      const m = process.env.DB_TEST_TOKENS === '1' && /^test:(.+)$/.exec(String(token || ''));
      return m && UUID_RE.test(m[1]) ? { userId: m[1].toLowerCase(), email: 'test@example.com' } : null;
    },
    async getProfile(userId, nameHint) {
      userId = profileId(userId);
      if (!profiles.has(userId)) {
        profiles.set(userId, { name: cleanName(nameHint), coins: INITIAL_COINS, equipped: {}, games: 0, wins: 0 });
        purchases.set(userId, new Map());
        addLedger(userId, INITIAL_COINS, INITIAL_COINS, 'grant', 'initial');
      }
      return view(userId);
    },
    async saveProfile(userId, patch) {
      const p = profiles.get(profileId(userId)); if (!p) throw new Error('no profile');
      if (patch.name) p.name = patch.name;
      if (patch.equipped) p.equipped = Object.assign({}, patch.equipped);
      return view(profileId(userId));
    },
    async loadShop() { return shop; },
    priceOf(kind, id) { const v = shop.get(kind + ':' + id); return v === undefined ? null : v; },
    _setShop(entries) { shop = new Map(entries); },
    async buy(userId, kind, id) {
      userId = profileId(userId);
      const price = shop.get(kind + ':' + id), p = profiles.get(userId);
      if (price === undefined) return { ok: false, error: 'unknown_item' };
      if (!p) return { ok: false, error: 'no_profile' };
      const own = purchases.get(userId), key = kind + ':' + id;
      if (own.has(key)) return { ok: true, already: true, coins: p.coins };
      if (price > 0 && p.coins < price) return { ok: false, error: 'insufficient', coins: p.coins };
      if (price > 0) { p.coins -= price; addLedger(userId, -price, p.coins, 'shop', key); }
      own.set(key, price);
      return { ok: true, coins: p.coins };
    },
    async settleMatch(m) {
      if (!m || !m.gid) return { ok: false, error: 'bad_gid' };
      if (matches.has(m.gid)) return { ok: true, duplicate: true };
      matches.set(m.gid, { rule: m.rule, stake: m.stake | 0, seats: m.seats | 0, humans: m.humans | 0, players: [] });
      const balances = {};
      for (const r of (m.players || []).slice().sort((a, b) => (a.user_id ? 0 : 1) - (b.user_id ? 0 : 1) || String(a.user_id || '').localeCompare(String(b.user_id || '')) || a.seat - b.seat)) {
        let uid = r.user_id ? profileId(r.user_id) : null, applied = r.delta | 0;
        const p = uid && profiles.get(uid);
        if (p) {
          const next = Math.max(0, p.coins + (r.delta | 0));
          applied = next - p.coins; p.coins = next; p.games++; if (r.won) p.wins++;
          addLedger(uid, applied, next, 'match', m.gid); balances[uid] = next;
        } else uid = null;
        matches.get(m.gid).players.push({ seat: r.seat, userId: uid, name: cleanName(r.name), delta: r.delta | 0, applied, won: !!r.won, place: r.place | 0 });
      }
      return { ok: true, balances };
    },
  };
}

// ───────────── Supabase ─────────────
function supabaseStore(url, serviceKey, opts = {}) {
  const { createClient } = opts.createClient ? { createClient: opts.createClient } : require('@supabase/supabase-js');
  const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let shop = new Map(), shopAt = 0;
  const must = ({ data, error }, what) => { if (error) throw new Error(what + ': ' + error.message); return data; };
  const load = async userId => {
    const p = must(await sb.from('profiles').select('*').eq('id', userId).maybeSingle(), 'profiles');
    if (!p) return null;
    const rows = must(await sb.from('purchases').select('kind,item_id').eq('user_id', userId), 'purchases') || [];
    return { id: userId, name: p.name, coins: Number(p.coins), equipped: p.equipped || {}, games: p.games, wins: p.wins, own: rows.map(r => r.kind + ':' + r.item_id) };
  };
  return {
    mode: 'supabase',
    async verifyToken(token) {
      const { data, error } = await sb.auth.getUser(String(token || ''));
      if (error || !data || !data.user) return null;
      return { userId: data.user.id, email: data.user.email };
    },
    async getProfile(userId, nameHint) {
      let p = await load(userId);
      if (!p) { must(await sb.rpc('ensure_profile', { p_user: userId, p_name: cleanName(nameHint) }), 'ensure_profile'); p = await load(userId); }
      if (!p) throw new Error('profile missing after ensure_profile');
      return p;
    },
    async saveProfile(userId, patch) {
      const row = {}; if (patch.name) row.name = patch.name; if (patch.equipped) row.equipped = patch.equipped;
      if (Object.keys(row).length) must(await sb.from('profiles').update(row).eq('id', userId), 'profiles.update');
      return load(userId);
    },
    async loadShop() {
      if (Date.now() - shopAt < SHOP_TTL_MS && shop.size) return shop;
      const rows = must(await sb.from('shop_items').select('kind,id,price'), 'shop_items') || [];
      shop = new Map(rows.map(r => [r.kind + ':' + r.id, Number(r.price)])); shopAt = Date.now();
      return shop;
    },
    priceOf(kind, id) { const v = shop.get(kind + ':' + id); return v === undefined ? null : v; },
    async buy(userId, kind, id) { return must(await sb.rpc('buy_item', { p_user: userId, p_kind: kind, p_item: id }), 'buy_item'); },
    async settleMatch(m) { return must(await sb.rpc('settle_match', { p_match: m }), 'settle_match'); },
  };
}

function create(opts = {}) {
  const url = opts.url !== undefined ? opts.url : process.env.SUPABASE_URL;
  const key = opts.serviceKey !== undefined ? opts.serviceKey : process.env.SUPABASE_SERVICE_ROLE_KEY;
  const store = url && key ? supabaseStore(url, key, opts) : memoryStore(opts);
  store.meOf = meOf;
  store.cleanProfilePatch = (input, profile) => cleanProfilePatch(input, profile, (k, i) => store.priceOf(k, i));
  return store;
}

module.exports = { create, memoryStore, supabaseStore, meOf, cleanProfilePatch, cleanName, EQUIP_KINDS, INITIAL_COINS, UUID_RE };
