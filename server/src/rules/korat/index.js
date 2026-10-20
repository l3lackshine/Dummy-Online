'use strict';
// Intentionally unavailable until the Korat-specific local rules are verified.
const meta = {
  id: 'korat', name: 'สมสิบโคราช', icon: '🂱', desc: 'รอกติกาสมสิบโคราชฉบับท้องถิ่นที่ยืนยันแล้วก่อนเปิดเล่น',
  minPlayers: 2, maxPlayers: 6, enabled: false, status: 'needs-rule-confirmation',
  options: [{ key: 'stake', label: 'เดิมพันต่อคน (เหรียญ)', type: 'number', default: 20, min: 1, max: 10000, step: 1, presets: [5, 10, 20, 50, 100] }],
  scoring: ['⚠️ ยังไม่เปิดเดิมพัน: ต้องยืนยันวิธีแจกไพ่ การจับคู่ การจั่ว/ทิ้ง และเงื่อนไขชนะของกติกาโคราชก่อน']
};
function unavailable() { throw new Error('กติกาสมสิบโคราชยังไม่เปิดให้เล่น เพราะต้องยืนยันกติกาท้องถิ่นก่อน'); }
module.exports = { meta, newGame: unavailable, act: unavailable, botTurn: unavailable, view: unavailable, winner: () => null };
