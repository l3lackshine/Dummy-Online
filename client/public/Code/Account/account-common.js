/* account-common.js — ตัวช่วยของโหมดบัญชี (ใช้เฉพาะเมื่อเปิด Supabase — DB.enabled)
   ป้ายแจ้งเตือนลอย (toast) · แสดงวันเวลาแบบไทย
   ไม่ล็อกอิน = ไม่มี dbToast (ไฟล์อื่นเช็ก window.dbToast ก่อนเรียกเสมอ)
   Public: dbToast(text, cssClass) · fmtDateTime(value) */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;

  const TOAST_MS = 3400;

  function toast(text, cssClass) {
    const box = document.createElement('div');
    box.className = 'sk-toast q-toast ' + (cssClass || '');
    box.textContent = text;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), TOAST_MS);
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date)) return '—';
    return date.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  window.dbToast = toast;
  window.fmtDateTime = fmtDateTime;
})();
