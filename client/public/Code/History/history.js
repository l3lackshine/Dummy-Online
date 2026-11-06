/* history.js — หน้าต่างประวัติการเล่น + สถิติแยกเกม (โรดแมพข้อ 9) · 2 แท็บ: ประวัติล่าสุด 30 ตา · สถิติแยกเกม
   ข้อมูลจากฐานข้อมูล (supabase/v16_history.sql: get_game_history / get_game_stats) — ไฟล์นี้แสดงผลอย่างเดียว ไม่คำนวณสถิติเอง
   ตาโหมดซ้อมไม่แสดง (ฐานข้อมูลตัดให้) · ชื่อท่าพิเศษ/ไอคอนอ่านจาก skin/achievements.json (ชุดเดียวกับหน้าความสำเร็จ)
   Public: historyOpen(tab?) · historyTab(tab) — tab = 'recent' | 'stats'
   EXTEND: ตัวเลขใหม่ในการ์ดสถิติ = เพิ่มใน get_game_stats (SQL) แล้วเพิ่มบรรทัดใน statLinesHtml() */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const HISTORY_LIMIT = 30; // จำนวนตาล่าสุดที่แสดง (ฐานข้อมูลรับได้สูงสุด 100)
  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 1440;
  const DAYS_SHOW_RELATIVE = 7; // เก่ากว่านี้แสดงเป็นวันที่แทน "x วันที่แล้ว"

  // ใช้เมื่อยังไม่ได้ต่อเซิร์ฟเวอร์ (RULES ว่าง) — สะกดตาม Code/Profile/profile-card.js
  const GAME_NAMES = { dummy: 'ดัมมี่', pokdeng: 'ป๊อกเด้ง', gaogae: 'เก้าเก', somsip: 'ผสมสิบ', eekae: 'อีแก่' };

  let featLabels = {}; // 'dummy:knock' → { icon, name } จากความสำเร็จที่นับท่านั้น
  let history = null; // ผลจาก get_game_history
  let stats = null; // ผลจาก get_game_stats
  let loading = false;
  let failed = false;
  let openTab = 'recent';

  fetch('./skin/achievements.json')
    .then(r => (r.ok ? r.json() : null))
    .then(readFeatLabels)
    .catch(() => {});

  function readFeatLabels(json) {
    if (!json || !Array.isArray(json.list)) return;
    json.list
      .filter(row => row.metric === 'feat' && row.feat)
      .forEach(row => {
        const key = (row.game || '') + ':' + row.feat;
        if (!featLabels[key]) featLabels[key] = { icon: row.icon || '', name: row.name || row.feat };
      });
  }

  async function load() {
    if (loading || !dbOn()) return;
    loading = true;
    failed = false;
    repaint();
    try {
      // สองคำขอไม่ขึ้นต่อกัน ยิงพร้อมกันให้หน้าต่างขึ้นเร็ว
      const results = await Promise.all([
        DB.call('get_game_history', { p_limit: HISTORY_LIMIT }),
        DB.call('get_game_stats', {}),
      ]);
      history = results[0] || [];
      stats = results[1] || { games: [], total: {} };
    } catch (e) {
      failed = true; // ฐานข้อมูลยังไม่มี v16 → บอกให้รออัปเดต
    }
    loading = false;
    repaint();
  }

  // ---------- ตัวช่วยแปลงข้อมูลเป็นข้อความ ----------
  function gameLabel(gameId) {
    const rules = typeof RULES !== 'undefined' ? RULES : [];
    const rule = rules.find(r => r.id === gameId);
    if (rule) return ((rule.icon || '') + ' ' + rule.name).trim();
    return GAME_NAMES[gameId] || gameId;
  }

  function characterName(characterId) {
    if (!characterId) return '';
    const list = (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || [];
    const character = list.find(c => c.id === characterId);
    return (character && (character.name || character.n)) || characterId;
  }

  function winRate(wins, plays) {
    if (!plays) return 0;
    return Math.round((wins / plays) * 100);
  }

  function timeText(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    const minutes = Math.max(0, (Date.now() - date) / 60000);
    if (minutes < 1) return 'เมื่อสักครู่';
    if (minutes < MINUTES_PER_HOUR) return Math.round(minutes) + ' นาทีที่แล้ว';
    if (minutes < MINUTES_PER_DAY) return Math.round(minutes / MINUTES_PER_HOUR) + ' ชม.ที่แล้ว';
    if (minutes < MINUTES_PER_DAY * DAYS_SHOW_RELATIVE) return Math.round(minutes / MINUTES_PER_DAY) + ' วันที่แล้ว';
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }

  // ---------- แท็บประวัติล่าสุด ----------
  function featChipsHtml(row) {
    return (row.feats || [])
      .map(feat => featLabels[row.game + ':' + feat])
      .filter(Boolean)
      .map(label => `<span class="hs-chip feat">${escape(label.icon)} ${escape(label.name)}</span>`)
      .join('');
  }

  function rewardHtml(row) {
    const parts = [];
    if (row.coins) parts.push(`<b class=hs-coin>+${number(row.coins)} 🪙</b>`);
    if (row.exp) parts.push(`<small>+${number(row.exp)} EXP</small>`);
    return parts.join('') || '<small>—</small>';
  }

  function historyRowHtml(row) {
    const won = row.result === 'win';
    const name = characterName(row.character);
    const meldText = row.melds ? `<span class=hs-chip>เกิด ${number(row.melds)} ชุด</span>` : '';
    const botText = row.bots ? '<span class="hs-chip bot">มีบอท</span>' : '';
    return `<div class="hs-row${won ? ' win' : ''}">
      <span class=hs-res>${won ? 'ชนะ' : 'แพ้'}</span>
      <span class=hs-main>
        <b>${escape(gameLabel(row.game))}</b>
        <small>${name ? escape(name) + ' · ' : ''}${escape(timeText(row.at))}</small>
        <span class=hs-chips>${meldText}${featChipsHtml(row)}${botText}</span>
      </span>
      <span class=hs-rw>${rewardHtml(row)}</span>
    </div>`;
  }

  function recentHtml() {
    if (!history.length) return '<p class=hs-empty>ยังไม่มีประวัติ — เล่นจบสักตาแล้วจะขึ้นที่นี่</p>';
    const note = `<p class=hs-note>${number(history.length)} ตาล่าสุด · ไม่นับตาโหมดซ้อม · "ชนะ" = ได้ที่ 1</p>`;
    return note + `<div class=hs-list>${history.map(historyRowHtml).join('')}</div>`;
  }

  // ---------- แท็บสถิติแยกเกม ----------
  function totalHtml(total) {
    const plays = Number(total.plays) || 0;
    const wins = Number(total.wins) || 0;
    return `<div class=hs-total>
      <div><b>${number(plays)}</b><small>เล่นทั้งหมด</small></div>
      <div><b>${number(wins)}</b><small>ชนะ</small></div>
      <div><b>${winRate(wins, plays)}%</b><small>% ชนะ</small></div>
      <div><b>${number(total.coins)}</b><small>เหรียญที่ได้</small></div>
    </div>`;
  }

  function statLinesHtml(game) {
    const lines = [
      ['ชนะติดกันสูงสุด', number(game.best_streak) + ' ตา'],
      ['ชนะติดกันตอนนี้', number(game.streak) + ' ตา'],
      ['เหรียญที่ได้', number(game.coins) + ' 🪙'],
    ];
    // ชุดและน็อกมีเฉพาะดัมมี่ เกมอื่นเป็น 0 เสมอ จึงซ่อนเมื่อไม่มี
    if (game.melds) lines.push(['เกิดชุดรวม', number(game.melds) + ' ชุด']);
    if (game.knocks) lines.push(['น็อก', number(game.knocks) + ' ครั้ง']);
    if (game.character) lines.push(['ตัวละครที่ใช้บ่อย', escape(characterName(game.character))]);
    lines.push(['เล่นล่าสุด', escape(timeText(game.last_at))]);
    return lines.map(line => `<li><span>${line[0]}</span><b>${line[1]}</b></li>`).join('');
  }

  function gameCardHtml(game) {
    const rate = winRate(game.wins, game.plays);
    return `<div class=hs-game>
      <div class=hs-game-h>
        <b>${escape(gameLabel(game.game))}</b>
        <small>เล่น ${number(game.plays)} · ชนะ ${number(game.wins)}</small>
      </div>
      <div class=hs-rate><i><u style="width:${rate}%"></u></i><em>${rate}% ชนะ</em></div>
      <ul class=hs-lines>${statLinesHtml(game)}</ul>
    </div>`;
  }

  function statsHtml() {
    const games = stats.games || [];
    if (!games.length) return '<p class=hs-empty>ยังไม่มีสถิติ — เล่นจบสักตาแล้วจะขึ้นที่นี่</p>';
    return totalHtml(stats.total || {}) + `<div class=hs-games>${games.map(gameCardHtml).join('')}</div>`;
  }

  // ---------- กรอบหน้าต่าง ----------
  function tabsHtml() {
    const tab = (id, text) => `<button class="hs-tab${openTab === id ? ' on' : ''}" onclick="historyTab('${id}')">${text}</button>`;
    return `<div class=hs-tabs>${tab('recent', '🕘 ประวัติล่าสุด')}${tab('stats', '📊 สถิติแยกเกม')}</div>`;
  }

  function bodyHtml() {
    if (failed) return '<p class=hs-empty>ยังเปิดประวัติไม่ได้ — รอการอัปเดตฐานข้อมูล</p>';
    if (!history || !stats) return '<p class=hs-empty>กำลังโหลด…</p>';
    return openTab === 'stats' ? statsHtml() : recentHtml();
  }

  function boxHtml() {
    const head = `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3 class=hs-h>📜 ประวัติการเล่น</h3>`;
    return `${head}${tabsHtml()}<div class=hs-body>${bodyHtml()}</div>`;
  }

  function repaint() {
    const box = document.querySelector('.hs-modal .st-box');
    if (box) box.innerHTML = boxHtml();
  }

  // ---------- คำสั่งจากหน้าจอ ----------
  window.historyOpen = tab => {
    if (!dbOn()) return;
    if (tab === 'recent' || tab === 'stats') openTab = tab;
    document.querySelectorAll('.hs-modal').forEach(node => node.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal hs-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box hs-box">${boxHtml()}</div>`;
    document.body.appendChild(modal);
    load(); // โหลดใหม่ทุกครั้งที่เปิด จะได้เห็นตาที่เพิ่งเล่นจบ
  };

  window.historyTab = tab => {
    openTab = tab === 'stats' ? 'stats' : 'recent';
    repaint();
  };
})();
