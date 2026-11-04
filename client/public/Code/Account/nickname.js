/* nickname.js — ช่องตั้งชื่อเล่น: ตรวจชื่อหยาบ · โหมดบัญชีกดบันทึก (อาจเสียเหรียญ ยืนยันก่อน)
   Public: setNick(value) · nickSave() */
// ชื่อในเกม: ชื่อหยาบ/แอบอ้างทีมงานจะไม่ถูกบันทึก และขึ้นข้อความเตือนใต้ช่อง
function setNick(v) {
  const t = String(v || '')
      .trim()
      .slice(0, 14),
    bad = t && window.NameFilter ? NameFilter.check(t) : null;
  nickWarn(bad);
  if (bad) return;
  if (window.DB && DB.enabled && DB.P) {
    nickDraft = t;
    const b = document.getElementById('nickSave');
    if (b) b.disabled = !t || t === DB.P.display_name;
    return;
  }
  nick = t || 'ผู้เล่น';
  sv.name = nick;
  save();
}
let nickDraft = '';
async function nickSave() {
  const t = String(nickDraft || '').trim();
  if (!t || !window.DB || !DB.P || t === DB.P.display_name) return;
  const c = DB.renameCost();
  if (c > 0 && !confirmCost(c)) return;
  try {
    await DB.saveName(t);
    nick = DB.P.display_name;
    sv.name = nick;
    save();
    if (window.dbToast) dbToast(c > 0 ? 'เปลี่ยนชื่อแล้ว (−' + c + ' 🪙)' : 'เปลี่ยนชื่อแล้ว');
    render();
  } catch (e) {
    nickWarn(e.message);
  }
}
function confirmCost(c) {
  const b = document.getElementById('nickSave');
  if (b && b.dataset.ok === '1') return true;
  if (b) {
    b.dataset.ok = '1';
    b.textContent = 'ยืนยัน −' + c + ' 🪙';
    setTimeout(() => {
      if (b) {
        b.dataset.ok = '';
        b.textContent = 'บันทึกชื่อ';
      }
    }, 4000);
  }
  return false;
}
function nickWarn(m) {
  const i = document.getElementById('nickInput');
  if (!i) return;
  let w = i.parentNode.querySelector('.nk-warn');
  if (!m) {
    if (w) w.remove();
    i.classList.remove('nk-bad');
    return;
  }
  if (!w) {
    w = document.createElement('em');
    w.className = 'nk-warn';
    i.insertAdjacentElement('afterend', w);
  }
  w.textContent = m;
  i.classList.add('nk-bad');
}
