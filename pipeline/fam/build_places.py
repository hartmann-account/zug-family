import json, re, math, pickle, collections
import numpy as np
from shapely.geometry import Point, Polygon, MultiPolygon, LineString, MultiLineString, shape, mapping
from shapely.ops import unary_union, polygonize, linemerge, transform as shp_transform
from shapely.prepared import prep
from shapely.strtree import STRtree
from pyproj import Transformer
TR = Transformer.from_crs(4326, 2056, always_xy=True)
def tr(lon, lat): return TR.transform(lon, lat)
ROOT='/home/claude/zug/'
D=json.load(open(ROOT+'fam/osm_family_full.json'))['elements']
kz=shape(json.load(open(ROOT+'kanton.json'))['results'][0]['geometry'])
kzb=prep(kz.buffer(40))
mun=json.load(open(ROOT+'gemeinden_2025.json'))
MUN=[(m['properties']['gemname'], prep(shape(m['geometry'])), shape(m['geometry'])) for m in mun]
order=sorted(m['properties']['gemname'] for m in mun)
MID={n:i+1 for i,n in enumerate(order)}
AREA_TAGS=('leisure','amenity','tourism','natural','landuse','historic','building')
def way_geom(e):
    pts=[tr(p['lon'],p['lat']) for p in e.get('geometry',[]) if p]
    if len(pts)<2: return None
    closed = len(pts)>=4 and pts[0]==pts[-1]
    t=e.get('tags',{})
    if closed and t.get('area')!='no' and not t.get('piste:type') and not t.get('aerialway') and not t.get('railway') and not t.get('highway'):
        p=Polygon(pts)
        if not p.is_valid: p=p.buffer(0)
        return p
    return LineString(pts)
def rel_geom(e):
    outers=[]; inners=[]; lines=[]
    for m in e.get('members',[]):
        g=m.get('geometry')
        if not g: 
            if m.get('type')=='node' and 'lat' in m: lines.append(Point(tr(m['lon'],m['lat'])))
            continue
        pts=[tr(p['lon'],p['lat']) for p in g if p]
        if len(pts)<2: continue
        ls=LineString(pts)
        (inners if m.get('role')=='inner' else outers).append(ls)
    t=e.get('tags',{})
    if t.get('type') in ('multipolygon','boundary') or (t.get('type')=='site'):
        po=list(polygonize(unary_union(outers))) if outers else []
        pi=list(polygonize(unary_union(inners))) if inners else []
        if po:
            g=unary_union(po)
            if pi: g=g.difference(unary_union(pi))
            return g
    allls=[l for l in outers+inners if isinstance(l, LineString)]
    if allls:
        u=unary_union(allls)
        if u.geom_type=='LineString': return u
        try: return linemerge(u)
        except Exception: return u
    if lines: return lines[0]
    return None
def geom_of(e):
    if e['type']=='node': return Point(tr(e['lon'],e['lat']))
    if e['type']=='way': return way_geom(e)
    return rel_geom(e)
def rep(g):
    if g.geom_type in ('Polygon','MultiPolygon'): return g.representative_point()
    if g.geom_type=='Point': return g
    if g.geom_type=='LineString': return g.interpolate(0.5, normalized=True)
    if g.geom_type=='MultiLineString': return max(g.geoms, key=lambda x: x.length).interpolate(0.5, normalized=True)
    return g.centroid
def gemeinde(pt):
    for n,pp,full in MUN:
        if pp.contains(pt): return n
    best=min(MUN, key=lambda m: m[2].distance(pt))
    return best[0] if best[2].distance(pt)<200 else None

DROP_ATTR=re.compile(r'^(Point\s|Bunker|Sibrisboden|Rotes Kreuz|Kohlbodenpumpe|Neugotisches)', re.I)
def classify(t, g):
    acc=t.get('access','')
    L=t.get('leisure'); A=t.get('amenity'); T=t.get('tourism'); N=t.get('natural'); H=t.get('historic'); S=t.get('sport','') or ''
    name=(t.get('name') or '').strip(); ln=name.lower()
    if 'fkk' in ln: return None
    if acc in ('private','no','permit'): return None
    if L=='playground':
        if 'abenteuer' in ln or 'robi' in ln: return ('spiel','Abenteuerspielplatz')
        if ln in ('pausenplatz',) or 'schulhausplatz' in ln: return ('spiel','Pausenplatz')
        return ('spiel','Spielplatz')
    if L=='indoor_play': return ('spiel','Indoor-Spielplatz')
    if A=='public_bath' or L in ('water_park','swimming_area','beach_resort','bathing_place') or (L=='sports_centre' and 'swimming' in S) or (L=='swimming_pool' and ln.startswith('hallenbad')):
        if 'hallenbad' in ln: k='Hallenbad'
        elif 'freibad' in ln or 'schwimmbad' in ln: k='Freibad'
        elif 'badi' in ln: k='Badi'
        else: k='Seebad'
        return ('baden',k)
    if N=='beach': return ('baden','Badestelle')
    if L=='firepit' or A=='bbq': return ('feuer','Feuerstelle')
    if T=='picnic_site': return ('feuer','Feuerstelle' if t.get('fireplace')=='yes' or t.get('bbq')=='yes' else 'Rastplatz')
    if A=='shelter' and t.get('shelter_type') in ('picnic_shelter','weather_shelter','basic_hut','lean_to','sun_shelter','gazebo'): return ('feuer','Unterstand')
    if T=='zoo': return ('natur','Tiergehege')
    if T=='viewpoint': return ('natur','Aussichtspunkt')
    if N=='cave_entrance': return ('natur','Höhle') if 'höllgrotten' in ln else None
    if H in ('castle','ruins'):
        if ln in ('burg zug',) : return None  # covered by Museum Burg Zug
        if 'schloss' in ln: return None       # private castles
        return ('natur','Burgruine')
    if T=='attraction':
        if not name or DROP_ATTR.search(name): return None
        if 'höllgrotten' in ln: return ('natur','Höhle')
        if 'lehrpfad' in ln: return ('natur','Lehrpfad')
        if 'garten' in ln: return ('natur','Garten')
        return ('natur','Sehenswürdigkeit')
    if L=='nature_reserve' and name and 'rothenthurm' not in ln: return ('natur','Naturschutzgebiet')
    if L=='garden' and name and 'anbaufläche' not in ln: return ('natur','Garten')
    if L=='park':
        if any(w in ln for w in ('seebad','camping','schlosspark','gut aabach','schloss')): return None
        if name: return ('natur','Park')
        if g is not None and g.geom_type in ('Polygon','MultiPolygon') and g.area>5000: return ('natur','Park')
        return None
    if t.get('railway')=='funicular': return ('natur','Bergbahn')
    if T=='museum':
        if 'erni collection' in ln: return None
        return ('kultur','Museum')
    if A=='library':
        if any(w in ln for w in ('hochschule','mediothek','studienbibliothek')): return None
        return ('kultur','Bibliothek')
    if A=='toy_library': return ('kultur','Ludothek')
    if A=='theatre': return ('kultur','Theater')
    if A=='cinema': return ('kultur','Kino')
    if L=='ice_rink' or 'ice_skating' in S: return ('sport','Eisfeld')
    if L=='miniature_golf': return ('sport','Minigolf')
    if S=='skateboard': return ('sport','Skatepark')
    if S=='cycling' and 'pumptrack' in ln: return ('sport','Pumptrack')
    if 'climbing' in S and L=='sports_centre': return ('sport','Kletterhalle')
    if 'trampoline' in S: return ('sport','Trampolin & Parkour')
    if t.get('piste:type')=='sled': return ('sport','Schlittelweg')
    if t.get('piste:type')=='downhill' or t.get('aerialway') in ('drag_lift','t-bar') or (L=='sports_centre' and S=='ski'): return ('sport','Skilift')
    if A=='drinking_water' or (A=='fountain' and t.get('drinking_water')=='yes'): return ('wasser','Trinkbrunnen')
    if A=='toilets' and acc not in ('customers',): return ('wc','WC')
    return None

raw=[]
for e in D:
    t=e.get('tags',{})
    g=geom_of(e)
    if g is None or g.is_empty: continue
    c=classify(t,g)
    if not c: continue
    p=rep(g)
    if not kzb.contains(p):
        # parts of big features: clip to canton
        if g.geom_type in ('Polygon','MultiPolygon','LineString','MultiLineString') and g.intersects(kz):
            g=g.intersection(kz); p=rep(g)
        else: continue
    raw.append(dict(cat=c[0], kind=c[1], name=(t.get('name') or '').strip(), g=g, t=t, id=f"{e['type'][0]}{e['id']}"))
print('raw', collections.Counter(r['cat'] for r in raw))

# ---------- merging
def cluster(items, dist, same=lambda a,b: True):
    n=len(items); parent=list(range(n))
    def f(i):
        while parent[i]!=i: parent[i]=parent[parent[i]]; i=parent[i]
        return i
    geoms=[it['g'] for it in items]
    tree=STRtree(geoms)
    for i,g in enumerate(geoms):
        for j in tree.query(g.buffer(dist)):
            j=int(j)
            if j<=i: continue
            if geoms[i].distance(geoms[j])<=dist and same(items[i],items[j]):
                a,b=f(i),f(j)
                if a!=b: parent[a]=b
    groups=collections.defaultdict(list)
    for i in range(n): groups[f(i)].append(items[i])
    return list(groups.values())
GENERIC={'','pausenplatz','spielplatz','trampolin','feuerstelle','yes','park','biotop'}
def pick_name(group, prefer=None):
    names=[it['name'] for it in group if it['name'] and it['name'].lower() not in GENERIC]
    if prefer:
        pn=[it['name'] for it in group if it['name'] and prefer(it)]
        if pn: return max(pn, key=len)
    return max(names, key=len) if names else ''
def merged_geom(group):
    polys=[it['g'] for it in group if it['g'].geom_type in ('Polygon','MultiPolygon')]
    if polys: return unary_union(polys)
    lines=[it['g'] for it in group if it['g'].geom_type in ('LineString','MultiLineString')]
    if lines: return unary_union(lines)
    pts=[it['g'] for it in group]
    return unary_union(pts).centroid

items=[]
bycat=collections.defaultdict(list)
for r in raw: bycat[r['cat']].append(r)
# playgrounds: merge overlapping or <12 m
for grp in cluster(bycat['spiel'], 12):
    kinds=[g['kind'] for g in grp]
    kind='Abenteuerspielplatz' if 'Abenteuerspielplatz' in kinds else ('Indoor-Spielplatz' if 'Indoor-Spielplatz' in kinds else ('Pausenplatz' if all(k=='Pausenplatz' for k in kinds) else 'Spielplatz'))
    acc=[g['t'].get('access','') for g in grp]
    items.append(dict(cat='spiel', kind=kind, name=pick_name(grp), g=merged_geom(grp), ids=[g['id'] for g in grp], guests=('customers' in acc), tags=grp[0]['t'], flags=[]))
# baden: merge within 90 m
import pickle as _pk
LAKES=unary_union([g for g in _pk.load(open(ROOT+'out/vec_misc.pkl','rb'))['lakes_l'] if g.area>1e5])
def _bsame(a,b):
    ha=a['kind']=='Hallenbad'; hb=b['kind']=='Hallenbad'
    if ha!=hb: return False
    d=a['g'].distance(b['g'])
    if a['name'] and b['name'] and (a['name'] in b['name'] or b['name'] in a['name']): return True
    if not a['name'] and not b['name'] and a['kind']=='Badestelle' and b['kind']=='Badestelle': return d<=90
    return d<=25
for grp in cluster(bycat['baden'], 90, same=_bsame):
    pref=lambda it: it['t'].get('amenity')=='public_bath' or it['t'].get('leisure')=='sports_centre'
    nm=pick_name(grp, pref)
    kinds=[g['kind'] for g in grp if g['name']==nm] or [g['kind'] for g in grp]
    k=kinds[0]
    lnm=nm.lower()
    if 'strandbad' in lnm: k='Strandbad'
    elif 'seebad' in lnm: k='Seebad'
    elif 'hallenbad' in lnm: k='Hallenbad'
    elif 'badi' in lnm: k='Badi'
    elif 'freibad' in lnm or 'schwimmbad' in lnm: k='Freibad'
    gg=merged_geom(grp)
    nearlake = gg.distance(LAKES) < 60
    official = any(g['t'].get('amenity')=='public_bath' or g['t'].get('leisure') in ('sports_centre','beach_resort','water_park','swimming_area') for g in grp)
    if k in ('Seebad','Strandbad','Badi') and not nearlake and k!='Badi': k='Freibad'
    if not official and k not in ('Strandbad','Hallenbad'): k='Badestelle'
    if k=='Seebad' and not nm: k='Badestelle'
    items.append(dict(cat='baden', kind=k, name=nm, g=merged_geom(grp), ids=[g['id'] for g in grp], tags=grp[0]['t'], flags=[]))
# feuer: merge within 30 m
for grp in cluster(bycat['feuer'], 30):
    fl=set()
    for g in grp:
        t=g['t']
        if t.get('leisure')=='firepit' or t.get('amenity')=='bbq' or t.get('fireplace')=='yes' or t.get('bbq')=='yes': fl.add('Feuerstelle')
        if t.get('amenity')=='bbq' or t.get('bbq')=='yes': fl.add('Grill')
        if t.get('amenity')=='shelter' or t.get('covered')=='yes': fl.add('Unterstand')
        if t.get('tourism')=='picnic_site': fl.add('Rastplatz')
    if fl=={'Unterstand'}: continue   # lone shelters are not picnic spots
    kind='Feuerstelle' if 'Feuerstelle' in fl else 'Rastplatz'
    items.append(dict(cat='feuer', kind=kind, name=pick_name(grp), g=merged_geom(grp), ids=[g['id'] for g in grp], tags=grp[0]['t'], flags=sorted(fl - {kind})))
# natur: merge same name within 400 m, else within 15 m
for grp in cluster(bycat['natur'], 400, same=lambda a,b: a['name'] and a['name']==b['name']):
    sub=cluster(grp, 15) if not grp[0]['name'] else [grp]
    for s in sub:
        k=s[0]['kind']
        if any(x['kind']=='Höhle' for x in s): k='Höhle'
        g=merged_geom(s)
        if k=='Bergbahn':  # valley station = lowest point
            g=g
        nm=pick_name(s) or s[0]['name']
    nm=re.sub(r'\s*wegweiser$', '', nm, flags=re.I)
    if 'garten' in nm.lower() and k=='Naturschutzgebiet': k='Garten'
    items.append(dict(cat='natur', kind=k, name=nm, g=g, ids=[x['id'] for x in s], tags=s[0]['t'], flags=[]))
for grp in cluster(bycat['kultur'], 25, same=lambda a,b: a['name']==b['name']):
    items.append(dict(cat='kultur', kind=grp[0]['kind'], name=pick_name(grp) or grp[0]['name'], g=merged_geom(grp), ids=[x['id'] for x in grp], tags=grp[0]['t'], flags=[]))
# sport: sled runs / ski lifts merge by proximity 120 m, others 25 m
for kind,d in (('Schlittelweg',60),('Skilift',250)):
    sel=[x for x in bycat['sport'] if x['kind']==kind]
    for grp in cluster(sel, d):
        nm=''
        rels=[x['name'] for x in grp if x['id'].startswith('r') and x['name']]
        if rels: nm=rels[0]
        elif kind=='Skilift':
            ns=[x['name'] for x in grp if x['name']]
            nm=max(ns,key=len) if ns else ''
            if nm and not nm.lower().startswith('skilift'): nm='Skilift '+nm
        else:
            ns=[x['name'] for x in grp if x['name']]
            nm=collections.Counter(ns).most_common(1)[0][0] if ns else ''
        g=unary_union([x['g'] for x in grp])
        if kind=='Schlittelweg' and g.length<300: continue
        items.append(dict(cat='sport', kind=kind, name=nm, g=g, ids=[x['id'] for x in grp], tags=grp[0]['t'], flags=[]))
for grp in cluster([x for x in bycat['sport'] if x['kind'] not in ('Schlittelweg','Skilift')], 25):
    items.append(dict(cat='sport', kind=grp[0]['kind'], name=pick_name(grp) or grp[0]['name'], g=merged_geom(grp), ids=[x['id'] for x in grp], tags=grp[0]['t'], flags=[], guests=any(x['t'].get('access')=='customers' for x in grp)))
svc=[]
for x in bycat['wasser']: svc.append(dict(cat='wasser', g=rep(x['g']), name=x['name'], id=x['id']))
for x in bycat['wc']:
    ct=x['t'].get('changing_table') in ('yes','room')
    svc.append(dict(cat='wc', g=rep(x['g']), name=x['name'], id=x['id'], wick=ct, fee=x['t'].get('fee')=='yes'))
print('items', collections.Counter(i['cat'] for i in items), 'svc', collections.Counter(s['cat'] for s in svc))
pickle.dump(dict(items=items, svc=svc), open(ROOT+'fam/places_raw.pkl','wb'))
