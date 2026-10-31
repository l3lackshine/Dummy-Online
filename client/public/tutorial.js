/* tutorial.js — บทสอนเล่น (สาวน้อยหางม้าเป็นผู้สอน)
   1) ตาสอนดัมมี่: ห้องสอนบนเซิร์ฟเวอร์ (สำรับจัดไว้ + บอทตามสคริปต์ · ไม่หักสตามิน่า ไม่นับผล)
      จอมืดลง สว่างเฉพาะจุดที่สอน (สปอตไลต์) · กดได้เฉพาะจุดที่สว่าง · มีปุ่มข้ามเสมอ
      เด้งเองครั้งแรกหลังสมัคร (get_tutorial().seen = false) · เปิดซ้ำได้จากปุ่ม "สอนเล่น" ในหน้าเล่นเกม
      จบหรือข้าม → finish_tutorial (รางวัลครั้งแรกครั้งเดียว)
   2) อีก 4 เกม: คำแนะนำ 3 บับเบิลตอนเล่นเกมนั้นครั้งแรก (ไม่บังคับ ไม่บังจอ)
   3) ระบบนอกเกม: คำแนะนำครั้งเดียวตอนเจอครั้งแรก (โหมดซ้อม · ตั๋ว · กล่อง · เศษตัวละคร)
   Public: Tutorial.start() · Tutorial.active() · Tutorial.once(key, text) */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  const coachImg = () => { const x = ((typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || []).find(c => c.id === 'girl'); return (x && (x.asset || x.card)) || './Character/girl/Character.webp'; };
  const toast = m => { if (window.dbToast) dbToast(m); };
  const $$ = sel => [...document.querySelectorAll(sel)];
  const card = id => `.hand [data-id="${id}"]`;
  const my = () => typeof S !== 'undefined' && S && S.cur === S.my && !S.over;
  const pileOpen = () => !!document.getElementById('pileModal');
  const choice = i => `#pileModal .pile-all > .pile-choice:nth-child(${i + 1})`;
  const discIdx = id => (S && S.disc ? S.disc.findIndex(d => d[0] === id) : -1);
  const myMeld = id => !!(S && S.melds && S.melds.some(m => m.o === S.my && m.cs.includes(id)));
  const handHas = id => !!(S && S.hand && S.hand.includes(id));
  const dealing = () => typeof deal !== 'undefined' && !!deal;
  // การ์ดในสำรับสอน (ต้องตรงกับ server/src/rules/dummy/tutorial.js)
  const C = { S9: 8, H9: 21, D9: 34, C9: 47, S3: 2, H3: 15, D3: 28, H5: 17, H6: 18, H7: 19, SQ: 11, CJ: 49 };
  const BTN = { meld: '.gx-acts .blue', dep: '.gx-acts .grn', dis: '.gx-acts .org' };

  // ---------- ขั้นตอนตาสอนดัมมี่ ----------
  // when: ขั้นนี้พร้อมสอนหรือยัง (ไม่พร้อม = รอเงียบ ๆ) · done: ทำสำเร็จแล้วไปขั้นถัดไป · next: มีปุ่ม "ถัดไป"
  // spot: จุดที่สว่าง (กดได้) · extra: จุดที่กดได้เพิ่ม (ไม่ต้องสว่าง)
  const STEPS = [
    { text: 'สวัสดีจ้า! ฉันจะสอนเล่น <b>ดัมมี่</b> เอง ตาเดียวก็เป็นเลย ✨<br><small>ตานี้เป็นโหมดสอน ไม่เสียสตามิน่า ไม่นับผล</small>', next: true, when: () => !!S && !dealing() },
    { text: 'นี่คือ<b>ไพ่ในมือ</b>ของเรา 7 ใบ<br>เป้าหมายคือวางไพ่เป็นชุดลงโต๊ะ (เรียกว่า <b>เกิด</b>) ให้เหลือน้อยที่สุด แล้วคว่ำใบสุดท้าย = <b>น็อก</b>', spot: () => ['.gx-dock'], next: true },
    { text: 'ไพ่ใบแรกในกองทิ้งคือ <b>หัว</b> 👑<br>ใครเก็บหัวไปเกิดได้ <b>+50 แต้ม</b>', spot: () => ['.gx-disc'], next: true },
    { text: '<b>Q♠</b> กับ <b>2♣</b> เรียกว่า <b>สเปโต</b> วางลงโต๊ะได้ 50 แต้ม<br>⚠ ถ้าทิ้งให้คนอื่นเก็บไปเกิด = <b>ตีโต</b> เสีย 50 · ถ้าค้างมือตอนจบเสียหนัก', spot: () => [card(C.SQ)], next: true },
    { text: 'ถึงตาเราแล้ว! แตะ<b>กองจั่ว</b> แล้วกด <b>จั่วไพ่</b> 1 ใบ', spot: () => (pileOpen() ? ['#pileModal .pile-draw'] : ['.gx-stock']), extra: () => ['.gx-disc', '#pileModal .pile-draw'], when: () => my() && S.phase === 'draw' && !dealing(), done: () => S.phase === 'play' },
    { text: 'เรามี 9 สามใบ = <b>ตอง</b> (เลขเดียวกัน 3–4 ใบ)<br>แตะเลือก <b>9♠ 9♥ 9♦</b> แล้วกด <b>เกิด</b>', spot: () => [card(C.S9), card(C.H9), card(C.D9), BTN.meld], done: () => myMeld(C.S9) },
    { text: 'เกิดแล้วได้แต้ม! 🎉 จบตาด้วยการ<b>ทิ้ง 1 ใบ</b><br>ลองทิ้ง <b>3♠</b> (เลือก แล้วกด ทิ้ง)', spot: () => [card(C.S3), BTN.dis], done: () => !my() },
    { text: 'ดูคนอื่นเล่นนะ… สังเกต<b>กองทิ้ง</b>ไว้ 👀', spot: () => ['.gx-disc'], block: true, done: () => my() && S.phase === 'draw' && discIdx(C.D3) >= 0 },
    { text: 'ในกองทิ้งมี <b>3♠ 3♥</b> (เข้าชุดกันอยู่แล้ว) แล้วป้าน็อกทิ้ง <b>3♦</b> ลงมาครบชุดพอดี<br>แบบนี้เรียกว่า <b>ตีเต็ม</b> 🎯 ถ้าเราเก็บไปเกิดได้ คนที่ทิ้งใบที่ครบชุดเสีย <b>50 แต้ม</b>ให้เรา!', spot: () => ['.gx-disc'], next: true },
    { text: 'แตะ<b>กองทิ้ง</b> แล้วเลือก <b>3♠</b><br><small>เก็บแล้วได้ไพ่ตั้งแต่ใบนั้นจนใบล่าสุดมาด้วย และต้องเอาใบแรกที่เก็บไปเกิดทันที</small>', spot: () => (pileOpen() ? [choice(discIdx(C.S3))] : ['.gx-disc']), extra: () => ['.gx-stock'], when: () => my() && S.phase === 'draw', done: () => S.phase === 'play' },
    { text: 'เลือก <b>3♠ 3♥ 3♦</b> แล้วกด <b>เกิด</b>', spot: () => [card(C.S3), card(C.H3), card(C.D3), BTN.meld], done: () => myMeld(C.S3) },
    { text: 'ป้าน็อกโดน<b>ตีเต็ม</b> เสีย 50 แต้มให้เรา 😆<br>คนที่ทิ้งไพ่ให้เราเก็บไปเกิดยังเสีย<b>เหรียญ</b>ด้วย (เรียกว่า <b>ตีปี้</b>)', spot: () => ['.gx-seat[data-seat="3"]', '.gx-me'], next: true },
    { text: '<b>9♣</b> ที่ติดมาด้วย <b>ฝาก</b>ต่อชุด 9 ของเราได้!<br>แตะ <b>9♣</b> แล้วแตะ<b>ชุด 9 บนโต๊ะ</b> (หรือกด ฝากออโต้)', spot: () => [card(C.C9), '.zone-bottom .m', BTN.dep], done: () => !handHas(C.C9) },
    { text: 'เก่งมาก! ทิ้ง <b>J♣</b> เพื่อจบตา<br><small>เก็บ 5♥ 6♥ ไว้ รอ 7♥ มาต่อเป็น "เรียง"</small>', spot: () => [card(C.CJ), BTN.dis], done: () => !my() },
    { text: 'รอคนอื่นเล่นสักครู่… 👀', spot: () => ['.gx-disc'], block: true, done: () => my() && S.phase === 'draw' && discIdx(C.H7) >= 0 },
    { text: 'ป้าน็อกทิ้ง <b>7♥</b>! เข้ากับ <b>5♥ 6♥</b> ของเราพอดี<br>แตะกองทิ้ง แล้วเลือก <b>7♥</b>', spot: () => (pileOpen() ? [choice(discIdx(C.H7))] : ['.gx-disc']), extra: () => ['.gx-stock'], when: () => my() && S.phase === 'draw', done: () => S.phase === 'play' },
    { text: '<b>เรียง</b> = ดอกเดียวกันเรียงกัน 3 ใบขึ้นไป<br>เลือก <b>5♥ 6♥ 7♥</b> แล้วกด <b>เกิด</b>', spot: () => [card(C.H5), card(C.H6), card(C.H7), BTN.meld], done: () => myMeld(C.H7) },
    { text: 'เหลือใบสุดท้ายแล้ว! กด <b>คว่ำน็อก</b> เพื่อจบตา +50 🏁<br><small>(น็อกด้วยสเปโตก็ไม่ต้องกลัวอมสเปโต)</small>', spot: () => [BTN.dis], done: () => !!S.over },
    { text: '<b>เรียนจบแล้ว เยี่ยมมาก!</b> 🎉<br>ป้าน็อกยังโดน <b>ทิ้งโง่</b> −50 ด้วย เพราะทิ้งไพ่ให้เราเก็บแล้วน็อกได้<br>ดูกติกาเต็มได้ที่ 📖 กติกา ในหน้าสร้างห้อง', finish: true, when: () => !!(S && S.over), block: true },
  ];

  let on = false, step = 0, waitT = 0, skipAsk = false, roomAsked = false, startedAt = 0, heldDaily = false;
  const ui = () => document.getElementById('tutUi');
  function mount() {
    if (ui()) return ui();
    const el = document.createElement('div'); el.id = 'tutUi'; el.className = 'tut-ui';
    el.innerHTML = `<svg class=tut-mask aria-hidden=true><defs><mask id=tutHole><rect width=100% height=100% fill=white /><g class=tut-holes></g></mask></defs><rect width=100% height=100% mask="url(#tutHole)" class=tut-dim /></svg><div class=tut-rings></div>
      <div class=tut-coach><img class=tut-av alt=""><div class=tut-bub><div class=tut-txt></div><div class=tut-bt></div></div></div>
      <button class=tut-skip onclick="tutSkip()">ข้ามบทสอน ⏭</button>`;
    el.querySelector('.tut-av').src = coachImg();
    document.body.appendChild(el); return el;
  }
  function unmount() { const el = ui(); if (el) el.remove(); }
  const rectOf = sel => { const r = []; $$(sel).forEach(n => { const b = n.getBoundingClientRect(); if (b.width && b.height) r.push(b); }); return r; };

  function paint() {
    if (!on) return;
    const st = STEPS[step]; if (!st) return;
    const el = mount(), ready = !st.when || (() => { try { return st.when(); } catch (e) { return false; } })();
    const spots = ready && st.spot ? st.spot().flatMap(rectOf) : [];
    const pad = 6, holes = spots.map(b => `<rect x="${b.left - pad}" y="${b.top - pad}" width="${b.width + pad * 2}" height="${b.height + pad * 2}" rx="12" fill="black"/>`).join('');
    el.querySelector('.tut-holes').innerHTML = holes;
    el.querySelector('.tut-rings').innerHTML = spots.map(b => `<i style="left:${b.left - pad}px;top:${b.top - pad}px;width:${b.width + pad * 2}px;height:${b.height + pad * 2}px"></i>`).join('');
    el.classList.toggle('dim', ready);
    const txt = ready ? st.text : 'รอสักครู่นะ… ⏳';
    const t = el.querySelector('.tut-txt'); if (t.innerHTML !== txt) t.innerHTML = txt;
    const bt = el.querySelector('.tut-bt'), btn = ready && st.next ? '<button class=tut-next onclick="tutNext()">ถัดไป ▸</button>' : ready && st.finish ? '<button class=tut-next onclick="tutDone()">🎁 รับรางวัล · กลับหน้าแรก</button>' : '';
    if (bt.innerHTML !== btn) bt.innerHTML = btn;
    el.querySelector('.tut-skip').textContent = skipAsk ? 'แตะอีกครั้งเพื่อข้าม' : 'ข้ามบทสอน ⏭';
    // บับเบิลอยู่ฝั่งตรงข้ามจุดที่สอน (ไม่บัง)
    const cy = spots.length ? spots.reduce((a, b) => a + b.top + b.height / 2, 0) / spots.length : innerHeight;
    el.querySelector('.tut-coach').classList.toggle('up', cy > innerHeight * 0.55);
  }
  function tick() {
    if (!on) return;
    // หน้าต่างที่เด้งเองตอนล็อกอิน (รางวัลรายวัน · แพตช์โน้ต) จะทับบทสอน → ปิดไว้ก่อน จบบทสอนแล้วค่อยเปิดรางวัลรายวันให้
    document.querySelectorAll('.dl-modal,.pn-modal').forEach(n => { if (n.classList.contains('dl-modal')) heldDaily = true; n.remove(); });
    const st = STEPS[step];
    if (!st) return finish(false);
    if (st.done && S && (() => { try { return st.done(); } catch (e) { return false; } })()) { step++; skipAsk = false; }
    // ห้องหาย (หลุด/ออก) ระหว่างสอน → เลิกสอน
    if (startedAt && Date.now() - startedAt > 8000 && typeof code !== 'undefined' && !code && !S) { stop(); return; }
    paint();
  }
  // กันกดนอกจุดที่สอน (ตอนจอมืด) — ปุ่มของบทสอนกดได้เสมอ
  document.addEventListener('click', e => {
    if (!on) return; const st = STEPS[step]; if (!st) return;
    if (e.target.closest && e.target.closest('.tut-coach,.tut-skip')) return;
    const ready = !st.when || st.when(); if (!ready && !st.block) return;
    const ok = [...(st.spot && !st.block ? st.spot() : []), ...(st.extra ? st.extra() : [])].some(sel => sel && e.target.closest && e.target.closest(sel));
    if (!ok) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  function start() {
    if (on) return;
    if (typeof code !== 'undefined' && code) { toast('ออกจากห้องก่อนแล้วค่อยเริ่มบทสอน'); return; }
    on = true; step = 0; skipAsk = false; roomAsked = false; startedAt = Date.now();
    try { setSess(null); soloRoom = true; conn(); } catch (e) {}   // ไม่ตั้ง soloPending (แอปจะสร้างห้องเล่นคนเดียวแบบปกติแทน)
    const go1 = () => {
      if (!on) return;
      if (!sock || !sock.connected) return setTimeout(go1, 300);
      if (!code) { if (!roomAsked) { roomAsked = true; sock.emit('room:create', { name: (typeof nick !== 'undefined' && nick) || sv.name || 'ผู้เล่น', ch: myChar(), bg: myBg(), fr: myFrame(), tutorial: true, bots: true }); } return setTimeout(go1, 300); }
      if (!S) { sock.emit('game:start'); return; }
    };
    go1(); mount(); paint();
  }
  function stop() { on = false; unmount(); }
  async function finish(skipped) {
    stop();
    if (dbOn()) { try { const r = await DB.call('finish_tutorial', { p_skipped: !!skipped }); if (r && r.first && r.reward && r.reward.length) toast('🎓 รางวัลบทสอน: ' + r.reward.map(x => (window.Items ? Items.info(x.id).name : x.id) + ' ×' + x.qty).join(' · ')); DB.refresh().catch(() => {}); } catch (e) { toast(e.message); } }
    LS.set('dummyTutDone', '1');
    try { if (typeof code !== 'undefined' && code) leave(); else { screen = 'home'; render(); } } catch (e) {}
    if (heldDaily) { heldDaily = false; setTimeout(() => { try { if (window.openDaily) openDaily(); } catch (e) {} }, 1200); }
  }
  window.tutNext = () => { step++; skipAsk = false; paint(); };
  window.tutDone = () => finish(false);
  window.tutSkip = () => { if (!skipAsk) { skipAsk = true; paint(); setTimeout(() => { skipAsk = false; paint(); }, 3500); return; } finish(true); };

  // ---------- เด้งเองครั้งแรก (ผู้เล่นใหม่) ----------
  let checked = false;
  function autoStart() {
    if (checked || on || !dbOn() || typeof screen === 'undefined' || screen !== 'home' || (typeof code !== 'undefined' && code)) return;
    checked = true;
    DB.call('get_tutorial').then(t => { if (t && !t.seen && screen === 'home' && !code) start(); }).catch(() => {});
  }

  // ---------- 2) คำแนะนำสั้นตอนเล่นเกมอื่นครั้งแรก ----------
  const HINTS = {
    pokdeng: ['<b>ป๊อกเด้ง</b>: เราเล่นกับ<b>เจ้ามือ</b> ไม่แข่งกันเอง · แต้มคือ<b>หลักหน่วย</b>ของผลรวม (10 J Q K = 0)', '2 ใบแรกได้ <b>8 หรือ 9</b> = <b>ป๊อก</b> เปิดทันที! ไม่ป๊อกจะ<b>จั่วเพิ่ม 1 ใบ</b>หรือไม่ก็ได้', '<b>เด้ง</b> = ได้หลายเท่า: ดอกเดียวกัน/เลขเดียวกัน 2 ใบ = 2 เด้ง · ตอง 5 เด้ง'],
    gaogae: ['<b>เก้าเก</b>: ทุกคนลงกองกลาง รับไพ่ 3 ใบ แต้มคือ<b>หลักหน่วย</b>ของผลรวม (สูงสุด 9)', 'ถึงตาเรา: <b>หมอบ</b> · <b>สู้</b> · <b>ตาม</b> · <b>เกทับ</b> (สูงสุด 3 ครั้งต่อตา)', 'ไพ่สูงสุด: <b>ตอง</b> > เรียง > เซียน (K-Q-J) > สี > แต้ม · คนสุดท้ายที่ไม่หมอบชนะทันที'],
    somsip: ['<b>ผสมสิบ</b>: ถือไพ่ 5 ใบ ตาเรา<b>จั่ว</b>หรือ<b>เก็บใบที่คนก่อนหน้าทิ้ง</b> แล้วทิ้ง 1 ใบ', 'ต้องการ <b>3 คู่</b>: คู่ = รวมกันได้ 10 (A+9, 2+8, 3+7, 4+6, 5+5) หรือ 10-10 / J-J / Q-Q / K-K', 'ครบ 3 คู่ตอนถือ 6 ใบ กด <b>ผสมสิบ!</b> ชนะเลย · ไพ่ไวลด์แทนใบไหนก็ได้'],
    eekae: ['<b>อีแก่</b>: ระบบทิ้ง<b>คู่</b> (เลขเดียวกัน 2 ใบ) ให้อัตโนมัติ', 'ตาเรา: <b>จั่ว 1 ใบจากมือคนก่อนหน้า</b> (เห็นแต่หลังไพ่) ได้คู่ทิ้งทันที', 'ทิ้งหมดมือก่อน = รอด · คนสุดท้ายที่ถือ <b>Q เดี่ยว (อีแก่)</b> แพ้!'],
  };
  let hintRule = null, hintIdx = 0;
  function hintTick() {
    const el = document.getElementById('tutHint');
    if (on || typeof S === 'undefined' || !S || S.over || typeof screen === 'undefined' || screen !== 'game' || !HINTS[S.rule] || dealing()) { if (el && (!S || screen !== 'game')) { el.remove(); hintRule = null; } return; }
    if (hintRule !== S.rule) { if (LS.get('dummyHint:' + S.rule)) return; hintRule = S.rule; hintIdx = 0; }
    showHint();
  }
  function showHint() {
    let el = document.getElementById('tutHint');
    const list = HINTS[hintRule]; if (!list) return;
    if (hintIdx >= list.length) { LS.set('dummyHint:' + hintRule, '1'); if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'tutHint'; el.className = 'tut-hint'; document.body.appendChild(el); }
    const last = hintIdx === list.length - 1;
    const html = `<img class=tut-av src="${E(coachImg())}" alt=""><div class=tut-bub><div class=tut-txt>${list[hintIdx]}</div><div class=tut-bt><small>${hintIdx + 1}/${list.length}</small><button class=tut-next onclick="tutHintNext()">${last ? 'เข้าใจแล้ว ✓' : 'ถัดไป ▸'}</button></div></div>`;
    if (el.dataset.k !== hintRule + hintIdx) { el.innerHTML = html; el.dataset.k = hintRule + hintIdx; }
  }
  window.tutHintNext = () => { hintIdx++; showHint(); };

  // ---------- 3) คำแนะนำระบบนอกเกม (ครั้งเดียว) ----------
  function once(key, text) {
    if (on || LS.get('dummyTip:' + key) || document.getElementById('tutTip')) return false;
    LS.set('dummyTip:' + key, '1');
    const el = document.createElement('div'); el.id = 'tutTip'; el.className = 'tut-hint tip';
    el.innerHTML = `<img class=tut-av src="${E(coachImg())}" alt=""><div class=tut-bub><div class=tut-txt>${text}</div><div class=tut-bt><button class=tut-next onclick="this.closest('.tut-hint').remove()">เข้าใจแล้ว ✓</button></div></div>`;
    document.body.appendChild(el); return true;
  }
  const TIPS = [
    { key: 'ticket', test: P => P.inventory.some(i => i.kind === 'items' && /^ticket-/.test(i.item_id) && i.qty > 0), text: 'ได้<b>ตั๋วสุ่ม</b>แล้ว! 🎫 เอาไปสุ่มตู้ตัวละครได้ที่<b>ร้านค้า</b> (ตั๋วฟ้า = ตู้ธรรมดา · ตั๋วแดง = ตู้เรทอัป)' },
    { key: 'crate', test: P => P.inventory.some(i => i.kind === 'items' && /^crate-/.test(i.item_id) && i.qty > 0), text: 'ได้<b>กล่องเลือกของ</b>! 🎁 เปิดได้ที่<b>ช่องเก็บของ → ไอเทม</b> แล้วเลือกของที่อยากได้ 1 อย่าง' },
    { key: 'shards', test: P => P.inventory.some(i => i.kind === 'shards' && i.qty > 0), text: 'ได้<b>เศษตัวละคร</b>! 🧩 สะสมครบ <b>50 ชิ้น</b>ได้ตัวละครนั้นทันที · ซื้อเพิ่มได้ที่<b>ร้านประจำสัปดาห์</b>' },
  ];
  function tipTick() {
    if (on || !dbOn() || typeof screen === 'undefined' || screen !== 'home' || (typeof code !== 'undefined' && code)) return;
    if (!LS.get('dummyTutDone') && !checked) return;
    const P = DB.P; if (!P || !P.inventory) return;
    for (const t of TIPS) { if (!LS.get('dummyTip:' + t.key) && t.test(P)) { once(t.key, t.text); break; } }
  }
  // โหมดซ้อม (สตามิน่าไม่พอ) ครั้งแรก
  if (window.Progress && Progress.onWallet) { const _w = Progress.onWallet; Progress.onWallet = function (g) { const r = _w.apply(this, arguments); try { if (g && g.practice) setTimeout(() => once('practice', 'ตานี้เป็น<b>โหมดซ้อม</b> เพราะ<b>สตามิน่า</b>ไม่พอ ⚡ จึงไม่ได้รางวัล<br>สตามิน่าฟื้นเอง 1 หน่วยทุก 6 นาที หรือดื่ม<b>ชา</b>เติมได้'), 1500); } catch (e) {} return r; }; }

  setInterval(() => { try { tick(); autoStart(); hintTick(); tipTick(); } catch (e) {} }, 250);
  addEventListener('resize', () => { try { paint(); } catch (e) {} });
  window.Tutorial = { start, active: () => on, once, step: () => step };
})();
