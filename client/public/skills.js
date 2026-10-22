/* skills.js — ระบบสกิล/ค่าความสามารถ (ไม่แตะกติกา · คำนวณจากไพ่ที่ผู้เล่นเห็นอยู่แล้วเท่านั้น)
   ค่าความสามารถ "ผูกกับตัวละคร": ค่า = base + perStar × (ดาว−1) ตามที่ตั้งใน ./skin/skills.json (แก้ด้วย skill-studio.html)
   การอัพค่าความสามารถ = อัพดาวตัวละคร (เสียเหรียญ) — ไม่มีปุ่มอัพ stat รายตัวอีกแล้ว */
(function () {
  const EMPTY = { version: 1, stats: [], skills: [], characters: {} };
  let SK = EMPTY; const LS = window.localStorage;
  const jget = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const dbOn = () => !!(window.DB && DB.enabled);
  const stars0 = jget('dummyStars', {});
  const charId = () => (typeof myChar === 'function' ? myChar() : '') || '';
  // ดาวของตัวละคร: โหมดบัญชี = จากฐานข้อมูล · โหมดเดิม = เก็บในเครื่อง
  const starsOf = id => Math.min(maxStars(id), Math.max(1, dbOn() ? DB.stars(id) : (Number(stars0[id]) || 1)));
  const maxStars = id => window.SkillCore ? SkillCore.charCfg(SK, id).maxStars : 5;
  const starCost = (id, st) => { const c = SkillCore.charCfg(SK, id).starCosts; return Number(c[Math.min(st, c.length) - 1]) || 1000; }; // ราคาอัพจากดาว st → st+1
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  function load() {
    const ov = jget('dummySkillsOverride', null); // จาก skill-studio (ทดสอบในเครื่องนี้)
    if (ov && Array.isArray(ov.skills)) { SK = ov; return; }
    fetch('./skin/skills.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : EMPTY)).then(j => { SK = j && Array.isArray(j.skills) ? j : EMPTY; if (typeof render === 'function') render(); }).catch(() => {});
  }
  const SAFE = ['hawkeye', 'cardcount', 'coinbonus', 'scramble'];
  const slv = statId => SkillCore.statValue(SK, statId, charId(), starsOf(charId()));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const val = (s, k) => SkillCore.skillVal(s, k, slv);
  const testMode = () => LS.getItem('dummySkillTest') === '1';
  function mySkills() { const all = (SK.skills || []).filter(s => s.enabled !== false && SAFE.includes(s.effect));
    if (testMode()) return all; const ids = SkillCore.charCfg(SK, charId()).skills; return all.filter(s => ids.includes(s.id)); }
  const has = eff => mySkills().find(s => s.effect === eff);
  // ---- ค่าที่รันระหว่างเกม ----
  let RT = { gid: null, used: {}, last: {} };
  const rt = () => { const g = typeof S !== 'undefined' && S ? S.gid : null; if (RT.gid !== g) RT = { gid: g, used: {}, last: {} }; return RT; };
  let hawk = null;
  function toast(t) { const d = document.createElement('div'); d.className = 'sk-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
  // ---- เกิดได้ไหม (ใช้แค่ไพ่ในมือ + ไพ่ที่เปิดอยู่) ----
  function canMeld(hand, id) { const c = ALL[id], H = hand.map(i => ALL[i]);
    if (H.filter(x => x.r === c.r).length >= 2) return true;
    const rs = new Set(H.filter(x => x.s === c.s).map(x => x.r)); rs.add(c.r); if (rs.has(1)) rs.add(14);
    for (let a = 1; a <= 12; a++) if (rs.has(a) && rs.has(a + 1) && rs.has(a + 2) && [a, a + 1, a + 2].some(r => (r === 14 ? 1 : r) === c.r)) return true; return false; }
  function paint() {
    document.querySelectorAll('.sk-bar,.sk-count').forEach(n => n.remove());
    document.querySelectorAll('.c.hk').forEach(n => n.classList.remove('hk'));
    if (typeof S === 'undefined' || !S || typeof screen === 'undefined' || screen !== 'game' || S.over || (S.rule && S.rule !== 'dummy')) return;
    const st = rt(), sk = mySkills(); if (!sk.length) return;
    if (hawk && Date.now() < hawk.until) { const cs = document.querySelectorAll('#dp .c.d'); S.disc.forEach(([id], i) => { if (cs[i] && canMeld(S.hand, id)) cs[i].classList.add('hk'); }); }
    const host = document.querySelector('.gx-stage') || document.getElementById('app'); if (!host) return;
    const act = sk.filter(s => s.type === 'active');
    if (act.length) { const b = document.createElement('div'); b.className = 'sk-bar';
      b.innerHTML = act.map(s => { const left = val(s, 'uses') - (st.used[s.id] || 0), cd = val(s, 'cooldown') * 1000 - (Date.now() - (st.last[s.id] || 0)); const dis = left <= 0 || cd > 0;
        return `<button class="sk-b${dis ? ' off' : ''}" onclick="skUse('${E(s.id)}')" title="${E(s.desc || '')}"><span>${E(s.icon || '⚡')}</span><b>${E(s.name)}</b><i>${left > 0 ? (cd > 0 ? Math.ceil(cd / 1000) + 'วิ' : 'x' + left) : 'หมด'}</i></button>`; }).join('');
      host.appendChild(b); if (act.some(s => val(s, 'cooldown') * 1000 - (Date.now() - (st.last[s.id] || 0)) > 0) && !paint._t) paint._t = setTimeout(() => { paint._t = 0; paint(); }, 1000); }
    const cc = sk.find(s => s.effect === 'cardcount');
    if (cc) { const seen = {}; const add = id => { const r = ALL[id].r; seen[r] = (seen[r] || 0) + 1; };
      S.hand.forEach(add); S.disc.forEach(([id]) => add(id)); S.melds.forEach(m => m.cs.forEach(add));
      const ranks = [...new Set(S.hand.map(i => ALL[i].r))].slice(0, val(cc, 'ranks'));
      const d = document.createElement('div'); d.className = 'sk-count'; d.innerHTML = '📊 ยังไม่เห็น: ' + ranks.map(r => `<b>${RK[r]}</b>×${Math.max(0, 4 - (seen[r] || 0))}`).join(' ');
      host.appendChild(d); }
  }
  window.skUse = function (id) {
    const s = mySkills().find(x => x.id === id); if (!s || !S || S.over) return; const st = rt();
    if (val(s, 'uses') - (st.used[id] || 0) <= 0) return toast('ใช้ครบโควตาของเกมนี้แล้ว');
    if (val(s, 'cooldown') * 1000 - (Date.now() - (st.last[id] || 0)) > 0) return toast('สกิลยังคูลดาวน์');
    if (s.effect === 'hawkeye') { st.used[id] = (st.used[id] || 0) + 1; st.last[id] = Date.now(); hawk = { until: Date.now() + val(s, 'duration') * 1000 }; setTimeout(render, val(s, 'duration') * 1000 + 50); render(); return; }
    if (s.effect === 'scramble') {
      const o = S.P.filter(p => p.i !== S.my); const m = document.createElement('div'); m.className = 'sk-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
      m.innerHTML = `<div class=sk-box><h3>🎭 ป่วนสายตา — เลือกเป้าหมาย</h3>${o.map(p => `<button class=sk-tg data-i="${p.i}">${E(p.n)}</button>`).join('')}<small>ต้องเป็นผู้เล่นจริง · ไพ่ไม่หาย แค่สลับตำแหน่งชั่วคราว</small></div>`;
      m.querySelectorAll('.sk-tg').forEach(b => b.onclick = () => { m.remove(); if (typeof sock === 'undefined' || !sock || !sock.connected) return toast('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'); sock.emit('skill:use', { id: 'scramble', to: Number(b.dataset.i), ms: val(s, 'duration') * 1000 }); });
      document.body.appendChild(m); }
  };
  function hook() { if (typeof sock === 'undefined' || !sock || sock._sk) return; sock._sk = 1;
    sock.on('skill:result', r => { if (r && r.ok) { const st = rt(); st.used.scramble = (st.used.scramble || 0) + 1; st.last.scramble = Date.now(); toast('🎭 ป่วนสายตาสำเร็จ!'); render(); } else toast((r && r.error) || 'ใช้สกิลไม่ได้'); });
    sock.on('skill:fx', f => { if (!f || f.type !== 'scramble' || typeof ho === 'undefined') return; const ms = Math.max(2000, (Number(f.ms) || 5000) - slv('focus') * 300);
      for (let i = ho.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[ho[i], ho[j]] = [ho[j], ho[i]]; }
      document.body.classList.add('sk-mist'); toast('🎭 ' + E(f.from) + ' ป่วนสายตาคุณ! กด "เรียงไพ่" แก้ได้'); render(); setTimeout(() => document.body.classList.remove('sk-mist'), ms); }); }
  setInterval(hook, 700);
  window.skCoinBonus = function (delta) { const s = has('coinbonus'); return s && delta > 0 ? Math.floor(delta * val(s, 'pct') / 100) : 0; };
  // ---- การ์ดตัวละคร: ดาว + ค่าความสามารถ + สกิล (ใช้ทั้งหน้า ⚡ และแท็บตัวละครในโปรไฟล์) · ไม่มีปุ่มอัพ stat — อัพดาวเท่านั้น ----
  const starsHtml = (n, max) => Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  window.skCharCard = function (id, opt) {
    opt = opt || {}; const ch = (typeof SKIN_REGISTRY !== 'undefined' ? SKIN_REGISTRY.characters || [] : []).find(x => x.id === id), cfg = SkillCore.charCfg(SK, id);
    const st = starsOf(id), max = cfg.maxStars, full = st >= max, cost = full ? 0 : starCost(id, st), can = !full && sv.coins >= cost;
    const stats = (SK.stats || []).map(s => { const v = SkillCore.statValue(SK, s.id, id, st), nx = full ? v : SkillCore.statValue(SK, s.id, id, st + 1), mx = s.max || 10;
      return `<div class=ck-st><span>${E(s.icon)} ${E(s.name)}</span><div class=ck-bar><i style="width:${Math.min(100, v / mx * 100)}%"></i>${nx > v ? `<u style="left:${Math.min(100, v / mx * 100)}%;width:${Math.min(100, (nx - v) / mx * 100)}%"></u>` : ''}</div><b>${v}${nx > v ? `<em>+${Math.round((nx - v) * 100) / 100}</em>` : ''}</b></div>`; }).join('');
    const sks = (SK.skills || []).filter(s => cfg.skills.includes(s.id) && s.enabled !== false && SAFE.includes(s.effect)).map(s =>
      `<div class=ck-sk><span>${E(s.icon)}</span><div><b>${E(s.name)}</b> <em>${s.type === 'active' ? 'กดใช้' : 'ติดตัว'}</em><small>${E(s.desc || '')}</small><small class=sk-v>${Object.keys(s.params || {}).map(k => k + ': ' + val2(s, k, id, st)).join(' · ')}</small></div></div>`).join('');
    const up = full ? '<button class="sk-up" disabled>⭐ ดาวเต็มแล้ว</button>' : `<button class="sk-up" ${can ? '' : 'disabled'} onclick="skUpStar('${E(id)}')">⭐ อัพเป็น ${st + 1} ดาว · 🪙 ${cost}</button>`;
    return `<div class="ck${opt.compact ? ' compact' : ''}"><div class=ck-h>${ch && ch.asset ? `<img src="${E(ch.asset)}" alt="">` : ''}<div><b>${E((ch && ch.name) || id || 'ตัวละคร')}</b><div class=ck-stars>${starsHtml(st, max)}</div>${full ? '' : `<small>อัพดาวเพื่อเพิ่มค่าความสามารถ</small>`}</div></div>${stats}${sks ? `<h4>สกิลของตัวละคร</h4>${sks}` : '<small class=ck-none>ตัวละครนี้ยังไม่มีสกิล</small>'}<div class=ck-up>${up}</div></div>`;
  };
  const val2 = (s, k, id, st) => SkillCore.skillVal(s, k, sid => SkillCore.statValue(SK, sid, id, st));
  window.skUpStar = async function (id) {
    const st = starsOf(id); if (st >= maxStars(id)) return; const cost = starCost(id, st);
    if (dbOn()) { try { const r = await DB.upStar(id); if (window.dbToast) dbToast('⭐ ' + r.stars + ' ดาว!'); } catch (e) { if (window.dbToast) dbToast(e.message); } }
    else { if (sv.coins < cost) return; sv.coins -= cost; stars0[id] = st + 1; try { LS.setItem('dummyStars', JSON.stringify(stars0)); } catch (e) {} save(); }
    refreshOpen(); render();
  };
  function refreshOpen() { const m = document.querySelector('.sk-modal.sk-main'); if (m) fillSkills(m); }
  function fillSkills(m) {
    const id = charId(), others = (SK.skills || []).filter(s => SAFE.includes(s.effect));
    m.innerHTML = `<div class=sk-box><button class=sk-x onclick="this.closest('.sk-modal').remove()">✕</button><h3>⚡ ความสามารถตัวละคร <span class=sk-coin>🪙 ${sv.coins}</span></h3>${id ? skCharCard(id) : '<small>ยังไม่ได้เลือกตัวละคร</small>'}
      <label class=sk-test><input type=checkbox ${testMode() ? 'checked' : ''} onchange="skTest(this.checked)"> โหมดทดสอบ: ให้ตัวละครมีทุกสกิลตอนนี้</label><small>สกิลไม่เปลี่ยนกติกา ไม่เห็นไพ่คนอื่น และไม่มีผลกับการแจกไพ่ · ค่าความสามารถเพิ่มตามดาวของตัวละคร (อัพดาวได้ที่นี่หรือหน้าโปรไฟล์)</small></div>`;
  }
  window.openSkills = function () {
    document.querySelectorAll('.sk-modal.sk-main').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'sk-modal sk-main'; m.onclick = e => { if (e.target === m) m.remove(); };
    fillSkills(m); document.body.appendChild(m); };
  window.skTest = on => { LS.setItem('dummySkillTest', on ? '1' : '0'); render(); };
  if (typeof render === 'function') { const _r = render; window.render = render = function () { const r = _r.apply(this, arguments); try { paint(); } catch (e) {} return r; }; }
  load();
})();
