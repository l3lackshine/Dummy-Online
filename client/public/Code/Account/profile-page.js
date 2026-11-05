/* profile-page.js — หน้าโปรไฟล์ใหม่: รูป · ชื่อ · เลเวล · ฉายา · สถิติรวม · ช่องแก้ชื่อ/ฉายา
   เขียนทับ profileView() ของ Code/Account/profile.js (ไฟล์นี้ต้องโหลดทีหลัง)
   ช่องชื่อใช้ setNick/nickSave (Code/Account/nickname.js) · ฉายา: ล็อกอินแล้ว = เลือกจากฉายาที่ปลดล็อก (set_title · v15)
   ไม่ล็อกอิน = พิมพ์เองแบบเดิม (pfTitle ใน Code/Account/profile.js) · รูปโปรไฟล์ใช้กรอบจาก Code/AvatarFrame/
   Public: profileView() (ผ่าน window.profileView) · pvSetTitle(titleId) */
(function () {
  'use strict';
  const { escape, number, dbOn, lsGet, icon } = window.UiKit;

  const DEFAULT_RENAME_COST = 500; // แสดงเมื่อฐานข้อมูลไม่ได้ส่ง rename_cost มา

  function statsBox() {
    if (!dbOn()) {
      return `<div class=pv-stats><div><b>${number(sv.coins)}</b><small>เหรียญ</small></div><div><b>—</b><small>เล่นแล้ว</small></div><div><b>—</b><small>ชนะ</small></div><div><b>—</b><small>% ชนะ</small></div></div><p class=pv-mut>สถิติจะแสดงเมื่อเข้าสู่ระบบบัญชี</p>`;
    }
    const total = (DB.P.stats || []).reduce((sum, game) => ({ plays: sum.plays + game.plays, wins: sum.wins + game.wins }), {
      plays: 0,
      wins: 0,
    });
    const winRate = total.plays ? Math.round((total.wins / total.plays) * 100) : 0;
    return `<div class=pv-stats><div><b>${number(DB.P.coins)}</b><small>เหรียญ</small></div><div><b>${total.plays}</b><small>เล่นแล้ว</small></div><div><b>${total.wins}</b><small>ชนะ</small></div><div><b>${winRate}%</b><small>% ชนะ</small></div></div>`;
  }

  function levelBar() {
    const level = Progress.level();
    const percent = Math.min(100, Math.round((level.into / level.need) * 100));
    return `<div class=pv-lv><b>Lv.${level.level}</b><i><u style="width:${percent}%"></u></i><small>${number(level.into)}/${number(level.need)} EXP</small></div>`;
  }

  function renameNote() {
    if (!dbOn()) return '';
    const cost = DB.renameCost();
    return (
      ' · ' +
      (cost
        ? 'เปลี่ยนชื่อครั้งละ ' + number(cost) + ' 🪙'
        : 'เปลี่ยนครั้งแรกฟรี ครั้งต่อไป ' + number(DB.P.rename_cost || DEFAULT_RENAME_COST) + ' 🪙')
    );
  }

  function avatarHtml(character) {
    const face =
      typeof avFace === 'function' && character
        ? avFace(nick, character.id)
        : `<img src="${escape((character && character.asset) || '')}" alt="">`;
    return window.AvatarFrame ? AvatarFrame.wrap(face) : face;
  }

  // ---------- ฉายา: เลือกจากที่ปลดล็อกแล้ว ----------
  let unlockedTitles = null; // [{id, name, times}] จาก get_profile_card (โหลดครั้งแรกที่เปิดหน้า)
  let loadingTitles = false;

  async function loadTitles() {
    if (loadingTitles) return;
    loadingTitles = true;
    try {
      const card = await DB.call('get_profile_card', {});
      unlockedTitles = card.titles_all || [];
    } catch (e) {
      unlockedTitles = [];
    }
    loadingTitles = false;
    if (typeof screen !== 'undefined' && screen === 'profile') render();
  }

  function titleField(title) {
    if (!dbOn()) {
      return `<label class=pv-f><span>ฉายา</span><input id=titleInput maxlength=16 value="${escape(title)}" placeholder="เช่น ราชาน็อก" oninput="pfTitle(this.value)"><small>แสดงใต้ชื่อในห้องและหน้าสรุปผล</small></label>`;
    }
    if (!unlockedTitles) {
      loadTitles();
      return '<div class=pv-f><span>ฉายา</span><small>กำลังโหลดฉายาที่ปลดล็อก…</small></div>';
    }
    const selected = unlockedTitles.find(t => t.name === title);
    const options = unlockedTitles
      .map(t => `<option value="${escape(t.id)}"${selected && selected.id === t.id ? ' selected' : ''}>${escape(t.name)}</option>`)
      .join('');
    const note = unlockedTitles.length
      ? 'แสดงใต้ชื่อในห้องและหน้าสรุปผล · ปลดฉายาเพิ่มได้จากความสำเร็จและอันดับรายสัปดาห์'
      : 'ยังไม่มีฉายา — ปลดได้จากความสำเร็จ (ปุ่ม "สำเร็จ" หน้าแรก) และอันดับรายสัปดาห์';
    return `<label class=pv-f><span>ฉายา</span><select id=titleSelect class=pv-sel onchange="pvSetTitle(this.value)"><option value=""${selected ? '' : ' selected'}>— ไม่ติดฉายา —</option>${options}</select><small>${note}</small></label>`;
  }

  window.pvSetTitle = async titleId => {
    try {
      const result = await DB.call('set_title', { p_id: titleId || '' });
      DB.P.title = result.title;
      if (window.dbToast) dbToast(result.title ? 'ติดฉายา "' + result.title + '" แล้ว' : 'ถอดฉายาแล้ว');
      if (window.ProfileCard) ProfileCard.refresh();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'ตั้งฉายาไม่สำเร็จ');
    }
    render();
  };

  function profileView() {
    if (!document.querySelector('.pg[data-pg="pv"]')) unlockedTitles = null; // เพิ่งเข้าหน้านี้ → โหลดฉายาใหม่ (อาจเพิ่งปลดจากความสำเร็จ)
    const character = (SKIN_REGISTRY.characters || []).find(x => x.id === myChar());
    const title = (dbOn() ? DB.P.title : lsGet('dummyTitle', '')) || '';
    const username = dbOn() ? '@' + escape(DB.P.username) : 'เล่นแบบไม่ล็อกอิน';
    const saveButton = dbOn()
      ? `<button id=nickSave class=pv-nsave disabled onclick="event.preventDefault();nickSave()">บันทึกชื่อ</button>`
      : '';
    const body = `<div class=pv>
      <section class="pv-card pv-id">
        <div class=pv-av>${avatarHtml(character)}<button class=pv-avbtn onclick="invOpen('characters')">เปลี่ยน</button></div>
        <b class=pv-nm>${escape(nick)}</b>${window.Progress ? levelBar() : ''}<span class=pv-tt>${title ? escape(title) : 'ยังไม่ได้ตั้งฉายา'}</span><small class=pv-un>${username}</small>
        ${statsBox()}
      </section>
      <section class="pv-card pv-form">
        <h3 class=pv-h><i>${icon('user')}</i>ข้อมูลโปรไฟล์</h3>
        <label class=pv-f><span>ชื่อในเกม</span><span class=pv-nrow><input id=nickInput maxlength=14 value="${escape(nick)}" oninput="setNick(this.value)">${saveButton}</span><small>ไม่เกิน 14 ตัวอักษร${renameNote()}</small></label>
        ${titleField(title)}
        <div class=pv-f><span>รูปโปรไฟล์</span><button class=pv-link onclick="invOpen('characters')"><i>${icon('bag')}</i>เลือกจากตัวละครในช่องเก็บของ</button></div>
      </section>
      </div>`;
    page2('โปรไฟล์', body, 'home');
    const page = document.querySelector('.pg');
    if (page) page.dataset.pg = 'pv';
  }

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    window.profileView = profileView;
  }
  install();
})();
