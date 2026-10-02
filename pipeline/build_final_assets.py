import numpy as np, json, pickle, io, os, gzip
from PIL import Image
from rasterio import features
from affine import Affine
from scipy import ndimage
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
misc=pickle.load(open('out/vec_misc.pkl','rb'))
f=pickle.load(open('vt_features.pkl','rb'))
def polys(g):
    if g.geom_type=='Polygon': return [g]
    if g.geom_type=='MultiPolygon': return list(g.geoms)
    if g.geom_type=='GeometryCollection':
        r=[]
        for gg in g.geoms: r+=polys(gg)
        return r
    return []
# ---- relief with lake depth
rel=np.array(Image.open('out/relief.png')).astype(np.float32)/255.0   # 2000 x 2125
H16,W16=rel.shape
tr16=Affine(16,0,E0,0,-16,N1)
lakes=[g for g in misc['lakes_l']]
lm=features.rasterize([(g,1) for g in lakes], out_shape=(H16,W16), transform=tr16, dtype='uint8')
import collections
bd=collections.defaultdict(list)
for p,g in f['bathymetry']:
    for pg in polys(g): bd[-p['lake_depth']].append(pg)
depth=np.zeros((H16,W16),np.float32)
for k in sorted(bd):
    m=features.rasterize([(g,1) for g in bd[k]], out_shape=(H16,W16), transform=tr16, dtype='uint8')
    depth[m>0]=k
dist=ndimage.distance_transform_edt(lm)*16.0
dep=np.maximum(ndimage.gaussian_filter(depth, 3.0), np.minimum(dist*0.05, 16))
dep=np.where(lm>0, dep, 0)
# grow lake area by 2px so filtering at shore stays in "water" encoding
enc=np.where(lm>0, np.clip(1.0-dep/230.0,0,1), rel)
Image.fromarray((enc*255).round().astype(np.uint8),'L').save('out/relief_final.webp','WEBP',quality=72,method=6)
print('relief_final.webp', os.path.getsize('out/relief_final.webp'), 'max depth', dep.max())
# ---- palette mask
a=np.array(Image.open('out/mask.png'))
ids=(a[:,:,0]//20).astype(np.int32)
F=(a[:,:,1]>=128).astype(np.int32); Wt=(a[:,:,2]>=32).astype(np.int32)
idx=ids*4+F*2+Wt
pal=[]
for i in range(64):
    mid,ff,ww=i//4,(i>>1)&1,i&1
    pal+= [min(255,mid*20), ff*255, ww*255]
im=Image.fromarray(idx.astype(np.uint8),'P'); im.putpalette(pal)
im.save('out/mask_pal.png', optimize=True)
chk=np.array(Image.open('out/mask_pal.png').convert('RGB'))
assert (chk[:,:,0]//20==ids).all()
print('mask_pal.png', os.path.getsize('out/mask_pal.png'), im.size)
