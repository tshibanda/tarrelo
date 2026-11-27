// Construit les guides publiés automatiquement (contenu/guides/*.json) au déploiement Netlify.
// Chaque JSON : { slug, title, seo_title, description, date, body_html, faq: [{q, a}] }
import fs from 'fs';
import path from 'path';

const DIR = 'contenu/guides';
const TPL_FILE = 'ressources/renvoi-appel.html';

// Index public des guides (utilisé par la newsletter automatique) : ressources/guides.json
function indexGuides() {
  const un = (t) => String(t || '').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const liste = fs.readdirSync('ressources').filter((f) => f.endsWith('.html')).map((f) => {
    const h = fs.readFileSync('ressources/' + f, 'utf8');
    const g = (re) => { const m = h.match(re); return m ? un(m[1]).trim() : ''; };
    return { slug: f.replace(/\.html$/, ''), url: 'https://tarrelo.com/ressources/' + f.replace(/\.html$/, ''), title: g(/<meta property="og:title" content="([^"]*)"/) || g(/<title>([^<|]*)/), description: g(/<meta name="description" content="([^"]*)"/), date: g(/"datePublished":\s*"([^"]*)"/) };
  }).filter((x) => x.title).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  fs.writeFileSync('ressources/guides.json', JSON.stringify(liste, null, 2) + '\n');
  console.log(liste.length + ' guide(s) indexé(s).');
}
if (!fs.existsSync(DIR)) { console.log('Aucun guide automatique.'); indexGuides(); process.exit(0); }

const tpl = fs.readFileSync(TPL_FILE, 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const frDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
// Balises autorisées dans le corps rédigé par l'IA
const clean = (h) => String(h || '')
  .replace(/<\s*(script|style|iframe|object|embed|form|input|img)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  .replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|input|img|meta|link)[^>]*>/gi, '')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  .replace(/href\s*=\s*"(?!\/|https:\/\/tarrelo\.com)[^"]*"/gi, 'href="/"');

const faqHtml = (faq) => '<section style="padding: 72px 0"><div class="wrap" style="display: flex; flex-direction: column; gap: 24px; max-width: 860px">\n<h2 class="h2x" style="font-size: 36px; line-height: 1.12; font-weight: 800; letter-spacing: -1px">Questions fréquentes</h2>\n<div style="border-top: 1px solid #E8DFD3">'
  + faq.map(({ q, a }) => '<details style="border-bottom: 1px solid #E8DFD3"><summary style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 0; font-size: 18px; font-weight: 600; cursor: pointer">' + esc(q) + '<span class="plus" aria-hidden="true" style="flex: none; font-size: 26px; font-weight: 400; color: #B83A1E">+</span></summary><p style="font-size: 16px; line-height: 1.6; color: #4A5568; padding-bottom: 22px">' + esc(a) + '</p></details>').join('')
  + '</div></div></section>';

const CTA = '<div class="card" style="margin-top: 40px; background: #FFE3DA; border-color: #FF6B4A"><p style="font-weight: 700; font-size: 18px">Entendez Tarrelo décrocher au nom de votre entreprise</p><p style="margin-top: 8px">En 3 minutes, nous préparons un assistant à votre nom. Appelez-le depuis votre mobile et faites comme un client.</p><p style="margin-top: 14px"><a href="/demo" class="btn" style="background: #FF6B4A; color: #14213D">Tester ma démo gratuite</a></p></div>';

const guides = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')))
  .filter((g) => g.slug && /^[a-z0-9-]+$/.test(g.slug) && g.title && g.body_html)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

for (const g of guides) {
  const url = 'https://tarrelo.com/ressources/' + g.slug;
  if (fs.existsSync('ressources/' + g.slug + '.html')) continue; // ne jamais écraser une page écrite à la main
  let s = tpl;
  s = s.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(g.seo_title || g.title + ' | Tarrelo') + '</title>');
  s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(g.description) + '">');
  s = s.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(g.title) + '">');
  s = s.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(g.description) + '">');
  s = s.split('https://tarrelo.com/ressources/renvoi-appel"').join(url + '"');
  s = s.replace(/<span aria-current="page">[^<]*<\/span>/, '<span aria-current="page">' + esc(g.title.length > 60 ? g.title.slice(0, 57) + '…' : g.title) + '</span>');
  const m = s.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  const ld = JSON.parse(m[1]);
  for (const n of ld['@graph']) {
    if (n['@type'] === 'BreadcrumbList') Object.assign(n.itemListElement[2], { name: g.title, item: url });
    if (n['@type'] === 'FAQPage') n.mainEntity = (g.faq || []).map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }));
    if (n['@type'] === 'Article') Object.assign(n, { headline: g.title, description: g.description, datePublished: g.date, dateModified: g.date, mainEntityOfPage: url });
  }
  s = s.replace(m[0], '<script type="application/ld+json">\n' + JSON.stringify(ld, null, 2) + '\n</script>');
  const i = s.indexOf('<main id="contenu">'), j = s.indexOf('</main>');
  const main = '<main id="contenu">\n<article class="wrap prose" style="max-width: 820px; padding-top: 32px; padding-bottom: 56px">\n<p class="eyebrow">Guide</p><h1 class="h1x" style="font-size: 46px; line-height: 1.08; font-weight: 800; letter-spacing: -1.4px; margin-top: 8px">' + esc(g.title) + '</h1>\n'
    + '<p style="font-size: 14px; color: #4A5568; margin-top: 12px">Par Elie, fondateur de Tarrelo · Publié le ' + frDate(g.date) + '</p>\n'
    + clean(g.body_html) + '\n' + CTA + '\n</article>' + ((g.faq || []).length ? faqHtml(g.faq) : '') + '\n';
  s = s.slice(0, i) + main + s.slice(j);
  fs.writeFileSync('ressources/' + g.slug + '.html', s);
}

// Page Guides : cartes des guides automatiques en tête de liste
let hub = fs.readFileSync('ressources.html', 'utf8');
const anchor = hub.indexOf('<a href="/ressources/assistant-telephonique-ia" class="card"');
if (anchor > 0) {
  const cards = guides.filter((g) => !hub.includes('href="/ressources/' + g.slug + '"')).map((g) => '<a href="/ressources/' + g.slug + '" class="card" style="text-decoration: none; color: #14213D; display: flex; flex-direction: column; gap: 8px"><h2 style="font-size: 20px; font-weight: 700">' + esc(g.title) + '</h2><p style="font-size: 15px; line-height: 1.6; color: #4A5568">' + esc(g.card || g.description) + '</p><span style="font-weight: 600; color: #B83A1E">Lire le guide →</span></a>').join('');
  hub = hub.slice(0, anchor) + cards + hub.slice(anchor);
  fs.writeFileSync('ressources.html', hub);
}

// Plan du site
let sm = fs.readFileSync('sitemap.xml', 'utf8');
const add = guides.filter((g) => !sm.includes('/ressources/' + g.slug + '<')).map((g) => '  <url><loc>https://tarrelo.com/ressources/' + g.slug + '</loc><lastmod>' + g.date + '</lastmod><priority>0.7</priority></url>\n').join('');
sm = sm.replace('</urlset>', add + '</urlset>');
fs.writeFileSync('sitemap.xml', sm);
console.log(guides.length + ' guide(s) automatique(s) construit(s).');
indexGuides();
