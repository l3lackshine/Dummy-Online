/* pack-loader.js — หน้าโหลดก่อนเข้าเกม + โหลด/ถอดรหัสแพ็กแอสเซ็ต (pack/characters.pak) เก็บในเครื่อง
   Flow: อ่าน manifest → ใช้แพ็กจากแคชในเครื่อง (ถ้าเวอร์ชันตรง) หรือดาวน์โหลดพร้อมแถบความคืบหน้า → ถอดรหัสในหน่วยความจำ
         → แทนที่ path ของรูปในทะเบียนสกิน (SKIN_REGISTRY) ด้วย blob URL → ปิดหน้าโหลด
   ไม่มี manifest (โหมดพัฒนา/ยังไม่แพ็ก) = ข้ามเงียบ ๆ เกมใช้ไฟล์ตรงตามเดิม
   Public: PackLoader.url(path) · PackLoader.ready (Promise)
   Extend: เปลี่ยนที่มาของกุญแจที่ getKey() (ก้อนที่ 2: ขอจากเซิร์ฟเวอร์) · เพิ่มแพ็กใหม่ที่ PACKS */
(function () {
  'use strict';
  const PACKS = ['characters']; // EXTEND: เพิ่มชื่อแพ็กที่นี่ (ต้องมี pack/manifest ตรงกัน — ตอนนี้ 1 แพ็ก)
  const urls = new Map(), L = window.PackLoader = { url: p => urls.get(String(p).replace(/^\.\//, '')) || null, ready: null };
  const T = { title: 'กำลังเตรียมเกม', s1: 'ตรวจเวอร์ชันไฟล์', s2: 'ดาวน์โหลดทรัพยากร', s3: 'ถอดรหัสไฟล์', s4: 'เตรียมภาพ', tip: 'ครั้งแรกอาจใช้เวลาสักครู่ ครั้งต่อไปจะเร็วขึ้นมาก', fail: 'โหลดไม่สำเร็จ', retry: 'ลองอีกครั้ง' };
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
  const fail = e => { if (!ov) return; ov.classList.add('bad'); ov.querySelector('.pk-msg').textContent = T.fail + ' — ' + (e && e.message ? e.message : e); ov.querySelector('button').onclick = () => location.reload(); };
  // ---------- กุญแจ ----------
  // EXTEND(ก้อนที่ 2): ขอกุญแจจากเซิร์ฟเวอร์หลังล็อกอิน แล้วคืน Uint8Array 32 ไบต์
  async function getKey(id) {
    const k = (window.__PK || {})[id]; if (!k) throw new Error('ไม่พบกุญแจแพ็ก ' + id);
    const a = b64(k[0]), m = b64(k[1]); return a.map((x, i) => x ^ m[i]);
  }
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  // ---------- ดาวน์โหลด (พร้อมแคชในเครื่อง) ----------
  async function loadPak(man, onProg) {
    const url = './pack/' + man.file + '?v=' + man.version;
    try { if (window.caches) { const c = await caches.open('dummy-pack'), hit = await c.match(url); if (hit) { onProg(1); return new Uint8Array(await hit.arrayBuffer()); } } } catch (e) {}
    const r = await fetch(url); if (!r.ok) throw new Error('ดาวน์โหลดไม่ได้ (' + r.status + ')');
    const total = Number(r.headers.get('content-length')) || man.bytes, chunks = []; let got = 0;
    if (r.body && r.body.getReader) { const rd = r.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); got += value.length; onProg(got / total); } }
    else { chunks.push(new Uint8Array(await r.arrayBuffer())); onProg(1); }
    const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0)); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
    try { if (window.caches) { const c = await caches.open('dummy-pack'); for (const k of await c.keys()) await c.delete(k); await c.put(url, new Response(buf)); } } catch (e) {}
    return buf;
  }
  // ---------- ถอดรหัส ----------
  async function openPak(buf, keyBytes, onProg) {
    if (!(window.crypto && crypto.subtle)) throw new Error('เบราว์เซอร์นี้ไม่รองรับการถอดรหัส (ต้องเปิดผ่าน https)');
    if (String.fromCharCode(...buf.slice(0, 4)) !== 'DMP1') throw new Error('ไฟล์แพ็กไม่ถูกต้อง');
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']), dec = (iv, data, aad) => crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(aad) }, key, data);
    const idxLen = new DataView(buf.buffer, buf.byteOffset + 16, 4).getUint32(0, true), base = 20 + idxLen;
    let index; try { index = JSON.parse(new TextDecoder().decode(await dec(buf.slice(4, 16), buf.slice(20, base), 'index'))); } catch (e) { throw new Error('กุญแจไม่ตรงกับไฟล์แพ็ก'); }
    const names = Object.keys(index.files); let n = 0;
    for (const name of names) {
      const f = index.files[name], plain = await dec(b64(f.iv), buf.slice(base + f.o, base + f.o + f.l), name);
      urls.set(name, URL.createObjectURL(new Blob([plain], { type: f.t }))); onProg(++n / names.length);
    }
    return names;
  }
  // ---------- แทนที่ path ในทะเบียนสกิน ----------
  const swap = v => { if (typeof v === 'string') { const u = L.url(v); return u || v; } if (Array.isArray(v)) return v.map(swap); if (v && typeof v === 'object') { for (const k of Object.keys(v)) v[k] = swap(v[k]); } return v; };
  // รอจนทะเบียนสกินเป็นตัวที่โหลดจาก skins.json แล้ว (มี path ของไฟล์ในแพ็ก) — app.js สลับตัวแปรนี้ตอน fetch เสร็จ
  async function whenRegistry(names) { for (let i = 0; i < 100; i++) { try { const j = JSON.stringify(SKIN_REGISTRY); if (names.some(n => j.includes(n))) return true; } catch (e) {} await new Promise(r => setTimeout(r, 100)); } return false; }
  function patchRegistry() { try { if (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY && !SKIN_REGISTRY.__pk) { swap(SKIN_REGISTRY); Object.defineProperty(SKIN_REGISTRY, '__pk', { value: 1, enumerable: false }); return true; } } catch (e) {} return false; }
  const preload = urlsList => Promise.all(urlsList.map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = () => r(); im.src = u; })));
  // ---------- main ----------
  async function run() {
    let man; try { const r = await fetch('./pack/manifest.json', { cache: 'no-cache' }); if (!r.ok) return false; man = await r.json(); } catch (e) { return false; }
    mount();
    prog(0.04, T.s1); const keyP = getKey(man.id);
    const buf = await loadPak(man, p => prog(0.05 + p * 0.55, T.s2)), key = await keyP;
    const names = await openPak(buf, key, p => prog(0.6 + p * 0.3, T.s3));
    prog(0.92, T.s4); await whenRegistry(names); patchRegistry();
    let t = 0; const iv = setInterval(() => { if (patchRegistry() && typeof render === 'function') try { render(); } catch (e) {} if (++t > 40) clearInterval(iv); }, 500); // ถ้า app.js โหลดทะเบียนใหม่ภายหลัง ให้แทนที่ซ้ำ
    await preload(names.filter(n => /\.(png|webp|jpe?g|gif|svg)$/i.test(n)).map(n => L.url(n)));
    prog(1, T.s4); return true;
  }
  // กันบันทึกภาพ: ห้ามลาก/เมนูคลิกขวาบนรูป (ช่วยกันคนทั่วไป ไม่ใช่การป้องกันสมบูรณ์)
  document.addEventListener('contextmenu', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target && e.target.tagName === 'IMG') e.preventDefault(); });
  L.ready = run().then(ok => { if (ok) { try { if (typeof render === 'function') render(); } catch (e) {} setTimeout(hide, 250); } return ok; }).catch(e => { fail(e); return false; });
})();
