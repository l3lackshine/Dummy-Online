/* asset-url.js — แปลงพาธรูปในเกม (./Assets/...) เป็นที่อยู่เต็ม
   ทำไม: ค่า url() ที่ใส่ในตัวแปร CSS (--back-img, --deco ฯลฯ) เบราว์เซอร์จะอ่านพาธเทียบกับไฟล์ CSS ที่ใช้ตัวแปรนั้น
         ไฟล์ CSS อยู่ใน Code/<หมวด>/ ถ้าส่งพาธแบบ ./Assets/... ไป รูปจะหาไม่เจอ — ส่งที่อยู่เต็มไปแทนจึงได้รูปเสมอ
   Public: assetUrl(path) — ที่อยู่ blob:/data:/http(s) คืนค่าเดิม */
(function () {
  'use strict';

  function assetUrl(assetPath) {
    if (!assetPath) return assetPath;
    try {
      return new URL(assetPath, document.baseURI).href;
    } catch (e) {
      return assetPath; // พาธแปลก ๆ ที่แปลงไม่ได้ — ใช้ค่าเดิม ดีกว่าทำให้หน้าพัง
    }
  }

  window.assetUrl = assetUrl;
})();
