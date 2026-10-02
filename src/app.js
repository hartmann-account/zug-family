(function () {
'use strict';
var D = window.ZG, F = D.fam;
var $ = function (s) { return document.querySelector(s); };
var statusEl = $('#status'), hudA = $('#hudA'), hudB = $('#hudB');
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var TEST = !!window.ZG_TEST;
var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function swiss(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }
function dec(x, d) { return x.toFixed(d == null ? 1 : d).replace('.', ','); }
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(t) { var m = Math.round(t * 60 / 5) * 5, h = Math.floor(m / 60); return pad2(h) + ':' + pad2(m % 60); }
var DEG = Math.PI / 180;

/* ---------------- icons and categories ---------------- */
var ICON = {
  spiel: 'M4 4h16v2H4zM5.3 5.6h2.1L5.2 21H3.1zM16.6 5.6h2.1L20.9 21h-2.1zM9.6 6h1.2v9.4H9.6zM13.2 6h1.2v9.4h-1.2zM8.6 15.2h6.8v2.2H8.6z',
  baden: 'M17 4.6a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 1 1 0-4.6zM4.5 12.4l4.6-3.6 3.4 2.4 3.3-1.6 1 1.8-4.3 2.2-3-2.1-3.6 2.8zM2 15.6c2 0 2.6-1.5 4.6-1.5s2.6 1.5 4.6 1.5 2.6-1.5 4.6-1.5 2.6 1.5 4.6 1.5h1.6v2h-1.6c-2 0-2.6-1.5-4.6-1.5s-2.6 1.5-4.6 1.5-2.6-1.5-4.6-1.5S4 17.6 2 17.6zM2 19.6c2 0 2.6-1.5 4.6-1.5s2.6 1.5 4.6 1.5 2.6-1.5 4.6-1.5 2.6 1.5 4.6 1.5h1.6v2h-1.6c-2 0-2.6-1.5-4.6-1.5s-2.6 1.5-4.6 1.5-2.6-1.5-4.6-1.5S4 21.6 2 21.6z',
  feuer: 'M12 2c.8 3.2 4.6 5.2 4.6 9.6A4.6 4.6 0 0 1 12 16.2a4.6 4.6 0 0 1-4.6-4.6c0-2.1 1-3.6 2.1-4.6-.1 2 .9 3.2 2 3.2C11.7 7.4 10.9 4.8 12 2zM4.4 17.4l15.4 3.4-.5 2-15.4-3.4zM19.6 17.4L4.2 20.8l.5 2 15.4-3.4z',
  natur: 'M12 2l6.2 8.2h-3.1l4.4 6.3H14v4.9h-4v-4.9H4.5l4.4-6.3H5.8z',
  kultur: 'M12 2l10 5v2.2H2V7zM4 10.4h3.2v7.6H4zM10.4 10.4h3.2v7.6h-3.2zM16.8 10.4H20v7.6h-3.2zM2 19.2h20V22H2z',
  sport: 'M12 2.6a9.4 9.4 0 1 1 0 18.8a9.4 9.4 0 1 1 0-18.8zM12 7.8l-3.9 2.8 1.5 4.6h4.8l1.5-4.6z',
  wasser: 'M12 2C9 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-7-6-12z',
  wc: 'M7.5 2.6a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM5 8h5v7.4H9V22H6v-6.6H5zM16.5 2.6a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM16.5 8l3.6 8.2H18V22h-3v-5.8h-2.1z'
};
var CATS = [
  { k: 'spiel', t: 'Spielplätze' }, { k: 'baden', t: 'Baden' }, { k: 'feuer', t: 'Feuer & Picknick' },
  { k: 'natur', t: 'Ausflug & Natur' }, { k: 'kultur', t: 'Kultur & Lernen' }, { k: 'sport', t: 'Sport & Spass' }
];
var ICONKEYS = ['spiel', 'baden', 'feuer', 'natur', 'kultur', 'sport', 'wasser', 'wc'];
function svgIcon(k, cls) { return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" aria-hidden="true"><path' + (k === 'sport' ? ' fill-rule="evenodd"' : '') + ' d="' + ICON[k] + '"/></svg>'; }

/* ---------------- places ---------------- */
var E0F = 2666000, N0F = 1207000;
var STEPS = F.steps;
var PL = F.places.map(function (p, i) {
  return { i: i, cat: p.c, kind: p.k, name: p.n || '', hint: p.h || '', gem: p.g, E: p.e + E0F, N: p.m + N0F, z: p.z, s: p.s || null, cover: p.v,
    dw: p.dw, dc: p.dc, zt: p.t || null, note: p.x || '', out: !!p.o, guests: !!p.q, flags: p.f || [], poly: p.p || null, osm: p.id || null,
    ph: p.ph || null, title: p.n || p.k };
});
function shadeAt(p, t) {
  if (!p || !p.s) return null;
  var x = (t - STEPS[0]) / 0.5, n = p.s.length;
  if (x <= 0) return p.s[0] / 100;
  if (x >= n - 1) return p.s[n - 1] / 100;
  var i = Math.floor(x), f = x - i;
  return (p.s[i] * (1 - f) + p.s[i + 1] * f) / 100;
}
var SPIEL = PL.filter(function (p) { return p.cat === 0; });
var FEAT = PL.filter(function (p) { return /Schattwäldli/.test(p.name); })[0] || SPIEL[0];

/* ---------------- sun, UV ---------------- */
var GAMMA = -0.786;
function sunpos(hours) {
  var ms = Date.UTC(2026, 6, 21) + (hours - 2) * 3600000;
  var jd = ms / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525;
  var L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  var M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T), Mr = M * DEG;
  var C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
  var om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * DEG);
  var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * DEG);
  var dc = Math.asin(Math.sin(eps * DEG) * Math.sin(lam * DEG));
  var y = Math.pow(Math.tan(eps * DEG / 2), 2), L0r = L0 * DEG;
  var eqt = 4 / DEG * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
  var mins = (((hours - 2) * 60) % 1440 + 1440) % 1440;
  var ha = ((((mins + eqt + 4 * 8.52) % 1440) + 1440) % 1440) / 4 - 180;
  var lr = 47.17 * DEG, har = ha * DEG;
  var cz = Math.sin(lr) * Math.sin(dc) + Math.cos(lr) * Math.cos(dc) * Math.cos(har);
  var alt = 90 - Math.acos(clamp(cz, -1, 1)) / DEG;
  var az = (Math.atan2(Math.sin(har), Math.cos(har) * Math.sin(lr) - Math.tan(dc) * Math.cos(lr)) / DEG + 180 + 360) % 360;
  if (alt > -0.575) {
    var te = Math.tan(Math.max(alt, 0.01) * DEG);
    var rc = alt > 5 ? (58.1 / te - 0.07 / Math.pow(te, 3) + 0.000086 / Math.pow(te, 5)) : (1735 + alt * (-518.2 + alt * (103.4 + alt * (-12.79 + alt * 0.711))));
    alt += rc / 3600;
  }
  return { az: az, alt: alt };
}
function sunVector(s, out) { var a = (s.az + GAMMA) * DEG, h = s.alt * DEG; return out.set(Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h)); }
var DIRS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'];
function dirWord(az) { return DIRS[Math.round(((az % 360) + 360) % 360 / 45) % 8]; }
function uvi(alt, z) { if (alt <= 0) return 0; var mu = Math.sin(alt * DEG); return 12.5 * Math.pow(mu, 2.42) * 0.889 * 0.95 * (1 + 0.1 * Math.max(0, (z || 425) - 400) / 1000); }
function uvCat(u) { var r = Math.round(u); return r < 3 ? [1, 'niedrig'] : r < 6 ? [2, 'mässig'] : r < 8 ? [3, 'hoch'] : r < 11 ? [4, 'sehr hoch'] : [5, 'extrem']; }

/* ---------------- text that comes from the data ---------------- */
var MUNI = {}; D.munis.forEach(function (m) { MUNI[m.name] = m; });
function fillRows(id, names) {
  var ul = document.getElementById(id); if (!ul) return;
  ul.innerHTML = names.map(function (n) { var m = MUNI[n];
    return '<li><span>' + n + '</span><span>' + dec(m.ha / 100) + ' km² · ' + m.hmin + '–' + m.hmax + ' m</span></li>'; }).join('');
}
fillRows('rowsLorze', ['Baar', 'Steinhausen', 'Cham', 'Hünenberg', 'Risch']);
fillRows('rowsAegeri', ['Unterägeri', 'Oberägeri']);
fillRows('rowsBerg', ['Menzingen', 'Neuheim']);
(function () {
  var cnt = {}; SPIEL.forEach(function (p) { cnt[p.gem] = (cnt[p.gem] || 0) + 1; });
  var arr = Object.keys(cnt).map(function (k) { return [k, cnt[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); });
  var top = arr.slice(0, 6), rest = arr.slice(6).reduce(function (s, a) { return s + a[1]; }, 0);
  $('#nSpiel').textContent = SPIEL.length;
  $('#rowsSpiel').innerHTML = top.map(function (a) { return '<li><span>' + esc(a[0]) + '</span><span>' + a[1] + '</span></li>'; }).join('') +
    (rest ? '<li><span>Übrige ' + (arr.length - 6) + ' Gemeinden</span><span>' + rest + '</span></li>' : '');
})();

function fail(msg) {
  document.documentElement.classList.add('noscene');
  statusEl.textContent = msg; hudA.textContent = 'Relief nicht verfügbar'; hudB.textContent = '';
}

/* ---------------- sun UI (built before WebGL so it works without 3D) ---------------- */
var sunT = 15, sun = sunpos(15), sunUIs = [], userSunLock = false, playing = false, playLast = 0;
var ARC = (function () { var pts = [], t; for (t = 5; t <= 22.001; t += 0.25) pts.push([t, sunpos(t).alt]); return pts; })();
function arcX(t) { return (t - 5) / 17 * 300; } function arcY(a) { return 42 - clamp(a, -12, 66) / 66 * 38; }
function buildSunUI(el, id) {
  if (!el) return;
  var day = '', all = '';
  ARC.forEach(function (p, i) { var s = (i ? 'L' : 'M') + arcX(p[0]).toFixed(1) + ' ' + arcY(p[1]).toFixed(1); all += s; });
  var started = false; ARC.forEach(function (p) { if (p[1] > 0) { day += (started ? 'L' : 'M') + arcX(p[0]).toFixed(1) + ' ' + arcY(p[1]).toFixed(1); started = true; } });
  el.innerHTML = '<div class="sun-top"><button class="sun-play" type="button" aria-label="Tagesverlauf abspielen"><svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg></button>' +
    '<div class="sun-read"><b class="sun-time">15:00</b><span class="sun-pos"></span></div><span class="uv" data-c="3"><i></i><span class="uv-t"></span></span></div>' +
    '<svg class="sun-arc" viewBox="0 0 300 46" aria-hidden="true"><line class="horizon" x1="0" x2="300" y1="' + arcY(0).toFixed(1) + '" y2="' + arcY(0).toFixed(1) + '"/><path class="path" d="' + all + '"/><path class="day" d="' + day + '"/><circle class="dot" r="6" cx="0" cy="0"/></svg>' +
    '<input type="range" id="' + id + '" min="8" max="19" step="0.25" value="15" aria-label="Uhrzeit am 21. Juli">' +
    '<div class="sun-scale" aria-hidden="true"><span>8</span><span>10</span><span>12</span><span>14</span><span>16</span><span>18</span><span>19 Uhr</span></div>';
  var ui = { el: el, time: el.querySelector('.sun-time'), pos: el.querySelector('.sun-pos'), uv: el.querySelector('.uv'), uvt: el.querySelector('.uv-t'),
    dot: el.querySelector('.dot'), range: el.querySelector('input'), play: el.querySelector('.sun-play') };
  ui.range.addEventListener('input', function () { stopPlay(); userSunLock = true; setSunT(parseFloat(ui.range.value), 'ui'); });
  ui.play.addEventListener('click', function () { if (playing) stopPlay(); else { playing = true; userSunLock = true; playLast = performance.now(); sunUIs.forEach(function (u) { u.play.setAttribute('aria-label', 'Tagesverlauf anhalten'); u.play.innerHTML = '<svg viewBox="0 0 14 14"><path d="M3 2h3v10H3zM8 2h3v10H8z"/></svg>'; }); } });
  sunUIs.push(ui);
}
function stopPlay() { if (!playing) return; playing = false; sunUIs.forEach(function (u) { u.play.setAttribute('aria-label', 'Tagesverlauf abspielen'); u.play.innerHTML = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg>'; }); }
buildSunUI($('#sunA'), 'sunRangeA'); buildSunUI($('#sunB'), 'sunRangeB');
var lastUIupd = 0, listDirty = true;
function updateSunUI() {
  var u = uvi(sun.alt, 425), c = uvCat(u);
  sunUIs.forEach(function (ui) {
    ui.time.textContent = fmtTime(sunT) + ' Uhr';
    ui.pos.textContent = sun.alt > 0 ? 'Sonne ' + Math.round(sun.alt) + '° hoch, aus ' + dirWord(sun.az) : 'Sonne unter dem Horizont';
    ui.uv.dataset.c = c[0]; ui.uvt.textContent = 'UV ' + Math.round(u) + ' · ' + c[1];
    ui.uv.title = 'UV-Index bei wolkenlosem Himmel, geschätzt aus dem Sonnenstand';
    ui.dot.setAttribute('cx', arcX(sunT).toFixed(1)); ui.dot.setAttribute('cy', arcY(sun.alt).toFixed(1));
    if (document.activeElement !== ui.range) ui.range.value = String(Math.round(sunT * 4) / 4);
  });
  var fs = shadeAt(FEAT, sunT);
  $('#featShade').textContent = fs == null ? '–' : Math.round(fs * 100) + ' %';
  updateChart();
}
function setSunT(t, src) {
  t = clamp(t, 8, 19);
  if (Math.abs(t - sunT) < 1e-4 && src !== 'force') return;
  sunT = t; sun = sunpos(t);
  if (window.THREE && U) sunVector(sun, U.uSunDir.value);
  var now = performance.now();
  if (src !== 'scroll' || now - lastUIupd > 60) { lastUIupd = now; updateSunUI(); }
  listDirty = true; markerShadeDirty = true;
}
/* small bar chart: playgrounds with at least half of the area in shade */
var chartEl = $('#miniChart'), CH = null;
(function buildChart() {
  if (!chartEl) return;
  var n = STEPS.length, W = 300, H = 92, top = 18, base = 74, total = SPIEL.filter(function (p) { return p.s; }).length;
  var counts = STEPS.map(function (t, k) { return SPIEL.filter(function (p) { return p.s && p.s[k] >= 50; }).length; });
  var bw = W / n, svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Spielplätze mit mindestens halbem Schatten je Uhrzeit">';
  counts.forEach(function (c, k) {
    var h = (base - top) * c / total, x = k * bw + 1;
    svg += '<rect class="b" data-k="' + k + '" x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(h, 1).toFixed(1) + '" rx="2"><title>' + fmtTime(STEPS[k]) + ' Uhr: ' + c + ' von ' + total + '</title></rect>';
  });
  svg += '<line class="base" x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>';
  [8, 12, 16, 19].forEach(function (t) { var k = STEPS.indexOf(t); svg += '<text class="ax" x="' + (k * bw + bw / 2).toFixed(1) + '" y="' + (base + 13) + '" text-anchor="middle">' + t + (t === 19 ? ' Uhr' : '') + '</text>'; });
  svg += '<text class="val" id="chartVal" x="0" y="12" text-anchor="middle"></text></svg>';
  chartEl.innerHTML = '<figcaption><b>Spielplätze mit mindestens halbem Schatten</b>, von ' + total + '</figcaption>' + svg;
  CH = { counts: counts, bw: bw, base: base, top: top, total: total, bars: chartEl.querySelectorAll('.b'), val: chartEl.querySelector('#chartVal') };
  chartEl.addEventListener('click', function (e) { var b = e.target.closest('.b'); if (!b) return; stopPlay(); userSunLock = true; setSunT(STEPS[+b.dataset.k], 'ui'); });
})();
function updateChart() {
  if (!CH) return;
  var k = clamp(Math.round((sunT - 8) / 0.5), 0, STEPS.length - 1);
  for (var i = 0; i < CH.bars.length; i++) CH.bars[i].classList.toggle('on', i === k);
  var h = (CH.base - CH.top) * CH.counts[k] / CH.total;
  CH.val.setAttribute('x', (k * CH.bw + CH.bw / 2).toFixed(1)); CH.val.setAttribute('y', (CH.base - h - 4).toFixed(1));
  CH.val.textContent = CH.counts[k];
}

/* ---------------- explorer UI ---------------- */
var filt = { cats: [true, true, true, true, true, true], gem: '', shade: false, zt: false };
var explorerEl = document.querySelector('.explorer');
var chipsEl = $('#chips'), listEl = $('#list'), detailEl = $('#detail'), scrollEl = $('#scroll'), countEl = $('#count'), countHint = $('#countHint');
chipsEl.innerHTML = CATS.map(function (c, k) {
  var n = PL.filter(function (p) { return p.cat === k; }).length;
  return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="true">' + svgIcon(c.k) + c.t + ' <small>' + n + '</small></button>';
}).join('');
(function () {
  var sel = $('#fGem'), gems = {};
  PL.forEach(function (p) { gems[p.gem] = (gems[p.gem] || 0) + 1; });
  Object.keys(gems).sort(function (a, b) { var ao = MUNI[a] ? 0 : 1, bo = MUNI[b] ? 0 : 1; return ao - bo || a.localeCompare(b); }).forEach(function (g) {
    var o = document.createElement('option'); o.value = g; o.textContent = (MUNI[g] ? g : g + ', ausserhalb') + ' (' + gems[g] + ')'; sel.appendChild(o);
  });
  sel.addEventListener('change', function () { filt.gem = sel.value; listDirty = true; if (sel.value && MUNI[sel.value]) flyToMuni(MUNI[sel.value]); });
})();
chipsEl.addEventListener('click', function (e) {
  var b = e.target.closest('.chip'); if (!b) return;
  var k = +b.dataset.cat;
  var allOn = filt.cats.every(Boolean);
  if (allOn) { filt.cats = filt.cats.map(function (_, j) { return j === k; }); }
  else { filt.cats[k] = !filt.cats[k]; if (!filt.cats.some(Boolean)) filt.cats = filt.cats.map(function () { return true; }); }
  Array.prototype.forEach.call(chipsEl.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', filt.cats[+c.dataset.cat] ? 'true' : 'false'); });
  listDirty = true; markerVisDirty = true;
});
$('#fShade').addEventListener('click', function () { filt.shade = !filt.shade; this.setAttribute('aria-pressed', String(filt.shade)); listDirty = true; markerVisDirty = true; });
$('#fZT').addEventListener('click', function () { filt.zt = !filt.zt; this.setAttribute('aria-pressed', String(filt.zt)); listDirty = true; markerVisDirty = true; });
function matches(p) {
  if (!filt.cats[p.cat]) return false;
  if (filt.gem && p.gem !== filt.gem) return false;
  if (filt.zt && !p.zt) return false;
  if (filt.shade) { var s = shadeAt(p, sunT); if (s == null || s < 0.5) return false; }
  return true;
}
function subLine(p) {
  var parts = [];
  if (p.name) parts.push(p.kind);
  if (p.hint) parts.push(p.hint);
  parts.push(p.gem);
  return parts.join(' · ');
}
var ROWS = PL.map(function (p) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'it'; b.dataset.i = p.i; b.setAttribute('role', 'listitem');
  b.innerHTML = '<span class="pin">' + svgIcon(CATS[p.cat].k) + '</span><span class="tx"><b>' + esc(p.title) + (p.zt ? '<span class="tag">Tipp</span>' : '') + '</b><span>' + esc(subLine(p)) + '</span></span><span class="sh"></span>';
  b._sh = b.querySelector('.sh');
  return b;
});
listEl.addEventListener('click', function (e) { var b = e.target.closest('.it'); if (b) selectPlace(PL[+b.dataset.i], true); });
function renderList() {
  listDirty = false;
  var vis = PL.filter(matches);
  if (filt.shade) vis.sort(function (a, b) { return shadeAt(b, sunT) - shadeAt(a, sunT); });
  else vis.sort(function (a, b) { return (b.zt ? 1 : 0) - (a.zt ? 1 : 0) || a.cat - b.cat || a.title.localeCompare(b.title, 'de') || a.gem.localeCompare(b.gem, 'de'); });
  var frag = document.createDocumentFragment();
  vis.forEach(function (p) {
    var r = ROWS[p.i], s = shadeAt(p, sunT);
    if (s != null) { var pc = Math.round(s * 100); r._sh.innerHTML = pc + ' %<i style="--p:' + pc + '%"></i>'; r._sh.title = 'Schatten um ' + fmtTime(sunT) + ' Uhr'; }
    else r._sh.textContent = '';
    frag.appendChild(r);
  });
  listEl.textContent = ''; listEl.appendChild(frag);
  countEl.textContent = vis.length + (vis.length === 1 ? ' Ort' : ' Orte');
  countHint.textContent = 'Schatten um ' + fmtTime(sunT) + ' Uhr';
}

/* ---------------- WebGL setup ---------------- */
if (!window.THREE) { fail('Die 3D-Bibliothek konnte nicht geladen werden. Liste und Texte bleiben nutzbar.'); updateSunUI(); renderList(); return; }
if (typeof DecompressionStream === 'undefined') { fail('Dieser Browser kann die Geodaten nicht entpacken. Liste und Texte bleiben nutzbar.'); updateSunUI(); renderList(); return; }
THREE.ColorManagement.enabled = false;
var canvas = $('#scene');
canvas.style.opacity = '0';
canvas.style.transition = reduce ? 'none' : 'opacity 1.4s ease';
var renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { fail('WebGL ist in diesem Browser nicht verfügbar. Liste und Texte bleiben nutzbar.'); updateSunUI(); renderList(); return; }
if (!renderer.capabilities.isWebGL2) { fail('Für das Relief braucht es WebGL 2. Liste und Texte bleiben nutzbar.'); updateSunUI(); renderList(); return; }
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x000000, 0);
renderer.autoClear = true;
var small = Math.min(screen.width, screen.height) < 700;
var dpr0 = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
renderer.setPixelRatio(dpr0);

/* ---------------- geography ---------------- */
var G = D.grid, EC = (G.E0 + G.E1) / 2, NC = (G.N0 + G.N1) / 2, H0 = 380, VZ = 1.6, vz = VZ;
function X(E) { return E - EC; } function Z(N) { return NC - N; } function Y(h) { return (h - H0) * vz; }
var nx = G.nx, ny = G.ny, HT = new Float32Array(nx * ny);
function hAt(E, N) {
  var fx = (E - G.E0) / G.step, fy = (G.N1 - N) / G.step;
  fx = clamp(fx, 0, nx - 1); fy = clamp(fy, 0, ny - 1);
  var i = Math.min(nx - 2, fx | 0), j = Math.min(ny - 2, fy | 0), tx = fx - i, ty = fy - j, k = j * nx + i;
  return (HT[k] * (1 - tx) + HT[k + 1] * tx) * (1 - ty) + (HT[k + nx] * (1 - tx) + HT[k + nx + 1] * tx) * ty;
}
function inGrid(E, N) { return E >= G.E0 && E <= G.E1 && N >= G.N0 && N <= G.N1; }
function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function gunzip(u8) {
  var ds = new DecompressionStream('gzip');
  return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
}
function loadImage(src) { return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

/* ---------------- uniforms, theme ---------------- */
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(30, 1, 20, 200000);
var SM = (small || renderer.capabilities.maxTextureSize < 8192) ? 2048 : 4096;
var blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); blank.needsUpdate = true;
var U = {
  uFog: { value: new THREE.Color() }, uFogNear: { value: 1e5 }, uFogFar: { value: 2e5 },
  uTime: { value: 0 }, uDark: { value: 0 }, uPx: { value: 0.001 },
  uVZ: { value: VZ }, uBZ: { value: VZ },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunMix: { value: 0 }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uSkyCol: { value: new THREE.Color(0.8, 0.85, 1) },
  uAmb: { value: 0.46 }, uDif: { value: 0.64 },
  uShadowMap: { value: blank }, uShadowMat: { value: new THREE.Matrix4() }, uShadowOn: { value: 0 }, uShadowTexel: { value: 1 }, uShadowRange: { value: 50000 }, uSMSize: { value: SM },
  uOrthoF: { value: blank }, uOrthoC: { value: blank }, uOrthoFRect: { value: new THREE.Vector4(0, 0, 1, 0) }, uOrthoCRect: { value: new THREE.Vector4(0, 0, 1, 0) },
  uOrthoMix: { value: 0 }, uOrthoDim: { value: 1 },
  uHgt: { value: blank }, uHgtSize: { value: new THREE.Vector2(nx, ny) }
};
sunVector(sun, U.uSunDir.value);
var C = {};
['--paper', '--m-land', '--m-lit', '--m-shade', '--m-forest', '--m-out', '--m-water', '--m-water-deep', '--m-contour', '--m-hi',
 '--m-side', '--m-side-2', '--m-roof', '--m-wall', '--m-window', '--m-line', '--m-muni', '--m-river', '--m-shore', '--m-lorze', '--ink',
 '--m-tree', '--m-trunk', '--m-sun', '--m-sky', '--m-pin', '--m-pin-ink', '--m-ring-shade', '--m-ring-sun', '--m-sel'
].forEach(function (k) { C[k] = new THREE.Color(); });

var COMMON = [
  'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
  'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
  '  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y); }'
].join('\n');
var SHADOW = [
  'uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform float uShadowOn, uShadowTexel, uShadowRange, uSMSize;',
  'float shadowVis(vec3 wp, vec3 n, float nl){',
  '  if(uShadowOn < 0.002) return 1.0;',
  '  vec3 off = n * uShadowTexel * (1.0 + 2.5*(1.0-nl));',
  '  vec4 sc = uShadowMat * vec4(wp + off, 1.0);',
  '  vec3 p = sc.xyz;',
  '  if(p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;',
  '  float bias = (0.2 + uShadowTexel*0.7) / uShadowRange;',
  '  float ts = 1.0/uSMSize; float v = 0.0;',
  '  for(int i=-1;i<=1;i++){ for(int j=-1;j<=1;j++){ float d = texture2D(uShadowMap, p.xy + vec2(float(i),float(j))*ts).r; v += step(p.z - bias, d); } }',
  '  v /= 9.0;',
  '  vec2 e = min(p.xy, 1.0-p.xy); float edge = smoothstep(0.0, 0.06, min(e.x,e.y));',
  '  return mix(1.0, v, edge*uShadowOn);',
  '}'
].join('\n');
var ORTHO = [
  'uniform sampler2D uOrthoF, uOrthoC; uniform vec4 uOrthoFRect, uOrthoCRect; uniform float uOrthoMix, uOrthoDim;',
  'vec4 orthoAt(vec2 xz){',
  '  vec4 c = vec4(0.0);',
  '  if(uOrthoMix < 0.002) return c;',
  '  vec2 uc = (xz - uOrthoCRect.xy)/uOrthoCRect.z;',
  '  if(uOrthoCRect.w > 0.5 && uc.x > 0.0 && uc.x < 1.0 && uc.y > 0.0 && uc.y < 1.0) c = texture2D(uOrthoC, uc);',
  '  vec2 uf = (xz - uOrthoFRect.xy)/uOrthoFRect.z;',
  '  if(uOrthoFRect.w > 0.5 && uf.x > 0.002 && uf.x < 0.998 && uf.y > 0.002 && uf.y < 0.998){ vec4 f = texture2D(uOrthoF, uf); c = mix(c, f, f.a); }',
  '  if(c.a > 0.001) c.rgb = c.rgb / c.a;',
  '  c.rgb *= uOrthoDim;',
  '  return c;',
  '}'
].join('\n');
var LIGHT = 'uniform vec3 uSunDir, uSunCol, uSkyCol; uniform float uSunMix, uAmb, uDif;';

/* terrain */
var terrainMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({
    uRelief: { value: blank }, uMaskL: { value: blank }, uMaskN: { value: blank },
    uLand: { value: C['--m-land'] }, uLit: { value: C['--m-lit'] }, uShade: { value: C['--m-shade'] }, uForest: { value: C['--m-forest'] },
    uOut: { value: C['--m-out'] }, uWater: { value: C['--m-water'] }, uWaterDeep: { value: C['--m-water-deep'] },
    uContour: { value: C['--m-contour'] }, uHi: { value: C['--m-hi'] },
    uFocus: { value: 0.3 }, uContourA: { value: 0.3 }, uHover: { value: -1 }, uHiv: { value: new Array(12).fill(0) }, uHiAny: { value: 0 }
  }, U),
  vertexShader: [
    'uniform float uVZ; varying vec2 vUv; varying vec3 vW; varying float vDist;',
    'void main(){ vUv=uv; vec3 p=position; p.y*=uVZ; vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; vDist=distance(w.xyz,cameraPosition);',
    '  gl_Position=projectionMatrix*viewMatrix*w; }'
  ].join('\n'),
  fragmentShader: [
    'uniform sampler2D uRelief; uniform sampler2D uMaskL; uniform sampler2D uMaskN; uniform sampler2D uHgt; uniform vec2 uHgtSize;',
    'uniform vec3 uLand, uLit, uShade, uForest, uOut, uWater, uWaterDeep, uContour, uHi, uFog;',
    'uniform float uFocus, uContourA, uHover, uTime, uFogNear, uFogFar, uDark, uHiAny, uVZ; uniform float uHiv[12];',
    LIGHT, SHADOW, ORTHO, COMMON,
    'varying vec2 vUv; varying vec3 vW; varying float vDist;',
    'vec3 tNormal(vec2 uv){',
    '  vec2 t = 1.0/uHgtSize; vec2 q = (uv*(uHgtSize-1.0)+0.5)/uHgtSize;',
    '  float hl = texture2D(uHgt, q - vec2(t.x,0.0)).r, hr = texture2D(uHgt, q + vec2(t.x,0.0)).r;',
    '  float hd = texture2D(uHgt, q - vec2(0.0,t.y)).r, hu = texture2D(uHgt, q + vec2(0.0,t.y)).r;',
    '  float dx = (hr-hl)*uVZ/100.0; float dn = (hu-hd)*uVZ/100.0;',
    '  return normalize(vec3(-dx, 1.0, dn));',
    '}',
    'void main(){',
    '  vec3 ml = texture2D(uMaskL, vUv).rgb;',
    '  float idf = floor(texture2D(uMaskN, vUv).r*255.0/20.0+0.5); int id = int(idf);',
    '  float inside = step(0.5, idf);',
    '  float rel = texture2D(uRelief, vUv).r;',
    '  float water = smoothstep(0.30, 0.70, ml.b);',
    '  float k = 1.0 + (rel/0.69 - 1.0)*1.8;',
    '  vec3 col = k < 1.0 ? mix(uShade, uLand, smoothstep(0.05, 1.0, k)) : mix(uLand, uLit, clamp((k-1.0)*1.6, 0.0, 1.0));',
    '  vec3 flatc = uLand;',
    '  float fpx = length(fwidth(vW.xz));',
    '  vec2 g = vW.xz/19.0; float r = length(fract(g)-0.5); float aa = fpx/19.0;',
    '  float dots = (1.0-smoothstep(0.15-aa, 0.15+aa, r))*(1.0-smoothstep(1.4, 3.2, fpx));',
    '  col = mix(col, col*uForest, ml.g*0.8); flatc = mix(flatc, flatc*uForest, ml.g*0.8);',
    '  col = mix(col, col*0.82, ml.g*dots*0.6);',
    '  vec2 uvH = (vUv*(uHgtSize-1.0)+0.5)/uHgtSize; float h = texture2D(uHgt, uvH).r;',
    '  float h20=h/20.0, w20=max(fwidth(h20),1e-5); float l20 = 1.0-clamp(abs(fract(h20-0.5)-0.5)/w20, 0.0, 1.0);',
    '  float h100=h/100.0, w100=max(fwidth(h100),1e-5); float l100 = 1.0-clamp(abs(fract(h100-0.5)-0.5)/(w100*1.3), 0.0, 1.0);',
    '  float cont = max(l20*0.16*(1.0-smoothstep(0.08,0.26,w20)), l100*0.42*(1.0-smoothstep(0.2,0.5,w100)));',
    '  float hv = 0.0; for(int i=0;i<12;i++){ if(i==id) hv=uHiv[i]; }',
    '  float hov = (abs(idf-uHover)<0.5) ? inside : 0.0;',
    '  float depth = (1.0-rel)*230.0;',
    '  vec3 wc = mix(uWater, uWaterDeep, smoothstep(0.0, 165.0, depth));',
    '  float n = noise(vW.xz*0.0042+vec2(uTime*0.018, uTime*0.011))*0.6 + noise(vW.xz*0.016-vec2(uTime*0.045))*0.4;',
    '  wc *= 0.95+n*0.1;',
    '  vec3 V = normalize(cameraPosition-vW);',
    '  wc = mix(wc, uLit, pow(1.0-clamp(V.y,0.0,1.0), 3.0)*0.32*(1.0-uDark*0.5));',
    '  if(uSunMix > 0.001){',
    '    vec3 N = tNormal(vUv);',
    '    float lamb = max(dot(N, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, N, lamb) : 0.0;',
    '    vec3 light = uAmb*uSkyCol + uDif*lamb*vis*uSunCol;',
    '    vec3 lit = flatc*light;',
    '    vec4 oc = orthoAt(vW.xz);',
    '    float oa = oc.a*uOrthoMix;',
    '    vec3 olit = oc.rgb*(0.64*uSkyCol + 0.5*lamb*vis*uSunCol);',
    '    lit = mix(lit, olit, oa);',
    '    col = mix(col, lit, uSunMix);',
    '    cont *= (1.0 - oa);',
    '    wc *= mix(1.0, 0.72 + 0.28*vis, uSunMix);',
    '  }',
    '  col = mix(col, uContour, cont*uContourA*(0.2+0.8*inside)*(1.0-water));',
    '  col = mix(col, uOut, clamp(uHiAny-hv, 0.0, 1.0)*0.38*inside*(1.0-water));',
    '  col = mix(col, uHi, clamp(hv*0.08+hov*0.12, 0.0, 0.3)*(1.0-water));',
    '  col = mix(col, wc, water);',
    '  col = mix(col, uOut, uFocus*(1.0-inside)*0.52);',
    '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});
var BOT = -900;
var sideMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: { uA: { value: C['--m-side'] }, uB: { value: C['--m-side-2'] }, uFog: U.uFog, uFogNear: U.uFogNear, uFogFar: U.uFogFar, uVZ: U.uVZ },
  vertexShader: 'uniform float uVZ; attribute float aT; varying float vT; varying float vDist; void main(){ vT=aT; vec3 p=position; p.y = aT>0.5 ? ' + BOT.toFixed(1) + ' : p.y*uVZ; vec4 w=modelMatrix*vec4(p,1.0); vDist=distance(w.xyz,cameraPosition); gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: 'uniform vec3 uA,uB,uFog; uniform float uFogNear,uFogFar; varying float vT; varying float vDist; void main(){ vec3 c=mix(uA,uB,smoothstep(0.0,1.0,vT)); c=mix(c,uFog,smoothstep(uFogNear,uFogFar,vDist)*0.85); gl_FragColor=vec4(c,1.0); }'
});
var dropMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uC: { value: new THREE.Color() }, uA: { value: 0.16 } },
  vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 uC; uniform float uA; varying vec2 vP; void main(){ vec2 q=abs(vP)/vec2(17000.0,16000.0); float d=length(max(q-0.8,0.0))*3.0; float a=(1.0-smoothstep(0.0,1.0,d))*uA; gl_FragColor=vec4(uC,a); }'
});

/* buildings */
var BLD_VS = [
  'attribute vec4 aB; uniform float uGrow, uVZ, uBZ;',
  'varying vec3 vW; varying float vRel; varying float vDist;',
  'void main(){',
  '  float g = smoothstep(aB.w, aB.w + 0.16, uGrow);',
  '  float base = aB.x*uVZ - 2.5;',
  '  float top = aB.x*uVZ + aB.y*uVZ + aB.z*uBZ;',
  '  float H = max(top - base, 2.0);',
  '  vec3 p = vec3(position.x, base + position.y*H*g, position.z);',
  '  vRel = position.y*H*g;',
  '  vec4 w = modelMatrix*vec4(p,1.0); vW = w.xyz; vDist = distance(w.xyz, cameraPosition);',
  '  gl_Position = projectionMatrix*viewMatrix*w; }'
].join('\n');
var bldMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ uGrow: { value: 0 }, uRoof: { value: C['--m-roof'] }, uWall: { value: C['--m-wall'] }, uWin: { value: C['--m-window'] } }, U),
  vertexShader: BLD_VS,
  fragmentShader: [
    'uniform vec3 uRoof, uWall, uWin, uFog; uniform float uDark, uFogNear, uFogFar, uBZ;',
    LIGHT, SHADOW, ORTHO, COMMON,
    'varying vec3 vW; varying float vRel; varying float vDist;',
    'void main(){',
    '  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));',
    '  float roof = step(0.6, abs(n.y));',
    '  vec3 fixedL = normalize(vec3(-0.55, 0.62, -0.56));',
    '  float lam0 = 0.66 + 0.34*max(dot(n, fixedL), 0.0);',
    '  vec3 col = mix(uWall*lam0, uRoof*(0.92+0.08*lam0), roof);',
    '  col *= mix(0.9, 1.0, smoothstep(0.0, 8.0*uBZ, vRel));',
    '  if(uSunMix > 0.001){',
    '    float lamb = max(dot(n, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, n, lamb) : 0.0;',
    '    vec3 alb = mix(uWall, uRoof, roof);',
    '    vec4 oc = orthoAt(vW.xz);',
    '    alb = mix(alb, oc.rgb*1.12, roof*oc.a*uOrthoMix);',
    '    vec3 lit = alb*(uAmb*uSkyCol + uDif*lamb*vis*uSunCol);',
    '    col = mix(col, lit, uSunMix);',
    '  }',
    '  if(uDark > 0.5){',
    '    float fl = (vRel - 2.2*uBZ)/(3.1*uBZ);',
    '    float u = abs(n.x) > abs(n.z) ? vW.z : vW.x; float cu = u/3.3;',
    '    vec2 f = vec2(fract(cu), fract(fl));',
    '    float far = smoothstep(0.3, 0.85, max(fwidth(fl), fwidth(cu)));',
    '    float win = step(0.22,f.x)*step(f.x,0.78)*step(0.3,f.y)*step(f.y,0.78)*step(0.0,fl);',
    '    float lit2 = step(0.58, hash(vec2(floor(cu), floor(fl)) + floor(vW.xz/37.0)));',
    '    float glow = hash(floor(vW.xz/23.0));',
    '    float wall = 1.0 - roof;',
    '    col = mix(col, uWin, wall*mix(win*lit2, (0.03+0.13*glow*glow)*step(0.35, glow), far));',
    '  }',
    '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});

/* trees */
var TREE_VS = [
  'attribute vec4 aT; attribute float aG; attribute float aPart; uniform float uVZ, uTreeGrow;',
  'varying vec3 vW; varying vec3 vN; varying float vDist; varying float vPart;',
  'void main(){',
  '  float h = aT.z*uTreeGrow; float r = aT.w*mix(0.4,1.0,uTreeGrow); float hb = 0.3*h;',
  '  vec3 p = position; vec3 nrm = normal;',
  '  if(aPart < 0.5){',
  '    float ry = max((h - hb)*0.5, r*0.6);',
  '    p = vec3(position.x*r, hb + ry + position.y*ry, position.z*r);',
  '    nrm = normalize(vec3(normal.x/r, normal.y/ry, normal.z/r));',
  '  } else {',
  '    float tr = max(0.16, r*0.07);',
  '    p = vec3(position.x*tr, position.y*(hb + 0.6), position.z*tr);',
  '  }',
  '  vec3 w = vec3(aT.x, aG*uVZ - 0.4, aT.y) + p;',
  '  vW = w; vN = nrm; vPart = aPart; vDist = distance(w, cameraPosition);',
  '  gl_Position = projectionMatrix*viewMatrix*vec4(w, 1.0);',
  '}'
].join('\n');
var treeMat = new THREE.ShaderMaterial({
  uniforms: Object.assign({ uTreeGrow: { value: 0 }, uTree: { value: C['--m-tree'] }, uTrunk: { value: C['--m-trunk'] } }, U),
  vertexShader: TREE_VS,
  fragmentShader: [
    'uniform vec3 uTree, uTrunk, uFog; uniform float uFogNear, uFogFar;',
    LIGHT, SHADOW, ORTHO,
    'varying vec3 vW; varying vec3 vN; varying float vDist; varying float vPart;',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  vec3 alb = vPart < 0.5 ? uTree : uTrunk;',
    '  if(vPart < 0.5){ vec4 oc = orthoAt(vW.xz); float lum = dot(oc.rgb, vec3(0.3,0.59,0.11)); vec3 summer = vec3(0.25,0.38,0.2)*(0.7+1.1*lum); alb = mix(alb, mix(oc.rgb, summer, 0.62)*uOrthoDim, oc.a*uOrthoMix*0.95); }',
    '  vec3 fixedL = normalize(vec3(-0.5, 0.7, -0.5));',
    '  vec3 col = alb*(0.74 + 0.3*max(dot(n, fixedL), 0.0));',
    '  if(uSunMix > 0.001){',
    '    float lamb = max(dot(n, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, n, lamb) : 0.0;',
    '    vec3 lit = alb*(uAmb*uSkyCol*(0.75+0.25*n.y) + uDif*lamb*vis*uSunCol);',
    '    col = mix(col, lit, uSunMix);',
    '  }',
    '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});

/* ribbons */
function ribbonMat(colorKey, widthPx, opacity, opts) {
  opts = opts || {};
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6,
    uniforms: {
      uColor: { value: C[colorKey] }, uWidth: { value: widthPx }, uOpacity: { value: opacity }, uDraw: { value: 1 },
      uDash: { value: opts.dash ? 1 : 0 }, uFlow: { value: opts.flow ? 1 : 0 }, uLift: { value: opts.lift || 3 },
      uPx: U.uPx, uTime: U.uTime, uFog: U.uFog, uFogNear: U.uFogNear, uFogFar: U.uFogFar, uVZ: U.uVZ
    },
    vertexShader: [
      'attribute vec3 aDir; attribute float aSide; attribute float aAlong; attribute float aM;',
      'uniform float uWidth; uniform float uPx; uniform float uVZ; uniform float uLift;',
      'varying float vAlong; varying float vSide; varying float vDist; varying float vM; varying float vPxW;',
      'void main(){ vec3 pos=position; pos.y*=uVZ; vec4 w=modelMatrix*vec4(pos,1.0); float dist=distance(w.xyz,cameraPosition);',
      '  float pxw=uPx*dist; float hw=uWidth*pxw*0.5+0.4;',
      '  w.xyz += aDir*aSide*hw; w.y += uLift + hw*0.7;',
      '  vAlong=aAlong; vSide=aSide; vDist=dist; vM=aM; vPxW=pxw;',
      '  gl_Position=projectionMatrix*viewMatrix*w; }'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor, uFog; uniform float uOpacity, uDraw, uDash, uFlow, uTime, uFogNear, uFogFar;',
      'varying float vAlong; varying float vSide; varying float vDist; varying float vM; varying float vPxW;',
      'void main(){',
      '  if(vAlong > uDraw) discard;',
      '  float a = 1.0 - smoothstep(0.55, 1.0, abs(vSide));',
      '  if(uDash > 0.5){ float per = vPxW*12.0; a *= step(fract(vM/per), 0.62); }',
      '  vec3 c = uColor;',
      '  if(uFlow > 0.5){ float pulse = smoothstep(0.75, 1.0, fract(vM/900.0 - uTime*0.35)); c = mix(c, vec3(1.0), pulse*0.45); a *= 0.82 + 0.18*pulse;',
      '    a *= smoothstep(0.0, 0.004, uDraw - vAlong + 0.0001); }',
      '  c = mix(c, uFog, smoothstep(uFogNear, uFogFar, vDist)*0.9);',
      '  gl_FragColor = vec4(c, a*uOpacity);',
      '}'
    ].join('\n')
  });
}

/* depth-only materials for the sun's shadow map */
var DEPTH_FS = 'void main(){ gl_FragColor = vec4(1.0); }';
var terrainDepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ }, vertexShader: 'uniform float uVZ; void main(){ vec3 p=position; p.y*=uVZ; gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(p,1.0); }', fragmentShader: DEPTH_FS });
var bldDepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ, uBZ: U.uBZ, uGrow: bldMat.uniforms.uGrow }, vertexShader: BLD_VS, fragmentShader: DEPTH_FS });
var treeDepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ, uTreeGrow: treeMat.uniforms.uTreeGrow }, vertexShader: TREE_VS, fragmentShader: DEPTH_FS });
[terrainDepthMat, bldDepthMat, treeDepthMat].forEach(function (m) { m.colorWrite = false; m.side = THREE.DoubleSide; });

/* theme */
function readTheme() {
  var cs = getComputedStyle(document.documentElement);
  Object.keys(C).forEach(function (k) { var v = cs.getPropertyValue(k).trim(); if (v) C[k].set(v); });
  U.uFog.value.copy(C['--paper']);
  var dark = parseFloat(cs.getPropertyValue('--m-dark')) || 0;
  U.uDark.value = dark;
  U.uSunCol.value.copy(C['--m-sun']); U.uSkyCol.value.copy(C['--m-sky']);
  U.uAmb.value = dark ? 0.62 : 0.5; U.uDif.value = dark ? 0.5 : 0.62;
  U.uOrthoDim.value = dark ? 0.58 : 1.0;
  dropMat.uniforms.uA.value = dark ? 0.35 : 0.15;
  dropMat.uniforms.uC.value.copy(dark ? new THREE.Color(0, 0, 0) : C['--ink']);
  if (MK.mat) { MK.mat.uniforms.uFill.value.copy(C['--m-pin']); }
  smState.need = true;
}

/* ---------------- terrain ---------------- */
var terrainMesh = null;
function buildTerrain(stride) {
  var cols = (nx - 1) / stride + 1, rows = (ny - 1) / stride + 1;
  var pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2);
  for (var r = 0; r < rows; r++) {
    var j = r * stride, N = G.N1 - j * G.step;
    for (var c = 0; c < cols; c++) {
      var i = c * stride, E = G.E0 + i * G.step, k = r * cols + c;
      pos[k * 3] = X(E); pos[k * 3 + 1] = HT[j * nx + i] - H0; pos[k * 3 + 2] = Z(N);
      uv[k * 2] = (E - G.E0) / (G.E1 - G.E0); uv[k * 2 + 1] = (N - G.N0) / (G.N1 - G.N0);
    }
  }
  var idx = new Uint32Array((cols - 1) * (rows - 1) * 6), t = 0;
  for (r = 0; r < rows - 1; r++) for (c = 0; c < cols - 1; c++) {
    var a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
    idx[t++] = a; idx[t++] = d; idx[t++] = b; idx[t++] = b; idx[t++] = d; idx[t++] = e;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 40000);
  terrainMesh = new THREE.Mesh(geo, terrainMat); terrainMesh.frustumCulled = false;
  scene.add(terrainMesh);
  var dm = new THREE.Mesh(geo, terrainDepthMat); dm.frustumCulled = false; smScene.add(dm);
  var sp = [], st = [], si = [], vi = 0;
  function side(list) {
    for (var q = 0; q < list.length; q++) {
      var p = list[q]; sp.push(p[0], p[1], p[2], p[0], p[1], p[2]); st.push(0, 1);
      if (q > 0) { si.push(vi - 2, vi - 1, vi, vi - 1, vi + 1, vi); }
      vi += 2;
    }
  }
  function edge(fixedRow, fixedCol) {
    var L = [];
    if (fixedRow !== null) for (var i = 0; i < nx; i += stride) L.push([X(G.E0 + i * G.step), HT[fixedRow * nx + i] - H0, Z(G.N1 - fixedRow * G.step)]);
    else for (var j = 0; j < ny; j += stride) L.push([X(G.E0 + fixedCol * G.step), HT[j * nx + fixedCol] - H0, Z(G.N1 - j * G.step)]);
    return L;
  }
  side(edge(0, null)); side(edge(ny - 1, null)); side(edge(null, 0)); side(edge(null, nx - 1));
  var sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('aT', new THREE.Float32BufferAttribute(st, 1));
  sg.setIndex(si);
  var sm = new THREE.Mesh(sg, sideMat); sm.frustumCulled = false; scene.add(sm);
  var drop = new THREE.Mesh(new THREE.PlaneGeometry(52000, 50000), dropMat);
  drop.rotation.x = -Math.PI / 2; drop.position.set(600, BOT - 40, 900); drop.renderOrder = -1;
  scene.add(drop);
}

/* ---------------- ribbons ---------------- */
function toLines(arrs) {
  return arrs.map(function (a) { var o = []; for (var i = 0; i < a.length; i += 2) o.push([a[i] + G.E0, a[i + 1] + G.N0]); return o; });
}
function buildRibbon(lines, mat, gapBetween, step) {
  var P = [], DIR = [], SIDE = [], AL = [], AM = [], IDX = [], base = 0, cum = 0, stp = step || 28;
  lines.forEach(function (pts, li) {
    if (li > 0 && gapBetween) { var pe = lines[li - 1][lines[li - 1].length - 1]; cum += Math.hypot(pts[0][0] - pe[0], pts[0][1] - pe[1]); }
    var dp = [];
    for (var i = 0; i < pts.length; i++) {
      if (i > 0) {
        var a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / stp);
        for (var s = 1; s < n; s++) dp.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]);
      }
      dp.push(pts[i]);
    }
    var m = dp.length; if (m < 2) return;
    for (i = 0; i < m; i++) {
      var p = dp[i], pr = dp[Math.max(0, i - 1)], nxp = dp[Math.min(m - 1, i + 1)];
      if (i > 0) cum += Math.hypot(p[0] - pr[0], p[1] - pr[1]);
      var tx = X(nxp[0]) - X(pr[0]), tz = Z(nxp[1]) - Z(pr[1]), tl = Math.hypot(tx, tz) || 1;
      var dx = -tz / tl, dz = tx / tl, y = hAt(p[0], p[1]) - H0;
      for (var sd = -1; sd <= 1; sd += 2) { P.push(X(p[0]), y, Z(p[1])); DIR.push(dx, 0, dz); SIDE.push(sd); AM.push(cum); }
      if (i < m - 1) { var q = base + 2 * i; IDX.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    }
    base += 2 * m;
  });
  for (var k = 0; k < AM.length; k++) AL.push(cum > 0 ? AM[k] / cum : 0);
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(DIR, 3));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(SIDE, 1));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(AL, 1));
  g.setAttribute('aM', new THREE.Float32BufferAttribute(AM, 1));
  g.setIndex(IDX); g.computeBoundingSphere();
  var mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  scene.add(mesh); return mesh;
}
var R = {};

/* ---------------- buildings ---------------- */
var bldMesh = null, bldGrowingPrev = -1;
function buildBuildings(bb) {
  var dv = new DataView(bb.buffer, bb.byteOffset, bb.byteLength);
  var nB = dv.getUint32(0, true), nR = dv.getUint32(4, true), nV = dv.getUint32(8, true), nVar = dv.getUint32(12, true);
  var o = 16;
  var NR = bb.subarray(o, o + nB); o += nB; var NV = bb.subarray(o, o + nR); o += nR;
  var HH = bb.subarray(o, o + nB); o += nB; o += nB; var VB = bb.subarray(o, o + nVar);
  var XY = new Float64Array(nV * 2), p = 0, ax = 0, ay = 0, BE0 = D.bld.BE0, BN0 = D.bld.BN0;
  for (var k = 0; k < nV * 2; k++) {
    var v = 0, sh = 0, by;
    do { by = VB[p++]; v += (by & 127) * Math.pow(2, sh); sh += 7; } while (by & 128);
    var d = (v % 2) ? -(v + 1) / 2 : v / 2;
    if (k & 1) { ay += d; XY[k] = BN0 + ay / 2; } else { ax += d; XY[k] = BE0 + ax / 2; }
  }
  var maxV = nV * 5, POS = new Float32Array(maxV * 3), AB = new Float32Array(maxV * 4), IDX = new Uint32Array(nV * 9 + nR * 6 + 64);
  var vi = 0, ii = 0, rp = 0, vp = 0, b = 0;
  var zE = D.zyt[0], zN = D.zyt[1];
  var V2 = []; for (k = 0; k < 300; k++) V2.push(new THREE.Vector2());
  var cb, cr, ch, cd;
  function pushV(x, top, z) { POS[vi * 3] = x; POS[vi * 3 + 1] = top; POS[vi * 3 + 2] = z; AB[vi * 4] = cb; AB[vi * 4 + 1] = cr; AB[vi * 4 + 2] = ch; AB[vi * 4 + 3] = cd; return vi++; }
  function tri(a, bq, c) {
    var ny_ = (POS[bq * 3 + 2] - POS[a * 3 + 2]) * (POS[c * 3] - POS[a * 3]) - (POS[bq * 3] - POS[a * 3]) * (POS[c * 3 + 2] - POS[a * 3 + 2]);
    if (ny_ >= 0) { IDX[ii++] = a; IDX[ii++] = bq; IDX[ii++] = c; } else { IDX[ii++] = a; IDX[ii++] = c; IDX[ii++] = bq; }
  }
  return new Promise(function (resolve) {
    function chunk() {
      var end = Math.min(nB, b + (small ? 1800 : 3200));
      for (; b < end; b++) {
        var rings = NR[b], h = HH[b], ringInfo = [], minH = 1e9, sumH = 0, cnt = 0, sE = 0, sN = 0;
        for (var r = 0; r < rings; r++) { var n = NV[rp + r]; ringInfo.push([vp, n]);
          for (var q = 0; q < n; q++) { var E = XY[(vp + q) * 2], N = XY[(vp + q) * 2 + 1], hh = hAt(E, N); if (hh < minH) minH = hh; sumH += hh; cnt++; sE += E; sN += N; }
          vp += n; }
        rp += rings;
        var cE = sE / cnt, cN = sN / cnt;
        cb = minH - H0; cr = sumH / cnt - minH; ch = h;
        cd = clamp(Math.hypot(cE - zE, cN - zN) / 15000, 0, 1) * 0.8 + ((b * 2654435761 >>> 0) % 1000) / 1000 * 0.05;
        for (r = 0; r < rings; r++) {
          var s0 = ringInfo[r][0], cntR = ringInfo[r][1];
          for (q = 0; q < cntR; q++) {
            var i0 = s0 + q, i1 = s0 + (q + 1) % cntR;
            var x0 = X(XY[i0 * 2]), z0 = Z(XY[i0 * 2 + 1]), x1 = X(XY[i1 * 2]), z1 = Z(XY[i1 * 2 + 1]);
            var A = pushV(x0, 0, z0), Bv = pushV(x1, 0, z1), At = pushV(x0, 1, z0), Bt = pushV(x1, 1, z1);
            IDX[ii++] = A; IDX[ii++] = Bv; IDX[ii++] = Bt; IDX[ii++] = A; IDX[ii++] = Bt; IDX[ii++] = At;
          }
        }
        var first = vi;
        for (r = 0; r < rings; r++) { s0 = ringInfo[r][0]; cntR = ringInfo[r][1];
          for (q = 0; q < cntR; q++) pushV(X(XY[(s0 + q) * 2]), 1, Z(XY[(s0 + q) * 2 + 1])); }
        var n0 = ringInfo[0][1];
        if (rings === 1 && n0 === 3) { tri(first, first + 1, first + 2); }
        else if (rings === 1 && n0 === 4) {
          var sgn = function (a, bq, c) { return (POS[bq * 3 + 2] - POS[a * 3 + 2]) * (POS[c * 3] - POS[a * 3]) - (POS[bq * 3] - POS[a * 3]) * (POS[c * 3 + 2] - POS[a * 3 + 2]); };
          var s1 = sgn(first, first + 1, first + 2), s2 = sgn(first, first + 2, first + 3);
          if (s1 * s2 > 0) { tri(first, first + 1, first + 2); tri(first, first + 2, first + 3); }
          else { tri(first + 1, first + 2, first + 3); tri(first + 1, first + 3, first); }
        } else {
          var contour = [], holes = [], used = 0;
          for (r = 0; r < rings; r++) {
            var arr = []; cntR = ringInfo[r][1];
            for (q = 0; q < cntR; q++) { var vv = V2[used] || (V2[used] = new THREE.Vector2()); used++; vv.set(POS[(first + used - 1) * 3], POS[(first + used - 1) * 3 + 2]); arr.push(vv); }
            if (r === 0) contour = arr; else holes.push(arr);
          }
          var faces;
          try { faces = THREE.ShapeUtils.triangulateShape(contour, holes); } catch (e) { faces = []; }
          for (q = 0; q < faces.length; q++) tri(first + faces[q][0], first + faces[q][1], first + faces[q][2]);
        }
      }
      if (b < nB) { setTimeout(chunk, 0); return; }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(POS.subarray(0, vi * 3), 3));
      geo.setAttribute('aB', new THREE.BufferAttribute(AB.subarray(0, vi * 4), 4));
      geo.setIndex(new THREE.BufferAttribute(IDX.subarray(0, ii), 1));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 40000);
      bldMesh = new THREE.Mesh(geo, bldMat); bldMesh.frustumCulled = false;
      scene.add(bldMesh);
      var dm = new THREE.Mesh(geo, bldDepthMat); dm.frustumCulled = false; smScene.add(dm);
      smState.need = true;
      resolve(nB);
    }
    chunk();
  });
}

/* ---------------- trees (from swissSURFACE3D crowns) ---------------- */
var TR = null, MAXT = small ? 4000 : 9000;
var treeGeo = new THREE.InstancedBufferGeometry(), treeMesh = null, treeKey = '';
(function () {
  var ico = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(); ico.computeVertexNormals();
  var cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).toNonIndexed(); cyl.translate(0, 0.5, 0);
  var a = ico.attributes.position.array, an = ico.attributes.normal.array, b = cyl.attributes.position.array, bn = cyl.attributes.normal.array;
  var pos = new Float32Array(a.length + b.length), nor = new Float32Array(a.length + b.length), part = new Float32Array((a.length + b.length) / 3);
  pos.set(a); pos.set(b, a.length); nor.set(an); nor.set(bn, a.length);
  for (var i = a.length / 3; i < part.length; i++) part[i] = 1;
  treeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  treeGeo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  treeGeo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  treeGeo.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(MAXT * 4), 4).setUsage(THREE.DynamicDrawUsage));
  treeGeo.setAttribute('aG', new THREE.InstancedBufferAttribute(new Float32Array(MAXT), 1).setUsage(THREE.DynamicDrawUsage));
  treeGeo.instanceCount = 0;
  treeGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 40000);
})();
function buildTrees(bytes) {
  var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), n = dv.getUint32(0, true), o = 4;
  var qE = new Uint16Array(bytes.slice(o, o + n * 2).buffer); o += n * 2;
  var qN = new Uint16Array(bytes.slice(o, o + n * 2).buffer); o += n * 2;
  var qh = bytes.subarray(o, o + n); o += n; var qr = bytes.subarray(o, o + n);
  var Xs = new Float32Array(n), Zs = new Float32Array(n), Hs = new Float32Array(n), Rs = new Float32Array(n), Gs = new Float32Array(n), cells = {};
  for (var i = 0; i < n; i++) {
    var E = E0F + qE[i] * 0.55, N = N0F + qN[i] * 0.55;
    Xs[i] = X(E); Zs[i] = Z(N); Hs[i] = qh[i] / 4; Rs[i] = qr[i] / 20; Gs[i] = hAt(E, N) - H0;
    var key = Math.floor((E - E0F) / 250) + ',' + Math.floor((N - N0F) / 250);
    (cells[key] || (cells[key] = [])).push(i);
  }
  TR = { n: n, X: Xs, Z: Zs, H: Hs, R: Rs, G: Gs, cells: cells };
  treeMesh = new THREE.Mesh(treeGeo, treeMat); treeMesh.frustumCulled = false; scene.add(treeMesh);
  var dm = new THREE.Mesh(treeGeo, treeDepthMat); dm.frustumCulled = false; smScene.add(dm);
  return n;
}
function updateTrees() {
  if (!TR) return;
  if (cam.d > 3400 || treeMat.uniforms.uTreeGrow.value < 0.01) { if (treeGeo.instanceCount) { treeGeo.instanceCount = 0; smState.need = true; } treeKey = ''; return; }
  var Rr = clamp(cam.d * 0.85, 420, small ? 1200 : 1800);
  var key = Math.round(cam.E / 120) + ',' + Math.round(cam.N / 120) + ',' + Math.round(Rr / 200);
  if (key === treeKey) return;
  treeKey = key;
  var aT = treeGeo.attributes.aT, aG = treeGeo.attributes.aG, A = aT.array, Gd = aG.array, c = 0;
  var ce = Math.floor((cam.E - E0F) / 250), cn = Math.floor((cam.N - N0F) / 250), rc = Math.ceil(Rr / 250);
  var list = [];
  for (var dx = -rc; dx <= rc; dx++) for (var dy = -rc; dy <= rc; dy++) {
    var dd = Math.hypot(dx, dy) * 250; if (dd > Rr + 360) continue;
    var cl = TR.cells[(ce + dx) + ',' + (cn + dy)]; if (cl) list.push([dd, cl]);
  }
  list.sort(function (a, b) { return a[0] - b[0]; });
  for (var li = 0; li < list.length && c < MAXT; li++) {
    var cl2 = list[li][1];
    for (var k = 0; k < cl2.length && c < MAXT; k++) {
      var i = cl2[k];
      A[c * 4] = TR.X[i]; A[c * 4 + 1] = TR.Z[i]; A[c * 4 + 2] = TR.H[i]; A[c * 4 + 3] = TR.R[i]; Gd[c] = TR.G[i]; c++;
    }
  }
  treeGeo.instanceCount = c;
  aT.needsUpdate = true; aG.needsUpdate = true;
  smState.need = true;
}

/* ---------------- sun shadow map ---------------- */
var smScene = new THREE.Scene();
var smRT = new THREE.WebGLRenderTarget(SM, SM, { depthBuffer: true, stencilBuffer: false, format: THREE.RedFormat, type: THREE.UnsignedByteType, generateMipmaps: false });
smRT.depthTexture = new THREE.DepthTexture(SM, SM);
smRT.depthTexture.minFilter = THREE.NearestFilter; smRT.depthTexture.magFilter = THREE.NearestFilter;
var smCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 10, 60000);
var smBias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
var smState = { cx: 1e9, cz: 1e9, R: 1, t: -1, vz: -1, need: true, frames: 0 };
var tmpV3 = new THREE.Vector3();
function updateShadow(now) {
  var on = U.uSunMix.value * sstep(0.5, 4, sun.alt);
  if (on < 0.01) { U.uShadowOn.value = 0; return; }
  var Rr = clamp(cam.d * 0.9, 240, 9000);
  var tx = X(cam.E), tz = Z(cam.N);
  var need = smState.need || Math.hypot(tx - smState.cx, tz - smState.cz) > smState.R * 0.08 || Math.abs(Rr / smState.R - 1) > 0.14 ||
    Math.abs(sunT - smState.t) > 0.003 || Math.abs(vz - smState.vz) > 0.004 || bldMat.uniforms.uGrow.value !== bldGrowingPrev;
  U.uShadowOn.value = on;
  if (!need) return;
  bldGrowingPrev = bldMat.uniforms.uGrow.value;
  var snap = Rr / 64;
  tx = Math.round(tx / snap) * snap; tz = Math.round(tz / snap) * snap;
  var ty = Y(hAt(cam.E, cam.N));
  smCam.position.set(tx, ty, tz).addScaledVector(U.uSunDir.value, 26000);
  smCam.up.set(0, 1, 0);
  if (Math.abs(U.uSunDir.value.y) > 0.995) smCam.up.set(0, 0, -1);
  smCam.lookAt(tx, ty, tz);
  smCam.left = -Rr; smCam.right = Rr; smCam.top = Rr; smCam.bottom = -Rr; smCam.near = 12000; smCam.far = 40000;
  smCam.updateProjectionMatrix(); smCam.updateMatrixWorld(true);
  U.uShadowMat.value.multiplyMatrices(smBias, smCam.projectionMatrix).multiply(smCam.matrixWorldInverse);
  U.uShadowTexel.value = 2 * Rr / SM; U.uShadowRange.value = smCam.far - smCam.near;
  U.uShadowMap.value = smRT.depthTexture;
  renderer.setRenderTarget(smRT); renderer.clear(true, true, false); renderer.render(smScene, smCam); renderer.setRenderTarget(null);
  smState.cx = tx; smState.cz = tz; smState.R = Rr; smState.t = sunT; smState.vz = vz; smState.need = false; smState.frames++;
}

/* ---------------- aerial images (SWISSIMAGE tiles, loaded on demand) ---------------- */
var OR = (function () {
  var S = small ? 1024 : 2048;
  function level(sz) {
    var cv = document.createElement('canvas'); cv.width = cv.height = sz;
    var tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return { cv: cv, ctx: cv.getContext('2d'), tex: tex, S: sz, x0: 0, z0: 0, size: 1, ok: false, sig: '' };
  }
  var la = {}, lb = {};
  (D.ortho.la || []).forEach(function (t) { la[t[0] + '_' + t[1]] = 1; });
  (D.ortho.lb || []).forEach(function (t) { lb[t[0] + '_' + t[1]] = 1; });
  return { F: level(S), C: level(S), la: la, lb: lb, cache: {}, queue: [], inflight: 0, dirty: false, lastCompose: 0, listeners: [] };
})();
function oURL(lv, x0, y0) { return lv === 'la' ? 'o/la/' + (x0 / 1000) + '_' + (y0 / 1000) + '.webp' : 'o/lb/' + (x0 / 10) + '_' + (y0 / 10) + '.webp'; }
function oTile(lv, x0, y0, prio) {
  var key = lv + x0 + '_' + y0, c = OR.cache[key];
  if (c) { if (c.img) { c.used = performance.now(); return c.img; } if (!c.failed && c.queued) c.prio = Math.min(c.prio, prio); return null; }
  c = OR.cache[key] = { lv: lv, x0: x0, y0: y0, prio: prio, queued: true, img: null, failed: false, used: performance.now() };
  OR.queue.push(c);
  return null;
}
function oPump() {
  if (!OR.queue.length) return;
  OR.queue.sort(function (a, b) { return a.prio - b.prio; });
  while (OR.inflight < 6 && OR.queue.length) {
    var c = OR.queue.shift(); c.queued = false; OR.inflight++;
    (function (c) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { c.img = im; OR.inflight--; OR.dirty = true; OR.listeners.slice().forEach(function (f) { f(); }); oPump(); };
      im.onerror = function () { c.failed = true; OR.inflight--; oPump(); };
      im.src = oURL(c.lv, c.x0, c.y0);
    })(c);
  }
}
function oCompose(L, cx, cz, size, useLB) {
  var S = L.S, ctx = L.ctx, x0 = cx - size / 2, z0 = cz - size / 2;
  var Emin = x0 + EC, Nmax = NC - z0, Emax = Emin + size, Nmin = Nmax - size, scale = S / size, any = false;
  ctx.clearRect(0, 0, S, S);
  function draw(lv, step) {
    for (var x = Math.floor(Emin / step) * step; x < Emax; x += step) for (var y = Math.floor(Nmin / step) * step; y < Nmax; y += step) {
      var key = x + '_' + y; if (!(lv === 'la' ? OR.la : OR.lb)[key]) continue;
      var prio = Math.hypot(x + step / 2 - (cx + EC), y + step / 2 - (NC - cz)) / (lv === 'lb' ? 3 : 1);
      var img = oTile(lv, x, y, prio);
      if (!img) continue;
      var dx = Math.floor((x - Emin) * scale), dy = Math.floor((Nmax - (y + step)) * scale), dw = Math.ceil(step * scale) + 1;
      ctx.drawImage(img, dx, dy, dw, dw); any = true;
    }
  }
  draw('la', 2000);
  if (useLB) draw('lb', 500);
  L.x0 = x0; L.z0 = z0; L.size = size; L.ok = any;
  L.tex.needsUpdate = true;
  oPump();
}
function updateOrtho(now) {
  var want = photoOn && cam.d < 4200;
  if (!want) { U.uOrthoMix.value = 0; return; }
  var Fs = clamp(cam.d * 1.35, 420, 2800), Cs = clamp(cam.d * 4.6, 2600, 16000);
  var tx = X(cam.E), tz = Z(cam.N);
  function needs(L, s) { return !L.ok || Math.hypot(tx - (L.x0 + L.size / 2), tz - (L.z0 + L.size / 2)) > L.size * 0.16 || Math.abs(s / L.size - 1) > 0.25; }
  var dirtyOK = OR.dirty && now - OR.lastCompose > 140;
  if (needs(OR.F, Fs) || dirtyOK) { var sn = Fs / 16; oCompose(OR.F, Math.round(tx / sn) * sn, Math.round(tz / sn) * sn, Fs, true); }
  if (needs(OR.C, Cs) || dirtyOK) { var sc = Cs / 16; oCompose(OR.C, Math.round(tx / sc) * sc, Math.round(tz / sc) * sc, Cs, false); }
  if (dirtyOK) { OR.dirty = false; OR.lastCompose = now; }
  U.uOrthoF.value = OR.F.tex; U.uOrthoC.value = OR.C.tex;
  U.uOrthoFRect.value.set(OR.F.x0, OR.F.z0, OR.F.size, OR.F.ok ? 1 : 0);
  U.uOrthoCRect.value.set(OR.C.x0, OR.C.z0, OR.C.size, OR.C.ok ? 1 : 0);
  U.uOrthoMix.value = sstep(3600, 1900, cam.d);
}
function drawCrop(cv, p) {
  var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, size = p.poly ? 150 : 120, scale = W / size;
  var Emin = p.E - size / 2, Nmax = p.N + size * H / W / 2, Emax = Emin + size, Nmin = Nmax - size * H / W;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--mist') || '#ddd'; ctx.fillRect(0, 0, W, H);
  var any = false;
  [['la', 2000], ['lb', 500]].forEach(function (L) {
    var lv = L[0], step = L[1];
    for (var x = Math.floor(Emin / step) * step; x < Emax; x += step) for (var y = Math.floor(Nmin / step) * step; y < Nmax; y += step) {
      if (!(lv === 'la' ? OR.la : OR.lb)[x + '_' + y]) continue;
      var img = oTile(lv, x, y, -1); if (!img) continue;
      ctx.drawImage(img, (x - Emin) * scale, (Nmax - (y + step)) * scale, step * scale + 1, step * scale + 1); any = true;
    }
  });
  oPump();
  if (p.poly) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    p.poly.forEach(function (ring) {
      ctx.beginPath();
      for (var k = 0; k < ring.length; k += 2) { var px = (p.E + ring[k] / 2 - Emin) * scale, py = (Nmax - (p.N + ring[k + 1] / 2)) * scale; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke();
    });
    ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2, 12, 0, Math.PI * 2); ctx.stroke();
  }
  return any;
}

/* ---------------- markers ---------------- */
var MK = { pts: null, mat: null, geo: null, items: [], screen: null };
var markerVisDirty = true, markerShadeDirty = true, photoOn = true, showWater = false, showWC = false;
function buildAtlas() {
  var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff';
  ICONKEYS.forEach(function (k, i) {
    var cx = (i % 4) * 128, cy = Math.floor(i / 4) * 128;
    ctx.save(); ctx.translate(cx + 14, cy + 14); ctx.scale(100 / 24, 100 / 24);
    ctx.fill(new Path2D(ICON[k]), k === 'sport' ? 'evenodd' : 'nonzero'); ctx.restore();
  });
  var t = new THREE.CanvasTexture(cv); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
function buildMarkers() {
  var items = [];
  PL.forEach(function (p) { items.push({ type: 'p', p: p, cat: p.cat, E: p.E, N: p.N }); });
  (F.svc.w || []).forEach(function (w) { items.push({ type: 'w', cat: 6, E: w[0] + E0F, N: w[1] + N0F }); });
  (F.svc.c || []).forEach(function (w) { items.push({ type: 'c', cat: 7, E: w[0] + E0F, N: w[1] + N0F, wick: !!w[2] }); });
  var n = items.length, pos = new Float32Array(n * 3), info = new Float32Array(n * 4), vis = new Float32Array(n), sel = new Float32Array(n);
  items.forEach(function (it, i) {
    it.g = hAt(it.E, it.N) - H0;
    pos[i * 3] = X(it.E); pos[i * 3 + 1] = it.g; pos[i * 3 + 2] = Z(it.N);
    info[i * 4] = it.cat; info[i * 4 + 1] = it.p && it.p.zt ? 1 : 0; info[i * 4 + 2] = 0; info[i * 4 + 3] = it.p && it.p.s ? 1 : 0;
  });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  geo.setAttribute('aVis', new THREE.BufferAttribute(vis, 1));
  geo.setAttribute('aSel', new THREE.BufferAttribute(sel, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 40000);
  var mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uAtlas: { value: buildAtlas() }, uSize: { value: 20 }, uDpr: { value: 1 }, uAlpha: { value: 0 }, uRing: { value: 0 }, uVZ: U.uVZ, uPx: U.uPx,
      uFill: { value: C['--m-pin'].clone() }, uWhite: { value: new THREE.Color(1, 1, 1) }, uRingShade: { value: C['--m-ring-shade'] }, uRingSun: { value: C['--m-ring-sun'] },
      uSvc: { value: 0.7 } },
    vertexShader: [
      'attribute vec4 aInfo; attribute float aVis; attribute float aSel; uniform float uSize, uDpr, uVZ, uPx, uSvc;',
      'varying vec4 vInfo; varying float vSel; varying float vSize;',
      'void main(){',
      '  vec3 p = position; p.y *= uVZ;',
      '  vec4 mv = modelViewMatrix*vec4(p,1.0);',
      '  float sz = uSize * (aInfo.x > 5.5 ? uSvc : 1.0) * (1.0 + 0.45*aSel);',
      '  mv.y += uPx*(-mv.z)*sz*0.62;',
      '  gl_Position = projectionMatrix*mv;',
      '  gl_Position.z -= 0.004*gl_Position.w*(1.0+aSel);',
      '  gl_PointSize = aVis > 0.5 ? sz*uDpr : 0.0;',
      '  vInfo = aInfo; vSel = aSel; vSize = sz*uDpr;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uAtlas; uniform vec3 uFill, uWhite, uRingShade, uRingSun; uniform float uAlpha, uRing;',
      'varying vec4 vInfo; varying float vSel; varying float vSize;',
      'void main(){',
      '  vec2 pc = gl_PointCoord*2.0-1.0; float r = length(pc);',
      '  float w = max(fwidth(r), 0.02);',
      '  float disc = 1.0 - smoothstep(0.70-w, 0.70+w, r);',
      '  float ring = smoothstep(0.73-w, 0.73+w, r) * (1.0 - smoothstep(0.97-w, 0.97+w, r));',
      '  float cat = floor(vInfo.x + 0.5); vec2 cell = vec2(cat - 4.0*floor(cat/4.0 + 0.01), floor(cat/4.0 + 0.01));',
      '  vec2 iu = (gl_PointCoord - 0.5)/0.62 + 0.5;',
      '  float inside = step(0.0, iu.x)*step(iu.x, 1.0)*step(0.0, iu.y)*step(iu.y, 1.0);',
      '  float lod = max(0.0, log2(128.0/(0.62*max(vSize, 1.0))));',
      '  float icon = textureLod(uAtlas, (cell + clamp(iu, 0.0, 1.0))/vec2(4.0,2.0), lod).a*inside;',
      '  vec3 fill = cat > 5.5 ? (cat > 6.5 ? vec3(0.32,0.38,0.5) : vec3(0.18,0.62,0.86)) : uFill;',
      '  vec3 col = mix(fill, uWhite, icon);',
      '  float a = disc;',
      '  if(uRing > 0.5 && vInfo.w > 0.5){',
      '    float ang = atan(pc.x, -pc.y)/6.2831853; if(ang < 0.0) ang += 1.0;',
      '    vec3 rc = ang < vInfo.z ? uRingShade : uRingSun;',
      '    col = mix(col, rc, ring); a = max(a, ring);',
      '  } else { col = mix(col, uWhite, ring); a = max(a, ring*0.95); }',
      '  if(vSel > 0.5){ float halo = smoothstep(0.97, 0.99, r)*(1.0-smoothstep(0.99,1.0,r)); a = max(a, halo); }',
      '  if(a < 0.01) discard;',
      '  gl_FragColor = vec4(col, a*uAlpha);',
      '}'
    ].join('\n')
  });
  var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 20;
  scene.add(pts);
  MK.items = items; MK.geo = geo; MK.mat = mat; MK.pts = pts; MK.screen = new Float32Array(n * 3);
}
var markerMode = 'none';
function markerVisible(it, mode) {
  if (it.type === 'w') return mode === 'familie' && showWater && cam.d < 4000;
  if (it.type === 'c') return mode === 'familie' && showWC && cam.d < 4000;
  var p = it.p;
  if (mode === 'spiel') return p.cat === 0;
  if (mode === 'schatten') return p.cat === 0;
  if (mode === 'familie') return matches(p);
  return false;
}
function updateMarkers(mode, alpha) {
  if (!MK.geo) return;
  var vis = MK.geo.attributes.aVis, info = MK.geo.attributes.aInfo, sel = MK.geo.attributes.aSel;
  var modeKey = mode + (cam.d < 4000 ? 'n' : 'f');
  if (markerVisDirty || modeKey !== markerMode) {
    markerVisDirty = false; markerMode = modeKey;
    MK.items.forEach(function (it, i) { vis.array[i] = markerVisible(it, mode) ? 1 : 0; });
    vis.needsUpdate = true;
  }
  if (markerShadeDirty) {
    markerShadeDirty = false;
    MK.items.forEach(function (it, i) { if (it.p && it.p.s) info.array[i * 4 + 2] = shadeAt(it.p, sunT); });
    info.needsUpdate = true;
    if (filt.shade) { markerVisDirty = true; }
  }
  MK.mat.uniforms.uAlpha.value = alpha;
  MK.mat.uniforms.uRing.value = (mode === 'schatten' || mode === 'familie') ? 1 : 0;
  MK.mat.uniforms.uSize.value = clamp(lerp(26, 12, sstep(1500, 26000, cam.d)), 11, 28);
  MK.mat.uniforms.uDpr.value = renderer.getPixelRatio();
  for (var i = 0; i < sel.array.length; i++) { var s = (MK.items[i].p && selected && MK.items[i].p === selected) ? 1 : 0; if (sel.array[i] !== s) { sel.array[i] = s; sel.needsUpdate = true; } }
}
var projV = new THREE.Vector3();
function pickMarker(cx, cy, W, H) {
  if (!MK.geo || MK.mat.uniforms.uAlpha.value < 0.3) return null;
  var vis = MK.geo.attributes.aVis.array, best = null, bd = 18 * 18, size = MK.mat.uniforms.uSize.value;
  for (var i = 0; i < MK.items.length; i++) {
    if (!vis[i]) continue;
    var it = MK.items[i];
    projV.set(X(it.E), Y(it.E ? hAt(it.E, it.N) : 0), Z(it.N)).project(camera);
    if (projV.z > 1) continue;
    var sx = (projV.x + 1) / 2 * W, sy = (1 - projV.y) / 2 * H - size * (it.cat > 5 ? 0.7 : 1) * 0.62;
    var d2 = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy);
    if (d2 < bd) { bd = d2; best = it; }
  }
  return best;
}

/* ---------------- selection, outline, callout ---------------- */
var selected = null, outlineMesh = null, featOutline = null, calloutEl = $('#callout');
function clearOutline() { if (outlineMesh) { scene.remove(outlineMesh); outlineMesh.geometry.dispose(); outlineMesh = null; } }
function makeOutline(p) {
  clearOutline();
  if (!p.poly) return;
  var lines = p.poly.map(function (ring) { var o = []; for (var k = 0; k < ring.length; k += 2) o.push([p.E + ring[k] / 2, p.N + ring[k + 1] / 2]); o.push(o[0]); return o; });
  outlineMesh = buildRibbon(lines, ribbonMat('--m-sel', 2.6, 0.95, { lift: 1.2 }), false, 4);
  outlineMesh.renderOrder = 15;
}
function placeDistance(p) {
  if (p.kind === 'Naturschutzgebiet') return 2600;
  if (p.kind === 'Velotour' || p.kind === 'Schlittelweg' || p.kind === 'Skilift' || p.kind === 'Bergbahn' || p.out) return 2200;
  if (p.cat === 1 || p.kind === 'Park') return 820;
  return 560;
}
function selectPlace(p, fromList) {
  if (!renderer || !scene) { selected = p; showDetail(p); return; }
  selected = p;
  markerVisDirty = true;
  makeOutline(p);
  showDetail(p);
  if (!inFinale()) { pendingFly = p; document.getElementById('familienorte').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  else flyTo({ E: p.E, N: p.N, d: placeDistance(p), hd: ex.hd, p: 42 });
}
function closeDetail() {
  selected = null; clearOutline(); markerVisDirty = true;
  detailEl.hidden = true; listEl.hidden = false; calloutEl.classList.remove('on'); explorerEl.classList.remove('has-detail');
}
var pendingFly = null;

/* ---------------- detail panel ---------------- */
var detailCanvas = null;
function sparkSVG(p) {
  if (!p.s) return '';
  var W = 300, H = 64, n = p.s.length, pts = p.s.map(function (v, k) { return [k / (n - 1) * W, 6 + (1 - v / 100) * 44]; });
  var line = pts.map(function (q, k) { return (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
  var area = line + 'L' + W + ' 50L0 50Z', xNow = clamp((sunT - 8) / 11, 0, 1) * W;
  return '<div class="spark"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Schattenanteil im Tagesverlauf"><path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
    '<line class="now" id="sparkNow" x1="' + xNow.toFixed(1) + '" x2="' + xNow.toFixed(1) + '" y1="2" y2="52"/>' +
    '<text class="ax" x="0" y="62">8</text><text class="ax" x="' + (W * 4 / 11).toFixed(1) + '" y="62" text-anchor="middle">12</text><text class="ax" x="' + (W * 8 / 11).toFixed(1) + '" y="62" text-anchor="middle">16</text><text class="ax" x="' + W + '" y="62" text-anchor="end">19 Uhr</text>' +
    '<text class="ax" x="2" y="12">100 %</text></svg></div>';
}
function showDetail(p) {
  var s = shadeAt(p, sunT), u = uvi(sun.alt, p.z), uc = uvCat(u);
  var html = '<button class="back" type="button" id="back">← Alle Orte</button>';
  if (p.ph) html += '<figure><div class="media"><img src="' + esc(p.ph.f) + '" alt="' + esc(p.ph.w || p.title) + '" loading="lazy"><canvas class="inset" width="320" height="240" aria-label="Luftbild von ' + esc(p.title) + '"></canvas></div><figcaption>Foto: ' + esc(p.ph.a) + ', ' + (p.ph.lu ? '<a href="' + esc(p.ph.lu) + '" target="_blank" rel="noopener">' + esc(p.ph.l) + '</a>' : esc(p.ph.l)) + ', via <a href="' + esc(p.ph.u) + '" target="_blank" rel="noopener">Wikimedia Commons</a> (zugeschnitten). Luftbild: swisstopo SWISSIMAGE</figcaption></figure>';
  else html += '<figure><canvas width="640" height="480" aria-label="Luftbild von ' + esc(p.title) + '"></canvas><figcaption>Luftbild: swisstopo SWISSIMAGE' + (p.poly ? ', Umriss gestrichelt' : '') + '</figcaption></figure>';
  html += '<h3>' + esc(p.title) + '</h3><p class="sub">' + esc(subLine(p)) + (p.guests ? ' · für Gäste' : '') + '</p>';
  html += '<dl class="facts">';
  if (s != null) html += '<div><dt>Schatten ' + fmtTime(sunT) + '</dt><dd id="dShade">' + Math.round(s * 100) + ' %</dd></div><div><dt>Unter Bäumen/Dach</dt><dd>' + (p.cover || 0) + ' %</dd></div>';
  html += '<div><dt>UV ' + fmtTime(sunT) + ', wolkenlos</dt><dd id="dUV">' + Math.round(u) + ' · ' + uc[1] + '</dd></div>';
  html += '<div><dt>Höhe</dt><dd>' + swiss(p.z) + ' m ü. M.</dd></div>';
  if (p.dw != null && p.dw < 2000) html += '<div><dt>Trinkbrunnen</dt><dd>' + swiss(p.dw) + ' m</dd></div>';
  if (p.dc != null && p.dc < 2000) html += '<div><dt>WC</dt><dd>' + swiss(p.dc) + ' m</dd></div>';
  html += '</dl>';
  html += sparkSVG(p);
  if (p.flags && p.flags.length) html += '<p class="note">Vor Ort: ' + p.flags.map(esc).join(', ') + '</p>';
  if (p.note) html += '<p class="note">' + esc(p.note) + '</p>';
  html += '<ul class="links">';
  (p.zt || []).forEach(function (l) { html += '<li><a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + ' bei Zug Tourismus</a></li>'; });
  if (p.osm) { var tp = { n: 'node', w: 'way', r: 'relation' }[p.osm[0]]; html += '<li><a href="https://www.openstreetmap.org/' + tp + '/' + p.osm.slice(1) + '" target="_blank" rel="noopener">In OpenStreetMap ansehen</a></li>'; }
  html += '</ul>';
  detailEl.innerHTML = html;
  detailEl.hidden = false; listEl.hidden = true; scrollEl.scrollTop = 0; explorerEl.classList.add('has-detail');
  $('#back').addEventListener('click', closeDetail);
  detailCanvas = detailEl.querySelector('canvas');
  if (detailCanvas && renderer && OR) {
    var redraw = function () { if (!detailCanvas || !detailCanvas.isConnected) { OR.listeners.splice(OR.listeners.indexOf(redraw), 1); return; } drawCrop(detailCanvas, p); };
    OR.listeners.push(redraw); redraw();
  }
}
function updateDetailLive() {
  if (!selected || detailEl.hidden) return;
  var p = selected, s = shadeAt(p, sunT), u = uvi(sun.alt, p.z), uc = uvCat(u);
  var d1 = $('#dShade'), d2 = $('#dUV'), sn = $('#sparkNow');
  if (d1 && s != null) { d1.textContent = Math.round(s * 100) + ' %'; d1.previousElementSibling.textContent = 'Schatten ' + fmtTime(sunT); }
  if (d2) { d2.textContent = Math.round(u) + ' · ' + uc[1]; d2.previousElementSibling.textContent = 'UV ' + fmtTime(sunT) + ', wolkenlos'; }
  if (sn) { var x = (clamp((sunT - 8) / 11, 0, 1) * 300).toFixed(1); sn.setAttribute('x1', x); sn.setAttribute('x2', x); }
}

/* ---------------- labels ---------------- */
var labelsEl = $('#labels'), LBL = [], LBL_ORDER = [], PRIO = { muni: 0, lake: 1, peak: 2, river: 3, poi: 4, place: 5 };
function addLabel(text, kind, E, N, sections, sub, elev) {
  var el = document.createElement('div');
  el.className = 'lbl ' + kind;
  if (kind === 'muni') el.innerHTML = text + (sub ? '<small>' + sub + '</small>' : '');
  else if (kind === 'peak') el.innerHTML = '<span>' + text + '</span><em>' + elev + '</em>';
  else el.textContent = text;
  labelsEl.appendChild(el);
  var lift = kind === 'peak' ? 40 : kind === 'poi' ? 30 : 60;
  LBL.push({ el: el, kind: kind, name: text, E: E, N: N, h: hAt(E, N), lift: lift, p: new THREE.Vector3(), s: sections, o: 0, occ: false, n: LBL.length, w: 0 });
}

/* ---------------- camera choreography ---------------- */
var KEYS = {
  hero:      { E: 2683400, N: 1222800, d: 72000, hd: -22, p: 36, ox: 0.04, oy: -0.21 },
  kanton:    { E: 2684000, N: 1224200, d: 33500, hd: 0, p: 64, ox: 0.17, oy: 0.02 },
  zug:       { E: 2681950, N: 1224350, d: 3900, hd: 100, p: 24, ox: 0.17, oy: 0.06 },
  lorze:     { E: 2681200, N: 1226600, d: 25500, hd: -38, p: 52, ox: 0.17, oy: 0.02 },
  aegeri:    { E: 2689500, N: 1219800, d: 9200, hd: 136, p: 33, ox: 0.17, oy: 0.03 },
  berg:      { E: 2687300, N: 1225500, d: 10000, hd: 142, p: 34, ox: 0.17, oy: 0.04 },
  walchwil:  { E: 2682900, N: 1216800, d: 9000, hd: 118, p: 27, ox: 0.17, oy: 0.04 },
  spiel:     { E: 2680400, N: 1225600, d: 15500, hd: -16, p: 50, ox: 0.17, oy: 0.03 },
  schatten:  { E: FEAT.E + 10, N: FEAT.N + 10, d: 520, hd: 28, p: 40, ox: 0.18, oy: 0.08 },
  familie:   null
};
var ex = { E: 2684000, N: 1224300, d: 31000, hd: 10, p: 54, ox: 0.2, oy: 0.02 };
KEYS.familie = ex;
var HI = { hero: [], kanton: [], zug: ['Zug'], lorze: ['Baar', 'Steinhausen', 'Cham', 'Hünenberg', 'Risch'],
  aegeri: ['Unterägeri', 'Oberägeri'], berg: ['Menzingen', 'Neuheim'], walchwil: ['Walchwil'], spiel: [], schatten: [], familie: [] };
var PAR = {
  hero: { focus: 0.35, cont: 0.25, muni: 0 }, kanton: { focus: 1, cont: 0.85, muni: 1 }, zug: { focus: 1, cont: 0.8, muni: 0.8 },
  lorze: { focus: 1, cont: 0.7, muni: 0.8 }, aegeri: { focus: 1, cont: 0.85, muni: 0.8 }, berg: { focus: 1, cont: 0.85, muni: 0.8 },
  walchwil: { focus: 1, cont: 0.85, muni: 0.8 }, spiel: { focus: 1, cont: 0.55, muni: 0.7 }, schatten: { focus: 0.4, cont: 0.2, muni: 0.2 },
  familie: { focus: 1, cont: 0.55, muni: 0.7 }
};
var anchors = [];
function measure() {
  anchors = [];
  var vh = window.innerHeight;
  Array.prototype.forEach.call(document.querySelectorAll('[data-cam]'), function (s) {
    var r = s.getBoundingClientRect(), top = r.top + window.scrollY, hgt = r.height, key = s.dataset.cam;
    if (s.classList.contains('long')) {
      anchors.push({ key: key, y: top + vh * 0.6, top: top, h: hgt, el: s, a0: top + vh * 0.6, a1: top + hgt - vh * 0.5 });
      anchors.push({ key: key, y: top + hgt - vh * 0.5, top: top, h: hgt, el: s, a0: top + vh * 0.6, a1: top + hgt - vh * 0.5 });
    } else anchors.push({ key: key, y: top + hgt * 0.5, top: top, h: hgt, el: s });
  });
}
function anchorY(key) { for (var i = 0; i < anchors.length; i++) if (anchors[i].key === key) return anchors[i].y; return 0; }
function anchorOf(key) { for (var i = 0; i < anchors.length; i++) if (anchors[i].key === key) return anchors[i]; return null; }
function story() {
  var y = window.scrollY + window.innerHeight * 0.5, i = 0;
  while (i < anchors.length - 1 && y >= anchors[i + 1].y) i++;
  if (i >= anchors.length - 1) return { a: anchors.length - 1, b: anchors.length - 1, t: 0, y: y };
  var A = anchors[i], B = anchors[i + 1];
  return { a: i, b: i + 1, t: clamp((y - A.y) / (B.y - A.y), 0, 1), y: y };
}
function angLerp(a, b, t) { var d = ((b - a + 540) % 360) - 180; return a + d * t; }
function portraitAdjust(c) {
  var asp = window.innerWidth / window.innerHeight, narrow = window.innerWidth < 760;
  var f = asp < 1.25 ? clamp(1.25 / asp, 1, 2.3) : 1;
  var isHero = c === KEYS.hero, near = c.d < 2000;
  return { E: c.E, N: c.N, d: c.d * (near ? Math.min(f, 1.4) : f), hd: c.hd, p: narrow && c === KEYS.zug ? 36 : c.p,
    ox: narrow ? (isHero ? 0.12 : 0) : c.ox, oy: narrow ? (isHero ? -0.13 : (c === ex ? -0.31 : (c === KEYS.schatten ? -0.27 : -0.2))) : c.oy };
}
function desiredCam(st) {
  var A = portraitAdjust(KEYS[anchors[st.a].key]), B = portraitAdjust(KEYS[anchors[st.b].key]);
  var t = sstep(0.16, 0.84, st.t);
  var sep = Math.hypot(A.E - B.E, A.N - B.N), hop = clamp(sep / Math.min(A.d, B.d) * 0.22, 0, 0.9) * Math.sin(Math.PI * t);
  var d = Math.exp(lerp(Math.log(A.d), Math.log(B.d), t)) * (1 + hop);
  return { E: lerp(A.E, B.E, t), N: lerp(A.N, B.N, t), d: d, hd: angLerp(A.hd, B.hd, t), p: lerp(A.p, B.p, t) - hop * 6, ox: lerp(A.ox, B.ox, t), oy: lerp(A.oy, B.oy, t), t: t };
}
var flight = null;
function flyTo(to) {
  var from = { E: ex.E, N: ex.N, d: ex.d, hd: ex.hd, p: ex.p };
  var dist = Math.hypot(to.E - from.E, to.N - from.N);
  flight = { from: from, to: to, t0: performance.now(), dur: reduce ? 1 : clamp(900 + dist * 0.12 + Math.abs(Math.log(to.d / from.d)) * 260, 900, 2600),
    hop: clamp(dist / Math.min(from.d, to.d) * 0.35, 0, 1.6) };
}
function flyToMuni(m) {
  var size = Math.sqrt(m.ha * 10000);
  flyTo({ E: (m.at[0] * 2 + m.c[0]) / 3, N: (m.at[1] * 2 + m.c[1]) / 3, d: clamp(size * 2.3, 6500, 15000), hd: ex.hd, p: 46 });
}
function stepFlight(now) {
  if (!flight) return;
  var u = clamp((now - flight.t0) / flight.dur, 0, 1), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  var f = flight.from, t = flight.to, hop = flight.hop * Math.sin(Math.PI * e);
  ex.E = lerp(f.E, t.E, e); ex.N = lerp(f.N, t.N, e);
  ex.d = Math.exp(lerp(Math.log(f.d), Math.log(t.d), e)) * (1 + hop);
  ex.hd = angLerp(f.hd, t.hd, e); ex.p = lerp(f.p, t.p, e);
  if (u >= 1) flight = null;
}
var cam = null, ptr = { x: 0, y: 0, sx: 0, sy: 0, cx: -1, cy: -1, moved: false, over: false }, drag = { on: false, hd: 0, p: 0, lx: 0, ly: 0, id: null, sx: 0, sy: 0, t0: 0, type: '' };
function placeCamera(c, W, H) {
  var th = c.hd * DEG, ph = c.p * DEG, cp = Math.cos(ph), sp = Math.sin(ph);
  var h = hAt(c.E, c.N), tx = X(c.E), ty = Y(Math.max(h, 414)), tz = Z(c.N);
  var px = tx - Math.sin(th) * cp * c.d, py = ty + sp * c.d, pz = tz + Math.cos(th) * cp * c.d;
  var gE = px + EC, gN = NC - pz, ground = inGrid(gE, gN) ? Y(hAt(gE, gN)) : -1000;
  if (py < ground + 60) py = ground + 60;
  camera.position.set(px, py, pz);
  camera.lookAt(tx, ty, tz);
  camera.near = clamp(c.d * 0.012, 2, 2500); camera.far = c.d * 5 + 90000;
  camera.aspect = W / H;
  camera.setViewOffset(W, H, -c.ox * W, -c.oy * H, W, H);
  camera.updateProjectionMatrix();
  U.uPx.value = 2 * Math.tan(camera.fov * Math.PI / 360) / H;
  U.uFogNear.value = c.d * 1.05; U.uFogFar.value = c.d * 3.6;
}

/* ---------------- picking ---------------- */
var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ids = null, IDW = D.mask[0], IDH = D.mask[1];
function idAt(E, N) {
  if (!ids || !inGrid(E, N)) return 0;
  var c = Math.min(IDW - 1, Math.floor((E - G.E0) / 20)), r = Math.min(IDH - 1, Math.floor((G.N1 - N) / 20));
  return Math.round(ids[(r * IDW + c) * 4] / 20);
}
function pick(cx, cy) {
  ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  var o = ray.ray.origin, d = ray.ray.direction, t = camera.near, prev = t, step = Math.max(4, cam.d / 320);
  for (var s = 0; s < 1600; s++) {
    var x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t, E = x + EC, N = NC - z;
    if (inGrid(E, N) && y <= Y(hAt(E, N))) {
      var lo = prev, hi = t;
      for (var k = 0; k < 12; k++) { var m = (lo + hi) / 2, xm = o.x + d.x * m, ym = o.y + d.y * m, zm = o.z + d.z * m, Em = xm + EC, Nm = NC - zm;
        if (inGrid(Em, Nm) && ym <= Y(hAt(Em, Nm))) hi = m; else lo = m; }
      x = o.x + d.x * hi; z = o.z + d.z * hi; E = x + EC; N = NC - z;
      return { E: E, N: N, h: hAt(E, N) };
    }
    if (y < -1200) return null;
    prev = t; t += step;
  }
  return null;
}

/* ---------------- interaction ---------------- */
var tip = $('#tip'), tipT = $('#tipT'), tipA = $('#tipA'), tipB = $('#tipB'), hoverId = 0, hoverMk = null;
function overUI(el) { return el && el.closest && el.closest('.card, .nav, button, a, .tip, .mapctl, select, input'); }
function inFinale() { var y = window.scrollY + window.innerHeight * 0.5; return anchors.length && y > anchorY('familie') - window.innerHeight * 0.45; }
window.addEventListener('pointermove', function (e) {
  ptr.x = e.clientX / window.innerWidth * 2 - 1; ptr.y = e.clientY / window.innerHeight * 2 - 1;
  ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.moved = true; ptr.over = e.pointerType === 'mouse' && !overUI(e.target);
  if (drag.on && e.pointerId === drag.id) {
    var dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
    if (inFinale()) { ex.hd -= dx * 0.22; ex.p = clamp(ex.p + dy * 0.15, 14, 82); flight = null; }
    else { drag.hd -= dx * 0.18; drag.p = clamp(drag.p + dy * 0.12, -22, 26); }
    drag.lx = e.clientX; drag.ly = e.clientY;
  }
}, { passive: true });
document.addEventListener('pointerleave', function () { ptr.over = false; });
window.addEventListener('pointerdown', function (e) {
  if (overUI(e.target)) return;
  drag.sx = e.clientX; drag.sy = e.clientY; drag.t0 = performance.now(); drag.type = e.pointerType;
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  e.preventDefault();
  drag.on = true; drag.id = e.pointerId; drag.lx = e.clientX; drag.ly = e.clientY;
  document.body.style.cursor = 'grabbing';
});
window.addEventListener('pointerup', function (e) {
  var moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t0 < 450;
  if (drag.on) { drag.on = false; document.body.style.cursor = ''; }
  if (overUI(e.target) || moved > 6 || !quick) return;
  var mk = pickMarker(e.clientX, e.clientY, window.innerWidth, canvas.clientHeight || window.innerHeight);
  if (mk && mk.p) { selectPlace(mk.p, false); return; }
  if (inFinale() && hoverId > 0 && e.pointerType === 'mouse') flyToMuni(D.munis[hoverId - 1]);
});
window.addEventListener('wheel', function (e) {
  if (!inFinale() || !e.ctrlKey || overUI(e.target)) return;
  e.preventDefault(); flight = null;
  ex.d = clamp(ex.d * Math.exp(e.deltaY * 0.01), 260, 60000);
}, { passive: false });
$('#zoomIn').addEventListener('click', function () { flyTo({ E: ex.E, N: ex.N, d: clamp(ex.d / 2, 260, 60000), hd: ex.hd, p: ex.p }); });
$('#zoomOut').addEventListener('click', function () { flyTo({ E: ex.E, N: ex.N, d: clamp(ex.d * 2, 260, 60000), hd: ex.hd, p: ex.p }); });
$('#home').addEventListener('click', function () { closeDetail(); flyTo({ E: 2684000, N: 1224300, d: 31000, hd: 10, p: 54 }); });
function toggleBtn(id, get, set) { var b = $(id); b.addEventListener('click', function () { set(!get()); b.setAttribute('aria-pressed', String(get())); markerVisDirty = true; }); }
toggleBtn('#tWater', function () { return showWater; }, function (v) { showWater = v; });
toggleBtn('#tWC', function () { return showWC; }, function (v) { showWC = v; });
toggleBtn('#tPhoto', function () { return photoOn; }, function (v) { photoOn = v; });

/* ---------------- frame loop ---------------- */
var HUDtick = 0, tReady = 0, grown = 0, lorzeDrawn = 0, last = performance.now(), navLinks = Array.prototype.slice.call(document.querySelectorAll('#nav a')),
    prog = $('#prog'), mark = $('#mark'), north = $('#north'), docH = 1, ready = false, hiCur = new Array(12).fill(0), cur = { focus: 0.35, cont: 0.25, muni: 0 };
var tmpV = new THREE.Vector3(), markerAlpha = 0, wasFinale = false, lastListUpd = 0, lastDetailUpd = 0;
var prCap = dpr0, frameTimes = [], prLowered = false;
function applyPR(W, H) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap, Math.sqrt(3.4e6 / (W * H)))); }
function resize() {
  var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  applyPR(W, H);
  renderer.setSize(W, H, false);
  measure();
  LBL.forEach(function (L) { L.bw = 0; });
  docH = document.documentElement.scrollHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

function frame(now) {
  var rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
  if (!TEST && !prLowered && ready && rawDt > 0 && rawDt < 0.5) { frameTimes.push(rawDt); if (frameTimes.length > 90) { frameTimes.shift(); var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length; if (avg > 0.034) { prLowered = true; prCap = Math.max(1, prCap * 0.7); resize(); } } }
  var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  if (!reduce) U.uTime.value = now / 1000;
  var fin = inFinale();
  if (fin !== wasFinale) { wasFinale = fin; document.body.classList.toggle('explore', fin); if (fin && pendingFly) { var pf = pendingFly; pendingFly = null; flyTo({ E: pf.E, N: pf.N, d: placeDistance(pf), hd: ex.hd, p: 42 }); } }
  stepFlight(now);
  if (playing) { var nt = sunT + (now - playLast) / 1000 * 1.1; playLast = now; if (nt > 19) nt = 8; setSunT(nt, 'play'); }
  var st = story(), want = desiredCam(st);
  var keyA = anchors[st.a].key, keyB = anchors[st.b].key, tb = want.t;
  // scroll-linked sun inside the shade chapter
  var sa = anchorOf('schatten');
  if (sa) {
    var inSh = (keyA === 'schatten' || keyB === 'schatten');
    if (inSh && !userSunLock && !playing) { var u = clamp((st.y - sa.a0) / Math.max(1, sa.a1 - sa.a0), 0, 1); setSunT(8.5 + u * 10, 'scroll'); }
    if (!inSh && !fin && userSunLock && !playing) userSunLock = false;
  }
  var heroW = keyA === 'hero' ? 1 - tb : 0;
  ptr.sx = lerp(ptr.sx, fine ? ptr.x : 0, 1 - Math.exp(-dt * 2.5)); ptr.sy = lerp(ptr.sy, fine ? ptr.y : 0, 1 - Math.exp(-dt * 2.5));
  if (!drag.on) { drag.hd *= Math.exp(-dt * 1.2); drag.p *= Math.exp(-dt * 1.2); }
  var par = fin ? 0.25 : 1;
  want.hd += (ptr.sx * 4.5 + drag.hd) * par + (reduce ? 0 : Math.sin(now / 1000 * 0.09) * 7 * heroW);
  want.p = clamp(want.p - ptr.sy * 2.5 * par + drag.p * par, 12, 82);
  if (!cam) { cam = { E: want.E, N: want.N, d: want.d, hd: want.hd, p: want.p, ox: want.ox, oy: want.oy };
    if (!reduce && !TEST && st.a === 0 && st.t < 0.05) { cam.d *= 1.45; cam.hd -= 28; cam.p += 14; } }
  var kf = TEST ? 1 : 1 - Math.exp(-dt * (fin ? 5 : 3.2));
  cam.E = lerp(cam.E, want.E, kf); cam.N = lerp(cam.N, want.N, kf);
  cam.d = Math.exp(lerp(Math.log(cam.d), Math.log(want.d), kf));
  cam.hd = angLerp(cam.hd, want.hd, kf); cam.p = lerp(cam.p, want.p, kf); cam.ox = lerp(cam.ox, want.ox, kf); cam.oy = lerp(cam.oy, want.oy, kf);
  // vertical exaggeration: true scale close up, 1.6x for the overview
  vz = lerp(1.0, VZ, sstep(1800, 7500, cam.d));
  U.uVZ.value = vz; U.uBZ.value = vz;
  placeCamera(cam, W, H);
  U.uSunMix.value = sstep(9500, 4300, cam.d);
  treeMat.uniforms.uTreeGrow.value = sstep(3300, 1900, cam.d);

  var pa = PAR[keyA], pb = PAR[keyB];
  ['focus', 'cont', 'muni'].forEach(function (k) { cur[k] = lerp(cur[k], lerp(pa[k], pb[k], tb), kf); });
  var hiTarget = new Array(12).fill(0);
  (HI[keyA] || []).forEach(function (n) { hiTarget[MUNI[n].id] += 1 - tb; });
  (HI[keyB] || []).forEach(function (n) { hiTarget[MUNI[n].id] += tb; });
  if (fin && filt.gem && MUNI[filt.gem]) hiTarget[MUNI[filt.gem].id] = 1;
  for (var i = 0; i < 12; i++) hiCur[i] = lerp(hiCur[i], hiTarget[i], kf);
  var TU = terrainMat.uniforms;
  TU.uFocus.value = cur.focus; TU.uContourA.value = cur.cont; TU.uHiv.value = hiCur; TU.uHiAny.value = Math.min(1, Math.max.apply(null, hiCur));
  var intro = (reduce || TEST) ? 1 : sstep(0, 1, (now - tReady) / 2600);
  if (R.canton) R.canton.material.uniforms.uDraw.value = ready ? intro : 0;
  if (R.muni) R.muni.material.uniforms.uOpacity.value = 0.8 * Math.max(cur.muni, 0) * (1 - U.uOrthoMix.value * 0.5);
  var yK = anchorY('kanton'), yZ = anchorY('zug'), yL = anchorY('lorze');
  grown = Math.max(grown, clamp((st.y - yK) / (yZ - yK), 0, 1));
  if (fin || anchors[st.a].y > yL) grown = 1;
  bldMat.uniforms.uGrow.value = reduce ? (grown > 0.02 ? 1.2 : 0) : grown * 1.2;
  lorzeDrawn = Math.max(lorzeDrawn, clamp((st.y - yZ - (yL - yZ) * 0.25) / ((yL - yZ) * 0.75), 0, 1));
  if (R.lorze) { R.lorze.material.uniforms.uDraw.value = lorzeDrawn * 1.001; R.lorze.material.uniforms.uOpacity.value = lorzeDrawn > 0 ? 1 - U.uOrthoMix.value * 0.4 : 0;
    R.cross.material.uniforms.uOpacity.value = 0.8 * sstep(0.55, 0.65, lorzeDrawn) * (1 - U.uOrthoMix.value); }
  if (R.shore) R.shore.material.uniforms.uOpacity.value = 0.65 * (1 - U.uOrthoMix.value * 0.6);

  // markers per chapter
  var wSp = (keyA === 'spiel' ? 1 - tb : 0) + (keyB === 'spiel' ? tb : 0), wSh = (keyA === 'schatten' ? 1 - tb : 0) + (keyB === 'schatten' ? tb : 0);
  var mode = fin ? 'familie' : (wSh > wSp ? 'schatten' : (wSp > 0 ? 'spiel' : 'none'));
  var mTarget = fin ? 1 : clamp((wSp + wSh) * 1.6 - 0.3, 0, 1);
  // outline of the featured playground in the shade chapter
  var wantFeat = !fin && wSh > 0.5;
  if (wantFeat && !featOutline && FEAT.poly) { featOutline = (function () { var keep = outlineMesh; outlineMesh = null; makeOutline(FEAT); var m = outlineMesh; outlineMesh = keep; return m; })(); }
  if (featOutline) featOutline.visible = wantFeat;
  markerAlpha = lerp(markerAlpha, clamp(mTarget, 0, 1), TEST ? 1 : 1 - Math.exp(-dt * 6));
  updateMarkers(mode, markerAlpha);

  // trees, aerial images, sun shadow map
  updateTrees();
  updateOrtho(now);
  updateShadow(now);

  // list + detail refresh on time change (throttled)
  if (listDirty && (fin || !listEl.childElementCount) && now - lastListUpd > 120) { lastListUpd = now; renderList(); }
  if (selected && now - lastDetailUpd > 100) { lastDetailUpd = now; updateDetailLive(); }

  // hover
  if (ptr.moved || drag.on || (ptr.over && HUDtick % 4 === 0)) {
    ptr.moved = false;
    hoverMk = (ready && ptr.over && fine && !drag.on) ? pickMarker(ptr.cx, ptr.cy, W, H) : null;
    var hit = (!hoverMk && ready && ptr.over && fine) ? pick(ptr.cx, ptr.cy) : null;
    hoverId = hit ? idAt(hit.E, hit.N) : 0;
    TU.uHover.value = hoverId > 0 ? hoverId : -1;
    var tx, ty;
    if (hoverMk) {
      var hp = hoverMk.p;
      if (hp) {
        tipT.textContent = hp.title;
        tipA.textContent = subLine(hp);
        var hs = shadeAt(hp, sunT);
        tipB.textContent = hs != null ? 'Schatten um ' + fmtTime(sunT) + ' Uhr: ' + Math.round(hs * 100) + ' %' : (hp.zt ? 'Tipp von Zug Tourismus' : CATS[hp.cat].t);
      } else {
        tipT.textContent = hoverMk.type === 'w' ? 'Trinkbrunnen' : 'WC'; tipA.textContent = hoverMk.wick ? 'mit Wickeltisch' : ''; tipB.textContent = '';
      }
      document.body.style.cursor = 'pointer';
    } else if (hit && hoverId > 0 && !drag.on) {
      var m = D.munis[hoverId - 1];
      tipT.textContent = m.name;
      tipA.textContent = dec(m.ha / 100) + ' km² · ' + m.hmin + '–' + m.hmax + ' m';
      tipB.textContent = 'Hier ' + Math.round(hit.h) + ' m · ' + swiss(hit.E) + ' / ' + swiss(hit.N);
      document.body.style.cursor = fin ? 'pointer' : '';
    }
    if (hoverMk || (hit && hoverId > 0 && !drag.on)) {
      tx = ptr.cx + 18; ty = ptr.cy + 18;
      if (tx > W - 290) tx = ptr.cx - 290; if (ty > window.innerHeight - 100) ty = ptr.cy - 100;
      tip.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      tip.classList.add('on');
    } else { tip.classList.remove('on'); if (!drag.on) document.body.style.cursor = ''; }
  }

  // callout for the selected place
  if (selected && fin) {
    tmpV.set(X(selected.E), Y(hAt(selected.E, selected.N)), Z(selected.N)).project(camera);
    if (tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1) {
      var csz = MK.mat ? MK.mat.uniforms.uSize.value * 1.45 : 30;
      calloutEl.style.transform = 'translate3d(' + ((tmpV.x + 1) / 2 * W + csz * 0.6).toFixed(1) + 'px,' + ((1 - tmpV.y) / 2 * H - csz * 1.25).toFixed(1) + 'px,0) translateY(-50%)';
      if (calloutEl._p !== selected) { calloutEl._p = selected; calloutEl.innerHTML = esc(selected.title) + '<small>' + esc(selected.kind + ' · ' + selected.gem) + '</small>'; }
      calloutEl.classList.add('on');
    } else calloutEl.classList.remove('on');
  } else calloutEl.classList.remove('on');

  // labels
  var wA = 1 - tb, wB = tb, placed = [];
  var labelFade = 1 - sstep(2600, 1500, cam.d) * 0.85;
  for (i = 0; i < LBL.length; i++) {
    var L = LBL[i], want_o = 0;
    if (L.s.indexOf(keyA) >= 0) want_o += wA;
    if (L.s.indexOf(keyB) >= 0) want_o += wB;
    if (fin && L.kind === 'muni' && cam.d > 5000) want_o = Math.max(want_o, 1);
    want_o = sstep(0.35, 0.85, want_o) * (L.kind === 'muni' ? 1 : labelFade);
    if (!ready) want_o = 0;
    L.p.set(X(L.E), Y(L.h) + L.lift, Z(L.N));
    tmpV.copy(L.p).project(camera);
    var vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.08 && Math.abs(tmpV.y) < 1.08;
    if (want_o > 0.01 && vis && (HUDtick + L.n) % 5 === 0) {
      L.occ = false;
      for (var s = 1; s <= 9; s++) {
        var f = s / 10 * 0.7, px = lerp(L.p.x, camera.position.x, f), py = lerp(L.p.y, camera.position.y, f), pz = lerp(L.p.z, camera.position.z, f);
        var E = px + EC, N = NC - pz;
        if (inGrid(E, N) && Y(hAt(E, N)) > py + 10) { L.occ = true; break; }
      }
    }
    if (!vis || L.occ) want_o = 0;
    L.sx = (tmpV.x + 1) / 2 * W; L.sy = (1 - tmpV.y) / 2 * H; L.want = want_o;
  }
  for (i = 0; i < LBL_ORDER.length; i++) {
    L = LBL_ORDER[i];
    if (L.want > 0.01) {
      if (!L.bw) { L.el.style.opacity = '0'; L.el.style.transform = 'translate3d(-9999px,0,0)'; L.bw = L.el.offsetWidth; L.bh = L.el.offsetHeight; }
      var left = (L.kind === 'peak' || L.kind === 'poi') ? L.sx - 5 : L.sx - L.bw / 2, tries = L.kind === 'muni' ? [0, -15, 15] : [0], ok = false;
      for (var tr = 0; tr < tries.length && !ok; tr++) {
        var top = L.sy - L.bh / 2 + tries[tr], hitL = false;
        for (var q = 0; q < placed.length; q++) { var P = placed[q]; if (left < P[2] + 6 && left + L.bw + 6 > P[0] && top < P[3] + 2 && top + L.bh + 2 > P[1]) { hitL = true; break; } }
        if (!hitL) { ok = true; L.dy = lerp(L.dy || 0, tries[tr], TEST ? 1 : 1 - Math.exp(-dt * 8)); placed.push([left, top, left + L.bw, top + L.bh]); }
      }
      if (!ok) L.want = 0;
    }
    L.o = TEST ? L.want : lerp(L.o, L.want, 1 - Math.exp(-dt * 6));
    if (L.o < 0.01) { if (L.w !== 0) { L.el.style.opacity = '0'; L.w = 0; } continue; }
    var off = (L.kind === 'peak' || L.kind === 'poi') ? 'translate(-5px,-50%)' : 'translate(-50%,-50%)';
    L.el.style.transform = 'translate3d(' + L.sx.toFixed(1) + 'px,' + (L.sy + (L.dy || 0)).toFixed(1) + 'px,0) ' + off;
    L.el.style.opacity = L.o.toFixed(3); L.w = 1;
  }

  // HUD, progress, nav
  HUDtick++;
  if (ready && HUDtick % 4 === 0) {
    var hh = hAt(cam.E, cam.N), id = idAt(cam.E, cam.N);
    hudA.textContent = swiss(cam.E) + ' / ' + swiss(cam.N);
    hudB.textContent = (id ? D.munis[id - 1].name + ' · ' : '') + Math.round(hh) + ' m ü. M.' + (U.uSunMix.value > 0.5 ? ' · ' + fmtTime(sunT) + ' Uhr' : '');
  }
  north.style.transform = 'rotate(' + (-cam.hd).toFixed(1) + 'deg)';
  var pr = clamp(window.scrollY / Math.max(1, docH - window.innerHeight), 0, 1);
  prog.style.transform = 'scaleX(' + pr.toFixed(4) + ')';
  mark.classList.toggle('on', window.scrollY > window.innerHeight * 0.55);
  var active = st.t < 0.5 ? keyA : keyB;
  for (i = 0; i < navLinks.length; i++) navLinks[i].classList.toggle('on', navLinks[i].dataset.for === active);

  renderer.render(scene, camera);
  if (!TEST) requestAnimationFrame(frame);
}
if (TEST) { window.__frame = function () { frame(performance.now()); return true; }; window.__R = R;
  window.__api = { setSun: function (t) { userSunLock = true; setSunT(t, 'ui'); }, select: function (i) { selectPlace(PL[i], true); }, places: PL, state: function () { return { d: cam && cam.d, vz: vz, sunMix: U.uSunMix.value, ortho: U.uOrthoMix.value, shadowOn: U.uShadowOn.value, smFrames: smState.frames, trees: treeGeo.instanceCount, orthoOK: [OR.F.ok, OR.C.ok], cache: Object.keys(OR.cache).length, inflight: OR.inflight }; },
    fly: function (o) { flyTo(o); }, ex: ex, feat: FEAT,
    near: function (x, y) { var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight, out = [], vis = MK.geo.attributes.aVis.array, inf = MK.geo.attributes.aInfo.array;
      MK.items.forEach(function (it, i) { if (!vis[i]) return; projV.set(X(it.E), Y(hAt(it.E, it.N)), Z(it.N)).project(camera); var sx = (projV.x + 1) / 2 * W, sy = (1 - projV.y) / 2 * H - MK.mat.uniforms.uSize.value * 0.62;
        if (Math.hypot(sx - x, sy - y) < 30) out.push([it.p ? it.p.title : it.type, it.cat, inf[i * 4], inf[i * 4 + 3], Math.round(sx), Math.round(sy)]); }); return out; } }; }

/* ---------------- boot ---------------- */
readTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
updateSunUI(); renderList();
(async function boot() {
  try {
    statusEl.textContent = 'Relief wird aufgebaut …';
    resize();
    var raw = await gunzip(b64(D.hgt));
    var n = nx * ny, lo = raw.subarray(0, n), hi = raw.subarray(n, 2 * n), q = new Int32Array(n);
    for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
      var k = j * nx + i, zz = lo[k] | (hi[k] << 8), r = (zz >>> 1) ^ -(zz & 1), p = 0;
      if (j === 0) { if (i > 0) p = q[k - 1]; } else if (i === 0) p = q[k - nx]; else p = q[k - 1] + q[k - nx] - q[k - nx - 1];
      q[k] = p + r; HT[k] = q[k] * 0.5;
    }
    var hd = new Uint16Array(n);
    for (j = 0; j < ny; j++) { var rr = ny - 1 - j; for (i = 0; i < nx; i++) hd[rr * nx + i] = THREE.DataUtils.toHalfFloat(HT[j * nx + i]); }
    var hTex = new THREE.DataTexture(hd, nx, ny, THREE.RedFormat, THREE.HalfFloatType);
    hTex.magFilter = hTex.minFilter = THREE.LinearFilter; hTex.needsUpdate = true;
    U.uHgt.value = hTex;

    var imgs = await Promise.all([loadImage(D.reliefURI), loadImage(D.maskURI)]);
    var relTex = new THREE.Texture(imgs[0]);
    relTex.anisotropy = renderer.capabilities.getMaxAnisotropy(); relTex.needsUpdate = true;
    var mL = new THREE.Texture(imgs[1]); mL.needsUpdate = true; mL.generateMipmaps = false; mL.minFilter = THREE.LinearFilter;
    var mN = new THREE.Texture(imgs[1]); mN.needsUpdate = true; mN.generateMipmaps = false; mN.minFilter = mN.magFilter = THREE.NearestFilter;
    terrainMat.uniforms.uRelief.value = relTex; terrainMat.uniforms.uMaskL.value = mL; terrainMat.uniforms.uMaskN.value = mN;
    var cv = document.createElement('canvas'); cv.width = IDW; cv.height = IDH;
    var cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(imgs[1], 0, 0);
    ids = cx.getImageData(0, 0, IDW, IDH).data;

    buildTerrain(small ? 2 : 1);
    var Ls = D.lines;
    R.shore = buildRibbon(toLines(Ls.shore), ribbonMat('--m-shore', 1.1, 0.65));
    R.reuss = buildRibbon(toLines(Ls.river_Reuss).concat(toLines(Ls.river_Sihl)), ribbonMat('--m-river', 1.6, 0.75));
    R.muni = buildRibbon(toLines(Ls.muni), ribbonMat('--m-muni', 1.6, 0, { dash: true }));
    R.canton = buildRibbon(toLines(Ls.canton), ribbonMat('--m-line', small ? 2.6 : 3.2, 1));
    R.lorze = buildRibbon(toLines(Ls.lorze_path), ribbonMat('--m-lorze', small ? 3.2 : 4.2, 0, { flow: true }), true);
    R.cross = buildRibbon(toLines(Ls.lorze_cross), ribbonMat('--m-lorze', small ? 1.8 : 2.2, 0, { dash: true }));
    R.shore.renderOrder = 1; R.reuss.renderOrder = 2; R.muni.renderOrder = 3; R.canton.renderOrder = 4; R.lorze.renderOrder = 5; R.cross.renderOrder = 5;

    D.munis.forEach(function (m) {
      var secs = ['kanton', 'spiel']; Object.keys(HI).forEach(function (k) { if (HI[k].indexOf(m.name) >= 0) secs.push(k); });
      addLabel(m.name, 'muni', m.at[0], m.at[1], secs, m.sub);
    });
    D.labels.forEach(function (l) { addLabel(l.t, l.k, l.at[0], l.at[1], l.s, null, l.h); });
    LBL_ORDER = LBL.slice().sort(function (a, b) { return PRIO[a.kind] - PRIO[b.kind] || a.n - b.n; });
    buildMarkers();
    readTheme();

    ready = true; tReady = performance.now();
    canvas.style.opacity = '1';
    statusEl.textContent = '';
    hudA.textContent = '';
    if (!TEST) requestAnimationFrame(frame);
    await tick();
    var bb = await gunzip(b64(D.bldData));
    var count = await buildBuildings(bb);
    canvas.dataset.buildings = String(count);
    var tb2 = await gunzip(b64(D.treesData));
    canvas.dataset.trees = String(buildTrees(tb2));
  } catch (err) {
    console.error(err);
    fail('Das Relief konnte nicht aufgebaut werden. Liste und Texte bleiben nutzbar.');
  }
})();
})();
