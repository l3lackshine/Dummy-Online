// แกนหลักของ Skin Studio — ไม่แตะ DOM ทดสอบด้วย node ได้ (test/test-core.js)
// ทำ 3 อย่าง: ตรวจ/สร้างรายการสกิน · แก้ skins.json + รายการ id ฝั่งเซิร์ฟเวอร์ · commit ขึ้น GitHub ด้วย Git Data API (หลายไฟล์ใน commit เดียว)
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.StudioCore = factory(); })(this, function () {
  'use strict';

  // ชนิดสกินที่แอปจัดการได้ — ตรงกับ client/public/skin/skins.json ของเกม
  // serverList = รายการ id ที่เซิร์ฟเวอร์ตรวจ (server/src/rules/common.js) ต้องเพิ่มพร้อมกัน ไม่งั้นผู้เล่นอื่นไม่เห็นสกินนี้
  const KINDS = {
    backgrounds: { label: 'พื้นหลังที่นั่ง', icon: '🖼️', nameKey: 'name', dir: 'backgrounds', asset: 'optional', serverList: 'BGS', colors: [], prefix: 'bg', maxSide: 1280, hint: 'ภาพแนวตั้ง ~3:4 (เช่น 900×1200) หรือใช้ CSS gradient แทนรูปก็ได้' },
    characters: { label: 'ตัวละคร', icon: '🧑', nameKey: 'name', dir: 'characters', asset: 'required', serverList: 'CHARS', colors: [], prefix: 'ch', maxSide: 1024, hint: 'รูปตัวละคร พื้นหลังโปร่งใส (PNG/WebP)' },
    backs: { label: 'หลังไพ่', icon: '🂠', nameKey: 'name', dir: 'cards/backs', asset: 'optional', colors: [['b1', 'สีหลัก', '#7a1f2b'], ['b2', 'สีรอง', '#5d1520']], prefix: 'back', maxSide: 512, hint: 'ลายหลังไพ่ (SVG/WebP) หรือใช้แค่สี 2 สีก็ได้' },
    tables: { label: 'โต๊ะ', icon: '🎴', nameKey: 'name', dir: 'tables', asset: 'optional', colors: [['bg', 'สีโต๊ะ', '#0f3d2a'], ['bg2', 'สีโต๊ะ (เข้ม)', '#0b2e20']], prefix: 'table', maxSide: 1280, hint: 'พื้นผิวโต๊ะ (ไม่บังคับ) หรือใช้แค่สี 2 สีก็ได้' },
    themes: { label: 'ธีมสี', icon: '🎨', nameKey: 'n', dir: null, asset: 'none', colors: [['card', 'สีไพ่', '#fbf7ec'], ['blk', 'สีดำบนไพ่', '#1b1b1b'], ['red', 'สีแดงบนไพ่', '#c0282d'], ['edge', 'สีขอบไพ่', '#cfc7b0'], ['b1', 'หลังไพ่ 1', '#7a1f2b'], ['b2', 'หลังไพ่ 2', '#5d1520'], ['bg', 'พื้นโต๊ะ', '#0f3d2a'], ['bg2', 'พื้นโต๊ะ (เข้ม)', '#0b2e20']], prefix: 'theme', hint: 'ชุดสีทั้งหน้าจอ' },
  };
  const KIND_ORDER = ['backgrounds', 'characters', 'backs', 'tables', 'themes'];
  const MIME_EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' };

  const isHex = s => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(String(s || ''));
  const isCss = s => /^(linear|radial|conic)-gradient\([^;{}<>"'`\\]*\)$/.test(String(s || '').trim());
  const isId = s => /^[a-z0-9][a-z0-9-]{1,30}$/.test(String(s || ''));
  const toPrice = v => { const n = Number(v); return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 1000000 ? n : NaN; };
  const clone = o => JSON.parse(JSON.stringify(o));
  const rand4 = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');
  const suggestId = kind => (KINDS[kind] ? KINDS[kind].prefix : 'skin') + '-' + rand4();

  // ===== ตรวจแบบฟอร์ม + สร้างรายการ (entry) ที่จะเขียนลง skins.json =====
  // form = { id, name, price, colors:{b1:'#..'}, css, ink, file:{mime,b64} | null }
  function validate(kind, form, existing) {
    const K = KINDS[kind], err = [];
    if (!K) return ['ไม่รู้จักชนิดสกิน'];
    const id = String(form.id || '').trim();
    if (!isId(id)) err.push('id ต้องเป็นตัวอักษรอังกฤษพิมพ์เล็ก/ตัวเลข/ขีด (-) ยาว 2–31 ตัว เช่น sakura-night');
    else if ((existing || []).some(x => x.id === id)) err.push('id "' + id + '" ซ้ำกับสกินที่มีอยู่แล้ว');
    const name = String(form.name || '').trim();
    if (!name) err.push('ใส่ชื่อสกิน'); else if (name.length > 30) err.push('ชื่อยาวเกิน 30 ตัวอักษร');
    if (Number.isNaN(toPrice(form.price))) err.push('ราคาต้องเป็นจำนวนเต็ม 0–1,000,000 (0 = ฟรี ไม่ขึ้นร้านค้า)');
    for (const [key, label] of K.colors) if (!isHex((form.colors || {})[key])) err.push('สี "' + label + '" ไม่ถูกต้อง');
    if (form.file && !MIME_EXT[form.file.mime]) err.push('ไฟล์รูปต้องเป็น WebP / PNG / JPG / SVG');
    if (K.asset === 'required' && !form.file) err.push('ต้องเลือกรูปสำหรับ' + K.label);
    if (kind === 'backgrounds') {
      const css = String(form.css || '').trim();
      if (!form.file && !css) err.push('พื้นหลังต้องมีรูป หรือใส่ CSS gradient');
      if (css && !isCss(css)) err.push('CSS ต้องเป็น linear-gradient(...) / radial-gradient(...) เท่านั้น');
      if (form.ink && !isHex(form.ink)) err.push('สีตัวอักษรไม่ถูกต้อง');
    }
    return err;
  }
  function buildEntry(kind, form) {
    const K = KINDS[kind], id = String(form.id).trim(), name = String(form.name).trim(), price = toPrice(form.price), c = form.colors || {};
    const rel = form.file && K.dir ? K.dir + '/' + id + '.' + MIME_EXT[form.file.mime] : '';
    const asset = rel ? './skin/' + rel : '';
    let entry;
    if (kind === 'themes') { entry = { id, n: name, price }; for (const [k] of K.colors) entry[k] = c[k]; }
    else if (kind === 'characters') entry = { id, name, asset, price };
    else if (kind === 'backs') entry = { id, name, price, asset, b1: c.b1, b2: c.b2 };
    else if (kind === 'tables') entry = { id, name, price, asset, bg: c.bg, bg2: c.bg2 };
    else entry = { id, name, price, asset, css: String(form.css || '').trim(), ink: form.ink || '#ffffff' };
    return { entry, file: rel ? { rel, mime: form.file.mime, b64: form.file.b64 } : null };
  }

  // ===== ใช้รายการเปลี่ยนแปลง (ops) กับ skins.json =====
  // op: {type:'add',kind,entry,file} | {type:'price',kind,id,price} | {type:'name',kind,id,name} | {type:'remove',kind,id,deleteAsset}
  function applyOps(json, ops) {
    const out = clone(json), errors = [], removed = [];
    for (const op of ops || []) {
      const K = KINDS[op.kind]; if (!K) { errors.push('ไม่รู้จักชนิด ' + op.kind); continue; }
      const list = Array.isArray(out[op.kind]) ? out[op.kind] : (out[op.kind] = []);
      if (op.type === 'add') { if (list.some(x => x.id === op.entry.id)) errors.push('id "' + op.entry.id + '" มีอยู่แล้วใน ' + K.label + ' (มีคนเพิ่มไปก่อนหน้านี้?)'); else list.push(clone(op.entry)); continue; }
      const x = list.find(y => y.id === op.id); if (!x) { errors.push('ไม่พบ "' + op.id + '" ใน ' + K.label + ' (ถูกลบไปแล้ว?)'); continue; }
      if (op.type === 'price') { const p = toPrice(op.price); if (Number.isNaN(p)) errors.push('ราคาของ "' + op.id + '" ไม่ถูกต้อง'); else x.price = p; }
      else if (op.type === 'name') x[K.nameKey] = String(op.name).trim();
      else if (op.type === 'remove') { out[op.kind] = list.filter(y => y.id !== op.id); if (op.deleteAsset !== false && /^\.\/skin\//.test(x.asset || '')) removed.push(x.asset); }
    }
    // ลบไฟล์รูปเฉพาะที่ไม่มีรายการอื่นใช้อยู่
    const used = new Set(Object.values(out).flat().map(x => x && x.asset).filter(Boolean));
    return { json: out, errors, removedAssets: [...new Set(removed)].filter(a => !used.has(a)) };
  }
  // เขียน skins.json กลับด้วยรูปแบบเดิมของไฟล์ (เยื้อง 1 ช่อง) เพื่อให้ diff บน GitHub เล็กที่สุด
  function serialize(json, original) { const nl = /\n$/.test(original || '') ? '\n' : ''; return JSON.stringify(json, null, 1) + nl; }

  // ===== แก้รายการ id ฝั่งเซิร์ฟเวอร์: const BGS = ['a', 'b']; =====
  function patchIdList(src, listName, id, add) {
    const re = new RegExp('(const\\s+' + listName + '\\s*=\\s*\\[)([^\\]]*)(\\])');
    const m = re.exec(src); if (!m) return { text: src, changed: false, missing: true };
    const items = [...m[2].matchAll(/'([^']*)'|"([^"]*)"/g)].map(x => x[1] != null ? x[1] : x[2]), has = items.includes(id);
    if (add === has) return { text: src, changed: false };
    const next = add ? items.concat(id) : items.filter(x => x !== id);
    return { text: src.replace(re, (_, a, __, c) => a + next.map(x => "'" + x + "'").join(', ') + c), changed: true };
  }

  // ===== base64 =====
  function b64FromText(s) { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); }
  function textFromB64(b64) { const bin = atob(String(b64).replace(/\s/g, '')), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder().decode(b); }

  // ===== วางแผนไฟล์ที่ต้อง commit =====
  // cfg = { skinDir:'client/public/skin', commonPath:'server/src/rules/common.js' }
  function buildPlan(cfg, skinsText, commonText, ops) {
    const skinDir = String(cfg.skinDir || 'client/public/skin').replace(/\/+$/, ''), warnings = [], files = [];
    let json; try { json = JSON.parse(skinsText); } catch (e) { return { errors: ['skins.json บน GitHub อ่านไม่ได้ (JSON เสีย): ' + e.message], files: [], warnings }; }
    const r = applyOps(json, ops); if (r.errors.length) return { errors: r.errors, files: [], warnings };
    files.push({ path: skinDir + '/skins.json', b64: b64FromText(serialize(r.json, skinsText)) });
    for (const op of ops) if (op.type === 'add' && op.file) files.push({ path: skinDir + '/' + op.file.rel, b64: op.file.b64 });
    for (const a of r.removedAssets) files.push({ path: skinDir + '/' + a.replace(/^\.\/skin\//, ''), del: true });
    // ตัวละคร/พื้นหลัง: เซิร์ฟเวอร์ตรวจ id ผู้เล่น ต้องเพิ่ม/ลบใน common.js ด้วย
    const need = ops.filter(o => KINDS[o.kind] && KINDS[o.kind].serverList && (o.type === 'add' || o.type === 'remove'));
    if (need.length) {
      if (commonText == null) warnings.push('ไม่พบ ' + cfg.commonPath + ' — ต้องเพิ่ม id ใน CHARS/BGS ของเซิร์ฟเวอร์เอง ไม่งั้นผู้เล่นอื่นจะไม่เห็นสกินใหม่');
      else {
        let t = commonText, changed = false;
        for (const o of need) { const id = o.type === 'add' ? o.entry.id : o.id, p = patchIdList(t, KINDS[o.kind].serverList, id, o.type === 'add'); if (p.missing) warnings.push('หา ' + KINDS[o.kind].serverList + ' ใน ' + cfg.commonPath + ' ไม่เจอ — เพิ่ม id "' + id + '" เองด้วย'); else if (p.changed) { t = p.text; changed = true; } }
        if (changed) files.push({ path: cfg.commonPath, b64: b64FromText(t) });
      }
    }
    return { errors: [], files, warnings, json: r.json };
  }

  // ===== GitHub =====
  function ghError(status, data, path) {
    const m = data && data.message ? ' (' + data.message + ')' : '';
    const t = status === 401 ? 'โทเคนไม่ถูกต้องหรือหมดอายุ'
      : status === 403 ? 'โทเคนไม่มีสิทธิ์เขียน (ต้องให้ "Contents: Read and write") หรือถูกจำกัดการเรียกชั่วคราว'
      : status === 404 ? 'ไม่พบ ' + (path || 'repo/branch') + ' — ตรวจชื่อเจ้าของ repo, ชื่อ repo, branch และให้โทเคนเข้าถึง repo นี้'
      : status === 409 || status === 422 ? 'ข้อมูลชนกัน (มีคน push ระหว่างนี้) กดอัปโหลดอีกครั้ง'
      : 'GitHub ตอบ ' + status;
    const e = new Error(t + m); e.status = status; return e;
  }
  function makeGH(cfg, fetchFn) {
    const base = 'https://api.github.com/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo), branch = cfg.branch || 'main';
    const enc = p => String(p).split('/').map(encodeURIComponent).join('/');
    async function api(method, path, body, what) {
      let r; try { r = await fetchFn(base + path, { method, headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + cfg.token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined }); }
      catch (e) { throw new Error('ต่อ GitHub ไม่ได้ — ตรวจอินเทอร์เน็ต'); }
      let data = null; try { data = await r.json(); } catch (e) { /* ไม่มี body */ }
      if (!r.ok) throw ghError(r.status, data, what); return data;
    }
    return {
      async check() { const d = await api('GET', '', null, 'repo ' + cfg.owner + '/' + cfg.repo); await api('GET', '/branches/' + enc(branch), null, 'branch ' + branch); return { name: d.full_name, canPush: !d.permissions || d.permissions.push !== false, private: !!d.private }; },
      async getText(path) {
        let d; try { d = await api('GET', '/contents/' + enc(path) + '?ref=' + encodeURIComponent(branch), null, path); } catch (e) { if (e.status === 404) return null; throw e; }
        if (d.encoding !== 'base64' || !d.content) d = await api('GET', '/git/blobs/' + d.sha, null, path);
        return { text: textFromB64(d.content), sha: d.sha };
      },
      async commit(files, message) {
        const ref = await api('GET', '/git/ref/heads/' + enc(branch), null, 'branch ' + branch), parent = ref.object.sha;
        const pc = await api('GET', '/git/commits/' + parent), tree = [];
        for (const f of files) {
          if (f.del) tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
          else { const b = await api('POST', '/git/blobs', { content: f.b64, encoding: 'base64' }); tree.push({ path: f.path, mode: '100644', type: 'blob', sha: b.sha }); }
        }
        const nt = await api('POST', '/git/trees', { base_tree: pc.tree.sha, tree });
        const c = await api('POST', '/git/commits', { message, tree: nt.sha, parents: [parent] });
        await api('PATCH', '/git/refs/heads/' + enc(branch), { sha: c.sha, force: false });
        return { sha: c.sha, url: c.html_url || 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/commit/' + c.sha };
      },
    };
  }
  // ดึงไฟล์ล่าสุดจาก GitHub → ใช้ ops → commit (ดึงใหม่ทุกครั้ง กันทับงานที่คนอื่น push ไปแล้ว)
  async function pushChanges(cfg, ops, message, fetchFn, log) {
    const gh = makeGH(cfg, fetchFn), say = log || (() => {}), skinDir = String(cfg.skinDir || 'client/public/skin').replace(/\/+$/, '');
    say('ดึง skins.json ล่าสุดจาก GitHub…'); const sk = await gh.getText(skinDir + '/skins.json'); if (!sk) throw new Error('ไม่พบ ' + skinDir + '/skins.json ใน repo — ตรวจ "โฟลเดอร์สกิน" ในตั้งค่า');
    let common = null; if (cfg.commonPath) { say('ดึงรายการ id ของเซิร์ฟเวอร์…'); const c = await gh.getText(cfg.commonPath); common = c ? c.text : null; }
    const plan = buildPlan(cfg, sk.text, common, ops); if (plan.errors.length) { const e = new Error(plan.errors.join('\n')); e.plan = plan; throw e; }
    say('อัปโหลด ' + plan.files.length + ' ไฟล์…'); const res = await gh.commit(plan.files, message);
    return { commit: res, files: plan.files.map(f => f.path + (f.del ? ' (ลบ)' : '')), warnings: plan.warnings };
  }
  function defaultMessage(ops) {
    const n = k => ops.filter(o => o.type === k).length, p = [];
    if (n('add')) p.push('เพิ่มสกิน ' + n('add') + ' รายการ'); if (n('price')) p.push('ปรับราคา ' + n('price')); if (n('name')) p.push('แก้ชื่อ ' + n('name')); if (n('remove')) p.push('ลบสกิน ' + n('remove'));
    return 'skin-studio: ' + (p.join(', ') || 'อัปเดตสกิน');
  }

  return { KINDS, KIND_ORDER, MIME_EXT, isHex, isCss, isId, toPrice, suggestId, validate, buildEntry, applyOps, serialize, patchIdList, b64FromText, textFromB64, buildPlan, makeGH, pushChanges, defaultMessage };
});
