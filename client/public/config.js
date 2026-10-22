window.DUMMY_CONFIG = {
  BACKEND_URL: 'https://dummy-online-server.onrender.com',
  // ---- Supabase (บัญชีผู้เล่น + ฐานข้อมูล) · ค่านี้เป็น "publishable key" เปิดเผยฝั่ง client ได้ ปลอดภัยด้วย RLS ----
  // ห้ามใส่ secret key (sb_secret_...) ที่นี่เด็ดขาด — secret key อยู่ที่ server/.env เท่านั้น
  SUPABASE_URL: 'https://apoayzrqkpouhbyexuwn.supabase.co',
  SUPABASE_KEY: 'sb_publishable_Dg5aWIK4BZBncUTeYwdwTQ_oa1ziJ0o',
  // สมัครด้วยชื่อผู้ใช้: ระบบสร้างอีเมลภายใน <ชื่อผู้ใช้>@<โดเมนนี้> ให้ (ไม่มีการส่งอีเมลจริง) — เปลี่ยนเป็นโดเมนของคุณได้
  AUTH_EMAIL_DOMAIN: 'example.com'
};
