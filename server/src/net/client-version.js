// net/client-version.js — ด่านเวอร์ชันเกมตอนเชื่อมต่อ: ไม่รับ client ที่เก่ากว่าเลขขั้นต่ำ
// ทำไมต้องมี: แท็บที่เปิดค้างไว้ไม่รีเฟรชยังเล่นด้วยโค้ดเก่าได้ — ฝั่งหน้าเว็บมีตัวเตือนแล้ว (Code/Core/version-check.js)
//   แต่ client เชื่อไม่ได้เสมอ ด่านนี้คือตัวบังคับจริง
// เปิดใช้: ตั้ง env MIN_CLIENT_VERSION (เช่น 0.18.2) · ไม่ตั้ง = ปิด (รับทุกเวอร์ชันเหมือนเดิม)
//   ไม่ผูกกับเลขของเซิร์ฟเวอร์เอง เพราะ Render กับ Cloudflare deploy ไม่พร้อมกัน — ถ้าผูก ช่วงรอ deploy ผู้เล่นจะเข้าเกมไม่ได้
// Public: parseVersion(text) · isOutdated(clientVersion, minVersion) · versionGate(minVersion) → middleware ของ io.use
// EXTEND: อยากบังคับเฉพาะเวอร์ชันใหญ่ = เทียบแค่ส่วนแรกใน isOutdated()

const OUTDATED_ERROR = 'outdated'; // client (connection.js) ดูข้อความนี้เพื่อขึ้นหน้าต่าง "มีเวอร์ชันใหม่"
const MAX_VERSION_TEXT = 40; // กันข้อความยาวผิดปกติจาก client

// "Beta 0.18.1" / "0.18.1" → [0, 18, 1] · อ่านไม่ได้ = null
function parseVersion(text) {
  const match = String(text || '')
    .slice(0, MAX_VERSION_TEXT)
    .match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
}

// เทียบทีละส่วน (ใหญ่ → เล็ก) · client ไม่ส่งเลข/อ่านไม่ได้ = ถือว่าเก่า (เกมก่อนมีด่านนี้ไม่ส่งเลขมา)
function isOutdated(clientVersion, minVersion) {
  const minimum = parseVersion(minVersion);
  if (!minimum) return false;

  const client = parseVersion(clientVersion);
  if (!client) return true;

  for (let part = 0; part < minimum.length; part++) {
    if (client[part] > minimum[part]) return false;
    if (client[part] < minimum[part]) return true;
  }
  return false; // เท่ากันพอดี = ผ่าน
}

function versionGate(minVersion) {
  return (socket, next) => {
    const auth = socket.handshake && socket.handshake.auth;
    const clientVersion = auth && auth.version;
    if (!isOutdated(clientVersion, minVersion)) return next();

    const error = new Error(OUTDATED_ERROR);
    error.data = { min: String(minVersion) }; // ให้หน้าต่างบอกผู้เล่นได้ว่าต้องเป็นเวอร์ชันไหนขึ้นไป
    next(error);
  };
}

module.exports = { parseVersion, isOutdated, versionGate, OUTDATED_ERROR };
