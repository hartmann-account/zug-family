import json, base64, numpy as np, gzip, os
from shapely.geometry import shape, LineString
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
tm=json.load(open('out/terrain_meta.json'))
stats=json.load(open('muni_stats.json'))
mun=json.load(open('gemeinden_2025.json'))
order=sorted(stats.keys())
lab={'Zug':(2681653,1224673),'Baar':(2682244,1227527),'Cham':(2677372,1226032),'Steinhausen':(2679255,1227882),'Hünenberg':(2674920,1225251),
     'Risch':(2675059,1221604),'Unterägeri':(2686934,1221342),'Oberägeri':(2689101,1221122),'Walchwil':(2681552,1217073),'Menzingen':(2687302,1225922),'Neuheim':(2686106,1228821)}
sub={'Risch':'Rotkreuz'}
munis=[]
for i,n in enumerate(order):
    g=[shape(m['geometry']) for m in mun if m['properties']['gemname']==n][0]
    s=stats[n]
    b=g.bounds
    munis.append(dict(id=i+1, name=n, bfs=s['bfs'], ha=s['ha'], hmin=round(s['hmin']), hmax=round(s['hmax']), at=list(lab[n]), sub=sub.get(n), c=[round(g.centroid.x),round(g.centroid.y)], bb=[round(v) for v in b]))
# canton max: Wildspitz 4 m DEM 1579.4 -> 1580 (gazetteer 1580)
labels=[
 # lakes
 dict(t='Zugersee', k='lake', at=[2679300,1219800], s=['kanton','zug','lorze','walchwil','gemeinden']),
 dict(t='Ägerisee', k='lake', at=[2689742,1219444], s=['kanton','aegeri','berg','gemeinden']),
 dict(t='Zürichsee', k='lake', at=[2693600,1233300], s=['kanton','berg']),
 dict(t='Vierwaldstättersee', k='lake', at=[2671200,1209600], s=['walchwil']),
 dict(t='Lauerzersee', k='lake', at=[2687922,1210179], s=['walchwil']),
 # rivers
 dict(t='Lorze', k='river', at=[2683600,1227900], s=['lorze']),
 dict(t='Reuss', k='river', at=[2672650,1226400], s=['lorze']),
 # peaks (elevations from swissALTI3D)
 dict(t='Wildspitz', k='peak', h=1580, at=[2686488,1215458], s=['kanton','walchwil','aegeri']),
 dict(t='Zugerberg', k='peak', h=1039, at=[2683334,1221485], s=['zug','walchwil']),
 dict(t='Höhronen', k='peak', h=1229, at=[2693802,1223930], s=['aegeri','berg']),
 dict(t='Gottschalkenberg', k='peak', h=1164, at=[2691679,1223126], s=['berg']),
 dict(t='Baarburg', k='peak', h=684, at=[2684638,1228755], s=['berg']),
 dict(t='Rigi Kulm', k='peak', h=1797, at=[2679519,1212281], s=['walchwil']),
 dict(t='Grosser Mythen', k='peak', h=1898, at=[2695025,1209522], s=['walchwil']),
 # places / landmarks
 dict(t='Zytturm', k='poi', at=[2681620,1224465], s=['zug']),
 dict(t='Bahnhof', k='poi', at=[2681651,1225292], s=['zug']),
 dict(t='Altstadt', k='place', at=[2681560,1224300], s=['zug']),
 dict(t='Oberwil', k='place', at=[2680969,1222330], s=['zug']),
 dict(t='Lorzentobel', k='place', at=[2684769,1226243], s=['lorze','berg']),
 dict(t='Morgarten', k='poi', at=[2691375,1218022], s=['aegeri']),
 dict(t='Edlibach', k='place', at=[2685939,1226273], s=['berg']),
 dict(t='Allenwinden', k='place', at=[2684621,1224211], s=['berg']),
 dict(t='Hünenberg See', k='place', at=[2676781,1225040], s=['lorze']),
]
L=json.load(open('out/lines.json'))
lines={k:L[k] for k in ('canton','muni','shore','river_Reuss','river_Sihl','lorze_path','lorze_cross')}
b64=lambda p: base64.b64encode(open(p,'rb').read()).decode()
data=dict(
  grid=dict(E0=E0,E1=E1,N0=N0,N1=N1,nx=tm['nx'],ny=tm['ny'],step=tm['step']),
  relief=[2125,2000], mask=[1700,1600],
  canton=dict(ha=23873, hmin=386, hmax=1580),
  munis=munis, labels=labels, lines=lines,
  bld=json.load(open('out/bld_meta.json')),
  zyt=[2681620,1224465],
)
js='window.ZG='+json.dumps(data, ensure_ascii=False, separators=(',',':'))+';\n'
js+='window.ZG.hgt="'+b64('out/hgt_planes.bin.gz')+'";\n'
js+='window.ZG.bldData="'+b64('out/bld.bin.gz')+'";\n'
js+='window.ZG.reliefURI="data:image/webp;base64,'+b64('out/relief_final.webp')+'";\n'
js+='window.ZG.maskURI="data:image/png;base64,'+b64('out/mask_pal.png')+'";\n'
open('out/data.js','w').write(js)
print('data.js', os.path.getsize('out/data.js'))
for m in munis: print(m['id'], m['name'], m['ha'], m['hmin'], m['hmax'])
