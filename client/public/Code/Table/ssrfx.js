/* ssrfx.js — เอฟเฟกต์ตัวละครระดับ SSR (rarity: legendary)
   1) ฉากเปิดตัวตอนสุ่มได้ SSR (ก่อนหน้าผลสุ่มปกติ · แตะเพื่อข้าม)
   2) แสงตอนถึงตา: ที่นั่งของผู้เล่นที่ใช้ตัว SSR เรืองแสง + กลีบซากุระร่วง (ทุกคนในโต๊ะเห็น)
   3) พายุซากุระ: ผู้เล่นที่ใช้ตัว SSR ชนะตา → กลีบซากุระพัดทั้งจอ
   Public: SSRFX.storm(ms) · SSRFX.reveal(item) → Promise · SSRFX.isSSR(charId)
   ตัวละคร SSR ใหม่ใช้ได้ทันที: ตั้ง "rarity": "legendary" ใน Character.config (ฉากใช้ Background/star5.webp ถ้ามี) */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const chars = () => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []);
  const charOf = id => chars().find(c => c.id === id);
  const isSSR = id => { const c = charOf(id); return !!(c && c.rarity === 'legendary'); };

  /* ---------- กลีบซากุระ (canvas เต็มจอ ไม่รับการแตะ) ---------- */
  let cv = null, cx = null, petals = [], raf = 0, until = 0, rate = 5;
  const COLORS = [['#ffd1e1', '#ff8fb8'], ['#ffe4ee', '#ffadc9'], ['#fff0f5', '#f7a1c0'], ['#ffc2d6', '#e8709c']];
  function canvas() {
    if (cv && cv.isConnected) return cv;
    cv = document.createElement('canvas'); cv.className = 'ssr-petals'; document.body.appendChild(cv); cx = cv.getContext('2d'); size(); return cv;
  }
  function size() { if (!cv) return; const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  addEventListener('resize', size);
  function petal(storm) {
    const W = innerWidth, H = innerHeight, s = (storm ? 5 : 4.5) + Math.random() * (storm ? 7 : 5), c = COLORS[Math.random() * COLORS.length | 0];
    return storm
      ? { x: -40 - Math.random() * W * 0.5, y: Math.random() * H * 1.1 - H * 0.2, vx: 5 + Math.random() * 7, vy: 0.6 + Math.random() * 2.2, s, r: Math.random() * 6.28, vr: (Math.random() - .5) * .25, f: Math.random() * 6.28, vf: .08 + Math.random() * .12, c }
      : { x: Math.random() * W, y: -20 - Math.random() * H * 0.3, vx: -0.6 + Math.random() * 1.2, vy: 1 + Math.random() * 1.6, s, r: Math.random() * 6.28, vr: (Math.random() - .5) * .08, f: Math.random() * 6.28, vf: .04 + Math.random() * .06, c };
  }
  function drawPetal(p) {
    cx.save(); cx.globalAlpha = 0.92; cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.f)));
    const g = cx.createLinearGradient(0, -p.s, 0, p.s); g.addColorStop(0, p.c[0]); g.addColorStop(1, p.c[1]); cx.fillStyle = g;
    cx.beginPath(); cx.moveTo(0, p.s); cx.bezierCurveTo(p.s * .9, p.s * .3, p.s * .7, -p.s * .8, p.s * .12, -p.s); cx.lineTo(0, -p.s * .72); cx.lineTo(-p.s * .12, -p.s);
    cx.bezierCurveTo(-p.s * .7, -p.s * .8, -p.s * .9, p.s * .3, 0, p.s); cx.fill(); cx.restore();
  }
  function tick() {
    const W = innerWidth, H = innerHeight, now = Date.now();
    cx.clearRect(0, 0, W, H);
    petals = petals.filter(p => p.x < W + 60 && p.y < H + 60 && p.x > -W);
    petals.forEach(p => { p.x += p.vx + Math.sin(p.f) * 0.6; p.y += p.vy; p.r += p.vr; p.f += p.vf; drawPetal(p); });
    if (now < until && petals.length < 160 && cv._storm) for (let i = 0; i < rate; i++) petals.push(petal(true));
    if (petals.length || now < until) raf = requestAnimationFrame(tick); else { raf = 0; cv.remove(); cv = null; }
  }
  // ms = ระยะเวลาที่ลมพัด · n = กลีบชุดแรก · r = กลีบใหม่ต่อเฟรม
  function storm(ms, n, r) {
    if (reduced()) return;
    canvas(); cv._storm = true; until = Date.now() + (ms || 2600); rate = r || 5;
    for (let i = 0; i < (n || 70); i++) { const p = petal(true); p.x = Math.random() * innerWidth * 0.6 - innerWidth * 0.3; petals.push(p); }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function drift(n) {   // กลีบร่วงเบา ๆ (ใช้ในฉากเปิดตัว)
    if (reduced()) return;
    canvas(); cv._storm = false; for (let i = 0; i < (n || 40); i++) petals.push(petal(false));
    if (!raf) raf = requestAnimationFrame(tick);
  }

  /* ---------- 1) ฉากเปิดตัวตอนสุ่มได้ SSR ---------- */
  function reveal(x) {
    return new Promise(done => {
      const c = charOf(x.item_id) || {}, img = c.asset || '', bg = c.star5 || c.seat || '';
      const m = document.createElement('div'); m.className = 'ssr-cine' + (reduced() ? ' still' : '');
      m.innerHTML = `<div class=ssr-bg style="background-image:url('${E(bg)}')"></div><div class=ssr-rays></div><div class=ssr-orb></div><div class=ssr-flash></div>
        <img class=ssr-ch src="${E(img)}" alt="">
        <div class=ssr-info><div class=ssr-tag>SSR</div><div class=ssr-stars>${'<i>★</i>'.repeat(5)}</div><b>${E(c.name || x.name || '')}</b>${c.title ? `<small>${E(c.title)}</small>` : ''}${x.new ? '<em>ตัวละครใหม่!</em>' : ''}</div>
        <div class=ssr-tap>แตะเพื่อดูผลสุ่ม</div>`;
      let ok = false; const close = () => { if (!ok) return; m.classList.add('out'); setTimeout(() => { m.remove(); done(); }, 350); };
      m.onclick = close; document.body.appendChild(m);
      setTimeout(() => { ok = true; m.classList.add('ready'); }, reduced() ? 300 : 2200);
      setTimeout(() => { storm(1300, 30, 2); drift(24); }, reduced() ? 0 : 1250);
      try { if (window.Sound) Sound.play('gacha'); } catch (e) {}
    });
  }
  let hooked = false;
  function hookGacha() {   // ห่อครั้งเดียว (pack-loader.js ก็ห่อ gcShow ด้วย จึงคัดลอกเครื่องหมาย _pk ไว้ไม่ให้ห่อซ้อนวนไม่จบ)
    if (hooked || typeof window.gcShow !== 'function') return; hooked = true;
    const orig = window.gcShow;
    const g = async function (r) {
      const list = ((r && r.results) || []).filter(x => x.kind === 'characters' && (x.rarity === 'legendary' || isSSR(x.item_id)));
      const seen = new Set();
      for (const x of list) { if (seen.has(x.item_id)) continue; seen.add(x.item_id); await reveal(x); }   // ได้ SSR ซ้ำในการสุ่มเดียวกัน → เปิดตัวครั้งเดียว
      return orig.apply(this, arguments);
    };
    g._ssr = 1; g._pk = orig._pk; window.gcShow = g;
  }

  /* ---------- 2) แสงตอนถึงตา · 3) พายุซากุระตอนชนะ ---------- */
  let lastGid = null, stormGid = null;
  function winnerSeat(s) {
    const r = s.res || {}, d = (r.coin && r.coin.delta) || s.P.map(() => 0), w = r.winner != null ? r.winner : r.k;
    let best = -1, bv = -Infinity; d.forEach((v, i) => { const t = (Number(v) || 0) + (i === w ? 0.5 : 0); if (t > bv) { bv = t; best = i; } });
    return w != null ? w : best;
  }
  function table() {
    if (typeof S === 'undefined' || !S || typeof screen === 'undefined' || screen !== 'game' || !S.P) return;
    if (typeof deal !== 'undefined' && deal) return;
    // ติดคลาส ssr ให้ที่นั่ง/ป้ายชื่อของผู้เล่นที่ใช้ตัว SSR (render ใหม่ก็ติดใหม่)
    document.querySelectorAll('.gx-sb[data-seat],.gx-seat[data-seat],.gx-me[data-seat]').forEach(el => {
      const p = S.P[Number(el.dataset.seat)]; el.classList.toggle('ssr', !!(p && isSSR(p.ch)));
    });
    if (S.gid !== lastGid) { lastGid = S.gid; }
    if (S.over && stormGid !== S.gid) {
      stormGid = S.gid;
      const w = winnerSeat(S), p = S.P[w];
      if (p && isSSR(p.ch)) setTimeout(() => storm(3200), 300);
    }
  }
  setInterval(() => { try { hookGacha(); table(); } catch (e) {} }, 150);

  window.SSRFX = { storm, drift, reveal, isSSR };
})();
