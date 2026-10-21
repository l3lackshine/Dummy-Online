const CFG = window.DUMMY_CONFIG || {}, $ = id => document.getElementById(id);
// ปลุกเซิร์ฟเวอร์ (Render ฟรีจะหลับเมื่อไม่มีคนใช้) ตั้งแต่เปิดหน้าเว็บ เพื่อไม่ให้ต้องรอตอนกดเล่น
if (CFG.BACKEND_URL) { try { fetch(CFG.BACKEND_URL.replace(/\/$/, '') + '/health', { mode: 'no-cors' }).catch(() => {}); } catch (e) {} }
const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL = Array.from({ length: 52 }, (_, i) => ({ id: i, r: i % 13 + 1, s: (i / 13) | 0 }));
const sp = c => (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0), cn = c => RK[c.r] + SU[c.s];
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
let screen = 'home', ho = [], sel = new Set(), sm = 0, paid = false, coinDelta = 0, prevM = 0, prevD = 0, hint = '', lerr = '';
let sv = { name: localStorage.getItem('dummyName') || 'ผู้เล่น', coins: Number(localStorage.getItem('dummyCoins') || '5000'), own: JSON.parse(localStorage.getItem('dummyOwned') || '[\"classic\"]'), eq: localStorage.getItem('dummySkin') || 'classic' }, nick = localStorage.getItem('dummyName') || 'ผู้เล่น';
let shufAnim = null, shufTimer = null;
const APP_VER = String(window.DUMMY_VERSION || ''); // เลขเวอร์ชันของ client (ตั้งที่ client/public/version.js)
let RULES = [], SRV_VER = '', createMode = 'room', createSel = loadCreateSel(), deal = null, dealtGid = null;
let authed = true, aerr = '', S = null, lob = null, tok = null, code = '', isHost = false, sock = null, noio = false, soloPending = false, soloRoom = false;
const DEFAULT_SKINS={themes:[
{id:'classic',n:'คลาสสิก (เขียว)',price:0,card:'#fbf7ec',blk:'#1b1b1b',red:'#c0282d',edge:'#cfc7b0',b1:'#7a1f2b',b2:'#5d1520',bg:'#0f3d2a',bg2:'#0b2e20'},
{id:'midnight',n:'มิดไนท์',price:200,card:'#243153',blk:'#e6ebfa',red:'#ff8a98',edge:'#4a5c92',b1:'#4057a3',b2:'#2b3b72',bg:'#0c1226',bg2:'#080c1a'},
{id:'sakura',n:'ซากุระ',price:400,card:'#fff1f5',blk:'#3b2a35',red:'#d6336c',edge:'#f3b6cb',b1:'#f06595',b2:'#c2255c',bg:'#4a1f3a',bg2:'#35142a'},
{id:'gold',n:'ทองคำ',price:700,card:'#fff4d6',blk:'#33250a',red:'#a4161a',edge:'#d9b45a',b1:'#c9971c',b2:'#8a6508',bg:'#2e2410',bg2:'#1f180a'}],
characters:[{id:'emoji',name:'อีโมจิเริ่มต้น',asset:''}],
backs:[{id:'classic-red',name:'คลาสสิกแดง',price:0,b1:'#7a1f2b',b2:'#5d1520'}],
tables:[{id:'green-felt',name:'โต๊ะผ้าสักหลาด',asset:'',bg:'#0f3d2a',bg2:'#0b2e20'}],
backgrounds:[{id:'sunset',name:'พระอาทิตย์ตก',asset:'',css:'linear-gradient(180deg,#2b2160 0%,#7a3b78 55%,#d9774f 100%)'}],
cards:[{id:'classic-card',name:'ไพ่คลาสสิก',asset:'',card:'#fbf7ec',blk:'#1b1b1b',red:'#c0282d',edge:'#cfc7b0'}]};
let SKIN_REGISTRY=DEFAULT_SKINS, TH=DEFAULT_SKINS.themes;
fetch('./skin/skins.json').then(r=>r.ok?r.json():DEFAULT_SKINS).then(v=>{SKIN_REGISTRY=v;TH=Array.isArray(v.themes)&&v.themes.length?v.themes:DEFAULT_SKINS.themes;applyTheme();render()}).catch(()=>{});
const save=()=>{localStorage.setItem('dummyCoins',sv.coins);localStorage.setItem('dummyOwned',JSON.stringify(sv.own));localStorage.setItem('dummySkin',sv.eq);localStorage.setItem('dummyName',sv.name||nick);window.cloudPush&&cloudPush()};
function setNick(v){nick=String(v||'').trim().slice(0,14)||'ผู้เล่น';sv.name=nick;save()}
function applyTheme(){const t=TH.find(x=>x.id==sv.eq)||TH[0],s=document.documentElement.style;for(const k of['card','blk','red','edge','b1','b2','bg','bg2'])if(t&&t[k])s.setProperty('--'+k,t[k]);const pk=(kind,store)=>{const l=SKIN_REGISTRY[kind]||[];return l.find(x=>x.id===localStorage.getItem(store))||l[0]};const table=pk('tables','dummyTableSkin'),dock=pk('docks','dummyDockSkin'),cards=pk('cards','dummyCardSkin'),back=pk('backs','dummyBackSkin'),room=pk('backgrounds','dummyBackgroundSkin');if(table){if(table.bg)s.setProperty('--bg',table.bg);if(table.bg2)s.setProperty('--bg2',table.bg2);table.asset?s.setProperty('--table-image',`url('${table.asset}')`):s.removeProperty('--table-image')}if(dock){s.setProperty('--dock-bg',dock.panelAsset?`url('${dock.panelAsset}') center/100% 100% no-repeat`:(dock.panel||'none'));s.setProperty('--dock-border',dock.border||'transparent');s.setProperty('--btn-img',dock.buttonAsset?`url('${dock.buttonAsset}')`:'none');const b=dock.buttons||{};for(const k of['blue','org','grn','g','tool'])(b[k]||[]).forEach((v,i)=>s.setProperty(`--b-${k}-${i+1}`,v))}if(cards){for(const k of['card','blk','red','edge'])if(cards[k])s.setProperty('--'+k,cards[k]);cards.asset?s.setProperty('--card-image',`url('${cards.asset}')`):s.removeProperty('--card-image')}if(back)s.setProperty('--back-img',back.asset?`url('${back.asset}')`:`repeating-linear-gradient(45deg,${back.b1||'#7a1f2b'},${back.b1||'#7a1f2b'} 4px,${back.b2||'#5d1520'} 4px,${back.b2||'#5d1520'} 8px)`);if(room){s.setProperty('--page-background',room.asset?`url('${room.asset}') center/cover no-repeat`:(room.css||'#2a1a10'));s.setProperty('--page-wide',room.asset?`url('${room.asset}') center 58%/cover no-repeat`:(room.css||'#2a1a10'))}document.documentElement.dataset.characterSkin=myChar()||'emoji'}
const go=s=>{screen=s;shopNote='';render()};
const wrap=b=>{$('app').innerHTML=`<div class=page><div class=box>${b}</div></div>`};
const AV=['😎','🤠','🧑‍🎤','👧','🦊','🐱','🐰','🐻'];
const myChar=()=>equipped('characters')||null;
const av=(n,ch)=>{const skin=(SKIN_REGISTRY.characters||[]).find(x=>x.id===ch);if(skin&&skin.asset)return `<img class=avatar-img src="${esc(skin.asset)}" alt="${esc(skin.name||'ตัวละคร')}">`;let h=0;for(const k of String(n))h=(h*31+k.charCodeAt(0))|0;return AV[Math.abs(h)%AV.length]};
const myBg=()=>equipped('backgrounds')||null;
const bgCss=id=>{const b=(SKIN_REGISTRY.backgrounds||[]).find(x=>x.id===id);if(!b)return '';return `background:${b.asset?`url('${b.asset}') center/cover`:(b.css||'none')};--ink:${b.ink||'#fff'};`};

function mv(d){if(!sel.size)return;const o=d<0?ho:[...ho].reverse();for(let i=1;i<o.length;i++)if(sel.has(o[i])&&!sel.has(o[i-1]))[o[i-1],o[i]]=[o[i],o[i-1]];ho=d<0?o:o.reverse();render()}
function srt(){sm^=1;ho.sort((a,b)=>sm?(ALL[a].s-ALL[b].s||ALL[a].r-ALL[b].r):(ALL[a].r-ALL[b].r||ALL[a].s-ALL[b].s));render()}
// ===== UI v6: หน้าแรกใหม่ + หน้าเล่นเกม / ร้านค้า / โปรไฟล์ =====
let shopNote = '', joinOpen = false, joinCode = '';
const KINDS = [['characters', 'ตัวละคร', 'dummyCharacterSkin', '🧑'], ['backs', 'หลังไพ่', 'dummyBackSkin', '🂠'], ['tables', 'สกินโต๊ะ', 'dummyTableSkin', '🎴'], ['backgrounds', 'พื้นหลัง', 'dummyBackgroundSkin', '🖼️']];
const price = x => Number(x && x.price) || 0;
const owned = (kind, x) => price(x) <= 0 || sv.own.includes(kind + ':' + x.id);
function equipped(kind) { const k = KINDS.find(z => z[0] === kind), l = SKIN_REGISTRY[kind] || [], c = localStorage.getItem(k[2]); const x = l.find(y => y.id === c && owned(kind, y)) || l.find(y => owned(kind, y)) || l[0]; return x ? x.id : null; }
function equip(kind, id) { const k = KINDS.find(z => z[0] === kind), x = (SKIN_REGISTRY[kind] || []).find(y => y.id === id); if (!k || !x || !owned(kind, x)) return; localStorage.setItem(k[2], id); applyTheme(); window.cloudPush && cloudPush(); render(); }
function buyItem(kind, id) { const x = (SKIN_REGISTRY[kind] || []).find(y => y.id === id); if (!x || owned(kind, x)) return; if (window.cloudActive && cloudActive()) return cloudBuy(kind + ':' + id, x.name || id); if (sv.coins < price(x)) { shopNote = 'เหรียญไม่พอ'; return render(); } sv.coins -= price(x); sv.own.push(kind + ':' + id); save(); shopNote = 'ซื้อ “' + (x.name || id) + '” แล้ว ไปเลือกใช้ที่โปรไฟล์ได้เลย'; render(); }
const backCss = x => x.asset ? `url('${x.asset}') center/cover no-repeat` : `repeating-linear-gradient(45deg,${x.b1 || '#7a1f2b'},${x.b1 || '#7a1f2b'} 4px,${x.b2 || '#5d1520'} 4px,${x.b2 || '#5d1520'} 8px)`;
function prevBox(kind, x) {
  if (kind === 'characters') return `<span class=pv-ch><img src="${esc(x.asset || '')}" alt=""></span>`;
  if (kind === 'backs') return `<span class=pv-back style="background:${esc(backCss(x))}"></span>`;
  if (kind === 'tables') return `<span class=pv-table style="--t1:${esc(x.bg || '#0f3d2a')};--t2:${esc(x.bg2 || '#0b2e20')}${x.asset ? ';background-image:url(' + esc(x.asset) + ')' : ''}"></span>`;
  return `<span class=pv-bg style="${esc(bgCss(x.id))}"></span>`;
}
const hud = back => `<div class=hud>${back ? `<button class=hud-back onclick="go('${back}')" aria-label="ย้อนกลับ">‹</button>` : `<button class=hud-who onclick="go('profile')"><span class=hud-av>${av(sv.name, myChar())}</span><b>${esc(sv.name || '')}</b></button>`}${(window.cloudHudR||(h=>h))(`<span class=coin-pill>🪙 ${sv.coins}</span>`)}</div>`;
const pgKind = b => (b.includes('acct-root') ? 'acct' : b.includes('class=plank') ? 'play' : b.includes('gtiles') ? 'games' : b.includes('scoreSum') ? 'create' : b.includes('class=ksec') ? (b.includes('namebox') ? 'profile' : 'shop') : '');
const page2 = (title, body, back = 'home') => { $('app').className = ''; $('app').innerHTML = `<div class=pg data-pg="${pgKind(body)}">${hud(back)}<div class=pg-title><span>${title}</span></div><div class=pg-body>${body}</div></div>`; };
function homeView() {
  const ch = (SKIN_REGISTRY.characters || []).find(x => x.id === myChar());
  $('app').className = 'home';
  $('app').innerHTML = `<div class=scene>${hud()}${ch && ch.asset ? `<img class=hero src="${esc(ch.asset)}" alt="">` : ''}<nav class=signs aria-label="เมนูหลัก"><button class="sign s-play" onclick="goPlay()" aria-label="เล่นเกม"><img src="./ui/sign-play.webp" alt="เล่นเกม"></button><button class="sign s-shop" onclick="go('shop')" aria-label="ร้านค้า"><img src="./ui/sign-shop.webp" alt="ร้านค้า"></button><button class="sign s-prof" onclick="go('profile')" aria-label="โปรไฟล์"><img src="./ui/sign-profile.webp" alt="โปรไฟล์"></button></nav>${connStatus()}<span class=ver>v${esc(APP_VER || '?')}${SRV_VER && SRV_VER !== APP_VER ? ' · เซิร์ฟเวอร์ v' + esc(SRV_VER) : ''}</span></div>`;
}
function goPlay() { joinOpen = false; conn(); if (sock && sock.connected && !RULES.length) sock.emit('rules:get'); go('games'); }
// ===== หน้าเลือกเกม (หลังกดเล่นเกม): รายการเกมมาจาก RULES ที่เซิร์ฟเวอร์ส่งมา เพิ่มกฎใหม่แล้วโผล่เองโดยไม่ต้องแก้ client =====
function chooseGame(id) { if (!ruleMeta(id)) return; setRule(id); joinOpen = false; go('play'); }
function gamesView() {
  conn();
  const cur = createSel && createSel.rule, pc = r => (r.maxPlayers > 1 ? (r.minPlayers || 1) + '–' + r.maxPlayers + ' คน' : '1 คน');
  const tiles = RULES.map(r => `<button class="gtile${r.id === cur ? ' on' : ''}" onclick="chooseGame('${esc(r.id)}')"><span class=gt-ic>${esc(r.icon || '🂠')}</span><span class=gt-tx><b>${esc(r.name)}</b><small>${esc(r.desc || '')}</small><i>${pc(r)} · ล้อมวงกับบอทได้</i></span><span class=gt-go>›</span></button>`).join('');
  page2('เลือกเกม', `${connStatus()}${RULES.length ? `<div class=gtiles>${tiles}</div>` : `<p class=note>${lerr ? '⚠️ ' + esc(lerr) : '⏳ กำลังโหลดรายการเกมจากเซิร์ฟเวอร์... ครั้งแรกอาจใช้เวลาราว 1 นาที'}</p>`}<button class=wbtn onclick="toggleJoin()">🔑 เข้าห้องด้วยรหัสจากเพื่อน</button>${joinOpen ? `<div class=joinbox><input id=cd placeholder="รหัสห้อง" maxlength=6 autocapitalize=characters autocomplete=off value="${esc(joinCode)}" oninput="joinCode=this.value"><button class="wbtn go" onclick=jn()>เข้าห้อง</button></div>` : ''}${lerr && !soloRoom && RULES.length ? `<p class=note>${esc(lerr)}</p>` : ''}`, 'home');
}
function toggleJoin() { joinOpen = !joinOpen; render(); if (joinOpen) { const i = $('cd'); if (i) i.focus(); } }
function playView() {
  conn();
  const plank = (fn, t, s) => `<button class=plank onclick="${fn}"><b>${t}</b><small>${s}</small></button>`;
  const gm = ruleMeta(createSel.rule), gh = gm ? `<button class=gcur onclick="go('games')"><span>${esc(gm.icon || '🂠')}</span><b>${esc(gm.name)}</b><small>เปลี่ยนเกม</small></button>` : '';
  page2('เล่นเกม', `${gh}${connStatus()}${plank('solo()', 'เล่นคนเดียว', 'เล่นกับบอท 3 คน')}${plank('openCreate(\'room\')', 'สร้างห้อง', 'เลือกไพ่ ตั้งเดิมพัน ชวนเพื่อน')}${plank('toggleJoin()', 'เข้าห้อง', 'ใส่รหัสห้องจากเพื่อน')}${joinOpen ? `<div class=joinbox><input id=cd placeholder="รหัสห้อง" maxlength=6 autocapitalize=characters autocomplete=off value="${esc(joinCode)}" oninput="joinCode=this.value"><button class="wbtn go" onclick=jn()>เข้าห้อง</button></div>` : ''}${lerr && !soloRoom ? `<p class=note>${esc(lerr)}</p>` : ''}`, 'games');
}
// ===== กฎเกม: รายการกฎ/ตัวเลือกมาจากเซิร์ฟเวอร์ (rules:list) หน้านี้สร้างจาก meta ล้วน ๆ — เพิ่มกฎใหม่ที่ server/src/rules ไม่ต้องแก้ client =====
function loadCreateSel() { try { const v = JSON.parse(localStorage.getItem('dummyCreate') || 'null'); if (v && v.rule) return { rule: String(v.rule), options: v.options && typeof v.options === 'object' ? v.options : {} }; } catch (e) {} return { rule: 'dummy', options: {} }; }
const saveCreate = () => { try { localStorage.setItem('dummyCreate', JSON.stringify(createSel)); } catch (e) {} };
const ruleMeta = id => RULES.find(r => r.id === id) || RULES[0] || null;
function ruleOpts(m) { const o = {}; (m.options || []).forEach(d => { const v = createSel.options[d.key]; o[d.key] = v == null || v === '' ? d.default : v; }); return o; }
function openCreate(mode) { createMode = mode; joinOpen = false; conn(); if (sock && sock.connected && !RULES.length) sock.emit('rules:get'); go('create'); }
function solo() { openCreate('solo'); }
function setRule(id) { createSel = { rule: id, options: {} }; saveCreate(); render(); }
function setOpt(k, v) { createSel.options[k] = v; saveCreate(); render(); }
function setOptNum(k, v) { createSel.options[k] = v; saveCreate(); const m = ruleMeta(createSel.rule), el = $('scoreSum'); if (m && el) el.innerHTML = scoreHtml(m); }
function fixOpt(k) { const m = ruleMeta(createSel.rule), d = m && (m.options || []).find(x => x.key === k); if (!d) return; let v = Number(createSel.options[k]); if (!Number.isFinite(v)) v = d.default; createSel.options[k] = Math.min(d.max, Math.max(d.min, Math.round(v))); saveCreate(); render(); }
// แทน {stake} / {stake*0.75} ในข้อความสรุปการนับเหรียญของกฎ
const scoreHtml = m => { const st = Number(ruleOpts(m).stake); return `<ul>${(m.scoring || []).map(t => `<li>${esc(t.replace(/\{stake(?:\*([\d.]+))?\}/g, (_, k) => Number.isFinite(st) ? Math.round(st * (k ? +k : 1)) + ' 🪙' : '?'))}</li>`).join('')}</ul>`; };
const howtoHtml = m => (m.howto && m.howto.length) ? `<details class=howto><summary>📖 วิธีเล่น${esc(m.name || '')}</summary><ol>${m.howto.map(t => `<li>${esc(t)}</li>`).join('')}</ol></details>` : '';
// กล่องกติกา (เปิดได้จากหน้าโต๊ะ/ระหว่างเล่น) — ข้อความทั้งหมดมาจาก meta.howto / meta.scoring ของกฎ
function showRules(id) {
  const m = ruleMeta(id || (S && S.rule) || (lob && lob.rule && lob.rule.id)); if (!m) return; closeRules();
  const st = Number((S && S.stake) != null ? S.stake : ((lob && lob.options && lob.options.stake) || 20)), sc = (m.scoring || []).map(t => esc(t.replace(/\{stake(?:\*([\d.]+))?\}/g, (_, k) => Math.round(st * (k ? +k : 1)) + ' 🪙')));
  const el = document.createElement('div'); el.id = 'ruleModal'; el.className = 'pile-modal'; el.setAttribute('onclick', 'if(event.target===this)closeRules()');
  el.innerHTML = `<div class=pile-dialog><div class=pile-title><b>${esc(m.icon || '')} กติกา${esc(m.name)}</b><button class=pile-close onclick=closeRules()>✕</button></div><div class=rule-body><ol>${(m.howto || [m.desc || '']).map(t => `<li>${esc(t)}</li>`).join('')}</ol><h4>🪙 การนับเหรียญ</h4><ul>${sc.map(t => `<li>${t}</li>`).join('')}</ul></div></div>`;
  document.body.appendChild(el);
}
function closeRules() { const e = document.getElementById('ruleModal'); if (e) e.remove(); }
function createView() {
  const m = ruleMeta(createSel.rule), solo_ = createMode === 'solo';
  if (!m) return page2(solo_ ? 'เล่นคนเดียว' : 'สร้างห้อง', `${connStatus()}<p class=note>${lerr ? '⚠️ ' + esc(lerr) : '⏳ กำลังโหลดกฎเกมจากเซิร์ฟเวอร์... ครั้งแรกอาจใช้เวลาราว 1 นาที'}</p>`, 'play');
  if (m.id !== createSel.rule) createSel = { rule: m.id, options: {} };
  const o = ruleOpts(m);
  const opts = (m.options || []).map(d => {
    if (d.type === 'number') return `<div class=opt><label>${esc(d.label)}</label><input type=number inputmode=numeric min=${d.min} max=${d.max} step=${d.step || 1} value="${esc(o[d.key])}" oninput="setOptNum('${esc(d.key)}',this.value)" onchange="fixOpt('${esc(d.key)}')"><div class=chips>${(d.presets || []).map(v => `<button class="chip${+o[d.key] === v ? ' on' : ''}" onclick="setOpt('${esc(d.key)}',${v})">${v}</button>`).join('')}</div></div>`;
    if (d.type === 'select') return `<div class=opt><label>${esc(d.label)}</label><div class=chips>${(d.choices || []).map(c => `<button class="chip${o[d.key] === c.v ? ' on' : ''}" onclick="setOpt('${esc(d.key)}','${esc(c.v)}')">${esc(c.label)}</button>`).join('')}</div></div>`;
    return '';
  }).join('');
  page2(solo_ ? 'เล่นคนเดียว' : 'สร้างห้อง', `${connStatus()}<div class=panel><h3 class=sec>🎴 เกมที่เลือก</h3><button class=gcur onclick="go('games')"><span>${esc(m.icon || '🂠')}</span><b>${esc(m.name)}</b><small>เปลี่ยนเกม</small></button><p class=rule-desc>${esc(m.desc || '')}</p>${howtoHtml(m)}<h3 class=sec>⚙️ ตั้งค่าห้อง</h3>${opts}<h3 class=sec>📋 การนับเหรียญ</h3><div id=scoreSum class=score-sum>${scoreHtml(m)}</div><button class="wbtn go" onclick="startCreate()">${solo_ ? '▶ เริ่มเล่นกับบอท' : '🏠 สร้างห้อง'}</button></div>`, 'play');
}
// กดปุ่มยืนยันในหน้าสร้างห้อง: เล่นคนเดียว = สร้างห้องส่วนตัวเล่นกับบอท / สร้างห้อง = ห้องออนไลน์
function startCreate() {
  if (!ruleMeta(createSel.rule)) return;
  if (createMode === 'solo') { setSess(null); soloPending = true; soloRoom = true; conn(); if (sock && sock.connected && !code) mk(); render(); }
  else { soloRoom = false; conn(); if (sock && sock.connected) mk(); else { lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'; render(); } }
}
function shopView() {
  const secs = KINDS.map(([kind, label, , ic]) => {
    const items = (SKIN_REGISTRY[kind] || []).filter(x => price(x) > 0); if (!items.length) return '';
    return `<section class=ksec><h3 class=sec>${ic} ${label}</h3><div class=grid>${items.map(x => { const own = owned(kind, x), no = !own && sv.coins < price(x); return `<div class=item2>${prevBox(kind, x)}<b>${esc(x.name || x.n || x.id)}</b>${own ? '<button class=wbtn disabled>ซื้อแล้ว ✓</button>' : `<button class="wbtn go" ${no ? 'disabled' : ''} onclick="buyItem('${kind}','${esc(x.id)}')">🪙 ${price(x)}</button>`}</div>`; }).join('')}</div></section>`;
  }).join('');
  page2('ร้านค้า', `<p class=note>${esc(shopNote || 'เลือกซื้อของตกแต่ง แล้วไปเลือกใช้ที่หน้าโปรไฟล์')}</p><div class=panel>${secs}</div>`);
}
function profileView() {
  const secs = KINDS.map(([kind, label, , ic]) => {
    const items = (SKIN_REGISTRY[kind] || []).filter(x => owned(kind, x)), cur = equipped(kind);
    return `<section class=ksec><h3 class=sec>${ic} ${label}</h3><div class=pick-row>${items.map(x => `<button class="pick${cur === x.id ? ' on' : ''}" onclick="equip('${kind}','${esc(x.id)}')" aria-pressed="${cur === x.id}">${prevBox(kind, x)}<small>${esc(x.name || x.n || x.id)}${cur === x.id ? ' ✓' : ''}</small></button>`).join('')}</div></section>`;
  }).join('');
  page2('โปรไฟล์', `<div class=panel><label class=namebox><span>ชื่อเล่น</span><input id=nickInput maxlength=14 placeholder="ชื่อเล่น" value="${esc(nick)}" oninput="setNick(this.value)"></label>${secs}<button class=wbtn onclick="go('shop')">🛍️ ซื้อของเพิ่มที่ร้านค้า</button></div>`);
}
function conn() {
  if (sock || noio) return;
  if (!window.io) { noio = true; lerr = 'โหลด Socket.IO ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต'; return; }
  sock = io(CFG.BACKEND_URL || undefined, { transports: ['websocket', 'polling'] });
  sock.on('connect', () => { lerr = ''; authed = true; window.cloudSock&&cloudSock(); const ss = getSess(); if (ss && !code && !soloPending) sock.emit('room:rejoin', ss); else if (soloPending && !code) mk(); if (!RULES.length) sock.emit('rules:get'); render(); });
  sock.on('room:rejoin-failed', () => { setSess(null); if (soloPending && !code) mk(); render(); });
  sock.on('rules:list', d => { if (d && Array.isArray(d.rules)) { RULES = d.rules; SRV_VER = String(d.version || ''); render(); } });
  sock.on('connect_error', () => { lerr = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; render(); });
  sock.on('system:error', m => { hint = 'เซิร์ฟเวอร์: ' + m; lerr = m; render(); });
  sock.on('game:action-result', d => { if (d && d.ok) { hint = ''; } else { hint = 'จั่ว/เก็บไพ่ไม่สำเร็จ: ' + ((d && d.error) || 'ไม่ทราบสาเหตุ'); render(); } });
  sock.on('me', m => { sv = m; applyTheme(); render(); });
  sock.on('room:joined', d => { code = d.code; isHost = d.host ?? d.isHost; lerr = ''; if (d.token) setSess({ code: d.code, token: d.token }); if (soloPending) { soloPending = false; soloRoom = true; /* ห้องเล่นกับบอท: ไปหน้าสับไพ่ก่อน แล้วค่อยกดเริ่มเกม */ } if (screen !== 'game') screen = 'lobby'; render(); });
  // เซิร์ฟเวอร์ส่งเฉพาะ "ชนิดท่าสับ" มาให้เล่นแอนิเมชัน (ไม่มีลำดับไพ่) — ทุกคนในห้องเห็นพร้อมกัน
  sock.on('room:shuffled', d => { lerr = ''; shufAnim = { by: d.by, seq: d.seq, steps: d.steps || [] }; clearTimeout(shufTimer); shufTimer = setTimeout(() => { shufAnim = null; render(); }, 1400); render(); });
  sock.on('room:lobby', l => { lob = l; if (typeof l.youHost === 'boolean') isHost = l.youHost; render(); });
  sock.on('game:state', s => { S = s; if (s.phase !== 'draw') closePile(); if (s.rule && s.rule !== 'dummy') clearDeal(); screen = 'game'; if (!s.over) { paid = false; coinDelta = 0; }
    if (!s.over && (!s.rule || s.rule === 'dummy') && s.v <= 1 && s.gid && s.gid !== dealtGid) { dealtGid = s.gid; startDeal(s); } // ตาใหม่ (ยังไม่มีใครเดิน) → แจกไพ่ทีละใบ
    if (s.over) { const c = s.res && s.res.coin; coinDelta = c ? c.delta[s.my] || 0 : 0; // ผลเหรียญตามกฎของเกม (น็อก/ตีปี้/อมสเปโต) จ่ายครั้งเดียวต่อเกม
      if (!paid) { paid = true; if (localStorage.getItem('dummyPaid') !== s.gid) { localStorage.setItem('dummyPaid', s.gid || ''); sv.coins = Math.max(0, sv.coins + coinDelta); save(); if (window.cloudGame) { const r = s.res || {}, w = r.winners || (r.winner != null ? [r.winner] : null); cloudGame(s.gid, s.rule || 'dummy', coinDelta > 0 ? 'win' : coinDelta < 0 ? 'lose' : (w ? (w.includes(s.my) ? 'win' : 'lose') : 'draw'), coinDelta); } } } }
    sel = new Set([...sel].filter(i => s.hand.includes(i))); if (s.rule && s.rule !== 'dummy') closeRules(); render(); });
}
function onAuth(r) {}
function auth(kind) {}
function out() { leave(); }
function authView() { wrap(`<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><input id=au placeholder="ชื่อผู้ใช้" maxlength=14 autocomplete=username><input id=ap type=password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" autocomplete=current-password><button onclick="auth('login')">เข้าสู่ระบบ</button><button class=g onclick="auth('register')">สมัครสมาชิก (รับ 100 🪙)</button>${aerr || lerr ? `<p style="color:var(--gold)">${esc(aerr || lerr)}</p>` : ''}`); }
const getSess = () => { try { const v = JSON.parse(localStorage.getItem('dummySession') || 'null'); return v && v.code && v.token ? v : null; } catch (e) { return null; } };
const setSess = v => { try { v ? localStorage.setItem('dummySession', JSON.stringify(v)) : localStorage.removeItem('dummySession'); } catch (e) {} };
const emit = a => { if (!sock || !sock.connected) { hint = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'; render(); return; } sock.emit('game:act', a); };
const room = () => { conn(); if (!sock) return render(); };
function mk() { conn(); if (!sock) return; nick = ($('au')?.value || nick || 'ผู้เล่น').trim().slice(0,14) || 'ผู้เล่น'; sv.name = nick; localStorage.setItem('dummyName', nick); const m = ruleMeta(createSel.rule); sock.emit('room:create', { name: nick, ch: myChar(), bg: myBg(), rule: m ? m.id : undefined, options: m ? ruleOpts(m) : {} }); }
function jn() { const c = ($('cd').value || '').trim().toUpperCase(); nick = localStorage.getItem('dummyName') || nick || 'ผู้เล่น'; if (c) { conn(); sock.emit('room:join', { code: c, name: nick, ch: myChar(), bg: myBg() }); } }
const begin = () => sock.emit('game:start');
const doShuffle = () => { if (!sock || !sock.connected) { lerr = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'; return render(); } if (shufAnim) return; sock.emit('game:shuffle'); };
// ส่วนสับไพ่ (ล็อบบี้ + หน้าจบตา): ผู้สับ = เจ้าของห้อง (ตาแรก) หรือผู้ชนะตาก่อนหน้า (ตาถัดไป)
function shufflePanel() {
  const sh = lob && lob.shuffle; if (!sh || !sh.shuffler) return '';
  const lbl = { cut: 'ตัดไพ่', riffle: 'รีฟเฟิล', overhand: 'โอเวอร์แฮนด์' }, cnt = {};
  if (shufAnim) shufAnim.steps.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
  const anim = shufAnim ? `<div class=shuf-anim aria-hidden=true>${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--s:${i % 2 ? 1 : -1}"></i>`).join('')}</div><p class=shuf-steps>${esc(shufAnim.by)} สับไพ่: ${Object.keys(cnt).map(t => (lbl[t] || t) + ' ×' + cnt[t]).join(' · ')}</p>` : '';
  const who = sh.youShuffler ? 'คุณ' : esc(sh.shuffler), why = sh.round ? '🏆 ผู้ชนะตาก่อนหน้า' : '👑 เจ้าของห้อง';
  const st = sh.ready ? '✅ สับไพ่แล้ว' + (sh.by ? ' โดย ' + esc(sh.by) : '') : '⏳ ยังไม่ได้สับไพ่';
  return `<div class=shuf><p>🔀 ผู้สับไพ่: <b>${who}</b> (${why})</p>${anim}<p class=shuf-st>${st}</p>${sh.youShuffler ? `<button class=org onclick=doShuffle() ${shufAnim ? 'disabled' : ''}>🔀 ${sh.ready ? 'สับอีกครั้ง' : 'สับไพ่'}</button>` : ''}</div>`;
}
// ปุ่มเริ่ม: เจ้าของห้องเท่านั้น และต้องสับไพ่แล้ว (เว้นเล่นคนเดียว)
function startBtn(label) {
  const sh = lob && lob.shuffle, blocked = !!(sh && sh.needed && !sh.ready);
  if (!isHost) return '<p>รอเจ้าของห้องกดเริ่มเกม...</p>';
  return `<button onclick=begin() ${blocked ? 'disabled' : ''}>${label}</button>${blocked ? `<p>ต้องให้ ${sh.youShuffler ? 'คุณ' : esc(sh.shuffler || 'ผู้สับไพ่')} กดสับไพ่ก่อน</p>` : ''}`;
}
function play() { go('lobby'); }
function connStatus() { // แสดงสถานะที่หน้าแรก: กำลังเชื่อมต่อ / เชื่อมต่อไม่ได้ (เดิมไม่แสดงอะไร ทำให้ดูเหมือนกดแล้วเข้าเล่นไม่ได้)
  const w = soloPending || (soloRoom && !S), e = lerr ? '⚠️ ' + esc(lerr) : ''; if (!w && !e) return '';
  return `<p class=cstat>${w ? '⏳ กำลังเข้าเกม... เซิร์ฟเวอร์ฟรีอาจหลับอยู่ ครั้งแรกใช้เวลาราว 1 นาที กรุณารอ' : ''}${w && e ? '<br>' : ''}${e}</p>`; }
function leave() { clearDeal(); setSess(null); if (sock) sock.emit('room:leave'); code = ''; lob = null; S = null; ho = []; sel = new Set(); prevM = prevD = 0; soloRoom = false; soloPending = false; hint = lerr = ''; screen = 'home'; render(); }
function lobbyView() {
  if (screen === 'home') return homeView(); if (screen === 'games' && !code) return gamesView(); if (screen === 'shop') return shopView(); if (screen === 'profile') return profileView(); if (screen === 'create' && !code) return createView();
  if (screen === 'play' || (screen === 'lobby' && !code)) return playView(); conn();
  tableView();
}
// ===== โต๊ะก่อนเริ่มเกม: เข้าห้องแล้วอยู่ที่โต๊ะเลย สับไพ่ที่กองกลางโต๊ะ แล้วกดเริ่มเพื่อแจกไพ่ =====
const botChar = i => { const l = (SKIN_REGISTRY.characters || []).filter(c => c.asset); return l.length ? l[i % l.length].id : null; }; // ภาพตัวแทนบอทที่นั่งว่างก่อนเริ่มเกม
function tableView() {
  const L = lob || { players: [], shuffle: {}, options: {}, rule: {} }, ps = L.players.filter(p => p.connected), total = Math.max(4, ps.length), sh = L.shuffle || {};
  const myi = Math.max(0, ps.findIndex(p => p.you)), seatOf = k => (myi + k) % total, youSh = !!sh.youShuffler, blocked = !!(sh.needed && !sh.ready);
  const pl = (si, pos) => { const p = ps[si], bot = !p, nm = bot ? 'บอท' : p.you ? 'คุณ' : p.name, a = bot ? av('บอท' + si, botChar(si)) : av(p.name, p.ch), cls = a.startsWith('<img') ? 'chr' : 'av';
    const info = `<div class=pl-info><b>${esc(nm)}${p && p.host ? ' 👑' : ''}</b><small>${bot ? 'บอทเล่นแทน' : p.shuffler ? '🔀 ผู้สับไพ่' : 'พร้อม'}</small></div>`, ico = `<span class="${cls}">${a}</span>`;
    return `<div class="pl pl-${pos}${p && p.you ? ' me' : ''}${p && p.shuffler ? ' active' : ''}" data-seat=${si}>${pos === 'bottom' ? info + ico : ico + info}</div>`; };
  const deck = `<div class="deckbox${shufAnim ? ' go' : ''}" aria-hidden=true>${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--s:${i % 2 ? 1 : -1}"></i>`).join('')}</div><div class=lab>${sh.ready ? '✅ สับไพ่แล้ว' : '⏳ ยังไม่ได้สับ'}</div>`;
  const stake = L.options && L.options.stake != null ? L.options.stake : null, lbl = { cut: 'ตัดไพ่', riffle: 'รีฟเฟิล', overhand: 'โอเวอร์แฮนด์' }, cnt = {};
  if (shufAnim) shufAnim.steps.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
  const h = lerr ? '⚠️ ' + lerr : shufAnim ? esc(shufAnim.by) + ' สับไพ่: ' + Object.keys(cnt).map(t => (lbl[t] || t) + ' ×' + cnt[t]).join(' · ') : soloRoom ? 'เล่นกับบอท — กดสับไพ่ แล้วกดเริ่มเกม' : 'รอผู้เล่น ' + ps.length + '/4 · ที่ว่างบอทจะเล่นแทน';
  const who = youSh ? 'คุณ' : esc(sh.shuffler || '-');
  $('app').className = '';
  $('app').innerHTML = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}${stake != null ? ' · ตัวละ ' + esc(stake) + ' 🪙' : ''}</span>${L.rule && L.rule.id ? `<button class="pill rl" onclick="showRules('${esc(L.rule.id)}')">📖 กติกา</button>` : ''}</div>
 <div class=arena>${pl(seatOf(2), 'top')}${pl(seatOf(1), 'left')}<div class=felt><div class=piles>${deck}</div></div>${pl(seatOf(3), 'right')}${pl(seatOf(0), 'bottom')}</div></div>
 <div class=colR><div class=logs></div><div class=hint>${h}<small>${L.rule && L.rule.name ? '🎴 ' + esc(L.rule.name) + ' · ' : ''}ผู้สับไพ่: ${who} ${sh.round ? '🏆 ผู้ชนะตาก่อน' : '👑 เจ้าของห้อง'}</small></div>
 <div class=dock-wrap><div class=dock><div class=pre>${soloRoom ? '' : `<p>รหัสห้อง <b class=pre-code>${esc(code)}</b> — ส่งให้เพื่อน (สูงสุด 4 คน)</p>`}${!isHost ? '<p>รอเจ้าของห้องกดเริ่มเกม...</p>' : blocked ? `<p>ต้องให้ ${who} กดสับไพ่ก่อนเริ่มเกม</p>` : ''}</div>
 <div class=acts>${youSh ? `<button class=org onclick=doShuffle() ${shufAnim ? 'disabled' : ''}>🔀 ${sh.ready ? 'สับอีกครั้ง' : 'สับไพ่'}</button>` : ''}${isHost ? `<button class=blue onclick=begin() ${blocked ? 'disabled' : ''}>▶ เริ่มเกม</button>` : ''}<button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div></div></div>`;
}
const face = (id, cls = '', x = '') => { const c = ALL[id]; return `<button ${x} class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}${cls}">${RK[c.r]}<span>${SU[c.s]}</span></button>`; };
const mini = id => { const c = ALL[id]; return `<span class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}">${RK[c.r]}<span>${SU[c.s]}</span></span>`; };
const mine = () => !deal && S && S.cur === S.my && !S.over;
function drw() { if (!mine() || S.phase !== 'draw') { hint = 'จั่วได้เมื่อถึงตาคุณและยังไม่ได้จั่ว'; return render(); } if (!S.stock) { hint = 'กองจั่วหมดแล้ว'; return render(); } hint = ''; closePile(); emit({ t: 'draw' }); }
function tk(i) { if (!mine() || S.phase !== 'draw') { hint = 'เก็บกองทิ้งได้เมื่อถึงตาคุณและยังไม่ได้จั่ว'; return render(); } if (!Number.isInteger(i) || i < 0 || i >= (S.disc||[]).length) return; hint = ''; emit({ t: 'take', i }); }
function pick(id) { if (!mine() || S.phase !== 'play') return; const on = !sel.has(id); on ? sel.add(id) : sel.delete(id); const e = document.querySelector('.hand [data-id="' + id + '"]'); if (e) e.classList.toggle('s', on); }
const act = a => { hint = ''; sel = new Set(); emit(a); };
function mld() { if (mine() && S.phase === 'play') act({ t: 'meld', ids: [...sel] }); }
function dep(k) { if (mine() && S.phase === 'play' && sel.size) act({ t: 'dep', k, ids: [...sel] }); }
function adep() { if (mine() && S.phase === 'play') act({ t: 'autodep' }); }
function dsc() { if (!mine() || S.phase !== 'play') return; if (S.hand.length === 1) return act({ t: 'knock' }); // ใบสุดท้ายคว่ำเพื่อน็อก
  if (sel.size !== 1) { hint = 'เลือกไพ่ 1 ใบเพื่อทิ้ง'; return render(); } act({ t: 'dis', id: [...sel][0] }); }
function pileModal(){if(!S)return;const cards=S.disc||[];const old=document.getElementById('pileModal');if(old)old.remove();const el=document.createElement('div');el.id='pileModal';el.className='pile-modal';el.innerHTML=`<div class='pile-dialog'><div class='pile-title'><b>เลือกไพ่จากกองทิ้ง</b><button class='pile-close' onclick=closePile()>✕</button></div><p>จั่วไพ่ใหม่ หรือเลือกไพ่จากกองทิ้ง ไพ่ที่เลือกและไพ่ที่ทิ้งทีหลังจะถูกเก็บไปด้วย และต้องเกิดโดยใช้ไพ่ใบแรกที่เลือก</p><button class='pile-draw' ${S.stock ? '' : 'disabled'} onclick='drw()'>🂠 จั่วไพ่จากกองจั่ว (${S.stock} ใบ)</button><div class='pile-all'>${cards.map(([id,hd],i)=>`<div class='pile-choice${S.ok[i]?' ok':''}' role='button' tabindex='0' onclick='choosePile(${i})'><span class='pile-index'>${i===0?'เก่าสุด':i===cards.length-1?'ล่าสุด':'ลำดับ '+(i+1)}</span>${mini(id)}${S.ok[i]?'<small>เกิดได้</small>':''}</div>`).join('')}</div><div class='pile-foot'>ไพ่ทั้งหมด ${cards.length} ใบ · เลือกไพ่ที่ต้องการเก็บ ระบบจะตรวจว่าต้องเกิดด้วยไพ่ใบแรกที่เลือก</div></div>`;document.body.appendChild(el)}
function closePile(){document.getElementById('pileModal')?.remove()}
function choosePile(i){tk(i)}
function openPile(){if(!S)return;if(!mine()){hint='ยังไม่ถึงตาคุณ';return render()}if(S.phase!=='draw'){hint='คุณจั่วไปแล้วในตานี้';return render()}pileModal()}
function render() {
  // ช่วงแจกไพ่: วาดโต๊ะว่างครั้งเดียว แล้วอัปเดตเฉพาะจุด (ไม่วาดทับ เพื่อให้ไพ่ที่กำลังบินไม่หาย)
  if (deal && screen === 'game' && S) { if (!deal.built) { const real = S; S = dealView(real); try { renderGame(); } finally { S = real; } deal.built = true; dealBegin(); } return; }
  renderGame();
}
function renderGame() {
  if (!authed) { conn(); return authView(); }
  if (screen !== 'game' || !S) return lobbyView();
  if (S.rule && S.rule !== 'dummy' && window.renderOther) return renderOther();
  $('app').className = '';
  const me = S.P[S.my], ids = S.hand, fresh = new Set(ids.filter(i => !ho.includes(i)));
  ho = ho.filter(i => ids.includes(i)); const miss = ids.filter(i => !ho.includes(i)).map(i => ALL[i]);
  if (!ho.length) miss.sort((a, b) => a.s - b.s || a.r - b.r); ho.push(...miss.map(c => c.id));
  const pm = prevM, pd = prevD, sl = $('dp') ? $('dp').scrollLeft : 0; prevM = S.melds.length; prevD = S.disc.length;
  let h = hint; if (!h) h = deal ? 'กำลังแจกไพ่... (แตะเพื่อข้าม)' : S.over ? 'จบเกม' : !mine() ? S.P[S.cur].n + ' กำลังเล่น...' : S.phase === 'draw' ? 'ตาคุณ จั่วจากกอง หรือแตะไพ่ในกองทิ้งเพื่อเก็บ' : S.hand.length === 1 ? 'เหลือใบเดียว! กด 🂠 คว่ำน็อก' : S.must != null ? 'เกิดชุดที่มี ' + cn(ALL[S.must]) + ' ก่อน' : 'เลือกไพ่ แล้วเกิด / ฝาก / ทิ้ง';
  const opp = []; for (let k = 1; k < S.P.length; k++) opp.push(S.P[(S.my + k) % S.P.length]);
  // ไอคอนผู้เล่นอยู่นอกโต๊ะ ในโต๊ะมีแค่ชุดที่เกิด (วางเป็นแถวยาวตามฝั่งของเจ้าของ) กองจั่ว กองทิ้ง
  const ms = pi => pi == null ? '' : S.melds.map((m, k) => ({ m, k })).filter(x => x.m.o === pi).map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`).join('');
  const pl = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="pl pl-${pos}${pi === S.my ? ' me' : ''}${on ? ' active' : ''}" data-seat=${pi}><span class="${av(p.n, p.ch).startsWith('<img') ? 'chr' : 'av'}">${av(p.n, p.ch)}</span><div class=pl-info><b>${pi === S.my ? 'คุณ' : esc(p.n)}</b><small><span data-pc=${pi}>${p.n_cards}</span> ใบ</small><small>${p.pts} แต้ม</small>${on ? '<i class=tm>▶ ตา</i>' : ''}</div></div>`; };
  const left = opp[0]?.i, top = opp[1]?.i, right = opp[2]?.i;
  // ตัวละครของเรา: ย้ายออกจากโต๊ะ ไปอยู่ที่แผงไพ่ของเรา (dock) พร้อมพื้นหลังของเราเอง
  const meOn = S.cur === S.my && !S.over, meA = av(me.n, me.ch);
  const plMe = `<div class="pl pl-bottom${meOn ? ' active' : ''}" data-seat=${S.my}><div class=pl-info><b>คุณ</b><small><span data-pc=${S.my}>${me.n_cards}</span> ใบ · ${me.pts} แต้ม</small>${meOn ? '<i class=tm>▶ ตา</i>' : ''}</div><span class="${meA.startsWith('<img') ? 'chr' : 'av'}">${meA}</span></div>`;
  // พื้นหลังของแต่ละที่นั่งเป็นกรอบรูปล้อมโต๊ะ 4 ชิ้น ตัดทแยงที่มุมโต๊ะ (ขนาดคำนวณใน fitFrame)
  const frame = ''; // ทุกห้องใช้พื้นหลังเดียวกัน (พื้นหลังหน้าเว็บ) ไม่มีกรอบพื้นหลังรายที่นั่งแล้ว
  $('app').innerHTML = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>${soloRoom ? '🤖 เล่นกับบอท' : 'ห้อง ' + esc(code)}${S.stake != null ? ' · ตัวละ ' + esc(S.stake) + ' 🪙' : ''}</span></div>
 <div class=arena>${frame}${pl(top, 'top')}${pl(left, 'left')}<div class=felt>
 <div class="zone zone-top">${ms(top)}</div><div class="zone zone-left">${ms(left)}</div><div class="zone zone-right">${ms(right)}</div><div class="zone zone-bottom">${ms(S.my)}</div>
 <div class=piles><div><button class=back onclick=openPile() aria-label="เปิดกองจั่วและเลือกไพ่">${S.stock}</button><div class=lab>กองจั่ว</div></div>
 <div style="flex:1;min-width:0"><div class=dp id=dp>${S.disc.map(([id, hd], i) => face(id, ' d' + (hd ? ' sp' : '') + (S.ok[i] ? ' ok' : '') + (i >= pd ? ' new' : ''), `onclick=openPile()`)).join('')}</div><div class=lab>${deal ? 'กำลังแจกไพ่...' : 'กองทิ้ง ' + S.disc.length + ' ใบ · กดกองจั่วเพื่อเลือกเก็บไพ่'}</div></div></div></div>${pl(right, 'right')}${plMe}</div>
 </div><div class=colR><div class=logs>${S.logs.slice(-1).map(esc).join('')}</div>
 <div class=hint>${esc(h)}<small>${esc(me.n)} ${me.pts} แต้ม</small></div>
 <div class=dock-wrap><div class=dock><div class=hand>${ho.map(i => face(i, (sel.has(i) ? ' s' : '') + (fresh.has(i) ? ' new' : ''), `data-id=${i} onclick=pick(${i})`)).join('')}</div>
 <div class=tools><button onclick="mv(-1)">◀ ซ้าย</button><button onclick="mv(1)">ขวา ▶</button><button onclick=srt()>เรียงไพ่</button></div>
 <div class=acts><button class=blue onclick=mld()>เกิด</button><button class=grn onclick=adep()>ฝากออโต้</button><button class=org onclick=dsc()>${S.hand.length === 1 && mine() && S.phase === 'play' ? '🂠 คว่ำน็อก!' : 'ทิ้ง'}</button><button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div></div></div>
 ${S.over ? (`<div class=ov><div class=box><h2>${S.res.k == null ? 'ไพ่หมดกอง' : esc(S.P[S.res.k].n) + ' น็อก!'}</h2>${S.down != null ? `<p>ใบที่คว่ำเพื่อน็อก: ${mini(S.down)}</p>` : ''}<p style="color:var(--gold)">ผลเหรียญตานี้ ${sgn(coinDelta)} 🪙 (รวม ${sv.coins})</p>${S.P.map(p => ({ p, pt: S.res.pts[p.i], cd: S.res.coin ? S.res.coin.delta[p.i] : 0 })).sort((a, b) => b.pt - a.pt).map(({ p, pt, cd }) => `<div class=row><span>${esc(p.n)}<small>${S.res.nt[p.i].join(' · ')}</small></span><b>${pt}<small class="cd ${cd > 0 ? 'pos' : cd < 0 ? 'neg' : ''}">🪙 ${sgn(cd)}</small></b></div>`).join('')}${coinLines()}${shufflePanel()}${startBtn('เล่นอีกตา')}<button class=g onclick=leave()>ออกจากห้อง</button></div></div>`) : ''}`;
  const d = $('dp'); if (d) d.scrollLeft = S.disc.length !== pd ? d.scrollWidth : sl;
  requestAnimationFrame(fitFrame);
}
const sgn = n => (n > 0 ? '+' + n : String(n));
// รายการจ่ายเหรียญของตานี้ (ใครจ่ายใคร เท่าไร เพราะอะไร)
function coinLines() { const c = S && S.res && S.res.coin; if (!c || !c.lines.length) return ''; const nm = i => (i === S.my ? 'คุณ' : esc(S.P[i].n));
  return `<details class=clines><summary>🪙 รายการจ่ายเหรียญ (ตัวละ ${esc(c.stake)})</summary>${c.lines.map(l => `<div>${nm(l.f)} → ${nm(l.t)} <b>${l.a}</b> · ${esc(l.w)}</div>`).join('')}</details>`; }

// ===== แจกไพ่ทีละใบ: ไพ่ใบละใบบินจากกองจั่วไปหาผู้เล่นทีละคนวนรอบ (ผลการแจกจริงมาจากเซิร์ฟเวอร์แล้ว นี่คือภาพเคลื่อนไหวเท่านั้น) =====
const dealMs = () => (CFG.DEAL_MS != null ? Number(CFG.DEAL_MS) : 85);
const reducedMotion = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
const qa = q => (document.querySelectorAll ? document.querySelectorAll(q) : []);
function dealView(r) { return Object.assign({}, r, { hand: [], stock: 52, disc: [], melds: [], ok: [], phase: null, must: null, cur: -1, logs: ['กำลังแจกไพ่...'], P: r.P.map(p => Object.assign({}, p, { n_cards: 0 })) }); }
function startDeal(s) { if (dealMs() <= 0 || reducedMotion()) return; clearDeal(); closePile(); deal = { gid: s.gid, seats: s.P.length, total: 7 * s.P.length, launched: 0, landed: 0, cnt: s.P.map(() => 0), built: false, t: null, t2: null, safe: null }; }
function clearDeal() { if (!deal) return; clearTimeout(deal.t); clearTimeout(deal.t2); clearTimeout(deal.safe); deal = null; qa('.fly').forEach(e => e.remove()); }
function dealBegin() { const d = deal; const ar = document.querySelector('.arena'); if (ar && ar.setAttribute) ar.setAttribute('onclick', 'skipDeal()'); d.t = setTimeout(() => dealTick(d), 350); d.safe = setTimeout(() => { if (deal === d) skipDeal(); }, 9000); }
function dealTick(d) { if (deal !== d || d.launched >= d.total) return; const seat = d.launched % d.seats; d.launched++; paintStock(); flyCard(d, seat); d.t = setTimeout(() => dealTick(d), dealMs()); }
function seatTarget(seat) { return seat === S.my ? document.querySelector('.dock .hand') : document.querySelector('[data-seat="' + seat + '"]'); }
function flyCard(d, seat) {
  const from = document.querySelector('.felt .piles .back'), to = seatTarget(seat);
  if (!from || !to || !document.createElement) return dealLand(d, seat);
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), el = document.createElement('div');
  el.className = 'fly'; el.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`; document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), rot = Math.round((Math.random() - .5) * 50);
  let done = false; const fin = () => { if (done) return; done = true; el.remove(); dealLand(d, seat); };
  if (el.animate) el.animate([{ transform: 'translate(0,0) rotate(0deg) scale(1)' }, { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.82)` }], { duration: 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = fin;
  setTimeout(fin, 420);
}
function dealLand(d, seat) { if (deal !== d) return; d.cnt[seat]++; d.landed++; paintDeal(); if (d.landed >= d.total && !d.t2) d.t2 = setTimeout(() => finishDeal(d), 320); }
function paintStock() { const b = document.querySelector('.felt .piles .back'); if (b && deal) b.textContent = 52 - deal.launched; }
function paintDeal() {
  if (!deal || !S) return; deal.cnt.forEach((n, i) => qa('[data-pc="' + i + '"]').forEach(e => { e.textContent = n; }));
  const h = document.querySelector('.dock .hand'); if (h && h.children && h.insertAdjacentHTML) for (let k = h.children.length; k < deal.cnt[S.my] && k < S.hand.length; k++) h.insertAdjacentHTML('beforeend', face(S.hand[k], ' new'));
}
function finishDeal(d) { if (!deal || (d && deal !== d)) return; clearDeal(); render(); }
function skipDeal() { finishDeal(); }

// คำนวณขนาดกรอบพื้นหลังของที่นั่ง (ระยะจากขอบโต๊ะถึงขอบ arena) เพื่อตัดทแยงที่มุมโต๊ะ
function fitFrame() { const a = document.querySelector('.arena'), f = document.querySelector('.felt'); if (!a || !f) return;
  const A = a.getBoundingClientRect(), F = f.getBoundingClientRect(), st = a.style;
  st.setProperty('--L', (F.left - A.left) + 'px'); st.setProperty('--T', (F.top - A.top) + 'px'); st.setProperty('--R', (A.right - F.right) + 'px'); st.setProperty('--B', (A.bottom - F.bottom) + 'px'); }
window.addEventListener('resize', () => requestAnimationFrame(fitFrame)); window.addEventListener('orientationchange', () => setTimeout(fitFrame, 250));
try { applyTheme(); } catch (e) {}
render();
if (getSess()) conn();


