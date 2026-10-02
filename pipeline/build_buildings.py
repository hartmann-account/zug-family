import numpy as np, json, gzip, pickle, collections
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
b=pickle.load(open('buildings_zg.pkl','rb'))
BE0, BN0 = 2672000, 1214700   # origin for building coords (0.5 m units)
CLS={'roof':1,'place_of_worship':2,'skyscraper':3,'tower':4,'storage_tank':5,'construction':6,'greenhouse':7,'chimney':8}
recs=[]
skipped=0
for p,g in b:
    if g.area<12: skipped+=1; continue
    h=p.get('render_height') or 0
    if p.get('class')=='underground': skipped+=1; continue
    g=g.simplify(0.35, preserve_topology=True)
    if g.is_empty or g.geom_type!='Polygon' or g.area<10: skipped+=1; continue
    g=orient(g, 1.0)
    rings=[]
    for ring in [g.exterior]+list(g.interiors):
        c=np.array(ring.coords)[:-1,:2]
        qq=np.round((c-np.array([BE0,BN0]))*2).astype(np.int64)
        keep=np.ones(len(qq),bool); keep[1:]=np.any(qq[1:]!=qq[:-1],axis=1)
        qq=qq[keep]
        if len(qq)>1 and np.all(qq[0]==qq[-1]): qq=qq[:-1]
        if len(qq)<3: continue
        if len(qq)>255:
            continue
        rings.append(qq)
    if not rings or len(rings[0])<3: skipped+=1; continue
    assert rings[0].min()>=0 and rings[0].max()<65536
    cx,cy=g.centroid.x, g.centroid.y
    recs.append(dict(h=max(1,min(255,int(round(h)))), cls=CLS.get(p.get('class'),0), rings=rings, c=(cx,cy), area=g.area))
print('buildings', len(recs), 'skipped', skipped)
# morton order for locality
def morton(x,y):
    x=int(x)&0xffff; y=int(y)&0xffff
    def part(n):
        n=(n|(n<<8))&0x00FF00FF; n=(n|(n<<4))&0x0F0F0F0F; n=(n|(n<<2))&0x33333333; n=(n|(n<<1))&0x55555555; return n
    return part(x)|(part(y)<<1)
recs.sort(key=lambda r: morton((r['c'][0]-BE0)/4,(r['c'][1]-BN0)/4))
nr=[]; nv=[]; hh=[]; cl=[]; coords=[]
for r in recs:
    nr.append(len(r['rings'])); hh.append(r['h']); cl.append(r['cls'])
    for ring in r['rings']:
        nv.append(len(ring)); coords.append(ring)
allc=np.concatenate(coords)
d=np.diff(allc, axis=0, prepend=np.zeros((1,2),np.int64))
zz=((d<<1)^(d>>63)).astype(np.uint64).flatten()
# LEB128 varint
out=bytearray()
for v in zz.tolist():
    while True:
        byte=v&0x7f; v>>=7
        if v: out.append(byte|0x80)
        else: out.append(byte); break
nr=np.array(nr,np.uint8); nv=np.array(nv,np.uint8); hh=np.array(hh,np.uint8); cl=np.array(cl,np.uint8)
hdr=np.array([len(recs), len(nv), len(allc), len(out)], '<u4').tobytes()
blob=hdr+nr.tobytes()+nv.tobytes()+hh.tobytes()+cl.tobytes()+bytes(out)
gz=gzip.compress(blob,9)
open('out/bld.bin.gz','wb').write(gz)
print('rings', len(nv), 'verts', len(allc), 'varint bytes', len(out), 'blob', len(blob), 'gz', len(gz))
print('heights', np.percentile(hh,[50,90,99]), 'classes', collections.Counter(cl.tolist()))
json.dump(dict(BE0=BE0,BN0=BN0), open('out/bld_meta.json','w'))
