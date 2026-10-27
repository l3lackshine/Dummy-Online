'use strict';
/* packkeys.js — ส่งกุญแจถอดรหัสแพ็กแอสเซ็ตให้เกมตามสิทธิ์ผู้เล่น
   กุญแจไม่ถูกเก็บที่ไหนเลย: คำนวณจาก PACK_MASTER (ความลับเดียว ตั้งใน Render + GitHub Secrets) + ชื่อแพ็ก ด้วย HKDF
   แพ็กชื่อ 'base'      = ฟรี ทุกคนขอได้ (ตัวละครฟรี + ภาพตัวอย่างลายน้ำ)
   แพ็กชื่อ 'char-<id>' = ต้องล็อกอินและมีตัวละครนั้นในคลัง (inventory) จึงจะได้กุญแจ
   Public: deriveKey(master, packId) · route({ master, verifyToken, ownsItem }) → handler แบบ express (req, res)
   Extend: เพิ่มชนิดแพ็กใหม่ที่ policy() */
const crypto = require('crypto');
const deriveKey = (master, packId) => Buffer.from(crypto.hkdfSync('sha256', Buffer.from(String(master), 'utf8'), Buffer.from('dummy-pack-v1'), Buffer.from(String(packId)), 32));
// EXTEND: กฎของแพ็กแต่ละชนิด → คืน null (ฟรี) หรือ { kind, item } ที่ต้องมีในคลัง หรือ false (ไม่รู้จักแพ็ก)
function policy(packId) {
  if (packId === 'base') return null;
  const m = /^char-([a-z0-9][a-z0-9_-]{0,63})$/.exec(packId); if (m) return { kind: 'characters', item: m[1] };
  return false;
}
function route({ master, verifyToken, ownsItem, perMinute = 120 }) {
  const hits = new Map(); // จำกัดจำนวนคำขอต่อ IP ต่อนาที
  return async function packKey(req, res) {
    res.set('Cache-Control', 'no-store');
    if (!master || String(master).length < 16) return res.status(503).json({ error: 'pack keys not configured' });
    const ip = String((req.headers && (req.headers['x-forwarded-for'] || '')) || req.ip || '').split(',')[0].trim() || 'x', now = Date.now(), h = hits.get(ip) || [];
    const recent = h.filter(t => now - t < 60000); recent.push(now); hits.set(ip, recent); if (hits.size > 5000) hits.clear();
    if (recent.length > perMinute) return res.status(429).json({ error: 'too many requests' });
    const pack = String((req.query && req.query.pack) || ''), pol = policy(pack);
    if (pol === false) return res.status(404).json({ error: 'unknown pack' });
    if (pol) {
      const auth = String((req.headers && req.headers.authorization) || ''), token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const user = token ? await verifyToken(token) : null;
      if (!user) return res.status(401).json({ error: 'login required' });
      let owns = false; try { owns = await ownsItem(user.id, pol.kind, pol.item); } catch (e) { return res.status(503).json({ error: 'cannot verify ownership' }); }
      if (!owns) return res.status(403).json({ error: 'not owned' });
    }
    return res.json({ pack, key: deriveKey(master, pack).toString('base64') });
  };
}
module.exports = { deriveKey, route, policy };
