# Übernimmt nur manuell geprüfte Kandidaten (Bild zeigt den Ort selbst) nach foto/photos.json.
import json, re, os
OUT = '/home/claude/zug/foto/'
APPROVED = {
    'Q1014600': 'Burgruine Wildenburg',
    'Q1644071': 'Tropfsteine in den Höllgrotten',
    'Q1012539': 'Burgruine Hünenberg',
    'Q228377': 'Wagen der Zugerbergbahn',
    'Q246192': 'Zytturm, Ostseite',
    'Q59586381': 'Bäume im Villette-Park',
    'Q856475': 'Gebäude der Bibliothek an der St.-Oswalds-Gasse 21',
    'Q1299354': 'Keramikfunde der späten Bronzezeit in der Ausstellung',
    'Q17635485': 'Rüstung im Mittelalterraum des Museums',
    'Q18410543': 'Gebäude des Kunsthauses',
    'Q1592903': 'Theater Casino, 2023',
    'Q670595': 'Flugzeug vor dem Verkehrshaus in Luzern',
    'Q1320084': 'Eingang des Tierparks',
}
AUTHOR_FIX = {'Q228377': 'Roland Zumbühl (Picswiss)'}


def author(c):
    a = c.get('artist') or ''
    m = re.search(r'No machine-readable author provided\.\s*(.+?)\s+assumed', a)
    if m:
        a = m.group(1)
    a = re.sub(r'\s*\(talk\)|\s*\(Diskussion\)', '', a).strip(' .')
    return AUTHOR_FIX.get(c['qid'], a or 'unbekannt')


cand = json.load(open(OUT + 'candidates.json'))
res = {}
for i, c in cand.items():
    if c['qid'] not in APPROVED or not os.path.exists('/home/claude/zug/' + c['f']):
        continue
    res[i] = dict(f=c['f'], a=author(c), l=c['lic'], u=c['page'], lu=c.get('licurl', ''), what=APPROVED[c['qid']],
                  file=c['file'], qid=c['qid'], name=c['name'])
json.dump(res, open(OUT + 'photos.json', 'w'), ensure_ascii=False, indent=1)
for i, v in res.items():
    print(i, v['name'], '|', v['a'], '|', v['l'], '|', v['lu'])
print(len(res), 'photos')
