// ส่วนกลางที่ทุกกฎเกมใช้ร่วมกัน (ไม่มีกติกาของเกมใดเกมหนึ่งอยู่ในไฟล์นี้)
const crypto = require('crypto');

const CHARS = ['boy', 'girl', 'rina-01']; // ต้องตรงกับ id ใน client/public/skin/skins.json (characters)
const BGS = ['room-night', 'room-day', 'room-sakura', 'sunset', 'sakura', 'night', 'forest', 'gold']; // ต้องตรงกับ skins.json (backgrounds)
const rnd = n => crypto.randomInt(n);
const rndBg = () => BGS[rnd(BGS.length)];
const rndChar = () => CHARS[rnd(CHARS.length)];

module.exports = { CHARS, BGS, rnd, rndBg, rndChar };
