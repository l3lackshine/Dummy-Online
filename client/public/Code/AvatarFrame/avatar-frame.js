/* avatar-frame.js — กรอบรูปโปรไฟล์ (แยกเป็นระบบของตัวเอง เผื่ออนาคตให้ผู้เล่นเลือก/ปลดล็อกกรอบได้)
   ข้อมูลกรอบอยู่ใน skin/avatar-frames.json (รูป + ตำแหน่งวงด้านใน) · ไฟล์นี้แค่วางรูปหน้าให้พอดีวงของกรอบ
   Public: AvatarFrame.wrap(innerHtml, frameId?) → HTML ของรูปในกรอบ · AvatarFrame.current() → id กรอบที่ใช้ · AvatarFrame.list()
   EXTEND: ให้ผู้เล่นเลือกกรอบ = เก็บ id ที่เลือก (ฐานข้อมูล) แล้วให้ current() คืนค่านั้น · หน้าที่ใช้ไม่ต้องแก้ */
(function () {
  'use strict';
  const { escape } = window.UiKit;

  const FALLBACK = {
    id: 'sakura',
    name: 'ซากุระ',
    asset: './Assets/UI/Assets/kit3/av-frame.webp',
    circle: { cx: 335, cy: 277, r: 218, w: 621, h: 532 },
  };
  let frames = [FALLBACK];
  let defaultId = FALLBACK.id;

  fetch('./skin/avatar-frames.json')
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (!data || !Array.isArray(data.frames) || !data.frames.length) return;
      frames = data.frames;
      defaultId = data.default || frames[0].id;
    })
    .catch(() => {});

  const frameById = id => frames.find(frame => frame.id === id) || frames.find(frame => frame.id === defaultId) || FALLBACK;

  // ขนาด/ตำแหน่งรูปกรอบเทียบกับวงรูปหน้า (วงรูปหน้า = 100% ของกล่อง) — กรอบใหญ่กว่าวง จึงยื่นออกรอบนอก
  function frameStyle(frame) {
    const c = frame.circle;
    const size = c.r * 2;
    const width = (c.w / size) * 100;
    const height = (c.h / size) * 100;
    const left = (-(c.cx - c.r) / size) * 100;
    const top = (-(c.cy - c.r) / size) * 100;
    const url = typeof assetUrl === 'function' ? assetUrl(frame.asset) : frame.asset;
    return `--af-w:${width}%;--af-h:${height}%;--af-x:${left}%;--af-y:${top}%;--af-img:url('${escape(url)}')`;
  }

  function wrap(innerHtml, frameId) {
    const frame = frameById(frameId || current());
    return `<span class="af af-${escape(frame.id)}" style="${frameStyle(frame)}"><span class=af-in>${innerHtml}</span><i class=af-fr></i></span>`;
  }

  // ตอนนี้ทุกคนใช้กรอบเริ่มต้น (ยังไม่มีระบบเลือกกรอบ)
  const current = () => defaultId;

  window.AvatarFrame = { wrap, current, list: () => frames.slice() };
})();
