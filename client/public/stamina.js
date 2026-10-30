/* stamina.js — สตามิน่า · ชา · โหมดฟาร์มกับบอท · เลเวลตัวละคร + ช่องชุดแต่ง · ไอเทมในช่องเก็บของ (ใช้คู่กับ economy.js)
   ทุกอย่างตัดสินที่ฐานข้อมูล (supabase/v7_stamina.sql) · ไฟล์นี้แสดงผล + นับถอยหลังการฟื้นในเครื่องระหว่างรอรีเฟรช
   - เล่นกับบอท: ใช้สตามิน่าตาละ COST ได้ของตามโหมดฟาร์ม · ไม่พอ = โหมดซ้อม (ไม่ได้รางวัล) · เล่นกับคน: ไม่ใช้สตามิน่า
   - ไม่ล็อกอิน: ไม่มีสตามิน่า (เหรียญเก็บในเครื่องเหมือนเดิม)
   Public: Items.info(id) · Items.icon(id) · Items.qty(id)
           Stamina.pill() · Stamina.now() · Stamina.set(info) · staminaOpen() · staminaUse(id)
           Farm.get() · Farm.section() · farmSet(f)
           CharLv.of(id) · CharLv.section(id) · CharLv.badge(id) */
(function () {
  'use strict';
  const EC = window.Economy;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const N = n => Number(n || 0).toLocaleString('en-US');
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  const LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const toast = m => { if (window.dbToast) dbToast(m); };
  const rerender = () => { if (typeof render === 'function') render(); };

  /* ---------------- ไอเทม ---------------- */
  const ICON = id => './Item/Mats/' + id + '.webp';
  const Items = {
    info: id => Object.assign({ id, name: id, desc: '' }, EC.ITEMS[id] || {}, { icon: ICON(id) }),
    icon: (id, cls) => `<img class="${cls || 'it-ic'}" src="${ICON(id)}" alt="">`,
    qty: id => (dbOn() ? DB.qty('items', id) : 0),
    list: () => Object.keys(EC.ITEMS),
  };
  window.Items = Items;
  const STICON = cls => `<img class="${cls || 'st-ic'}" src="./Item/Mats/stamina.webp" alt="">`;

  /* ---------------- สตามิน่า ---------------- */
  let base = null, seen = null;
  function setInfo(st) { if (st && st.stamina != null && st.max != null) base = Object.assign({}, st, { at: Date.now() }); }
  function now() {
    if (!dbOn()) return null;
    if (DB.P.stamina && DB.P.stamina !== seen) { seen = DB.P.stamina; setInfo(seen); }
    if (!base) return null;
    const reg = base.regen_sec || EC.STAMINA.REGEN_SEC, m = base.max, el = (Date.now() - base.at) / 1000;
    let s = base.stamina, next = null;
    if (s < m && base.next_in != null) {
      if (el >= base.next_in) s = Math.min(m, s + 1 + Math.floor((el - base.next_in) / reg));
      if (s < m) { let r = base.next_in - el; r = ((r % reg) + reg) % reg; next = Math.ceil(r || reg); }
    }
    return { stamina: s, max: m, cost: base.cost || EC.STAMINA.COST, nextIn: next, fullIn: s >= m ? 0 : (next || 0) + (m - s - 1) * reg };
  }
  const clock = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h} ชม. ${m} นาที` : `${m}:${String(s).padStart(2, '0')}`; };
  function pill() {
    const st = now(); if (!st) return '';
    return `<button class="st-pill${st.stamina < st.cost ? ' low' : ''}${st.stamina > st.max ? ' over' : ''}" onclick="staminaOpen()" title="สตามิน่า">${STICON()}<b data-st>${N(st.stamina)}</b><small>/${N(st.max)}</small></button>`;
  }
  const TEAS = () => Items.list().filter(id => EC.ITEMS[id].stamina);
  function modalHtml() {
    const st = now(); if (!st) return '';
    const teas = TEAS().map(id => { const it = Items.info(id), q = Items.qty(id);
      return `<div class=st-tea>${Items.icon(id)}<span><b>${E(it.name)}</b><small>${E(it.desc)} · มี ${N(q)}</small></span><button class=st-drink ${q ? '' : 'disabled'} onclick="staminaUse('${id}')">ดื่ม</button></div>`; }).join('');
    return `<div class=st-box><button class=st-x onclick="this.closest('.st-modal').remove()">✕</button>
      <div class=st-head>${STICON('st-big')}<div><small>สตามิน่า</small><b data-st>${N(st.stamina)}</b><em>/ ${N(st.max)}</em></div></div>
      <p class=st-time data-st-time>${stTime(st)}</p>
      <ul class=st-rule><li>เล่นกับบอทใช้ตาละ <b>${st.cost}</b> · ได้ของตามโหมดฟาร์มที่เลือก</li><li>โต๊ะที่มีบอทเติมที่นั่ง (เล่นคนเดียว · ห้องเพื่อนที่เปิดเติมบอท · หาแมตช์แล้วโหวตเติมบอท) <b>ใช้</b> สตามิน่า</li><li>โต๊ะที่เป็นคนจริงทั้งหมด <b>ไม่ใช้</b> สตามิน่า</li>
        <li>ฟื้น 1 ทุก ${Math.round(EC.STAMINA.REGEN_SEC / 60)} นาที · ขึ้นเลเวลผู้เล่นแล้วเติมเต็ม · สูงสุดเพิ่ม 20 ทุก ${EC.STAMINA.EVERY} เลเวล (สูงสุด ${EC.STAMINA.CAP})</li>
        <li>สตามิน่าไม่พอยังเล่นกับบอทได้ เป็นโหมดซ้อม (ไม่ได้รางวัล)</li></ul>
      <h4>ดื่มชาเติมสตามิน่า</h4>${teas}<small class=st-note>ชาได้จากแบทเทิลพาส · ดื่มเกินค่าสูงสุดได้ (เกินแล้วหยุดฟื้นจนกว่าจะใช้ลง)</small></div>`;
  }
  const stTime = st => (st.stamina >= st.max ? (st.stamina > st.max ? 'เกินค่าสูงสุด · หยุดฟื้นชั่วคราว' : '✓ เต็มแล้ว') : `+1 ใน ${clock(st.nextIn)} · เต็มใน ${clock(st.fullIn)}`);
  window.staminaOpen = () => {
    document.querySelectorAll('.st-modal').forEach(n => n.remove());
    const m = document.createElement('div'); m.className = 'st-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = modalHtml(); document.body.appendChild(m);
  };
  let busy = false;
  window.staminaUse = async id => {
    if (busy || !dbOn()) return; busy = true;
    try { const r = await DB.call('use_item', { p_id: id, p_qty: 1 }); setInfo(r); toast(`🍵 ${Items.info(id).name} +${N(r.added)} สตามิน่า`); await DB.refresh(); }
    catch (e) { toast(e.message); }
    busy = false; const m = document.querySelector('.st-modal'); if (m) m.innerHTML = modalHtml(); rerender();
  };
  // นับถอยหลังสด (แก้เฉพาะตัวเลข ไม่ render ทั้งหน้า)
  setInterval(() => {
    const st = now(); if (!st) return;
    document.querySelectorAll('[data-st]').forEach(n => { const v = N(st.stamina); if (n.textContent !== v) n.textContent = v; });
    document.querySelectorAll('[data-st-time]').forEach(n => { n.textContent = stTime(st); });
  }, 1000);
  window.Stamina = { pill, now, set: setInfo };

  /* ---------------- โหมดฟาร์ม (เล่นกับบอท) ---------------- */
  const getFarm = () => { try { const f = LS && LS.getItem('dummyFarm'); return EC.FARM[f] ? f : 'coins'; } catch (e) { return 'coins'; } };
  window.farmSet = f => { if (!EC.FARM[f]) return; try { LS && LS.setItem('dummyFarm', f); } catch (e) {} try { if (typeof sock !== 'undefined' && sock && sock.connected && typeof code !== 'undefined' && code) sock.emit('player:farm', { farm: f }); } catch (e) {} rerender(); };
  const itemsLine = items => Object.entries(items).map(([id, q]) => `<span class=fm-it>${Items.icon(id)}×${q}</span>`).join('');
  function farmSection() {
    if (!dbOn()) return '';
    const cur = getFarm(), st = now(), cost = (st && st.cost) || EC.STAMINA.COST;
    const card = f => { const top = EC.farmReward(f, 1, 4), low = EC.farmReward(f, 4, 4);
      const icon = f === 'coins' ? '<img class=it-ic src="./UI/Assets/kit2/coin.webp" alt="">' : f === 'pexp' ? Items.icon('pexp') : Items.icon('exp-m');
      const val = r => (f === 'coins' ? `<b>${N(r.coins)}</b> 🪙` : f === 'pexp' ? `EXP <b>+${N(r.exp)}</b>` : itemsLine(r.items));
      const what = `<i class=fm-row><em>ที่ 1</em>${val(top)}</i><i class=fm-row><em>ที่สุดท้าย</em>${val(low)}</i>`;
      return `<button class="fm-card${cur === f ? ' on' : ''}" onclick="farmSet('${f}')">${icon}<span><b>${E(EC.FARM[f].name)}</b><small>${what}</small></span></button>`; };
    const enough = !st || st.stamina >= cost;
    return `<h3 class=sec>🎯 ฟาร์มอะไรดี</h3><div class="fm-st${enough ? '' : ' low'}">${STICON()}<span>${enough ? `ตาละ <b>${cost}</b> · มี <b data-st>${N(st ? st.stamina : 0)}</b>/${N(st ? st.max : 0)}` : `สตามิน่าไม่พอ (มี <b data-st>${N(st.stamina)}</b> ต้องใช้ ${cost}) → เล่นได้แบบ<b>โหมดซ้อม</b> ไม่ได้รางวัล`}</span><button onclick="staminaOpen()">🍵 เติม</button></div><div class=fm>${Object.keys(EC.FARM).map(card).join('')}</div>`;
  }
  // บรรทัดสั้นในห้องรอ/หน้าโหวต: บอกว่ามีบอทจะใช้สตามิน่า + เลือกโหมดฟาร์มได้ (คนที่เข้าห้องทีหลังเห็นตรงนี้)
  function lobbyLine() {
    if (!dbOn()) return 'เล่นได้ แต่ต้องล็อกอินถึงจะได้ของ';
    const cur = getFarm(), st = now(), cost = (st && st.cost) || EC.STAMINA.COST, low = st && st.stamina < cost;
    const chips = Object.keys(EC.FARM).map(f => `<button class="fm-chip${cur === f ? ' on' : ''}" onclick="farmSet('${f}')">${E(EC.FARM[f].name)}</button>`).join('');
    return `<span class="fm-lob${low ? ' low' : ''}">${STICON()} ${low ? `สตามิน่าไม่พอ (<b data-st>${N(st.stamina)}</b>/${cost}) → โหมดซ้อม` : `ใช้สตามิน่า ${cost} · มี <b data-st>${N(st ? st.stamina : 0)}</b>`} · ฟาร์ม ${chips}</span>`;
  }
  window.Farm = { get: getFarm, section: farmSection, itemsLine, lobbyLine };

  /* ---------------- เลเวลตัวละคร + ช่องชุดแต่ง ---------------- */
  const SLOT_NAME = { frames: 'กรอบการ์ด', backs: 'หลังไพ่', tables: 'ผ้าปูโต๊ะ', backgrounds: 'พื้นหลัง' };
  const BOOKS = () => Items.list().filter(id => EC.ITEMS[id].charExp).sort((a, b) => EC.ITEMS[a].charExp - EC.ITEMS[b].charExp);
  const prog = id => (dbOn() && DB.P.char_prog && DB.P.char_prog[id]) || { level: 1, exp: 0, loadout: {} };
  const pick = {};   // ตัวละคร → { เล่ม: จำนวน } ที่เลือกจะใช้
  function of(id) { const p = prog(id), L = EC.charLevelOf(p.exp); return Object.assign(L, { exp: Number(p.exp) || 0, loadout: p.loadout || {} }); }
  const badge = id => `<span class=cl-badge>Lv.${of(id).level}</span>`;
  const regName = (kind, iid) => { const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[kind]) || []).find(y => y.id === iid); return (x && (x.name || x.n)) || iid; };
  function section(id) {
    if (!dbOn()) return `<div class=cl><small class=cl-off>ล็อกอินเพื่ออัปเลเวลตัวละครและใส่ชุดแต่งประจำตัว</small></div>`;
    const L = of(id), sel = pick[id] || {}, maxExp = EC.charMaxExp();
    const add = BOOKS().reduce((t, b) => t + (sel[b] || 0) * EC.ITEMS[b].charExp, 0), use = Math.min(add, maxExp - L.exp), cost = EC.charCost(use);
    const to = EC.charLevelOf(L.exp + use).level, coins = Number(DB.P.coins) || 0;
    const books = BOOKS().map(b => { const have = Items.qty(b), n = sel[b] || 0;
      return `<div class=cl-bk>${Items.icon(b)}<small>${E(EC.ITEMS[b].name)}<br>มี ${N(have)}</small><span><button ${n ? '' : 'disabled'} onclick="clPick('${E(id)}','${b}',-1)">−</button><b>${n}</b><button ${n < have && L.exp + add < maxExp ? '' : 'disabled'} onclick="clPick('${E(id)}','${b}',1)">+</button></span></div>`; }).join('');
    const pct = L.max ? 100 : Math.round(L.into / L.need * 100);
    const slots = Object.keys(EC.CHAR.SLOTS).map(k => { const need = EC.CHAR.SLOTS[k], open = L.level >= need, cur = L.loadout[k];
      return `<button class="cl-slot${open ? '' : ' lock'}${cur ? ' set' : ''}" ${open ? `onclick="clSlotOpen('${E(id)}','${k}')"` : 'disabled'}><small>${SLOT_NAME[k]}</small><b>${open ? (cur ? E(regName(k, cur)) : '+ ว่าง') : '🔒 Lv.' + need}</b></button>`; }).join('');
    const sh = DB.qty ? DB.qty('shards', id) : 0, SN = EC.SHARD_NEED || 50;
    return `<div class=cl>${sh ? `<div class=cl-sh><img src="./Item/Shards/${E(id)}.webp" alt="" onerror="this.remove()">เศษตัวละคร <b>${N(sh)}/${SN}</b><i><u style="width:${Math.min(100, Math.round(sh / SN * 100))}%"></u></i></div>` : ''}<div class=cl-top><b>Lv.${L.level}<small>/${EC.CHAR.MAX}</small></b><i><u style="width:${pct}%"></u></i><small>${L.max ? 'เลเวลสูงสุดแล้ว' : `${N(L.into)}/${N(L.need)} EXP`}</small></div>
      ${L.max ? '' : `<div class=cl-bks>${books}</div><button class=cl-go ${add && coins >= cost && !busyCl ? '' : 'disabled'} onclick="clLevelUp('${E(id)}')">${add ? `อัปเป็น Lv.${to} · +${N(use)} EXP · ${N(cost)} 🪙` : 'เลือกคัมภีร์เพื่ออัปเลเวล'}</button>${add && coins < cost ? '<small class=cl-warn>เหรียญไม่พอ</small>' : ''}`}
      <h4>ชุดแต่งประจำตัวละคร <small>เลือกตัวนี้แล้วใส่ให้อัตโนมัติ</small></h4><div class=cl-slots>${slots}</div></div>`;
  }
  let busyCl = false;
  window.clPick = (id, b, d) => { const s = pick[id] = pick[id] || {}; s[b] = Math.max(0, Math.min(Items.qty(b), (s[b] || 0) + d)); rerender(); };
  window.clLevelUp = async id => {
    const sel = pick[id] || {}, books = Object.fromEntries(Object.entries(sel).filter(([, n]) => n > 0)); if (busyCl || !Object.keys(books).length) return;
    busyCl = true; rerender();
    try { const r = await DB.call('char_level_up', { p_char: id, p_books: books }); delete pick[id]; toast(r.level > r.old_level ? `⬆ ตัวละครขึ้น Lv.${r.level}!` : `+${N(r.added)} EXP`); await DB.refresh(); }
    catch (e) { toast(e.message); }
    busyCl = false; rerender();
  };
  // เลือกของใส่ช่อง: แสดงของที่มีของชนิดนั้น
  window.clSlotOpen = (id, kind) => {
    document.querySelectorAll('.cl-modal').forEach(n => n.remove());
    const list = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[kind]) || []).filter(x => typeof owned !== 'function' || owned(kind, x)), cur = of(id).loadout[kind];
    const m = document.createElement('div'); m.className = 'st-modal cl-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class=st-box><button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h4>${SLOT_NAME[kind]} ของ ${E(regName('characters', id))}</h4>
      <div class=cl-pick>${list.map(x => `<button class="${x.id === cur ? 'on' : ''}" onclick="clSlotSet('${E(id)}','${kind}','${E(x.id)}')">${E(x.name || x.n || x.id)}</button>`).join('') || '<small>ยังไม่มีของชนิดนี้</small>'}</div>
      ${cur ? `<button class=cl-clear onclick="clSlotSet('${E(id)}','${kind}','')">ถอดออก</button>` : ''}</div>`;
    document.body.appendChild(m);
  };
  window.clSlotSet = async (id, kind, iid) => {
    try { await DB.call('set_char_slot', { p_char: id, p_kind: kind, p_id: iid || null }); await DB.refresh(); document.querySelectorAll('.cl-modal').forEach(n => n.remove());
      if (iid && typeof myChar === 'function' && myChar() === id && typeof equip === 'function') equip(kind, iid);   // ใช้ตัวนี้อยู่ → ใส่ให้เลย
      toast(iid ? '✓ ใส่ในชุดของตัวละครแล้ว' : 'ถอดออกแล้ว'); }
    catch (e) { toast(e.message); }
    rerender();
  };
  window.CharLv = { of, section, badge };

  // เลือกตัวละคร → ใส่ชุดแต่งประจำตัวให้อัตโนมัติ
  function hookEquip() {
    if (typeof window.equip !== 'function') return setTimeout(hookEquip, 50);
    const _eq = window.equip;
    window.equip = function (kind, id) {
      const r = _eq.apply(this, arguments);
      if (kind === 'characters' && dbOn()) { const lo = of(id).loadout; Object.keys(lo).forEach(k => { if (typeof equipped !== 'function' || equipped(k) !== lo[k]) _eq(k, lo[k]); }); }
      return r;
    };
  }
  hookEquip();
  // ผลจบตาจากเซิร์ฟเวอร์มีสตามิน่าล่าสุด
  function hookWallet() {
    if (!window.Progress) return setTimeout(hookWallet, 50);
    const _w = Progress.onWallet; Progress.onWallet = d => { if (d && d.stamina != null) setInfo(d); return _w(d); };
  }
  hookWallet();
})();
