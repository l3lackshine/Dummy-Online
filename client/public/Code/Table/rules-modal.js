/* rules-modal.js — กล่องกติกา (เปิดจากห้องรอ/ระหว่างเล่น) — ข้อความมาจาก meta.howto / meta.scoring ของกฎ
   Public: showRules(ruleId) · closeRules() */
// กล่องกติกา (เปิดได้จากหน้าโต๊ะ/ระหว่างเล่น) — ข้อความทั้งหมดมาจาก meta.howto / meta.scoring ของกฎ
function showRules(id) {
  const m = ruleMeta(id || (S && S.rule) || (lob && lob.rule && lob.rule.id));
  if (!m) return;
  closeRules();
  const st = Number((S && S.stake) != null ? S.stake : (lob && lob.options && lob.options.stake) || 20),
    sc = (m.scoring || []).map(t =>
      esc(t.replace(/\{stake(?:\*([\d.]+))?\}/g, (_, k) => Math.round(st * (k ? +k : 1)) + ' ชิป'))
    );
  const el = document.createElement('div');
  el.id = 'ruleModal';
  el.className = 'pile-modal';
  el.setAttribute('onclick', 'if(event.target===this)closeRules()');
  el.innerHTML = `<div class=pile-dialog><div class=pile-title><b>${esc(m.icon || '')} กติกา${esc(m.name)}</b><button class=pile-close onclick=closeRules()>✕</button></div><div class=rule-body><ol>${(m.howto || [m.desc || '']).map(t => `<li>${esc(t)}</li>`).join('')}</ol><h4>🎴 การนับชิป (ใช้จัดอันดับ)</h4><ul>${sc.map(t => `<li>${t}</li>`).join('')}</ul></div></div>`;
  document.body.appendChild(el);
}
function closeRules() {
  const e = document.getElementById('ruleModal');
  if (e) e.remove();
}
