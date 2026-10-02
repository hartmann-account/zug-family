import os, json, time, math, urllib.request, pickle
import numpy as np, rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from PIL import Image
from shapely.geometry import Point, box
from shapely.ops import unary_union
from concurrent.futures import ThreadPoolExecutor, as_completed
from pyproj import Transformer
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_MAX_RETRY='5', GDAL_HTTP_RETRY_DELAY='1', GDAL_HTTP_MULTIRANGE='YES', GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES')
OUT='/home/claude/zug/ortho/'
os.makedirs(OUT+'la',exist_ok=True); os.makedirs(OUT+'lb',exist_ok=True)
# ---- STAC listing (latest per km tile)
if not os.path.exists(OUT+'img_tiles.json'):
    tr=Transformer.from_crs(2056,4326,always_xy=True)
    pts=[tr.transform(x,y) for x in (2666000,2700000) for y in (1207000,1239000)]
    lon0=min(p[0] for p in pts); lon1=max(p[0] for p in pts); lat0=min(p[1] for p in pts); lat1=max(p[1] for p in pts)
    url=f"https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo.swissimage-dop10/items?bbox={lon0},{lat0},{lon1},{lat1}&limit=100"
    items={}
    while url:
        with urllib.request.urlopen(url, timeout=60) as r: d=json.load(r)
        for f in d['features']:
            _,yr,tile=f['id'].split('_')
            href=[a['href'] for a in f['assets'].values() if a['href'].endswith('_0.1_2056.tif')]
            if href and (tile not in items or int(yr)>items[tile][0]): items[tile]=(int(yr),href[0])
        url=next((l['href'] for l in d.get('links',[]) if l.get('rel')=='next'), None)
    json.dump(items, open(OUT+'img_tiles.json','w'))
items={tuple(map(int,k.split('-'))):v for k,v in json.load(open(OUT+'img_tiles.json')).items()}
print('img tiles', len(items), flush=True)
S=pickle.load(open('/home/claude/zug/fam/sites.pkl','rb'))['sites']
def tiles_for(pts, buf, tile):
    u=unary_union([p.buffer(buf,8) for p in pts]); ts=set()
    minx,miny,maxx,maxy=u.bounds
    for x in range(int(minx//tile*tile), int(maxx)+tile, tile):
        for y in range(int(miny//tile*tile), int(maxy)+tile, tile):
            if u.intersects(box(x,y,x+tile,y+tile)): ts.add((x,y))
    return sorted(ts)
extra=[(2682995,1222030),(2692953,1221866),(2683354,1229094),(2681650,1224600)]
allp=[Point(s['E'],s['N']) for s in S]+[Point(*e) for e in extra]
LA=tiles_for(allp,800,2000)
nearp=[Point(s['E'],s['N']) for s in S if s['cat'] in ('spiel','baden','kultur','sport') or s['kind'] in ('Park','Garten','Tiergehege','Höhle','Sehenswürdigkeit','Burgruine')]+[Point(*e) for e in extra]
LB=tiles_for(nearp,100,500)
print('LA', len(LA), 'LB', len(LB), flush=True)
def grade(a):
    a=a.astype(np.float32)/255.0
    a=np.power(a,0.8)
    lum=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])[...,None]
    a=lum+(a-lum)*1.1
    a=(a-0.015)*1.07
    return (np.clip(a,0,1)*255+0.5).astype(np.uint8)
def read(km, win, out):
    it=items.get(km)
    if not it: return None
    for att in range(4):
        try:
            with rasterio.open(it[1]) as ds:
                return ds.read(window=win, out_shape=(3,out[0],out[1]), resampling=Resampling.average)
        except Exception as e:
            if att==3: raise
            time.sleep(2*(att+1))
def job_la(t):
    x0,y0=t; fn=OUT+f'la/{x0//1000}_{y0//1000}.webp'
    if os.path.exists(fn): return fn, 'skip'
    img=np.zeros((1000,1000,3),np.uint8); have=False
    for dx in (0,1):
        for dy in (0,1):
            km=(x0//1000+dx, y0//1000+dy)
            a=read(km, Window(0,0,10000,10000), (500,500))
            if a is None: continue
            have=True
            img[(1-dy)*500:(2-dy)*500, dx*500:(dx+1)*500]=np.moveaxis(a,0,2)
    if not have: return fn,'empty'
    Image.fromarray(grade(img)).save(fn,'WEBP',quality=58,method=6)
    return fn, os.path.getsize(fn)
def job_lb(t):
    x0,y0=t; fn=OUT+f'lb/{x0//10}_{y0//10}.webp'
    if os.path.exists(fn): return fn,'skip'
    km=(x0//1000, y0//1000)
    col=(x0-km[0]*1000)*10; row=(km[1]*1000+1000-(y0+500))*10
    a=read(km, Window(col,row,5000,5000), (1000,1000))
    if a is None: return fn,'empty'
    Image.fromarray(grade(np.moveaxis(a,0,2))).save(fn,'WEBP',quality=55,method=6)
    return fn, os.path.getsize(fn)
t0=time.time(); tot=0; n=0
with ThreadPoolExecutor(8) as ex:
    futs=[ex.submit(job_la,t) for t in LA]+[ex.submit(job_lb,t) for t in LB]
    for f in as_completed(futs):
        try:
            fn,sz=f.result()
        except Exception as e:
            print('FAIL', repr(e)[:160], flush=True); continue
        n+=1
        if isinstance(sz,int): tot+=sz
        if n%40==0: print(n, len(futs), round(time.time()-t0), 's', round(tot/1e6,1), 'MB', flush=True)
json.dump(dict(la=[list(t) for t in LA], lb=[list(t) for t in LB]), open(OUT+'index.json','w'))
print('DONE', n, round(tot/1e6,1), 'MB', round(time.time()-t0), 's', flush=True)
