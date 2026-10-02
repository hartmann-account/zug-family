// Cloudflare Worker: static site from ./public plus two small JSON endpoints that read the
// Zug Tourismus event calendar (Guidle) live. Results are cached for an hour so that
// Guidle sees at most a few requests per hour, however many people open the page.
import '../src/guidle.js';

const G = globalThis.ZGEvents;
const LIST_TTL = 3600, DETAIL_TTL = 3600, PARK_TTL = 60, TEMP_TTL = 600, LAKE_TTL = 10800;
const PLS = 'https://www.pls-zug.ch/?json=true';
// Lufttemperaturen Stadt Zug: rund 300 LoRaWAN-Sensoren auf akenza.io (opendata.swiss, Datensatz «Lufttemperaturen Stadt Zug»)
const AKZ = 'https://api.akenza.io/v3', AKZ_WS = '298b3c157fffda2c';
// MeteoSchweiz: 10-Minuten-Werte aller SwissMetNet-Stationen als GeoJSON in LV95
const MCH = 'https://data.geo.admin.ch/ch.meteoschweiz.messwerte-lufttemperatur-10min/ch.meteoschweiz.messwerte-lufttemperatur-10min_de.json';
// Alplakes (Eawag): Oberflächentemperatur aus dem 3D-Seemodell, ein Punkt je See
const LAKES = [
  { id: 'zugersee', n: 'Zugersee', url: 'https://alplakes-api.eawag.ch/simulations/point/mitgcm/zug/{s}/{e}/0.25/47.16/8.50?variables=temperature' },
  { id: 'aegerisee', n: 'Ägerisee', url: 'https://alplakes-api.eawag.ch/simulations/point/delft3d-flow/ageri/{s}/{e}/0.14/47.125/8.62?variables=temperature' }
];

const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
// Parkleitsystem Zug: free spaces per garage, coordinates in WGS84 -> LV95 for the map
function parking(d) {
  const list = (d && d.content) || [];
  let last = 0;
  const garages = list.map((g) => {
    last = Math.max(last, +g.last_modified || 0);
    const lat = parseFloat(g.latitude), lng = parseFloat(g.longitude), en = isFinite(lat) && isFinite(lng) ? G.toLV95(lat, lng) : null;
    return {
      id: g.id, name: String(g.name || '').trim(), address: [g.address, [g.plz, g.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      free: Math.max(0, parseInt(g.free, 10) || 0), open: /offen/i.test(g.state || ''), state: g.state || '',
      lat, lng, E: en ? en[0] : null, N: en ? en[1] : null,
      prices: (g.prices || []).slice(0, 12).map((p) => [strip(p[0]), strip(p[1]), strip(p[2])]),
      hours: strip(g.opening_hours), info: strip(g.additional)
    };
  });
  return { updated: new Date(last ? last * 1000 : Date.now()).toISOString(), source: 'Parkleitsystem Zug', garages };
}
const round1 = (x) => Math.round(x * 10) / 10;
let sensorList = null;
async function citySensors(key) {
  if (sensorList && Date.now() - sensorList.t < 12 * 3600e3) return sensorList.list;
  const r = await fetch(`${AKZ}/assets?workspaceId=${AKZ_WS}&size=500`, { headers: { 'x-api-key': key, Accept: 'application/json', 'User-Agent': ua.headers['User-Agent'] } });
  if (!r.ok) throw new Error('akenza assets ' + r.status);
  const d = await r.json();
  const list = (d.content || []).map((a) => {
    let lat = null, lng = null;
    for (const f of a.customFields || []) {
      if (f.GPS_COORDINATES) { lat = +f.GPS_COORDINATES.latitude; lng = +f.GPS_COORDINATES.longitude; }
      else if (f.meta && f.meta.name === 'Latitude' && lat == null) lat = +f.NUMBER;
      else if (f.meta && f.meta.name === 'Longitude' && lng == null) lng = +f.NUMBER;
    }
    return { id: a.id, name: String(a.name || '').replace(/^\s*\d+\s*-\s*/, '').trim(), lat, lng };
  }).filter((s) => s.lat > 47.08 && s.lat < 47.26 && s.lng > 8.4 && s.lng < 8.65);
  sensorList = { t: Date.now(), list };
  return list;
}
async function cityTemps(key) {
  const sensors = await citySensors(key);
  // Zeitfenster zwei Stunden in Stundenbehältern; der letzte Behälter enthält den jüngsten Wert (Sensoren senden alle 20 Minuten)
  const to = new Date(), from = new Date(to.getTime() - 2 * 3600e3);
  const r = await fetch(`${AKZ}/devices/query/batch/raw/time-series`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'content-type': 'application/json', Accept: 'application/json', 'User-Agent': ua.headers['User-Agent'] },
    body: JSON.stringify({ topic: 'default', dataKey: 'Temp', accumulator: 'LAST', interval: { from: from.toISOString(), to: to.toISOString() }, bucketInterval: 'PT1H', deviceIds: sensors.map((s) => s.id) })
  });
  if (!r.ok) throw new Error('akenza query ' + r.status);
  const rows = await r.json(), by = new Map(sensors.map((s) => [s.id, s]));
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const s = by.get(row.deviceId), pts = (row.dataPoints || []).filter((x) => typeof x === 'number'), v = pts[pts.length - 1];
    if (!s || typeof v !== 'number' || v < -30 || v > 50) return null;
    const en = G.toLV95(s.lat, s.lng);
    return { n: s.name, E: Math.round(en[0]), N: Math.round(en[1]), t: round1(v) };
  }).filter(Boolean);
}
async function stationTemps() {
  const r = await fetch(MCH, { headers: { Accept: 'application/json', 'User-Agent': ua.headers['User-Agent'] } });
  if (!r.ok) throw new Error('MeteoSchweiz ' + r.status);
  const d = await r.json();
  return (d.features || []).filter((f) => {
    const c = f.geometry && f.geometry.coordinates, v = f.properties && f.properties.value;
    return c && typeof v === 'number' && c[0] > 2655000 && c[0] < 2712000 && c[1] > 1196000 && c[1] < 1250000;
  }).map((f) => ({ id: f.id, n: f.properties.station_name, E: Math.round(f.geometry.coordinates[0]), N: Math.round(f.geometry.coordinates[1]),
    z: Math.round(parseFloat(f.properties.altitude)) || null, t: round1(f.properties.value), ts: f.properties.reference_ts }));
}
const stamp = (d) => d.toISOString().replace(/[-:T]/g, '').slice(0, 12);
async function lakeTemps() {
  const now = new Date(), s = stamp(new Date(now.getTime() - 9 * 3600e3)), e = stamp(new Date(now.getTime() + 3 * 3600e3));
  const out = await Promise.all(LAKES.map(async (L) => {
    const r = await fetch(L.url.replace('{s}', s).replace('{e}', e), { headers: { Accept: 'application/json', 'User-Agent': ua.headers['User-Agent'] } });
    if (!r.ok) return null;
    const d = await r.json(), ts = d.time || [], vs = (d.variables && d.variables.temperature && d.variables.temperature.data) || [];
    let k = -1;
    for (let i = 0; i < ts.length; i++) if (Date.parse(ts[i]) <= now.getTime() && typeof vs[i] === 'number') k = i;
    if (k < 0) return null;
    return { id: L.id, n: L.n, t: round1(vs[k]), ts: ts[k] };
  }));
  return { source: 'Alplakes, Eawag (Modell)', lakes: out.filter(Boolean) };
}
const mem = new Map();

function json(data, ttl, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${Math.min(ttl, 900)}, s-maxage=${ttl}`,
      'access-control-allow-origin': '*'
    }
  });
}

const inflight = new Map(), MEM_MAX = 400;
function remember(key, data, t) {
  mem.delete(key); mem.set(key, { t, data });
  while (mem.size > MEM_MAX) mem.delete(mem.keys().next().value);
}
// Zwischenspeicher: Speicher der Instanz, dann Cache der Edge, dann Quelle. Gleichzeitige Anfragen teilen sich einen Abruf.
// Ein lückenhaftes Ergebnis (partial) ersetzt keinen älteren vollständigen Stand und wird nur kurz gehalten.
async function cached(request, ctx, key, ttl, produce) {
  const now = Date.now(), m = mem.get(key);
  if (m && now - m.t < m.ttl * 1000) return json(m.data, m.ttl);
  const cache = caches.default, ck = new Request(new URL('/__cache/' + encodeURIComponent(key), request.url).toString());
  const hit = await cache.match(ck);
  if (hit) return hit;
  let job = inflight.get(key);
  if (!job) { job = produce(); inflight.set(key, job); job.then(() => inflight.delete(key), () => inflight.delete(key)); }
  try {
    const data = await job;
    if (data && data.partial && m) return json(m.data, 300);
    const t = data && data.partial ? 120 : ttl;
    remember(key, data, now); mem.get(key).ttl = t;
    const res = json(data, t);
    if (t === ttl) ctx.waitUntil(cache.put(ck, res.clone()));
    return res;
  } catch (err) {
    if (m) return json(m.data, 300);
    return json({ error: 'Quelle nicht erreichbar', detail: String(err && err.message || err) }, 60, 502);
  }
}

const ua = { headers: { 'User-Agent': 'ZugEntdecken/1.0 (Portal Kanton Zug)', Accept: 'application/json' } };
const gfetch = (url, init) => fetch(url, { ...init, headers: { ...(init && init.headers), ...ua.headers } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/events') {
      return cached(request, ctx, 'events', LIST_TTL, () => G.fetchAll(gfetch));
    }
    if (url.pathname === '/api/parking') {
      return cached(request, ctx, 'parking', PARK_TTL, async () => {
        const r = await fetch(PLS, { headers: { 'User-Agent': ua.headers['User-Agent'], Accept: 'application/json' } });
        if (!r.ok) throw new Error('PLS ' + r.status);
        return parking(await r.json());
      });
    }
    if (url.pathname === '/api/temp') {
      return cached(request, ctx, 'temp', TEMP_TTL, async () => {
        const [city, st] = await Promise.allSettled([env.AKENZA_KEY ? cityTemps(env.AKENZA_KEY) : Promise.reject(new Error('kein Schlüssel')), stationTemps()]);
        if (city.status === 'rejected' && st.status === 'rejected') throw new Error('Temperaturen nicht erreichbar');
        return { updated: new Date().toISOString(), city: city.status === 'fulfilled' ? city.value : [], stations: st.status === 'fulfilled' ? st.value : [],
          sources: { city: 'Stadt Zug, Lufttemperaturen (opendata.swiss)', stations: 'MeteoSchweiz' } };
      });
    }
    if (url.pathname === '/api/lake') {
      return cached(request, ctx, 'lake', LAKE_TTL, lakeTemps);
    }
    if (url.pathname === '/api/event') {
      const id = url.searchParams.get('id') || '';
      if (!/^\d{5,12}$/.test(id)) return json({ error: 'ungültige id' }, 3600, 400);
      return cached(request, ctx, 'event:' + id, DETAIL_TTL, async () => {
        const r = await fetch(G.icalURL(id), { headers: { 'User-Agent': ua.headers['User-Agent'], Accept: 'text/calendar' } });
        if (!r.ok) throw new Error('iCal ' + r.status);
        return G.parseICal(await r.text()) || {};
      });
    }
    return env.ASSETS.fetch(request);
  }
};
