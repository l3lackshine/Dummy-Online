// ส่วนกลางที่ทุกกฎเกมใช้ร่วมกัน (ไม่มีกติกาของเกมใดเกมหนึ่งอยู่ในไฟล์นี้)
const crypto = require('crypto');

// ตัวละคร/พื้นหลังที่ผู้เล่นใช้ได้ — ต้องตรงกับ id ใน client/public/skin/skins.json (test-skins-ids ตรวจให้)
const CHARS = ['boy', 'girl', 'rina-01', 'arya-01', 'rena-01', 'sakuya-ssr', 'rei-r', 'haru-r', 'ken-r', 'leo-r', 'yuna-r', 'miyu-r'];
const BGS = ['sakura-house', 'sakura', 'sakuya-cardroom', 'sakuya-pond'];
const BOT_CHARS = ['boy', 'girl', 'rina-01', 'arya-01', 'rena-01'];   // บอทสุ่มใช้เฉพาะชุดนี้ (ไม่ใช้ตัว SSR/Rare)
const BOT_BGS = BGS.filter(b => !['sakura-house', 'sakuya-cardroom', 'sakuya-pond'].includes(b));
const rnd = n => crypto.randomInt(n);
const rndBg = () => BOT_BGS[rnd(BOT_BGS.length)];
const rndChar = () => BOT_CHARS[rnd(BOT_CHARS.length)];

module.exports = { CHARS, BGS, rnd, rndBg, rndChar };
