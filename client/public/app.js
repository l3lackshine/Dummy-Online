const CFG = window.DUMMY_CONFIG || {}, $ = id => document.getElementById(id);
// ปลุกเซิร์ฟเวอร์ (Render ฟรีจะหลับเมื่อไม่มีคนใช้) ตั้งแต่เปิดหน้าเว็บ เพื่อไม่ให้ต้องรอตอนกดเล่น
if (CFG.BACKEND_URL) { try { fetch(CFG.BACKEND_URL.replace(/\/$/, '') + '/health', { mode: 'no-cors' }).catch(() => {}); } catch (e) {} }
const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL = Array.from({ length: 52 }, (_, i) => ({ id: i, r: i % 13 + 1, s: (i / 13) | 0 }));
const sp = c => (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0), cn = c => RK[c.r] + SU[c.s];
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
let screen = 'home', ho = [], sel = new Set(), sm = 0, paid = false, gain = 0, prevM = 0, prevD = 0, hint = '', lerr = '';
let sv = { name: localStorage.getItem('dummyName') || 'ผู้เล่น', coins: Number(localStorage.getItem('dummyCoins') || '5000'), own: JSON.parse(localStorage.getItem('dummyOwned') || '[\"classic\"]'), eq: localStorage.getItem('dummySkin') || 'classic' }, nick = localStorage.getItem('dummyName') || 'ผู้เล่น';
let authed = true, aerr = '', S = null, lob = null, tok = null, code = '', isHost = false, sock = null, noio = false, soloPending = false, soloRoom = false;
const DEFAULT_SKINS={themes:[
{id:'classic',n:'คลาสสิก (เขียว)',price:0,card:'#fbf7ec',blk:'#1b1b1b',red:'#c0282d',edge:'#cfc7b0',b1:'#7a1f2b',b2:'#5d1520',bg:'#0f3d2a',bg2:'#0b2e20'},
{id:'midnight',n:'มิดไนท์',price:200,card:'#243153',blk:'#e6ebfa',red:'#ff8a98',edge:'#4a5c92',b1:'#4057a3',b2:'#2b3b72',bg:'#0c1226',bg2:'#080c1a'},
{id:'sakura',n:'ซากุระ',price:400,card:'#fff1f5',blk:'#3b2a35',red:'#d6336c',edge:'#f3b6cb',b1:'#f06595',b2:'#c2255c',bg:'#4a1f3a',bg2:'#35142a'},
{id:'gold',n:'ทองคำ',price:700,card:'#fff4d6',blk:'#33250a',red:'#a4161a',edge:'#d9b45a',b1:'#c9971c',b2:'#8a6508',bg:'#2e2410',bg2:'#1f180a'}],
characters:[{id:'emoji',name:'อีโมจิเริ่มต้น',asset:''}],
tables:[{id:'green-felt',name:'โต๊ะผ้าสักหลาด',asset:'',bg:'#0f3d2a',bg2:'#0b2e20'}],
backgrounds:[{id:'sunset',name:'พระอาทิตย์ตก',asset:'',css:'linear-gradient(180deg,#2b2160 0%,#7a3b78 55%,#d9774f 100%)'}],
cards:[{id:'classic-card',name:'ไพ่คลาสสิก',asset:'',card:'#fbf7ec',blk:'#1b1b1b',red:'#c0282d',edge:'#cfc7b0'}]};
let SKIN_REGISTRY=DEFAULT_SKINS, TH=DEFAULT_SKINS.themes;
fetch('./skin/skins.json').then(r=>r.ok?r.json():DEFAULT_SKINS).then(v=>{SKIN_REGISTRY=v;TH=Array.isArray(v.themes)&&v.themes.length?v.themes:DEFAULT_SKINS.themes;applyTheme();render()}).catch(()=>{});
const save=()=>{localStorage.setItem('dummyCoins',sv.coins);localStorage.setItem('dummyOwned',JSON.stringify(sv.own));localStorage.setItem('dummySkin',sv.eq);localStorage.setItem('dummyName',sv.name||nick)};
function setNick(v){nick=String(v||'').trim().slice(0,14)||'ผู้เล่น';sv.name=nick;save()}
function applyTheme(){const t=TH.find(x=>x.id==sv.eq)||TH[0],s=document.documentElement.style;for(const k of['card','blk','red','edge','b1','b2','bg','bg2'])if(t[k])s.setProperty('--'+k,t[k]);const table=(SKIN_REGISTRY.tables||[]).find(x=>x.id===localStorage.getItem('dummyTableSkin'))||(SKIN_REGISTRY.tables||[])[0];const back=(SKIN_REGISTRY.backgrounds||[]).find(x=>x.id===localStorage.getItem('dummyBackgroundSkin'))||(SKIN_REGISTRY.backgrounds||[])[0];const cards=(SKIN_REGISTRY.cards||[]).find(x=>x.id===localStorage.getItem('dummyCardSkin'))||(SKIN_REGISTRY.cards||[])[0];if(table){if(table.bg)s.setProperty('--bg',table.bg);if(table.bg2)s.setProperty('--bg2',table.bg2);if(table.asset)s.setProperty('--table-image',`url('${table.asset}')`)}if(back){if(back.css)s.setProperty('--page-background',back.css);if(back.asset)s.setProperty('--page-background',`url('${back.asset}') center/cover fixed`)}if(cards){for(const k of['card','blk','red','edge'])if(cards[k])s.setProperty('--'+k,cards[k]);if(cards.asset)s.setProperty('--card-image',`url('${cards.asset}')`)}document.documentElement.dataset.characterSkin=(SKIN_REGISTRY.characters||[]).find(x=>x.id===localStorage.getItem('dummyCharacterSkin'))?.id||'emoji'}
const go=s=>{screen=s;render()};
const wrap=b=>{$('app').innerHTML=`<div class=page><div class=box>${b}</div></div>`};
const AV=['😎','🤠','🧑‍🎤','👧','🦊','🐱','🐰','🐻'],av=n=>{let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))|0;const skin=(SKIN_REGISTRY.characters||[]).find(x=>x.id===localStorage.getItem('dummyCharacterSkin'))||(SKIN_REGISTRY.characters||[])[0];if(skin&&skin.asset)return `<img class=avatar-img src="${esc(skin.asset)}" alt="ตัวละคร">`;const a=skin&&Array.isArray(skin.avatars)&&skin.avatars.length?skin.avatars:AV;return a[Math.abs(h)%a.length]};

function mv(d){if(!sel.size)return;const o=d<0?ho:[...ho].reverse();for(let i=1;i<o.length;i++)if(sel.has(o[i])&&!sel.has(o[i-1]))[o[i-1],o[i]]=[o[i],o[i-1]];ho=d<0?o:o.reverse();render()}
function srt(){sm^=1;ho.sort((a,b)=>sm?(ALL[a].s-ALL[b].s||ALL[a].r-ALL[b].r):(ALL[a].r-ALL[b].r||ALL[a].s-ALL[b].s));render()}
function buy(id){const t=TH.find(x=>x.id===id);if(!t)return;if(!sv.own.includes(id)){if(sv.coins<t.price){hint='เหรียญไม่พอ';return render()}sv.coins-=t.price;sv.own.push(id)}sv.eq=id;save();applyTheme();render()}
function homeView(){const t=TH.find(x=>x.id==sv.eq)||TH[0];wrap(`<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><div class=who><span class=av>${av(sv.name)}</span><b>${esc(sv.name||'')}</b><span class=coin>🪙 ${sv.coins}</span></div>${connStatus()}<input id=nickInput maxlength=14 placeholder="ชื่อเล่น" value="${esc(nick)}" oninput="setNick(this.value)"><button class=org onclick=solo()>🤖 เล่นคนเดียวกับบอท</button><button class=blue onclick="go('lobby')">🌐 เล่นออนไลน์กับเพื่อน</button><button class=g onclick="go('shop')">🛍️ ร้านค้า</button><p>ธีมไพ่: ${t.n} · เล่นได้สูงสุด 4 ที่นั่ง</p>`)}
function setDecor(kind,id){const key={characters:'dummyCharacterSkin',tables:'dummyTableSkin',backgrounds:'dummyBackgroundSkin',cards:'dummyCardSkin'}[kind];if(!key)return;localStorage.setItem(key,id);applyTheme();render()}
function decorShop(){const cats=[['characters','สกินตัวละคร'],['tables','สกินโต๊ะ'],['backgrounds','พื้นหลัง'],['cards','สกินไพ่']];return `<h3>🎨 ของตกแต่งเพิ่มเติม</h3>${cats.map(([key,label])=>{const items=SKIN_REGISTRY[key]||[],store={characters:'dummyCharacterSkin',tables:'dummyTableSkin',backgrounds:'dummyBackgroundSkin',cards:'dummyCardSkin'}[key],cur=localStorage.getItem(store)||(items[0]||{}).id;return `<p>${label}</p><div class=decor-row>${items.map(x=>`<button class="decor-btn ${cur===x.id?'chosen':''}" onclick="setDecor('${key}','${esc(x.id)}')">${esc(x.name||x.n||x.id)}${cur===x.id?' ✓':''}</button>`).join('')}</div>`}).join('')}`}
function shopView(){wrap(`<h2>🛍️ ร้านค้า</h2><p>เหรียญ <b class=coin>🪙 ${sv.coins}</b></p><div class=shopg>${TH.map(t=>{const own=sv.own.includes(t.id),no=!own&&sv.coins<t.price,cur=sv.eq==t.id;return `<div class=item><div class=pv style="--card:${t.card};--blk:${t.blk};--red:${t.red};--edge:${t.edge};--b1:${t.b1};--b2:${t.b2}"><span class=c>A<span>♠</span></span><span class="c r">K<span>♥</span></span><span class=back style="width:32px;height:44px;cursor:default"></span></div><b>${t.n}</b><button class="${own?(cur?'g':'blue'):'org'}" ${no?'disabled':''} onclick="buy('${t.id}')">${own?(cur?'ใช้อยู่ ✓':'ใช้ธีมนี้'):'🪙 '+t.price}</button></div>`}).join('')}</div>${decorShop()}<button class=g onclick="go('home')">‹ กลับ</button>`)}
function conn() {
  if (sock || noio) return;
  if (!window.io) { noio = true; lerr = 'โหลด Socket.IO ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต'; return; }
  sock = io(CFG.BACKEND_URL || undefined, { transports: ['websocket', 'polling'] });
  sock.on('connect', () => { lerr = ''; authed = true; if (soloPending && !code) mk(); render(); });
  sock.on('connect_error', () => { lerr = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; render(); });
  sock.on('system:error', m => { hint = 'เซิร์ฟเวอร์: ' + m; lerr = m; render(); });
  sock.on('game:action-result', d => { if (d && d.ok) { hint = ''; } else { hint = 'จั่ว/เก็บไพ่ไม่สำเร็จ: ' + ((d && d.error) || 'ไม่ทราบสาเหตุ'); render(); } });
  sock.on('me', m => { sv = m; applyTheme(); render(); });
  sock.on('room:joined', d => { code = d.code; isHost = d.host ?? d.isHost; lerr = ''; if (soloPending) { soloPending = false; soloRoom = true; sock.emit('game:start'); } if (screen !== 'game') screen = 'lobby'; render(); });
  sock.on('room:lobby', l => { lob = l; render(); });
  sock.on('game:state', s => { S = s; if (s.phase !== 'draw') closePile(); screen = 'game'; if (!s.over) paid = false; if (s.over && !paid) { paid = true; const pts = s.res?.pts || []; gain = Math.max(10, pts[s.my] || 0) + ((pts[s.my] || 0) === Math.max(...pts) ? 50 : 0); sv.coins += Math.max(0, gain); save(); if (s.res) { s.res.gain = s.res.gain || []; s.res.gain[s.my] = Math.max(0, gain); } } else if (s.over && s.res && s.res.gain) gain = s.res.gain[s.my] || 0; sel = new Set([...sel].filter(i => s.hand.includes(i))); render(); });
}
function onAuth(r) {}
function auth(kind) {}
function out() { leave(); }
function authView() { wrap(`<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><input id=au placeholder="ชื่อผู้ใช้" maxlength=14 autocomplete=username><input id=ap type=password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" autocomplete=current-password><button onclick="auth('login')">เข้าสู่ระบบ</button><button class=g onclick="auth('register')">สมัครสมาชิก (รับ 100 🪙)</button>${aerr || lerr ? `<p style="color:var(--gold)">${esc(aerr || lerr)}</p>` : ''}`); }
const emit = a => { if (!sock || !sock.connected) { hint = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'; render(); return; } sock.emit('game:act', a); };
const room = () => { conn(); if (!sock) return render(); };
function mk() { conn(); if (!sock) return; nick = ($('au')?.value || nick || 'ผู้เล่น').trim().slice(0,14) || 'ผู้เล่น'; sv.name = nick; localStorage.setItem('dummyName', nick); sock.emit('room:create', { name: nick }); }
function jn() { const c = ($('cd').value || '').trim(); nick = localStorage.getItem('dummyName') || nick || 'ผู้เล่น'; if (c) { conn(); sock.emit('room:join', { code: c, name: nick }); } }
const begin = () => sock.emit('game:start');
function play() { go('lobby'); }
function connStatus() { // แสดงสถานะที่หน้าแรก: กำลังเชื่อมต่อ / เชื่อมต่อไม่ได้ (เดิมไม่แสดงอะไร ทำให้ดูเหมือนกดแล้วเข้าเล่นไม่ได้)
  const w = soloPending || (soloRoom && !S), e = lerr ? '⚠️ ' + esc(lerr) : ''; if (!w && !e) return '';
  return `<p class=cstat>${w ? '⏳ กำลังเข้าเกม... เซิร์ฟเวอร์ฟรีอาจหลับอยู่ ครั้งแรกใช้เวลาราว 1 นาที กรุณารอ' : ''}${w && e ? '<br>' : ''}${e}</p>`; }
function solo() { soloPending = true; soloRoom = true; conn(); if (sock && sock.connected && !code) mk(); render(); }
function leave() { if (sock) sock.emit('room:leave'); code = ''; lob = null; S = null; ho = []; sel = new Set(); prevM = prevD = 0; soloRoom = false; soloPending = false; hint = lerr = ''; screen = 'home'; render(); }
function lobbyView() {
  if (screen === 'home') return homeView(); if (screen === 'shop') return shopView(); conn();
  let b;
  if (code) {
    const pl = lob ? lob.players : [];
    b = `<p>รหัสห้อง</p><div style="font-size:32px;font-weight:700;letter-spacing:4px">${esc(code)}</div><p>ส่งรหัสให้เพื่อน (สูงสุด 4 คน) ระบบเติมบอทให้ครบ 4 ที่นั่ง</p>${pl.map(p => `<div class=row><span>${esc(p.name)}${p.host ? ' 👑' : ''}</span><small>${p.connected ? 'ออนไลน์' : 'หลุด'}</small></div>`).join('')}${isHost ? '<button onclick=begin()>เริ่มเกม</button>' : '<p>รอเจ้าของห้องกดเริ่มเกม...</p>'}<button class=g onclick=leave()>ออกจากห้อง</button>`;
  } else b = `<input id=au placeholder="ชื่อเล่น" maxlength=14 value="${esc(nick)}"><button onclick=mk()>สร้างห้อง</button><input id=cd placeholder="รหัสห้อง" maxlength=6><button class=g onclick=jn()>เข้าห้อง</button><button class=g onclick="go('home')">‹ กลับ</button>`;
  wrap(`<h2>ห้องออนไลน์</h2>${b}${lerr ? `<p style="color:var(--gold)">${esc(lerr)}</p>` : ''}`);
}
const face = (id, cls = '', x = '') => { const c = ALL[id]; return `<button ${x} class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}${cls}">${RK[c.r]}<span>${SU[c.s]}</span></button>`; };
const mini = id => { const c = ALL[id]; return `<span class="c${c.s === 1 || c.s === 2 ? ' r' : ''}${sp(c) ? ' sp' : ''}">${RK[c.r]}<span>${SU[c.s]}</span></span>`; };
const mine = () => S && S.cur === S.my && !S.over;
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
  if (!authed) { conn(); return authView(); }
  if (screen !== 'game' || !S) return lobbyView();
  const me = S.P[S.my], ids = S.hand, fresh = new Set(ids.filter(i => !ho.includes(i)));
  ho = ho.filter(i => ids.includes(i)); const miss = ids.filter(i => !ho.includes(i)).map(i => ALL[i]);
  if (!ho.length) miss.sort((a, b) => a.s - b.s || a.r - b.r); ho.push(...miss.map(c => c.id));
  const pm = prevM, pd = prevD, sl = $('dp') ? $('dp').scrollLeft : 0; prevM = S.melds.length; prevD = S.disc.length;
  let h = hint; if (!h) h = S.over ? 'จบเกม' : !mine() ? S.P[S.cur].n + ' กำลังเล่น...' : S.phase === 'draw' ? 'ตาคุณ จั่วจากกอง หรือแตะไพ่ในกองทิ้งเพื่อเก็บ' : S.hand.length === 1 ? 'เหลือใบเดียว! กด 🂠 คว่ำน็อก' : S.must != null ? 'เกิดชุดที่มี ' + cn(ALL[S.must]) + ' ก่อน' : 'เลือกไพ่ แล้วเกิด / ฝาก / ทิ้ง';
  const opp = []; for (let k = 1; k < S.P.length; k++) opp.push(S.P[(S.my + k) % S.P.length]);
  // ไอคอนผู้เล่นอยู่นอกโต๊ะ ในโต๊ะมีแค่ชุดที่เกิด (วางเป็นแถวยาวตามฝั่งของเจ้าของ) กองจั่ว กองทิ้ง
  const ms = pi => pi == null ? '' : S.melds.map((m, k) => ({ m, k })).filter(x => x.m.o === pi).map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`).join('');
  const pl = (pi, pos) => { if (pi == null) return ''; const p = S.P[pi], on = S.cur === pi && !S.over;
    return `<div class="pl pl-${pos}${pi === S.my ? ' me' : ''}${on ? ' active' : ''}"><span class=av>${av(p.n)}</span><div class=pl-info><b>${pi === S.my ? 'คุณ' : esc(p.n)}</b><small>${p.n_cards} ใบ</small><small>${p.pts} แต้ม</small>${on ? '<i class=tm>▶ ตา</i>' : ''}</div></div>`; };
  const left = opp[0]?.i, top = opp[1]?.i, right = opp[2]?.i;
  $('app').innerHTML = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>ห้อง ${esc(code)}</span></div>
 <div class=arena>${pl(top, 'top')}${pl(left, 'left')}<div class=felt>
 <div class="zone zone-top">${ms(top)}</div><div class="zone zone-left">${ms(left)}</div><div class="zone zone-right">${ms(right)}</div><div class="zone zone-bottom">${ms(S.my)}</div>
 <div class=piles><div><button class=back onclick=openPile() aria-label="เปิดกองจั่วและเลือกไพ่">${S.stock}</button><div class=lab>กองจั่ว</div></div>
 <div style="flex:1;min-width:0"><div class=dp id=dp>${S.disc.map(([id, hd], i) => face(id, ' d' + (hd ? ' sp' : '') + (S.ok[i] ? ' ok' : '') + (i >= pd ? ' new' : ''), `onclick=openPile()`)).join('')}</div><div class=lab>กองทิ้ง ${S.disc.length} ใบ · กดกองจั่วเพื่อเลือกเก็บไพ่</div></div></div></div>${pl(right, 'right')}${pl(S.my, 'bottom')}</div>
 </div><div class=colR><div class=logs>${S.logs.slice(-1).map(esc).join('')}</div>
 <div class=hint>${esc(h)}<small>${esc(me.n)} ${me.pts} แต้ม</small></div>
 <div class=hand>${ho.map(i => face(i, (sel.has(i) ? ' s' : '') + (fresh.has(i) ? ' new' : ''), `data-id=${i} onclick=pick(${i})`)).join('')}</div>
 <div class=tools><button onclick="mv(-1)">◀ ซ้าย</button><button onclick="mv(1)">ขวา ▶</button><button onclick=srt()>เรียงไพ่</button></div>
 <div class=acts><button class=blue onclick=mld()>เกิด</button><button class=grn onclick=adep()>ฝากออโต้</button><button class=org onclick=dsc()>${S.hand.length === 1 && mine() && S.phase === 'play' ? '🂠 คว่ำน็อก!' : 'ทิ้ง'}</button><button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div>
 ${S.over ? (`<div class=ov><div class=box><h2>${S.res.k == null ? 'ไพ่หมดกอง' : esc(S.P[S.res.k].n) + ' น็อก!'}</h2>${S.down != null ? `<p>ใบที่คว่ำเพื่อน็อก: ${mini(S.down)}</p>` : ''}<p style="color:var(--gold)">ได้รับ +${(S.res.gain||[])[S.my]||0} 🪙 (รวม ${sv.coins})</p>${S.P.map(p => ({ p, pt: S.res.pts[p.i] })).sort((a, b) => b.pt - a.pt).map(({ p, pt }) => `<div class=row><span>${esc(p.n)}<small>${S.res.nt[p.i].join(' · ')}</small></span><b>${pt}</b></div>`).join('')}${isHost ? '<button onclick=begin()>เล่นอีกตา</button>' : '<p>รอเจ้าของห้องเริ่มตาใหม่...</p>'}<button class=g onclick=leave()>ออกจากห้อง</button></div></div>`) : ''}`;
  const d = $('dp'); if (d) d.scrollLeft = S.disc.length !== pd ? d.scrollWidth : sl;
}
try { applyTheme(); } catch (e) {}
render();


