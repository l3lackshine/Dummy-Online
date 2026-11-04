/* login.js — หน้าเข้าสู่ระบบ / สมัครสมาชิก (โหมดบัญชีเท่านั้น — DB.enabled)
   ค่าที่พิมพ์ไว้คงอยู่เมื่อสลับแท็บ · วาดใหม่เฉพาะเมื่อสถานะเปลี่ยน (กันช่องที่กำลังพิมพ์หาย)
   Public: authView() · auMode(mode) · auReset() · auShow() · auSubmit(event) */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const escape = window.UiKit.escape;
  const $id = id => document.getElementById(id);

  let mode = 'login';
  let busy = false;
  let message = '';
  let values = { u: '', n: '' }; // ชื่อผู้ใช้ / ชื่อในเกม ที่พิมพ์ค้างไว้

  function readValues() {
    const username = $id('au_u');
    const nickname = $id('au_n');
    if (username) values.u = username.value;
    if (nickname) values.n = nickname.value;
  }

  window.auMode = nextMode => {
    readValues();
    mode = nextMode;
    message = '';
    paintAuth(true);
  };

  window.auReset = () => {
    mode = 'login';
    message = '';
    busy = false;
    values = { u: '', n: '' };
  };

  window.auShow = () => {
    const password = $id('au_p');
    const confirm = $id('au_p2');
    const type = password && password.type === 'password' ? 'text' : 'password';
    if (password) password.type = type;
    if (confirm) confirm.type = type;
  };

  function formError(username, password, confirm) {
    if (!username.trim() || !password) return 'กรอกชื่อผู้ใช้และรหัสผ่านให้ครบ';
    if (mode === 'register' && password !== confirm) return 'รหัสผ่านสองช่องไม่ตรงกัน';
    return '';
  }

  window.auSubmit = async event => {
    if (event && event.preventDefault) event.preventDefault();
    if (busy) return false;
    const username = ($id('au_u') || {}).value || '';
    const password = ($id('au_p') || {}).value || '';
    const nickname = ($id('au_n') || {}).value || '';
    const confirm = ($id('au_p2') || {}).value || '';
    values.u = username;
    values.n = nickname;
    message = formError(username, password, confirm);
    if (message) {
      paintAuth(true);
      return false;
    }
    busy = true;
    paintAuth(true);
    try {
      if (mode === 'register') await DB.signUp(username, password, nickname);
      else await DB.signIn(username, password);
      busy = false;
      message = '';
    } catch (e) {
      busy = false;
      message = e.message || 'เข้าสู่ระบบไม่สำเร็จ';
      paintAuth(true);
    }
    return false;
  };

  function formHtml() {
    const register = mode === 'register';
    const disabled = busy ? 'disabled' : '';
    return `
      <div class=au-tabs role=tablist><button type=button class="${register ? '' : 'on'}" onclick="auMode('login')">เข้าสู่ระบบ</button><button type=button class="${register ? 'on' : ''}" onclick="auMode('register')">สมัครสมาชิก</button></div>
      <form class=au-form onsubmit="return auSubmit(event)" autocomplete="on" novalidate>
        <label><span>ชื่อผู้ใช้</span><input id=au_u name=username value="${escape(values.u)}" maxlength=${register ? 20 : 60} placeholder="${register ? 'a-z 0-9 _ (3-20 ตัว)' : 'ชื่อผู้ใช้'}" autocomplete=username autocapitalize=none autocorrect=off spellcheck=false ${disabled}></label>
        ${register ? `<label><span>ชื่อที่แสดงในเกม</span><input id=au_n name=nickname value="${escape(values.n)}" maxlength=14 placeholder="ชื่อเล่น (ไม่เกิน 14 ตัว)" autocomplete=nickname ${disabled}></label>` : ''}
        <label><span>รหัสผ่าน</span><input id=au_p name=password type=password placeholder="${register ? 'อย่างน้อย 6 ตัวอักษร' : 'รหัสผ่าน'}" autocomplete="${register ? 'new-password' : 'current-password'}" ${disabled}></label>
        ${register ? `<label><span>ยืนยันรหัสผ่าน</span><input id=au_p2 name=password2 type=password placeholder="พิมพ์รหัสผ่านอีกครั้ง" autocomplete=new-password ${disabled}></label>` : ''}
        <label class=au-show><input type=checkbox onchange="auShow()"> แสดงรหัสผ่าน</label>
        <button class=au-go type=submit ${disabled}>${busy ? '⏳ กำลังดำเนินการ...' : register ? '🎁 สมัครสมาชิก' : '▶ เข้าสู่ระบบ'}</button>
        ${message ? `<p class=au-err role=alert>⚠️ ${escape(message)}</p>` : ''}
        <small class=au-hint>${register ? 'สมัครใหม่รับเหรียญเริ่มต้นไปเล่นได้ทันที · ข้อมูลเหรียญ ตัวละคร และเควสผูกกับบัญชี เล่นได้ทุกเครื่อง' : 'ยังไม่มีบัญชี? กด "สมัครสมาชิก" ด้านบน'}</small>
      </form>`;
  }

  function paintAuth(force) {
    const app = $id('app');
    if (!app) return;
    const signature = [mode, busy, message, DB.loading].join('|');
    if (!force && app.dataset.auSig === signature && $id('au_u')) return; // ไม่วาดทับช่องที่กำลังพิมพ์
    if (!DB.loading) readValues();
    app.dataset.auSig = signature;
    app.className = 'auth';
    const body = DB.loading ? '<p class=au-load>⏳ กำลังตรวจสอบบัญชี...</p>' : formHtml();
    app.innerHTML = `<div class=au-wrap><div class=au-card><div class=au-logo><span class=au-ic>🂡</span><b>ไพ่ดัมมี่</b><small>ออนไลน์</small></div>${body}</div><span class=au-ver>v${escape(window.DUMMY_VERSION || '')}</span></div>`;
    focusFirstField();
  }

  // จอสัมผัสไม่โฟกัสเอง (คีย์บอร์ดเด้งบังหน้า)
  function focusFirstField() {
    if (DB.loading || busy) return;
    const field = $id(values.u ? 'au_p' : 'au_u');
    if (field && window.matchMedia && !window.matchMedia('(pointer:coarse)').matches) field.focus();
  }

  window.authView = () => paintAuth(false);
})();
