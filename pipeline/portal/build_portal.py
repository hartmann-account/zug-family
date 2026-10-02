"""Erzeugt data/portal.json (Sehenswürdigkeiten, Gemeinden, zusätzliche Familienorte) aus den geprüften
Recherche-Dateien und kopiert die Fotos nach public/foto/s/.

Aufruf:  python3 pipeline/portal/build_portal.py <recherche-ordner>
Erwartet im Ordner: attractions.json, gemeinden.json, optional family.json, zt_toplevel_pois.json (Seiten von
zug-tourismus.ch mit Koordinaten) und places_existing.json (Orte der Karte mit Index).
Danach: python3 src/build.py
"""
import json, os, re, shutil, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out', 'research')
SIGHT_CATS = ['Altstadt & Stadtbild', 'Kirche & Kloster', 'Burg & Schloss', 'Museum & Kunst', 'Aussicht & Berg',
              'See & Wasser', 'Natur & Landschaft', 'Denkmal & Geschichte', 'Bahn & Schiff']
FAM_CATS = ['Spielplätze', 'Baden', 'Feuer & Picknick', 'Ausflug & Natur', 'Kultur & Lernen', 'Sport & Spass']
GEMS = ['Baar', 'Cham', 'Hünenberg', 'Menzingen', 'Neuheim', 'Oberägeri', 'Risch', 'Steinhausen', 'Unterägeri', 'Walchwil', 'Zug']
BOX = (2666000, 2700000, 1207000, 1239000)


def load(name, alt=None):
    for n in (name, alt):
        if n and os.path.exists(os.path.join(SRC, n)):
            return json.load(open(os.path.join(SRC, n), encoding='utf-8'))
    return None


def slug(s):
    s = s.lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue')
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def url(u):
    return u if isinstance(u, str) and re.match(r'^https?://', u) else ''


def osm_ref(o):
    if not o:
        return ''
    o = str(o)
    m = re.match(r'^(node|way|relation)[/:]?(\d+)$', o)
    if m:
        return m.group(1)[0] + m.group(2)
    return o if re.match(r'^[nwr]\d+$', o) else ''


def cat_index(c, cats):
    if isinstance(c, int):
        return c if 0 <= c < len(cats) else None
    c = (c or '').strip()
    return cats.index(c) if c in cats else None


def in_box(E, N):
    return BOX[0] <= E <= BOX[1] and BOX[2] <= N <= BOX[3]


fotodir = os.path.join(ROOT, 'public', 'foto', 's')
os.makedirs(fotodir, exist_ok=True)
problems = []

# ---------------- Sehenswürdigkeiten
sights, seen = [], set()
for a in load('attractions.json', 'attractions2.json') or []:
    name = (a.get('name') or '').strip()
    E, N = a.get('E'), a.get('N')
    c = cat_index(a.get('category'), SIGHT_CATS)
    if not name or E is None or N is None or c is None:
        problems.append('Sehenswürdigkeit ohne Name/Koordinaten/Kategorie: %r' % name)
        continue
    E, N = int(round(E)), int(round(N))
    if not in_box(E, N):
        problems.append('ausserhalb des Kartenausschnitts: ' + name)
        continue
    sid = slug(a.get('id') or name)
    while sid in seen:
        sid += '-2'
    seen.add(sid)
    gem = a.get('gemeinde') or ''
    s = dict(id=sid, n=name, g=gem if gem in GEMS else 'ausserhalb', c=c, E=E, N=N)
    if gem not in GEMS:
        s['town'] = a.get('town') or (gem if gem and gem != 'ausserhalb' else '')
    if a.get('z'):
        s['z'] = int(round(a['z']))
    if a.get('text'):
        s['t'] = a['text'].strip()
    facts = [f.strip() for f in (a.get('facts') or []) if isinstance(f, str) and f.strip()]
    if facts:
        s['f'] = facts[:6]
    for k_src, k in (('zt_url', 'zt'), ('website', 'web')):
        if url(a.get(k_src)):
            s[k] = a[k_src]
    if a.get('wikidata') and re.match(r'^Q\d+$', str(a['wikidata'])):
        s['wd'] = a['wikidata']
    if osm_ref(a.get('osm')):
        s['osm'] = osm_ref(a.get('osm'))
    if a.get('highlight'):
        s['big'] = 1
    im = a.get('image') or None
    if im and im.get('local'):
        local = im['local'] if os.path.isabs(im['local']) else os.path.join(SRC, im['local'])
        if os.path.exists(local) and im.get('author') and im.get('license'):
            dst = os.path.join(fotodir, sid + '.webp')
            shutil.copyfile(local, dst)
            s['ph'] = dict(f='foto/s/' + sid + '.webp', a=im['author'], l=im['license'], u=url(im.get('page_url')),
                           lu=url(im.get('license_url')), w=im.get('caption') or im.get('what') or name)
        else:
            problems.append('Bild ohne Datei oder Nachweis: ' + name)
    sights.append(s)

# ---------------- Gemeinden
gem_out, kanton = [], {}
G = load('gemeinden.json', 'gemeinden2.json') or {}
for g in G.get('gemeinden', []):
    if g.get('name') not in GEMS:
        continue
    srcs = []
    for k, label in (('population_src', 'Einwohner'), ('area_src', 'Fläche'), ('elevation_src', 'Höhe')):
        if url(g.get(k)):
            srcs.append(dict(t=label, u=g[k]))
    out = dict(name=g['name'])
    if g.get('population'):
        out['pop'] = int(g['population'])
        out['popDate'] = g.get('population_date') or ''
    if g.get('area_km2'):
        out['area'] = float(g['area_km2'])
    if g.get('elevation_m'):
        out['elev'] = int(round(float(g['elevation_m'])))
    if g.get('ortsteile'):
        out['ortsteile'] = [o for o in g['ortsteile'] if isinstance(o, str)][:10]
    for k_src, k in (('website', 'web'), ('zt_url', 'zt')):
        if url(g.get(k_src)):
            out[k] = g[k_src]
    if g.get('portrait'):
        out['text'] = g['portrait'].strip()
    if srcs:
        out['sources'] = srcs
    gem_out.append(out)
k = G.get('kanton') or {}
if k.get('population'):
    kanton['pop'] = int(k['population'])
    kanton['popDate'] = k.get('population_date') or ''
if k.get('area_km2'):
    kanton['area'] = float(k['area_km2'])

# ---------------- zusätzliche Familienorte (noch nicht in der OSM-Liste)
fam_extra = []
FAM = load('family.json', 'family2.json') or {}
KIDS = re.compile(r'kind|famil|spiel|tier|ziege|hühner|kaninchen|esel|pony|streichel', re.I)
for f in FAM.get('new_candidates', []):
    name = (f.get('name') or '').strip()
    c = cat_index(f.get('category') or f.get('cat'), FAM_CATS)
    # Hofläden nur, wenn die Beschreibung etwas für Kinder nennt (Tiere, Spielplatz)
    if re.search(r'hofl', name + ' ' + (f.get('kind') or ''), re.I) and not KIDS.search(f.get('description') or ''):
        problems.append('Hofladen ohne Angebot für Kinder ausgelassen: ' + name)
        continue
    E, N = f.get('E'), f.get('N')
    if not name or c is None or E is None or N is None or not in_box(E, N):
        problems.append('Familienort unvollständig: %r' % name)
        continue
    x = dict(n=re.sub(r'\s+-\s+[^-]+$', '', name) if re.match(r'(?i)spielplatz', name) else name,
             k=f.get('kind') or f.get('type') or FAM_CATS[c], c=c, g=f.get('gemeinde') or '', E=int(round(E)), N=int(round(N)))
    if f.get('description'):
        x['x'] = f['description'].strip()
    links = [l for l in (f.get('zt') or []) if isinstance(l, list) and len(l) == 2 and url(l[1])]
    if not links and url(f.get('zt_url')):
        links = [[name, f['zt_url']]]
    if links:
        x['t'] = links
    if f.get('season'):
        x['x'] = (x.get('x', '') + ' ' + f['season'].strip()).strip()
    if osm_ref(f.get('osm')):
        x['osm'] = osm_ref(f.get('osm'))
    fam_extra.append(x)

# ---------------- Spielplatzseiten von Zug Tourismus: Link (und Name) an die Spielplätze der Karte hängen
# zt_toplevel_pois.json: Seiten von zug-tourismus.ch mit Koordinaten; places_existing.json: Orte der Karte (Index i)
fam_links = {}
ZTP = load('zt_toplevel_pois.json') or []
PLACES = load('places_existing.json') or []


def toks(t):
    t = t.lower().replace('ä', 'a').replace('ö', 'o').replace('ü', 'u')
    return set(re.findall(r'[a-z]{4,}', t)) - {'spielplatz', 'park', 'zug', 'cham', 'baar'}


def add_link(i, title, link, name):
    e = fam_links.setdefault(i, dict(i=i, t=[]))
    if link not in [x[1] for x in e['t']]:
        e['t'].append([title, link])
    if name and not PLACES[i]['name'] and 'n' not in e:
        e['n'] = name


for z in ([] if FAM.get('zt_offers') else ZTP):
    if 'spielplatz' not in z.get('url', '') and 'Spielplatz' not in (z.get('zt_category') or []):
        continue
    if not z.get('E') or not url(z.get('url')):
        continue
    title = z['title'].strip()
    short = re.sub(r'\s+-\s+[^-]+$', '', title)
    best = None
    for p in PLACES:
        if p['cat'] != 'Spielplätze':
            continue
        d = ((p['E'] - z['E']) ** 2 + (p['N'] - z['N']) ** 2) ** 0.5
        if best is None or d < best[0]:
            best = (d, p)
    d, p = best
    if d <= 80 or (d <= 150 and toks(title) & toks(p['name'] or '')):
        add_link(p['i'], short, z['url'], short)
    elif z.get('gemeinde') in GEMS:
        fam_extra.append(dict(n=short, k='Spielplatz', c=0, g=z['gemeinde'], E=int(z['E']), N=int(z['N']), t=[[short, z['url']]]))
for o in FAM.get('zt_offers', []):
    i = o.get('match_index', o.get('i'))
    if isinstance(i, int) and 0 <= i < len(PLACES) and url(o.get('zt_url')):
        nm = (o.get('name') or '').strip()
        short = re.sub(r'\s+-\s+[^-]+$', '', nm)
        add_link(i, short or PLACES[i]['name'], o['zt_url'], short if re.match(r'(?i)(spielplatz|abenteuer|erlebnis)', short) else None)

portal = dict(sightCats=SIGHT_CATS, sights=sights, gem=gem_out, kanton=kanton, famExtra=fam_extra, famLinks=list(fam_links.values()))
json.dump(portal, open(os.path.join(ROOT, 'data', 'portal.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('Sehenswürdigkeiten', len(sights), 'mit Foto', sum(1 for s in sights if 'ph' in s))
print('Gemeinden', len(gem_out), 'Kanton', kanton)
print('zusätzliche Familienorte', len(fam_extra), 'Links an bestehende Orte', len(fam_links))
for p in problems:
    print('  !', p)
