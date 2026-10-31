/* gamegx.js — หน้าโต๊ะเล่นแนวนอนแบบ 4 ฝั่งทแยง (อ้างอิงภาพตัวอย่าง)
   ยังคงของเดิมครบ: กองจั่ว · กองทิ้ง · ไพ่ที่เกิด (วางหน้าผู้เล่นแต่ละฝั่ง) · ไพ่ในมือ · ปุ่มเกิด/ฝาก/ทิ้ง */
// รูปพื้นหลังที่นั่งของตัวละคร (ใช้ทั้งดัมมี่และเกมอื่น)
// ผู้เล่นคนนี้ปลด 5 ดาวตัวละครที่ใช้อยู่หรือไม่ (เซิร์ฟเวอร์ตรวจแล้วส่งมาในข้อมูลห้อง)
function gxStar5(ch, name) { const l = (typeof lob !== 'undefined' && lob && lob.players) || []; const q = l.find(x => x.ch === ch && (name == null || x.name === name)); return !!(q && q.s5); }
const gxChar = ch => ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch);
// พื้นหลังที่นั่งบนโต๊ะ: ฉาก 5 ดาว (ถ้าปลดแล้ว) → ฉากประจำตัว (seat) → ไม่มี
// รูปพื้นหลังที่ผู้เล่นซื้อจากร้าน (ช่อง tableFile ใน Item/Background/Item.config หรือรูปของพื้นหลังนั้น) — สีไล่เฉด/รูปง่าย ๆ ไม่ใช้
function gxBgImg(bg) { const b = bg && ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.backgrounds) || []).find(x => x.id === bg); return (b && (b.table || (/\.(webp|png|jpe?g)$/i.test(b.asset || '') ? b.asset : ''))) || ''; }
// ช่องที่นั่งบนโต๊ะ (ของใครของมัน ทุกคนเห็น): ฉากประจำตัว 5★ → พื้นหลังที่ซื้อ → ฉากที่นั่งของตัวละคร → ห้องเริ่มต้น · บอทไม่ใช้พื้นหลัง
function gxSeatImg(ch, name, bg) { const x = gxChar(ch); if (x && x.star5 && gxStar5(ch, name)) return x.star5; return gxBgImg(bg) || (x && x.seat) || ''; }
// ครอปตัวละครบนโต๊ะให้เห็นครึ่งตัวและหัวขนาดใกล้กันทุกตัว: Character.config "table": {"top": 0, "show": 0.5, "x": 0.5}
//   top = เริ่มตัดที่ความสูงเท่าไร (0–1) · show = แสดงกี่ส่วนของความสูงรูป · x = ตำแหน่งกลางหน้าแนวนอน (0–1)
function gxCrop(ch) { const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch), t = (x && x.table) || {};
  const n = (v, d, a, b) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  return ` style="--tt:${n(t.top, 0, 0, .9)};--ts:${n(t.show, .5, .15, 1)};--tx:${n(t.x, .5, 0, 1)}"`; }
const isWide = () => { try { return !!(window.matchMedia && window.matchMedia('(min-aspect-ratio:5/4)').matches); } catch (e) { return false; } };
function gxView(c) {
  const { top, left, right, pm, pd, h, fresh } = c, me = S.P[S.my];
  const meOn = S.cur === S.my && !S.over;
  const art = (p) => { const a = av(p.n, p.ch); return a.startsWith('<img') ? `<span class=gx-chr${gxCrop(p.ch)}>${a}</span>` : `<span class=gx-emo>${a}</span>`; };
  const ms = pi => pi == null ? '' : S.melds.map((m, k) => ({ m, k })).filter(x => x.m.o === pi).map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`).join('');
  const badge = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="gx-seat gx-${pos}${on ? ' active' : ''}" data-seat=${pi}><div class=gx-name>${esc(p.n)}</div><div class=gx-stack><i></i><i></i><b data-pc=${pi}>${p.n_cards}</b><i></i><i></i></div><small class=gx-pts>${p.pts} แต้ม</small>${on ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`; };
  const wedge = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="gx-art gx-art-${pos}${on ? ' on' : ''}">${art(p)}</div>`; };
  const meArt = `<div class="gx-art gx-art-bottom${meOn ? ' on' : ''}">${art(me)}</div>`;
  const meBadge = `<div class="gx-me${meOn ? ' active' : ''}" data-seat=${S.my}><div class=gx-name>คุณ</div><div class=gx-stack><i></i><i></i><b data-pc=${S.my}>${me.n_cards}</b><i></i><i></i></div><small class=gx-pts>${me.pts} แต้ม</small>${meOn ? '<em class=gx-turn>▶ ตา</em>' : ''}</div>`;
  // พื้นหลังที่นั่งของตัวละคร (Character.config "seat") — วางเต็มช่องสามเหลี่ยมของที่นั่งนั้น · ไม่มีรูป = ใช้สีเดิม
  const seatBg = (pi, pos) => { if (pi == null) return ''; const u = gxSeatImg(S.P[pi].ch, S.P[pi].n, S.P[pi].bot ? null : S.P[pi].bg); return u ? `<div class="gx-sb gx-sb-${pos}${S.cur === pi && !S.over ? ' on' : ''}" data-seat=${pi} style="background-image:url('${esc(u)}')"></div>` : ''; };
  const q = (pos, on) => `<polygon class="gx-q gx-q-${pos}${on ? ' on' : ''}" points="${{ top: '0,0 100,0 72,28 28,28', right: '100,0 100,100 72,60 72,28', bottom: '0,100 28,60 72,60 100,100', left: '0,0 28,28 28,60 0,100' }[pos]}"/>`;
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

/* ห้องล็อบบี้ (แยกจากหน้าโต๊ะเล่น) — การ์ดตัวละครของผู้เล่นเรียงกัน + แผงข้อมูลห้อง แบบห้องกำหนดเองของเกม MOBA
   รับข้อมูลจาก tableView(): { ps (ผู้เล่นที่ออนไลน์), total (จำนวนที่นั่ง), L (lobby), h (ข้อความแนะนำ), stake, blocked, meP }
   Extend: เพิ่มแผงใหม่ใน .rm-panel · เพิ่มสถานะที่นั่งที่ roleOf() */
// หน้าต่างกดพร้อม (หาแมตช์ครบ 4 คน): รูปโปรไฟล์เล็กของทุกคน · ยังไม่กด = ขาวดำ · กดแล้ว = ภาพสี · ครบทุกคนเริ่มทันที
function gxReadyBox(M, ps) {
  const face = p => (typeof avFace === 'function' ? avFace(p.name, p.ch) : av(p.name, p.ch));
  const n = ps.filter(p => p.acc).length, left = Math.ceil((M.readyLeftMs || 0) / 1000), pct = Math.round((M.readyLeftMs || 0) / (M.readyMs || 15000) * 100);
  return `<div class=mm-modal><div class="mm-box mm-rd"><h3>${M.ranked ? '🏆 พบแมตช์แรงก์!' : '🎴 พบผู้เล่นครบแล้ว!'}</h3>
    <div class=mm-faces>${ps.map(p => `<span class="mm-face${p.acc ? ' on' : ''}${p.you ? ' me' : ''}"><i>${face(p)}</i><b>${esc(p.you ? 'คุณ' : p.name)}</b>${p.acc ? '<em>✓</em>' : ''}</span>`).join('')}</div>
    <div class=mm-rbar><i style="width:${pct}%"></i></div>
    <button class="mm-go${M.youAccepted ? ' done' : ''}" onclick="matchAccept()" ${M.youAccepted ? 'disabled' : ''}>${M.youAccepted ? `รอผู้เล่นอื่น… (${n}/${ps.length})` : '✋ พร้อม'}</button>
    <small>เหลือ <span class=mm-rl>${left}</span> วินาที · ทุกคนกดพร้อมแล้วเริ่มทันที · ไม่กดในเวลาจะถูกนำออกจากการค้นหา</small></div></div>`;
}
function gxRoom(c) {
  const { ps, total, L, h, stake, blocked, meP } = c, rule = L.rule || {}, noBots = L.allowBots === false, M = L.match || null;
  if (M) L._t0 = L._t0 || Date.now();   // เวลารับข้อมูลจับคู่ (ใช้นับเวลาต่อใน match-ui.js)
  const artOf = a => (a.startsWith('<img') ? `<span class=rm-chr>${a}</span>` : `<span class=rm-emo>${a}</span>`);
  const roleOf = p => (p.host ? '👑 เจ้าของห้อง' : p.ready ? '✅ พร้อม' : '⏳ รอ');
  const mine = ps.find(p => p.you), people = mine ? [mine, ...ps.filter(p => p !== mine)] : ps.slice();
  // ตำแหน่งตัวละครในการ์ด: Character.config "lobby": {"align": "left|center|right", "scale": 0.8}
  const place = ch => { const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch), l = (x && x.lobby) || {};
    const al = { left: 'flex-start', right: 'flex-end' }[l.align] || 'center', sc = Number(l.scale) > 0 ? Math.min(1.5, Number(l.scale)) : 1;
    return ` style="--chr-al:${al};--chr-h:${Math.round(sc * 100)}%"`; };
  // ฉาก 5 ดาวหลังตัวละครในการ์ด (เมื่อผู้เล่นปลด 5 ดาวตัวที่ใช้)
  const s5bg = p => { const x = p.s5 && gxChar(p.ch); return x && x.star5 ? ` style="background:url('${esc(x.star5)}') center/cover"` : ''; };
  // กรอบการ์ดที่ผู้เล่นใส่ (Item/Frame) — วางทับตัวละคร ใต้ป้ายสถานะ/ชื่อ
  const deco = fr => { if (fr && /^ch-[a-z0-9-]+$/.test(fr)) return `<i class="rm-deco ch-fr" style="--deco:url('./Item/Frame/${esc(fr)}.webp')"></i>`;   // กรอบประจำตัวละคร (ปลด 4★)
    const x = fr && ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.frames) || []).find(y => y.id === fr);
    return x && x.asset ? `<i class=rm-deco style="--deco:url('${esc(x.asset)}')"></i>` : ''; };
  const human = p => { const on = p.host || p.ready;
    return `<div class="rm-slot${p.you ? ' me' : ''}${p.host ? ' host' : ''}${on ? ' on' : ''}"${place(p.ch)}><div class=rm-art${s5bg(p)}>${artOf(av(p.name, p.ch))}</div>${deco(p.fr)}<em class=rm-chip>${roleOf(p)}</em>
      <div class=rm-plate><b>${esc(p.you ? 'คุณ' : p.name)}</b><small>${p.you ? esc(p.name) : p.host ? 'เจ้าของห้อง' : 'ผู้เล่น'}</small></div></div>`; };
  const bot = i => `<div class="rm-slot bot on"${place(botChar(i))}><div class=rm-art>${artOf(av('บอท' + i, botChar(i)))}</div><em class=rm-chip>🤖 บอท</em><div class=rm-plate><b>บอท</b><small>เล่นแทน</small></div></div>`;
  const searching = k => `<div class="rm-slot empty searching"><div class=rm-plus><span class=mm-spin></span></div><div class=rm-plate><b>กำลังค้นหา…</b><small>ผู้เล่นคนที่ ${k + 1}</small></div></div>`;
  const empty = k => M ? searching(k) : `<button class="rm-slot empty" onclick=copyInvite()><div class=rm-plus>＋</div><div class=rm-plate><b>ว่าง</b><small>${noBots ? 'รอเพื่อน' : 'บอทจะเล่นแทน'}</small></div></button>`;
  const slots = Array.from({ length: total }, (_, k) => (people[k] ? human(people[k]) : soloRoom ? bot(k) : empty(k))).join('');
  const wait = esc((L.waitingFor || []).join(', ')), isMe = !!mine;
  const status = M ? (M.state === 'ready' ? 'พบผู้เล่นครบแล้ว — กดพร้อมเพื่อเริ่มเกม' : `พบผู้เล่น ${M.humans}/${M.max} คน — กำลังหาเพิ่ม…${M.ranked ? ' (แรงก์: รอจนครบ 4 คน)' : ''}`) : soloRoom ? 'เล่นกับบอท — กดเริ่มเกมได้เลย' : !isHost ? (meP.ready ? 'รอเจ้าของห้องเริ่มเกม…' : 'กด “พร้อม” เมื่อพร้อมเล่น') : blocked ? `รอ ${wait} กดพร้อม` : 'ทุกคนพร้อมแล้ว — กดเริ่มเกมได้เลย';
  const row = (k, v) => `<div class=rm-row><span>${k}</span><b>${v}</b></div>`;
  return `<div class=rm-stage>
  <div class=rm-top><button class=rm-back onclick="if(confirm('ออกจากห้อง?'))leave()" aria-label="ออก">‹</button>
    <div class=rm-title><b>${M ? (M.ranked ? '🏆 กำลังหาแมตช์แรงก์' : '🔍 กำลังหาแมตช์') : soloRoom ? '🤖 ห้องเล่นกับบอท' : 'ห้อง ' + esc(code)}</b><small>${esc(rule.name || 'ดัมมี่')}</small></div>
    <span class=pill>🪙 ${sv.coins}</span>${rule.id ? `<button class="pill rl" onclick="showRules('${esc(rule.id)}')">📖 กติกา</button>` : ''}</div>
  <div class=rm-slots>${slots}</div>
  <div class=rm-hint>${esc(M || !h || /^รอผู้เล่น|^ห้องเล่นกับบอท/.test(h) ? status : h)}</div>
  <aside class=rm-panel>
    <div class=rm-card>${soloRoom || M ? '' : `<div class=rm-code><small>รหัสห้อง</small><b>${esc(code)}</b><button onclick=copyInvite()>🔗 คัดลอก</button></div>`}
      ${M ? (M.ranked ? row('โหมด', '🏆 แรงก์ · คนจริงล้วน') : '') + row('สถานะ', M.state === 'ready' ? '✋ รอกดพร้อม' : '🔍 กำลังค้นหา') + row('เวลาค้นหา', '<span class=mm-el>00:00</span>') : ''}${row('กติกา', esc(rule.name || 'ดัมมี่') + (M && M.ranked ? ' (มาตรฐาน)' : ''))}${row('รางวัล', M && M.ranked ? 'เหรียญ + แต้มอันดับ' : 'เหรียญตามอันดับ · แพ้ก็ได้')}${window.Farm && L.allowBots !== false ? row('ถ้ามีบอท', Farm.lobbyLine()) : ''}${row('ผู้เล่น', ps.length + '/' + total)}${row('ที่ว่าง', noBots ? 'ไม่มีบอท' : 'บอทเล่นแทน')}</div>
    ${soloRoom ? '' : `<div class=rm-emotes>${['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'].map(e => `<button onclick="sendEmote('${e}')">${e}</button>`).join('')}${window.Emote ? `<button class=rm-emo-more onclick="Emote.toggle()" aria-label="สติกเกอร์ตัวละคร">🎴</button>` : ''}</div>`}
    <div class=rm-acts>${M ? '<button class=gray onclick=leave()>✖ ยกเลิกการค้นหา</button>' : ''}${!M && !isHost && !soloRoom && isMe ? `<button class="${meP.ready ? 'g' : 'org'}" onclick=toggleReady()>${meP.ready ? '✓ พร้อมแล้ว (ยกเลิก)' : '✋ พร้อม'}</button>` : ''}${!M && isHost ? `<button class=blue onclick=begin() ${blocked ? 'disabled' : ''}>▶ เริ่มเกม</button>` : ''}${soloRoom || M ? '' : '<button class=gray onclick=copyInvite()>🔗 ชวนเพื่อน</button>'}</div>
  </aside>
  ${M && M.state === 'ready' ? gxReadyBox(M, ps) : ''}
  ${M && M.prompt ? `<div class=mm-modal><div class=mm-box><h3>หาผู้เล่นได้ ${M.humans}/${M.max} คน</h3><p>จะรอผู้เล่นเพิ่ม หรือเติมบอทแล้วเริ่มเลย?</p>${window.Farm ? `<p class=mm-st>${Farm.lobbyLine()}</p>` : ''}<div class=mm-btns><button class="${M.prompt.voted === 'wait' ? 'on' : ''}" onclick="matchVote('wait')">⏳ รอต่อ</button><button class="${M.prompt.voted === 'bots' ? 'on' : ''}" onclick="matchVote('bots')">🤖 เติมบอทเล่นเลย</button></div><small>เหลือ <span class=mm-pl>${Math.ceil(M.prompt.leftMs / 1000)}</span> วินาที · เติมบอทเมื่อทุกคนเลือกเติม</small>${M.prompt.voted ? '<small>รอผู้เล่นอื่นเลือก…</small>' : ''}</div></div>` : ''}
</div>`;
}
let _gxW = null; if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => { const w = isWide(); if (_gxW !== null && w !== _gxW && typeof S !== 'undefined' && S && screen === 'game') render(); _gxW = w; });
