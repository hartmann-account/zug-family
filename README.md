# zug-family

„Zug entdecken“: Portal für den Kanton Zug auf einer dreidimensionalen Karte, ausgeliefert über Cloudflare Workers (statische Seite plus zwei kleine Endpunkte für Veranstaltungen).

Die Startseite zeigt das Relief des ganzen Kantons und vier Einstiege:

- **Gemeinden**: die elf Gemeinden mit Einwohnerzahl, Fläche, Höhenlage, Kurzporträt und den Sehenswürdigkeiten, Familienorten und Veranstaltungen der Gemeinde.
- **Sehenswürdigkeiten**: nach Gemeinde gruppiert und nach Kategorie filterbar. Der Gemeindefilter fliegt die Karte zur Gemeinde, ein Klick auf einen Ort zoomt hinein, mit Luftbild, Foto und Sonnenstand für Uhrzeit und Datum.
- **Für Familien**: Spielplätze, Badis, Feuerstellen, Ausflugsziele, Kultur und Sport. Für jeden Spielplatz ist der Schattenanteil am 21. Juli berechnet; ein Filter zeigt nur Orte mit höchstens so viel Sonne (zur gewählten Uhrzeit oder im Tagesmittel 10–17 Uhr). Dazu UV-Index, Trinkbrunnen, WCs, die Lufttemperatur in der Nähe und an Badestellen am See die Wassertemperatur (Modellwert).
- **Events**: Veranstaltungen live aus dem Veranstaltungskalender von Zug Tourismus (Guidle), mit Bild, Terminen, Ort auf der Karte und Filtern nach Zeitraum, Gemeinde und Kategorie.

Auf der Karte lassen sich zuschalten: freie Plätze in den Parkhäusern (Parkleitsystem Zug, jede Minute) und die Lufttemperatur jetzt (rund 280 Sensoren der Stadt Zug und Stationen von MeteoSchweiz, als Werte und als Wärmefläche über der Stadt). In der Nahansicht kommen die Luftbilder live von swisstopo (SWISSIMAGE bis 10 cm), der See zeigt Uferlinie, Wellen, Spiegelung und Sonnenglanz.

Dazu ein Rundflug über den Kanton in sechs Stationen. Jede Ansicht hat eine eigene Adresse (`#/sehenswuerdigkeiten?g=cham`, `#/gemeinden/baar`, `#/events/<id>`), Zurück im Browser funktioniert.

Bedienung der Karte: Ziehen verschiebt, rechte Maustaste oder Shift/Ctrl plus Ziehen dreht und neigt, Mausrad zoomt zum Mauszeiger. Auf dem Handy verschiebt ein Finger, zwei Finger zoomen, drehen und neigen. Tastatur auf der Karte: Pfeiltasten, `+`/`-`, `Q`/`E`, Bild auf/ab.

## Lokal starten und deployen

```sh
npm install
npm run dev      # Worker und Seite lokal unter http://localhost:8787
npm run deploy   # nach Cloudflare deployen (ein Push auf main deployt über Workers Builds)
```

Ohne Node genügt `python3 -m http.server 8000` im Ordner `public/`. Dann fehlt `/api/events`, und die Seite liest die Veranstaltungen direkt bei Guidle. Beim Öffnen über `file://` fehlen Luftbilder, Fotos und Veranstaltungen. Das Relief braucht WebGL 2.

## Veranstaltungen live

Der Kalender von Zug Tourismus ist eine eingebettete Guidle-Microsite (`mr_AKHbXU`). Deren JSON-Schnittstelle (`microsite.guidle.com/api/rest/2.0/portals/...`) liefert alle Angebote mit Titel, Kategorie, Ort, Koordinaten, Bild und Terminen; sie sendet `Access-Control-Allow-Origin: *`.

- `src/guidle.js` liest die Angebote (elf Seiten nach Ort gruppiert, dazu die Liste nach Datum für die nächsten fünf Wochen), bildet Termine, ordnet Ortsteile den Gemeinden zu und rechnet WGS84 in LV95 um. Dieselbe Datei läuft im Worker und im Browser.
- `worker/index.js` stellt `/api/events` (alle Veranstaltungen, eine Stunde zwischengespeichert) und `/api/event?id=` (Beschreibung, Adresse, Preis, alle Termine aus dem iCalendar-Export von Guidle) bereit. Alles andere liefert der Worker aus `public/`.
- Bilder werden nicht kopiert, sondern in passender Grösse von Guidles Bildserver (ImageKit) geladen.
- Detail-Links führen in den Kalender von Zug Tourismus (`/de/event-calendar/?eventId=…`).

Die Schnittstelle ist nicht öffentlich dokumentiert und kann sich ändern. Stabil wäre ein offizieller Guidle-Export, den Zug Tourismus als Datenbesitzerin freischalten kann.

## Weitere Live-Daten

| Endpunkt | Quelle | Zwischenspeicher |
|---|---|---|
| `/api/parking` | Parkleitsystem Zug (`pls-zug.ch/?json=true`), freie Plätze, Preise, Koordinaten | 60 s |
| `/api/temp` | Lufttemperaturen Stadt Zug (opendata.swiss, akenza-Schnittstelle mit dem öffentlich publizierten Schlüssel in `wrangler.jsonc`) und MeteoSchweiz-Messwerte (10 min, GeoJSON in LV95) | 10 min |
| `/api/lake` | Alplakes (Eawag), Oberflächentemperatur aus dem Seemodell für Zugersee und Ägerisee | 3 h |

Die Wärmefläche verbindet die Sensorwerte nach Entfernung und endet rund 350 m vom nächsten Sensor. Sie ist keine flächendeckende Messung. Die Hitzekarte der kantonalen Klimaanalyse (ZugMap) wäre die bessere Grundlage, war aber von ausserhalb der Schweiz nicht abrufbar.

## Strandbad Zug 2026

`src/strandbad.js` beschreibt das im Mai 2026 eröffnete erweiterte Strandbad, weil SWISSIMAGE dort noch die Baustelle von 2025 zeigt und die Neubauten in den swisstopo-Gebäudedaten fehlen. Lage der Bauten nach OpenStreetMap (way 1502798337/1502798338) und Gebäuderegister; Form, Liegewiese, Sandbucht, Decks und Steine sind nach öffentlichen Angaben abgeschätzt. Das Modul malt den Boden in das Luftbild, `app.js` baut daraus die 3D-Teile. Sobald swisstopo neue Luftbilder und Gebäude liefert, kann das Modul entfallen.

## Inhalt

| Pfad | Inhalt |
|---|---|
| `public/index.html` | gebaute Seite, eine Datei mit Daten und Code; lädt three.js 0.160.1 von cdnjs und Schriften von Google Fonts |
| `public/o/la/`, `public/o/lb/` | Luftbildkacheln aus SWISSIMAGE, 2 m und 0,5 m Auflösung, WebP |
| `public/foto/`, `public/foto/s/` | Fotos von Wikimedia Commons (Familienorte, Sehenswürdigkeiten); Urheber, Lizenz und Quelle in der Detailansicht |
| `src/template.html`, `src/app.js`, `src/guidle.js`, `src/strandbad.js` | Vorlage, Anwendung, Veranstaltungs-Modul, Strandbad 2026 |
| `src/build.py` | baut `public/index.html` aus Vorlage, `data/zg-base.js`, `data/portal.json`, `data/curated.json` und den Skripten |
| `data/zg-base.js` | Geodaten der Seite: Höhenmodell, Relief, Gemeindemaske, Gebäude, Bäume, Linien, Familienorte mit Schattenwerten |
| `data/portal.json` | Sehenswürdigkeiten, Gemeindezahlen, Links und zusätzliche Familienorte (aus `pipeline/portal/build_portal.py`) |
| `data/curated.json` | von Hand gepflegte Ergänzungen mit Quellen, z. B. Regierungsgebäude, Hinweise zum Strandbad |
| `worker/index.js` | Cloudflare Worker mit `/api/events`, `/api/event`, `/api/parking`, `/api/temp`, `/api/lake` |
| `pipeline/` | Python-Skripte für Datenbezug, Schattenberechnung und Kodierung; `pipeline/osm/` enthält die Overpass-Abfragen; `pipeline/portal/build_portal.py` schreibt `data/portal.json` |
| `wrangler.jsonc`, `package.json` | Konfiguration für Cloudflare Workers |

## Neu bauen

1. Geodaten beziehen und vorverarbeiten (`pipeline/`). Die Skripte enthalten feste Pfade aus der Entstehungsumgebung (`/home/claude/zug/`) und müssen vor einer Wiederverwendung angepasst werden. Benötigt werden numpy, scipy, rasterio, affine, pyproj, shapely, Pillow, mercantile und mapbox-vector-tile. Das Ergebnis liegt als `data/zg-base.js` im Repository.
2. Portaldaten: `python3 pipeline/portal/build_portal.py <ordner>` liest die geprüften Recherche-Dateien und schreibt `data/portal.json`, Fotos nach `public/foto/s/`.
3. `python3 src/build.py` schreibt `public/index.html`.

## Methode

Schatten: Vegetations- und Gebäudehöhen ergeben sich aus swissSURFACE3D minus swissALTI3D (gelesen mit 1 m). Ein Punkt der Spielplatzfläche gilt als beschattet, wenn ein Strahl ab 1 m über Gelände, also etwa auf Kopfhöhe eines Kindes, in Richtung Sonne innerhalb von 95 m auf ein Hindernis trifft oder das Gelände im Umkreis von 8 km die Sonne verdeckt. Der Sonnenstand folgt dem NOAA-Verfahren, für die Schattenwerte am 21. Juli 2026. In der Nahansicht rechnet die Karte die Schatten für das gewählte Datum (21. Juli, heute, 21. Dezember) und die Uhrzeit direkt.

UV-Index: Näherung aus Sonnenhöhe und Meereshöhe für wolkenlosen Himmel. Sie ersetzt keine Prognose von MeteoSchweiz.

Bäume: lokale Maxima des Vegetationshöhenmodells, eingefärbt aus dem Luftbild.

Grenzen: Die Vollständigkeit der OpenStreetMap-Daten ist nicht garantiert. Die Luftbilder stammen teils aus Befliegungen im Frühjahr; Laubbäume erscheinen dort kahl und werden in der 3D-Ansicht sommerlich eingefärbt.

## Daten und Rechte

- Bundesamt für Landestopografie swisstopo: swissALTI3D, swissSURFACE3D, SWISSIMAGE, swissBOUNDARIES3D, Basiskarte Vektor. Es gelten die Nutzungsbedingungen von swisstopo für kostenlose Geodaten.
- © OpenStreetMap-Mitwirkende, Open Database License (ODbL) 1.0. Die abgeleitete Ortsdatenbank in `public/index.html` steht ebenfalls unter der ODbL.
- Fotos von Wikimedia Commons unter der jeweils angegebenen Lizenz, für die Karte zugeschnitten und verkleinert.
- Zug Tourismus: Die AGB (Ziffer V) erlauben die Übernahme von Texten und Bildern der Website nur mit schriftlicher Zustimmung. Von zug-tourismus.ch sind deshalb nur Fakten (Name, Ort, Koordinaten) übernommen und die Seiten verlinkt.
- Luftbilder live über den WMTS-Dienst von geo.admin.ch (SWISSIMAGE), Quellenangabe «© swisstopo».
- Lufttemperaturen: Stadt Zug, Datensatz «Lufttemperaturen Stadt Zug» auf opendata.swiss (Nutzungsbedingung «Freie Nutzung»). Messwerte: MeteoSchweiz (CC BY 4.0, Quellenangabe «Quelle: MeteoSchweiz»).
- Seetemperatur: Alplakes, Eawag. Für die Programmierschnittstelle ist Apache 2.0 angegeben, eine ausdrückliche Lizenz für die Daten fehlt; vor einer breiten Nutzung bei der Eawag nachfragen.
- Parkhäuser: Parkleitsystem Zug AG (c/o WWZ). Nutzungsbedingungen sind nicht veröffentlicht.
- Veranstaltungen: Daten und Bilder stammen von den Veranstaltern über Guidle und den Kalender von Zug Tourismus. Sie werden live angezeigt und nicht gespeichert. Für die Anzeige der Bilder ausserhalb des Guidle-Kalenders braucht es die Zustimmung von Zug Tourismus beziehungsweise Guidle.
- Einwohnerzahlen und Flächen: Bundesamt für Statistik und Statistik Kanton Zug, Quelle und Stichtag in der Gemeindeansicht.

Für den Code ist noch keine Lizenz festgelegt.

## Impressum

Hartmann Association, 6300 Zug
