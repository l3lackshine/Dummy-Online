'use strict';
// ตรวจ access token ของ Supabase (เรียก /auth/v1/user) — ต้องตั้ง env SUPABASE_URL และ SUPABASE_ANON_KEY
async function verifyToken(token) {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, ''), key = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key || typeof token !== 'string' || token.length < 20 || token.length > 4000) return null;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + token }, signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: String(u.id), email: u.email || '' } : null;
  } catch (e) { return null; }
}
module.exports = { verifyToken };
