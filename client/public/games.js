// ===== หน้าโต๊ะของเกมอื่นนอกจากดัมมี่: ป๊อกเด้ง / เก้าเก / ผสมสิบ / อีแก่ =====
// app.js เรียก renderOther() เมื่อ S.rule ไม่ใช่ 'dummy' — สถานะเกมทั้งหมดมาจากเซิร์ฟเวอร์ (view ของแต่ละกฎ) ที่นี่แค่วาดและส่งคำสั่ง
const GX = {};
const gxRed = c => c.s === 1 || c.s === 2;
// ไพ่หงาย (span) / ไพ่หงายแบบปุ่ม / หลังไพ่ — id >= 52 คือโจ๊กเกอร์ (ผสมสิบ)
function gxc(id, cls = '') { if (id >= 52) return `<span class="c jk${cls}">🃏</span>`; const c = ALL[id]; return `<span class="c${gxRed(c) ? ' r' : ''}${cls}">${RK[c.r]}<span>${SU[c.s]}</span></span>`; }
function gxb(id, cls, attrs) { if (id >= 52) return `<button ${attrs || ''} class="c jk${cls || ''}">🃏</button>`; const c = ALL[id]; return `<button ${attrs || ''} class="c${gxRed(c) ? ' r' : ''}${cls || ''}">${RK[c.r]}<span>${SU[c.s]}</span></button>`; }
const gxBack = n => Array.from({ length: n }, () => '<span class=cb></span>').join('');
const gxSort = ids => ids.slice().sort((a, b) => (a >= 52) - (b >= 52) || (ALL[a] ? ALL[a].r : 0) - (ALL[b] ? ALL[b].r : 0) || a - b);
const gxName = i => (i === S.my ? 'คุณ' : esc(S.P[i].n));
const gxMine = () => S && S.cur === S.my && !S.over;
const gxCd = d => `<b class="cd ${d > 0 ? 'pos' : d < 0 ? 'neg' : ''}">${sgn(d)} 🪙</b>`;

function gxAct(t, extra) { if (!gxMine()) { hint = 'ยังไม่ถึงตาคุณ'; return render(); } hint = ''; emit(Object.assign({ t }, extra || {})); }
function gxLeave() { if (confirm('ออกจากห้อง?')) leave(); }
function gxSel(id) { if (!gxMine() || S.phase !== 'discard') return; sel = sel.has(id) ? new Set() : new Set([id]); render(); }
function gxDis() { if (!gxMine() || S.phase !== 'discard') return; if (sel.size !== 1) { hint = 'เลือกไพ่ 1 ใบเพื่อทิ้ง'; return render(); } const id = [...sel][0]; sel = new Set(); hint = ''; emit({ t: 'dis', id }); }
function gxPick(i) { gxAct('pick', { i }); }

// วางที่นั่ง: ซ้าย/บน/ขวา = ผู้เล่นถัดจากเราตามลำดับ (เหมือนหน้าดัมมี่)
function gxPl(pi, pos, sub) {
  if (pi == null) return '';
  const p = S.P[pi], on = S.cur === pi && !S.over, a = av(p.n, p.ch), cls = a.startsWith('<img') ? 'chr' : 'av';
  const info = `<div class=pl-info><b>${pi === S.my ? 'คุณ' : esc(p.n)}${S.dealer === pi ? ' 👑' : ''}</b>${sub ? sub(pi) : ''}${on ? '<i class=tm>▶ ตา</i>' : ''}</div>`, ico = `<span class="${cls}">${a}</span>`;
  return `<div class="pl pl-${pos}${pi === S.my ? ' me' : ''}${on ? ' active' : ''}" data-seat=${pi}>${pos === 'bottom' ? info + ico : ico + info}</div>`;
}
function gxFrame(o) {
  const n = S.P.length, opp = []; for (let k = 1; k < n; k++) opp.push((S.my + k) % n);
  $('app').className = '';
  $('app').innerHTML = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}${S.stake != null ? ' · ตัวละ ' + esc(S.stake) + ' 🪙' : ''}</span><button class="pill rl" onclick="showRules()">📖 กติกา</button></div>
 <div class=arena>${gxPl(opp[1], 'top', o.sub)}${gxPl(opp[0], 'left', o.sub)}<div class=felt><div class=gx>${o.center}</div></div>${gxPl(opp[2], 'right', o.sub)}${gxPl(S.my, 'bottom', o.sub)}</div></div>
 <div class=colR><div class=logs>${S.logs.slice(-1).map(esc).join('')}</div><div class=hint>${o.hint}<small>${o.small || ''}</small></div><div class=dock-wrap><div class=dock>${o.dock}</div></div></div>${S.over ? gxOver() : ''}`;
  requestAnimationFrame(fitFrame);
}
const gxOrder = () => Array.from({ length: S.P.length }, (_, k) => (S.my + k) % S.P.length);
const gxLeaveBtn = '<button class="g sm" onclick="gxLeave()">ออก</button>';

// หน้าสรุปตา (ใช้ร่วมกันทุกเกม): ผลเหรียญ + ไพ่ที่เปิด + รายการจ่าย + สับไพ่/เล่นอีกตา
function gxOver() {
  if (resGid !== S.gid) { resGid = S.gid; resTab = 0; }
  const r = S.res, c = r.coin || { delta: [], lines: [], stake: S.stake }, my = S.my, md = (c.delta && c.delta[my]) || 0, win = md > 0, lose = md < 0;
  const medal = ['🥇', '🥈', '🥉', '4️⃣'], nm = i => (i === my ? 'คุณ' : esc(S.P[i].n));
  const ava = p => { const h = av(p.n, p.ch); return h.startsWith('<img') ? `<span class=rs-av>${h}</span>` : `<span class="rs-av rs-emo">${h}</span>`; };
  // ข้อความผลของแต่ละคน (ใช้ร่วมกันทุกเกม — ดูจากฟิลด์ที่เกมนั้นส่งมา)
  const label = x => x.dealer ? '👑 เจ้ามือ' : x.result === 'win' ? '✅ ชนะ' + (x.mult > 1 ? ' ×' + x.mult : '') : x.result === 'lose' ? '❌ แพ้' + (x.mult > 1 ? ' ×' + x.mult : '') : x.result === 'tie' ? '🤝 เสมอ' : x.loser ? '💀 แพ้' : x.folded ? '🏳️ หมอบ' : x.win ? '🏆 ชนะ' : x.order ? 'รอดที่ ' + x.order : '';
  const rows = (r.rows || []).map(x => ({ x, cd: (c.delta && c.delta[x.i]) || 0 })).sort((a, b) => b.cd - a.cd);
  const rank = rows.findIndex(o => o.x.i === my) + 1;
  const board = rows.map(({ x, cd }, k) => { const p = S.P[x.i], lb = label(x);
    return `<div class="rs-row${x.i === my ? ' me' : ''}${x.win || x.result === 'win' ? ' knk' : ''}"><b class=rs-rk>${medal[k] || k + 1}</b>${ava(p)}<div class=rs-who><b>${nm(x.i)}${x.dealer ? ' 👑' : ''}</b>${x.name ? `<span class=rs-chips><i>${esc(x.name)}</i></span>` : ''}${x.cards && x.cards.length ? `<div class="gcards rs-cards">${x.cards.map(id => gxc(id)).join('')}</div>` : ''}</div><div class=rs-pt><small>${lb}</small></div><div class="rs-cd ${cd > 0 ? 'pos' : cd < 0 ? 'neg' : ''}">${sgn(cd)} 🪙</div></div>`; }).join('');
  const pairs = r.pairs ? `<div class=gpairs>${r.pairs.map(pr => `<span class=gpair>${pr.map(id => gxc(id)).join('')}</span>`).join('')}</div>` : '';
  const pay = c.lines && c.lines.length ? `<div class=rs-pay><p class=rs-sub>ตัวละ ${esc(c.stake)} 🪙</p>${c.lines.map(l => `<div><span>${nm(l.f)} → ${nm(l.t)}</span><em>${esc(l.w)}</em><b>🪙 ${l.a}</b></div>`).join('')}</div>` : '<p class=rs-none>ไม่มีรายการจ่ายเหรียญตานี้</p>';
  const shuf = shufflePanel(), sh = lob && lob.shuffle, need = !!(sh && sh.needed && !sh.ready);
  const tabs = [['📊 สรุปผล', pairs + board], ['🪙 รายการจ่าย', pay]]; if (shuf) tabs.push([(need ? '❗' : '🔀') + ' สับไพ่', `<div class=rs-shuf>${shuf}</div>`]);
  if (resTab >= tabs.length) resTab = 0;
  return `<div class="ov rsv"><div class="rs ${win ? 'win' : lose ? 'lose' : 'even'}">
  <div class=rs-head><div class=rs-ttl><small>${win ? '🏆 คุณชนะตานี้' : lose ? 'แพ้ตานี้ สู้ใหม่!' : 'เสมอ'}</small><h2>${esc(r.title || 'จบตา')}</h2></div></div>
  <div class=rs-body>
    <aside class=rs-me><div class=rs-big><small>เหรียญตานี้</small><b class="${win ? 'pos' : lose ? 'neg' : ''}">${sgn(md)} 🪙</b></div><div class=rs-kv><span>รวมทั้งหมด</span><b>🪙 ${sv.coins}</b></div>${rank ? `<div class=rs-kv><span>อันดับ</span><b>${medal[rank - 1] || rank} ที่ ${rank}</b></div>` : ''}${r.pot ? `<div class=rs-kv><span>กองกลาง</span><b>🪙 ${r.pot}</b></div>` : ''}</aside>
    <section class=rs-main><nav class=rs-tabs>${tabs.map((x, i) => `<button class="${i === resTab ? 'on' : ''}" onclick="setResTab(${i})">${x[0]}</button>`).join('')}</nav><div class=rs-pane>${tabs[resTab][1]}</div></section>
  </div>
  <div class=rs-foot>${startBtn('▶ เล่นอีกตา')}<button class=g onclick=leave()>ออกจากห้อง</button></div></div></div>`;
}
function renderOther() { const f = GX[S.rule]; if (!f) { $('app').className = ''; $('app').innerHTML = '<div class=pg><div class=pg-body><p class=note>ยังไม่รองรับเกมนี้ใน client เวอร์ชันนี้ กรุณารีเฟรชหน้า</p><button class=wbtn onclick=leave()>ออก</button></div></div>'; return; } f(); }

// ---------- ป๊อกเด้ง ----------
GX.pokdeng = () => {
  const turn = gxMine(), P = S.P;
  const st = i => { const p = P[i];
    if (S.over) { const r = S.res.rows[i], d = S.res.coin.delta[i]; return (r.dealer ? '👑 เจ้ามือ' : r.result === 'win' ? '✅ ชนะ ×' + r.mult : r.result === 'lose' ? '❌ แพ้ ×' + r.mult : '🤝 เสมอ') + ' · ' + esc(r.name) + ' ' + gxCd(d); }
    if (i === S.my) return esc(S.mine.name) + (p.pok ? ' 🎉' : '');
    if (p.pok) return '🎉 ป๊อก!'; if (S.cur === i) return 'กำลังเล่น...'; if (S.queue.includes(i)) return 'รอตา'; return p.n_cards === 3 ? 'จั่วแล้ว' : 'ไม่จั่ว'; };
  const slot = i => { const p = P[i], cards = i === S.my ? S.hand : p.cards;
    return `<div class="gs${S.cur === i && !S.over ? ' on' : ''}${i === S.my ? ' me' : ''}"><b>${i === S.dealer ? '👑 ' : ''}${gxName(i)}</b><div class=gcards>${cards ? cards.map(id => gxc(id)).join('') : gxBack(p.n_cards)}</div><small>${st(i)}</small></div>`; };
  const center = `<div class=gslots>${gxOrder().map(slot).join('')}</div><p class=gnote>เจ้ามือ: ${gxName(S.dealer)} · เดิมพันคนละ ${S.stake} 🪙 · ไพ่เหลือในกอง ${S.stock}</p>`;
  const h = hint || (S.over ? 'จบตา — เปิดไพ่เทียบเจ้ามือ' : P[S.my].pok && !turn ? 'คุณได้ป๊อก! รอผู้เล่นคนอื่น' : turn ? `ตาคุณ — ${S.mine.name}${S.phase === 'dealer' ? ' (คุณเป็นเจ้ามือ)' : ''} จั่วเพิ่มหรือไม่?` : (P[S.cur].n) + ' กำลังเล่น...');
  const acts = turn ? `<button class=blue onclick="gxAct('draw')" ${S.canDraw ? '' : 'disabled'}>🂠 จั่วเพิ่ม 1 ใบ</button><button class=grn onclick="gxAct('stay')">✋ ไม่จั่ว</button>` : '';
  gxFrame({ center, hint: esc(h), small: esc(S.mine.name), sub: i => `<small>${P[i].n_cards} ใบ</small>`,
    dock: `<div class=hand>${S.hand.map(id => gxb(id, '')).join('')}</div><div class=acts>${acts}${gxLeaveBtn}</div>` });
};

// ---------- เก้าเก ----------
GX.gaogae = () => {
  const turn = gxMine(), P = S.P, me = P[S.my], fold = me.folded;
  const st = i => { const p = P[i];
    if (S.over) { const r = S.res.rows[i], d = S.res.coin.delta[i]; return (r.win ? '🏆 ' : '') + esc(r.name) + ' ' + gxCd(d); }
    return (p.folded ? '🙅 หมอบ' : S.cur === i ? 'กำลังตัดสินใจ...' : 'ลงแล้ว') + ' · 🪙' + p.bet; };
  const slot = i => { const p = P[i], cards = i === S.my ? S.hand : p.cards;
    return `<div class="gs${S.cur === i && !S.over ? ' on' : ''}${i === S.my ? ' me' : ''}${p.folded ? ' fold' : ''}"><b>${gxName(i)}</b><div class=gcards>${cards ? cards.map(id => gxc(id)).join('') : gxBack(p.n_cards)}</div><small>${st(i)}</small></div>`; };
  const center = `<div class=gpot>💰 กองกลาง <b>${S.pot}</b> 🪙 · ยอดที่ต้องตาม <b>${S.cb}</b> · เกทับแล้ว ${S.raises}/${S.maxRaises}</div><div class=gslots>${gxOrder().map(slot).join('')}</div>`;
  const h = hint || (S.over ? 'จบตา' : fold ? 'คุณหมอบแล้ว รอดูผล' : turn ? `ตาคุณ — ${S.mine.name} · ${S.toCall > 0 ? 'ตามต้องจ่ายเพิ่ม ' + S.toCall + ' 🪙' : 'ยังไม่มีใครเกทับ'}` : (P[S.cur].n) + ' กำลังตัดสินใจ...');
  const acts = turn ? `<button class=g onclick="gxAct('fold')">🙅 หมอบ</button><button class=grn onclick="gxAct('call')">${S.toCall > 0 ? '👊 ตาม +' + S.toCall : '✋ สู้'}</button><button class=org onclick="gxAct('raise')" ${S.canRaise ? '' : 'disabled'}>🔥 เกทับ +${S.raise}</button>` : '';
  gxFrame({ center, hint: esc(h), small: esc(S.mine.name), sub: i => `<small>🪙 ${P[i].bet}${P[i].folded ? ' · หมอบ' : ''}</small>`,
    dock: `<div class=hand>${S.hand.map(id => gxb(id, fold ? ' dim' : '')).join('')}</div><div class=acts>${acts}${gxLeaveBtn}</div>` });
};

// ---------- ผสมสิบ ----------
GX.somsip = () => {
  const turn = gxMine(), P = S.P, my = S.my, mp = P[my].pile, draw = turn && S.phase === 'draw', dis = turn && S.phase === 'discard';
  const pile = i => { const p = P[i], top = p.pile.slice(-3), can = i === my && draw && p.pile.length;
    return `<div class="gpile${i === my ? ' mine' : ''}${S.cur === i && !S.over ? ' on' : ''}${can ? ' can' : ''}" ${can ? 'onclick="gxAct(\'take\')"' : ''}><small>กองทิ้งหน้า${i === my ? 'คุณ' : ' ' + esc(p.n)}</small><div class=gcards>${top.length ? top.map(id => gxc(id)).join('') : '<span class=gempty>ว่าง</span>'}</div><small>${p.pile.length} ใบ${can ? ' · แตะเพื่อเก็บ' : ''}</small></div>`; };
  const ind = S.ind != null ? `<div class=gind>${gxc(S.ind, ' sp')}<small>ตัวบอกไวลด์: ${S.wildRank ? 'เลข ' + RK[S.wildRank] + ' + 🃏' : '🃏 เท่านั้น'}</small></div>` : '<div class=gind><small>แบบง่าย ไม่มีไวลด์</small></div>';
  const center = `<div class=gtop><div class=gstock ${draw ? 'onclick="gxAct(\'draw\')"' : ''}><span class="cb big"></span><small>กองจั่ว ${S.stock}</small></div>${ind}</div><div class=gpiles>${gxOrder().map(pile).join('')}</div>`;
  const wild = new Set(S.wild || []);
  const h = hint || (S.over ? 'จบตา' : draw ? 'ตาคุณ — จั่วจากกอง หรือเก็บไพ่จากกองทิ้งหน้าคุณ' : dis ? (S.canWin ? '🎉 ไพ่ครบ 3 คู่แล้ว! กด "ผสมสิบ!" เพื่อชนะ' : 'เลือกไพ่ 1 ใบ แล้วกด "ทิ้ง" ให้เหลือ 5 ใบ') : (P[S.cur].n) + ' กำลังเล่น...');
  const acts = draw ? `<button class=blue onclick="gxAct('draw')">🂠 จั่ว (${S.stock})</button><button class=grn onclick="gxAct('take')" ${mp.length ? '' : 'disabled'}>เก็บกองทิ้ง ${mp.length ? '(' + mp.length + ')' : ''}</button>`
    : dis ? `<button class=org onclick="gxDis()">ทิ้ง</button><button class="grn${S.canWin ? ' pulse' : ''}" onclick="gxAct('win')" ${S.canWin ? '' : 'disabled'}>🎉 ผสมสิบ!</button>` : '';
  gxFrame({ center, hint: esc(h), small: S.canWin ? esc(S.winName || '') : '', sub: i => `<small>${P[i].n_cards} ใบ</small>`,
    dock: `<div class=hand>${gxSort(S.hand).map(id => gxb(id, (sel.has(id) ? ' s' : '') + (wild.has(id) ? ' sp' : ''), `data-id=${id} onclick="gxSel(${id})"`)).join('')}</div><div class=acts>${acts}${gxLeaveBtn}</div>` });
};

// ---------- อีแก่ ----------
GX.eekae = () => {
  const turn = gxMine(), P = S.P, n = P.length, cur = S.cur;
  const prevAlive = c => { for (let k = 1; k < n; k++) { const s = (c - k + n) % n; if (!P[s].out) return s; } return -1; };
  const from = S.over ? -1 : prevAlive(cur);
  const st = i => { const p = P[i];
    if (S.over) { const r = S.res.rows[i], d = S.res.coin.delta[i]; return esc(r.name) + ' ' + gxCd(d); }
    return p.out ? '✅ รอดลำดับ ' + p.order : i === cur ? 'กำลังจั่ว...' : i === from ? 'ถูกจั่ว' : 'ถือไพ่ ' + p.n_cards + ' ใบ'; };
  const slot = i => { const p = P[i];
    return `<div class="gs${cur === i && !S.over ? ' on' : ''}${i === S.my ? ' me' : ''}${p.out ? ' fold' : ''}${i === from ? ' src' : ''}"><b>${gxName(i)}</b><div class=gcards>${p.out ? '<span class=gempty>หมดมือ</span>' : gxBack(Math.min(p.n_cards, 14))}</div><small>${st(i)}</small></div>`; };
  const pick = turn && S.src >= 0 ? `<div class=gpick><p>👉 เลือกไพ่ 1 ใบจาก <b>${esc(P[S.src].n)}</b> (${S.srcN} ใบ)</p><div class=gpk>${Array.from({ length: S.srcN }, (_, i) => `<button class="cb pk" onclick="gxPick(${i})" aria-label="ไพ่ใบที่ ${i + 1}"></button>`).join('')}</div></div>` : '';
  const center = `<div class=gslots>${gxOrder().map(slot).join('')}</div>${pick}<p class=gnote>ทิ้งคู่แล้ว ${S.disc} ใบ · ใครถือควีนเดี่ยวที่เหลือสุดท้ายแพ้</p>`;
  const me = P[S.my], h = hint || (S.over ? 'จบเกม' : me.out ? 'คุณรอดแล้ว! ดูเพื่อนเล่นต่อ' : turn ? 'ตาคุณ — แตะหลังไพ่เพื่อจั่ว 1 ใบ' : (P[cur].n) + ' กำลังจั่วจาก ' + (from >= 0 ? (P[from].n) : '-'));
  gxFrame({ center, hint: esc(h), small: me.out ? '' : 'ถ้าได้ไพ่เลขเดียวกัน ระบบทิ้งคู่ให้อัตโนมัติ', sub: i => `<small>${P[i].out ? 'รอด' : P[i].n_cards + ' ใบ'}</small>`,
    dock: `<div class=hand>${S.hand.length ? gxSort(S.hand).map(id => gxb(id, ALL[id].r === 12 ? ' sp' : '')).join('') : '<span class=gempty>ไม่มีไพ่ในมือ</span>'}</div><div class=acts>${gxLeaveBtn}</div>` });
};
