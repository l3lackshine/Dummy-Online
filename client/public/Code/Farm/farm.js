/* farm.js — โหมดฟาร์มเมื่อเล่นกับบอท (เหรียญ ×2 / คัมภีร์ตัวละคร / EXP ผู้เล่น) — ของที่ได้ตัดสินที่ฐานข้อมูล
   ค่าที่เลือกเก็บใน localStorage (dummyFarm) และแจ้งเซิร์ฟเวอร์เมื่ออยู่ในห้อง (player:farm)
   Public: Farm.get() · Farm.section() · Farm.lobbyLine() · Farm.itemsLine(items) · farmSet(mode)
   EXTEND: โหมดใหม่ = เพิ่มใน FARM ของ economy.js (ทั้ง server และ client) */
(function () {
  'use strict';
  const Economy = window.Economy;
  const { escape, number, dbOn, lsGet, lsSet } = window.UiKit;

  const getFarm = () => {
    const mode = lsGet('dummyFarm', null);
    return Economy.FARM[mode] ? mode : 'coins';
  };

  window.farmSet = mode => {
    if (!Economy.FARM[mode]) return;
    lsSet('dummyFarm', mode);
    try {
      if (typeof sock !== 'undefined' && sock && sock.connected && typeof code !== 'undefined' && code)
        sock.emit('player:farm', { farm: mode });
    } catch (e) {}
    if (typeof render === 'function') render();
  };

  const itemsLine = items =>
    Object.entries(items)
      .map(([id, qty]) => `<span class=fm-it>${Items.icon(id)}×${qty}</span>`)
      .join('');

  function modeIcon(mode) {
    if (mode === 'coins') return '<img class=it-ic src="./Assets/UI/Assets/kit2/coin.webp" alt="">';
    return Items.icon(mode === 'pexp' ? 'pexp' : 'exp-m');
  }

  function rewardText(mode, reward) {
    if (mode === 'coins') return `<b>${number(reward.coins)}</b> 🪙`;
    if (mode === 'pexp') return `EXP <b>+${number(reward.exp)}</b>`;
    return itemsLine(reward.items);
  }

  // การ์ดโหมด: ของที่ได้เมื่อได้ที่ 1 กับที่สุดท้าย (โต๊ะ 4 ที่นั่ง)
  function modeCard(mode, current) {
    const top = Economy.farmReward(mode, 1, 4);
    const last = Economy.farmReward(mode, 4, 4);
    const rows = `<i class=fm-row><em>ที่ 1</em>${rewardText(mode, top)}</i><i class=fm-row><em>ที่สุดท้าย</em>${rewardText(mode, last)}</i>`;
    return `<button class="fm-card${current === mode ? ' on' : ''}" onclick="farmSet('${mode}')">${modeIcon(mode)}<span><b>${escape(Economy.FARM[mode].name)}</b><small>${rows}</small></span></button>`;
  }

  function staminaLine(state, cost) {
    const enough = !state || state.stamina >= cost;
    const text = enough
      ? `ตาละ <b>${cost}</b> · มี <b data-st>${number(state ? state.stamina : 0)}</b>/${number(state ? state.max : 0)}`
      : `สตามิน่าไม่พอ (มี <b data-st>${number(state.stamina)}</b> ต้องใช้ ${cost}) → เล่นได้แบบ<b>โหมดซ้อม</b> ไม่ได้รางวัล`;
    return `<div class="fm-st${enough ? '' : ' low'}">${Stamina.icon()}<span>${text}</span><button onclick="staminaOpen()">🍵 เติม</button></div>`;
  }

  // ส่วนเลือกโหมดในหน้าตั้งค่าห้อง (เล่นคนเดียว / ห้องที่เติมบอท)
  function farmSection() {
    if (!dbOn()) return '';
    const state = Stamina.now();
    const cost = (state && state.cost) || Economy.STAMINA.COST;
    const cards = Object.keys(Economy.FARM)
      .map(mode => modeCard(mode, getFarm()))
      .join('');
    return `<h3 class=sec>🎯 ฟาร์มอะไรดี</h3>${staminaLine(state, cost)}<div class=fm>${cards}</div>`;
  }

  // บรรทัดสั้นในห้องรอ/หน้าโหวต: บอกว่ามีบอทจะใช้สตามิน่า + เลือกโหมดฟาร์มได้ (คนที่เข้าห้องทีหลังเห็นตรงนี้)
  function lobbyLine() {
    if (!dbOn()) return 'เล่นได้ แต่ต้องล็อกอินถึงจะได้ของ';
    const current = getFarm();
    const state = Stamina.now();
    const cost = (state && state.cost) || Economy.STAMINA.COST;
    const low = state && state.stamina < cost;
    const chips = Object.keys(Economy.FARM)
      .map(
        mode =>
          `<button class="fm-chip${current === mode ? ' on' : ''}" onclick="farmSet('${mode}')">${escape(Economy.FARM[mode].name)}</button>`
      )
      .join('');
    const status = low
      ? `สตามิน่าไม่พอ (<b data-st>${number(state.stamina)}</b>/${cost}) → โหมดซ้อม`
      : `ใช้สตามิน่า ${cost} · มี <b data-st>${number(state ? state.stamina : 0)}</b>`;
    return `<span class="fm-lob${low ? ' low' : ''}">${Stamina.icon()} ${status} · ฟาร์ม ${chips}</span>`;
  }

  window.Farm = { get: getFarm, section: farmSection, itemsLine, lobbyLine };
})();
