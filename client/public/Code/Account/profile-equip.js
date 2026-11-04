/* profile-equip.js — หน้าโปรไฟล์แบบเดิม: ชื่อเล่น + เลือกของแต่งที่ใส่
   หน้าโปรไฟล์แบบใหม่เขียนทับฟังก์ชันนี้ใน Code/Account/profile.js และ pages2.js
   Public: profileView() */
function profileView() {
  const secs = KINDS.map(([kind, label, , ic]) => {
    const items = (SKIN_REGISTRY[kind] || []).filter(x => owned(kind, x)),
      cur = equipped(kind);
    return `<section class=ksec><h3 class=sec>${ic} ${label}</h3><div class=pick-row>${items.map(x => `<button class="pick${cur === x.id ? ' on' : ''}" onclick="equip('${kind}','${esc(x.id)}')" aria-pressed="${cur === x.id}">${prevBox(kind, x)}<small>${esc(x.name || x.n || x.id)}${cur === x.id ? ' ✓' : ''}</small></button>`).join('')}</div></section>`;
  }).join('');
  page2(
    'โปรไฟล์',
    `<div class=panel><label class=namebox><span>ชื่อเล่น</span><input id=nickInput maxlength=14 placeholder="ชื่อเล่น" value="${esc(nick)}" oninput="setNick(this.value)"></label>${secs}<button class=wbtn onclick="go('shop')">🛍️ ซื้อของเพิ่มที่ร้านค้า</button></div>`
  );
}
