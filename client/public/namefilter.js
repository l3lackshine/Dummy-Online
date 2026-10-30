/* namefilter.js — ตรวจชื่อผู้เล่น (คำหยาบ / แอบอ้างเป็นทีมงาน) ใช้ไฟล์เดียวกันทั้งเซิร์ฟเวอร์และเกม
   สำเนาเดียวกันอยู่ที่ client/public/namefilter.js (เทสต์ test-namefilter.js ตรวจว่าตรงกัน) · ฐานข้อมูลมีตัวตรวจของตัวเองใน supabase/name_filter.sql
   Public: NameFilter.check(name) → null (ผ่าน) | ข้อความเหตุผล · NameFilter.clean(name, fallback) → ชื่อที่ใช้ได้
   เพิ่มคำ: ใส่ใน BAD (ตัวพิมพ์เล็ก ไม่มีช่องว่าง) · คำปกติที่บังเอิญมีคำต้องห้ามอยู่ข้างใน ใส่ใน OK */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NameFilter = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const BAD = [
    // ไทย
    'ควย', 'เหี้ย', 'เหี่ย', 'เย็ด', 'เยด', 'หี', 'แตด', 'สัส', 'สัด', 'แม่ง', 'ส้นตีน', 'จัญไร', 'ระยำ', 'ชาติหมา', 'อีดอก', 'ดอกทอง',
    'อีตัว', 'กะหรี่', 'กระหรี่', 'ร่าน', 'เงี่ยน', 'จิ๋ม', 'หำ', 'โคตรพ่อ', 'โคตรแม่', 'พ่อมึง', 'แม่มึง', 'อีเวร', 'ไอ้เวร', 'อีควาย', 'ไอ้ควาย',
    'ไอ้สัตว์', 'อีสัตว์', 'ขายตัว', 'ข่มขืน',
    // อังกฤษ (หลังแปลงตัวเลข/สัญลักษณ์เป็นตัวอักษรแล้ว)
    'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'nigger', 'nigga', 'whore', 'slut', 'porn', 'asshole', 'fag',
    'hitler', 'nazi', 'motherf', 'kuay'
  ];
  // คำปกติที่มีคำต้องห้ามเป็นส่วนหนึ่ง (ตรวจหลังตัดคำปกติออกแล้ว)
  const OK = ['หีบ', 'สัดส่วน', 'หำหั่น', 'ร่านี้', 'cocktail', 'peacock', 'hancock', 'dickens', 'scunthorpe', 'shitake', 'shiitake'];
  // ชื่อที่ทำให้คนอื่นเข้าใจว่าเป็นทีมงาน
  const STAFF = ['admin', 'แอดมิน', 'แอดมิ้น', 'gm', 'gamemaster', 'moderator', 'mod', 'ทีมงาน', 'ผู้ดูแล', 'official', 'support', 'system', 'ระบบ', 'dummyonline'];
  const LEET = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', '|': 'i', '+': 't' };
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFC')
    .replace(/[​-‏⁠﻿]/g, '')                 // ตัวอักษรล่องหน
    .replace(/[0-9!@$|+]/g, c => LEET[c] || c)
    .replace(/[\s._\-*~^'"`,:;(){}\[\]<>\/\\?#%&=]+/g, '')     // ช่องว่างและเครื่องหมายคั่น
    .replace(/(.)\1+/g, '$1');                                   // ตัวซ้ำ (fuuuck → fuck, ควยยย → ควย)
  const strip = (s, list) => list.reduce((t, w) => t.split(norm(w)).join('·'), s);
  const BADN = BAD.map(norm), STAFFN = STAFF.map(norm);
  function check(name) {
    const raw = String(name == null ? '' : name).trim();
    if (!raw) return 'ชื่อห้ามว่าง';
    const n = norm(raw); if (!n) return 'ชื่อต้องมีตัวอักษร';
    const t = strip(n, OK);
    if (BADN.some(w => w && t.includes(w))) return 'ชื่อนี้มีคำไม่สุภาพ ลองชื่ออื่นนะ';
    const asWord = STAFFN.some(w => n === w || (w.length >= 4 && n.includes(w))) || /^(gm|mod)([\s._\-]|$)/i.test(raw);
    if (asWord) return 'ชื่อนี้คล้ายทีมงาน ใช้ไม่ได้';
    return null;
  }
  const clean = (name, fallback) => { const v = String(name == null ? '' : name).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 14); return v && !check(v) ? v : (fallback || 'ผู้เล่น'); };
  return { check, clean, norm };
});
