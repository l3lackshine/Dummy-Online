/* leave-confirm.js — หน้าต่างถาม "ออกจากห้อง?" แบบในเกม แทน confirm() ของเบราว์เซอร์
   ทำไม: confirm() ทำให้ Chrome มือถือหลุดโหมดเต็มจอทุกครั้ง และหน้าตาไม่เข้ากับธีมเกม
   ใช้กล่องหน้าต่างกลางของเกม (st-modal/st-box + pv-h + pv-btn) จึงได้กรอบซากุระจาก Theme/sakura-kit.css
   Public: askLeaveRoom() — ปุ่ม "ออก" ทุกหน้าเรียกตัวนี้ · closeLeaveConfirm() → true ถ้ามีหน้าต่างให้ปิด (ปุ่ม Back แอปใช้)
           leaveConfirmed() · ใช้ภายในปุ่มของหน้าต่าง
   EXTEND: อยากถามเรื่องอื่นแบบเดียวกัน = คัดลอกไฟล์นี้แล้วเปลี่ยนข้อความ/ฟังก์ชันที่ปุ่มยืนยันเรียก */
(function () {
  'use strict';
  const MODAL_CLASS = 'lc-modal';

  const findModal = () => document.querySelector('.' + MODAL_CLASS);

  function closeLeaveConfirm() {
    const modal = findModal();
    if (!modal) return false;
    modal.remove();
    document.removeEventListener('keydown', closeOnEscape);
    return true;
  }

  function closeOnEscape(event) {
    if (event.key === 'Escape') closeLeaveConfirm();
  }

  function modalHtml() {
    return `<div class="st-box lc-box" role=alertdialog aria-modal=true aria-labelledby=lcTitle>
        <h3 class=pv-h id=lcTitle>ออกจากห้อง?</h3>
        <div class=lc-acts>
          <button type=button class="pv-btn gray" onclick="closeLeaveConfirm()">ยกเลิก</button>
          <button type=button class="pv-btn blue" onclick="leaveConfirmed()">ออก</button>
        </div>
      </div>`;
  }

  function askLeaveRoom() {
    if (findModal()) return;
    const modal = document.createElement('div');
    modal.className = 'st-modal ' + MODAL_CLASS;
    modal.innerHTML = modalHtml();
    // แตะพื้นมืดนอกกล่อง = ยกเลิก (เหมือนกด "ยกเลิก")
    modal.addEventListener('click', event => {
      if (event.target === modal) closeLeaveConfirm();
    });
    document.body.appendChild(modal); // นอก #app — render() วาดทับ #app บ่อยระหว่างเล่น
    document.addEventListener('keydown', closeOnEscape);
  }

  function leaveConfirmed() {
    closeLeaveConfirm();
    if (typeof leave === 'function') leave();
  }

  window.askLeaveRoom = askLeaveRoom;
  window.closeLeaveConfirm = closeLeaveConfirm;
  window.leaveConfirmed = leaveConfirmed;
})();
