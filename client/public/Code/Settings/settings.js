/* settings.js — หน้าต่างตั้งค่า (เปิดจากไอคอนเฟืองมุมบนขวา): เสียงเอฟเฟกต์ · ภาษา · แพตช์โน้ต · ล็อกอินรายวัน · ออกจากระบบ · ลบบัญชี · นโยบายความเป็นส่วนตัว
   ค่าเปิด/ปิดเก็บใน localStorage (pvSfx = เสียงเอฟเฟกต์)
   Public: openSettings() · pvTog(key) · pvLinkGoogle()
   EXTEND: ตัวเลือกเปิด/ปิดใหม่ = เพิ่มบรรทัด toggleRow(...) ใน settingsHtml() แล้วอ่านค่าด้วย UiKit.lsGet(key, '1') */
(function () {
  'use strict';
  const { escape, dbOn, lsGet, lsSet, icon } = window.UiKit;

  const isOn = key => lsGet(key, '1') === '1';

  const getSfxVol = () => Math.round(Number(lsGet('pvVolSfx', lsGet('pvVol', '0.8'))) * 100);
  const getBgmVol = () => Math.round(Number(lsGet('pvVolBgm', lsGet('pvVol', '0.8'))) * 100);

  const toggleRow = (key, label, iconName, note) =>
    `<div class=pv-set><i>${icon(iconName)}</i><span><b>${label}</b>${note ? `<small>${note}</small>` : ''}</span><button class="pv-sw${isOn(key) ? ' on' : ''}" onclick="pvTog('${key}')" aria-pressed="${isOn(key)}"><em></em></button></div>`;

  const volumeRow = (key, label, iconName, getFn, setFn, valId) => {
    const vol = getFn();
    return `<div class="pv-set pv-vol-row"><i>${icon(iconName)}</i><span><b>${label}</b><small id="${valId}">${vol}%</small></span><div class="pv-slider-wrap"><input type="range" class="pv-slider" min="0" max="100" value="${vol}" oninput="${setFn}(this.value)"></div></div>`;
  };

  function accountButtons() {
    if (!dbOn()) return '';
    return `<button class="pv-btn blue" onclick="openDaily()">${icon('gift')}ล็อกอินรายวัน</button><button class="pv-btn gray" onclick="this.closest('.st-modal').remove();DB.signOut()">${icon('out')}ออกจากระบบ</button>`;
  }

  // ผูก Google กับบัญชีนี้ (บัญชีเดิมแบบชื่อผู้ใช้/รหัสผ่าน) → ครั้งหน้ากด "เข้าสู่ระบบด้วย Google" ได้เลย · แสดงเฉพาะบนเว็บ
  function googleLinkRow() {
    if (!dbOn() || !DB.oauthAvailable || !DB.oauthAvailable()) return '';
    const action = DB.hasGoogle()
      ? '<em class=pv-val>ผูกแล้ว ✓</em>'
      : '<button class="pv-btn blue sm" onclick="pvLinkGoogle()">ผูกบัญชี</button>';
    return `<div class=pv-set><i>${icon('user')}</i><span><b>บัญชี Google</b><small>ผูกไว้เพื่อเข้าเกมด้วย Google ได้ทุกเครื่อง</small></span>${action}</div>`;
  }

  window.pvLinkGoogle = async () => {
    try {
      await DB.linkGoogle(); // สำเร็จ = เปลี่ยนไปหน้า Google แล้วกลับมาพร้อมข้อความ "ผูกบัญชี Google แล้ว"
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'ผูกบัญชี Google ไม่สำเร็จ');
    }
  };

  function settingsHtml() {
    const deleteButton = dbOn()
      ? `<button class=pv-del onclick="this.closest('.st-modal').remove();pvDelAsk()">ลบบัญชีถาวร</button>`
      : '';
    return `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=pv-h><i>${icon('gear')}</i>ตั้งค่า</h3>
      ${toggleRow('pvSfx', 'เสียงเอฟเฟกต์', 'sound', 'เสียงจั่ว ทิ้ง สับไพ่ และเอฟเฟกต์ตัวละคร')}
      ${volumeRow('sfx', 'ระดับเสียงเอฟเฟกต์', 'sound', getSfxVol, 'pvSetSfxVol', 'pvSfxVal')}
      ${toggleRow('pvBgm', 'เพลงพื้นหลัง (BGM)', 'music', 'เพลงบรรเลงในล็อบบี้และในโต๊ะเกม')}
      ${volumeRow('bgm', 'ระดับเสียงเพลง BGM', 'music', getBgmVol, 'pvSetBgmVol', 'pvBgmVal')}
      ${toggleRow('pvTalk', 'บทพูดตัวละคร', 'user', 'กรอบคำพูดของตัวละครบนโต๊ะ ตอนเกิดชุด น็อก ชนะ แพ้')}
      <div class=pv-set><i>${icon('globe')}</i><span><b>ภาษา</b></span><em class=pv-val>ไทย</em></div>
      <div class=pv-set><i>${icon('news')}</i><span><b>มีอะไรใหม่</b><small>แพตช์โน้ตของแต่ละเวอร์ชัน · ${escape(window.DUMMY_VERSION || '')}</small></span><button class="pv-btn blue sm" onclick="openPatchNotes()">เปิดดู</button></div>
      ${googleLinkRow()}
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
    // ปิดเสียงเพลงพื้นหลัง → หยุดเล่นทันที
    if (key === 'pvBgm' && !isOn('pvBgm') && window.Assets && Assets.stopMusic) Assets.stopMusic();
    render();
    const box = document.querySelector('.set-modal .st-box');
    if (box) box.innerHTML = settingsHtml();
  };

  window.pvSetSfxVol = v => {
    const fraction = Math.min(1, Math.max(0, Number(v) / 100));
    lsSet('pvVolSfx', String(fraction));
    if (window.Assets && Assets.setSfxVolume) {
      Assets.setSfxVolume(fraction);
    }
    const valEl = document.getElementById('pvSfxVal');
    if (valEl) valEl.textContent = Math.round(Number(v)) + '%';
  };

  window.pvSetBgmVol = v => {
    const fraction = Math.min(1, Math.max(0, Number(v) / 100));
    lsSet('pvVolBgm', String(fraction));
    if (window.Assets && Assets.setBgmVolume) {
      Assets.setBgmVolume(fraction);
    }
    const valEl = document.getElementById('pvBgmVal');
    if (valEl) valEl.textContent = Math.round(Number(v)) + '%';
  };

  // ปิดเสียงเอฟเฟกต์/เพลงตามตั้งค่า — ห่อ Assets.play และ Assets.playMusic ครั้งเดียว
  function muteEffectsWhenOff() {
    if (!window.Assets || !Assets.play || Assets._pv) return;
    const play = Assets.play;
    Assets.play = function () {
      if (!isOn('pvSfx')) return;
      return play.apply(this, arguments);
    };
    if (Assets.playMusic) {
      const playM = Assets.playMusic;
      Assets.playMusic = function () {
        if (!isOn('pvBgm')) { Assets.stopMusic(); return; }
        return playM.apply(this, arguments);
      };
    }
    Assets._pv = 1;
  }

  function install() {
    if (typeof render !== 'function') return setTimeout(install, 50);
    muteEffectsWhenOff();
  }
  install();
})();
