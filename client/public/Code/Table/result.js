/* result.js — หน้าสรุปผลจบตา: ดูครบในหน้าจอเดียว แบ่งแท็บ (สรุปแต้ม / รายการชิป)
   ปุ่มเล่นต่อมาจาก Code/Lobby/playon.js (nextFoot)
   Public: resultOverlay() · setResTab(n) · coinLines() · sgn(n) */
const sgn = n => (n > 0 ? '+' + n : String(n));

// ===== หน้าสรุปผลจบตา: ดูครบในหน้าจอเดียว แบ่งแท็บเมื่อข้อมูลเยอะ (สรุปแต้ม / รายการจ่ายเหรียญ / สับไพ่) =====
let resTab = 0,
  resGid = null;
function setResTab(n) {
  resTab = n;
  render();
}
function resultOverlay() {
  if (resGid !== S.gid) {
    resGid = S.gid;
    resTab = 0;
  }
  const R = S.res,
    c = R.coin,
    my = S.my,
    md = c && c.delta ? c.delta[my] || 0 : typeof coinDelta !== 'undefined' ? coinDelta : 0;
  const win = md > 0,
    lose = md < 0,
    knk = R.k == null ? null : S.P[R.k];
  const rows = S.P.map(p => ({ p, pt: R.pts[p.i], cd: c && c.delta ? c.delta[p.i] : 0 })).sort((x, y) => y.pt - x.pt);
  const rank = rows.findIndex(r => r.p.i === my) + 1,
    medal = ['🥇', '🥈', '🥉', '4️⃣'];
  const nm = i => (i === my ? 'คุณ' : esc(S.P[i].n));
  const ava = p => {
    const h = av(p.n, p.ch);
    return h.startsWith('<img') ? `<span class=rs-av>${avFace(p.n, p.ch)}</span>` : `<span class="rs-av rs-emo">${h}</span>`;
  };
  const board = rows
    .map(
      ({ p, pt, cd }, i) =>
        `<div class="rs-row${p.i === my ? ' me' : ''}${R.k === p.i ? ' knk' : ''}"><b class=rs-rk>${medal[i] || i + 1}</b>${ava(p)}<div class=rs-who><b>${nm(p.i)}${R.k === p.i ? ' 👑' : ''}${window.Report ? Report.button(p.i) : ''}</b><span class=rs-chips>${(R.nt[p.i] || []).map(x => `<i>${esc(x)}</i>`).join('')}</span></div><div class=rs-pt>${pt}<small>แต้ม</small></div><div class="rs-cd ${cd > 0 ? 'pos' : cd < 0 ? 'neg' : ''}">${sgn(cd)}<small>ชิป</small></div></div>`
    )
    .join('');
  const pay =
    c && c.lines && c.lines.length
      ? `<div class=rs-pay><p class=rs-sub>ชิปในโต๊ะ (ใช้จัดอันดับเท่านั้น ไม่ใช่เหรียญ)</p>${c.lines.map(l => `<div><span>${nm(l.f)} → ${nm(l.t)}</span><em>${esc(l.w)}</em><b>${l.a} ชิป</b></div>`).join('')}</div>`
      : '<p class=rs-none>ไม่มีรายการชิปตานี้</p>';
  const shuf = shufflePanel(),
    sh = lob && lob.shuffle,
    need = !!(sh && sh.needed && !sh.ready);
  const tabs = [
    ['📊 สรุปแต้ม', board],
    ['🎴 รายการชิป', pay],
  ];
  if (resTab >= tabs.length) resTab = 0;
  const title = R.k == null ? 'ไพ่หมดกอง' : R.k === my ? 'คุณน็อก!' : esc(knk.n) + ' น็อก!';
  return `<div class="ov rsv"><div class="rs ${win ? 'win' : lose ? 'lose' : 'even'}">
  <div class=rs-head><div class=rs-ttl><small>${win ? '🏆 คุณชนะตานี้' : lose ? 'แพ้ตานี้ สู้ใหม่!' : 'เสมอ'}</small><h2>${title}</h2></div>${S.down != null ? `<div class=rs-down><small>ใบที่คว่ำ</small>${mini(S.down)}</div>` : ''}</div>
  <div class=rs-body>
    ${window.Progress ? Progress.panel(S).replace('</aside>', `<div class=rs-kv><span>แต้มของคุณ</span><b>${R.pts[my]}</b></div></aside>`) : ''}
    <section class=rs-main><nav class=rs-tabs>${tabs.map((x, i) => `<button class="${i === resTab ? 'on' : ''}" onclick="setResTab(${i})">${x[0]}</button>`).join('')}</nav><div class=rs-pane>${tabs[resTab][1]}</div></section>
  </div>
  <div class=rs-foot>${typeof nextFoot === 'function' ? nextFoot() : startBtn('▶ เล่นอีกตา')}<button class=g onclick=leave()>ออกจากห้อง</button></div></div></div>`;
}
// รายการจ่ายเหรียญของตานี้ (ใครจ่ายใคร เท่าไร เพราะอะไร)
function coinLines() {
  const c = S && S.res && S.res.coin;
  if (!c || !c.lines.length) return '';
  const nm = i => (i === S.my ? 'คุณ' : esc(S.P[i].n));
  return `<details class=clines><summary>🎴 รายการชิปในโต๊ะ</summary>${c.lines.map(l => `<div>${nm(l.f)} → ${nm(l.t)} <b>${l.a}</b> · ${esc(l.w)}</div>`).join('')}</details>`;
}
