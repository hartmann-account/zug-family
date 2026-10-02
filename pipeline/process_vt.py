import mapbox_vector_tile, glob, mercantile, pickle, collections, time
from shapely.geometry import shape, box, mapping, Polygon, MultiPolygon, LineString, MultiLineString, Point
from shapely.ops import transform as shp_transform, unary_union
from pyproj import Transformer
tr = Transformer.from_crs(3857, 2056, always_xy=True)
E0,E1,N0,N1 = 2666000, 2700000, 1207000, 1239000
out=collections.defaultdict(list)
t0=time.time()
EXT=4096
clipbox=box(0,0,EXT,EXT)
files=sorted(glob.glob('vt/14_*.pbf'))
for i,fn in enumerate(files):
    _,x,y=fn[3:-4].split('_'); x=int(x); y=int(y)
    t=mercantile.Tile(x,y,14)
    b=mercantile.xy_bounds(t)
    sx=(b.right-b.left)/EXT; sy=(b.top-b.bottom)/EXT
    def to2056(xx, yy, z=None):
        X=[b.left+v*sx for v in xx] if hasattr(xx,'__iter__') else b.left+xx*sx
        Y=[b.top-v*sy for v in yy] if hasattr(yy,'__iter__') else b.top-yy*sy
        return tr.transform(X,Y)
    d=mapbox_vector_tile.decode(open(fn,'rb').read(), default_options={'y_coord_down': True})
    for lname in ('building','water','landcover','bathymetry','waterway','place','mountain_peak','water_name','transportation','spot_elevation','poi','area_name','building_ln','landuse'):
        L=d.get(lname)
        if not L: continue
        for f in L['features']:
            p=f['properties']; g=f['geometry']
            if lname=='landcover' and p.get('class') not in ('wood',): continue
            if lname=='water' and p.get('class') not in ('lake','river'): continue
            if lname=='transportation' and p.get('class') not in ('rail','motorway','trunk','primary','secondary'): continue
            if lname=='poi' and p.get('class') not in ('place_of_worship','tower','castle','museum','monument','attraction','viewpoint','railway','station','bus','school','hospital'): continue
            try:
                geom=shape(g)
            except Exception as ex:
                continue
            if geom.is_empty: continue
            if geom.geom_type in ('Polygon','MultiPolygon','LineString','MultiLineString'):
                if not geom.is_valid: geom=geom.buffer(0)
                geom=geom.intersection(clipbox)
                if geom.is_empty: continue
            elif geom.geom_type=='Point':
                if not (0<=geom.x<EXT and 0<=geom.y<EXT): continue
            geom=shp_transform(lambda xx,yy,z=None: to2056(xx,yy), geom)
            out[lname].append((p, geom))
    if i%50==0: print(i, len(files), {k:len(v) for k,v in out.items()}, round(time.time()-t0,1), flush=True)
pickle.dump(dict(out), open('vt_features.pkl','wb'))
print({k:len(v) for k,v in out.items()}, round(time.time()-t0,1))
