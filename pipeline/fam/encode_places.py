import pickle, json, numpy as np, math, gzip, base64, collections, re
from shapely.geometry import Point, shape
from shapely.ops import unary_union
ROOT='/home/claude/zug/'
S=pickle.load(open(ROOT+'fam/sites.pkl','rb'))
sites=S['sites']; svc=S['svc']
R=pickle.load(open(ROOT+'fam/shade_out.pkl','rb'))
shade=R['shade']; steps=R['steps']
E0,N0=2666000,1207000
mun=json.load(open(ROOT+'gemeinden_2025.json'))
order=sorted(m['properties']['gemname'] for m in mun)
MID={n:i+1 for i,n in enumerate(order)}
# ---------- Zug Tourismus family offers (https://www.zug-tourismus.ch/de/familien/)
ZT='https://www.zug-tourismus.ch'
def find(pred):
    c=[i for i,s in enumerate(sites) if pred(s)]
    return c
def near(E,N,cat=None,kind=None,r=150):
    best=None
    for i,s in enumerate(sites):
        if cat and s['cat']!=cat: continue
        if kind and s['kind']!=kind: continue
        d=math.hypot(s['E']-E,s['N']-N)
        if d<=r and (best is None or d<best[0]): best=(d,i)
    return best[1] if best else None
def inside_park(parkname, cat='spiel'):
    pk=[s for s in sites if s['name']==parkname and s['kind']=='Park']
    if not pk: return None
    a=pk[0]['area']
    c=[i for i,s in enumerate(sites) if s['cat']==cat and a is not None and a.buffer(15).contains(Point(s['E'],s['N']))]
    return c[0] if c else None
attach=[]   # (site index, title, url, newname)
def add_link(i, title, url, newname=None, kind=None):
    s=sites[i]
    s.setdefault('zt',[]).append([title, ZT+url])
    if newname: s['name']=newname
    if kind: s['kind']=kind
idx=find(lambda s: s['name']=='Höllgrotten'); add_link(idx[0],'Höllgrotten Baar','/de/poi/besichtigung/hoellgrotten-baar/')
idx=find(lambda s: s['kind']=='Indoor-Spielplatz'); add_link(idx[0],'Freiruum Spiilruum','/de/poi/sport-und-freizeitanlage/spiilruum-im-freiruum/', newname='Spiilruum im Freiruum')
idx=find(lambda s: s['name']=='Museum für Urgeschichte'); add_link(idx[0],'Museum für Urgeschichte(n)','/de/museum-fuer-urgeschichten/', newname='Museum für Urgeschichte(n)')
idx=find(lambda s: s['name']=='Museum Burg Zug'); add_link(idx[0],'Museum Burg Zug','/de/museum-burg-zug/')
idx=find(lambda s: s['name']=='Ziegeleimuseum Cham'); add_link(idx[0],'Ziegelei-Museum','/de/ziegelei-museum/', newname='Ziegelei-Museum')
idx=find(lambda s: s['name']=='Minigolf Zug'); add_link(idx[0],'Minigolf Schanz Zug','/de/poi/sport-und-freizeitanlage/minigolfanlage-auf-der-schanz/', newname='Minigolf Schanz')
idx=find(lambda s: s['name']=='Minigolf Cham Villette'); add_link(idx[0],'Minigolf Cham','/de/poi/sport-und-freizeitanlage/minigolf-cham/')
i=near(2687151,1221243,'sport','Minigolf',80); add_link(i,'Minigolf Birkenwäldli Unterägeri','/de/poi/sport-und-freizeitanlage/minigolf-birkenwaeldli-unteraegeri/', newname='Minigolf Birkenwäldli')
idx=find(lambda s: s['name']=='Badi Trubikon'); add_link(idx[0],'Badi Trubikon','/de/badis-am-see/')
idx=find(lambda s: s['name']=='Pumptrack Cham'); add_link(idx[0],'Pumptrack Cham','/de/poi/sport-und-freizeitanlage/pumptrack-cham/')
idx=find(lambda s: s['name']=='Schattwäldli' and s['cat']=='spiel'); add_link(idx[0],'Abenteuerspielplatz Schattwäldli','/de/spielplatzschattwaeldlizugerberg/', newname='Abenteuerspielplatz Schattwäldli', kind='Abenteuerspielplatz')
i=inside_park('Villette Park'); print('villette pg', i, sites[i]['hint'] if i is not None else None)
if i is not None: add_link(i,'Spielplatz Villette-Park','/de/spielplatzvillettecham/', newname='Spielplatz Villette-Park')
i=inside_park('Birkenwäldli'); print('birken pg', i)
if i is not None: add_link(i,'Spielplatz Birkenwäldli','/de/spielplatzbirkenwaeldliunteraegeri/', newname='Spielplatz Birkenwäldli')
i=near(2681543,1224915,'spiel',None,250); add_link(i,'Spielplatz Rigiplatz','/de/spielplatzrigiplatzzug/', newname='Spielplatz Rigiplatz')
# new entries
def new(cat,kind,name,hint,gem,E,N,links,note='',outside=False):
    from shapely.geometry import Point as P
    import numpy as _np
    dem=_np.load(ROOT+'dem4.npy', mmap_mode='r')
    c=int((E-2666000)/4); r=int((1239000-N)/4)
    sites.append(dict(cat=cat,kind=kind,name=name,gem=gem,hint=hint,E=E,N=N,h=float(dem[r,c]),area=None,flags=[],guests=False,ids=[],osm={},outline=None,dw=None,dwc=None,zt=[[t,ZT+u] for t,u in links],note=note,outside=outside))
new('natur','Erlebnisweg','Zugiblubbi Erlebnisweg','Rundweg ab Bergstation Zugerberg, rund 4,5 km','Zug',2682995,1222030,[['Zugiblubbi Erlebnisweg','/de/tours/wanderung/zugiblubbi-erlebnisweg/']],'8 Spielposten und 9 Diamantenposten')
new('sport','Schiff','Abenteuerschiff Zugersee','Auf dem Kursschiff, mittwochs und sonntags um 15.15 Uhr buchbar','Zug',2680600,1223600,[['Abenteuerschiff Zugersee','/de/poi/abenteuerschiff-auf-dem-zugersee/']])
new('kultur','Rätseltrail','Rätseltrails in der Altstadt','Mission Rudolf, Detektiv-Trail, Foxtrail GO, Finding Daniel','Zug',2681600,1224380,[['Mission Rudolf','/de/poi/sport-und-freizeitanlage/mission-rudolf-raetsel-trail-zug/'],['Detektiv-Trail Zug','/de/poi/sport-und-freizeitanlage/detektiv-trail-zug/'],['Foxtrail GO','/de/poi/sport-und-freizeitanlage/foxtrail-go/'],['Finding Daniel','/de/poi/sport-und-freizeitanlage/finding-daniel/']])
new('natur','Bauernhof','Volg NATURENA Erlebnishof Zugerland','Hotzenhof, Deinikon 11, Baar','Baar',2683354,1229094,[['Volg NATURENA Erlebnishof Zugerland','/de/poi/besichtigung/volg-naturena-erlebnishof-zugerland/']],'Geöffnet vom 21. März bis 31. Oktober')
new('natur','Erlebnisweg','Volg NATURENA Sinnespfad','Start und Ziel beim Restaurant Raten','Oberägeri',2692953,1221866,[['Volg NATURENA Sinnespfad','/de/tours/rundgang/volg-naturena-sinnespfad-im-zugerland/']],'Geöffnet vom 21. März bis 31. Oktober')
new('sport','Bootsvermietung','Zug Bootsvermietung','Unterer Landsgemeindeplatz','Zug',2681541,1224595,[['Zug Bootsvermietung','/de/poi/verleih/zug-bootsvermietung/']],'Pedalos und Motorboote ohne Führerschein')
new('sport','Velotour','Velotour Cham – Hünenberg See – Maschwanden','Start in Cham oder Hünenberg, rund 20 km','Cham',2677450,1226350,[['Cham – Hünenberg See – Maschwanden','/de/tours/radtouren/cham-huenenberg-see-maschwanden/']])
new('sport','Velotour','Zugerberg-Rundweg für Familien','Rundtour auf dem Zugerberg, rund 14 km','Zug',2683146,1222070,[['Zugerberg-Rundweg für Familien','/de/tours/radtouren/zugerberg-rundweg-fuer-familien/']])
new('sport','Velotour','Velotour Zugersee – Steinhauserwald','Am Zugersee und durch den Steinhauserwald','Steinhausen',2679274,1228052,[['Zugersee – Steinhauserwald für Familien','/de/tours/radtouren/zugersee-steinhauserwald-fuer-familien/']])
new('sport','Velotour','Velotour Ägerisee – Morgarten','Von Unterägeri dem Ägerisee entlang bis Morgarten','Unterägeri',2687050,1221150,[['Ägerisee – Morgarten für Familien','/de/tours/radtouren/aegerisee-moorgarten-fuer-familien/']])
new('kultur','Museum','Verkehrshaus der Schweiz','Lidostrasse 5, Luzern','Luzern',2668228,1211733,[['Verkehrshaus der Schweiz','/de/poi/besichtigung/verkehrshaus-der-schweiz/']],'Ausserhalb des Kantons Zug',outside=True)
new('natur','Tierpark','Natur- und Tierpark Goldau','Parkstrasse 40, Goldau','Arth (SZ)',2684664,1211752,[['Natur- und Tierpark Goldau','/de/poi/besichtigung/natur-und-tierpark-goldau/']],'Ausserhalb des Kantons Zug',outside=True)
print('zt sites', sum(1 for s in sites if s.get('zt')))
# ---------- encode
CAT=['spiel','baden','feuer','natur','kultur','sport']
out=[]
for i,s in enumerate(sites):
    r=shade.get(i)
    o=dict(c=CAT.index(s['cat']), k=s['kind'], n=s['name'], h=s['hint'], g=s['gem'], e=round(s['E']-E0,1), m=round(s['N']-N0,1), z=round(s['h']))
    if r: o['s']=[int(round(v*100)) for v in r['shade']]; o['v']=int(round(r['cover']*100))
    if s.get('dw') is not None: o['dw']=s['dw']
    if s.get('dwc') is not None: o['dc']=s['dwc']
    if s.get('zt'): o['t']=s['zt']
    if s.get('note'): o['x']=s['note']
    if s.get('outside'): o['o']=1
    if s.get('guests'): o['q']=1
    fl=s.get('flags') or []
    if fl: o['f']=fl
    ol=s.get('outline')
    if ol is not None:
        g=ol.simplify(0.6)
        polys=[g] if g.geom_type=='Polygon' else list(g.geoms)
        rings=[]
        for p in polys:
            c=np.array(p.exterior.coords)[:-1]
            rings.append([int(round(v)) for v in ((c-np.array([s['E'],s['N']]))*2).flatten()])
        o['p']=rings
    ids=[x for x in s.get('ids',[]) if x[0] in 'nwr']
    if ids: o['id']=ids[0]
    out.append(o)
SV=dict(w=[[round(v['E']-E0,1),round(v['N']-N0,1)] for v in svc if v['cat']=='wasser'],
        c=[[round(v['E']-E0,1),round(v['N']-N0,1),1 if v['wick'] else 0] for v in svc if v['cat']=='wc'])
T=np.load(ROOT+'fam/trees.npy')
qE=np.clip(np.round((T[:,0]-E0)/0.55),0,65535).astype('<u2'); qN=np.clip(np.round((T[:,1]-N0)/0.55),0,65535).astype('<u2')
qh=np.clip(np.round(T[:,2]*4),0,255).astype(np.uint8); qr=np.clip(np.round(T[:,3]*20),0,255).astype(np.uint8)
order_=np.lexsort((qE, qN//455))   # rows of ~250 m
blob=np.array([len(T)],'<u4').tobytes()+qE[order_].tobytes()+qN[order_].tobytes()+qh[order_].tobytes()+qr[order_].tobytes()
gz=gzip.compress(blob,9)
open(ROOT+'out/trees.bin.gz','wb').write(gz)
oi=json.load(open(ROOT+'ortho/index.json')) if __import__('os').path.exists(ROOT+'ortho/index.json') else None
meta=dict(places=out, svc=SV, steps=steps, day='2026-07-21')
s=json.dumps(meta, ensure_ascii=False, separators=(',',':'))
open(ROOT+'out/places.json','w').write(s)
print('places', len(out), 'json', len(s), 'trees', len(T), 'gz', len(gz))
print(collections.Counter(CAT[o['c']] for o in out))
for o in out:
    if o.get('t'): print('  ZT', o['k'], '|', o['n'], '|', o['g'], '| shade15', o['s'][14] if 's' in o else '-')
