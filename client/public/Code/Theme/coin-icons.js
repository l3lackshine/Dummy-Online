/* coin-icons.js — เปลี่ยนอีโมจิเหรียญ 🪙 ในหน้าเกมเป็นรูปเหรียญจากชุด UI (Assets/UI/Assets/kit2/coin.webp) · 💎 ในตัวนับเพชรบน HUD เป็นรูปเพชร
   ทำงานหลัง render() ทุกครั้งผ่าน MutationObserver · ไม่แตะช่องพิมพ์ข้อความ */
(function () {
  'use strict';
  const KIT = './Assets/UI/Assets/kit2/';

  function swapCoin(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT),
      hits = [];
    while (w.nextNode()) if (w.currentNode.nodeValue.includes('🪙')) hits.push(w.currentNode);
    hits.forEach(t => {
      if (t.parentNode && /^(INPUT|TEXTAREA|OPTION|SCRIPT|STYLE)$/.test(t.parentNode.nodeName)) return;
      const frag = document.createDocumentFragment();
      t.nodeValue.split('🪙').forEach((p, i) => {
        if (i) {
          const im = document.createElement('img');
          im.className = 'kicon';
          im.src = KIT + 'coin.webp';
          im.alt = '';
          frag.appendChild(im);
        }
        if (p) frag.appendChild(document.createTextNode(p));
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  // ตัวนับเพชรบน HUD หน้าย่อย: เปลี่ยน 💎 เป็นรูปเพชร เพื่อให้ Theme/sakura-kit.css ซ่อนไอคอนเดิมได้ (แถบรูปใหม่มีไอคอนเพชรในตัว)
  // ทำเฉพาะใน .mc-pill — 💎 ที่อื่น (ราคา ข้อความ) คงเป็นอีโมจิตามเดิม
  function swapGemInHud(root) {
    root.querySelectorAll('.hud .mc-pill').forEach(pill => {
      const textNode = [...pill.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes('💎'));
      if (!textNode) return;
      const icon = document.createElement('img');
      icon.className = 'kicon';
      icon.src = KIT + 'gem.webp';
      icon.alt = '';
      textNode.nodeValue = textNode.nodeValue.replace('💎', '');
      pill.insertBefore(icon, textNode);
    });
  }

  function pass() {
    const app = document.getElementById('app');
    if (!app) return;
    obs.disconnect();
    try {
      swapCoin(app);
      swapGemInHud(app);
    } catch (e) {
      console.warn('coin-icons', e);
    }
    obs.observe(app, { childList: true, subtree: true, characterData: true });
  }
  const obs = new MutationObserver(pass);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', pass) : pass();
})();
