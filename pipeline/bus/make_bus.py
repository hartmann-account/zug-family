"""Schreibt public/bus.json: Fahrwege der Buslinien im Kanton Zug für die Karte.

Quelle: OpenStreetMap route=bus (© OpenStreetMap-Mitwirkende, ODbL), Abfrage q_bus.overpassql auf overpass.osm.ch
(Ausgabe «out body geom»). Jede Strasse (OSM way) wird einmal gespeichert und nach Douglas-Peucker (1 m) vereinfacht;
eine Linie ist die Folge ihrer Strassenstücke mit Richtung. Halte werden nicht übernommen: Die Karte projiziert die
Koordinaten der Fahrplanhalte (search.ch) auf den Fahrweg.
Aufruf: python3 pipeline/bus/make_bus.py <osm_bus.json>"""
import json, math, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
E0, N0 = 2666000, 1207000
BOX = (2664000, 2702000, 1205000, 1241000)
OPS = {'ZVB': None, 'PAG': {'73', '110', 'N73'}, 'PAZ': {'280'}}  # None: alle Linien des Betreibers

def lv95(lat, lon):  # Näherungsformeln swisstopo, rund 1 m genau
    p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
    N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
    return E, N

def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
    i, dm = 0, -1
    for k in range(1, len(pts) - 1):
        d = abs((pts[k][0] - a[0]) * dy - (pts[k][1] - a[1]) * dx) / L
        if d > dm: i, dm = k, d
    if dm <= tol: return [a, b]
    return dp(pts[:i + 1], tol)[:-1] + dp(pts[i:], tol)

d = json.load(open(sys.argv[1], encoding='utf-8'))
geo, keep, plan = {}, {}, []  # Weg-Geometrie, zu erhaltende Knoten, Linien als (Weg, Index rein, Index raus)
def nearest(g, p):
    best, bi = 1e18, 0
    for k, q in enumerate(g):
        dd = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
        if dd < best: best, bi = dd, k
    return bi, math.sqrt(best)
for r in d['elements']:
    if r['type'] != 'relation': continue
    t = r['tags']; op = t.get('operator') or t.get('network'); ref = t.get('ref')
    if op not in OPS or not ref or (OPS[op] is not None and ref not in OPS[op]): continue
    segs = [(m['ref'], [lv95(g['lat'], g['lon']) for g in m['geometry']]) for m in r['members']
            if m['type'] == 'way' and m.get('role', '') in ('', 'forward', 'backward') and m.get('geometry')]
    if not segs or not any(BOX[0] <= e <= BOX[1] and BOX[2] <= n <= BOX[3] for _, g in segs for e, n in g): continue
    seq, prev = [], None
    for k, (oid, g) in enumerate(segs):
        geo[oid] = g; n = len(g) - 1
        # Ausgang: Knoten, den dieser Weg mit dem nächsten teilt (bei Kreiseln irgendwo im Ring)
        if k + 1 < len(segs):
            nx = segs[k + 1][1]; cand = [(nearest(g, nx[0]), 0), (nearest(g, nx[-1]), 1)]
            (iout, dout), _ = min(cand, key=lambda c: c[0][1])
            if dout > 1.0: iout = None
        else: iout = None
        if prev is not None:
            iin, din = nearest(g, prev)
            if din > 1.0: iin = None
        else: iin = None
        if iin is None and iout is None: iin, iout = 0, n
        elif iin is None: iin = n if iout == 0 else 0 if iout == n else (0 if iout > n / 2 else n)
        elif iout is None: iout = n if iin == 0 else 0 if iin == n else (n if iin < n / 2 else 0)
        seq.append((oid, iin, iout)); keep.setdefault(oid, set()).update((0, n, iin, iout))
        prev = g[iout]
    plan.append((ref, op, t.get('to', ''), seq))

ways, wid, imap = [], {}, {}
for oid, g in geo.items():
    if oid not in keep: continue
    ks = sorted(keep[oid]); out, m = [], {}
    for a, b in zip(ks, ks[1:]):
        part = dp(g[a:b + 1], 1.0)
        if out: part = part[1:]
        m[a] = len(out) if not out else m.get(a, len(out) - 1)
        out += part; m[b] = len(out) - 1
    if len(ks) == 1: out, m = [g[0]], {0: 0}
    wid[oid] = len(ways); imap[oid] = m; ways.append(out)
routes = [dict(l=ref, o=op, t=to, w=[x for oid, a, b in seq for x in (wid[oid], imap[oid][a], imap[oid][b])]) for ref, op, to, seq in plan]

def enc(pts):
    o, px, py = [], None, None
    for x, y in pts:
        qx, qy = round((x - E0) * 10), round((y - N0) * 10)
        o += [qx, qy] if px is None else [qx - px, qy - py]; px, py = qx, qy
    return o
doc = dict(src='Fahrwege: © OpenStreetMap-Mitwirkende, ODbL', E0=E0, N0=N0, ways=[enc(w) for w in ways], routes=routes)
out = os.path.join(ROOT, 'public', 'bus.json')
json.dump(doc, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('Linienvarianten', len(routes), 'Strassenstücke', len(ways), 'Punkte', sum(len(w) for w in ways), 'Bytes', os.path.getsize(out))
