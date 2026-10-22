/* skills-core.js — คำนวณค่าความสามารถของ "ตัวละคร" (ไม่แตะ DOM · ใช้ร่วมกันทั้งเกม / Skill Studio / สคริปต์สร้าง SQL)
   ค่าความสามารถ (stat) ของตัวละคร = base + perStar × (ดาว − 1)  แล้วบีบให้อยู่ในช่วง 0..max ของ stat
   ค่าพารามิเตอร์ของสกิล = ค่าเริ่มต้น + stat ที่ผูกไว้ × per  (ตาม scale/limit ใน skills.json) */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.SkillCore = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d) => { v = Number(v); return Number.isFinite(v) ? v : d; };
  const DEF_COSTS = [500, 1000, 2000, 4000];

  // ค่าตั้งของตัวละคร (รวมกับ defaults) — รองรับรูปแบบเก่า characters[id] = [skillIds]
  function charCfg(data, charId) {
    data = data || {};
    const d = data.defaults || {}, raw = (data.characters || {})[charId], c = Array.isArray(raw) ? { skills: raw } : (raw || {});
    const stats = {};
    (data.stats || []).forEach(s => {
      const o = (c.stats && c.stats[s.id]) || (d.stats && d.stats[s.id]) || {};
      stats[s.id] = { base: num(o.base, 0), perStar: num(o.perStar, 0) };
    });
    return { maxStars: clamp(Math.floor(num(c.maxStars, num(d.maxStars, 5))), 1, 10), starCosts: c.starCosts || d.starCosts || DEF_COSTS, stats, skills: Array.isArray(c.skills) ? c.skills : [] };
  }
  function statValue(data, statId, charId, stars) {
    const cfg = charCfg(data, charId), o = cfg.stats[statId]; if (!o) return 0;
    const def = ((data.stats || []).find(s => s.id === statId)) || {};
    const st = clamp(Math.floor(num(stars, 1)), 1, cfg.maxStars);
    return clamp(Math.round((o.base + o.perStar * (st - 1)) * 100) / 100, 0, num(def.max, 10));
  }
  // ค่าพารามิเตอร์ k ของสกิล s · statOf(statId) → ค่า stat ปัจจุบัน
  function skillVal(s, k, statOf) {
    const base = num((s.params || {})[k], 0), sc = (s.scale || {})[k], lim = (s.limit || {})[k];
    let v = base + (sc ? statOf(sc.stat) * num(sc.per, 0) : 0);
    if (lim && lim.length === 2) v = clamp(v, lim[0], lim[1]);
    return k === 'uses' || k === 'ranks' ? Math.floor(v + 1e-9) : Math.round(v * 10) / 10;
  }
  // โบนัสเหรียญ (%) ของตัวละครที่ดาว 1..maxStars (สกิล coinbonus) — ใช้สร้าง character_defs.bonus_pct ให้ฐานข้อมูลคิดเหรียญจริง
  function bonusPct(data, charId) {
    const cfg = charCfg(data, charId), sk = (data.skills || []).find(s => s.effect === 'coinbonus' && s.enabled !== false && cfg.skills.includes(s.id));
    const out = [];
    for (let st = 1; st <= cfg.maxStars; st++) out.push(sk ? Math.max(0, Math.floor(skillVal(sk, 'pct', id => statValue(data, id, charId, st)))) : 0);
    return out;
  }
  return { clamp, charCfg, statValue, skillVal, bonusPct, DEF_COSTS };
});
