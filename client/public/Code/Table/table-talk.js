/* table-talk.js — ตัวละครพูดบนโต๊ะ: กรอบคำพูดที่รูปตัวละคร (ไม่มีรูป = ข้างป้ายที่นั่ง) ตอนเริ่มตา เกิดชุด เกิดหัว ฝากไพ่ น็อก ชนะ แพ้
   บทพูดอยู่ใน skin/table-talk.json (ข้อมูลล้วน) · ทุกที่นั่งพูดตามตัวละครของตัวเอง รวมบอท · ไม่มีผลกับเกมใด ๆ
   อ่านเหตุการณ์จากสถานะที่เซิร์ฟเวอร์ส่งมาอยู่แล้ว (S.ev ของดัมมี่ · S.over/S.res ทุกเกม) แบบเดียวกับ seatfx.js — ไม่ห่อ render()
   ปิดได้ที่ตั้งค่า → "บทพูดตัวละคร" (localStorage pvTalk) · บทสอนเล่นไม่พูด (มีข้อความสอนอยู่แล้ว)
   Public: TableTalk.say(seat, event) — เรียกเองได้ (เช่นเหตุการณ์ใหม่ในอนาคต)
   EXTEND: เหตุการณ์ใหม่ = เพิ่มชื่อใน chance + บทใน table-talk.json แล้วเรียก TableTalk.say(ที่นั่ง, 'ชื่อเหตุการณ์') */
(function () {
  'use strict';
  const { escape, lsGet } = window.UiKit;

  const POLL_MS = 300; // ตรวจสถานะทุก 0.3 วินาที (เท่า ๆ กับ seatfx)
  const BUBBLE_MS = 2600; // กรอบคำพูดค้างไว้นานเท่านี้
  const SEAT_GAP_MS = 3500; // ที่นั่งเดียวกันพูดซ้ำได้หลังจากนี้ (กันพูดรัว)
  const START_SPEAKERS = 2; // เริ่มตา: สุ่มให้พูดไม่เกินกี่คน
  const START_DELAY_MS = 600;
  const END_DELAY_MS = 500;
  // ความสูงบนรูปตัวละครที่ใช้วางกรอบคำพูด (สัดส่วนของส่วนที่เห็นบนจอ วัดจากด้านบน)
  const HEAD_TOP_SEAT = 0.62; // ตัวบน: หัวชิดขอบจอ วางระดับอก ไม่บังหน้า
  const HEAD_OTHER_SEAT = 0.06; // ตัวซ้าย/ขวา/ของเรา: เหนือหัวเล็กน้อย

  let lines = null;
  let gid = null;
  let lastEventSeq = 0;
  let greeted = false;
  let ended = false;
  const lastSpoke = {}; // ที่นั่ง → เวลาที่พูดล่าสุด

  fetch('./skin/table-talk.json')
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      lines = data;
    })
    .catch(() => {});

  const talkOn = () => lsGet('pvTalk', '1') === '1';
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function lineFor(characterId, event) {
    if (!lines) return '';
    const own = (lines.characters || {})[characterId] || {};
    const list = own[event] || (lines.defaults || {})[event] || [];
    return list.length ? pick(list) : '';
  }

  function seatElement(seat) {
    if (seat === S.my) return document.querySelector('#app .gx-me') || document.querySelector(`#app [data-seat="${seat}"]`);
    return document.querySelector(`#app .gx-seat[data-seat="${seat}"]`) || document.querySelector(`#app [data-seat="${seat}"]`);
  }

  // รูปตัวละครของที่นั่ง (โต๊ะแนวนอน gamegx/games.js: .gx-art-<ตำแหน่ง>) · ตำแหน่งอ่านจากคลาสป้ายที่นั่ง gx-top/left/right · ของเรา = bottom
  function characterImage(seat) {
    const badge = seatElement(seat);
    const match = badge && badge.className.match(/\bgx-(top|left|right)\b/);
    const position = seat === S.my ? 'bottom' : match && match[1];
    if (!position) return null;
    const art = document.querySelector(`#app .gx-art-${position}`);
    if (!art) return null;
    return { position, art, img: art.querySelector('img') || art };
  }

  // ส่วนของตัวละครที่เห็นจริงบนจอ: แนวนอนตามรูป · แนวตั้งตามกล่อง .gx-art (CSS ตัดรูปด้วย clip-path ตามความสูงกล่อง) · ตัดส่วนที่ล้นจอ
  function visibleRect(image) {
    const imgRect = image.img.getBoundingClientRect();
    const boxRect = image.art.getBoundingClientRect();
    const left = Math.max(0, imgRect.left);
    const top = Math.max(0, imgRect.top, boxRect.top);
    const right = Math.min(window.innerWidth, imgRect.right);
    const bottom = Math.min(window.innerHeight, imgRect.bottom, boxRect.bottom);
    if (right - left < 4 || bottom - top < 4) return null;
    return { left, top, width: right - left, height: bottom - top };
  }

  // วางกรอบคำพูดที่ตัวละคร: ตัวบนสุดหัวชิดขอบจอ → วางกลางตัวแล้วชี้ขึ้น · ตัวอื่นวางเหนือหัวแล้วชี้ลง
  function placeOnCharacter(bubble, seat) {
    const image = characterImage(seat);
    const rect = image && visibleRect(image);
    if (!rect) return false;
    const below = image.position === 'top';
    const x = rect.left + rect.width / 2;
    const y = below ? rect.top + rect.height * HEAD_TOP_SEAT : rect.top + rect.height * HEAD_OTHER_SEAT;
    bubble.classList.add(below ? 'tt-below' : 'tt-above');
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    return true;
  }

  // ไม่มีรูปตัวละคร (โต๊ะแบบเก่า/อีโมจิ) → วางใต้ป้ายชื่อที่นั่ง (ของเราอยู่ล่างจอ → วางด้านบน)
  function placeBubble(bubble, seat) {
    if (placeOnCharacter(bubble, seat)) return true;
    const el = seatElement(seat);
    const rect = el && el.getBoundingClientRect();
    if (!rect || !rect.width) return false;
    const below = seat !== S.my;
    const x = rect.left + rect.width / 2;
    const y = below ? rect.bottom + 6 : rect.top - 6;
    bubble.classList.add(below ? 'tt-below' : 'tt-above');
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    return true;
  }

  // ที่นั่งซ้าย/ขวาอยู่ชิดขอบจอ — วัดขนาดจริงหลังวางแล้ว ดันกรอบเข้ามาไม่ให้ล้นจอทั้งแนวนอนและแนวตั้ง
  function keepInsideScreen(bubble) {
    const margin = 8;
    const half = bubble.offsetWidth / 2;
    const height = bubble.offsetHeight;
    const x = parseFloat(bubble.style.left);
    const y = parseFloat(bubble.style.top);
    bubble.style.left = Math.max(half + margin, Math.min(window.innerWidth - half - margin, x)) + 'px';
    const above = bubble.classList.contains('tt-above');
    const minY = above ? height + margin : margin;
    const maxY = above ? window.innerHeight - margin : window.innerHeight - height - margin;
    bubble.style.top = Math.max(minY, Math.min(maxY, y)) + 'px';
  }

  function say(seat, event) {
    if (!talkOn() || typeof S === 'undefined' || !S || S.tutorial) return;
    const player = S.P && S.P[seat];
    if (!player) return;
    const now = Date.now();
    if (lastSpoke[seat] && now - lastSpoke[seat] < SEAT_GAP_MS) return;
    const text = lineFor(player.ch, event);
    if (!text) return;
    const bubble = document.createElement('div');
    bubble.className = 'tt-bubble tt-' + event;
    bubble.innerHTML = `<span>${escape(text)}</span>`;
    if (!placeBubble(bubble, seat)) return;
    lastSpoke[seat] = now;
    document.body.appendChild(bubble);
    keepInsideScreen(bubble);
    setTimeout(() => bubble.remove(), BUBBLE_MS);
  }

  // พูดตามโอกาสใน table-talk.json → chance (1 = พูดทุกครั้ง)
  function maybeSay(seat, event) {
    const chance = Number(((lines && lines.chance) || {})[event]);
    if (Math.random() < (Number.isFinite(chance) ? chance : 1)) say(seat, event);
  }

  // ผู้ชนะของตา: ดัมมี่ใช้ res.k (คนปิดเกม) · เกมอื่นดูอันดับ/เหรียญ/แต้ม ตามที่กติกาส่งมา
  function winnerSeat(result) {
    if (!result) return null;
    if (result.k != null) return result.k;
    if (result.winner != null) return result.winner;
    const first = (result.rows || []).find(row => row.place === 1);
    if (first && first.i != null) return first.i;
    const scores = (result.coin && result.coin.delta) || result.pts;
    if (!Array.isArray(scores) || !scores.length) return null;
    return scores.indexOf(Math.max(...scores));
  }

  function onNewGame() {
    gid = S.gid;
    lastEventSeq = Math.max(0, ...(S.ev || []).map(e => e.s));
    greeted = false;
    ended = !!S.over;
  }

  function greet() {
    greeted = true;
    const seats = S.P.map((p, i) => i).sort(() => Math.random() - 0.5).slice(0, START_SPEAKERS);
    seats.forEach((seat, n) => setTimeout(() => maybeSay(seat, 'start'), START_DELAY_MS + n * 900));
  }

  // ดัมมี่: เหตุการณ์แต้มจากเซิร์ฟเวอร์ (engine.js ev()) → เกิด / เกิดหัว / ฝาก
  function readDummyEvents() {
    (S.ev || []).forEach(e => {
      if (e.s <= lastEventSeq) return;
      lastEventSeq = e.s;
      if (!(e.d > 0)) return;
      if (/^เกิดหัว/.test(e.t)) maybeSay(e.i, 'head');
      else if (/^เกิด/.test(e.t)) maybeSay(e.i, 'meld');
      else if (/^ฝาก/.test(e.t)) maybeSay(e.i, 'deposit');
    });
  }

  function endGame() {
    ended = true;
    const win = winnerSeat(S.res);
    const isDummyKnock = (!S.rule || S.rule === 'dummy') && S.res && S.res.k != null;
    setTimeout(() => {
      if (win != null) maybeSay(win, isDummyKnock ? 'knock' : 'win');
      if (win !== S.my) maybeSay(S.my, 'lose');
    }, END_DELAY_MS);
  }

  function tick() {
    if (typeof S === 'undefined' || !S || !S.P || typeof screen === 'undefined' || screen !== 'game') return;
    if (S.gid !== gid) onNewGame();
    if (typeof deal !== 'undefined' && deal) return; // รอแจกไพ่เสร็จก่อน
    if (!greeted && !S.over) greet();
    if (!S.rule || S.rule === 'dummy') readDummyEvents();
    if (S.over && !ended) endGame();
  }

  setInterval(() => {
    try {
      tick();
    } catch (e) {}
  }, POLL_MS);

  window.TableTalk = { say };
})();
