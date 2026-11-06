/* admin.js — หน้าแอดมินในเกม: อีเวนต์ (เพิ่ม/แก้/ลบ + เควสอีเวนต์ + ผูกตู้กาชา) · เควสรายวัน/รายสัปดาห์ · รายชื่อแอดมิน
   ทุกคำสั่งผ่านฟังก์ชัน admin_* ในฐานข้อมูล (supabase/v17_events_admin.sql) ซึ่งตรวจสิทธิ์และตรวจข้อมูลเอง — ไฟล์นี้เป็นแค่ฟอร์ม
   ปุ่มเข้าหน้านี้ขึ้นเฉพาะบัญชีที่เป็นแอดมิน (Admin.isAdmin() ถาม is_admin จากฐานข้อมูล) · คนอื่นเรียก adminOpen() ก็แก้อะไรไม่ได้
   Public: adminOpen() · adTab(tab) · adEditEvent(id) · adEditEventQuest(eventId, questId) · adEditQuest(id) · adSave() · adCancel()
           adDelete(type, id) · adExpand(eventId) · adMetric(select) · adAddAdmin() · adRemoveAdmin(username) · Admin.isAdmin()
   EXTEND: ชนิดเควสใหม่ = เพิ่มใน METRICS (และใน SQL _quest_metric_ok / _window_progress) · แท็บใหม่ = เพิ่มใน TABS + ฟังก์ชันวาดแท็บ */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const TABS = [
    ['events', '🎉 อีเวนต์'],
    ['quests', '📜 เควสปกติ'],
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

  let adminChecked = null; // id ผู้ใช้ที่ถามสิทธิ์ไปแล้ว
  let adminYes = false;
  let overview = null; // ผลจาก admin_overview
  let failMessage = '';
  let tab = 'events';
  let form = null; // { type: 'event' | 'event_quest' | 'quest', data }
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

  function formHtml() {
    const body = form.type === 'event' ? eventFormHtml(form.data) : form.type === 'event_quest' ? eventQuestFormHtml(form.data) : questFormHtml(form.data);
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

  function buildPayload(values) {
    if (form.type === 'event') {
      const bannerIds = Object.keys(values).filter(k => k.startsWith('banner:') && values[k]).map(k => k.slice('banner:'.length));
      return Object.assign({}, values, {
        starts_at: fromLocalInput(values.starts_at),
        ends_at: fromLocalInput(values.ends_at),
        banner_ids: bannerIds,
      });
    }
    const payload = Object.assign({}, values);
    if (form.type === 'event_quest') {
      payload.event_id = form.data.event_id;
      payload.reward_items = readItems(values);
    }
    return payload;
  }

  const SAVE_FUNCTIONS = { event: 'admin_save_event', event_quest: 'admin_save_event_quest', quest: 'admin_save_quest' };
  const DELETE_FUNCTIONS = { event: 'admin_delete_event', event_quest: 'admin_delete_event_quest', quest: 'admin_delete_quest' };

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
    busy = true;
    repaint();
    try {
      await DB.call(SAVE_FUNCTIONS[form.type], { p: payload });
      if (window.dbToast) dbToast('💾 บันทึกแล้ว');
      if (form.type === 'event_quest') expandedEvent = form.data.event_id;
      form = null;
      await loadOverview();
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
    const warning = type === 'event' ? 'ลบอีเวนต์นี้? เควสและประวัติรับรางวัลของอีเวนต์จะหายไปด้วย' : 'ลบเควสนี้?';
    if (!window.confirm(warning)) return;
    busy = true;
    try {
      await DB.call(DELETE_FUNCTIONS[type], { p_id: id });
      if (window.dbToast) dbToast('🗑️ ลบแล้ว');
      await loadOverview();
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
