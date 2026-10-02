import os, math, json, datetime, pickle, time
import numpy as np, rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from rasterio import features
from affine import Affine
from scipy import ndimage
from scipy.spatial import cKDTree
os.environ.update(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
                  GDAL_HTTP_MULTIRANGE='YES', GDAL_HTTP_MERGE_CONSECUTIVE_RANGES='YES', GDAL_HTTP_MAX_RETRY='5', GDAL_HTTP_RETRY_DELAY='1',
                  VSI_CACHE='TRUE', VSI_CACHE_SIZE='50000000', GDAL_CACHEMAX='256')
ROOT='/home/claude/zug/'
GAMMA=-0.786   # true north expressed as grid azimuth
LAT, LON = 47.17, 8.52
def sunpos(dt_utc, lat=LAT, lon=LON):
    jd = (dt_utc - datetime.datetime(2000,1,1,12,tzinfo=datetime.timezone.utc)).total_seconds()/86400 + 2451545.0
    T = (jd-2451545.0)/36525
    L0 = (280.46646 + T*(36000.76983 + T*0.0003032)) % 360
    M = 357.52911 + T*(35999.05029 - 0.0001537*T)
    e = 0.016708634 - T*(0.000042037 + 0.0000001267*T)
    Mr=math.radians(M)
    C = math.sin(Mr)*(1.914602 - T*(0.004817+0.000014*T)) + math.sin(2*Mr)*(0.019993-0.000101*T) + math.sin(3*Mr)*0.000289
    om = 125.04 - 1934.136*T
    lam = L0 + C - 0.00569 - 0.00478*math.sin(math.radians(om))
    eps = 23 + (26 + ((21.448 - T*(46.815 + T*(0.00059 - T*0.001813))))/60)/60 + 0.00256*math.cos(math.radians(om))
    dec = math.degrees(math.asin(math.sin(math.radians(eps))*math.sin(math.radians(lam))))
    y = math.tan(math.radians(eps/2))**2; L0r=math.radians(L0)
    eqt = 4*math.degrees(y*math.sin(2*L0r) - 2*e*math.sin(Mr) + 4*e*y*math.sin(Mr)*math.cos(2*L0r) - 0.5*y*y*math.sin(4*L0r) - 1.25*e*e*math.sin(2*Mr))
    mins = dt_utc.hour*60 + dt_utc.minute + dt_utc.second/60
    ha = ((mins + eqt + 4*lon) % 1440)/4 - 180
    lr, dr, har = math.radians(lat), math.radians(dec), math.radians(ha)
    cz = math.sin(lr)*math.sin(dr) + math.cos(lr)*math.cos(dr)*math.cos(har)
    alt = 90 - math.degrees(math.acos(max(-1,min(1,cz))))
    az = (math.degrees(math.atan2(math.sin(har), math.cos(har)*math.sin(lr) - math.tan(dr)*math.cos(lr))) + 180) % 360
    if alt > -0.575:
        te=math.tan(math.radians(max(alt,0.01)))
        rc = (58.1/te - 0.07/te**3 + 0.000086/te**5) if alt>5 else (1735 + alt*(-518.2 + alt*(103.4 + alt*(-12.79 + alt*0.711))))
        alt += rc/3600
    return az, alt
DAY=(2026,7,21)
STEPS=[8+0.5*i for i in range(23)]   # 8:00 .. 19:00 CEST
SUNS=[]
for hh in STEPS:
    h=int(hh); m=int(round((hh-h)*60))
    dt=datetime.datetime(*DAY, h-2, m, tzinfo=datetime.timezone.utc)
    az,alt=sunpos(dt)
    SUNS.append((hh, (az+GAMMA)%360, alt))
# ---------- data sources
E0,E1,N0,N1=2666000,2700000,1207000,1239000
DEM=np.load(ROOT+'dem4.npy', mmap_mode='r')
alti=json.load(open(ROOT+'alti_tiles.json'))
HREF_DTM={tuple(map(int,k.split('-'))): v[1].replace('_2_2056_5728.tif','_0.5_2056_5728.tif') for k,v in alti.items()}
HREF_DSM=json.load(open(ROOT+'fam/surf/dsm_tiles.json')) if os.path.exists(ROOT+'fam/surf/dsm_tiles.json') else {}
HREF_DSM={tuple(map(int,k.split('-'))): v for k,v in HREF_DSM.items()}
def read_window(hrefs, E0w, N1w, W, H):
    arr=np.full((H,W), np.nan, np.float32)
    for te in range(int(E0w//1000), int((E0w+W-1)//1000)+1):
        for tn in range(int((N1w-H)//1000), int((N1w-1)//1000)+1):
            href=hrefs.get((te,tn))
            if not href: continue
            se0=max(E0w, te*1000); se1=min(E0w+W, te*1000+1000)
            sn1=min(N1w, tn*1000+1000); sn0=max(N1w-H, tn*1000)
            if se1<=se0 or sn1<=sn0: continue
            col0=int((se0-te*1000)*2); row0=int((tn*1000+1000-sn1)*2)
            wc=int((se1-se0)*2); wr=int((sn1-sn0)*2)
            for attempt in range(4):
                try:
                    with rasterio.open(href) as ds:
                        data=ds.read(1, window=Window(col0,row0,wc,wr), out_shape=(wr//2, wc//2), resampling=Resampling.average).astype(np.float32)
                    break
                except Exception as ex:
                    if attempt==3: raise
                    time.sleep(1.5*(attempt+1))
            data[data<-1000]=np.nan
            arr[int(N1w-sn1):int(N1w-sn0), int(se0-E0w):int(se1-E0w)]=data
    return arr
def dem_at(E,N):
    c=(E-E0)/4-0.5; r=(N1-N)/4-0.5
    c=np.clip(c,0,DEM.shape[1]-1.001); r=np.clip(r,0,DEM.shape[0]-1.001)
    i=np.floor(c).astype(int); j=np.floor(r).astype(int); tx=c-i; ty=r-j
    return (DEM[j,i]*(1-tx)+DEM[j,i+1]*tx)*(1-ty)+(DEM[j+1,i]*(1-tx)+DEM[j+1,i+1]*tx)*ty
TF=np.arange(90, 8000, 8.0)
def far_shadow(E,N,z0,az,alt):
    if alt<=0: return True
    a=math.radians(az); tanA=math.tan(math.radians(alt))
    Es=E+math.sin(a)*TF; Ns=N+math.cos(a)*TF
    ok=(Es>E0+8)&(Es<E1-8)&(Ns>N0+8)&(Ns<N1-8)
    if not ok.any(): return False
    z=dem_at(Es[ok],Ns[ok]); t=TF[ok]
    return bool(np.any(z > z0 + t*tanA - t*t*0.87/(2*6371000.0)))
def shade_site(dsm, dtm, mask, E0w, N1w, z_far_ref):
    ys,xs=np.nonzero(mask)
    if len(ys)==0: return None
    H,W=dsm.shape
    chm=dsm-dtm
    covered=chm[ys,xs]>2.0
    z0=dtm[ys,xs]+1.0
    zmax=np.nanmax(dsm)
    Ec=E0w+xs.mean()+0.5; Nc=N1w-ys.mean()-0.5
    out=[]
    for hh,az,alt in SUNS:
        if alt<=0.5: out.append(1.0); continue
        if far_shadow(Ec,Nc,float(np.nanmean(z0)),az,alt): out.append(1.0); continue
        a=math.radians(az); dx=math.sin(a); dy=-math.cos(a); tanA=math.tan(math.radians(alt))
        sh=covered.copy()
        L=int(min(95, (zmax-z0.min())/tanA+2))
        for t in range(1,L+1):
            cx=np.rint(xs+dx*t).astype(np.int32); cy=np.rint(ys+dy*t).astype(np.int32)
            v=(cx>=0)&(cx<W)&(cy>=0)&(cy<H)
            z=dsm[np.clip(cy,0,H-1), np.clip(cx,0,W-1)]
            sh|= v & (z > z0 + t*tanA)
        out.append(float(sh.mean()))
    return dict(shade=out, cover=float(covered.mean()), npx=int(len(ys)))
def detect_trees(dsm, dtm, bldmask, E0w, N1w):
    chm=np.nan_to_num(dsm-dtm, nan=0.0)
    veg=(chm>2.5)&(~bldmask)
    c=ndimage.gaussian_filter(np.where(veg,chm,0), 1.0)
    cand=veg&(c>3.0)
    res=[]
    # variable window by height class
    mx={s: ndimage.maximum_filter(c, size=s) for s in (5,7,9,11)}
    win=np.where(c<8,5,np.where(c<15,7,np.where(c<24,9,11)))
    peak=np.zeros_like(cand)
    for s in (5,7,9,11):
        peak|= (win==s)&(c>=mx[s]-1e-4)
    peak&=cand
    ys,xs=np.nonzero(peak)
    if len(ys)==0: return []
    h=chm[ys,xs]
    pts=np.c_[xs,ys].astype(float)
    if len(pts)>1:
        dnn,_=cKDTree(pts).query(pts,k=2); dnn=dnn[:,1]
    else: dnn=np.array([20.0])
    r=np.minimum(np.clip(0.2*h+1.0,1.5,7.5), np.maximum(1.4, 0.62*dnn))
    E=E0w+xs+0.5; N=N1w-ys-0.5
    return list(zip(E.tolist(),N.tolist(),h.tolist(),r.tolist()))
