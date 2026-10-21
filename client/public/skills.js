/* skills.js — ระบบสกิล/ค่าความสามารถ (ไม่แตะกติกา · คำนวณจากไพ่ที่ผู้เล่นเห็นอยู่แล้วเท่านั้น)
   ข้อมูลสกิลอยู่ที่ ./skin/skills.json (แก้ด้วย skill-editor.html) · ยังไม่ผูกกับตัวละคร จนกว่าจะใส่ใน "characters" */
(function () {
  const EMPTY = { version: 1, stats: [], skills: [], characters: {} };
  let SK = EMPTY; const LS = window.localStorage;
  const jget = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  let prog = jget('dummySkillProg', { lv: {} }); if (!prog.lv) prog.lv = {};
  const saveProg = () => LS.setItem('dummySkillProg', JSON.stringify(prog));
  const E = s => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  function load() {
    const ov = jget('dummySkillsOverride', null); // จาก skill-editor (ทดสอบในเครื่องนี้)
    if (ov && Array.isArray(ov.skills)) { SK = ov; return; }
    fetch('./skin/skills.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : EMPTY)).then(j => { SK = j && Array.isArray(j.skills) ? j : EMPTY; if (typeof render === 'function') render(); }).catch(() => {});
  }
  const SAFE = ['hawkeye', 'cardcount', 'coinbonus', 'scramble'];
  const slv = id => Math.max(0, Math.min((SK.stats.find(s => s.id === id) || { max: 10 }).max || 10, prog.lv[id] | 0));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function val(s, k) { const base = Number((s.params || {})[k]) || 0, sc = (s.scale || {})[k], lim = (s.limit || {})[k];
    let v = base + (sc ? slv(sc.stat) * (Number(sc.per) || 0) : 0); if (lim && lim.length === 2) v = clamp(v, lim[0], lim[1]); return k === 'uses' || k === 'ranks' ? Math.floor(v + 1e-9) : Math.round(v * 10) / 10; }
  const testMode = () => LS.getItem('dummySkillTest') === '1';
  function mySkills() { const all = (SK.skills || []).filter(s => s.enabled !== false && SAFE.includes(s.effect));
    if (testMode()) return all; const ids = (SK.characters || {})[typeof myChar === 'function' ? myChar() : ''] || []; return all.filter(s => ids.includes(s.id)); }
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
  // ---- หน้าความสามารถ ----
  window.openSkills = function () {
    document.querySelectorAll('.sk-modal').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'sk-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    const st = SK.stats.map(s => { const lv = slv(s.id), max = s.max || 10, cost = (s.cost && s.cost.base || 100) + (s.cost && s.cost.step || 80) * lv;
      return `<div class=sk-row><div><b>${E(s.icon)} ${E(s.name)}</b> <em>Lv ${lv}/${max}</em><small>${E(s.desc || '')}</small><div class=sk-pips>${Array.from({ length: max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
      <button class=sk-up ${lv >= max || sv.coins < cost ? 'disabled' : ''} onclick="skUp('${E(s.id)}')">${lv >= max ? 'เต็ม' : '⬆ 🪙' + cost}</button></div>`; }).join('');
    const mine = mySkills().map(s => s.id), sl = (SK.skills || []).filter(s => SAFE.includes(s.effect)).map(s => `<div class=sk-row><div><b>${E(s.icon)} ${E(s.name)}</b> <em>${s.type === 'active' ? 'กดใช้' : 'ติดตัว'}</em>${s.enabled === false ? ' <em>ปิดอยู่</em>' : ''}<small>${E(s.desc || '')}</small>
      <small class=sk-v>${Object.keys(s.params || {}).map(k => k + ': ' + val(s, k)).join(' · ')}</small></div><span class=sk-tag>${mine.includes(s.id) ? '✔ ใช้งานอยู่' : 'ยังไม่ผูกตัวละคร'}</span></div>`).join('');
    m.innerHTML = `<div class=sk-box><button class=sk-x onclick="this.closest('.sk-modal').remove()">✕</button><h3>⚡ ความสามารถ <span class=sk-coin>🪙 ${sv.coins}</span></h3><h4>ค่าความสามารถ</h4>${st || '<small>ยังไม่มีข้อมูลสกิล</small>'}<h4>สกิลทั้งหมด</h4>${sl}
      <label class=sk-test><input type=checkbox ${testMode() ? 'checked' : ''} onchange="skTest(this.checked)"> โหมดทดสอบ: ให้ตัวละครมีทุกสกิลตอนนี้</label><small>สกิลไม่เปลี่ยนกติกา ไม่เห็นไพ่คนอื่น และไม่มีผลกับการแจกไพ่</small></div>`;
    document.body.appendChild(m); };
  window.skUp = function (id) { const s = SK.stats.find(x => x.id === id); if (!s) return; const lv = slv(id), cost = (s.cost && s.cost.base || 100) + (s.cost && s.cost.step || 80) * lv;
    if (lv >= (s.max || 10) || sv.coins < cost) return; sv.coins -= cost; prog.lv[id] = lv + 1; saveProg(); save(); openSkills(); render(); };
  window.skTest = on => { LS.setItem('dummySkillTest', on ? '1' : '0'); render(); };
  if (typeof render === 'function') { const _r = render; window.render = render = function () { const r = _r.apply(this, arguments); try { paint(); } catch (e) {} return r; }; }
  load();
})();
