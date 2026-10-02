# Fotos der Orte aus Wikimedia Commons (nur freie Lizenzen), Kandidaten werden danach manuell geprüft.
# Kontakt im User-Agent: Projektname, keine persönlichen Daten.
import json, time, re, urllib.request, urllib.parse, urllib.error, pickle, os, io, html
from PIL import Image

UA = "ZugerFamilienKarte/1.0 (nicht-kommerzielle Familienkarte Kanton Zug) python-urllib/3"
ROOT = '/home/claude/zug/'
OUT = ROOT + 'foto/'
T0 = time.time()
BUDGET = 25 * 60
EXCLUDE = {'Q228379', 'Q5104366', 'Q14507'}  # Zugerberg-Seeansicht, Chollerton, Zugersee: zeigen nicht den Ort selbst


def get(url, binary=False):
    for att in range(4):
        if time.time() - T0 > BUDGET:
            raise RuntimeError('budget')
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            time.sleep(1.0)
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            ra = e.headers.get('Retry-After')
            w = float(ra) if ra and ra.isdigit() else 10 + 10 * att
            print('  http', e.code, 'wait', w, flush=True)
            if e.code in (429, 503):
                time.sleep(min(w, 300))
                continue
            raise
    raise RuntimeError('gave up ' + url)


def toks(s):
    s = s.lower().replace('ü', 'u').replace('ö', 'o').replace('ä', 'a')
    return {t for t in re.findall(r'[a-z]{4,}', s)} - {'zuger', 'park', 'platz', 'spielplatz', 'museum', 'kanton'}


places = json.load(open(ROOT + 'out/places.json'))['places']
S = pickle.load(open(ROOT + 'fam/sites.pkl', 'rb'))['sites']
manual = {
    'Zytturm': ['Q246192'], 'Höllgrotten': ['Q1644071'], 'Museum Burg Zug': ['Q17635485', 'Q186586'],
    'Museum für Urgeschichte(n)': ['Q1299354'], 'Kunsthaus Zug': ['Q18410543'], 'Ziegelei-Museum': ['Q27479972'],
    'Wildenburg': ['Q1014600'], 'Burg Hünenberg': ['Q1012539'], 'Huwilerturm': ['Q15227217'],
    'Zugerberg Bahn': ['Q228377'], 'Villette Park': ['Q59586381'], 'Wildspitz': ['Q15227'],
    'Theater Casino Zug': ['Q1592903'], 'Bibliothek Zug': ['Q856475'], 'Kino Lux': ['Q35719100'],
    'Kino Seehof': ['Q47354392'], 'Verkehrshaus der Schweiz': ['s:Verkehrshaus der Schweiz'],
    'Natur- und Tierpark Goldau': ['s:Natur- und Tierpark Goldau'],
    'Pulverturm': ['s:Pulverturm Zug'], 'Kapuzinerturm': ['s:Kapuzinerturm Zug'], 'Knopfliturm': ['s:Knopfliturm Zug'],
    'Strandbad Zug': ['s:Strandbad Zug'], 'Lorzentobel': ['s:Lorzentobel'],
}
cand = {}
for i, p in enumerate(places):
    lst = []
    q = (S[i].get('osm', {}) if i < len(S) else {}).get('wikidata')
    if q:
        lst.append(('osm', q))
    for x in manual.get(p['n'], []):
        lst.append(('man', x))
    if lst:
        cand[i] = lst

# Suche nur mit Wortübereinstimmung aller Suchbegriffe im deutschen Label
for i, lst in cand.items():
    new = []
    for src, x in lst:
        if not x.startswith('s:'):
            new.append((src, x))
            continue
        try:
            d = get('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
                dict(action='wbsearchentities', search=x[2:], language='de', uselang='de', format='json', limit=5)))
        except Exception as e:
            print('search err', x, e, flush=True)
            continue
        need = toks(x[2:]) - {'zug'}
        hit = [s['id'] for s in d.get('search', []) if need and need <= toks(s.get('label') or '')]
        print('search', x, '->', hit[:1], [s.get('label') for s in d.get('search', [])[:5]], flush=True)
        new += [(src, h) for h in hit[:1]]
    cand[i] = [(s, q) for s, q in new if q not in EXCLUDE]

qids = sorted({q for l in cand.values() for s, q in l})
print('qids', len(qids), flush=True)
P18, LABEL = {}, {}
for k in range(0, len(qids), 40):
    d = get('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
        dict(action='wbgetentities', props='claims|labels', languages='de|en', format='json', ids='|'.join(qids[k:k + 40]))))
    for q, ent in d.get('entities', {}).items():
        c = ent.get('claims', {}).get('P18')
        if c:
            P18[q] = c[0]['mainsnak']['datavalue']['value']
        LABEL[q] = ' / '.join(v['value'] for v in ent.get('labels', {}).values())

# OSM-Verweise nur, wenn das Wikidata-Label zum Ortsnamen passt (sonst oft See/Gemeinde/Berg)
for i in list(cand):
    keep = []
    for src, q in cand[i]:
        if src == 'osm' and not (toks(places[i]['n']) & toks(LABEL.get(q, ''))):
            print('drop osm', places[i]['n'], q, LABEL.get(q), flush=True)
            continue
        keep.append((src, q))
    cand[i] = keep

files = sorted({P18[q] for l in cand.values() for s, q in l if q in P18})
print('P18 files', len(files), flush=True)
INFO = {}
for k in range(0, len(files), 20):
    d = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(
        dict(action='query', titles='|'.join('File:' + f for f in files[k:k + 20]), prop='imageinfo',
             iiprop='url|extmetadata', iiurlwidth=960, format='json')))
    norm = {n['to']: n['from'] for n in d['query'].get('normalized', [])}
    for pg in d['query']['pages'].values():
        ii = (pg.get('imageinfo') or [None])[0]
        if not ii:
            continue
        md = ii.get('extmetadata', {})

        def m(key):
            return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', ' ', md.get(key, {}).get('value') or ''))).strip()
        title = pg['title']
        INFO[norm.get(title, title)[5:]] = dict(thumb=ii.get('thumburl'), page=ii.get('descriptionurl'),
                                                lic=m('LicenseShortName'), licurl=m('LicenseUrl'),
                                                artist=m('Artist')[:240], credit=m('Credit')[:240],
                                                desc=m('ImageDescription')[:300])
print('info', len(INFO), flush=True)

OK = re.compile(r'^(CC0|CC BY|CC-BY|Public domain|PD)', re.I)
res = json.load(open(OUT + 'candidates.json')) if os.path.exists(OUT + 'candidates.json') else {}
for i, lst in cand.items():
    if str(i) in res:
        continue
    for src, q in lst:
        f = P18.get(q)
        inf = INFO.get(f) or INFO.get((f or '').replace('_', ' ')) if f else None
        if not inf or not inf['thumb'] or not OK.search(inf['lic']):
            continue
        fn = re.sub(r'[^A-Za-z0-9]+', '_', q) + '.webp'
        if not os.path.exists(OUT + fn):
            try:
                raw = get(inf['thumb'], binary=True)
            except Exception as e:
                print('thumb err', places[i]['n'], e, flush=True)
                continue
            im = Image.open(io.BytesIO(raw)).convert('RGB')
            w, h = im.size
            if w > 900:
                im = im.resize((900, round(h * 900 / w)), Image.LANCZOS)
                w, h = im.size
            if h > w * 0.75:
                top = int((h - w * 0.75) / 2)
                im = im.crop((0, top, w, top + int(w * 0.75)))
            im.save(OUT + fn, 'WEBP', quality=72, method=6)
        res[str(i)] = dict(name=places[i]['n'], qid=q, label=LABEL.get(q), src=src, file=f, f='foto/' + fn, **inf)
        json.dump(res, open(OUT + 'candidates.json', 'w'), ensure_ascii=False, indent=1)
        print('ok', places[i]['n'], '<-', f, '|', inf['lic'], '|', inf['artist'][:60], flush=True)
        break
print('DONE', len(res), flush=True)
