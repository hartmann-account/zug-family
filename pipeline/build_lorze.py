import json, numpy as np, pickle, networkx as nx
from shapely.geometry import LineString, Point, MultiLineString
from shapely.ops import linemerge, unary_union
from scipy.spatial import cKDTree
E0,N0=2666000,1207000
f=pickle.load(open('vt_features.pkl','rb'))
def lines(g):
    if g.geom_type=='LineString': return [g]
    if g.geom_type in ('MultiLineString','GeometryCollection'):
        r=[]
        for gg in g.geoms: r+=lines(gg)
        return r
    return []
named=[]; cand=[]
for p,g in f['waterway']:
    n=p.get('name'); c=p.get('class')
    if n=='Lorze': named+=lines(g); cand+=lines(g)
    elif c=='river' and n is None: cand+=lines(g)
misc=pickle.load(open('out/vec_misc.pkl','rb'))
lakes=misc['lakes_l']
zs=[g for g in lakes if abs(g.area/1e6-38.44)<0.05][0]
ae=[g for g in lakes if abs(g.area/1e6-7.28)<0.05][0]
# graph
G=nx.Graph()
pts=[]
def key(pt): return (round(pt[0]/5)*5, round(pt[1]/5)*5)
for ln in cand:
    c=np.array(ln.coords)
    for a,b in zip(c[:-1],c[1:]):
        ka,kb=key(a),key(b)
        if ka==kb: continue
        G.add_edge(ka,kb,weight=float(np.hypot(*(b-a))), named=False)
nodes=list(G.nodes)
arr=np.array(nodes,float)
tree=cKDTree(arr)
# gap edges between endpoints (degree 1) within 250 m
deg1=[n for n in nodes if G.degree(n)==1]
d1=np.array(deg1,float); t1=cKDTree(d1)
for i,j in t1.query_pairs(250):
    a,b=deg1[i],deg1[j]
    dist=float(np.hypot(*(d1[i]-d1[j])))
    if not G.has_edge(a,b): G.add_edge(a,b,weight=dist*2.5+20, gap=True)
# named preference: reduce weight on named Lorze edges
namedset=set()
for ln in named:
    c=np.array(ln.coords)
    for a,b in zip(c[:-1],c[1:]):
        ka,kb=key(a),key(b)
        if G.has_edge(ka,kb): G[ka][kb]['weight']*=0.5
def nearest_node(pt):
    d,i=tree.query(pt); return nodes[i]
# endpoints from named segments
nm=np.concatenate([np.array(l.coords) for l in named])
start=min(nm, key=lambda p: ae.distance(Point(p)))
inflow=min([p for p in nm if p[0]>2679500], key=lambda p: zs.distance(Point(p)))
outflow=min([p for p in nm if p[0]<2678600 and p[1]>1225500], key=lambda p: zs.distance(Point(p)))
end=max(nm, key=lambda p: p[1])
print('start',start.round(),'inflow',inflow.round(),'outflow',outflow.round(),'end',end.round())
paths=[]
for a,b in ((start,inflow),(outflow,end)):
    na,nb=nearest_node(a),nearest_node(b)
    sp=nx.shortest_path(G, na, nb, weight='weight')
    c=np.array(sp,float)
    ls=LineString(c)
    gaps=sum(1 for u,v in zip(sp[:-1],sp[1:]) if G[u][v].get('gap'))
    print('path', round(ls.length), 'm, nodes', len(sp), 'gap edges', gaps)
    paths.append(ls)
L=json.load(open('out/lines.json'))
out=[]
for ls in paths:
    s=ls.simplify(4)
    c=np.round(np.array(s.coords)-[E0,N0]).astype(int)
    out.append(c.flatten().tolist())
L['lorze_path']=out
json.dump(L, open('out/lines.json','w'))
mun=json.load(open('gemeinden_2025.json'))
from shapely.geometry import shape
tot=0
for fm in mun:
    g=shape(fm['geometry']); n=fm['properties']['gemname']
    ln=sum(g.intersection(p).length for p in paths)
    tot+=ln
    if ln>0: print('  Lorze in', n, round(ln/1000,2),'km')
print('total in canton', round(tot/1000,2), 'total path', round(sum(p.length for p in paths)/1000,2), 'lake crossing', round(Point(inflow).distance(Point(outflow))/1000,2))
