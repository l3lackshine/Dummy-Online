#!/usr/bin/env python3
"""compose-char-frames.py — สร้างกรอบการ์ดประจำตัวละคร (ปลด 4★) 12 ตัว จากกรอบวาดจริง + ชิ้นแต่ง
   → client/public/Assets/Item/Frame/ch-<id>.webp  (ทับรูปชั่วคราวจาก make-char-frames.py)

ต้นฉบับ: assets-src/Assets/Item/Frame-src/
   frame-<แบบ>.png   กรอบ 5 แบบ (พื้นดำหรือโปร่งใส) — สคริปต์ลบพื้นดำเอง
   deco/*.png        ชิ้นแต่ง (ตัดพื้นขาวแล้วด้วย scripts/ui-cutout.py)
ทำ 4 ขั้นต่อตัว: ลบพื้นดำ → กลับด้าน (ถ้าตั้ง) → ย้อมส่วนชมพู/ม่วงเป็นสีประจำตัว (ส่วนทองคงเดิม) → วางชิ้นแต่ง
แล้ววัด "ช่องว่างกลางกรอบ" เขียนลง Character.config → "lobby"."frame4" (การ์ดห้องรอย่อตัวละครให้อยู่ในช่องนี้ ไม่โดนกรอบบัง)
   หลังรันต้องรัน node scripts/build-assets.js เพื่อส่งค่าเข้า skins.json
Public: python3 scripts/compose-char-frames.py [--only <id>] [--sheet <ไฟล์.png>]
Extend: ตัวละครใหม่ → เพิ่มแถวใน CHARACTER_FRAMES (EXTEND ด้านล่าง) แล้วรันใหม่ · กรอบแบบใหม่ → วาง frame-<ชื่อ>.png แล้วอ้างชื่อ
ต้องมี: pip install numpy pillow scipy
"""
import argparse
import colorsys
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..')
SOURCE_DIR = os.path.join(ROOT, 'assets-src/Assets/Item/Frame-src')
OUTPUT_DIR = os.path.join(ROOT, 'client/public/Assets/Item/Frame')

OUTPUT_WIDTH = 640           # กว้างคงที่ · สูงตามสัดส่วนกรอบ (CSS .rm-deco ยืดตามความกว้างการ์ด ตัดครึ่งบน/ล่าง)
WEBP_QUALITY = 90

DARK_LEVEL = 26              # ค่าสว่างสูงสุด (0–255) ที่นับเป็น "พื้นดำ"
BIG_HOLE_SHARE = 0.01        # ก้อนดำที่ใหญ่เกิน 1% ของรูป = พื้นหลัง/ช่องกลางกรอบ (เส้นตัดขอบเล็ก ๆ ไม่โดนลบ)
EDGE_BAND_PX = 4             # แถบรอบพื้นดำที่คำนวณความโปร่งจากความสว่าง (ขอบนุ่ม ไม่เป็นฝ้าดำ)
EDGE_FADE_FROM = 12          # ในแถบขอบ: สว่างต่ำกว่านี้ = โปร่งหมด
EDGE_FADE_RANGE = 70         # สว่างเกิน FROM + RANGE = ทึบหมด
WINDOW_BAND_FROM = 0.35      # วัดขอบบน/ล่างของช่องว่างจากแถบกลางกรอบ 35–65% ของความกว้าง (ตัวละครยืนกลางการ์ด)
WINDOW_BAND_TO = 0.65
WINDOW_SOLID_MAX = 0.12      # แถวที่มีลายกรอบเกิน 12% ของแถบกลาง = ชนลายกรอบแล้ว (กลีบดอกเล็ก ๆ ไม่นับ)
WINDOW_SOLID_ALPHA = 30      # ความทึบ (0–255) ที่นับว่าเป็นลายกรอบ
WINDOW_PAD = 0.02            # เว้นห่างจากเส้นกรอบอีกนิด (สัดส่วนความกว้าง)
STRAY_SHARE = 0.002          # เศษชิ้นเล็กกว่า 0.2% ของชิ้นใหญ่สุด หรือแตะขอบรูป = เศษจากการตัดภาพ ทิ้ง

GOLD_HUE_FROM = 20 / 360     # สีโทนทอง/ส้มทองในกรอบ — ไม่ย้อม (กรอบทุกตัวใช้ทองเป็นสีร่วม)
GOLD_HUE_TO = 60 / 360
GOLD_SOFT = 8 / 360          # ไล่น้ำหนักการย้อมตรงรอยต่อทอง↔ชมพู ไม่ให้เป็นเส้นแข็ง
SOURCE_PINK_HUE = 335 / 360  # สีหลักของกรอบต้นฉบับ (ชมพูซากุระ)
HUE_SPREAD_KEEP = 0.5        # เก็บความต่างของเฉดเดิมไว้ครึ่งหนึ่ง (ชมพู/ม่วงในกรอบยังต่างกันหลังย้อม)
SOURCE_PINK_SAT = 0.5        # ความอิ่มสีโดยเฉลี่ยของกรอบต้นฉบับ (ใช้เทียบกับสีเป้าหมาย)

# EXTEND: ตัวละครใหม่ → เพิ่มแถว: id → แบบกรอบ · สีประจำตัว (None = สีเดิมของกรอบ) · กลับซ้ายขวา · ชิ้นแต่ง
#   ชิ้นแต่ง: (ไฟล์ใน deco/, x กลางชิ้น, y กลางชิ้น เป็นสัดส่วนของกรอบ 0–1, กว้างเป็นสัดส่วนของกรอบ, หมุนองศา, กลับซ้ายขวา)
#   สีเดิมของตัวละครเหมือนกรอบชั่วคราวเก่า (make-char-frames.py) ผู้เล่นจำสีได้
CHARACTER_FRAMES = {
    'sakuya-ssr': {'frame': 'crown', 'color': '#d8333f', 'mirror': False, 'deco': [
        ('branch-long.png', 0.50, 0.035, 0.95, 0, False),
        ('petal.png', 0.80, 0.30, 0.06, 25, False),
        ('petal.png', 0.24, 0.62, 0.05, -40, False),
    ]},
    'girl': {'frame': 'ribbon', 'color': None, 'mirror': False, 'deco': []},
    'rina-01': {'frame': 'arch', 'color': '#d0245e', 'mirror': False, 'deco': [
        ('flower-4.png', 0.86, 0.94, 0.14, 15, False),
    ]},
    'rena-01': {'frame': 'cloud', 'color': '#a46ee0', 'mirror': False, 'deco': []},
    'arya-01': {'frame': 'tassel', 'color': '#7fcf9a', 'mirror': False, 'deco': [
        ('flower-1.png', 0.84, 0.10, 0.17, 0, False),
    ]},
    'miyu-r': {'frame': 'crown', 'color': '#a996e0', 'mirror': False, 'deco': [
        ('corner-2.png', 0.20, 0.10, 0.30, 0, False),
        ('corner-2.png', 0.80, 0.10, 0.30, 0, True),
    ]},
    'haru-r': {'frame': 'ribbon', 'color': '#e8913f', 'mirror': True, 'deco': [
        ('petal.png', 0.30, 0.35, 0.06, 30, False),
        ('petal.png', 0.70, 0.70, 0.05, -20, False),
    ]},
    'leo-r': {'frame': 'arch', 'color': '#e3b740', 'mirror': True, 'deco': []},
    'ken-r': {'frame': 'cloud', 'color': '#3f78c8', 'mirror': True, 'deco': [
        ('flower-3.png', 0.14, 0.86, 0.12, -10, False),
    ]},
    'yuna-r': {'frame': 'tassel', 'color': '#4f6fb0', 'mirror': True, 'deco': [
        ('branch-short.png', 0.50, 0.985, 0.62, 0, False),
    ]},
    'boy': {'frame': 'crown', 'color': '#3a4f8f', 'mirror': False, 'deco': []},
    'rei-r': {'frame': 'arch', 'color': '#9aa7ba', 'mirror': False, 'deco': [
        ('corner-1.png', 0.86, 0.06, 0.22, 0, True),
    ]},
}


# ---------- ลบพื้นดำ ----------

def find_background(rgb, alpha):
    """พื้นดำ = ก้อนพิกเซลมืดที่ใหญ่ (พื้นรอบนอก + ช่องกลางกรอบ) — ก้อนมืดเล็ก ๆ คือลายเส้นของกรอบ เก็บไว้"""
    brightness = rgb.max(axis=2)
    dark = (brightness < DARK_LEVEL) | (alpha < 8)
    labels, count = ndimage.label(dark)
    if count == 0:
        return dark
    sizes = ndimage.sum(dark, labels, range(1, count + 1))
    big_enough = BIG_HOLE_SHARE * dark.size
    keep_ids = [index + 1 for index, size in enumerate(sizes) if size >= big_enough]
    return np.isin(labels, keep_ids)


def soften_edges(rgb, background):
    """แถบขอบรอบพื้นดำ: ความโปร่งตามความสว่าง แล้วถอดสีดำที่ปนออก (ต้นฉบับวาดบนพื้นดำ)"""
    near_background = ndimage.binary_dilation(background, iterations=EDGE_BAND_PX) & ~background
    brightness = rgb.max(axis=2)
    alpha = np.ones(background.shape, dtype=np.float32)
    alpha[background] = 0
    edge_alpha = np.clip((brightness - EDGE_FADE_FROM) / EDGE_FADE_RANGE, 0, 1)
    alpha[near_background] = edge_alpha[near_background]
    safe_alpha = np.maximum(alpha, 1e-3)[..., None]
    unmixed = np.where(near_background[..., None], np.clip(rgb / safe_alpha, 0, 255), rgb)
    return unmixed, alpha


def drop_stray_pieces(alpha):
    """ทิ้งเศษที่หลุดมาจากภาพข้างเคียง (แตะขอบรูป หรือเล็กมาก) เก็บเฉพาะตัวกรอบ"""
    solid = alpha > 0.1
    labels, count = ndimage.label(solid)
    if count <= 1:
        return alpha
    sizes = ndimage.sum(solid, labels, range(1, count + 1))
    largest = sizes.max()
    height, width = alpha.shape
    border_ids = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])))
    keep = np.zeros(count + 1, dtype=bool)
    for index, size in enumerate(sizes):
        label_id = index + 1
        is_main = size == largest
        is_small = size < STRAY_SHARE * largest
        if is_main or (not is_small and label_id not in border_ids):
            keep[label_id] = True
    # ขอบนุ่มที่ alpha ≤ 0.1 ไม่มีป้าย → เก็บถ้าติดกับชิ้นที่เก็บ
    kept_mask = ndimage.binary_dilation(keep[labels], iterations=2)
    return np.where(kept_mask, alpha, 0)


def load_clean_frame(name):
    image = Image.open(os.path.join(SOURCE_DIR, f'frame-{name}.png')).convert('RGBA')
    pixels = np.asarray(image).astype(np.float32)
    rgb = pixels[..., :3]
    source_alpha = pixels[..., 3]
    background = find_background(rgb, source_alpha)
    rgb, alpha = soften_edges(rgb, background)
    alpha = np.minimum(alpha, source_alpha / 255)
    alpha = drop_stray_pieces(alpha)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    cleaned = Image.fromarray(rgba, 'RGBA')
    return cleaned.crop(cleaned.getbbox())


# ---------- ย้อมสี ----------

def hex_to_hsv(color):
    red, green, blue = (int(color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(red, green, blue)


def gold_keep_weight(hue):
    """1 = เป็นทอง (ไม่ย้อม) · 0 = ย้อมเต็ม · ไล่นุ่มที่รอยต่อ"""
    rising = np.clip((hue - (GOLD_HUE_FROM - GOLD_SOFT)) / GOLD_SOFT, 0, 1)
    falling = np.clip(((GOLD_HUE_TO + GOLD_SOFT) - hue) / GOLD_SOFT, 0, 1)
    return np.minimum(rising, falling)


def recolor(image, color):
    """ย้อมส่วนชมพู/ม่วงเป็นสีประจำตัว · คงความสว่างเดิม (ลายนูน/แสงเงายังอยู่) · ทองคงเดิม"""
    if not color:
        return image
    target_hue, target_sat, target_value = hex_to_hsv(color)
    hsv = np.asarray(image.convert('RGB').convert('HSV')).astype(np.float32) / 255
    hue, sat, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    hue_offset = ((hue - SOURCE_PINK_HUE + 0.5) % 1.0) - 0.5          # ห่างจากชมพูหลักเท่าไร (−0.5..0.5)
    new_hue = (target_hue + hue_offset * HUE_SPREAD_KEEP) % 1.0
    sat_scale = np.clip(target_sat / SOURCE_PINK_SAT, 0.25, 1.6)
    new_sat = np.clip(sat * sat_scale, 0, 1)
    value_scale = np.clip(0.55 + target_value * 0.5, 0.7, 1.0)        # สีเข้ม (กรมท่า) หรี่ลงนิดเดียว กรอบยังไม่ทึบดำ
    new_value = value * value_scale
    keep = gold_keep_weight(hue)
    mixed = np.stack([
        np.where(keep > 0.5, hue, new_hue),
        sat * keep + new_sat * (1 - keep),
        value * keep + new_value * (1 - keep),
    ], axis=2)
    recolored = Image.fromarray((mixed * 255).astype(np.uint8), 'HSV').convert('RGB')
    recolored.putalpha(image.getchannel('A'))
    return recolored


# ---------- ชิ้นแต่ง ----------

def place_deco(frame, deco):
    file_name, center_x, center_y, width_share, angle, mirror = deco
    piece = Image.open(os.path.join(SOURCE_DIR, 'deco', file_name)).convert('RGBA')
    if mirror:
        piece = piece.transpose(Image.FLIP_LEFT_RIGHT)
    target_width = max(1, round(frame.width * width_share))
    target_height = max(1, round(piece.height * target_width / piece.width))
    piece = piece.resize((target_width, target_height), Image.LANCZOS)
    if angle:
        piece = piece.rotate(angle, resample=Image.BICUBIC, expand=True)
    left = round(frame.width * center_x - piece.width / 2)
    top = round(frame.height * center_y - piece.height / 2)
    frame.alpha_composite(piece, (min(max(left, 0), frame.width - piece.width), min(max(top, 0), frame.height - piece.height)))


# ---------- ช่องว่างกลางกรอบ (ให้ตัวละครอยู่ข้างใน) ----------

def measure_window(frame):
    """ระยะจากขอบรูปถึงช่องว่างกลางกรอบ เป็นสัดส่วนของ "ความกว้าง" กรอบ
       (CSS วางกรอบยืดตามความกว้างการ์ด ครึ่งบนชิดบน ครึ่งล่างชิดล่าง — ระยะบน/ล่างจึงคิดเทียบความกว้าง)"""
    solid = np.asarray(frame.getchannel('A')) >= WINDOW_SOLID_ALPHA
    height, width = solid.shape
    middle_row = height // 2
    left = np.where(solid[middle_row, :width // 2])[0].max() + 1
    right = width // 2 + np.where(solid[middle_row, width // 2:])[0].min()
    band = solid[:, int(width * WINDOW_BAND_FROM):int(width * WINDOW_BAND_TO)].mean(axis=1)
    top = middle_row
    while top > 0 and band[top - 1] <= WINDOW_SOLID_MAX:
        top -= 1
    bottom = middle_row
    while bottom < height - 1 and band[bottom + 1] <= WINDOW_SOLID_MAX:
        bottom += 1
    return {
        'top': round(top / width + WINDOW_PAD, 3),
        'bottom': round((height - 1 - bottom) / width + WINDOW_PAD, 3),
        'left': round(float(left / width) + WINDOW_PAD, 3),
        'right': round(float((width - right) / width) + WINDOW_PAD, 3),
    }


def write_window_to_config(character_id, window):
    """เก็บช่องว่างไว้ใน Character.config ข้างค่าวางตัวละครเดิมของห้องรอ ("lobby") — ไม่แตะค่าอื่น"""
    path = os.path.join(ROOT, 'client/public/Assets/Character', character_id, 'Character.config')
    with open(path, encoding='utf-8') as file:
        config = json.load(file)
    lobby = config.setdefault('lobby', {})
    if lobby.get('frame4') == window:
        return
    lobby['frame4'] = window
    with open(path, 'w', encoding='utf-8') as file:
        file.write(json.dumps(config, ensure_ascii=False, indent=2))


# ---------- รวมทั้งหมด ----------

def build_frame(spec, frame_cache):
    if spec['frame'] not in frame_cache:
        frame_cache[spec['frame']] = load_clean_frame(spec['frame'])
    frame = frame_cache[spec['frame']]
    if spec['mirror']:
        frame = frame.transpose(Image.FLIP_LEFT_RIGHT)
    frame = recolor(frame, spec['color'])
    output_height = round(frame.height * OUTPUT_WIDTH / frame.width)
    frame = frame.resize((OUTPUT_WIDTH, output_height), Image.LANCZOS)
    for deco in spec['deco']:
        place_deco(frame, deco)
    return frame


def save_preview_sheet(frames, path):
    """แผ่นรวมไว้ตรวจด้วยตา (วางบนพื้นมืดเหมือนการ์ดในเกม)"""
    thumb_width = 200
    thumbs = [image.resize((thumb_width, round(image.height * thumb_width / image.width))) for image in frames.values()]
    thumb_height = max(thumb.height for thumb in thumbs)
    columns = 6
    rows = (len(thumbs) + columns - 1) // columns
    sheet = Image.new('RGBA', (columns * thumb_width, rows * thumb_height), (40, 30, 80, 255))
    for index, thumb in enumerate(thumbs):
        sheet.alpha_composite(thumb, ((index % columns) * thumb_width, (index // columns) * thumb_height))
    sheet.convert('RGB').save(path)


def main():
    parser = argparse.ArgumentParser(description='สร้างกรอบการ์ดประจำตัวละคร (ปลด 4★)')
    parser.add_argument('--only', help='สร้างเฉพาะตัวละคร id นี้')
    parser.add_argument('--sheet', help='บันทึกแผ่นรวมไว้ตรวจด้วยตา')
    args = parser.parse_args()
    frame_cache = {}
    built = {}
    for character_id, spec in CHARACTER_FRAMES.items():
        if args.only and character_id != args.only:
            continue
        built[character_id] = build_frame(spec, frame_cache)
        out_path = os.path.join(OUTPUT_DIR, f'ch-{character_id}.webp')
        built[character_id].save(out_path, quality=WEBP_QUALITY)
        window = measure_window(built[character_id])
        write_window_to_config(character_id, window)
        print(f'✓ ch-{character_id}.webp {built[character_id].size} ช่องว่าง {window}')
    if args.sheet and built:
        save_preview_sheet(built, args.sheet)


if __name__ == '__main__':
    main()
