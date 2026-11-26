// Mesure d'audience sans cookie : un compteur par jour dans Netlify Blobs.
import { getStore } from '@netlify/blobs';

const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|monitor|curl|wget|python|axios|facebookexternalhit/i;
const EVENTS = ['cta_essai', 'cta_demo', 'demo_envoyee', 'tel', 'espace_client', 'paiement', 'calculateur', 'test_accueil', 'newsletter'];

async function hash(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}
const inc = (o, k, n = 1) => { if (!k) return; o[k] = (o[k] || 0) + n; };

export default async (req, context) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  let b = {};
  try { b = JSON.parse((await req.text()) || '{}'); } catch (e) { return new Response(null, { status: 204 }); }
  const now = new Date(Date.now() + 3600e3); // heure de Paris (approx. UTC+1)
  const day = now.toISOString().slice(0, 10);
  const store = getStore({ name: 'stats', consistency: 'strong' });
  const key = 'd/' + day;
  const s = (await store.get(key, { type: 'json' })) || { v: 0, u: [], p: {}, r: {}, dev: {}, src: {}, c: {}, e: {}, h: {}, ep: {} };
  if (b.t === 'e') {
    const n = String(b.n || '');
    if (!EVENTS.includes(n)) return new Response(null, { status: 204 });
    inc(s.e, n);
    inc(s.ep, n + ' ' + String(b.p || '/').slice(0, 80));
  } else {
    const id = await hash((context.ip || '') + ua + day + 'trl');
    s.v++;
    if (!s.u.includes(id)) s.u.push(id);
    inc(s.p, String(b.p || '/').slice(0, 80));
    let ref = '';
    try { const r = new URL(b.r); if (!/tarrelo\.com$/.test(r.hostname)) ref = r.hostname.replace(/^www\./, ''); } catch (e) {}
    inc(s.r, ref || '(direct)');
    inc(s.dev, Number(b.w) < 768 ? 'mobile' : Number(b.w) < 1100 ? 'tablette' : 'ordinateur');
    if (b.s) inc(s.src, String(b.s).slice(0, 40));
    inc(s.c, (context.geo && context.geo.country && context.geo.country.code) || '?');
    inc(s.h, String(now.getUTCHours()));
  }
  await store.setJSON(key, s);
  return new Response(null, { status: 204 });
};

export const config = { path: '/api/h' };
