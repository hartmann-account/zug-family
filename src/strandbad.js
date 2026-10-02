/* Strandbad Zug am Chamer Fussweg, erweitert und am 9. Mai 2026 eröffnet.
   Das Luftbild von swisstopo (SWISSIMAGE) zeigt hier noch die Baustelle der Befliegung 2025. Dieses Modul beschreibt
   den neuen Zustand für die 3D-Karte: Lage der zwei bogenförmigen Neubauten B1/B2 (Grundrisse OpenStreetMap,
   Gebäude- und Wohnungsregister), Liegewiese, Sandstrand, Uferweg, Holzdecks und Steinblöcke. Die Form ist aus
   Lageplan-Angaben und öffentlichen Ansichten abgeschätzt, nicht vermessen.
   Koordinaten LV95 (EPSG:2056). Das Modul zeichnet den Boden in eine Canvas; die 3D-Bauten baut app.js. */
(function (root) {
  'use strict';
  // Hilfspunkte aus dem Luftbild (0,25 m pro Pixel, Ursprung E 2680555 / N 1225521.5)
  function P(x, y) { return [2680555 + x * 0.25, 1225521.5 - y * 0.25]; }

  // Bogen der Neubauten: Kreis durch Nordende B1, Mitte und Südende B2 (OSM way 1502798338 / 1502798337)
  function circle(a, b, c) {
    var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    var ux = ((a[0] * a[0] + a[1] * a[1]) * (b[1] - c[1]) + (b[0] * b[0] + b[1] * b[1]) * (c[1] - a[1]) + (c[0] * c[0] + c[1] * c[1]) * (a[1] - b[1])) / d;
    var uy = ((a[0] * a[0] + a[1] * a[1]) * (c[0] - b[0]) + (b[0] * b[0] + b[1] * b[1]) * (a[0] - c[0]) + (c[0] * c[0] + c[1] * c[1]) * (b[0] - a[0])) / d;
    return { E: ux, N: uy, R: Math.hypot(a[0] - ux, a[1] - uy) };
  }
  var AN = [2680712, 1225413], AM = [2680735.5, 1225379], AS = [2680732, 1225339];
  var ARC = circle(AN, AM, AS);
  ARC.a0 = Math.atan2(AN[1] - ARC.N, AN[0] - ARC.E);   // Nordende
  ARC.a1 = Math.atan2(AS[1] - ARC.N, AS[0] - ARC.E);   // Südende
  ARC.gap = Math.atan2(1225383.5 - ARC.N, 2680733 - ARC.E); // Durchgang zwischen B1 und B2
  ARC.at = function (a, r) { return [ARC.E + r * Math.cos(a), ARC.N + r * Math.sin(a)]; };
  // Abstände vom Kreis (m): Gebäude innen/aussen, Vordach, Pergola beim Restaurant (Südteil)
  ARC.body = [-4.2, 4.0]; ARC.roof = [-7.2, 4.6]; ARC.perg = [-13.4, -7.2];
  ARC.pergA = [ARC.gap - 0.02 * (ARC.gap > ARC.a1 ? 1 : -1), ARC.a1];

  var perim = [P(468, 542), P(520, 482), P(598, 414), P(700, 452), P(766, 520), P(770, 700), P(740, 756), P(686, 800), P(616, 858), P(580, 912),
    P(562, 936), P(470, 790), P(372, 622)];
  // neue Sandbucht: Wasserlinie als Bogen landeinwärts der alten Uferlinie (P(372,622)–P(470,790))
  var water = [P(372, 622), P(398, 642), P(424, 668), P(444, 700), P(456, 738), P(466, 772), P(470, 790), P(562, 936)];
  var bay = water.slice(0, 7);
  var path = [P(494, 536), P(480, 584), P(474, 634), P(480, 694), P(498, 748), P(518, 796), P(548, 850), P(574, 900)];
  var decks = [ // [E, N, Seite in m, Drehung in Grad]
    [P(492, 800), 4.2, 18], [P(478, 812), 3.6, -14], [P(468, 826), 4.4, 30], [P(452, 838), 3.2, 4], [P(486, 828), 3.0, 52],
    [P(500, 846), 3.8, -22], [P(462, 856), 3.4, 12], [P(444, 870), 3.0, 40], [P(510, 870), 3.0, 8]
  ].map(function (d) { return { E: d[0][0], N: d[0][1], s: d[1], r: d[2] }; });
  // Steinblöcke: entlang der Uferverbauung südlich der Decks und einzeln in der Bucht
  var stones = [];
  (function () {
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 26; i++) {
      var t = i / 25, a = P(500 + (560 - 500) * t, 860 + (936 - 860) * t), j = (rnd() - 0.5) * 2.4;
      stones.push({ E: a[0] - 1.6 + j, N: a[1] - 0.6 * j, r: 0.55 + rnd() * 0.75, h: 0.5 + rnd() * 0.5, k: rnd() });
    }
    [[430, 760], [418, 742], [402, 712], [440, 790], [426, 808], [398, 690], [452, 896], [420, 880], [389, 662], [446, 744]].forEach(function (q) {
      var a = P(q[0], q[1]); stones.push({ E: a[0], N: a[1], r: 0.7 + rnd() * 0.6, h: 0.6 + rnd() * 0.5, k: rnd() });
    });
  })();

  // junge Bäume und Sonnenschirme auf der Liegewiese (Anordnung geschätzt)
  var trees = [[556, 522], [606, 498], [540, 586], [598, 572], [648, 558], [532, 654], [586, 640], [640, 632], [552, 722], [604, 712], [654, 700], [578, 784], [626, 768]]
    .map(function (q, i) { var a = P(q[0], q[1]); return { E: a[0], N: a[1], h: 4.2 + (i * 37 % 10) / 6, r: 1.3 + (i * 53 % 10) / 20 }; });
  var shades = [[566, 608], [580, 680], [522, 702], [618, 600], [628, 690], [548, 548], [612, 742]]
    .map(function (q) { var a = P(q[0], q[1]); return { E: a[0], N: a[1] }; });

  /* ---------- Boden: Wiese, Sand, Weg, Terrasse, Vorplatz ---------- */
  var RES = 0.15, BB = null, CV = null;
  function bbox() {
    var e0 = 1e9, e1 = -1e9, n0 = 1e9, n1 = -1e9;
    perim.forEach(function (p) { e0 = Math.min(e0, p[0]); e1 = Math.max(e1, p[0]); n0 = Math.min(n0, p[1]); n1 = Math.max(n1, p[1]); });
    return { E0: e0 - 2, E1: e1 + 2, N0: n0 - 2, N1: n1 + 2 };
  }
  function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function polyPath(ctx, pts, tf) { ctx.beginPath(); pts.forEach(function (p, i) { var q = tf(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); }
  function arcPath(ctx, r0, r1, a0, a1, tf) {
    var n = 48, i, p;
    ctx.beginPath();
    for (i = 0; i <= n; i++) { p = tf(ARC.at(a0 + (a1 - a0) * i / n, ARC.R + r0)); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
    for (i = n; i >= 0; i--) { p = tf(ARC.at(a0 + (a1 - a0) * i / n, ARC.R + r1)); ctx.lineTo(p[0], p[1]); }
    ctx.closePath();
  }
  function build() {
    BB = bbox();
    var W = Math.ceil((BB.E1 - BB.E0) / RES), H = Math.ceil((BB.N1 - BB.N0) / RES);
    CV = document.createElement('canvas'); CV.width = W; CV.height = H;
    var ctx = CV.getContext('2d');
    var tf = function (p) { return [(p[0] - BB.E0) / RES, (BB.N1 - p[1]) / RES]; };
    // Materialmasken: 1 Wiese, 2 Sand, 3 Weg, 4 Terrasse, 5 Vorplatz
    ctx.save(); polyPath(ctx, perim, tf); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgb(1,0,0)'; ctx.fillRect(0, 0, W, H);
    // Sand zwischen Wasserlinie und Weg
    var beach = water.slice(0, 7).concat([P(524, 812), P(510, 770), P(492, 720), P(482, 664), P(484, 610), P(492, 566), P(472, 550)]);
    polyPath(ctx, beach, tf); ctx.closePath(); ctx.fillStyle = 'rgb(2,0,0)'; ctx.fill();
    // Vorplatz zwischen Neubauten und Strasse
    arcPath(ctx, ARC.body[1] - 0.5, 30, ARC.a0 - 0.2, ARC.a1 + 0.2, tf); ctx.fillStyle = 'rgb(5,0,0)'; ctx.fill();
    // Terrasse unter Vordach und Pergola
    arcPath(ctx, ARC.roof[0] - 0.2, ARC.body[1], ARC.a0, ARC.a1, tf); ctx.fillStyle = 'rgb(5,0,0)'; ctx.fill();
    arcPath(ctx, ARC.perg[0] - 0.6, ARC.roof[0], ARC.pergA[0], ARC.pergA[1], tf); ctx.fillStyle = 'rgb(4,0,0)'; ctx.fill();
    // Uferweg
    ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = 'rgb(3,0,0)'; ctx.lineWidth = 3.4 / RES;
    polyPath(ctx, path, tf); ctx.stroke();
    ctx.restore();
    // Bucht: Wasser (Maske 6), Farbe von flachem Wasser über Sand
    polyPath(ctx, bay, tf); ctx.closePath(); ctx.fillStyle = 'rgb(6,0,0)'; ctx.fill();
    var mask = ctx.getImageData(0, 0, W, H), md = mask.data;
    var img = ctx.createImageData(W, H), d = img.data;
    // Abstand zur Wasserlinie für nassen Sand
    var wl = water.slice(0, 7).map(tf);
    function dWater(x, y) {
      var best = 1e9;
      for (var i = 0; i < wl.length - 1; i++) {
        var ax = wl[i][0], ay = wl[i][1], bx = wl[i + 1][0], by = wl[i + 1][1], vx = bx - ax, vy = by - ay;
        var t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
        best = Math.min(best, Math.hypot(x - ax - t * vx, y - ay - t * vy));
      }
      return best * RES;
    }
    var mowA = 0.62, ca = Math.cos(mowA), sa = Math.sin(mowA);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var k = y * W + x, m = md[k * 4], al = md[k * 4 + 3];
      if (!al || !m) continue;
      var e = BB.E0 + x * RES, n = BB.N1 - y * RES, r, g, b;
      var n1 = vnoise(e * 0.9, n * 0.9), n2 = vnoise(e * 4.1, n * 4.1), n3 = hash(x, y), n4 = vnoise(e * 0.12, n * 0.12);
      if (m === 1) { // Rasen mit Mähstreifen und Flecken
        var stripe = Math.floor((e * ca + n * sa) / 2.4) % 2 ? 1 : 0;
        var v = 0.8 + 0.12 * n1 + 0.08 * n2 + 0.12 * (n3 - 0.5) + 0.025 * stripe - 0.08 * n4, dry = Math.max(0, n4 - 0.55) * 0.5;
        r = (84 + 40 * dry) * v; g = (110 + 14 * dry) * v; b = (52 + 8 * dry) * v;
      } else if (m === 6) { // flaches Wasser über Sand: zum Strand hin heller
        var ws = Math.min(1, dWater(x, y) / 6), vb = 0.95 + 0.05 * n1 + 0.04 * (n3 - 0.5);
        r = (150 - 70 * ws) * vb; g = (156 - 40 * ws) * vb; b = (128 - 10 * ws) * vb;
      } else if (m === 2) { // Sand, zum Wasser hin dunkler und feuchter
        var w = Math.max(0, 1 - dWater(x, y) / 2.2);
        var vs = 0.92 + 0.06 * n1 + 0.05 * n2 + 0.12 * (n3 - 0.5);
        r = (214 - 60 * w) * vs; g = (196 - 58 * w) * vs; b = (160 - 48 * w) * vs;
      } else if (m === 3) { // Weg: heller Belag
        var vw = 0.95 + 0.04 * n2 + 0.06 * (n3 - 0.5);
        r = 196 * vw; g = 192 * vw; b = 182 * vw;
      } else if (m === 4) { // Terrasse: Holzdeck, Dielen 14 cm
        var pl = (e * 0.8 - n * 0.6) / 0.14, f = pl - Math.floor(pl), seam = f < 0.1 ? 0.78 : 1;
        var vd = (0.92 + 0.1 * hash(Math.floor(pl), 3) + 0.05 * (n3 - 0.5)) * seam;
        r = 176 * vd; g = 142 * vd; b = 104 * vd;
      } else { // Vorplatz: grauer Belag
        var vp = 0.93 + 0.05 * n1 + 0.07 * (n3 - 0.5);
        r = 150 * vp; g = 150 * vp; b = 146 * vp;
      }
      d[k * 4] = r; d[k * 4 + 1] = g; d[k * 4 + 2] = b; d[k * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // weiche Kante zum Luftbild
    ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2 / RES;
    polyPath(ctx, perim.slice(0, 11), tf); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // Rand der Wiese zum Sand: leichte Kante, Wegränder
    ctx.strokeStyle = 'rgba(70,64,52,0.25)'; ctx.lineWidth = 0.25 / RES; ctx.lineJoin = 'round';
    polyPath(ctx, path, function (p) { var q = tf(p); return [q[0] - 1.75 / RES * 0.95, q[1]]; }); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // Schatten der Steinblöcke und Decks auf dem Boden (Kontakt), Bäume der Liegewiese bleiben dem Luftbild überlassen
    stones.forEach(function (s) { var q = tf([s.E, s.N]); ctx.fillStyle = 'rgba(40,36,30,0.28)'; ctx.beginPath(); ctx.ellipse(q[0] + 0.3 / RES, q[1] + 0.3 / RES, s.r * 1.15 / RES, s.r * 0.95 / RES, 0, 0, 7); ctx.fill(); });
  }
  // zeichnet den Boden in eine Karten-Canvas: Emin/Nmax = linke obere Ecke, scale = Pixel pro Meter
  function paint(ctx, Emin, Nmax, scale, Emax, Nmin) {
    if (!BB) { try { build(); } catch (e) { return false; } }
    if (Emax != null && (Emax < BB.E0 || Emin > BB.E1 || Nmax < BB.N0 || Nmin > BB.N1)) return false;
    var dx = (BB.E0 - Emin) * scale, dy = (Nmax - BB.N1) * scale, w = (BB.E1 - BB.E0) * scale, h = (BB.N1 - BB.N0) * scale;
    if (w < 2) return false;
    ctx.drawImage(CV, dx, dy, w, h);
    return true;
  }
  root.ZGSBZ = { ARC: ARC, perim: perim, water: water, bay: bay, path: path, decks: decks, stones: stones, trees: trees, shades: shades, paint: paint, P: P,
    ground: 415.7, info: 'Neubauten 2026 nachgebildet; Luftbild 2025' };
})(typeof self !== 'undefined' ? self : this);
