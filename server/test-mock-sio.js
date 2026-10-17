// ตัวจำลอง express / cors / socket.io (ฝั่งเซิร์ฟเวอร์) ไว้ทดสอบ src/index.js ตัวจริงเมื่อไม่มี node_modules
// ความเหมือนจริงที่คงไว้: payload ผ่าน JSON (ไม่แชร์ reference), ส่ง event แบบ async, exception ใน handler "ไม่ถูกดัก" (ทำโปรเซสล้มเหมือน socket.io จริง)
const Module = require('module'), servers = []; let cnt = 0;
const wire = a => JSON.parse(JSON.stringify(a === undefined ? [] : a));
class Sock {
  constructor(srv) { this.id = 'S' + (++cnt); this.srv = srv; this.data = {}; this.rooms = new Set(); this.h = {}; this.cl = {}; this.alive = true; this.connected = true; }
  on(ev, f) { (this.h[ev] = this.h[ev] || []).push(f); return this; }
  join(r) { this.rooms.add(r); } leave(r) { this.rooms.delete(r); }
  emit(ev, ...a) { if (!this.alive) return; const w = wire(a); setImmediate(() => { if (this.alive) (this.cl[ev] || []).forEach(f => f(...w)); }); }
  fromClient(ev, ...a) { if (!this.alive) return; const w = wire(a); setImmediate(() => (this.h[ev] || []).forEach(f => f(...w))); }
  drop() { if (!this.alive) return; this.alive = false; this.connected = false; this.srv.sockets.sockets.delete(this.id); (this.h.disconnect || []).forEach(f => f()); }
}
class Server {
  constructor() { this.sockets = { sockets: new Map() }; this.conn = []; servers.push(this); }
  on(ev, f) { if (ev === 'connection') this.conn.push(f); }
  to(t) { return { emit: (ev, ...a) => this.sockets.sockets.forEach(s => { if (s.id === t || s.rooms.has(t)) s.emit(ev, ...a); }) }; }
  connect() { const s = new Sock(this); this.sockets.sockets.set(s.id, s); this.conn.forEach(f => f(s)); return s; }
}
// client ฝั่งทดสอบ (หน้าตาเหมือน socket.io-client)
function client(srv) {
  const s = srv.connect(), c = { connected: true, id: s.id };
  c.on = (ev, f) => { (s.cl[ev] = s.cl[ev] || []).push(f); if (ev === 'connect') setImmediate(f); return c; };
  c.emit = (ev, d) => { s.fromClient(ev, d); return c; };
  c.close = () => { c.connected = false; s.drop(); };
  Object.defineProperty(c, 'connected', { get: () => s.alive });
  s.emit('system:notice', 'เชื่อมต่อเซิร์ฟเวอร์แล้ว');
  return c;
}
const apps = []; const express = () => { const a = { routes: {}, use() {}, get(p, f) { a.routes[p] = f; } }; apps.push(a); return a; }; express.json = () => () => {};
const mocks = { express, cors: () => () => {}, 'socket.io': { Server } };
const orig = Module._load; Module._load = function (req, ...r) { return mocks[req] || orig.call(this, req, ...r); };
const callRoute = (srv, p) => { let out; apps[servers.indexOf(srv)].routes[p]({}, { json: v => (out = v), send: v => (out = v) }); return out; };
module.exports = { servers, client, callRoute, load(envv) { Object.assign(process.env, envv); if (!Object.prototype.hasOwnProperty.call(envv || {}, 'WALLET_FILE')) process.env.WALLET_FILE = 'memory'; delete require.cache[require.resolve('./src/index.js')]; require('./src/index.js'); return servers[servers.length - 1]; } };
