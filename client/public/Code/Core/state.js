/* state.js — ค่าตั้งหน้าเว็บ + ตัวแปรสถานะกลางของ client (ทุกไฟล์ใช้ร่วมกันแบบตัวแปร global)
   ไฟล์นี้ต้องโหลดก่อนไฟล์อื่นของหน้าเกม (ดูลำดับใน index.html) เพราะไฟล์อื่นอ่าน/เขียนตัวแปรเหล่านี้
   Public: CFG · $ · esc · save() · screen, sv, nick, S, lob, code, sock, RULES, createSel ฯลฯ
   EXTEND: สถานะใหม่ที่หลายหน้าใช้ร่วมกัน ให้ประกาศที่นี่ · สถานะของหน้าเดียว ให้ประกาศในไฟล์ของหน้านั้น */
const CFG = window.DUMMY_CONFIG || {},
  $ = id => document.getElementById(id);
// ปลุกเซิร์ฟเวอร์ (Render ฟรีจะหลับเมื่อไม่มีคนใช้) ตั้งแต่เปิดหน้าเว็บ เพื่อไม่ให้ต้องรอตอนกดเล่น
if (CFG.BACKEND_URL) {
  try {
    fetch(CFG.BACKEND_URL.replace(/\/$/, '') + '/health', { mode: 'no-cors' }).catch(() => {});
  } catch (e) {}
}
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
let screen = 'home',
  ho = [],
  sel = new Set(),
  sm = 0,
  paid = false,
  coinDelta = 0,
  prevM = 0,
  prevD = 0,
  hint = '',
  lerr = '';
let sv = {
    name: localStorage.getItem('dummyName') || 'ผู้เล่น',
    coins: Number(localStorage.getItem('dummyCoins') || '5000'),
    own: JSON.parse(localStorage.getItem('dummyOwned') || '[\"classic\"]'),
    eq: localStorage.getItem('dummySkin') || 'classic',
  },
  nick = localStorage.getItem('dummyName') || 'ผู้เล่น';
let shufAnim = null,
  shufTimer = null;
const APP_VER = String(window.DUMMY_VERSION || ''); // เลขเวอร์ชันของ client (ตั้งที่ client/public/version.js)
let RULES = [],
  SRV_VER = '',
  createMode = 'room',
  createSel = { rule: 'dummy', options: {} }, // ค่าจริงโหลดใน Lobby/create-room.js (loadCreateSel)
  deal = null,
  dealtGid = null;
let authed = !(window.DB && DB.enabled),
  aerr = '',
  S = null,
  lob = null,
  tok = null,
  code = '',
  isHost = false,
  sock = null,
  noio = false,
  soloPending = false,
  soloRoom = false;
const save = () => {
  localStorage.setItem('dummyCoins', sv.coins);
  localStorage.setItem('dummyOwned', JSON.stringify(sv.own));
  localStorage.setItem('dummySkin', sv.eq);
  localStorage.setItem('dummyName', sv.name || nick);
};
