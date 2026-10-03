"""Schreibt public/rail.json (Gleisachsen und Bahnhöfe für die Karte) aus tracks.json.

tracks.json entsteht mit fetch_tlm2.py und build_tracks.py aus swissTLM3D Eisenbahn
(geo.admin.ch, Layer ch.swisstopo.swisstlm3d-eisenbahnnetz, © swisstopo) und den Dienststellen von SBB/opentransportdata.swiss.
Aufruf: python3 pipeline/rail/make_rail_json.py <tracks.json>
Format: Koordinaten in Dezimetern relativ zu E0/N0, je Linie [x0, y0, dx1, dy1, ...]."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
E0, N0 = 2666000, 1207000
BOX = (2664000, 2702000, 1205000, 1241000)
t = json.load(open(sys.argv[1], encoding='utf-8'))
lines = []
for l in t['lines']:
    c = l['coords']
    if not any(BOX[0] <= x <= BOX[1] and BOX[2] <= y <= BOX[3] for x, y in c):
        continue
    out, px, py = [], None, None
    for x, y in c:
        qx, qy = round((x - E0) * 10), round((y - N0) * 10)
        if px is None: out += [qx, qy]
        else: out += [qx - px, qy - py]
        px, py = qx, qy
    lines.append(out)
st = [dict(n=s['name'], u=s['uic'], E=round(s['E'], 1), N=round(s['N'], 1)) for s in t['stations']
      if BOX[0] <= s['E'] <= BOX[1] and BOX[2] <= s['N'] <= BOX[3] and s.get('mode', 'train') == 'train']
doc = dict(src='swissTLM3D Eisenbahn, © swisstopo; Haltestellen: Dienststellen SBB/opentransportdata.swiss', E0=E0, N0=N0, lines=lines, st=st)
json.dump(doc, open(os.path.join(ROOT, 'public', 'rail.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('Linien', len(lines), 'Punkte', sum(len(l) // 2 for l in lines), 'Stationen', len(st), 'Bytes', os.path.getsize(os.path.join(ROOT, 'public', 'rail.json')))
