# ตัดพื้นหลังเทาของสติกเกอร์จาก Canva (มีขอบขาวกั้น) → พื้นโปร่งใส แล้วบันทึก webp
import sys
from PIL import Image,ImageDraw,ImageFilter
src,dst=sys.argv[1],sys.argv[2]; TH=int(sys.argv[3]) if len(sys.argv)>3 else 28   # พื้นสีสด (เช่นชมพูแม่เหล็ก) ไฟล์ jpg ใช้ค่า 70
im=Image.open(src).convert('RGBA'); w,h=im.size
mask=Image.new('L',(w,h),0)
rgb=im.convert('RGB')
for seed in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
    ImageDraw.floodfill(rgb,seed,(1,254,3),thresh=TH)
px=rgb.load(); m=mask.load()
for y in range(h):
    for x in range(w):
        if px[x,y]!=(1,254,3): m[x,y]=255
# พื้นสีสด: ลบจุดสีพื้นที่หลงเหลือในซอกผม (ห่างจากสีพื้นไม่เกิน 90)
bg=im.convert('RGB').getpixel((2,2)); src_px=im.convert('RGB').load()
if max(bg)-min(bg)>120:
    for y in range(h):
        for x in range(w):
            r,g,b=src_px[x,y]
            if abs(r-bg[0])+abs(g-bg[1])+abs(b-bg[2])<90: m[x,y]=0
mask=mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
im.putalpha(mask); bb=mask.getbbox(); im=im.crop(bb)
s=max(im.size); out=Image.new('RGBA',(s,s),(0,0,0,0)); out.alpha_composite(im,((s-im.size[0])//2,(s-im.size[1])//2))
out.thumbnail((360,360),Image.LANCZOS)
out.save(dst,quality=90); print(dst,out.size)
