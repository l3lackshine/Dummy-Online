/* skins.js — ทะเบียนของแต่ง (SKIN_REGISTRY จาก skin/skins.json) · ของที่มี/ใส่อยู่ · ใช้ธีมกับหน้าเว็บ · รูปตัวละครย่อ
   Public: SKIN_REGISTRY · KINDS · applyTheme() · equipped(kind) · equip(kind, id) · owned · price · mprice
           myChar() · myFrame() · myBg() · av(name, ch) · avFace(name, ch) · bgCss(id) · backCss(item)
   EXTEND: ของแต่งชนิดใหม่ = เพิ่มแถวใน KINDS (+ localStorage key) แล้วใส่ค่า CSS ใน applyTheme() */
const DEFAULT_SKINS = {
  themes: [
    {
      id: 'classic',
      n: 'คลาสสิก (เขียว)',
      price: 0,
      card: '#fbf7ec',
      blk: '#1b1b1b',
      red: '#c0282d',
      edge: '#cfc7b0',
      b1: '#7a1f2b',
      b2: '#5d1520',
      bg: '#0f3d2a',
      bg2: '#0b2e20',
    },
    {
      id: 'midnight',
      n: 'มิดไนท์',
      price: 200,
      card: '#243153',
      blk: '#e6ebfa',
      red: '#ff8a98',
      edge: '#4a5c92',
      b1: '#4057a3',
      b2: '#2b3b72',
      bg: '#0c1226',
      bg2: '#080c1a',
    },
    {
      id: 'sakura',
      n: 'ซากุระ',
      price: 400,
      card: '#fff1f5',
      blk: '#3b2a35',
      red: '#d6336c',
      edge: '#f3b6cb',
      b1: '#f06595',
      b2: '#c2255c',
      bg: '#4a1f3a',
      bg2: '#35142a',
    },
    {
      id: 'gold',
      n: 'ทองคำ',
      price: 700,
      card: '#fff4d6',
      blk: '#33250a',
      red: '#a4161a',
      edge: '#d9b45a',
      b1: '#c9971c',
      b2: '#8a6508',
      bg: '#2e2410',
      bg2: '#1f180a',
    },
  ],
  characters: [{ id: 'emoji', name: 'อีโมจิเริ่มต้น', asset: '' }],
  backs: [{ id: 'classic-red', name: 'คลาสสิกแดง', price: 0, b1: '#7a1f2b', b2: '#5d1520' }],
  tables: [{ id: 'green-felt', name: 'โต๊ะผ้าสักหลาด', asset: '', bg: '#0f3d2a', bg2: '#0b2e20' }],
  backgrounds: [
    { id: 'sunset', name: 'พระอาทิตย์ตก', asset: '', css: 'linear-gradient(180deg,#2b2160 0%,#7a3b78 55%,#d9774f 100%)' },
  ],
  cards: [
    { id: 'classic-card', name: 'ไพ่คลาสสิก', asset: '', card: '#fbf7ec', blk: '#1b1b1b', red: '#c0282d', edge: '#cfc7b0' },
  ],
};
let SKIN_REGISTRY = DEFAULT_SKINS,
  TH = DEFAULT_SKINS.themes;
fetch('./skin/skins.json')
  .then(r => (r.ok ? r.json() : DEFAULT_SKINS))
  .then(v => {
    SKIN_REGISTRY = v;
    TH = Array.isArray(v.themes) && v.themes.length ? v.themes : DEFAULT_SKINS.themes;
    applyTheme();
    render();
  })
  .catch(() => {});
function applyTheme() {
  const t = TH.find(x => x.id == sv.eq) || TH[0],
    s = document.documentElement.style;
  for (const k of ['card', 'blk', 'red', 'edge', 'b1', 'b2', 'bg', 'bg2']) if (t && t[k]) s.setProperty('--' + k, t[k]);
  const pk = (kind, store) => {
    const l = SKIN_REGISTRY[kind] || [];
    return l.find(x => x.id === localStorage.getItem(store)) || l[0];
  };
  const table = pk('tables', 'dummyTableSkin'),
    dock = pk('docks', 'dummyDockSkin'),
    cards = pk('cards', 'dummyCardSkin'),
    back = pk('backs', 'dummyBackSkin'),
    room = pk('backgrounds', 'dummyBackgroundSkin');
  if (table) {
    if (table.bg) s.setProperty('--bg', table.bg);
    if (table.bg2) s.setProperty('--bg2', table.bg2);
    table.asset ? s.setProperty('--table-image', `url('${assetUrl(table.asset)}')`) : s.removeProperty('--table-image');
  }
  if (dock) {
    s.setProperty(
      '--dock-bg',
      dock.panelAsset ? `url('${assetUrl(dock.panelAsset)}') center/100% 100% no-repeat` : dock.panel || 'none'
    );
    s.setProperty('--dock-border', dock.border || 'transparent');
    s.setProperty('--btn-img', dock.buttonAsset ? `url('${assetUrl(dock.buttonAsset)}')` : 'none');
    const b = dock.buttons || {};
    for (const k of ['blue', 'org', 'grn', 'g', 'tool']) (b[k] || []).forEach((v, i) => s.setProperty(`--b-${k}-${i + 1}`, v));
  }
  if (cards) {
    for (const k of ['card', 'blk', 'red', 'edge']) if (cards[k]) s.setProperty('--' + k, cards[k]);
    cards.asset ? s.setProperty('--card-image', `url('${assetUrl(cards.asset)}')`) : s.removeProperty('--card-image');
  }
  if (back)
    s.setProperty(
      '--back-img',
      back.asset
        ? `url('${assetUrl(back.asset)}')`
        : `repeating-linear-gradient(45deg,${back.b1 || '#7a1f2b'},${back.b1 || '#7a1f2b'} 4px,${back.b2 || '#5d1520'} 4px,${back.b2 || '#5d1520'} 8px)`
    );
  if (room) {
    s.setProperty(
      '--page-background',
      room.asset ? `url('${assetUrl(room.asset)}') center/cover no-repeat` : room.css || '#2a1a10'
    );
    s.setProperty(
      '--page-wide',
      room.asset ? `url('${assetUrl(room.asset)}') center 58%/cover no-repeat` : room.css || '#2a1a10'
    );
  }
  document.documentElement.dataset.characterSkin = myChar() || 'emoji';
}
const AV = ['😎', '🤠', '🧑‍🎤', '👧', '🦊', '🐱', '🐰', '🐻'];
const myChar = () => equipped('characters') || null;
const myFrame = () => {
  if (typeof skCharFrameOn === 'function' && skCharFrameOn()) return 'char';
  const f = equipped('frames');
  return f && f !== 'none' ? f : null;
}; // 'char' = ขอใช้กรอบประจำตัวละคร (ปลด 4★ · เซิร์ฟเวอร์ตรวจดาว) // กรอบการ์ดที่ใส่อยู่ (ทุกคนในห้องเห็น)
const av = (n, ch) => {
  const skin = (SKIN_REGISTRY.characters || []).find(x => x.id === ch);
  if (skin && skin.asset) return `<img class=avatar-img src="${esc(skin.asset)}" alt="${esc(skin.name || 'ตัวละคร')}">`;
  let h = 0;
  for (const k of String(n)) h = (h * 31 + k.charCodeAt(0)) | 0;
  return AV[Math.abs(h) % AV.length];
};
// รูปหน้าแบบวงกลม (HUD / โปรไฟล์ / หน้าสรุป): ซูมไปที่หน้าตามกรอบ "table" ใน Character.config — รูปเต็มตัวทุกขนาดได้หน้าขนาดใกล้กัน
const avFace = (n, ch) => {
  const s = (SKIN_REGISTRY.characters || []).find(x => x.id === ch);
  if (!(s && s.asset)) return av(n, ch);
  const t = s.table || {},
    c = (v, d, a, b) => {
      v = Number(v);
      return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
    };
  return `<span class=av-fc style="--fx:${c(t.x, 0.5, 0, 1)};--fy:${c(t.top, 0, 0, 0.9)};--fz:${c(t.show, 0.4, 0.15, 1)}"><img class=avatar-img src="${esc(s.asset)}" alt="${esc(s.name || 'ตัวละคร')}"></span>`;
};
const myBg = () => equipped('backgrounds') || null;
const bgCss = id => {
  const b = (SKIN_REGISTRY.backgrounds || []).find(x => x.id === id);
  if (!b) return '';
  return `background:${b.asset ? `url('${b.asset}') center/cover` : b.css || 'none'};--ink:${b.ink || '#fff'};`;
};
const KINDS = [
  ['characters', 'ตัวละคร', 'dummyCharacterSkin', '🧑'],
  ['backs', 'หลังไพ่', 'dummyBackSkin', '🂠'],
  ['tables', 'สกินโต๊ะ', 'dummyTableSkin', '🎴'],
  ['backgrounds', 'พื้นหลัง', 'dummyBackgroundSkin', '🖼️'],
  ['frames', 'กรอบการ์ด', 'dummyFrameSkin', '🌸'],
];
const price = x => Number(x && x.price) || 0;
const mprice = x => Number(x && x.mcash) || 0; // ราคา MCash (ไม่ใส่ = ไม่ขายด้วย MCash)
const owned = (kind, x) => (price(x) <= 0 && mprice(x) <= 0) || sv.own.includes(kind + ':' + x.id);
function equipped(kind) {
  const k = KINDS.find(z => z[0] === kind),
    l = SKIN_REGISTRY[kind] || [],
    c = localStorage.getItem(k[2]);
  const x = l.find(y => y.id === c && owned(kind, y)) || l.find(y => owned(kind, y)) || l[0];
  return x ? x.id : null;
}
function equip(kind, id) {
  const k = KINDS.find(z => z[0] === kind),
    x = (SKIN_REGISTRY[kind] || []).find(y => y.id === id);
  if (!k || !x || !owned(kind, x)) return;
  localStorage.setItem(k[2], id);
  if (window.DB && DB.enabled) DB.equip(kind, id);
  applyTheme();
  render();
}
const backCss = x =>
  x.asset
    ? `url('${x.asset}') center/cover no-repeat`
    : `repeating-linear-gradient(45deg,${x.b1 || '#7a1f2b'},${x.b1 || '#7a1f2b'} 4px,${x.b2 || '#5d1520'} 4px,${x.b2 || '#5d1520'} 8px)`;
