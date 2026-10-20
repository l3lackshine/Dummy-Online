// กฎ "ดัมมี่" — ประกอบ meta + กติกา (engine.js) + การนับเหรียญ (scoring.js) เป็นโมดูลกฎตามสัญญาใน rules/README.md
const { meta } = require('./meta');
const engine = require('./engine');

module.exports = { meta, ...engine };
