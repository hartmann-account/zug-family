import pickle, json, math, urllib.request, collections
from shapely.geometry import Point, box
from shapely.ops import unary_union
from pyproj import Transformer
S=pickle.load(open('/home/claude/zug/fam/sites.pkl','rb'))['sites']
pts=[Point(s['E'],s['N']) for s in S]
# extra anchors: city centres, Zugerberg, Raten, Goldau Tierpark not needed (outside)
extra=[(2681650,1224600),(2682250,1227500),(2677400,1226000),(2679250,1227900),(2674950,1225250),(2675100,1221600),(2686900,1221350),(2689100,1221100),(2681550,1217050),(2687300,1225950),(2686100,1228800),(2682995,1222030),(2692953,1221866),(2683354,1229094)]
pts+= [Point(x,y) for x,y in extra]
u1=unary_union([p.buffer(800,8) for p in pts])
t1=set()
for x in range(2668,2700):
    for y in range(1209,1238):
        if u1.intersects(box(x*1000,y*1000,x*1000+1000,y*1000+1000)): t1.add((x,y))
near=[Point(s['E'],s['N']) for s in S if s['cat'] in ('spiel','feuer','baden','kultur','sport') or s['kind'] in ('Park','Garten','Tiergehege','Höhle','Sehenswürdigkeit','Burgruine','Bergbahn','Aussichtspunkt')]
near+=[Point(x,y) for x,y in extra]
u2=unary_union([p.buffer(160,8) for p in near])
t2=set()
for x in range(2668000,2700000,250):
    for y in range(1209000,1238000,250):
        if u2.intersects(box(x,y,x+250,y+250)): t2.add((x,y))
print('L1 km tiles', len(t1), 'L2 250m tiles', len(t2), 'L2 area km2', len(t2)*0.0625)
json.dump(dict(l1=sorted(t1), l2=sorted(t2)), open('/home/claude/zug/ortho/plan.json','w'))
