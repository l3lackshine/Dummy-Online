// config.js — ค่าตั้งของเซิร์ฟเวอร์เกม อ่านจากตัวแปรสภาพแวดล้อม (Render / server/.env)
// ทำไมเป็นฟังก์ชัน: เทสโหลด index.js ใหม่หลายรอบด้วยค่าคนละชุด — ต้องอ่าน process.env ใหม่ทุกครั้ง ไม่ใช่จำค่าตอน require ครั้งแรก
// Public: readConfig() → { PORT, MAX_PLAYERS, ... }
// EXTEND: ค่าใหม่ที่ปรับได้ ให้เพิ่มที่นี่ที่เดียว แล้วใช้ผ่าน ctx.config

const APP_ORIGINS = ['https://localhost', 'http://localhost', 'capacitor://localhost']; // WebView ของแอป Android/iOS (Capacitor) — อนุญาตเสมอ

// ค่าตัวเลขจาก env · ไม่ได้ตั้ง = ค่าเริ่มต้น · ตั้งเป็น 0 ได้ (ใช้ปิดบางระบบในเทส)
function numberFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultValue;
  return Number(raw);
}

function readConfig() {
  const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
  return {
    PORT: process.env.PORT || 3000,
    ALLOWED_ORIGIN: allowedOrigin,
    ORIGINS: allowedOrigin === '*' ? true : [...allowedOrigin.split(','), ...APP_ORIGINS],
    MAX_PLAYERS: 4,
    MAX_ROOMS: numberFromEnv('MAX_ROOMS', 300),
    OPENING_MS: numberFromEnv('OPENING_MS', 5000), // เวลาให้แอนิเมชันสับ+แจกไพ่ก่อนบอทเดินตาแรก
    NEXT_MS: numberFromEnv('NEXT_MS', 20000), // เวลาให้ทุกคนกด "เล่นต่อ" หลังจบตา (0 = ปิดระบบนี้)
    MATCH_WAIT_MS: numberFromEnv('MATCH_WAIT_MS', 20000), // หาแมตช์: รอหาคนก่อนถามเติมบอท
    MATCH_PROMPT_MS: numberFromEnv('MATCH_PROMPT_MS', 10000), // หาแมตช์: เวลาโหวตรอต่อ/เติมบอท
    MATCH_READY_MS: numberFromEnv('MATCH_READY_MS', 15000), // หน้าต่างกดพร้อมเมื่อหาผู้เล่นครบ
    BOT_DELAY_MS: numberFromEnv('BOT_DELAY_MS', 650),
    EMPTY_ROOM_TTL_MS: numberFromEnv('EMPTY_ROOM_TTL_MS', 120000), // ห้องไม่มีคนเหลือ ลบหลังเวลานี้ (เผื่อเชื่อมต่อกลับ)
    RATE_PER_SEC: numberFromEnv('RATE_PER_SEC', 20),
    FRIEND_TTL_MS: numberFromEnv('FRIEND_TTL_MS', 30000), // แคชรายชื่อเพื่อน (0 = ไม่แคช)
    PACK_MASTER: process.env.PACK_MASTER,
  };
}

module.exports = { readConfig };
