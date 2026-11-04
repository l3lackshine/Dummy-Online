/* quests-account.js — เควสรายวัน/รายสัปดาห์ของโหมดบัญชี (ความคืบหน้า/รางวัลตัดสินที่ฐานข้อมูล)
   ไม่ล็อกอิน = ใช้ Code/Quests/quests-local.js แทน (ไฟล์นี้ไม่ทำอะไร)
   Public: openQuests(tab 'd'|'w') · closeQuests() · qClaim(id) · qBonus(kind) · dummyQuests.reload() · dummyQuests.claimable()
   EXTEND: เควสใหม่เพิ่มที่ฐานข้อมูล (quest_defs) ไม่ต้องแก้ไฟล์นี้ */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const { escape, number } = window.UiKit;

  const RELOAD_EVERY_MS = 90000; // โหลดเควสใหม่เป็นระยะ (ความคืบหน้าจากเกมที่เล่นในเครื่องอื่น)

  let quests = null;
  let currentTab = 'd';
  let modalOpen = false;
  const kindOf = tab => (tab === 'w' ? 'weekly' : 'daily');

  async function loadQuests() {
    try {
      quests = await DB.quests();
      if (window.HudButtons) HudButtons.paint();
      if (modalOpen) drawQuests();
    } catch (e) {
      /* เซสชันหมดอายุ ฯลฯ ไม่ต้องแจ้ง */
    }
  }

  // จำนวนรางวัลที่กดรับได้ (เควสที่ทำครบ + โบนัสที่พร้อม) — ใช้ทำป้ายแจ้งเตือน
  function claimable() {
    if (!quests) return 0;
    let count = 0;
    for (const kind of ['daily', 'weekly']) {
      const block = quests[kind];
      (block.quests || []).forEach(q => {
        if (q.progress >= q.target && !q.claimed) count++;
      });
      if (block.bonus && block.bonus.ready) count++;
    }
    return count;
  }

  function rewardText(q) {
    return [
      q.reward_coins ? '🪙 ' + number(q.reward_coins) : '',
      q.reward_mcash ? '💎 ' + number(q.reward_mcash) : '',
      q.points ? '🎯' + q.points : '',
      q.reward_bp ? '🎖 ' + number(q.reward_bp) : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  function questRow(q) {
    const done = q.progress >= q.target;
    const percent = Math.min(100, Math.floor((q.progress / q.target) * 100));
    const button = q.claimed
      ? '<span class="q-btn got">รับแล้ว ✓</span>'
      : `<button class="q-btn${done ? ' go' : ''}" ${done ? '' : 'disabled'} onclick="qClaim('${escape(q.id)}')">${rewardText(q)}</button>`;
    return `<div class="q-row${done ? ' done' : ''}${q.claimed ? ' got' : ''}"><div class=q-ic>${escape(q.icon)}</div><div class=q-mid><b>${escape(q.name)}</b><small>${escape(q.description)}</small><div class=q-bar><i style="width:${percent}%"></i></div><small class=q-num>${q.progress} / ${q.target}</small></div>${button}</div>`;
  }

  function bonusButton(kind, bonus) {
    if (bonus.claimed) return '<span class="q-btn got">รับแล้ว ✓</span>';
    const text = [
      '🪙 ' + number(bonus.coins),
      bonus.mcash ? '💎 ' + number(bonus.mcash) : '',
      bonus.bp ? '🎖 ' + number(bonus.bp) : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<button class="q-btn${bonus.ready ? ' go' : ''}" ${bonus.ready ? '' : 'disabled'} onclick="qBonus('${kind}')">${text}</button>`;
  }

  // แต้มกิจกรรมรายวัน (ครบ 100 = รับโบนัส: เหรียญ + เพชร + EXP แบทเทิลพาส)
  function activityBar(kind, block) {
    if (kind !== 'daily' || !block.points_max) return '';
    const percent = Math.min(100, Math.round((block.points / block.points_max) * 100));
    return `<div class=q-act><b>🎯 แต้มกิจกรรม ${number(block.points)}/${number(block.points_max)}</b><i><u style="width:${percent}%"></u></i><small>ครบแล้วรับโบนัสด้านล่าง · 🎖 = EXP แบทเทิลพาส</small></div>`;
  }

  function drawQuests() {
    const modal = document.querySelector('.q-modal');
    if (!modal) return;
    if (!quests) {
      modal.innerHTML =
        '<div class=sk-box><button class=q-x onclick="closeQuests()">✕</button><h3>📜 เควส</h3><p class=au-load>⏳ กำลังโหลด...</p></div>';
      return;
    }
    const kind = kindOf(currentTab);
    const block = quests[kind];
    const list = block.quests || [];
    const claimedCount = list.filter(q => q.claimed).length;
    const daily = kind === 'daily';
    modal.innerHTML = `<div class=sk-box><button class=q-x onclick="closeQuests()" aria-label="ปิด">✕</button><h3>📜 เควส <span class=sk-coin>🪙 ${number(sv.coins)}</span></h3>
      <div class=q-tabs><button class="q-tab${daily ? ' on' : ''}" onclick="openQuests('d')">รายวัน</button><button class="q-tab${!daily ? ' on' : ''}" onclick="openQuests('w')">รายสัปดาห์</button></div>
      <div class=q-left id=qLeft>⏰ ${resetText()}</div>${activityBar(kind, block)}${list.map(questRow).join('')}
      <div class="q-row q-bonus${block.bonus.claimed ? ' got' : ''}"><div class=q-ic>🎁</div><div class=q-mid><b>${daily ? 'โบนัสกิจกรรมครบ 100' : 'โบนัสครบทุกเควส'}</b><small>รับรางวัลครบทุกเควสของ${daily ? 'วันนี้' : 'สัปดาห์นี้'}</small><small class=q-num>${claimedCount} / ${list.length}</small></div>${bonusButton(kind, block.bonus)}</div>
      <small class=q-note>รีเซ็ตรายวันทุกเที่ยงคืน · รายสัปดาห์ทุกวันจันทร์ (เวลาไทย) · ความคืบหน้านับจากผลเกมที่บันทึกบนเซิร์ฟเวอร์</small></div>`;
  }

  const pad = n => String(n).padStart(2, '0');
  function formatLeft(ms) {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days) return days + ' วัน ' + hours + ' ชม.';
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds % 60);
  }

  function resetText() {
    if (!quests) return '';
    const resetAt = new Date(quests[kindOf(currentTab)].resets_at).getTime();
    return 'รีเซ็ตใน ' + formatLeft(resetAt - Date.now());
  }

  window.openQuests = function (tab) {
    if (tab === 'd' || tab === 'w') currentTab = tab;
    modalOpen = true;
    let modal = document.querySelector('.q-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'sk-modal q-modal';
      modal.onclick = e => {
        if (e.target === modal) closeQuests();
      };
      document.body.appendChild(modal);
    }
    drawQuests();
    if (!tab || !quests) loadQuests();
  };

  window.closeQuests = () => {
    modalOpen = false;
    const modal = document.querySelector('.q-modal');
    if (modal) modal.remove();
  };

  window.qClaim = async id => {
    try {
      const r = await DB.claimQuest(id);
      dbToast(
        '🪙 +' +
          number(r.coins) +
          (r.mcash ? '  💎 +' + number(r.mcash) : '') +
          (r.points ? '  🎯+' + r.points : '') +
          (r.bp ? '  🎖 +' + number(r.bp) : '')
      );
    } catch (e) {
      dbToast(e.message);
    }
    loadQuests();
  };

  window.qBonus = async kind => {
    try {
      const r = await DB.claimBonus(kind);
      dbToast(
        '🎁 โบนัส +' +
          number(r.coins) +
          ' 🪙' +
          (r.mcash ? '  +' + number(r.mcash) + ' 💎' : '') +
          (r.bp ? '  +' + number(r.bp) + ' EXP แบทเทิลพาส' : '') +
          (r.vacation_used ? ' (🏖️ ใช้ตั๋วพักร้อน ×2)' : '')
      );
    } catch (e) {
      dbToast(e.message);
    }
    loadQuests();
  };

  window.dummyQuests = { reload: loadQuests, claimable };

  // นับถอยหลังเวลารีเซ็ตในหน้าต่าง · ถึงเวลาแล้วโหลดเควสชุดใหม่
  setInterval(() => {
    try {
      const label = document.getElementById('qLeft');
      if (!label || !quests) return;
      label.textContent = '⏰ ' + resetText();
      if (new Date(quests[kindOf(currentTab)].resets_at) <= Date.now()) loadQuests();
    } catch (e) {}
  }, 1000);

  setInterval(() => {
    if (DB.user && !document.hidden) loadQuests();
  }, RELOAD_EVERY_MS);

  // กลับมาที่แอป (นอกโต๊ะเล่น): บันทึกการล็อกอินของวันนี้ แล้วโหลดใหม่
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !DB.user || (typeof screen !== 'undefined' && screen === 'game')) return;
    DB.call('record_login')
      .then(() => DB.refresh())
      .then(loadQuests)
      .catch(() => {});
  });

  // ข้อมูลบัญชีโหลดใหม่ (ซื้อ/รับของ ฯลฯ) → เควสอาจคืบหน้า
  const refreshProfile = DB.refresh;
  DB.refresh = async function () {
    const result = await refreshProfile.apply(this, arguments);
    loadQuests();
    return result;
  };
})();
