import os
t=open('template.html').read()
data=open('../out/data2.js').read()
app=open('app.js').read()
assert '</script' not in data and '</script' not in app
out=t.replace('<script>/*DATA*/</script>','<script>'+data+'</script>').replace('<script>/*APP*/</script>','<script>'+app+'</script>')
open('zuger-familien.html','w').write(out)
# local test version: full html doc wrapper like the publish skeleton
skel='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
open('test.html','w').write(skel+'<script>window.ZG_TEST=1</script>'+out+'</body></html>')
# standalone page for the GitHub repository: complete HTML document
cut = out.index('</style>') + len('</style>')
doc = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       '<meta name="description" content="3D-Karte des Kantons Zug mit Spielplätzen, Badis, Feuerstellen, Schatten und UV-Index.">\n'
       + out[:cut] + '\n</head>\n<body>' + out[cut:] + '\n</body>\n</html>\n')
open('index.html', 'w').write(doc)
print(os.path.getsize('zuger-familien.html'))
