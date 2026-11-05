// กฎ "ดัมมี่" — ประกอบ meta + กติกา (engine.js) + การนับเหรียญ (scoring.js) เป็นโมดูลกฎตามสัญญาใน rules/README.md
const { meta } = require('./meta');
const engine = require('./engine');
const { feats } = require('./feats'); // ท่าพิเศษตอนจบตา (ใช้นับความสำเร็จ ไม่มีผลกับเกม)

module.exports = { meta, ...engine, feats };
