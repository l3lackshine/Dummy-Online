/* pages2.js — หน้าโปรไฟล์ใหม่ (ตั้งค่าโปรไฟล์อย่างเดียว) + หน้าช่องเก็บของ (ตัวละคร หลังไพ่ โต๊ะ พื้นหลัง กรอบการ์ด ไอเทม)
   เขียนทับ profileView() ของ profile.js และเพิ่มหน้าจอ screen === 'inv' (เปิดด้วย invOpen(kind)) — ไม่แก้ app.js */
(function () {
  'use strict';
  const LS = window.localStorage;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const N = n => Number(n || 0).toLocaleString('en-US');
  const DBON = () => !!(window.DB && DB.enabled && DB.P);
  const get = (k, d) => { try { const v = LS.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const set = (k, v) => { try { LS.setItem(k, v); } catch (e) {} };
  const ICON = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 4.5-6 8-6s6.5 1.5 8 6"/>',
    news: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bag: '<path d="M3 9h18v11H3zM3 9l2-5h14l2 5M10 13h4"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    vib: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M12 9C9 9 7 4 9.5 4S12 9 12 9s.5-5 2.5-5S15 9 12 9"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

  /* ---------------- PROFILE: ตั้งค่าโปรไฟล์อย่างเดียว ---------------- */
  window.pvTog = k => { set(k, get(k, '1') === '1' ? '0' : '1'); render(); const m = document.querySelector('.set-modal .st-box'); if (m) m.innerHTML = settingsHtml(); };
  // ---------- ตั้งค่า (เปิดจากไอคอนเฟืองมุมบนขวา) ----------
  function settingsHtml() {
    return `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=pv-h><i>${ic('gear')}</i>ตั้งค่า</h3>
      ${tog('pvSfx', 'เสียงเอฟเฟกต์', 'sound', 'เสียงจั่ว ทิ้ง สับไพ่ และเอฟเฟกต์ตัวละคร')}
      <div class=pv-set><i>${ic('globe')}</i><span><b>ภาษา</b></span><em class=pv-val>ไทย</em></div>
      <div class=pv-set><i>${ic('news')}</i><span><b>มีอะไรใหม่</b><small>แพตช์โน้ตของแต่ละเวอร์ชัน · ${E(window.DUMMY_VERSION || '')}</small></span><button class="pv-btn blue sm" onclick="openPatchNotes()">เปิดดู</button></div>
      <div class=pv-acts>${DBON() ? `<button class="pv-btn blue" onclick="openDaily()">${ic('gift')}ล็อกอินรายวัน</button><button class="pv-btn gray" onclick="this.closest('.st-modal').remove();DB.signOut()">${ic('out')}ออกจากระบบ</button>` : ''}</div>
      <div class=set-foot>${DBON() ? `<button class=pv-del onclick="this.closest('.st-modal').remove();pvDelAsk()">ลบบัญชีถาวร</button>` : ''}<a class=pv-priv href="./privacy.html" target=_blank rel=noopener>นโยบายความเป็นส่วนตัว</a></div>`;
  }
  window.openSettings = () => {
    document.querySelectorAll('.set-modal').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'st-modal set-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="st-box set-box">${settingsHtml()}</div>`; document.body.appendChild(m);
  };
  const tog = (k, label, icon, note) => `<div class=pv-set><i>${ic(icon)}</i><span><b>${label}</b>${note ? `<small>${note}</small>` : ''}</span><button class="pv-sw${get(k, '1') === '1' ? ' on' : ''}" onclick="pvTog('${k}')" aria-pressed="${get(k, '1') === '1'}"><em></em></button></div>`;
  function statsBox() {
    if (!DBON()) return `<div class=pv-stats><div><b>${N(sv.coins)}</b><small>เหรียญ</small></div><div><b>—</b><small>เล่นแล้ว</small></div><div><b>—</b><small>ชนะ</small></div><div><b>—</b><small>% ชนะ</small></div></div><p class=pv-mut>สถิติจะแสดงเมื่อเข้าสู่ระบบบัญชี</p>`;
    const st = DB.P.stats || [], t = st.reduce((a, g) => ({ p: a.p + g.plays, w: a.w + g.wins }), { p: 0, w: 0 });
    return `<div class=pv-stats><div><b>${N(DB.P.coins)}</b><small>เหรียญ</small></div><div><b>${t.p}</b><small>เล่นแล้ว</small></div><div><b>${t.w}</b><small>ชนะ</small></div><div><b>${t.p ? Math.round(t.w / t.p * 100) : 0}%</b><small>% ชนะ</small></div></div>`;
  }
  function lvBar() { const L = Progress.level(), p = Math.min(100, Math.round(L.into / L.need * 100)); return `<div class=pv-lv><b>Lv.${L.level}</b><i><u style="width:${p}%"></u></i><small>${N(L.into)}/${N(L.need)} EXP</small></div>`; }
  function profileView() {
    const ch = (SKIN_REGISTRY.characters || []).find(x => x.id === myChar());
    const title = (DBON() ? DB.P.title : get('dummyTitle', '')) || '';
    const uname = DBON() ? '@' + E(DB.P.username) : 'เล่นแบบไม่ล็อกอิน';
    const body = `<div class=pv>
      <section class="pv-card pv-id">
        <div class=pv-av><img src="${E(ch && ch.asset || '')}" alt=""><button class=pv-avbtn onclick="invOpen('characters')">เปลี่ยน</button></div>
        <b class=pv-nm>${E(nick)}</b>${window.Progress ? lvBar() : ''}<span class=pv-tt>${title ? E(title) : 'ยังไม่ได้ตั้งฉายา'}</span><small class=pv-un>${uname}</small>
        ${statsBox()}
      </section>
      <section class="pv-card pv-form">
        <h3 class=pv-h><i>${ic('user')}</i>ข้อมูลโปรไฟล์</h3>
        <label class=pv-f><span>ชื่อในเกม</span><span class=pv-nrow><input id=nickInput maxlength=14 value="${E(nick)}" oninput="setNick(this.value)">${DBON() ? `<button id=nickSave class=pv-nsave disabled onclick="event.preventDefault();nickSave()">บันทึกชื่อ</button>` : ''}</span><small>ไม่เกิน 14 ตัวอักษร${DBON() ? ' · ' + (DB.renameCost() ? 'เปลี่ยนชื่อครั้งละ ' + N(DB.renameCost()) + ' 🪙' : 'เปลี่ยนครั้งแรกฟรี ครั้งต่อไป ' + N(DB.P.rename_cost || 500) + ' 🪙') : ''}</small></label>
        <label class=pv-f><span>ฉายา</span><input id=titleInput maxlength=16 value="${E(title)}" placeholder="เช่น ราชาน็อก" oninput="pfTitle(this.value)"><small>แสดงใต้ชื่อในห้องและหน้าสรุปผล</small></label>
        <div class=pv-f><span>รูปโปรไฟล์</span><button class=pv-link onclick="invOpen('characters')"><i>${ic('bag')}</i>เลือกจากตัวละครในช่องเก็บของ</button></div>
      </section>
      </div>`;
    page2('โปรไฟล์', body, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'pv';
  }

  /* ---------------- ลบบัญชี (หน้าต่างยืนยัน 2 ชั้น: อ่านผลที่จะเกิด → พิมพ์ชื่อผู้ใช้) ---------------- */
  window.pvDelAsk = () => {
    if (!DBON()) return; const un = DB.P.username, m = document.createElement('div'); m.className = 'pv-dm';
    m.innerHTML = `<div class=pv-dbox><h3>ลบบัญชีถาวร</h3>
      <p>บัญชี <b>@${E(un)}</b> และข้อมูลทั้งหมดจะถูกลบทันที <b>กู้คืนไม่ได้</b></p>
      <ul><li>เหรียญ เพชร และของในช่องเก็บของ</li><li>ตัวละคร ดาว และกรอบการ์ด</li><li>สถิติ ประวัติเกม ประวัติกาชา และเควส</li></ul>
      <label><span>พิมพ์ชื่อผู้ใช้ <b>${E(un)}</b> เพื่อยืนยัน</span><input id=pvDelIn autocomplete=off spellcheck=false></label><em class=pv-derr></em>
      <div class=pv-dacts><button class="pv-btn gray" onclick="this.closest('.pv-dm').remove()">ยกเลิก</button><button class="pv-btn red" id=pvDelGo disabled onclick="pvDelGo()">ลบบัญชี</button></div></div>`;
    document.body.appendChild(m); const i = m.querySelector('#pvDelIn'), go = m.querySelector('#pvDelGo');
    i.oninput = () => { go.disabled = i.value.trim().toLowerCase() !== String(un).toLowerCase(); }; i.focus();
  };
  window.pvDelGo = async () => {
    const m = document.querySelector('.pv-dm'), go = m && m.querySelector('#pvDelGo'), err = m && m.querySelector('.pv-derr'); if (!m) return;
    go.disabled = true; go.textContent = 'กำลังลบ…';
    try { await DB.deleteAccount(m.querySelector('#pvDelIn').value.trim()); m.remove(); if (window.dbToast) dbToast('ลบบัญชีเรียบร้อยแล้ว'); }
    catch (e) { err.textContent = (e && e.message) || 'ลบไม่สำเร็จ ลองใหม่อีกครั้ง'; go.disabled = false; go.textContent = 'ลบบัญชี'; }
  };

  /* ---------------- INVENTORY: ช่องเก็บของ ---------------- */
  const TABS = [['characters', 'ตัวละคร'], ['frames', 'กรอบการ์ด'], ['backs', 'หลังไพ่'], ['tables', 'โต๊ะ'], ['backgrounds', 'พื้นหลัง'], ['items', 'ไอเทม']];
  let invTab = 'characters'; const sel = {};
  window.invOpen = k => { invTab = k || invTab; go('inv'); };
  window.invTab = k => { invTab = k; render(); };
  window.invSel = (k, id) => { sel[k] = id; render(); };
  function cell(kind, x, cur, pick) {
    return `<button class="iv-cell${x.id === pick ? ' sel' : ''}${x.id === cur ? ' eq' : ''}" onclick="invSel('${kind}','${E(x.id)}')">${x.id === cur ? '<em>ใช้อยู่</em>' : ''}<span class=iv-pv>${prevBox(kind, x)}</span><b>${E(x.name || x.n || x.id)}</b></button>`;
  }
  function detail(kind, x, cur) {
    const big = kind === 'characters' && x.asset ? `<img class=iv-hero src="${E(x.asset)}" alt="">` : `<div class=iv-bigpv>${prevBox(kind, x)}</div>`;
    const btn = x.id === cur ? `<button class="pv-btn gray" disabled>✓ ใช้อยู่</button>` : `<button class="pv-btn green" onclick="equip('${kind}','${E(x.id)}')">เลือกใช้</button>`;
    const extra = kind === 'characters' && typeof skCharCard === 'function' ? `<div class="iv-sk${window.CharLv ? ' has-cl' : ''}">${window.CharLv ? CharLv.section(x.id) : ''}${skCharCard(x.id, { compact: true })}</div>` : '';
    return `<div class=iv-det><div class=iv-stage>${big}</div><div class=iv-info><b>${E(x.name || x.n || x.id)}</b>${extra}${btn}</div></div>`;
  }
  // ไอเทม: ชา (เติมสตามิน่า) · คัมภีร์ (อัปเลเวลตัวละคร) · ตัวซ้ำจากกาชา
  function itemsTab() {
    const items = window.Items && DBON() ? Items.list().filter(id => Items.qty(id) > 0) : [];
    const dupes = DBON() ? (DB.P.inventory || []).filter(i => i.kind === 'characters' && (Number(i.qty) || 0) > 1) : [];
    if (!items.length && !dupes.length) return `<div class=iv-empty><i>${ic('bag')}</i><b>ยังไม่มีไอเทม</b><small>${DBON() ? 'ชาและคัมภีร์ได้จากการเล่นกับบอท (โหมดฟาร์ม) และแบทเทิลพาส' : 'ล็อกอินเพื่อเก็บไอเทม'}</small><button class="pv-btn blue" onclick="bpOpen()">ไปแบทเทิลพาส</button></div>`;
    const pick = items.includes(sel.items) ? sel.items : items[0];
    const grid = items.map(id => { const it = Items.info(id);
      return `<button class="iv-cell${id === pick ? ' sel' : ''}" onclick="invSel('items','${id}')"><em class=iv-qty>×${Items.qty(id)}</em><span class=iv-pv>${Items.icon(id, 'iv-itic')}</span><b>${E(it.name)}</b></button>`; }).join('');
    const it = pick && Items.info(pick);
    const act = !it ? '' : it.stamina ? `<button class="pv-btn green" onclick="staminaUse('${pick}')">🍵 ดื่ม (+${it.stamina} สตามิน่า)</button>` : it.ticket ? `<button class="pv-btn blue" onclick="go('shop');setTimeout(()=>window.gcTab&&gcTab('pull'),0)">🎫 ไปสุ่มตู้ตัวละคร</button>` : `<button class="pv-btn blue" onclick="invTab('characters')">ใช้ที่หน้าตัวละคร</button>`;
    const det = it ? `<div class=iv-det><div class=iv-stage><div class=iv-bigpv>${Items.icon(pick, 'iv-itbig')}</div></div><div class=iv-info><b>${E(it.name)}</b><p class=iv-desc>${E(it.desc)} · มี ${Items.qty(pick)} ชิ้น</p>${act}</div></div>` : '';
    const dl = dupes.length ? `<small class=iv-dupes>ตัวซ้ำจากกาชา (ใช้อัปดาว): ${dupes.map(i => E(i.item_id) + ' ×' + (i.qty - 1)).join(' · ')}</small>` : '';
    return `<div class=iv-main><div class=iv-grid>${grid}${dl}</div>${det}</div>`;
  }
  function invView() {
    const tabs = `<nav class=iv-tabs>${TABS.map(([k, l]) => {
      const n = k === 'items' ? '' : (SKIN_REGISTRY[k] || []).filter(x => owned(k, x)).length;
      return `<button class="${invTab === k ? 'on' : ''}" onclick="invTab('${k}')">${l}${n !== '' ? `<small>${n}</small>` : ''}</button>`; }).join('')}</nav>`;
    let main;
    if (invTab === 'items') main = itemsTab();
    else {
      const list = (SKIN_REGISTRY[invTab] || []).filter(x => owned(invTab, x)), cur = equipped(invTab);
      const pick = list.find(x => x.id === sel[invTab]) ? sel[invTab] : cur;
      const x = list.find(y => y.id === pick) || list[0];
      main = `<div class=iv-main><div class=iv-grid>${list.map(y => cell(invTab, y, cur, x && x.id)).join('')}<button class="iv-cell iv-more" onclick="go('shop')"><span class=iv-pv>+</span><b>หาเพิ่มที่ร้านค้า</b></button></div>${x ? detail(invTab, x, cur) : ''}</div>`;
    }
    page2('ช่องเก็บของ', `<div class=iv>${tabs}${main}</div>`, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'iv';
  }

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    window.profileView = profileView;
    const _r = window.render;
    window.render = function () { if (typeof screen !== 'undefined' && screen === 'inv') { invView(); return; } return _r.apply(this, arguments); };
    // ปิดเสียงเอฟเฟกต์ตามตั้งค่า
    if (window.Assets && Assets.play && !Assets._pv) { const p = Assets.play; Assets.play = function () { if (get('pvSfx', '1') === '0') return; return p.apply(this, arguments); }; Assets._pv = 1; }
    // ข้อความในร้านค้าที่เคยบอกให้ไปหน้าโปรไฟล์
    setInterval(() => { const n = document.querySelector('[data-pg=shop] .note'); if (n && /โปรไฟล์/.test(n.textContent)) n.textContent = 'ซื้อแล้วของจะเข้าช่องเก็บของ — เลือกใช้ได้ที่นั่น'; }, 200);
  }
  install();
})();
