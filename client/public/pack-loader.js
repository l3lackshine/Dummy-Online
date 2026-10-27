/* pack-loader.js (ก้อนที่ 2) — หน้าโหลดก่อนเข้าเกม + โหลด/ถอดรหัสแพ็กแอสเซ็ตตามสิทธิ์ผู้เล่น
   Flow: อ่าน pack/manifest.json → แพ็กฟรี (base) ขอกุญแจจากเซิร์ฟเวอร์ → แพ็กตัวละครที่ซื้อแล้ว ขอกุญแจพร้อม token ล็อกอิน
         (ไม่มีสิทธิ์ = เซิร์ฟเวอร์ตอบ 403 → ข้าม ใช้ภาพตัวอย่างขนาดเล็กแทน) → ดาวน์โหลด/ใช้แคชในเครื่อง → ถอดรหัสในหน่วยความจำ
         → แทนที่รูปในทะเบียนสกิน (SKIN_REGISTRY) → ปิดหน้าโหลด
   ไม่มี manifest (โหมดพัฒนา/ยังไม่แพ็ก) = ข้ามเงียบ ๆ เกมใช้ไฟล์ตรงตามเดิม
   Public: PackLoader.url(path) · PackLoader.ready (Promise) · PackLoader.refresh() — เรียกหลังซื้อ/สุ่มได้ตัวละครใหม่ เพื่อปลดล็อกภาพเต็ม */
(function () {
  'use strict';
  const urls = new Map(), loaded = new Set(), L = window.PackLoader = { url: p => urls.get(String(p).replace(/^\.\//, '')) || null, ready: null, refresh: null, packs: [] };
  const T = { title: 'กำลังเตรียมเกม', s1: 'ตรวจเวอร์ชันไฟล์', s2: 'ดาวน์โหลดทรัพยากร', s3: 'ถอดรหัสไฟล์', s4: 'เตรียมภาพ', tip: 'ครั้งแรกอาจใช้เวลาสักครู่ ครั้งต่อไปจะเร็วขึ้นมาก', fail: 'โหลดไม่สำเร็จ', retry: 'ลองอีกครั้ง' };
  const LOCKED = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" rx="24" fill="#2a1230"/><circle cx="150" cy="170" r="52" fill="#4a2a55"/><rect x="70" y="240" width="160" height="120" rx="60" fill="#4a2a55"/><text x="150" y="388" text-anchor="middle" font-size="30" fill="#ffd978">🔒</text></svg>');
  // ---------- หน้าโหลด ----------
  const css = `#pkov{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;box-sizing:border-box;color:#fff;text-align:center;font-family:Sarabun,system-ui,sans-serif;
    background:radial-gradient(ellipse at 50% 40%,#4a1f3a 0,#2a1230 55%,#150a22 100%);transition:opacity .3s}
    #pkov.out{opacity:0;pointer-events:none}#pkov .pk-logo{font-size:clamp(26px,6vw,44px);font-weight:800;color:#ffd978;text-shadow:0 3px 0 #0006,0 0 18px #f0659566;letter-spacing:.5px}
    #pkov .pk-ver{font-size:12px;color:#ffd1e3;opacity:.8;margin-top:-8px}#pkov .pk-title{font-size:clamp(15px,3vw,20px);font-weight:700}
    #pkov .pk-bar{width:min(78vw,420px);height:16px;border-radius:99px;background:#0007;border:2px solid #f2b84b;overflow:hidden;box-shadow:0 0 14px #f2b84b55}
    #pkov .pk-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff8fb1,#ffd978);transition:width .15s}
    #pkov .pk-step{font-size:13px;color:#ffd1e3}#pkov .pk-tip{font-size:12px;color:#cfc2e8;opacity:.85;margin-top:6px}
    #pkov .pk-err{display:none;flex-direction:column;align-items:center;gap:10px;color:#ffb3b3;font-size:14px}#pkov.bad .pk-err{display:flex}#pkov.bad .pk-bar,#pkov.bad .pk-step{display:none}
    #pkov button{border:0;border-radius:99px;padding:10px 26px;font:700 15px Sarabun,sans-serif;color:#fff;background:linear-gradient(#ffa13a,#f0640d);box-shadow:0 4px 0 #a9440a;cursor:pointer}
    #pkov .pk-petal{position:absolute;top:-30px;width:12px;height:12px;border-radius:12px 0 12px 0;background:#ffc2d9;opacity:.8;animation:pkfall linear infinite}
    @keyframes pkfall{to{transform:translateY(110vh) rotate(540deg)}}`;
  let ov, bar, step, shown = false;
  function mount() {
    if (shown) return; shown = true;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    ov = document.createElement('div'); ov.id = 'pkov';
    ov.innerHTML = Array.from({ length: 9 }, (_, i) => `<span class=pk-petal style="left:${(i * 11 + 4) % 100}%;animation-duration:${6 + (i % 4)}s;animation-delay:${-i * 0.9}s"></span>`).join('') +
      `<div class=pk-logo>Dummy Online</div><div class=pk-ver>${(window.DUMMY_VERSION || '')}</div><div class=pk-title>${T.title}</div>
       <div class=pk-bar><i></i></div><div class=pk-step>${T.s1}…</div><div class=pk-tip>${T.tip}</div>
       <div class=pk-err><div class=pk-msg></div><button type=button>${T.retry}</button></div>`;
    document.documentElement.appendChild(ov); bar = ov.querySelector('.pk-bar i'); step = ov.querySelector('.pk-step');
  }
  const prog = (p, s) => { if (!ov) return; bar.style.width = Math.round(Math.min(1, Math.max(0, p)) * 100) + '%'; if (s) step.textContent = s + '…'; };
  const hide = () => { if (!ov) return; ov.classList.add('out'); setTimeout(() => { ov && ov.remove(); ov = null; }, 350); };
  const fail = e => { if (!ov) mount(); ov.classList.add('bad'); ov.querySelector('.pk-msg').textContent = T.fail + ' — ' + (e && e.message ? e.message : e); ov.querySelector('button').onclick = () => location.reload(); };
  // ---------- กุญแจ (ขอจากเซิร์ฟเวอร์ตามสิทธิ์ · เก็บแคชในเครื่องเพื่อไม่ต้องรอเซิร์ฟเวอร์ทุกครั้ง) ----------
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)), ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; } };
  let uid = '';
  async function token() { // รอระบบบัญชีพร้อมสั้น ๆ แล้วดึง access token (ผู้เล่นที่ยังไม่ล็อกอิน = ไม่มี token)
    for (let i = 0; i < 30 && !(window.DB && DB.enabled); i++) await new Promise(r => setTimeout(r, 100));
    try { if (window.DB && DB.enabled && DB.client) { const { data } = await DB.client.auth.getSession(); uid = data && data.session && data.session.user ? data.session.user.id : ''; return data && data.session ? data.session.access_token : null; } } catch (e) {} return null;
  }
  const kname = p => 'dummyPK:' + (p.tier === 'owner' ? uid + ':' : '') + p.id; // กุญแจแพ็กตัวละครผูกกับบัญชี (เครื่องเดียวหลายบัญชีไม่ใช้กุญแจร่วมกัน)
  // คืน { key } | { denied: true } (ไม่มีสิทธิ์) | โยน error (เซิร์ฟเวอร์ไม่ตอบ)
  async function getKey(pack, tk) {
    if (pack.tier === 'owner' && !tk) return { denied: true };
    const cached = ls(kname(pack)); if (cached) return { key: b64(cached) };
    const base = String((window.DUMMY_CONFIG || {}).BACKEND_URL || '').replace(/\/+$/, ''), ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(base + '/pack-key?pack=' + encodeURIComponent(pack.id), { headers: tk ? { Authorization: 'Bearer ' + tk } : {}, signal: ctl.signal });
      if (r.status === 401 || r.status === 403) return { denied: true };
      if (!r.ok) throw new Error('เซิร์ฟเวอร์ตอบ ' + r.status); const j = await r.json(); ls(kname(pack), j.key); return { key: b64(j.key) };
    } catch (e) { if (e.name === 'AbortError') throw new Error('เซิร์ฟเวอร์ไม่ตอบสนอง (อาจกำลังตื่น ลองอีกครั้งใน 1 นาที)'); throw e; } finally { clearTimeout(t); }
  }
  // ---------- ดาวน์โหลด (พร้อมแคชในเครื่อง) ----------
  async function loadPak(pack, onProg) {
    const url = './pack/' + pack.file + '?v=' + pack.version;
    try { if (window.caches) { const c = await caches.open('dummy-pack'), hit = await c.match(url); if (hit) { onProg(1); return new Uint8Array(await hit.arrayBuffer()); } } } catch (e) {}
    const r = await fetch(url); if (!r.ok) throw new Error('ดาวน์โหลด ' + pack.file + ' ไม่ได้ (' + r.status + ')');
    const total = Number(r.headers.get('content-length')) || pack.bytes, chunks = []; let got = 0;
    if (r.body && r.body.getReader) { const rd = r.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onProg(got / total); } }
    else { chunks.push(new Uint8Array(await r.arrayBuffer())); onProg(1); }
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
    try { if (window.caches) { const c = await caches.open('dummy-pack'); for (const k of await c.keys()) if (k.url.includes('/' + pack.file + '?')) await c.delete(k); await c.put(url, new Response(buf)); } } catch (e) {}
    return buf;
  }
  // ---------- ถอดรหัส ----------
  async function openPak(buf, keyBytes) {
    if (!(window.crypto && crypto.subtle)) throw new Error('เบราว์เซอร์นี้ไม่รองรับการถอดรหัส (ต้องเปิดผ่าน https)');
    if (String.fromCharCode(...buf.slice(0, 4)) !== 'DMP1') throw new Error('ไฟล์แพ็กไม่ถูกต้อง');
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']), dec = (iv, data, aad) => crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) }, key, data);
    const idxLen = new DataView(buf.buffer, buf.byteOffset + 16, 4).getUint32(0, true), base = 20 + idxLen;
    let index; try { index = JSON.parse(new TextDecoder().decode(await dec(buf.slice(4, 16), buf.slice(20, base), 'index'))); } catch (e) { throw new Error('กุญแจไม่ตรงกับไฟล์แพ็ก'); }
    const names = Object.keys(index.files);
    for (const name of names) { const f = index.files[name], plain = await dec(b64(f.iv), buf.slice(base + f.o, base + f.o + f.l), name); urls.set(name, URL.createObjectURL(new Blob([plain], { type: f.t }))); }
    return names;
  }
  // ---------- ทะเบียนสกิน: ภาพเต็ม (ถ้าปลดล็อก) → ภาพตัวอย่างขนาดเล็ก → รูปล็อก ----------
  const swapDeep = v => { if (typeof v === 'string') return L.url(v) || v; if (Array.isArray(v)) return v.map(swapDeep); if (v && typeof v === 'object') for (const k of Object.keys(v)) v[k] = swapDeep(v[k]); return v; };
  function patchRegistry() {
    try {
      const R = typeof SKIN_REGISTRY !== 'undefined' ? SKIN_REGISTRY : null; if (!R || !R.characters) return false; let changed = false;
      for (const c of R.characters) {
        if (!c._a0) { if (!c.asset || !/^\.?\/?Character\//.test(c.asset)) continue; Object.defineProperty(c, '_a0', { value: c.asset.replace(/^\.\//, ''), enumerable: false }); }
        const full = L.url(c._a0), prev = L.url('Preview/' + c.id + '.webp'), want = full || prev || LOCKED;
        if (c.asset !== want) { c.asset = want; changed = true; }
        Object.defineProperty(c, '_locked', { value: !full, enumerable: false, configurable: true });
        for (const f of ['effects', 'sounds']) if (c[f]) { if (!c['_' + f]) Object.defineProperty(c, '_' + f, { value: JSON.parse(JSON.stringify(c[f])), enumerable: false }); c[f] = swapDeep(JSON.parse(JSON.stringify(c['_' + f]))); }
      }
      return changed;
    } catch (e) { return false; }
  }
  async function whenRegistry() { for (let i = 0; i < 100; i++) { try { if (SKIN_REGISTRY.characters.some(c => c._a0 || /Character\//.test(c.asset || ''))) return true; } catch (e) {} await new Promise(r => setTimeout(r, 100)); } return false; }
  const preload = list => Promise.all(list.map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = () => r(); im.src = u; })));
  // ---------- main ----------
  let manifest = null;
  async function loadPacks(packs, onProg) { // คืนจำนวนแพ็กที่โหลดสำเร็จใหม่
    const tk = await token(), todo = [];
    await Promise.all(packs.map(async p => { if (loaded.has(p.id)) return; try { const k = await getKey(p, tk); if (k.key) todo.push({ p, key: k.key }); } catch (e) { if (p.tier === 'public') throw e; } })); // แพ็กที่ซื้อไว้: ถ้าเซิร์ฟเวอร์ไม่ตอบ ข้ามไปก่อน (ใช้ภาพตัวอย่าง) · แพ็กฟรี: ต้องได้
    const total = todo.reduce((n, t) => n + t.p.bytes, 0) || 1; let done = 0;
    for (const { p, key } of todo) {
      const base = done; const buf = await loadPak(p, f => onProg(0.05 + 0.55 * (base + f * p.bytes) / total, T.s2)); done += p.bytes;
      try { await openPak(buf, key); } catch (e) { try { localStorage.removeItem(kname(p)); } catch (x) {} throw e; } // กุญแจแคชเก่า/ผิด → ล้างให้ลองใหม่รอบหน้า
      loaded.add(p.id); onProg(0.6 + 0.3 * done / total, T.s3);
    }
    return todo.length;
  }
  async function run() {
    try { const r = await fetch('./pack/manifest.json', { cache: 'no-cache' }); if (!r.ok) return false; manifest = await r.json(); } catch (e) { return false; }
    if (!manifest || !Array.isArray(manifest.packs)) return false; L.packs = manifest.packs;
    mount(); prog(0.04, T.s1);
    await loadPacks(manifest.packs, prog);
    prog(0.92, T.s4); await whenRegistry(); patchRegistry();
    let t = 0; const iv = setInterval(() => { if (patchRegistry() && typeof render === 'function') try { render(); } catch (e) {} if (++t > 40) clearInterval(iv); }, 500); // ถ้า app.js โหลดทะเบียนใหม่ภายหลัง ให้แทนที่ซ้ำ
    await preload([...urls.entries()].filter(([n]) => /\.(png|webp|jpe?g|gif|svg)$/i.test(n)).map(([, u]) => u));
    prog(1, T.s4); return true;
  }
  // เรียกหลังซื้อ/สุ่มได้ตัวละครใหม่ → ขอกุญแจแพ็กที่ยังไม่ปลดล็อกอีกครั้ง (ไม่มีผลถ้าไม่มีแพ็กใหม่)
  L.refresh = async function () {
    if (!manifest) return false; const left = manifest.packs.filter(p => !loaded.has(p.id) && p.tier === 'owner'); if (!left.length) return false;
    try { if (await loadPacks(left, () => {})) { patchRegistry(); if (typeof render === 'function') render(); return true; } } catch (e) {} return false;
  };
  // ผูกการปลดล็อกอัตโนมัติ: หลังซื้อไอเทม/เปิดผลสุ่มกาชา
  const wrap = name => { const f = window[name]; if (typeof f !== 'function' || f._pk) return; const g = function () { const r = f.apply(this, arguments); setTimeout(() => L.refresh && L.refresh(), 800); return r; }; g._pk = 1; window[name] = g; };
  let tries = 0, lastInv = -1; const hook = setInterval(() => { ['gcShow', 'buyItem'].forEach(wrap); if (++tries > 60) tries = 60; // คลังของผู้เล่นเปลี่ยน (ซื้อ/สุ่มได้/ล็อกอินใหม่) → ลองปลดล็อกภาพเต็ม
    try { const n = window.DB && DB.P && DB.P.inventory ? DB.P.inventory.length : 0; if (lastInv >= 0 && n !== lastInv) L.refresh(); lastInv = n; } catch (e) {} }, 2000);
  document.addEventListener('contextmenu', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  L.ready = run().then(ok => { if (ok) { try { if (typeof render === 'function') render(); } catch (e) {} setTimeout(hide, 250); } return ok; }).catch(e => { fail(e); return false; });
})();
