#!/data/data/com.termux/files/usr/bin/bash
# อัปโหลดโปรเจกต์ Dummy-Online ขึ้น GitHub จาก Termux
# ใช้: bash termux-upload.sh [path ของไฟล์ zip]   (ค่าเริ่มต้น: ~/storage/downloads/Dummy-Online-v7.0.0.zip)
set -e
REPO_URL="https://github.com/l3lackshine/Dummy-Online.git"
GH_USER="l3lackshine"
ZIP="${1:-$HOME/storage/downloads/Dummy-Online-v7.0.0.zip}"
WORK="$HOME/Dummy-Online"

[ -d "$HOME/storage" ] || { termux-setup-storage; echo "กดอนุญาตการเข้าถึงไฟล์ แล้วรันสคริปต์ใหม่อีกครั้ง"; exit 0; }
[ -f "$ZIP" ] || { echo "ไม่พบไฟล์ $ZIP (ย้ายไฟล์ zip ไปไว้ในโฟลเดอร์ Download ก่อน)"; exit 1; }
pkg install -y git unzip >/dev/null 2>&1 || true

git config --global user.name  >/dev/null 2>&1 || git config --global user.name  "$GH_USER"
git config --global user.email >/dev/null 2>&1 || git config --global user.email "$GH_USER@users.noreply.github.com"
git config --global credential.helper store      # จำ token ไว้ ไม่ต้องกรอกซ้ำ

if [ -d "$WORK/.git" ]; then git -C "$WORK" pull --rebase origin main; else git clone "$REPO_URL" "$WORK"; fi

TMP="$(mktemp -d)"; unzip -q -o "$ZIP" -d "$TMP"
SRC="$(dirname "$(find "$TMP" -maxdepth 3 -type d -name client | head -n1)")"   # โฟลเดอร์ที่มี client/ กับ server/
[ -d "$SRC/server" ] || { echo "โครงสร้าง zip ไม่ถูกต้อง (ไม่พบ client/ และ server/)"; exit 1; }
cp -a "$SRC"/. "$WORK"/            # ทับไฟล์ใหม่ ไม่ลบไฟล์เดิมที่ไม่ได้อยู่ใน zip (เช่นรูปสกิน)
rm -rf "$TMP"

cd "$WORK"
git add -A
git commit -m "v7.0.0: โฟลเดอร์กฎ, เดิมพันเหรียญ, สับไพ่ที่โต๊ะ, แจกไพ่ทีละใบ, เลขเวอร์ชัน" || echo "ไม่มีอะไรเปลี่ยนแปลง"
echo "ถ้าถูกถาม: Username = $GH_USER · Password = GitHub Personal Access Token (ไม่ใช่รหัสผ่านบัญชี)"
git push origin main
echo "เสร็จแล้ว ✅  https://github.com/l3lackshine/Dummy-Online"
