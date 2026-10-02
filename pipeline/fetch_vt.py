import mercantile, os, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
lon0,lat0,lon1,lat1 = 8.306597954521314, 47.00651591416102, 8.760752950012401, 47.29858505915884
tiles=list(mercantile.tiles(lon0,lat0,lon1,lat1, zooms=[14]))
print(len(tiles))
def get(t):
    fn=f'vt/{t.z}_{t.x}_{t.y}.pbf'
    if os.path.exists(fn): return fn, os.path.getsize(fn)
    url=f'https://vectortiles{(t.x+t.y)%5}.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/{t.z}/{t.x}/{t.y}.pbf'
    for a in range(4):
        try:
            req=urllib.request.Request(url, headers={'Accept-Encoding':'gzip','User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data=r.read()
                if r.headers.get('Content-Encoding')=='gzip':
                    import gzip; data=gzip.decompress(data)
            open(fn,'wb').write(data); return fn, len(data)
        except Exception as e:
            err=e; time.sleep(1+a)
    return fn, str(err)
t=time.time()
with ThreadPoolExecutor(16) as ex:
    res=list(ex.map(get, tiles))
bad=[r for r in res if isinstance(r[1],str)]
print('done', len(res), 'bad', len(bad), bad[:3], 'bytes', sum(r[1] for r in res if not isinstance(r[1],str)), round(time.time()-t,1))
