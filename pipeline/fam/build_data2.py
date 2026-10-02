# assemble window.ZG with fam data (places + photos), trees and ortho index
import json, base64, os, subprocess
ROOT='/home/claude/zug/'
subprocess.run(['python3', ROOT+'build_meta.py'], check=True, capture_output=True)
js=open(ROOT+'out/data.js').read()
P=json.load(open(ROOT+'out/places.json'))
ph={}
if os.path.exists(ROOT+'foto/photos.json'):
    ph={int(k):v for k,v in json.load(open(ROOT+'foto/photos.json')).items()}
n=0
for i,p in enumerate(P['places']):
    if i in ph and os.path.exists(ROOT+ph[i]['f']):
        v=ph[i]; p['ph']=dict(f=v['f'], a=v['a'], l=v['l'], u=v['u'], lu=v.get('lu',''), w=v.get('what','')); n+=1
oi=json.load(open(ROOT+'ortho/index.json'))
js+='window.ZG.fam='+json.dumps(P, ensure_ascii=False, separators=(',',':'))+';\n'
js+='window.ZG.ortho='+json.dumps(oi, separators=(',',':'))+';\n'
js+='window.ZG.treesData="'+base64.b64encode(open(ROOT+'out/trees.bin.gz','rb').read()).decode()+'";\n'
open(ROOT+'out/data2.js','w').write(js)
print('data2.js', len(js), 'photos', n)
