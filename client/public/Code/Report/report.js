/* report.js — รายงานผู้เล่น: แตะป้ายชื่อ/ช่องที่นั่งของผู้เล่นบนโต๊ะ หรือปุ่ม 🚩 ในหน้าสรุปผลจบตา → เลือกเหตุผล → ส่ง
   ส่งผ่านเซิร์ฟเวอร์เกม (event player:report · server/src/events/report-events.js) เพราะมีแต่เซิร์ฟเวอร์ที่รู้ว่าใครนั่งที่ไหน
   — ไฟล์นี้ส่งแค่เลขที่นั่ง ไม่รู้ id บัญชีของคนอื่น · แอดมินดูรายงานได้ที่หน้าแอดมิน แท็บรายงาน
   รายงานได้เฉพาะตอนล็อกอินบัญชี · บอทและตัวเองรายงานไม่ได้
   Public: reportOpen(seat) · reportSend() · Report.button(seat) (ปุ่มในหน้าสรุปผล Code/Table/result.js)
   EXTEND: เหตุผลใหม่ = เพิ่มใน REASONS + REPORT_REASONS ฝั่งเซิร์ฟเวอร์ + check ของ reports.reason (SQL) */
(function () {
  'use strict';
  const { escape, dbOn } = window.UiKit;

  const REASONS = [
    ['name', 'ชื่อ / ข้อความไม่เหมาะสม'],
    ['spam', 'ก่อกวน / สแปมอีโมต'],
    ['cheat', 'สงสัยโกง'],
    ['afk', 'ออกกลางเกม / ถ่วงเวลา'],
  ];
  const NOTE_MAX = 300;
  const REPLY_TIMEOUT_MS = 8000; // เซิร์ฟเวอร์ไม่ตอบ (หลุด/หลับ) → ปลดปุ่มให้กดใหม่ได้
  // ส่วนบนโต๊ะที่แตะแล้วเปิดหน้ารายงาน: ป้ายชื่อ · ช่องพื้นหลังที่นั่ง (gamegx.js) · กล่องผู้เล่นแบบเดิม (games.js)
  const SEAT_SELECTOR = '.gx-seat[data-seat], .gx-sb[data-seat], .pl[data-seat]';

  let openSeat = null;
  let busy = false;

  const gameState = () => (typeof S !== 'undefined' && S ? S : null);
  const socketReady = () => typeof sock !== 'undefined' && sock && sock.connected;

  function toast(text) {
    if (window.dbToast) dbToast(text);
  }

  // ที่นั่งนี้รายงานได้ไหม (ฝั่งเซิร์ฟเวอร์ตรวจซ้ำ: ต้องเป็นคนที่ล็อกอิน อยู่ห้องเดียวกัน)
  function canReport(seat) {
    const state = gameState();
    if (!dbOn() || !state || !state.P || !state.P[seat]) return false;
    return seat !== state.my && !state.P[seat].bot;
  }

  function playerName(seat) {
    const state = gameState();
    return state && state.P[seat] ? state.P[seat].n : '';
  }

  // ---------- หน้าต่างรายงาน ----------
  function formHtml(seat) {
    const options = REASONS.map(
      ([id, label], index) => `<label class=rp-opt><input type=radio name=rp-reason value="${id}"${index === 0 ? ' checked' : ''}> ${label}</label>`
    ).join('');
    return `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button>
      <h3 class=rp-h>🚩 รายงาน ${escape(playerName(seat))}</h3>
      <div class=rp-opts>${options}</div>
      <textarea class=rp-note maxlength=${NOTE_MAX} rows=3 placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"></textarea>
      <p class=rp-mut>ทีมงานจะตรวจสอบรายงาน · รายงานเท็จซ้ำ ๆ อาจถูกลงโทษเอง</p>
      <div class=rp-btns><button class="wbtn go" onclick="reportSend()"${busy ? ' disabled' : ''}>ส่งรายงาน</button>
        <button class=wbtn onclick="this.closest('.st-modal').remove()">ยกเลิก</button></div>`;
  }

  function closeModal() {
    document.querySelectorAll('.rp-modal').forEach(node => node.remove());
    openSeat = null;
  }

  window.reportOpen = seat => {
    if (!dbOn()) return toast('ล็อกอินบัญชีก่อนจึงจะรายงานผู้เล่นได้');
    if (!canReport(seat)) return toast('รายงานได้เฉพาะผู้เล่นคนอื่น (บอทรายงานไม่ได้)');
    closeModal();
    openSeat = seat;
    const modal = document.createElement('div');
    modal.className = 'st-modal rp-modal';
    modal.onclick = e => {
      if (e.target === modal) closeModal();
    };
    modal.innerHTML = `<div class="st-box rp-box">${formHtml(seat)}</div>`;
    document.body.appendChild(modal);
  };

  function setBusy(value) {
    busy = value;
    const button = document.querySelector('.rp-modal .wbtn.go');
    if (button) button.disabled = value;
  }

  function onReply(reply) {
    setBusy(false);
    toast(reply && reply.message ? reply.message : 'ส่งรายงานไม่สำเร็จ');
    if (reply && reply.ok) closeModal();
  }

  window.reportSend = () => {
    if (busy || openSeat == null) return;
    if (!socketReady()) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์');
    const box = document.querySelector('.rp-modal');
    const picked = box.querySelector('input[name=rp-reason]:checked');
    const note = box.querySelector('.rp-note').value.slice(0, NOTE_MAX);
    setBusy(true);
    let answered = false;
    sock.once('report:done', reply => {
      answered = true;
      onReply(reply);
    });
    setTimeout(() => {
      if (!answered && busy) onReply({ ok: false, message: 'เซิร์ฟเวอร์ไม่ตอบ ลองใหม่อีกครั้ง' });
    }, REPLY_TIMEOUT_MS);
    sock.emit('player:report', { seat: openSeat, reason: picked ? picked.value : '', note });
  };

  // ---------- ทางเข้า ----------
  // แตะป้ายชื่อ/ที่นั่งบนโต๊ะ: ฟังที่ document จุดเดียว ไม่ต้องแก้ไฟล์วาดโต๊ะ (gamegx.js / games.js)
  document.addEventListener('click', event => {
    if (typeof screen === 'undefined' || screen !== 'game') return;
    const seatEl = event.target.closest && event.target.closest(SEAT_SELECTOR);
    if (!seatEl) return;
    const seat = Number(seatEl.dataset.seat);
    if (!canReport(seat)) return; // แตะที่นั่งตัวเอง/บอท = ไม่ทำอะไร (เหมือนเดิม)
    reportOpen(seat);
  });

  // ปุ่มเล็กข้างชื่อในหน้าสรุปผลจบตา
  function button(seat) {
    if (!canReport(seat)) return '';
    return `<button class=rp-flag onclick="event.stopPropagation();reportOpen(${Number(seat)})" title="รายงานผู้เล่น" aria-label="รายงานผู้เล่น">🚩</button>`;
  }

  window.Report = { button };
})();
