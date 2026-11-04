/* create-room.js — หน้าตั้งค่าห้อง (เล่นคนเดียว / สร้างห้อง / หาแมตช์): เลือกเกม · ตัวเลือกกติกา · บอท · ปุ่มเริ่ม
   รายการกฎ/ตัวเลือกมาจากเซิร์ฟเวอร์ (rules:list) — เพิ่มกฎใหม่ที่ server/src/rules ไม่ต้องแก้ไฟล์นี้
   Public: openCreate(mode) · solo() · setRule(id) · setOpt · setOptNum · fixOpt · setBots · ruleMeta(id) · ruleOpts(meta) · createView() · startCreate() */
// ===== กฎเกม: รายการกฎ/ตัวเลือกมาจากเซิร์ฟเวอร์ (rules:list) หน้านี้สร้างจาก meta ล้วน ๆ — เพิ่มกฎใหม่ที่ server/src/rules ไม่ต้องแก้ client =====
function loadCreateSel() {
  try {
    const v = JSON.parse(localStorage.getItem('dummyCreate') || 'null');
    if (v && v.rule) return { rule: String(v.rule), options: v.options && typeof v.options === 'object' ? v.options : {} };
  } catch (e) {}
  return { rule: 'dummy', options: {} };
}
const saveCreate = () => {
  try {
    localStorage.setItem('dummyCreate', JSON.stringify(createSel));
  } catch (e) {}
};
// ห้องที่สร้างเอง (ไม่ใช่เล่นคนเดียว) เลือกได้ว่าจะเติมบอทในที่นั่งว่างหรือไม่ — ค่านี้แยกเก็บเอง ไม่ผูกกับ createSel (คงอยู่ข้ามการเปลี่ยนเกม)
let createBots = (() => {
  try {
    return localStorage.getItem('dummyBots') !== '0';
  } catch (e) {
    return true;
  }
})();
function setBots(v) {
  createBots = !!v;
  try {
    localStorage.setItem('dummyBots', v ? '1' : '0');
  } catch (e) {}
  render();
}
const ruleMeta = id => RULES.find(r => r.id === id) || RULES[0] || null;
function ruleOpts(m) {
  const o = {};
  (m.options || []).forEach(d => {
    const v = createSel.options[d.key];
    o[d.key] = v == null || v === '' ? d.default : v;
  });
  return o;
}
function openCreate(mode) {
  createMode = mode;
  joinOpen = false;
  conn();
  if (sock && sock.connected && !RULES.length) sock.emit('rules:get');
  go('create');
}
function solo() {
  openCreate('solo');
}
function setRule(id) {
  createSel = { rule: id, options: {} };
  saveCreate();
  render();
}
function setOpt(k, v) {
  createSel.options[k] = v;
  saveCreate();
  render();
}
function setOptNum(k, v) {
  createSel.options[k] = v;
  saveCreate();
  const m = ruleMeta(createSel.rule),
    el = $('scoreSum');
  if (m && el) el.innerHTML = scoreHtml(m);
}
function fixOpt(k) {
  const m = ruleMeta(createSel.rule),
    d = m && (m.options || []).find(x => x.key === k);
  if (!d) return;
  let v = Number(createSel.options[k]);
  if (!Number.isFinite(v)) v = d.default;
  createSel.options[k] = Math.min(d.max, Math.max(d.min, Math.round(v)));
  saveCreate();
  render();
}
// แทน {stake} / {stake*0.75} ในข้อความสรุปการนับเหรียญของกฎ
const scoreHtml = m => {
  const v = ruleOpts(m).stake,
    st = Number(v == null ? 20 : v);
  return `<p class=rule-desc>🪙 จบตาได้เหรียญตามอันดับ (ที่ 1 ได้มากสุด · แพ้ก็ได้ ไม่มีเสีย) · ชิปด้านล่างใช้จัดอันดับในตา</p><ul>${(m.scoring || []).map(t => `<li>${esc(t.replace(/\{stake(?:\*([\d.]+))?\}/g, (_, k) => (Number.isFinite(st) ? Math.round(st * (k ? +k : 1)) + ' ชิป' : '?')))}</li>`).join('')}</ul>`;
};
const howtoHtml = m =>
  m.howto && m.howto.length
    ? `<details class=howto><summary>📖 วิธีเล่น${esc(m.name || '')}</summary><ol>${m.howto.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>`
    : '';
createSel = loadCreateSel(); // เกม/ตัวเลือกที่เลือกไว้ครั้งก่อน
function createView() {
  const m = ruleMeta(createSel.rule),
    solo_ = createMode === 'solo',
    match_ = createMode === 'match';
  if (!m)
    return page2(
      solo_ ? 'เล่นคนเดียว' : match_ ? 'หาแมตช์' : 'สร้างห้อง',
      `${connStatus()}<p class=note>${lerr ? '⚠️ ' + esc(lerr) : '⏳ กำลังโหลดกฎเกมจากเซิร์ฟเวอร์... ครั้งแรกอาจใช้เวลาราว 1 นาที'}</p>`,
      'play'
    );
  if (m.id !== createSel.rule) createSel = { rule: m.id, options: {} };
  const o = ruleOpts(m);
  const opts = (m.options || [])
    .map(d => {
      if (d.type === 'number')
        return `<div class=opt><label>${esc(d.label)}</label><input type=number inputmode=numeric min=${d.min} max=${d.max} step=${d.step || 1} value="${esc(o[d.key])}" oninput="setOptNum('${esc(d.key)}',this.value)" onchange="fixOpt('${esc(d.key)}')"><div class=chips>${(d.presets || []).map(v => `<button class="chip${+o[d.key] === v ? ' on' : ''}" onclick="setOpt('${esc(d.key)}',${v})">${v}</button>`).join('')}</div></div>`;
      if (d.type === 'select')
        return `<div class=opt><label>${esc(d.label)}</label><div class=chips>${(d.choices || []).map(c => `<button class="chip${o[d.key] === c.v ? ' on' : ''}" onclick="setOpt('${esc(d.key)}','${esc(c.v)}')">${esc(c.label)}</button>`).join('')}</div></div>`;
      return '';
    })
    .join('');
  const botOpt =
    solo_ || match_
      ? ''
      : `<h3 class=sec>🤖 บอท</h3><div class=opt><label>ที่นั่งว่างในห้อง</label><div class=chips><button class="chip${createBots ? ' on' : ''}" onclick="setBots(true)">เติมบอทให้เล่น</button><button class="chip${!createBots ? ' on' : ''}" onclick="setBots(false)">รอผู้เล่นจริงเท่านั้น</button></div><small class=hint>${createBots ? 'ที่นั่งที่ไม่มีคนเข้า บอทจะเล่นแทนให้ครบ 4 คน' : 'ไม่เติมบอท ต้องมีเพื่อนเข้าห้องจริงอย่างน้อย 2 คนถึงจะเริ่มเกมได้'}</small></div>`;
  // จัดเป็นคอลัมน์ (เกม+ตั้งค่า · ฟาร์ม · รางวัล+ปุ่มเริ่ม) — จอเตี้ยแผ่ออกด้านข้าง แต่ละคอลัมน์เลื่อนในตัวเอง ปุ่มเริ่มอยู่ล่างคอลัมน์สุดท้ายเสมอ
  const farm = window.Farm && (solo_ || (!match_ && createBots)) ? Farm.section() : '';
  const col = (cls, html) => `<section class="cr-col ${cls}">${html}</section>`;
  page2(
    solo_ ? 'เล่นคนเดียว' : match_ ? 'หาแมตช์' : 'สร้างห้อง',
    `${connStatus()}<div class="panel cr${farm ? ' cr3' : ''}">${col('cr-set', `<h3 class=sec>🎴 เกมที่เลือก</h3><div class=gcur-w><button class=gcur onclick="rvPickGame(event)"><span>${esc(m.icon || '🂠')}</span><b>${esc(m.name)}</b><small>เปลี่ยนเกม ▾</small></button></div><p class=rule-desc>${esc(m.desc || '')}</p>${howtoHtml(m)}<h3 class=sec>⚙️ ตั้งค่าห้อง</h3>${opts}${botOpt}`)}${farm ? col('cr-farm', farm) : ''}${col('cr-go', `<div class=cr-scroll><h3 class=sec>📋 รางวัลและการนับชิป</h3><div id=scoreSum class=score-sum>${scoreHtml(m)}</div></div><button class="wbtn go" onclick="startCreate()">${solo_ ? '▶ เริ่มเล่นกับบอท' : match_ ? '🔍 ค้นหาแมตช์' : '🏠 สร้างห้อง'}</button>`)}</div>`,
    'play'
  );
}
// กดปุ่มยืนยันในหน้าสร้างห้อง: เล่นคนเดียว = สร้างห้องส่วนตัวเล่นกับบอท / สร้างห้อง = ห้องออนไลน์
function startCreate() {
  if (!ruleMeta(createSel.rule)) return;
  if (createMode === 'match') {
    soloRoom = false;
    conn();
    if (sock && sock.connected && typeof matchFind === 'function') matchFind();
    else {
      lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์';
      render();
    }
    return;
  } // Find Match (ดู match-ui.js)
  if (createMode === 'solo') {
    setSess(null);
    soloPending = true;
    soloRoom = true;
    conn();
    if (sock && sock.connected && !code) mk();
    render();
  } else {
    soloRoom = false;
    conn();
    if (sock && sock.connected) mk();
    else {
      lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์';
      render();
    }
  }
}
