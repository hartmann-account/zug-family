"""Ergänzt public/rail.json um die Kursschiff-Wege und Liegeplätze auf dem Zugersee.

Wege: OpenStreetMap route=ferry (ferry_osm.json, © OpenStreetMap-Mitwirkende, ODbL), schematisch, keine GPS-Spuren.
Liegeplätze: Ab der Haltestelle (BAV/DiDok) entlang der Ausfahrt so weit hinaus, bis das Schiff vollständig im Wasser
liegt (Uferlinie aus public/index.html), Bug parallel zum Ufer. Zug Bahnhofsteg ist nach den Pollern im Luftbild gesetzt.
Aufruf nach make_rail_json.py: python3 pipeline/rail/make_ferry.py"""
import json, math, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.dirname(os.path.abspath(__file__))
STOPS = {8502251: (2681477.0, 1224906.0), 8502250: (2677684.0, 1225808.0), 8502252: (2681013.0, 1222555.0),
         8502253: (2677362.0, 1221752.0), 8502254: (2678091.0, 1220828.0), 8502258: (2681520.0, 1217077.0),
         8502257: (2677852.0, 1216678.0), 8505060: (2682320.0, 1213200.0)}
FIXED = {8502251: (2681471.4, 1224896.7, 74.5)}  # Poller am Bahnhofsteg, Schiff seeseitig
LEN, BEAM = 46.0, 9.4

s = open(os.path.join(ROOT, 'public', 'index.html'), encoding='utf-8').read()
i = s.index('window.ZG=') + len('window.ZG=')
ZG, _ = json.JSONDecoder().raw_decode(s[i:])
G = ZG['grid']
rings = [[(r[k] + G['E0'], r[k + 1] + G['N0']) for k in range(0, len(r), 2)] for r in ZG['lines']['shore']]

def inside(x, y):  # even-odd wie die Lake-Maske
    c = False
    for r in rings:
        n = len(r)
        for k in range(n):
            x1, y1 = r[k]; x2, y2 = r[(k + 1) % n]
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c

def wet(cx, cy, az):  # Rumpf-Rechteck vollständig im Wasser (Raster 3 m)
    sa, ca = math.sin(az), math.cos(az)
    for a in range(-int(LEN / 2), int(LEN / 2) + 1, 3):
        for b in (-BEAM / 2 - 1.5, 0, BEAM / 2 + 1.5):
            if not inside(cx + a * sa + b * ca, cy + a * ca - b * sa): return False
    return True

def nearest(uic, c):
    E, N = STOPS[uic]
    return 0 if math.hypot(c[0][0] - E, c[0][1] - N) < math.hypot(c[-1][0] - E, c[-1][1] - N) else -1

ro = json.load(open(os.path.join(HERE, 'ferry_osm.json'), encoding='utf-8'))
def uic_at(p):
    return min(STOPS, key=lambda u: math.hypot(STOPS[u][0] - p[0], STOPS[u][1] - p[1]))

routes = []
for r in ro['routes']:
    c = r['coords']; a, b = uic_at(c[0]), uic_at(c[-1])
    if a == b: continue
    if math.hypot(c[0][0] - STOPS[a][0], c[0][1] - STOPS[a][1]) > 300 or math.hypot(c[-1][0] - STOPS[b][0], c[-1][1] - STOPS[b][1]) > 300: continue
    routes.append((a, b, c))

# Ausfahrtsrichtung je Haltestelle: Mittel der ersten 120 m aller Wege
out = {}
for a, b, c in routes:
    for u, pts in ((a, c), (b, c[::-1])):
        E, N = STOPS[u]
        for p in pts[1:]:
            d = math.hypot(p[0] - E, p[1] - N)
            if d > 120:
                v = out.setdefault(u, [0, 0]); v[0] += (p[0] - E) / d; v[1] += (p[1] - N) / d; break

berth = {}
for u, (E, N) in STOPS.items():
    if u in FIXED: berth[u] = FIXED[u]; continue
    vx, vy = out[u]; L = math.hypot(vx, vy); vx /= L; vy /= L
    az = math.atan2(vy, -vx)  # parallel zum Ufer, quer zur Ausfahrt; Bug (sin, cos) = (vy, -vx)
    best = None
    for k in range(0, 400):
        t = k * 1.0
        cx, cy = E + vx * t, N + vy * t
        for da in (0, 8, -8, 16, -16):
            a2 = az + math.radians(da)
            if wet(cx, cy, a2): best = (cx, cy, a2); break
        if best: break
    if not best: raise SystemExit('kein Liegeplatz für %d' % u)
    berth[u] = (round(best[0] + vx * 2, 1), round(best[1] + vy * 2, 1), round(math.degrees(best[2]) % 360, 1))
    print(u, 'Abstand', round(math.hypot(best[0] - E, best[1] - N)), 'm', berth[u])

def enc(pts):
    o, px, py = [], None, None
    for x, y in pts:
        qx, qy = round((x - 2666000) * 10), round((y - 1207000) * 10)
        o += [qx, qy] if px is None else [qx - px, qy - py]; px, py = qx, qy
    return o

ferry = []
for a, b, c in routes:
    A, B = berth[a], berth[b]
    mid = [p for p in c if math.hypot(p[0] - A[0], p[1] - A[1]) > 90 and math.hypot(p[0] - B[0], p[1] - B[1]) > 90]
    ferry.append(dict(a=str(a), b=str(b), c=enc([(A[0], A[1])] + [tuple(p) for p in mid] + [(B[0], B[1])])))
path = os.path.join(ROOT, 'public', 'rail.json')
doc = json.load(open(path, encoding='utf-8'))
doc['ferry'] = ferry
doc['berth'] = {str(u): list(v) for u, v in berth.items()}
doc['src'] = doc['src'].split('; Schiffswege')[0] + '; Schiffswege: © OpenStreetMap-Mitwirkende, ODbL'
json.dump(doc, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('Wege', len(ferry), 'Bytes', os.path.getsize(path))
