import pickle, sys, time, math, json
import numpy as np
sys.path.insert(0,'/home/claude/zug/fam')
import shade_lib as L
from rasterio import features
from affine import Affine
from shapely.geometry import box
from shapely.strtree import STRtree
from scipy import ndimage
from concurrent.futures import ThreadPoolExecutor, as_completed
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
jobs=[]
for i,s in enumerate(S):
    if s['area'] is None: continue
    minx,miny,maxx,maxy=s['area'].bounds
    jobs.append(('site',i,math.floor(minx-90),math.ceil(maxy+90),int(math.ceil(maxx+90)-math.floor(minx-90)),int(math.ceil(maxy+90)-math.floor(miny-90))))
# tree-only windows (city core + Zugerberg station area)
for (e0,n0,e1,n1) in [(2681100,1223600,2682500,1225700),(2682700,1221700,2683400,1222400)]:
    jobs.append(('trees',-1,e0,n1,e1-e0,n1-n0))
print('jobs', len(jobs), 'px', sum(j[4]*j[5] for j in jobs)/1e6, 'MP', flush=True)
def run(job):
    kind,i,E0w,N1w,W,H=job
    dsm=L.read_window(L.HREF_DSM,E0w,N1w,W,H); dtm=L.read_window(L.HREF_DTM,E0w,N1w,W,H)
    # fill gaps
    if np.isnan(dtm).any():
        m=np.isnan(dtm); dtm[m]=np.nanmean(dtm) if (~m).any() else 400
    if np.isnan(dsm).any():
        m=np.isnan(dsm); dsm[m]=dtm[m]
    tr=Affine(1,0,E0w,0,-1,N1w)
    q=[B[int(k)] for k in BT.query(box(E0w,N1w-H,E0w+W,N1w))]
    bm=features.rasterize([(g,1) for g in q], out_shape=(H,W), transform=tr, dtype='uint8').astype(bool) if q else np.zeros((H,W),bool)
    bm=ndimage.binary_dilation(bm, iterations=1)
    res=None
    if kind=='site':
        mask=features.rasterize([(S[i]['area'],1)], out_shape=(H,W), transform=tr, dtype='uint8', all_touched=False).astype(bool)
        if mask.sum()<8: mask=features.rasterize([(S[i]['area'],1)], out_shape=(H,W), transform=tr, dtype='uint8', all_touched=True).astype(bool)
        res=L.shade_site(dsm,dtm,mask,E0w,N1w,None)
    trees=L.detect_trees(dsm,dtm,bm,E0w,N1w)
    # ground/roof sample for the site (median ground height)
    return kind,i,res,trees
out={}; alltrees=[]
t0=time.time(); done=0
with ThreadPoolExecutor(6) as ex:
    futs={ex.submit(run,j):j for j in jobs}
    for f in as_completed(futs):
        j=futs[f]
        try:
            kind,i,res,trees=f.result()
        except Exception as e:
            print('FAIL', j, repr(e)[:200], flush=True); continue
        if kind=='site': out[i]=res
        alltrees+=trees
        done+=1
        if done%25==0: print(done, len(jobs), round(time.time()-t0,1), 's trees', len(alltrees), flush=True)
pickle.dump(dict(shade=out, trees=alltrees, steps=[s[0] for s in L.SUNS], suns=L.SUNS), open('/home/claude/zug/fam/shade_out.pkl','wb'))
print('DONE', len(out), 'trees raw', len(alltrees), round(time.time()-t0,1), flush=True)
