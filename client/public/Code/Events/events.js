/* events.js — หน้าต่างอีเวนต์ฝั่งผู้เล่น: อีเวนต์ที่กำลังจัด · รูปแบนเนอร์ · เวลาที่เหลือ · เควสอีเวนต์ + ปุ่มรับรางวัล · ปุ่มไปตู้กาชาของอีเวนต์
   ข้อมูลจากฐานข้อมูล (supabase/v17_events_admin.sql: get_events / claim_event_quest) — ฐานข้อมูลตัดสินว่าทำครบหรือยัง ไฟล์นี้แสดงผลอย่างเดียว
   รายละเอียดอีเวนต์ทั้งหมดแอดมินตั้งในเกม (Code/Admin/admin.js) ไม่ต้องแก้ไฟล์นี้
   Public: evOpen() · evClaim(questId) · evGoBanner(bannerId) · Events.count() (เควสที่รับได้ ใช้ขึ้นจุดแดง) · Events.hasAny() · Events.refresh()
   EXTEND: ชนิดรางวัลใหม่ = เพิ่มใน rewardText() */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const REFRESH_MS = 60000; // อ่านข้อมูลอีเวนต์ใหม่อย่างมากนาทีละครั้ง (หน้าแรกถามจำนวนจุดแดงบ่อย)
  const MS_PER_MINUTE = 60000;
  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 1440;

  let data = null; // ผลล่าสุดจาก get_events
  let loadedAt = 0;
  let loading = false;
  let failed = false;
  let busyId = null;

  async function load() {
    if (loading || !dbOn()) return;
    loading = true;
    const before = count();
    try {
      data = await DB.call('get_events', {});
      failed = false;
    } catch (e) {
      data = null;
      failed = true; // ฐานข้อมูลยังไม่มี v17 → ซ่อนปุ่ม หน้าต่างบอกให้รออัปเดต
    }
    loadedAt = Date.now();
    loading = false;
    repaint();
    if (count() !== before && typeof render === 'function' && typeof screen !== 'undefined' && screen === 'home') render();
  }

  function refreshIfOld() {
    if (dbOn() && Date.now() - loadedAt > REFRESH_MS) setTimeout(load, 0);
  }

  function allQuests() {
    if (!data || !Array.isArray(data.events)) return [];
    return data.events.reduce((list, event) => list.concat(event.quests || []), []);
  }

  const readyToClaim = quest => !quest.claimed && quest.progress >= quest.target;

  function count() {
    refreshIfOld();
    return allQuests().filter(readyToClaim).length;
  }

  function hasAny() {
    refreshIfOld();
    return !!(data && data.events && data.events.length);
  }

  // ---------- ข้อความ ----------
  function timeLeftText(iso) {
    const minutes = Math.max(0, (new Date(iso) - Date.now()) / MS_PER_MINUTE);
    if (minutes >= MINUTES_PER_DAY) {
      const days = Math.floor(minutes / MINUTES_PER_DAY);
      const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
      return `เหลือ ${days} วัน ${hours} ชม.`;
    }
    if (minutes >= MINUTES_PER_HOUR) return `เหลือ ${Math.floor(minutes / MINUTES_PER_HOUR)} ชม.`;
    return `เหลือ ${Math.ceil(minutes)} นาที`;
  }

  function itemName(itemId) {
    const info = window.Economy && Economy.ITEMS ? Economy.ITEMS[itemId] : null;
    return (info && info.name) || itemId;
  }

  function rewardText(quest) {
    const parts = [];
    if (quest.reward_coins) parts.push('🪙 ' + number(quest.reward_coins));
    if (quest.reward_mcash) parts.push('💎 ' + number(quest.reward_mcash));
    if (quest.reward_bp) parts.push('EXP พาส ' + number(quest.reward_bp));
    Object.keys(quest.reward_items || {}).forEach(itemId => {
      parts.push(itemName(itemId) + ' ×' + number(quest.reward_items[itemId]));
    });
    return parts.join(' · ');
  }

  // ---------- ชิ้นส่วนหน้าต่าง ----------
  function claimButtonHtml(quest) {
    if (quest.claimed) return '<span class=ev-done>รับแล้ว ✓</span>';
    if (!readyToClaim(quest)) return '';
    const busy = busyId === quest.id ? ' disabled' : '';
    return `<button class="wbtn go ev-get" onclick="evClaim('${escape(quest.id)}')"${busy}>รับ</button>`;
  }

  function questHtml(quest) {
    const shown = Math.min(quest.progress, quest.target);
    const percent = Math.round((shown / quest.target) * 100);
    const modeTag = quest.mode === 'daily' ? '<span class=ev-tag>รายวัน</span>' : '';
    return `<div class="ev-q${readyToClaim(quest) ? ' ready' : ''}${quest.claimed ? ' done' : ''}">
      <span class=ev-ic>${escape(quest.icon)}</span>
      <span class=ev-tx>
        <b>${escape(quest.name)}${modeTag}</b>
        ${quest.description ? `<small>${escape(quest.description)}</small>` : ''}
        <span class=ev-bar><u style="width:${percent}%"></u><em>${number(shown)}/${number(quest.target)}</em></span>
        <span class=ev-rw>${escape(rewardText(quest))}</span>
      </span>
      <span class=ev-act>${claimButtonHtml(quest)}</span>
    </div>`;
  }

  function bannerButtonsHtml(event) {
    return (event.banners || [])
      .map(banner => `<button class="wbtn ev-gacha" onclick="evGoBanner('${escape(banner.id)}')">🎰 ${escape(banner.name)}</button>`)
      .join('');
  }

  function eventHtml(event) {
    const image = event.banner_url ? `<img class=ev-img src="${escape(event.banner_url)}" alt="" loading="lazy">` : '';
    const quests = event.quests || [];
    return `<section class=ev-card>
      ${image}
      <div class=ev-head>
        <b>${escape(event.name)}</b>
        <small>⏳ ${escape(timeLeftText(event.ends_at))}</small>
      </div>
      ${event.description ? `<p class=ev-desc>${escape(event.description)}</p>` : ''}
      ${bannerButtonsHtml(event) ? `<div class=ev-links>${bannerButtonsHtml(event)}</div>` : ''}
      <div class=ev-qs>${quests.map(questHtml).join('') || '<p class=ev-empty>อีเวนต์นี้ไม่มีเควส</p>'}</div>
    </section>`;
  }

  function boxHtml() {
    const head = `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=ev-h>🎉 อีเวนต์</h3>`;
    if (failed) return head + '<p class=ev-empty>ยังเปิดอีเวนต์ไม่ได้ — รอการอัปเดตฐานข้อมูล</p>';
    if (!data) return head + '<p class=ev-empty>กำลังโหลด…</p>';
    if (!data.events.length) return head + '<p class=ev-empty>ตอนนี้ยังไม่มีอีเวนต์ — รอติดตามเร็ว ๆ นี้</p>';
    return head + `<div class=ev-list>${data.events.map(eventHtml).join('')}</div>`;
  }

  function repaint() {
    const box = document.querySelector('.ev-modal .st-box');
    if (!box) return;
    const list = box.querySelector('.ev-list');
    const scroll = list ? list.scrollTop : 0;
    box.innerHTML = boxHtml();
    const fresh = box.querySelector('.ev-list');
    if (fresh) fresh.scrollTop = scroll; // กดรับแล้วรายการไม่เด้งกลับขึ้นบนสุด
  }

  function replaceQuest(quest) {
    if (!data || !quest) return;
    data.events.forEach(event => {
      event.quests = (event.quests || []).map(old => (old.id === quest.id ? quest : old));
    });
  }

  // ---------- คำสั่งจากหน้าจอ ----------
  window.evOpen = () => {
    if (!dbOn()) return;
    document.querySelectorAll('.ev-modal').forEach(node => node.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal ev-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box ev-box">${boxHtml()}</div>`;
    document.body.appendChild(modal);
    load(); // โหลดใหม่ทุกครั้งที่เปิด จะได้เห็นความคืบหน้าล่าสุด
  };

  window.evClaim = async questId => {
    if (busyId) return;
    busyId = questId;
    repaint();
    try {
      const result = await DB.call('claim_event_quest', { p_id: questId });
      replaceQuest(result.quest);
      if (window.dbToast) dbToast('🎉 ได้รับ ' + rewardText(result.quest));
      if (DB.refresh) DB.refresh().catch(() => {}); // ยอดเหรียญ/เพชรที่แถบด้านบน + คลังไอเทม
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'รับรางวัลไม่สำเร็จ');
    }
    busyId = null;
    repaint();
    if (typeof render === 'function' && typeof screen !== 'undefined' && screen === 'home') render();
  };

  window.evGoBanner = bannerId => {
    document.querySelectorAll('.ev-modal').forEach(node => node.remove());
    if (typeof go === 'function') go('shop');
    if (typeof window.gcBanner === 'function') gcBanner(bannerId);
  };

  window.Events = { count, hasAny, refresh: load };
})();
