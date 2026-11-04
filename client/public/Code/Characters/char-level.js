/* char-level.js — เลเวลตัวละคร (ใช้คัมภีร์ + เหรียญอัป) + ช่องชุดแต่งประจำตัวละคร (ใส่ให้อัตโนมัติเมื่อเลือกตัวนั้น)
   ตัดสินที่ฐานข้อมูล (char_level_up · set_char_slot) · ไฟล์นี้แสดงผลและส่งคำขอ
   Public: CharLv.of(id) · CharLv.section(id) · CharLv.badge(id) · clPick · clLevelUp · clSlotOpen · clSlotSet
   EXTEND: ช่องชุดแต่งใหม่ = เพิ่มใน CHAR.SLOTS ของ economy.js + ชื่อใน SLOT_NAME */
(function () {
  'use strict';
  const Economy = window.Economy;
  const { escape, number, dbOn } = window.UiKit;

  const SLOT_NAME = { frames: 'กรอบการ์ด', backs: 'หลังไพ่', tables: 'ผ้าปูโต๊ะ', backgrounds: 'พื้นหลัง' };
  const DEFAULT_SHARD_NEED = 50;

  const toast = message => {
    if (window.dbToast) dbToast(message);
  };
  const rerender = () => {
    if (typeof render === 'function') render();
  };

  // คัมภีร์เรียงจาก EXP น้อยไปมาก
  const bookIds = () =>
    Items.list()
      .filter(id => Economy.ITEMS[id].charExp)
      .sort((a, b) => Economy.ITEMS[a].charExp - Economy.ITEMS[b].charExp);
  const progressOf = id => (dbOn() && DB.P.char_prog && DB.P.char_prog[id]) || { level: 1, exp: 0, loadout: {} };
  const picked = {}; // ตัวละคร → { คัมภีร์: จำนวนที่เลือกจะใช้ }
  let busy = false;

  function of(id) {
    const progress = progressOf(id);
    const level = Economy.charLevelOf(progress.exp);
    return Object.assign(level, { exp: Number(progress.exp) || 0, loadout: progress.loadout || {} });
  }

  const badge = id => `<span class=cl-badge>Lv.${of(id).level}</span>`;

  function registryName(kind, itemId) {
    const item = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[kind]) || []).find(x => x.id === itemId);
    return (item && (item.name || item.n)) || itemId;
  }

  function bookPicker(id, level, selection, addedExp, maxExp) {
    return bookIds()
      .map(book => {
        const have = Items.qty(book);
        const count = selection[book] || 0;
        const canAdd = count < have && level.exp + addedExp < maxExp;
        return `<div class=cl-bk>${Items.icon(book)}<small>${escape(Economy.ITEMS[book].name)}<br>มี ${number(have)}</small><span><button ${count ? '' : 'disabled'} onclick="clPick('${escape(id)}','${book}',-1)">−</button><b>${count}</b><button ${canAdd ? '' : 'disabled'} onclick="clPick('${escape(id)}','${book}',1)">+</button></span></div>`;
      })
      .join('');
  }

  function slotButtons(id, level) {
    return Object.keys(Economy.CHAR.SLOTS)
      .map(kind => {
        const needLevel = Economy.CHAR.SLOTS[kind];
        const open = level.level >= needLevel;
        const current = level.loadout[kind];
        const label = open ? (current ? escape(registryName(kind, current)) : '+ ว่าง') : '🔒 Lv.' + needLevel;
        return `<button class="cl-slot${open ? '' : ' lock'}${current ? ' set' : ''}" ${open ? `onclick="clSlotOpen('${escape(id)}','${kind}')"` : 'disabled'}><small>${SLOT_NAME[kind]}</small><b>${label}</b></button>`;
      })
      .join('');
  }

  function shardBar(id) {
    const shards = DB.qty ? DB.qty('shards', id) : 0;
    if (!shards) return '';
    const need = Economy.SHARD_NEED || DEFAULT_SHARD_NEED;
    return `<div class=cl-sh><img src="./Assets/Item/Shards/${escape(id)}.webp" alt="" onerror="this.remove()">เศษตัวละคร <b>${number(shards)}/${need}</b><i><u style="width:${Math.min(100, Math.round((shards / need) * 100))}%"></u></i></div>`;
  }

  // ส่วนอัปเลเวล + ช่องชุดแต่ง (แสดงในช่องเก็บของ แท็บตัวละคร)
  function section(id) {
    if (!dbOn()) return `<div class=cl><small class=cl-off>ล็อกอินเพื่ออัปเลเวลตัวละครและใส่ชุดแต่งประจำตัว</small></div>`;
    const level = of(id);
    const selection = picked[id] || {};
    const maxExp = Economy.charMaxExp();
    const addedExp = bookIds().reduce((sum, book) => sum + (selection[book] || 0) * Economy.ITEMS[book].charExp, 0);
    const usedExp = Math.min(addedExp, maxExp - level.exp);
    const cost = Economy.charCost(usedExp);
    const targetLevel = Economy.charLevelOf(level.exp + usedExp).level;
    const coins = Number(DB.P.coins) || 0;
    const percent = level.max ? 100 : Math.round((level.into / level.need) * 100);
    const levelUp = level.max
      ? ''
      : `<div class=cl-bks>${bookPicker(id, level, selection, addedExp, maxExp)}</div><button class=cl-go ${addedExp && coins >= cost && !busy ? '' : 'disabled'} onclick="clLevelUp('${escape(id)}')">${addedExp ? `อัปเป็น Lv.${targetLevel} · +${number(usedExp)} EXP · ${number(cost)} 🪙` : 'เลือกคัมภีร์เพื่ออัปเลเวล'}</button>${addedExp && coins < cost ? '<small class=cl-warn>เหรียญไม่พอ</small>' : ''}`;
    return `<div class=cl>${shardBar(id)}<div class=cl-top><b>Lv.${level.level}<small>/${Economy.CHAR.MAX}</small></b><i><u style="width:${percent}%"></u></i><small>${level.max ? 'เลเวลสูงสุดแล้ว' : `${number(level.into)}/${number(level.need)} EXP`}</small></div>
      ${levelUp}
      <h4>ชุดแต่งประจำตัวละคร <small>เลือกตัวนี้แล้วใส่ให้อัตโนมัติ</small></h4><div class=cl-slots>${slotButtons(id, level)}</div></div>`;
  }

  window.clPick = (id, book, delta) => {
    const selection = (picked[id] = picked[id] || {});
    selection[book] = Math.max(0, Math.min(Items.qty(book), (selection[book] || 0) + delta));
    rerender();
  };

  window.clLevelUp = async id => {
    const books = Object.fromEntries(Object.entries(picked[id] || {}).filter(([, count]) => count > 0));
    if (busy || !Object.keys(books).length) return;
    busy = true;
    rerender();
    try {
      const r = await DB.call('char_level_up', { p_char: id, p_books: books });
      delete picked[id];
      toast(r.level > r.old_level ? `⬆ ตัวละครขึ้น Lv.${r.level}!` : `+${number(r.added)} EXP`);
      await DB.refresh();
    } catch (e) {
      toast(e.message);
    }
    busy = false;
    rerender();
  };

  // เลือกของใส่ช่อง: แสดงเฉพาะของชนิดนั้นที่มีแล้ว
  window.clSlotOpen = (id, kind) => {
    document.querySelectorAll('.cl-modal').forEach(n => n.remove());
    const list = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[kind]) || []).filter(
      x => typeof owned !== 'function' || owned(kind, x)
    );
    const current = of(id).loadout[kind];
    const choices =
      list
        .map(
          x =>
            `<button class="${x.id === current ? 'on' : ''}" onclick="clSlotSet('${escape(id)}','${kind}','${escape(x.id)}')">${escape(x.name || x.n || x.id)}</button>`
        )
        .join('') || '<small>ยังไม่มีของชนิดนี้</small>';
    const modal = document.createElement('div');
    modal.className = 'st-modal cl-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class=st-box><button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h4>${SLOT_NAME[kind]} ของ ${escape(registryName('characters', id))}</h4>
      <div class=cl-pick>${choices}</div>
      ${current ? `<button class=cl-clear onclick="clSlotSet('${escape(id)}','${kind}','')">ถอดออก</button>` : ''}</div>`;
    document.body.appendChild(modal);
  };

  window.clSlotSet = async (id, kind, itemId) => {
    try {
      await DB.call('set_char_slot', { p_char: id, p_kind: kind, p_id: itemId || null });
      await DB.refresh();
      document.querySelectorAll('.cl-modal').forEach(n => n.remove());
      // ใช้ตัวนี้อยู่ → ใส่ให้เลย
      if (itemId && typeof myChar === 'function' && myChar() === id && typeof equip === 'function') equip(kind, itemId);
      toast(itemId ? '✓ ใส่ในชุดของตัวละครแล้ว' : 'ถอดออกแล้ว');
    } catch (e) {
      toast(e.message);
    }
    rerender();
  };

  // เลือกตัวละคร → ใส่ชุดแต่งประจำตัวให้อัตโนมัติ (ห่อ equip ของ Code/Core/skins.js)
  function hookEquip() {
    if (typeof window.equip !== 'function') return setTimeout(hookEquip, 50);
    const equipItem = window.equip;
    window.equip = function (kind, id) {
      const result = equipItem.apply(this, arguments);
      if (kind === 'characters' && dbOn()) {
        const loadout = of(id).loadout;
        Object.keys(loadout).forEach(slot => {
          if (typeof equipped !== 'function' || equipped(slot) !== loadout[slot]) equipItem(slot, loadout[slot]);
        });
      }
      return result;
    };
  }
  hookEquip();

  window.CharLv = { of, section, badge };
})();
