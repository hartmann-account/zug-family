import numpy as np, json, gzip
from scipy import ndimage
from PIL import Image
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
d4=np.load('dem4.npy', mmap_mode='r')
H4,W4=d4.shape
# ---------- 16 m DEM for relief shading
d16=np.asarray(d4).reshape(H4//4,4,W4//4,4).mean(axis=(1,3)).astype(np.float64)   # 2000 x 2125
print('d16', d16.shape)
def hillshade(z, res, az, alt):
    gy,gx=np.gradient(z, res)   # gy: d/drow (south), gx: d/dcol (east)
    # convert to north-up: dz/dN = -gy
    dzdx=gx; dzdy=-gy
    slope=np.arctan(np.hypot(dzdx,dzdy))
    aspect=np.arctan2(dzdy, -dzdx)
    azm=np.radians(360.0-az+90.0)
    altr=np.radians(alt)
    hs=np.sin(altr)*np.cos(slope)+np.cos(altr)*np.sin(slope)*np.cos(azm-aspect)
    return np.clip(hs,0,1), slope
zs=ndimage.gaussian_filter(d16, 0.7)
h1,slope=hillshade(zs,16,315,42)
h2,_=hillshade(zs,16,270,55)
h3,_=hillshade(zs,16,0,60)
h4_,_=hillshade(ndimage.gaussian_filter(d16,3),16,315,35)   # broad forms
hs=0.50*h1+0.18*h2+0.12*h3+0.20*h4_
flat=np.sin(np.radians(42))*0.5+np.sin(np.radians(55))*0.18+np.sin(np.radians(60))*0.12+np.sin(np.radians(35))*0.2
# ambient occlusion via openness approximation (difference of gaussians)
big=ndimage.gaussian_filter(d16, 12); mid=ndimage.gaussian_filter(d16,4)
ao=np.clip(1.0-np.maximum(big-d16,0)/220.0-np.maximum(mid-d16,0)/120.0, 0.55, 1.0)
rel=hs/flat               # 1.0 on flat ground
rel=np.clip(rel,0,1.6)
out=np.clip(0.80*rel*ao*1.0+0.06, 0, 1.25)/1.25   # 0..1, flat ground ~ 0.69
print('relief stats', np.percentile(out,[1,25,50,75,99]))
img=Image.fromarray((out*255).round().astype(np.uint8), 'L')
img.save('out/relief.png')
img.save('out/relief.webp', 'WEBP', quality=72, method=6)
img.save('out/relief.jpg', 'JPEG', quality=78, optimize=True, progressive=True)
import os
for f in ('relief.webp','relief.jpg'): print(f, os.path.getsize('out/'+f))
# ---------- 50 m height grid (vertex grid incl. both edges)
d20=np.load('dem20.npy').astype(np.float64)  # cell centres at E0+10+20i
step=50
nx=(E1-E0)//step+1; ny=(N1-N0)//step+1
E=E0+np.arange(nx)*step; N=N1-np.arange(ny)*step
ci=(E-E0-10)/20.0; ri=(N1-N-10)/20.0
dz=ndimage.gaussian_filter(d20, 0.9)
R,C=np.meshgrid(ri,ci, indexing='ij')
hg=ndimage.map_coordinates(dz, [R,C], order=1, mode='nearest')
print('hgrid', hg.shape, hg.min(), hg.max())
dm=np.round(hg*10).astype(np.int32)   # decimetres
# delta along rows (x), first column absolute, then zigzag -> uint16 little endian
delta=np.diff(dm, axis=1, prepend=0)
delta[:,0]=dm[:,0]
zz=((delta<<1)^(delta>>31)).astype(np.int64)
assert zz.max()<65536, zz.max()
raw=zz.astype('<u2').tobytes()
gz=gzip.compress(raw, 9)
open('out/hgt.bin.gz','wb').write(gz)
print('hgt raw', len(raw), 'gz', len(gz))
np.save('out/hgrid.npy', hg.astype(np.float32))
json.dump(dict(nx=int(nx), ny=int(ny), step=step, E0=E0, N1=N1, E1=E1, N0=N0, relief=[int(d16.shape[1]), int(d16.shape[0])]), open('out/terrain_meta.json','w'))
