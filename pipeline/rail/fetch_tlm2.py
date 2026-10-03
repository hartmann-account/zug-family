import json, time, urllib.request, urllib.parse
OUT='/tmp/claude-0/-home-user-zug-family/64b5cc64-43f3-53c7-8f01-46d00a8ef452/scratchpad/research/trains/raw/tlm_rail_features.json'
E0,E1,N0,N1=2664000,2702000,1205000,1241000
feats={}; reqs=0; dups=0
def get(e0,n0,e1,n1):
    global reqs
    q={'geometryType':'esriGeometryEnvelope','geometry':f'{e0},{n0},{e1},{n1}','tolerance':0,
       'layers':'all:ch.swisstopo.swisstlm3d-eisenbahnnetz','returnGeometry':'true','geometryFormat':'geojson',
       'sr':2056,'limit':200,'lang':'de'}
    url='https://api3.geo.admin.ch/rest/services/api/MapServer/identify?'+urllib.parse.urlencode(q)
    req=urllib.request.Request(url,headers={'User-Agent':'zug-entdecken-research'})
    for attempt in range(4):
        try:
            d=json.load(urllib.request.urlopen(req,timeout=60)); break
        except Exception as ex:
            print('retry',ex); time.sleep(5)
    reqs+=1; time.sleep(0.35)
    return d['results']
def rec(e0,n0,e1,n1,depth=0):
    r=get(e0,n0,e1,n1)
    if len(r)>=150 and depth<8:
        em=(e0+e1)/2; nm=(n0+n1)/2
        for a in [(e0,n0,em,nm),(em,n0,e1,nm),(e0,nm,em,n1),(em,nm,e1,n1)]:
            rec(*a,depth=depth+1)
        return
    for f in r:
        if f['id'] in feats and feats[f['id']]['geometry']!=f['geometry']:
            print('id with differing geometry',f['id'])
        feats[f['id']]=f
    print(depth,round(e0),round(n0),round(e1),round(n1),len(r),len(feats),flush=True)
for i in range(4):
    for j in range(4):
        rec(E0+(E1-E0)*i/4,N0+(N1-N0)*j/4,E0+(E1-E0)*(i+1)/4,N0+(N1-N0)*(j+1)/4)
json.dump({'requests':reqs,'features':list(feats.values())},open(OUT,'w'))
print('total',len(feats),'requests',reqs)
