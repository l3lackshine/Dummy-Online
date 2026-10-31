#!/usr/bin/env python3
"""make-shards.py — สร้างไอคอนเศษตัวละคร (หน้าตัวละครอยู่ในคริสตัล) → client/public/Item/Shards/<id>.webp
   กรอบเศษ: assets-src/shards/shard-r.png (Rare) · shard-s.png (SR)
   หน้า: assets-src/Character/<id>/Character.* ตัดตามกรอบใน FACE (สัดส่วนของความกว้างภาพ: x0, y0, x1, y1)
   เพิ่มตัวละครใหม่: ใส่กรอบหน้าใน FACE แล้วรัน python3 scripts/make-shards.py"""
import glob, os, json
from PIL import Image, ImageFilter, ImageChops
ROOT = os.path.join(os.path.dirname(__file__), '..')
FACE = {
  'rina-01': (0.37, 0.03, 0.59, 0.25), 'arya-01': (0.34, 0.12, 0.64, 0.42), 'rena-01': (0.355, 0.0, 0.615, 0.26),
  'rei-r': (0.45, 0.08, 0.75, 0.40), 'haru-r': (0.35, 0.10, 0.67, 0.42), 'ken-r': (0.29, 0.04, 0.57, 0.32),
  'leo-r': (0.22, 0.13, 0.54, 0.45), 'yuna-r': (0.28, 0.08, 0.54, 0.34), 'miyu-r': (0.40, 0.38, 0.68, 0.66),
}
skins = json.load(open(os.path.join(ROOT, 'client/public/skin/skins.json')))
rar = {c['id']: c.get('rarity') for c in skins['characters']}
cat = open(os.path.join(ROOT, 'supabase/seed_catalog.sql')).read()
def rarity(cid):
  import re
  m = re.search(r"\('characters', '%s', '[^']*', '(\w+)'" % re.escape(cid), cat); return m.group(1) if m else 'rare'
out = os.path.join(ROOT, 'client/public/Item/Shards'); os.makedirs(out, exist_ok=True)
frames = {k: Image.open(os.path.join(ROOT, 'assets-src/shards/shard-%s.png' % k)).convert('RGBA') for k in ('r', 's')}
for cid, (x0, y0, x1, y1) in FACE.items():
  fr = frames['s' if rarity(cid) == 'epic' else 'r']; S = fr.size[0]
  body = fr.split()[3].point(lambda v: 255 if v > 235 else 0).filter(ImageFilter.MinFilter(31)).filter(ImageFilter.GaussianBlur(6))
  bb = body.getbbox()
  src = Image.open(glob.glob(os.path.join(ROOT, 'assets-src/Character/%s/Character.*' % cid))[0]).convert('RGBA'); w = src.size[0]
  face = Image.new('RGBA', (round((x1 - x0) * w), round((y1 - y0) * w)), (0, 0, 0, 0))
  crop = src.crop((round(x0 * w), round(y0 * w), round(x1 * w), round(y1 * w))); face.alpha_composite(crop)
  bw, bh = bb[2] - bb[0], bb[3] - bb[1]; side = round(bw * 1.1)
  face = face.resize((side, side), Image.LANCZOS)
  layer = Image.new('RGBA', fr.size, (0, 0, 0, 0)); layer.paste(face, (bb[0] + (bw - side) // 2, bb[1] + round(bh * 0.47) - side // 2))
  # หน้าทับเนื้อคริสตัล แล้วเอาลายคริสตัลซ้อนทับบาง ๆ ให้ยังดูเป็นเศษ
  base = fr.copy(); base.alpha_composite(layer)   # ส่วนที่ไม่มีตัวละครยังเป็นเนื้อคริสตัล
  mix = Image.blend(base.convert('RGB'), fr.convert('RGB'), 0.2).convert('RGBA')
  res = fr.copy(); res.paste(mix, (0, 0), body)
  res.resize((256, 256), Image.LANCZOS).save(os.path.join(out, cid + '.webp'), quality=90)
  print('✓', cid, rarity(cid))
