/* friends.js — เพื่อน (screen === 'friends', เปิดด้วย friendsOpen())
   - รายชื่อ/คำขอ: ฐานข้อมูล get_friends · friend_request · friend_respond · friend_remove (supabase/v12_friends.sql)
   - สถานะออนไลน์ + ชวนเข้าห้อง: เซิร์ฟเวอร์เกม 'friends:presence' · 'friend:invite' (server/src/index.js)
   - คำชวนเด้งขึ้นได้ทุกหน้า: กด "เข้าร่วม" = ออกจากห้องเดิม (ถ้ามี) แล้วเข้าห้องเพื่อน
   ไม่แก้ app.js: ห่อ render() เหมือน battlepass.js / ranked.js
   Public: friendsOpen() · Friends.count() · Friends.picker() */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  let FR = null, PRES = {}, err = '', busy = false, lastLoad = 0, lastPres = 0, q = '', armDel = null;
  const toast = m => { if (window.dbToast) dbToast(m); };
  const face = x => (typeof avFace === 'function' ? avFace(x.name, x.ch) : '');
  const ago = t => { if (!t) return ''; const m = Math.max(0, (Date.now() - new Date(t)) / 6e4); return m < 60 ? Math.round(m) + ' นาทีที่แล้ว' : m < 1440 ? Math.round(m / 60) + ' ชม.ที่แล้ว' : Math.round(m / 1440) + ' วันที่แล้ว'; };
  // ห้องที่ฉันอยู่ชวนเพื่อนได้ไหม (ห้องสร้างเอง ยังไม่เริ่ม ไม่ใช่ห้องเล่นกับบอท)
  const canInvite = () => typeof code !== 'undefined' && !!code && typeof lob !== 'undefined' && lob && !lob.match && !lob.started && !(typeof soloRoom !== 'undefined' && soloRoom);

  async function load() {
    if (!dbOn()) return; lastLoad = Date.now();
    try { FR = await DB.call('get_friends'); err = ''; } catch (e) { err = e.message || 'โหลดไม่สำเร็จ'; }
    presence(true); paint();
  }
  function presence(fresh) {
    if (!dbOn()) return; if (typeof conn === 'function') conn();
    if (typeof sock !== 'undefined' && sock && sock.connected) { lastPres = Date.now(); sock.emit('friends:presence', { fresh: !!fresh }); }
  }
  const paint = () => { if (typeof screen === 'undefined') return; if (screen === 'friends') view(); else if (document.querySelector('.fr-pick')) picker(true); else if (screen === 'home' && typeof render === 'function') render(); };
  // คำขอเป็นเพื่อนที่รอตอบ (ป้ายแจ้งเตือนหน้าแรก) · โหลดเงียบ ๆ อย่างมากนาทีละครั้ง
  function count() { if (!dbOn()) return 0; if (Date.now() - lastLoad > 60000) load(); return (FR && FR.incoming && FR.incoming.length) || 0; }

  // ---------- สถานะของเพื่อน ----------
  const ST = { off: ['ออฟไลน์', 'off'], online: ['ออนไลน์', 'on'], room: ['อยู่ในห้อง', 'rm'], matching: ['กำลังหาแมตช์', 'mm'], playing: ['กำลังเล่น', 'pl'] };
  const presOf = x => PRES[x.username] || { st: 'off' };
  const rank = x => ({ room: 0, online: 1, matching: 2, playing: 3, off: 4 }[presOf(x).st] ?? 4);
  function stLine(x) {
    const p = presOf(x), s = ST[p.st] || ST.off;
    const extra = p.st === 'room' ? ` ${E(p.rule || '')}${p.code ? ` · ${p.n}/${p.max}` : ''}` : p.st === 'playing' ? ` ${E(p.rule || '')}${p.ranked ? ' (แรงก์)' : ''}` : p.st === 'matching' ? ` ${E(p.rule || '')}` : p.st === 'off' && x.last_login_at ? ` · เข้าเกม ${ago(x.last_login_at)}` : '';
    return `<span class="fr-st ${s[1]}"><i></i>${s[0]}${extra}</span>`;
  }
  function actions(x, compact) {
    const p = presOf(x), u = E(x.username), out = [];
    if (canInvite() && p.st !== 'off') out.push(`<button class="fr-b go" onclick="frInvite('${u}')">✉️ ชวน</button>`);
    if (p.st === 'room' && p.code) out.push(`<button class="fr-b join" onclick="frJoin('${E(p.code)}')">▶ เข้าร่วม</button>`);
    if (!compact) out.push(armDel === x.username ? `<button class="fr-b del on" onclick="frRemove('${u}')">ยืนยันลบ</button>` : `<button class="fr-b del" onclick="frArm('${u}')" aria-label="ลบเพื่อน">✕</button>`);
    return out.join('');
  }
  const em = t => (window.Ranked && Ranked.emblem ? Ranked.emblem(t, 'sm') : '');
  const row = (x, compact) => `<div class="fr-row ${(ST[presOf(x).st] || ST.off)[1]}"><span class=fr-av>${face(x)}</span>
    <span class=fr-nm><b>${E(x.name)}</b><small>@${E(x.username)}${x.badge ? ` · 👑 ${E(x.badge)}` : ''}</small>${stLine(x)}</span>${compact ? '' : em(x.tier)}<span class=fr-acts>${actions(x, compact)}</span></div>`;

  function view() {
    if (!dbOn()) { page2('เพื่อน', `<div class=fr-empty>🔒 ล็อกอินเพื่อเพิ่มเพื่อนและชวนเพื่อนเล่น</div>`, 'home'); return; }
    const f = FR || {}, list = (f.friends || []).slice().sort((a, b) => rank(a) - rank(b)), inc = f.incoming || [], outg = f.outgoing || [];
    const on = list.filter(x => presOf(x).st !== 'off').length;
    const side = `<section class=fr-me><small>ชื่อผู้ใช้ของคุณ (ให้เพื่อนใช้ค้นหา)</small><div class=fr-un><b>@${E((f.me) || DB.P.username)}</b><button onclick="frCopy()">📋 คัดลอก</button></div>
        <label class=fr-add><input id=frIn placeholder="ใส่ชื่อผู้ใช้ของเพื่อน เช่น somchai_99" maxlength=30 autocomplete=off autocapitalize=none value="${E(q)}" oninput="frQ(this.value)" onkeydown="if(event.key==='Enter')frAdd()"><button ${busy ? 'disabled' : ''} onclick="frAdd()">➕ เพิ่มเพื่อน</button></label></section>
      ${inc.length ? `<section class=fr-req><b>คำขอเป็นเพื่อน (${inc.length})</b>${inc.map(x => `<div class=fr-row><span class=fr-av>${face(x)}</span><span class=fr-nm><b>${E(x.name)}</b><small>@${E(x.username)}</small></span><span class=fr-acts><button class="fr-b go" onclick="frRespond('${E(x.username)}',true)">✓ รับ</button><button class="fr-b del" onclick="frRespond('${E(x.username)}',false)">✕</button></span></div>`).join('')}</section>` : ''}
      ${outg.length ? `<section class=fr-req out><b>ส่งคำขอแล้ว รออีกฝ่ายตอบ</b>${outg.map(x => `<div class=fr-row><span class=fr-av>${face(x)}</span><span class=fr-nm><b>${E(x.name)}</b><small>@${E(x.username)}</small></span><span class=fr-acts><button class="fr-b del" onclick="frRemove('${E(x.username)}')">ยกเลิก</button></span></div>`).join('')}</section>` : ''}
      ${canInvite() ? '<p class=fr-tip>✉️ คุณอยู่ในห้องที่ชวนเพื่อนได้ — กด “ชวน” ที่เพื่อนที่ออนไลน์</p>' : '<p class=fr-tip>สร้างห้องก่อน แล้วกด “ชวน” เพื่อนที่ออนไลน์ให้เข้าห้องได้เลย · ถ้าเพื่อนอยู่ในห้องที่ยังว่าง กด “เข้าร่วม” ได้</p>'}`;
    const main = `<div class=fr-head><b>เพื่อน ${list.length}/${f.max || 100}</b><small>🟢 ออนไลน์ ${on} คน</small><button onclick="frRefresh()">⟳</button></div>
      <div class=fr-list>${!FR ? `<div class=fr-empty>${err ? '⚠️ ' + E(err) : 'กำลังโหลด…'}</div>` : list.length ? list.map(x => row(x)).join('') : '<div class=fr-empty>ยังไม่มีเพื่อน — ใส่ชื่อผู้ใช้ของเพื่อนทางซ้ายเพื่อส่งคำขอ</div>'}</div>`;
    page2('เพื่อน', `<div class=fr-wrap><div class=fr-side>${side}</div><div class=fr-main>${main}</div></div>`, typeof code !== 'undefined' && code ? 'lobby' : 'home');
    const pg = document.querySelector('.pg'); if (pg) pg.dataset.pg = 'friends';
    const i = document.getElementById('frIn'); if (i && q) { i.focus(); i.setSelectionRange(q.length, q.length); }
  }
  // ---------- หน้าต่างเลือกเพื่อนในห้องรอ ----------
  function picker(refresh) {
    if (!dbOn()) return toast('🔒 ล็อกอินเพื่อชวนเพื่อน');
    let m = document.querySelector('.fr-pick'); if (!m && refresh) return;
    if (!m) { m = document.createElement('div'); m.className = 'fr-pick'; m.onclick = e => { if (e.target === m) m.remove(); }; document.body.appendChild(m); if (!FR || Date.now() - lastLoad > 15000) load(); else presence(true); }
    const list = ((FR && FR.friends) || []).filter(x => presOf(x).st !== 'off').sort((a, b) => rank(a) - rank(b));
    m.innerHTML = `<div class=fr-pbox><h3>👥 ชวนเพื่อนเข้าห้อง</h3><div class=fr-list>${!FR ? '<div class=fr-empty>กำลังโหลด…</div>' : list.length ? list.map(x => row(x, true)).join('') : `<div class=fr-empty>ยังไม่มีเพื่อนออนไลน์${(FR.friends || []).length ? '' : ' · เพิ่มเพื่อนได้ที่หน้า “เพื่อน”'}</div>`}</div>
      <div class=fr-pact><button onclick="this.closest('.fr-pick').remove();friendsOpen()">เปิดหน้าเพื่อน</button><button onclick="this.closest('.fr-pick').remove()">ปิด</button></div></div>`;
  }
  // ---------- การกระทำ ----------
  window.friendsOpen = () => { document.querySelectorAll('.fr-pick').forEach(n => n.remove()); if (typeof go === 'function') go('friends'); load(); };
  window.frQ = v => { q = v; };
  window.frCopy = () => { const u = '@' + ((FR && FR.me) || DB.P.username); try { navigator.clipboard.writeText(u.slice(1)); toast('📋 คัดลอก ' + u + ' แล้ว'); } catch (e) { toast(u); } };
  window.frRefresh = () => load();
  window.frAdd = async () => {
    const u = String(q || '').trim().replace(/^@/, ''); if (!u || busy) return;
    busy = true; view();
    try { const r = await DB.call('friend_request', { p_username: u });
      toast(r.status === 'accepted' ? '🎉 เป็นเพื่อนกับ ' + (r.friend && r.friend.name) + ' แล้ว' : r.status === 'already' ? 'เป็นเพื่อนกันอยู่แล้ว' : '✉️ ส่งคำขอเป็นเพื่อนแล้ว รออีกฝ่ายตอบรับ'); q = '';
    } catch (e) { toast(e.message); }
    busy = false; load();
  };
  window.frRespond = async (u, yes) => { try { const r = await DB.call('friend_respond', { p_username: u, p_accept: !!yes }); toast(yes ? '🎉 เป็นเพื่อนกับ ' + (r.friend && r.friend.name) + ' แล้ว' : 'ปฏิเสธคำขอแล้ว'); } catch (e) { toast(e.message); } load(); };
  window.frArm = u => { armDel = u; view(); setTimeout(() => { if (armDel === u) { armDel = null; paint(); } }, 4000); };
  window.frRemove = async u => { armDel = null; try { await DB.call('friend_remove', { p_username: u }); toast('ลบออกจากรายชื่อแล้ว'); } catch (e) { toast(e.message); } load(); };
  window.frInvite = u => { if (typeof sock !== 'undefined' && sock && sock.connected) sock.emit('friend:invite', { username: u }); };
  // เข้าห้องด้วยรหัส (ใช้ตัวละคร/ของแต่งปัจจุบัน เหมือนกดเข้าห้องจากหน้าเล่นเกม)
  function joinCode(c) {
    if (typeof conn === 'function') conn(); if (typeof sock === 'undefined' || !sock) return;
    const n = localStorage.getItem('dummyName') || (typeof nick !== 'undefined' && nick) || 'ผู้เล่น', ch = myChar();
    sock.emit('room:join', { code: c, name: n, s5: (typeof skStar5 === 'function' ? skStar5(ch) : false), e2: (typeof skStars === 'function' && skStars(ch) >= 2), ch, bg: myBg(), fr: (typeof myFrame === 'function' ? myFrame() : null), farm: window.Farm ? Farm.get() : 'coins' });
  }
  window.frJoin = c => {
    document.querySelectorAll('.fr-inv,.fr-pick').forEach(n => n.remove());
    if (typeof code !== 'undefined' && code) { if (code === c) return; try { leave(); } catch (e) {} setTimeout(() => joinCode(c), 400); } else joinCode(c);
  };
  // ---------- รับเหตุการณ์จากเซิร์ฟเวอร์ ----------
  function invited(d) {
    if (!d || !d.code) return; document.querySelectorAll('.fr-inv').forEach(n => n.remove());
    const busyNow = typeof S !== 'undefined' && S && !S.over && typeof screen !== 'undefined' && screen === 'game';
    const m = document.createElement('div'); m.className = 'fr-inv';
    m.innerHTML = `<b>👥 ${E(d.from)} ชวนคุณเล่น${E(d.rule || '')}</b><small>ห้อง ${E(d.code)} · ${d.n}/${d.max} คน${busyNow ? ' · ตอนนี้คุณกำลังเล่นอยู่ (เข้าร่วม = ออกจากตานี้)' : ''}</small>
      <span><button class=go onclick="frJoin('${E(d.code)}')">▶ เข้าร่วม</button><button onclick="this.closest('.fr-inv').remove()">ไม่ล่ะ</button></span>`;
    document.body.appendChild(m); setTimeout(() => m.remove(), 20000);
  }
  let bound = null;
  setInterval(() => {
    if (typeof sock !== 'undefined' && sock && bound !== sock) {
      bound = sock;
      sock.on('friends:presence', p => { PRES = p || {}; paint(); });
      sock.on('friend:invite', invited);
      sock.on('friend:invite-result', r => { if (r) toast(r.ok ? '✉️ ส่งคำชวนถึง @' + r.username + ' แล้ว' : '@' + r.username + ': ' + (r.reason || 'ชวนไม่สำเร็จ')); });
      sock.on('connect', () => { if (dbOn()) presence(); });
    }
    // หน้าเพื่อน/หน้าต่างชวน: อัปเดตสถานะทุก 10 วินาที
    const watching = typeof screen !== 'undefined' && (screen === 'friends' || document.querySelector('.fr-pick'));
    if (watching && Date.now() - lastPres > 10000) presence();
  }, 1000);
  // เข้าเกมแล้ว (ล็อกอิน) ให้เชื่อมต่อเซิร์ฟเวอร์ไว้ เพื่อนจะเห็นว่าออนไลน์และชวนได้
  const boot = setInterval(() => { if (dbOn() && typeof conn === 'function') { clearInterval(boot); conn(); setTimeout(load, 1500); } }, 1500);

  function install() {
    if (typeof page2 !== 'function' || typeof render !== 'function') return setTimeout(install, 50);
    const _r = window.render;
    window.render = function () { if (typeof screen !== 'undefined' && screen === 'friends') { view(); return; } return _r.apply(this, arguments); };
  }
  install();
  window.Friends = { load, count, picker: () => picker(false), get: () => ({ FR, PRES }) };
})();
