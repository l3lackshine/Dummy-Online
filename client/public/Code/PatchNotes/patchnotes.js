/* patchnotes.js — แพตช์โน้ตในเกม (ข้อมูลใน patchnotes.json)
   - เปิดเกมครั้งแรกหลังอัปเวอร์ชัน → แสดงอัตโนมัติ 1 ครั้ง (จำใน localStorage: dummySeenPatch)
   - กดป้ายเวอร์ชันมุมขวาล่างหน้าแรก → เปิดดูได้ทุกเมื่อ
   Public: openPatchNotes() */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  let DATA = null;
  const load = () => (DATA ? Promise.resolve(DATA) : fetch('./patchnotes.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : { notes: [] })).then(j => (DATA = j)).catch(() => ({ notes: [] })));
  function html(notes) {
    return notes.map((n, i) => `<article class="pn-ver${i ? ' old' : ''}"><header><b>${E(n.version)}</b><small>${E(n.date || '')}</small></header><h4>${E(n.title || '')}</h4>
      ${(n.sections || []).map(s => `<section><h5>${E(s.head)}</h5><ul>${(s.items || []).map(t => `<li>${E(t)}</li>`).join('')}</ul></section>`).join('')}</article>`).join('');
  }
  window.openPatchNotes = async () => {
    const d = await load(); if (!d.notes || !d.notes.length) return;
    document.querySelectorAll('.pn-modal').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'st-modal pn-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="st-box pn-box"><button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3>📜 มีอะไรใหม่</h3><div class=pn-list>${html(d.notes)}</div></div>`;
    document.body.appendChild(m);
    try { LS && LS.setItem('dummySeenPatch', d.notes[0].version); } catch (e) {}
  };
  // กดป้ายเวอร์ชัน → เปิดแพตช์โน้ต
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('.ver')) window.openPatchNotes(); });
  // เวอร์ชันใหม่ที่ยังไม่เคยเห็น → แสดงเองครั้งเดียว (รอหน้าแรกขึ้นก่อน)
  function auto(n) {
    const v = window.DUMMY_VERSION; let seen = null; try { seen = LS && LS.getItem('dummySeenPatch'); } catch (e) {}
    if (!v || seen === v) return;
    if (!(typeof screen !== 'undefined' && screen === 'home' && document.querySelector('.ver'))) { if (n < 40) setTimeout(() => auto(n + 1), 500); return; }
    if (!seen) { try { LS && LS.setItem('dummySeenPatch', v); } catch (e) {} return; }   // ผู้เล่นใหม่: ไม่ต้องเด้ง
    load().then(d => { if (d.notes && d.notes[0] && d.notes[0].version === v) window.openPatchNotes(); });
  }
  setTimeout(() => auto(0), 1500);
})();
