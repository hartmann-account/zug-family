import json, os, time, numpy as np, rasterio
from concurrent.futures import ThreadPoolExecutor, as_completed
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
                  GDAL_HTTP_MULTIRANGE='YES', GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES', GDAL_HTTP_MAX_RETRY='4', GDAL_HTTP_RETRY_DELAY='1')
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
R=4  # metres
W=(E1-E0)//R; H=(N1-N0)//R
items=json.load(open('alti_tiles.json'))
mos=np.lib.format.open_memmap('dem4.npy', mode='w+', dtype=np.float32, shape=(H,W))
mos[:]=np.nan
def job(tile, href):
    e,n=map(int,tile.split('-'))
    for attempt in range(3):
        try:
            with rasterio.Env():
                with rasterio.open(href) as ds:
                    a=ds.read(1, out_shape=(250,250), resampling=rasterio.enums.Resampling.average)
                    a=a.astype(np.float32); a[a<-1000]=np.nan
            return tile, e, n, a
        except Exception as ex:
            err=ex; time.sleep(1+attempt)
    return tile, e, n, err
t=time.time(); done=0; fails=[]
with ThreadPoolExecutor(max_workers=32) as ex:
    futs=[ex.submit(job, k, v[1]) for k,v in items.items()]
    for f in as_completed(futs):
        tile,e,n,a=f.result()
        if isinstance(a, Exception):
            fails.append((tile,str(a))); continue
        col=(e*1000-E0)//R; row=(N1-(n+1)*1000)//R
        mos[row:row+250, col:col+250]=a
        done+=1
        if done%100==0: print(done, round(time.time()-t,1), flush=True)
mos.flush()
print('done', done, 'fails', len(fails), fails[:3], round(time.time()-t,1))
print('nan count', int(np.isnan(mos).sum()), 'min', np.nanmin(mos), 'max', np.nanmax(mos))
