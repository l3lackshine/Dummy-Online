/* stamina.js — สตามิน่า: ป้ายบน HUD · หน้าต่างเติมด้วยชา · นับถอยหลังการฟื้นในเครื่องระหว่างรอรีเฟรช
   ทุกอย่างตัดสินที่ฐานข้อมูล (supabase/v7_stamina.sql) · ไม่ล็อกอิน = ไม่มีสตามิน่า
   - เล่นกับบอท: ใช้สตามิน่าตาละ COST ได้ของตามโหมดฟาร์ม · ไม่พอ = โหมดซ้อม (ไม่ได้รางวัล) · เล่นกับคน: ไม่ใช้สตามิน่า
   Public: Stamina.pill() · Stamina.now() · Stamina.set(info) · Stamina.icon(cssClass) · staminaOpen() · staminaUse(itemId) */
(function () {
  'use strict';
  const Economy = window.Economy;
  const { escape, number, dbOn } = window.UiKit;

  const staminaIcon = cssClass => `<img class="${cssClass || 'st-ic'}" src="./Assets/Item/Mats/stamina.webp" alt="">`;
  const toast = message => {
    if (window.dbToast) dbToast(message);
  };
  const rerender = () => {
    if (typeof render === 'function') render();
  };

  let base = null; // ค่าล่าสุดจากฐานข้อมูล + เวลาที่ได้รับ (ใช้นับฟื้นต่อในเครื่อง)
  let seen = null; // DB.P.stamina ที่ใช้ไปแล้ว (กันตั้งค่าซ้ำ)

  function setInfo(info) {
    if (info && info.stamina != null && info.max != null) base = Object.assign({}, info, { at: Date.now() });
  }

  // สตามิน่าตอนนี้ (คำนวณการฟื้นต่อจากค่าล่าสุด) · ไม่ล็อกอิน/ยังไม่มีข้อมูล = null
  function now() {
    if (!dbOn()) return null;
    if (DB.P.stamina && DB.P.stamina !== seen) {
      seen = DB.P.stamina;
      setInfo(seen);
    }
    if (!base) return null;
    const regenSec = base.regen_sec || Economy.STAMINA.REGEN_SEC;
    const max = base.max;
    const elapsed = (Date.now() - base.at) / 1000;
    let stamina = base.stamina;
    let nextIn = null;
    if (stamina < max && base.next_in != null) {
      if (elapsed >= base.next_in) stamina = Math.min(max, stamina + 1 + Math.floor((elapsed - base.next_in) / regenSec));
      if (stamina < max) {
        const remain = (((base.next_in - elapsed) % regenSec) + regenSec) % regenSec;
        nextIn = Math.ceil(remain || regenSec);
      }
    }
    return {
      stamina,
      max,
      cost: base.cost || Economy.STAMINA.COST,
      nextIn,
      fullIn: stamina >= max ? 0 : (nextIn || 0) + (max - stamina - 1) * regenSec,
    };
  }

  function clock(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours) return `${hours} ชม. ${minutes} นาที`;
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function timeText(state) {
    if (state.stamina > state.max) return 'เกินค่าสูงสุด · หยุดฟื้นชั่วคราว';
    if (state.stamina >= state.max) return '✓ เต็มแล้ว';
    return `+1 ใน ${clock(state.nextIn)} · เต็มใน ${clock(state.fullIn)}`;
  }

  function pill() {
    const state = now();
    if (!state) return '';
    return `<button class="st-pill${state.stamina < state.cost ? ' low' : ''}${state.stamina > state.max ? ' over' : ''}" onclick="staminaOpen()" title="สตามิน่า">${staminaIcon()}<b data-st>${number(state.stamina)}</b><small>/${number(state.max)}</small></button>`;
  }

  const teaIds = () => Items.list().filter(id => Economy.ITEMS[id].stamina);

  function teaRow(id) {
    const info = Items.info(id);
    const have = Items.qty(id);
    return `<div class=st-tea>${Items.icon(id)}<span><b>${escape(info.name)}</b><small>${escape(info.desc)} · มี ${number(have)}</small></span><button class=st-drink ${have ? '' : 'disabled'} onclick="staminaUse('${id}')">ดื่ม</button></div>`;
  }

  function modalHtml() {
    const state = now();
    if (!state) return '';
    const S = Economy.STAMINA;
    return `<div class=st-box><button class=st-x onclick="this.closest('.st-modal').remove()">✕</button>
      <div class=st-head>${staminaIcon('st-big')}<div><small>สตามิน่า</small><b data-st>${number(state.stamina)}</b><em>/ ${number(state.max)}</em></div></div>
      <p class=st-time data-st-time>${timeText(state)}</p>
      <ul class=st-rule><li>เล่นกับบอทใช้ตาละ <b>${state.cost}</b> · ได้ของตามโหมดฟาร์มที่เลือก</li><li>โต๊ะที่มีบอทเติมที่นั่ง (เล่นคนเดียว · ห้องเพื่อนที่เปิดเติมบอท · หาแมตช์แล้วโหวตเติมบอท) <b>ใช้</b> สตามิน่า</li><li>โต๊ะที่เป็นคนจริงทั้งหมด <b>ไม่ใช้</b> สตามิน่า</li>
        <li>ฟื้น 1 ทุก ${Math.round(S.REGEN_SEC / 60)} นาที · ขึ้นเลเวลผู้เล่นแล้วเติมเต็ม · สูงสุดเพิ่ม 20 ทุก ${S.EVERY} เลเวล (สูงสุด ${S.CAP})</li>
        <li>สตามิน่าไม่พอยังเล่นกับบอทได้ เป็นโหมดซ้อม (ไม่ได้รางวัล)</li></ul>
      <h4>ดื่มชาเติมสตามิน่า</h4>${teaIds().map(teaRow).join('')}<small class=st-note>ชาได้จากแบทเทิลพาส · ดื่มเกินค่าสูงสุดได้ (เกินแล้วหยุดฟื้นจนกว่าจะใช้ลง)</small></div>`;
  }

  window.staminaOpen = () => {
    document.querySelectorAll('.st-modal').forEach(n => n.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = modalHtml();
    document.body.appendChild(modal);
  };

  let busy = false;
  window.staminaUse = async itemId => {
    if (busy || !dbOn()) return;
    busy = true;
    try {
      const r = await DB.call('use_item', { p_id: itemId, p_qty: 1 });
      setInfo(r);
      toast(`🍵 ${Items.info(itemId).name} +${number(r.added)} สตามิน่า`);
      await DB.refresh();
    } catch (e) {
      toast(e.message);
    }
    busy = false;
    const modal = document.querySelector('.st-modal');
    if (modal) modal.innerHTML = modalHtml();
    rerender();
  };

  // นับถอยหลังสด (แก้เฉพาะตัวเลข ไม่ render ทั้งหน้า)
  setInterval(() => {
    const state = now();
    if (!state) return;
    const value = number(state.stamina);
    document.querySelectorAll('[data-st]').forEach(n => {
      if (n.textContent !== value) n.textContent = value;
    });
    document.querySelectorAll('[data-st-time]').forEach(n => {
      n.textContent = timeText(state);
    });
  }, 1000);

  // ผลจบตาจากเซิร์ฟเวอร์มีสตามิน่าล่าสุด
  function hookWallet() {
    if (!window.Progress) return setTimeout(hookWallet, 50);
    const onWallet = Progress.onWallet;
    Progress.onWallet = data => {
      if (data && data.stamina != null) setInfo(data);
      return onWallet(data);
    };
  }
  hookWallet();

  window.Stamina = { pill, now, set: setInfo, icon: staminaIcon };
})();
