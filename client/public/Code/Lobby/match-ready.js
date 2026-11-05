/* match-ready.js — หน้าต่างกดพร้อมเมื่อหาแมตช์ครบ (ใช้ทั้งแรงก์และหาแมตช์ธรรมดา) · ปุ่มเรียก matchAccept() ใน match-ui.js
   Public: gxReadyBox(M, ps) — เรียกจาก gxRoom() ใน lobby-room.js */
// หน้าต่างกดพร้อม (หาแมตช์ครบ 4 คน): รูปโปรไฟล์เล็กของทุกคน · ยังไม่กด = ขาวดำ · กดแล้ว = ภาพสี · ครบทุกคนเริ่มทันที
function gxReadyBox(M, ps) {
  const face = p => (typeof avFace === 'function' ? avFace(p.name, p.ch) : av(p.name, p.ch));
  const n = ps.filter(p => p.acc).length,
    left = Math.ceil((M.readyLeftMs || 0) / 1000),
    pct = Math.round(((M.readyLeftMs || 0) / (M.readyMs || 15000)) * 100);
  return `<div class=mm-modal><div class="mm-box mm-rd"><h3>${M.ranked ? '🏆 พบแมตช์แรงก์!' : '🎴 พบผู้เล่นครบแล้ว!'}</h3>
    <div class=mm-faces>${ps.map(p => `<span class="mm-face${p.acc ? ' on' : ''}${p.you ? ' me' : ''}"><i>${face(p)}</i><b>${esc(p.you ? 'คุณ' : p.name)}</b>${p.acc ? '<em>✓</em>' : ''}</span>`).join('')}</div>
    <div class=mm-rbar><i style="width:${pct}%"></i></div>
    <button class="mm-go${M.youAccepted ? ' done' : ''}" onclick="matchAccept()" ${M.youAccepted ? 'disabled' : ''}>${M.youAccepted ? `รอผู้เล่นอื่น… (${n}/${ps.length})` : '✋ พร้อม'}</button>
    <small>เหลือ <span class=mm-rl>${left}</span> วินาที · ทุกคนกดพร้อมแล้วเริ่มทันที · ไม่กดในเวลาจะถูกนำออกจากการค้นหา</small></div></div>`;
}
