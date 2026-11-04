/* delete-account.js — ลบบัญชีถาวร (หน้าต่างยืนยัน 2 ชั้น: อ่านผลที่จะเกิด → พิมพ์ชื่อผู้ใช้ให้ตรง)
   ฐานข้อมูลเป็นคนลบจริง (supabase/account_delete.sql → DB.deleteAccount)
   Public: pvDelAsk() · pvDelGo() */
(function () {
  'use strict';
  const { escape, dbOn } = window.UiKit;

  window.pvDelAsk = () => {
    if (!dbOn()) return;
    const username = DB.P.username;
    const modal = document.createElement('div');
    modal.className = 'pv-dm';
    modal.innerHTML = `<div class=pv-dbox><h3>ลบบัญชีถาวร</h3>
      <p>บัญชี <b>@${escape(username)}</b> และข้อมูลทั้งหมดจะถูกลบทันที <b>กู้คืนไม่ได้</b></p>
      <ul><li>เหรียญ เพชร และของในช่องเก็บของ</li><li>ตัวละคร ดาว และกรอบการ์ด</li><li>สถิติ ประวัติเกม ประวัติกาชา และเควส</li></ul>
      <label><span>พิมพ์ชื่อผู้ใช้ <b>${escape(username)}</b> เพื่อยืนยัน</span><input id=pvDelIn autocomplete=off spellcheck=false></label><em class=pv-derr></em>
      <div class=pv-dacts><button class="pv-btn gray" onclick="this.closest('.pv-dm').remove()">ยกเลิก</button><button class="pv-btn red" id=pvDelGo disabled onclick="pvDelGo()">ลบบัญชี</button></div></div>`;
    document.body.appendChild(modal);
    const input = modal.querySelector('#pvDelIn');
    const confirmButton = modal.querySelector('#pvDelGo');
    // กดลบได้เมื่อพิมพ์ชื่อผู้ใช้ตรงเท่านั้น
    input.oninput = () => {
      confirmButton.disabled = input.value.trim().toLowerCase() !== String(username).toLowerCase();
    };
    input.focus();
  };

  window.pvDelGo = async () => {
    const modal = document.querySelector('.pv-dm');
    if (!modal) return;
    const confirmButton = modal.querySelector('#pvDelGo');
    const errorText = modal.querySelector('.pv-derr');
    confirmButton.disabled = true;
    confirmButton.textContent = 'กำลังลบ…';
    try {
      await DB.deleteAccount(modal.querySelector('#pvDelIn').value.trim());
      modal.remove();
      if (window.dbToast) dbToast('ลบบัญชีเรียบร้อยแล้ว');
    } catch (e) {
      errorText.textContent = (e && e.message) || 'ลบไม่สำเร็จ ลองใหม่อีกครั้ง';
      confirmButton.disabled = false;
      confirmButton.textContent = 'ลบบัญชี';
    }
  };
})();
