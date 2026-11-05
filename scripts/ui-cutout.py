"""ui-cutout.py — ตัดพื้นหลังสีเรียบ (ปกติเป็นสีขาว) ออกจากรูป UI ที่สร้างจาก AI แบบเนียนที่สุด → PNG/WebP พื้นโปร่งใส

ทำไมไม่ใช้ตัดตามสีอย่างเดียว: รูปพื้นขาวมีขอบนุ่ม (anti-alias) และเงาจางที่ "ผสม" สีขาวเข้าไปแล้ว
ถ้าตัดตามความขาว ขอบจะเป็นฝ้าขาวเมื่อวางบนพื้นมืด · สคริปต์นี้ทำ 4 ขั้น:
  1. หาพื้นหลัง: เติมจากขอบรูป (flood fill) เฉพาะพิกเซลใกล้สีพื้น — ช่องขาวด้านใน (แผงครีม วงรูปโปรไฟล์) ไม่โดนลบ
     (ใส่ --ai ให้ใช้โมเดล ISNet ของ rembg ช่วยดูรูปทรงด้วย เผื่อชิ้นงานที่สีจางติดขอบรูป)
  2. สร้าง trimap: ข้างในแน่นอน (ทึบ) · ข้างนอกแน่นอน (โปร่ง) · แถบขอบที่ไม่แน่ใจ
  3. Closed-form alpha matting (pymatting) คำนวณความโปร่งของแถบขอบทีละพิกเซลจากสีจริง — ขอบนุ่มเหมือนต้นฉบับ
  4. Foreground estimation ถอดสีพื้นที่ปนอยู่ออกจากสีขอบ (ไม่มีฝ้าขาว) แล้วตัดขอบรูปให้พอดีชิ้นงาน

ใช้:
  pip install numpy pillow scipy pymatting          (ใส่ --ai ต้องมี rembg[cpu] เพิ่ม — โหลดโมเดลครั้งแรก ~180MB)
  python3 scripts/ui-cutout.py <ไฟล์หรือโฟลเดอร์ต้นฉบับ...> -o <โฟลเดอร์ปลายทาง> [--webp] [--band 8] [--shadow drop|keep] [--ai] [--no-trim]
ตัวอย่าง:
  python3 scripts/ui-cutout.py ~/Download/minimal_sakura_ui_assets -o /tmp/cut --webp
Extend: พื้นหลังไม่ใช่สีขาว → --bg "#f2e6ff" · อยากเก็บแสงเรือง/เงานุ่มไว้ → --shadow keep
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

BACKGROUND_TOLERANCE = 12   # ห่างจากสีพื้นไม่เกินนี้ (0–255) ถือว่าเป็นพื้นแน่ ๆ ตอนเติมจากขอบ
MIN_PIECE_PIXELS = 24       # เศษจุดลอยเล็กกว่านี้ (หลังตัด) ทิ้ง
SHADOW_CUT = 0.3            # --shadow drop: ความทึบต่ำกว่านี้ (เงา/ฝ้าจางรอบชิ้นงาน) ตัดทิ้ง แล้วยืดค่าที่เหลือให้ขอบยังนุ่ม


def parse_color(text):
    text = text.lstrip('#')
    return np.array([int(text[i:i + 2], 16) for i in (0, 2, 4)], np.float64)


def find_background(rgb, bg_color, tolerance):
    """พิกเซลพื้นหลังที่ต่อเนื่องจากขอบรูป — ช่องสีพื้นที่ถูกล้อมอยู่ข้างในไม่นับ"""
    distance = np.abs(rgb - bg_color).max(axis=2)
    near_bg = distance <= tolerance
    labels, _ = ndimage.label(near_bg)
    border = np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
    edge_labels = np.setdiff1d(np.unique(border), [0])
    return np.isin(labels, edge_labels), distance


def ai_object_mask(image):
    """รูปทรงชิ้นงานจากโมเดล ISNet (rembg) — ใช้เสริมเมื่อสีชิ้นงานจางจนแยกจากพื้นด้วยสีไม่ได้"""
    from rembg import new_session, remove
    session = new_session('isnet-general-use')
    mask = remove(image.convert('RGB'), session=session, only_mask=True)
    return np.asarray(mask) > 127


def build_trimap(background, band):
    """1 = ชิ้นงานแน่นอน · 0 = พื้นแน่นอน · 0.5 = แถบขอบให้ matting ตัดสิน"""
    sure_bg = ndimage.binary_erosion(background, iterations=max(1, band // 2), border_value=1)
    sure_fg = ndimage.binary_erosion(~background, iterations=band)
    trimap = np.full(background.shape, 0.5)
    trimap[sure_bg] = 0.0
    trimap[sure_fg] = 1.0
    return trimap


def solve_alpha(rgb01, trimap):
    from pymatting import estimate_alpha_cf, estimate_foreground_ml
    alpha = estimate_alpha_cf(rgb01, trimap)
    alpha = np.clip(alpha, 0, 1)
    foreground = estimate_foreground_ml(rgb01, alpha)
    return alpha, np.clip(foreground, 0, 1)


def drop_specks(alpha):
    solid = alpha > 0.05
    labels, count = ndimage.label(solid)
    if count <= 1:
        return alpha
    sizes = ndimage.sum(solid, labels, range(1, count + 1))
    keep_ids = [i + 1 for i, size in enumerate(sizes) if size >= MIN_PIECE_PIXELS]
    keep = np.isin(labels, keep_ids)
    return np.where(keep | ~solid, alpha, 0)


def cut_one(path, args):
    image = Image.open(path).convert('RGB')
    rgb = np.asarray(image).astype(np.float64)
    background, _ = find_background(rgb, args.bg, BACKGROUND_TOLERANCE)
    if args.ai:
        background &= ~ai_object_mask(image)
    trimap = build_trimap(background, args.band)
    alpha, foreground = solve_alpha(rgb / 255.0, trimap)
    if args.shadow == 'drop':
        alpha = np.clip((alpha - SHADOW_CUT) / (1 - SHADOW_CUT), 0, 1)
    alpha = drop_specks(alpha)
    out = np.dstack([foreground * 255, alpha * 255]).round().astype(np.uint8)
    result = Image.fromarray(out, 'RGBA')
    if args.no_trim:
        return result
    box = result.getchannel('A').point(lambda v: 255 if v > 2 else 0).getbbox()
    return result.crop(box) if box else result


def list_inputs(paths):
    for p in paths:
        if os.path.isdir(p):
            for name in sorted(os.listdir(p)):
                if name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    yield os.path.join(p, name)
        else:
            yield p


def main():
    ap = argparse.ArgumentParser(description='ตัดพื้นหลังสีเรียบออกจากรูป UI แบบขอบเนียน (alpha matting)')
    ap.add_argument('inputs', nargs='+')
    ap.add_argument('-o', '--out', required=True)
    ap.add_argument('--webp', action='store_true', help='บันทึกเป็น WebP (ค่าเริ่มต้น PNG)')
    ap.add_argument('--band', type=int, default=8, help='ความกว้างแถบขอบที่ให้ matting คำนวณ (พิกเซล)')
    ap.add_argument('--shadow', choices=['keep', 'drop'], default='drop', help='drop (ค่าเริ่มต้น) = ตัดเงา/ฝ้าจาง ดูสะอาดบนพื้นมืด · keep = เก็บแสงเรือง (เช่นปุ่มที่ตั้งใจให้เรือง)')
    ap.add_argument('--bg', type=parse_color, default=parse_color('#ffffff'), help='สีพื้นหลัง')
    ap.add_argument('--ai', action='store_true', help='ใช้โมเดล ISNet (rembg) ช่วยหารูปทรงชิ้นงาน')
    ap.add_argument('--no-trim', action='store_true', help='ไม่ตัดขอบรูปให้พอดีชิ้นงาน (คงขนาดเท่าต้นฉบับ)')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    for path in list_inputs(args.inputs):
        result = cut_one(path, args)
        stem = os.path.splitext(os.path.basename(path))[0]
        target = os.path.join(args.out, stem + ('.webp' if args.webp else '.png'))
        if args.webp:
            result.save(target, 'WEBP', quality=92, method=6)
        else:
            result.save(target, optimize=True)
        print(f'{path} → {target} {result.size}')


if __name__ == '__main__':
    sys.exit(main())
