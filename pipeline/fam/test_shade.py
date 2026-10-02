import pickle, sys, time, math
import numpy as np
sys.path.insert(0,'/home/claude/zug/fam')
import importlib, shade_lib as L
importlib.reload(L)
from rasterio import features
from affine import Affine
from shapely.strtree import STRtree
from PIL import Image
S=pickle.load(open('/home/claude/zug/fam/sites.pkl','rb'))['sites']
vt=pickle.load(open('/home/claude/zug/vt_features.pkl','rb'))
def polys(g):
    if g.geom_type=='Polygon': return [g]
    if g.geom_type=='MultiPolygon': return list(g.geoms)
    if g.geom_type=='GeometryCollection':
        r=[]
        for gg in g.geoms: r+=polys(gg)
        return r
    return []
B=[pg for p,g in vt['building'] for pg in polys(g) if pg.area>=6]
BT=STRtree(B)
pick=[s for s in S if s['name'] in ('Schattwäldli','Lorzenparadies','Rägebogespielplatz')]+[s for s in S if s['cat']=='feuer' and s['hint']=='Schattwäldlistrasse'][:1]
for s in pick:
    t=time.time()
    a=s['area']; minx,miny,maxx,maxy=a.bounds
    E0w=math.floor(minx-90); N1w=math.ceil(maxy+90); W=int(math.ceil(maxx+90)-E0w); H=int(N1w-math.floor(miny-90))
    dsm=L.read_window(L.HREF_DSM,E0w,N1w,W,H); dtm=L.read_window(L.HREF_DTM,E0w,N1w,W,H)
    tr=Affine(1,0,E0w,0,-1,N1w)
    mask=features.rasterize([(a,1)], out_shape=(H,W), transform=tr, dtype='uint8').astype(bool)
    q=[B[int(i)] for i in BT.query(__import__('shapely.geometry',fromlist=['box']).box(E0w,N1w-H,E0w+W,N1w))]
    bm=features.rasterize([(g,1) for g in q], out_shape=(H,W), transform=tr, dtype='uint8').astype(bool) if q else np.zeros((H,W),bool)
    from scipy import ndimage
    bm=ndimage.binary_dilation(bm, iterations=1)
    res=L.shade_site(dsm,dtm,mask,E0w,N1w,None)
    trees=L.detect_trees(dsm,dtm,bm,E0w,N1w)
    print(s['kind'], s['name'] or s['hint'], s['gem'], 'win', W,H, 'nan', int(np.isnan(dsm).sum()), int(np.isnan(dtm).sum()), 'trees', len(trees), 'cover', round(res['cover'],2), 'time', round(time.time()-t,1))
    print('   shade', ' '.join(f"{hh:g}:{v*100:.0f}" for (hh,_,_),v in zip(L.SUNS,res['shade'])))
    chm=np.clip(np.nan_to_num(dsm-dtm),0,30)/30
    img=np.dstack([chm*255, chm*255, chm*255]).astype(np.uint8)
    img[bm]=[200,120,80]
    edge=mask ^ ndimage.binary_erosion(mask)
    img[edge]=[0,111,181]
    im=Image.fromarray(img).resize((W*2,H*2), Image.NEAREST)
    from PIL import ImageDraw
    dr=ImageDraw.Draw(im)
    for E,N,h,r in trees:
        x=(E-E0w)*2; y=(N1w-N)*2
        dr.ellipse([x-r*2,y-r*2,x+r*2,y+r*2], outline=(40,200,60))
    im.save(f"/home/claude/zug/fam/test_{(s['name'] or s['hint']).replace(' ','_')}.png")
