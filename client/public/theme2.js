/* theme2.js — ส่วน JS ของธีมใหม่ (คู่กับ theme2.css)
   1) หน้าแรกแบบ RoV: วางชั้น .rv ทับหน้าแรกเดิม (ปุ่มเดิมยังอยู่ แค่ซ่อนไว้ — ฟังก์ชันเดิมทำงานเหมือนเดิมทุกอย่าง)
   2) เปลี่ยนอีโมจิเหรียญ 🪙 เป็นรูปเหรียญจากชุด UI
   ไม่แก้ app.js: ทำงานหลัง render() ทุกครั้ง ผ่าน MutationObserver */
(function () {
  'use strict';
  const KIT = './UI/Assets/kit2/';
  const N = n => Number(n || 0).toLocaleString('en-US');
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const DBP = () => (window.DB && DB.enabled && DB.P) || null;

  // ---------- ไอคอนเส้น (ใช้ในปุ่มกลม) ----------
  const I = {
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    book: '<path d="M3 5c3-1.5 6-1.5 9 0v15c-3-1.5-6-1.5-9 0zM21 5c-3-1.5-6-1.5-9 0v15c3-1.5 6-1.5 9 0z"/>',
    shop: '<path d="M4 8h16l-1.5 12h-13zM8 8a4 4 0 0 1 8 0"/>',
    bag: '<path d="M3 9h18v11H3zM3 9l2-5h14l2 5M10 13h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.5 4.5-6 8-6s6.5 1.5 8 6"/>',
    quest: '<path d="M6 3h10l3 3v15H6zM9 9h7M9 13h7M9 17h4"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><circle cx="17" cy="10" r="2.6"/><path d="M3 20c1-3.5 3.3-5 6-5s5 1.5 6 5M15 15.5c2.6 0 4.5 1.3 5.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    news: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>',
    medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11 6 3h4l2 5 2-5h4l-2.5 8M12 13v4M10.5 15h3"/>'
  };
  const ic = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>';
  window.thIcon = ic;

  // ---------- 1) หน้าแรก ----------
  const ruleName = () => { try { const m = ruleMeta(createSel.rule); return m ? m.name : 'ดัมมี่'; } catch (e) { return 'ดัมมี่'; } };
  // ---------- ปุ่มเริ่มเล่น: บอกสตามิน่า · กดแล้วกลีบซากุระแตก · ลูกศรเปลี่ยนเกม ----------
  const rvStLine = () => {
    const st = window.Stamina && Stamina.now(); if (!st) return '';
    const ic = '<img class=st-ic src="./Item/Mats/stamina.webp" alt="">';
    return st.stamina < st.cost ? `${ic} ไม่พอ · โหมดซ้อม` : `${ic} <b data-st>${N(st.stamina)}</b>/${N(st.max)} · ตาละ ${st.cost}`;
  };
  window.rvStart = e => {
    const b = e && e.currentTarget; if (!b || b.dataset.go) return; b.dataset.go = '1'; b.classList.add('press');
    const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('i'); p.className = 'rv-petal'; const a = Math.PI * 2 * i / 14 + Math.random() * .4, d = r.height * (1.2 + Math.random() * 1.1);
      p.style.cssText = `background-image:url(./UI/Assets/fx/petal-${1 + (Math.random() * 7 | 0)}.webp);--sz:${(0.8 + Math.random() * 0.6).toFixed(2)};left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d * .7 - r.height * .3}px;--rot:${(Math.random() * 540 - 270) | 0}deg`;
      document.body.appendChild(p); setTimeout(() => p.remove(), 950);
    }
    setTimeout(() => { delete b.dataset.go; b.classList.remove('press'); goPlay(); }, 320);
  };
  window.rvPickGame = e => {
    if (e) e.stopPropagation();
    const old = document.querySelector('.rv-gpick'); if (old) { old.remove(); return; }
    const list = (typeof RULES !== 'undefined' && RULES.length ? RULES : []), cur = createSel.rule;
    if (!list.length) { if (screen !== 'play') goPlay(); return; }
    const m = document.createElement('div'); m.className = 'rv-gpick';
    m.innerHTML = list.map(r => `<button class="${r.id === cur ? 'on' : ''}" onclick="setRule('${E(r.id)}');document.querySelector('.rv-gpick')?.remove()"><span>${E(r.icon || '🂠')}</span><b>${E(r.name)}</b>${r.id === cur ? '<em>✓</em>' : ''}</button>`).join('');
    const host = (e && e.currentTarget && e.currentTarget.closest && e.currentTarget.closest('.gcur-w')) || document.querySelector('.rv-play'); if (host) host.appendChild(m);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  };
  window.thMode = mode => { try { if (RULES.length) { chooseGame(createSel.rule || RULES[0].id); openCreate(mode); return; } } catch (e) {} goPlay(); };
  function buildHome(app) {
    const scene = app.querySelector('.scene'); if (!scene || scene.querySelector('.rv')) return;
    const P = DBP(), name = (P && P.display_name) || (typeof sv !== 'undefined' && sv.name) || 'ผู้เล่น';
    const coins = P ? P.coins : (typeof sv !== 'undefined' ? sv.coins : 0);
    const avEl = app.querySelector('.hud-av .av-fc'), av = (app.querySelector('.hud-av img') || {}).src || '';   // .av-fc = รูปซูมหน้า (avFace)
    const title = (P && P.title) || '';
    const lv = window.Progress ? Progress.level() : { level: 1, into: 0, need: 100 }, lvPct = Math.min(100, Math.round((lv.into / Math.max(1, lv.need)) * 100));
    const nq = (document.querySelector('.hud-q i') || {}).textContent || '';
    const nb = window.battlePass && battlePass.count ? battlePass.count() : 0;   // รางวัลแบทเทิลพาสที่รับได้ — แสดงที่การ์ดแบทเทิลพาสเอง ไม่ปนกับเควส
    const d = document.createElement('div'); d.className = 'rv';
    d.innerHTML = `
      <button class="rv-me rv-me2" onclick="go('profile')" aria-label="โปรไฟล์">
        <span class="rv-plate"><b>${E(name)}</b><small>${E(title || 'ยังไม่ได้ตั้งฉายา')}</small></span>
        <span class="rv-lvbar"><i><u style="width:${lvPct}%"></u></i><b><em>LV</em>${lv.level}</b><small>${N(lv.into)}/${N(lv.need)}</small></span>
        <span class="rv-av2"><span>${avEl ? avEl.outerHTML : av ? `<img src="${E(av)}" alt="">` : ''}</span></span></button>
      <div class="rv-top">
        ${window.Stamina ? Stamina.pill() : ''}<span class="rv-cur"><img src="${KIT}coin.webp" alt="">${N(coins)}<i onclick="go('shop')">${ic('plus')}</i></span>
        ${P ? `<span class="rv-cur"><img src="${KIT}gem.webp" alt="">${N(P.mcash)}<i onclick="go('shop')">${ic('plus')}</i></span>` : ''}
        ${typeof window.openDaily === 'function' && P ? `<button class="rv-rb" style="background-image:url(${KIT}rb-gift.webp)" onclick="openDaily()" aria-label="ล็อกอินรายวัน"></button>` : ''}
        <button class="rv-rb" style="background-image:url(${KIT}rb-gear.webp)" onclick="openSettings()" aria-label="ตั้งค่า"></button>
      </div>
      <div class="rv-side">
        <button class="rv-sb rv-pn" onclick="openPatchNotes()" aria-label="แพตช์โน้ต">${ic('news')}<small>อัปเดต</small></button>
      </div>
      <div class="rv-ev">
        <button class="rv-card big" onclick="go('shop')"><img src="./Shop/Gasha/sakuya-up/banner.webp" alt=""><span>ราชินีไพ่ซากุยะ<small>SSR ใหม่ · เรทอัป!</small></span></button>
        <button class="rv-card rv-bp" onclick="bpOpen()"><i>${ic('medal')}</i><span>แบทเทิลพาส<small>${nb ? nb + ' รางวัลรอรับ' : 'ฤดู ราชินีซากุระ'}</small></span>${nb ? '<em>' + nb + '</em>' : ''}</button>
        <button class="rv-card" onclick="openQuests()"><i>${ic('quest')}</i><span>เควสประจำวัน<small>${nq ? nq + ' รายการรอรับ' : 'ทำเควสรับเหรียญ'}</small></span>${nq ? '<em>' + E(nq) + '</em>' : ''}</button>
      </div>
      <nav class="rv-nav">
        <button onclick="go('shop')">${ic('shop')}<span>ร้านค้า</span></button>
        <button onclick="invOpen('characters')">${ic('bag')}<span>ช่องเก็บของ</span></button>
      </nav>
      <div class="rv-play">
        <button class="rv-swap" onclick="rvPickGame(event)" aria-label="เปลี่ยนเกม"><span>${E(ruleName())}</span><i>▾</i></button>
        <button class="rv-start" onclick="rvStart(event)"><b>เริ่มเล่น</b><small class=rv-st>${rvStLine()}</small></button>
      </div>`;
    scene.appendChild(d);
  }

  // ---------- 2) 🪙 → รูปเหรียญ ----------
  function swapCoin(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = [];
    while (w.nextNode()) if (w.currentNode.nodeValue.includes('🪙')) hits.push(w.currentNode);
    hits.forEach(t => {
      if (t.parentNode && /^(INPUT|TEXTAREA|OPTION|SCRIPT|STYLE)$/.test(t.parentNode.nodeName)) return;
      const frag = document.createDocumentFragment();
      t.nodeValue.split('🪙').forEach((p, i) => {
        if (i) { const im = document.createElement('img'); im.className = 'kicon'; im.src = KIT + 'coin.webp'; im.alt = ''; frag.appendChild(im); }
        if (p) frag.appendChild(document.createTextNode(p));
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  function pass() {
    const app = document.getElementById('app'); if (!app) return;
    obs.disconnect();
    try { if (app.classList.contains('home')) buildHome(app); swapCoin(app); } catch (e) { console.warn('theme2', e); }
    obs.observe(app, { childList: true, subtree: true, characterData: true });
  }
  const obs = new MutationObserver(pass);
  const start = () => { pass(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
