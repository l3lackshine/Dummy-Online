const CFG = window.DUMMY_CONFIG || {}, $ = id => document.getElementById(id);
const SU = ['♠', '♥', '♦', '♣'], RK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const ALL = Array.from({ length: 52 }, (_, i) => ({ id: i, r: i % 13 + 1, s: (i / 13) | 0 }));
const sp = c => (c.r === 2 && c.s === 3) || (c.r === 12 && c.s === 0), cn = c => RK[c.r] + SU[c.s];
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
let screen = 'home', ho = [], sel = new Set(), sm = 0, paid = false, gain = 0, prevM = 0, prevD = 0, hint = '', lerr = '';
let sv = { name: localStorage.getItem('dummyName') || 'ผู้เล่น', coins: Number(localStorage.getItem('dummyCoins') || '5000'), own: JSON.parse(localStorage.getItem('dummyOwned') || '[\"classic\"]'), eq: localStorage.getItem('dummySkin') || 'classic' }, nick = localStorage.getItem('dummyName') || 'ผู้เล่น';
let authed = true, aerr = '', S = null, lob = null, tok = null, code = '', isHost = false, sock = null, noio = false, soloPending = false, soloRoom = false;
const TH=[{id:'classic',n:'คลาสสิก (เขียว)',price:0,card:'#fbf7ec',blk:'#1b1b1b',red:'#c0282d',edge:'#cfc7b0',b1:'#7a1f2b',b2:'#5d1520',bg:'#0f3d2a',bg2:'#0b2e20'},
{id:'midnight',n:'มิดไนท์',price:200,card:'#243153',blk:'#e6ebfa',red:'#ff8a98',edge:'#4a5c92',b1:'#4057a3',b2:'#2b3b72',bg:'#0c1226',bg2:'#080c1a'},
{id:'sakura',n:'ซากุระ',price:400,card:'#fff1f5',blk:'#3b2a35',red:'#d6336c',edge:'#f3b6cb',b1:'#f06595',b2:'#c2255c',bg:'#4a1f3a',bg2:'#35142a'},
{id:'gold',n:'ทองคำ',price:700,card:'#fff4d6',blk:'#33250a',red:'#a4161a',edge:'#d9b45a',b1:'#c9971c',b2:'#8a6508',bg:'#2e2410',bg2:'#1f180a'}];
const save=()=>{localStorage.setItem('dummyCoins',sv.coins);localStorage.setItem('dummyOwned',JSON.stringify(sv.own));localStorage.setItem('dummySkin',sv.eq);localStorage.setItem('dummyName',sv.name||nick)};
function setNick(v){nick=String(v||'').trim().slice(0,14)||'ผู้เล่น';sv.name=nick;save()}
function applyTheme(){const t=TH.find(x=>x.id==sv.eq)||TH[0],s=document.documentElement.style;for(const k of['card','blk','red','edge','b1','b2','bg','bg2'])s.setProperty('--'+k,t[k])}
const go=s=>{screen=s;render()};
const wrap=b=>{$('app').innerHTML=`<div class=page><div class=box>${b}</div></div>`};
const AV=['😎','🤠','🧑‍🎤','👧','🦊','🐱','🐰','🐻'],av=n=>{let h=0;for(const ch of String(n))h=(h*31+ch.charCodeAt(0))|0;return AV[Math.abs(h)%AV.length]};

function mv(d){if(!sel.size)return;const o=d<0?ho:[...ho].reverse();for(let i=1;i<o.length;i++)if(sel.has(o[i])&&!sel.has(o[i-1]))[o[i-1],o[i]]=[o[i],o[i-1]];ho=d<0?o:o.reverse();render()}
function srt(){sm^=1;ho.sort((a,b)=>sm?(ALL[a].s-ALL[b].s||ALL[a].r-ALL[b].r):(ALL[a].r-ALL[b].r||ALL[a].s-ALL[b].s));render()}
function buy(id){const t=TH.find(x=>x.id===id);if(!t)return;if(!sv.own.includes(id)){if(sv.coins<t.price){hint='เหรียญไม่พอ';return render()}sv.coins-=t.price;sv.own.push(id)}sv.eq=id;save();applyTheme();render()}
function homeView(){const t=TH.find(x=>x.id==sv.eq)||TH[0];wrap(`<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><div class=who><span class=av>${av(sv.name)}</span><b>${esc(sv.name||'')}</b><span class=coin>🪙 ${sv.coins}</span></div><input id=nickInput maxlength=14 placeholder="ชื่อเล่น" value="${esc(nick)}" oninput="setNick(this.value)"><button class=org onclick=solo()>🤖 เล่นคนเดียวกับบอท</button><button class=blue onclick="go('lobby')">🌐 เล่นออนไลน์กับเพื่อน</button><button class=g onclick="go('shop')">🛍️ ร้านค้า</button><p>ธีมไพ่: ${t.n} · เล่นได้สูงสุด 4 ที่นั่ง</p>`)}
function shopView(){wrap(`<h2>🛍️ ร้านค้า</h2><p>เหรียญ <b class=coin>🪙 ${sv.coins}</b></p><div class=shopg>${TH.map(t=>{const own=sv.own.includes(t.id),no=!own&&sv.coins<t.price,cur=sv.eq==t.id;return `<div class=item><div class=pv style="--card:${t.card};--blk:${t.blk};--red:${t.red};--edge:${t.edge};--b1:${t.b1};--b2:${t.b2}"><span class=c>A<span>♠</span></span><span class="c r">K<span>♥</span></span><span class=back style="width:32px;height:44px;cursor:default"></span></div><b>${t.n}</b><button class="${own?(cur?'g':'blue'):'org'}" ${no?'disabled':''} onclick="buy('${t.id}')">${own?(cur?'ใช้อยู่ ✓':'ใช้ธีมนี้'):'🪙 '+t.price}</button></div>`}).join('')}</div><button class=g onclick="go('home')">‹ กลับ</button>`)}
function conn() {
  if (sock || noio) return;
  if (!window.io) { noio = true; lerr = 'โหลด Socket.IO ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต'; return; }
  sock = io(CFG.BACKEND_URL || undefined, { transports: ['websocket', 'polling'] });
  sock.on('connect', () => { lerr = ''; authed = true; if (soloPending && !code) mk(); render(); });
  sock.on('connect_error', () => { lerr = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; render(); });
  sock.on('system:error', m => { hint = m; lerr = m; render(); });
  sock.on('me', m => { sv = m; applyTheme(); render(); });
  sock.on('room:joined', d => { code = d.code; isHost = d.host ?? d.isHost; lerr = ''; if (soloPending) { soloPending = false; soloRoom = true; sock.emit('game:start'); } if (screen !== 'game') screen = 'lobby'; render(); });
  sock.on('room:lobby', l => { lob = l; render(); });
  sock.on('game:state', s => { S = s; screen = 'game'; if (!s.over) paid = false; if (s.over && !paid) { paid = true; const pts = s.res?.pts || []; gain = Math.max(10, pts[s.my] || 0) + ((pts[s.my] || 0) === Math.max(...pts) ? 50 : 0); sv.coins += Math.max(0, gain); save(); if (s.res) { s.res.gain = s.res.gain || []; s.res.gain[s.my] = Math.max(0, gain); } } else if (s.over && s.res && s.res.gain) gain = s.res.gain[s.my] || 0; sel = new Set([...sel].filter(i => s.hand.includes(i))); render(); });
}
function onAuth(r) {}
function auth(kind) {}
function out() { leave(); }
function authView() { wrap(`<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><input id=au placeholder="ชื่อผู้ใช้" maxlength=14 autocomplete=username><input id=ap type=password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" autocomplete=current-password><button onclick="auth('login')">เข้าสู่ระบบ</button><button class=g onclick="auth('register')">สมัครสมาชิก (รับ 100 🪙)</button>${aerr || lerr ? `<p style="color:var(--gold)">${esc(aerr || lerr)}</p>` : ''}`); }
const emit = a => sock && sock.emit('game:act', a);
const room = () => { conn(); if (!sock) return render(); };
function mk() { conn(); if (!sock) return; nick = ($('au')?.value || nick || 'ผู้เล่น').trim().slice(0,14) || 'ผู้เล่น'; sv.name = nick; localStorage.setItem('dummyName', nick); sock.emit('room:create', { name: nick }); }
function jn() { const c = ($('cd').value || '').trim(); nick = localStorage.getItem('dummyName') || nick || 'ผู้เล่น'; if (c) { conn(); sock.emit('room:join', { code: c, name: nick }); } }
const begin = () => sock.emit('game:start');
function play() { go('lobby'); }
function solo() { soloPending = true; soloRoom = true; conn(); if (sock && sock.connected && !code) mk(); }
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
function drw() { if (mine() && S.phase === 'draw') { hint = ''; emit({ t: 'draw' }); } }
function tk(i) { if (!mine() || S.phase !== 'draw') return; if (!S.ok[i]) { hint = 'เก็บไม่ได้ ต้องเกิดชุดกับใบนี้ได้ก่อน'; return render(); } hint = ''; emit({ t: 'take', i }); }
function pick(id) { if (!mine() || S.phase !== 'play') return; const on = !sel.has(id); on ? sel.add(id) : sel.delete(id); const e = document.querySelector('.hand [data-id="' + id + '"]'); if (e) e.classList.toggle('s', on); }
const act = a => { hint = ''; sel = new Set(); emit(a); };
function mld() { if (mine() && S.phase === 'play') act({ t: 'meld', ids: [...sel] }); }
function dep(k) { if (mine() && S.phase === 'play' && sel.size) act({ t: 'dep', k, ids: [...sel] }); }
function adep() { if (mine() && S.phase === 'play') act({ t: 'autodep' }); }
function dsc() { if (!mine() || S.phase !== 'play') return; if (S.hand.length === 1) return act({ t: 'knock' }); // ใบสุดท้ายคว่ำเพื่อน็อก
  if (sel.size !== 1) { hint = 'เลือกไพ่ 1 ใบเพื่อทิ้ง'; return render(); } act({ t: 'dis', id: [...sel][0] }); }
function render() {
  if (!authed) { conn(); return authView(); }
  if (screen !== 'game' || !S) return lobbyView();
  const me = S.P[S.my], ids = S.hand, fresh = new Set(ids.filter(i => !ho.includes(i)));
  ho = ho.filter(i => ids.includes(i)); const miss = ids.filter(i => !ho.includes(i)).map(i => ALL[i]);
  if (!ho.length) miss.sort((a, b) => a.s - b.s || a.r - b.r); ho.push(...miss.map(c => c.id));
  const pm = prevM, pd = prevD, sl = $('dp') ? $('dp').scrollLeft : 0; prevM = S.melds.length; prevD = S.disc.length;
  let h = hint; if (!h) h = S.over ? 'จบเกม' : !mine() ? S.P[S.cur].n + ' กำลังเล่น...' : S.phase === 'draw' ? 'ตาคุณ จั่วจากกอง หรือแตะไพ่ในกองทิ้งเพื่อเก็บ' : S.hand.length === 1 ? 'เหลือใบเดียว! กด 🂠 คว่ำน็อก' : S.must != null ? 'เกิดชุดที่มี ' + cn(ALL[S.must]) + ' ก่อน' : 'เลือกไพ่ แล้วเกิด / ฝาก / ทิ้ง';
  const opp = []; for (let k = 1; k < S.P.length; k++) opp.push(S.P[(S.my + k) % S.P.length]);
  // ชุดที่เกิดวางไว้ที่แถวของเจ้าของชุดนั้น (แถวของเราอยู่ล่างสุด ใกล้มือเรา)
  const lane = pi => { const ms = S.melds.map((m, k) => ({ m, k })).filter(x => x.m.o === pi); if (!ms.length) return ''; const p = S.P[pi];
    return `<div class="lane${pi === S.my ? ' me' : ''}"><div class=who2><span class=av>${av(p.n)}</span><b>${pi === S.my ? 'คุณ' : esc(p.n)}</b></div><div class=ms>${ms.map(({ m, k }) => `<div class="m${k >= pm ? ' new' : ''}" onclick="dep(${k})">${m.cs.map(mini).join('')}</div>`).join('')}</div></div>`; };
  const lanes = [...opp.map(p => p.i), S.my].map(lane).join('');
  $('app').innerHTML = `<div class=colL><div class=top><span class=pill>🪙 ${sv.coins}</span><span class=pill>ห้อง ${esc(code)}</span></div><div class=opps>${opp.map(p => `<div class="o${S.cur === p.i && !S.over ? ' on' : ''}"><span class=av>${av(p.n)}</span><b>${esc(p.n)}</b><span>🂠 ${p.n_cards} · ${p.pts} แต้ม</span></div>`).join('')}</div>
 <div class="turn${mine() ? ' mine' : ''}">${S.over ? 'จบเกม' : mine() ? '🟢 ถึงตาคุณ!' : '⏳ ถึงตา ' + av(S.P[S.cur].n) + ' ' + esc(S.P[S.cur].n)}</div>
 <div class=order>${S.P.map((_, k) => S.P[(S.cur + k) % S.P.length]).map(p => `<span class="ch${p.i === S.cur && !S.over ? ' on' : ''}${p.i === S.my ? ' me' : ''}">${av(p.n)} ${p.i === S.my ? 'คุณ' : esc(p.n)}</span>`).join('<i>▸</i>')}</div><div class=felt>
 <div class=tbl>${lanes || '<div class=empty>ยังไม่มีใครเกิด</div>'}</div>
 <div class=piles><div><button class=back onclick=drw() aria-label="จั่ว">${S.stock}</button><div class=lab>กองจั่ว</div></div>
 <div style="flex:1;min-width:0"><div class=dp id=dp>${S.disc.map(([id, hd], i) => face(id, ' d' + (hd ? ' sp' : '') + (S.ok[i] ? ' ok' : '') + (i >= pd ? ' new' : ''), `onclick=tk(${i})`)).join('')}</div><div class=lab>กองทิ้ง ${S.disc.length} ใบ · แตะใบที่ต้องการ จะเก็บใบนั้นและใบที่ทับอยู่ (ขอบทอง = เกิดได้)</div></div></div></div>
 </div><div class=colR><div class=logs>${S.logs.slice(-2).map(esc).join('<br>')}</div>
 <div class=hint>${esc(h)}<small>${esc(me.n)} ${me.pts} แต้ม</small></div>
 <div class=hand>${ho.map(i => face(i, (sel.has(i) ? ' s' : '') + (fresh.has(i) ? ' new' : ''), `data-id=${i} onclick=pick(${i})`)).join('')}</div>
 <div class=tools><button onclick="mv(-1)">◀ ซ้าย</button><button onclick="mv(1)">ขวา ▶</button><button onclick=srt()>เรียงไพ่</button></div>
 <div class=acts><button class=blue onclick=mld()>เกิด</button><button class=grn onclick=adep()>ฝากออโต้</button><button class=org onclick=dsc()>${S.hand.length === 1 && mine() && S.phase === 'play' ? '🂠 คว่ำน็อก!' : 'ทิ้ง'}</button><button class="g sm" onclick="if(confirm('ออกจากห้อง?'))leave()">ออก</button></div></div>
 ${S.over ? (`<div class=ov><div class=box><h2>${S.res.k == null ? 'ไพ่หมดกอง' : esc(S.P[S.res.k].n) + ' น็อก!'}</h2>${S.down != null ? `<p>ใบที่คว่ำเพื่อน็อก: ${mini(S.down)}</p>` : ''}<p style="color:var(--gold)">ได้รับ +${(S.res.gain||[])[S.my]||0} 🪙 (รวม ${sv.coins})</p>${S.P.map(p => ({ p, pt: S.res.pts[p.i] })).sort((a, b) => b.pt - a.pt).map(({ p, pt }) => `<div class=row><span>${esc(p.n)}<small>${S.res.nt[p.i].join(' · ')}</small></span><b>${pt}</b></div>`).join('')}${isHost ? '<button onclick=begin()>เล่นอีกตา</button>' : '<p>รอเจ้าของห้องเริ่มตาใหม่...</p>'}<button class=g onclick=leave()>ออกจากห้อง</button></div></div>`) : ''}`;
  const d = $('dp'); if (d) d.scrollLeft = S.disc.length !== pd ? d.scrollWidth : sl;
}
try { applyTheme(); } catch (e) {}
render();


