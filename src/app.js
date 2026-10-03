(function () {
'use strict';
var D = window.ZG, F = D.fam, PD = D.portal || {};
var $ = function (s) { return document.querySelector(s); };
var statusEl = $('#status'), hudA = $('#hudA'), hudB = $('#hudB');
var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var TEST = !!window.ZG_TEST;
var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
var narrowMQ = matchMedia('(max-width: 760px)');
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function lerp(a, b, t) { return a + (b - a) * t; }
function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function swiss(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }
function dec(x, d) { return x.toFixed(d == null ? 1 : d).replace('.', ','); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(t) { var m = Math.round(t * 60 / 5) * 5, h = Math.floor(m / 60); return pad2(h) + ':' + pad2(m % 60); }
function slug(s) {
  return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function safeURL(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
var DEG = Math.PI / 180;
var GL = false;

/* ---------------- icons and categories ---------------- */
function waves(y) { return 'M2 ' + y + 'c2 0 2.6-1.5 4.6-1.5s2.6 1.5 4.6 1.5 2.6-1.5 4.6-1.5 2.6 1.5 4.6 1.5h1.6v2h-1.6c-2 0-2.6-1.5-4.6-1.5s-2.6 1.5-4.6 1.5-2.6-1.5-4.6-1.5S4 ' + (y + 2) + ' 2 ' + (y + 2) + 'z'; }
var ICON = {
  spiel: 'M4 4h16v2H4zM5.3 5.6h2.1L5.2 21H3.1zM16.6 5.6h2.1L20.9 21h-2.1zM9.6 6h1.2v9.4H9.6zM13.2 6h1.2v9.4h-1.2zM8.6 15.2h6.8v2.2H8.6z',
  baden: 'M17 4.6a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 1 1 0-4.6zM4.5 12.4l4.6-3.6 3.4 2.4 3.3-1.6 1 1.8-4.3 2.2-3-2.1-3.6 2.8zM2 15.6c2 0 2.6-1.5 4.6-1.5s2.6 1.5 4.6 1.5 2.6-1.5 4.6-1.5 2.6 1.5 4.6 1.5h1.6v2h-1.6c-2 0-2.6-1.5-4.6-1.5s-2.6 1.5-4.6 1.5-2.6-1.5-4.6-1.5S4 17.6 2 17.6zM2 19.6c2 0 2.6-1.5 4.6-1.5s2.6 1.5 4.6 1.5 2.6-1.5 4.6-1.5 2.6 1.5 4.6 1.5h1.6v2h-1.6c-2 0-2.6-1.5-4.6-1.5s-2.6 1.5-4.6 1.5-2.6-1.5-4.6-1.5S4 21.6 2 21.6z',
  feuer: 'M12 2c.8 3.2 4.6 5.2 4.6 9.6A4.6 4.6 0 0 1 12 16.2a4.6 4.6 0 0 1-4.6-4.6c0-2.1 1-3.6 2.1-4.6-.1 2 .9 3.2 2 3.2C11.7 7.4 10.9 4.8 12 2zM4.4 17.4l15.4 3.4-.5 2-15.4-3.4zM19.6 17.4L4.2 20.8l.5 2 15.4-3.4z',
  natur: 'M12 2l6.2 8.2h-3.1l4.4 6.3H14v4.9h-4v-4.9H4.5l4.4-6.3H5.8z',
  kultur: 'M12 2l10 5v2.2H2V7zM4 10.4h3.2v7.6H4zM10.4 10.4h3.2v7.6h-3.2zM16.8 10.4H20v7.6h-3.2zM2 19.2h20V22H2z',
  sport: 'M12 2.6a9.4 9.4 0 1 1 0 18.8a9.4 9.4 0 1 1 0-18.8zM12 7.8l-3.9 2.8 1.5 4.6h4.8l1.5-4.6z',
  wasser: 'M12 2C9 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-7-6-12z',
  wc: 'M7.5 2.6a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM5 8h5v7.4H9V22H6v-6.6H5zM16.5 2.6a2 2 0 1 1 0 4a2 2 0 1 1 0-4zM16.5 8l3.6 8.2H18V22h-3v-5.8h-2.1z',
  stadt: 'M7.5 22V9.5L12 2l4.5 7.5V22h-3.2v-4.6a1.3 1.3 0 0 0-2.6 0V22zM3 22v-8h3v8zM18 22v-8h3v8z',
  kirche: 'M11 1h2v2.6h2.2v2H13v2.6l5 3.8V22h-4.6v-4.4a1.4 1.4 0 0 0-2.8 0V22H6V12l5-3.8V5.6H8.8v-2H11z',
  burg: 'M3 22V8.5h2.4V6h2.2v2.5h2.2V6H12v2.5h2.2V6h2.2v2.5h2.2V6H21v16h-6.4v-4.6a2.6 2.6 0 0 0-5.2 0V22z',
  museum: 'M12 2l10 5v2.2H2V7zM4 10.4h3.2v7.6H4zM10.4 10.4h3.2v7.6h-3.2zM16.8 10.4H20v7.6h-3.2zM2 19.2h20V22H2z',
  berg: 'M1.5 20.5L9 7.5l3.8 6.2 2.9-4.2 6.8 11z',
  see: waves(6.2) + waves(11.2) + waves(16.2),
  denkmal: 'M10.4 2h3.2l1.6 14.6H8.8zM5.5 17.6h13V22h-13z',
  bahn: 'M2.6 3.8l18.6-2 .2 2-8.4.9V8H17a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h4.9V4.9l-9.1 1zM7.4 10.6v4h3.8v-4zM12.8 10.6v4h3.8v-4z',
  event: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zM5 9v10h14V9zM7 11h4v4H7z',
  gem: 'M12 3 2 11h3v9h5v-6h4v6h5v-9h3z',
  park: 'M6 2.5h7.2a6 6 0 0 1 0 12H10.4V21.5H6zm4.4 3.9v4.2h2.7a2.1 2.1 0 0 0 0-4.2z'
};
var EVENODD = { sport: 1, bahn: 1, event: 1, park: 1 };
var CATS = [
  { k: 'spiel', t: 'Spielplätze' }, { k: 'baden', t: 'Baden' }, { k: 'feuer', t: 'Feuer & Picknick' },
  { k: 'natur', t: 'Ausflug & Natur' }, { k: 'kultur', t: 'Kultur & Lernen' }, { k: 'sport', t: 'Sport & Spass' }
];
var SCATS = (PD.sightCats || ['Altstadt & Stadtbild', 'Kirche & Kloster', 'Burg & Schloss', 'Museum & Kunst', 'Aussicht & Berg', 'See & Wasser', 'Natur & Landschaft', 'Denkmal & Geschichte', 'Bahn & Schiff'])
  .map(function (t, i) { return { t: t, k: ['stadt', 'kirche', 'burg', 'museum', 'berg', 'see', 'natur', 'denkmal', 'bahn'][i] || 'natur' }; });
/* atlas order = marker category code: 0–5 family, 6 water, 7 WC, 8–16 sights, 17 events */
var ICONKEYS = ['spiel', 'baden', 'feuer', 'natur', 'kultur', 'sport', 'wasser', 'wc', 'stadt', 'kirche', 'burg', 'museum', 'berg', 'see', 'natur', 'denkmal', 'bahn', 'event', 'park'];
var MK_SIGHT = 8, MK_EVENT = 17, MK_PARK = 18;
function svgIcon(k, cls) { return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" aria-hidden="true"><path' + (EVENODD[k] ? ' fill-rule="evenodd"' : '') + ' d="' + ICON[k] + '"/></svg>'; }

/* ---------------- Gemeinden ---------------- */
var MUNI = {}, GEMS = [];
D.munis.forEach(function (m) {
  var x = (PD.gem || []).filter(function (g) { return g.name === m.name; })[0] || {};
  var g = { type: 'gem', id: slug(m.name), m: m, name: m.name, title: m.name, E: m.c[0], N: m.c[1], ha: m.ha, hmin: m.hmin, hmax: m.hmax,
    pop: x.pop || null, popDate: x.popDate || '', area: x.area || m.ha / 100, elev: x.elev || null, ortsteile: x.ortsteile || [], web: x.web || '',
    zt: x.zt || '', text: x.text || '', sources: x.sources || [] };
  MUNI[m.name] = m; GEMS.push(g);
});
GEMS.sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
var GEMBY = {}; GEMS.forEach(function (g) { GEMBY[g.id] = g; GEMBY[g.name] = g; });
var KANTON = PD.kanton || {};

/* ---------------- family places ---------------- */
var E0F = 2666000, N0F = 1207000;
var STEPS = F.steps;
var PL = F.places.map(function (p, i) {
  return { type: 'fam', i: i, id: String(i), cat: p.c, mk: p.c, kind: p.k, name: p.n || '', hint: p.h || '', gem: p.g, E: p.e + E0F, N: p.m + N0F, z: p.z, s: p.s || null, cover: p.v,
    dw: p.dw, dc: p.dc, zt: p.t || null, note: p.x || '', out: !!p.o, guests: !!p.q, flags: p.f || [], poly: p.p || null, osm: p.id || null,
    ph: p.ph || null, title: p.n || p.k };
});
(PD.famLinks || []).forEach(function (l) {
  var p = PL[l.i]; if (!p) return;
  if (l.t && l.t.length) p.zt = (p.zt || []).concat(l.t.filter(function (x) { return !(p.zt || []).some(function (y) { return y[1] === x[1]; }); }));
  if (l.n && !p.name) { p.name = l.n; p.title = l.n; }
  if (l.x) p.note = l.x;
  if (l.w) p.web = (p.web || []).concat(l.w);
});
(PD.famHide || []).forEach(function (i) { if (PL[i]) PL[i].hide = true; });
(PD.famExtra || []).forEach(function (p) {
  var i = PL.length;
  PL.push({ type: 'fam', i: i, id: String(i), cat: p.c, mk: p.c, kind: p.k, name: p.n, hint: p.h || '', gem: p.g, E: p.E, N: p.N, z: p.z || 430, s: null, cover: null,
    dw: null, dc: null, zt: p.t || null, note: p.x || '', out: !!p.o, guests: false, flags: [], poly: null, osm: p.osm || null, ph: p.ph || null, title: p.n, extra: true });
});
function shadeAt(p, t) {
  if (!p || !p.s || sunDay.k !== 'sommer') return null;
  var x = (t - STEPS[0]) / 0.5, n = p.s.length;
  if (x <= 0) return p.s[0] / 100;
  if (x >= n - 1) return p.s[n - 1] / 100;
  var i = Math.floor(x), f = x - i;
  return (p.s[i] * (1 - f) + p.s[i + 1] * f) / 100;
}
var SPIEL = PL.filter(function (p) { return p.cat === 0; });

/* ---------------- sights ---------------- */
var SIGHTS = (PD.sights || []).map(function (s, i) {
  return { type: 'sight', i: i, id: s.id, cat: s.c, mk: MK_SIGHT + s.c, title: s.n, name: s.n, kind: SCATS[s.c] ? SCATS[s.c].t : '', gem: s.g, town: s.town || '',
    E: s.E, N: s.N, z: s.z || null, text: s.t || '', facts: s.f || [], zt: s.zt || '', web: s.web || '', wd: s.wd || '', osm: s.osm || '', ph: s.ph || null, big: !!s.big };
});
var SIGHTBY = {}; SIGHTS.forEach(function (s) { SIGHTBY[s.id] = s; });

/* ---------------- events (loaded at runtime) ---------------- */
var EVENTS = [], EVENTBY = {}, EVMETA = { state: 'loading', updated: '' };
var TZ = 'Europe/Zurich';
var fmtDay = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
var fmtDayY = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
var fmtHM = new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
var fmtYMD = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });
function ymd(d) { return fmtYMD.format(d); }
function hasTime(iso) { return /T\d\d:\d\d/.test(iso || '') && !/T00:00(:00)?([+-]|Z|$)/.test(iso || ''); }
function occText(o, withYear) {
  var s = new Date(o.s), e = o.e ? new Date(o.e) : null;
  var t = (withYear ? fmtDayY : fmtDay).format(s);
  if (hasTime(o.s)) t += ', ' + fmtHM.format(s);
  if (e && ymd(e) !== ymd(s)) t += ' bis ' + (withYear ? fmtDayY : fmtDay).format(e);
  else if (e && hasTime(o.e) && hasTime(o.s) && o.e !== o.s) t += '–' + fmtHM.format(e);
  return t;
}
/* Zeitpunkt in ms: Angaben ohne Zeitzone gelten als Ortszeit Zürich, ein Datum ohne Uhrzeit als Mitternacht (Ende: Tagesende) */
function zMs(iso, endOfDay) {
  var m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d)(?:\.\d+)?)?)?(Z|[+-]\d\d:?\d\d)?$/.exec(iso || '');
  if (!m || m[7]) return +new Date(iso);
  var day = { y: +m[1], m: +m[2] - 1, d: +m[3] }, t = Date.UTC(day.y, day.m, day.d, +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) - tzOff(day) * 3600e3;
  return endOfDay && !m[4] ? t + 86400e3 - 1 : t;
}
function normEvent(e) {
  var occ = (e.dates && e.dates.length ? e.dates : [{ s: e.start, e: e.end }]).filter(function (o) { return o && o.s && !isNaN(zMs(o.s)); })
    .map(function (o) { var t0 = zMs(o.s), t1 = o.e ? zMs(o.e, true) : t0 + (hasTime(o.s) ? 3 * 3600e3 : 86400e3 - 1); return { s: o.s, e: o.e || null, t0: t0, t1: Math.max(t1, t0 + 3600e3) }; })
    .sort(function (a, b) { return a.t0 - b.t0; });
  var gem = e.gem && GEMBY[e.gem] ? GEMBY[e.gem].name : (e.gem || '');
  return { type: 'event', id: String(e.id), mk: MK_EVENT, title: e.title || '', name: e.title || '', kind: e.cat || 'Veranstaltung', gem: gem, town: e.town || '',
    E: e.E || null, N: e.N || null, exact: !!(e.E && e.N && e.exact !== false), venue: e.venue || '', address: e.address || '', teaser: e.teaser || '',
    url: safeURL(e.url), guidle: safeURL(e.guidle), img: safeURL(e.img), thumb: safeURL(e.thumb || e.img), credit: e.credit || '', org: e.org || '', price: e.price || '', tickets: safeURL(e.tickets),
    cats: e.cats && e.cats.length ? e.cats : (e.cat ? [e.cat] : []), occ: occ };
}
function nextOcc(ev, now) { for (var i = 0; i < ev.occ.length; i++) if (ev.occ[i].t1 >= now) return ev.occ[i]; return null; }

/* ---------------- sun, date, UV ---------------- */
var GAMMA = -0.786;
function lastSunday(y, m) { var d = new Date(Date.UTC(y, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); }
function tzOff(day) {
  var m = day.m, d = day.d;
  if (m > 2 && m < 9) return 2;
  if (m < 2 || m > 9) return 1;
  if (m === 2) return d >= lastSunday(day.y, 2) ? 2 : 1;
  return d < lastSunday(day.y, 9) ? 2 : 1;
}
function resolveDay(k, dt) {
  if (k === 'termin' && dt) { var q = dt.split('-'); return { k: 'termin', y: +q[0], m: +q[1] - 1, d: +q[2], ymd: dt }; }
  if (k === 'heute') { var p = fmtYMD.format(new Date()).split('-'); return { k: 'heute', y: +p[0], m: +p[1] - 1, d: +p[2] }; }
  if (k === 'winter') return { k: 'winter', y: 2026, m: 11, d: 21 };
  return { k: 'sommer', y: 2026, m: 6, d: 21 };
}
var sunDay = resolveDay('heute');
function sunpos(hours, day) {
  day = day || sunDay;
  var off = tzOff(day);
  var ms = Date.UTC(day.y, day.m, day.d) + (hours - off) * 3600000;
  var jd = ms / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525;
  var L0 = ((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360 + 360) % 360;
  var M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T), Mr = M * DEG;
  var C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
  var om = 125.04 - 1934.136 * T, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * DEG);
  var eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(om * DEG);
  var dc = Math.asin(Math.sin(eps * DEG) * Math.sin(lam * DEG));
  var y = Math.pow(Math.tan(eps * DEG / 2), 2), L0r = L0 * DEG;
  var eqt = 4 / DEG * (y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
  var mins = (((hours - off) * 60) % 1440 + 1440) % 1440;
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
function dayLabel(day) {
  if (day.k === 'sommer') return '21. Juli';
  if (day.k === 'winter') return '21. Dezember';
  return 'heute, ' + new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', timeZone: TZ }).format(new Date(Date.UTC(day.y, day.m, day.d, 12)));
}

function fail(msg) {
  document.documentElement.classList.add('noscene');
  statusEl.textContent = msg; hudA.textContent = 'Relief nicht verfügbar'; hudB.textContent = '';
  var n = document.getElementById('noGL'); if (n) { n.textContent = msg + ' Listen, Details und Links funktionieren weiter.'; n.hidden = false; }
}

/* ---------------- sun UI (built before WebGL so it works without 3D) ---------------- */
function nowHours() { var p = fmtHM.format(new Date()).split(':'); return +p[0] + (+p[1]) / 60; }
var sunT = (function () { var t = clamp(Math.round(nowHours() * 4) / 4, 7, 21); return sunpos(t).alt > 3 ? t : 13; })(), sun = sunpos(sunT), sunUIs = [], playing = false, playLast = 0;
function arcPts() { var pts = [], t; for (t = 5; t <= 22.001; t += 0.25) pts.push([t, sunpos(t).alt]); return pts; }
var ARC = arcPts();
function arcX(t) { return (t - 5) / 17 * 300; } function arcY(a) { return 42 - clamp(a, -12, 66) / 66 * 38; }
function arcPaths() {
  var all = '', day = '', started = false;
  ARC.forEach(function (p, i) { all += (i ? 'L' : 'M') + arcX(p[0]).toFixed(1) + ' ' + arcY(p[1]).toFixed(1); });
  ARC.forEach(function (p) { if (p[1] > 0) { day += (started ? 'L' : 'M') + arcX(p[0]).toFixed(1) + ' ' + arcY(p[1]).toFixed(1); started = true; } });
  return [all, day];
}
function playIcon(on) { return on ? '<svg viewBox="0 0 14 14"><path d="M3 2h3v10H3zM8 2h3v10H8z"/></svg>' : '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg>'; }
function buildSunUI(el, opts) {
  if (!el) return null;
  opts = opts || {};
  var ap = arcPaths();
  el.classList.toggle('compact', !!opts.compact);
  el.innerHTML = '<div class="sun-top"><button class="sun-play" type="button" aria-label="Tagesverlauf abspielen">' + playIcon(false) + '</button>' +
    '<div class="sun-read"><b class="sun-time">15:00</b><span class="sun-pos"></span></div><span class="uv" data-c="3"><i></i><span class="uv-t"></span></span></div>' +
    (opts.noDate ? '' : '<div class="sun-date" role="group" aria-label="Datum">' + (opts.termin ? '<button type="button" data-day="termin" data-ymd="' + opts.termin.ymd + '" aria-pressed="' + (sunDay.k === 'termin') + '">' + esc(opts.termin.label) + '</button>' : '') +
      ['sommer', 'heute', 'winter'].map(function (k) {
      return '<button type="button" data-day="' + k + '" aria-pressed="' + (sunDay.k === k) + '">' + (k === 'sommer' ? '21. Juli' : k === 'heute' ? 'Heute' : '21. Dez.') + '</button>'; }).join('') + '</div>') +
    '<svg class="sun-arc" viewBox="0 0 300 46" aria-hidden="true"><line class="horizon" x1="0" x2="300" y1="' + arcY(0).toFixed(1) + '" y2="' + arcY(0).toFixed(1) + '"/><path class="path" d="' + ap[0] + '"/><path class="day" d="' + ap[1] + '"/><circle class="dot" r="6" cx="0" cy="0"/></svg>' +
    '<input type="range" min="7" max="21" step="0.25" value="15" aria-label="Uhrzeit">' +
    '<div class="sun-scale" aria-hidden="true"><span>7</span><span>9</span><span>11</span><span>13</span><span>15</span><span>17</span><span>19</span><span>21 Uhr</span></div>' +
    (opts.hint ? '<p class="shint">' + opts.hint + '</p>' : '');
  var ui = { el: el, time: el.querySelector('.sun-time'), pos: el.querySelector('.sun-pos'), uv: el.querySelector('.uv'), uvt: el.querySelector('.uv-t'),
    dot: el.querySelector('.dot'), range: el.querySelector('input'), play: el.querySelector('.sun-play'), pAll: el.querySelector('.sun-arc .path'), pDay: el.querySelector('.sun-arc .day'),
    days: el.querySelectorAll('.sun-date button'), z: opts.z || 425 };
  ui.range.addEventListener('input', function () { stopPlay(); setSunT(parseFloat(ui.range.value), 'ui'); });
  ui.play.addEventListener('click', function () { if (playing) stopPlay(); else { playing = true; playLast = performance.now(); sunUIs.forEach(function (u) { u.play.setAttribute('aria-label', 'Tagesverlauf anhalten'); u.play.innerHTML = playIcon(true); }); } });
  Array.prototype.forEach.call(ui.days, function (b) { b.addEventListener('click', function () { setSunDay(b.dataset.day, b.dataset.ymd); }); });
  sunUIs = sunUIs.filter(function (u) { return u.el.isConnected && u.el !== el; });
  sunUIs.push(ui);
  updateSunUI();
  return ui;
}
function stopPlay() { if (!playing) return; playing = false; sunUIs.forEach(function (u) { u.play.setAttribute('aria-label', 'Tagesverlauf abspielen'); u.play.innerHTML = playIcon(false); }); }
var lastUIupd = 0, listDirty = true, markerShadeDirty = true, markerVisDirty = true;
function updateSunUI() {
  sunUIs = sunUIs.filter(function (u) { return u.el.isConnected; });
  sunUIs.forEach(function (ui) {
    var u = uvi(sun.alt, ui.z), c = uvCat(u);
    ui.time.textContent = fmtTime(sunT) + ' Uhr';
    ui.pos.textContent = sun.alt > 0 ? 'Sonne ' + Math.round(sun.alt) + '° hoch, aus ' + dirWord(sun.az) : 'Sonne unter dem Horizont';
    ui.uv.dataset.c = c[0]; ui.uvt.textContent = 'UV ' + Math.round(u) + ' · ' + c[1];
    ui.uv.title = 'UV-Index bei wolkenlosem Himmel, geschätzt aus dem Sonnenstand';
    ui.dot.setAttribute('cx', arcX(sunT).toFixed(1)); ui.dot.setAttribute('cy', arcY(sun.alt).toFixed(1));
    if (document.activeElement !== ui.range) ui.range.value = String(Math.round(sunT * 4) / 4);
    ui.range.setAttribute('aria-valuetext', fmtTime(sunT) + ' Uhr, ' + dayLabel(sunDay));
  });
  updateChart();
}
function setSunT(t, src) {
  t = clamp(t, 7, 21);
  if (Math.abs(t - sunT) < 1e-4 && src !== 'force') return;
  sunT = t; sun = sunpos(t);
  if (GL) sunVector(sun, U.uSunDir.value);
  var now = performance.now();
  if (src !== 'play' || now - lastUIupd > 60) { lastUIupd = now; updateSunUI(); }
  listDirty = true; markerShadeDirty = true;
  if (!GL) { updateDetailLive(); if (MODE === 'familie') renderList(); }
}
function setSunDay(k, dt, noHead) {
  sunDay = resolveDay(k, dt);
  ARC = arcPts();
  var ap = arcPaths();
  sunUIs.forEach(function (u) {
    if (u.pAll) { u.pAll.setAttribute('d', ap[0]); u.pDay.setAttribute('d', ap[1]); }
    Array.prototype.forEach.call(u.days, function (b) { b.setAttribute('aria-pressed', String(b.dataset.day === k)); });
  });
  if (GL) smState.need = true;
  setSunT(sunT, 'force');
  markerVisDirty = true;
  if (MODE === 'familie' && !noHead) renderHead();
  if (SEL) updateDetailLive(true);
}
/* small bar chart: playgrounds with at least half of the area in shade */
var CH = null;
function buildChart(el) {
  if (!el) { CH = null; return; }
  var n = STEPS.length, W = 300, H = 92, top = 18, base = 74, total = SPIEL.filter(function (p) { return p.s; }).length;
  var counts = STEPS.map(function (t, k) { return SPIEL.filter(function (p) { return p.s && p.s[k] >= 50; }).length; });
  var bw = W / n, svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Spielplätze mit mindestens halbem Schatten je Uhrzeit am 21. Juli">';
  counts.forEach(function (c, k) {
    var h = (base - top) * c / total, x = k * bw + 1;
    svg += '<rect class="b" data-k="' + k + '" x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + Math.max(h, 1).toFixed(1) + '" rx="2"><title>' + fmtTime(STEPS[k]) + ' Uhr: ' + c + ' von ' + total + '</title></rect>';
  });
  svg += '<line class="base" x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '"/>';
  [8, 12, 16, 19].forEach(function (t) { var k = STEPS.indexOf(t); svg += '<text class="ax" x="' + (k * bw + bw / 2).toFixed(1) + '" y="' + (base + 13) + '" text-anchor="middle">' + t + (t === 19 ? ' Uhr' : '') + '</text>'; });
  svg += '<text class="val" x="0" y="12" text-anchor="middle"></text></svg>';
  el.innerHTML = '<figcaption><b>Spielplätze mit mindestens halbem Schatten</b> am 21. Juli, von ' + total + '. Ein Klick auf einen Balken stellt die Uhrzeit.</figcaption>' + svg;
  CH = { counts: counts, bw: bw, base: base, top: top, total: total, bars: el.querySelectorAll('.b'), val: el.querySelector('.val') };
  el.addEventListener('click', function (e) { var b = e.target.closest('.b'); if (!b) return; stopPlay(); if (sunDay.k !== 'sommer') setSunDay('sommer'); setSunT(STEPS[+b.dataset.k], 'ui'); });
  updateChart();
}
function updateChart() {
  if (!CH || !CH.val.isConnected) return;
  var k = clamp(Math.round((sunT - 8) / 0.5), 0, STEPS.length - 1);
  for (var i = 0; i < CH.bars.length; i++) CH.bars[i].classList.toggle('on', i === k && sunT >= 8 && sunT <= 19);
  var h = (CH.base - CH.top) * CH.counts[k] / CH.total;
  CH.val.setAttribute('x', (k * CH.bw + CH.bw / 2).toFixed(1)); CH.val.setAttribute('y', (CH.base - h - 4).toFixed(1));
  CH.val.textContent = (sunT >= 8 && sunT <= 19) ? CH.counts[k] : '';
}

/* ---------------- app state, routing ---------------- */
var MODE = 'home', SEL = null, selGem = null, touring = false, pushedDetail = false;
var panel = $('#panel'), phEl = $('#ph'), listEl = $('#list'), detailEl = $('#detail'), pscroll = $('#panel'), homeEl = $('#home');
var filt = {
  familie: { cats: [true, true, true, true, true, true], gem: '', sunMax: 100, sunScope: 'now', zt: false, more: false },
  sights: { cats: SCATS.map(function () { return true; }), gem: '' },
  events: { win: 'alle', gem: '', cat: '' }
};
var showWater = false, showWC = false;
var MODEPATH = { home: '', gemeinden: 'gemeinden', sights: 'sehenswuerdigkeiten', familie: 'familien', events: 'events', info: 'info' };
var PATHMODE = {}; Object.keys(MODEPATH).forEach(function (k) { PATHMODE[MODEPATH[k]] = k; });
function parseHash() {
  var h = location.hash || '', q = {}, qi;
  try { h = decodeURI(h); } catch (e) {}
  h = h.replace(/^#\/?/, ''); qi = h.indexOf('?');
  if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = a[1] || ''; }); h = h.slice(0, qi); }
  var parts = h.split('/').filter(Boolean);
  return { mode: PATHMODE[parts[0] || ''] || 'home', id: parts[1] || null, q: q };
}
function gemSlug(g) { return g === '_out' ? 'ausserhalb' : slug(g); }
function catsQ(arr) { return arr.every(Boolean) ? '' : arr.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; }).join(','); }
function catsFromQ(q, n) { var on = (q || '').split(',').filter(function (x) { return /^\d+$/.test(x); }).map(Number).filter(function (i) { return i < n; }), a = []; for (var i = 0; i < n; i++) a.push(!on.length || on.indexOf(i) >= 0); return a; }
function curQuery(mode) {
  var q = [], f;
  if (mode === 'sights') { f = filt.sights; if (f.gem) q.push('g=' + gemSlug(f.gem)); if (catsQ(f.cats)) q.push('c=' + catsQ(f.cats)); }
  if (mode === 'familie') {
    f = filt.familie; if (f.gem) q.push('g=' + gemSlug(f.gem)); if (catsQ(f.cats)) q.push('c=' + catsQ(f.cats));
    if (f.sunMax < 100) q.push('s=' + f.sunMax + (f.sunScope === 'day' ? 't' : '')); if (f.zt) q.push('t=1');
  }
  if (mode === 'events') { f = filt.events; if (f.gem) q.push('g=' + gemSlug(f.gem)); if (f.win !== 'alle') q.push('w=' + f.win); if (f.cat) q.push('k=' + encodeURIComponent(f.cat)); }
  return q.length ? '?' + q.join('&') : '';
}
function hashFor(mode, id) { var p = MODEPATH[mode]; return '#/' + p + (p && id ? '/' + encodeURIComponent(id) : '') + (id ? '' : curQuery(mode)); }
function go(mode, id, replace) {
  var h = hashFor(mode, id);
  if (location.hash === h) { applyRoute(); return; }
  if (replace) { history.replaceState(null, '', h); applyRoute(); }
  else location.hash = h;
}
function syncHash() { var h = hashFor(MODE, SEL ? SEL.id : selGem ? selGem.id : null); if (location.hash !== h) history.replaceState(null, '', h); updTabs(); }
/* Reiter und Einstiege führen zur Liste mit den zuletzt gewählten Filtern */
function updTabs() {
  Array.prototype.forEach.call(document.querySelectorAll('#tabs a[data-mode], a.entry'), function (a) {
    var m = a.dataset.mode || PATHMODE[(a.getAttribute('href') || '').replace(/^#\/?/, '').split(/[/?]/)[0]];
    if (m && m !== 'home') { if (!a.dataset.mode) a.dataset.mode = m; a.setAttribute('href', hashFor(m)); }
  });
}
function gemFromSlug(s) { return s === 'ausserhalb' ? '_out' : s && GEMBY[s] ? GEMBY[s].name : ''; }
var lastRoute = '', lastQ = '';
function applyRoute() {
  var r = parseHash();
  if (r.mode === 'info') { if (!/\bm-\w/.test(document.body.className)) setMode('home', true); openInfo(); return; }
  closeInfo();
  if (touring) stopTour(true);
  if (r.mode === 'sights' && !r.id) { filt.sights.gem = gemFromSlug(r.q.g); filt.sights.cats = catsFromQ(r.q.c, SCATS.length); }
  if (r.mode === 'familie' && !r.id) {
    var ff = filt.familie; ff.gem = gemFromSlug(r.q.g); ff.cats = catsFromQ(r.q.c, CATS.length); ff.zt = r.q.t === '1';
    var sm = /^(\d+)(t?)$/.exec(r.q.s || ''); ff.sunMax = sm ? clamp(+sm[1], 0, 100) : 100; ff.sunScope = sm && sm[2] ? 'day' : 'now';
    if (ff.sunMax < 100 && sunDay.k !== 'sommer') setSunDay('sommer', null, true);
  }
  if (r.mode === 'events' && !r.id) { filt.events.gem = gemFromSlug(r.q.g); filt.events.win = r.q.w || 'alle'; filt.events.cat = r.q.k ? decodeURIComponent(r.q.k) : ''; }
  var qkey = r.mode + JSON.stringify(r.q);
  if (!r.id && r.mode === MODE && qkey !== lastQ && MODE !== 'home') { renderHead(); listDirty = true; markerVisDirty = true; }
  lastQ = qkey;
  var changed = r.mode !== MODE;
  setMode(r.mode, changed);
  var it = r.id ? findItem(r.mode, r.id) : null;
  var nf = $('#notFound'), pending = r.mode === 'events' && EVMETA.state !== 'ok' && EVMETA.state !== 'error';
  if (nf) nf.hidden = !(r.id && !it && !pending);
  if (it) {
    if (it !== SEL && it !== selGem) openItem(it);
  } else if (SEL || selGem) {
    closeDetail(true);
  } else if (changed) flyContext();
  lastRoute = location.hash;
  updTabs();
}
function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : null; }
function findItem(mode, id) {
  if (mode === 'gemeinden') return own(GEMBY, id);
  if (mode === 'sights') return own(SIGHTBY, id);
  if (mode === 'familie') return /^\d+$/.test(id) && PL[+id] && !PL[+id].hide ? PL[+id] : null;
  if (mode === 'events') return own(EVENTBY, id);
  return null;
}
function setMode(m, changed) {
  MODE = m;
  panel.inert = m === 'home' || touring;
  ['home', 'gemeinden', 'sights', 'familie', 'events'].forEach(function (k) { document.body.classList.toggle('m-' + k, k === m); });
  Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { if (a.dataset.mode === m) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (changed) {
    if (SEL || selGem) closeDetail(true);
    renderHead(); renderList();
    pscroll.scrollTop = 0;
    if (m !== 'home') showHint();
  }
  markerVisDirty = true; listDirty = true;
  document.title = m === 'home' ? 'Zug entdecken' : ({ gemeinden: 'Gemeinden', sights: 'Sehenswürdigkeiten', familie: 'Für Familien', events: 'Events' }[m] + ' · Zug entdecken');
}

/* ---------------- panel head per mode ---------------- */
function gemSelect(id, val, counts, outLabel) {
  return '<label class="sr" for="' + id + '">Gemeinde</label><select id="' + id + '"><option value="">Alle Gemeinden</option>' +
    GEMS.map(function (g) { var n = counts ? (counts[g.name] || 0) : null; return '<option value="' + esc(g.name) + '"' + (g.name === val ? ' selected' : '') + '>' + esc(g.name) + (n != null ? ' (' + n + ')' : '') + '</option>'; }).join('') +
    (counts && counts._out ? '<option value="_out"' + (val === '_out' ? ' selected' : '') + '>' + (outLabel || 'Ausserhalb') + ' (' + counts._out + ')</option>' : '') + '</select>';
}
function countBy(arr) { var c = {}; arr.forEach(function (x) { if (MUNI[x.gem]) c[x.gem] = (c[x.gem] || 0) + 1; else c._out = (c._out || 0) + 1; }); return c; }
function fmtISODate(x) { var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(x || ''); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : (x || ''); }
function allChip(arr) { return '<button type="button" class="chip" data-cat="all" aria-pressed="' + arr.every(Boolean) + '">Alle</button>'; }
function normQ(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss'); }
function qMatch(q, it) { if (!q) return true; var hay = normQ(it.title + ' ' + itemSub(it) + ' ' + (it.kind || '')); return normQ(q).split(/\s+/).every(function (w) { return !w || hay.indexOf(w) >= 0; }); }
function renderHead() {
  var h = '', m = MODE;
  if (m === 'gemeinden') {
    var pop = KANTON.pop ? swiss(KANTON.pop) + ' Einwohnerinnen und Einwohner' + (KANTON.popDate ? ' (' + esc(fmtISODate(KANTON.popDate)) + ')' : '') + ', ' : '';
    h = '<p class="kicker">' + svgIcon('gem') + 'Gemeinden</p><h2>Elf Gemeinden zwischen Zugersee und Ägerisee</h2><p class="intro">' + pop + dec(KANTON.area || 238.7) + ' km². Wählen Sie eine Gemeinde in der Liste oder auf der Karte.</p>';
  } else if (m === 'sights') {
    var cs = countBy(SIGHTS), f = filt.sights;
    h = '<p class="kicker">' + svgIcon('stadt') + 'Sehenswürdigkeiten</p><h2>' + SIGHTS.length + ' Orte in ' + (Object.keys(cs).filter(function (k) { return k !== '_out'; }).length === 11 ? 'elf Gemeinden' : 'den Zuger Gemeinden') + '</h2>' +
      '<div class="flt">' + '<div class="srch"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg><input type="search" id="fQ" placeholder="Suchen" value="' + esc(f.q || '') + '" aria-label="' + 'Sehenswürdigkeit suchen' + '" autocomplete="off" enterkeyhint="search"></div>' + gemSelect('fGemS', f.gem, cs) + '</div>' +
      '<div class="flt scroll" id="chipsS" role="group" aria-label="Kategorien">' + allChip(f.cats) + SCATS.map(function (c, k) {
        var n = SIGHTS.filter(function (s) { return s.cat === k; }).length; if (!n) return '';
        return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="' + f.cats[k] + '">' + svgIcon(c.k) + esc(c.t) + ' <small>' + n + '</small></button>'; }).join('') + '</div>' +
      '<div class="count"><span id="count" role="status"></span><span id="countHint">Sortiert nach Gemeinde</span></div>';
  } else if (m === 'familie') {
    var ff = filt.familie, cf = countBy(PL.filter(function (p) { return !p.hide; })), summer = sunDay.k === 'sommer', nMore = (ff.sunMax < 100 && summer ? 1 : 0) + (ff.zt ? 1 : 0) + (showWater ? 1 : 0) + (showWC ? 1 : 0);
    h = '<p class="kicker">' + svgIcon('spiel') + 'Für Familien</p><h2>Spielplätze und Ausflüge</h2>' +
      '<div class="flt scroll" id="chipsF" role="group" aria-label="Kategorien">' + allChip(ff.cats) + CATS.map(function (c, k) {
        var n = PL.filter(function (p) { return p.cat === k && !p.hide; }).length;
        return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="' + ff.cats[k] + '">' + svgIcon(c.k) + c.t + ' <small>' + n + '</small></button>'; }).join('') + '</div>' +
      '<div class="flt">' + '<div class="srch"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg><input type="search" id="fQ" placeholder="Suchen" value="' + esc(ff.q || '') + '" aria-label="Familienort suchen" autocomplete="off" enterkeyhint="search"></div>' + gemSelect('fGemF', ff.gem, cf) +
      '<button type="button" class="chip morebtn" id="fMore" aria-expanded="' + ff.more + '" aria-controls="fBox"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3zm4 6h10v2H7zm3 6h4v2h-4z"/></svg>Filter' + (nMore ? ' <small class="badge">' + nMore + '</small>' : '') + '</button></div>' +
      '<div class="fbox" id="fBox"' + (ff.more ? '' : ' hidden') + '>' +
        '<div class="sunflt"><div class="sf-top"><label for="fSun">Sonne höchstens</label><b id="fSunV">' + (ff.sunMax >= 100 ? 'alle Orte' : ff.sunMax + '&nbsp;%') + '</b></div>' +
        '<input type="range" id="fSun" min="0" max="100" step="10" value="' + ff.sunMax + '" aria-describedby="fSunH">' +
        '<div class="seg" role="group" aria-label="Zeitraum für den Sonnenanteil"><button type="button" data-scope="now" aria-pressed="' + (ff.sunScope === 'now') + '"' + (summer ? '' : ' disabled') + '>Zur Uhrzeit</button><button type="button" data-scope="day" aria-pressed="' + (ff.sunScope === 'day') + '"' + (summer ? '' : ' disabled') + '>Tagesmittel 10–17 Uhr</button></div>' +
        '<p class="fhint" id="fSunH">' + (summer ? 'Anteil der Fläche in der Sonne, berechnet für den 21. Juli. Nach links schieben zeigt schattigere Orte; Orte ohne Schattenberechnung werden dann ausgeblendet.' : 'Der Schatten jedes Spielplatzes ist für den 21. Juli berechnet. Wer den Regler bewegt, stellt das Datum auf diesen Tag.') + '</p>' +
        '<div class="fdate"><span>Datum</span><div class="seg" role="group" aria-label="Datum für Sonnenstand">' + ['sommer', 'heute', 'winter'].map(function (k) { return '<button type="button" data-day="' + k + '" aria-pressed="' + (sunDay.k === k) + '">' + (k === 'sommer' ? '21. Juli' : k === 'heute' ? 'Heute' : '21. Dez.') + '</button>'; }).join('') + '</div></div></div>' +
        '<div class="flt">' +
        '<button type="button" class="chip" id="fZT" aria-pressed="' + ff.zt + '">Tipps von Zug Tourismus</button>' +
        '<button type="button" class="chip" id="tWater" aria-pressed="' + showWater + '">' + svgIcon('wasser') + 'Trinkbrunnen</button>' +
        '<button type="button" class="chip" id="tWC" aria-pressed="' + showWC + '">' + svgIcon('wc') + 'WC</button></div>' +
        '<details class="more-info"><summary>Schatten im Tagesverlauf</summary><figure class="mini" id="miniChart"></figure>' +
        '<p class="note" style="font-size:13px;color:var(--ink-2);margin:6px 0 0">Für jeden Spielplatz ist berechnet, welcher Teil der Fläche am 21. Juli im Schatten von Bäumen, Gebäuden und Gelände liegt. Grundlage ist das Oberflächenmodell swissSURFACE3D.</p></details>' +
      '</div>' +
      '<div class="sun compact" id="sunFam"></div>' +
      '<div class="count"><span id="count" role="status"></span><span id="countHint"></span></div>';
  } else if (m === 'events') {
    var fe = filt.events, live = liveEvents(), ce = countBy(live), cats = {};
    live.forEach(function (e) { e.cats.forEach(function (c) { cats[c] = (cats[c] || 0) + 1; }); });
    var WIN = [['alle', 'Alle'], ['heute', 'Heute'], ['we', 'Wochenende'], ['7', '7 Tage'], ['30', '30 Tage']];
    h = '<p class="kicker">' + svgIcon('event') + 'Veranstaltungen</p><h2>Was im Kanton Zug läuft</h2>' +
      '<div class="flt" id="winE" role="group" aria-label="Zeitraum">' + WIN.map(function (w) { return '<button type="button" class="chip" data-win="' + w[0] + '" aria-pressed="' + (fe.win === w[0]) + '">' + w[1] + '</button>'; }).join('') + '</div>' +
      '<div class="flt">' + '<div class="srch"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg><input type="search" id="fQ" placeholder="Suchen" value="' + esc(fe.q || '') + '" aria-label="Veranstaltung suchen" autocomplete="off" enterkeyhint="search"></div>' + gemSelect('fGemE', fe.gem, ce, 'Kantonsweit oder ausserhalb') +
      (Object.keys(cats).length > 1 ? '<label class="sr" for="fCatE">Kategorie</label><select id="fCatE"><option value="">Alle Kategorien</option>' + Object.keys(cats).sort(function (a, b) { return a.localeCompare(b, 'de'); }).map(function (k) {
        return '<option value="' + esc(k) + '"' + (fe.cat === k ? ' selected' : '') + '>' + esc(k) + ' (' + cats[k] + ')</option>'; }).join('') + '</select>' : '') + '</div>' +
      '<div class="count"><span id="count" role="status"></span><span id="countHint"></span></div>';
  }
  var ae = document.activeElement, fsel = null;
  if (ae && phEl.contains(ae)) {
    fsel = ae.id ? '#' + ae.id : ae.dataset.day ? '#fBox [data-day="' + ae.dataset.day + '"]' : ae.dataset.scope ? '#fBox [data-scope="' + ae.dataset.scope + '"]' : ae.dataset.cat ? '[data-cat="' + ae.dataset.cat + '"]' : ae.dataset.win ? '[data-win="' + ae.dataset.win + '"]' : null;
  }
  phEl.innerHTML = h;
  wireHead();
  if (fsel) { var nf = phEl.querySelector(fsel); if (nf) nf.focus({ preventScroll: true }); }
  $('#pfootL').textContent = m === 'events' && EVMETA.updated ? 'Stand ' + new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(EVMETA.updated)) : '';
}
function wireHead() {
  var m = MODE, qi = $('#fQ');
  if (qi) qi.addEventListener('input', function () { var f = filt[m === 'sights' ? 'sights' : m === 'familie' ? 'familie' : 'events']; f.q = qi.value.trim(); evShown = 60; listDirty = true; markerVisDirty = true; renderList(); });
  function onGem(sel, f) {
    if (!sel) return;
    sel.addEventListener('change', function () {
      f.gem = sel.value; listDirty = true; markerVisDirty = true; renderList(); syncHash();
      if (f.gem && MUNI[f.gem]) flyToMuni(MUNI[f.gem]); else flyOverview();
    });
  }
  if (m === 'sights') {
    onGem($('#fGemS'), filt.sights);
    $('#chipsS').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; toggleCat(filt.sights.cats, +b.dataset.cat, this); });
  } else if (m === 'familie') {
    onGem($('#fGemF'), filt.familie);
    $('#chipsF').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; toggleCat(filt.familie.cats, +b.dataset.cat, this); });
    var ff = filt.familie;
    $('#fMore').addEventListener('click', function () { ff.more = !ff.more; this.setAttribute('aria-expanded', String(ff.more)); $('#fBox').hidden = !ff.more; });
    var fs = $('#fSun');
    fs.addEventListener('input', function () {
      if (sunDay.k !== 'sommer') {
        // Schattenwerte gibt es für den 21. Juli: Datum dorthin wechseln, ohne den Regler neu aufzubauen
        setSunDay('sommer', null, true);
        Array.prototype.forEach.call(document.querySelectorAll('#fBox .fdate button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.day === 'sommer')); });
        Array.prototype.forEach.call(document.querySelectorAll('#fBox .sunflt .seg button'), function (b) { b.disabled = false; });
        var hh = $('#fSunH'); if (hh) hh.textContent = 'Datum auf den 21. Juli gestellt: Für diesen Tag ist der Schatten jedes Spielplatzes berechnet. Nach links schieben zeigt schattigere Orte.';
      }
      ff.sunMax = +fs.value; $('#fSunV').innerHTML = ff.sunMax >= 100 ? 'alle Orte' : ff.sunMax + '&nbsp;%'; updMoreBadge(); listDirty = true; markerVisDirty = true; renderList(); });
    fs.addEventListener('change', syncHash);
    Array.prototype.forEach.call(document.querySelectorAll('#fBox .fdate button'), function (b) { b.addEventListener('click', function () { setSunDay(b.dataset.day); }); });
    Array.prototype.forEach.call(document.querySelectorAll('#fBox .sunflt > .seg button'), function (b) {
      b.addEventListener('click', function () { ff.sunScope = b.dataset.scope; Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); listDirty = true; markerVisDirty = true; renderList(); syncHash(); });
    });
    $('#fZT').addEventListener('click', function () { ff.zt = !ff.zt; this.setAttribute('aria-pressed', String(ff.zt)); updMoreBadge(); listDirty = true; markerVisDirty = true; renderList(); syncHash(); });
    $('#tWater').addEventListener('click', function () { showWater = !showWater; this.setAttribute('aria-pressed', String(showWater)); updMoreBadge(); markerVisDirty = true; });
    $('#tWC').addEventListener('click', function () { showWC = !showWC; this.setAttribute('aria-pressed', String(showWC)); updMoreBadge(); markerVisDirty = true; });
    buildSunUI($('#sunFam'), { compact: true });
    buildChart($('#miniChart'));
  } else if (m === 'events') {
    onGem($('#fGemE'), filt.events);
    $('#winE').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; filt.events.win = b.dataset.win;
      Array.prototype.forEach.call(this.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', String(c === b)); }); listDirty = true; markerVisDirty = true; renderList(); syncHash(); });
    var fc = $('#fCatE'); if (fc) fc.addEventListener('change', function () { filt.events.cat = fc.value; listDirty = true; markerVisDirty = true; renderList(); syncHash(); });
  }
}
function updMoreBadge() {
  var ff = filt.familie, b = $('#fMore'); if (!b) return;
  var n = (ff.sunMax < 100 && sunDay.k === 'sommer' ? 1 : 0) + (ff.zt ? 1 : 0) + (showWater ? 1 : 0) + (showWC ? 1 : 0), sm = b.querySelector('.badge');
  if (n && !sm) { b.insertAdjacentHTML('beforeend', ' <small class="badge">' + n + '</small>'); } else if (sm) { if (n) sm.textContent = n; else sm.remove(); }
}
function toggleCat(arr, k, wrap) {
  var allOn = arr.every(Boolean), j;
  if (isNaN(k)) { for (j = 0; j < arr.length; j++) arr[j] = true; }
  else if (allOn) { for (j = 0; j < arr.length; j++) arr[j] = j === k; }
  else { arr[k] = !arr[k]; if (!arr.some(Boolean)) for (j = 0; j < arr.length; j++) arr[j] = true; }
  Array.prototype.forEach.call(wrap.querySelectorAll('.chip'), function (c) { c.setAttribute('aria-pressed', String(c.dataset.cat === 'all' ? arr.every(Boolean) : !!arr[+c.dataset.cat])); });
  listDirty = true; markerVisDirty = true; renderList(); syncHash();
}

/* ---------------- filters ---------------- */
function gemMatch(want, gem) { return !want || (want === '_out' ? !MUNI[gem] : gem === want); }
function matchFam(p) {
  var f = filt.familie;
  if (p.hide || !f.cats[p.cat]) return false;
  if (f.q && !qMatch(f.q, p)) return false;
  if (!gemMatch(f.gem, p.gem)) return false;
  if (f.zt && !p.zt) return false;
  if (f.sunMax < 100 && sunDay.k === 'sommer') { var e = sunExposure(p); if (e == null || e > f.sunMax / 100 + 1e-6) return false; }
  return true;
}
/* share of the playground area in the sun: at the chosen time, or the mean between 10 and 17 h (21 July) */
function sunExposure(p) {
  if (!p.s || sunDay.k !== 'sommer') return null;
  if (filt.familie.sunScope === 'day') {
    var sum = 0, n = 0; for (var k = 0; k < STEPS.length; k++) if (STEPS[k] >= 10 && STEPS[k] <= 17) { sum += 1 - p.s[k] / 100; n++; }
    return n ? sum / n : null;
  }
  var sh = shadeAt(p, sunT); return sh == null ? null : 1 - sh;
}
function matchSight(s) { var f = filt.sights; return f.cats[s.cat] && gemMatch(f.gem, s.gem) && qMatch(f.q, s); }
function winRange(w) {
  var now = Date.now(), p = fmtYMD.format(new Date()).split('-'), y = +p[0], mo = +p[1] - 1, d = +p[2];
  var start = Date.UTC(y, mo, d) - tzOff({ y: y, m: mo, d: d }) * 3600e3, day = 86400e3;
  if (w === 'heute') return [now, start + day];
  if (w === '7') return [now, start + 7 * day];
  if (w === '30') return [now, start + 30 * day];
  if (w === 'we') {
    var dow = new Date(Date.UTC(y, mo, d)).getUTCDay(), sat = start + (dow === 0 ? -1 : 6 - dow) * day, s0 = dow === 5 ? start + 17 * 3600e3 : sat;
    return [Math.max(now, s0), sat + 2 * day];
  }
  return [now, Infinity];
}
function liveEvents() { var now = Date.now(); return EVENTS.filter(function (e) { return nextOcc(e, now); }); }
function matchEvent(e) {
  var f = filt.events, r = winRange(f.win);
  if (!gemMatch(f.gem, e.gem)) return false;
  if (f.cat && e.cats.indexOf(f.cat) < 0) return false;
  if (f.q && !qMatch(f.q, e)) return false;
  for (var i = 0; i < e.occ.length; i++) { var o = e.occ[i]; if (o.t1 >= r[0] && o.t0 < r[1]) return true; }
  return false;
}

/* ---------------- lists ---------------- */
function famSub(p) { var parts = []; if (p.name) parts.push(p.kind); if (p.hint) parts.push(p.hint); parts.push(p.gem); return parts.join(' · '); }
function itemSub(it) {
  if (it.type === 'fam') return famSub(it);
  if (it.type === 'sight') return it.kind + ' · ' + (MUNI[it.gem] ? it.gem : (it.town || it.gem));
  if (it.type === 'event') return [it.venue, it.gem || it.town].filter(Boolean).join(' · ');
  if (it.type === 'gem') return (it.pop ? swiss(it.pop) + ' Einw. · ' : '') + dec(it.area) + ' km²';
  return '';
}
var FAMROWS = null;
function famRows() {
  if (FAMROWS) return FAMROWS;
  FAMROWS = PL.map(function (p) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'it'; b.dataset.k = 'f' + p.i;
    b.innerHTML = '<span class="pin">' + svgIcon(CATS[p.cat].k) + '</span><span class="tx"><b>' + esc(p.title) + (p.zt ? '<span class="tag">Tipp</span>' : '') + '</b><span>' + esc(famSub(p)) + '</span></span><span class="sh"></span>';
    b._sh = b.querySelector('.sh');
    return b;
  });
  return FAMROWS;
}
var evShown = 60;
function renderList() {
  listDirty = false;
  var m = MODE, cnt = $('#count'), hint = $('#countHint');
  if (m === 'home') { listEl.textContent = ''; return; }
  if (m === 'familie') {
    var vis = PL.filter(matchFam), summer = sunDay.k === 'sommer';
    var sunF = filt.familie.sunMax < 100 && summer;
    if (sunF) vis.sort(function (a, b) { return sunExposure(a) - sunExposure(b) || a.title.localeCompare(b.title, 'de'); });
    else vis.sort(function (a, b) { return (b.zt ? 1 : 0) - (a.zt ? 1 : 0) || a.cat - b.cat || a.title.localeCompare(b.title, 'de') || a.gem.localeCompare(b.gem, 'de'); });
    var rows = famRows(), frag = document.createDocumentFragment();
    vis.forEach(function (p) {
      var r = rows[p.i], s = shadeAt(p, sunT);
      if (sunF) { var ex = sunExposure(p), pe = Math.round(ex * 100); r._sh.innerHTML = '☀ ' + pe + ' %<i style="--p:' + (100 - pe) + '%"></i>'; r._sh.title = filt.familie.sunScope === 'day' ? 'Sonne im Mittel 10–17 Uhr, 21. Juli' : 'Sonne am 21. Juli um ' + fmtTime(sunT) + ' Uhr'; }
      else if (s != null) { var pc = Math.round(s * 100); r._sh.innerHTML = pc + ' %<i style="--p:' + pc + '%"></i>'; r._sh.title = 'Schatten am 21. Juli um ' + fmtTime(sunT) + ' Uhr'; }
      else { r._sh.textContent = ''; r._sh.removeAttribute('title'); }
      frag.appendChild(r);
    });
    listEl.textContent = ''; listEl.appendChild(frag);
    if (cnt) cnt.textContent = plural(vis.length, 'Ort', 'Orte');
    if (hint) hint.textContent = !summer ? '' : sunF ? (filt.familie.sunScope === 'day' ? 'Sonne im Tagesmittel, schattigste zuerst' : 'Sonne um ' + fmtTime(sunT) + ' Uhr, schattigste zuerst') : 'Schatten um ' + fmtTime(sunT) + ' Uhr';
    return;
  }
  var html = '';
  if (m === 'gemeinden') {
    GEMS.forEach(function (g) {
      var ns = SIGHTS.filter(function (s) { return s.gem === g.name; }).length;
      html += '<button type="button" class="it" data-k="g' + g.id + '"><span class="pin">' + svgIcon('gem') + '</span><span class="tx"><b>' + esc(g.name) + '</b><span>' + esc(itemSub(g)) + '</span></span><span class="sh" title="Sehenswürdigkeiten">' + (ns ? ns + ' ★' : '') + '</span></button>';
    });
  } else if (m === 'sights') {
    var vs = SIGHTS.filter(matchSight), groups = {};
    vs.forEach(function (s) { var k = MUNI[s.gem] ? s.gem : 'Ausserhalb des Kantons'; (groups[k] = groups[k] || []).push(s); });
    Object.keys(groups).sort(function (a, b) { return (MUNI[a] ? 0 : 1) - (MUNI[b] ? 0 : 1) || a.localeCompare(b, 'de'); }).forEach(function (k) {
      var arr = groups[k].sort(function (a, b) { return (b.big ? 1 : 0) - (a.big ? 1 : 0) || a.title.localeCompare(b.title, 'de'); });
      html += '<div class="grp"><span>' + esc(k) + '</span><span>' + arr.length + '</span></div>';
      arr.forEach(function (s) {
        html += '<button type="button" class="it" data-k="s' + esc(s.id) + '"><span class="pin sight">' + svgIcon(SCATS[s.cat].k) + '</span><span class="tx"><b>' + esc(s.title) + '</b><span>' + esc(s.kind + (s.town && !MUNI[s.gem] ? ' · ' + s.town : '')) + '</span></span><span class="sh"></span></button>';
      });
    });
    if (!vs.length) html = '<p class="empty">Keine Orte für diese Auswahl.</p>';
    if (cnt) cnt.textContent = plural(vs.length, 'Ort', 'Orte');
  } else if (m === 'events') {
    if (EVMETA.state === 'loading') html = '<p class="empty">Veranstaltungen werden geladen …</p>';
    else if (EVMETA.state === 'error') html = '<p class="empty">Die Veranstaltungen konnten nicht geladen werden. Den vollständigen Kalender finden Sie bei <a href="https://www.zug-tourismus.ch/de/event-calendar/" target="_blank" rel="noopener">Zug Tourismus</a>.</p>';
    else {
      var now = Date.now(), wr = winRange(filt.events.win), occIn = function (e) { for (var i = 0; i < e.occ.length; i++) { var x = e.occ[i]; if (x.t1 >= wr[0] && x.t0 < wr[1]) return x; } return nextOcc(e, now); };
      var ve = EVENTS.filter(matchEvent).sort(function (a, b) { return Math.max(occIn(a).t0, now) - Math.max(occIn(b).t0, now) || a.title.localeCompare(b.title, 'de'); });
      ve.slice(0, evShown).forEach(function (e) {
        var o = occIn(e), more = e.occ.filter(function (x) { return x.t1 >= now; }).length - 1;
        html += '<button type="button" class="it ev" data-k="e' + esc(e.id) + '">' + (e.thumb ? '<img class="thumb" src="' + esc(e.thumb) + '" alt="" loading="lazy" decoding="async">' : '<span class="thumb"></span>') +
          '<span class="tx"><span class="when">' + esc(occText(o)) + (more > 0 ? ' · +' + more + (more === 1 ? ' Termin' : ' Termine') : '') + '</span><b>' + esc(e.title) + '</b><span>' + esc(itemSub(e)) + '</span></span></button>';
      });
      if (ve.length > evShown) html += '<button type="button" class="more" id="moreEv">Weitere ' + (ve.length - evShown) + ' Veranstaltungen</button>';
      if (!ve.length) html = '<p class="empty">Keine Veranstaltungen für diese Auswahl.</p>';
      if (cnt) cnt.textContent = plural(ve.length, 'Veranstaltung', 'Veranstaltungen');
      if (hint) hint.textContent = 'Quelle: Zug Tourismus';
    }
  }
  listEl.innerHTML = html;
  var mb = $('#moreEv'); if (mb) mb.addEventListener('click', function () { var k = evShown; evShown += 60; renderList(); var nx = listEl.querySelectorAll('.it')[k]; if (nx) nx.focus(); });
}
// Bildserver nicht erreichbar: Platzhalter statt kaputtem Bild
listEl.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG' && t.classList.contains('thumb')) { var sp = document.createElement('span'); sp.className = 'thumb'; t.replaceWith(sp); } }, true);
detailEl.addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG') { var fg = t.closest('figure.ev'); if (fg) fg.remove(); } }, true);
listEl.addEventListener('click', function (e) {
  var b = e.target.closest('.it'); if (!b) return;
  var k = b.dataset.k, t = k[0], id = k.slice(1);
  var it = t === 'f' ? PL[+id] : t === 's' ? SIGHTBY[id] : t === 'e' ? EVENTBY[id] : t === 'g' ? GEMBY[id] : null;
  if (it) pick(it);
});
var backTo = '';
function pick(it) {
  var mode = it.type === 'fam' ? 'familie' : it.type === 'sight' ? 'sights' : it.type === 'event' ? 'events' : 'gemeinden';
  if (location.hash !== hashFor(mode, it.id)) { backTo = location.hash; pushedDetail = true; }
  go(mode, it.id);
}

/* ---------------- detail panels ---------------- */
function photoFig(ph, title, inset) {
  return '<figure><div class="media"><img src="' + esc(ph.f) + '" alt="' + esc(ph.w || title) + '" loading="lazy" decoding="async">' + (inset ? '<canvas class="inset" width="320" height="240" aria-label="Luftbild"></canvas>' : '') +
    '</div><figcaption>Foto: ' + esc(ph.a) + ', ' + (safeURL(ph.lu) ? '<a href="' + esc(ph.lu) + '" target="_blank" rel="noopener">' + esc(ph.l) + '</a>' : esc(ph.l)) +
    (safeURL(ph.u) ? ', via <a href="' + esc(ph.u) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' : '') + (ph.crop === false ? '' : ' (zugeschnitten)') + (inset ? '. Luftbild: swisstopo SWISSIMAGE' : '') + '</figcaption></figure>';
}
function aerialFig(title, outline) { return '<figure><canvas width="640" height="480" aria-label="Luftbild von ' + esc(title) + '"></canvas><figcaption>Luftbild: swisstopo SWISSIMAGE' + (outline ? ', Umriss gestrichelt' : '') + '</figcaption></figure>'; }
function sparkSVG(p) {
  if (!p.s || sunDay.k !== 'sommer') return '';
  var W = 300, H = 64, n = p.s.length, pts = p.s.map(function (v, k) { return [k / (n - 1) * W, 6 + (1 - v / 100) * 44]; });
  var line = pts.map(function (q, k) { return (k ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
  var area = line + 'L' + W + ' 50L0 50Z', xNow = clamp((sunT - 8) / 11, 0, 1) * W;
  return '<div class="spark"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Schattenanteil im Tagesverlauf am 21. Juli"><path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
    '<line class="now" id="sparkNow" x1="' + xNow.toFixed(1) + '" x2="' + xNow.toFixed(1) + '" y1="2" y2="52"/>' +
    '<text class="ax" x="0" y="62">8</text><text class="ax" x="' + (W * 4 / 11).toFixed(1) + '" y="62" text-anchor="middle">12</text><text class="ax" x="' + (W * 8 / 11).toFixed(1) + '" y="62" text-anchor="middle">16</text><text class="ax" x="' + W + '" y="62" text-anchor="end">19 Uhr</text>' +
    '<text class="ax" x="2" y="12">100 %</text></svg></div>';
}
function backLabel(it) { return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5 1.4-1.4L7.8 8l3.6-3.6z"/></svg>' + (it.type === 'fam' ? 'Alle Familienorte' : it.type === 'sight' ? 'Alle Sehenswürdigkeiten' : it.type === 'event' ? 'Alle Veranstaltungen' : 'Alle Gemeinden'); }
function shareBtn() { return '<button type="button" class="btn btn-soft share" id="shareBtn"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z"/></svg>Teilen</button>'; }
function linkList(items) { var h = ''; items.forEach(function (l) { if (safeURL(l[1])) h += '<li><a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a></li>'; }); return h ? '<ul class="links">' + h + '</ul>' : ''; }
function osmLink(o) { if (!o) return null; var tp = { n: 'node', w: 'way', r: 'relation' }[o[0]]; return tp ? ['In OpenStreetMap ansehen', 'https://www.openstreetmap.org/' + tp + '/' + o.slice(1)] : null; }
function detailHTML(it) {
  var h = '<button class="back" type="button" id="back">' + backLabel(it) + '</button>';
  if (it.type === 'fam') {
    var p = it, s = shadeAt(p, sunT), u = uvi(sun.alt, p.z), uc = uvCat(u);
    h += p.ph ? photoFig(p.ph, p.title, true) : aerialFig(p.title, !!p.poly);
    h += '<h3>' + esc(p.title) + '</h3><p class="sub">' + esc(famSub(p)) + (p.guests ? ' · für Gäste' : '') + '</p>';
    h += '<dl class="facts">';
    if (s != null) h += '<div><dt>Schatten ' + fmtTime(sunT) + '</dt><dd id="dShade">' + Math.round(s * 100) + ' %</dd></div><div><dt>Unter Bäumen/Dach</dt><dd>' + (p.cover || 0) + ' %</dd></div>';
    h += '<div><dt>UV ' + fmtTime(sunT) + ', wolkenlos</dt><dd id="dUV">' + Math.round(u) + ' · ' + uc[1] + '</dd></div>';
    if (p.z) h += '<div><dt>Höhe</dt><dd>' + swiss(p.z) + ' m ü. M.</dd></div>';
    if (p.dw != null && p.dw < 2000) h += '<div><dt>Trinkbrunnen</dt><dd>' + swiss(p.dw) + ' m</dd></div>';
    if (p.dc != null && p.dc < 2000) h += '<div><dt>WC</dt><dd>' + swiss(p.dc) + ' m</dd></div>';
    h += '</dl><dl class="facts wx" id="wxBox" hidden></dl>' + sparkSVG(p);
    h += '<div class="sun" id="sunDet"></div>';
    if (p.flags && p.flags.length) h += '<p class="note">Vor Ort: ' + p.flags.map(esc).join(', ') + '</p>';
    if (p.note) h += '<p class="note">' + esc(p.note) + '</p>';
    var L = (p.web || []).concat((p.zt || []).map(function (l) { return [l[0] + ' bei Zug Tourismus', l[1]]; })); var ol = osmLink(p.osm); if (ol) L.push(ol);
    h += linkList(L);
  } else if (it.type === 'sight') {
    var g = it;
    h += g.ph ? photoFig(g.ph, g.title, true) : aerialFig(g.title, false);
    h += '<h3>' + esc(g.title) + '</h3><p class="sub">' + esc(g.kind) + ' · ' + esc(MUNI[g.gem] ? g.gem : (g.town || g.gem)) + '</p>';
    if (g.text) h += '<p class="txt">' + esc(g.text) + '</p>';
    if (g.facts && g.facts.length) h += '<ul class="flist">' + g.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    h += '<dl class="facts wx" id="wxBox" hidden></dl>';
    h += '<div class="sun" id="sunDet"></div>';
    var LS = []; if (g.zt) LS.push(['Bei Zug Tourismus', g.zt]); if (g.web) LS.push(['Website', g.web]);
    if (g.wd) LS.push(['Wikidata', 'https://www.wikidata.org/wiki/' + g.wd]); var o2 = osmLink(g.osm); if (o2) LS.push(o2);
    h += linkList(LS);
  } else if (it.type === 'event') {
    var e = it, now = Date.now(), up = e.occ.filter(function (o) { return o.t1 >= now; });
    if (e.img) h += '<figure class="ev"><img src="' + esc(e.img) + '" alt="' + esc(e.title) + '" decoding="async"><figcaption>Bild: Veranstalter, über den Veranstaltungskalender von Zug Tourismus (Guidle)</figcaption></figure>';
    h += '<p class="when">' + esc(up.length ? occText(up[0], true) : '') + '</p><h3>' + esc(e.title) + '</h3><p class="sub">' + esc([e.kind, e.venue, e.gem || e.town].filter(Boolean).join(' · ')) + '</p>';
    h += '<div id="evMore">' + eventMoreHTML(e) + '</div>';
    if (e.exact) h += '<div class="sun" id="sunDet"></div>';
    var LE = []; if (e.url) LE.push(['Im Veranstaltungskalender von Zug Tourismus', e.url]); if (e.tickets) LE.push(['Tickets', e.tickets]);
    h += linkList(LE);
  } else if (it.type === 'gem') {
    var m = it, nS = SIGHTS.filter(function (s) { return s.gem === m.name; }), nF = PL.filter(function (p) { return p.gem === m.name; }).length,
      nE = liveEvents().filter(function (e) { return e.gem === m.name; }).length;
    h += '<h3>' + esc(m.name) + '</h3><p class="sub">Gemeinde im Kanton Zug' + (m.m.bfs ? ' · BFS-Nr. ' + m.m.bfs : '') + '</p>';
    if (m.text) h += '<p class="txt">' + esc(m.text) + '</p>';
    h += '<dl class="facts">';
    if (m.pop) h += '<div><dt>Einwohner' + (m.popDate ? ', Stand ' + esc(fmtISODate(m.popDate)) : '') + '</dt><dd>' + swiss(m.pop) + '</dd></div>';
    h += '<div><dt>Fläche</dt><dd>' + dec(m.area) + ' km²</dd></div><div><dt>Höhenlage</dt><dd>' + m.hmin + '–' + m.hmax + ' m</dd></div>';
    if (m.elev) h += '<div><dt>Dorfkern</dt><dd>' + swiss(m.elev) + ' m ü. M.</dd></div>';
    h += '</dl>';
    if (m.ortsteile && m.ortsteile.length) h += '<p class="note">Ortsteile: ' + m.ortsteile.map(esc).join(', ') + '</p>';
    h += '<div class="btns">' +
      '<a href="#/sehenswuerdigkeiten?g=' + m.id + '">' + svgIcon('stadt') + 'Sehenswürdigkeiten <small>' + nS.length + '</small></a>' +
      '<a href="#/familien?g=' + m.id + '">' + svgIcon('spiel') + 'Familienorte <small>' + nF + '</small></a>' +
      '<a href="#/events?g=' + m.id + '">' + svgIcon('event') + 'Events <small>' + nE + '</small></a></div>';
    if (nS.length) {
      h += '<div class="grp" style="position:static;margin-top:14px"><span>Sehenswürdigkeiten</span><span>' + nS.length + '</span></div><div class="list">';
      nS.sort(function (a, b) { return (b.big ? 1 : 0) - (a.big ? 1 : 0) || a.title.localeCompare(b.title, 'de'); }).forEach(function (s) {
        h += '<button type="button" class="it" data-k="s' + esc(s.id) + '"><span class="pin sight">' + svgIcon(SCATS[s.cat].k) + '</span><span class="tx"><b>' + esc(s.title) + '</b><span>' + esc(s.kind) + '</span></span><span class="sh"></span></button>';
      });
      h += '</div>';
    }
    var LG = []; if (m.web) LG.push(['Website der Gemeinde', m.web]); if (m.zt) LG.push([m.name + ' bei Zug Tourismus', m.zt]);
    h += linkList(LG);
    if (m.sources && m.sources.length) h += '<p class="note" style="font-size:12px">Quellen: ' + m.sources.map(function (s) { return safeURL(s.u) ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + '</a>' : esc(s.t); }).join(', ') + '</p>';
  }
  return h;
}
function eventMoreHTML(e) {
  var h = '', now = Date.now(), up = e.occ.filter(function (o) { return o.t1 >= now; });
  if (e.teaser) h += '<p class="txt">' + esc(e.teaser) + '</p>';
  if (up.length > 1) h += '<p class="note" style="margin:0">Termine</p><ul class="dates">' + up.slice(0, 12).map(function (o) { return '<li>' + esc(occText(o, true)) + '</li>'; }).join('') + (up.length > 12 ? '<li>und ' + (up.length - 12) + ' weitere</li>' : '') + '</ul>';
  var dl = '';
  if (e.address || e.venue) dl += '<div><dt>Ort</dt><dd class="t">' + esc(e.venue && e.address && e.address.indexOf(e.venue) === 0 ? e.address : [e.venue, e.address].filter(Boolean).join(', ')) + '</dd></div>';
  if (e.price) dl += '<div><dt>Preis</dt><dd class="t">' + esc(e.price) + '</dd></div>';
  if (e.org) dl += '<div><dt>Veranstalter</dt><dd class="t">' + esc(e.org) + '</dd></div>';
  if (dl) h += '<dl class="facts one">' + dl + '</dl>';
  return h;
}
var listScroll = 0;
function openItem(it) {
  if (!listEl.hidden) listScroll = pscroll.scrollTop;
  if (it.type === 'gem') { selGem = it; SEL = null; } else { SEL = it; selGem = null; }
  detailEl.innerHTML = detailHTML(it);
  fillWx(it);
  detailEl.hidden = false; listEl.hidden = true; pscroll.scrollTop = 0; panel.classList.add('has-detail');
  $('#back').addEventListener('click', backFromDetail);
  var shb = $('#back'); if (shb) shb.insertAdjacentHTML('afterend', shareBtn());
  var sbt = $('#shareBtn');
  if (sbt) sbt.addEventListener('click', function () {
    var url = location.href, title = (it.title || it.name) + ' · Zug entdecken';
    if (navigator.share) navigator.share({ title: title, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { sbt.lastChild.textContent = 'Link kopiert'; setTimeout(function () { if (sbt.isConnected) sbt.lastChild.textContent = 'Teilen'; }, 2200); }).catch(function () {});
  });
  var sd = $('#sunDet'), termin = null;
  if (it.type === 'event') {
    var o = nextOcc(it, Date.now());
    if (o) {
      var dt = ymd(new Date(Math.max(o.t0, Date.now()))), lab = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'short', timeZone: TZ }).format(new Date(Math.max(o.t0, Date.now())));
      termin = { ymd: dt, label: 'Termin ' + lab };
      setSunDay('termin', dt);
      if (hasTime(o.s) && o.t0 > Date.now()) { var hm = fmtHM.format(new Date(o.t0)).split(':'); setSunT(clamp(+hm[0] + (+hm[1]) / 60, 7, 21), 'ui'); }
    }
  } else if (sunDay.k === 'termin') setSunDay('sommer');
  if (sd) buildSunUI(sd, { z: it.z || 425, termin: termin, hint: it.type === 'fam' && it.s ? '' : 'Beim Heranzoomen zeigt die Karte Licht und Schatten für die gewählte Zeit.' });
  markerVisDirty = true;
  if (it.type === 'event') loadEventDetail(it);
  if (pushedDetail) { var bk = $('#back'); if (bk) bk.focus({ preventScroll: true }); }
  if (narrowMQ.matches) setSheet('half');
  if (GL) {
    makeOutline(it.poly ? it : null);
    var cv = detailEl.querySelector('figure canvas');
    if (cv) { var redraw = function () { if (!cv.isConnected) { OR.listeners.splice(OR.listeners.indexOf(redraw), 1); return; } drawCrop(cv, it); }; OR.listeners.push(redraw); redraw(); }
    if (it.type === 'gem') flyToMuni(it.m);
    else if (it.E && it.N) flyTo({ E: it.E, N: it.N, d: itemDistance(it), hd: ex.hd, p: it.type === 'sight' && it.cat === 4 ? 30 : 42 });
    else if (it.type === 'event' && MUNI[it.gem]) flyToMuni(MUNI[it.gem]);
  }
}
detailEl.addEventListener('click', function (e) {
  var b = e.target.closest('.it'); if (!b) return;
  var k = b.dataset.k; if (k[0] === 's' && SIGHTBY[k.slice(1)]) pick(SIGHTBY[k.slice(1)]);
});
function backFromDetail() {
  // nur zurückblättern, wenn der vorige Eintrag die Liste dieses Bereichs war (nicht die Startseite oder ein anderer Bereich)
  var prev = null; try { prev = parseHashOf(backTo); } catch (e) {}
  if (pushedDetail && history.length > 1 && prev && prev.mode === MODE && !prev.id) { pushedDetail = false; history.back(); }
  else { pushedDetail = false; go(MODE, null, true); }
}
function parseHashOf(h) { var keep = location.hash; return (function () { var hh = h || '', q = {}, qi; try { hh = decodeURI(hh); } catch (e) {} hh = hh.replace(/^#\/?/, ''); qi = hh.indexOf('?'); if (qi >= 0) hh = hh.slice(0, qi); var parts = hh.split('/').filter(Boolean); return { mode: PATHMODE[parts[0] || ''] || 'home', id: parts[1] || null, q: q, keep: keep }; })(); }
function itemKey(it) { return !it ? '' : it.type === 'fam' ? 'f' + it.i : it.type === 'sight' ? 's' + it.id : it.type === 'event' ? 'e' + it.id : it.type === 'gem' ? 'g' + it.id : ''; }
function closeDetail(silent) {
  var was = SEL || selGem, ae = document.activeElement, refocus = !ae || ae === document.body || panel.contains(ae);
  SEL = null; selGem = null; pushedDetail = false;
  if (sunDay.k === 'termin') setSunDay('sommer');
  if (GL) { clearOutline(); calloutEl.classList.remove('on'); }
  detailEl.hidden = true; detailEl.innerHTML = ''; listEl.hidden = false; panel.classList.remove('has-detail');
  markerVisDirty = true; listDirty = true;
  var ls = listScroll; requestAnimationFrame(function () {
    if (SEL || selGem) return;
    if (listDirty) renderList();
    pscroll.scrollTop = ls;
    if (refocus && was) { var b = listEl.querySelector('.it[data-k="' + itemKey(was) + '"]'); if (b) b.focus({ preventScroll: true }); else { var q = $('#fQ'); if (q) q.focus({ preventScroll: true }); } }
  });
  if (!silent) syncHash();
}
function updateDetailLive(full) {
  if (!SEL || detailEl.hidden) return;
  if (full && SEL.type === 'fam') {
    var keep = pscroll.scrollTop, it0 = SEL, fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.day : null;
    detailEl.innerHTML = detailHTML(SEL); fillWx(SEL); $('#back').addEventListener('click', backFromDetail);
    var sd = $('#sunDet'); if (sd) buildSunUI(sd, { z: SEL.z || 425 });
    if (GL) { var cv = detailEl.querySelector('figure canvas'); if (cv) { var redraw = function () { if (!cv.isConnected) { var ix = OR.listeners.indexOf(redraw); if (ix >= 0) OR.listeners.splice(ix, 1); return; } drawCrop(cv, it0); }; OR.listeners.push(redraw); redraw(); } }
    if (fk) { var fb = detailEl.querySelector('.sun-date button[data-day="' + fk + '"]'); if (fb) fb.focus({ preventScroll: true }); }
    pscroll.scrollTop = keep; return;
  }
  var p = SEL, s = shadeAt(p, sunT), u = uvi(sun.alt, p.z), uc = uvCat(u);
  var d1 = $('#dShade'), d2 = $('#dUV'), sn = $('#sparkNow');
  if (d1 && s != null) { d1.textContent = Math.round(s * 100) + ' %'; d1.previousElementSibling.textContent = 'Schatten ' + fmtTime(sunT); }
  if (d2) { d2.textContent = Math.round(u) + ' · ' + uc[1]; d2.previousElementSibling.textContent = 'UV ' + fmtTime(sunT) + ', wolkenlos'; }
  if (sn) { var x = (clamp((sunT - 8) / 11, 0, 1) * 300).toFixed(1); sn.setAttribute('x1', x); sn.setAttribute('x2', x); }
}
function itemDistance(it) {
  if (it.type === 'fam') {
    if (it.kind === 'Naturschutzgebiet') return 2600;
    if (it.kind === 'Velotour' || it.kind === 'Schlittelweg' || it.kind === 'Skilift' || it.kind === 'Bergbahn' || it.out) return 2200;
    if (it.cat === 1 || it.kind === 'Park') return 820;
    return 560;
  }
  if (it.type === 'sight') return it.big ? 2400 : [700, 560, 620, 520, 1500, 2600, 1300, 600, 900][it.cat] || 700;
  if (it.type === 'event') return it.exact ? 650 : 6000;
  return 8000;
}

/* ---------------- events: live from the Zug Tourismus calendar (Guidle) ---------------- */
var EVSRC = PD.events || {};
function loadEvents() {
  EVMETA.state = 'loading';
  if (!window.ZGEvents) { EVMETA.state = 'error'; return; }
  window.ZGEvents.load()
    .then(function (data) { setEvents(data); })
    .catch(function (err) { console.warn('events', err); EVMETA.state = 'error'; if (MODE === 'events') { renderHead(); renderList(); } });
}
function setEvents(data) {
  var list = (data && data.events) || [];
  EVENTS = list.map(normEvent).filter(function (e) { return e.occ.length && e.title; });
  EVENTBY = {}; EVENTS.forEach(function (e) { EVENTBY[e.id] = e; });
  refineEventGem();
  EVMETA = { state: 'ok', updated: data.updated || '' };
  var n = liveEvents().length; $('#nEv').textContent = n || '';
  if (GL && ready) rebuildMarkers();
  if (MODE === 'events') {
    renderHead(); renderList();
    var r = parseHash(); if (r.id && !SEL && EVENTBY[r.id]) openItem(EVENTBY[r.id]);
  }
}
/* Gemeinde from the coordinates where the map mask is loaded; the town name stays as fallback */
function refineEventGem() {
  if (!GL || !ids) return;
  EVENTS.forEach(function (e) { if (e.exact) { var id = idAt(e.E, e.N); if (id) e.gem = D.munis[id - 1].name; else if (!inGrid(e.E, e.N) || !MUNI[e.gem]) e.gem = e.gem || ''; } });
}
function loadEventDetail(e) {
  if (e.detailLoaded || !window.ZGEvents || !window.ZGEvents.detail) return;
  window.ZGEvents.detail(e).then(function (d) {
    if (!d) return;
    e.detailLoaded = true;
    // Termine aus dem iCal-Export nur ergänzen (einzelne, noch kommende Termine), nie die Liste ersetzen
    if (d.dates && d.dates.length) {
      var n = normEvent({ id: e.id, title: e.title, dates: d.dates }), now = Date.now(), have = {};
      e.occ.forEach(function (o) { have[o.s.slice(0, 16)] = 1; });
      var add = n.occ.filter(function (o) { return o.t1 >= now && o.t1 - o.t0 < 2 * 86400e3 && !have[o.s.slice(0, 16)]; });
      if (add.length) e.occ = e.occ.concat(add).sort(function (a, b) { return a.t0 - b.t0; });
    }
    ['teaser', 'address', 'venue', 'price', 'org', 'credit'].forEach(function (k) { if (d[k]) e[k] = d[k]; });
    if (d.tickets) e.tickets = safeURL(d.tickets);
    if (SEL === e) {
      var box = $('#evMore'); if (box) box.innerHTML = eventMoreHTML(e);
      var w = detailEl.querySelector('.when'), up = e.occ.filter(function (o) { return o.t1 >= Date.now(); }); if (w && up.length) w.textContent = occText(up[0], true);
      if (e.tickets && !detailEl.querySelector('a[data-t]')) { var ul = detailEl.querySelector('.links'); if (ul) ul.insertAdjacentHTML('beforeend', '<li><a data-t="1" href="' + esc(e.tickets) + '" target="_blank" rel="noopener">Tickets</a></li>'); }
    }
  }).catch(function () {});
}

/* ---------------- mobile sheet ---------------- */
var sheet = 'half';
function setSheet(s) {
  sheet = s;
  var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top')) || 50;
  panel.style.setProperty('--sheet', s === 'peek' ? '26svh' : s === 'full' ? 'calc(100svh - ' + (top + 14) + 'px - var(--tabbar))' : '52svh');
}
$('#handle').addEventListener('click', function () { setSheet(sheet === 'half' ? 'full' : sheet === 'full' ? 'peek' : 'half'); });
// Wer im Blatt mit dem Finger nach unten scrollt, will die Liste sehen: Blatt dann auf volle Höhe ziehen.
var sheetTouch = false;
panel.addEventListener('touchstart', function () { sheetTouch = true; }, { passive: true });
panel.addEventListener('touchend', function () { setTimeout(function () { sheetTouch = false; }, 400); }, { passive: true });
panel.addEventListener('scroll', function () {
  if (sheetTouch && sheet !== 'full' && panel.scrollTop > 40 && innerWidth <= 760) setSheet('full');
  panel.classList.toggle('scrolled', panel.scrollTop > 4);
}, { passive: true });

/* ---------------- info dialog ---------------- */
var infoDlg = $('#infoDlg'), infoFrom = null;
function openInfo() { if (!infoDlg.hidden) return; infoFrom = document.activeElement; infoDlg.hidden = false; $('#infoClose').focus(); }
function closeInfo() { if (infoDlg.hidden) return; infoDlg.hidden = true; if (infoFrom && infoFrom.focus) infoFrom.focus(); }
$('#infoClose').addEventListener('click', function () { if (lastRoute && lastRoute !== location.hash) history.back(); else go(MODE, null, true); });
infoDlg.addEventListener('click', function (e) { if (e.target === infoDlg) $('#infoClose').click(); });
infoDlg.addEventListener('keydown', function (e) {
  if (e.key !== 'Tab' || infoDlg.hidden) return;
  var f = infoDlg.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'); if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!infoDlg.hidden) { $('#infoClose').click(); return; }
  if (touring) { stopTour(); return; }
  if (SEL || selGem) backFromDetail();
});
var hintEl = $('#hint'), hintShown = false;
function showHint() { if (hintShown || !fine || TEST) return; hintShown = true; hintEl.classList.add('on'); setTimeout(function () { hintEl.classList.remove('on'); }, 6000); }

/* home counts */
$('#nSight').textContent = SIGHTS.length || '';
$('#nFam').textContent = PL.filter(function (p) { return !p.hide; }).length;
/* ---------------- WebGL setup ---------------- */
if (!window.THREE) { fail('Die 3D-Bibliothek konnte nicht geladen werden. Liste und Texte bleiben nutzbar.'); uiOnly(); return; }
if (typeof DecompressionStream === 'undefined') { fail('Dieser Browser kann die Geodaten nicht entpacken. Liste und Texte bleiben nutzbar.'); uiOnly(); return; }
THREE.ColorManagement.enabled = false;
var canvas = $('#scene');
canvas.style.opacity = '0';
canvas.style.transition = reduce ? 'none' : 'opacity 1.4s ease';
var renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { fail('WebGL ist in diesem Browser nicht verfügbar. Liste und Texte bleiben nutzbar.'); uiOnly(); return; }
if (!renderer.capabilities.isWebGL2) { fail('Für das Relief braucht es WebGL 2. Liste und Texte bleiben nutzbar.'); uiOnly(); return; }
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
  uHeat: { value: blank }, uHeatRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uHeatOn: { value: 0 },
  uCov: { value: blank },
  uWaterF: { value: blank }, uWaterC: { value: blank }, uWaterFRect: { value: new THREE.Vector4(0, 0, 1, 0) }, uWaterCRect: { value: new THREE.Vector4(0, 0, 1, 0) },
  uHgt: { value: blank }, uHgtSize: { value: new THREE.Vector2(nx, ny) }
};
sunVector(sun, U.uSunDir.value);
var C = {};
['--paper', '--m-land', '--m-lit', '--m-shade', '--m-forest', '--m-out', '--m-water', '--m-water-deep', '--m-contour', '--m-hi',
 '--m-side', '--m-side-2', '--m-roof', '--m-wall', '--m-window', '--m-line', '--m-muni', '--m-river', '--m-shore', '--m-lorze', '--ink',
 '--m-tree', '--m-trunk', '--m-sun', '--m-sky', '--m-pin', '--m-pin-ink', '--m-ring-shade', '--m-ring-sun', '--m-sel', '--m-pin-sight', '--m-pin-event', '--m-pin-park', '--m-haze'
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
/* Seeufer in der Nahansicht: Seeflächen als scharfe Maske aus den Uferlinien (statt der groben 17-m-Maske),
   dazu Wellen, Himmelsspiegelung (Fresnel) und Sonnenglanz */
var WATER = [
  'uniform sampler2D uWaterF, uWaterC; uniform vec4 uWaterFRect, uWaterCRect;',
  'float waterAt(vec2 xz, float w0){',
  '  float w = w0;',
  '  vec2 uc = (xz - uWaterCRect.xy)/uWaterCRect.z;',
  '  if(uWaterCRect.w > 0.5 && uc.x > 0.0 && uc.x < 1.0 && uc.y > 0.0 && uc.y < 1.0) w = texture2D(uWaterC, uc).r;',
  '  vec2 uf = (xz - uWaterFRect.xy)/uWaterFRect.z;',
  '  if(uWaterFRect.w > 0.5){ vec2 e = min(uf, 1.0-uf); float b = smoothstep(0.0, 0.04, min(e.x, e.y)); if(b > 0.0) w = mix(w, texture2D(uWaterF, uf).r, b); }',
  '  return w;',
  '}',
  // Wellen als Gradient von gedrehtem Rauschen in drei Grössen (ca. 7 m, 2.6 m, 1 m), ausgeblendet, sobald ein Pixel grösser ist
  'vec2 nGrad(vec2 p){ float c = noise(p); return vec2(noise(p + vec2(0.3, 0.0)) - c, noise(p + vec2(0.0, 0.3)) - c)/0.3; }',
  'vec3 waterNormal(vec2 q, float fp, float t){',
  '  mat2 r1 = mat2(0.80, -0.60, 0.60, 0.80), r2 = mat2(0.28, 0.96, -0.96, 0.28);',
  '  vec2 g = nGrad(q/7.0 + vec2(t*0.10, t*0.06))*0.075*(1.0 - smoothstep(2.0, 7.0, fp));',
  '  g += r1*nGrad(r1*q/2.6 - vec2(t*0.19, -t*0.07))*0.06*(1.0 - smoothstep(0.8, 2.6, fp));',
  '  g += r2*nGrad(r2*q/1.0 + vec2(-t*0.31, t*0.23))*0.045*(1.0 - smoothstep(0.3, 1.0, fp));',
  '  g *= 0.5 + noise(q*0.009 + vec2(t*0.006, -t*0.004));',
  '  return normalize(vec3(-g.x, 1.0, -g.y));',
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
    LIGHT, SHADOW, ORTHO, COMMON, WATER,
    'uniform sampler2D uHeat; uniform vec4 uHeatRect; uniform float uHeatOn;',
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
    '    if(uOrthoMix > 0.002){',
    // scharfe Uferlinie, Wasserfarbe aus dem Luftbild, Spiegelung des Himmels und Glanz der Sonne
    '      water = mix(water, smoothstep(0.25, 0.75, waterAt(vW.xz, water)), uOrthoMix);',
    '      if(water > 0.001){',
    '      vec3 Nw = waterNormal(vW.xz, fpx, uTime);',
    '      float ct = clamp(dot(Nw, V), 0.0, 1.0);',
    '      float F = 0.02 + 0.98*pow(1.0 - ct, 5.0);',
    '      vec3 R = reflect(-V, Nw);',
    '      vec3 skyR = mix(uFog, uSkyCol*vec3(0.74, 0.84, 1.0), smoothstep(0.0, 0.55, R.y));',
    '      vec3 base = mix(wc*0.8, oc.rgb*vec3(0.96, 1.0, 1.04), oc.a*0.85);',
    '      base *= 0.66 + 0.34*vis;',
    '      vec3 wr = mix(base, skyR, clamp(F + 0.07, 0.0, 1.0)*(0.85 - 0.4*uDark));',
    '      float sh = mix(320.0, 60.0, smoothstep(0.6, 6.0, fpx));',
    '      float gl = pow(max(dot(R, uSunDir), 0.0), sh)*mix(1.8, 0.8, smoothstep(0.6, 6.0, fpx));',
    '      wr += uSunCol*gl*vis*(1.0 - uDark)*smoothstep(0.0, 0.08, uSunDir.y);',
    '      wc = mix(wc, wr, uOrthoMix);',
    '      }',
    '    }',
    '  }',
    '  col = mix(col, uContour, cont*uContourA*(0.2+0.8*inside)*(1.0-water));',
    '  col = mix(col, uOut, clamp(uHiAny-hv, 0.0, 1.0)*0.38*inside*(1.0-water));',
    '  col = mix(col, uHi, clamp(hv*0.08+hov*0.12, 0.0, 0.3)*(1.0-water));',
    '  if(uHeatOn > 0.001){ vec2 uh = (vW.xz - uHeatRect.xy)/uHeatRect.zw;',
    '    if(uh.x > 0.0 && uh.x < 1.0 && uh.y > 0.0 && uh.y < 1.0){ vec4 hc = texture2D(uHeat, uh); col = mix(col, hc.rgb, hc.a*uHeatOn*mix(0.78, 0.42, uOrthoMix)); } }',
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
  'attribute vec4 aB; attribute vec2 aT; uniform float uGrow, uVZ, uBZ; uniform sampler2D uCov;',
  'varying vec3 vW; varying float vRel; varying float vDist; varying float vSeed;',
  'void main(){',
  '  vSeed = fract(sin(dot(vec2(aB.x + aB.z*3.1, aB.y*7.3 + aB.w*91.0), vec2(12.9898, 78.233)))*43758.5453);',
  '  float g = smoothstep(aB.w, aB.w + 0.16, uGrow);',
  // Gebäude, deren Kachel als echtes 3D-Modell (swissBUILDINGS3D) geladen ist, verschwinden unter dem Gelände
  '  if(aT.x >= 0.0 && texture2D(uCov, (aT + 0.5)/256.0).r > 0.5) g = 0.0;',
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
    'varying vec3 vW; varying float vRel; varying float vDist; varying float vSeed;',
    'void main(){',
    '  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));',
    '  float roof = step(0.6, abs(n.y));',
    '  float wall = 1.0 - roof;',
    '  vec3 fixedL = normalize(vec3(-0.55, 0.62, -0.56));',
    '  float lam0 = 0.66 + 0.34*max(dot(n, fixedL), 0.0);',
    '  vec3 col = mix(uWall*lam0, uRoof*(0.92+0.08*lam0), roof);',
    '  col *= mix(0.9, 1.0, smoothstep(0.0, 8.0*uBZ, vRel));',
    '  if(uSunMix > 0.001){',
    '    float lamb = max(dot(n, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, n, lamb) : 0.0;',
    '    vec3 wallc = uWall;',
    '    if(uDark < 0.5){',
    // facades: slightly different plaster tones per building, window rows when close
    '      wallc = mix(vec3(0.95,0.92,0.86), vec3(0.86,0.89,0.93), vSeed) * (0.9 + 0.12*fract(vSeed*7.13));',
    '      float fl = (vRel - 1.0)/3.0;',
    '      float u = abs(n.x) > abs(n.z) ? vW.z : vW.x; float cu = u/2.8 + vSeed*3.0;',
    '      vec2 f = vec2(fract(cu), fract(fl));',
    '      float far = smoothstep(0.25, 0.7, max(fwidth(fl), fwidth(cu)));',
    '      float win = step(0.34,f.x)*step(f.x,0.66)*step(0.32,f.y)*step(f.y,0.78)*step(0.0,fl)*step(1.6, vRel)*step(0.25, fract(vSeed*13.7 + floor(cu)*0.618));',
    '      wallc = mix(wallc, vec3(0.42,0.47,0.53), win*(1.0-far)*0.55);',
    '      wallc *= mix(0.97, 1.0, far) * mix(0.8, 1.0, smoothstep(0.0, 5.0, vRel));',
    '    }',
    '    vec3 alb = mix(wallc, uRoof, roof);',
    '    vec4 oc = orthoAt(vW.xz);',
    '    alb = mix(alb, oc.rgb*1.12, roof*oc.a*uOrthoMix);',
    '    vec3 sky = uDark < 0.5 ? mix(uSkyCol, vec3(1.0, 0.97, 0.92), 0.55*wall) : uSkyCol;',
    '    vec3 lit = alb*(uAmb*sky + uDif*lamb*vis*uSunCol);',
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
var bldDepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ, uBZ: U.uBZ, uGrow: bldMat.uniforms.uGrow, uCov: U.uCov }, vertexShader: BLD_VS, fragmentShader: DEPTH_FS });
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
  var maxV = nV * 5, POS = new Float32Array(maxV * 3), AB = new Float32Array(maxV * 4), AT = new Float32Array(maxV * 2), IDX = new Uint32Array(nV * 9 + nR * 6 + 64);
  var vi = 0, ii = 0, rp = 0, vp = 0, b = 0;
  var zE = D.zyt[0], zN = D.zyt[1];
  var V2 = []; for (k = 0; k < 300; k++) V2.push(new THREE.Vector2());
  var cb, cr, ch, cd, ctx_ = -1, cty = -1;
  function pushV(x, top, z) { POS[vi * 3] = x; POS[vi * 3 + 1] = top; POS[vi * 3 + 2] = z; AB[vi * 4] = cb; AB[vi * 4 + 1] = cr; AB[vi * 4 + 2] = ch; AB[vi * 4 + 3] = cd; AT[vi * 2] = ctx_; AT[vi * 2 + 1] = cty; return vi++; }
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
        var cE = sE / cnt, cN = sN / cnt, tl = sb3Tile(cE, cN);
        ctx_ = tl[0] - SB3_X0; cty = tl[1] - SB3_Y0; if (ctx_ < 0 || cty < 0 || ctx_ > 255 || cty > 255) { ctx_ = -1; cty = -1; }
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
      geo.setAttribute('aT', new THREE.BufferAttribute(AT.subarray(0, vi * 2), 2));
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

/* ---------------- Strandbad Zug 2026: Neubauten als 3D-Modell (Luftbild zeigt noch die Baustelle) ---------------- */
var SBZ_VS = [
  'attribute float aG; attribute vec3 aCol; attribute float aK; attribute vec2 aU; uniform float uVZ, uBZ;',
  'varying vec3 vW; varying vec3 vCol; varying float vK; varying vec2 vU; varying float vDist;',
  'void main(){ vec3 p = vec3(position.x, aG*uVZ + position.y*uBZ, position.z); vec4 w = modelMatrix*vec4(p, 1.0);',
  '  vW = w.xyz; vCol = aCol; vK = aK; vU = aU; vDist = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix*viewMatrix*w; }'
].join('\n');
var sbzMat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: Object.assign({}, U),
  vertexShader: SBZ_VS,
  fragmentShader: [
    'uniform vec3 uFog; uniform float uDark, uFogNear, uFogFar;',
    LIGHT, SHADOW, COMMON,
    'varying vec3 vW; varying vec3 vCol; varying float vK; varying vec2 vU; varying float vDist;',
    'void main(){',
    '  vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));',
    '  vec3 V = normalize(cameraPosition - vW); if(dot(n, V) < 0.0) n = -n;',
    '  vec3 alb = vCol; float k = vK; float spec = 0.0;',
    // 1 Holzlatten senkrecht (Lärche), 2 Verglasung mit Pfosten, 3 Dach (Blech/Kies), 4 Dielen, 5 Stein, 6 Holz glatt
    '  if(k > 0.5 && k < 1.5){ float c = floor(vU.x/0.13); float f = fract(vU.x/0.13);',
    '    alb *= (0.9 + 0.2*hash(vec2(c, 1.7)) + 0.06*noise(vec2(c, vU.y*1.5)))*(f < 0.7 ? 1.0 : 0.5); }',
    '  else if(k > 1.5 && k < 2.5){ float m = fract(vU.x/1.6); float t = step(0.05, m)*step(m, 0.95)*step(0.12, vU.y)*step(vU.y, 3.15);',
    '    float fr = 1.0 - abs(dot(n, V)); vec3 R = reflect(-V, n);',
    '    vec3 glass = mix(vec3(0.07, 0.09, 0.11), mix(uFog, uSkyCol, clamp(R.y*2.0, 0.0, 1.0))*0.8, 0.18 + 0.6*fr*fr);',
    '    alb = mix(vec3(0.86, 0.86, 0.84), glass, t); spec = t; }',
    '  else if(k > 2.5 && k < 3.5){ alb *= 0.9 + 0.14*noise(vW.xz*2.3) + 0.08*(hash(floor(vW.xz*9.0)) - 0.5); }',
    '  else if(k > 3.5 && k < 4.5){ float c = floor(vU.x/0.15); float f = fract(vU.x/0.15);',
    '    alb *= (0.88 + 0.18*hash(vec2(c, 5.3)) + 0.05*noise(vec2(c*3.1, vU.y*0.7)))*(f < 0.88 ? 1.0 : 0.55); }',
    '  else if(k > 4.5 && k < 5.5){ alb *= 0.8 + 0.28*noise(vW.xz*1.7 + vW.y*1.3) + 0.08*noise(vW.xz*7.0); }',
    '  else if(k > 5.5 && k < 6.5){ alb *= 0.94 + 0.1*noise(vec2(vU.x*0.6, vU.y*9.0)); }',
    '  else if(k > 6.5){ alb *= 0.62 + 0.55*noise(vW.xz*1.9 + vec2(vW.y*1.7)) + 0.12*noise(vW.xz*6.0 - vW.y*3.0); }',
    '  vec3 col;',
    '  if(uSunMix > 0.001){',
    '    float lamb = max(dot(n, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, n, lamb) : 0.0;',
    '    vec3 sky = mix(uSkyCol, vec3(1.0, 0.97, 0.92), 0.45*(1.0 - abs(n.y)));',
    '    col = alb*(uAmb*sky + uDif*lamb*vis*uSunCol);',
    '    col += spec*uSunCol*pow(max(dot(reflect(-V, n), uSunDir), 0.0), 90.0)*vis*0.9;',
    '  } else { vec3 fl = normalize(vec3(-0.55, 0.62, -0.56)); col = alb*(0.62 + 0.38*max(dot(n, fl), 0.0)); }',
    '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});
var sbzDepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ, uBZ: U.uBZ }, vertexShader: SBZ_VS, fragmentShader: DEPTH_FS, side: THREE.DoubleSide });
sbzDepthMat.colorWrite = false;
var sbzMesh = null;
function buildStrandbad() {
  var S = window.ZGSBZ; if (!S || sbzMesh) return;
  var A = S.ARC, Pp = [], Gg = [], Cc = [], Kk = [], Uu = [], Ii = [];
  var WOOD = [0.80, 0.63, 0.44], WOOD2 = [0.72, 0.55, 0.37], WHITE = [0.93, 0.93, 0.91], ROOF = [0.6, 0.61, 0.6], FASCIA = [0.52, 0.54, 0.55], DECK = [0.76, 0.64, 0.5], STONE = [0.8, 0.78, 0.73];
  function v(E, N, y, g, c, k, u, w) { Pp.push(X(E), y, Z(N)); Gg.push(g - H0); Cc.push(c[0], c[1], c[2]); Kk.push(k); Uu.push(u, w); return Pp.length / 3 - 1; }
  function quad(a, b, c, d) { Ii.push(a, b, c, a, c, d); }
  var gRef = 0, nS = 0;
  for (var t = 0; t <= 1; t += 0.1) { var q0 = A.at(A.a0 + (A.a1 - A.a0) * t, A.R); gRef += hAt(q0[0], q0[1]); nS++; }
  gRef = Math.max(gRef / nS, S.ground);
  var ROOF0 = 3.45, ROOF1 = 3.9, BOT = -1.6;
  // Wandfläche entlang des Bogens (Radius r, Winkel a0..a1, Höhe y0..y1)
  function arcWall(r, a0, a1, y0, y1, c, k, n) {
    var prev = null;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * i / n, p = A.at(a, A.R + r), u = Math.abs(a - a0) * (A.R + r), gb = hAt(p[0], p[1]);
      var lo = v(p[0], p[1], y0 === BOT ? BOT + (gb - gRef) : y0, gRef, c, k, u, 0), hi = v(p[0], p[1], y1, gRef, c, k, u, y1 - y0);
      if (prev) quad(prev[0], lo, hi, prev[1]); prev = [lo, hi];
    }
  }
  // waagrechte Fläche zwischen zwei Radien
  function arcFlat(r0, r1, a0, a1, y, c, k, n) {
    var prev = null;
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * i / n, p0 = A.at(a, A.R + r0), p1 = A.at(a, A.R + r1), u = Math.abs(a - a0) * A.R;
      var i0 = v(p0[0], p0[1], y, gRef, c, k, u, r0), i1 = v(p1[0], p1[1], y, gRef, c, k, u, r1);
      if (prev) quad(prev[0], i0, i1, prev[1]); prev = [i0, i1];
    }
  }
  function radialWall(a, r0, r1, y0, y1, c, k) {
    var p0 = A.at(a, A.R + r0), p1 = A.at(a, A.R + r1);
    quad(v(p0[0], p0[1], y0, gRef, c, k, 0, 0), v(p1[0], p1[1], y0, gRef, c, k, Math.abs(r1 - r0), 0), v(p1[0], p1[1], y1, gRef, c, k, Math.abs(r1 - r0), y1 - y0), v(p0[0], p0[1], y1, gRef, c, k, 0, y1 - y0));
  }
  // Quader, ausgerichtet nach Winkel ang (Rad), Länge L entlang, Breite W quer; Höhen über gBase/gTop
  function box(E, N, ang, L, W, y0, y1, g0, g1, c, k, plankAxis) {
    var ca = Math.cos(ang), sa = Math.sin(ang), hx = L / 2, hz = W / 2, cs = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]], top = [], bot = [];
    cs.forEach(function (q) {
      var e = E + q[0] * ca - q[1] * sa, n = N + q[0] * sa + q[1] * ca, u = plankAxis ? q[1] : q[0];
      bot.push(v(e, n, y0, g0, c, k, u, 0)); top.push(v(e, n, y1, g1, c, k, u, y1 - y0));
    });
    quad(top[0], top[1], top[2], top[3]);
    for (var j = 0; j < 4; j++) { var m = (j + 1) % 4; quad(bot[j], bot[m], top[m], top[j]); }
  }
  var gapW = 2.2 / A.R, dir = A.a1 > A.a0 ? 1 : -1;
  var aB1 = [A.a0, A.gap - gapW * dir], aB2 = [A.gap + gapW * dir, A.a1];
  var restA = A.gap + (A.a1 - A.gap) * 0.35; // Restaurant: südlicher Teil von B2, zur Wiese verglast
  [aB1, aB2].forEach(function (ab, bi) {
    arcWall(A.body[1], ab[0], ab[1], BOT, ROOF0, WOOD, 1, 24);
    if (bi === 1) { arcWall(A.body[0], ab[0], restA, BOT, ROOF0, WOOD, 1, 10); arcWall(A.body[0], restA, ab[1], BOT, ROOF0, WOOD, 2, 16); }
    else arcWall(A.body[0], ab[0], ab[1], BOT, ROOF0, WOOD, 1, 24);
    radialWall(ab[0], A.body[0], A.body[1], BOT, ROOF0, WOOD, 1); radialWall(ab[1], A.body[0], A.body[1], BOT, ROOF0, WOOD, 1);
  });
  // Flachdach mit Vordach zur Wiese, Untersicht Holz, Stirn Blech
  var r0 = A.roof[0], r1 = A.roof[1], ra0 = A.a0 - dir * 1.0 / A.R, ra1 = A.a1 + dir * 1.0 / A.R;
  arcFlat(r0, r1, ra0, ra1, ROOF1, ROOF, 3, 40);
  arcFlat(r0, r1, ra0, ra1, ROOF0, WOOD2, 6, 40);
  arcWall(r0, ra0, ra1, ROOF0, ROOF1, FASCIA, 6, 40); arcWall(r1, ra0, ra1, ROOF0, ROOF1, FASCIA, 6, 40);
  radialWall(ra0, r0, r1, ROOF0, ROOF1, FASCIA, 6); radialWall(ra1, r0, r1, ROOF0, ROOF1, FASCIA, 6);
  // Brettschichtholz-Träger unter dem Vordach und weisse Stützen
  var nB = Math.round(Math.abs(ra1 - ra0) * A.R / 1.2);
  for (var i = 0; i <= nB; i++) {
    var a = ra0 + (ra1 - ra0) * i / nB, pm = A.at(a, A.R + (r0 + A.body[0]) / 2);
    box(pm[0], pm[1], a, A.body[0] - r0 + 0.2, 0.12, ROOF0 - 0.32, ROOF0, gRef, gRef, WOOD, 6);
  }
  var colR = A.R + r0 + 0.5, nC = Math.round(Math.abs(A.a1 - A.a0) * colR / 4.4);
  for (i = 0; i <= nC; i++) {
    var ac = A.a0 + (A.a1 - A.a0) * i / nC, pc = A.at(ac, colR - A.R + A.R);
    var gc = hAt(pc[0], pc[1]); box(pc[0], pc[1], ac, 0.2, 0.2, -0.6, ROOF0 - 0.32, gc, gRef, WHITE, 0);
  }
  // Pergola vor dem Restaurant: zwei Träger entlang des Bogens, Latten radial, Stützen aussen
  var pg0 = A.perg[0], pg1 = A.perg[1], pa0 = restA, pa1 = A.a1;
  [pg0 + 0.3, (pg0 + pg1) / 2].forEach(function (rr) {
    var n = 16;
    for (var j = 0; j < n; j++) {
      var aa = pa0 + (pa1 - pa0) * (j + 0.5) / n, pp = A.at(aa, A.R + rr), len = Math.abs(pa1 - pa0) * (A.R + rr) / n + 0.05;
      box(pp[0], pp[1], aa + Math.PI / 2, len, 0.2, 2.95, 3.35, gRef, gRef, WOOD, 6);
    }
  });
  var nSl = Math.round(Math.abs(pa1 - pa0) * (A.R + (pg0 + pg1) / 2) / 0.7);
  for (i = 0; i <= nSl; i++) {
    var as = pa0 + (pa1 - pa0) * i / nSl, ps = A.at(as, A.R + (pg0 + pg1) / 2);
    box(ps[0], ps[1], as, pg1 - pg0 + 0.4, 0.09, 3.35, 3.55, gRef, gRef, WOOD, 6);
  }
  var nPc = Math.round(Math.abs(pa1 - pa0) * (A.R + pg0) / 4.6);
  for (i = 0; i <= nPc; i++) {
    var ap = pa0 + (pa1 - pa0) * i / nPc, pq = A.at(ap, A.R + pg0 + 0.3), gp = hAt(pq[0], pq[1]);
    box(pq[0], pq[1], ap, 0.16, 0.16, -0.6, 2.95, gp, gRef, WHITE, 0);
  }
  // Holzdecks am Ende der Sandbucht
  S.decks.forEach(function (d) {
    var g = Math.max(hAt(d.E, d.N), 413.7);
    box(d.E, d.N, d.r * DEG, d.s, d.s, -0.9, 0.42, g, g, DECK, 4, true);
  });
  // Steinblöcke
  var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var ico = new THREE.IcosahedronGeometry(1, 0), ip = ico.attributes.position;
  S.stones.forEach(function (st) {
    var g = Math.max(hAt(st.E, st.N), 413.4) - 0.25, rot = rnd() * 6.28, base = Pp.length / 3, cr = 0.94 + 0.08 * st.k, col = [STONE[0] * cr, STONE[1] * cr, STONE[2] * cr];
    for (var j = 0; j < ip.count; j++) {
      var x = ip.getX(j), y = ip.getY(j), z = ip.getZ(j), hj = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + st.k * 91.7) * 43758.5453, j2 = 0.82 + 0.3 * (hj - Math.floor(hj));
      var e = x * Math.cos(rot) - z * Math.sin(rot), nn = x * Math.sin(rot) + z * Math.cos(rot);
      v(st.E + e * st.r * j2, st.N + nn * st.r * 0.85 * j2, Math.max(-0.2, (y * 0.5 + 0.5) * st.h * 1.6 * j2), g, col, 5, 0, 0);
    }
    for (j = 0; j < ip.count; j += 3) Ii.push(base + j, base + j + 1, base + j + 2);
  });
  ico.dispose();
  // junge Bäume (Stamm, Krone) und Sonnenschirme
  var crown = new THREE.IcosahedronGeometry(1, 1), cp = crown.attributes.position, LEAF = [0.33, 0.45, 0.2];
  S.trees.forEach(function (tr, ti) {
    var g = hAt(tr.E, tr.N), base = Pp.length / 3;
    box(tr.E, tr.N, ti, 0.16, 0.16, -0.3, tr.h * 0.5, g, g, [0.42, 0.34, 0.26], 6);
    base = Pp.length / 3;
    for (var j = 0; j < cp.count; j++) {
      var x = cp.getX(j), y = cp.getY(j), z = cp.getZ(j), hj = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + ti * 3.1) * 43758.5453, jj = 0.85 + 0.3 * (hj - Math.floor(hj));
      v(tr.E + x * tr.r * jj, tr.N + z * tr.r * jj, tr.h * 0.62 + y * tr.r * 1.25 * jj, g, LEAF, 7, 0, 0);
    }
    for (j = 0; j < cp.count; j += 3) Ii.push(base + j, base + j + 1, base + j + 2);
  });
  crown.dispose();
  S.shades.forEach(function (sh) {
    var g = hAt(sh.E, sh.N), segs = 10, top = v(sh.E, sh.N, 2.6, g, [0.96, 0.95, 0.91], 0, 0, 0), rim = [];
    box(sh.E, sh.N, 0, 0.06, 0.06, -0.2, 2.6, g, g, [0.85, 0.85, 0.83], 0);
    for (var j = 0; j <= segs; j++) { var aa = j / segs * Math.PI * 2; rim.push(v(sh.E + Math.cos(aa) * 1.45, sh.N + Math.sin(aa) * 1.45, 2.1, g, [0.96, 0.95, 0.91], 0, 0, 0)); }
    for (j = 0; j < segs; j++) Ii.push(top, rim[j], rim[j + 1]);
  });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
  geo.setAttribute('aG', new THREE.Float32BufferAttribute(Gg, 1));
  geo.setAttribute('aCol', new THREE.Float32BufferAttribute(Cc, 3));
  geo.setAttribute('aK', new THREE.Float32BufferAttribute(Kk, 1));
  geo.setAttribute('aU', new THREE.Float32BufferAttribute(Uu, 2));
  geo.setIndex(Ii);
  sbzMesh = new THREE.Mesh(geo, sbzMat); sbzMesh.frustumCulled = false; scene.add(sbzMesh);
  var dm = new THREE.Mesh(geo, sbzDepthMat); dm.frustumCulled = false; smScene.add(dm); sbzMesh.userData.depth = dm;
  smState.need = true;
}

/* ---------------- swissBUILDINGS3D: echte Gebäudeformen mit Dächern in der Nahansicht ----------------
   3D Tiles von swisstopo (b3dm, Geometrie Draco-komprimiert, CORS offen). Kachelraster in Länge/Breite (z 11, ca. 168 × 108 m);
   Formel für die Kachelnummer empirisch aus dem Tileset bestimmt. Dächer zeigen das Luftbild, Wände Putz mit Fenstern;
   Kirchen, Türme und das Regierungsgebäude bekommen eigene Fassaden. Wo eine Kachel geladen ist, verschwinden die einfachen Klötze. */
var SB3_LON0 = 5.959438729981432, SB3_LAT0 = 45.817679342818934, SB3_DLON = 0.002213278199409854, SB3_DLAT = 0.0009687133361346023, SB3_X0 = 1024, SB3_Y0 = 1280;
var SB3_URL = 'https://3d.geo.admin.ch/ch.swisstopo.swissbuildings3d.3d/v1/';
var DRACO_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/';
function lv95ToWgs(E, N) {
  var y = (E - 2600000) / 1e6, x = (N - 1200000) / 1e6;
  var lam = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
  var phi = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x * x * x;
  return [phi * 100 / 36, lam * 100 / 36];
}
function sb3Tile(E, N) { var w = lv95ToWgs(E, N); return [Math.floor((w[1] - SB3_LON0) / SB3_DLON), Math.floor((w[0] - SB3_LAT0) / SB3_DLAT)]; }
var WA = 6378137, WF = 1 / 298.257223563, WE2 = WF * (2 - WF), WB = WA * (1 - WF), WEP2 = (WA * WA - WB * WB) / (WB * WB);
function ecefToLV95(X, Y, Zc) {
  var p = Math.hypot(X, Y), th = Math.atan2(Zc * WA, p * WB), st = Math.sin(th), ct = Math.cos(th);
  var lat = Math.atan2(Zc + WEP2 * WB * st * st * st, p - WE2 * WA * ct * ct * ct), lon = Math.atan2(Y, X), sl = Math.sin(lat);
  var h = p / Math.cos(lat) - WA / Math.sqrt(1 - WE2 * sl * sl), en = window.ZGEvents.toLV95(lat / DEG, lon / DEG);
  return [en[0], en[1], h];
}
var SB3 = { folder: null, folderP: null, draco: null, dracoP: null, tiles: {}, queue: [], inflight: 0, active: 0, on: false, last: 0, covData: new Uint8Array(256 * 256), covTex: null, failed: 0 };
SB3.covTex = new THREE.DataTexture(SB3.covData, 256, 256, THREE.RedFormat, THREE.UnsignedByteType);
SB3.covTex.magFilter = SB3.covTex.minFilter = THREE.NearestFilter; SB3.covTex.needsUpdate = true; U.uCov.value = SB3.covTex;
var SB3_LANDMARKS = [{ E: 2681586, N: 1224659, r: 28, kind: 4 }]; // Regierungsgebäude: Sandstein, hohe Geschosse
function sb3Folder() {
  if (!SB3.folderP) SB3.folderP = fetch(SB3_URL + 'tileset.json').then(function (r) { return r.json(); }).then(function (j) {
    var uri = j.root && j.root.children && j.root.children[0] && j.root.children[0].content && j.root.children[0].content.uri || '';
    SB3.folder = (uri.split('/')[0] || '20260520'); return SB3.folder;
  }).catch(function () { SB3.folder = '20260520'; return SB3.folder; });
  return SB3.folderP;
}
function sb3Draco() {
  if (SB3.dracoP) return SB3.dracoP;
  SB3.dracoP = new Promise(function (resolve, reject) {
    var sc = document.createElement('script'); sc.src = DRACO_URL + 'draco_wasm_wrapper.js'; sc.crossOrigin = 'anonymous';
    sc.onerror = function () { reject(new Error('draco')); };
    sc.onload = function () {
      fetch(DRACO_URL + 'draco_decoder.wasm').then(function (r) { return r.arrayBuffer(); }).then(function (wasm) {
        window.DracoDecoderModule({ wasmBinary: wasm, onModuleLoaded: function (d) { SB3.draco = d; resolve(d); } });
      }).catch(reject);
    };
    document.head.appendChild(sc);
  });
  return SB3.dracoP;
}
function dracoDecode(dm, bytes, ids) {
  var dec = new dm.Decoder(), mesh = new dm.Mesh(), out = {};
  try {
    var st = dec.DecodeArrayToMesh(bytes, bytes.byteLength, mesh);
    if (!st.ok() || mesh.ptr === 0) throw new Error('draco decode');
    var np = mesh.num_points(); out.count = np;
    Object.keys(ids).forEach(function (name) {
      var att = dec.GetAttributeByUniqueId(mesh, ids[name]); if (!att) return;
      var nc = att.num_components(), nv = np * nc, bl = nv * 4, ptr = dm._malloc(bl);
      dec.GetAttributeDataArrayForAllPoints(mesh, att, dm.DT_FLOAT32, bl, ptr);
      out[name] = new Float32Array(dm.HEAPF32.buffer, ptr, nv).slice(); dm._free(ptr);
    });
    var ni = mesh.num_faces() * 3, ib = ni * 4, ip = dm._malloc(ib);
    dec.GetTrianglesUInt32Array(mesh, ib, ip);
    out.index = new Uint32Array(dm.HEAPF32.buffer, ip, ni).slice(); dm._free(ip);
  } finally { dm.destroy(mesh); dm.destroy(dec); }
  return out;
}
var SB3_KIND = { 'Sakrales Gebaeude': 1, 'Sakraler Turm': 1, 'Turm': 1, 'Mauer gross': 2, 'Mauer gross gedeckt': 2, 'Flugdach': 3, 'Offenes Gebaeude': 3 };
/* b3dm lesen: Feature-Tabelle (RTC_CENTER), Batch-Tabelle (Objektart je Gebäude), glTF mit Draco-Primitiven */
function sb3Parse(buf) {
  var dv = new DataView(buf), td = new TextDecoder();
  var ftj = dv.getUint32(12, true), ftb = dv.getUint32(16, true), btj = dv.getUint32(20, true), btb = dv.getUint32(24, true);
  var ft = JSON.parse(td.decode(new Uint8Array(buf, 28, ftj))), rtc = ft.RTC_CENTER || [0, 0, 0];
  var bt = btj ? JSON.parse(td.decode(new Uint8Array(buf, 28 + ftj + ftb, btj))) : {};
  var g0 = 28 + ftj + ftb + btj + btb, jl = dv.getUint32(g0 + 12, true);
  var gj = JSON.parse(td.decode(new Uint8Array(buf, g0 + 20, jl))), binOff = g0 + 20 + jl + 8;
  // Knoten-Transformationen (glTF ist y-oben; 3D Tiles drehen nach z-oben)
  var prims = [], mtmp = new THREE.Matrix4();
  function visit(ni, parent) {
    var n = gj.nodes[ni], m = new THREE.Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else m.compose(new THREE.Vector3().fromArray(n.translation || [0, 0, 0]), new THREE.Quaternion().fromArray(n.rotation || [0, 0, 0, 1]), new THREE.Vector3().fromArray(n.scale || [1, 1, 1]));
    var w = parent ? mtmp.multiplyMatrices(parent, m).clone() : m;
    if (n.mesh != null) gj.meshes[n.mesh].primitives.forEach(function (p) { prims.push({ p: p, m: w }); });
    (n.children || []).forEach(function (c) { visit(c, w); });
  }
  ((gj.scenes && gj.scenes[gj.scene || 0] && gj.scenes[gj.scene || 0].nodes) || gj.nodes.map(function (_, k) { return k; })).forEach(function (k) { visit(k, null); });
  return { rtc: rtc, bt: bt, gj: gj, bin: new Uint8Array(buf, binOff), prims: prims };
}
function sb3Build(t, data) {
  var dm = SB3.draco, gj = data.gj, rtc = data.rtc, bt = data.bt;
  // lineare Abbildung ECEF -> LV95 um das Kachelzentrum (Kachel < 200 m, Fehler im Millimeterbereich)
  var f0 = ecefToLV95(rtc[0], rtc[1], rtc[2]), J = [], S = 50;
  for (var k = 0; k < 3; k++) { var q = rtc.slice(); q[k] += S; var f = ecefToLV95(q[0], q[1], q[2]); J.push([(f[0] - f0[0]) / S, (f[1] - f0[1]) / S, (f[2] - f0[2]) / S]); }
  var nB = (bt.OBJEKTART || []).length, kindB = new Float32Array(nB), seedB = new Float32Array(nB), baseB = new Float32Array(nB).fill(1e9);
  for (var b = 0; b < nB; b++) {
    kindB[b] = SB3_KIND[bt.OBJEKTART[b]] || 0; seedB[b] = ((b * 2654435761 + t.x * 97 + t.y * 13) >>> 0) % 1000 / 1000;
    if (!kindB[b] && bt.Height && bt.Height[b] > 16) kindB[b] = 5; // hohe Bauten: moderne Fassade
    if (bt.Latitude && bt.Longitude) {
      var en = window.ZGEvents.toLV95(bt.Latitude[b], bt.Longitude[b]);
      SB3_LANDMARKS.forEach(function (L) { if (Math.hypot(en[0] - L.E, en[1] - L.N) < L.r) kindB[b] = L.kind; });
    }
  }
  var parts = [], tot = 0, v = new THREE.Vector3();
  data.prims.forEach(function (pr) {
    var ext = pr.p.extensions && pr.p.extensions.KHR_draco_mesh_compression; if (!ext) return;
    var bv = gj.bufferViews[ext.bufferView], bytes = new Int8Array(data.bin.buffer, data.bin.byteOffset + (bv.byteOffset || 0), bv.byteLength);
    var ids = { pos: ext.attributes.POSITION }; if (ext.attributes._BATCHID != null) ids.bid = ext.attributes._BATCHID;
    var d = dracoDecode(dm, bytes, ids), mat = gj.materials && gj.materials[pr.p.material], cf = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor || [1, 1, 1];
    var roof = cf[0] > cf[1] * 1.6 ? 1 : 0, P = new Float32Array(d.count * 3);
    for (var i = 0; i < d.count; i++) {
      v.set(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]).applyMatrix4(pr.m);
      var ex = v.x, ey = -v.z, ez = v.y; // y-oben -> z-oben, relativ zu RTC_CENTER
      var E = f0[0] + J[0][0] * ex + J[1][0] * ey + J[2][0] * ez, N = f0[1] + J[0][1] * ex + J[1][1] * ey + J[2][1] * ez, h = f0[2] + J[0][2] * ex + J[1][2] * ey + J[2][2] * ez;
      P[i * 3] = X(E); P[i * 3 + 1] = h - H0; P[i * 3 + 2] = Z(N);
      var bi = d.bid ? Math.round(d.bid[i]) : 0; if (bi < nB && h - H0 < baseB[bi]) baseB[bi] = h - H0;
    }
    parts.push({ P: P, I: d.index, bid: d.bid, roof: roof, n: d.count }); tot += d.count;
  });
  if (!tot) return null;
  var POS = new Float32Array(tot * 3), INF = new Float32Array(tot * 4), IDX = [], off = 0;
  parts.forEach(function (pt) {
    POS.set(pt.P, off * 3);
    for (var i = 0; i < pt.n; i++) { var bi = pt.bid ? Math.round(pt.bid[i]) : 0, ok = bi < nB; INF[(off + i) * 4] = ok ? seedB[bi] : 0.5; INF[(off + i) * 4 + 1] = ok && baseB[bi] < 1e8 ? baseB[bi] : pt.P[i * 3 + 1]; INF[(off + i) * 4 + 2] = ok ? kindB[bi] : 0; INF[(off + i) * 4 + 3] = pt.roof; }
    for (var j = 0; j < pt.I.length; j++) IDX.push(pt.I[j] + off);
    off += pt.n;
  });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(POS, 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(INF, 4));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(IDX), 1));
  geo.computeBoundingSphere();
  return geo;
}
var SB3_VS = [
  'attribute vec4 aInfo; uniform float uVZ;',
  'varying vec3 vW; varying float vSeed, vRel, vKind, vRoof, vDist;',
  'void main(){ vec3 p = position; vRel = p.y - aInfo.y; p.y *= uVZ; vec4 w = modelMatrix*vec4(p, 1.0);',
  '  vW = w.xyz; vSeed = aInfo.x; vKind = aInfo.z; vRoof = aInfo.w; vDist = distance(w.xyz, cameraPosition); gl_Position = projectionMatrix*viewMatrix*w; }'
].join('\n');
var sb3Mat = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: Object.assign({}, U),
  vertexShader: SB3_VS,
  fragmentShader: [
    'uniform vec3 uFog; uniform float uDark, uFogNear, uFogFar;',
    LIGHT, SHADOW, ORTHO, COMMON,
    'varying vec3 vW; varying float vSeed, vRel, vKind, vRoof, vDist;',
    'void main(){',
    '  vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); vec3 V = normalize(cameraPosition - vW); if(dot(n, V) < 0.0) n = -n;',
    '  float roof = step(0.5, vRoof)*step(0.12, abs(n.y)) + step(0.92, n.y)*(1.0 - step(0.5, vRoof));',
    '  roof = min(roof, 1.0);',
    // Fassaden: Putz je Gebäude leicht verschieden; Kirchen und Türme weiss mit hohen, wenigen Fenstern; Regierungsgebäude Sandstein
    // Putzfarben wie in der Altstadt: weiss, crème, hellgelb, zartrosa, hellgrau
    '  float ps = fract(vSeed*5.31); vec3 wallc = ps < 0.3 ? vec3(0.95, 0.94, 0.90) : ps < 0.5 ? vec3(0.95, 0.90, 0.80) : ps < 0.66 ? vec3(0.95, 0.89, 0.70) : ps < 0.8 ? vec3(0.93, 0.84, 0.80) : vec3(0.86, 0.87, 0.86);',
    '  wallc *= 0.94 + 0.08*fract(vSeed*7.13);',
    '  float fh = 3.0, cw = 2.7;',
    '  if(vKind > 0.5 && vKind < 1.5) wallc = vec3(0.94, 0.93, 0.89);',
    '  else if(vKind > 1.5 && vKind < 2.5) wallc = vec3(0.80, 0.78, 0.73);',
    '  else if(vKind > 2.5 && vKind < 3.5) wallc = vec3(0.72, 0.74, 0.76);',
    '  else if(vKind > 3.5 && vKind < 4.5){ wallc = vec3(0.86, 0.81, 0.70); fh = 4.6; cw = 3.4; }',
    '  else if(vKind > 4.5){ float ms = fract(vSeed*3.3); wallc = ms < 0.4 ? vec3(0.90, 0.90, 0.88) : ms < 0.7 ? vec3(0.78, 0.79, 0.80) : vec3(0.84, 0.80, 0.72); fh = 3.4; cw = 1.6; }',
    '  float u = abs(n.x) > abs(n.z) ? vW.z : vW.x;',
    '  float fl = (vRel - 1.0)/fh, cu = u/cw + vSeed*5.0; vec2 f = vec2(fract(cu), fract(fl));',
    // Fenster mit geglätteten Kanten; sobald ein Fenster nur noch wenige Pixel misst, wird es ausgeblendet (kein Flimmern)
    '  vec2 fw = max(fwidth(vec2(cu, fl)), vec2(1e-4)); float far = smoothstep(0.07, 0.2, max(fw.x, fw.y));',
    '  float wx0 = 0.34, wx1 = 0.66, wy0 = 0.3, wy1 = 0.8;',
    '  if(vKind > 3.5 && vKind < 4.5){ wx0 = 0.37; wx1 = 0.63; wy0 = 0.16; wy1 = 0.86; }',
    '  if(vKind > 4.5){ wx0 = 0.06; wx1 = 0.94; wy0 = 0.28; wy1 = 0.86; }',
    '  float win = smoothstep(wx0 - fw.x, wx0 + fw.x, f.x)*(1.0 - smoothstep(wx1 - fw.x, wx1 + fw.x, f.x))*smoothstep(wy0 - fw.y, wy0 + fw.y, f.y)*(1.0 - smoothstep(wy1 - fw.y, wy1 + fw.y, f.y));',
    '  win *= step(0.0, fl)*step(1.2, vRel)*(vKind > 4.5 ? 1.0 : step(0.18, fract(vSeed*13.7 + floor(cu)*0.618)));',
    '  if(vKind > 0.5 && vKind < 1.5){ float cu2 = u/4.2; vec2 f2 = vec2(fract(cu2), fract((vRel - 2.0)/9.0)); vec2 fw2 = max(fwidth(vec2(cu2, (vRel - 2.0)/9.0)), vec2(1e-4)); far = smoothstep(0.07, 0.2, max(fw2.x, fw2.y));',
    '    win = smoothstep(0.44 - fw2.x, 0.44 + fw2.x, f2.x)*(1.0 - smoothstep(0.56 - fw2.x, 0.56 + fw2.x, f2.x))*step(0.25, f2.y)*step(f2.y, 0.85)*step(2.0, vRel)*step(0.45, fract(floor(cu2)*0.37 + vSeed)); }',
    '  if(vKind > 1.5 && vKind < 3.5) win = 0.0;',
    // Glas mit etwas Himmelsspiegelung, heller Rahmen innen am Fensterrand
    '  float frame = win*(1.0 - smoothstep(0.035, 0.07, min(min(f.x - wx0, wx1 - f.x), min(f.y - wy0, wy1 - f.y))));',
    '  vec3 glass = mix(vec3(0.20, 0.24, 0.29), mix(uFog, uSkyCol, 0.5)*0.7, 0.25 + 0.35*(1.0 - abs(dot(n, V))));',
    '  wallc = mix(wallc, glass, (win - frame*0.85)*(1.0 - far)*0.75);',
    '  wallc = mix(wallc, vec3(0.97, 0.97, 0.95), frame*(1.0 - far)*0.5);',
    '  wallc *= mix(1.0, 0.95, far*step(vKind, 0.5))*mix(0.82, 1.0, smoothstep(0.0, 3.0, vRel));',
    // Dächer: Luftbild, wo vorhanden; steile Flächen bekommen weniger davon, weil das Bild senkrecht von oben kommt
    '  vec3 roofc = mix(vec3(0.56, 0.34, 0.27), vec3(0.43, 0.41, 0.39), fract(vSeed*3.7));',
    '  vec4 oc = orthoAt(vW.xz);',
    '  roofc = mix(roofc, oc.rgb*1.08, oc.a*uOrthoMix*smoothstep(0.2, 0.55, abs(n.y)));',
    '  vec3 alb = mix(wallc, roofc, roof);',
    '  vec3 col;',
    '  if(uSunMix > 0.001){',
    '    float lamb = max(dot(n, uSunDir), 0.0);',
    '    float vis = lamb > 0.0 ? shadowVis(vW, n, lamb) : 0.0;',
    '    vec3 sky = uDark < 0.5 ? mix(uSkyCol, vec3(1.0, 0.97, 0.92), 0.55*(1.0 - roof)) : uSkyCol;',
    '    col = alb*(uAmb*sky + uDif*lamb*vis*uSunCol);',
    '  } else { vec3 fl2 = normalize(vec3(-0.55, 0.62, -0.56)); col = alb*(0.64 + 0.36*max(dot(n, fl2), 0.0)); }',
    '  col = mix(col, uFog, smoothstep(uFogNear, uFogFar, vDist));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n')
});
var sb3DepthMat = new THREE.ShaderMaterial({ uniforms: { uVZ: U.uVZ }, vertexShader: SB3_VS, fragmentShader: DEPTH_FS, side: THREE.DoubleSide });
sb3DepthMat.colorWrite = false;
function sb3SetCov(t, on) {
  var cx = t.x - SB3_X0, cy = t.y - SB3_Y0; if (cx < 0 || cy < 0 || cx > 255 || cy > 255) return;
  SB3.covData[cy * 256 + cx] = on ? 255 : 0; SB3.covTex.needsUpdate = true;
}
function sb3Show(t, on) {
  if (!t.geo || t.shown === on) return;
  t.shown = on;
  if (on) {
    if (!t.mesh) { t.mesh = new THREE.Mesh(t.geo, sb3Mat); t.depth = new THREE.Mesh(t.geo, sb3DepthMat); t.mesh.frustumCulled = t.depth.frustumCulled = true; }
    scene.add(t.mesh); smScene.add(t.depth);
  } else { scene.remove(t.mesh); smScene.remove(t.depth); }
  sb3SetCov(t, on); smState.need = true;
}
function sb3Load(t) {
  t.state = 'loading'; SB3.inflight++;
  Promise.all([sb3Folder(), sb3Draco()]).then(function (r) {
    return fetch(SB3_URL + r[0] + '/11/' + t.x + '/' + t.y + '.b3dm').then(function (res) {
      if (res.status === 403 || res.status === 404) return null; // keine Gebäude in dieser Kachel
      if (!res.ok) throw new Error('http ' + res.status);
      return res.arrayBuffer();
    });
  }).then(function (buf) {
    SB3.inflight--;
    if (!buf) { t.state = 'empty'; return; }
    try { t.geo = sb3Build(t, sb3Parse(buf)); } catch (e) { t.geo = null; SB3.failed++; }
    t.state = t.geo ? 'ready' : 'empty';
    if (t.geo && t.want) sb3Show(t, true);
  }).catch(function () { SB3.inflight--; t.state = 'error'; SB3.failed++; });
}
function updateSb3(now) {
  if (!GL || !cam || now - SB3.last < 350) return;
  SB3.last = now;
  var on = cam.d < (SB3.on ? 2600 : 2000) && SB3.failed < 12;
  var keys = Object.keys(SB3.tiles);
  if (!on) { if (SB3.on) { SB3.on = false; keys.forEach(function (k) { SB3.tiles[k].want = false; sb3Show(SB3.tiles[k], false); }); } return; }
  SB3.on = true;
  var R = clamp(cam.d * 0.85, 320, small ? 600 : 950), c = sb3Tile(cam.E, cam.N), rx = Math.ceil(R / 160) + 1, ry = Math.ceil(R / 105) + 1, wantK = {};
  for (var x = c[0] - rx; x <= c[0] + rx; x++) for (var y = c[1] - ry; y <= c[1] + ry; y++) {
    var lat = SB3_LAT0 + (y + 0.5) * SB3_DLAT, lon = SB3_LON0 + (x + 0.5) * SB3_DLON, en = window.ZGEvents.toLV95(lat, lon), dd = Math.hypot(en[0] - cam.E, en[1] - cam.N);
    if (dd > R) continue;
    var k = x + '_' + y; wantK[k] = dd;
    var t = SB3.tiles[k] || (SB3.tiles[k] = { x: x, y: y, state: 'new', want: false, shown: false, used: 0 });
    t.want = true; t.used = now; t.dist = dd;
    if (t.state === 'ready') sb3Show(t, true);
  }
  keys.forEach(function (k) { var t = SB3.tiles[k]; if (!(k in wantK)) { t.want = false; sb3Show(t, false); } });
  // laden: nächste zuerst, höchstens 4 gleichzeitig
  var todo = Object.keys(wantK).map(function (k) { return SB3.tiles[k]; }).filter(function (t) { return t.state === 'new' || (t.state === 'error' && now - t.used > 20000); })
    .sort(function (a, b) { return a.dist - b.dist; });
  while (SB3.inflight < 4 && todo.length) sb3Load(todo.shift());
  // Speicher begrenzen
  var all = Object.keys(SB3.tiles);
  if (all.length > 260) all.map(function (k) { return [k, SB3.tiles[k]]; }).filter(function (e) { return !e[1].want; }).sort(function (a, b) { return a[1].used - b[1].used; })
    .slice(0, all.length - 220).forEach(function (e) { if (e[1].geo) e[1].geo.dispose(); delete SB3.tiles[e[0]]; });
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
  function wlevel(sz) {
    var cv = document.createElement('canvas'); cv.width = cv.height = sz;
    var tex = new THREE.CanvasTexture(cv); tex.flipY = false; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter;
    return { cv: cv, ctx: cv.getContext('2d'), tex: tex, S: sz, x0: 0, z0: 0, size: 0 };
  }
  return { F: level(S), C: level(S), WF: wlevel(S / 2), WC: wlevel(S / 2), la: la, lb: lb, cache: {}, queue: [], inflight: 0, dirty: false, lastCompose: 0, listeners: [] };
})();
/* Seeflächen aus den Uferlinien (geschlossene Ringe, Meter relativ zu E0/N0), einmal als Path2D */
var lakePath = null;
function lakeMask(W, x0, z0, size) {
  if (W.x0 === x0 && W.z0 === z0 && W.size === size) return;
  if (!lakePath) {
    lakePath = new Path2D();
    (D.lines.shore || []).forEach(function (r) { for (var i = 0; i < r.length; i += 2) { if (i) lakePath.lineTo(r[i], r[i + 1]); else lakePath.moveTo(r[i], r[i + 1]); } lakePath.closePath(); });
  }
  var ctx = W.ctx, S = W.S, sc = S / size, Emin = x0 + EC, Nmax = NC - z0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
  ctx.setTransform(sc, 0, 0, -sc, (G.E0 - Emin) * sc, (Nmax - G.N0) * sc);
  ctx.fillStyle = '#fff'; ctx.fill(lakePath, 'evenodd');
  if (window.ZGSBZ) { ctx.beginPath(); ZGSBZ.bay.forEach(function (p, i) { if (i) ctx.lineTo(p[0] - G.E0, p[1] - G.N0); else ctx.moveTo(p[0] - G.E0, p[1] - G.N0); }); ctx.closePath(); ctx.fill(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  W.x0 = x0; W.z0 = z0; W.size = size; W.tex.needsUpdate = true;
}
/* SWISSIMAGE live from the geo.admin.ch WMTS (LV95 tile matrix, 256 px tiles, CORS open) for the close-up;
   the pre-cut 2 m tiles in o/la stay as the fast base layer underneath. */
var WMTS = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/2056/', WE0 = 2420000, WN1 = 1350000;
var WRES = [[21, 5], [22, 2.5], [23, 2], [24, 1.5], [25, 1], [26, 0.5], [27, 0.25], [28, 0.1]];
function wZoom(mpp) { for (var i = 0; i < WRES.length; i++) if (WRES[i][1] <= mpp * 1.5) return WRES[i]; return WRES[WRES.length - 1]; }
function oURL(lv, x0, y0) {
  if (lv.charAt(0) === 'w') return WMTS + lv.slice(1) + '/' + x0 + '/' + y0 + '.jpeg';
  return lv === 'la' ? 'o/la/' + (x0 / 1000) + '_' + (y0 / 1000) + '.webp' : 'o/lb/' + (x0 / 10) + '_' + (y0 / 10) + '.webp';
}
function drawWMTS(ctx, zr, Emin, Emax, Nmin, Nmax, scale, cE, cN, prioDiv) {
  var z = zr[0], span = 256 * zr[1], any = false;
  var tx0 = Math.floor((Emin - WE0) / span), tx1 = Math.floor((Emax - WE0) / span);
  var ty0 = Math.floor((WN1 - Nmax) / span), ty1 = Math.floor((WN1 - Nmin) / span);
  if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 324) return false;
  for (var tx = tx0; tx <= tx1; tx++) for (var ty = ty0; ty <= ty1; ty++) {
    var e0 = WE0 + tx * span, n1 = WN1 - ty * span;
    var img = oTile('w' + z, tx, ty, Math.hypot(e0 + span / 2 - cE, n1 - span / 2 - cN) / prioDiv);
    if (!img) continue;
    ctx.drawImage(img, Math.floor((e0 - Emin) * scale), Math.floor((Nmax - n1) * scale), Math.ceil(span * scale) + 1, Math.ceil(span * scale) + 1); any = true;
  }
  return any;
}
function oTile(lv, x0, y0, prio) {
  var key = lv + x0 + '_' + y0, c = OR.cache[key];
  if (c) { if (c.img) { c.used = performance.now(); return c.img; } if (!c.failed && c.queued) c.prio = Math.min(c.prio, prio); return null; }
  c = OR.cache[key] = { lv: lv, x0: x0, y0: y0, prio: prio, queued: true, img: null, failed: false, used: performance.now() };
  OR.queue.push(c);
  return null;
}
var oEvictAt = 0;
function oEvict() {
  var keys = Object.keys(OR.cache); if (keys.length < 1400) return;
  keys.map(function (k) { return [k, OR.cache[k]]; }).filter(function (e) { return e[1].img && !e[1].queued; })
    .sort(function (a, b) { return a[1].used - b[1].used; }).slice(0, keys.length - 1000).forEach(function (e) { delete OR.cache[e[0]]; });
}
function oPump() {
  var nowp = performance.now(); if (nowp - oEvictAt > 5000) { oEvictAt = nowp; oEvict(); }
  if (!OR.queue.length) return;
  if (OR.queue.length > 600) { OR.queue.sort(function (a, b) { return a.prio - b.prio; }); OR.queue.splice(600).forEach(function (c) { delete OR.cache[c.lv + c.x0 + '_' + c.y0]; }); }
  OR.queue.sort(function (a, b) { return a.prio - b.prio; });
  while (OR.inflight < 8 && OR.queue.length) {
    var c = OR.queue.shift(); c.queued = false; OR.inflight++;
    (function (c) {
      var im = new Image(); im.decoding = 'async';
      if (c.lv.charAt(0) === 'w') im.crossOrigin = 'anonymous';
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
  var zr = wZoom(size / S);
  if (zr[1] < 2 && drawWMTS(ctx, zr, Emin, Emax, Nmin, Nmax, scale, cx + EC, NC - cz, useLB ? 4 : 2)) any = true;
  if (any && window.ZGSBZ) ZGSBZ.paint(ctx, Emin, Nmax, scale, Emax, Nmin);
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
  var dirtyOK = OR.dirty && now - OR.lastCompose > 220;
  if (needs(OR.F, Fs) || dirtyOK) { var sn = Fs / 16; oCompose(OR.F, Math.round(tx / sn) * sn, Math.round(tz / sn) * sn, Fs, true); lakeMask(OR.WF, OR.F.x0, OR.F.z0, OR.F.size); }
  if (needs(OR.C, Cs) || dirtyOK) { var sc = Cs / 16; oCompose(OR.C, Math.round(tx / sc) * sc, Math.round(tz / sc) * sc, Cs, false); lakeMask(OR.WC, OR.C.x0, OR.C.z0, OR.C.size); }
  if (dirtyOK) { OR.dirty = false; OR.lastCompose = now; }
  U.uOrthoF.value = OR.F.tex; U.uOrthoC.value = OR.C.tex;
  U.uOrthoFRect.value.set(OR.F.x0, OR.F.z0, OR.F.size, OR.F.ok ? 1 : 0);
  U.uOrthoCRect.value.set(OR.C.x0, OR.C.z0, OR.C.size, OR.C.ok ? 1 : 0);
  U.uWaterF.value = OR.WF.tex; U.uWaterC.value = OR.WC.tex;
  U.uWaterFRect.value.set(OR.WF.x0, OR.WF.z0, OR.WF.size || 1, OR.WF.size ? 1 : 0);
  U.uWaterCRect.value.set(OR.WC.x0, OR.WC.z0, OR.WC.size || 1, OR.WC.size ? 1 : 0);
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
  if (drawWMTS(ctx, wZoom(size / W), Emin, Emax, Nmin, Nmax, scale, p.E, p.N, 100)) any = true;
  if (any && window.ZGSBZ) ZGSBZ.paint(ctx, Emin, Nmax, scale, Emax, Nmin);
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

/* ================= from here on WebGL 2 is available ================= */
GL = true;

/* ---------------- markers ---------------- */
var MK = { pts: null, mat: null, geo: null, items: [] };
var photoOn = true, markerKey = '';
function buildAtlas() {
  var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff';
  ICONKEYS.forEach(function (k, i) {
    var cx = (i % 8) * 128, cy = Math.floor(i / 8) * 128;
    ctx.save(); ctx.translate(cx + 14, cy + 14); ctx.scale(100 / 24, 100 / 24);
    ctx.fill(new Path2D(ICON[k]), EVENODD[k] ? 'evenodd' : 'nonzero'); ctx.restore();
  });
  var t = new THREE.CanvasTexture(cv); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
var ATLAS = null;
function buildMarkers() {
  var items = [];
  PL.forEach(function (p) { items.push(p); });
  (F.svc.w || []).forEach(function (w) { items.push({ type: 'w', mk: 6, E: w[0] + E0F, N: w[1] + N0F }); });
  (F.svc.c || []).forEach(function (w) { items.push({ type: 'c', mk: 7, E: w[0] + E0F, N: w[1] + N0F, wick: !!w[2] }); });
  SIGHTS.forEach(function (s) { items.push(s); });
  EVENTS.forEach(function (e) { if (e.exact) items.push(e); });
  PARK.forEach(function (g) { items.push(g); });
  items = items.filter(function (it) { return it.E && it.N && inGrid(it.E, it.N); });
  var n = items.length, pos = new Float32Array(n * 3), info = new Float32Array(n * 4), vis = new Float32Array(n), sel = new Float32Array(n);
  items.forEach(function (it, i) {
    var g = hAt(it.E, it.N) - H0;
    pos[i * 3] = X(it.E); pos[i * 3 + 1] = g; pos[i * 3 + 2] = Z(it.N);
    info[i * 4] = it.mk; info[i * 4 + 1] = it.zt ? 1 : 0; info[i * 4 + 2] = 0; info[i * 4 + 3] = 0;
  });
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  geo.setAttribute('aVis', new THREE.BufferAttribute(vis, 1));
  geo.setAttribute('aSel', new THREE.BufferAttribute(sel, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 40000);
  if (!ATLAS) ATLAS = buildAtlas();
  var mat = MK.mat || new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uAtlas: { value: ATLAS }, uSize: { value: 20 }, uDpr: { value: 1 }, uAlpha: { value: 0 }, uRing: { value: 0 }, uVZ: U.uVZ, uPx: U.uPx,
      uFill: { value: C['--m-pin'] }, uSight: { value: C['--m-pin-sight'] }, uEvent: { value: C['--m-pin-event'] }, uPark: { value: C['--m-pin-park'] }, uWhite: { value: new THREE.Color(1, 1, 1) },
      uRingShade: { value: C['--m-ring-shade'] }, uRingSun: { value: C['--m-ring-sun'] }, uSvc: { value: 0.7 } },
    vertexShader: [
      'attribute vec4 aInfo; attribute float aVis; attribute float aSel; uniform float uSize, uDpr, uVZ, uPx, uSvc;',
      'varying vec4 vInfo; varying float vSel; varying float vSize;',
      'void main(){',
      '  vec3 p = position; p.y *= uVZ;',
      '  vec4 mv = modelViewMatrix*vec4(p,1.0);',
      '  float svc = (aInfo.x > 5.5 && aInfo.x < 7.5) ? uSvc : 1.0;',
      '  float sz = uSize * svc * (1.0 + 0.45*aSel);',
      '  mv.y += uPx*(-mv.z)*sz*0.62;',
      '  gl_Position = projectionMatrix*mv;',
      '  gl_Position.z -= 0.004*gl_Position.w*(1.0+aSel);',
      '  gl_PointSize = aVis > 0.5 ? sz*uDpr : 0.0;',
      '  vInfo = aInfo; vSel = aSel; vSize = sz*uDpr;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uAtlas; uniform vec3 uFill, uSight, uEvent, uPark, uWhite, uRingShade, uRingSun; uniform float uAlpha, uRing;',
      'varying vec4 vInfo; varying float vSel; varying float vSize;',
      'void main(){',
      '  vec2 pc = gl_PointCoord*2.0-1.0; float r = length(pc);',
      '  float w = max(fwidth(r), 0.02);',
      '  float disc = 1.0 - smoothstep(0.70-w, 0.70+w, r);',
      '  float ring = smoothstep(0.73-w, 0.73+w, r) * (1.0 - smoothstep(0.97-w, 0.97+w, r));',
      '  float cat = floor(vInfo.x + 0.5); float row = floor(cat/8.0 + 0.01); vec2 cell = vec2(cat - 8.0*row, row);',
      '  vec2 iu = (gl_PointCoord - 0.5)/0.62 + 0.5;',
      '  float inside = step(0.0, iu.x)*step(iu.x, 1.0)*step(0.0, iu.y)*step(iu.y, 1.0);',
      '  float lod = max(0.0, log2(128.0/(0.62*max(vSize, 1.0))));',
      '  float icon = textureLod(uAtlas, (cell + clamp(iu, 0.0, 1.0))/vec2(8.0,4.0), lod).a*inside;',
      '  vec3 fill = cat > 17.5 ? uPark : cat > 16.5 ? uEvent : cat > 7.5 ? uSight : cat > 6.5 ? vec3(0.32,0.38,0.5) : cat > 5.5 ? vec3(0.18,0.62,0.86) : uFill;',
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
  if (MK.pts) { scene.remove(MK.pts); MK.geo.dispose(); }
  var pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 20;
  scene.add(pts);
  MK.items = items; MK.geo = geo; MK.mat = mat; MK.pts = pts;
  markerVisDirty = true; markerShadeDirty = true; markerKey = '';
}
function rebuildMarkers() { if (ready) buildMarkers(); }
function markerVisible(it) {
  if (touring) return false;
  if (it === SEL) return true;
  if (it.type === 'w') return MODE === 'familie' && showWater && cam.d < 4000;
  if (it.type === 'c') return MODE === 'familie' && showWC && cam.d < 4000;
  if (it.type === 'fam') return MODE === 'familie' && matchFam(it);
  if (it.type === 'sight') return (MODE === 'sights' && matchSight(it)) || (MODE === 'gemeinden' && !!selGem && it.gem === selGem.name);
  if (it.type === 'event') return MODE === 'events' && matchEvent(it);
  if (it.type === 'park') return parkOn && MODE !== 'home' && cam.d < 16000;
  return false;
}
function updateMarkers(alpha) {
  if (!MK.geo) return;
  var vis = MK.geo.attributes.aVis, info = MK.geo.attributes.aInfo, sel = MK.geo.attributes.aSel;
  var key = MODE + (cam.d < 4000 ? 'n' : 'f') + (cam.d < 16000 ? 'p' : '') + (touring ? 't' : '') + (selGem ? selGem.id : '');
  if (markerShadeDirty) {
    markerShadeDirty = false;
    var summer = sunDay.k === 'sommer';
    MK.items.forEach(function (it, i) { if (it.type === 'fam' && it.s) { info.array[i * 4 + 2] = summer ? shadeAt(it, sunT) : 0; info.array[i * 4 + 3] = summer ? 1 : 0; } });
    info.needsUpdate = true;
    if (filt.familie.sunMax < 100) markerVisDirty = true;
  }
  if (markerVisDirty || key !== markerKey) {
    markerVisDirty = false; markerKey = key;
    MK.items.forEach(function (it, i) { vis.array[i] = markerVisible(it) ? 1 : 0; });
    vis.needsUpdate = true;
  }
  MK.mat.uniforms.uAlpha.value = alpha;
  MK.mat.uniforms.uRing.value = MODE === 'familie' ? 1 : 0;
  MK.mat.uniforms.uSize.value = clamp(lerp(26, 12, sstep(1500, 26000, cam.d)), 11, 28);
  MK.mat.uniforms.uDpr.value = renderer.getPixelRatio();
  for (var i = 0; i < sel.array.length; i++) { var s = MK.items[i] === SEL ? 1 : 0; if (sel.array[i] !== s) { sel.array[i] = s; sel.needsUpdate = true; } }
}
var projV = new THREE.Vector3();
function pickMarker(cx, cy, W, H) {
  if (!MK.geo || MK.mat.uniforms.uAlpha.value < 0.3) return null;
  var vis = MK.geo.attributes.aVis.array, best = null, bd = 18 * 18, size = MK.mat.uniforms.uSize.value;
  for (var i = 0; i < MK.items.length; i++) {
    if (!vis[i]) continue;
    var it = MK.items[i];
    projV.set(X(it.E), Y(hAt(it.E, it.N)), Z(it.N)).project(camera);
    if (projV.z > 1) continue;
    var sx = (projV.x + 1) / 2 * W, sy = (1 - projV.y) / 2 * H - size * (it.mk === 6 || it.mk === 7 ? 0.7 : 1) * 0.62;
    var d2 = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy);
    if (d2 < bd) { bd = d2; best = it; }
  }
  return best;
}

/* ---------------- selection outline, callout ---------------- */
var outlineMesh = null, calloutEl = $('#callout');
function clearOutline() { if (outlineMesh) { scene.remove(outlineMesh); outlineMesh.geometry.dispose(); outlineMesh = null; } }
function makeOutline(p) {
  clearOutline();
  if (!p || !p.poly) return;
  var lines = p.poly.map(function (ring) { var o = []; for (var k = 0; k < ring.length; k += 2) o.push([p.E + ring[k] / 2, p.N + ring[k + 1] / 2]); o.push(o[0]); return o; });
  outlineMesh = buildRibbon(lines, ribbonMat('--m-sel', 2.6, 0.95, { lift: 1.2 }), false, 4);
  outlineMesh.renderOrder = 15;
}

/* ---------------- labels ---------------- */
var labelsEl = $('#labels');
labelsEl.addEventListener('keydown', function (e) { var t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute('role') === 'button') { e.preventDefault(); t.click(); } });
var LBL = [], LBL_ORDER = [], PRIO = { park: -1, tempst: -0.5, muni: 0, lake: 1, peak: 2, river: 3, poi: 4, place: 5, temp: 6 };
function addLabel(text, kind, E, N, sections, sub, elev) {
  var el = document.createElement('div');
  el.className = 'lbl ' + kind;
  if (kind === 'muni') el.innerHTML = esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '');
  else if (kind === 'peak') el.innerHTML = '<span>' + esc(text) + '</span><em>' + elev + '</em>';
  else el.textContent = text;
  if (kind === 'park' || kind === 'temp' || kind === 'tempst') { el.setAttribute('role', 'button'); el.tabIndex = -1; el.style.pointerEvents = 'none'; }
  else el.setAttribute('aria-hidden', 'true');
  labelsEl.appendChild(el);
  var lift = kind === 'peak' ? 40 : kind === 'poi' ? 30 : 60;
  LBL.push({ el: el, kind: kind, name: text, E: E, N: N, h: hAt(E, N), lift: lift, p: new THREE.Vector3(), s: sections || [], k: (sections || []).indexOf('kanton') >= 0, o: 0, occ: false, n: LBL.length, w: 0 });
}
function labelWant(L) {
  var d = cam.d;
  if (L.kind === 'park') return parkOn && !touring && MODE !== 'home' && d < 7000 ? 1 : 0;
  if (L.kind === 'temp') return tempOn && !touring && d < 3400 ? 1 : 0;
  if (L.kind === 'tempst') return tempOn && !touring && d < 60000 ? 1 : 0;
  if (touring) { var key = TOUR[tourI].key; return (L.s.indexOf(key) >= 0 || (L.kind === 'muni' && key === 'kanton')) ? 1 : 0; }
  if (L.kind === 'muni') return d > 5200 ? 1 : 0;
  if (L.kind === 'lake') return L.k ? (d > 3200 ? 1 : 0) : (d > 6000 && d < 24000 ? 1 : 0);
  if (L.kind === 'peak') return L.k ? (d > 2400 ? 1 : 0) : (d > 7000 && d < 26000 && MODE !== 'home' ? 1 : 0);
  if (L.kind === 'river') return d > 2500 && d < 26000 ? 1 : 0;
  return d > 500 && d < 9000 ? 1 : 0;
}

/* ---------------- camera ---------------- */
var OVERVIEW = { E: 2684000, N: 1224300, d: 31000, hd: 10, p: 54 };
var HOMEV = { E: 2683700, N: 1223000, d: 44000, hd: -22, p: 38 };
var KEYS = {
  kanton:    { E: 2684000, N: 1224200, d: 33500, hd: 0, p: 64 },
  zug:       { E: 2681950, N: 1224350, d: 3900, hd: 100, p: 26 },
  lorze:     { E: 2681200, N: 1226600, d: 25500, hd: -38, p: 52 },
  aegeri:    { E: 2689500, N: 1219800, d: 9200, hd: 136, p: 33 },
  berg:      { E: 2687300, N: 1225500, d: 10000, hd: 142, p: 34 },
  walchwil:  { E: 2682900, N: 1216800, d: 9000, hd: 118, p: 27 }
};
var ex = { E: HOMEV.E, N: HOMEV.N, d: HOMEV.d, hd: HOMEV.hd, p: HOMEV.p }, cam = null, flight = null;
var topBar = document.querySelector('.top'), capEl = $('#caption');
/* layout boxes via offset* so running CSS transitions do not distort the measurement */
function freeArea(W, H) {
  var top = topBar.offsetHeight, x0 = 0, y0 = top, x1 = W, y1 = H;
  if (touring) { if (narrowMQ.matches) y1 = capEl.offsetTop; else x0 = Math.min(W * 0.3, (capEl.offsetLeft + capEl.offsetWidth) * 0.6); }
  else if (MODE === 'home') y1 = Math.max(top + 120, homeEl.offsetTop);
  else if (narrowMQ.matches) y1 = Math.max(top + 100, panel.offsetTop);
  else x0 = panel.offsetLeft + panel.offsetWidth;
  return { x0: x0, y0: y0, x1: x1, y1: y1 };
}
function viewOffsets(W, H) { var a = freeArea(W, H); return { ox: ((a.x0 + a.x1) / 2 - W / 2) / W, oy: ((a.y0 + a.y1) / 2 - H / 2) / H }; }
function fitFactor() {
  var W = window.innerWidth, H = window.innerHeight, a = freeArea(W, H), w = Math.max(1, a.x1 - a.x0), h = Math.max(1, a.y1 - a.y0), asp = w / h;
  var f = asp < 1.25 ? clamp(1.25 / asp, 1, 2.4) : 1;
  return f * clamp(Math.sqrt(H / h), 1, 1.35);
}
function fit(c) { var f = fitFactor(); return { E: c.E, N: c.N, d: c.d * (c.d < 3000 ? Math.min(f, 1.4) : f), hd: c.hd, p: c.p }; }
function clampEx() { ex.E = clamp(ex.E, G.E0 + 500, G.E1 - 500); ex.N = clamp(ex.N, G.N0 + 500, G.N1 - 500); ex.d = clamp(ex.d, 200, 80000); ex.p = clamp(ex.p, 10, 86); }
function angLerp(a, b, t) { var d = ((((b - a) % 360) + 540) % 360) - 180; return a + d * t; }
function flyTo(to) {
  if (!cam) { ex.E = to.E; ex.N = to.N; ex.d = to.d; ex.hd = to.hd == null ? ex.hd : to.hd; ex.p = to.p == null ? ex.p : to.p; flight = null; return; }
  var from = { E: ex.E, N: ex.N, d: ex.d, hd: ex.hd, p: ex.p };
  if (to.hd == null) to.hd = ex.hd; if (to.p == null) to.p = ex.p;
  var dist = Math.hypot(to.E - from.E, to.N - from.N);
  flight = { from: from, to: to, t0: performance.now(), dur: reduce ? 1 : clamp(900 + dist * 0.12 + Math.abs(Math.log(to.d / from.d)) * 260, 900, 2600),
    hop: clamp(dist / Math.min(from.d, to.d) * 0.35, 0, 1.6) };
}
function flyToMuni(m) {
  var size = Math.sqrt(m.ha * 10000);
  flyTo(fit({ E: (m.at[0] * 2 + m.c[0]) / 3, N: (m.at[1] * 2 + m.c[1]) / 3, d: clamp(size * 2.3, 6500, 15000), hd: ex.hd, p: 46 }));
}
function flyOverview() { flyTo(fit({ E: OVERVIEW.E, N: OVERVIEW.N, d: OVERVIEW.d, hd: ((ex.hd % 360) + 540) % 360 - 180 > 90 || ((ex.hd % 360) + 540) % 360 - 180 < -90 ? OVERVIEW.hd : ex.hd, p: OVERVIEW.p })); }
function flyContext() {
  if (!GL) return;
  if (MODE === 'home') { flyTo(fit(HOMEV)); return; }
  var g = MODE === 'sights' ? filt.sights.gem : MODE === 'familie' ? filt.familie.gem : MODE === 'events' ? filt.events.gem : '';
  if (g && MUNI[g]) flyToMuni(MUNI[g]); else flyOverview();
}
var flightEnd = 0;
function stepFlight(now) {
  if (!flight) return;
  var u = clamp((now - flight.t0) / flight.dur, 0, 1), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  var f = flight.from, t = flight.to, hop = flight.hop * Math.sin(Math.PI * e);
  ex.E = lerp(f.E, t.E, e); ex.N = lerp(f.N, t.N, e);
  ex.d = Math.exp(lerp(Math.log(f.d), Math.log(t.d), e)) * (1 + hop);
  ex.hd = angLerp(f.hd, t.hd, e); ex.p = lerp(f.p, t.p, e);
  if (u >= 1) { flight = null; flightEnd = now; }
}
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
  camera.updateMatrixWorld(true);
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
function setRay(cx, cy) { ndc.set(cx / window.innerWidth * 2 - 1, -(cy / (canvas.clientHeight || window.innerHeight)) * 2 + 1); ray.setFromCamera(ndc, camera); }
function groundAt(cx, cy) {
  setRay(cx, cy);
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
function planeAt(cx, cy, h) {
  setRay(cx, cy);
  var o = ray.ray.origin, d = ray.ray.direction, yp = Y(h);
  if (Math.abs(d.y) < 1e-6) return null;
  var t = (yp - o.y) / d.y; if (t <= 0) return null;
  return { E: o.x + d.x * t + EC, N: NC - (o.z + d.z * t), h: h };
}

/* ---------------- interaction: drag pans, right button or two fingers rotate, wheel or pinch zooms ---------------- */
var tip = $('#tip'), tipT = $('#tipT'), tipA = $('#tipA'), tipB = $('#tipB'), hoverId = 0, hoverMk = null;
var ptr = { cx: -1, cy: -1, moved: false, over: false }, PTS = {}, drag = { mode: null, g: null, lx: 0, ly: 0, sx: 0, sy: 0, t0: 0, moved: 0, type: '' }, lastInteract = 0;
function nPts() { return Object.keys(PTS).length; }
function syncCamNow() {
  if (!cam) return;
  cam.E = ex.E; cam.N = ex.N; cam.d = ex.d; cam.hd = ex.hd; cam.p = ex.p;
  vz = lerp(1.0, VZ, sstep(1800, 7500, cam.d)); U.uVZ.value = vz; U.uBZ.value = vz;
  placeCamera(cam, window.innerWidth, canvas.clientHeight || window.innerHeight);
}
function panTo(cx, cy) {
  if (!drag.g) return;
  var p = planeAt(cx, cy, drag.g.h); if (!p) return;
  ex.E += drag.g.E - p.E; ex.N += drag.g.N - p.N; clampEx(); syncCamNow();
}
function pinchState() {
  var k = Object.keys(PTS), a = PTS[k[0]], b = PTS[k[1]];
  return { dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}
function beginPan(x, y) { drag.mode = 'pan'; drag.g = groundAt(x, y) || planeAt(x, y, hAt(ex.E, ex.N)); }
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
canvas.addEventListener('pointerdown', function (e) {
  lastInteract = performance.now();
  if (touring) stopTour();
  flight = null;
  try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  PTS[e.pointerId] = { x: e.clientX, y: e.clientY };
  var n = nPts();
  drag.lx = e.clientX; drag.ly = e.clientY;
  if (n === 1) {
    drag.sx = e.clientX; drag.sy = e.clientY; drag.t0 = performance.now(); drag.moved = 0; drag.type = e.pointerType;
    if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)) drag.mode = 'rot';
    else if (e.pointerType !== 'mouse' || e.button === 0) beginPan(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') document.body.style.cursor = drag.mode === 'rot' ? 'move' : 'grabbing';
  } else if (n === 2) {
    var s = pinchState(); drag.mode = 'pinch'; drag.moved = 99; drag.p0 = s; drag.d0 = ex.d; drag.hd0 = ex.hd; drag.pp0 = ex.p;
  }
  e.preventDefault();
});
canvas.addEventListener('pointermove', function (e) {
  ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.moved = true; ptr.over = e.pointerType === 'mouse';
  if (!PTS[e.pointerId]) return;
  PTS[e.pointerId] = { x: e.clientX, y: e.clientY };
  lastInteract = performance.now();
  var dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
  drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
  if (drag.mode === 'pan' && nPts() === 1) panTo(e.clientX, e.clientY);
  else if (drag.mode === 'rot') { ex.hd -= dx * 0.25; ex.p = clamp(ex.p + dy * 0.2, 10, 86); }
  else if (drag.mode === 'pinch' && nPts() >= 2) {
    var s = pinchState();
    ex.d = clamp(drag.d0 * drag.p0.dist / Math.max(20, s.dist), 200, 80000);
    ex.hd = drag.hd0 - (s.ang - drag.p0.ang) / DEG;
    ex.p = clamp(drag.pp0 + (s.my - drag.p0.my) * 0.2, 10, 86);
    syncCamNow();
  }
  drag.lx = e.clientX; drag.ly = e.clientY;
});
function endPointer(e) {
  if (!PTS[e.pointerId]) return;
  delete PTS[e.pointerId];
  var n = nPts();
  if (n === 1 && drag.mode === 'pinch') { var k = Object.keys(PTS)[0]; drag.lx = PTS[k].x; drag.ly = PTS[k].y; beginPan(PTS[k].x, PTS[k].y); drag.moved = 99; return; }
  if (n > 0) return;
  var wasClick = drag.moved < 6 && performance.now() - drag.t0 < 500 && e.type === 'pointerup' && drag.mode !== 'rot';
  drag.mode = null; drag.g = null; document.body.style.cursor = '';
  if (wasClick) mapClick(e.clientX, e.clientY, e.pointerType);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', function () { ptr.over = false; ptr.moved = true; });
canvas.addEventListener('wheel', function (e) {
  e.preventDefault(); flight = null; lastInteract = performance.now(); if (touring) stopTour();
  var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  if (e.ctrlKey) dy *= 3;
  zoomAt(e.clientX, e.clientY, Math.exp(clamp(dy, -240, 240) * 0.0016));
}, { passive: false });
function zoomAt(x, y, f) {
  var nd = clamp(ex.d * f, 200, 80000), g = x != null ? groundAt(x, y) : null;
  if (g) { var k = 1 - nd / ex.d; ex.E += (g.E - ex.E) * k; ex.N += (g.N - ex.N) * k; }
  ex.d = nd; clampEx();
}
canvas.addEventListener('keydown', function (e) {
  var k = e.key, step = ex.d * 0.12, th = ex.hd * DEG, fE = Math.sin(th), fN = Math.cos(th), rE = Math.cos(th), rN = -Math.sin(th), used = true;
  if (k === 'ArrowUp') { ex.E += fE * step; ex.N += fN * step; }
  else if (k === 'ArrowDown') { ex.E -= fE * step; ex.N -= fN * step; }
  else if (k === 'ArrowLeft') { ex.E -= rE * step; ex.N -= rN * step; }
  else if (k === 'ArrowRight') { ex.E += rE * step; ex.N += rN * step; }
  else if (k === '+' || k === '=') zoomAt(null, null, 0.7);
  else if (k === '-' || k === '_') zoomAt(null, null, 1.4);
  else if (k === 'q' || k === 'Q') ex.hd -= 10;
  else if (k === 'e' || k === 'E') ex.hd += 10;
  else if (k === 'PageUp') ex.p = clamp(ex.p + 6, 10, 86);
  else if (k === 'PageDown') ex.p = clamp(ex.p - 6, 10, 86);
  else used = false;
  if (used) { e.preventDefault(); flight = null; clampEx(); lastInteract = performance.now(); }
});
function mapClick(x, y, type) {
  var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  var mk = pickMarker(x, y, W, H);
  if (mk && mk.type === 'park') { showPark(mk); return; }
  if (mk && (mk.type === 'fam' || mk.type === 'sight' || mk.type === 'event')) { hidePark(); pick(mk); return; }
  if (mk) return; // Trinkbrunnen und WC: nur Hinweis beim Darüberfahren
  if (POP.it) { hidePark(); return; }
  var g = groundAt(x, y), id = g ? idAt(g.E, g.N) : 0;
  if (!id) return;
  var m = D.munis[id - 1], gm = GEMBY[m.name];
  if (MODE === 'home' || MODE === 'gemeinden') { pick(gm); return; }
  var f = filt[MODE]; if (!f) return;
  if (SEL) { closeDetail(true); }
  f.gem = m.name; renderHead(); renderList(); markerVisDirty = true; syncHash(); flyToMuni(m);
}
$('#zoomIn').addEventListener('click', function () { flyTo({ E: ex.E, N: ex.N, d: clamp(ex.d / 2, 200, 80000), hd: ex.hd, p: ex.p }); });
$('#zoomOut').addEventListener('click', function () { flyTo({ E: ex.E, N: ex.N, d: clamp(ex.d * 2, 200, 80000), hd: ex.hd, p: ex.p }); });
$('#homeBtn').addEventListener('click', function () { if (touring) stopTour(true); flyTo(fit(MODE === 'home' ? HOMEV : OVERVIEW)); });
$('#northBtn').addEventListener('click', function () { flyTo({ E: ex.E, N: ex.N, d: ex.d, hd: 0, p: ex.p }); });
$('#tPhoto').addEventListener('click', function () { photoOn = !photoOn; this.setAttribute('aria-pressed', String(photoOn)); });
/* ---------------- parking garages with live free spaces (Parkleitsystem Zug, through the Worker) ---------------- */
var PARK = [], PARKBY = {}, parkOn = false, parkTimer = null, parkState = '', POP = { el: $('#pop'), it: null };
function freeClass(g) { return !g.open ? 'full' : g.free < 10 ? 'full' : g.free < 50 ? 'low' : 'ok'; }
function freeText(g) { return g.open ? plural(g.free, 'frei', 'frei') : 'geschlossen'; }
function loadParking() {
  fetch('api/parking', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(setParking)
    .catch(function () { parkState = 'error'; if (parkOn && !PARK.length) showParkError(); });
}
function setParking(d) {
  var first = !PARK.length;
  (d.garages || []).forEach(function (g) {
    if (!g.E || !g.N) return;
    var it = PARKBY[g.id];
    if (!it) { it = PARKBY[g.id] = { type: 'park', id: String(g.id), mk: MK_PARK, gem: 'Zug', E: g.E, N: g.N }; PARK.push(it); }
    it.title = it.name = g.name; it.free = Math.max(0, g.free | 0); it.open = !!g.open; it.address = g.address || '';
    it.prices = g.prices || []; it.hours = g.hours || ''; it.info = g.info || ''; it.lat = g.lat; it.lng = g.lng;
  });
  parkState = 'ok'; parkUpdated = d.updated || '';
  if (ready) { if (first) buildMarkers(); ensureParkLabels(); }
  PARK.forEach(function (g) { if (g.lbl) { g.lbl.el.textContent = freeText(g); g.lbl.el.className = 'lbl park ' + freeClass(g); g.lbl.el.setAttribute('aria-label', 'Parkhaus ' + g.title + ', ' + freeText(g)); g.lbl.bw = 0; } });
  markerVisDirty = true;
  if (POP.it && POP.it.type === 'park') showPark(POP.it, true);
}
var parkUpdated = '';
function ensureParkLabels() {
  var added = false;
  PARK.forEach(function (g) {
    if (g.lbl) return;
    addLabel(freeText(g), 'park', g.E, g.N, []); g.lbl = LBL[LBL.length - 1]; g.lbl.lift = 0; added = true; g.lbl.el.className = 'lbl park ' + freeClass(g);
    g.lbl.el.title = 'Parkhaus ' + g.title; g.lbl.el.setAttribute('aria-label', 'Parkhaus ' + g.title + ', ' + freeText(g));
    g.lbl.el.addEventListener('click', function (e) { e.stopPropagation(); showPark(g); });
  });
  if (added) LBL_ORDER = LBL.slice().sort(function (a, b) { return PRIO[a.kind] - PRIO[b.kind] || a.n - b.n; });
}
function parkHTML(g) {
  var h = '<button class="x" type="button" aria-label="Schliessen">×</button><h4 id="popTitle">Parkhaus ' + esc(g.title) + '</h4><p class="sub">' + esc(g.address) + '</p>';
  h += '<div class="big"><b class="free ' + freeClass(g) + '" style="font-size:1.6rem;padding:6px 12px">' + (g.open ? swiss(g.free) : '–') + '</b><span>' + (g.open ? (g.free === 1 ? 'freier Platz' : 'freie Plätze') : 'geschlossen') + '</span></div>';
  var pr = g.prices.filter(function (p) { return p && (p[1] || p[2]); }).slice(0, 6);
  if (pr.length) h += '<ul>' + pr.map(function (p) { return '<li><span>' + esc([p[0], p[1]].filter(Boolean).join(' · ')) + '</span><b>CHF ' + esc(p[2]) + '</b></li>'; }).join('') + '</ul>';
  var notes = [g.hours, g.info].filter(Boolean).join(' · ');
  if (notes) h += '<p class="note">' + esc(notes) + '</p>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><a class="btn btn-primary" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + encodeURIComponent(g.lat + ',' + g.lng) + '">Route</a>' +
    '<a class="btn btn-soft" target="_blank" rel="noopener" href="https://www.pls-zug.ch/">Parkleitsystem Zug</a></div>';
  if (parkUpdated) h += '<p class="note">Stand ' + esc(fmtHM.format(new Date(parkUpdated))) + ' Uhr, wird jede Minute aktualisiert.</p>';
  return h;
}
function showPark(g, refresh) {
  POP.it = g; POP.el.innerHTML = parkHTML(g); POP.el.classList.add('on');
  POP.el.querySelector('.x').addEventListener('click', hidePark);
  if (!refresh) { POP.placed = false; if (cam.d > 2500) flyTo({ E: g.E, N: g.N, d: 1600, hd: ex.hd, p: 44 }); }
}
function hidePark() { POP.it = null; POP.el.classList.remove('on'); }
function showParkError() { POP.it = null; POP.el.innerHTML = '<button class="x" type="button" aria-label="Schliessen">×</button><h4 id="popTitle">Parkhäuser</h4><p class="sub">Die freien Plätze konnten nicht geladen werden. Sie finden sie beim <a href="https://www.pls-zug.ch/" target="_blank" rel="noopener">Parkleitsystem Zug</a>.</p>'; POP.el.classList.add('on'); POP.el.querySelector('.x').addEventListener('click', function () { POP.el.classList.remove('on'); }); }
function placePop(W, H) {
  if (!POP.it || narrowMQ.matches) return;
  var g = POP.it; tmpV.set(X(g.E), Y(hAt(g.E, g.N)), Z(g.N)).project(camera);
  var pw = POP.el.offsetWidth || 300, ph = POP.el.offsetHeight || 200, top = topBar.offsetHeight + 10;
  var x = (tmpV.x + 1) / 2 * W + 24, y = (1 - tmpV.y) / 2 * H - ph / 2;
  if (x + pw > W - 70) x = (tmpV.x + 1) / 2 * W - pw - 24;
  var minX = MODE === 'home' || touring ? 12 : panel.offsetLeft + panel.offsetWidth + 12;
  x = clamp(x, minX, W - pw - 64); y = clamp(y, top, H - ph - 12);
  POP.el.style.left = x.toFixed(0) + 'px'; POP.el.style.top = y.toFixed(0) + 'px';
}
$('#tPark').addEventListener('click', function () {
  lastInteract = performance.now(); if (MODE === 'home' && !parkOn) go('gemeinden');
  parkOn = !parkOn; this.setAttribute('aria-pressed', String(parkOn)); markerVisDirty = true;
  if (parkOn) {
    loadParking(); clearInterval(parkTimer); parkTimer = setInterval(loadParking, 60000);
    if (cam && cam.d > 9000) flyTo({ E: 2681850, N: 1225000, d: 4200, hd: ex.hd, p: 46 });
  } else { clearInterval(parkTimer); hidePark(); POP.el.classList.remove('on'); }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && POP.el.classList.contains('on')) { hidePark(); POP.el.classList.remove('on'); } });


/* ---------------- Temperaturen: Sensoren Stadt Zug, MeteoSchweiz, Seemodell ---------------- */
var TEMP = { city: [], st: [], lakes: [], updated: '', at: 0, lakeAt: 0, lo: 10, hi: 25, state: '', lbl: false }, tempOn = false, tempTimer = null, tempReq = null, lakeReq = null;
var RAMP = [[44, 123, 182], [118, 180, 210], [171, 217, 233], [255, 255, 191], [253, 174, 97], [215, 25, 28]];
function rampRGB(x) {
  x = clamp(x, 0, 1) * (RAMP.length - 1); var i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i, a = RAMP[i], b = RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
function tempCSS(t) { var c = rampRGB((t - TEMP.lo) / (TEMP.hi - TEMP.lo)); return 'rgb(' + c.map(Math.round).join(',') + ')'; }
function degC(t) { return dec(t) + ' °C'; }
function loadTemp(force) {
  if (!force && TEMP.at && Date.now() - TEMP.at < 9 * 60e3) return Promise.resolve(TEMP);
  if (tempReq) return tempReq;
  tempReq = fetch('api/temp', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (d) { tempReq = null; setTemp(d); return TEMP; })
    .catch(function () { tempReq = null; TEMP.state = 'error'; if (tempOn) updLegend(); return TEMP; });
  return tempReq;
}
function loadLake() {
  if (TEMP.lakeAt && Date.now() - TEMP.lakeAt < 3 * 3600e3) return Promise.resolve(TEMP);
  if (lakeReq) return lakeReq;
  lakeReq = fetch('api/lake', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (d) { lakeReq = null; TEMP.lakes = d.lakes || []; TEMP.lakeAt = Date.now(); return TEMP; })
    .catch(function () { lakeReq = null; return TEMP; });
  return lakeReq;
}
function setTemp(d) {
  TEMP.city = d.city || []; TEMP.st = d.stations || []; TEMP.updated = d.updated || ''; TEMP.at = Date.now(); TEMP.state = 'ok';
  var ts = TEMP.city.map(function (c) { return c.t; }).concat(TEMP.st.filter(function (s) { return Math.hypot(s.E - 2682000, s.N - 1224000) < 12000; }).map(function (s) { return s.t; }))
    .sort(function (a, b) { return a - b; });
  if (ts.length) {
    var lo = ts[Math.floor(ts.length * 0.04)], hi = ts[Math.min(ts.length - 1, Math.floor(ts.length * 0.96))], mid = (lo + hi) / 2;
    if (hi - lo < 4) { lo = mid - 2; hi = mid + 2; }
    TEMP.lo = Math.floor(lo); TEMP.hi = Math.ceil(hi);
  }
  if (GL) buildHeat();
  if (ready) ensureTempLabels();
  updLegend();
  if (SEL || selGem) fillWx(SEL || selGem);
  if (POP.it && POP.it.type === 'temp') hidePark();
}
/* Wärmefläche: Messwerte der Sensoren, gewichtet nach Entfernung (IDW), nur bis rund 350 m um einen Sensor */
var heatCv = null, heatTex = null;
function buildHeat() {
  var P = TEMP.city; if (!P.length) return;
  var RES = 10, M = 420, e0 = 1e9, e1 = -1e9, n0 = 1e9, n1 = -1e9;
  P.forEach(function (c) { e0 = Math.min(e0, c.E); e1 = Math.max(e1, c.E); n0 = Math.min(n0, c.N); n1 = Math.max(n1, c.N); });
  e0 -= M; e1 += M; n0 -= M; n1 += M;
  var W = Math.ceil((e1 - e0) / RES), H = Math.ceil((n1 - n0) / RES);
  if (!heatCv) { heatCv = document.createElement('canvas'); heatTex = new THREE.CanvasTexture(heatCv); heatTex.flipY = false; heatTex.minFilter = THREE.LinearFilter; heatTex.generateMipmaps = false; }
  heatCv.width = W; heatCv.height = H;
  var cx = heatCv.getContext('2d'), img = cx.createImageData(W, H), d = img.data, CS = 400, grid = {};
  P.forEach(function (c) { var k = Math.floor((c.E - e0) / CS) + '_' + Math.floor((c.N - n0) / CS); (grid[k] || (grid[k] = [])).push(c); });
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var E = e0 + (x + 0.5) * RES, N = n1 - (y + 0.5) * RES, gx = Math.floor((E - e0) / CS), gy = Math.floor((N - n0) / CS), ws = 0, vs = 0, dmin = 1e9;
    for (var ix = gx - 1; ix <= gx + 1; ix++) for (var iy = gy - 1; iy <= gy + 1; iy++) {
      var cell = grid[ix + '_' + iy]; if (!cell) continue;
      for (var j = 0; j < cell.length; j++) {
        var c = cell[j], dd = Math.hypot(c.E - E, c.N - N); if (dd > 600) continue;
        dmin = Math.min(dmin, dd); var w = 1 / Math.max(dd * dd, 400); ws += w; vs += w * c.t;
      }
    }
    if (!ws) continue;
    var a = 1 - sstep(140, 360, dmin), col = rampRGB((vs / ws - TEMP.lo) / (TEMP.hi - TEMP.lo)), k = (y * W + x) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = Math.round(a * 255);
  }
  cx.putImageData(img, 0, 0);
  heatTex.needsUpdate = true;
  U.uHeat.value = heatTex; U.uHeatRect.value.set(X(e0), Z(n1), e1 - e0, n1 - n0);
}
function ensureTempLabels() {
  var added = false;
  function lab(c, kind, text) {
    if (!c.lbl) {
      addLabel('', kind, c.E, c.N, []); c.lbl = LBL[LBL.length - 1]; c.lbl.lift = kind === 'temp' ? 12 : 40; added = true;
      c.lbl.el.addEventListener('click', function (e) { e.stopPropagation(); showTempPop(c, kind); });
    }
    c.lbl.el.innerHTML = '<i style="background:' + tempCSS(c.t) + '"></i>' + esc(text); c.lbl.el.title = (kind === 'temp' ? 'Sensor ' : 'Station ') + c.n; c.lbl.bw = 0;
    c.lbl.el.setAttribute('aria-label', (kind === 'temp' ? 'Sensor ' : 'Station ') + c.n + ', ' + dec(c.t) + ' Grad');
  }
  // bestehende Labels bleiben, neue Objekte übernehmen sie über den Namen
  var old = TEMP.byName || {}; TEMP.byName = {};
  TEMP.city.forEach(function (c) { var k = 'c' + c.n + c.E; if (old[k]) c.lbl = old[k].lbl; TEMP.byName[k] = c; lab(c, 'temp', dec(c.t) + '°'); });
  TEMP.st.forEach(function (c) { var k = 's' + c.id; if (old[k]) c.lbl = old[k].lbl; TEMP.byName[k] = c; lab(c, 'tempst', c.n.replace(/,.*$/, '') + ' ' + dec(c.t) + '°'); });
  Object.keys(old).forEach(function (k) { if (!TEMP.byName[k] && old[k].lbl) { old[k].lbl.el.remove(); LBL.splice(LBL.indexOf(old[k].lbl), 1); added = true; } });
  if (added) LBL_ORDER = LBL.slice().sort(function (a, b) { return PRIO[a.kind] - PRIO[b.kind] || a.n - b.n; });
}
function showTempPop(c, kind) {
  var it = { type: 'temp', E: c.E, N: c.N }, h = '<button class="x" type="button" aria-label="Schliessen">×</button>';
  h += '<h4 id="popTitle">' + esc(kind === 'temp' ? c.n : 'Station ' + c.n) + '</h4><p class="sub">' + (kind === 'temp' ? 'Lufttemperatur, Sensor der Stadt Zug' : 'Lufttemperatur 2 m über Boden, MeteoSchweiz' + (c.z ? ', ' + swiss(c.z) + ' m ü. M.' : '')) + '</p>';
  h += '<div class="big"><b style="color:' + tempCSS(c.t) + ';text-shadow:0 0 1px rgba(0,0,0,.25)">' + dec(c.t) + '</b><span>°C</span></div>';
  var t = kind === 'temp' ? TEMP.updated : c.ts;
  if (t) h += '<p class="note">' + (kind === 'temp' ? 'Abgerufen ' : 'Messung ') + esc(fmtHM.format(new Date(t))) + ' Uhr. ' + (kind === 'temp' ? 'Die Sensoren senden etwa alle 20 Minuten.' : 'Zehnminutenwert.') + '</p>';
  h += '<p class="note">Quelle: ' + (kind === 'temp' ? '<a href="https://opendata.swiss/de/dataset/lufttemperaturen-stadt-zug" target="_blank" rel="noopener">Stadt Zug, Lufttemperaturen</a>' : '<a href="https://www.meteoschweiz.admin.ch/" target="_blank" rel="noopener">MeteoSchweiz</a>') + '</p>';
  POP.it = it; POP.el.innerHTML = h; POP.el.classList.add('on'); POP.placed = false;
  POP.el.querySelector('.x').addEventListener('click', hidePark);
}
var legEl = $('#tLegend');
function updLegend() {
  if (!legEl) return;
  legEl.hidden = !tempOn;
  if (!tempOn) return;
  if (TEMP.state === 'error' && !TEMP.city.length && !TEMP.st.length) { legEl.innerHTML = '<b>Lufttemperatur</b><span class="src">Die Messwerte konnten nicht geladen werden.</span>'; return; }
  if (!TEMP.at) { legEl.innerHTML = '<b>Lufttemperatur</b><span class="src">Messwerte werden geladen …</span>'; return; }
  var grad = 'linear-gradient(90deg,' + RAMP.map(function (c, i) { return 'rgb(' + c.join(',') + ') ' + Math.round(i / (RAMP.length - 1) * 100) + '%'; }).join(',') + ')';
  legEl.innerHTML = '<b>Lufttemperatur jetzt</b><span class="bar" style="background:' + grad + '"></span><span class="sc"><span>' + TEMP.lo + ' °C</span><span>' + TEMP.hi + ' °C</span></span>' +
    '<span class="src">Stand ' + esc(fmtHM.format(new Date(TEMP.updated || Date.now()))) + ' · ' + TEMP.city.length + ' Sensoren Stadt Zug, MeteoSchweiz</span>';
}
/* Temperaturen in der Detailansicht: nächster Sensor (bis 450 m), sonst nächste MeteoSchweiz-Station; Wasser an Badestellen am See */
function lakeOf(p) {
  if (!(p.type === 'fam' && p.cat === 1) || /hallen/i.test(p.kind || '')) return null;
  var sh = D.lines.shore || [], best = 1e9, bi = -1;
  for (var r = 0; r < sh.length; r++) for (var i = 0; i < sh[r].length; i += 2) {
    var dd = Math.hypot(sh[r][i] + G.E0 - p.E, sh[r][i + 1] + G.N0 - p.N); if (dd < best) { best = dd; bi = r; }
  }
  if (best > 250 || bi < 0) return null;
  var e = sh[bi][0] + G.E0;
  return e > 2685500 && sh[bi][1] + G.N0 < 1223500 ? 'aegerisee' : 'zugersee';
}
function fillWx(it) {
  var box = $('#wxBox'); if (!box || !it || !it.E || it.type === 'event' || it.type === 'gem') return;
  var lk = lakeOf(it);
  Promise.all([loadTemp(), lk ? loadLake() : null]).then(function () {
    box = $('#wxBox'); if (!box || (SEL !== it && selGem !== it)) return;
    var h = '', bc = null, bd = 1e9;
    TEMP.city.forEach(function (c) { var dd = Math.hypot(c.E - it.E, c.N - it.N); if (dd < bd) { bd = dd; bc = c; } });
    if (bc && bd <= 450) h += '<div><dt>Luft jetzt</dt><dd>' + degC(bc.t) + '</dd><small>Sensor ' + esc(bc.n) + ', ' + swiss(Math.round(bd / 10) * 10) + ' m · Stadt Zug</small></div>';
    else {
      var bs = null, bsd = 1e9, z = it.z || hAt(it.E, it.N);
      TEMP.st.forEach(function (s) { var dd = Math.hypot(s.E - it.E, s.N - it.N); if (dd < bsd && (!s.z || Math.abs(s.z - z) < 250)) { bsd = dd; bs = s; } });
      if (bs && bsd < 9000) h += '<div><dt>Luft jetzt</dt><dd>' + degC(bs.t) + '</dd><small>Station ' + esc(bs.n) + ', ' + dec(bsd / 1000) + ' km · MeteoSchweiz</small></div>';
    }
    var L = lk && TEMP.lakes.filter(function (x) { return x.id === lk; })[0];
    if (L) h += '<div><dt>Wasser, Modellwert</dt><dd>ca. ' + Math.round(L.t) + ' °C</dd><small>' + esc(L.n) + ' an der Oberfläche · Alplakes, Eawag</small></div>';
    box.innerHTML = h; box.hidden = !h;
  });
}
$('#tTemp').addEventListener('click', function () {
  lastInteract = performance.now(); if (MODE === 'home' && !tempOn) go('gemeinden');
  tempOn = !tempOn; this.setAttribute('aria-pressed', String(tempOn));
  clearInterval(tempTimer);
  if (tempOn) {
    updLegend(); loadTemp(); tempTimer = setInterval(function () { loadTemp(true); }, 10 * 60e3);
    if (cam && cam.d > 9000) flyTo({ E: 2681900, N: 1224600, d: 5200, hd: ex.hd, p: 46 });
  } else { updLegend(); if (POP.it && POP.it.type === 'temp') hidePark(); }
});

/* ---------------- tour over the canton ---------------- */
var TOUR = [
  { key: 'kanton', kick: 'Der Kanton', title: 'Elf Gemeinden auf 239 km²', text: 'Vom Zugersee auf 414 m ü. M. bis zum Wildspitz auf 1580 m. Die blauen Linien zeigen die Grenzen von Kanton und Gemeinden, Stand 2026.', hi: [] },
  { key: 'zug', kick: 'Stadt Zug', title: 'Die Stadt am See', text: 'Altstadt, Zytturm und Seeufer liegen auf wenigen hundert Metern. Hinter der Stadt steigt der Zugerberg auf 1039 m an, und das Gemeindegebiet reicht bis an den Wildspitz.', hi: ['Zug'] },
  { key: 'lorze', kick: 'Baar · Steinhausen · Cham · Hünenberg · Risch', title: 'Der Weg der Lorze', text: 'Die Lorze verlässt den Ägerisee bei Unterägeri, fliesst durch das Lorzentobel und erreicht bei Baar die Ebene. Sie mündet in den Zugersee, tritt bei Cham wieder aus und fliesst an der nördlichen Kantonsgrenze in die Reuss.', hi: ['Baar', 'Steinhausen', 'Cham', 'Hünenberg', 'Risch'] },
  { key: 'aegeri', kick: 'Unterägeri · Oberägeri', title: 'Das Ägerital', text: 'Der Ägerisee liegt auf 724 m ü. M., rund 310 m über dem Zugersee. Seine tiefste Stelle liegt mehr als 80 m unter dem Wasserspiegel. Am Südende erinnert das Denkmal bei Morgarten an die Schlacht von 1315.', hi: ['Unterägeri', 'Oberägeri'] },
  { key: 'berg', kick: 'Menzingen · Neuheim', title: 'Hügelland über dem Tobel', text: 'Nördlich und östlich des Lorzentobels steigt das Land zu einem welligen Plateau an. Neuheim liegt zwischen 482 und 766 m, Menzingen reicht bis an den Gottschalkenberg.', hi: ['Menzingen', 'Neuheim'] },
  { key: 'walchwil', kick: 'Walchwil · Wildspitz', title: 'Am Hang des Rossbergs', text: 'Walchwil liegt am Ostufer des Zugersees und reicht bis auf 1248 m. Darüber erreicht der Kanton am Wildspitz seinen höchsten Punkt, direkt an der Grenze zum Kanton Schwyz.', hi: ['Walchwil'] }
];
var tourI = 0, tourT0 = 0, TOUR_DUR = 10000, lorzeStart = 0, lorzeDrawn = 0, tourPaused = false;
function startTour() {
  lorzeDrawn = 0; lorzeStart = 0; tourLast = 0;
  touring = true; panel.inert = true; document.body.classList.add('touring'); capEl.hidden = false; markerVisDirty = true;
  tourGo(0);
}
function tourGo(i) {
  tourI = clamp(i, 0, TOUR.length - 1); var s = TOUR[tourI];
  flyTo(fit(KEYS[s.key]));
  $('#capKick').textContent = s.kick; $('#capTitle').textContent = s.title; $('#capText').textContent = s.text;
  $('#capStep').textContent = (tourI + 1) + ' / ' + TOUR.length;
  $('#capPrev').disabled = tourI === 0; $('#capNext').textContent = tourI === TOUR.length - 1 ? 'Ende' : 'Weiter';
  tourT0 = performance.now();
  if (s.key === 'lorze') { lorzeStart = performance.now(); lorzeDrawn = 0; }
}
var tourLast = 0;
function stepTour(now) {
  if (!touring) return;
  if (tourPaused && tourLast) tourT0 += now - tourLast;
  tourLast = now;
  var u = clamp((now - tourT0) / TOUR_DUR, 0, 1);
  $('#capBar').style.width = (u * 100).toFixed(1) + '%';
  if (u >= 1 && !tourPaused) { if (tourI < TOUR.length - 1) tourGo(tourI + 1); else stopTour(); }
}
function stopTour(silent) {
  if (!touring) return;
  touring = false; document.body.classList.remove('touring'); capEl.hidden = true; markerVisDirty = true; panel.inert = MODE === 'home';
  if (!silent) flyContext();
}
$('#tourBtn').addEventListener('click', startTour);
$('#capPrev').addEventListener('click', function () { tourGo(tourI - 1); });
$('#capNext').addEventListener('click', function () { if (tourI < TOUR.length - 1) tourGo(tourI + 1); else stopTour(); });
$('#capStop').addEventListener('click', function () { stopTour(); });
capEl.addEventListener('pointerenter', function () { tourPaused = true; });
capEl.addEventListener('pointerleave', function () { tourPaused = false; });

/* ---------------- frame loop ---------------- */
var skyEl = $('#sky'), HUDtick = 0, tReady = 0, last = performance.now(), north = $('#north'), ready = false, hiCur = new Array(12).fill(0), cur = { focus: 0.6, cont: 0.45, muni: 0.35 };
var tmpV = new THREE.Vector3(), markerAlpha = 0, lastListUpd = 0, lastDetailUpd = 0;
var prCap = dpr0, frameTimes = [], prLowered = false;
function applyPR(W, H) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, prCap, Math.sqrt(3.4e6 / (W * H)))); }
function resize() {
  var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  applyPR(W, H);
  renderer.setSize(W, H, false);
  LBL.forEach(function (L) { L.bw = 0; });
}
window.addEventListener('resize', resize);
window.addEventListener('load', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

function frame(now) {
  var rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now;
  if (!TEST && !prLowered && ready && rawDt > 0 && rawDt < 0.5) { frameTimes.push(rawDt); if (frameTimes.length > 90) { frameTimes.shift(); var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length; if (avg > 0.034) { prLowered = true; prCap = Math.max(1, prCap * 0.7); resize(); } } }
  var W = window.innerWidth, H = canvas.clientHeight || window.innerHeight;
  if (!reduce) U.uTime.value = now / 1000;
  stepFlight(now); stepTour(now);
  if (playing) { var nt = sunT + (now - playLast) / 1000 * 1.1; playLast = now; if (nt > 21) nt = 7; setSunT(nt, 'play'); }
  if (MODE === 'home' && !touring && !drag.mode && !flight && now - lastInteract > 2500 && !reduce && !TEST) ex.hd += dt * 2.4;
  // gewählter Ort: Karte dreht sich langsam um ihn, bis jemand die Karte bewegt
  else if (SEL && SEL.E && (SEL.type !== 'event' || SEL.exact) && !touring && !drag.mode && !flight && ex.d < 6000 && now - Math.max(lastInteract, flightEnd) > 1800 && !reduce && !TEST) ex.hd += dt * 4;
  var off = viewOffsets(W, H);
  if (!cam) {
    cam = { E: ex.E, N: ex.N, d: ex.d, hd: ex.hd, p: ex.p, ox: off.ox, oy: off.oy };
    if (!reduce && !TEST) { cam.d *= 1.45; cam.hd -= 28; cam.p += 14; }
  }
  var cdt = Math.min(0.25, Math.max(0, rawDt)), kf = (TEST || drag.mode) ? 1 : 1 - Math.exp(-cdt * (flight ? 14 : 6)), ko = TEST ? 1 : 1 - Math.exp(-cdt * 6);
  cam.E = lerp(cam.E, ex.E, kf); cam.N = lerp(cam.N, ex.N, kf);
  cam.d = Math.exp(lerp(Math.log(cam.d), Math.log(ex.d), kf));
  cam.hd = angLerp(cam.hd, ex.hd, kf); cam.p = lerp(cam.p, ex.p, kf); cam.ox = lerp(cam.ox, off.ox, ko); cam.oy = lerp(cam.oy, off.oy, ko);
  vz = lerp(1.0, VZ, sstep(1800, 7500, cam.d));
  U.uVZ.value = vz; U.uBZ.value = vz;
  placeCamera(cam, W, H);
  U.uSunMix.value = sstep(9500, 4300, cam.d);
  treeMat.uniforms.uTreeGrow.value = sstep(3300, 1900, cam.d);
  // close-up: sky above the horizon and haze in the distance instead of the paper colour
  var hz = U.uSunMix.value;
  U.uFog.value.copy(C['--paper']).lerp(C['--m-haze'], hz * 0.9);
  var so = (hz * (0.35 + 0.65 * sstep(64, 26, cam.p))).toFixed(3); if (skyEl._o !== so) { skyEl._o = so; skyEl.style.opacity = so; }

  var home = MODE === 'home' && !touring;
  var tg = home ? { focus: 0.6, cont: 0.45, muni: 0.35 } : touring ? { focus: 1, cont: 0.85, muni: 0.9 } : { focus: 1, cont: 0.7, muni: MODE === 'gemeinden' ? 1 : 0.75 };
  ['focus', 'cont', 'muni'].forEach(function (k) { cur[k] = lerp(cur[k], tg[k], ko); });
  var hiTarget = new Array(12).fill(0);
  if (touring) TOUR[tourI].hi.forEach(function (n) { hiTarget[MUNI[n].id] = 1; });
  else if (MODE === 'gemeinden' && selGem) hiTarget[selGem.m.id] = 1;
  else if (filt[MODE] && filt[MODE].gem && MUNI[filt[MODE].gem]) hiTarget[MUNI[filt[MODE].gem].id] = 1;
  for (var i = 0; i < 12; i++) hiCur[i] = lerp(hiCur[i], hiTarget[i], ko);
  var TU = terrainMat.uniforms;
  TU.uFocus.value = cur.focus; TU.uContourA.value = cur.cont; TU.uHiv.value = hiCur; TU.uHiAny.value = Math.min(1, Math.max.apply(null, hiCur));
  var intro = (reduce || TEST) ? 1 : sstep(0, 1, (now - tReady) / 2600);
  if (R.canton) R.canton.material.uniforms.uDraw.value = ready ? intro : 0;
  if (R.muni) R.muni.material.uniforms.uOpacity.value = 0.8 * Math.max(cur.muni, 0) * (1 - U.uOrthoMix.value * 0.5);
  var grown = (reduce || TEST) ? 1 : clamp((now - tReady - 800) / 2800, 0, 1);
  bldMat.uniforms.uGrow.value = ready ? grown * 1.2 : 0;
  if (touring && TOUR[tourI].key === 'lorze') lorzeDrawn = clamp((now - lorzeStart - 700) / 3800, 0, 1);
  if (R.lorze) {
    var lo = touring && lorzeDrawn > 0 ? 1 - U.uOrthoMix.value * 0.4 : 0;
    R.lorze.material.uniforms.uDraw.value = lorzeDrawn * 1.001; R.lorze.material.uniforms.uOpacity.value = lerp(R.lorze.material.uniforms.uOpacity.value, lo, ko);
    R.cross.material.uniforms.uOpacity.value = 0.8 * sstep(0.55, 0.65, lorzeDrawn) * (touring ? 1 : 0) * (1 - U.uOrthoMix.value);
  }
  if (R.shore) R.shore.material.uniforms.uOpacity.value = 0.65 * (1 - U.uOrthoMix.value * 0.92);

  markerAlpha = lerp(markerAlpha, ready && !touring && MODE !== 'home' ? 1 : 0, TEST ? 1 : 1 - Math.exp(-dt * 6));
  updateMarkers(markerAlpha);

  updateTrees();
  updateOrtho(now);
  updateSb3(now);
  U.uHeatOn.value += ((tempOn && TEMP.city.length ? 1 : 0) - U.uHeatOn.value) * Math.min(1, dt * 4);
  updateShadow(now);

  if (listDirty && now - lastListUpd > 150) { if (MODE === 'familie') { lastListUpd = now; renderList(); } else listDirty = false; }
  if (SEL && now - lastDetailUpd > 100) { lastDetailUpd = now; updateDetailLive(); }

  // hover
  if (ptr.moved || (ptr.over && HUDtick % 4 === 0)) {
    ptr.moved = false;
    hoverMk = (ready && ptr.over && fine && !drag.mode) ? pickMarker(ptr.cx, ptr.cy, W, H) : null;
    var hit = (!hoverMk && ready && ptr.over && fine && !drag.mode) ? groundAt(ptr.cx, ptr.cy) : null;
    hoverId = hit ? idAt(hit.E, hit.N) : 0;
    TU.uHover.value = hoverId > 0 && !touring ? hoverId : -1;
    if (hoverMk) {
      var hp = hoverMk;
      if (hp.type === 'fam') {
        tipT.textContent = hp.title; tipA.textContent = famSub(hp);
        var hs = shadeAt(hp, sunT);
        tipB.textContent = hs != null ? 'Schatten am 21. Juli um ' + fmtTime(sunT) + ' Uhr: ' + Math.round(hs * 100) + ' %' : (hp.zt ? 'Tipp von Zug Tourismus' : CATS[hp.cat].t);
      } else if (hp.type === 'sight') { tipT.textContent = hp.title; tipA.textContent = hp.kind; tipB.textContent = hp.gem; }
      else if (hp.type === 'park') { tipT.textContent = 'Parkhaus ' + hp.title; tipA.textContent = hp.open ? plural(hp.free, 'freier Platz', 'freie Plätze') : 'geschlossen'; tipB.textContent = hp.address; }
      else if (hp.type === 'event') { var o = nextOcc(hp, Date.now()); tipT.textContent = hp.title; tipA.textContent = o ? occText(o) : ''; tipB.textContent = [hp.venue, hp.gem].filter(Boolean).join(' · '); }
      else { tipT.textContent = hp.type === 'w' ? 'Trinkbrunnen' : 'WC'; tipA.textContent = hp.wick ? 'mit Wickeltisch' : ''; tipB.textContent = ''; }
      document.body.style.cursor = 'pointer';
    } else if (hit && hoverId > 0) {
      var m = D.munis[hoverId - 1];
      tipT.textContent = m.name;
      tipA.textContent = dec(m.ha / 100) + ' km² · ' + m.hmin + '–' + m.hmax + ' m';
      tipB.textContent = 'Hier ' + Math.round(hit.h) + ' m · ' + swiss(hit.E) + ' / ' + swiss(hit.N);
      document.body.style.cursor = 'pointer';
    }
    if (hoverMk || (hit && hoverId > 0)) {
      var tx = ptr.cx + 18, ty = ptr.cy + 18;
      if (tx > W - 290) tx = ptr.cx - 290; if (ty > window.innerHeight - 100) ty = ptr.cy - 100;
      tip.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
      tip.classList.add('on');
    } else { tip.classList.remove('on'); if (!drag.mode) document.body.style.cursor = ''; }
  }

  placePop(W, H);

  // callout for the selected item
  if (SEL && SEL.E && (SEL.type !== 'event' || SEL.exact)) {
    tmpV.set(X(SEL.E), Y(hAt(SEL.E, SEL.N)), Z(SEL.N)).project(camera);
    if (tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1) {
      var csz = MK.mat ? MK.mat.uniforms.uSize.value * 1.45 : 30;
      calloutEl.style.transform = 'translate3d(' + ((tmpV.x + 1) / 2 * W + csz * 0.6).toFixed(1) + 'px,' + ((1 - tmpV.y) / 2 * H - csz * 1.25).toFixed(1) + 'px,0) translateY(-50%)';
      if (calloutEl._p !== SEL) { calloutEl._p = SEL; calloutEl.innerHTML = esc(SEL.title) + '<small>' + esc(itemSub(SEL)) + '</small>'; }
      calloutEl.classList.add('on');
    } else calloutEl.classList.remove('on');
  } else calloutEl.classList.remove('on');

  // labels
  var placed = [], labelFade = 1 - sstep(2600, 1500, cam.d) * 0.85;
  for (i = 0; i < LBL.length; i++) {
    var L = LBL[i], want_o = ready ? labelWant(L) : 0;
    if (L.kind !== 'muni' && L.kind !== 'park' && L.kind !== 'temp' && L.kind !== 'tempst') want_o *= labelFade;
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
    if (L.kind === 'park') { var msz = MK.mat ? MK.mat.uniforms.uSize.value : 20; L.sx += msz * 0.62; L.sy -= msz * 0.62; }
  }
  var fa = freeArea(W, H);
  for (i = 0; i < LBL_ORDER.length; i++) {
    L = LBL_ORDER[i];
    if (L.want > 0.01 && (L.sx < fa.x0 + 10 || L.sy < fa.y0 + 6 || L.sy > fa.y1 - 6)) L.want = 0;
    if (L.want > 0.01) {
      if (!L.bw) { L.el.style.opacity = '0'; L.el.style.transform = 'translate3d(-9999px,0,0)'; L.bw = L.el.offsetWidth; L.bh = L.el.offsetHeight; }
      var left = L.kind === 'park' ? L.sx : (L.kind === 'peak' || L.kind === 'poi') ? L.sx - 5 : L.sx - L.bw / 2, tries = L.kind === 'muni' ? [0, -15, 15] : [0], ok = false;
      for (var tr = 0; tr < tries.length && !ok; tr++) {
        var top = L.sy - L.bh / 2 + tries[tr], hitL = false;
        for (var q = 0; q < placed.length; q++) { var P = placed[q]; if (left < P[2] + 6 && left + L.bw + 6 > P[0] && top < P[3] + 2 && top + L.bh + 2 > P[1]) { hitL = true; break; } }
        if (!hitL) { ok = true; L.dy = lerp(L.dy || 0, tries[tr], TEST ? 1 : 1 - Math.exp(-dt * 8)); placed.push([left, top, left + L.bw, top + L.bh]); }
      }
      if (!ok) L.want = 0;
    }
    L.o = TEST ? L.want : lerp(L.o, L.want, 1 - Math.exp(-dt * 6));
    if (L.o < 0.01) { if (L.w !== 0) { L.el.style.opacity = '0'; L.w = 0; if (L.act) { L.act = false; L.el.style.pointerEvents = 'none'; L.el.tabIndex = -1; } } continue; }
    var offs = L.kind === 'park' ? 'translate(0,-50%)' : (L.kind === 'peak' || L.kind === 'poi') ? 'translate(-5px,-50%)' : 'translate(-50%,-50%)';
    L.el.style.transform = 'translate3d(' + L.sx.toFixed(1) + 'px,' + (L.sy + (L.dy || 0)).toFixed(1) + 'px,0) ' + offs;
    L.el.style.opacity = L.o.toFixed(3); L.w = 1;
    if (L.kind === 'park' || L.kind === 'temp' || L.kind === 'tempst') { var act = L.o > 0.5; if (L.act !== act) { L.act = act; L.el.style.pointerEvents = act ? '' : 'none'; L.el.tabIndex = act ? 0 : -1; } }
  }

  // HUD
  HUDtick++;
  if (ready && HUDtick % 4 === 0) {
    var hh = hAt(cam.E, cam.N), id = idAt(cam.E, cam.N);
    hudA.textContent = swiss(cam.E) + ' / ' + swiss(cam.N);
    hudB.textContent = (id ? D.munis[id - 1].name + ' · ' : '') + Math.round(hh) + ' m ü. M.' + (U.uSunMix.value > 0.5 ? ' · ' + fmtTime(sunT) + ' Uhr, ' + dayLabel(sunDay) : '');
  }
  north.style.transform = 'rotate(' + (-cam.hd).toFixed(1) + 'deg)';

  renderer.render(scene, camera);
  if (!TEST) requestAnimationFrame(frame);
}
if (/[?&]debug\b/.test(location.search)) window.__zgFly = function (o) { flyTo(o); };
if (/[?&]debug\b/.test(location.search)) window.__zgState = function () { return { ex: Object.assign({}, ex), cam: cam && Object.assign({}, cam), flight: flight && flight.to, mode: MODE, sel: SEL && [SEL.id, SEL.E, SEL.N] }; };
if (TEST) {
  window.__frame = function () { frame(performance.now()); return true; }; window.__R = R;
  window.__api = { setSun: function (t) { setSunT(t, 'ui'); }, setDay: setSunDay, go: go, places: PL, sights: SIGHTS, events: function () { return EVENTS; },
    state: function () { return { mode: MODE, sel: SEL && SEL.id, gem: selGem && selGem.id, d: cam && cam.d, E: cam && cam.E, N: cam && cam.N, vz: vz, sunMix: U.uSunMix.value, ortho: U.uOrthoMix.value, shadowOn: U.uShadowOn.value, smFrames: smState.frames, trees: treeGeo.instanceCount, markers: MK.items.length, visible: MK.geo ? Array.prototype.reduce.call(MK.geo.attributes.aVis.array, function (a, b) { return a + b; }, 0) : 0 }; },
    fly: function (o) { flyTo(o); }, ex: ex, tour: startTour };
}

/* ---------------- boot ---------------- */
function uiOnly() { GL = false; window.addEventListener('hashchange', applyRoute); setSheet('half'); applyRoute(); loadEvents(); }
readTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
window.addEventListener('hashchange', applyRoute);
narrowMQ.addEventListener('change', function () { if (narrowMQ.matches) setSheet(sheet); });
setSheet('half');
applyRoute();
loadEvents();
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
    refineEventGem();

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
      var secs = ['kanton']; TOUR.forEach(function (t) { if (t.hi.indexOf(m.name) >= 0) secs.push(t.key); });
      addLabel(m.name, 'muni', m.at[0], m.at[1], secs, m.sub);
    });
    D.labels.forEach(function (l) { addLabel(l.t, l.k, l.at[0], l.at[1], l.s, null, l.h); });
    LBL_ORDER = LBL.slice().sort(function (a, b) { return PRIO[a.kind] - PRIO[b.kind] || a.n - b.n; });
    ready = true; tReady = performance.now();
    buildMarkers();
    ensureParkLabels();
    readTheme();

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
    try { buildStrandbad(); } catch (e) { console.warn('Strandbad', e); }
  } catch (err) {
    console.error(err);
    fail('Das Relief konnte nicht aufgebaut werden. Listen und Texte bleiben nutzbar.');
  }
})();
})();
