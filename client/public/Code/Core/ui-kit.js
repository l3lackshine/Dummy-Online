/* ui-kit.js — ตัวช่วยเล็ก ๆ ที่หน้าจอหลายหน้าใช้ร่วมกัน (escape ข้อความ · ตัวเลข · localStorage · ไอคอนเส้น)
   ทำไม: เดิมแต่ละไฟล์เขียนตัวช่วยชุดนี้ซ้ำเอง — รวมไว้ที่เดียวให้แก้จุดเดียว
   Public: UiKit.escape(text) · UiKit.number(n) · UiKit.dbOn() · UiKit.lsGet(key, fallback) · UiKit.lsSet(key, value) · UiKit.icon(name)
   EXTEND: ไอคอนใหม่ = เพิ่ม path ใน ICON_PATHS (ขนาด 24×24 เส้นหนา 1.8) */
(function () {
  'use strict';

  const ICON_PATHS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 4.5-6 8-6s6.5 1.5 8 6"/>',
    news: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bag: '<path d="M3 9h18v11H3zM3 9l2-5h14l2 5M10 13h4"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    vib: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M12 9C9 9 7 4 9.5 4S12 9 12 9s.5-5 2.5-5S15 9 12 9"/>',
  };

  // ข้อความจากผู้เล่น/ฐานข้อมูลที่ใส่ใน HTML ต้องผ่านตัวนี้เสมอ
  const escape = text => String(text == null ? '' : text).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const number = n => Number(n || 0).toLocaleString('en-US');
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);

  // localStorage อาจใช้ไม่ได้ (โหมดส่วนตัว/บล็อก) — ห่อ try/catch เสมอ
  function lsGet(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function lsSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  const icon = name =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;

  window.UiKit = { escape, number, dbOn, lsGet, lsSet, icon };
})();
