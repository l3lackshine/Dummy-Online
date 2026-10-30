// skills.js (ฝั่งเซิร์ฟเวอร์) — ตรวจสิทธิ์ที่เกี่ยวกับสกิลและของแต่ง
// สกิลส่วนใหญ่แค่ "แสดงข้อมูล" ในเครื่องผู้เล่น (ใช้ไพ่ในมือตัวเอง + สิ่งที่ทุกคนเห็นอยู่แล้ว) — เซิร์ฟเวอร์ไม่ต้องรู้
// ส่วนที่เป็น "คำสั่งทำแทน" (เช่น ฝากออโต้ในดัมมี่) เซิร์ฟเวอร์ต้องเช็กว่าตัวละครที่ใช้อยู่มีสกิลนั้นจริง
// ตารางนี้ต้องตรงกับ client/public/skin/skills.json (เทสต์ test-skills.js ตรวจให้) — เซิร์ฟเวอร์ไม่อ่านไฟล์ฝั่ง client เพราะ deploy แยกกันได้
const CHAR_SKILL = { boy: 'quickeye', girl: 'quickhand', 'rina-01': 'notebook', 'arya-01': 'danger', 'rena-01': 'planner' };
// คำสั่งเกมที่ต้องมีสกิล: rule → action.t → [skill ids ที่ใช้ได้]
const ACTION_SKILL = { dummy: { autodep: ['quickhand'] } };
// ของฟรีที่ทุกคนมี (ไม่ต้องเช็กคลัง)
const FREE = { characters: ['boy', 'girl'], frames: ['none'] };

const skillOf = ch => (ch && CHAR_SKILL[ch]) || null;
// คืนข้อความผิดพลาดถ้าคำสั่งนี้ต้องใช้สกิลที่ตัวละครไม่มี · null = ทำได้
function actionBlocked(rule, ch, t) {
  const need = (ACTION_SKILL[rule] || {})[t]; if (!need) return null;
  return need.includes(skillOf(ch)) ? null : 'ต้องใช้ตัวละครที่มีสกิล "มือไว" ถึงจะฝากออโต้ได้';
}
// ตรวจว่าผู้เล่นมีของจริง (โหมดบัญชี) · ไม่มี/ตรวจไม่ได้ = ไม่อนุญาต (fail closed)
async function verifyOwned(SB, uid, kind, id) {
  if (!id) return null;
  if ((FREE[kind] || []).includes(id)) return id;
  if (!SB || !SB.enabled() || !uid) return id;          // โหมดเล่นในเครื่อง (ไม่มีบัญชี) — ไม่มีคลังให้เช็ก
  try { return (await SB.ownsItem(uid, kind, id)) ? id : null; } catch (e) { return null; }
}
module.exports = { CHAR_SKILL, ACTION_SKILL, FREE, skillOf, actionBlocked, verifyOwned };
