/* ranked.js — ตารางอันดับรายสัปดาห์ (แยกเกม) + แรงก์รายเดือน (screen === 'rank', เปิดด้วย rankOpen())
   ข้อมูลทั้งหมดมาจากฐานข้อมูล: get_leaderboard / get_rank / claim_rank_rewards / set_badge (supabase/v11_ranked.sql)
   - แต้มได้จากห้องแรงก์เท่านั้น (หาแมตช์แรงก์: คนจริงล้วน ไม่มีบอท) (เซิร์ฟเวอร์เกมส่งผลเข้า record_rank) · หลังจบตาเซิร์ฟเวอร์ส่ง 'rank:update' มาแจ้ง
   ไม่แก้ app.js: ห่อ render() เหมือน battlepass.js
   Public: rankOpen() · Ranked.count() · Ranked.emblem(tier) */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const N = n => Number(n || 0).toLocaleString('en-US');
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  const GAMES = [['dummy', 'ดัมมี่'], ['pokdeng', 'ป๊อกเด้ง'], ['gaogae', 'เก้าเก'], ['somsip', 'ผสมสิบ'], ['eekae', 'อีแก่']];
  const gName = id => (GAMES.find(g => g[0] === id) || [id, id])[1];
  const TIER_TH = ['บรอนซ์', 'ซิลเวอร์', 'โกลด์', 'แพลทินัม', 'ไดมอนด์', 'มาสเตอร์'];
  const TIER_C = [['#f0b98a', '#a8612f'], ['#eef3f8', '#8f9cab'], ['#ffe9a3', '#d09a1e'], ['#c9fff6', '#2fa89c'], ['#d8e9ff', '#4f7fe0'], ['#f3d6ff', '#9b45d6']];
  let RK = null, LB = null, game = 'dummy', prev = false, busy = false, err = '', lastLoad = 0;

  // ตราแรงก์ (โล่ + ดาวตามขั้น) · ใช้ในหน้านี้และที่อื่น
  function emblem(t, cls) {
    t = Math.max(0, Math.min(5, Number(t) || 0)); const [a, b] = TIER_C[t], id = 'rkg' + t + (cls || '');
    const stars = t === 5 ? '<path d="M32 9l3 6 6.5 1-4.7 4.6 1.1 6.4L32 24l-5.9 3 1.1-6.4L22.5 16l6.5-1z" fill="#fff"/>' : '';
    return `<svg class="rk-em ${cls || ''}" viewBox="0 0 64 72" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <path d="M32 3 58 13v22c0 17-11 28-26 34C17 63 6 52 6 35V13z" fill="url(#${id})" stroke="#3a2140" stroke-width="3"/>
      <path d="M32 10 51 17v18c0 12-8 21-19 26-11-5-19-14-19-26V17z" fill="none" stroke="#ffffff88" stroke-width="2"/>
      ${stars}<text x="32" y="${t === 5 ? 50 : 45}" text-anchor="middle" font-family="Mali,Sarabun,sans-serif" font-weight="800" font-size="${t === 5 ? 16 : 22}" fill="#3a2140">${['B', 'S', 'G', 'P', 'D', 'M'][t]}</text></svg>`;
  }

  async function load(only) {
    if (!dbOn()) return;
    lastLoad = Date.now();
    try {
      const [r, l] = await Promise.all([only === 'lb' ? RK : DB.call('get_rank'), DB.call('get_leaderboard', { p_game: game, p_prev: prev })]);
      RK = r; LB = l; err = '';
    } catch (e) { err = e.message || 'โหลดไม่สำเร็จ'; }
    if (typeof screen !== 'undefined' && screen === 'rank') view();
    else if (typeof screen !== 'undefined' && screen === 'home' && typeof render === 'function') render();
  }
  // รางวัลค้างรับ (ป้ายแจ้งเตือนบนปุ่มหน้าแรก) · โหลดเงียบ ๆ อย่างมากนาทีละครั้ง
  function count() {
    if (!dbOn()) return 0;
    if (Date.now() - lastLoad > 60000) load();
    return (RK && RK.pending) || 0;
  }
  const left = ms => { ms = Math.max(0, ms); const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return d ? `${d} วัน ${h} ชม.` : h ? `${h} ชม. ${m} นาที` : `${m} นาที`; };

  function myCard() {
    if (!RK) return '';
    const t = RK.tier, nx = RK.next, pct = nx ? Math.round((RK.rp - RK.floor) / (nx - RK.floor) * 100) : 100;
    const titles = RK.titles || [];
    return `<section class=rk-me>
      <div class=rk-me-h>${emblem(t, 'big')}<span><small>แรงก์เดือนนี้</small><b class="rk-tn t${t}">${E(RK.tier_name)}</b><em>${TIER_TH[t]} · ${N(RK.rp)} แต้ม</em></span></div>
      <div class=rk-bar><i style="width:${pct}%"></i><span>${nx ? `อีก ${N(nx - RK.rp)} แต้มขึ้น ${E(RK.tier_names[t + 1])}` : 'ขั้นสูงสุดแล้ว!'}</span></div>
      <div class=rk-steps>${(RK.tier_names || []).map((n, i) => `<span class="${i === t ? 'on' : i < t ? 'done' : ''}" title="${E(n)} ${N(RK.tiers[i])}+">${emblem(i, 'sm')}</span>`).join('')}</div>
      <p class=rk-note>⏳ จบเดือนใน ${left(new Date(RK.month_ends) - Date.now())} · ขึ้นเดือนใหม่แรงก์ตกลง 1 ขั้น</p>
      ${RK.pending ? `<button class=rk-claim ${busy ? 'disabled' : ''} onclick="rankClaim()">🎁 รับรางวัลประจำสัปดาห์ (${RK.pending})</button>` : ''}
      <div class=rk-ttl><small>ฉายาพิเศษ</small>${titles.length
        ? `<div>${titles.map(x => `<button class="${RK.badge === x.id ? 'on' : ''}" onclick="rankBadge('${E(x.id)}')">👑 ${E(x.name)}${x.times > 1 ? ` ×${x.times}` : ''}</button>`).join('')}</div>`
        : '<em>ได้อันดับ 1 ประจำสัปดาห์ของเกมไหน รับฉายา “แชมป์” ของเกมนั้น</em>'}</div>
    </section>`;
  }
  function howCard() {
    const p = (LB && LB.pts) || [30, 15, 5, 0], w = (LB && LB.weekly) || { top: [[1, 1, 100], [2, 3, 50], [4, 10, 20]], consol_plays: 10, consol_coins: 300 };
    return `<section class=rk-how><b>รางวัลประจำสัปดาห์ <small>(ต่อเกม)</small></b>
      ${w.top.map(([a, b, m]) => `<span><i>${a === b ? '#' + a : '#' + a + '–' + b}</i>💎 ${N(m)}${a === 1 ? ' + ฉายาแชมป์' : ''}</span>`).join('')}
      <span><i>เล่น ${w.consol_plays} ตา</i>🪙 ${N(w.consol_coins)}</span>
      <b>แต้มต่อตา <small>(เฉพาะห้องแรงก์)</small></b>
      <span class=rk-pts>${p.map((v, i) => `<i>ที่ ${i + 1}${i === p.length - 1 ? '/โหล่' : ''} <u>+${v}</u></i>`).join('')}</span>
      <small class=rk-fine>กด “เล่นแรงก์” หรือปุ่ม 🏆 แรงก์ ในหน้าเล่นเกม · ห้องธรรมดาไม่นับ · แต้มเดียวกันเข้าแรงก์รายเดือน</small></section>`;
  }
  function row(x) {
    const av = typeof avFace === 'function' ? avFace(x.name, x.ch) : '';
    const medal = x.rank <= 3 ? ['', '🥇', '🥈', '🥉'][x.rank] : '#' + x.rank;
    return `<div class="rk-row${x.me ? ' me' : ''}${x.rank <= 3 ? ' top top' + x.rank : ''}"><span class=rk-no>${medal}</span><span class=rk-av>${av}</span>
      <span class=rk-nm><b>${E(x.name)}</b>${x.badge ? `<em>👑 ${E(x.badge)}</em>` : x.title ? `<small>${E(x.title)}</small>` : ''}</span>
      ${emblem(x.tier, 'sm')}<span class=rk-wp><small>ชนะ ${N(x.wins)}/${N(x.plays)}</small></span><span class=rk-sc>${N(x.points)}</span></div>`;
  }
  function board() {
    if (!LB) return `<div class=rk-empty>${err ? '⚠️ ' + E(err) : 'กำลังโหลด…'}</div>`;
    const top = LB.top || [], me = LB.me || {}, mine = top.some(x => x.me);
    const reward = r => { const w = LB.weekly; if (!w || !r) return ''; const b = w.top.find(([a, z]) => r >= a && r <= z); return b ? `💎 ${N(b[2])}` : ''; };
    const meRow = !mine ? `<div class="rk-row me pin"><span class=rk-no>${me.rank ? '#' + me.rank : '—'}</span><span class=rk-av>${typeof avFace === 'function' ? avFace(DB.P.display_name, typeof myChar === 'function' ? myChar() : '') : ''}</span>
      <span class=rk-nm><b>${E(DB.P.display_name)} (คุณ)</b><small>${me.points ? 'นอกอันดับ 50' : me.plays ? 'ยังไม่มีแต้ม · ต้องได้ที่ 1–3' : 'ยังไม่ได้เล่นแรงก์เกมนี้สัปดาห์นี้'}</small></span>${emblem(RK ? RK.tier : 0, 'sm')}
      <span class=rk-wp><small>ชนะ ${N(me.wins)}/${N(me.plays)}</small></span><span class=rk-sc>${N(me.points)}</span></div>` : '';
    const ends = new Date(LB.ends_at) - Date.now();
    return `<div class=rk-tabs>${GAMES.map(([id, n]) => `<button class="${id === game ? 'on' : ''}" onclick="rankGame('${id}')">${n}</button>`).join('')}</div>
      <div class=rk-sub><span class=rk-wk><button class="${prev ? '' : 'on'}" onclick="rankWeek(false)">สัปดาห์นี้</button><button class="${prev ? 'on' : ''}" onclick="rankWeek(true)">สัปดาห์ที่แล้ว</button></span>
        <button class=rk-play onclick="rankedFind('${game}')">▶ เล่นแรงก์${gName(game)}</button>
        <small>${prev ? 'ผลสุดท้าย · รับรางวัลได้ที่ปุ่มด้านซ้าย' : `⏳ รีเซ็ตใน ${left(ends)} (จันทร์ 00:00)`}${!prev && me.rank ? ` · ตอนนี้คุณอยู่อันดับ ${me.rank} ${reward(me.rank)}` : ''}</small></div>
      <div class=rk-list>${top.length ? top.map(row).join('') : `<div class=rk-empty>${prev ? 'สัปดาห์ที่แล้วไม่มีใครติดอันดับ' : `ยังไม่มีใครได้แต้ม${gName(game)}สัปดาห์นี้ — เป็นคนแรกเลย!`}</div>`}</div>${meRow}`;
  }
  function view() {
    if (!dbOn()) { page2('อันดับ', `<div class=rk-empty>🔒 ล็อกอินเพื่อดูตารางอันดับและแรงก์</div>`, 'home'); return; }
    page2('อันดับ', `<div class=rk-wrap><div class=rk-side>${myCard() || `<div class=rk-empty>${err ? '⚠️ ' + E(err) : 'กำลังโหลด…'}</div>`}${howCard()}</div><div class=rk-main>${board()}</div></div>`, 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'rank';
  }
  const toast = m => { if (window.dbToast) dbToast(m); };
  window.rankOpen = () => { if (typeof go === 'function') go('rank'); load(); };
  window.rankGame = g => { game = g; LB = null; view(); load('lb'); };
  window.rankWeek = p => { prev = !!p; LB = null; view(); load('lb'); };
  window.rankClaim = async () => {
    if (busy) return; busy = true; view();
    try {
      const r = await DB.call('claim_rank_rewards');
      const champs = (r.items || []).filter(i => i.title).map(i => i.title);
      toast('🎁 รางวัลอันดับ' + (r.mcash ? ' +' + N(r.mcash) + ' 💎' : '') + (r.coins ? ' +' + N(r.coins) + ' 🪙' : '') + (champs.length ? ' · ได้ฉายา ' + champs.join(', ') : '') + (!r.mcash && !r.coins && !champs.length ? ' — สัปดาห์ที่แล้วไม่ติดอันดับ ลองใหม่สัปดาห์นี้!' : ''));
      await DB.refresh();
    } catch (e) { toast(e.message); }
    busy = false; await load();
  };
  window.rankBadge = async id => {
    try { const r = await DB.call('set_badge', { p_title: RK && RK.badge === id ? null : id }); toast(r.badge ? '👑 ติดฉายา ' + r.name : 'ถอดฉายาแล้ว'); } catch (e) { toast(e.message); }
    load();
  };
  // หลังจบตา: แจ้งแต้มที่ได้ · ขึ้นขั้น = แจ้งใหญ่
  let bound = null;
  setInterval(() => {
    if (typeof sock === 'undefined' || !sock || bound === sock) return; bound = sock;
    sock.on('rank:update', r => {
      if (!r || !r.counted) return;
      if (RK) { RK = Object.assign({}, RK, { rp: r.rp, tier: r.tier, tier_name: r.tier_name, floor: r.floor, next: r.next }); }
      setTimeout(() => toast(r.tier_up ? `🎉 แรงก์ขึ้นเป็น ${r.tier_name}!` : r.pts ? `🏆 +${r.pts} แต้มอันดับ · สัปดาห์นี้ ${N(r.week_points)} · ${r.tier_name} ${N(r.rp)}` : `🏆 นับตาอันดับแล้ว (${N(r.week_plays)} ตาสัปดาห์นี้)`), 1800);
    });
  }, 500);

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    const _r = window.render;
    window.render = function () { if (typeof screen !== 'undefined' && screen === 'rank') { view(); return; } return _r.apply(this, arguments); };
  }
  install();
  window.Ranked = { load, count, emblem, get: () => ({ RK, LB }) };
})();
