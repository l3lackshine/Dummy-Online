/* progress.js — รางวัลจบตา + เลเวลผู้เล่น ฝั่งตัวเกม (คู่กับ economy.js)
   ระบบ "เล่นแล้วได้ ไม่มีเสีย": จบตาได้เหรียญตามอันดับ · แต้ม/ชิปในโต๊ะใช้จัดอันดับเท่านั้น
   - โหมดบัญชี: เซิร์ฟเวอร์ + ฐานข้อมูลคิดให้ แล้วส่ง wallet:update มา (เก็บไว้ที่ Progress.last)
   - โหมดไม่ล็อกอิน: คิดในเครื่องด้วยสูตรเดียวกัน (มีเพดานรายวันเหมือนกัน)
   Public: Progress.onWallet(d) · Progress.settleLocal(S) → เหรียญที่ได้ · Progress.forGame(S) → ผลของตานี้ · Progress.panel(S) → HTML แผงรางวัล
           Progress.level() → { level, into, need } · Progress.badge() → HTML ป้ายเลเวล */
(function () {
  'use strict';
  const E = window.Economy, LS = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const get = (k, d) => { try { const v = LS && LS.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { LS && LS.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const dbOn = () => !!(window.DB && DB.enabled && DB.P);
  const today = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };   // วันตามเวลาไทย
  const N = n => Number(n || 0).toLocaleString('en-US');
  const byGid = {};          // gid → ผลจากเซิร์ฟเวอร์ (โหมดบัญชี)

  // อันดับ/จำนวนที่นั่งของตานี้ (ใช้ชิป/แต้มในโต๊ะ · เสมอกัน: ผู้ชนะตามกติกาได้อันดับดีกว่า — ตรงกับเซิร์ฟเวอร์)
  function standing(S) {
    const d = (S.res && S.res.coin && S.res.coin.delta) || S.P.map(() => 0);
    const win = S.res && (S.res.winner != null ? S.res.winner : S.res.k != null ? S.res.k : null);
    const r = E.ranks(d.map((v, i) => (Number(v) || 0) + (i === win ? 0.5 : 0)));
    const humans = S.P.filter(p => !p.bot).length;
    return { rank: r[S.my], seats: S.P.length, humans };
  }

  // โหมดไม่ล็อกอิน: จ่ายเหรียญในเครื่อง 1 ครั้งต่อตา (เพดานรายวัน + EXP เหมือนบัญชี)
  function settleLocal(S) {
    const st = standing(S), raw = E.reward(st.rank, st.seats, st.humans), day = today();
    const t = get('dummyToday', {}); if (t.day !== day) { t.day = day; t.coins = 0; }
    const paid = t.coins >= E.CFG.DAILY_CAP ? Math.min(raw, E.CFG.OVER_CAP) : Math.min(raw, Math.max(E.CFG.DAILY_CAP - t.coins, E.CFG.OVER_CAP));
    t.coins += paid; set('dummyToday', t);
    const exp0 = Number(get('dummyExp', 0)) || 0, gain = E.expFor(st.rank), lv0 = E.levelOf(exp0).level, lv1 = E.levelOf(exp0 + gain).level;
    set('dummyExp', exp0 + gain);
    let lvCoins = 0; for (let lv = lv0 + 1; lv <= lv1; lv++) lvCoins += E.levelReward(lv).coins;   // เพชรมีแค่โหมดบัญชี
    byGid[S.gid] = { gid: S.gid, rank: st.rank, seats: st.seats, delta: paid, raw, capped: paid < raw, exp: gain, level: lv1, level_up: lv1 > lv0, level_coins: lvCoins, level_mcash: 0, local: true, today_coins: t.coins, cap: E.CFG.DAILY_CAP };
    return paid + lvCoins;
  }
  function onWallet(d) { if (d && d.gid && !d.duplicate) byGid[d.gid] = d; }
  // ผลของตานี้: โหมดบัญชีรอเซิร์ฟเวอร์ (ระหว่างรอ แสดงค่าประมาณจากสูตรเดียวกัน)
  function forGame(S) {
    if (!S || !S.over) return null;
    if (byGid[S.gid]) return byGid[S.gid];
    const st = standing(S), est = { gid: S.gid, rank: st.rank, seats: st.seats, delta: E.reward(st.rank, st.seats, st.humans), exp: E.expFor(st.rank), pending: true };
    // เล่นกับบอท (บัญชี): ประมาณตามโหมดฟาร์ม · สตามิน่าไม่พอ = โหมดซ้อม
    if (dbOn() && S.P.some(p => p.bot) && window.Farm && window.Stamina) {
      const fr = E.farmReward(Farm.get(), st.rank, st.seats), sn = Stamina.now(), prac = !!sn && sn.stamina < sn.cost;
      Object.assign(est, { bots: true, farm: fr.farm, delta: prac ? 0 : fr.coins, items: prac ? {} : fr.items, practice: prac, exp: prac ? 0 : est.exp + (fr.exp || 0) });
    }
    return est;
  }
  function level() {
    const exp = dbOn() ? Number(DB.P.player_exp) || 0 : Number(get('dummyExp', 0)) || 0;
    const L = E.levelOf(exp); return Object.assign(L, { exp });
  }
  const badge = () => { const L = level(); return `<span class=lv-badge title="EXP ${N(L.into)}/${N(L.need)}">Lv.${L.level}</span>`; };

  // แผงรางวัลในหน้าสรุปผล (ใช้ร่วมกันทุกเกม)
  function panel(S) {
    const g = forGame(S); if (!g) return '';
    const medal = ['🥇', '🥈', '🥉'][g.rank - 1] || '#' + g.rank, L = level();
    const pct = Math.min(100, Math.round((L.into / L.need) * 100));
    const extra = [g.level_up ? `<div class="pg-up">⬆ เลเวล ${g.level}!${g.level_mcash ? ` +${g.level_mcash} 💎` : ''}${g.level_coins ? ` +${N(g.level_coins)} 🪙` : ''}</div>` : '',
      g.bp ? `<div class=pg-kv><span>แบทเทิลพาส</span><b>+${N(g.bp)} EXP</b></div>` : '',
      g.capped ? `<div class=pg-cap>ครบเพดานเหรียญวันนี้แล้ว (${N(g.cap || E.CFG.DAILY_CAP)}) · ได้ตาละ ${E.CFG.OVER_CAP}</div>` : ''].join('');
    const items = g.items && Object.keys(g.items).length && window.Farm ? Farm.itemsLine(g.items) : '';
    const big = g.practice ? `<span class=pg-prac>โหมดซ้อม</span><em class=pg-wait>สตามิน่าไม่พอ · ตานี้ไม่ได้รางวัล</em>` : g.farm === 'pexp' && !g.delta ? `<b class=pos>+${N(g.exp)} EXP</b>` : items && !g.delta ? `<span class="pg-items big">${items}</span>` : `<b class=pos>+${N(g.delta)} 🪙</b>${items ? `<span class=pg-items>${items}</span>` : ''}`;
    const st = g.bots && g.stamina != null ? `<div class=rs-kv><span>สตามิน่า</span><b><img class=st-ic src="./Item/Mats/stamina.svg" alt=""> ${N(g.stamina)}/${N(g.max)}</b></div>` : '';
    return `<aside class="rs-me pg-me"><div class=rs-big><small>${g.bots ? 'ของที่ฟาร์มได้' : 'รางวัลตานี้'}</small>${big}${g.pending ? '<em class=pg-wait>กำลังบันทึก…</em>' : ''}</div>
      <div class=rs-kv><span>อันดับ</span><b>${medal} ที่ ${g.rank}/${g.seats}</b></div>
      <div class=rs-kv><span>รวมทั้งหมด</span><b>🪙 ${N(typeof sv !== 'undefined' ? sv.coins : 0)}</b></div>${st}
      <div class=pg-lv><span>Lv.${L.level}</span><i><u style="width:${pct}%"></u></i><small>+${g.exp} EXP</small></div>${extra}</aside>`;
  }
  window.Progress = { onWallet, settleLocal, forGame, panel, level, badge, standing };
})();
