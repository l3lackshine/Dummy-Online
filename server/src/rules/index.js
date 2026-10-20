// ทะเบียนกฎเกม — เพิ่มกฎใหม่โดยสร้างโฟลเดอร์ใต้ rules/ แล้ว register ที่ท้ายไฟล์นี้ (ดูขั้นตอนใน rules/README.md)
const registry = new Map();
const REQUIRED_FNS = ['newGame', 'act', 'botTurn', 'view', 'winner'];

function register(mod) {
  const m = mod && mod.meta;
  if (!m || !/^[a-z0-9_-]+$/.test(m.id || '')) throw new Error('กฎต้องมี meta.id (a-z 0-9 _ -)');
  for (const f of REQUIRED_FNS) if (typeof mod[f] !== 'function') throw new Error('กฎ ' + m.id + ' ต้องมีฟังก์ชัน ' + f);
  if (registry.has(m.id)) throw new Error('กฎ ' + m.id + ' ลงทะเบียนซ้ำ');
  registry.set(m.id, mod);
}

register(require('./dummy'));
register(require('./pokdeng'));   // ป๊อกเด้ง
register(require('./gaogae'));    // เก้าเก
register(require('./somsip'));    // ผสมสิบ
register(require('./eekae'));     // อีแก่
// register(require('./hearts'));   ← กฎใหม่ในอนาคตเพิ่มตรงนี้

const DEFAULT = 'dummy';
const has = id => registry.has(id);
const get = id => registry.get(has(id) ? id : DEFAULT);
const list = () => [...registry.values()].map(m => m.meta);

// ตรวจ/ปัดค่าตัวเลือกจาก client ตามที่ meta.options ประกาศ — ค่าที่ไม่ถูกต้องใช้ค่าเริ่มต้น, ตัวเลขถูกบีบให้อยู่ในช่วง
function cleanOptions(id, raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}, out = {};
  for (const o of get(id).meta.options || []) {
    let v = src[o.key];
    if (o.type === 'number') {
      v = Number(v); if (!Number.isFinite(v)) v = o.default;
      v = Math.min(o.max, Math.max(o.min, v));
      if (o.step) v = o.min + Math.round((v - o.min) / o.step) * o.step;
    } else if (o.type === 'select') v = (o.choices || []).some(c => c.v === v) ? v : o.default;
    else v = o.default;
    out[o.key] = v;
  }
  return out;
}

module.exports = { register, has, get, list, cleanOptions, DEFAULT };
