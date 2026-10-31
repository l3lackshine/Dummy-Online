/* emote.js — อีโมตบนโต๊ะเล่น + สติกเกอร์ตัวละคร (ของปลด 2★)
   - อีโมจิพื้นฐาน 8 อัน: ทุกคนใช้ได้ · สติกเกอร์ตัวละคร 4 แบบ: ตัวที่ใช้อยู่ต้องถึง 2★ (เซิร์ฟเวอร์ตรวจซ้ำ)
   - บนโต๊ะ: ขึ้นเหนือที่นั่งของคนส่ง · ห้องรอ: ลอยกลางจอ (lobby-ui.js เรียก Emote.html)
   รูปสติกเกอร์: Item/Emote/<ตัวละคร>/<happy|laugh|wow|sad>.webp (ไม่มีรูป = ป้ายคำพูดชั่วคราว)
   Public: Emote.html(d) · Emote.send(e) · Emote.toggle() · Emote.BASIC · Emote.STICKERS */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const BASIC = ['👍', '😀', '😂', '😎', '🔥', '👋', '🙏', '❤️'];
  const STICKERS = [{ k: 'c:happy', f: 'happy', emo: '😊', t: 'เย้!' }, { k: 'c:laugh', f: 'laugh', emo: '😆', t: 'ฮ่า ๆ' }, { k: 'c:wow', f: 'wow', emo: '😲', t: 'ว้าว!' }, { k: 'c:sad', f: 'sad', emo: '🥺', t: 'งือ…' }];
  const NEED = 2;
  // รูปสติกเกอร์: ตัว SR/SSR ใช้ชุดของตัวเอง (Item/Emote/<ตัวละคร>/) · ตัวอื่นใช้ชุดตามระดับ แมวซากุระ (tier-rare = ตัว Rare · tier-common = ตัวฟรี)
  const has = {};   // 'โฟลเดอร์/f' → true/false (มีรูปจริงไหม)
  const url = (dir, f) => './Item/Emote/' + dir + '/' + f + '.webp';
  const tierOf = ch => { const c = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(x => x.id === ch); return c && c.rarity === 'rare' ? 'tier-rare' : 'tier-common'; };
  const OWN = ['sakuya-ssr', 'rina-01', 'arya-01', 'rena-01'];   // ตัวที่มีสติกเกอร์หน้าตัวเอง (เพิ่มชื่อเมื่อวาดชุดใหม่)
  const dirOf = ch => (OWN.includes(ch) ? ch : tierOf(ch));
  function probe(ch) { if (!ch) return; const dir = dirOf(ch); STICKERS.forEach(s => { const key = dir + '/' + s.f; if (key in has) return; has[key] = false; const i = new Image(); i.onload = () => { has[key] = true; }; i.src = url(dir, s.f); }); }
  const myCh = () => (typeof myChar === 'function' ? myChar() : '');
  const unlocked = () => typeof skStars === 'function' && skStars(myCh()) >= NEED;
  // หน้าตาอีโมตหนึ่งอัน (ใช้ทั้งบนโต๊ะและห้องรอ)
  function html(d) {
    const s = STICKERS.find(x => x.k === d.e);
    if (!s) return `<span class=em-emo>${E(d.e)}</span>`;
    probe(d.ch); const dir = dirOf(d.ch);
    return has[dir + '/' + s.f] ? `<img class=em-img src="${E(url(dir, s.f))}" alt="">` : `<span class=em-tmp><i>${s.emo}</i><b>${E(s.t)}</b></span>`;
  }
  function send(e) { if (typeof sock !== 'undefined' && sock && sock.connected) sock.emit('room:emote', { e }); close(); }
  // ---------- แผงเลือกอีโมต ----------
  function close() { document.querySelectorAll('.em-pal').forEach(n => n.remove()); }
  function toggle() {
    if (document.querySelector('.em-pal')) return close();
    const ch = myCh(), ok = unlocked(); probe(ch);
    const p = document.createElement('div'); p.className = 'em-pal';
    p.innerHTML = `<div class=em-row>${BASIC.map(e => `<button onclick="Emote.send('${e}')">${e}</button>`).join('')}</div>
      <div class="em-row em-st${ok ? '' : ' lock'}">${STICKERS.map(s => `<button ${ok ? `onclick="Emote.send('${s.k}')"` : 'disabled'}>${html({ e: s.k, ch })}</button>`).join('')}${ok ? '' : `<em>🔒 อัพตัวละครเป็น ${NEED}★ เพื่อปลดสติกเกอร์</em>`}</div>`;
    document.body.appendChild(p);
  }
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.em-pal,.em-btn')) close(); }, true);
  // ---------- แสดงบนโต๊ะ: เหนือที่นั่งของคนส่ง ----------
  function seatOf(name) { if (typeof S === 'undefined' || !S || !S.P) return -1; const i = S.P.findIndex(p => p.n === name); return i; }
  function showTable(d) {
    const i = seatOf(d.from); if (i < 0) return false;
    const el = i === S.my ? document.querySelector('.gx-me') : document.querySelector(`.gx-seat[data-seat="${i}"]`); if (!el) return false;
    const r = el.getBoundingClientRect(), b = document.createElement('div'); b.className = 'em-pop'; b.innerHTML = html(d);
    b.style.left = Math.max(50, Math.min(innerWidth - 50, r.left + r.width / 2)) + 'px'; b.style.top = Math.max(60, r.top - 8) + 'px';
    document.querySelectorAll(`.em-pop[data-s="${i}"]`).forEach(n => n.remove()); b.dataset.s = i;
    document.body.appendChild(b); setTimeout(() => b.remove(), 2600); return true;
  }
  // ปุ่มอีโมตบนโต๊ะ (ไม่แสดงในห้องเล่นกับบอทคนเดียว / บทสอน)
  setInterval(() => {
    const show = typeof screen !== 'undefined' && screen === 'game' && typeof S !== 'undefined' && S && !S.tutorial && !(typeof soloRoom !== 'undefined' && soloRoom);
    let b = document.querySelector('.em-btn');
    if (show && !b) { b = document.createElement('button'); b.className = 'em-btn'; b.setAttribute('aria-label', 'อีโมต'); b.textContent = '😊'; b.onclick = toggle; document.body.appendChild(b); }
    else if (!show && b) { b.remove(); close(); }
    probe(myCh());
  }, 300);
  window.Emote = { html, send, toggle, showTable, BASIC, STICKERS, NEED };
})();
