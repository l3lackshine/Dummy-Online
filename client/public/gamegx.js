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
  <div class=gx-hud><span class=pill>🪙 ${sv.coins}</span><button class="pill gx-sk" onclick=openSkills()>⚡ ความสามารถ</button><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}${S.stake != null ? ' · ตัวละ ' + esc(S.stake) + ' 🪙' : ''}</span></div>
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

/* ห้องล็อบบี้ (แยกจากหน้าโต๊ะเล่น) — การ์ดตัวละครของผู้เล่นเรียงกัน + แผงข้อมูลห้อง แบบห้องกำหนดเองของเกม MOBA
   รับข้อมูลจาก tableView(): { ps (ผู้เล่นที่ออนไลน์), total (จำนวนที่นั่ง), L (lobby), h (ข้อความแนะนำ), stake, blocked, meP }
   Extend: เพิ่มแผงใหม่ใน .rm-panel · เพิ่มสถานะที่นั่งที่ roleOf() */
function gxRoom(c) {
  const { ps, total, L, h, stake, blocked, meP } = c, rule = L.rule || {}, noBots = L.allowBots === false;
  const artOf = a => (a.startsWith('<img') ? `<span class=rm-chr>${a}</span>` : `<span class=rm-emo>${a}</span>`);
  const roleOf = p => (p.host ? '👑 เจ้าของห้อง' : p.ready ? '✅ พร้อม' : '⏳ รอ');
  const mine = ps.find(p => p.you), people = mine ? [mine, ...ps.filter(p => p !== mine)] : ps.slice();
  const human = p => { const on = p.host || p.ready;
    return `<div class="rm-slot${p.you ? ' me' : ''}${p.host ? ' host' : ''}${on ? ' on' : ''}"><div class=rm-art>${artOf(av(p.name, p.ch))}</div><em class=rm-chip>${roleOf(p)}</em>
      <div class=rm-plate><b>${esc(p.you ? 'คุณ' : p.name)}</b><small>${p.you ? esc(p.name) : p.host ? 'เจ้าของห้อง' : 'ผู้เล่น'}</small></div></div>`; };
  const bot = i => `<div class="rm-slot bot on"><div class=rm-art>${artOf(av('บอท' + i, botChar(i)))}</div><em class=rm-chip>🤖 บอท</em><div class=rm-plate><b>บอท</b><small>เล่นแทน</small></div></div>`;
  const empty = () => `<button class="rm-slot empty" onclick=copyInvite()><div class=rm-plus>＋</div><div class=rm-plate><b>ว่าง</b><small>${noBots ? 'รอเพื่อน' : 'บอทจะเล่นแทน'}</small></div></button>`;
  const slots = Array.from({ length: total }, (_, k) => (people[k] ? human(people[k]) : soloRoom ? bot(k) : empty())).join('');
  const wait = esc((L.waitingFor || []).join(', ')), isMe = !!mine;
  const status = soloRoom ? 'เล่นกับบอท — กดเริ่มเกมได้เลย' : !isHost ? (meP.ready ? 'รอเจ้าของห้องเริ่มเกม…' : 'กด “พร้อม” เมื่อพร้อมเล่น') : blocked ? `รอ ${wait} กดพร้อม` : 'ทุกคนพร้อมแล้ว — กดเริ่มเกมได้เลย';
  const row = (k, v) => `<div class=rm-row><span>${k}</span><b>${v}</b></div>`;
  return `<div class=rm-stage>
  <div class=rm-top><button class=rm-back onclick="if(confirm('ออกจากห้อง?'))leave()" aria-label="ออก">‹</button>
    <div class=rm-title><b>${soloRoom ? '🤖 ห้องเล่นกับบอท' : 'ห้อง ' + esc(code)}</b><small>${esc(rule.name || 'ดัมมี่')}</small></div>
    <span class=pill>🪙 ${sv.coins}</span><button class="pill gx-sk" onclick=openSkills()>⚡ ความสามารถ</button>${rule.id ? `<button class="pill rl" onclick="showRules('${esc(rule.id)}')">📖 กติกา</button>` : ''}</div>
  <div class=rm-slots>${slots}</div>
  <div class=rm-hint>${esc(h && !/^รอผู้เล่น|^ห้องเล่นกับบอท/.test(h) ? h : status)}</div>
  <aside class=rm-panel>
    <div class=rm-card>${soloRoom ? '' : `<div class=rm-code><small>รหัสห้อง</small><b>${esc(code)}</b><button onclick=copyInvite()>🔗 คัดลอก</button></div>`}
      ${row('กติกา', esc(rule.name || 'ดัมมี่'))}${stake != null ? row('เดิมพัน', '🪙 ' + esc(stake) + ' ต่อคน') : ''}${row('ผู้เล่น', ps.length + '/' + total)}${row('ที่ว่าง', noBots ? 'ไม่มีบอท' : 'บอทเล่นแทน')}</div>
    ${soloRoom ? '' : `<div class=rm-emotes>${['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'].map(e => `<button onclick="sendEmote('${e}')">${e}</button>`).join('')}</div>`}
    <div class=rm-acts>${!isHost && !soloRoom && isMe ? `<button class="${meP.ready ? 'g' : 'org'}" onclick=toggleReady()>${meP.ready ? '✓ พร้อมแล้ว (ยกเลิก)' : '✋ พร้อม'}</button>` : ''}${isHost ? `<button class=blue onclick=begin() ${blocked ? 'disabled' : ''}>▶ เริ่มเกม</button>` : ''}${soloRoom ? '' : '<button class=gray onclick=copyInvite()>🔗 ชวนเพื่อน</button>'}</div>
  </aside>
</div>`;
}
let _gxW = null; if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => { const w = isWide(); if (_gxW !== null && w !== _gxW && typeof S !== 'undefined' && S && screen === 'game') render(); _gxW = w; });
