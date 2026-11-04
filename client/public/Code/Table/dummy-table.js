/* dummy-table.js — โต๊ะดัมมี่: วาดโต๊ะ + ปุ่มคำสั่ง (จั่ว · เก็บ · เกิด · ฝาก · ทิ้ง · น็อก) + กองทิ้ง + เรียงไพ่ในมือ
   จอกว้างวาดผ่าน gxView() ใน Code/Table/gamegx.js · เกมอื่นวาดใน Code/Table/games.js (renderOther)
   Public: renderDummyTable() · drw() · tk(i) · pick(id) · mld() · dep(k) · adep() · dsc() · openPile() · closePile() · mv(dir) · srt() */
function mv(d) {
  if (!sel.size) return;
  const o = d < 0 ? ho : [...ho].reverse();
  for (let i = 1; i < o.length; i++) if (sel.has(o[i]) && !sel.has(o[i - 1])) [o[i - 1], o[i]] = [o[i], o[i - 1]];
  ho = d < 0 ? o : o.reverse();
  render();
}
function srt() {
  sm ^= 1;
  ho.sort((a, b) => (sm ? ALL[a].s - ALL[b].s || ALL[a].r - ALL[b].r : ALL[a].r - ALL[b].r || ALL[a].s - ALL[b].s));
  render();
}
const mine = () => !deal && S && S.cur === S.my && !S.over;
function drw() {
  if (!mine() || S.phase !== 'draw') {
    hint = 'จั่วได้เมื่อถึงตาคุณและยังไม่ได้จั่ว';
    return render();
  }
  if (!S.stock) {
    hint = 'กองจั่วหมดแล้ว';
    return render();
  }
  hint = '';
  closePile();
  emit({ t: 'draw' });
}
function tk(i) {
  if (!mine() || S.phase !== 'draw') {
    hint = 'เก็บกองทิ้งได้เมื่อถึงตาคุณและยังไม่ได้จั่ว';
    return render();
  }
  if (!Number.isInteger(i) || i < 0 || i >= (S.disc || []).length) return;
  hint = '';
  emit({ t: 'take', i });
}
function pick(id) {
  if (!mine() || S.phase !== 'play') return;
  const on = !sel.has(id);
  on ? sel.add(id) : sel.delete(id);
  const e = document.querySelector('.hand [data-id="' + id + '"]');
  if (e) e.classList.toggle('s', on);
}
const act = a => {
  hint = '';
  sel = new Set();
  emit(a);
};
function mld() {
  if (mine() && S.phase === 'play') act({ t: 'meld', ids: [...sel] });
}
function dep(k) {
  if (mine() && S.phase === 'play' && sel.size) act({ t: 'dep', k, ids: [...sel] });
}
function adep() {
  if (mine() && S.phase === 'play') act({ t: 'autodep' });
}
function dsc() {
  if (!mine() || S.phase !== 'play') return;
  if (S.hand.length === 1) return act({ t: 'knock' }); // ใบสุดท้ายคว่ำเพื่อน็อก
  if (sel.size !== 1) {
    hint = 'เลือกไพ่ 1 ใบเพื่อทิ้ง';
    return render();
  }
  act({ t: 'dis', id: [...sel][0] });
}
function pileModal() {
  if (!S) return;
  const cards = S.disc || [];
  const old = document.getElementById('pileModal');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'pileModal';
  el.className = 'pile-modal';
  el.innerHTML = `<div class='pile-dialog'><div class='pile-title'><b>เลือกไพ่จากกองทิ้ง</b><button class='pile-close' onclick=closePile()>✕</button></div><p>จั่วไพ่ใหม่ หรือเลือกไพ่จากกองทิ้ง ไพ่ที่เลือกและไพ่ที่ทิ้งทีหลังจะถูกเก็บไปด้วย และต้องเกิดโดยใช้ไพ่ใบแรกที่เลือก</p><button class='pile-draw' ${S.stock ? '' : 'disabled'} onclick='drw()'>🂠 จั่วไพ่จากกองจั่ว (${S.stock} ใบ)</button><div class='pile-all'>${cards.map(([id, hd], i) => `<div class='pile-choice${S.ok[i] ? ' ok' : ''}' role='button' tabindex='0' onclick='choosePile(${i})'><span class='pile-index'>${i === 0 ? 'เก่าสุด' : i === cards.length - 1 ? 'ล่าสุด' : 'ลำดับ ' + (i + 1)}</span>${mini(id)}${S.ok[i] ? '<small>เกิดได้</small>' : ''}</div>`).join('')}</div><div class='pile-foot'>ไพ่ทั้งหมด ${cards.length} ใบ · เลือกไพ่ที่ต้องการเก็บ ระบบจะตรวจว่าต้องเกิดด้วยไพ่ใบแรกที่เลือก</div></div>`;
  document.body.appendChild(el);
}
function closePile() {
  document.getElementById('pileModal')?.remove();
}
function choosePile(i) {
  tk(i);
}
function openPile() {
  if (!S) return;
  if (!mine()) {
    hint = 'ยังไม่ถึงตาคุณ';
    return render();
  }
  if (S.phase !== 'draw') {
    hint = 'คุณจั่วไปแล้วในตานี้';
    return render();
  }
  pileModal();
}
function renderDummyTable() {
  const gx = isWide();
  $('app').className = gx ? 'gxl' : '';
  const me = S.P[S.my],
    ids = S.hand,
    fresh = new Set(ids.filter(i => !ho.includes(i)));
  ho = ho.filter(i => ids.includes(i));
  const miss = ids.filter(i => !ho.includes(i)).map(i => ALL[i]);
  if (!ho.length) miss.sort((a, b) => a.s - b.s || a.r - b.r);
  ho.push(...miss.map(c => c.id));
  const pm = prevM,
    pd = prevD,
    sl = $('dp') ? $('dp').scrollLeft : 0;
  prevM = S.melds.length;
  prevD = S.disc.length;
  let h = hint;
  if (!h)
    h = deal
      ? 'กำลังแจกไพ่... (แตะเพื่อข้าม)'
      : S.over
        ? 'จบเกม'
        : !mine()
          ? S.P[S.cur].n + ' กำลังเล่น...'
          : S.phase === 'draw'
            ? 'ตาคุณ จั่วจากกอง หรือแตะไพ่ในกองทิ้งเพื่อเก็บ'
            : S.hand.length === 1
              ? 'เหลือใบเดียว! กด 🂠 คว่ำน็อก'
              : S.must != null
                ? 'เกิดชุดที่มี ' + cn(ALL[S.must]) + ' ก่อน'
                : 'เลือกไพ่ แล้วเกิด / ฝาก / ทิ้ง';
  const opp = [];
  for (let k = 1; k < S.P.length; k++) opp.push(S.P[(S.my + k) % S.P.length]);
  // ไอคอนผู้เล่นอยู่นอกโต๊ะ ในโต๊ะมีแค่ชุดที่เกิด (วางเป็นแถวยาวตามฝั่งของเจ้าของ) กองจั่ว กองทิ้ง
  const ms = pi =>
    pi == null
      ? ''
      : S.melds
          .map((m, k) => ({ m, k }))
          .filter(x => x.m.o === pi)
          .map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`)
          .join('');
  const pl = (pi, pos) => {
    if (pi == null) return '';
    const p = S.P[pi],
      on = S.cur === pi && !S.over;
    return `<div class="pl pl-${pos}${pi === S.my ? ' me' : ''}${on ? ' active' : ''}" data-seat=${pi}><span class="${av(p.n, p.ch).startsWith('<img') ? 'chr' : 'av'}">${av(p.n, p.ch)}</span><div class=pl-info><b>${pi === S.my ? 'คุณ' : esc(p.n)}</b><small><span data-pc=${pi}>${p.n_cards}</span> ใบ</small><small>${p.pts} แต้ม</small>${on ? '<i class=tm>▶ ตา</i>' : ''}</div></div>`;
  };
  const left = opp[0]?.i,
    top = opp[1]?.i,
    right = opp[2]?.i;
  // ตัวละครของเรา: ย้ายออกจากโต๊ะ ไปอยู่ที่แผงไพ่ของเรา (dock) พร้อมพื้นหลังของเราเอง
  const meOn = S.cur === S.my && !S.over,
    meA = av(me.n, me.ch);
  const plMe = `<div class="pl pl-bottom${meOn ? ' active' : ''}" data-seat=${S.my}><div class=pl-info><b>คุณ</b><small><span data-pc=${S.my}>${me.n_cards}</span> ใบ · ${me.pts} แต้ม</small>${meOn ? '<i class=tm>▶ ตา</i>' : ''}</div><span class="${meA.startsWith('<img') ? 'chr' : 'av'}">${meA}</span></div>`;
  // พื้นหลังของแต่ละที่นั่งเป็นกรอบรูปล้อมโต๊ะ 4 ชิ้น ตัดทแยงที่มุมโต๊ะ (ขนาดคำนวณใน fitFrame)
  const frame = ''; // ทุกห้องใช้พื้นหลังเดียวกัน (พื้นหลังหน้าเว็บ) ไม่มีกรอบพื้นหลังรายที่นั่งแล้ว
  const ovl = S.over ? resultOverlay() : '';
  const oldHtml = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}</span></div>
 <div class=arena>${frame}${pl(top, 'top')}${pl(left, 'left')}<div class=felt>
 <div class="zone zone-top">${ms(top)}</div><div class="zone zone-left">${ms(left)}</div><div class="zone zone-right">${ms(right)}</div><div class="zone zone-bottom">${ms(S.my)}</div>
 <div class=piles><div><button class=back onclick=openPile() aria-label="เปิดกองจั่วและเลือกไพ่">${S.stock}</button><div class=lab>กองจั่ว</div></div>
 <div style="flex:1;min-width:0"><div class=dp id=dp>${S.disc.map(([id, hd], i) => face(id, ' d' + (hd ? ' sp' : '') + (S.ok[i] ? ' ok' : '') + (i >= pd ? ' new' : ''), `onclick=openPile()`)).join('')}</div><div class=lab>${deal ? 'กำลังแจกไพ่...' : 'กองทิ้ง ' + S.disc.length + ' ใบ · กดกองจั่วเพื่อเลือกเก็บไพ่'}</div></div></div></div>${pl(right, 'right')}${plMe}</div>
 </div><div class=colR><div class=logs>${S.logs.slice(-1).map(esc).join('')}</div>
 <div class=hint>${esc(h)}<small>${esc(me.n)} ${me.pts} แต้ม</small></div>
 <div class=dock-wrap><div class=dock><div class=hand>${ho.map(i => face(i, (sel.has(i) ? ' s' : '') + (fresh.has(i) ? ' new' : ''), `data-id=${i} onclick=pick(${i})`)).join('')}</div>
 <div class=tools><button onclick="mv(-1)">◀ ซ้าย</button><button onclick="mv(1)">ขวา ▶</button><button onclick=srt()>เรียงไพ่</button></div>
 <div class=acts><button class=blue onclick=mld()>เกิด</button><button class=grn onclick=adep()>ฝากออโต้</button><button class=org onclick=dsc()>${S.hand.length === 1 && mine() && S.phase === 'play' ? '🂠 คว่ำน็อก!' : 'ทิ้ง'}</button><button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div></div></div>${ovl}`;
  $('app').innerHTML = gx ? gxView({ top, left, right, pm, pd, h, fresh }) + ovl : oldHtml;
  const d = $('dp');
  if (d) d.scrollLeft = S.disc.length !== pd ? d.scrollWidth : sl;
  requestAnimationFrame(fitFrame);
}
// คำนวณขนาดกรอบพื้นหลังของที่นั่ง (ระยะจากขอบโต๊ะถึงขอบ arena) เพื่อตัดทแยงที่มุมโต๊ะ
function fitFrame() {
  const a = document.querySelector('.arena'),
    f = document.querySelector('.felt');
  if (!a || !f) return;
  const A = a.getBoundingClientRect(),
    F = f.getBoundingClientRect(),
    st = a.style;
  st.setProperty('--L', F.left - A.left + 'px');
  st.setProperty('--T', F.top - A.top + 'px');
  st.setProperty('--R', A.right - F.right + 'px');
  st.setProperty('--B', A.bottom - F.bottom + 'px');
}
window.addEventListener('resize', () => requestAnimationFrame(fitFrame));
window.addEventListener('orientationchange', () => setTimeout(fitFrame, 250));
