'use strict';
// เชื่อม Supabase ฝั่งเซิร์ฟเวอร์ด้วย fetch ล้วน (ไม่พึ่งแพ็กเกจเพิ่ม)
//  - SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY : ใช้ตรวจ access token ของผู้เล่น (/auth/v1/user)
//  - SUPABASE_SECRET_KEY (sb_secret_...)     : ใช้เรียกฟังก์ชันที่ผู้เล่นเรียกเองไม่ได้ (record_game_result ฯลฯ) — ห้ามส่งให้ client
// ถ้าไม่ได้ตั้งค่า → enabled() = false: เซิร์ฟเวอร์ทำงานแบบเดิม (ไม่ต้องล็อกอิน ไม่บันทึกลงฐานข้อมูล)
const cfg = () => ({
  url: String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''),
  pub: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  secret: process.env.SUPABASE_SECRET_KEY || '',
});
const enabled = () => { const c = cfg(); return !!(c.url && c.pub && c.secret) && process.env.SUPABASE_DISABLED !== '1'; };
const fetchJson = async (url, opt) => {
  const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(Number(process.env.SUPABASE_TIMEOUT_MS || 8000)) });
  const txt = await r.text(); let body = null; try { body = txt ? JSON.parse(txt) : null; } catch (e) { body = txt; }
  if (!r.ok) { const err = new Error((body && (body.message || body.msg || body.error_description)) || ('HTTP ' + r.status)); err.status = r.status; throw err; }
  return body;
};
// ตรวจ access token → { id, name } หรือ null
async function verifyToken(token) {
  const c = cfg(); if (!token || typeof token !== 'string' || token.length > 4096) return null;
  try {
    const u = await fetchJson(c.url + '/auth/v1/user', { headers: { apikey: c.pub, Authorization: 'Bearer ' + token } });
    if (!u || !u.id) return null;
    const rows = await fetchJson(`${c.url}/rest/v1/profiles?id=eq.${encodeURIComponent(u.id)}&select=display_name`, { headers: { apikey: c.secret } });
    return { id: u.id, name: rows && rows[0] ? rows[0].display_name : null };
  } catch (e) { return null; }
}
// เรียกฟังก์ชันฐานข้อมูล (สิทธิ์ service_role)
async function rpc(fn, args) {
  const c = cfg();
  return fetchJson(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: c.secret, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
}
// เรียกซ้ำเมื่อพลาดชั่วคราว (เน็ต/Supabase หน่วง) — record_game_result ซ้ำปลอดภัยเพราะกันซ้ำด้วย gid
async function rpcRetry(fn, args, tries = 4) {
  let last; for (let i = 0; i < tries; i++) { try { return await rpc(fn, args); } catch (e) { last = e; if (e.status && e.status < 500 && e.status !== 429) break; await new Promise(r => setTimeout(r, 400 * 2 ** i)); } }
  throw last;
}
// ตรวจว่าผู้เล่นมีไอเทม (ในคลัง) หรือไม่ — ใช้กับการส่งกุญแจแพ็กตัวละคร
async function ownsItem(userId, kind, itemId) {
  const c = cfg(), q = encodeURIComponent;
  const rows = await fetchJson(`${c.url}/rest/v1/inventory?user_id=eq.${q(userId)}&kind=eq.${q(kind)}&item_id=eq.${q(itemId)}&qty=gte.1&select=item_id&limit=1`, { headers: { apikey: c.secret } });
  return Array.isArray(rows) && rows.length > 0;
}
module.exports = { enabled, verifyToken, rpc, rpcRetry, ownsItem };
