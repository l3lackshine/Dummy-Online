/* assetpack.js — ตัวอ่านไฟล์ตั้งค่าจากโฟลเดอร์ Shop / UI / Sounds / Character (ไม่เปลี่ยนหน้าตาเดิมถ้าไม่ได้ตั้งค่า)
   Public: Assets.shopKinds(), Assets.allTab(), Assets.shopTitle(), Assets.bannerImage(id), Assets.gachaLabel(key, def),
           Assets.char(id), Assets.play(eventName, characterId)
   Extend: เพิ่มช่องใหม่ใน Shop/Shopsetting.config, UI/ui.config หรือ Sounds/sounds.config แล้วอ่านผ่าน Assets.<ชื่อ> */
(function () {
  'use strict';
  const J = u =>
    fetch(u, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
  const st = { shop: {}, ui: {}, snd: {}, banners: {} };
  const A = (window.Assets = {
    shopTitle: () => st.shop.title || '',
    allTab: () => {
      const t = (st.shop.tabs || []).find(x => x.kind === 'all');
      return ['all', (t && t.label) || 'ทั้งหมด', '', (t && t.icon) || '🛍'];
    },
    // รายการแท็บสินค้าตามลำดับ/ชื่อ/การซ่อนใน Shopsetting.config (ถ้าไม่ได้ตั้ง = ใช้ KINDS เดิม)
    shopKinds() {
      const base = typeof KINDS !== 'undefined' ? KINDS : [],
        tabs = st.shop.tabs;
      if (!tabs || !tabs.length) return base;
      const out = [];
      for (const t of tabs) {
        if (t.kind === 'all' || t.visible === false) continue;
        const k = base.find(b => b[0] === t.kind);
        if (k) out.push([k[0], t.label || k[1], k[2], t.icon || k[3]]);
      }
      for (const k of base) if (!tabs.some(t => t.kind === k[0])) out.push(k); // ชนิดใหม่ที่ยังไม่ได้ตั้งค่า ยังแสดงตามเดิม
      return out;
    },
    gachaDisplay: () => (st.shop.gacha && st.shop.gacha.display) || 'list',
    showListButton: () => !(st.shop.gacha && st.shop.gacha.showListButton === false),
    gachaLabel: (key, def) => ((st.shop.gacha || {}).labels || {})[key] || def,
    bannerImage: id => (A.gachaDisplay() === 'image' && st.banners[id]) || '',
    char: id => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(c => c.id === id) || null,
    getSfxVolume() {
      try {
        const v = localStorage.getItem('pvVolSfx');
        if (v != null) return Math.min(1, Math.max(0, Number(v)));
        // ถ้ายังไม่เคยตั้งแยก ลองดึงจาก pvVol รวมเดิม
        const old = localStorage.getItem('pvVol');
        if (old != null) return Math.min(1, Math.max(0, Number(old)));
      } catch (e) {}
      return Math.min(1, Math.max(0, Number(st.snd.master) || 0.8));
    },
    setSfxVolume(val) {
      const v = Math.min(1, Math.max(0, Number(val)));
      try { localStorage.setItem('pvVolSfx', String(v)); } catch (e) {}
    },
    getBgmVolume() {
      try {
        const v = localStorage.getItem('pvVolBgm');
        if (v != null) return Math.min(1, Math.max(0, Number(v)));
        const old = localStorage.getItem('pvVol');
        if (old != null) return Math.min(1, Math.max(0, Number(old)));
      } catch (e) {}
      return Math.min(1, Math.max(0, Number(st.snd.master) || 0.8));
    },
    setBgmVolume(val) {
      const v = Math.min(1, Math.max(0, Number(val)));
      try { localStorage.setItem('pvVolBgm', String(v)); } catch (e) {}
      if (A._bgm) {
        A._bgm.volume = v * 0.5;
      }
    },
    play(name, charId) {
      // เสียงเฉพาะตัวละครก่อน แล้วค่อยเสียงหลักของเกม
      try {
        const c = charId && A.char(charId),
          f = (c && c.sounds && c.sounds[name]) || ((st.snd.events || {})[name] ? './Assets/Sounds/' + st.snd.events[name] : '');
        if (!f) return;
        const a = new Audio(f);
        a.volume = A.getSfxVolume();
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
    },
    // ---------- เพลงพื้นหลัง (BGM) ----------
    _bgm: null,
    _bgmKey: '',
    playMusic(key) {
      // key = 'lobby' | 'table' | '' (หยุดเพลง)
      const file = (st.snd.music || {})[key] || '';
      const wantKey = key + ':' + file;
      if (A._bgmKey === wantKey) return; // เพลงเดิมกำลังเล่นอยู่
      A.stopMusic();
      if (!file) return;
      try {
        const a = new Audio('./Assets/Sounds/' + file);
        a.loop = true;
        a.volume = A.getBgmVolume() * 0.5;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
        A._bgm = a;
        A._bgmKey = wantKey;
      } catch (e) {}
    },
    stopMusic() {
      if (A._bgm) {
        try { A._bgm.pause(); } catch (e) {}
        A._bgm = null;
        A._bgmKey = '';
      }
    },
  });
  function applyUi(ui) {
    // ตัวแปร CSS --ui-<กลุ่ม>-<ชื่อ> เฉพาะช่องที่ใส่ไฟล์ไว้
    const root = document.documentElement.style,
      put = (k, v) => {
        if (v) root.setProperty('--ui-' + k, 'url("' + assetUrl('./Assets/UI/' + v) + '")');
      };
    for (const [g, v] of Object.entries(ui || {})) {
      if (g === 'note') continue;
      if (v && typeof v === 'object') for (const [n, f] of Object.entries(v)) put(g + '-' + n, f);
      else put(g, v);
    }
  }
  Promise.all([
    J('./Assets/Shop/Shopsetting.config'),
    J('./Assets/UI/ui.config'),
    J('./Assets/Sounds/sounds.config'),
    J('./skin/gacha.json'),
  ]).then(([shop, ui, snd, g]) => {
    st.shop = shop || {};
    st.ui = ui || {};
    st.snd = snd || {};
    ((g && g.banners) || []).forEach(b => {
      if (b.image) st.banners[b.id] = b.image;
    });
    applyUi(st.ui);
    if (typeof render === 'function')
      try {
        render();
      } catch (e) {}
  });

  // เล่นเสียงคลิก (click) อัตโนมัติเมื่อกดปุ่มหรือแท็บต่าง ๆ ทั่วทั้งเกม
  document.addEventListener('click', e => {
    try {
      const btn = e.target.closest('button, .catbtn, .tab, .pill.rl, .nav-item, [role="button"]');
      if (btn && !btn.disabled && window.Assets && Assets.play) {
        Assets.play('click');
      }
    } catch (err) {}
  }, true);
})();
