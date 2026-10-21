#!/usr/bin/env bash
# คัดลอกหน้าเกม (client/public) เข้าแอป Android ที่ android/app/src/main/assets/www
# และฝัง socket.io client ไว้ในแอป (ไม่ต้องพึ่ง CDN) — workflow เรียกสคริปต์นี้ก่อน build
# ใช้เองในเครื่อง:  (cd client && npm ci --omit=dev) && bash scripts/prepare-android-web.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/android/app/src/main/assets/www"
SIO="$ROOT/client/node_modules/socket.io-client/dist/socket.io.min.js"
CDN="https://cdn.socket.io/4.8.1/socket.io.min.js"

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$ROOT/client/public/." "$DEST/"
find "$DEST" -name 'README.md' -delete

if [ -f "$SIO" ]; then
  cp "$SIO" "$DEST/socket.io.min.js"
  sed -i "s#$CDN#./socket.io.min.js#" "$DEST/index.html"
  if grep -q "$CDN" "$DEST/index.html"; then
    echo "ERROR: แทนที่ลิงก์ socket.io CDN ใน index.html ไม่สำเร็จ" >&2
    exit 1
  fi
  echo "ฝัง socket.io client ไว้ในแอปแล้ว"
else
  echo "WARNING: ไม่พบ $SIO — จะใช้ socket.io จาก CDN แทน (ต้องมีอินเทอร์เน็ต)" >&2
fi

echo "เตรียมไฟล์เว็บเสร็จ: $(find "$DEST" -type f | wc -l) ไฟล์ -> $DEST"
