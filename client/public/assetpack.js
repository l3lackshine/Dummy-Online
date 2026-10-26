/* assetpack.js — ตัวอ่านไฟล์ตั้งค่าจากโฟลเดอร์ Shop / UI / Sounds / Character (ไม่เปลี่ยนหน้าตาเดิมถ้าไม่ได้ตั้งค่า)
   Public: Assets.shopKinds(), Assets.allTab(), Assets.shopTitle(), Assets.bannerImage(id), Assets.gachaLabel(key, def),
           Assets.char(id), Assets.play(eventName, characterId)
   Extend: เพิ่มช่องใหม่ใน Shop/Shopsetting.config, UI/ui.config หรือ Sounds/sounds.config แล้วอ่านผ่าน Assets.<ชื่อ> */
(function () {
  'use strict';
  const J = u => fetch(u, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const st = { shop: {}, ui: {}, snd: {}, banners: {} };
  const A = window.Assets = {
    shopTitle: () => st.shop.title || '',
    allTab: () => { const t = (st.shop.tabs || []).find(x => x.kind === 'all'); return ['all', (t && t.label) || 'ทั้งหมด', '', (t && t.icon) || '🛍']; },
    // รายการแท็บสินค้าตามลำดับ/ชื่อ/การซ่อนใน Shopsetting.config (ถ้าไม่ได้ตั้ง = ใช้ KINDS เดิม)
    shopKinds() {
      const base = typeof KINDS !== 'undefined' ? KINDS : [], tabs = st.shop.tabs; if (!tabs || !tabs.length) return base;
      const out = []; for (const t of tabs) { if (t.kind === 'all' || t.visible === false) continue; const k = base.find(b => b[0] === t.kind); if (k) out.push([k[0], t.label || k[1], k[2], t.icon || k[3]]); }
      for (const k of base) if (!tabs.some(t => t.kind === k[0])) out.push(k); // ชนิดใหม่ที่ยังไม่ได้ตั้งค่า ยังแสดงตามเดิม
      return out;
    },
    gachaDisplay: () => (st.shop.gacha && st.shop.gacha.display) || 'list',
    showListButton: () => !(st.shop.gacha && st.shop.gacha.showListButton === false),
    gachaLabel: (key, def) => ((st.shop.gacha || {}).labels || {})[key] || def,
    bannerImage: id => (A.gachaDisplay() === 'image' && st.banners[id]) || '',
    char: id => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(c => c.id === id) || null,
    play(name, charId) { // เสียงเฉพาะตัวละครก่อน แล้วค่อยเสียงหลักของเกม
      try { const c = charId && A.char(charId), f = (c && c.sounds && c.sounds[name]) || ((st.snd.events || {})[name] ? './Sounds/' + st.snd.events[name] : ''); if (!f) return;
        const a = new Audio(f); a.volume = Math.min(1, Math.max(0, Number(st.snd.master) || 0.8)); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  };
  function applyUi(ui) { // ตัวแปร CSS --ui-<กลุ่ม>-<ชื่อ> เฉพาะช่องที่ใส่ไฟล์ไว้
    const root = document.documentElement.style, put = (k, v) => { if (v) root.setProperty('--ui-' + k, 'url("./UI/' + v + '")'); };
    for (const [g, v] of Object.entries(ui || {})) { if (g === 'note') continue; if (v && typeof v === 'object') for (const [n, f] of Object.entries(v)) put(g + '-' + n, f); else put(g, v); }
  }
  Promise.all([J('./Shop/Shopsetting.config'), J('./UI/ui.config'), J('./Sounds/sounds.config'), J('./skin/gacha.json')]).then(([shop, ui, snd, g]) => {
    st.shop = shop || {}; st.ui = ui || {}; st.snd = snd || {};
    ((g && g.banners) || []).forEach(b => { if (b.image) st.banners[b.id] = b.image; });
    applyUi(st.ui); if (typeof render === 'function') try { render(); } catch (e) {}
  });
})();
