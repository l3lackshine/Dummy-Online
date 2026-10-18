// ทำงานเฉพาะตอนรันเป็นแอป Android (Capacitor) — บนเว็บปกติไม่ทำอะไร
// ปุ่ม Back ของเครื่อง: ปิดหน้าต่างเลือกไพ่ → ถามก่อนออกจากห้อง → ย้อนหน้า → หน้าแรกจะปิดแอป
(function () {
  var cap = window.Capacitor; if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  document.documentElement.classList.add('native-app');
  var App = cap.Plugins && cap.Plugins.App; if (!App || !App.addListener) return;
  App.addListener('backButton', function () {
    try {
      if (document.getElementById('pileModal') && typeof closePile === 'function') return closePile();
      if (screen === 'game' || (typeof code !== 'undefined' && code)) { if (confirm('ออกจากห้อง?')) leave(); return; }
      if (screen === 'home') return App.exitApp();
      go(screen === 'create' || screen === 'play' ? 'games' : 'home');
    } catch (e) { try { App.exitApp(); } catch (_) {} }
  });
})();
