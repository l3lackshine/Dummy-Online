/* profile-card.js — หน้าโปรไฟล์แบบบัตรผู้เล่น (แนว Arknights: Endfield): ฉากหลังตัวละครเด่น · บัตรผู้เล่น + คัดลอกชื่อผู้ใช้ ·
   เลเวล + ระดับนักไพ่ · ตัวเลขสะสม · ความชำนาญรายเกม · เส้นทางแห่งเกียรติยศ (เหรียญฉายา 6 ช่อง) · ตู้โชว์ 4 ช่อง · ข้อความแนะนำตัว ·
   ธีม 3 แบบ · โหมดดูภาพ · ดูบัตรของคนอื่น
   ข้อมูลจากฐานข้อมูล (supabase/v13_profile_card.sql: get_profile_card / set_profile_card) · ยังไม่ได้รัน SQL = ใช้ข้อมูลจาก DB.P แสดงแบบอ่านอย่างเดียว
   เขียนทับ profileView() ของ Account/profile-page.js (ไฟล์นี้โหลดทีหลัง) · หน้าเดิมยังเปิดได้จากปุ่ม "ชื่อ/ฉายา"
   Public: profileView() · profileCardOpen(username) · pcEdit() · pcTheme() · pcViewArt() · pcCopy(text) · pcOldPage() · pcBack() · ProfileCard.refresh()
   EXTEND: ธีมใหม่ = เพิ่มใน THEMES + กฎ .pc-theme-<id> ใน profile-card.css + ชื่อใน set_profile_card (SQL) */
(function () {
  'use strict';
  const { escape, number, dbOn } = window.UiKit;

  const THEMES = [
    ['sakura', 'ซากุระ'],
    ['night', 'ราตรี'],
    ['teahouse', 'โรงน้ำชา'],
  ];
  const GAME_NAMES = { dummy: 'ดัมมี่', pokdeng: 'ป๊อกเด้ง', gaogae: 'เก้าเก', somsip: 'ผสมสิบ', eekae: 'อีแก่' };
  const SHOWCASE_SLOTS = 4;
  const MEDAL_SLOTS = 6;
  const BIO_MAX = 60;
  // ความชำนาญรายเกม (แสดงผลอย่างเดียว ไม่มีรางวัล): แต้ม = ตาที่เล่น + ชนะ×2 · ทุก 10 แต้ม = 1 เลเวล · สูงสุด 50
  const MASTERY_STEP = 10;
  const MASTERY_MAX = 50;

  let myCard = null; // บัตรของตัวเองล่าสุดจากฐานข้อมูล
  let loading = false;
  let needsSql = false; // ฐานข้อมูลยังไม่มี v13 → แก้ไขบัตรไม่ได้
  let artMode = false;
  let oldMode = false; // กำลังเปิดหน้าโปรไฟล์เดิม (แก้ชื่อ/ฉายา)
  let oldProfileView = null;

  const characters = () => (typeof SKIN_REGISTRY !== 'undefined' && SKIN_REGISTRY.characters) || [];
  const charById = id => characters().find(c => c.id === id) || null;
  const gameName = id => {
    const rule = typeof ruleMeta === 'function' ? ruleMeta(id) : null;
    return (rule && rule.name) || GAME_NAMES[id] || id;
  };

  function masteryOf(row) {
    const points = Number(row.plays || 0) + Number(row.wins || 0) * 2;
    const level = Math.min(MASTERY_MAX, 1 + Math.floor(points / MASTERY_STEP));
    const percent = level >= MASTERY_MAX ? 100 : Math.round(((points % MASTERY_STEP) / MASTERY_STEP) * 100);
    return { level, percent };
  }

  // บัตรจากข้อมูลในเครื่อง (ใช้ตอนฐานข้อมูลยังไม่มี v13)
  function cardFromLocalProfile() {
    const P = DB.P;
    const inventory = P.inventory || [];
    return {
      mine: true,
      username: P.username,
      name: P.display_name,
      title: P.title,
      created_at: P.created_at,
      level: P.level,
      bio: '',
      theme: 'sakura',
      featured: (P.equipped || {}).characters || null,
      best_streak: P.best_streak,
      showcase: [],
      medals: [],
      titles_all: [],
      counts: {
        characters: Object.keys(P.characters || {}).length,
        items: inventory.filter(i => i.kind !== 'characters').length,
        titles: 0,
      },
      mastery: (P.stats || []).map(g => ({ game: g.game_id, plays: g.plays, wins: g.wins })),
    };
  }

  async function loadMyCard() {
    if (loading) return;
    loading = true;
    try {
      myCard = await DB.call('get_profile_card', {});
      needsSql = false;
    } catch (e) {
      myCard = cardFromLocalProfile();
      needsSql = true;
    }
    loading = false;
    if (typeof screen === 'undefined' || screen !== 'profile') return;
    try {
      render();
    } catch (e) {}
  }

  // ---------- ชิ้นส่วนของบัตร ----------
  function joinDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function avatarHtml(card) {
    const id = card.featured || (card.showcase[0] || {}).id || null;
    // ยังไม่ตั้งตัวละครเด่น/ตู้โชว์ (บัญชีใหม่) → avFace ใช้อีโมจิตามชื่อแทน เหมือนรูปที่แถบด้านบน
    if (typeof avFace === 'function') return avFace(card.name, id);
    return '<span class=pc-av-empty>?</span>';
  }

  function playerCardHtml(card) {
    const badge = card.badge ? `<em class=pc-badge>👑 ${escape(card.badge)}</em>` : '';
    const copy = `<button class=pc-copy onclick="pcCopy('${escape(card.username)}')" aria-label="คัดลอกชื่อผู้ใช้">คัดลอก</button>`;
    return `<div class=pc-id>
      <div class=pc-av>${avatarHtml(card)}</div>
      <div class=pc-who><b>${escape(card.name)}</b><small>@${escape(card.username)} ${copy}</small>
        <span class=pc-since>เริ่มเล่น ${escape(joinDate(card.created_at))}</span>${badge}</div>
    </div>`;
  }

  function levelsHtml(card) {
    const masteryTotal = (card.mastery || []).reduce((sum, row) => sum + masteryOf(row).level, 0);
    const rank = card.rank && card.rank.tier_name ? `<span class=pc-rank>🏆 ${escape(card.rank.tier_name)}</span>` : '';
    return `<div class=pc-lvs>
      <div class=pc-lv><i>✦</i><span>เลเวลผู้เล่น</span><b>${number(card.level || 1)}</b></div>
      <div class=pc-lv><i>✦</i><span>ระดับนักไพ่</span><b>${number(masteryTotal)}</b></div>
      ${rank}
    </div>`;
  }

  function countsHtml(card) {
    const c = card.counts || {};
    const box = (value, label) => `<div><b>${number(value || 0)}</b><small>${label}</small></div>`;
    return `<div class=pc-counts>${box(c.characters, 'ตัวละคร')}${box(c.items, 'ของแต่ง')}${box(c.titles, 'ฉายา')}</div>`;
  }

  function masteryHtml(card) {
    const rows = (card.mastery || []).filter(row => row.plays > 0);
    if (!rows.length) return '<div class=pc-mastery><h4>ความชำนาญรายเกม</h4><p class=pc-mut>ยังไม่มีสถิติ — ลงโต๊ะสักตาเลย!</p></div>';
    const items = rows
      .map(row => {
        const m = masteryOf(row);
        return `<div class=pc-ms><span>${escape(gameName(row.game))}</span><i><u style="width:${m.percent}%"></u></i><b>Lv.${m.level}</b></div>`;
      })
      .join('');
    return `<div class=pc-mastery><h4>ความชำนาญรายเกม</h4>${items}</div>`;
  }

  // เหรียญหกเหลี่ยม: ได้ฉายาซ้ำหลายครั้ง = ขั้นสูงขึ้น (ทองแดง → เงิน → ทอง + เงาโฮโล)
  // ฉายาจากความสำเร็จ (id ขึ้นต้น ach:) ใช้ times เป็นระดับเหรียญ 1-3 · ฉายาอื่นนับครั้งที่ได้
  const ACH_TIERS = { 1: 'bronze', 2: 'silver', 3: 'gold' };
  function medalTier(times, id) {
    if (String(id || '').startsWith('ach:')) return ACH_TIERS[times] || 'bronze';
    if (times >= 5) return 'gold';
    if (times >= 2) return 'silver';
    return 'bronze';
  }

  function medalsHtml(card) {
    const medals = card.medals || [];
    const slots = [];
    for (let i = 0; i < MEDAL_SLOTS; i++) {
      const m = medals[i];
      slots.push(
        m
          ? `<div class="pc-medal ${medalTier(m.times, m.id)}" title="${escape(m.name)}"><span>${escape(m.name)}</span>${m.times > 1 && !String(m.id).startsWith('ach:') ? `<em>×${m.times}</em>` : ''}</div>`
          : '<div class="pc-medal empty"><span>—</span></div>'
      );
    }
    const more = card.mine && window.achOpen ? '<button class=pc-more onclick="achOpen()">ความสำเร็จ ›</button>' : '';
    return `<section class=pc-glory><h4>เส้นทางแห่งเกียรติยศ${more}</h4><div class=pc-medals>${slots.join('')}</div></section>`;
  }

  function showcaseHtml(card) {
    const list = card.showcase || [];
    const slots = [];
    for (let i = 0; i < SHOWCASE_SLOTS; i++) {
      const item = list[i];
      const c = item && charById(item.id);
      if (!c) {
        slots.push('<div class="pc-op empty"><span>+</span></div>');
        continue;
      }
      const image = c.asset || '';
      slots.push(`<div class="pc-op ${escape(c.rarity || '')}"><img src="${escape(image)}" alt="">
        <b>${escape(c.name)}</b><small>${'★'.repeat(Math.max(1, Number(item.stars) || 1))} · Lv.${number(item.level || 1)}</small></div>`);
    }
    return `<section class=pc-show><h4>ตู้โชว์ตัวละคร</h4><div class=pc-ops>${slots.join('')}</div></section>`;
  }

  function bioHtml(card) {
    const text = card.bio ? escape(card.bio) : card.mine ? 'ยังไม่ได้เขียนข้อความแนะนำตัว — กด "แก้ไขบัตร" เพื่อเขียน' : '…';
    return `<blockquote class=pc-bio>${text}</blockquote>`;
  }

  function cardHtml(card) {
    const featured = charById(card.featured);
    const bg = featured && featured.asset ? `<div class=pc-art style="background-image:url('${escape(assetUrl(featured.asset))}')"></div>` : '';
    const theme = THEMES.some(t => t[0] === card.theme) ? card.theme : 'sakura';
    return `<div class="pc pc-theme-${theme}${artMode ? ' art-only' : ''}">${bg}
      <div class=pc-left>${playerCardHtml(card)}${levelsHtml(card)}${countsHtml(card)}${masteryHtml(card)}</div>
      <div class=pc-right>${medalsHtml(card)}${showcaseHtml(card)}${bioHtml(card)}</div>
      <div class=pc-bar>${card.mine ? myButtons() : ''}<button onclick="pcViewArt()">${artMode ? '◧ แสดงแผง' : '◨ ดูภาพ'}</button></div>
    </div>`;
  }

  // ปุ่มเปิดหน้าความสำเร็จ (Code/Achievements/achievements.js) พร้อมจุดแดงจำนวนขั้นที่รับได้
  function achButton() {
    if (!window.achOpen) return '';
    const ready = window.Achievements ? Achievements.count() : 0;
    return `<button class=pc-ach onclick="achOpen()">🏅 ความสำเร็จ${ready ? `<em>${ready}</em>` : ''}</button>`;
  }

  // ปุ่มเปิดหน้าประวัติการเล่น + สถิติแยกเกม (Code/History/history.js)
  function historyButton() {
    if (!window.historyOpen) return '';
    return '<button onclick="historyOpen()">📜 ประวัติ</button>';
  }

  function myButtons() {
    const note = needsSql ? '<small class=pc-warn>ต้องอัปเดตฐานข้อมูลก่อนแก้ไขบัตร</small>' : '';
    return `<button class=go onclick="pcEdit()" ${needsSql ? 'disabled' : ''}>✎ แก้ไขบัตร</button><button onclick="pcTheme()" ${needsSql ? 'disabled' : ''}>🎨 ธีม</button><button onclick="pcOldPage()">ชื่อ / ฉายา</button>${achButton()}${historyButton()}${note}`;
  }

  // ---------- หน้าโปรไฟล์ของตัวเอง ----------
  function showOldPage() {
    oldProfileView();
    const back = document.querySelector('.pg .hud-back');
    if (back) back.setAttribute('onclick', 'pcBack()');
  }

  function profileView() {
    if (!dbOn()) return oldProfileView ? oldProfileView() : undefined;
    // หน้าเดิมเรียก render() ตอนพิมพ์ชื่อ — ถ้ายังอยู่ในหน้าเดิม ให้วาดหน้าเดิมต่อ · มาจากหน้าอื่น = กลับเป็นบัตร
    if (oldMode && document.querySelector('.pg[data-pg="pv"]')) return showOldPage();
    oldMode = false;
    // เพิ่งเข้าหน้านี้จากหน้าอื่น → โหลดบัตรใหม่เบื้องหลัง (อาจเพิ่งเปลี่ยนตัวละคร/ได้ของใหม่) ระหว่างนั้นโชว์บัตรเดิมไปก่อน
    const enteringPage = !document.querySelector('.pg[data-pg="pc"]');
    if (enteringPage || !myCard) loadMyCard();
    if (!myCard) {
      page2('โปรไฟล์', '<p class=note>กำลังโหลดบัตรผู้เล่น…</p>', 'home');
      const page = document.querySelector('.pg');
      if (page) page.dataset.pg = 'pc';
      return;
    }
    page2('โปรไฟล์', cardHtml(myCard), 'home');
    const page = document.querySelector('.pg');
    if (page) page.dataset.pg = 'pc';
  }

  window.pcOldPage = () => {
    if (!oldProfileView) return;
    oldMode = true;
    showOldPage();
  };
  window.pcBack = () => {
    oldMode = false;
    myCard = null; // ชื่อ/ฉายาอาจเปลี่ยน → โหลดบัตรใหม่
    render();
  };
  window.pcViewArt = () => {
    artMode = !artMode;
    const open = document.querySelector('.pc-modal .pc');
    if (open) open.classList.toggle('art-only', artMode);
    else render();
  };
  window.pcCopy = text => {
    const done = () => window.dbToast && dbToast('คัดลอก @' + text + ' แล้ว');
    try {
      navigator.clipboard.writeText(text).then(done, done);
    } catch (e) {
      done();
    }
  };

  async function saveCard(fields) {
    try {
      myCard = await DB.call('set_profile_card', fields);
      render();
      return true;
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'บันทึกไม่สำเร็จ');
      return false;
    }
  }

  window.pcTheme = () => {
    const index = THEMES.findIndex(t => t[0] === myCard.theme);
    const next = THEMES[(index + 1) % THEMES.length];
    if (window.dbToast) dbToast('ธีม: ' + next[1]);
    saveCard({ p_theme: next[0] });
  };

  // ---------- หน้าต่างแก้ไขบัตร ----------
  const ownedCharacters = () =>
    characters().filter(c => (DB.P.characters || {})[c.id] || DB.qty('characters', c.id) > 0 || Number(c.price || 0) === 0);
  let draft = null;

  function editorHtml() {
    const chars = ownedCharacters();
    const charPick = (field, max) =>
      chars
        .map(c => {
          const on = draft[field].includes(c.id);
          return `<button class="pc-pick${on ? ' on' : ''}" onclick="pcPick('${field}','${escape(c.id)}',${max})"><img src="${escape(c.asset || '')}" alt=""><span>${escape(c.name)}</span>${on && max > 1 ? `<em>${draft[field].indexOf(c.id) + 1}</em>` : ''}</button>`;
        })
        .join('');
    const titles = myCard.titles_all || [];
    const titlePick = titles.length
      ? titles
          .map(t => {
            const on = draft.pinned.includes(t.id);
            return `<button class="pc-tpick${on ? ' on' : ''}" onclick="pcPick('pinned','${escape(t.id)}',${MEDAL_SLOTS})">${escape(t.name)}${t.times > 1 ? ' ×' + t.times : ''}</button>`;
          })
          .join('')
      : '<p class=pc-mut>ยังไม่มีฉายา — ได้จากอันดับรายสัปดาห์ และความสำเร็จในอนาคต</p>';
    return `<button class=st-x onclick="this.closest('.st-modal').remove()">✕</button><h3>✎ แก้ไขบัตรผู้เล่น</h3>
      <label class=pc-f><span>ข้อความแนะนำตัว (ไม่เกิน ${BIO_MAX} ตัวอักษร)</span><input id=pcBio maxlength=${BIO_MAX} value="${escape(draft.bio)}" oninput="pcDraftBio(this.value)"></label>
      <div class=pc-f><span>ตัวละครเด่น (ฉากหลังบัตร)</span><div class=pc-picks>${charPick('featured', 1)}</div></div>
      <div class=pc-f><span>ตู้โชว์ (เลือกได้ ${SHOWCASE_SLOTS} ตัว ตามลำดับที่กด)</span><div class=pc-picks>${charPick('showcase', SHOWCASE_SLOTS)}</div></div>
      <div class=pc-f><span>เหรียญเกียรติยศที่ปักโชว์ (${MEDAL_SLOTS} อัน)</span><div class=pc-tpicks>${titlePick}</div></div>
      <button class="wbtn go pc-save" onclick="pcSave()">บันทึก</button>`;
  }

  function repaintEditor() {
    const box = document.querySelector('.pc-edit .st-box');
    if (box) box.innerHTML = editorHtml();
  }

  window.pcEdit = () => {
    if (!myCard || needsSql) return;
    draft = {
      bio: myCard.bio || '',
      featured: myCard.featured ? [myCard.featured] : [],
      showcase: (myCard.showcase || []).map(s => s.id),
      pinned: (myCard.medals || []).map(m => m.id),
    };
    document.querySelectorAll('.pc-edit').forEach(n => n.remove());
    const modal = document.createElement('div');
    modal.className = 'st-modal pc-edit';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    modal.innerHTML = `<div class="st-box pc-edit-box">${editorHtml()}</div>`;
    document.body.appendChild(modal);
  };
  window.pcDraftBio = value => {
    draft.bio = value;
  };
  window.pcPick = (field, id, max) => {
    const list = draft[field];
    const at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1);
    else if (max === 1) draft[field] = [id];
    else if (list.length < max) list.push(id);
    else if (window.dbToast) dbToast('เลือกได้ไม่เกิน ' + max);
    repaintEditor();
  };
  window.pcSave = async () => {
    const ok = await saveCard({
      p_bio: draft.bio,
      p_featured: draft.featured[0] || '',
      p_showcase: draft.showcase,
      p_pinned: draft.pinned,
    });
    if (ok) document.querySelectorAll('.pc-edit').forEach(n => n.remove());
  };

  // ---------- เปิดดูบัตรของคนอื่น (จากรายชื่อเพื่อน ฯลฯ) ----------
  window.profileCardOpen = async username => {
    if (!dbOn() || !username) return;
    let card;
    try {
      card = await DB.call('get_profile_card', { p_username: username });
    } catch (e) {
      if (window.dbToast) dbToast(e.message || 'เปิดโปรไฟล์ไม่สำเร็จ');
      return;
    }
    document.querySelectorAll('.pc-modal').forEach(n => n.remove());
    const modal = document.createElement('div');
    modal.className = 'pc-modal';
    modal.onclick = e => {
      if (e.target === modal) modal.remove();
    };
    card.mine = false;
    modal.innerHTML = `<button class=pc-close onclick="this.closest('.pc-modal').remove()" aria-label="ปิด">✕</button>${cardHtml(card)}`;
    document.body.appendChild(modal);
  };

  // ข้อมูลบัญชีเปลี่ยน (เปลี่ยนตัวละคร/ได้ของใหม่) → โหลดบัตรใหม่ครั้งถัดไปที่เปิดหน้าโปรไฟล์
  window.ProfileCard = {
    refresh: () => {
      myCard = null;
    },
  };

  function install() {
    if (window.profileView && window.profileView._card) return;
    if (typeof page2 !== 'function' || typeof render !== 'function' || !window.profileView) return setTimeout(install, 60);
    oldProfileView = window.profileView;
    profileView._card = 1;
    window.profileView = profileView;
  }
  install();
})();
