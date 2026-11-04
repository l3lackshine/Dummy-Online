/* daily-login.js — รางวัลล็อกอินรายวัน (7 วันวน) + โบนัสล็อกอินต่อเนื่อง (โหมดบัญชีเท่านั้น)
   ข้อมูลและการรับรางวัลตัดสินที่ฐานข้อมูล (DB.P.login · DB.claimLogin)
   Public: openDaily(flashText) · closeDaily() · claimDaily() · onDbLogin() (db.js เรียกหลังล็อกอินสำเร็จ) */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const { escape, number } = window.UiKit;

  const OPEN_AFTER_LOGIN_MS = 700; // รอหน้าแรกวาดเสร็จก่อนเด้งหน้าต่างรางวัล

  const rewardHtml = r =>
    [r.coins ? `<i>🪙 ${number(r.coins)}</i>` : '', r.mcash ? `<i class=mc>💎 ${number(r.mcash)}</i>` : ''].join('');
  const loginInfo = () => (DB.P && DB.P.login) || null;

  function dayCell(reward, cycleDay, claimed) {
    const state =
      reward.day < cycleDay || (reward.day === cycleDay && claimed) ? 'past' : reward.day === cycleDay ? 'today' : 'next';
    return `<div class="dl-cell ${state}${reward.day === 7 ? ' big' : ''}"><small>วันที่ ${reward.day}</small><div class=dl-r>${rewardHtml(reward) || '—'}</div>${state === 'past' ? '<span class=dl-ok>✓</span>' : ''}</div>`;
  }

  function milestoneChips(milestones, streak) {
    return milestones
      .map(
        m =>
          `<span class="dl-ms${streak >= m.streak ? ' got' : ''}" title="${escape(m.label)}">${m.streak} วัน ${streak >= m.streak ? '✓' : ''}</span>`
      )
      .join('');
  }

  function dailyHtml(login, flash) {
    const streak = login.streak;
    const milestones = login.milestones || [];
    const next = milestones.find(m => m.streak > streak);
    const nextNote = next
      ? `อีก ${next.streak - streak} วัน ถึง “${escape(next.label)}” รับ ${rewardHtml(next)}`
      : 'คุณรับโบนัสต่อเนื่องครบทุกขั้นแล้ว!';
    const cells = (login.rewards || []).map(r => dayCell(r, login.cycle_day, login.claimed)).join('');
    return `<div class="sk-box dl-box"><button class=q-x onclick="closeDaily()" aria-label="ปิด">✕</button><h3>🎁 รางวัลล็อกอินรายวัน</h3>
      <div class=dl-streak><b>🔥 ${streak}</b> วันติดต่อกัน<small>สถิติสูงสุด ${(DB.P && DB.P.best_streak) || streak} วัน</small></div>
      <div class=dl-grid>${cells}</div>
      ${flash ? `<p class=dl-flash>${flash}</p>` : ''}
      <button class="dl-claim" ${login.claimed ? 'disabled' : ''} onclick="claimDaily()">${login.claimed ? 'รับรางวัลวันนี้แล้ว ✓ — พรุ่งนี้มารับต่อ' : '🎁 รับรางวัลวันนี้'}</button>
      <h4>โบนัสล็อกอินต่อเนื่อง</h4><div class=dl-mss>${milestoneChips(milestones, streak)}</div>
      <small class=dl-note>${nextNote} · ขาดวันเดียว streak จะเริ่มนับ 1 ใหม่ (นับวันตามเวลาไทย)</small></div>`;
  }

  window.openDaily = function (flash) {
    const login = loginInfo();
    if (!login) return;
    let modal = document.querySelector('.dl-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'sk-modal dl-modal';
      modal.onclick = e => {
        if (e.target === modal) closeDaily();
      };
      document.body.appendChild(modal);
    }
    modal.innerHTML = dailyHtml(login, flash);
  };

  window.closeDaily = () => {
    const modal = document.querySelector('.dl-modal');
    if (modal) modal.remove();
  };

  let claiming = false;
  window.claimDaily = async () => {
    if (claiming) return;
    claiming = true;
    try {
      const r = await DB.claimLogin();
      const bonus = r.bonus_coins || r.bonus_mcash ? ` + โบนัส ${r.bonus_label || 'ล็อกอินต่อเนื่อง'}` : '';
      const parts = [
        r.coins + r.bonus_coins ? '🪙 +' + number(r.coins + r.bonus_coins) : '',
        r.mcash + r.bonus_mcash ? '💎 +' + number(r.mcash + r.bonus_mcash) : '',
      ]
        .filter(Boolean)
        .join('  ');
      dbToast('🎁 ' + parts + bonus);
      openDaily('ได้รับ ' + parts + bonus);
    } catch (e) {
      dbToast(e.message);
    } finally {
      claiming = false;
    }
  };

  // ล็อกอินสำเร็จ: ยังไม่ได้รับวันนี้ → เปิดหน้าต่างรางวัล · โหลดเควสใหม่
  window.onDbLogin = () => {
    setTimeout(() => {
      const login = loginInfo();
      if (login && !login.claimed) openDaily();
      if (window.dummyQuests && dummyQuests.reload) dummyQuests.reload();
    }, OPEN_AFTER_LOGIN_MS);
  };
})();
