/* profile.js — จัดหน้าโปรไฟล์ใหม่ตามภาพอ้างอิง (แนวนอน 3 ช่อง)
   ซ้าย: ตัวละคร + ชื่อ / ฉายา · กลาง: สกิน (ตัวละคร/หลังไพ่/โต๊ะ/พื้นหลัง) · ขวา: ความสามารถ
   ล่าง: ปุ่มไปร้านค้า
   - ไม่แก้ app.js / skills.js: เขียนทับฟังก์ชัน profileView() ที่ app.js เรียกอยู่แล้ว
   - ใช้ป้ายไม้ ui/sign-blank.webp เดิมทำหัวข้อ · ฉายาเก็บในเครื่อง (localStorage: dummyTitle) */
(function () {
  'use strict';
  const LS = window.localStorage, TK = 'dummyTitle';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const jget = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };

  // ข้อมูลความสามารถ: อ่านจากไฟล์เดียวกับ skills.js (หรือค่าทดสอบจาก skill-editor)
  let SKJ = null, loading = false;
  function loadSkills() {
    if (SKJ || loading) return;
    const ov = jget('dummySkillsOverride', null);
    if (ov && Array.isArray(ov.skills)) { SKJ = ov; return; }
    loading = true;
    fetch('./skin/skills.json').then(r => r.json()).then(j => { SKJ = j || { stats: [], skills: [] }; })
      .catch(() => { SKJ = { stats: [], skills: [] }; })
      .then(() => { loading = false; if (typeof screen !== 'undefined' && screen === 'profile' && typeof render === 'function') render(); });
  }

  window.pfTitle = v => { try { LS.setItem(TK, String(v || '').slice(0, 16)); } catch (e) {} if (window.dummyAcct && dummyAcct.on()) dummyAcct.push(); };

  function skinPanel() {
    return KINDS.map(([kind, label, , ic]) => {
      const items = (SKIN_REGISTRY[kind] || []).filter(x => owned(kind, x)), cur = equipped(kind);
      return `<section class=ksec><h3 class=sec>${ic} ${label}</h3><div class=pick-row>${items.map(x =>
        `<button class="pick${cur === x.id ? ' on' : ''}" onclick="equip('${kind}','${E(x.id)}')" aria-pressed="${cur === x.id}">${prevBox(kind, x)}<small>${E(x.name || x.n || x.id)}${cur === x.id ? ' ✓' : ''}</small></button>`).join('')}</div></section>`;
    }).join('');
  }

  function abilityPanel() {
    loadSkills();
    if (!SKJ) return '<p class=pf-empty>⏳ กำลังโหลด...</p>';
    const lv = (jget('dummySkillProg', { lv: {} }).lv) || {};
    const stats = (SKJ.stats || []).map(s => {
      const l = Math.min(Number(lv[s.id]) || 0, s.max || 10), max = s.max || 10;
      return `<div class=pf-st><div class=pf-st-h><b>${E(s.icon)} ${E(s.name)}</b><em>Lv ${l}/${max}</em></div><div class=sk-pips>${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div><small>${E(s.desc || '')}</small></div>`;
    }).join('');
    const skills = (SKJ.skills || []).filter(s => s.enabled !== false).map(s =>
      `<div class=pf-sk><span>${E(s.icon)}</span><div><b>${E(s.name)}</b> <em>${s.type === 'active' ? 'กดใช้' : 'ติดตัว'}</em><small>${E(s.desc || '')}</small></div></div>`).join('');
    const up = typeof window.openSkills === 'function' ? '<button class="wbtn pf-up" onclick="openSkills()">⚡ อัปเกรดความสามารถ</button>' : '';
    if (!stats && !skills) return '<p class=pf-empty>ยังไม่มีข้อมูลความสามารถ</p>';
    return stats + (skills ? '<h3 class=sec>สกิล</h3>' + skills : '') + up;
  }

  function view() {
    const ch = (SKIN_REGISTRY.characters || []).find(x => x.id === myChar());
    const hero = ch && ch.asset ? `<img src="${E(ch.asset)}" alt="${E(ch.name || 'ตัวละคร')}">` : `<div class=pf-av>${av(nick, myChar())}</div>`;
    const title = LS.getItem(TK) || '';
    const body = `<div class=pf>
      <div class="pf-box pf-me"><div class=pf-hero>${hero}</div><div class=pf-fields>
        <label class=pf-f><span class=pf-tag>ชื่อ</span><input id=nickInput maxlength=14 placeholder="ชื่อเล่น" value="${E(nick)}" oninput="setNick(this.value)"></label>
        <label class=pf-f><span class=pf-tag>ฉายา</span><input id=titleInput maxlength=16 placeholder="ฉายา" value="${E(title)}" oninput="pfTitle(this.value)"></label>
      </div></div>
      <div class="pf-box pf-pn"><div class=pf-tag><span>สกิน</span></div><div class=pf-scroll>${skinPanel()}</div></div>
      <div class="pf-box pf-pn"><div class=pf-tag><span>ความสามารถ</span></div><div class=pf-scroll>${abilityPanel()}</div></div>
      <button class="wbtn pf-shop" onclick="go('shop')">🛍️ ซื้อของเพิ่มที่ร้านค้า</button></div>`;
    page2('โปรไฟล์', body, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'pf'; // ไม่ให้กฎเดิมของหน้าโปรไฟล์ (layout.css) มาปน
  }

  const css = document.createElement('style');
  css.textContent = `
.pg[data-pg=pf] .pg-body{display:block;overflow:hidden;padding:calc(var(--u)*.6) calc(var(--u)*2.4) calc(var(--u)*1.6)}
.pf{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;gap:calc(var(--u)*1.4);height:100%;width:100%;color:var(--cream,#fff4dc)}
.pf-box{min-height:0;background:rgba(40,22,12,.82);border:max(2px,calc(var(--u)*.5)) solid #c9964f;border-radius:calc(var(--u)*3.4);box-shadow:0 5px 0 #0004;padding:calc(var(--u)*1.2)}
.pf-me{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:calc(var(--u)*1);align-items:center;overflow:hidden}
.pf-hero{height:100%;min-height:0;display:flex;align-items:flex-end;justify-content:center}
.pf-hero img{max-height:100%;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 6px #0008)}
.pf-av{font-size:calc(var(--u)*14)}.pf-av .avatar-img{width:calc(var(--u)*16);height:calc(var(--u)*16);border-radius:50%;object-fit:cover}
.pf-fields{display:flex;flex-direction:column;gap:calc(var(--u)*1.6);min-width:0}
.pf-f{display:flex;flex-direction:column;align-items:stretch;gap:calc(var(--u)*.5);min-width:0}
.pf-f .pf-tag{align-self:center}
.pf-tag{display:inline-block;box-sizing:border-box;border-style:solid;border-width:calc(var(--u)*2.2) calc(var(--u)*3);border-image:url(./ui/sign-blank.webp) 70 fill/calc(var(--u)*2.2) calc(var(--u)*3) stretch;background:#a4682f;
  font:700 max(12px,calc(var(--u)*3.4))/1 Mali,Sarabun,'Noto Sans Thai',sans-serif;color:var(--cream,#fff4dc);text-shadow:0 1px 0 #6b3a18,0 0 4px #3b1d0a;text-align:center;padding:0 calc(var(--u)*2);filter:drop-shadow(0 3px 3px #0007)}
.pf-pn{display:flex;flex-direction:column;align-items:stretch;gap:calc(var(--u)*1);overflow:hidden}
.pf-pn>.pf-tag{align-self:center;min-width:56%;flex:none}
.pf-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 calc(var(--u)*.4) calc(var(--u)*.6);-webkit-overflow-scrolling:touch}
.pf input{width:100%;box-sizing:border-box;padding:calc(var(--u)*1) calc(var(--u)*1.4);border-radius:12px;border:2px solid #c9964f;background:var(--cream,#fff4dc);color:#4a2a10;font:700 max(13px,calc(var(--u)*3.2)) Sarabun,sans-serif;text-align:center;letter-spacing:0;text-transform:none;min-width:0}
.pf .ksec+.ksec{margin-top:calc(var(--u)*1)}
.pf .sec{margin:calc(var(--u)*1) 0 calc(var(--u)*.5);font-size:max(12px,calc(var(--u)*2.6));color:var(--ui-gold,#ffd9a0)}
.pf-st{padding:calc(var(--u)*.8) 0;border-bottom:1px solid #ffffff1f}.pf-st-h{display:flex;justify-content:space-between;gap:8px;font-size:max(12px,calc(var(--u)*2.8))}
.pf-st em,.pf-sk em{font-style:normal;color:#ffd978;font-size:max(10px,calc(var(--u)*2.2))}
.pf-st small,.pf-sk small{display:block;color:#e8d3b3;font-size:max(10px,calc(var(--u)*2.2));line-height:1.25}
.pf-sk{display:flex;gap:calc(var(--u)*1);align-items:flex-start;padding:calc(var(--u)*.6) 0;font-size:max(12px,calc(var(--u)*2.6))}.pf-sk>span{font-size:calc(var(--u)*4);line-height:1.1}
.pf-empty{text-align:center;color:#e8d3b3;font-size:max(12px,calc(var(--u)*2.6))}
.pf .pf-up{width:100%;margin-top:calc(var(--u)*1.2);font-size:max(12px,calc(var(--u)*2.8))}
.pf .pf-shop{grid-column:1/-1;width:100%;padding:calc(var(--u)*1.4);font-size:max(14px,calc(var(--u)*3.6));border-radius:calc(var(--u)*2)}
@media (max-aspect-ratio:1/1){.pg[data-pg=pf] .pg-body{overflow-y:auto}.pf{grid-template-columns:minmax(0,1fr);grid-template-rows:none;height:auto}.pf-pn{max-height:60vh}.pf-me{min-height:40vh}}`;
  document.head.appendChild(css);

  window.profileView = view;
})();
