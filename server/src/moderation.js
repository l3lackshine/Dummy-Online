// moderation.js — ถามโทษของบัญชีจากฐานข้อมูล (supabase/v18_admin_tools.sql: get_sanction) ให้ระบบอื่นในเซิร์ฟเวอร์ใช้
// - isBanned(SB, uid): ใช้ตอนตรวจ token — บัญชีที่ถูกแบนเชื่อมต่อเซิร์ฟเวอร์ไม่ได้
// - isMuted(SB, uid):  ใช้ตอนส่งอีโมต — จำผลไว้สั้น ๆ เพราะอีโมตถูกส่งบ่อย ไม่อยากถามฐานข้อมูลทุกครั้ง
// ฐานข้อมูลยังไม่มี v18 / ต่อไม่ติด = ถือว่า "ไม่มีโทษ" (ไม่ให้ผู้เล่นทั้งเซิร์ฟเวอร์เข้าเกมไม่ได้เพราะระบบเสริมนี้พัง)
// Public: isBanned(SB, uid) · isMuted(SB, uid) · forget(uid)
// EXTEND: โทษชนิดใหม่ = เพิ่มช่องใน get_sanction (SQL) แล้วเพิ่มฟังก์ชัน is<โทษ>() ที่นี่

const MUTE_CACHE_MS = 60 * 1000; // แอดมินสั่งปิดอีโมตแล้ว มีผลภายใน 1 นาที

const muteCache = new Map(); // uid → { at, until }

async function fetchSanction(SB, uid) {
  try {
    return (await SB.rpc('get_sanction', { p_user: uid })) || {};
  } catch (e) {
    return {};
  }
}

async function isBanned(SB, uid) {
  if (!uid) return false;
  const sanction = await fetchSanction(SB, uid);
  return sanction.banned === true;
}

async function isMuted(SB, uid) {
  if (!uid || !SB.enabled()) return false;
  const now = Date.now();
  const cached = muteCache.get(uid);
  if (!cached || now - cached.at > MUTE_CACHE_MS) {
    const sanction = await fetchSanction(SB, uid);
    const until = sanction.muted === true ? new Date(sanction.muted_until).getTime() : 0;
    muteCache.set(uid, { at: now, until });
    return until > now;
  }
  return cached.until > now;
}

function forget(uid) {
  muteCache.delete(uid);
}

module.exports = { isBanned, isMuted, forget };
