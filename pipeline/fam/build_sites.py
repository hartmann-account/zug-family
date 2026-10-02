import json, pickle, collections, math, re
import numpy as np
from shapely.geometry import Point, Polygon, LineString, shape, box
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.prepared import prep
from pyproj import Transformer
ROOT='/home/claude/zug/'
TR=Transformer.from_crs(4326,2056,always_xy=True)
d=pickle.load(open(ROOT+'fam/places_raw.pkl','rb'))
items=d['items']; svc=d['svc']
E0,E1,N0,N1=2666000,2700000,1207000,1239000
dem=np.load(ROOT+'dem4.npy', mmap_mode='r')
def h4(E,N):
    c=(E-E0)/4-0.5; r=(N1-N)/4-0.5
    i=int(np.clip(np.floor(c),0,dem.shape[1]-2)); j=int(np.clip(np.floor(r),0,dem.shape[0]-2)); tx=c-i; ty=r-j
    return float((dem[j,i]*(1-tx)+dem[j,i+1]*tx)*(1-ty)+(dem[j+1,i]*(1-tx)+dem[j+1,i+1]*tx)*ty)
mun=json.load(open(ROOT+'gemeinden_2025.json'))
MUN=[(m['properties']['gemname'], prep(shape(m['geometry'])), shape(m['geometry'])) for m in mun]
def gemeinde(pt):
    for n,pp,full in MUN:
        if pp.contains(pt): return n
    best=min(MUN, key=lambda m: m[2].distance(pt))
    return best[0]
kz=shape(json.load(open(ROOT+'kanton.json'))['results'][0]['geometry'])
misc=pickle.load(open(ROOT+'out/vec_misc.pkl','rb'))
LAKES=unary_union([g for g in misc['lakes_l'] if g.area>1e5])
# --- naming context
streets=[]; snames=[]
for e in json.load(open(ROOT+'fam/osm_streets.json'))['elements']:
    g=e.get('geometry'); t=e.get('tags',{})
    if not g or len(g)<2: continue
    if t.get('highway') in ('motorway','motorway_link','trunk_link','primary_link','secondary_link','platform','bus_stop','proposed','construction'): continue
    streets.append(LineString([TR.transform(p['lon'],p['lat']) for p in g])); snames.append(t['name'])
ST=STRtree(streets)
places=[]; pnames=[]; ptype=[]; schools=[]; sch_names=[]
for e in json.load(open(ROOT+'fam/osm_names.json'))['elements']:
    t=e.get('tags',{})
    c=e.get('center') or ({'lat':e['lat'],'lon':e['lon']} if 'lat' in e else None)
    if not c or 'name' not in t: continue
    p=Point(TR.transform(c['lon'],c['lat']))
    if t.get('place'):
        places.append(p); pnames.append(t['name']); ptype.append(t['place'])
    elif t.get('amenity') in ('school','kindergarten'):
        schools.append(p); sch_names.append(t['name'])
vt=pickle.load(open(ROOT+'vt_features.pkl','rb'))
seen=set()
for lname in ('place','area_name'):
    for p,g in vt.get(lname,[]):
        nm=p.get('name') or ''
        if not nm: continue
        cls=p.get('class'); sub=p.get('subclass')
        if lname=='place' and cls not in ('neighbourhood','hamlet','isolated_dwelling','village','town','suburb','quarter','locality'): continue
        if lname=='area_name' and sub in ('region','hillchain','lake','massif','valley'): continue
        c=g.centroid if g.geom_type!='Point' else g
        key=(nm, round(c.x/50), round(c.y/50))
        if key in seen: continue
        seen.add(key)
        places.append(c); pnames.append(nm); ptype.append('vt_'+(sub or cls or ''))
PT=STRtree(places); SC=STRtree(schools)
SCHOOL_OK=re.compile(r'^(Schulhaus|Schule|Primarschule|Kindergarten|Oberstufe|Schulanlage|Kantonsschule)', re.I)
def nearest_street(pt, maxd):
    i=ST.nearest(pt)
    if i is None: return None
    i=int(i); dd=streets[i].distance(pt)
    return snames[i] if dd<=maxd else None
def nearest_place(pt, maxd, kinds=None):
    best=None
    for i in PT.query(pt.buffer(maxd)):
        i=int(i)
        if kinds and ptype[i] not in kinds and not ptype[i].startswith('vt_'): continue
        if ptype[i].startswith('vt_') and places[i].distance(pt)>900: continue
        dd=places[i].distance(pt)
        if dd<=maxd and (best is None or dd<best[0]): best=(dd,pnames[i])
    return best[1] if best else None
def nearest_school(pt, maxd):
    best=None
    for i in SC.query(pt.buffer(maxd)):
        i=int(i); dd=schools[i].distance(pt)
        if not SCHOOL_OK.search(sch_names[i]): continue
        if dd<=maxd and (best is None or dd<best[0]): best=(dd,sch_names[i])
    return best[1] if best else None
def marker_point(it):
    g=it['g']; k=it['kind']
    if g.geom_type in ('Point',): return g
    if k in ('Bergbahn','Skilift','Schlittelweg'):
        coords=[]
        geoms=getattr(g,'geoms',[g])
        for gg in geoms:
            if gg.geom_type=='Point': coords.append((gg.x,gg.y))
            elif hasattr(gg,'coords'): coords+=list(gg.coords)
            elif hasattr(gg,'exterior'): coords+=list(gg.exterior.coords)
        hs=[(h4(x,y),x,y) for x,y in coords if E0<x<E1 and N0<y<N1]
        if hs:
            h,x,y=(max(hs) if k=='Schlittelweg' else min(hs))
            return Point(x,y)
    if g.geom_type in ('Polygon','MultiPolygon'):
        gi=g.intersection(kz) if not kz.contains(g) else g
        if gi.is_empty: gi=g
        c=gi.centroid
        return c if gi.contains(c) else gi.representative_point()
    if g.geom_type in ('LineString',): return g.interpolate(0.5, normalized=True)
    if g.geom_type=='MultiLineString': return max(g.geoms,key=lambda x:x.length).interpolate(0.5, normalized=True)
    return g.centroid
GENERIC_NAMES={'pausenplatz','spielplatz','trampolin','feuerstelle','park'}
sites=[]
for it in items:
    pt=marker_point(it)
    gem=gemeinde(pt)
    nm=it['name']
    if nm.lower() in GENERIC_NAMES: nm=''
    hint=None
    if it['cat']=='spiel' and not nm:
        sc=nearest_school(pt, 110)
        if sc: hint=sc
    if not hint:
        hint=nearest_street(pt, 70 if it['cat'] in ('spiel','kultur','baden','sport') else 40)
    if not hint:
        hint=nearest_place(pt, 3000, ('locality','hamlet','neighbourhood','village','isolated_dwelling','suburb','quarter'))
    if hint: hint=re.sub(r'\s*\(.*?\)', '', hint).strip()
    if hint and nm and hint.lower() in nm.lower(): hint=None
    if hint and hint==gem: hint=None
    # shade area
    area=None
    g=it['g']; cat=it['cat']; k=it['kind']
    if cat=='spiel':
        if g.geom_type in ('Polygon','MultiPolygon') and 30<=g.area<=40000: area=g
        else: area=pt.buffer(12, 16)
        if k=='Indoor-Spielplatz': area=None
    elif cat=='feuer':
        area=g if (g.geom_type in ('Polygon','MultiPolygon') and 30<=g.area<=3000) else pt.buffer(10,16)
    elif cat=='baden' and k!='Hallenbad':
        base=g if (g.geom_type in ('Polygon','MultiPolygon') and g.area>200) else pt.buffer(20,16)
        land=base.difference(LAKES)
        area=land if land.area>40 else None
    elif cat=='natur' and k in ('Park','Garten','Tiergehege') and g.geom_type in ('Polygon','MultiPolygon') and g.area<=60000:
        area=g
    if area is not None and not area.is_valid: area=area.buffer(0)
    s=dict(cat=cat, kind=k, name=nm, gem=gem, hint=hint or '', E=pt.x, N=pt.y, h=h4(pt.x,pt.y), area=area, flags=it.get('flags',[]), guests=bool(it.get('guests')), ids=it['ids'], osm=it.get('tags',{}))
    sites.append(s)
# outlines for playgrounds (polygon) for display
for s in sites:
    a=s['area']
    s['outline']=a if (a is not None and s['cat'] in ('spiel',) and a.geom_type in ('Polygon','MultiPolygon') and a.area<20000) else None
# services
SV=[]
for x in svc:
    p=x['g']; SV.append(dict(cat=x['cat'], E=p.x, N=p.y, wick=x.get('wick',False), fee=x.get('fee',False), name=x.get('name','')))
wpts=[Point(v['E'],v['N']) for v in SV if v['cat']=='wasser']
cpts=[Point(v['E'],v['N']) for v in SV if v['cat']=='wc']
WT=STRtree(wpts); CT=STRtree(cpts)
for s in sites:
    p=Point(s['E'],s['N'])
    i=WT.nearest(p); s['dw']=round(wpts[int(i)].distance(p)) if i is not None else None
    i=CT.nearest(p); s['dwc']=round(cpts[int(i)].distance(p)) if i is not None else None
pickle.dump(dict(sites=sites, svc=SV), open(ROOT+'fam/sites.pkl','wb'))
c=collections.Counter((s['cat']) for s in sites)
print(c, 'with area', sum(1 for s in sites if s['area'] is not None))
for s in [s for s in sites if s['cat']=='spiel'][:40]:
    print(' ', s['kind'], '|', s['name'] or '—', '|', s['hint'], '|', s['gem'], '|', round(s['h']), '| dw', s['dw'], 'dwc', s['dwc'], '|', None if s['area'] is None else round(s['area'].area))
print('no hint', sum(1 for s in sites if not s['name'] and not s['hint']))
for s in [s for s in sites if s['cat'] in ('feuer','natur')][:30]:
    print(' ', s['cat'], s['kind'], '|', s['name'] or '—', '|', s['hint'], '|', s['gem'], '|', round(s['h']))
