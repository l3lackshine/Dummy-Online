// ข้อมูลประกาศของกฎ "ดัมมี่" — ส่งให้ client ผ่าน event rules:list เพื่อสร้างหน้าตั้งค่าห้องเอง (client ไม่ต้องรู้จักกฎล่วงหน้า)
// options ใช้ได้ 2 ชนิด: number (min/max/step/presets) และ select (choices)
const meta = {
  id: 'dummy',
  name: 'ดัมมี่',
  icon: '🂡',
  desc: 'ดัมมี่ไทย 4 ที่นั่ง เกิดชุด ฝากไพ่ น็อก — แพ้ชนะกันด้วยเหรียญ',
  minPlayers: 1,
  maxPlayers: 4,
  options: [
    { key: 'stake', label: 'เดิมพันต่อตัว (เหรียญ)', type: 'number', default: 20, min: 5, max: 10000, step: 1, presets: [5, 10, 20, 50, 100] },
    { key: 'spetoMode', label: 'อมสเปโตแล้วจบเกม จ่ายให้', type: 'select', default: 'all', choices: [{ v: 'all', label: 'ทุกคนรอบวง' }, { v: 'knocker', label: 'เฉพาะคนน็อก' }] },
  ],
  // สรุปการนับเหรียญที่แสดงในหน้าสร้างห้อง — {stake} = เดิมพัน, {stake*0.75} = เดิมพันคูณ 0.75 (client แทนค่าให้)
  scoring: [
    '🏁 น็อก: คนที่ไม่น็อกจ่ายให้คนน็อก — อันดับสุดท้าย {stake} · อันดับ 3 {stake*0.75} · อันดับ 2 {stake*0.5}',
    '🙅 ตีปี้ (ทิ้งสเปโตหรือไพ่ใบที่ทิ้งก่อนหน้า แล้วอีกคนเก็บไปเกิดได้): คนตีจ่ายให้คนเกิด {stake} ต่อใบ',
    '♠ อมสเปโตจนจบเกม: จ่ายตามตั้งค่า {stake} ต่อสเปโต 1 ใบ ถ้าไม่เคยเกิดเลยจ่ายคูณ 2',
  ],
};
const defaults = () => Object.fromEntries(meta.options.map(o => [o.key, o.default]));

module.exports = { meta, defaults };
