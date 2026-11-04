// net/guards.js — ด่านกรองข้อมูลจาก client (ข้อมูลจาก client เชื่อไม่ได้เสมอ)
// - on(): ห่อ handler ทุกตัว — exception ที่ไม่ถูกดักจะทำให้โปรเซสล้มทั้งตัว
// - allow(): กันสแปมคำสั่งต่อ socket · obj(): payload ต้องเป็น object · cleanAction(): รับเฉพาะฟิลด์ที่ engine ใช้
// - withOwned(): โหมดบัญชี — ตรวจว่ามีตัวละคร/กรอบ/พื้นหลัง/ของปลดดาวจริงก่อนใช้ (ไม่มี = ค่าว่าง)
// Public: installGuards(ctx) → ctx.on · allow · obj · cleanAction · withOwned
const Skills = require('../skills');

const MAX_ACTION_IDS = 24; // ไพ่ที่ส่งมาในคำสั่งเดียวได้ไม่เกินนี้

const obj = data => (data && typeof data === 'object' && !Array.isArray(data) ? data : {});

function cleanAction(action) {
  if (!action || typeof action !== 'object') return null;
  const out = { t: String(action.t || '') };
  if (Array.isArray(action.ids)) out.ids = action.ids.slice(0, MAX_ACTION_IDS).map(Number);
  for (const key of ['i', 'k', 'id']) {
    if (action[key] != null) out[key] = Number(action[key]);
  }
  return out;
}

const on = (socket, eventName, handler) =>
  socket.on(eventName, (...args) => {
    try {
      handler(...args);
    } catch (e) {
      console.error('handler error:', eventName, e && e.message);
    }
  });

// fr === 'char' = ขอใช้กรอบประจำตัวละคร (ปลด 4★) → กลายเป็น 'ch-<ตัวละคร>' เมื่อดาวถึง
function perkFrame(character, frame, perks) {
  if (perks.cf && character) return 'ch-' + character;
  return frame === 'char' ? null : frame;
}

function installGuards(ctx) {
  const { config, SB } = ctx;

  function allow(socket) {
    const now = Date.now();
    const bucket = socket.data.bucket || (socket.data.bucket = { t: now, n: 0 });
    if (now - bucket.t >= 1000) {
      bucket.t = now;
      bucket.n = 0;
    }
    if (++bucket.n > config.RATE_PER_SEC) {
      socket.emit('system:error', 'ส่งคำสั่งเร็วเกินไป');
      return false;
    }
    return true;
  }

  function withOwned(socket, raw, handler) {
    const data = obj(raw);
    const claim = { s5: data.s5 === true, e2: data.e2 === true, cf: data.fr === 'char' };
    const uid = socket.data.uid;
    if (!(SB.enabled() && uid)) {
      // ไม่ใช้บัญชี: เชื่อตามที่ส่งมา (ของในเครื่องผู้เล่นเอง)
      const perks = { ...claim };
      return handler({ ...data, ...perks, fr: perkFrame(data.ch, data.fr, perks) });
    }
    // พื้นหลังแสดงในช่องที่นั่งให้ทุกคนเห็น → ต้องมีของจริงด้วย
    Promise.all([
      Skills.verifyOwned(SB, uid, 'characters', data.ch),
      data.fr === 'char' ? null : Skills.verifyOwned(SB, uid, 'frames', data.fr),
      Skills.verifyOwned(SB, uid, 'backgrounds', data.bg),
    ])
      .then(([ch, fr, bg]) => Skills.verifyStarPerks(SB, uid, ch, claim).then(perks => [ch, fr, bg, perks]))
      .then(([ch, fr, bg, perks]) => {
        try {
          handler({ ...data, ch, bg, fr: perkFrame(ch, fr, perks), s5: perks.s5, e2: perks.e2 });
        } catch (e) {
          console.error('handler error:', e && e.message);
        }
      })
      .catch(e => console.error('verifyOwned error:', e && e.message));
  }

  Object.assign(ctx, { on, allow, obj, cleanAction, withOwned });
}

module.exports = installGuards;
