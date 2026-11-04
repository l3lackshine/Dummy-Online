/* connection.js — เชื่อมต่อเซิร์ฟเวอร์เกม (Socket.IO) + รับเหตุการณ์หลัก (ห้อง · สถานะเกม · กระเป๋าเงิน)
   เซสชันห้อง (รหัสห้อง + โทเคน) เก็บใน localStorage เพื่อเชื่อมต่อกลับที่นั่งเดิมหลังรีเฟรช
   Public: conn() · emit(action) · getSess() · setSess(value) · authView()
   EXTEND: เหตุการณ์ของระบบใหม่ ให้ผูกในไฟล์ของระบบนั้น (ดูตัวอย่าง Code/Friends/friends.js) ไม่ต้องเพิ่มใน conn() */
function conn() {
  if (sock || noio) return;
  if (!window.io) {
    noio = true;
    lerr = 'โหลด Socket.IO ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต';
    return;
  }
  const ioOpt = { transports: ['websocket', 'polling'] };
  if (window.DB && DB.enabled)
    ioOpt.auth = cb => {
      DB.token().then(t => cb({ token: t || '' }));
    }; // ส่ง access token ให้เซิร์ฟเวอร์ตรวจตัวตนทุกครั้งที่เชื่อมต่อ
  sock = io(CFG.BACKEND_URL || undefined, ioOpt);
  sock.on('connect', () => {
    lerr = '';
    authed = true;
    const ss = getSess();
    if (ss && !code && !soloPending) sock.emit('room:rejoin', ss);
    else if (soloPending && !code) mk();
    if (!RULES.length) sock.emit('rules:get');
    render();
  });
  sock.on('room:rejoin-failed', () => {
    setSess(null);
    if (soloPending && !code) mk();
    render();
  });
  sock.on('rules:list', d => {
    if (d && Array.isArray(d.rules)) {
      RULES = d.rules;
      if (RULES.length && !ruleMeta(createSel.rule)) createSel = { rule: RULES[0].id, options: {} };
      SRV_VER = String(d.version || '');
      render();
    }
  });
  sock.on('connect_error', e => {
    if (e && e.message === 'unauthorized' && window.DB && DB.enabled) {
      lerr = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
      if (window.DB.signOut) DB.signOut();
      return;
    }
    lerr = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    render();
  });
  sock.on('wallet:update', d => {
    if (window.DB && DB.enabled) DB.onWallet(d);
  });
  sock.on('system:error', m => {
    hint = 'เซิร์ฟเวอร์: ' + m;
    lerr = m;
    render();
  });
  sock.on('game:action-result', d => {
    if (d && d.ok) {
      hint = '';
    } else {
      hint = 'จั่ว/เก็บไพ่ไม่สำเร็จ: ' + ((d && d.error) || 'ไม่ทราบสาเหตุ');
      render();
    }
  });
  sock.on('me', m => {
    sv = m;
    applyTheme();
    render();
  });
  sock.on('room:joined', d => {
    code = d.code;
    isHost = d.host ?? d.isHost;
    lerr = '';
    if (d.token) setSess({ code: d.code, token: d.token });
    if (soloPending) {
      soloPending = false;
      soloRoom = true; /* ห้องเล่นกับบอท: ไปหน้าสับไพ่ก่อน แล้วค่อยกดเริ่มเกม */
    }
    if (screen !== 'game') screen = 'lobby';
    render();
  });
  // เซิร์ฟเวอร์ส่งเฉพาะ "ชนิดท่าสับ" มาให้เล่นแอนิเมชัน (ไม่มีลำดับไพ่) — ทุกคนในห้องเห็นพร้อมกัน
  sock.on('room:shuffled', d => {
    lerr = '';
    shufAnim = { by: d.by, seq: d.seq, steps: d.steps || [] };
    clearTimeout(shufTimer);
    shufTimer = setTimeout(() => {
      shufAnim = null;
      render();
    }, 1400);
    render();
  });
  sock.on('room:lobby', l => {
    lob = l;
    if (typeof l.youHost === 'boolean') isHost = l.youHost;
    render();
  });
  sock.on('game:state', s => {
    S = s;
    if (s.phase !== 'draw') closePile();
    if (s.rule && s.rule !== 'dummy') clearDeal();
    screen = 'game';
    if (!s.over) {
      paid = false;
      coinDelta = 0;
    }
    if (!s.over && (!s.rule || s.rule === 'dummy') && s.v <= 1 && s.gid && s.gid !== dealtGid) {
      dealtGid = s.gid;
      startDeal(s);
    } // ตาใหม่ (ยังไม่มีใครเดิน) → แจกไพ่ทีละใบ
    if (s.over) {
      // ไม่มีเดิมพัน: จบตาได้เหรียญตามอันดับ (โหมดบัญชี = เซิร์ฟเวอร์จ่ายแล้วแจ้ง wallet:update · ไม่ล็อกอิน = จ่ายในเครื่องครั้งเดียวต่อตา)
      if (!paid) {
        paid = true;
        if (!s.tutorial && !(window.DB && DB.enabled) && localStorage.getItem('dummyPaid') !== s.gid && window.Progress) {
          localStorage.setItem('dummyPaid', s.gid || '');
          coinDelta = Progress.settleLocal(s);
          sv.coins = Math.max(0, sv.coins + coinDelta);
          save();
        }
      }
    }
    sel = new Set([...sel].filter(i => s.hand.includes(i)));
    if (s.rule && s.rule !== 'dummy') closeRules();
    render();
  });
}
function onAuth(r) {}
function auth(kind) {}
function out() {
  leave();
}
function authView() {
  wrap(
    `<div class=logo>ไพ่ดัมมี่<small>ออนไลน์</small></div><input id=au placeholder="ชื่อผู้ใช้" maxlength=14 autocomplete=username><input id=ap type=password placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" autocomplete=current-password><button onclick="auth('login')">เข้าสู่ระบบ</button><button class=g onclick="auth('register')">สมัครสมาชิก (รับ 100 🪙)</button>${aerr || lerr ? `<p style="color:var(--gold)">${esc(aerr || lerr)}</p>` : ''}`
  );
}
const getSess = () => {
  try {
    const v = JSON.parse(localStorage.getItem('dummySession') || 'null');
    return v && v.code && v.token ? v : null;
  } catch (e) {
    return null;
  }
};
const setSess = v => {
  try {
    v ? localStorage.setItem('dummySession', JSON.stringify(v)) : localStorage.removeItem('dummySession');
  } catch (e) {}
};
const emit = a => {
  if (!sock || !sock.connected) {
    hint = 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์';
    render();
    return;
  }
  sock.emit('game:act', a);
};
const room = () => {
  conn();
  if (!sock) return render();
};
