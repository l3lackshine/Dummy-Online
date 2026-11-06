/* inventory.js — หน้าช่องเก็บของ (screen === 'inv', เปิดด้วย invOpen(kind)): ตัวละคร · กรอบการ์ด · หลังไพ่ · โต๊ะ · พื้นหลัง · ไอเทม
   เลือกใช้ของด้วย equip() (Code/Core/skins.js) · รูปตัวอย่างใช้ prevBox() (Code/Shop/shop.js) · ไอเทมใช้ Items (Code/Items/items.js)
   Public: invOpen(kind) · invTab(kind) · invSel(kind, id) · invSell(characterId, qty)
   EXTEND: แท็บใหม่ = เพิ่มแถวใน TABS (ชนิดเดียวกับ SKIN_REGISTRY) */
(function () {
  'use strict';
  const { escape, dbOn, icon, number } = window.UiKit;

  const TABS = [
    ['characters', 'ตัวละคร'],
    ['frames', 'กรอบการ์ด'],
    ['backs', 'หลังไพ่'],
    ['tables', 'โต๊ะ'],
    ['backgrounds', 'พื้นหลัง'],
    ['items', 'ไอเทม'],
  ];
  let currentTab = 'characters';
  const selected = {}; // ชนิด → id ที่กดดูอยู่ (ยังไม่ได้กดใช้)

  // ความหายาก (ชื่อเดียวกับ gasha.config) → คลาสพื้นหลังช่องตัวละคร · Common ใช้พื้นเดิม
  // EXTEND: ระดับใหม่ = เพิ่มแถวที่นี่ + กฎ .iv-cell.<คลาส> ใน inventory.theme.css
  const RARITY_CLASS = {
    rare: 'r-rare',
    epic: 'r-sr',
    legendary: 'r-ssr',
  };
  let priceToRarity = []; // จาก skin/gacha.json — ใช้กับตัวละครที่ไม่ได้ระบุความหายากเอง

  // โหลดตารางราคา→ความหายากครั้งเดียว (ไฟล์เดียวกับที่ build-assets.js ใช้จัดระดับ)
  function loadPriceToRarity() {
    fetch('./skin/gacha.json')
      .then(response => response.json())
      .then(gacha => {
        priceToRarity = (gacha && gacha.priceToRarity) || [];
        if (typeof screen !== 'undefined' && screen === 'inv') render();
      })
      .catch(() => {});
  }

  // หาความหายากจากที่ที่ "ถูกที่สุด" ก่อน: ฐานข้อมูล (ตู้กาชาจริง) → ค่าที่ตั้งในตัวละคร → เทียบจากราคา
  function rarityFromCatalog(characterId) {
    const banners = (window.DB && DB.G && DB.G.banners) || [];
    for (const banner of banners) {
      const found = (banner.items || []).find(i => i.kind === 'characters' && i.item_id === characterId);
      if (found && found.rarity) return found.rarity;
    }
    return '';
  }

  function rarityFromPrice(price) {
    const rule = priceToRarity.find(r => (Number(price) || 0) >= r.min);
    return rule ? rule.rarity : '';
  }

  function rarityClassOf(character) {
    const rarity = rarityFromCatalog(character.id) || character.rarity || rarityFromPrice(character.price);
    return RARITY_CLASS[rarity] || '';
  }

  window.invOpen = kind => {
    currentTab = kind || currentTab;
    go('inv');
  };
  window.invTab = kind => {
    currentTab = kind;
    render();
  };
  window.invSel = (kind, id) => {
    selected[kind] = id;
    render();
  };

  function cell(kind, item, equippedId, pickedId) {
    const rarityClass = kind === 'characters' ? rarityClassOf(item) : '';
    return `<button class="iv-cell${rarityClass ? ' ' + rarityClass : ''}${item.id === pickedId ? ' sel' : ''}${item.id === equippedId ? ' eq' : ''}" onclick="invSel('${kind}','${escape(item.id)}')">${item.id === equippedId ? '<em>ใช้อยู่</em>' : ''}<span class=iv-pv>${prevBox(kind, item)}</span><b>${escape(item.name || item.n || item.id)}</b></button>`;
  }

  // ---------- ขายตัวซ้ำเป็นเหรียญ (ย้ายมาจากแท็บ "คลังของ" ในหน้าร้านค้า · Beta 0.18.4) ----------
  // ราคาที่แสดงอ่านจากแคตตาล็อกกาชา (DB.G) เพื่อโชว์เท่านั้น — ฐานข้อมูล (sell_dupes) เป็นคนคิดเงินจริงและกันขายตัวสุดท้าย
  let selling = false;
  let catalogRequested = false;

  // ราคาต่อ 1 ตัว: ราคาเฉพาะตัวในตู้ (ถ้าแอดมินตั้ง) ไม่งั้นตามระดับความหายาก
  function sellPriceOf(characterId) {
    const gacha = DB.G || {};
    const rarities = gacha.rarities || {};
    for (const banner of gacha.banners || []) {
      const found = (banner.items || []).find(i => i.kind === 'characters' && i.item_id === characterId);
      if (!found) continue;
      if (Number(found.sell_coins) > 0) return Number(found.sell_coins);
      return Number((rarities[found.rarity] || {}).sell_coins) || 0;
    }
    return 0;
  }

  // แคตตาล็อกกาชาโหลดตอนเปิดหน้าร้าน — เปิดช่องเก็บของก่อนก็ยังต้องรู้ราคา จึงขอเองครั้งเดียว
  function ensureCatalog() {
    if (DB.G || catalogRequested) return;
    catalogRequested = true;
    DB.gacha()
      .then(() => render())
      .catch(() => {});
  }

  function sellSection(characterId) {
    if (!dbOn()) return '';
    const duplicates = Math.max(0, DB.qty('characters', characterId) - 1);
    if (!duplicates) return '';
    ensureCatalog();
    const unitPrice = sellPriceOf(characterId);
    if (!unitPrice) return '';
    const disabled = selling ? 'disabled' : '';
    const sellOne = `<button class="pv-btn blue" ${disabled} onclick="invSell('${escape(characterId)}',1)">ขาย 1 · 🪙 ${number(unitPrice)}</button>`;
    const sellAll =
      duplicates > 1
        ? `<button class="pv-btn blue" ${disabled} onclick="invSell('${escape(characterId)}',${duplicates})">ขายซ้ำทั้งหมด ${duplicates} · 🪙 ${number(unitPrice * duplicates)}</button>`
        : '';
    return `<div class=iv-sell><small>ตัวซ้ำ ${duplicates} · ขายเป็นเหรียญ (เก็บไว้ 1 ตัวเสมอ)</small><div class=iv-sell-row>${sellOne}${sellAll}</div></div>`;
  }

  window.invSell = async (characterId, quantity) => {
    if (selling) return;
    selling = true;
    render();
    try {
      const result = await DB.sell('characters', characterId, quantity);
      if (window.dbToast) dbToast(`ขายตัวซ้ำ ${result.sold} ชิ้น ได้ 🪙 ${number(result.coins_gained)}`);
    } catch (e) {
      if (window.dbToast) dbToast(e.message);
    }
    selling = false;
    render();
  };

  function detail(kind, item, equippedId) {
    const big =
      kind === 'characters' && item.asset
        ? `<img class=iv-hero src="${escape(item.asset)}" alt="">`
        : `<div class=iv-bigpv>${prevBox(kind, item)}</div>`;
    const button =
      item.id === equippedId
        ? `<button class="pv-btn gray" disabled>✓ ใช้อยู่</button>`
        : `<button class="pv-btn green" onclick="equip('${kind}','${escape(item.id)}')">เลือกใช้</button>`;
    const extra =
      kind === 'characters' && typeof skCharCard === 'function'
        ? `<div class="iv-sk${window.CharLv ? ' has-cl' : ''}">${window.CharLv ? CharLv.section(item.id) : ''}${skCharCard(item.id, { compact: true })}</div>`
        : '';
    const sell = kind === 'characters' ? sellSection(item.id) : '';
    return `<div class=iv-det><div class=iv-stage>${big}</div><div class=iv-info><b>${escape(item.name || item.n || item.id)}</b>${extra}${sell}${button}</div></div>`;
  }

  // ปุ่มของไอเทมแต่ละแบบ: ชา (ดื่ม) · ตั๋วสุ่ม (ไปตู้) · กล่อง (เปิด) · คัมภีร์ (ใช้ที่หน้าตัวละคร)
  function itemAction(itemId, info) {
    if (info.stamina)
      return `<button class="pv-btn green" onclick="staminaUse('${itemId}')">🍵 ดื่ม (+${info.stamina} สตามิน่า)</button>`;
    if (info.ticket)
      return `<button class="pv-btn blue" onclick="go('shop');setTimeout(()=>window.gcTab&&gcTab('pull'),0)">🎫 ไปสุ่มตู้ตัวละคร</button>`;
    if (info.crate) return `<button class="pv-btn green" onclick="crateOpen('${itemId}')">🎁 เปิดกล่อง (เลือก 1 อย่าง)</button>`;
    return `<button class="pv-btn blue" onclick="invTab('characters')">ใช้ที่หน้าตัวละคร</button>`;
  }

  function emptyItems() {
    const note = dbOn() ? 'ชาและคัมภีร์ได้จากการเล่นกับบอท (โหมดฟาร์ม) และแบทเทิลพาส' : 'ล็อกอินเพื่อเก็บไอเทม';
    return `<div class=iv-empty><i>${icon('bag')}</i><b>ยังไม่มีไอเทม</b><small>${note}</small><button class="pv-btn blue" onclick="bpOpen()">ไปแบทเทิลพาส</button></div>`;
  }

  function itemsTab() {
    const items = window.Items && dbOn() ? Items.list().filter(id => Items.qty(id) > 0) : [];
    const duplicates = dbOn() ? (DB.P.inventory || []).filter(i => i.kind === 'characters' && (Number(i.qty) || 0) > 1) : [];
    if (!items.length && !duplicates.length) return emptyItems();
    const picked = items.includes(selected.items) ? selected.items : items[0];
    const grid = items
      .map(id => {
        const info = Items.info(id);
        return `<button class="iv-cell${id === picked ? ' sel' : ''}" onclick="invSel('items','${id}')"><em class=iv-qty>×${Items.qty(id)}</em><span class=iv-pv>${Items.icon(id, 'iv-itic')}</span><b>${escape(info.name)}</b></button>`;
      })
      .join('');
    const info = picked && Items.info(picked);
    const detailHtml = info
      ? `<div class=iv-det><div class=iv-stage><div class=iv-bigpv>${Items.icon(picked, 'iv-itbig')}</div></div><div class=iv-info><b>${escape(info.name)}</b><p class=iv-desc>${escape(info.desc)} · มี ${Items.qty(picked)} ชิ้น</p>${itemAction(picked, info)}</div></div>`
      : '';
    const duplicateLine = duplicates.length
      ? `<small class=iv-dupes>ตัวซ้ำจากกาชา (ใช้อัปดาว): ${duplicates.map(i => escape(i.item_id) + ' ×' + (i.qty - 1)).join(' · ')}</small>`
      : '';
    return `<div class=iv-main><div class=iv-grid>${grid}${duplicateLine}</div>${detailHtml}</div>`;
  }

  function cosmeticTab(kind) {
    const list = (SKIN_REGISTRY[kind] || []).filter(x => owned(kind, x));
    const equippedId = equipped(kind);
    const pickedId = list.find(x => x.id === selected[kind]) ? selected[kind] : equippedId;
    const picked = list.find(x => x.id === pickedId) || list[0];
    const cells = list.map(x => cell(kind, x, equippedId, picked && picked.id)).join('');
    const more = `<button class="iv-cell iv-more" onclick="go('shop')"><span class=iv-pv>+</span><b>หาเพิ่มที่ร้านค้า</b></button>`;
    return `<div class=iv-main><div class=iv-grid>${cells}${more}</div>${picked ? detail(kind, picked, equippedId) : ''}</div>`;
  }

  function tabsHtml() {
    const buttons = TABS.map(([kind, label]) => {
      const count = kind === 'items' ? '' : (SKIN_REGISTRY[kind] || []).filter(x => owned(kind, x)).length;
      return `<button class="${currentTab === kind ? 'on' : ''}" onclick="invTab('${kind}')">${label}${count !== '' ? `<small>${count}</small>` : ''}</button>`;
    }).join('');
    return `<nav class=iv-tabs>${buttons}</nav>`;
  }

  function invView() {
    const main = currentTab === 'items' ? itemsTab() : cosmeticTab(currentTab);
    page2('ช่องเก็บของ', `<div class=iv>${tabsHtml()}${main}</div>`, 'home');
    const page = document.querySelector('.pg');
    if (page) page.dataset.pg = 'iv';
  }

  // ร้านค้าเดิมบอกให้ไปเลือกใช้ที่หน้าโปรไฟล์ — ตอนนี้ของเข้าช่องเก็บของ จึงเปลี่ยนข้อความ
  function fixShopNote() {
    const note = document.querySelector('[data-pg=shop] .note');
    if (note && /โปรไฟล์/.test(note.textContent)) note.textContent = 'ซื้อแล้วของจะเข้าช่องเก็บของ — เลือกใช้ได้ที่นั่น';
  }

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    const previousRender = window.render;
    window.render = function () {
      if (typeof screen !== 'undefined' && screen === 'inv') {
        invView();
        return;
      }
      return previousRender.apply(this, arguments);
    };
    setInterval(fixShopNote, 200);
    loadPriceToRarity();
  }
  install();
})();
