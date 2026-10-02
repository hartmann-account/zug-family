// Cloudflare Worker: static site from ./public plus two small JSON endpoints that read the
// Zug Tourismus event calendar (Guidle) live. Results are cached for an hour so that
// Guidle sees at most a few requests per hour, however many people open the page.
import '../src/guidle.js';

const G = globalThis.ZGEvents;
const LIST_TTL = 3600, DETAIL_TTL = 3600, PARK_TTL = 60;
const PLS = 'https://www.pls-zug.ch/?json=true';

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

async function cached(request, ctx, key, ttl, produce) {
  const now = Date.now(), m = mem.get(key);
  if (m && now - m.t < ttl * 1000) return json(m.data, ttl);
  const cache = caches.default, ck = new Request(new URL('/__cache/' + encodeURIComponent(key), request.url).toString());
  const hit = await cache.match(ck);
  if (hit) return hit;
  try {
    const data = await produce();
    mem.set(key, { t: now, data });
    const res = json(data, ttl);
    ctx.waitUntil(cache.put(ck, res.clone()));
    return res;
  } catch (err) {
    if (m) return json(m.data, 300);
    return json({ error: 'Guidle nicht erreichbar', detail: String(err && err.message || err) }, 60, 502);
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
    if (url.pathname === '/api/event') {
      const id = (url.searchParams.get('id') || '').replace(/\D/g, '');
      if (!id) return json({ error: 'id fehlt' }, 60, 400);
      return cached(request, ctx, 'event:' + id, DETAIL_TTL, async () => {
        const r = await fetch(G.icalURL(id), { headers: { 'User-Agent': ua.headers['User-Agent'], Accept: 'text/calendar' } });
        if (!r.ok) throw new Error('iCal ' + r.status);
        return G.parseICal(await r.text()) || {};
      });
    }
    return env.ASSETS.fetch(request);
  }
};
