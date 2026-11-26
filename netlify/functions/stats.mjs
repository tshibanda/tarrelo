// Statistiques agrégées pour l'ERP (protégées par une clé).
import { getStore } from '@netlify/blobs';
const KEY = '8780b16e430f687550a1c22af46670f9';

export default async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get('k') !== KEY) return new Response('Non autorisé', { status: 401 });
  const n = Math.min(Number(u.searchParams.get('jours')) || 30, 120);
  const store = getStore({ name: 'stats', consistency: 'strong' });
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(Date.now() + 3600e3 - i * 864e5).toISOString().slice(0, 10);
    const s = await store.get('d/' + day, { type: 'json' });
    out.push(s ? { day, v: s.v, u: s.u.length, p: s.p, r: s.r, dev: s.dev, src: s.src, c: s.c, e: s.e, h: s.h, ep: s.ep } : { day, v: 0, u: 0 });
  }
  return new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};

export const config = { path: '/api/stats' };
