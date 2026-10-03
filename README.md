# zug-family

„Zug entdecken“: Portal für den Kanton Zug auf einer dreidimensionalen Karte, ausgeliefert über Cloudflare Workers (statische Seite plus kleine Endpunkte für Veranstaltungen, Parkhäuser, Temperaturen und Fahrplan).

Die Startseite zeigt das Relief des ganzen Kantons und vier Einstiege:

- **Gemeinden**: die elf Gemeinden mit Einwohnerzahl, Fläche, Höhenlage, Kurzporträt und den Sehenswürdigkeiten, Familienorten und Veranstaltungen der Gemeinde.
- **Sehenswürdigkeiten**: nach Gemeinde gruppiert und nach Kategorie filterbar. Der Gemeindefilter fliegt die Karte zur Gemeinde, ein Klick auf einen Ort zoomt hinein, mit Luftbild, Foto und Sonnenstand für Uhrzeit und Datum.
- **Für Familien**: Spielplätze, Badis, Feuerstellen, Ausflugsziele, Kultur und Sport. Für jeden Spielplatz ist der Schattenanteil am 21. Juli berechnet; ein Filter zeigt nur Orte mit höchstens so viel Sonne (zur gewählten Uhrzeit oder im Tagesmittel 10–17 Uhr). Dazu UV-Index, Trinkbrunnen, WCs, die Lufttemperatur in der Nähe und an Badestellen am See die Wassertemperatur (Modellwert).
- **Events**: Veranstaltungen live aus dem Veranstaltungskalender von Zug Tourismus (Guidle), mit Bild, Terminen, Ort auf der Karte und Filtern nach Zeitraum, Gemeinde und Kategorie.

Auf der Karte lassen sich zuschalten: freie Plätze in den Parkhäusern (Parkleitsystem Zug, jede Minute), Züge, Busse und Kursschiffe nach Fahrplan, der UV-Index bei klarem Himmel für Datum und Uhrzeit und die Lufttemperatur jetzt (rund 280 Sensoren der Stadt Zug und Stationen von MeteoSchweiz, als Werte und als Wärmefläche über der Stadt). In der Nahansicht kommen die Luftbilder live von swisstopo (SWISSIMAGE bis 10 cm), die Gebäude erhalten ihre Dachformen aus swissBUILDINGS3D, der See zeigt Uferlinie, Wellen, Spiegelung und Sonnenglanz. Wer einen Ort wählt, sieht die Karte nach dem Heranfliegen langsam um ihn kreisen.

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
| `/api/trains` | Abfahrtstafeln der Fahrplan-Schnittstelle von search.ch mit Folgehalten und Verspätungen: zehn Bahnhöfe (Zug, Baar, Cham, Rotkreuz, Steinhausen und weitere) und die Schiffstege Zug Bahnhofsteg und Arth am See | 4 min |
| `/api/buses` | Abfahrtstafeln von zwölf Bus-Knoten (Zug Metalli/Bahnhof, Postplatz, Kolinplatz, Baar Bahnhof, Cham Bahnhof und Gewerbestrasse, Rotkreuz Nord und Süd, Steinhausen, Oberägeri, Menzingen, Walchwil); sie erfassen rund 96 % der Fahrtabschnitte | 4 min |

Die Wärmefläche verbindet die Sensorwerte nach Entfernung und endet rund 350 m vom nächsten Sensor. Sie ist keine flächendeckende Messung. Die Hitzekarte der kantonalen Klimaanalyse (ZugMap) wäre die bessere Grundlage, war aber von ausserhalb der Schweiz nicht abrufbar.

## Züge, Busse und Schiffe

Für die Schweiz gibt es keinen offenen Datenstrom mit den Positionen der Fahrzeuge. opentransportdata.swiss bietet Echtzeit nur als Prognosen pro Halt an (GTFS-RT TripUpdates, OJP), ausdrücklich ohne Vehicle Positions. Die Karte schätzt die Lage deshalb aus Fahrplan und Verspätung: Zwischen zwei Halten fährt ein Zug mit Anfahr- und Bremsphase entlang der Gleisachsen aus swissTLM3D (`public/rail.json`, jedes Gleis einzeln, kürzester Weg im Gleisnetz). In Tunneln wird er ausgeblendet; Tunnel sind aus dem Gelände geschätzt (Gleis mehr als 9 m unter einer Hülle mit höchstens 3,5 % Steigung), nicht aus Tunneldaten. Liegt der vorige Halt ausserhalb der Karte (etwa Zürich HB), beginnt die Fahrt am nächsten Gleis am Kartenrand; die Strecke dorthin ist als Luftlinie geschätzt. Länge und Farbe folgen der Zugkategorie (IC/EC, IR/RE, S-Bahn), nicht dem eingesetzten Rollmaterial.

Kursschiffe der Zugersee Schifffahrt fahren entlang der Fährlinien aus OpenStreetMap und legen an berechneten Liegeplätzen an: ab dem Steg so weit seewärts, bis der Rumpf ganz im Wasser liegt, parallel zum Ufer (`pipeline/rail/make_ferry.py`). Am Bahnhofsteg Zug ist der Liegeplatz nach den Pollern im Luftbild gesetzt. Da der Fahrplan an Zwischenhalten oft dieselbe Minute für An- und Abfahrt nennt, rechnet die Karte zwei Minuten Haltezeit um diese Minute. Die Saison 2026 endet am 1. November; danach bleibt das Schiff am Bahnhofsteg.

Busse fahren zwischen den Halten entlang der Linienwege aus OpenStreetMap (`public/bus.json`, erzeugt mit `pipeline/bus/make_bus.py`), auf der rechten Fahrspur; die Fahrplanhalte werden der Reihe nach auf die passende Linienvariante projiziert. Fahrten, die erst nach einem der zwölf Knoten beginnen, erscheinen erst ab dem Knoten.

Fahrzeuge: Jede Linie erhält das Fahrzeug, das dort laut SBB-Einsatzdaten 2025 üblicherweise fährt (S1/S2/S26 FLIRT RABe 523, S5 KISS RABe 511, S24 DTZ RABe 514, IR 70 FV-Dosto RABe 502, IR 75 Re 460 mit IC2000, EC und IC 2 Giruno RABe 501, IR 46 Traverso der SOB). Im Betrieb kommen Abweichungen vor. Die Modelle sind aus Querschnitt, Kopfform, Wagenlängen und Lackierung nach Herstellerangaben und Fotos von Wikimedia Commons gebaut; Fotos dienen als Vorlage, nicht als Textur. Busse der Zugerland Verkehrsbetriebe tragen die Diesel- oder E-Bus-Lackierung (rund 40 % der Flotte fahren elektrisch, Zuteilung zufällig), Linien 603, 605, 606, 607, 611 und 614 fahren mit Gelenkbussen (nur 606 belegt), 601 und 602 mit Bus und Anhänger. Das Kursschiff ist die MS Zug (ÖSWAG 2003, 45,6 × 9,2 m), nach Fotos vermessen, darunter eines vom Oktober 2026: Rumpf mit dunklem Band unter dem Deck, Name am Bug, Hauptdecksalon mit breiter Dachkante, Oberdeck vorne verglast und hinten offen unter dem Sonnendach, Steuerhaus mit Radarmast.

Eine belastbarere Quelle wäre OJP 2.0 von opentransportdata.swiss mit kostenlosem Schlüssel (StopEventRequest, Limiten laut Plattform). geOps bietet echte Echtzeitpositionen an, verlangt aber einen Schlüssel und erlaubt die kostenlose Nutzung nur nicht kommerziell. search.ch erlaubt die Nutzung der Schnittstelle «für eigene Zwecke» und begrenzt sie auf 10'080 Abfahrtstabellen pro Tag; der Worker braucht 24 Tafeln alle vier Minuten pro Cache-Standort (8'640 pro Tag). Bei breiter Nutzung ist der Umstieg auf OJP angezeigt.

## Gebäude in der Nahansicht

Ab rund 2 km Kameraabstand lädt die Karte die Gebäude aus swissBUILDINGS3D als 3D Tiles von geo.admin.ch (b3dm mit Draco-Kompression, Decoder von jsDelivr) und blendet die einfachen Klötze aus `data/zg-base.js` an diesen Stellen aus. Dächer tragen das Luftbild, Fassaden sind aus Gebäudeart und Höhe gezeichnet: Altstadt verputzt, Kirchen und Türme mit wenigen hohen Fenstern, Bauten über 16 m mit Bandfenstern. Das Regierungsgebäude erhält Sandstein und hohe Geschosse, der Bahnhof Zug eine Glasfassade, hinter der in der Dämmerung die Farben der Lichtinstallation von James Turrell wechseln. Zwei abgebrochene Bauten am Strandbad, die im Datensatz noch stehen, sind ausgeblendet. Fotos der Bauten werden nicht als Textur verwendet.

## Strandbad Zug 2026

`src/strandbad.js` beschreibt das im Mai 2026 eröffnete erweiterte Strandbad, weil SWISSIMAGE dort noch die Baustelle von 2025 zeigt und die Neubauten in den swisstopo-Gebäudedaten fehlen. Lage der Bauten nach OpenStreetMap (way 1502798337/1502798338) und Gebäuderegister; Form, Liegewiese, Sandbucht, Decks und Steine sind nach öffentlichen Angaben abgeschätzt. Das Modul malt den Boden in das Luftbild, `app.js` baut daraus die 3D-Teile. Die Bucht vor dem Sandstrand zeigt flaches Wasser über Sand, wo das Luftbild noch Kies der Baustelle zeigt. Der Sprungturm im See ist nach dem Luftbild (10 cm) nachgebaut: runder Treppenkern, Plattform auf 5 m, Bretter auf 3 m und 1 m; das Abbild des Turms im Luftbild wird mit Wasser überdeckt. Sobald swisstopo neue Luftbilder und Gebäude liefert, kann das Modul entfallen.

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
| `public/rail.json` | Gleisachsen (swissTLM3D), Bahnhöfe, Fährlinien und Schiffsliegeplätze, Koordinaten in Dezimetern |
| `public/bus.json` | Linienwege der Busse aus OpenStreetMap, Strassenstücke einmal gespeichert |
| `worker/index.js` | Cloudflare Worker mit `/api/events`, `/api/event`, `/api/parking`, `/api/temp`, `/api/lake`, `/api/trains`, `/api/buses` |
| `pipeline/` | Python-Skripte für Datenbezug, Schattenberechnung und Kodierung; `pipeline/osm/` enthält die Overpass-Abfragen; `pipeline/portal/build_portal.py` schreibt `data/portal.json`; `pipeline/rail/` erzeugt `public/rail.json` (Gleise, dann Fährlinien mit `make_ferry.py`), `pipeline/bus/` die Datei `public/bus.json` (Overpass-Abfrage und Skript) |
| `wrangler.jsonc`, `package.json` | Konfiguration für Cloudflare Workers |

## Neu bauen

1. Geodaten beziehen und vorverarbeiten (`pipeline/`). Die Skripte enthalten feste Pfade aus der Entstehungsumgebung (`/home/claude/zug/`) und müssen vor einer Wiederverwendung angepasst werden. Benötigt werden numpy, scipy, rasterio, affine, pyproj, shapely, Pillow, mercantile und mapbox-vector-tile. Das Ergebnis liegt als `data/zg-base.js` im Repository.
2. Portaldaten: `python3 pipeline/portal/build_portal.py <ordner>` liest die geprüften Recherche-Dateien und schreibt `data/portal.json`, Fotos nach `public/foto/s/`.
3. `python3 src/build.py` schreibt `public/index.html`.

## Methode

Schatten: Vegetations- und Gebäudehöhen ergeben sich aus swissSURFACE3D minus swissALTI3D (gelesen mit 1 m). Ein Punkt der Spielplatzfläche gilt als beschattet, wenn ein Strahl ab 1 m über Gelände, also etwa auf Kopfhöhe eines Kindes, in Richtung Sonne innerhalb von 95 m auf ein Hindernis trifft oder das Gelände im Umkreis von 8 km die Sonne verdeckt. Der Sonnenstand folgt dem NOAA-Verfahren, für die Schattenwerte am 21. Juli 2026. In der Nahansicht rechnet die Karte die Schatten für das gewählte Datum (21. Juli, heute, 21. Dezember) und die Uhrzeit direkt.

UV-Index: Näherung aus Sonnenhöhe und Meereshöhe für wolkenlosen Himmel. Die UV-Karte rechnet pro Bildpunkt weiter: Die Hälfte des Werts gilt als diffuser Anteil und bleibt auch im Schatten, die andere Hälfte folgt dem Einfallswinkel auf den Hang und fällt im Schatten von Gelände, Gebäuden und Bäumen weg. Farben nach den Stufen der WHO. Wolken sind nicht berücksichtigt. Die Werte ersetzen keine Prognose von MeteoSchweiz.

Bäume: lokale Maxima des Vegetationshöhenmodells, eingefärbt aus dem Luftbild.

Grenzen: Die Vollständigkeit der OpenStreetMap-Daten ist nicht garantiert. Die Luftbilder stammen teils aus Befliegungen im Frühjahr; Laubbäume erscheinen dort kahl und werden in der 3D-Ansicht sommerlich eingefärbt.

## Daten und Rechte

- Bundesamt für Landestopografie swisstopo: swissALTI3D, swissSURFACE3D, SWISSIMAGE, swissBOUNDARIES3D, Basiskarte Vektor, swissBUILDINGS3D (3D Tiles, live), swissTLM3D Eisenbahn. Es gelten die Nutzungsbedingungen von swisstopo für kostenlose Geodaten.
- © OpenStreetMap-Mitwirkende, Open Database License (ODbL) 1.0. Die abgeleitete Ortsdatenbank in `public/index.html` steht ebenfalls unter der ODbL.
- Fotos von Wikimedia Commons unter der jeweils angegebenen Lizenz, für die Karte zugeschnitten und verkleinert.
- Zug Tourismus: Die AGB (Ziffer V) erlauben die Übernahme von Texten und Bildern der Website nur mit schriftlicher Zustimmung. Von zug-tourismus.ch sind deshalb nur Fakten (Name, Ort, Koordinaten) übernommen und die Seiten verlinkt.
- Luftbilder live über den WMTS-Dienst von geo.admin.ch (SWISSIMAGE), Quellenangabe «© swisstopo».
- Lufttemperaturen: Stadt Zug, Datensatz «Lufttemperaturen Stadt Zug» auf opendata.swiss (Nutzungsbedingung «Freie Nutzung»). Messwerte: MeteoSchweiz (CC BY 4.0, Quellenangabe «Quelle: MeteoSchweiz»).
- Seetemperatur: Alplakes, Eawag. Für die Programmierschnittstelle ist Apache 2.0 angegeben, eine ausdrückliche Lizenz für die Daten fehlt; vor einer breiten Nutzung bei der Eawag nachfragen.
- Parkhäuser: Parkleitsystem Zug AG (c/o WWZ). Nutzungsbedingungen sind nicht veröffentlicht.
- Fahrplan und Verspätungen: Fahrplan-Schnittstelle von search.ch (Nutzung für eigene Zwecke, Tageslimite). Haltestellen: Dienststellen von SBB und opentransportdata.swiss. Fährlinien der Kursschiffe und Linienwege der Busse: OpenStreetMap (ODbL). Vorlagen für die Fahrzeugmodelle: Fotos von Wikimedia Commons (nicht in die Karte übernommen).
- Veranstaltungen: Daten und Bilder stammen von den Veranstaltern über Guidle und den Kalender von Zug Tourismus. Sie werden live angezeigt und nicht gespeichert. Für die Anzeige der Bilder ausserhalb des Guidle-Kalenders braucht es die Zustimmung von Zug Tourismus beziehungsweise Guidle.
- Einwohnerzahlen und Flächen: Bundesamt für Statistik und Statistik Kanton Zug, Quelle und Stichtag in der Gemeindeansicht.

Für den Code ist noch keine Lizenz festgelegt.

## Impressum

Hartmann Association, 6300 Zug
