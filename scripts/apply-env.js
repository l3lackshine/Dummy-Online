#!/usr/bin/env node
// เขียนค่า Supabase จาก client/.env (หรือ env ของระบบ) ลง client/public/config.js — ใช้ตอน build/deploy
const fs = require('fs'), path = require('path');
const envFile = path.join(__dirname, '../client/.env'), cfg = path.join(__dirname, '../client/public/config.js');
const env = { ...process.env };
try { for (const l of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && !l.trim().startsWith('#') && env[m[1]] === undefined) env[m[1]] = m[2]; } } catch (e) {}
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) { console.error('✗ ไม่พบ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'); process.exit(1); }
if (/^sb_secret_|service_role/.test(key)) { console.error('✗ ห้ามใส่ secret key ใน client'); process.exit(1); }
let s = fs.readFileSync(cfg, 'utf8');
s = s.replace(/SUPABASE_URL:\s*'[^']*'/, `SUPABASE_URL: '${url}'`).replace(/SUPABASE_KEY:\s*'[^']*'/, `SUPABASE_KEY: '${key}'`);
fs.writeFileSync(cfg, s); console.log('✓ อัปเดต client/public/config.js');
