/* gamegx.js — หน้าโต๊ะเล่นแนวนอนแบบ 4 ฝั่งทแยง (อ้างอิงภาพตัวอย่าง)
   ยังคงของเดิมครบ: กองจั่ว · กองทิ้ง · ไพ่ที่เกิด (วางหน้าผู้เล่นแต่ละฝั่ง) · ไพ่ในมือ · ปุ่มเกิด/ฝาก/ทิ้ง */
// รูปพื้นหลังที่นั่งของตัวละคร (ใช้ทั้งดัมมี่และเกมอื่น)
// ผู้เล่นคนนี้ปลด 5 ดาวตัวละครที่ใช้อยู่หรือไม่ (เซิร์ฟเวอร์ตรวจแล้วส่งมาในข้อมูลห้อง)
function gxStar5(ch, name) {
  const l = (typeof lob !== 'undefined' && lob && lob.players) || [];
  const q = l.find(x => x.ch === ch && (name == null || x.name === name));
  return !!(q && q.s5);
}
const gxChar = ch => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch);
// พื้นหลังที่นั่งบนโต๊ะ: ฉาก 5 ดาว (ถ้าปลดแล้ว) → ฉากประจำตัว (seat) → ไม่มี
// รูปพื้นหลังที่ผู้เล่นซื้อจากร้าน (ช่อง tableFile ใน Item/Background/Item.config หรือรูปของพื้นหลังนั้น) — สีไล่เฉด/รูปง่าย ๆ ไม่ใช้
function gxBgImg(bg) {
  const b = bg && ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.backgrounds) || []).find(x => x.id === bg);
  return (b && (b.table || (/\.(webp|png|jpe?g)$/i.test(b.asset || '') ? b.asset : ''))) || '';
}
// ช่องที่นั่งบนโต๊ะ (ของใครของมัน ทุกคนเห็น): ฉากประจำตัว 5★ → พื้นหลังที่ซื้อ → ฉากที่นั่งของตัวละคร → ห้องเริ่มต้น · บอทไม่ใช้พื้นหลัง
function gxSeatImg(ch, name, bg) {
  const x = gxChar(ch);
  if (x && x.star5 && gxStar5(ch, name)) return x.star5;
  return gxBgImg(bg) || (x && x.seat) || '';
}
// ครอปตัวละครบนโต๊ะให้เห็นครึ่งตัวและหัวขนาดใกล้กันทุกตัว: Character.config "table": {"top": 0, "show": 0.5, "x": 0.5}
//   top = เริ่มตัดที่ความสูงเท่าไร (0–1) · show = แสดงกี่ส่วนของความสูงรูป · x = ตำแหน่งกลางหน้าแนวนอน (0–1)
function gxCrop(ch) {
  const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch),
    t = (x && x.table) || {};
  const n = (v, d, a, b) => {
    v = Number(v);
    return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
  };
  return ` style="--tt:${n(t.top, 0, 0, 0.9)};--ts:${n(t.show, 0.5, 0.15, 1)};--tx:${n(t.x, 0.5, 0, 1)}"`;
}
const isWide = () => {
  try {
    return !!(window.matchMedia && window.matchMedia('(min-aspect-ratio:5/4)').matches);
  } catch (e) {
    return false;
  }
};
function gxView(c) {
  const { top, left, right, pm, pd, h, fresh } = c,
    me = S.P[S.my];
  const meOn = S.cur === S.my && !S.over;
  const art = p => {
    const a = av(p.n, p.ch);
    return a.startsWith('<img') ? `<span class=gx-chr${gxCrop(p.ch)}>${a}</span>` : `<span class=gx-emo>${a}</span>`;
  };
  const ms = pi =>
    pi == null
      ? ''
      : S.melds
          .map((m, k) => ({ m, k }))
          .filter(x => x.m.o === pi)
          .map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`)
          .join('');
  const badge = (pi, pos) => {
    if (pi == null) return '';
    const p = S.P[pi],
      on = S.cur === pi && !S.over;
    return `<div class="gx-seat gx-${pos}${on ? ' active' : ''}" data-seat=${pi}><div class=gx-name>${esc(p.n)}</div><div class=gx-stack><i></i><i></i><b data-pc=${pi}>${p.n_cards}</b><i></i><i></i></div><small class=gx-pts>${p.pts} แต้ม</small>${on ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`;
  };
  const wedge = (pi, pos) => {
    if (pi == null) return '';
    const p = S.P[pi],
      on = S.cur === pi && !S.over;
    return `<div class="gx-art gx-art-${pos}${on ? ' on' : ''}">${art(p)}</div>`;
  };
  const meArt = `<div class="gx-art gx-art-bottom${meOn ? ' on' : ''}">${art(me)}</div>`;
  const meBadge = `<div class="gx-me${meOn ? ' active' : ''}" data-seat=${S.my}><div class=gx-name>คุณ</div><div class=gx-stack><i></i><i></i><b data-pc=${S.my}>${me.n_cards}</b><i></i><i></i></div><small class=gx-pts>${me.pts} แต้ม</small>${meOn ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`;
  // พื้นหลังที่นั่งของตัวละคร (Character.config "seat") — วางเต็มช่องสามเหลี่ยมของที่นั่งนั้น · ไม่มีรูป = ใช้สีเดิม
  const seatBg = (pi, pos) => {
    if (pi == null) return '';
    const u = gxSeatImg(S.P[pi].ch, S.P[pi].n, S.P[pi].bot ? null : S.P[pi].bg);
    return u
      ? `<div class="gx-sb gx-sb-${pos}${S.cur === pi && !S.over ? ' on' : ''}" data-seat=${pi} style="background-image:url('${esc(u)}')"></div>`
      : '';
  };
  const q = (pos, on) =>
    `<polygon class="gx-q gx-q-${pos}${on ? ' on' : ''}" points="${{ top: '0,0 100,0 72,28 28,28', right: '100,0 100,100 72,60 72,28', bottom: '0,100 28,60 72,60 100,100', left: '0,0 28,28 28,60 0,100' }[pos]}"/>`;
  const on = pi => pi != null && S.cur === pi && !S.over;
  const last = S.disc.length ? S.disc[S.disc.length - 1] : null;
  return `<div class=gx-stage>
  <svg class=gx-bg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden=true>${q('top', on(top))}${q('left', on(left))}${q('right', on(right))}${q('bottom', on(S.my))}</svg>
  ${seatBg(top, 'top')}${seatBg(left, 'left')}${seatBg(right, 'right')}${seatBg(S.my, 'bottom')}
  ${wedge(top, 'top')}${wedge(left, 'left')}${wedge(right, 'right')}${meArt}
  <div class=gx-hud><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}</span></div>
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

let _gxW = null;
if (typeof window !== 'undefined' && window.addEventListener)
  window.addEventListener('resize', () => {
    const w = isWide();
    if (_gxW !== null && w !== _gxW && typeof S !== 'undefined' && S && screen === 'game') render();
    _gxW = w;
  });
