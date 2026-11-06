/* lobby-room.js — ห้องล็อบบี้ (แยกจากหน้าโต๊ะเล่น) — การ์ดตัวละครของผู้เล่นเรียงกัน + แผงข้อมูลห้อง แบบห้องกำหนดเองของเกม MOBA
   รับข้อมูลจาก tableView(): { ps (ผู้เล่นที่ออนไลน์), total (จำนวนที่นั่ง), L (lobby), h (ข้อความแนะนำ), stake, blocked, meP }
   Extend: เพิ่มแผงใหม่ใน .rm-panel · เพิ่มสถานะที่นั่งที่ roleOf() */
function gxRoom(c) {
  const { ps, total, L, h, stake, blocked, meP } = c,
    rule = L.rule || {},
    noBots = L.allowBots === false,
    M = L.match || null;
  if (M) L._t0 = L._t0 || Date.now(); // เวลารับข้อมูลจับคู่ (ใช้นับเวลาต่อใน match-ui.js)
  const artOf = a => (a.startsWith('<img') ? `<span class=rm-chr>${a}</span>` : `<span class=rm-emo>${a}</span>`);
  const roleOf = p => (p.host ? '👑 เจ้าของห้อง' : p.ready ? '✅ พร้อม' : '⏳ รอ');
  const mine = ps.find(p => p.you),
    people = mine ? [mine, ...ps.filter(p => p !== mine)] : ps.slice();
  // ตำแหน่งตัวละครในการ์ด: Character.config "lobby": {"align": "left|center|right", "scale": 0.8}
  const place = (ch, fr) => {
    const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => y.id === ch),
      l = (x && x.lobby) || {};
    const al = { left: 'flex-start', right: 'flex-end' }[l.align] || 'center',
      sc = Number(l.scale) > 0 ? Math.min(1.5, Number(l.scale)) : 1;
    const fit = frameWindow(fr);
    return `${fit ? ' data-fw' : ''} style="--chr-al:${al};--chr-h:${Math.round(sc * 100)}%${fit}"`;
  };
  // กรอบประจำตัวละคร (ปลด 4★) มีลายหนักบน/ล่าง — ย่อตัวละครให้อยู่ในช่องว่างกลางกรอบ ไม่โดนลายบังหน้า
  // ค่าช่องว่างวัดจากรูปกรอบโดย scripts/compose-char-frames.py → Character.config "lobby"."frame4"
  // หน่วยเป็นสัดส่วนของ "ความกว้าง" การ์ด (กรอบยืดตามความกว้าง) → CSS ใช้เป็น margin % (margin % อิงความกว้างเสมอ)
  const frameWindow = fr => {
    if (!fr || !/^ch-[a-z0-9-]+$/.test(fr)) return '';
    const owner = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(y => 'ch-' + y.id === fr);
    const win = owner && owner.lobby && owner.lobby.frame4;
    if (!win) return '';
    const percent = value => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.min(100, Math.max(0, number * 100)).toFixed(1) + '%' : '0%';
    };
    return `;--fw-t:${percent(win.top)};--fw-b:${percent(win.bottom)};--fw-l:${percent(win.left)};--fw-r:${percent(win.right)}`;
  };
  // ฉาก 5 ดาวหลังตัวละครในการ์ด (เมื่อผู้เล่นปลด 5 ดาวตัวที่ใช้)
  const s5bg = p => {
    const x = p.s5 && gxChar(p.ch);
    if (frameWindow(p.fr)) return ''; // ใส่กรอบประจำตัว → ฉากไปอยู่ใน framedScene() แทน (เต็มด้านในกรอบ)
    return x && x.star5 ? ` style="background:url('${esc(x.star5)}') center/cover"` : '';
  };
  // ฉาก 5 ดาวเมื่อใส่กรอบประจำตัว 4★: เต็มด้านในกรอบ ไม่เหลือช่องว่างรอบตัวละคร และตัดตามรูปทรงกรอบ ไม่โผล่ออกนอกกรอบ
  // หน้ากาก ch-<id>-in.webp สร้างคู่กับกรอบโดย scripts/compose-char-frames.py · แบ่งครึ่งบน/ล่างเหมือน .rm-deco ให้ซ้อนตรงกัน
  const framedScene = p => {
    const scene = p.s5 && gxChar(p.ch);
    if (!scene || !scene.star5 || !frameWindow(p.fr)) return '';
    const maskUrl = assetUrl('./Assets/Item/Frame/' + p.fr + '-in.webp');
    return `<i class=rm-fbg style="--fscene:url('${esc(scene.star5)}');--fmask:url('${esc(maskUrl)}')"><span class=rm-fbg-top></span><span class=rm-fbg-bot></span></i>`;
  };
  // กรอบการ์ดที่ผู้เล่นใส่ (Assets/Item/Frame) — วางทับตัวละคร ใต้ป้ายสถานะ/ชื่อ
  const deco = fr => {
    if (fr && /^ch-[a-z0-9-]+$/.test(fr))
      return `<i class="rm-deco ch-fr" style="--deco:url('${esc(assetUrl('./Assets/Item/Frame/' + fr + '.webp'))}')"></i>`; // กรอบประจำตัวละคร (ปลด 4★)
    const x = fr && ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.frames) || []).find(y => y.id === fr);
    return x && x.asset ? `<i class=rm-deco style="--deco:url('${esc(assetUrl(x.asset))}')"></i>` : '';
  };
  const human = p => {
    const on = p.host || p.ready;
    return `<div class="rm-slot${p.you ? ' me' : ''}${p.host ? ' host' : ''}${on ? ' on' : ''}"${place(p.ch, p.fr)}>${framedScene(p)}<div class=rm-art${s5bg(p)}>${artOf(av(p.name, p.ch))}</div>${deco(p.fr)}<em class=rm-chip>${roleOf(p)}</em>
      <div class=rm-plate><b>${esc(p.you ? 'คุณ' : p.name)}</b><small>${p.you ? esc(p.name) : p.host ? 'เจ้าของห้อง' : 'ผู้เล่น'}</small></div></div>`;
  };
  const bot = i =>
    `<div class="rm-slot bot on"${place(botChar(i))}><div class=rm-art>${artOf(av('บอท' + i, botChar(i)))}</div><em class=rm-chip>🤖 บอท</em><div class=rm-plate><b>บอท</b><small>เล่นแทน</small></div></div>`;
  const searching = k =>
    `<div class="rm-slot empty searching"><div class=rm-plus><span class=mm-spin></span></div><div class=rm-plate><b>กำลังค้นหา…</b><small>ผู้เล่นคนที่ ${k + 1}</small></div></div>`;
  const empty = k =>
    M
      ? searching(k)
      : `<button class="rm-slot empty" onclick=copyInvite()><div class=rm-plus>＋</div><div class=rm-plate><b>ว่าง</b><small>${noBots ? 'รอเพื่อน' : 'บอทจะเล่นแทน'}</small></div></button>`;
  // ห้องไม่มีบอท (แรงก์ · หาแมตช์ · ห้องปิดบอท) ยังแสดงครบทุกที่นั่ง — การ์ดจะได้ขนาดเท่าห้องปกติ 4 คน ไม่ขยายเต็มจอ
  const MAX_SEATS = 4;
  const seats = Math.max(total, Math.min(MAX_SEATS, Number(M ? M.max : L.maxPlayers) || MAX_SEATS));
  const slots = Array.from({ length: seats }, (_, k) => (people[k] ? human(people[k]) : soloRoom ? bot(k) : empty(k))).join('');
  const wait = esc((L.waitingFor || []).join(', ')),
    isMe = !!mine;
  const status = M
    ? M.state === 'ready'
      ? 'พบผู้เล่นครบแล้ว — กดพร้อมเพื่อเริ่มเกม'
      : `พบผู้เล่น ${M.humans}/${M.max} คน — กำลังหาเพิ่ม…${M.ranked ? ' (แรงก์: รอจนครบ 4 คน)' : ''}`
    : soloRoom
      ? 'เล่นกับบอท — กดเริ่มเกมได้เลย'
      : !isHost
        ? meP.ready
          ? 'รอเจ้าของห้องเริ่มเกม…'
          : 'กด “พร้อม” เมื่อพร้อมเล่น'
        : blocked
          ? `รอ ${wait} กดพร้อม`
          : 'ทุกคนพร้อมแล้ว — กดเริ่มเกมได้เลย';
  const row = (k, v) => `<div class=rm-row><span>${k}</span><b>${v}</b></div>`;
  return `<div class=rm-stage>
  <div class=rm-top><button class=rm-back onclick="if(confirm('ออกจากห้อง?'))leave()" aria-label="ออก">‹</button>
    <div class=rm-title><b>${M ? (M.ranked ? '🏆 กำลังหาแมตช์แรงก์' : '🔍 กำลังหาแมตช์') : soloRoom ? '🤖 ห้องเล่นกับบอท' : 'ห้อง ' + esc(code)}</b><small>${esc(rule.name || 'ดัมมี่')}</small></div>
    <span class=pill>🪙 ${sv.coins}</span>${rule.id ? `<button class="pill rl" onclick="showRules('${esc(rule.id)}')">📖 กติกา</button>` : ''}</div>
  <div class=rm-slots>${slots}</div>
  <div class=rm-hint>${esc(M || !h || /^รอผู้เล่น|^ห้องเล่นกับบอท/.test(h) ? status : h)}</div>
  <aside class=rm-panel>
    <div class=rm-card>${soloRoom || M ? '' : `<div class=rm-code><small>รหัสห้อง</small><b>${esc(code)}</b><button onclick=copyInvite()>🔗 คัดลอก</button></div>`}
      ${M ? (M.ranked ? row('โหมด', '🏆 แรงก์ · คนจริงล้วน') : '') + row('สถานะ', M.state === 'ready' ? '✋ รอกดพร้อม' : '🔍 กำลังค้นหา') + row('เวลาค้นหา', '<span class=mm-el>00:00</span>') : ''}${row('กติกา', esc(rule.name || 'ดัมมี่') + (M && M.ranked ? ' (มาตรฐาน)' : ''))}${row('รางวัล', M && M.ranked ? 'เหรียญ + แต้มอันดับ' : 'เหรียญตามอันดับ · แพ้ก็ได้')}${window.Farm && L.allowBots !== false ? row('ถ้ามีบอท', Farm.lobbyLine()) : ''}${row('ผู้เล่น', ps.length + '/' + seats)}${row('ที่ว่าง', noBots ? 'ไม่มีบอท' : 'บอทเล่นแทน')}</div>
    ${soloRoom ? '' : `<div class=rm-emotes>${['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'].map(e => `<button onclick="sendEmote('${e}')">${e}</button>`).join('')}${window.Emote ? `<button class=rm-emo-more onclick="Emote.toggle()" aria-label="สติกเกอร์ตัวละคร">🎴</button>` : ''}</div>`}
    <div class=rm-acts>${M ? '<button class=gray onclick=leave()>✖ ยกเลิกการค้นหา</button>' : ''}${!M && !isHost && !soloRoom && isMe ? `<button class="${meP.ready ? 'g' : 'org'}" onclick=toggleReady()>${meP.ready ? '✓ พร้อมแล้ว (ยกเลิก)' : '✋ พร้อม'}</button>` : ''}${!M && isHost ? `<button class=blue onclick=begin() ${blocked ? 'disabled' : ''}>▶ เริ่มเกม</button>` : ''}${soloRoom || M ? '' : `${window.Friends && window.DB && DB.enabled && DB.P ? '<button class=blue onclick="Friends.picker()">👥 ชวนเพื่อนออนไลน์</button>' : '<button class=gray onclick=copyInvite()>🔗 ชวนเพื่อน</button>'}`}</div>
  </aside>
  ${M && M.state === 'ready' ? gxReadyBox(M, ps) : ''}
  ${M && M.prompt ? `<div class=mm-modal><div class=mm-box><h3>หาผู้เล่นได้ ${M.humans}/${M.max} คน</h3><p>จะรอผู้เล่นเพิ่ม หรือเติมบอทแล้วเริ่มเลย?</p>${window.Farm ? `<p class=mm-st>${Farm.lobbyLine()}</p>` : ''}<div class=mm-btns><button class="${M.prompt.voted === 'wait' ? 'on' : ''}" onclick="matchVote('wait')">⏳ รอต่อ</button><button class="${M.prompt.voted === 'bots' ? 'on' : ''}" onclick="matchVote('bots')">🤖 เติมบอทเล่นเลย</button></div><small>เหลือ <span class=mm-pl>${Math.ceil(M.prompt.leftMs / 1000)}</span> วินาที · เติมบอทเมื่อทุกคนเลือกเติม</small>${M.prompt.voted ? '<small>รอผู้เล่นอื่นเลือก…</small>' : ''}</div></div>` : ''}
</div>`;
}
