"""Baut public/index.html aus template.html, den Geodaten (data/zg-base.js), den Portal-Daten (data/portal.json),
dem Guidle-Modul (guidle.js) und der Anwendung (app.js). Aufruf: python3 src/build.py"""
import os, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
t = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read()
data = open(os.path.join(ROOT, 'data', 'zg-base.js'), encoding='utf-8').read()
pp = os.path.join(ROOT, 'data', 'portal.json')
if os.path.exists(pp):
    portal = json.dumps(json.load(open(pp, encoding='utf-8')), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    data = data.rstrip() + '\nwindow.ZG.portal=' + portal + ';\n'
guidle = open(os.path.join(HERE, 'guidle.js'), encoding='utf-8').read()
app = open(os.path.join(HERE, 'app.js'), encoding='utf-8').read()
for name, s in (('data', data), ('guidle', guidle), ('app', app)):
    assert not re.search(r'</script', s, re.I), name + ' contains </script'
out = (t.replace('<script>/*DATA*/</script>', '<script>' + data + '</script>')
        .replace('<script>/*APP*/</script>', '<script>' + guidle + '</script>\n<script>' + app + '</script>'))
cut = out.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Zug entdecken: 3D-Karte des Kantons Zug mit Gemeinden, Sehenswürdigkeiten, Orten für Familien und Veranstaltungen.">\n'
        '<meta name="theme-color" content="#006FB5">\n')
doc = head + out[:cut] + '\n</head>\n<body>' + out[cut:] + '\n</body>\n</html>\n'
open(os.path.join(ROOT, 'public', 'index.html'), 'w', encoding='utf-8').write(doc)
# test page: same document with the frame loop driven by the test (window.ZG_TEST)
open(os.path.join(ROOT, 'public', '_test.html'), 'w', encoding='utf-8').write(doc.replace('<body>', '<body><script>window.ZG_TEST=1</script>', 1))
print('index.html', os.path.getsize(os.path.join(ROOT, 'public', 'index.html')))
