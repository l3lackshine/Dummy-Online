/* mail.js — กล่องจดหมายฝั่งผู้เล่น: จดหมายจากทีมงาน (ประกาศ / ของชดเชย / ของขวัญ) · กดรับของทีละฉบับหรือรับทั้งหมด
   ข้อมูลจากฐานข้อมูล (supabase/v18_admin_tools.sql: get_mail / claim_mail / claim_all_mail) — ฐานข้อมูลตัดสินว่ารับได้ไหม ไฟล์นี้แสดงผลอย่างเดียว
   จดหมายส่งจากหน้าแอดมิน (Code/Admin/admin.js แท็บจดหมาย)
   Public: mailOpen() · mailClaim(id) · mailClaimAll() · Mail.count() (ฉบับที่ยังไม่รับ ใช้ขึ้นจุดแดง) · Mail.refresh()
   EXTEND: ชนิดรางวัลใหม่ = เพิ่มใน rewardText() */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const REFRESH_MS = 60000; // อ่านกล่องจดหมายใหม่อย่างมากนาทีละครั้ง (หน้าแรกถามจำนวนจุดแดงบ่อย)
  const MS_PER_DAY = 86400000;

  let data = null; // ผลล่าสุดจาก get_mail
  let loadedAt = 0;
  let loading = false;
  let failed = false;
  let busy = false;

  async function load() {
    if (loading || !dbOn()) return;
    loading = true;
    const before = count();
    try {
      data = await DB.call('get_mail', {});
      failed = false;
    } catch (e) {
      data = null;
      failed = true; // ฐานข้อมูลยังไม่มี v18 → จุดแดงเป็น 0 หน้าต่างบอกให้รออัปเดต
    }
    loadedAt = Date.now();
    loading = false;
    repaint();
    if (count() !== before) rerenderHome();
  }

  function rerenderHome() {
    if (typeof render === 'function' && typeof screen !== 'undefined' && screen === 'home') render();
  }

  function refreshIfOld() {
    if (dbOn() && Date.now() - loadedAt > REFRESH_MS) setTimeout(load, 0);
  }

  function count() {
    refreshIfOld();
    return data ? Number(data.unclaimed) || 0 : 0;
  }

  // ---------- ข้อความ ----------
  function itemName(itemId) {
    const info = window.Economy && Economy.ITEMS ? Economy.ITEMS[itemId] : null;
    return (info && info.name) || itemId;
  }

  function rewardText(reward) {
    const parts = [];
    if (Number(reward.coins || reward.reward_coins)) parts.push('🪙 ' + number(reward.coins || reward.reward_coins));
    if (Number(reward.mcash || reward.reward_mcash)) parts.push('💎 ' + number(reward.mcash || reward.reward_mcash));
    const items = reward.items || reward.reward_items || {};
    Object.keys(items).forEach(itemId => {
      parts.push(itemName(itemId) + ' ×' + number(items[itemId]));
    });
    return parts.join(' · ');
  }

  function dateText(iso) {
    return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }

  function expiryText(iso) {
    const days = Math.ceil((new Date(iso) - Date.now()) / MS_PER_DAY);
    return days <= 1 ? 'หมดอายุวันนี้' : `หมดอายุใน ${days} วัน`;
  }

  // ---------- ชิ้นส่วนหน้าต่าง ----------
  function actionHtml(mail, rewards) {
    if (mail.claimed) return `<span class=ml-done>${rewards ? 'รับแล้ว ✓' : 'อ่านแล้ว ✓'}</span>`;
    const label = rewards ? 'รับ' : 'รับทราบ';
    return `<button class="wbtn go ml-get" onclick="mailClaim(${Number(mail.id)})"${busy ? ' disabled' : ''}>${label}</button>`;
  }

  function mailHtml(mail) {
    const rewards = rewardText(mail);
    return `<div class="ml-m${mail.claimed ? ' done' : ' new'}">
      <span class=ml-ic>${rewards ? '🎁' : '✉️'}</span>
      <span class=ml-tx>
        <b>${escape(mail.title)}</b>
        <small>${escape(dateText(mail.created_at))} · ${escape(expiryText(mail.expires_at))}</small>
        ${mail.body ? `<p>${escape(mail.body)}</p>` : ''}
        ${rewards ? `<span class=ml-rw>${escape(rewards)}</span>` : ''}
      </span>
      <span class=ml-act>${actionHtml(mail, rewards)}</span>
    </div>`;
  }

  function boxHtml() {
    const unclaimed = count();
    const claimAll = unclaimed > 1 ? `<button class="wbtn go ml-all" onclick="mailClaimAll()"${busy ? ' disabled' : ''}>รับทั้งหมด (${unclaimed})</button>` : '';
    const head = `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=ml-h>📮 จดหมาย ${claimAll}</h3>`;
    if (failed) return head + '<p class=ml-empty>ยังเปิดกล่องจดหมายไม่ได้ — รอการอัปเดตฐานข้อมูล</p>';
    if (!data) return head + '<p class=ml-empty>กำลังโหลด…</p>';
    if (!data.mails.length) return head + '<p class=ml-empty>ยังไม่มีจดหมาย</p>';
    return head + `<div class=ml-list>${data.mails.map(mailHtml).join('')}</div>`;
  }

  function repaint() {
    const box = document.querySelector('.ml-modal .st-box');
    if (!box) return;
    const list = box.querySelector('.ml-list');
    const scroll = list ? list.scrollTop : 0;
    box.innerHTML = boxHtml();
    const fresh = box.querySelector('.ml-list');
    if (fresh) fresh.scrollTop = scroll; // กดรับแล้วรายการไม่เด้งกลับขึ้นบนสุด
  }

  function replaceMail(mail) {
    if (!data || !mail) return;
    data.mails = data.mails.map(old => (old.id === mail.id ? mail : old));
    data.unclaimed = data.mails.filter(m => !m.claimed).length;
  }

  // หลังรับของ: อัปเดตยอดเหรียญ/เพชรที่แถบด้านบน + คลังไอเทม + จุดแดงหน้าแรก
  function afterClaim() {
    if (DB.refresh) DB.refresh().catch(() => {});
    rerenderHome();
  }

  // ---------- คำสั่งจากหน้าจอ ----------
  window.mailOpen = () => {
    if (!dbOn()) return;
    document.querySelectorAll('.ml-modal').forEach(node => node.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal ml-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box ml-box">${boxHtml()}</div>`;
    document.body.appendChild(modal);
    load(); // โหลดใหม่ทุกครั้งที่เปิด จะได้เห็นจดหมายล่าสุด
  };

  window.mailClaim = async mailId => {
    if (busy) return;
    busy = true;
    repaint();
    try {
      const result = await DB.call('claim_mail', { p_id: mailId });
      replaceMail(result.mail);
      const rewards = rewardText(result);
      if (window.dbToast) dbToast(rewards ? '🎁 ได้รับ ' + rewards : '✉️ อ่านแล้ว');
      afterClaim();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'รับจดหมายไม่สำเร็จ');
      load(); // จดหมายอาจหมดอายุหรือถูกถอน → โหลดรายการใหม่
    }
    busy = false;
    repaint();
  };

  window.mailClaimAll = async () => {
    if (busy) return;
    busy = true;
    repaint();
    try {
      const result = await DB.call('claim_all_mail', {});
      const rewards = rewardText(result);
      if (window.dbToast) dbToast(`📮 รับ ${number(result.count)} ฉบับ${rewards ? ' · ' + rewards : ''}`);
      afterClaim();
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'รับจดหมายไม่สำเร็จ');
    }
    busy = false;
    await load();
  };

  window.Mail = { count, refresh: load };
})();
