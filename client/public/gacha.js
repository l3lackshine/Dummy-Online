/* gacha.js — หน้ากาชา (แทนร้านค้า) · สุ่ม 1/10 ครั้งด้วยเหรียญหรือ MCash · ได้ของซ้ำ = เอาตัวละครไปอัพดาว หรือขายเป็นเหรียญ
   ราคา/โอกาส/การันตีทั้งหมดตัดสินที่ฐานข้อมูล (supabase/schema.sql: gacha_pull, sell_dupes) — ฝั่งนี้แค่แสดงผล
   ทำงานเฉพาะโหมดบัญชี (DB.enabled) — โหมดเดิมในเครื่องยังใช้ร้านค้าเก่า */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = n => Number(n || 0).toLocaleString('en-US');
  const RICON = { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' };
  const toast = t => { if (window.dbToast) dbToast(t); };
  let failed = false, tab = 'pull', bid = null, busy = false, loading = false, note = '', filt = 'all';
  const regItem = (kind, id) => ((window.SKIN_REGISTRY || {})[kind] || []).find(x => x.id === id);
  const thumb = (kind, id) => { const x = regItem(kind, id); try { return x && typeof prevBox === 'function' ? prevBox(kind, x) : '<div class=gc-ph>?</div>'; } catch (e) { return '<div class=gc-ph>?</div>'; } };
  const kindLabel = k => { const z = (window.KINDS || []).find(a => a[0] === k); return z ? z[1] : k; };

  function ensure() {
    if (DB.G || loading || failed || !DB.P) return;
    loading = true; DB.gacha().catch(e => { note = e.message; failed = true; }).then(() => { loading = false; try { render(); } catch (e) {} });
  }
  const banner = () => { const bs = (DB.G && DB.G.banners) || []; return bs.find(b => b.id === bid) || bs[0]; };

  function pullPanel() {
    const b = banner(); if (!b) return '<p class=note>ยังไม่มีตู้กาชาเปิดอยู่ (ผู้ดูแลต้องรัน supabase/seed_catalog.sql)</p>';
    const bs = DB.G.banners, R = DB.G.rarities || {};
    const price = (n, cur) => (b[n === 1 ? 'single' : 'ten'] || {})[cur];
    const btn = (n, cur) => { const p = price(n, cur); if (!p) return ''; const have = cur === 'coins' ? sv.coins : (sv.mcash || 0), no = busy || have < p;
      return `<button class="wbtn ${cur === 'mcash' ? 'mc' : 'go'}" ${no ? 'disabled' : ''} onclick="gcPull('${E(b.id)}',${n},'${cur}')">สุ่ม ${n} ครั้ง · ${cur === 'coins' ? '🪙' : '💎'} ${N(p)}</button>`; };
    const pity = b.pity ? `<div class=gc-pity><span>การันตี ${RICON.legendary} ${E((R.legendary || {}).name || 'ตำนาน')} ใน ${b.pity} ครั้ง</span><div class=gc-bar><i style="width:${Math.min(100, b.since_top / b.pity * 100)}%"></i></div><small>สะสมแล้ว ${b.since_top}/${b.pity}</small></div>` : '';
    const order = Object.keys(R).sort((x, y) => (R[y].sort || 0) - (R[x].sort || 0));
    const tot = {}; (b.items || []).forEach(i => { tot[i.rarity] = (tot[i.rarity] || 0) + Number(i.pct); });
    const rates = `<div class=gc-rates>${order.map(r => `<span class="gc-r ${r}">${RICON[r] || ''} ${E(R[r].name)} ${Math.round((tot[r] || 0) * 100) / 100}%</span>`).join('')}</div>`;
    const shown = (b.items || []).filter(i => filt === 'all' || i.kind === filt).sort((x, y) => ((R[y.rarity] || {}).sort || 0) - ((R[x.rarity] || {}).sort || 0));
    const kinds = ['all', ...new Set((b.items || []).map(i => i.kind))];
    return `${bs.length > 1 ? `<div class=cattabs>${bs.map(x => `<button class="catbtn${x.id === b.id ? ' on' : ''}" onclick="gcBanner('${E(x.id)}')">${E(x.name)}</button>`).join('')}</div>` : ''}
      <div class=gc-hero><b>${E(b.name)}</b><small>${E(b.description || '')}</small>${rates}${pity}
      <div class=gc-btns>${btn(1, 'coins')}${btn(10, 'coins')}${btn(1, 'mcash')}${btn(10, 'mcash')}</div>
      <small class=gc-tip>สุ่ม 10 ครั้งการันตี ${RICON.rare} หายากขึ้นไปอย่างน้อย 1 ชิ้น · ได้ตัวละครซ้ำ = นำไปอัพดาว · ของซ้ำขายเป็นเหรียญได้ที่แท็บ “คลังของ”</small></div>
      <div class=cattabs>${kinds.map(k => `<button class="catbtn${filt === k ? ' on' : ''}" onclick="gcFilt('${k}')">${k === 'all' ? 'ของในตู้ทั้งหมด' : E(kindLabel(k))}</button>`).join('')}</div>
      <div class="grid big gc-grid">${shown.map(i => `<div class="item2 gc-i ${i.rarity}">${thumb(i.kind, i.item_id)}<b>${E(i.name)}</b><small>${RICON[i.rarity] || ''} ${E((R[i.rarity] || {}).name || '')} · ${i.pct}%</small></div>`).join('')}</div>`;
  }

  function invPanel() {
    const R = (DB.G && DB.G.rarities) || {}, cat = {};
    ((DB.G && DB.G.banners) || []).forEach(b => (b.items || []).forEach(i => { cat[i.kind + ':' + i.item_id] = i; }));
    const inv = (DB.P.inventory || []).filter(i => i.qty > 0).sort((a, b) => b.qty - a.qty);
    if (!inv.length) return '<p class=note>ยังไม่มีของ — ไปสุ่มกาชากัน!</p>';
    return `<p class=note>ตัวละครที่ได้ซ้ำนำไปอัพดาวได้ที่ ⚡ หรือหน้าโปรไฟล์ · หรือขายตัวซ้ำเป็นเหรียญ (เก็บไว้ 1 ชิ้นเสมอ)</p><div class="grid big gc-grid">${inv.map(i => {
      const c = cat[i.kind + ':' + i.item_id] || {}, d = i.qty - 1, unit = (R[c.rarity] || {}).sell_coins || 0;
      return `<div class="item2 gc-i ${c.rarity || ''}">${thumb(i.kind, i.item_id)}<b>${E(c.name || (regItem(i.kind, i.item_id) || {}).name || i.item_id)} ×${i.qty}</b><small>${RICON[c.rarity] || ''} ${E(kindLabel(i.kind))} · ตัวซ้ำ ${d}</small>
        ${d > 0 && unit ? `<button class="wbtn go" ${busy ? 'disabled' : ''} onclick="gcSell('${i.kind}','${E(i.item_id)}',1)">ขาย 1 · 🪙 ${N(unit)}</button>${d > 1 ? `<button class="wbtn" ${busy ? 'disabled' : ''} onclick="gcSell('${i.kind}','${E(i.item_id)}',${d})">ขายซ้ำทั้งหมด ${d} · 🪙 ${N(unit * d)}</button>` : ''}` : '<button class="wbtn" disabled>ไม่มีตัวซ้ำ</button>'}</div>`; }).join('')}</div>`;
  }

  function gachaView() {
    ensure();
    const body = !DB.G ? `<p class=note>${E(note || 'กำลังโหลดตู้กาชา…')}</p>` : tab === 'inv' ? invPanel() : pullPanel();
    const tabs = [['pull', '🎰 สุ่มกาชา'], ['inv', '🎒 คลังของ / ขายตัวซ้ำ']].map(([k, l]) => `<button class="catbtn${tab === k ? ' on' : ''}" onclick="gcTab('${k}')">${l}</button>`).join('');
    page2('กาชา', `<div class=cattabs>${tabs}</div>${note && DB.G ? `<p class=note>${E(note)}</p>` : ''}<div class="panel gc-panel">${body}</div>`);
  }
  const _shop = window.shopView;
  window.shopView = function () { return DB.P ? gachaView() : (_shop ? _shop() : undefined); };
  window.gcTab = t => { tab = t; note = ''; failed = false; render(); };
  window.gcBanner = id => { bid = id; render(); };
  window.gcFilt = k => { filt = k; render(); };

  window.gcPull = async (id, n, cur) => {
    if (busy) return; busy = true; note = ''; render();
    try { const r = await DB.pull(id, n, cur); busy = false; showResult(r); }
    catch (e) { busy = false; note = e.message; render(); }
  };
  window.gcSell = async (kind, id, q) => {
    if (busy) return; busy = true; render();
    try { const r = await DB.sell(kind, id, q); note = `ขายตัวซ้ำ ${r.sold} ชิ้น ได้ 🪙 ${N(r.coins_gained)}`; toast(note); }
    catch (e) { note = e.message; }
    busy = false; render();
  };

  function showResult(r) {
    document.querySelectorAll('.gc-modal').forEach(n => n.remove());
    const R = (DB.G && DB.G.rarities) || {}, res = r.results || [];
    const m = document.createElement('div'); m.className = 'gc-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    const best = res.reduce((a, x) => Math.max(a, (R[x.rarity] || {}).sort || 0), 0);
    m.innerHTML = `<div class="gc-box gc-top${best}"><h3>🎰 ผลการสุ่ม</h3><div class="gc-res n${res.length}">${res.map((x, i) => `<div class="gc-card ${x.rarity}" style="animation-delay:${i * 0.12}s">${thumb(x.kind, x.item_id)}<b>${E(x.name)}</b><small>${RICON[x.rarity] || ''} ${E((R[x.rarity] || {}).name || '')}</small>${x.new ? '<em class=gc-new>NEW</em>' : `<em class=gc-dup>ซ้ำ ×${x.qty}</em>`}</div>`).join('')}</div>
      <p class=gc-sum>เหลือ 🪙 ${N(r.coins)} · 💎 ${N(r.mcash)}${res.some(x => !x.new && x.kind === 'characters') ? '<br>ได้ตัวละครซ้ำ — นำไปอัพดาวได้ที่ ⚡' : ''}</p><button class="wbtn go" onclick="this.closest('.gc-modal').remove()">ตกลง</button></div>`;
    document.body.appendChild(m);
  }
  window.gcShow = showResult;
})();
