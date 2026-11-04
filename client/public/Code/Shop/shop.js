/* shop.js — ร้านค้าแบบเดิม (ซื้อของแต่งด้วยเหรียญ/MCash) + กล่องตัวอย่างของแต่ง
   โหมดบัญชีของได้จากกาชาเป็นหลัก (Code/Gacha/gacha.js) — ร้านนี้ยังใช้ในโหมดเล่นไม่ล็อกอิน
   Public: shopView() · buyItem(kind, id, currency) · setShopCat(kind) · prevBox(kind, item) */
let shopNote = '', // ข้อความแจ้งใต้แท็บร้านค้า (ล้างทุกครั้งที่เปลี่ยนหน้า)
  shopCat = 'all';
function setShopCat(k) {
  shopCat = k;
  render();
}
function buyItem(kind, id, cur) {
  const x = (SKIN_REGISTRY[kind] || []).find(y => y.id === id);
  if (!x || owned(kind, x)) return;
  if (window.DB && DB.enabled) {
    const nm = x.name || x.n || id;
    DB.buy(kind, id, cur || 'coins')
      .then(() => {
        shopNote = 'ซื้อ “' + nm + '” แล้ว ไปเลือกใช้ที่โปรไฟล์ได้เลย';
        render();
      })
      .catch(e => {
        shopNote = e.message;
        render();
      });
    return;
  }
  if (sv.coins < price(x)) {
    shopNote = 'เหรียญไม่พอ';
    return render();
  }
  sv.coins -= price(x);
  sv.own.push(kind + ':' + id);
  save();
  shopNote = 'ซื้อ “' + (x.name || id) + '” แล้ว ไปเลือกใช้ที่โปรไฟล์ได้เลย';
  render();
}
function prevBox(kind, x) {
  if (kind === 'characters') return `<span class=pv-ch><img src="${esc(x.asset || '')}" alt=""></span>`;
  if (kind === 'backs') return `<span class=pv-back style="background:${esc(backCss(x))}"></span>`;
  if (kind === 'frames')
    return x.asset
      ? `<span class=pv-frame style="background-image:url(${esc(x.asset)}),linear-gradient(#f7f1fb,#efe3f7)"></span>`
      : `<span class="pv-frame none"></span>`;
  if (kind === 'tables')
    return `<span class=pv-table style="--t1:${esc(x.bg || '#0f3d2a')};--t2:${esc(x.bg2 || '#0b2e20')}${x.asset ? ';background-image:url(' + esc(x.asset) + ')' : ''}"></span>`;
  return `<span class=pv-bg style="${esc(bgCss(x.id))}"></span>`;
}
function shopView() {
  const SK = window.Assets ? Assets.shopKinds() : KINDS; // ลำดับ/ชื่อแท็บตาม Shop/Shopsetting.config
  // แท็บหมวดหมู่: "ทั้งหมด" + หมวดตาม KINDS — กดเลือกเพื่อกรองดูทีละหมวด ไม่ต้องเลื่อนผ่านของที่ไม่สนใจ
  if (shopCat !== 'all' && !SK.some(([k]) => k === shopCat)) shopCat = 'all';
  const tabs = [window.Assets ? Assets.allTab() : ['all', 'ทั้งหมด', '', '🛍️'], ...SK]
    .map(
      ([kind, label, , ic]) =>
        `<button class="catbtn${shopCat === kind ? ' on' : ''}" onclick="setShopCat('${kind}')">${ic || ''} ${label}</button>`
    )
    .join('');
  const secs =
    SK.filter(([kind]) => shopCat === 'all' || shopCat === kind)
      .map(([kind, label, , ic]) => {
        const items = (SKIN_REGISTRY[kind] || []).filter(x => price(x) > 0 || (window.DB && DB.enabled && mprice(x) > 0));
        if (!items.length) return '';
        return `<section class=ksec>${shopCat === 'all' ? `<h3 class=sec>${ic} ${label}</h3>` : ''}<div class="grid big">${items
          .map(x => {
            const own = owned(kind, x),
              no = !own && sv.coins < price(x),
              mc = window.DB && DB.enabled && mprice(x) > 0,
              noM = !own && (sv.mcash || 0) < mprice(x);
            return `<div class=item2>${prevBox(kind, x)}<b>${esc(x.name || x.n || x.id)}</b>${own ? '<button class=wbtn disabled>ซื้อแล้ว ✓</button>' : `${price(x) > 0 ? `<button class="wbtn go" ${no ? 'disabled' : ''} onclick="buyItem('${kind}','${esc(x.id)}')">🪙 ${price(x)}</button>` : ''}${mc ? `<button class="wbtn mc" ${noM ? 'disabled' : ''} onclick="buyItem('${kind}','${esc(x.id)}','mcash')">💎 ${mprice(x)}</button>` : ''}`}</div>`;
          })
          .join('')}</div></section>`;
      })
      .join('') || '<p class=note>ยังไม่มีของในหมวดนี้</p>';
  page2(
    (window.Assets && Assets.shopTitle()) || 'ร้านค้า',
    `<div class=cattabs>${tabs}</div><p class=note>${esc(shopNote || 'เลือกซื้อของตกแต่ง แล้วไปเลือกใช้ที่หน้าโปรไฟล์')}</p><div class=panel>${secs}</div>`
  );
}
