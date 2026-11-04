/* skills-core.js — อ่านข้อมูลสกิล v3 (ไม่แตะ DOM · ใช้ร่วมกันทั้งเกม / สคริปต์สร้าง SQL / เทสต์ฝั่งเซิร์ฟเวอร์)
   ตัวละคร 1 ตัว = สกิล 1 อย่าง (skin/skills.json → characters[id].skill) · สกิลบอกว่าแต่ละเกมใช้โมดูลอะไร (skills[].games[rule].mods)
   ไม่มีค่าความสามารถ (stat) และไม่มีโบนัสเหรียญแล้ว — ดาวปลดของแต่งเท่านั้น */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SkillCore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d) => { v = Number(v); return Number.isFinite(v) ? v : d; };
  const DEF_COSTS = [1, 2, 3, 4];

  // ค่าตั้งของตัวละคร (รวมกับ defaults)
  function charCfg(data, charId) {
    data = data || {};
    const d = data.defaults || {}, c = (data.characters || {})[charId] || {};
    return { maxStars: clamp(Math.floor(num(c.maxStars, num(d.maxStars, 5))), 1, 10), starCosts: c.starCosts || d.starCosts || DEF_COSTS, skill: typeof c.skill === 'string' ? c.skill : null };
  }
  // สกิลของตัวละคร (null = ไม่มี)
  function skillOf(data, charId) {
    const id = charCfg(data, charId).skill; if (!id) return null;
    return ((data && data.skills) || []).find(s => s.id === id && s.enabled !== false) || null;
  }
  // โมดูลที่ตัวละครนี้ใช้ได้ในเกม rule (เช่น ['takeable','melds'])
  function modsOf(data, charId, rule) {
    const s = skillOf(data, charId), g = s && s.games && s.games[rule || 'dummy'];
    return g && Array.isArray(g.mods) ? g.mods.slice() : [];
  }
  // เดิมคือโบนัสเหรียญตามดาว — ยกเลิกแล้ว คืน 0 ทุกดาว (ให้ฐานข้อมูลไม่จ่ายโบนัส)
  function bonusPct(data, charId) { return Array.from({ length: charCfg(data, charId).maxStars }, () => 0); }
  return { clamp, charCfg, skillOf, modsOf, bonusPct, DEF_COSTS };
});
