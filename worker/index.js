// Cloudflare Worker: static site from ./public plus two small JSON endpoints that read the
// Zug Tourismus event calendar (Guidle) live. Results are cached for an hour so that
// Guidle sees at most a few requests per hour, however many people open the page.
import '../src/guidle.js';

const G = globalThis.ZGEvents;
const LIST_TTL = 3600, DETAIL_TTL = 3600;
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
