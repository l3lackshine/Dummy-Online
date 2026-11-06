/* admin.js — หน้าแอดมินในเกม: อีเวนต์ (เพิ่ม/แก้/ลบ + เควสอีเวนต์ + ผูกตู้กาชา) · เควสรายวัน/รายสัปดาห์ · ตู้กาชา · จดหมายแจกของ · ค้นผู้เล่น/เปลี่ยนชื่อ · รายชื่อแอดมิน
   ทุกคำสั่งผ่านฟังก์ชัน admin_* ในฐานข้อมูล (supabase/v17_events_admin.sql · v18_admin_tools.sql) ซึ่งตรวจสิทธิ์และตรวจข้อมูลเอง — ไฟล์นี้เป็นแค่ฟอร์ม
   ปุ่มเข้าหน้านี้ขึ้นเฉพาะบัญชีที่เป็นแอดมิน (Admin.isAdmin() ถาม is_admin จากฐานข้อมูล) · คนอื่นเรียก adminOpen() ก็แก้อะไรไม่ได้
   Public: adminOpen() · adTab(tab) · adEditEvent(id) · adEditEventQuest(eventId, questId) · adEditQuest(id) · adSave() · adCancel()
           adDelete(type, id) · adExpand(eventId) · adMetric(select) · adAddAdmin() · adRemoveAdmin(username) · Admin.isAdmin()
           adEditBanner(id) · adPay(select) · adRateSum() · adNewMail() · adFindPlayer() · adRename(username)
   EXTEND: ชนิดเควสใหม่ = เพิ่มใน METRICS (และใน SQL _quest_metric_ok / _window_progress) · แท็บใหม่ = เพิ่มใน TABS + ฟังก์ชันวาดแท็บ */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const TABS = [
    ['events', '🎉 อีเวนต์'],
    ['quests', '📜 เควสปกติ'],
    ['gacha', '🎰 ตู้กาชา'],
    ['mail', '📮 จดหมาย'],
    ['players', '👤 ผู้เล่น'],
    ['admins', '🛡️ แอดมิน'],
  ];
  const METRICS = [
    ['play', 'เล่นจบ (ตา)'],
    ['win', 'ชนะ (ตา)'],
    ['coins', 'เหรียญที่ได้จากการเล่น'],
    ['login', 'ล็อกอิน (วัน)'],
    ['days', 'วันที่ได้เล่น'],
    ['rules', 'เล่นหลายเกม (ชนิด)'],
    ['melds', 'เกิดชุด (ดัมมี่)'],
    ['knock', 'น็อก (ดัมมี่)'],
    ['feat', 'ท่าพิเศษ'],
  ];
  // ใช้เมื่อยังไม่ได้ต่อเซิร์ฟเวอร์ (RULES ว่าง) — สะกดตาม Code/Profile/profile-card.js
  const GAME_NAMES = { dummy: 'ดัมมี่', pokdeng: 'ป๊อกเด้ง', gaogae: 'เก้าเก', somsip: 'ผสมสิบ', eekae: 'อีแก่' };
  const ITEM_ROWS = 4; // ช่องรางวัลไอเทมต่อเควส
  const MAIL_DAYS_DEFAULT = 30; // อายุจดหมายตั้งต้น (แอดมินแก้ได้ 1–365 วัน)
  const RATE_UP_DEFAULT = 2; // ตัวคูณเรทอัปตั้งต้นของตู้ใหม่ (แอดมินแก้ได้ 1–20 · ฐานข้อมูลตรวจเพดาน)
  // ใช้เมื่อหาชื่อชนิดใน KINDS (Core/skins.js) ไม่เจอ
  const KIND_NAMES = { characters: 'ตัวละคร', backs: 'หลังไพ่', tables: 'ผ้าปูโต๊ะ', backgrounds: 'พื้นหลัง', frames: 'กรอบการ์ด' };

  let adminChecked = null; // id ผู้ใช้ที่ถามสิทธิ์ไปแล้ว
  let adminYes = false;
  let overview = null; // ผลจาก admin_overview
  let gachaData = null; // ผลจาก admin_gacha_data (โหลดเมื่อเปิดแท็บตู้กาชา)
  let sentMails = null; // ผลจาก admin_list_mail (โหลดเมื่อเปิดแท็บจดหมาย)
  let playerQuery = '';
  let foundPlayers = null; // ผลจาก admin_find_player (null = ยังไม่ได้ค้น)
  let failMessage = '';
  let tab = 'events';
  let form = null; // { type: 'event' | 'event_quest' | 'quest' | 'banner' | 'mail' | 'rename', data }
  let expandedEvent = '';
  let busy = false;
  let featOptions = []; // [{ feat, label }] จาก skin/achievements.json

  fetch('./skin/achievements.json')
    .then(r => (r.ok ? r.json() : null))
    .then(readFeatOptions)
    .catch(() => {});

  function readFeatOptions(json) {
    if (!json || !Array.isArray(json.list)) return;
    const seen = {};
    json.list
      .filter(row => row.metric === 'feat' && row.feat)
      .forEach(row => {
        const key = (row.game || '') + ':' + row.feat;
        if (seen[key]) return;
        seen[key] = true;
        featOptions.push({ feat: row.feat, label: (GAME_NAMES[row.game] || 'ทุกเกม') + ' · ' + row.name });
      });
  }

  // ---------- สิทธิ์ ----------
  function currentUserId() {
    return window.DB && DB.user ? DB.user.id : '';
  }

  async function checkAdmin() {
    const userId = currentUserId();
    adminChecked = userId;
    try {
      adminYes = !!(await DB.call('is_admin', {}));
    } catch (e) {
      adminYes = false; // ฐานข้อมูลยังไม่มี v17
    }
    if (adminYes && typeof render === 'function' && typeof screen !== 'undefined' && screen === 'home') render();
  }

  function isAdmin() {
    if (!dbOn()) return false;
    if (adminChecked !== currentUserId()) checkAdmin(); // ถามครั้งเดียวต่อบัญชี (เปลี่ยนบัญชีแล้วถามใหม่)
    return adminYes;
  }

  // ---------- ตัวช่วยข้อความ/วันที่ ----------
  function gameOptions(selected) {
    const rules = typeof RULES !== 'undefined' && RULES.length ? RULES.map(r => [r.id, r.name]) : Object.entries(GAME_NAMES);
    const all = [['', 'ทุกเกม']].concat(rules);
    return all.map(([id, name]) => `<option value="${escape(id)}"${id === (selected || '') ? ' selected' : ''}>${escape(name)}</option>`).join('');
  }

  function itemLabel(itemId) {
    const info = window.Economy && Economy.ITEMS ? Economy.ITEMS[itemId] : null;
    return info && info.name ? `${info.name} (${itemId})` : itemId;
  }

  // ฐานข้อมูลเก็บเวลาเป็น ISO · ช่อง datetime-local ต้องการ "YYYY-MM-DDTHH:mm" ตามเวลาเครื่อง
  function toLocalInput(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function fromLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date) ? '' : date.toISOString();
  }

  function dateText(iso) {
    return new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function eventStatus(event) {
    if (!event.active) return ['off', 'ปิดอยู่'];
    if (event.running) return ['on', 'กำลังจัด'];
    if (new Date(event.starts_at) > Date.now()) return ['soon', 'ยังไม่เริ่ม'];
    return ['end', 'จบแล้ว'];
  }

  function rewardSummary(quest) {
    const parts = [];
    if (quest.reward_coins) parts.push('🪙' + number(quest.reward_coins));
    if (quest.reward_mcash) parts.push('💎' + number(quest.reward_mcash));
    if (quest.reward_bp) parts.push('พาส ' + number(quest.reward_bp));
    Object.keys(quest.reward_items || {}).forEach(id => parts.push(itemLabel(id) + ' ×' + quest.reward_items[id]));
    return parts.join(' · ') || 'ไม่มีรางวัล';
  }

  // ---------- ช่องฟอร์ม ----------
  function field(label, inner, wide) {
    return `<label class="ad-f${wide ? ' wide' : ''}"><span>${label}</span>${inner}</label>`;
  }

  function textInput(name, value, extra) {
    return `<input name="${name}" value="${escape(value == null ? '' : value)}" ${extra || ''}>`;
  }

  function numberInput(name, value) {
    return `<input name="${name}" type="number" inputmode="numeric" value="${escape(value == null ? '' : value)}">`;
  }

  function checkbox(name, checked, label) {
    return `<label class=ad-ck><input type=checkbox name="${name}"${checked ? ' checked' : ''}> ${label}</label>`;
  }

  function metricSelect(selected) {
    const options = METRICS.map(([id, name]) => `<option value="${id}"${id === selected ? ' selected' : ''}>${name}</option>`).join('');
    return `<select name=metric onchange="adMetric(this)">${options}</select>`;
  }

  function featField(data) {
    const list = featOptions.map(o => `<option value="${escape(o.feat)}">${escape(o.label)}</option>`).join('');
    const hidden = data.metric === 'feat' ? '' : ' style="display:none"';
    return `<div class=ad-feat${hidden}>${field('ชื่อท่าพิเศษ', textInput('feat', data.feat, 'list=ad-feats placeholder="เช่น knock_dark"'))}
      <datalist id=ad-feats>${list}</datalist></div>`;
  }

  function itemRowsHtml(items) {
    const entries = Object.entries(items || {});
    const choices = (overview.items || []).map(id => [id, itemLabel(id)]);
    let html = '';
    for (let row = 0; row < ITEM_ROWS; row++) {
      const [itemId, qty] = entries[row] || ['', ''];
      const options = [['', '— ไม่ให้ไอเทม —']].concat(choices)
        .map(([id, name]) => `<option value="${escape(id)}"${id === itemId ? ' selected' : ''}>${escape(name)}</option>`)
        .join('');
      html += `<div class=ad-item><select name="item_id_${row}">${options}</select>${numberInput('item_qty_' + row, qty)}</div>`;
    }
    return `<div class="ad-f wide"><span>ไอเทม (เลือกของ + จำนวน)</span>${html}</div>`;
  }

  // ช่องที่เควสอีเวนต์และเควสปกติใช้ร่วมกัน
  function questFieldsHtml(data) {
    return [
      field('ชื่อเควส', textInput('name', data.name, 'maxlength=40')),
      field('ไอคอน (อีโมจิ)', textInput('icon', data.icon || '🎉', 'maxlength=8')),
      field('คำอธิบาย', textInput('description', data.description, 'maxlength=120'), true),
      field('ชนิด', metricSelect(data.metric || 'play')),
      field('เกม', `<select name=game_id>${gameOptions(data.game_id)}</select>`),
      featField(data),
      field('เป้าหมาย', numberInput('target', data.target || 1)),
      field('รางวัลเหรียญ', numberInput('reward_coins', data.reward_coins || 0)),
      field('รางวัลเพชร', numberInput('reward_mcash', data.reward_mcash || 0)),
      field('EXP แบทเทิลพาส', numberInput('reward_bp', data.reward_bp || 0)),
      field('ลำดับ', numberInput('sort', data.sort || 0)),
    ].join('');
  }

  function idField(data) {
    const editing = !!data.id;
    const hint = editing ? 'readonly' : 'placeholder="เว้นว่าง = สร้างให้" maxlength=40';
    return field('รหัส', textInput('id', data.id, hint));
  }

  // ---------- ฟอร์มแต่ละแบบ ----------
  function eventFormHtml(data) {
    const banners = (overview.banners || [])
      .map(b => checkbox('banner:' + b.id, (data.banner_ids || []).includes(b.id), escape(b.name) + (b.active ? '' : ' (ปิดอยู่)')))
      .join('');
    const preview = data.banner_url ? `<img class=ad-prev src="${escape(data.banner_url)}" alt="">` : '';
    return `<h4>${data.id ? 'แก้อีเวนต์' : 'สร้างอีเวนต์'}</h4>
      <div class=ad-grid>
        ${idField(data)}
        ${field('ชื่ออีเวนต์', textInput('name', data.name, 'maxlength=60'))}
        ${field('คำอธิบาย', `<textarea name=description maxlength=500 rows=3>${escape(data.description || '')}</textarea>`, true)}
        ${field('ลิงก์รูปแบนเนอร์ (https://… หรือ ./Assets/…)', textInput('banner_url', data.banner_url, 'maxlength=500'), true)}
        ${preview ? `<div class="ad-f wide">${preview}</div>` : ''}
        ${field('เริ่ม', `<input type=datetime-local name=starts_at value="${escape(toLocalInput(data.starts_at))}">`)}
        ${field('จบ', `<input type=datetime-local name=ends_at value="${escape(toLocalInput(data.ends_at))}">`)}
        ${field('ลำดับ', numberInput('sort', data.sort || 0))}
        <div class="ad-f">${checkbox('active', data.active !== false, 'เปิดใช้')}</div>
        <div class="ad-f wide"><span>ตู้กาชาที่เปิดเฉพาะช่วงอีเวนต์นี้</span><div class=ad-cks>${banners || 'ยังไม่มีตู้'}</div></div>
      </div>`;
  }

  function eventQuestFormHtml(data) {
    const mode = data.mode || 'event';
    const modeSelect = `<select name=mode>
      <option value=event${mode === 'event' ? ' selected' : ''}>นับตลอดอีเวนต์ (รับครั้งเดียว)</option>
      <option value=daily${mode === 'daily' ? ' selected' : ''}>รีเซ็ตทุกวัน</option></select>`;
    return `<h4>${data.id ? 'แก้เควสอีเวนต์' : 'เพิ่มเควสอีเวนต์'}</h4>
      <div class=ad-grid>${idField(data)}${field('แบบ', modeSelect)}${questFieldsHtml(data)}${itemRowsHtml(data.reward_items)}</div>`;
  }

  function questFormHtml(data) {
    const period = data.period || 'daily';
    const periodSelect = `<select name=period>
      <option value=daily${period === 'daily' ? ' selected' : ''}>รายวัน</option>
      <option value=weekly${period === 'weekly' ? ' selected' : ''}>รายสัปดาห์</option></select>`;
    return `<h4>${data.id ? 'แก้เควสปกติ' : 'เพิ่มเควสปกติ'}</h4>
      <div class=ad-grid>${idField(data)}${field('รอบ', periodSelect)}${questFieldsHtml(data)}
        <div class="ad-f wide">${checkbox('always', !!data.always, 'ขึ้นทุกรอบ (ไม่สุ่ม)')} ${checkbox('active', data.active !== false, 'เปิดใช้')}</div>
      </div>`;
  }

  const FORM_BUILDERS = { event: eventFormHtml, event_quest: eventQuestFormHtml, quest: questFormHtml, banner: bannerFormHtml, mail: mailFormHtml, rename: renameFormHtml };

  function formHtml() {
    const body = FORM_BUILDERS[form.type](form.data);
    return `<form class=ad-form onsubmit="adSave();return false">${body}
      <div class=ad-btns><button type=submit class="wbtn go"${busy ? ' disabled' : ''}>💾 บันทึก</button>
      <button type=button class=wbtn onclick="adCancel()">ยกเลิก</button></div></form>`;
  }

  // ---------- แท็บอีเวนต์ ----------
  function eventQuestRowHtml(quest) {
    const metric = (METRICS.find(m => m[0] === quest.metric) || [quest.metric, quest.metric])[1];
    const mode = quest.mode === 'daily' ? 'รายวัน' : 'ทั้งอีเวนต์';
    return `<div class=ad-row>
      <span>${escape(quest.icon)} <b>${escape(quest.name)}</b><small>${mode} · ${escape(metric)} ${number(quest.target)} · ${escape(rewardSummary(quest))}</small></span>
      <button class=wbtn onclick="adEditEventQuest('${escape(quest.event_id)}','${escape(quest.id)}')">แก้</button>
      <button class="wbtn ad-del" onclick="adDelete('event_quest','${escape(quest.id)}')">ลบ</button>
    </div>`;
  }

  function eventRowHtml(event) {
    const [statusClass, statusText] = eventStatus(event);
    const open = expandedEvent === event.id;
    const quests = (overview.event_quests || []).filter(q => q.event_id === event.id);
    const questList = open
      ? `<div class=ad-sub>${quests.map(eventQuestRowHtml).join('') || '<p class=ad-mut>ยังไม่มีเควส</p>'}
          <button class="wbtn go" onclick="adEditEventQuest('${escape(event.id)}','')">＋ เพิ่มเควส</button></div>`
      : '';
    return `<div class="ad-ev${open ? ' open' : ''}">
      <div class=ad-row>
        <span onclick="adExpand('${escape(event.id)}')"><b>${escape(event.name)}</b><em class="ad-st ${statusClass}">${statusText}</em>
          <small>${escape(dateText(event.starts_at))} – ${escape(dateText(event.ends_at))} · เควส ${quests.length} · ${open ? '▴' : '▾'}</small></span>
        <button class=wbtn onclick="adEditEvent('${escape(event.id)}')">แก้</button>
        <button class="wbtn ad-del" onclick="adDelete('event','${escape(event.id)}')">ลบ</button>
      </div>${questList}
    </div>`;
  }

  function eventsTabHtml() {
    const rows = (overview.events || []).map(eventRowHtml).join('') || '<p class=ad-mut>ยังไม่มีอีเวนต์</p>';
    return `<button class="wbtn go" onclick="adEditEvent('')">＋ สร้างอีเวนต์</button><div class=ad-list>${rows}</div>`;
  }

  // ---------- แท็บเควสปกติ ----------
  function questRowHtml(quest) {
    const flags = [quest.period === 'daily' ? 'รายวัน' : 'รายสัปดาห์', quest.always ? 'ขึ้นทุกรอบ' : 'สุ่ม'];
    if (!quest.active) flags.push('ปิดอยู่');
    return `<div class="ad-row${quest.active ? '' : ' off'}">
      <span>${escape(quest.icon)} <b>${escape(quest.name)}</b><small>${flags.join(' · ')} · เป้า ${number(quest.target)} · ${escape(rewardSummary(quest))}</small></span>
      <button class=wbtn onclick="adEditQuest('${escape(quest.id)}')">แก้</button>
      <button class="wbtn ad-del" onclick="adDelete('quest','${escape(quest.id)}')">ลบ</button>
    </div>`;
  }

  function questsTabHtml() {
    const rows = (overview.quests || []).map(questRowHtml).join('') || '<p class=ad-mut>ยังไม่มีเควส</p>';
    const note = '<p class=ad-mut>เควสรายวัน/สัปดาห์ถูกสุ่มขึ้นตามจำนวนที่ตั้งไว้ในเกม · "ขึ้นทุกรอบ" = ขึ้นเสมอนอกเหนือจากที่สุ่ม · ปิดใช้แทนการลบได้</p>';
    return `<button class="wbtn go" onclick="adEditQuest('')">＋ เพิ่มเควส</button>${note}<div class=ad-list>${rows}</div>`;
  }

  // ---------- แท็บตู้กาชา ----------
  // โอกาสในฐานข้อมูลเก็บหน่วย 0.01% (รวม 10,000) · ฟอร์มแสดงเป็น %
  function unitsToPercent(units) {
    return Math.round(Number(units || 0)) / 100;
  }

  function kindName(kind) {
    const found = (typeof KINDS !== 'undefined' ? KINDS : []).find(k => k[0] === kind);
    return found ? found[1] : KIND_NAMES[kind] || kind;
  }

  function rarityName(rarity) {
    const found = (gachaData.rarities || []).find(r => r.rarity === rarity);
    return found ? found.name : rarity;
  }

  function rateSummary(banner) {
    const rates = banner.admin_owned ? (banner.admin_cfg || {}).rates || {} : banner.rates || {};
    const parts = (gachaData.rarities || [])
      .filter(r => Number(rates[r.rarity]) > 0)
      .map(r => `${r.name} ${unitsToPercent(rates[r.rarity])}%`);
    return parts.join(' · ') || 'ยังไม่มีของ';
  }

  function priceSummary(banner) {
    if (banner.ticket) return `${itemLabel(banner.ticket)} · ขาดตั๋วใช้ 💎${number(banner.ticket_mcash || 0)}`;
    const parts = [];
    if (banner.single_coins) parts.push('🪙' + number(banner.single_coins) + '/1');
    if (banner.ten_coins) parts.push('🪙' + number(banner.ten_coins) + '/10');
    if (banner.single_mcash) parts.push('💎' + number(banner.single_mcash) + '/1');
    if (banner.ten_mcash) parts.push('💎' + number(banner.ten_mcash) + '/10');
    return parts.join(' ') || 'ยังไม่ตั้งราคา';
  }

  function bannerRowHtml(banner) {
    const owner = banner.admin_owned ? '<em class="ad-st on">แอดมินดูแล</em>' : '<em class="ad-st soon">จากไฟล์</em>';
    const state = banner.active ? '' : '<em class="ad-st off">ปิดอยู่</em>';
    const events = (banner.events || []).length ? ' · อีเวนต์: ' + banner.events.join(', ') : '';
    const deleteButton = banner.admin_owned
      ? `<button class="wbtn ad-del" onclick="adDelete('banner','${escape(banner.id)}')">ลบ</button>`
      : '<span></span>';
    return `<div class="ad-row${banner.active ? '' : ' off'}">
      <span><b>${escape(banner.name)}</b>${owner}${state}
        <small>${escape(rateSummary(banner))} · ${escape(priceSummary(banner))}${banner.pity ? ' · การันตี ' + banner.pity : ''}${escape(events)}</small></span>
      <button class=wbtn onclick="adEditBanner('${escape(banner.id)}')">แก้</button>${deleteButton}
    </div>`;
  }

  function gachaTabHtml() {
    if (!gachaData) return '<p class=ad-mut>กำลังโหลดตู้กาชา…</p>';
    const rows = (gachaData.banners || []).map(bannerRowHtml).join('') || '<p class=ad-mut>ยังไม่มีตู้</p>';
    const note = '<p class=ad-mut>ตู้ "จากไฟล์" มาจาก Assets/Shop/Gasha · กดแก้แล้วบันทึก = ย้ายมาให้แอดมินดูแล · ตู้ที่ผูกอีเวนต์จะเปิดเฉพาะช่วงอีเวนต์</p>';
    return `<button class="wbtn go" onclick="adEditBanner('')">＋ สร้างตู้</button>${note}<div class=ad-list>${rows}</div>`;
  }

  // ค่าเริ่มของฟอร์ม: ตู้แอดมินอ่านจาก admin_cfg · ตู้จากไฟล์อ่านจากของในตู้ตอนนี้ · ตู้ใหม่เริ่มว่าง
  function bannerFormData(banner) {
    if (!banner) {
      const firstTicket = (gachaData.tickets || [])[0] || '';
      return { grp: 'char', pay: 'ticket', ticket: firstTicket, active: true, rates: {}, items: [], rate_up: [], rate_up_mult: RATE_UP_DEFAULT };
    }
    const config = banner.admin_owned ? banner.admin_cfg || {} : {};
    const rates = {};
    Object.entries(config.rates || banner.rates || {}).forEach(([rarity, units]) => {
      rates[rarity] = unitsToPercent(units);
    });
    return Object.assign({}, banner, {
      pay: banner.ticket ? 'ticket' : 'coins',
      rates,
      items: config.items || banner.items || [],
      rate_up: config.rate_up || [],
      rate_up_mult: config.rate_up_mult || RATE_UP_DEFAULT,
    });
  }

  function rateInput(rarity, value) {
    return `<input name="rate:${rarity}" type=number step=0.01 min=0 max=100 inputmode=decimal value="${escape(value == null ? 0 : value)}" oninput="adRateSum()">`;
  }

  function ratesTotal(rates) {
    const sum = Object.values(rates || {}).reduce((total, value) => total + Number(value || 0), 0);
    return Math.round(sum * 100) / 100;
  }

  function payFieldsHtml(data) {
    const ticketOptions = (gachaData.tickets || [])
      .map(id => `<option value="${escape(id)}"${id === data.ticket ? ' selected' : ''}>${escape(itemLabel(id))}</option>`)
      .join('');
    const show = mode => (data.pay === mode ? '' : ' style="display:none"');
    return `${field('วิธีจ่าย', `<select name=pay onchange="adPay(this)">
        <option value=ticket${data.pay === 'ticket' ? ' selected' : ''}>ตั๋ว (ตั๋วไม่พอหักเพชร)</option>
        <option value=coins${data.pay === 'coins' ? ' selected' : ''}>เหรียญ / เพชร</option></select>`)}
      <div class="ad-f wide ad-pay ad-pay-ticket"${show('ticket')}><div class=ad-grid>
        ${field('ตั๋วที่ใช้', `<select name=ticket>${ticketOptions}</select>`)}
        ${field('เพชรแทนตั๋ว 1 ใบ (ว่าง = ต้องมีตั๋ว)', numberInput('ticket_mcash', data.ticket_mcash))}
        ${field('เพชรแทนตั๋ว 10 ใบ (ว่าง = 10 เท่า)', numberInput('ticket_mcash10', data.ticket_mcash10))}
      </div></div>
      <div class="ad-f wide ad-pay ad-pay-coins"${show('coins')}><div class=ad-grid>
        ${field('🪙 สุ่ม 1 ครั้ง', numberInput('single_coins', data.single_coins))}
        ${field('🪙 สุ่ม 10 ครั้ง', numberInput('ten_coins', data.ten_coins))}
        ${field('💎 สุ่ม 1 ครั้ง', numberInput('single_mcash', data.single_mcash))}
        ${field('💎 สุ่ม 10 ครั้ง', numberInput('ten_mcash', data.ten_mcash))}
      </div><span class=ad-mut>เว้นว่าง = ไม่รับสกุลนั้น · ใส่อย่างน้อย 1 ช่อง</span></div>`;
  }

  function ratesFieldsHtml(data) {
    const inputs = (gachaData.rarities || []).map(r => field(`โอกาส ${escape(r.name)} (%)`, rateInput(r.rarity, data.rates[r.rarity]))).join('');
    return `${inputs}<div class="ad-f"><span>รวม (ต้องได้ 100%)</span><b class=ad-rsum>${ratesTotal(data.rates)}%</b></div>`;
  }

  // รายการของแยกตามชนิด: ติ๊กซ้าย = อยู่ในตู้ · ติ๊กขวา = เรทอัป
  function poolItemsHtml(data) {
    const byKind = {};
    (gachaData.catalog || []).forEach(item => {
      (byKind[item.kind] = byKind[item.kind] || []).push(item);
    });
    const groups = Object.entries(byKind).map(([kind, items]) => {
      const rows = items
        .map(item => {
          const inPool = data.items.includes(item.key);
          const rateUp = data.rate_up.includes(item.key);
          return `<div class=ad-pi>${checkbox('item:' + item.key, inPool, `${escape(item.name)} <small>${escape(rarityName(item.rarity))}</small>`)}
            ${checkbox('up:' + item.key, rateUp, 'เรทอัป')}</div>`;
        })
        .join('');
      return `<div class=ad-pk><b>${escape(kindName(kind))}</b>${rows}</div>`;
    });
    return `<div class="ad-f wide"><span>ของในตู้ (โอกาสของระดับแบ่งเท่ากันทุกชิ้น · ของเรทอัปได้ส่วนแบ่งตามตัวคูณ)</span>
      <div class=ad-pool>${groups.join('') || 'ไม่มีของในแคตตาล็อก'}</div></div>`;
  }

  function bannerFormHtml(data) {
    const fromFile = data.id && !data.admin_owned;
    const warning = fromFile
      ? '<p class="ad-mut ad-warn">ตู้นี้มาจากไฟล์ของเกม — บันทึกแล้วจะย้ายมาให้แอดมินดูแล และแก้ Config.config ของตู้นี้จะไม่มีผลอีก</p>'
      : '';
    const preview = data.image_url ? `<img class=ad-prev src="${escape(data.image_url)}" alt="">` : '';
    return `<h4>${data.id ? 'แก้ตู้กาชา' : 'สร้างตู้กาชา'}</h4>${warning}
      <div class=ad-grid>
        ${idField(data)}
        ${field('ชื่อตู้', textInput('name', data.name, 'maxlength=40'))}
        ${field('คำอธิบาย', `<textarea name=description maxlength=300 rows=2>${escape(data.description || '')}</textarea>`, true)}
        ${field('ลิงก์รูปแบนเนอร์ (https://… หรือ ./Assets/… · ว่าง = ใช้รูปในไฟล์)', textInput('image_url', data.image_url, 'maxlength=500'), true)}
        ${preview ? `<div class="ad-f wide">${preview}</div>` : ''}
        ${field('หมวด', `<select name=grp>
          <option value=char${data.grp !== 'cosm' ? ' selected' : ''}>ตู้ตัวละคร</option>
          <option value=cosm${data.grp === 'cosm' ? ' selected' : ''}>ตู้ของแต่ง (ของซ้ำแปลงเป็นเหรียญ)</option></select>`)}
        ${payFieldsHtml(data)}
        ${ratesFieldsHtml(data)}
        ${field('การันตี SSR ใน (ครั้ง · 0 = ปิด)', numberInput('pity', data.pity || 0))}
        ${field('ตัวคูณเรทอัป (1–20)', numberInput('rate_up_mult', data.rate_up_mult))}
        ${field('ลำดับ', numberInput('sort', data.sort || 0))}
        <div class="ad-f">${checkbox('active', data.active !== false, 'เปิดใช้')}</div>
        ${poolItemsHtml(data)}
      </div>`;
  }

  async function loadGacha() {
    try {
      gachaData = await DB.call('admin_gacha_data', {});
    } catch (e) {
      gachaData = { banners: [], rarities: [], catalog: [], tickets: [] };
      if (window.dbToast) dbToast(e.message || 'โหลดตู้กาชาไม่ได้ (ฐานข้อมูลยังไม่มี v18?)');
    }
    repaint();
  }

  // ---------- แท็บจดหมาย ----------
  function mailRewardSummary(mail) {
    return rewardSummary({ reward_coins: mail.reward_coins, reward_mcash: mail.reward_mcash, reward_items: mail.reward_items });
  }

  function mailRowHtml(mail) {
    const target = mail.target_user ? '@' + (mail.to || '?') : mail.include_new ? 'ทุกคน (รวมคนสมัครใหม่)' : 'ทุกคน';
    const state = mail.expired ? '<em class="ad-st off">หมดอายุ</em>' : '';
    return `<div class="ad-row${mail.expired ? ' off' : ''}">
      <span><b>${escape(mail.title)}</b>${state}
        <small>ถึง ${escape(target)} · ${escape(mailRewardSummary(mail))} · รับแล้ว ${number(mail.claimed_count)} คน · ส่ง ${escape(dateText(mail.created_at))} · หมด ${escape(dateText(mail.expires_at))}</small></span>
      <span></span>
      <button class="wbtn ad-del" onclick="adDelete('mail','${Number(mail.id)}')">ถอน</button>
    </div>`;
  }

  function mailTabHtml() {
    if (!sentMails) return '<p class=ad-mut>กำลังโหลดจดหมาย…</p>';
    const rows = sentMails.map(mailRowHtml).join('') || '<p class=ad-mut>ยังไม่เคยส่งจดหมาย</p>';
    const note = '<p class=ad-mut>ผู้เล่นกดรับของเองในกล่องจดหมาย · ถอนจดหมาย = คนที่ยังไม่รับจะไม่เห็นอีก (ของที่รับไปแล้วไม่ถูกดึงคืน) · แสดง 50 ฉบับล่าสุด</p>';
    return `<button class="wbtn go" onclick="adNewMail()">＋ ส่งจดหมาย</button>${note}<div class=ad-list>${rows}</div>`;
  }

  function mailFormHtml(data) {
    return `<h4>ส่งจดหมาย</h4>
      <div class=ad-grid>
        ${field('ถึง (ชื่อผู้ใช้ · ว่าง = ผู้เล่นทุกคน)', textInput('to', data.to, 'maxlength=40 placeholder="ว่าง = ทุกคน"'))}
        <div class="ad-f">${checkbox('include_new', !!data.include_new, 'ส่งทุกคน: รวมคนที่สมัครหลังส่งด้วย')}</div>
        ${field('หัวข้อ', textInput('title', data.title, 'maxlength=60'), true)}
        ${field('ข้อความ', `<textarea name=body maxlength=1000 rows=4>${escape(data.body || '')}</textarea>`, true)}
        ${field('แนบเหรียญ', numberInput('reward_coins', data.reward_coins || 0))}
        ${field('แนบเพชร', numberInput('reward_mcash', data.reward_mcash || 0))}
        ${field('อายุจดหมาย (วัน)', numberInput('days', data.days || MAIL_DAYS_DEFAULT))}
        ${itemRowsHtml(data.reward_items)}
      </div>`;
  }

  async function loadMail() {
    try {
      sentMails = await DB.call('admin_list_mail', {});
    } catch (e) {
      sentMails = [];
      if (window.dbToast) dbToast(e.message || 'โหลดจดหมายไม่ได้ (ฐานข้อมูลยังไม่มี v18?)');
    }
    repaint();
  }

  // ---------- แท็บผู้เล่น ----------
  function playerRowHtml(player) {
    const lastLogin = player.last_login_at ? 'ล็อกอินล่าสุด ' + dateText(player.last_login_at) : 'ยังไม่เคยล็อกอิน';
    return `<div class=ad-row>
      <span><b>${escape(player.display_name)}</b>
        <small>@${escape(player.username)}${player.title ? ' · ' + escape(player.title) : ''} · สมัคร ${escape(dateText(player.created_at))} · ${escape(lastLogin)}</small></span>
      <span></span>
      <button class=wbtn onclick="adRename('${escape(player.username)}')">เปลี่ยนชื่อ</button>
    </div>`;
  }

  function playersTabHtml() {
    const search = `<div class=ad-add><input id=ad-find value="${escape(playerQuery)}" placeholder="ชื่อผู้ใช้ หรือชื่อที่แสดง (อย่างน้อย 2 ตัว)" maxlength=40
      onkeydown="if(event.key==='Enter')adFindPlayer()"><button class="wbtn go" onclick="adFindPlayer()">🔍 ค้นหา</button></div>`;
    if (foundPlayers === null) return search + '<p class=ad-mut>ค้นผู้เล่นเพื่อเปลี่ยนชื่อที่ไม่เหมาะสม · เปลี่ยนเฉพาะชื่อที่แสดง (ชื่อผู้ใช้สำหรับล็อกอินไม่เปลี่ยน)</p>';
    const rows = foundPlayers.map(playerRowHtml).join('') || '<p class=ad-mut>ไม่พบผู้เล่น</p>';
    return `${search}<div class=ad-list>${rows}</div>`;
  }

  function renameFormHtml(data) {
    return `<h4>เปลี่ยนชื่อผู้เล่น @${escape(data.username)}</h4>
      <p class=ad-mut>ชื่อเดิม: ${escape(data.previous)} · ไม่หักเหรียญ ไม่ผ่านตัวกรองชื่อ และไม่นับเป็นสิทธิ์เปลี่ยนชื่อของผู้เล่น · บันทึกชื่อเดิมไว้ในบันทึกแอดมิน</p>
      <div class=ad-grid>
        ${field('ชื่อใหม่ (ไม่เกิน 14 ตัวอักษร)', textInput('display_name', data.display_name, 'maxlength=14'))}
      </div>`;
  }

  // ---------- แท็บแอดมิน ----------
  function adminsTabHtml() {
    const rows = (overview.admins || [])
      .map(a => `<div class=ad-row><span><b>${escape(a.display_name)}</b><small>@${escape(a.username)}</small></span>
        <button class="wbtn ad-del" onclick="adRemoveAdmin('${escape(a.username)}')">ถอดสิทธิ์</button></div>`)
      .join('');
    return `<div class=ad-add><input id=ad-new-admin placeholder="ชื่อผู้ใช้ (username) ที่จะตั้งเป็นแอดมิน" maxlength=40>
      <button class="wbtn go" onclick="adAddAdmin()">＋ เพิ่มแอดมิน</button></div><div class=ad-list>${rows}</div>`;
  }

  // ---------- กรอบหน้าต่าง ----------
  function tabsHtml() {
    return `<div class=ad-tabs>${TABS.map(([id, name]) => `<button class="ad-tab${tab === id ? ' on' : ''}" onclick="adTab('${id}')">${name}</button>`).join('')}</div>`;
  }

  function bodyHtml() {
    if (failMessage) return `<p class=ad-mut>${escape(failMessage)}</p>`;
    if (!overview) return '<p class=ad-mut>กำลังโหลด…</p>';
    if (form) return formHtml();
    if (tab === 'quests') return questsTabHtml();
    if (tab === 'gacha') return gachaTabHtml();
    if (tab === 'mail') return mailTabHtml();
    if (tab === 'players') return playersTabHtml();
    if (tab === 'admins') return adminsTabHtml();
    return eventsTabHtml();
  }

  function boxHtml() {
    const head = `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=ad-h>🛡️ หน้าแอดมิน</h3>`;
    return `${head}${form ? '' : tabsHtml()}<div class=ad-body>${bodyHtml()}</div>`;
  }

  function repaint() {
    const box = document.querySelector('.ad-modal .st-box');
    if (!box) return;
    const body = box.querySelector('.ad-body');
    const scroll = body ? body.scrollTop : 0;
    box.innerHTML = boxHtml();
    const fresh = box.querySelector('.ad-body');
    if (fresh) fresh.scrollTop = scroll;
  }

  async function loadOverview() {
    try {
      overview = await DB.call('admin_overview', {});
      failMessage = '';
    } catch (e) {
      failMessage = e.message || 'เปิดหน้าแอดมินไม่ได้';
    }
    repaint();
  }

  // ---------- อ่านค่าจากฟอร์ม ----------
  function readForm() {
    const formEl = document.querySelector('.ad-modal .ad-form');
    const values = {};
    formEl.querySelectorAll('input, select, textarea').forEach(input => {
      if (!input.name) return;
      values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
    });
    return values;
  }

  function readItems(values) {
    const items = {};
    for (let row = 0; row < ITEM_ROWS; row++) {
      const itemId = values['item_id_' + row];
      const qty = Number(values['item_qty_' + row]) || 0;
      if (itemId && qty > 0) items[itemId] = (items[itemId] || 0) + qty;
    }
    return items;
  }

  // ช่องติ๊กที่ชื่อขึ้นต้นด้วย prefix → รายการ "ชนิด:รหัส" ที่ติ๊กไว้
  function checkedKeys(values, prefix) {
    return Object.keys(values)
      .filter(name => name.startsWith(prefix) && values[name])
      .map(name => name.slice(prefix.length));
  }

  function buildBannerPayload(values) {
    const rates = {};
    (gachaData.rarities || []).forEach(r => {
      rates[r.rarity] = values['rate:' + r.rarity];
    });
    const payload = { rates, items: checkedKeys(values, 'item:'), rate_up: checkedKeys(values, 'up:') };
    Object.keys(values)
      .filter(name => !name.includes(':'))
      .forEach(name => {
        payload[name] = values[name];
      });
    return payload;
  }

  function buildPayload(values) {
    if (form.type === 'banner') return buildBannerPayload(values);
    if (form.type === 'event') {
      const bannerIds = Object.keys(values).filter(k => k.startsWith('banner:') && values[k]).map(k => k.slice('banner:'.length));
      return Object.assign({}, values, {
        starts_at: fromLocalInput(values.starts_at),
        ends_at: fromLocalInput(values.ends_at),
        banner_ids: bannerIds,
      });
    }
    const payload = Object.assign({}, values);
    if (form.type === 'mail') payload.reward_items = readItems(values);
    if (form.type === 'event_quest') {
      payload.event_id = form.data.event_id;
      payload.reward_items = readItems(values);
    }
    return payload;
  }

  const SAVE_FUNCTIONS = { event: 'admin_save_event', event_quest: 'admin_save_event_quest', quest: 'admin_save_quest', banner: 'admin_save_banner', mail: 'admin_send_mail',
    rename: 'admin_rename_player' };
  const DELETE_FUNCTIONS = { event: 'admin_delete_event', event_quest: 'admin_delete_event_quest', quest: 'admin_delete_quest', banner: 'admin_delete_banner', mail: 'admin_delete_mail' };
  const DELETE_WARNINGS = {
    event: 'ลบอีเวนต์นี้? เควสและประวัติรับรางวัลของอีเวนต์จะหายไปด้วย',
    banner: 'ลบตู้นี้? การันตีสะสมของผู้เล่นในตู้นี้จะหายไปด้วย (ปิดใช้แทนการลบได้)',
    mail: 'ถอนจดหมายนี้? คนที่ยังไม่กดรับจะไม่ได้ของ',
  };
  const AFTER_CHANGE = { banner: () => reloadAfterBannerChange(), mail: () => loadMail(), rename: () => findPlayers() };

  // ฟังก์ชันส่วนใหญ่รับ { p: ข้อมูลฟอร์ม } · เปลี่ยนชื่อรับเป็นช่องแยก
  function saveArgs(type, payload) {
    if (type === 'rename') return { p_username: form.data.username, p_name: payload.display_name };
    return { p: payload };
  }

  async function findPlayers() {
    if (playerQuery.length < 2) return;
    try {
      foundPlayers = await DB.call('admin_find_player', { p_query: playerQuery });
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'ค้นหาไม่สำเร็จ');
    }
    repaint();
  }

  // หลังแก้ตู้: โหลดรายการตู้ใหม่ + ให้หน้ากาชาโหลดตู้ใหม่ครั้งหน้าที่เปิด (gacha.js โหลดเมื่อ DB.G ว่าง)
  async function reloadAfterBannerChange() {
    await loadGacha();
    if (window.DB) DB.G = null;
  }

  // ---------- คำสั่งจากหน้าจอ ----------
  window.adminOpen = () => {
    if (!dbOn()) return;
    document.querySelectorAll('.ad-modal').forEach(node => node.remove());
    form = null;
    const modal = document.createElement('div');
    modal.className = 'st-modal ad-modal';
    modal.innerHTML = `<div class="st-box ad-box">${boxHtml()}</div>`; // ไม่ปิดเมื่อกดพื้นหลัง กันฟอร์มที่กรอกค้างหาย
    document.body.appendChild(modal);
    loadOverview();
  };

  window.adTab = id => {
    tab = id;
    form = null;
    repaint();
    if (id === 'gacha') loadGacha(); // โหลดใหม่ทุกครั้งที่เปิดแท็บ — ตู้อาจถูกแก้จาก seed หรือแอดมินคนอื่น
    if (id === 'mail') loadMail();
  };

  window.adExpand = eventId => {
    expandedEvent = expandedEvent === eventId ? '' : eventId;
    repaint();
  };

  window.adEditEvent = eventId => {
    const existing = (overview.events || []).find(e => e.id === eventId);
    const now = Date.now();
    const fresh = { starts_at: new Date(now).toISOString(), ends_at: new Date(now + 7 * 86400000).toISOString(), active: true };
    form = { type: 'event', data: Object.assign({}, existing || fresh) };
    repaint();
  };

  window.adEditEventQuest = (eventId, questId) => {
    const existing = (overview.event_quests || []).find(q => q.id === questId);
    form = { type: 'event_quest', data: Object.assign({ event_id: eventId, mode: 'event' }, existing || {}) };
    repaint();
  };

  window.adEditQuest = questId => {
    const existing = (overview.quests || []).find(q => q.id === questId);
    form = { type: 'quest', data: Object.assign({ period: 'daily', active: true }, existing || {}) };
    repaint();
  };

  window.adEditBanner = bannerId => {
    if (!gachaData) return;
    const existing = (gachaData.banners || []).find(b => b.id === bannerId);
    form = { type: 'banner', data: bannerFormData(existing) };
    repaint();
  };

  window.adFindPlayer = () => {
    const input = document.getElementById('ad-find');
    playerQuery = input ? input.value.trim() : '';
    if (playerQuery.length < 2) {
      if (window.dbToast) dbToast('พิมพ์อย่างน้อย 2 ตัวอักษร');
      return;
    }
    findPlayers();
  };

  window.adRename = username => {
    const player = (foundPlayers || []).find(p => p.username === username);
    if (!player) return;
    form = { type: 'rename', data: { username, previous: player.display_name, display_name: player.display_name } };
    repaint();
  };

  window.adNewMail = () => {
    form = { type: 'mail', data: { days: MAIL_DAYS_DEFAULT } };
    repaint();
  };

  window.adPay = select => {
    const formEl = select.closest('.ad-form');
    formEl.querySelectorAll('.ad-pay').forEach(box => {
      box.style.display = box.classList.contains('ad-pay-' + select.value) ? '' : 'none';
    });
  };

  window.adRateSum = () => {
    const formEl = document.querySelector('.ad-modal .ad-form');
    if (!formEl) return;
    const rates = {};
    formEl.querySelectorAll('input[name^="rate:"]').forEach(input => {
      rates[input.name] = input.value;
    });
    const total = ratesTotal(rates);
    const label = formEl.querySelector('.ad-rsum');
    label.textContent = total + '%';
    label.classList.toggle('bad', total !== 100);
  };

  window.adMetric = select => {
    const featBox = select.closest('.ad-form').querySelector('.ad-feat');
    if (featBox) featBox.style.display = select.value === 'feat' ? '' : 'none';
  };

  window.adCancel = () => {
    form = null;
    repaint();
  };

  window.adSave = async () => {
    if (busy || !form) return;
    const payload = buildPayload(readForm());
    // ส่งทุกคนแก้ไม่ได้หลังส่ง (ถอนได้อย่างเดียว) — ถามซ้ำกันกดพลาด
    if (form.type === 'mail' && !String(payload.to || '').trim() && !window.confirm('ส่งจดหมายนี้ให้ผู้เล่นทุกคน?')) return;
    busy = true;
    repaint();
    try {
      await DB.call(SAVE_FUNCTIONS[form.type], saveArgs(form.type, payload));
      if (window.dbToast) dbToast('💾 บันทึกแล้ว');
      if (form.type === 'event_quest') expandedEvent = form.data.event_id;
      const savedType = form.type;
      form = null;
      await loadOverview();
      if (AFTER_CHANGE[savedType]) await AFTER_CHANGE[savedType]();
      if (window.Events) Events.refresh();
    } catch (e) {
      form.data = Object.assign({}, form.data, payload); // เก็บค่าที่กรอกไว้ ให้แก้แล้วกดบันทึกใหม่ได้
      if (window.dbToast) dbToast(e.message || 'บันทึกไม่สำเร็จ');
    }
    busy = false;
    repaint();
  };

  window.adDelete = async (type, id) => {
    if (busy) return;
    if (!window.confirm(DELETE_WARNINGS[type] || 'ลบเควสนี้?')) return;
    busy = true;
    try {
      await DB.call(DELETE_FUNCTIONS[type], { p_id: type === 'mail' ? Number(id) : id }); // จดหมายใช้รหัสตัวเลข
      if (window.dbToast) dbToast('🗑️ ลบแล้ว');
      await loadOverview();
      if (AFTER_CHANGE[type]) await AFTER_CHANGE[type]();
      if (window.Events) Events.refresh();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'ลบไม่สำเร็จ');
    }
    busy = false;
  };

  window.adAddAdmin = async () => {
    const input = document.getElementById('ad-new-admin');
    const username = input ? input.value.trim() : '';
    if (!username || busy) return;
    busy = true;
    try {
      await DB.call('admin_add_admin', { p_username: username });
      if (window.dbToast) dbToast('🛡️ เพิ่มแอดมินแล้ว');
      await loadOverview();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'เพิ่มไม่สำเร็จ');
    }
    busy = false;
  };

  window.adRemoveAdmin = async username => {
    if (busy || !window.confirm('ถอดสิทธิ์แอดมินของ @' + username + '?')) return;
    busy = true;
    try {
      await DB.call('admin_remove_admin', { p_username: username });
      await loadOverview();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'ถอดสิทธิ์ไม่สำเร็จ');
    }
    busy = false;
  };

  window.Admin = { isAdmin };
})();
