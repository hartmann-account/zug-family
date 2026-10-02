import numpy as np, json, gzip, pickle, collections
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, MultiLineString, Point, mapping, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union, linemerge
from shapely.prepared import prep
from rasterio import features
from affine import Affine
from PIL import Image
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
f=pickle.load(open('vt_features.pkl','rb'))
def polys(g):
    if g.geom_type=='Polygon': return [g]
    if g.geom_type=='MultiPolygon': return list(g.geoms)
    if g.geom_type=='GeometryCollection':
        r=[]
        for gg in g.geoms: r+=polys(gg)
        return r
    return []
def lines(g):
    if g.geom_type=='LineString': return [g]
    if g.geom_type in ('MultiLineString','GeometryCollection'):
        r=[]
        for gg in g.geoms: r+=lines(gg)
        return r
    return []
kz=shape(json.load(open('kanton.json'))['results'][0]['geometry'])
mun=json.load(open('gemeinden_2025.json'))
names=[m['properties']['gemname'] for m in mun]
order=sorted(names)   # ids 1..11 alphabetical
mpoly={m['properties']['gemname']:shape(m['geometry']) for m in mun}
# ---------------- water
lake_parts=[pg for p,g in f['water'] if p.get('class')=='lake' for pg in polys(g)]
river_parts=[pg for p,g in f['water'] if p.get('class')=='river' for pg in polys(g)]
lakes=unary_union([pg.buffer(0.4) for pg in lake_parts]).buffer(-0.4)
rivers_poly=unary_union([pg.buffer(0.4) for pg in river_parts]).buffer(-0.4)
lakes_l=[g for g in polys(lakes) if g.area>2000]
print('lakes', len(lakes_l), sorted([round(g.area/1e6,2) for g in lakes_l], reverse=True)[:10])
# bathymetry
bd=collections.defaultdict(list)
for p,g in f['bathymetry']:
    for pg in polys(g): bd[-p['lake_depth']].append(pg.buffer(0.4))
bdu={k:unary_union(v).buffer(-0.4) for k,v in bd.items()}
for k in sorted(bdu): print('depth', k, round(bdu[k].area/1e6,2))
# ---------------- mask raster 20 m (1700x1600) via 5 m supersampling
S=5; W5=(E1-E0)//S; H5=(N1-N0)//S
tr5=Affine(S,0,E0,0,-S,N1)
def cov(geoms):
    a=features.rasterize([(g,1) for g in geoms], out_shape=(H5,W5), transform=tr5, dtype='uint8')
    return a.reshape(H5//4,4,W5//4,4).mean(axis=(1,3))
wood=[pg for p,g in f['landcover'] for pg in polys(g)]
forest=cov(wood)
water=cov(polys(lakes)+polys(rivers_poly))
tr20=Affine(20,0,E0,0,-20,N1)
H20,W20=(N1-N0)//20,(E1-E0)//20
depth=np.zeros((H20,W20),np.float32)
for k in sorted(bdu):
    m=features.rasterize([(g,1) for g in polys(bdu[k])], out_shape=(H20,W20), transform=tr20, dtype='uint8')
    depth[m>0]=k
from scipy import ndimage
lakemask=features.rasterize([(g,1) for g in polys(lakes)], out_shape=(H20,W20), transform=tr20, dtype='uint8')
dist=ndimage.distance_transform_edt(lakemask)*20.0
dep=np.maximum(ndimage.gaussian_filter(depth, 2.2), np.minimum(dist*0.06, 18))
dep=np.where(lakemask>0, dep, 0)
ids=np.zeros((H20,W20),np.uint8)
for i,n in enumerate(order):
    m=features.rasterize([(mpoly[n],1)], out_shape=(H20,W20), transform=tr20, dtype='uint8')
    ids[m>0]=i+1
R=(ids*20).astype(np.uint8)
G=np.clip(forest*255,0,255).round().astype(np.uint8)
B=np.clip(water*(64+np.clip(dep,0,191)),0,255).round().astype(np.uint8)
Image.fromarray(np.dstack([R,G,B]),'RGB').save('out/mask.png', optimize=True)
import os; print('mask.png', os.path.getsize('out/mask.png'))
# ---------------- lines
def q1(geom, tol):
    g=geom.simplify(tol, preserve_topology=False)
    out=[]
    for ln in lines(g) if g.geom_type!='LinearRing' else [LineString(g.coords)]:
        c=np.array(ln.coords)[:,:2]
        qq=np.round(c-np.array([E0,N0])).astype(int)
        # drop dups
        keep=np.ones(len(qq),bool); keep[1:]=np.any(qq[1:]!=qq[:-1],axis=1)
        qq=qq[keep]
        if len(qq)>=2: out.append(qq.flatten().tolist())
    return out
canton_ring=LineString(kz.exterior.coords) if kz.geom_type=='Polygon' else MultiLineString([LineString(p.exterior.coords) for p in kz.geoms])
L={}
L['canton']=q1(canton_ring, 2.5)
bnd=unary_union([mpoly[n].boundary for n in order])
internal=bnd.difference(kz.buffer(2).exterior.buffer(3) if kz.geom_type=='Polygon' else unary_union([p.exterior.buffer(3) for p in kz.geoms]))
internal=linemerge(lines(internal)) if lines(internal) else internal
L['muni']=q1(internal, 2.5)
shore=[]
for g in lakes_l:
    if g.area>150000:
        shore.append(LineString(g.exterior.coords))
L['shore']=q1(MultiLineString(shore), 2.0)
riv=collections.defaultdict(list)
for p,g in f['waterway']:
    if p.get('class')=='river' and p.get('name') in ('Lorze','Reuss','Sihl'):
        riv[p['name']]+=lines(g)
for n in riv:
    mg=linemerge(unary_union(riv[n]))
    L['river_'+n]=q1(mg, 2.0)
    print('river', n, len(L['river_'+n]), [len(x)//2 for x in L['river_'+n]][:12], round(mg.length/1000,2),'km')
json.dump(L, open('out/lines.json','w'))
print({k:(len(v), sum(len(x)//2 for x in v)) for k,v in L.items()})
pickle.dump(dict(lakes=lakes, lakes_l=lakes_l, order=order), open('out/vec_misc.pkl','wb'))
