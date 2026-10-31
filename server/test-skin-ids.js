// ตรวจว่ารายชื่อตัวละคร/พื้นหลังที่เซิร์ฟเวอร์ยอมรับ ตรงกับ client/public/skin/skins.json (กันตัวละครใหม่ถูกเปลี่ยนเป็นค่าว่างบนโต๊ะ)
const assert = require('assert'), path = require('path');
const { CHARS, BGS } = require('./src/rules/common');
const skins = require(path.join(__dirname, '../client/public/skin/skins.json'));
const ids = k => (skins[k] || []).map(x => x.id).sort();
assert.deepStrictEqual(CHARS.slice().sort(), ids('characters'), 'CHARS ไม่ตรงกับ skins.json');
assert.deepStrictEqual(BGS.slice().sort(), ids('backgrounds'), 'BGS ไม่ตรงกับ skins.json');
console.log('✓ รายชื่อตัวละคร ' + CHARS.length + ' ตัว และพื้นหลัง ' + BGS.length + ' แบบ ตรงกับ skins.json');
