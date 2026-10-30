/* battlepass.js — หน้าแบทเทิลพาส (screen === 'bp', เปิดด้วย bpOpen()) · ข้อมูลทั้งหมดมาจากฐานข้อมูล (get_bp) ต้องล็อกอิน
   รางวัล 3 สาย (แบบ Arknights: Endfield): ฟรี · สายเพชร (ปลดด้วยเพชร คืนทุนได้) · พรีเมียม (ล็อกไว้ "เร็วๆ นี้")
   ปลดสายเพิ่ม EXP สายละ % · กดรับครั้งเดียวรับทุกเลเวลที่ถึง · เลยเลเวลสูงสุดได้รางวัลวน
   ไม่แก้ app.js: ห่อ render() เหมือน pages2.js */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const N = n => Number(n || 0).toLocaleString('en-US');
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  const TRACK = { free: 'ฟรี', gem: 'สายเพชร', premium: 'พรีเมียม' };
  let BP = null, busy = false, err = '', tab = 'rw';
  const itemName = (k, id) => { if (k === 'items' && window.Items) return Items.info(id).name; const l = (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[k]) || []; const x = l.find(y => y.id === id); return (x && (x.name || x.n)) || id; };
  const itemImg = (k, id) => { if (k === 'items' && window.Items) return Items.info(id).icon; const l = (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[k]) || []; const x = l.find(y => y.id === id); return (x && (x.asset || x.preview)) || ''; };

  let lastLoad = 0;
  async function load() {
    if (!dbOn()) return;
    lastLoad = Date.now();
    try { BP = await DB.call('get_bp'); err = ''; } catch (e) { err = e.message || 'โหลดไม่สำเร็จ'; }
    if (typeof screen !== 'undefined' && screen === 'bp') view();
    else if (typeof screen !== 'undefined' && screen === 'home' && typeof render === 'function') render();   // อัปเดตป้ายแจ้งเตือนบนการ์ดแบทเทิลพาส
  }
  // จำนวนรางวัลที่รับได้ (ป้ายแจ้งเตือนบนการ์ดหน้าแรก) · โหลดข้อมูลเงียบ ๆ อย่างมากนาทีละครั้ง
  function count() {
    if (!dbOn()) return 0;
    if (Date.now() - lastLoad > 60000) load();
    if (!BP || !BP.season) return 0;
    const st = stat(); return st.ready + st.cycNew + mReady();
  }
  // ภารกิจที่สำเร็จแล้วแต่ยังไม่รับ
  const mList = k => { const m = BP && BP.missions; if (!m) return []; return k === 'speedup' ? ((m.speedup && m.speedup.open && m.speedup.missions) || []) : (m.horizon || []); };
  const mReady = k => (k ? mList(k) : [...mList('speedup'), ...mList('horizon')]).filter(x => !x.claimed && x.progress >= x.target).length;
  window.bpOpen = () => { if (typeof go === 'function') go('bp'); load(); };

  // สถานะ: เลเวลตอนนี้ · EXP ในเลเวล · รับได้กี่ช่อง
  function stat() {
    const s = BP.season, me = BP.me, L = s.level_exp, lv = Math.min(s.max_level, Math.floor(me.exp / L)), into = me.exp - lv * L;
    const owned = t => t === 'free' || (t === 'gem' && me.gem) || (t === 'premium' && me.premium && s.premium_open);
    const got = (t, l) => (me.claimed[t] || []).includes(l);
    const ready = BP.rewards.filter(r => r.level <= lv && owned(r.track) && !got(r.track, r.level)).length;
    const cycle = Math.max(0, Math.floor((me.exp - s.max_level * L) / L)), cycNew = Math.max(0, cycle - (me.cycle_claimed || 0));
    const bonus = ((me.gem ? 1 : 0) + (me.premium ? 1 : 0)) * ((s.exp_cfg && s.exp_cfg.tierBonusPct) || 3);
    return { lv, into: lv >= s.max_level ? (me.exp - s.max_level * L) % L : into, L, owned, got, ready, cycNew, bonus, left: new Date(s.ends_at).getTime() - Date.now() };
  }
  const leftTxt = ms => { const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); return ms <= 0 ? 'จบฤดูแล้ว' : d > 0 ? `เหลือ ${d} วัน ${h} ชม.` : `เหลือ ${h} ชม.`; };

  function cell(r, st) {
    const has = st.owned(r.track), got = st.got(r.track, r.level), reach = r.level <= st.lv;
    const lines = [r.preview ? `<em class=bp-pv>${E(r.preview)}</em>` : '', r.item_kind ? `<span class=bp-it>${itemImg(r.item_kind, r.item_id) ? `<img src="${E(itemImg(r.item_kind, r.item_id))}" alt="">` : ''}${r.item_kind === 'items' ? `<b class=bp-qty>×${N(r.qty || 1)}</b>` : E(itemName(r.item_kind, r.item_id))}</span>` : '',
      r.mcash ? `<span class=bp-m>💎 ${N(r.mcash)}</span>` : '', r.coins ? `<span class=bp-c>🪙 ${N(r.coins)}</span>` : ''].filter(Boolean).join('');
    const cls = ['bp-cell', 'bp-' + r.track, got ? 'got' : reach && has ? 'ready' : '', !has ? 'lock' : '', r.preview || r.item_kind ? 'big' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">${lines || '<span class=bp-c>—</span>'}${got ? '<i class=bp-ok>✓</i>' : !has ? '<i class=bp-lk>🔒</i>' : ''}</div>`;
  }

  function view() {
    if (!dbOn()) { page2('แบทเทิลพาส', `<div class=bp-empty><p>ต้องล็อกอินก่อนถึงจะเล่นแบทเทิลพาสได้</p></div>`, 'home'); return; }
    if (!BP) { page2('แบทเทิลพาส', `<div class=bp-empty><p>${err ? '⚠️ ' + E(err) : '⏳ กำลังโหลด...'}</p></div>`, 'home'); return; }
    if (!BP.season) { page2('แบทเทิลพาส', `<div class=bp-empty><p>ตอนนี้ยังไม่มีฤดูแบทเทิลพาส รอฤดูใหม่เร็วๆ นี้</p></div>`, 'home'); return; }
    const s = BP.season, me = BP.me, st = stat(), x = s.exp_cfg || {};
    const levels = Array.from({ length: s.max_level }, (_, i) => i + 1);
    const by = {}; BP.rewards.forEach(r => { by[r.track + ':' + r.level] = r; });
    const cols = levels.map(l => `<div class="bp-col${l <= st.lv ? ' done' : ''}${l === st.lv + 1 ? ' next' : ''}"><b class=bp-n>${l}</b>${['free', 'gem', 'premium'].map(t => by[t + ':' + l] ? cell(by[t + ':' + l], st) : '<div class=bp-cell></div>').join('')}</div>`).join('');
    const gemBtn = me.gem ? '<span class="bp-own">✓ ปลดแล้ว</span>' : `<button class=bp-buy ${busy ? 'disabled' : ''} onclick="bpBuyGem()">ปลด 💎 ${N(s.gem_cost)}</button>`;
    const preBtn = s.premium_open ? (me.premium ? '<span class="bp-own">✓ ปลดแล้ว</span>' : '<span class=bp-soon>เร็วๆ นี้</span>') : '<span class=bp-soon>เร็วๆ นี้</span>';
    const claim = st.ready + st.cycNew;
    const body = `<div class=bp>
      <header class=bp-top>
        <div class=bp-ttl><small>ฤดูที่ 1 · ${leftTxt(st.left)}</small><h3>${E(s.name)}</h3></div>
        <div class=bp-lvl><b>Lv.${st.lv}<small>/${s.max_level}</small></b><i><u style="width:${Math.round(st.into / st.L * 100)}%"></u></i><small>${N(st.into)} / ${N(st.L)} EXP${st.bonus ? ` · โบนัส EXP +${st.bonus}%` : ''}</small></div>
        ${me.vacation_cap ? `<div class=bp-vac title="ตั๋วพักร้อน"><img src="./Item/Mats/vacation.webp" alt=""><span><b>${N(me.vacation)}<small>/${N(me.vacation_cap)}</small></b><small>ตั๋วพักร้อน</small></span></div>` : ''}
        <button class="bp-claim${claim ? ' on' : ''}" ${claim && !busy ? '' : 'disabled'} onclick="bpClaim()">${claim ? `รับรางวัล (${claim})` : 'ยังไม่มีรางวัลใหม่'}</button>
      </header>
      <nav class=bp-tabs>${[['rw', '🎖 รางวัล', 0], ['speedup', '⚡ ภารกิจเร่ง', mReady('speedup')], ['horizon', '🧭 ภารกิจระยะยาว', mReady('horizon')]].map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="bpTab('${k}')">${l}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</nav>
      ${tab !== 'rw' ? missionsHtml(tab) : `<div class=bp-board>
        <div class=bp-rows><div class=bp-rh></div>
          <div class="bp-rh bp-free"><b>ฟรี</b><small>ทุกคนได้</small></div>
          <div class="bp-rh bp-gem"><b>สายเพชร</b><small>คืนทุนได้ · EXP +${x.tierBonusPct || 3}%</small>${gemBtn}</div>
          <div class="bp-rh bp-premium"><b>พรีเมียม</b><small>ของพิเศษประจำฤดู</small>${preBtn}</div></div>
        <div class=bp-scroll id=bpScroll>${cols}<div class="bp-col bp-cyc"><b class=bp-n>${s.max_level}+</b><div class="bp-cell big"><span class=bp-c>🪙 ${N(s.cycle_coins)}</span><em class=bp-pv>ทุกเลเวลที่เกิน</em></div></div></div>
      </div>`}
      <footer class=bp-how><b>ได้ EXP จาก</b>
        <span>🎯 แต้มกิจกรรมรายวันครบ 100 <em>+${N(x.dailyBonus)}</em></span><span>📜 เควสรายสัปดาห์ <em>+${N(x.weeklyQuest)}/ข้อ</em></span>
        <span>🎁 โบนัสรายสัปดาห์ <em>+${N(x.weeklyBonus)}</em></span><span>🎴 เล่นจบตา <em>+${N(x.perGame)} (วันละไม่เกิน ${N(x.perGameDailyCap)})</em></span>${me.vacation_cap ? `<span>🏖️ ตั๋วพักร้อน <em>วันที่ไม่ได้เข้าได้ 1 ใบ (เก็บได้ ${N(me.vacation_cap)}) · ใช้อัตโนมัติ โบนัสรายวัน ×2</em></span>` : ''}
        <button class=bp-q onclick="openQuests('d')">ไปทำเควส</button></footer>
    </div>`;
    page2('แบทเทิลพาส', body, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'bp';
    const sc = document.getElementById('bpScroll'), nx = sc && sc.querySelector('.bp-col.next');
    if (sc && nx) sc.scrollLeft = Math.max(0, nx.offsetLeft - sc.clientWidth / 3);
  }
  // ภารกิจเร่ง (เปิดช่วงท้ายฤดู) · ภารกิจระยะยาว (ถาวร ข้ามฤดู)
  function missionsHtml(k) {
    const m = BP.missions || {}, sp = m.speedup || {}, list = k === 'speedup' ? (sp.missions || []) : (m.horizon || []);
    const head = k === 'speedup'
      ? (sp.open ? `<p class=bp-mh>⚡ ภารกิจเร่งเปิดแล้ว! ทำให้ทันก่อนจบฤดู · ${leftTxt(new Date(BP.season.ends_at) - Date.now())}</p>` : `<p class=bp-mh>🔒 ภารกิจเร่งเปิดช่วง 7 วันสุดท้ายของฤดู · เปิดใน${leftTxt(new Date(sp.opens_at) - Date.now()).replace('เหลือ', '')}</p>`)
      : `<p class=bp-mh>🧭 ภารกิจถาวร ไม่รีเซ็ตข้ามฤดู · ทำสำเร็จเมื่อไหร่ก็รับ EXP เข้าแบทเทิลพาสฤดูนั้น · สำเร็จ ${list.filter(x => x.claimed).length}/${list.length}</p>`;
    const locked = k === 'speedup' && !sp.open;
    const rows = list.map(x => { const done = x.progress >= x.target;
      const btn = x.claimed ? '<span class="bp-mb got">รับแล้ว ✓</span>' : locked ? '<span class="bp-mb">🔒</span>' : `<button class="bp-mb${done ? ' go' : ''}" ${done && !busy ? '' : 'disabled'} onclick="bpMission('${k}','${E(x.id)}')">${done ? 'รับ' : 'ยังไม่ครบ'}</button>`;
      return `<div class="bp-m${x.claimed ? ' got' : done && !locked ? ' ready' : ''}"><span class=bp-mi>${E(x.icon || '🎯')}</span><span class=bp-mt><b>${E(x.name)}</b><small>${E(x.desc || '')}</small><i><u style="width:${Math.min(100, Math.round(x.progress / x.target * 100))}%"></u></i></span><span class=bp-mp>${N(x.progress)}/${N(x.target)}</span><em class=bp-me>+${N(x.bp)} EXP</em>${btn}</div>`; }).join('');
    return `<div class="bp-ms${locked ? ' locked' : ''}">${head}<div class=bp-ml>${rows || '<p class=bp-mh>ยังไม่มีภารกิจ</p>'}</div></div>`;
  }
  window.bpTab = k => { tab = k; view(); };
  window.bpMission = async (k, id) => {
    if (busy) return; busy = true; view();
    try { const r = await DB.call('claim_bp_mission', { p_kind: k, p_id: id }); toast('✅ สำเร็จภารกิจ +' + N(r.bp) + ' EXP แบทเทิลพาส'); } catch (e) { toast(e.message); }
    busy = false; await load();
  };
  // ---------- กล่องเลือกของ: เปิดแล้วเลือก 1 อย่าง (ตัวเลือกมาจากฐานข้อมูล crate_options) ----------
  const SHARD_NEED = (window.Economy && Economy.SHARD_NEED) || 50;
  const charReg = id => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(x => x.id === id) || {};
  const optName = o => o.kind === 'coins' ? 'เหรียญ' : o.kind === 'mcash' ? 'เพชร' : o.kind === 'shards' ? (o.name || charReg(o.id).name || o.id) : itemName(o.kind, o.id);
  const optImg = o => o.kind === 'coins' ? './UI/Assets/kit2/coin.webp' : o.kind === 'mcash' ? '' : o.kind === 'shards' ? './Item/Shards/' + o.id + '.webp' : itemImg(o.kind, o.id);
  let crOpts = {}, crBusy = false;
  window.crateOpen = async (id, pick) => {
    const it = window.Items && Items.info(id); if (!it) return;
    if (!crOpts[id]) { try { crOpts[id] = await DB.call('crate_options', { p_id: id }); } catch (e) { toast(e.message); return; } }
    const opts = crOpts[id] || [], shard = opts.length && opts[0].kind === 'shards';
    document.querySelectorAll('.cr-modal').forEach(n => n.remove());
    const have = window.DB && DB.qty ? DB.qty('items', id) : 0;
    const m = document.createElement('div'); m.className = 'cr-modal'; m.onclick = e => { if (e.target === m) m.remove(); };
    const card = (o, i) => shard
      ? `<button class="cr-opt sh${pick === i ? ' on' : ''}" onclick="crateOpen('${E(id)}',${i})">${optImg(o) ? `<img class=cr-ch src="${E(optImg(o))}" alt="">` : '<span>🧩</span>'}<b>${E(optName(o))}</b><em>เศษ ×${N(o.qty)}</em><small>${o.owned ? 'มีแล้ว · ' : ''}${N(o.have || 0)}/${SHARD_NEED}</small></button>`
      : `<button class="cr-opt${pick === i ? ' on' : ''}" onclick="crateOpen('${E(id)}',${i})">${optImg(o) ? `<img src="${E(optImg(o))}" alt="">` : '<span>💎</span>'}<b>${E(optName(o))}</b><em>×${N(o.qty)}</em></button>`;
    m.innerHTML = `<div class="cr-box${shard ? ' wide' : ''}"><img class=cr-ic src="${E(it.icon)}" alt=""><h3>${E(it.name)}</h3><small>${shard ? `เลือกตัวละคร 1 ตัว · เศษครบ ${SHARD_NEED} ชิ้นได้ตัวละครทันที (มีแล้ว = ตัวซ้ำไว้อัพดาว)` : 'เลือกของ 1 อย่าง'} · มี ${N(have)} กล่อง</small>
      <div class="cr-opts${shard ? ' sh' : ''}">${opts.map(card).join('')}</div>
      <div class=cr-act><button class=wbtn onclick="this.closest('.cr-modal').remove()">ยกเลิก</button><button class="wbtn go" ${pick == null || !have ? 'disabled' : ''} onclick="crateGo('${E(id)}',${pick == null ? -1 : pick})">${pick == null ? 'เลือกก่อน' : 'รับ ' + E(optName(opts[pick])) + (shard ? ' เศษ' : '') + ' ×' + N(opts[pick].qty)}</button></div></div>`;
    document.body.appendChild(m);
  };
  window.crateGo = async (id, pick) => {
    if (crBusy || pick < 0) return; crBusy = true;
    try {
      const r = await DB.call('open_crate', { p_id: id, p_pick: pick }); delete crOpts[id];
      toast(r.chars ? `🎉 เศษครบ ${SHARD_NEED}! ได้ตัวละคร ${optName(r.got)}` : '🎁 ได้ ' + optName(r.got) + (r.got.kind === 'shards' ? ` เศษ ×${N(r.got.qty)} (${N(r.shards)}/${SHARD_NEED})` : ' ×' + N(r.got.qty)));
      document.querySelectorAll('.cr-modal').forEach(n => n.remove()); await DB.refresh();
    } catch (e) { toast(e.message); }
    crBusy = false;
  };
  const toast = m => { if (window.dbToast) dbToast(m); };
  window.bpClaim = async () => {
    if (busy) return; busy = true; view();
    try { const r = await DB.call('claim_bp'); toast('🎖 รับรางวัลแล้ว' + (r.coins ? ' +' + N(r.coins) + ' 🪙' : '') + (r.mcash ? ' +' + N(r.mcash) + ' 💎' : '') + ((r.items || []).length ? ' + ' + r.items.map(i => itemName(i.kind, i.id) + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ') : '')); await DB.refresh(); }
    catch (e) { toast(e.message); }
    busy = false; await load();
  };
  window.bpBuyGem = async () => {
    if (busy) return; const b = event && event.target; if (b && b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'ยืนยัน −💎 ' + N(BP.season.gem_cost); setTimeout(() => { if (b) { b.dataset.ok = ''; b.textContent = 'ปลด 💎 ' + N(BP.season.gem_cost); } }, 4000); return; }
    busy = true; view();
    try { await DB.call('buy_bp_gem'); toast('💎 ปลดสายเพชรแล้ว! EXP +3% และรับรางวัลย้อนหลังได้'); await DB.refresh(); } catch (e) { toast(e.message); }
    busy = false; await load();
  };

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    const _r = window.render;
    window.render = function () { if (typeof screen !== 'undefined' && screen === 'bp') { view(); return; } return _r.apply(this, arguments); };
  }
  install();
  window.battlePass = { load, get: () => BP, count };
})();
