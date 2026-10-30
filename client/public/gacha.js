/* gacha.js — หน้ากาชา (แทนร้านค้า) · สุ่ม 1/10 ครั้งด้วยเหรียญหรือ MCash · ได้ของซ้ำ = เอาตัวละครไปอัพดาว หรือขายเป็นเหรียญ
   ราคา/โอกาส/การันตีทั้งหมดตัดสินที่ฐานข้อมูล (supabase/schema.sql: gacha_pull, sell_dupes) — ฝั่งนี้แค่แสดงผล
   ทำงานเฉพาะโหมดบัญชี (DB.enabled) — โหมดเดิมในเครื่องยังใช้ร้านค้าเก่า */
(function () {
  'use strict';
  if (!(window.DB && DB.enabled)) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const N = n => Number(n || 0).toLocaleString('en-US');
  const RICON = { common: '', rare: '', epic: '', legendary: '' }; // ระดับแสดงเป็นกรอบสีแทนอีโมจิ (theme2.css)
  const RNAME = { common: 'Common', rare: 'Rare', epic: 'SR', legendary: 'SSR' }; // ชื่อระดับฝั่งหน้าจอ (ใช้แทนชื่อในฐานข้อมูลเดิม)
  const toast = t => { if (window.dbToast) dbToast(t); };
  let failed = false, tab = 'pull', bid = null, busy = false, loading = false, note = '', filt = 'all';
  const regItem = (kind, id) => (((typeof SKIN_REGISTRY !== 'undefined' ? SKIN_REGISTRY : {})[kind]) || []).find(x => x.id === id);
  const thumb = (kind, id) => { const x = regItem(kind, id); try { return x && typeof prevBox === 'function' ? prevBox(kind, x) : '<div class=gc-ph>?</div>'; } catch (e) { return '<div class=gc-ph>?</div>'; } };
  const kindLabel = k => { const z = (typeof KINDS !== 'undefined' ? KINDS : []).find(a => a[0] === k); return z ? z[1] : k; };

  function ensure() {
    if (DB.G || loading || failed || !DB.P) return;
    loading = true; DB.gacha().then(() => { const R = (DB.G && DB.G.rarities) || {}; for (const k of Object.keys(R)) if (RNAME[k]) R[k].name = RNAME[k]; }).catch(e => { note = e.message; failed = true; }).then(() => { loading = false; try { render(); } catch (e) {} });
  }
  const banner = () => { const bs = (DB.G && DB.G.banners) || []; return bs.find(b => b.id === bid) || bs[0]; };

  const STARS = { common: 2, rare: 3, epic: 4, legendary: 5 };
  function pullPanel() {
    const b = banner(); if (!b) return '<p class=note>ยังไม่มีตู้กาชาเปิดอยู่ (ผู้ดูแลต้องรัน supabase/seed_catalog.sql)</p>';
    const bimg = window.Assets && Assets.bannerImage(b.id);
    const bs = DB.G.banners, R = DB.G.rarities || {}, rk = r => (R[r] || {}).sort || 0;
    const price = (n, cur) => (b[n === 1 ? 'single' : 'ten'] || {})[cur];
    const items = (b.items || []).slice().sort((x, y) => rk(y.rarity) - rk(x.rarity) || (x.kind === 'characters' ? -1 : 1));
    const feat = [...items.filter(i => i.kind === 'characters'), ...items.filter(i => i.kind !== 'characters')].sort((x, y) => rk(y.rarity) - rk(x.rarity)).slice(0, 3);
    const card = (i, k) => { const x = regItem(i.kind, i.item_id) || {}, own = DB.qty(i.kind, i.item_id);
      const cd = i.kind === 'characters' && x.card; // รูปการ์ดสำเร็จ (มีกรอบในรูปแล้ว)
      return `<div class="gc-f ${i.rarity}${cd ? ' has-card' : ''}" style="--k:${k}"><div class=gc-fi>${cd ? `<img src="${E(x.card)}" alt="">` : i.kind === 'characters' && x.asset ? `<img src="${E(x.asset)}" alt="">` : thumb(i.kind, i.item_id)}</div>
        <div class=gc-fn><b>${E(i.name)}</b><span class=gc-st>${'★'.repeat(STARS[i.rarity] || 1)}</span><small>${E((R[i.rarity] || {}).name || '')} · ${i.pct}%${own ? ' · มี ×' + own : ''}</small></div></div>`; };
    const btn = (n, cur) => { const p = price(n, cur); if (!p) return ''; const have = cur === 'coins' ? sv.coins : (sv.mcash || 0), no = busy || have < p;
      return `<button class="gc-go ${cur}" ${no ? 'disabled' : ''} onclick="gcPull('${E(b.id)}',${n},'${cur}')"><b>สุ่ม ${n} ครั้ง</b><span>${cur === 'coins' ? '🪙' : '💎'} ${N(p)}</span></button>`; };
    const tot = {}; items.forEach(i => { tot[i.rarity] = (tot[i.rarity] || 0) + Number(i.pct); });
    const rates = Object.keys(R).sort((x, y) => rk(y) - rk(x)).map(r => `<span class="gc-r ${r}">${RICON[r] || ''} ${E(R[r].name)} ${Math.round((tot[r] || 0) * 100) / 100}%</span>`).join('');
    const pity = b.pity && items.some(i => i.rarity === 'legendary') ? `<div class=gc-pity><span>การันตี ${RICON.legendary} ${E((R.legendary || {}).name || 'ตำนาน')} ใน ${b.pity} ครั้ง <b>(${b.since_top}/${b.pity})</b></span><div class=gc-bar><i style="width:${Math.min(100, b.since_top / b.pity * 100)}%"></i></div></div>` : '';
    return `<div class=gc-stage><div class=gc-show><div class=gc-ban><b>${E(b.name)}</b><small>${E(b.description || '')}</small></div>${bimg ? `<div class=gc-bimg><img src="${E(bimg)}" alt="${E(b.name)}"></div>` : `<div class=gc-feats>${feat.map(card).join('')}</div>`}
        <div class=gc-sub>${bs.length > 1 ? bs.map(x => `<button class="gc-mini${x.id === b.id ? ' on' : ''}" onclick="gcBanner('${E(x.id)}')">${E(x.name)}</button>`).join('') : ''}${window.Assets && !Assets.showListButton() ? '' : `<button class=gc-mini onclick="gcList()">📋 รายการและอัตราการออก</button>`}</div></div>
      <div class=gc-side><div class=gc-rates>${rates}</div>${pity}<small class=gc-tip>สุ่ม 10 ครั้งการันตี Rare ขึ้นไปอย่างน้อย 1 ชิ้น<br>ได้ตัวละครซ้ำ = นำไปอัพดาว · ของซ้ำขายเป็นเหรียญได้ที่ “คลังของ”</small>
        <div class=gc-btns>${btn(1, 'coins')}${btn(10, 'coins')}${btn(1, 'mcash')}${btn(10, 'mcash')}</div></div></div>`;
  }
  window.gcList = () => {
    const b = banner(); if (!b) return; const R = DB.G.rarities || {};
    const shown = (b.items || []).filter(i => filt === 'all' || i.kind === filt).sort((x, y) => ((R[y.rarity] || {}).sort || 0) - ((R[x.rarity] || {}).sort || 0));
    const kinds = ['all', ...new Set((b.items || []).map(i => i.kind))];
    document.querySelectorAll('.gc-modal').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'gc-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class=gc-box><h3>📋 ของในตู้ · อัตราการออก</h3><div class=cattabs>${kinds.map(k => `<button class="catbtn${filt === k ? ' on' : ''}" onclick="gcFilt('${k}');gcList()">${k === 'all' ? 'ทั้งหมด' : E(kindLabel(k))}</button>`).join('')}</div>
      <div class="grid big gc-grid">${shown.map(i => `<div class="item2 gc-i ${i.rarity}">${thumb(i.kind, i.item_id)}<b>${E(i.name)}</b><small>${RICON[i.rarity] || ''} ${E((R[i.rarity] || {}).name || '')} · ${i.pct}%</small></div>`).join('')}</div><button class="wbtn go" onclick="this.closest('.gc-modal').remove()">ปิด</button></div>`;
    document.body.appendChild(m);
  };

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
    const tabs = [['pull', window.Assets ? Assets.gachaLabel('pull', '🎰 สุ่มกาชา') : '🎰 สุ่มกาชา'], ['inv', window.Assets ? Assets.gachaLabel('inv', '🎒 คลังของ / ขายตัวซ้ำ') : '🎒 คลังของ / ขายตัวซ้ำ']].map(([k, l]) => `<button class="catbtn${tab === k ? ' on' : ''}" onclick="gcTab('${k}')">${l}</button>`).join('');
    page2((window.Assets && Assets.shopTitle()) || 'กาชา', `<div class="gc-wrap"><div class="gc-tabs">${tabs}${note && DB.G ? `<span class=gc-note>${E(note)}</span>` : ''}</div><div class="gc-main${tab === 'inv' ? ' inv' : ''}">${body}</div></div>`);
  }
  const _shop = window.shopView;
  window.shopView = function () { return DB.P ? gachaView() : (_shop ? _shop() : undefined); };
  window.gcTab = t => { tab = t; note = ''; failed = false; render(); };
  window.gcBanner = id => { bid = id; render(); };
  window.gcFilt = k => { filt = k; };

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
    const cardOf = x => (x.kind === 'characters' && (regItem(x.kind, x.item_id) || {}).card) || '';
    const m = document.createElement('div'); m.className = 'gc-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    const best = res.reduce((a, x) => Math.max(a, (R[x.rarity] || {}).sort || 0), 0);
    m.innerHTML = `<div class="gc-box gc-top${best}"><h3>🎰 ผลการสุ่ม</h3><div class="gc-res n${res.length}">${res.map((x, i) => `<div class="gc-card ${x.rarity}${cardOf(x) ? ' has-card' : ''}" style="animation-delay:${i * 0.12}s">${cardOf(x) ? `<img class=gc-cimg src="${E(cardOf(x))}" alt="">` : thumb(x.kind, x.item_id)}<b>${E(x.name)}</b><small>${RICON[x.rarity] || ''} ${E((R[x.rarity] || {}).name || '')}</small>${x.new ? '<em class=gc-new>NEW</em>' : `<em class=gc-dup>ซ้ำ ×${x.qty}</em>`}</div>`).join('')}</div>
      <p class=gc-sum>เหลือ 🪙 ${N(r.coins)} · 💎 ${N(r.mcash)}${res.some(x => !x.new && x.kind === 'characters') ? '<br>ได้ตัวละครซ้ำ — นำไปอัพดาวได้ที่ ⚡' : ''}</p><button class="wbtn go" onclick="this.closest('.gc-modal').remove()">ตกลง</button></div>`;
    document.body.appendChild(m);
  }
  window.gcShow = showResult;
})();
