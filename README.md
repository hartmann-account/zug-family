# zug-family

„Zuger Familien“: dreidimensionale Karte des Kantons Zug für Familien, als statische Seite ausgeliefert über Cloudflare Workers (Static Assets).

Das Relief stammt aus den Höhendaten von swisstopo, die Orte aus OpenStreetMap. Für jeden Spielplatz ist berechnet, wie viel Schatten Bäume, Gebäude und Gelände am 21. Juli werfen. Ein UV-Index für wolkenlosen Himmel wird aus dem Sonnenstand geschätzt. Beim Scrollen fährt die Kamera vom Kanton über die Stadt Zug, die Lorze und das Ägerital bis auf den Wildspitz; im Kapitel «Schatten» folgt die Sonne der Scrollposition. Am Ende steht eine filterbare Liste aller Orte mit Detailkarte, Foto und Luftbildausschnitt.

## Lokal starten und deployen

```sh
npm install
npm run dev      # lokal unter http://localhost:8787
npm run deploy   # nach Cloudflare deployen
```

Die Seite liegt in `public/index.html`. Luftbilder und Fotos werden relativ dazu aus `public/o/` und `public/foto/` nachgeladen. Ohne Node genügt `python3 -m http.server 8000` im Ordner `public/`; beim Öffnen über `file://` fehlen Luftbilder und Fotos. Das Relief braucht WebGL 2.

## Inhalt

| Pfad | Inhalt |
|---|---|
| `public/index.html` | gebaute Seite, eine Datei mit Daten und Code; lädt three.js 0.160.1 von cdnjs und Schriften von Google Fonts |
| `public/o/la/`, `public/o/lb/` | Luftbildkacheln aus SWISSIMAGE, 2 m und 0,5 m Auflösung, WebP |
| `public/foto/` | Fotos von Wikimedia Commons; Urheber, Lizenz und Quelle in `public/foto/photos.json` und in der Detailkarte |
| `src/` | Vorlage `template.html`, Anwendung `app.js`, Build `build.py` |
| `pipeline/` | Python-Skripte für Datenbezug, Schattenberechnung und Kodierung; `pipeline/osm/` enthält die Overpass-Abfragen |
| `wrangler.jsonc`, `package.json` | Konfiguration für Cloudflare Workers |

## Neu bauen

1. Daten beziehen und vorverarbeiten (`pipeline/`). Die Skripte enthalten feste Pfade aus der Entstehungsumgebung (`/home/claude/zug/`) und müssen vor einer Wiederverwendung angepasst werden. Benötigt werden numpy, scipy, rasterio, affine, pyproj, shapely, Pillow, mercantile und mapbox-vector-tile.
2. `pipeline/fam/build_data2.py` schreibt `out/data2.js`.
3. `python3 build.py` in `src/` liest `../out/data2.js` und erzeugt `index.html`; die Datei gehört nach `public/`.

## Methode

Schatten: Vegetations- und Gebäudehöhen ergeben sich aus swissSURFACE3D minus swissALTI3D (gelesen mit 1 m). Ein Punkt der Spielplatzfläche gilt als beschattet, wenn ein Strahl ab 1 m über Gelände, also etwa auf Kopfhöhe eines Kindes, in Richtung Sonne innerhalb von 95 m auf ein Hindernis trifft oder das Gelände im Umkreis von 8 km die Sonne verdeckt. Der Sonnenstand folgt dem NOAA-Verfahren für den 21. Juli 2026, Zeiten in Sommerzeit.

UV-Index: Näherung aus Sonnenhöhe und Meereshöhe für wolkenlosen Himmel. Sie ersetzt keine Prognose von MeteoSchweiz.

Bäume: lokale Maxima des Vegetationshöhenmodells, eingefärbt aus dem Luftbild.

Grenzen: Die Vollständigkeit der OpenStreetMap-Daten ist nicht garantiert. Die Luftbilder stammen teils aus Befliegungen im Frühjahr; Laubbäume erscheinen dort kahl und werden in der 3D-Ansicht sommerlich eingefärbt.

## Daten und Rechte

- Bundesamt für Landestopografie swisstopo: swissALTI3D, swissSURFACE3D, SWISSIMAGE, swissBOUNDARIES3D, Basiskarte Vektor. Es gelten die Nutzungsbedingungen von swisstopo für kostenlose Geodaten.
- © OpenStreetMap-Mitwirkende, Open Database License (ODbL) 1.0. Die abgeleitete Ortsdatenbank in `public/index.html` steht ebenfalls unter der ODbL.
- Fotos von Wikimedia Commons unter der jeweils angegebenen Creative-Commons-Lizenz, für die Karte zugeschnitten und verkleinert.
- Angebote von Zug Tourismus sind nur verlinkt; Texte und Bilder von Zug Tourismus sind nicht übernommen.

Für den Code ist noch keine Lizenz festgelegt.

## Impressum

Hartmann Association, 6300 Zug
