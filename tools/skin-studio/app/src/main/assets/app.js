// Skin Studio — หน้าจอแอป (ตรรกะทั้งหมดอยู่ใน core.js) · UI เป็น HTML ธรรมดาใน WebView
(function () {
  'use strict';
  const C = window.StudioCore, K = C.KINDS;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DEF = { owner: '', repo: '', branch: 'main', token: '', skinDir: 'client/public/skin', commonPath: 'server/src/rules/common.js', siteUrl: 'https://dummy-online-client.onrender.com' };
  const PRESETS = [0, 100, 150, 250, 400, 700];
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* เต็ม/ปิดอยู่ */ } } };
  let cfg0 = {}; try { cfg0 = JSON.parse(ls.get('ss.cfg') || '{}'); } catch (e) { /* ใช้ค่าเริ่มต้น */ }
  let skins0 = null; try { skins0 = JSON.parse(ls.get('ss.skins') || 'null'); } catch (e) { /* ยังไม่มี */ }
  const st = { tab: 'shop', kind: 'backgrounds', addKind: 'backgrounds', cfg: Object.assign({}, DEF, cfg0), skins: skins0, ops: [], form: null, shrink: true, busy: false, log: [], result: null, sheet: null, errors: [], msg: '', showTok: false, note: '' };

  // ---- เก็บรายการที่ยังไม่อัปโหลดใน IndexedDB (รูปใหญ่เกินที่ localStorage จะรับได้) ----
  const mem = {};
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('skin-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function kvGet(k) { try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch (e) { return mem[k]; } }
  async function kvSet(k, v) { mem[k] = v; try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { /* ใช้หน่วยความจำแทน */ } }
  const saveOps = () => kvSet('ops', st.ops);
  const saveCfg = () => ls.set('ss.cfg', JSON.stringify(st.cfg));
  const cfgOk = () => !!(st.cfg.owner && st.cfg.repo && st.cfg.token);

  const work = () => (st.skins ? C.applyOps(st.skins, st.ops).json : null);
  const newForm = kind => ({ kind, id: C.suggestId(kind), name: '', price: '100', colors: Object.fromEntries(K[kind].colors.map(([k, , d]) => [k, d])), css: '', ink: '#ffffff', file: null });
  function toast(t) { const e = $('toast'); if (!e) return; e.textContent = t; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { e.style.display = 'none'; }, 2200); }

  // ---- รูป: ย่อ + แปลงเป็น WebP ก่อนอัปโหลด (ภาพจากมือถือใหญ่เกิน เกมโหลดช้า) ----
  const blobB64 = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = () => rej(f.error); f.readAsDataURL(b); });
  async function readImage(file, kind) {
    const mime = file.type || '';
    if (mime === 'image/svg+xml') { const t = await file.text(); return { mime, b64: C.b64FromText(t), size: t.length }; }
    if (!/^image\/(png|jpeg|webp)$/.test(mime)) throw new Error('รองรับเฉพาะ WebP / PNG / JPG / SVG');
    if (!st.shrink) return { mime, b64: await blobB64(file), size: file.size };
    const bmp = await createImageBitmap(file), max = K[kind].maxSide || 1280, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bmp.width * sc)); cv.height = Math.max(1, Math.round(bmp.height * sc)); cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    let blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.86)); if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    return { mime: blob.type, b64: await blobB64(blob), size: blob.size, w: cv.width, h: cv.height };
  }

  // ---- GitHub ----
  const gh = () => C.makeGH(st.cfg, (u, o) => window.fetch(u, o));
  async function loadSkins(quiet) {
    const sk = await gh().getText(String(st.cfg.skinDir).replace(/\/+$/, '') + '/skins.json'); if (!sk) throw new Error('ไม่พบ skins.json ในโฟลเดอร์ "' + st.cfg.skinDir + '"');
    st.skins = JSON.parse(sk.text); ls.set('ss.skins', JSON.stringify(st.skins)); if (!quiet) toast('โหลดสกินแล้ว');
  }
  async function guarded(fn) { if (st.busy) return; st.busy = true; st.note = ''; render(); try { await fn(); } catch (e) { st.note = '⚠️ ' + (e && e.message || e); } st.busy = false; render(); }
  async function doPush() {
    if (st.busy || !st.ops.length || !cfgOk()) return; st.busy = true; st.log = []; st.result = null; render();
    try { const out = await C.pushChanges(st.cfg, st.ops, st.msg.trim() || C.defaultMessage(st.ops), (u, o) => window.fetch(u, o), m => { st.log.push(m); render(); }); st.result = { ok: true, out }; st.ops = []; st.msg = ''; await saveOps(); try { await loadSkins(true); } catch (e) { /* โหลดซ้ำไม่ได้ ไม่เป็นไร */ } }
    catch (e) { st.result = { ok: false, error: e && e.message || String(e) }; }
    st.busy = false; render();
  }

  // ---- มุมมอง ----
  function assetUrl(x) { const a = x.asset || '', b = String(st.cfg.siteUrl || '').replace(/\/+$/, ''); return a && b ? b + a.replace(/^\./, '') : ''; }
  function pendingImg(kind, id) { const o = st.ops.find(p => p.type === 'add' && p.kind === kind && p.entry.id === id); return o && o.file ? 'data:' + o.file.mime + ';base64,' + o.file.b64 : ''; }
  function thumb(kind, x) {
    const u = pendingImg(kind, x.id) || assetUrl(x);
    const bg = kind === 'themes' ? 'linear-gradient(135deg,' + x.bg + ',' + x.card + ')' : kind === 'tables' ? 'linear-gradient(135deg,' + x.bg + ',' + x.bg2 + ')' : kind === 'backs' ? 'repeating-linear-gradient(45deg,' + x.b1 + ',' + x.b1 + ' 5px,' + x.b2 + ' 5px,' + x.b2 + ' 10px)' : x.css || '#334';
    return '<div class=thumb style="background:' + esc(bg) + '">' + (u ? '<img loading=lazy src="' + esc(u) + '" alt="" onerror="this.remove()">' : '') + '</div>';
  }
  function shopView() {
    const w = work(); if (!w) return '<div class=panel><p class=note>ยังไม่มีข้อมูลสกิน — ตั้งค่า GitHub แล้วกดโหลด</p><button class=btn data-act=tab data-tab=settings>ไปหน้าตั้งค่า</button></div>';
    const chips = C.KIND_ORDER.map(k => '<button class="chip' + (st.kind === k ? ' on' : '') + '" data-act=kind data-kind=' + k + '>' + K[k].icon + ' ' + K[k].label + '</button>').join('');
    const list = w[st.kind] || [], nk = K[st.kind].nameKey, selling = list.filter(x => Number(x.price) > 0).length;
    const items = list.map(x => { const p = Number(x.price) || 0, isNew = st.ops.some(o => o.type === 'add' && o.kind === st.kind && o.entry.id === x.id);
      return '<div class="item' + (isNew ? ' new' : '') + '">' + thumb(st.kind, x) + '<div class=meta><b>' + esc(x[nk] || x.id) + (isNew ? '<span class=tag>ใหม่</span>' : '') + '</b><small>' + esc(x.id) + '</small><br><span class="price' + (p > 0 ? '' : ' free') + '">' + (p > 0 ? '🪙 ' + p + ' · ขายในร้าน' : 'ฟรี · ไม่ขึ้นร้านค้า') + '</span></div><div class=btns><button class=sm data-act=price data-id="' + esc(x.id) + '">💰 ราคา</button><button class=sm data-act=rename data-id="' + esc(x.id) + '">✏️ ชื่อ</button><button class="sm del" data-act=remove data-id="' + esc(x.id) + '">🗑️ ลบ</button></div></div>'; }).join('');
    return '<div class=chips>' + chips + '</div><p class=note>ขายในร้าน ' + selling + ' จาก ' + list.length + ' รายการ · ตั้งราคา &gt; 0 = ขึ้นร้านค้า, ตั้ง 0 = ของฟรี</p><div class=list>' + (items || '<p class=note>ยังไม่มีรายการ</p>') + '</div><button class="btn ghost" data-act=load ' + (st.busy || !cfgOk() ? 'disabled' : '') + '>🔄 โหลดสกินล่าสุดจาก GitHub</button>';
  }
  function addView() {
    const f = st.form || (st.form = newForm(st.addKind)), k = K[f.kind];
    const chips = C.KIND_ORDER.map(x => '<button class="chip' + (f.kind === x ? ' on' : '') + '" data-act=addkind data-kind=' + x + '>' + K[x].icon + ' ' + K[x].label + '</button>').join('');
    const cols = k.colors.length ? '<label>สี</label><div class=colors>' + k.colors.map(([key, label]) => '<div class=col><input type=color data-c=' + key + ' value="' + esc(f.colors[key]) + '"><span>' + esc(label) + '</span></div>').join('') + '</div>' : '';
    const bgx = f.kind === 'backgrounds' ? '<label>หรือใช้ CSS gradient แทนรูป (ไม่บังคับ)</label><input type=text data-f=css placeholder="linear-gradient(180deg,#2b2160 0%,#d9774f 100%)" value="' + esc(f.css) + '"><label>สีตัวอักษรบนพื้นหลัง</label><div class=colors><div class=col><input type=color data-f=ink value="' + esc(f.ink) + '"><span>ตัวอักษร</span></div></div>' : '';
    const img = k.asset === 'none' ? '' : '<label>รูป' + (k.asset === 'required' ? ' (จำเป็น)' : ' (ไม่บังคับ)') + ' — ' + esc(k.hint) + '</label><input type=file id=file accept="image/*" hidden><button class="btn ghost" data-act=pickimg style="margin-top:0">📷 เลือกรูปจากเครื่อง</button><label class=row style="margin-top:8px;color:var(--tx)"><input class=fix type=checkbox data-shrink ' + (st.shrink ? 'checked' : '') + ' style="width:20px;height:20px"><span>ย่อรูปและแปลงเป็น WebP อัตโนมัติ (แนะนำ)</span></label>' + (f.file ? '<div class=preview>' + '<img src="data:' + esc(f.file.mime) + ';base64,' + f.file.b64 + '" alt="">' + '<div class=note>' + esc(f.file.mime.replace('image/', '').toUpperCase()) + ' · ' + Math.round((f.file.size || 0) / 1024) + ' KB' + (f.file.w ? ' · ' + f.file.w + '×' + f.file.h : '') + (f.file.size > 700000 ? '<br>⚠️ ไฟล์ใหญ่ ผู้เล่นโหลดช้า' : '') + '<br><a href="#" data-act=clearimg>เอารูปออก</a></div></div>' : '');
    const errs = st.errors.length ? '<div class=err><ul style="margin:0;padding-left:18px">' + st.errors.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul></div>' : '';
    return '<div class=chips>' + chips + '</div><div class=panel><label>ชื่อที่แสดงในร้าน</label><input type=text data-f=name maxlength=30 placeholder="เช่น ห้องนีออน" value="' + esc(f.name) + '"><label>id (ภาษาอังกฤษพิมพ์เล็ก/ตัวเลข/ขีด — ห้ามซ้ำ)</label><div class=row><input type=text data-f=id autocapitalize=none autocomplete=off value="' + esc(f.id) + '"><button class="sm fix" data-act=randid>🎲 สุ่ม</button></div><label>ราคา (เหรียญ) — 0 = ฟรี ไม่ขึ้นร้านค้า</label><input type=number inputmode=numeric data-f=price min=0 value="' + esc(f.price) + '"><div class=chips style="margin-top:6px">' + PRESETS.map(p => '<button class=chip data-act=preset data-v=' + p + '>' + (p ? '🪙 ' + p : 'ฟรี') + '</button>').join('') + '</div>' + cols + bgx + img + '</div>' + errs + '<button class="btn go" data-act=additem>➕ เพิ่มเข้ารายการอัปโหลด</button>' + (f.kind === 'backgrounds' || f.kind === 'characters' ? '<p class=note>ระบบจะเพิ่ม id นี้ในรายการของเซิร์ฟเวอร์ (' + esc(st.cfg.commonPath) + ') ให้อัตโนมัติ เพื่อให้ผู้เล่นคนอื่นมองเห็นสกินนี้</p>' : '');
  }
  function describe(o) { const k = K[o.kind], nm = o.type === 'add' ? o.entry[k.nameKey] : o.id;
    return o.type === 'add' ? '➕ ' + k.icon + ' ' + esc(nm) + ' · ' + (Number(o.entry.price) > 0 ? '🪙 ' + o.entry.price : 'ฟรี') + (o.file ? ' · มีรูป' : '') : o.type === 'price' ? '💰 ' + k.icon + ' ' + esc(nm) + ' → ' + (Number(o.price) > 0 ? '🪙 ' + o.price : 'ฟรี') : o.type === 'name' ? '✏️ ' + k.icon + ' ' + esc(nm) + ' → ' + esc(o.name) : '🗑️ ลบ ' + k.icon + ' ' + esc(nm); }
  function pushView() {
    const r = st.result, ops = st.ops.map((o, i) => '<div class=item><div class=meta><b style="white-space:normal">' + describe(o) + '</b></div><button class="sm del" data-act=delop data-i=' + i + '>เอาออก</button></div>').join('');
    const res = !r ? '' : r.ok ? '<div class=okbox>✅ อัปโหลดสำเร็จ<br><a href="' + esc(r.out.commit.url) + '">ดู commit บน GitHub</a><br><small>' + r.out.files.map(esc).join('<br>') + '</small><br>เกมจะอัปเดตเมื่อ Render deploy เสร็จ (ปกติ 1–3 นาที)</div>' + r.out.warnings.map(w => '<div class=warn>⚠️ ' + esc(w) + '</div>').join('') : '<div class=err>❌ ' + esc(r.error).replace(/\n/g, '<br>') + '</div>';
    return '<h2>รายการที่รออัปโหลด (' + st.ops.length + ')</h2><div class=list>' + (ops || '<p class=note>ยังไม่มีการเปลี่ยนแปลง — เพิ่มสกินหรือแก้ราคาก่อน</p>') + '</div>' + (st.ops.length ? '<label>ข้อความ commit (ไม่บังคับ)</label><input type=text data-msg placeholder="' + esc(C.defaultMessage(st.ops)) + '" value="' + esc(st.msg) + '">' : '') + (!cfgOk() ? '<div class=warn>ยังไม่ได้ตั้งค่า GitHub — ไปที่แท็บตั้งค่า</div>' : '') + '<button class="btn go" data-act=push ' + (st.busy || !st.ops.length || !cfgOk() ? 'disabled' : '') + '>' + (st.busy ? '⏳ กำลังอัปโหลด…' : '🚀 อัปโหลดขึ้น GitHub') + '</button>' + (st.log.length ? '<div class=log>' + st.log.map(esc).join('\n') + '</div>' : '') + res;
  }
  function settingsView() {
    const c = st.cfg, inp = (k, label, ph, type) => '<label>' + label + '</label><input type=' + (type || 'text') + ' data-cfg=' + k + ' autocapitalize=none autocomplete=off spellcheck=false placeholder="' + esc(ph || '') + '" value="' + esc(c[k]) + '">';
    return '<div class=panel>' + inp('owner', 'เจ้าของ repo (ชื่อ GitHub)', 'เช่น somchai') + inp('repo', 'ชื่อ repo', 'เช่น dummy-online-5p') + inp('branch', 'branch', 'main') + '<label>GitHub Token</label><div class=row><input type=' + (st.showTok ? 'text' : 'password') + ' data-cfg=token autocapitalize=none autocomplete=off spellcheck=false placeholder="github_pat_…" value="' + esc(c.token) + '"><button class="sm fix" data-act=tok>' + (st.showTok ? 'ซ่อน' : 'แสดง') + '</button></div><p class=note>เก็บไว้ในเครื่องนี้เท่านั้น ส่งไปที่ api.github.com ที่เดียว</p>' + inp('skinDir', 'โฟลเดอร์สกินใน repo', 'client/public/skin') + inp('commonPath', 'ไฟล์ id ฝั่งเซิร์ฟเวอร์ (CHARS/BGS)', 'server/src/rules/common.js') + inp('siteUrl', 'ที่อยู่เกม (ใช้แสดงรูปตัวอย่าง)', 'https://…', 'url') + '</div><button class=btn data-act=check ' + (st.busy || !cfgOk() ? 'disabled' : '') + '>🔌 ทดสอบการเชื่อมต่อ</button><button class="btn ghost" data-act=load ' + (st.busy || !cfgOk() ? 'disabled' : '') + '>🔄 โหลดสกินจาก GitHub</button>' + (st.note ? '<div class=' + (st.note.startsWith('⚠️') ? 'err' : 'okbox') + '>' + esc(st.note) + '</div>' : '') +
      '<h2>สร้างโทเคนยังไง</h2><div class=panel><p class=note style="margin:0">1) GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token<br>2) Repository access: เลือกเฉพาะ repo ของเกม<br>3) Permissions → <b>Contents: Read and write</b><br>4) คัดลอกโทเคนมาวางด้านบน (ถ้า repo เป็นของ organization อาจต้องให้ admin อนุมัติ)</p></div>';
  }
  function sheetView() {
    const s = st.sheet; if (!s) return '';
    if (s.type === 'price') return '<div class=sheet><h3>💰 ตั้งราคา: ' + esc(s.name) + '</h3><input type=number inputmode=numeric data-sheet=val min=0 value="' + esc(s.val) + '"><div class=chips style="margin-top:8px">' + PRESETS.map(p => '<button class=chip data-act=sheetpreset data-v=' + p + '>' + (p ? '🪙 ' + p : 'ฟรี') + '</button>').join('') + '</div><p class=note>0 = ของฟรี (ไม่ขึ้นร้านค้า) · มากกว่า 0 = ขายในร้านค้า</p><button class="btn go" data-act=sheetok>ตกลง</button><button class="btn ghost" data-act=sheetx>ยกเลิก</button></div>';
    if (s.type === 'rename') return '<div class=sheet><h3>✏️ แก้ชื่อ</h3><input type=text maxlength=30 data-sheet=val value="' + esc(s.val) + '"><button class="btn go" data-act=sheetok>ตกลง</button><button class="btn ghost" data-act=sheetx>ยกเลิก</button></div>';
    return '<div class=sheet><h3>🗑️ ลบ "' + esc(s.name) + '" ?</h3>' + (s.hasAsset ? '<label class=row style="color:var(--tx)"><input class=fix type=checkbox data-sheet=del checked style="width:20px;height:20px"><span>ลบไฟล์รูปออกจาก repo ด้วย</span></label>' : '') + '<p class=note>ผู้เล่นที่ซื้อไปแล้วจะไม่เห็นสกินนี้อีก (จะไม่คืนเหรียญ)</p><button class="btn" style="background:var(--bad)" data-act=sheetok>ลบ</button><button class="btn ghost" data-act=sheetx>ยกเลิก</button></div>';
  }
  function render() {
    const nav = [['shop', '🛍️', 'ร้านค้า'], ['add', '➕', 'เพิ่มสกิน'], ['push', '🚀', 'อัปโหลด'], ['settings', '⚙️', 'ตั้งค่า']];
    const body = st.tab === 'shop' ? shopView() : st.tab === 'add' ? addView() : st.tab === 'push' ? pushView() : settingsView();
    $('app').innerHTML = '<header><h1>🎨 Skin Studio</h1>' + (cfgOk() ? '<span class=repo>' + esc(st.cfg.owner + '/' + st.cfg.repo) + '</span>' : '') + '</header>' + (st.note && st.tab !== 'settings' ? '<div class=err>' + esc(st.note) + '</div>' : '') + body + '<nav>' + nav.map(([t, i, l]) => '<button class="' + (st.tab === t ? 'on' : '') + '" data-act=tab data-tab=' + t + '><b>' + i + '</b>' + l + (t === 'push' && st.ops.length ? '<span class=bd>' + st.ops.length + '</span>' : '') + '</button>').join('') + '</nav>';
    $('sheet').innerHTML = sheetView();
  }

  // ---- คำสั่ง ----
  function addItem() {
    const f = st.form, w = work() || {}, errors = C.validate(f.kind, f, w[f.kind] || []); st.errors = errors; if (errors.length) return render();
    const b = C.buildEntry(f.kind, f); st.ops.push({ type: 'add', kind: f.kind, entry: b.entry, file: b.file }); saveOps();
    toast('เพิ่มแล้ว — ไปแท็บ "อัปโหลด" เมื่อพร้อม'); st.form = newForm(f.kind); st.errors = []; render();
  }
  function openSheet(type, id) {
    const w = work(), x = w && (w[st.kind] || []).find(y => y.id === id); if (!x) return; const nk = K[st.kind].nameKey;
    st.sheet = { type, id, name: x[nk] || x.id, val: type === 'price' ? String(Number(x.price) || 0) : x[nk] || '', hasAsset: /^\.\/skin\//.test(x.asset || '') }; render();
  }
  function sheetOk() {
    const s = st.sheet; if (!s) return; const kind = st.kind;
    if (s.type === 'price') { const p = C.toPrice(s.val); if (Number.isNaN(p)) return toast('ราคาต้องเป็นจำนวนเต็ม ≥ 0'); st.ops.push({ type: 'price', kind, id: s.id, price: p }); }
    else if (s.type === 'rename') { const n = String(s.val).trim(); if (!n || n.length > 30) return toast('ชื่อ 1–30 ตัวอักษร'); st.ops.push({ type: 'name', kind, id: s.id, name: n }); }
    else {
      const add = st.ops.findIndex(o => o.type === 'add' && o.kind === kind && o.entry.id === s.id);
      if (add >= 0) st.ops = st.ops.filter((o, i) => i !== add && !(o.id === s.id && o.kind === kind)); else st.ops.push({ type: 'remove', kind, id: s.id, deleteAsset: s.del !== false });
    }
    st.sheet = null; saveOps(); render();
  }
  async function onFile(input) {
    const file = input.files && input.files[0]; if (!file || !st.form) return;
    try { st.form.file = await readImage(file, st.form.kind); st.errors = []; } catch (e) { st.errors = [e.message || 'อ่านรูปไม่ได้']; }
    render();
  }
  function act(a, d) {
    if (a === 'tab') { st.tab = d.tab; st.note = ''; st.sheet = null; return render(); }
    if (a === 'kind') { st.kind = d.kind; return render(); }
    if (a === 'addkind') { st.addKind = d.kind; st.form = newForm(d.kind); st.errors = []; return render(); }
    if (a === 'randid') { st.form.id = C.suggestId(st.form.kind); return render(); }
    if (a === 'preset') { st.form.price = d.v; return render(); }
    if (a === 'pickimg') { const f = $('file'); if (f) f.click(); return; }
    if (a === 'clearimg') { st.form.file = null; return render(); }
    if (a === 'additem') return addItem();
    if (a === 'price' || a === 'rename' || a === 'remove') return openSheet(a, d.id);
    if (a === 'sheetpreset') { st.sheet.val = d.v; return render(); }
    if (a === 'sheetok') return sheetOk();
    if (a === 'sheetx') { st.sheet = null; return render(); }
    if (a === 'delop') { st.ops.splice(Number(d.i), 1); saveOps(); return render(); }
    if (a === 'tok') { st.showTok = !st.showTok; return render(); }
    if (a === 'check') return guarded(async () => { const r = await gh().check(); st.note = '✅ เชื่อมต่อ ' + r.name + (r.private ? ' (private)' : '') + (r.canPush ? ' — มีสิทธิ์เขียน' : ' — ⚠ โทเคนอาจไม่มีสิทธิ์เขียน'); });
    if (a === 'load') return guarded(async () => { await loadSkins(); if (st.tab === 'settings') st.note = '✅ โหลดสกินแล้ว'; });
    if (a === 'push') return doPush();
  }
  window.__back = () => { if (st.sheet) { st.sheet = null; render(); return true; } if (st.tab !== 'shop') { st.tab = 'shop'; render(); return true; } return false; };

  document.addEventListener('click', e => { const el = e.target && e.target.closest && e.target.closest('[data-act]'); if (!el) return; if (e.preventDefault) e.preventDefault(); act(el.dataset.act, el.dataset); });
  document.addEventListener('input', e => {
    const t = e.target, d = t.dataset || {};
    if (d.cfg) { st.cfg[d.cfg] = t.value.trim(); saveCfg(); }
    else if (d.f && st.form) st.form[d.f] = t.value;
    else if (d.c && st.form) st.form.colors[d.c] = t.value;
    else if (d.msg !== undefined) st.msg = t.value;
    else if (d.sheet === 'val' && st.sheet) st.sheet.val = t.value;
  });
  document.addEventListener('change', e => {
    const t = e.target, d = t.dataset || {};
    if (t.id === 'file') return onFile(t);
    if (d.shrink !== undefined) st.shrink = !!t.checked;
    if (d.sheet === 'del' && st.sheet) st.sheet.del = !!t.checked;
  });

  window.__studio = { st, render, act, work };   // ไว้ทดสอบ
  kvGet('ops').then(v => { if (Array.isArray(v) && v.length) st.ops = v; render(); });
  render();
})();
