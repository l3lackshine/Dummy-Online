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
  let BP = null, busy = false, err = '';
  const itemName = (k, id) => { const l = (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[k]) || []; const x = l.find(y => y.id === id); return (x && (x.name || x.n)) || id; };
  const itemImg = (k, id) => { const l = (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY[k]) || []; const x = l.find(y => y.id === id); return (x && (x.asset || x.preview)) || ''; };

  async function load() {
    if (!dbOn()) return;
    try { BP = await DB.call('get_bp'); err = ''; } catch (e) { err = e.message || 'โหลดไม่สำเร็จ'; }
    if (typeof screen !== 'undefined' && screen === 'bp') view();
  }
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
    const lines = [r.preview ? `<em class=bp-pv>${E(r.preview)}</em>` : '', r.item_kind ? `<span class=bp-it>${itemImg(r.item_kind, r.item_id) ? `<img src="${E(itemImg(r.item_kind, r.item_id))}" alt="">` : ''}${E(itemName(r.item_kind, r.item_id))}</span>` : '',
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
        <button class="bp-claim${claim ? ' on' : ''}" ${claim && !busy ? '' : 'disabled'} onclick="bpClaim()">${claim ? `รับรางวัล (${claim})` : 'ยังไม่มีรางวัลใหม่'}</button>
      </header>
      <div class=bp-board>
        <div class=bp-rows><div class=bp-rh></div>
          <div class="bp-rh bp-free"><b>ฟรี</b><small>ทุกคนได้</small></div>
          <div class="bp-rh bp-gem"><b>สายเพชร</b><small>คืนทุนได้ · EXP +${x.tierBonusPct || 3}%</small>${gemBtn}</div>
          <div class="bp-rh bp-premium"><b>พรีเมียม</b><small>ของพิเศษประจำฤดู</small>${preBtn}</div></div>
        <div class=bp-scroll id=bpScroll>${cols}<div class="bp-col bp-cyc"><b class=bp-n>${s.max_level}+</b><div class="bp-cell big"><span class=bp-c>🪙 ${N(s.cycle_coins)}</span><em class=bp-pv>ทุกเลเวลที่เกิน</em></div></div></div>
      </div>
      <footer class=bp-how><b>ได้ EXP จาก</b>
        <span>⚡ แต้มกิจกรรมรายวันครบ 100 <em>+${N(x.dailyBonus)}</em></span><span>📜 เควสรายสัปดาห์ <em>+${N(x.weeklyQuest)}/ข้อ</em></span>
        <span>🎁 โบนัสรายสัปดาห์ <em>+${N(x.weeklyBonus)}</em></span><span>🎴 เล่นจบตา <em>+${N(x.perGame)} (วันละไม่เกิน ${N(x.perGameDailyCap)})</em></span>
        <button class=bp-q onclick="openQuests('d')">ไปทำเควส</button></footer>
    </div>`;
    page2('แบทเทิลพาส', body, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'bp';
    const sc = document.getElementById('bpScroll'), nx = sc && sc.querySelector('.bp-col.next');
    if (sc && nx) sc.scrollLeft = Math.max(0, nx.offsetLeft - sc.clientWidth / 3);
  }
  const toast = m => { if (window.dbToast) dbToast(m); };
  window.bpClaim = async () => {
    if (busy) return; busy = true; view();
    try { const r = await DB.call('claim_bp'); toast('🎖 รับรางวัลแล้ว' + (r.coins ? ' +' + N(r.coins) + ' 🪙' : '') + (r.mcash ? ' +' + N(r.mcash) + ' 💎' : '') + ((r.items || []).length ? ' + ของ ' + r.items.length + ' ชิ้น' : '')); await DB.refresh(); }
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
  window.battlePass = { load, get: () => BP };
})();
