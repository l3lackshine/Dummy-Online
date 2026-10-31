# กรอบการ์ดประจำตัวละคร (ปลด 4★) — รูปชั่วคราว รอรูปจริงจาก Canva มาแทนที่ไฟล์เดิม
import sys,os,math,random
from PIL import Image,ImageDraw,ImageFilter
OUT=sys.argv[1]; os.makedirs(OUT,exist_ok=True)
C={'boy':'#3a4f8f','girl':'#ff7aa8','arya-01':'#7fcf9a','haru-r':'#e8913f','ken-r':'#3f78c8','leo-r':'#e3b740',
   'miyu-r':'#a996e0','rei-r':'#9aa7ba','rena-01':'#a46ee0','rina-01':'#d0245e','sakuya-ssr':'#d8333f','yuna-r':'#4f6fb0'}
W,H=640,960
def hexc(h,a=255): h=h.lstrip('#'); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),a)
def mix(c,t,k): return tuple(int(c[i]*(1-k)+t[i]*k) for i in range(3))+(c[3],)
for cid,col in C.items():
    rnd=random.Random(cid); base=hexc(col); light=mix(base,(255,255,255),.55); gold=(255,214,110,255)
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    # ขอบบาง ๆ รอบการ์ด
    for w,cc in ((16,base[:3]+(200,)),(9,light[:3]+(230,)),(3,gold)):
        d.rounded_rectangle([18-w/2+8,18-w/2+8,W-26+w/2-8,H-26+w/2-8],radius=46,outline=cc,width=int(w))
    # มุมบนซ้าย/ล่างขวา: ช่อลายโค้ง + อัญมณี + ประกาย
    for (cx,cy,sx,sy) in ((40,40,1,1),(W-40,H-40,-1,-1)):
        for k in range(5):
            r=150-k*24
            d.arc([cx-r*(sx<0)*2+ (0 if sx>0 else 0), cy- (r*2 if sy<0 else 0), cx+(r*2 if sx>0 else 0), cy+(0 if sy<0 else r*2)][:4] if False else [min(cx,cx+sx*2*r),min(cy,cy+sy*2*r),max(cx,cx+sx*2*r),max(cy,cy+sy*2*r)],
                  start=180 if sx>0 and sy>0 else 0, end=270 if sx>0 and sy>0 else 90, fill=(base if k%2 else light)[:3]+(220,), width=6-k//2)
        for i in range(16):
            a=rnd.uniform(0,math.pi/2); dist=rnd.uniform(30,190); x=cx+sx*math.cos(a)*dist; y=cy+sy*math.sin(a)*dist; r=rnd.uniform(5,14)
            c=rnd.choice([base,light,gold,(255,255,255,255)])
            d.ellipse([x-r,y-r,x+r,y+r],fill=c[:3]+(235,),outline=(255,255,255,200),width=2)
        for i in range(7):
            a=rnd.uniform(0,math.pi/2); dist=rnd.uniform(60,230); x=cx+sx*math.cos(a)*dist; y=cy+sy*math.sin(a)*dist; s=rnd.uniform(8,18)
            d.polygon([(x,y-s),(x+s*.25,y-s*.25),(x+s,y),(x+s*.25,y+s*.25),(x,y+s),(x-s*.25,y+s*.25),(x-s,y),(x-s*.25,y-s*.25)],fill=(255,248,220,240))
    glow=im.filter(ImageFilter.GaussianBlur(6)); out=Image.alpha_composite(glow,im)
    out.save(os.path.join(OUT,f'ch-{cid}.webp'),quality=88)
print('ok',len(C))
