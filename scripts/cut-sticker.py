# ตัดพื้นหลังเทาของสติกเกอร์จาก Canva (มีขอบขาวกั้น) → พื้นโปร่งใส แล้วบันทึก webp
import sys
from PIL import Image,ImageDraw,ImageFilter
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGBA'); w,h=im.size
mask=Image.new('L',(w,h),0)
rgb=im.convert('RGB')
for seed in [(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]:
    ImageDraw.floodfill(rgb,seed,(255,0,255),thresh=28)
px=rgb.load(); m=mask.load()
for y in range(h):
    for x in range(w):
        if px[x,y]!=(255,0,255): m[x,y]=255
mask=mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
im.putalpha(mask); bb=mask.getbbox(); im=im.crop(bb)
s=max(im.size); out=Image.new('RGBA',(s,s),(0,0,0,0)); out.alpha_composite(im,((s-im.size[0])//2,(s-im.size[1])//2))
out.save(dst,quality=92); print(dst,out.size)
