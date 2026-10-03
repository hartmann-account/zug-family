import json, math, collections
from chproj import wgs_to_lv95
BASE='/tmp/claude-0/-home-user-zug-family/64b5cc64-43f3-53c7-8f01-46d00a8ef452/scratchpad/research/trains/'
E0,E1,N0,N1=2664000,2702000,1205000,1241000
F=json.load(open(BASE+'raw/tlm_rail_features.json'))['features']

def clip_seg(p,q):
    # Liang-Barsky
    x0,y0=p; x1,y1=q; dx=x1-x0; dy=y1-y0
    t0,t1=0.0,1.0
    for pp,qq in ((-dx,x0-E0),(dx,E1-x0),(-dy,y0-N0),(dy,N1-y0)):
        if pp==0:
            if qq<0: return None
        else:
            r=qq/pp
            if pp<0:
                if r>t1: return None
                if r>t0: t0=r
            else:
                if r<t0: return None
                if r<t1: t1=r
    return (x0+t0*dx,y0+t0*dy),(x0+t1*dx,y0+t1*dy)

def clip_line(coords):
    out=[];cur=[]
    for i in range(len(coords)-1):
        c=clip_seg(tuple(coords[i]),tuple(coords[i+1]))
        if c is None:
            if len(cur)>1: out.append(cur)
            cur=[]; continue
        a,b=c
        if cur and math.hypot(cur[-1][0]-a[0],cur[-1][1]-a[1])<1e-6:
            cur.append(b)
        else:
            if len(cur)>1: out.append(cur)
            cur=[a,b]
        if b!=tuple(coords[i+1]):  # left the box
            out.append(cur); cur=[]
    if len(cur)>1: out.append(cur)
    return out

GA={0:'normal',2:'narrow',4:'dual (narrow+normal)'}
segs=[]
for f in F:
    p=f['properties']
    attr=(p['objektart'],p['standseilbahn']==2,p['zahnradbahn']==2,p['ausser_betrieb']==2)
    for line in f['geometry']['coordinates']:
        for part in clip_line(line):
            segs.append({'id':f['id'],'attr':attr,'coords':[tuple(c) for c in part]})
print('segments after clip',len(segs))

def key(c): return (round(c[0],1),round(c[1],1))
ends=collections.defaultdict(list)
for i,s in enumerate(segs):
    ends[key(s['coords'][0])].append((i,0)); ends[key(s['coords'][-1])].append((i,1))
used=[False]*len(segs)
def other(i,side): return 1-side
chains=[]
def walk(start_i):
    # extend chain from segment start_i in both directions through degree-2 nodes with same attrs
    used[start_i]=True
    coords=list(segs[start_i]['coords']); ids=[segs[start_i]['id']]; attr=segs[start_i]['attr']
    for direction in (1,0):  # 1: extend at end, 0: extend at start
        while True:
            node=key(coords[-1] if direction==1 else coords[0])
            inc=[(j,sd) for (j,sd) in ends[node] if not used[j]]
            allinc=ends[node]
            if len(allinc)!=2 or len(inc)!=1: break
            j,sd=inc[0]
            if segs[j]['attr']!=attr: break
            used[j]=True; ids.append(segs[j]['id'])
            c=segs[j]['coords']
            if direction==1:
                c=c if sd==0 else c[::-1]
                coords+=c[1:]
            else:
                c=c if sd==1 else c[::-1]
                coords=c[:-1]+coords
    return coords,ids,attr
for i in range(len(segs)):
    if not used[i]:
        chains.append(walk(i))
print('chains',len(chains))

# SBB lines for naming
L=json.load(open(BASE+'raw/sbb_linie_mit_polygon_bbox.json'))
sbb=[]
for r in L:
    if r['linienr']>=9000: continue
    g=r['geo_shape']['geometry']
    parts=g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
    for part in parts:
        pts=[wgs_to_lv95(lat,lon) for lon,lat in part]
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        sbb.append({'nr':r['linienr'],'name':r['liniename'],'pts':pts,'bb':(min(xs)-60,min(ys)-60,max(xs)+60,max(ys)+60)})
def pdist(p,a,b):
    dx=b[0]-a[0];dy=b[1]-a[1];l=dx*dx+dy*dy
    t=0 if l==0 else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l))
    return math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
def dist_line(p,pts):
    return min(pdist(p,pts[k],pts[k+1]) for k in range(len(pts)-1))
def length(c): return sum(math.hypot(c[k+1][0]-c[k][0],c[k+1][1]-c[k][1]) for k in range(len(c)-1))
def sample(c,n=7):
    tot=length(c); out=[]
    if tot==0: return [c[0]]
    targets=[tot*(k+0.5)/n for k in range(n)]; acc=0; k=0
    for t in targets:
        while k<len(c)-2 and acc+math.hypot(c[k+1][0]-c[k][0],c[k+1][1]-c[k][1])<t:
            acc+=math.hypot(c[k+1][0]-c[k][0],c[k+1][1]-c[k][1]); k+=1
        seg=math.hypot(c[k+1][0]-c[k][0],c[k+1][1]-c[k][1]) or 1
        u=(t-acc)/seg; out.append((c[k][0]+u*(c[k+1][0]-c[k][0]),c[k][1]+u*(c[k+1][1]-c[k][1])))
    return out
lines=[]
for n,(coords,ids,attr) in enumerate(sorted(chains,key=lambda ch:(-length(ch[0])))):
    sm=sample(coords)
    best=None
    cand=collections.defaultdict(list)
    for p in sm:
        for s in sbb:
            bb=s['bb']
            if bb[0]<=p[0]<=bb[2] and bb[1]<=p[1]<=bb[3]:
                cand[(s['nr'],s['name'])].append(dist_line(p,s['pts']))
    scores=[]
    for k,ds in cand.items():
        # per sample min over parts of same line already appended; recompute: take per-sample min isn't tracked -> use median of all
        ds=sorted(ds); scores.append((ds[len(ds)//2] if len(ds)>=len(sm)//2+1 else 1e9,k))
    scores.sort()
    ln={'id':'trk%04d'%(n+1)}
    if scores and scores[0][0]<=35:
        ln['name']=f"{scores[0][1][0]} {scores[0][1][1]}"; ln['sbb_line']=scores[0][1][0]; ln['name_match_median_m']=round(scores[0][0],1)
    ln['tracks']=1
    ln['gauge']=GA.get(attr[0],str(attr[0]))
    if attr[1]: ln['funicular']=True
    if attr[2]: ln['rack']=True
    if attr[3]: ln['out_of_service']=True
    ln['length_m']=round(length(coords),1)
    ln['tlm_ids']=sorted(set(ids))
    ln['coords']=[[round(c[0],1),round(c[1],1)] for c in coords]
    lines.append(ln)

# stations
D=json.load(open(BASE+'raw/sbb_dienststellen_bbox.json'))
st=[]
def mode(m):
    if 'RACK_RAILWAY' in m: return 'rack_railway'
    if 'CABLE_RAILWAY' in m: return 'funicular'
    return 'train'
for r in D['train']+D['rack_funicular']:
    E,N=wgs_to_lv95(r['geopos']['lat'],r['geopos']['lon'])
    if not (E0<=E<=E1 and N0<=N<=N1): continue
    st.append({'name':r['designationofficial'],'uic':r['number'],'abbr':r['abbreviation'],'operator':r['businessorganisationabbreviationde'],'mode':mode(r['meansoftransport']),'E':round(E,1),'N':round(N,1),'height_m':r.get('height')})
bav=json.load(open(BASE+'bav_zug_station_big.json'))['results']
edges=[]
for x in bav:
    if str(x['id']).startswith('ch:1:sloid:2204:'):
        c=x['geometry']['coordinates'][0]
        edges.append({'track':x['properties'].get('bezeichnung_de'),'designation':x['properties'].get('betrieblichebezeichnung'),'sloid':x['id'],'E':c[0],'N':c[1]})
edges.sort(key=lambda e:e['sloid'])
for s in st:
    if s['uic']==8502204: s['platform_edge_points']=edges
st.sort(key=lambda s:s['name'])
named=sum(1 for l in lines if 'name' in l)
out={
 'source':'swisstopo swissTLM3D Eisenbahn (layer ch.swisstopo.swisstlm3d-eisenbahnnetz, Datenstand 24.02.2026) via https://api3.geo.admin.ch/rest/services/api/MapServer/identify (fetched 2026-10-03); line names matched to SBB "Linie (graphisch)" https://data.sbb.ch/explore/dataset/linie-mit-polygon/ ; stations: Dienststellen/DiDok (https://data.sbb.ch/explore/dataset/dienststellen-gemass-opentransportdataswiss/), Zug platform-edge points: BAV layer ch.bav.haltestellen-oev',
 'license':'swissTLM3D & ch.bav.haltestellen-oev: Open Government Data, free use with attribution "© swisstopo" / "BAV" (https://www.geo.admin.ch/en/general-terms-of-use-fsdi); SBB data portal: https://data.sbb.ch/page/licence (attribution SBB / opentransportdata.swiss)',
 'crs':'EPSG:2056 (LV95), metres; 2D only (identify API drops Z)',
 'bbox':[E0,N0,E1,N1],
 'geometry_notes':'Per TRACK, not per line: swisstopo layer description: "Bei mehrspurigen Anlagen oder in Bahnhofszonen sind immer sämtliche Gleise erfasst." A double-track line therefore appears as two parallel polylines; station areas contain every siding/turnout track. Raw TLM segments were merged into chains through nodes where exactly two segments with identical attributes meet; chains end at turnouts/junctions and at the bbox edge (clipped). "name" is a heuristic nearest-line match to SBB linie-mit-polygon (median distance of 7 samples <= 35 m; planned project lines 9xxx excluded) and may be wrong at junctions/stations. Station coordinates converted from WGS84 with the swisstopo approximate formulas (~1 m).',
 'gauge_codes':'TLM objektart: 0=Normalspur, 2=Schmalspur, 4=Schmalspur mit Normalspur; funicular=standseilbahn, rack=zahnradbahn',
 'counts':{'raw_tlm_features':len(F),'segments_after_clip':len(segs),'lines':len(lines),'named_lines':named,'stations':len(st)},
 'lines':lines,
 'stations':st,
}
json.dump(out,open(BASE+'tracks.json','w'),ensure_ascii=False,separators=(',',':'))
print(out['counts'])
print(collections.Counter(l.get('name','?') for l in lines).most_common(40))
