/* first-nickname.js — หน้าต่างตั้งชื่อในเกมครั้งแรก (บัญชีใหม่ที่เข้าด้วย Google ยังมีแค่ชื่ออัตโนมัติ u…)
   Core/db.js เปิดหน้าต่างนี้หลังล็อกอิน เมื่อ DB.needsNickname() เป็นจริง · การเปลี่ยนชื่อครั้งแรกฟรี (ฐานข้อมูลตัดสิน: update_profile)
   ปิดเองไม่ได้จนกว่าจะตั้งชื่อสำเร็จ — กันผู้เล่นเข้าโต๊ะด้วยชื่อ u… ที่คนอื่นอ่านไม่รู้เรื่อง (ออกจากระบบได้)
   Public: openFirstNickname() · fnSave() · fnSignOut()
   EXTEND: อยากให้กด "ข้ามไปก่อน" ได้ = เพิ่มปุ่มที่เรียก closeModal() ใน modalHtml() */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;

  const NAME_MAX_LENGTH = 14; // ต้องเท่ากับที่ฐานข้อมูลตัด (left(…, 14) ใน update_profile)
  const MODAL_CLASS = 'fn-modal';

  let saving = false;

  const findModal = () => document.querySelector('.' + MODAL_CLASS);
  const findInput = () => document.getElementById('fnName');

  function closeModal() {
    const modal = findModal();
    if (modal) modal.remove();
  }

  function showError(text) {
    const box = document.getElementById('fnErr');
    if (box) box.textContent = text || '';
  }

  function setSaving(isSaving) {
    saving = isSaving;
    const button = document.getElementById('fnGo');
    if (!button) return;
    button.disabled = isSaving;
    button.textContent = isSaving ? '⏳ กำลังบันทึก...' : '✔ ใช้ชื่อนี้';
  }

  // ตรวจในเครื่องก่อนเพื่อตอบเร็ว — ฐานข้อมูลตรวจซ้ำเสมอ (_bad_name)
  function checkName(name) {
    if (!name) return 'กรอกชื่อที่จะแสดงในเกม';
    if (window.NameFilter) return NameFilter.check(name) || '';
    return '';
  }

  window.fnSave = async () => {
    if (saving) return;
    const name = String((findInput() || {}).value || '')
      .trim()
      .slice(0, NAME_MAX_LENGTH);
    const problem = checkName(name);
    showError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await DB.saveName(name);
      if (typeof save === 'function') save(); // เก็บชื่อใหม่ลงข้อมูลในเครื่อง เหมือน nickSave()
      closeModal();
      if (window.dbToast) dbToast('ยินดีต้อนรับ ' + DB.P.display_name + '!');
    } catch (e) {
      showError(e.message || 'บันทึกชื่อไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
    setSaving(false);
  };

  window.fnSignOut = () => {
    closeModal();
    DB.signOut();
  };

  function modalHtml() {
    return `<div class=fn-box role=dialog aria-modal=true aria-labelledby=fnTitle>
        <h3 id=fnTitle>ตั้งชื่อในเกม</h3>
        <p>ชื่อนี้จะแสดงบนโต๊ะให้ผู้เล่นคนอื่นเห็น</p>
        <form onsubmit="fnSave();return false" novalidate>
          <input id=fnName maxlength=${NAME_MAX_LENGTH} placeholder="ชื่อเล่น (ไม่เกิน ${NAME_MAX_LENGTH} ตัว)" autocomplete=nickname spellcheck=false>
          <em id=fnErr class=fn-err role=alert></em>
          <button id=fnGo class=fn-go type=submit>✔ ใช้ชื่อนี้</button>
        </form>
        <small>ตั้งครั้งแรกฟรี · เปลี่ยนภายหลังได้ที่หน้าโปรไฟล์ (มีค่าเหรียญ)</small>
        <button type=button class=fn-out onclick="fnSignOut()">ออกจากระบบ</button>
      </div>`;
  }

  window.openFirstNickname = () => {
    if (findModal()) return;
    const modal = document.createElement('div');
    modal.className = MODAL_CLASS;
    modal.innerHTML = modalHtml();
    document.body.appendChild(modal);
    // จอสัมผัสไม่โฟกัสเอง (คีย์บอร์ดเด้งบังหน้าต่าง) — เหมือนหน้าล็อกอิน
    const input = findInput();
    if (input && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) input.focus();
  };
})();
