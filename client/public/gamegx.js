/* gamegx.js — หน้าโต๊ะเล่นแนวนอนแบบ 4 ฝั่งทแยง (อ้างอิงภาพตัวอย่าง)
   ยังคงของเดิมครบ: กองจั่ว · กองทิ้ง · ไพ่ที่เกิด (วางหน้าผู้เล่นแต่ละฝั่ง) · ไพ่ในมือ · ปุ่มเกิด/ฝาก/ทิ้ง */
const isWide = () => { try { return !!(window.matchMedia && window.matchMedia('(min-aspect-ratio:5/4)').matches); } catch (e) { return false; } };
function gxView(c) {
  const { top, left, right, pm, pd, h, fresh } = c, me = S.P[S.my];
  const meOn = S.cur === S.my && !S.over;
  const art = (p) => { const a = av(p.n, p.ch); return a.startsWith('<img') ? `<span class=gx-chr>${a}</span>` : `<span class=gx-emo>${a}</span>`; };
  const ms = pi => pi == null ? '' : S.melds.map((m, k) => ({ m, k })).filter(x => x.m.o === pi).map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`).join('');
  const badge = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="gx-seat gx-${pos}${on ? ' active' : ''}" data-seat=${pi}><div class=gx-name>${esc(p.n)}</div><div class=gx-stack><i></i><i></i><b data-pc=${pi}>${p.n_cards}</b><i></i><i></i></div><small class=gx-pts>${p.pts} แต้ม</small>${on ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`; };
  const wedge = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="gx-art gx-art-${pos}${on ? ' on' : ''}">${art(p)}</div>`; };
  const meArt = `<div class="gx-art gx-art-bottom${meOn ? ' on' : ''}">${art(me)}</div>`;
  const meBadge = `<div class="gx-me${meOn ? ' active' : ''}" data-seat=${S.my}><div class=gx-name>คุณ</div><div class=gx-stack><i></i><i></i><b data-pc=${S.my}>${me.n_cards}</b><i></i><i></i></div><small class=gx-pts>${me.pts} แต้ม</small>${meOn ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`;
  const q = (pos, on) => `<polygon class="gx-q gx-q-${pos}${on ? ' on' : ''}" points="${{ top: '0,0 100,0 72,28 28,28', right: '100,0 100,100 72,60 72,28', bottom: '0,100 28,60 72,60 100,100', left: '0,0 28,28 28,60 0,100' }[pos]}"/>`;
  const on = pi => pi != null && S.cur === pi && !S.over;
  const last = S.disc.length ? S.disc[S.disc.length - 1] : null;
  return `<div class=gx-stage>
  <svg class=gx-bg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden=true>${q('top', on(top))}${q('left', on(left))}${q('right', on(right))}${q('bottom', on(S.my))}</svg>
  ${wedge(top, 'top')}${wedge(left, 'left')}${wedge(right, 'right')}${meArt}
  <div class=gx-hud><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}${S.stake != null ? ' · ตัวละ ' + esc(S.stake) + ' 🪙' : ''}</span></div>
  <button class=gx-gear onclick="if(confirm('ออกจากห้อง?'))leave()" aria-label="ออก">⚙</button>
  ${badge(top, 'top')}${badge(left, 'left')}${badge(right, 'right')}
  <div class="zone zone-top">${ms(top)}</div><div class="zone zone-left">${ms(left)}</div><div class="zone zone-right">${ms(right)}</div><div class="zone zone-bottom">${ms(S.my)}</div>
  <div class="felt gx-hub"><div class=piles>
    <div class=gx-stock><button class=back onclick=openPile() aria-label="เปิดกองจั่วและเลือกไพ่">${S.stock}</button><div class=lab>กองจั่ว</div></div>
    <div class=gx-disc><div class=dp id=dp>${S.disc.map(([id, hd], i) => face(id, ' d' + (hd ? ' sp' : '') + (S.ok[i] ? ' ok' : '') + (i >= pd ? ' new' : ''), `onclick=openPile()`)).join('')}</div><div class=lab>${deal ? 'กำลังแจกไพ่...' : 'กองทิ้ง ' + S.disc.length + ' ใบ'}</div></div>
  </div><div class=gx-hint>${esc(h)}</div></div>
  ${meBadge}
  <div class=gx-tools><button onclick="mv(-1)">◀</button><button onclick=srt()>เรียงไพ่</button><button onclick="mv(1)">▶</button></div>
  <div class="dock gx-dock"><div class=hand>${ho.map(i => face(i, (sel.has(i) ? ' s' : '') + (fresh.has(i) ? ' new' : ''), `data-id=${i} onclick=pick(${i})`)).join('')}</div></div>
  <div class="acts gx-acts"><button class=blue onclick=mld()>เกิด</button><button class=grn onclick=adep()>ฝากออโต้</button><button class=org onclick=dsc()>${S.hand.length === 1 && mine() && S.phase === 'play' ? '🂠 คว่ำน็อก!' : 'ทิ้ง'}</button></div>
</div>`;
}
let _gxW = null; window.addEventListener('resize', () => { const w = isWide(); if (_gxW !== null && w !== _gxW && typeof S !== 'undefined' && S && screen === 'game') render(); _gxW = w; });
