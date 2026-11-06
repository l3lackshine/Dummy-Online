/* version-check.js — ตรวจว่าเกมที่เปิดค้างไว้เก่ากว่าเวอร์ชันบนเว็บไหม ถ้าเก่าให้ขึ้นหน้าต่างบังจอให้โหลดเกมใหม่
   ทำไมต้องมี: เลขเวอร์ชันถูกอ่านครั้งเดียวตอนเปิดหน้า (APP_VER ใน state.js) — แท็บที่ไม่รีเฟรชจะเล่นโค้ดเก่าไปเรื่อย ๆ
   วิธีตรวจ: ดึง version.js ล่าสุดแบบไม่ใช้แคช (ตอนเปิดเกม · ทุกไม่กี่นาที · กลับมาที่แท็บ · เน็ตกลับมา) แล้วเทียบกับ APP_VER
   กำลังเล่นบนโต๊ะอยู่ = รอให้จบตาก่อนค่อยขึ้น · เซิร์ฟเวอร์ปฏิเสธ (net/client-version.js) = ขึ้นทันที
   Public: VersionCheck.checkNow() · VersionCheck.onServerRejected(data) — connection.js เรียกตอนได้ error 'outdated'
   EXTEND: อยากตรวจถี่ขึ้น/ห่างขึ้น = แก้ CHECK_EVERY_MS · ข้อความในหน้าต่าง = modalHtml() */
(function () {
  'use strict';

  const CHECK_EVERY_MS = 3 * 60 * 1000; // ไม่ถี่เกิน — ทุกแท็บที่เปิดค้างไว้ยิงมาที่ Cloudflare
  const FIRST_CHECK_DELAY_MS = 10 * 1000; // รอให้เกมโหลดรูป/เชื่อมต่อเสร็จก่อน ไม่แย่งเน็ตตอนเปิดเกม
  const WAIT_HAND_END_MS = 2000; // ระหว่างรอจบตา ดูซ้ำทุกเท่านี้
  const VERSION_FILE = './version.js'; // ไฟล์เดียวกับที่ index.html โหลด (แอป Android แบบไฟล์ในตัวจะได้ไฟล์ของตัวเอง ไม่เด้งผิด)
  const MODAL_CLASS = 'vc-modal';

  const escape = text => window.UiKit.escape(text);
  const bareVersion = text => String(text || '').replace(/^beta\s*/i, '').trim();

  let newerVersion = ''; // เลขบนเว็บที่ไม่ตรงกับที่เปิดอยู่ (ว่าง = ยังตรงกัน)
  let checking = false;

  // อ่านเลขจากเนื้อไฟล์ version.js ("window.DUMMY_VERSION = 'Beta 0.18.1';") โดยไม่รันโค้ดในไฟล์
  function readVersionFromSource(source) {
    const match = String(source).match(/DUMMY_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }

  async function fetchLiveVersion() {
    const response = await fetch(VERSION_FILE + '?t=' + Date.now(), { cache: 'no-store' }); // ?t= กัน CDN/เบราว์เซอร์ส่งไฟล์เก่า
    if (!response.ok) return '';
    return readVersionFromSource(await response.text());
  }

  async function checkNow() {
    if (checking || newerVersion || !APP_VER) return;
    checking = true;
    try {
      const liveVersion = await fetchLiveVersion();
      // ต่างกัน = เปลี่ยนแน่ (รวมกรณีย้อนเวอร์ชันกลับ) จึงไม่ต้องเทียบว่าใหม่กว่าไหม
      if (liveVersion && bareVersion(liveVersion) !== bareVersion(APP_VER)) {
        newerVersion = liveVersion;
        showWhenHandEnds();
      }
    } catch (e) {
      // ออฟไลน์/เน็ตหลุด — ไม่ต้องเตือน รอรอบถัดไป
    }
    checking = false;
  }

  // กำลังเล่นตาอยู่บนโต๊ะ (ยังไม่จบตา) — เงื่อนไขเดียวกับสถานะ "กำลังเล่น" ใน Friends/friends.js
  function isPlayingHand() {
    if (typeof screen === 'undefined' || screen !== 'game') return false;
    return typeof S !== 'undefined' && !!S && !S.over;
  }

  function showWhenHandEnds() {
    if (isPlayingHand()) {
      setTimeout(showWhenHandEnds, WAIT_HAND_END_MS);
      return;
    }
    openModal(newVersionText());
  }

  function newVersionText() {
    return {
      title: 'มีเวอร์ชันใหม่',
      body: `เกมอัปเดตเป็น <b>${escape(newerVersion)}</b> แล้ว (ที่เปิดอยู่คือ ${escape(APP_VER)})<br>กรุณาโหลดเกมใหม่เพื่อเล่นต่อ`,
    };
  }

  function rejectedText(minVersion) {
    const need = minVersion ? ` (ต้องเป็น ${escape(minVersion)} ขึ้นไป)` : '';
    return {
      title: 'เวอร์ชันเกมเก่าเกินไป',
      body: `เซิร์ฟเวอร์ไม่รับเกมเวอร์ชัน ${escape(APP_VER)}${need}<br>กรุณาโหลดเกมใหม่เพื่อเล่นต่อ`,
    };
  }

  function modalHtml(text) {
    // แอป Android ที่ใช้ไฟล์ในตัวแอป โหลดใหม่แล้วได้ไฟล์เดิม — ต้องติดตั้งแอปใหม่แทน
    const appNote = document.documentElement.classList.contains('native-app')
      ? '<small class=vc-note>ถ้าโหลดใหม่แล้วยังขึ้นหน้านี้ ให้ติดตั้งแอปเวอร์ชันใหม่</small>'
      : '';
    return `<div class="st-box vc-box" role=alertdialog aria-modal=true aria-labelledby=vcTitle>
        <h3 class=pv-h id=vcTitle>${text.title}</h3>
        <p>${text.body}</p>
        <button class="pv-btn blue" onclick="location.reload()">🔄 โหลดเกมใหม่</button>
        ${appNote}
      </div>`;
  }

  // หน้าต่างอยู่นอก #app (render() วาดทับ #app ทุกครั้ง) และไม่มีปุ่มปิด — เล่นต่อด้วยเวอร์ชันเก่าไม่ได้
  function openModal(text) {
    if (document.querySelector('.' + MODAL_CLASS)) return;
    const modal = document.createElement('div');
    modal.className = 'st-modal ' + MODAL_CLASS;
    modal.innerHTML = modalHtml(text);
    document.body.appendChild(modal);
  }

  function onServerRejected(data) {
    const minVersion = data && data.min ? String(data.min) : '';
    const modal = document.querySelector('.' + MODAL_CLASS);
    if (modal) modal.remove(); // แทนข้อความ "มีเวอร์ชันใหม่" ด้วยเหตุผลที่ชัดกว่า
    openModal(rejectedText(minVersion));
  }

  window.VersionCheck = { checkNow, onServerRejected };

  setTimeout(checkNow, FIRST_CHECK_DELAY_MS);
  setInterval(checkNow, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkNow(); // มือถือพักแท็บไว้นาน ๆ แล้วเปิดกลับมา
  });
  window.addEventListener('online', checkNow);
})();
