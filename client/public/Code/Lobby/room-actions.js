/* room-actions.js — สร้าง/เข้า/ออกห้อง · เริ่มเกม · สับไพ่ · หน้าห้องรอแบบเดิม (จอแคบ)
   หน้าห้องรอแบบใหม่ (จอกว้าง) อยู่ใน Code/Table/gamegx.js → gxRoom()
   Public: mk() · jn() · begin() · doShuffle() · shufflePanel() · startBtn(label) · leave() · tableView() · botChar(i) */
function mk() {
  conn();
  if (!sock) return;
  nick = ($('au')?.value || nick || 'ผู้เล่น').trim().slice(0, 14) || 'ผู้เล่น';
  if (window.NameFilter) nick = NameFilter.clean(nick, 'ผู้เล่น');
  sv.name = nick;
  localStorage.setItem('dummyName', nick);
  const m = ruleMeta(createSel.rule);
  sock.emit('room:create', {
    name: nick,
    s5: typeof skStar5 === 'function' ? skStar5(myChar()) : false,
    e2: typeof skStars === 'function' && skStars(myChar()) >= 2,
    ch: myChar(),
    bg: myBg(),
    fr: myFrame(),
    rule: m ? m.id : undefined,
    options: m ? ruleOpts(m) : {},
    bots: createMode === 'solo' ? true : createBots,
    farm: window.Farm ? Farm.get() : 'coins',
  });
}
function jn() {
  const c = ($('cd').value || '').trim().toUpperCase();
  nick = localStorage.getItem('dummyName') || nick || 'ผู้เล่น';
  if (c) {
    conn();
    sock.emit('room:join', {
      code: c,
      name: nick,
      s5: typeof skStar5 === 'function' ? skStar5(myChar()) : false,
      e2: typeof skStars === 'function' && skStars(myChar()) >= 2,
      ch: myChar(),
      bg: myBg(),
      fr: myFrame(),
      farm: window.Farm ? Farm.get() : 'coins',
    });
  }
}
const begin = () => sock.emit('game:start');
const doShuffle = () => {
  if (!sock || !sock.connected) {
    lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์';
    return render();
  }
  if (shufAnim) return;
  sock.emit('game:shuffle');
};
// ส่วนสับไพ่ (ล็อบบี้ + หน้าจบตา): ผู้สับ = เจ้าของห้อง (ตาแรก) หรือผู้ชนะตาก่อนหน้า (ตาถัดไป)
function shufflePanel() {
  const sh = lob && lob.shuffle;
  if (!sh || !sh.shuffler) return '';
  const lbl = { cut: 'ตัดไพ่', riffle: 'รีฟเฟิล', overhand: 'โอเวอร์แฮนด์' },
    cnt = {};
  if (shufAnim)
    shufAnim.steps.forEach(t => {
      cnt[t] = (cnt[t] || 0) + 1;
    });
  const anim = shufAnim
    ? `<div class=shuf-anim aria-hidden=true>${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--s:${i % 2 ? 1 : -1}"></i>`).join('')}</div><p class=shuf-steps>${esc(shufAnim.by)} สับไพ่: ${Object.keys(
        cnt
      )
        .map(t => (lbl[t] || t) + ' ×' + cnt[t])
        .join(' · ')}</p>`
    : '';
  const who = sh.youShuffler ? 'คุณ' : esc(sh.shuffler),
    why = sh.round ? '🏆 ผู้ชนะตาก่อนหน้า' : '👑 เจ้าของห้อง';
  const st = sh.ready ? '✅ สับไพ่แล้ว' + (sh.by ? ' โดย ' + esc(sh.by) : '') : '⏳ ยังไม่ได้สับไพ่';
  return `<div class=shuf><p>🔀 ผู้สับไพ่: <b>${who}</b> (${why})</p>${anim}<p class=shuf-st>${st}</p>${sh.youShuffler ? `<button class=org onclick=doShuffle() ${shufAnim ? 'disabled' : ''}>🔀 ${sh.ready ? 'สับอีกครั้ง' : 'สับไพ่'}</button>` : ''}</div>`;
}
// ปุ่มเริ่ม: เจ้าของห้องเท่านั้น และต้องสับไพ่แล้ว (เว้นเล่นคนเดียว)
function startBtn(label) {
  const sh = lob && lob.shuffle,
    blocked = !!(sh && sh.needed && !sh.ready);
  if (!isHost) return '<p>รอเจ้าของห้องกดเริ่มเกม...</p>';
  return `<button onclick=begin() ${blocked ? 'disabled' : ''}>${label}</button>${blocked ? `<p>ต้องให้ ${sh.youShuffler ? 'คุณ' : esc(sh.shuffler || 'ผู้สับไพ่')} กดสับไพ่ก่อน</p>` : ''}`;
}
function play() {
  go('lobby');
}
function leave() {
  clearDeal();
  setSess(null);
  if (sock) sock.emit('room:leave');
  code = '';
  lob = null;
  S = null;
  ho = [];
  sel = new Set();
  prevM = prevD = 0;
  soloRoom = false;
  soloPending = false;
  hint = lerr = '';
  screen = 'home';
  render();
}
// ===== โต๊ะก่อนเริ่มเกม: เข้าห้องแล้วอยู่ที่โต๊ะเลย สับไพ่ที่กองกลางโต๊ะ แล้วกดเริ่มเพื่อแจกไพ่ =====
const botChar = i => {
  const l = (SKIN_REGISTRY.characters || []).filter(c => c.asset);
  return l.length ? l[i % l.length].id : null;
}; // ภาพตัวแทนบอทที่นั่งว่างก่อนเริ่มเกม
function tableView() {
  const L = lob || { players: [], shuffle: {}, options: {}, rule: {} },
    ps = L.players.filter(p => p.connected),
    noBots = L.allowBots === false,
    total = noBots ? Math.max(1, ps.length) : Math.max(4, ps.length),
    sh = L.shuffle || {};
  const myi = Math.max(
      0,
      ps.findIndex(p => p.you)
    ),
    seatOf = k => (myi + k) % total,
    youSh = false,
    blocked = !!(isHost && L.allReady === false),
    meP = ps.find(p => p.you) || {}; // ก้อนล็อบบี้ใหม่: ไม่ต้องสับไพ่เอง · เจ้าของเริ่มได้เมื่อทุกคนพร้อม
  const pl = (si, pos) => {
    const p = ps[si],
      bot = !p,
      nm = bot ? 'บอท' : p.you ? 'คุณ' : p.name,
      a = bot ? av('บอท' + si, botChar(si)) : av(p.name, p.ch),
      cls = a.startsWith('<img') ? 'chr' : 'av';
    const info = `<div class=pl-info><b>${esc(nm)}${p && p.host ? ' 👑' : ''}</b><small>${bot ? 'บอทเล่นแทน' : p.host ? '👑 เจ้าของห้อง' : p.ready ? '✅ พร้อม' : '⏳ รอ'}</small></div>`,
      ico = `<span class="${cls}">${a}</span>`;
    return `<div class="pl pl-${pos}${p && p.you ? ' me' : ''}${p && (p.host || p.ready) ? ' active' : ''}" data-seat=${si}>${pos === 'bottom' ? info + ico : ico + info}</div>`;
  };
  const deck = `<div class="deckbox${shufAnim ? ' go' : ''}" aria-hidden=true>${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--s:${i % 2 ? 1 : -1}"></i>`).join('')}</div><div class=lab>${L.allReady === false ? '⏳ รอ ' + esc((L.waitingFor || []).join(', ')) + ' กดพร้อม' : '✅ พร้อมเริ่ม · สับไพ่ใหม่ทุกตา'}</div>`;
  const stake = L.options && L.options.stake != null ? L.options.stake : null,
    lbl = { cut: 'ตัดไพ่', riffle: 'รีฟเฟิล', overhand: 'โอเวอร์แฮนด์' },
    cnt = {};
  if (shufAnim)
    shufAnim.steps.forEach(t => {
      cnt[t] = (cnt[t] || 0) + 1;
    });
  const h = lerr
    ? '⚠️ ' + lerr
    : shufAnim
      ? esc(shufAnim.by) +
        ' สับไพ่: ' +
        Object.keys(cnt)
          .map(t => (lbl[t] || t) + ' ×' + cnt[t])
          .join(' · ')
      : soloRoom
        ? 'ห้องเล่นกับบอท — กดเริ่มเกมได้เลย'
        : noBots
          ? 'รอผู้เล่น ' + ps.length + '/4 · ปิดบอทไว้ ต้องมีผู้เล่นจริงอย่างน้อย 2 คน'
          : 'รอผู้เล่น ' + ps.length + '/4 · ที่ว่างบอทจะเล่นแทน';
  const who = youSh ? 'คุณ' : esc(sh.shuffler || '-');
  const gx = isWide();
  $('app').className = gx ? 'rmv' : ''; // ห้องล็อบบี้แยกจากหน้าโต๊ะ (gamegx.js → gxRoom)
  if (gx) {
    $('app').innerHTML = gxRoom({ ps, total, L, h, stake, blocked, meP });
    return;
  }
  $('app').innerHTML =
    `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}</span>${L.rule && L.rule.id ? `<button class="pill rl" onclick="showRules('${esc(L.rule.id)}')">📖 กติกา</button>` : ''}</div>
 <div class=arena>${pl(seatOf(2), 'top')}${pl(seatOf(1), 'left')}<div class=felt><div class=piles>${deck}</div></div>${pl(seatOf(3), 'right')}${pl(seatOf(0), 'bottom')}</div></div>
 <div class=colR><div class=logs></div><div class=hint>${h}<small>${L.rule && L.rule.name ? '🎴 ' + esc(L.rule.name) + ' · ' : ''}ผู้สับไพ่: ${who} ${sh.round ? '🏆 ผู้ชนะตาก่อน' : '👑 เจ้าของห้อง'}</small></div>
 <div class=dock-wrap><div class=dock><div class=pre>${soloRoom ? '' : `<p>รหัสห้อง <b class=pre-code>${esc(code)}</b> — ส่งให้เพื่อน (สูงสุด 4 คน)</p>`}${!isHost ? '<p>รอเจ้าของห้องกดเริ่มเกม...</p>' : blocked ? `<p>รอ ${esc((L.waitingFor || []).join(', '))} กดพร้อม</p>` : ''}</div>
 <div class=acts>${!isHost && !soloRoom ? `<button class="${meP.ready ? 'g' : 'org'}" onclick=toggleReady()>${meP.ready ? '✓ พร้อมแล้ว (กดยกเลิก)' : '✋ พร้อม'}</button>` : ''}${isHost ? `<button class=blue onclick=begin() ${blocked ? 'disabled' : ''}>▶ เริ่มเกม</button>` : ''}<button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div></div></div>`;
}
