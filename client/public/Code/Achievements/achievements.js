/* achievements.js — หน้าต่างความสำเร็จ: แท็บตามหมวด (ทั่วไป + 5 เกม) · ความคืบหน้า · เหรียญ 3 ขั้น · กดรับฉายา + รางวัล
   ข้อมูลจากฐานข้อมูล (supabase/v14_achievements.sql: get_achievements / claim_achievement) · ชื่อหมวดจาก skin/achievements.json
   ฐานข้อมูลเป็นคนตัดสินว่าทำครบหรือยัง — ไฟล์นี้แสดงผลอย่างเดียว · ฉายาที่ได้ไปปักบนบัตรโปรไฟล์ได้ทันที
   Public: achOpen(groupId?) · achClaim(id) · achTab(groupId) · Achievements.count() (ขั้นที่พร้อมรับ ใช้ขึ้นจุดแดง) · Achievements.refresh()
   EXTEND: หมวดใหม่ = เพิ่มใน groups ของ skin/achievements.json · ความสำเร็จใหม่ = เพิ่มใน list แล้วรัน node scripts/gen-achievements-sql.js */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const REFRESH_MS = 60000; // อ่านจำนวนที่พร้อมรับใหม่อย่างมากนาทีละครั้ง (ไม่ยิงฐานข้อมูลทุกครั้งที่วาดหน้าแรก)
  const RANK_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'];
  const MEDAL_CLASS = { 1: 'bronze', 2: 'silver', 3: 'gold' };
  const DEFAULT_GROUPS = [{ id: 'general', name: 'ทั่วไป', icon: '⭐' }];

  let groups = DEFAULT_GROUPS;
  let data = null; // ผลล่าสุดจาก get_achievements
  let loadedAt = 0;
  let loading = false;
  let openGroup = 'general';
  let busyId = null;

  fetch('./skin/achievements.json')
    .then(r => (r.ok ? r.json() : null))
    .then(json => {
      if (json && Array.isArray(json.groups) && json.groups.length) groups = json.groups;
    })
    .catch(() => {});

  async function load() {
    if (loading || !dbOn()) return;
    loading = true;
    const before = count();
    try {
      data = await DB.call('get_achievements', {});
    } catch (e) {
      data = null; // ฐานข้อมูลยังไม่มี v14 → ซ่อนปุ่มจุดแดง หน้าต่างบอกให้รออัปเดต
    }
    loadedAt = Date.now();
    loading = false;
    repaint();
    if (count() !== before && typeof render === 'function' && typeof screen !== 'undefined' && screen === 'home') render();
  }

  function count() {
    if (dbOn() && Date.now() - loadedAt > REFRESH_MS) setTimeout(load, 0);
    return data ? Number(data.ready) || 0 : 0;
  }

  // ---------- ชิ้นส่วนของรายการ ----------
  const nextTier = row => (row.tiers || [])[row.claimed] || null;
  const readyToClaim = row => {
    const tier = nextTier(row);
    return !!tier && row.progress >= tier.target;
  };

  function describe(row, tier) {
    const target = tier ? tier.target : (row.tiers[row.tiers.length - 1] || {}).target;
    const rank = RANK_NAMES[target] || target;
    return String(row.desc || '')
      .replace('{n}', number(target || 0))
      .replace('{rank}', rank);
  }

  function medalsHtml(row) {
    return (row.tiers || [])
      .map(tier => {
        const got = tier.tier <= row.claimed;
        const css = 'ach-md ' + MEDAL_CLASS[tier.level] + (got ? ' got' : '');
        return `<i class="${css}" title="${escape(tier.title)}"></i>`;
      })
      .join('');
  }

  function rewardText(tier) {
    const parts = [];
    if (tier.coins) parts.push('🪙 ' + number(tier.coins));
    if (tier.mcash) parts.push('💎 ' + number(tier.mcash));
    return parts.join(' · ');
  }

  function buttonHtml(row, tier) {
    if (!tier) return '<span class=ach-done>ครบแล้ว ✓</span>';
    if (!readyToClaim(row)) return `<span class=ach-rw>${rewardText(tier)}</span>`;
    const busy = busyId === row.id ? ' disabled' : '';
    return `<button class="wbtn go ach-get" onclick="achClaim('${escape(row.id)}')"${busy}>รับ<small>${rewardText(tier)}</small></button>`;
  }

  function rowHtml(row) {
    const tier = nextTier(row);
    const target = tier ? tier.target : (row.tiers[row.tiers.length - 1] || {}).target || 1;
    const shown = Math.min(row.progress, target);
    const percent = Math.round((shown / target) * 100);
    const lastTitle = row.claimed ? row.tiers[row.claimed - 1].title : '';
    return `<div class="ach-row${readyToClaim(row) ? ' ready' : ''}${tier ? '' : ' done'}">
      <span class=ach-ic>${escape(row.icon)}</span>
      <span class=ach-tx><b>${escape(row.name)}</b><small>${escape(describe(row, tier))}</small>
        <span class=ach-bar><u style="width:${percent}%"></u><em>${number(shown)}/${number(target)}</em></span>
        ${lastTitle ? `<span class=ach-tt>ฉายา: ${escape(lastTitle)}</span>` : tier ? `<span class=ach-tt>ฉายาถัดไป: ${escape(tier.title)}</span>` : ''}</span>
      <span class=ach-mds>${medalsHtml(row)}</span>
      <span class=ach-act>${buttonHtml(row, tier)}</span>
    </div>`;
  }

  function tabsHtml(list) {
    return groups
      .map(group => {
        const ready = list.filter(row => row.group === group.id && readyToClaim(row)).length;
        const on = group.id === openGroup ? ' on' : '';
        return `<button class="ach-tab${on}" onclick="achTab('${escape(group.id)}')">${escape(group.icon || '')} ${escape(group.name)}${ready ? `<em>${ready}</em>` : ''}</button>`;
      })
      .join('');
  }

  function summaryHtml(list) {
    const all = list.reduce((sum, row) => sum + row.tiers.length, 0);
    const got = list.reduce((sum, row) => sum + row.claimed, 0);
    return `<p class=ach-sum>รับแล้ว <b>${number(got)}</b> / ${number(all)} ขั้น · ฉายาที่ได้ไปปักโชว์บนบัตรโปรไฟล์ได้ (แก้ไขบัตร → เหรียญเกียรติยศ)</p>`;
  }

  function boxHtml() {
    const head = `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=ach-h>🏅 ความสำเร็จ</h3>`;
    if (!data) return head + `<p class=ach-empty>${loading ? 'กำลังโหลด…' : 'ยังเปิดความสำเร็จไม่ได้ — รอการอัปเดตฐานข้อมูล'}</p>`;
    const list = data.list || [];
    const rows = list.filter(row => row.group === openGroup);
    const sorted = rows.slice().sort((a, b) => Number(readyToClaim(b)) - Number(readyToClaim(a)) || Number(!nextTier(a)) - Number(!nextTier(b)));
    return `${head}${summaryHtml(list)}<div class=ach-tabs>${tabsHtml(list)}</div>
      <div class=ach-list>${sorted.map(rowHtml).join('') || '<p class=ach-empty>ยังไม่มีความสำเร็จในหมวดนี้</p>'}</div>`;
  }

  function repaint() {
    const box = document.querySelector('.ach-modal .st-box');
    if (!box) return;
    const list = box.querySelector('.ach-list');
    const scroll = list ? list.scrollTop : 0;
    box.innerHTML = boxHtml();
    const fresh = box.querySelector('.ach-list');
    if (fresh) fresh.scrollTop = scroll; // กดรับแล้วรายการไม่เด้งกลับขึ้นบนสุด
  }

  // ---------- คำสั่งจากหน้าจอ ----------
  window.achOpen = groupId => {
    if (!dbOn()) return;
    if (groupId) openGroup = groupId;
    document.querySelectorAll('.ach-modal').forEach(n => n.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal ach-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box ach-box">${boxHtml()}</div>`;
    document.body.appendChild(modal);
    load();
  };

  window.achTab = groupId => {
    openGroup = groupId;
    repaint();
    const list = document.querySelector('.ach-modal .ach-list');
    if (list) list.scrollTop = 0;
  };

  function replaceRow(row) {
    if (!data || !row) return;
    data.list = data.list.map(old => (old.id === row.id ? row : old));
    data.ready = data.list.reduce((sum, item) => sum + item.tiers.filter(t => t.tier > item.claimed && item.progress >= t.target).length, 0);
  }

  window.achClaim = async id => {
    if (busyId) return;
    busyId = id;
    repaint();
    try {
      const result = await DB.call('claim_achievement', { p_id: id });
      replaceRow(result.row);
      const reward = rewardText(result);
      if (window.dbToast) dbToast('🏅 ได้ฉายา "' + result.title + '"' + (reward ? ' · ' + reward : ''));
      if (window.ProfileCard) ProfileCard.refresh(); // บัตรโปรไฟล์โหลดใหม่ จะได้เห็นฉายาใหม่ในรายการเหรียญ
      if (DB.refresh) DB.refresh().catch(() => {}); // ยอดเหรียญ/เพชรที่แถบด้านบน
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'รับรางวัลไม่สำเร็จ');
    }
    busyId = null;
    repaint();
  };

  window.Achievements = { count, refresh: load };
})();
