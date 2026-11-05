/* settings.js — หน้าต่างตั้งค่า (เปิดจากไอคอนเฟืองมุมบนขวา): เสียงเอฟเฟกต์ · ภาษา · แพตช์โน้ต · ล็อกอินรายวัน · ออกจากระบบ · ลบบัญชี · นโยบายความเป็นส่วนตัว
   ค่าเปิด/ปิดเก็บใน localStorage (pvSfx = เสียงเอฟเฟกต์)
   Public: openSettings() · pvTog(key)
   EXTEND: ตัวเลือกเปิด/ปิดใหม่ = เพิ่มบรรทัด toggleRow(...) ใน settingsHtml() แล้วอ่านค่าด้วย UiKit.lsGet(key, '1') */
(function () {
  'use strict';
  const { escape, dbOn, lsGet, lsSet, icon } = window.UiKit;

  const isOn = key => lsGet(key, '1') === '1';

  const toggleRow = (key, label, iconName, note) =>
    `<div class=pv-set><i>${icon(iconName)}</i><span><b>${label}</b>${note ? `<small>${note}</small>` : ''}</span><button class="pv-sw${isOn(key) ? ' on' : ''}" onclick="pvTog('${key}')" aria-pressed="${isOn(key)}"><em></em></button></div>`;

  function accountButtons() {
    if (!dbOn()) return '';
    return `<button class="pv-btn blue" onclick="openDaily()">${icon('gift')}ล็อกอินรายวัน</button><button class="pv-btn gray" onclick="this.closest('.st-modal').remove();DB.signOut()">${icon('out')}ออกจากระบบ</button>`;
  }

  function settingsHtml() {
    const deleteButton = dbOn()
      ? `<button class=pv-del onclick="this.closest('.st-modal').remove();pvDelAsk()">ลบบัญชีถาวร</button>`
      : '';
    return `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=pv-h><i>${icon('gear')}</i>ตั้งค่า</h3>
      ${toggleRow('pvSfx', 'เสียงเอฟเฟกต์', 'sound', 'เสียงจั่ว ทิ้ง สับไพ่ และเอฟเฟกต์ตัวละคร')}
      ${toggleRow('pvTalk', 'บทพูดตัวละคร', 'user', 'กรอบคำพูดของตัวละครบนโต๊ะ ตอนเกิดชุด น็อก ชนะ แพ้')}
      <div class=pv-set><i>${icon('globe')}</i><span><b>ภาษา</b></span><em class=pv-val>ไทย</em></div>
      <div class=pv-set><i>${icon('news')}</i><span><b>มีอะไรใหม่</b><small>แพตช์โน้ตของแต่ละเวอร์ชัน · ${escape(window.DUMMY_VERSION || '')}</small></span><button class="pv-btn blue sm" onclick="openPatchNotes()">เปิดดู</button></div>
      <div class=pv-acts>${accountButtons()}</div>
      <div class=set-foot>${deleteButton}<a class=pv-priv href="./privacy.html" target=_blank rel=noopener>นโยบายความเป็นส่วนตัว</a></div>`;
  }

  window.openSettings = () => {
    document.querySelectorAll('.set-modal').forEach(n => n.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal set-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box set-box">${settingsHtml()}</div>`;
    document.body.appendChild(modal);
  };

  window.pvTog = key => {
    lsSet(key, isOn(key) ? '0' : '1');
    render();
    const box = document.querySelector('.set-modal .st-box');
    if (box) box.innerHTML = settingsHtml();
  };

  // ปิดเสียงเอฟเฟกต์ตามตั้งค่า — ห่อ Assets.play ครั้งเดียว (Assets โหลดจาก Code/AssetPack/assetpack.js)
  function muteEffectsWhenOff() {
    if (!window.Assets || !Assets.play || Assets._pv) return;
    const play = Assets.play;
    Assets.play = function () {
      if (!isOn('pvSfx')) return;
      return play.apply(this, arguments);
    };
    Assets._pv = 1;
  }

  function install() {
    if (typeof render !== 'function') return setTimeout(install, 50);
    muteEffectsWhenOff();
  }
  install();
})();
