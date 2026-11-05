/* home.js — หน้าแรกแบบเดิม + หน้าเล่นเกม (เลือกเกม · เล่นคนเดียว · สร้างห้อง · หาแมตช์ · แรงก์ · เข้าห้องด้วยรหัส)
   หน้าแรกแบบใหม่วาดทับโดย Code/Home/home-rov.js
   Public: homeView() · goPlay() · chooseGame(id) · toggleJoin() · playView() */
// เลขเวอร์ชันไม่รวมคำว่า Beta (client = 'Beta 0.13.0' · เซิร์ฟเวอร์ package.json = '0.13.0' ถือว่าตรงกัน)
const bareVersion = v => String(v || '').replace(/^beta\s*/i, '');

let joinOpen = false,
  joinCode = ''; // ช่องใส่รหัสห้องในหน้าเล่นเกม
function homeView() {
  const ch = (SKIN_REGISTRY.characters || []).find(x => x.id === myChar());
  $('app').className = 'home';
  $('app').innerHTML =
    `<div class=scene>${hud()}${ch && ch.asset ? `<img class=hero src="${esc(ch.asset)}" alt="">` : ''}<nav class=signs aria-label="เมนูหลัก"><button class="sign s-play" onclick="goPlay()" aria-label="เล่นเกม"><img src="./Assets/UI/Assets/sign-play.webp" alt="เล่นเกม"></button><button class="sign s-shop" onclick="go('shop')" aria-label="ร้านค้า"><img src="./Assets/UI/Assets/sign-shop.webp" alt="ร้านค้า"></button><button class="sign s-prof" onclick="go('profile')" aria-label="โปรไฟล์"><img src="./Assets/UI/Assets/sign-profile.webp" alt="โปรไฟล์"></button></nav>${connStatus()}<span class=ver>v${esc(APP_VER || '?')}${SRV_VER && bareVersion(SRV_VER) !== bareVersion(APP_VER) ? ' · เซิร์ฟเวอร์ v' + esc(SRV_VER) : ''}</span></div>`;
}
// ปุ่มเริ่มเล่น → หน้าเล่นเกมของเกมที่เลือกไว้ทันที (เปลี่ยนเกมได้จากป้ายบนปุ่มเริ่มเล่น หรือปุ่ม "เปลี่ยนเกม" ในหน้าเล่นเกม)
function goPlay() {
  joinOpen = false;
  conn();
  if (sock && sock.connected && !RULES.length) sock.emit('rules:get');
  if (RULES.length && !ruleMeta(createSel.rule)) setRule(RULES[0].id);
  go('play');
}
// ===== เลือกเกม: รายการเกมมาจาก RULES ที่เซิร์ฟเวอร์ส่งมา (เปลี่ยนได้จากป้ายบนปุ่มเริ่มเล่น / ปุ่มเปลี่ยนเกม → rvPickGame ใน home-rov.js) =====
function chooseGame(id) {
  if (!ruleMeta(id)) return;
  setRule(id);
  joinOpen = false;
  go('play');
}
function toggleJoin() {
  joinOpen = !joinOpen;
  render();
  if (joinOpen) {
    const i = $('cd');
    if (i) i.focus();
  }
}
function playView() {
  conn();
  const plank = (fn, t, s) => `<button class=plank onclick="${fn}"><b>${t}</b><small>${s}</small></button>`;
  const gm = ruleMeta(createSel.rule),
    gh = gm
      ? `<div class=gcur-w><button class=gcur onclick="rvPickGame(event)"><span>${esc(gm.icon || '🂠')}</span><b>${esc(gm.name)}</b><small>เปลี่ยนเกม ▾</small></button><button class=tut-open onclick="window.Tutorial&&Tutorial.start()">🎓 สอนเล่นดัมมี่</button></div>`
      : `<p class=note>${lerr ? '⚠️ ' + esc(lerr) : '⏳ กำลังโหลดรายการเกมจากเซิร์ฟเวอร์... ครั้งแรกอาจใช้เวลาราว 1 นาที'}</p>`;
  page2(
    'เล่นเกม',
    `${gh}${connStatus()}${plank('solo()', 'เล่นคนเดียว', 'เล่นกับบอท 3 คน')}${plank("openCreate('room')", 'สร้างห้อง', 'เลือกไพ่ ตั้งเดิมพัน ชวนเพื่อน')}${plank("openCreate('match')", '🔍 หาแมตช์', 'จับคู่ผู้เล่นออนไลน์อัตโนมัติ')}${plank('rankedFind()', '🏆 แรงก์', 'จับคู่คนจริงล้วน · นับตารางอันดับ')}${plank('toggleJoin()', 'เข้าห้อง', 'ใส่รหัสห้องจากเพื่อน')}${joinOpen ? `<div class=joinbox><input id=cd placeholder="รหัสห้อง" maxlength=6 autocapitalize=characters autocomplete=off value="${esc(joinCode)}" oninput="joinCode=this.value"><button class="wbtn go" onclick=jn()>เข้าห้อง</button></div>` : ''}${lerr && !soloRoom ? `<p class=note>${esc(lerr)}</p>` : ''}`,
    'home'
  );
}
