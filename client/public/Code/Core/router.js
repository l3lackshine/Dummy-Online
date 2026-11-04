/* router.js — เปลี่ยนหน้า + วาดหน้าจอ: go(screen) → render() → หน้าที่ตรงกับ screen
   ไฟล์อื่นต่อยอดด้วยการห่อ window.render (เช่น battlepass.js, ranked.js) — ห้ามเปลี่ยนชื่อ render/renderGame
   Public: go(screen) · render() · renderGame() · page2(title, body, back) · hud(back) · wrap(html) · connStatus() · lobbyView()
   EXTEND: หน้าใหม่ = สร้างไฟล์ของหน้านั้น แล้วห่อ render() (ดูตัวอย่าง Code/Ranked/ranked.js) ไม่ต้องแก้ไฟล์นี้ */
const go = s => {
  screen = s;
  shopNote = '';
  render();
};
const wrap = b => {
  $('app').innerHTML = `<div class=page><div class=box>${b}</div></div>`;
};
const hud = back =>
  `<div class=hud>${back ? `<button class=hud-back onclick="go('${back}')" aria-label="ย้อนกลับ">‹</button>` : `<button class=hud-who onclick="go('profile')"><span class=hud-av>${avFace(sv.name, myChar())}</span><b>${esc(sv.name || '')}</b></button>`}${window.Stamina ? Stamina.pill() : ''}<span class=coin-pill>🪙 ${sv.coins}</span>${window.DB && DB.enabled ? `<span class="coin-pill mc-pill" title="MCash">💎 ${sv.mcash || 0}</span>` : ''}</div>`;
const pgKind = b =>
  b.includes('class=plank')
    ? 'play'
    : b.includes('gtiles')
      ? 'games'
      : b.includes('scoreSum')
        ? 'create'
        : b.includes('class=ksec')
          ? b.includes('namebox')
            ? 'profile'
            : 'shop'
          : '';
const page2 = (title, body, back = 'home') => {
  $('app').className = '';
  $('app').innerHTML =
    `<div class=pg data-pg="${pgKind(body)}">${hud(back)}<div class=pg-title><span>${title}</span></div><div class=pg-body>${body}</div></div>`;
};
function connStatus() {
  // แสดงสถานะที่หน้าแรก: กำลังเชื่อมต่อ / เชื่อมต่อไม่ได้ (เดิมไม่แสดงอะไร ทำให้ดูเหมือนกดแล้วเข้าเล่นไม่ได้)
  const w = soloPending || (soloRoom && !S),
    e = lerr ? '⚠️ ' + esc(lerr) : '';
  if (!w && !e) return '';
  return `<p class=cstat>${w ? '⏳ กำลังเข้าเกม... เซิร์ฟเวอร์ฟรีอาจหลับอยู่ ครั้งแรกใช้เวลาราว 1 นาที กรุณารอ' : ''}${w && e ? '<br>' : ''}${e}</p>`;
}
function lobbyView() {
  if (screen === 'home') return homeView();
  if (screen === 'games' && !code) {
    screen = 'play';
    return playView();
  }
  if (screen === 'shop') return shopView();
  if (screen === 'profile') return profileView();
  if (screen === 'create' && !code) return createView();
  if (screen === 'play' || (screen === 'lobby' && !code)) return playView();
  conn();
  tableView();
}
function render() {
  // ช่วงแจกไพ่: วาดโต๊ะว่างครั้งเดียว แล้วอัปเดตเฉพาะจุด (ไม่วาดทับ เพื่อให้ไพ่ที่กำลังบินไม่หาย)
  if (deal && screen === 'game' && S) {
    if (!deal.built) {
      const real = S;
      S = dealView(real);
      try {
        renderGame();
      } finally {
        S = real;
      }
      deal.built = true;
      dealBegin();
    }
    return;
  }
  renderGame();
}
function renderGame() {
  if (!authed) return authView();
  if (screen !== 'game' || !S) return lobbyView();
  if (S.rule && S.rule !== 'dummy' && window.renderOther) return renderOther();
  renderDummyTable(); // โต๊ะดัมมี่ (Table/dummy-table.js)
}
