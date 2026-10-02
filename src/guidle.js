/* Live events from the Zug Tourismus calendar (Guidle microsite mr_AKHbXU).
   One file for both sides: the Cloudflare Worker imports it (worker/index.js, endpoint /api/events and /api/event),
   the page inlines it and uses it as a fallback when the Worker endpoint is not reachable (e.g. a local static server).
   Guidle answers with Access-Control-Allow-Origin: * and caches for 15 minutes. */
(function (root) {
  'use strict';
  var BASE = 'https://microsite.guidle.com/api/rest/2.0/portals';
  var PAGE = 1172134252, PORTAL = 1127597573, SECTION = 1096, CRID = 'AKHbXU';
  var Q = 'portalName=microsite&pageOfferId=' + PAGE + '&sectionId=' + SECTION + '&micrositeCrId=' + CRID + '&language=de';
  var IMG = 'https://ik.imagekit.io/guidle/';
  var ZT_LINK = 'https://www.zug-tourismus.ch/de/event-calendar/?eventId=';
  var HORIZON_DAYS = 35, MAX_DATE_PAGES = 14, MAX_PAGES = 30;

  /* towns and hamlets as Guidle writes them -> political Gemeinde */
  var TOWN = {
    'zug': 'Zug', 'oberwil b. zug': 'Zug', 'oberwil': 'Zug', 'baar': 'Baar', 'allenwinden': 'Baar', 'sihlbrugg': 'Baar', 'inwil': 'Baar',
    'cham': 'Cham', 'hagendorn': 'Cham', 'friesencham': 'Cham', 'niederwil': 'Cham', 'hünenberg': 'Hünenberg', 'hünenberg see': 'Hünenberg', 'drälikon': 'Hünenberg',
    'menzingen': 'Menzingen', 'edlibach': 'Menzingen', 'finstersee': 'Menzingen', 'neuheim': 'Neuheim', 'hinterburg': 'Neuheim',
    'oberägeri': 'Oberägeri', 'alosen': 'Oberägeri', 'morgarten': 'Oberägeri', 'unterägeri': 'Unterägeri',
    'risch': 'Risch', 'rotkreuz': 'Risch', 'holzhäusern zg': 'Risch', 'holzhäusern': 'Risch', 'buonas': 'Risch', 'berchtwil': 'Risch',
    'steinhausen': 'Steinhausen', 'walchwil': 'Walchwil'
  };
  function gemeinde(town) { return TOWN[String(town || '').trim().toLowerCase()] || ''; }

  /* WGS84 -> LV95, swisstopo approximation (about 1 m) */
  function toLV95(lat, lng) {
    var p = (lat * 3600 - 169028.66) / 10000, l = (lng * 3600 - 26782.5) / 10000;
    var E = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l * l * l;
    var N = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p * p * p;
    return [Math.round(E), Math.round(N)];
  }

  /* Swiss local time -> ISO string with offset */
  function lastSunday(y, m) { var d = new Date(Date.UTC(y, m + 1, 0)); return d.getUTCDate() - d.getUTCDay(); }
  function offset(y, m, d, h) {
    if (m > 2 && m < 9) return 2; if (m < 2 || m > 9) return 1;
    var ls = lastSunday(y, m);
    if (m === 2) return d > ls || (d === ls && h >= 2) ? 2 : 1;
    return d < ls || (d === ls && h < 3) ? 2 : 1;
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d, hh, mm) {
    if (hh == null) return y + '-' + p2(m + 1) + '-' + p2(d);
    var o = offset(y, m, d, hh);
    return y + '-' + p2(m + 1) + '-' + p2(d) + 'T' + p2(hh) + ':' + p2(mm) + ':00+0' + o + ':00';
  }
  function ymd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? [+m[1], +m[2] - 1, +m[3]] : null; }
  var WD = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0 };

  /* "2.10.2026 18:00 - 22:00 Uhr | 3.10.2026 20:00 Uhr", "21.10.2026 - 25.10.2026 14:00 - 15:30 Uhr",
     "bis 27.12.2026 jeweils So 11:00 - 15:00 Uhr", " jeweils Do 18:00 - 20:00 Uhr", "17:30 Uhr" */
  function parseSchedule(sched, first) {
    var out = [], f = ymd(first);
    String(sched || '').split('|').forEach(function (part) {
      part = part.trim(); if (!part) return;
      var t = /(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/.exec(part.replace(/\d{1,2}\.\d{1,2}\.\d{4}/g, ''));
      var h0 = t ? +t[1] : null, m0 = t ? +t[2] : 0, h1 = t && t[3] ? +t[3] : null, m1 = t && t[4] ? +t[4] : 0;
      var rg = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(part);
      var jw = /jeweils\s+([A-Za-z]{2}(?:\s*[,\/und]+\s*[A-Za-z]{2})*)/i.exec(part);
      var bis = /bis\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i.exec(part);
      if (jw && f) {
        var days = jw[1].toLowerCase().match(/[a-z]{2}/g).map(function (x) { return WD[x]; }).filter(function (x) { return x != null; });
        var end = bis ? Date.UTC(+bis[3], +bis[2] - 1, +bis[1]) : Date.UTC(f[0], f[1], f[2]) + 84 * 864e5;
        for (var t0 = Date.UTC(f[0], f[1], f[2]), k = 0; t0 <= end && k < 120; t0 += 864e5) {
          var dt = new Date(t0); if (days.indexOf(dt.getUTCDay()) < 0) continue; k++;
          var Y = dt.getUTCFullYear(), M = dt.getUTCMonth(), Dd = dt.getUTCDate();
          out.push({ s: iso(Y, M, Dd, h0, m0), e: h1 != null ? iso(Y, M, Dd, h1, m1) : null });
        }
        return;
      }
      if (rg) {
        out.push({ s: iso(+rg[3], +rg[2] - 1, +rg[1], h0, m0), e: iso(+rg[6], +rg[5] - 1, +rg[4], h1 != null ? h1 : null, m1) });
        return;
      }
      var dm = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(part);
      if (dm) { out.push({ s: iso(+dm[3], +dm[2] - 1, +dm[1], h0, m0), e: h1 != null ? iso(+dm[3], +dm[2] - 1, +dm[1], h1, m1) : null }); return; }
      if (f) out.push({ s: iso(f[0], f[1], f[2], h0, m0), e: h1 != null ? iso(f[0], f[1], f[2], h1, m1) : null });
    });
    if (!out.length && f) out.push({ s: iso(f[0], f[1], f[2]), e: null });
    return out;
  }
  var MON = { januar: 0, februar: 1, 'märz': 2, april: 3, mai: 4, juni: 5, juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11 };
  function groupDate(label) {
    var m = /(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})/.exec(label || ''); if (!m) return null;
    var mo = MON[m[2].toLowerCase()]; return mo == null ? null : [+m[3], mo, +m[1]];
  }

  function img(uri, tr) { return uri ? IMG + 'tr:' + tr + uri : ''; }
  function firstTown(o) { return o.city || String(o.textLine2 || '').split(' - ')[0]; }
  function venueOf(o) { var t = String(o.textLine2 || ''), i = t.indexOf(' - '); return i >= 0 ? t.slice(i + 3).trim() : ''; }
  function baseEvent(o) {
    var town = firstTown(o), lat = parseFloat(o.lat), lng = parseFloat(o.lng), en = isFinite(lat) && isFinite(lng) && lat > 45 && lat < 48.5 ? toLV95(lat, lng) : null;
    var cats = String(o.category || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return {
      id: String(o.id), gid: o.generatedId || '', title: String(o.title || '').trim(), cat: cats[0] || '', cats: cats,
      town: town, gem: gemeinde(town), venue: venueOf(o), E: en ? en[0] : null, N: en ? en[1] : null,
      img: img(o.imageUri, 'w-800'), thumb: img(o.imageUri, 'w-160,h-120,fo-auto'),
      url: o.generatedId ? ZT_LINK + encodeURIComponent(o.generatedId) : (o.url || ''), guidle: o.url || '',
      first: o.firstShow || '', dates: parseSchedule(o.schedule, o.firstShow)
    };
  }

  function getJSON(fetchFn, url) {
    return fetchFn(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('Guidle ' + r.status); return r.json(); });
  }
  function offersOf(page) { var out = []; (page.groups || []).forEach(function (g) { (g.offers || []).forEach(function (o) { o._group = g.label; out.push(o); }); }); return out; }
  function pool(tasks, n) {
    var res = new Array(tasks.length), i = 0;
    function next() { if (i >= tasks.length) return Promise.resolve(); var k = i++; return tasks[k]().then(function (v) { res[k] = v; }, function () { res[k] = null; }).then(next); }
    var w = []; for (var j = 0; j < Math.min(n, tasks.length); j++) w.push(next());
    return Promise.all(w).then(function () { return res; });
  }

  /* all offers once (grouped by town), plus the date listing for the next weeks to get every occurrence */
  function fetchAll(fetchFn, opts) {
    fetchFn = fetchFn || root.fetch.bind(root); opts = opts || {};
    var now = opts.now || Date.now(), horizon = now + HORIZON_DAYS * 864e5;
    return getJSON(fetchFn, BASE + '/offers-count/' + PAGE + '/' + PORTAL + '/' + SECTION + '?' + Q + '&group=city').then(function (c) {
      var pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil((c.count || 0) / 50)));
      var tasks = []; for (var p = 1; p <= pages; p++) (function (p) { tasks.push(function () { return getJSON(fetchFn, BASE + '/search-offers/' + PORTAL + '?' + Q + '&group=city&currentPageNumber=' + p); }); })(p);
      return pool(tasks, 4);
    }).then(function (cityPages) {
      var byId = {}, order = [];
      cityPages.forEach(function (pg) { if (pg) offersOf(pg).forEach(function (o) { if (o.advertisementOffer) return; var id = String(o.id); if (!byId[id]) { byId[id] = baseEvent(o); order.push(id); } }); });
      /* date listing: sequential pages until the horizon */
      var extra = {};
      function datePage(p) {
        if (p > MAX_DATE_PAGES) return Promise.resolve();
        return getJSON(fetchFn, BASE + '/search-offers/' + PORTAL + '?' + Q + '&currentPageNumber=' + p).then(function (pg) {
          var lastT = 0;
          offersOf(pg).forEach(function (o) {
            var d = groupDate(o._group); if (!d) return;
            var t = Date.UTC(d[0], d[1], d[2]); lastT = Math.max(lastT, t);
            var id = String(o.id);
            if (!byId[id]) { byId[id] = baseEvent(o); byId[id].dates = []; order.push(id); }
            var tm = /(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/.exec(String(o.schedule || '').replace(/\d{1,2}\.\d{1,2}\.\d{4}/g, ''));
            (extra[id] = extra[id] || []).push({ s: iso(d[0], d[1], d[2], tm ? +tm[1] : null, tm ? +tm[2] : 0), e: tm && tm[3] ? iso(d[0], d[1], d[2], +tm[3], +tm[4]) : null });
          });
          if (pg.moreExists && lastT < horizon) return datePage(p + 1);
        });
      }
      return datePage(1).catch(function () {}).then(function () {
        var events = order.map(function (id) {
          var e = byId[id], seen = {}, all = [];
          (e.dates || []).concat(extra[id] || []).forEach(function (o) { var k = o.s.slice(0, 16); if (!seen[k]) { seen[k] = 1; all.push(o); } });
          all.sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
          e.dates = all;
          return e;
        }).filter(function (e) { return e.title && e.dates.length; });
        return { updated: new Date(now).toISOString(), source: 'Zug Tourismus, Veranstaltungskalender (Guidle)', events: events };
      });
    });
  }

  /* detail of one event from Guidle's iCalendar export (used by the Worker; the export has no CORS header) */
  function icalURL(id) { return 'https://microsite.guidle.com/iCalendar/?id=' + encodeURIComponent(id) + '&lang=de'; }
  function unfold(t) { return String(t).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, ''); }
  function icalText(v) { return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\'); }
  var SECTIONS = ['Kontakt', 'Verfügbarkeit / Datum, Zeit', 'Preis', 'Vorverkauf', 'Veranstalter', 'Weitere Infos', 'Zusatzinformationen', 'Mitwirkende', 'Anmeldung', 'Treffpunkt', 'Barrierefreiheit'];
  function parseICal(text) {
    var t = unfold(text), ev = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/.exec(t); if (!ev) return null;
    var body = ev[1], prop = function (k) { var m = new RegExp('\\n' + k + '(?:;[^:\\n]*)?:([^\\n]*)').exec('\n' + body); return m ? icalText(m[1]) : ''; };
    var desc = prop('DESCRIPTION'), loc = prop('LOCATION');
    var blocks = {}, cur = '_', lines = desc.split('\n');
    lines.forEach(function (l) {
      if (/^\s*(Das Angebot im Detail|Quelle:\s*www\.guidle\.com)/i.test(l)) return;
      var s = l.trim(), h = SECTIONS.filter(function (x) { return s === x || s === x + ':' || s.indexOf(x + ':') === 0; })[0];
      if (h) { cur = h; var rest = s.slice(h.length).replace(/^:\s*/, ''); blocks[cur] = rest ? [rest] : []; return; }
      (blocks[cur] = blocks[cur] || []).push(l);
    });
    function txt(k) { return (blocks[k] || []).join('\n').replace(/\n{3,}/g, '\n\n').trim(); }
    var dates = [];
    (blocks['Verfügbarkeit / Datum, Zeit'] || []).forEach(function (l) { parseSchedule(l.replace(/\s*-\s*$/, ''), null).forEach(function (o) { dates.push(o); }); });
    var teaser = txt('_'), extraT = txt('Zusatzinformationen');
    if (!teaser && extraT) teaser = extraT;
    var tick = (txt('Vorverkauf').match(/https?:\/\/\S+/) || [''])[0];
    return {
      teaser: teaser.length > 900 ? teaser.slice(0, 880).replace(/\s+\S*$/, '') + ' …' : teaser,
      address: loc, price: txt('Preis').split('\n').filter(Boolean).slice(0, 4).join(' · '),
      org: txt('Veranstalter').split('\n')[0] || '', tickets: tick, dates: dates
    };
  }
  /* browser side: detail through the Worker, null when it is not there */
  function detail(e) {
    if (!root.fetch) return Promise.resolve(null);
    return root.fetch('api/event?id=' + encodeURIComponent(e.id), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  /* browser side: Worker first, Guidle directly as fallback */
  function load() {
    return root.fetch('api/events', { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('api ' + r.status); return r.json(); })
      .then(function (d) { if (!d || !d.events) throw new Error('api empty'); return d; })
      .catch(function () { return fetchAll(root.fetch.bind(root)); });
  }

  root.ZGEvents = { fetchAll: fetchAll, parseICal: parseICal, icalURL: icalURL, detail: detail, load: load, parseSchedule: parseSchedule, toLV95: toLV95, gemeinde: gemeinde };
})(typeof globalThis !== 'undefined' ? globalThis : this);
