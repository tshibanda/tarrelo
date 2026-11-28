/* Espace client Tarrelo : connexion + application de suivi des appels */
(function () {
  'use strict';
  var API = 'https://tarrelo.app.n8n.cloud/webhook/tarrelo/';
  var KEY = 'tarrelo_ec';
  var D = null, T = null, DEMO = false;
  var PRIX = { standard: 6900, premium: 8900 };
  var PREM = ['Écoute des enregistrements et transcriptions', 'Récaps par e-mail', 'Dossiers clients et commandes', 'Synchronisation avec votre agenda', 'Voix personnalisée (timbre, ton, débit)', 'Appels sortants', 'Statistiques détaillées', 'Support sous 24 h ouvrées'];

  // ---------- Utilitaires ----------
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function post(path, data) {
    var p = new URLSearchParams(); Object.keys(data).forEach(function (k) { p.append(k, data[k]); });
    return fetch(API + path, { method: 'POST', body: p }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }
  function d(v) { if (!v) return null; var x = typeof v === 'number' ? new Date(v * 1000) : new Date(v); return isNaN(x) ? null : x; }
  function fdate(v, opt) { var x = d(v); return x ? x.toLocaleDateString('fr-FR', opt || { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) : '—'; }
  function fdt(v) { var x = d(v); return x ? x.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' }) + ' · ' + x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) : '—'; }
  function euro(c) { return (Number(c || 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: (c % 100 ? 2 : 0) }); }
  function dur(s) { s = Number(s || 0); if (!s) return '—'; var m = Math.floor(s / 60), r = s % 60; return m ? m + ' min ' + (r < 10 ? '0' : '') + r : r + ' s'; }
  function nb(n) { return Number(n || 0).toLocaleString('fr-FR'); }
  function tel(t) { return t ? '<a href="tel:' + esc(String(t).replace(/\s/g, '')) + '">' + esc(t) + '</a>' : '<span class="m">Numéro masqué</span>'; }
  function since(v, days) { var x = d(v); return x && x > new Date(Date.now() - days * 864e5); }
  function between(v, a, b) { var x = d(v); return x && x <= new Date(Date.now() - a * 864e5) && x > new Date(Date.now() - b * 864e5); }
  function parisParts(v) { var x = d(v); if (!x) return null; var f = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(x); var h = 0, w = ''; f.forEach(function (p) { if (p.type === 'hour') h = Number(p.value); if (p.type === 'weekday') w = p.value; }); return { h: h, w: w.replace('.', '') }; }
  var MOTIFS = { rdv: ['Rendez-vous', 'ok'], devis: ['Devis', 'wait'], urgence: ['Urgence', 'ko'], commande: ['Commande', 'pr'], information: ['Information', ''], rappel: ['À rappeler', 'wait'], autre: ['Autre', ''] };
  function motif(m) { var x = MOTIFS[m] || MOTIFS.autre; return '<span class="bd ' + x[1] + '">' + x[0] + '</span>'; }
  var STATUTS = { nouveau: 'Nouveau', a_rappeler: 'À rappeler', traite: 'Traité' };
  var ICO = {
    tdb: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    appels: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    rdv: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    dossiers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    commandes: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
    stats: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    abonnement: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
    factures: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    compte: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    assistant: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  function ico(k, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (w ? ' width="' + w + '" height="' + w + '"' : '') + '>' + ICO[k] + '</svg>'; }

  var NAV = [
    ['tdb', 'Tableau de bord', false], ['assistant', 'Mon assistant', false], ['appels', 'Appels', false], ['rdv', 'Rendez-vous', false],
    ['dossiers', 'Dossiers clients', true], ['commandes', 'Commandes', true], ['stats', 'Statistiques', true],
    ['sep'], ['abonnement', 'Abonnement', false], ['factures', 'Factures et documents', false], ['compte', 'Mon compte', false]
  ];
  function logo(clair) { return '<span class="tlogo" style="font-family: \'Plus Jakarta Sans\', system-ui, sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -1px; color: ' + (clair ? '#FFF8F1' : '#14213D') + '">tarrel<span style="color: #FF6B4A">o</span><svg viewBox="0 0 100 100" fill="none" stroke="#FF6B4A" stroke-linecap="round" aria-hidden="true" style="width: 1em; height: 1em; vertical-align: baseline; overflow: visible; margin-left: -0.62em; margin-right: -0.38em"><path d="M37.9 33.6A40 40 0 0 1 68.6 59.3" stroke-width="7"></path><path d="M44.7 21.8A53 53 0 0 1 79 50.6" stroke-width="5.5" opacity="0.5"></path></svg></span>'; }
  function premium() { return D && D.plan === 'premium'; }

  // ---------- Connexion ----------
  function initLogin() {
    var f = document.getElementById('ec-form'), st = document.getElementById('ec-status'), o = document.getElementById('ec-oubli'), os = document.getElementById('ec-oubli-status');
    if (!f) return;
    var b = f.querySelector('button'), err = 'Service momentanément indisponible. Écrivez-nous à contact@tarrelo.com.';
    var lien = document.getElementById('ec-oubli-lien');
    if (lien) lien.addEventListener('click', function (e) { e.preventDefault(); o.hidden = false; o.email.value = f.email.value; o.email.focus(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); if (!f.reportValidity()) return;
      b.disabled = true; b.textContent = 'Connexion…'; st.hidden = true;
      post('compte/connexion', { email: f.email.value.trim(), password: f.password.value }).then(function (j) {
        if (j && j.ok && j.token) { store(KEY, j.token); T = j.token; f.password.value = ''; start(); return; }
        st.hidden = false; st.textContent = (j && j.error) || err;
      }).catch(function () { st.hidden = false; st.textContent = err; }).then(function () { b.disabled = false; b.textContent = 'Accéder à mon espace'; });
    });
    o.addEventListener('submit', function (e) {
      e.preventDefault(); if (!o.reportValidity()) return;
      post('compte/oubli', { email: o.email.value.trim() }).catch(function () {}).then(function () { os.hidden = false; os.textContent = 'Si un compte existe pour cette adresse, un lien vient de vous être envoyé (valable 2 heures).'; });
    });
  }
  function logout() { store(KEY, null); T = null; D = null; A = null; OPEN = null; FIRST = true; document.body.classList.remove('ec-on'); var a = document.getElementById('ec-app'); if (a) a.innerHTML = ''; window.scrollTo(0, 0); }

  // ---------- Chargement ----------
  function start() {
    var app = document.getElementById('ec-app');
    document.body.classList.add('ec-on');
    app.innerHTML = '<div class="app"><aside></aside><div class="main"><div class="skel" style="width:40%;height:28px"></div><div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div></div></div>';
    if (DEMO) { D = demoData(DEMO); render(); return; }
    post('ec/donnees', { t: T }).then(function (j) {
      if (j && j.ok) { D = j; render(); return; }
      logout(); var st = document.getElementById('ec-status'); if (st) { st.hidden = false; st.textContent = (j && j.error) || 'Votre session a expiré, reconnectez-vous.'; }
    }).catch(function () { logout(); var st = document.getElementById('ec-status'); if (st) { st.hidden = false; st.textContent = 'Connexion impossible pour le moment. Réessayez dans un instant.'; } });
  }
  function refresh(msg) { if (DEMO) { toast(msg || 'Fait (aperçu).'); return; } post('ec/donnees', { t: T }).then(function (j) { if (j && j.ok) { D = j; render(); } if (msg) toast(msg); }); }

  // ---------- Rendu ----------
  function render() {
    var a = D.abonnement || {}, c = D.client || {}, ap = D.appels || [];
    var aRappeler = ap.filter(function (x) { return x.statut === 'a_rappeler'; }).length;
    var nav = NAV.map(function (n) {
      if (n[0] === 'sep') return '<div class="sep"></div>';
      var lock = n[2] && !premium() ? '<span class="lk">PREMIUM</span>' : '';
      var em = n[0] === 'appels' && aRappeler ? '<em>' + aRappeler + '</em>' : '';
      return '<a href="#' + n[0] + '" class="nav" data-p="' + n[0] + '">' + ico(n[0]) + '<span>' + n[1] + '</span>' + (lock || em) + '</a>';
    }).join('');
    var planLib = D.plan === 'premium' ? 'Premium' : (D.plan === 'standard' ? 'Standard' : 'Sans abonnement actif');
    var html = '<div class="app"><aside><a class="logo" href="/" aria-label="Tarrelo, accueil">' + logo(true) + '</a>'
      + '<div class="who"><strong>' + esc(c.entreprise || c.nom || c.email) + '</strong>Formule ' + planLib + '</div>' + nav
      + '<div class="foot">Besoin d’aide ?<br><a href="tel:+33978466369">09 78 46 63 69</a><br><a href="mailto:contact@tarrelo.com">contact@tarrelo.com</a><br><br><a href="#" data-act="logout">Se déconnecter</a></div></aside>'
      + '<div><div class="mtop"><a href="/" class="logo" aria-label="Tarrelo, accueil">' + logo(false) + '</a><button class="b ghost sm" data-act="logout">Déconnexion</button></div><div class="main">'
      + (DEMO ? '<div class="demo">Aperçu avec des données fictives (formule ' + (DEMO === 'premium' ? 'Premium' : 'Standard') + '). <a href="/espace-client">Se connecter à mon espace</a></div>' : '')
      + paneTdb() + '<section class="pane" id="p-assistant">' + head('Mon assistant') + '<div class="skel"></div><div class="skel" style="width:70%"></div></section>' + paneAppels() + paneRdv() + paneDossiers() + paneCommandes() + paneStats() + paneAbonnement() + paneFactures() + paneCompte()
      + '</div></div></div>'
      + '<nav class="bnav" aria-label="Navigation">' + [['tdb', 'Accueil'], ['assistant', 'Assistant'], ['appels', 'Appels'], ['rdv', 'RDV']].map(function (n) { return '<a href="#' + n[0] + '" class="nav" data-p="' + n[0] + '">' + ico(n[0]) + '<span>' + n[1] + '</span>' + (n[0] === 'appels' && aRappeler ? '<em>' + aRappeler + '</em>' : '') + '</a>'; }).join('') + '<button type="button" class="nav" data-act="menu" aria-expanded="false">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Plus</span></button></nav>'
      + '<div class="sheet" hidden><div class="sh-in"><div class="sh-h"><strong>' + esc(c.entreprise || c.nom || '') + '</strong><span class="m">Formule ' + planLib + '</span></div>' + nav + '<div class="sh-f"><a href="tel:+33978466369">Aide : 09 78 46 63 69</a><a href="#" data-act="logout">Se déconnecter</a></div></div></div>';
    document.getElementById('ec-app').innerHTML = html;
    document.querySelectorAll('#ec-app .tw table').forEach(function (t) { var h = Array.prototype.map.call(t.querySelectorAll('thead th'), function (x) { return x.textContent; }); t.querySelectorAll('tbody tr').forEach(function (r) { Array.prototype.forEach.call(r.children, function (c, i) { if (h[i] && c.colSpan === 1) c.setAttribute('data-l', h[i]); }); }); });
    bind();
    go(location.hash.slice(1));
    if (A) paintAssistant(); else loadAssistant();
  }
  function head(t, s, acts) { return '<div class="top"><div><h1>' + t + '</h1>' + (s ? '<p>' + s + '</p>' : '') + '</div>' + (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>'; }
  function kpi(v, l, s, hi) { return '<div class="k' + (hi ? ' hi' : '') + '"><div class="kl">' + l + '</div><div class="kv">' + v + '</div>' + (s ? '<div class="ks">' + s + '</div>' : '') + '</div>'; }
  function trend(a, b) { if (!b) return a ? '<span class="up">nouveau</span>' : ''; var p = Math.round((a - b) * 100 / b); return '<span class="' + (p >= 0 ? 'up' : 'down') + '">' + (p >= 0 ? '+' : '') + p + ' %</span> vs 30 j précédents'; }
  function vide(t, s) { return '<div class="vide"><strong>' + t + '</strong>' + (s || '') + '</div>'; }
  function noCalls() { return D.client.assistant_branche ? vide('Aucun appel pour le moment', 'Dès que votre assistant décrochera, chaque appel apparaîtra ici avec son résumé.') : vide('Votre assistant n’est pas encore branché', 'Terminez la <a href="#assistant">mise en route</a> (renvoi d’appel compris) : vos appels apparaîtront ici dès le premier. Une question ? Appelez le 09 78 46 63 69.'); }
  function upsellBanner() { return premium() || D.plan === 'aucun' ? '' : '<div class="banner"><p>Passez en <strong>Premium</strong> : réécoutez chaque appel, lisez les transcriptions, suivez vos dossiers clients et recevez les récaps par e-mail.</p><button class="b" data-act="upgrade">Découvrir Premium</button></div>'; }

  function paneTdb() {
    var ap = D.appels || [];
    var a30 = ap.filter(function (x) { return since(x.quand, 30); }), p30 = ap.filter(function (x) { return between(x.quand, 30, 60); });
    var rap = ap.filter(function (x) { return x.statut === 'a_rappeler'; });
    var urg = a30.filter(function (x) { return x.urgent; }).length, rdv = a30.filter(function (x) { return x.motif === 'rdv' || x.rdv; }).length;
    var moy = a30.length ? Math.round(a30.reduce(function (t, x) { return t + x.duree_s; }, 0) / a30.length) : 0;
    var hors = a30.filter(function (x) { var p = parisParts(x.quand); return p && (p.h < 8 || p.h >= 19 || p.w === 'sam' || p.w === 'dim'); }).length;
    var todo = ap.filter(function (x) { return x.statut === 'a_rappeler' || (x.urgent && x.statut !== 'traite') || x.statut === 'nouveau'; }).slice(0, 6);
    var ab = D.abonnement;
    var st = '<div class="card"><h2>Votre assistant</h2><div class="status"><span class="pulse' + (D.client.assistant_branche ? '' : ' off') + '"></span><div><strong>' + (D.client.assistant_branche ? 'En service : il décroche quand vous ne pouvez pas répondre' : 'Installation en cours') + '</strong><div class="m">' + (D.client.assistant_branche ? 'Renvoi d’appel actif sur votre numéro. SMS récap envoyé après chaque appel' + (premium() ? ', récap par e-mail inclus.' : '.') : 'Nous finalisons sa configuration avec vos informations (sous 2 jours ouvrés).') + '</div></div></div>'
      + (ab ? '<p class="m" style="margin-top:14px">Formule <strong>' + (ab.formule === 'premium' ? 'Premium' : 'Standard') + '</strong> · ' + esc(ab.statut_lib) + (ab.fin_periode ? ' · prochaine échéance le ' + fdate(ab.fin_periode) : '') + '</p>' : '') + '</div>';
    var list = todo.length ? '<ul class="todo">' + todo.map(function (x) { return '<li><span class="dot' + (x.urgent ? ' u' : '') + '"></span><div class="tx"><strong>' + esc(x.nom || 'Appelant') + ' · ' + tel(x.appelant) + '</strong><span class="m">' + fdt(x.quand) + '</span><div>' + esc(x.resume) + '</div>' + (premium() && x.audio ? '<div class="aud" style="margin-top:8px"><button class="b ghost sm" data-audio="' + esc(x.audio) + '">▶ Écouter l’appel</button></div>' : '') + '</div>' + motif(x.motif) + '</li>'; }).join('') + '</ul>' : (ap.length ? vide('Tout est à jour', 'Aucun appel en attente de traitement.') : noCalls());
    return '<section class="pane" id="p-tdb">' + head('Bonjour' + (D.client.nom ? ' ' + esc(String(D.client.nom).split(' ')[0]) : '') + ' 👋', 'Voici comment se passent vos appels.', '<a class="b ghost" href="#appels" data-go="appels">Voir tous les appels</a>')
      + upsellBanner()
      + '<div class="grid">' + kpi(nb(a30.length), 'Appels décrochés', '30 derniers jours · ' + trend(a30.length, p30.length), true) + kpi(nb(rap.length), 'À rappeler', rap.length ? 'Clients qui attendent un retour' : 'Rien en attente') + kpi(nb(rdv), 'Demandes de RDV', '30 derniers jours') + kpi(nb(urg), 'Urgences', '30 derniers jours') + kpi(nb(hors), 'Hors heures ouvrées', 'Soir, nuit et week-end') + kpi(dur(moy), 'Durée moyenne', 'par appel') + '</div>'
      + '<div class="two"><div class="card"><h2>Appels par jour <span class="m">30 derniers jours</span></h2>' + chart(ap) + '</div>' + st + '</div>'
      + '<div class="card"><h2>À traiter <a href="#appels" data-go="appels">Tout voir →</a></h2>' + list + '</div></section>';
  }
  function chart(ap) {
    var days = []; for (var i = 29; i >= 0; i--) { var x = new Date(Date.now() - i * 864e5); days.push({ k: x.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }), l: x, n: 0, u: 0 }); }
    var idx = {}; days.forEach(function (dd, i) { idx[dd.k] = i; });
    ap.forEach(function (a) { var x = d(a.quand); if (!x) return; var k = x.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); if (idx[k] != null) { days[idx[k]].n++; if (a.urgent) days[idx[k]].u++; } });
    var max = Math.max(1, Math.max.apply(null, days.map(function (x) { return x.n; }))), w = 100 / days.length;
    if (!ap.length) return '<p class="m" style="padding:30px 0;text-align:center">Le graphique se remplira avec vos premiers appels.</p>';
    return '<svg class="chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Appels par jour">' + days.map(function (x, i) { var h = x.n / max * 36; return '<g><title>' + x.l.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' : ' + x.n + ' appel(s)</title><rect x="' + (i * w + w * .15) + '" y="' + (40 - h) + '" width="' + (w * .7) + '" height="' + h + '" rx=".6" class="bu"/></g>'; }).join('') + '</svg><div class="axe"><span>il y a 30 jours</span><span>aujourd’hui</span></div>';
  }
  function rowAppel(x) {
    var ecoute = premium() ? (x.audio ? '<div class="aud"><button class="b sm" data-audio="' + esc(x.audio) + '">▶ Écouter</button> <a class="b ghost sm" href="' + esc(x.audio) + '&dl=1" download="appel-' + esc(String(x.quand).slice(0, 10)) + '.mp3" title="Télécharger l’enregistrement (MP3)">⬇ MP3</a></div>' : '<span class="m">Enregistrement indisponible</span>') + (x.transcript ? '<details><summary>Transcription</summary><div class="det">' + esc(x.transcript) + '</div></details>' : '') : '<button class="lock" data-act="upgrade" title="Réservé à la formule Premium">' + ico('lock', 13) + ' Écoute et transcription</button>';
    var sel = '<select data-statut="' + x.id + '" aria-label="Statut">' + Object.keys(STATUTS).map(function (k) { return '<option value="' + k + '"' + (x.statut === k ? ' selected' : '') + '>' + STATUTS[k] + '</option>'; }).join('') + '</select>';
    return '<tr data-m="' + esc(x.motif) + '" data-s="' + esc(x.statut) + '" data-q="' + esc(x.quand) + '"><td><strong>' + fdt(x.quand) + '</strong><br><span class="m">' + dur(x.duree_s) + '</span></td><td><strong>' + esc(x.nom || 'Appelant') + '</strong><br>' + tel(x.appelant) + '</td><td>' + motif(x.motif) + (x.urgent ? ' <span class="bd ko">Urgent</span>' : '') + '</td><td class="res">' + esc(x.resume) + (x.rdv ? '<div class="m" style="margin-top:4px"><strong>RDV :</strong> ' + esc(x.rdv) + '</div>' : '') + '</td><td>' + ecoute + '</td><td>' + sel + '</td></tr>';
  }
  function paneAppels() {
    var ap = D.appels || [];
    var tools = '<div class="tools"><input type="search" placeholder="Rechercher un nom, un numéro, un mot…" data-filter="t-appels" aria-label="Rechercher"><select data-fm="t-appels" aria-label="Motif"><option value="">Tous les motifs</option>' + Object.keys(MOTIFS).map(function (k) { return '<option value="' + k + '">' + MOTIFS[k][0] + '</option>'; }).join('') + '</select><select data-fs="t-appels" aria-label="Statut"><option value="">Tous les statuts</option>' + Object.keys(STATUTS).map(function (k) { return '<option value="' + k + '">' + STATUTS[k] + '</option>'; }).join('') + '</select><select data-fp="t-appels" aria-label="Période"><option value="">Toute la période</option><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="90">90 derniers jours</option></select><span class="cnt" data-count="t-appels">' + ap.length + ' appel' + (ap.length > 1 ? 's' : '') + '</span></div>';
    return '<section class="pane" id="p-appels">' + head('Appels', 'Chaque appel décroché par votre assistant, avec son résumé. Classez-les au fil de vos rappels.', ap.length ? '<button class="b ghost" data-act="csv">Exporter (CSV)</button>' : '')
      + (premium() ? '' : '<div class="info">' + ico('lock', 14) + ' L’écoute des enregistrements et les transcriptions complètes sont incluses dans la formule <a href="#" data-act="upgrade">Premium</a>.</div>')
      + (ap.length ? tools + '<div class="tw"><table id="t-appels"><thead><tr><th>Quand</th><th>Appelant</th><th>Motif</th><th>Résumé</th><th>Enregistrement</th><th>Statut</th></tr></thead><tbody>' + ap.map(rowAppel).join('') + '</tbody></table></div>' : '<div class="card">' + noCalls() + '</div>') + '</section>';
  }
  function paneRdv() {
    var r = (D.appels || []).filter(function (x) { return x.motif === 'rdv' || x.rdv; });
    return '<section class="pane" id="p-rdv">' + head('Rendez-vous', 'Les demandes de rendez-vous prises par votre assistant.' + (premium() ? '' : ' En Premium, ils sont synchronisés avec votre agenda professionnel.'))
      + (r.length ? '<div class="tw"><table><thead><tr><th>Demandé le</th><th>Client</th><th>Créneau</th><th>Détail</th><th>Statut</th></tr></thead><tbody>' + r.map(function (x) { return '<tr><td>' + fdt(x.quand) + '</td><td><strong>' + esc(x.nom || 'Client') + '</strong><br>' + tel(x.appelant) + '</td><td><strong>' + esc(x.rdv || 'À convenir') + '</strong></td><td class="res">' + esc(x.resume) + '</td><td><span class="bd ' + (x.statut === 'traite' ? 'ok' : 'wait') + '">' + (x.statut === 'traite' ? 'Confirmé / traité' : 'À confirmer') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card">' + vide('Aucune demande de rendez-vous pour le moment', 'Elles apparaîtront ici dès qu’un client en demandera un.') + '</div>') + '</section>';
  }
  function gate(id, titre, intro, points, preview) {
    return '<section class="pane" id="p-' + id + '">' + head(titre, intro) + '<div class="gate"><div class="blur" aria-hidden="true">' + preview + '</div><div class="ov"><div class="box"><div class="ic">' + '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#14213D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ICO.lock + '</svg></div><h3>' + titre + ' : inclus dans Premium</h3><p>' + intro + '</p><ul>' + points.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul><div><button class="b" data-act="upgrade">Passer en Premium</button></div><p class="m" style="margin:10px 0 0">Sans engagement · vous pouvez revenir en Standard à tout moment</p></div></div></div></section>';
  }
  function fakeTable(rows) { return '<table><thead><tr><th>Client</th><th>Appels</th><th>Dernier contact</th><th>Motifs</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td><strong>' + r[0] + '</strong><br><span class="m">06 •• •• •• ••</span></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td><span class="bd ok">Rendez-vous</span> <span class="bd wait">Devis</span></td></tr>'; }).join('') + '</tbody></table>'; }
  function paneDossiers() {
    if (!premium()) return gate('dossiers', 'Dossiers clients', 'Retrouvez l’historique complet de chaque client : tous ses appels, ses demandes et ses rendez-vous, au même endroit.', ['Historique de chaque appelant', 'Résumés et enregistrements regroupés', 'Clients fidèles repérés en un coup d’œil'], fakeTable([['M. Martin', 4, 'hier'], ['Mme Bernard', 2, 'lundi'], ['SCI Les Tilleuls', 3, '12 nov.'], ['M. Petit', 1, '9 nov.']]));
    var g = {}; (D.appels || []).forEach(function (x) { var k = x.appelant || ('inconnu-' + x.id); if (!g[k]) g[k] = { tel: x.appelant, nom: '', items: [] }; g[k].items.push(x); if (!g[k].nom && x.nom) g[k].nom = x.nom; });
    var L = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return String(b.items[0].quand).localeCompare(String(a.items[0].quand)); });
    return '<section class="pane" id="p-dossiers">' + head('Dossiers clients', 'Tous les appels regroupés par client.')
      + (L.length ? '<div class="tools"><input type="search" placeholder="Rechercher un client…" data-filter="t-dos" aria-label="Rechercher"><span class="cnt" data-count="t-dos">' + L.length + ' client' + (L.length > 1 ? 's' : '') + '</span></div><div class="tw"><table id="t-dos"><thead><tr><th>Client</th><th>Appels</th><th>Dernier contact</th><th>Historique</th></tr></thead><tbody>' + L.map(function (c) { var mot = {}; c.items.forEach(function (x) { mot[x.motif] = 1; }); return '<tr><td><strong>' + esc(c.nom || 'Client sans nom') + '</strong><br>' + tel(c.tel) + '</td><td><strong>' + c.items.length + '</strong></td><td>' + fdt(c.items[0].quand) + '<br>' + Object.keys(mot).map(motif).join(' ') + '</td><td><details><summary>Voir les ' + c.items.length + ' appel' + (c.items.length > 1 ? 's' : '') + '</summary><div class="det">' + c.items.map(function (x) { return fdt(x.quand) + ' – ' + (MOTIFS[x.motif] || MOTIFS.autre)[0] + '\n' + x.resume; }).map(esc).join('\n\n') + '</div></details></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card">' + noCalls() + '</div>') + '</section>';
  }
  function paneCommandes() {
    if (!premium()) return gate('commandes', 'Commandes', 'Votre assistant prend les commandes au téléphone (produits, quantités, retrait ou livraison) et vous les retrouvez ici, prêtes à préparer.', ['Commandes détaillées et horodatées', 'Coordonnées du client jointes', 'Suivi « à préparer » / « traitée »'], fakeTable([['Boulangerie Durand', 1, 'aujourd’hui'], ['M. Leroy', 2, 'hier'], ['Mme Moreau', 1, 'mardi']]));
    var c = (D.appels || []).filter(function (x) { return x.motif === 'commande'; });
    return '<section class="pane" id="p-commandes">' + head('Commandes', 'Les commandes prises par téléphone par votre assistant.')
      + (c.length ? '<div class="tw"><table><thead><tr><th>Quand</th><th>Client</th><th>Commande</th><th>Statut</th></tr></thead><tbody>' + c.map(function (x) { return '<tr><td>' + fdt(x.quand) + '</td><td><strong>' + esc(x.nom || 'Client') + '</strong><br>' + tel(x.appelant) + '</td><td class="res">' + esc(x.resume) + '</td><td><span class="bd ' + (x.statut === 'traite' ? 'ok' : 'wait') + '">' + (x.statut === 'traite' ? 'Traitée' : 'À préparer') + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card">' + vide('Aucune commande pour le moment', 'Les commandes passées par téléphone s’afficheront ici.') + '</div>') + '</section>';
  }
  function paneStats() {
    if (!premium()) return gate('stats', 'Statistiques', 'Comprenez quand et pourquoi vos clients appellent pour vous organiser au mieux.', ['Motifs d’appel en détail', 'Heures et jours les plus chargés', 'Part des appels hors heures ouvrées'], '<div class="grid">' + kpi('128', 'Appels', '90 jours') + kpi('34 %', 'Hors heures', 'soir et week-end') + kpi('41', 'Rendez-vous', '') + '</div><div class="skel" style="height:120px"></div>');
    var ap = (D.appels || []).filter(function (x) { return since(x.quand, 90); });
    var mot = {}; ap.forEach(function (x) { mot[x.motif] = (mot[x.motif] || 0) + 1; });
    var mo = Object.keys(mot).sort(function (a, b) { return mot[b] - mot[a]; });
    var J = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], H = {}, max = 1;
    ap.forEach(function (x) { var p = parisParts(x.quand); if (!p) return; var k = p.w + p.h; H[k] = (H[k] || 0) + 1; if (H[k] > max) max = H[k]; });
    var heat = '<div class="heat"><span></span>' + Array.from({ length: 24 }, function (_, h) { return '<span style="text-align:center">' + (h % 3 ? '' : h) + '</span>'; }).join('') + J.map(function (j) { return '<span>' + j + '</span>' + Array.from({ length: 24 }, function (_, h) { var n = H[j + h] || 0; return '<span class="c" title="' + j + ' ' + h + ' h : ' + n + ' appel(s)" style="opacity:' + (n ? (0.18 + 0.82 * n / max).toFixed(2) : 0.06) + '"></span>'; }).join(''); }).join('') + '</div>';
    var hors = ap.filter(function (x) { var p = parisParts(x.quand); return p && (p.h < 8 || p.h >= 19 || p.w === 'sam' || p.w === 'dim'); }).length;
    var tot = ap.reduce(function (t, x) { return t + x.duree_s; }, 0);
    return '<section class="pane" id="p-stats">' + head('Statistiques', '90 derniers jours.')
      + (ap.length ? '<div class="grid">' + kpi(nb(ap.length), 'Appels décrochés', '90 jours', true) + kpi(Math.round(hors * 100 / ap.length) + ' %', 'Hors heures ouvrées', nb(hors) + ' appels') + kpi(Math.round(tot / 60) + ' min', 'Temps de conversation', 'gérés à votre place') + kpi(nb(ap.filter(function (x) { return x.urgent; }).length), 'Urgences', 'signalées') + '</div>'
      + '<div class="two"><div class="card"><h2>Motifs d’appel</h2><ul class="rank">' + mo.map(function (k) { return '<li><span class="rk">' + (MOTIFS[k] || MOTIFS.autre)[0] + '</span><span class="rn">' + mot[k] + '</span><span class="rb" style="width:' + Math.round(mot[k] * 100 / ap.length) + '%"></span></li>'; }).join('') + '</ul></div><div class="card"><h2>Quand vos clients appellent</h2>' + heat + '</div></div>' : '<div class="card">' + noCalls() + '</div>') + '</section>';
  }
  function feats(p) {
    var S = ['Assistant IA 24h/24 sur votre numéro', 'Réponses aux questions fréquentes', 'Prise de rendez-vous', 'Transfert des urgences', 'SMS récap de chaque appel', 'Suivi des appels dans l’espace client'];
    var P = PREM;
    return '<ul class="feat">' + S.map(function (x) { return '<li>' + x + '</li>'; }).join('') + P.map(function (x) { return '<li' + (p === 'premium' ? '' : ' class="no"') + '>' + x + '</li>'; }).join('') + '</ul>';
  }
  function prixNet(f) { var ab = D.abonnement || {}; return Math.max(0, PRIX[f] - (ab.remise || 0)); }
  function paneAbonnement() {
    var ab = D.abonnement;
    if (!ab) return '<section class="pane" id="p-abonnement">' + head('Abonnement') + '<div class="card">' + vide('Aucun abonnement actif', 'Choisissez une formule sur <a href="/tarifs">la page Tarifs</a>, ou appelez-nous au 09 78 46 63 69.') + '</div></section>';
    var cur = ab.formule === 'premium' ? 'premium' : 'standard';
    var alerte = '';
    if (ab.annulation_prevue) alerte = '<div class="warn">Votre abonnement prendra fin le <strong>' + fdate(ab.annule_le || ab.fin_periode) + '</strong>. Votre assistant décroche jusqu’à cette date. <button class="b sm" data-act="reprendre" style="margin-left:8px">Annuler la résiliation</button></div>';
    else if (ab.statut === 'past_due' || ab.statut === 'unpaid') alerte = '<div class="warn">Le dernier paiement n’a pas abouti. Mettez à jour votre moyen de paiement pour que votre assistant reste actif. <button class="b sm" data-act="portail" style="margin-left:8px">Mettre à jour ma carte</button></div>';
    var card = function (f) {
      var isCur = f === cur, nom = f === 'premium' ? 'Premium' : 'Standard';
      var btn = isCur ? '<span class="bd ok">Votre formule actuelle</span>' : (f === 'premium' ? '<button class="b" data-act="upgrade">Passer en Premium</button>' : '<button class="b ghost" data-act="downgrade">Passer en Standard</button>');
      return '<div class="pc2' + (isCur ? ' cur' : '') + '">' + (f === 'premium' ? '<span class="bd pr">Le plus complet</span>' : '<span class="bd">L’essentiel</span>') + '<div style="font-weight:800;font-size:18px;margin-top:6px">' + nom + '</div><div class="px">' + euro(prixNet(f)) + ' <small>/mois</small></div>' + (ab.remise ? '<div class="m">au lieu de ' + euro(PRIX[f]) + ' · ' + esc(ab.remise_nom || 'remise') + '</div>' : '<div class="m">sans engagement</div>') + feats(f) + '<div class="go">' + btn + '</div></div>';
    };
    return '<section class="pane" id="p-abonnement">' + head('Abonnement', 'Gérez votre formule en toute autonomie : changement immédiat, sans engagement.', '<button class="b ghost" data-act="portail">Moyen de paiement</button>')
      + alerte
      + '<div class="grid">' + kpi(cur === 'premium' ? 'Premium' : 'Standard', 'Formule', esc(ab.statut_lib), true) + kpi(euro(ab.prix_net), 'Montant mensuel', ab.remise ? 'remise de ' + euro(ab.remise) + ' incluse' : 'TVA non applicable') + kpi(fdate(ab.fin_periode, { day: 'numeric', month: 'short' }), ab.statut === 'trialing' ? 'Fin de la période offerte' : 'Prochaine échéance', ab.annulation_prevue ? 'fin de l’abonnement' : 'renouvellement automatique') + kpi(fdate(ab.debut, { month: 'short', year: 'numeric' }), 'Client depuis', '') + '</div>'
      + '<div class="plans">' + card('standard') + card('premium') + '</div>'
      + '<div class="card" style="margin-top:18px"><h2>Résilier</h2><p class="m" style="font-size:14px">L’abonnement est sans engagement. En cas de résiliation, votre assistant continue de décrocher jusqu’à la fin de la période déjà payée, puis s’arrête. Vous pouvez annuler la résiliation tant qu’elle n’a pas pris effet.</p>' + (ab.annulation_prevue ? '<button class="b sm" data-act="reprendre" style="margin-top:12px">Annuler la résiliation</button>' : '<button class="b danger sm" data-act="resilier" style="margin-top:12px">Résilier mon abonnement</button>') + '</div></section>';
  }
  function paneFactures() {
    var f = D.factures || [], docs = D.documents || [];
    var lib = { paid: ['Payée', 'ok'], open: ['À payer', 'wait'], void: ['Annulée', ''], uncollectible: ['Impayée', 'ko'] };
    var base = [{ titre: 'Conditions générales de vente', type: 'Contrat', url: '/cgv' }, { titre: 'Politique de confidentialité et traitement des appels', type: 'RGPD', url: '/confidentialite' }, { titre: 'Mentions légales', type: 'Légal', url: '/mentions-legales' }];
    var all = docs.concat(base);
    return '<section class="pane" id="p-factures">' + head('Factures et documents', 'Téléchargez vos factures et retrouvez toutes vos pièces.')
      + '<div class="card"><h2>Factures</h2>' + (f.length ? '<div class="tw"><table><thead><tr><th>Numéro</th><th>Date</th><th>Période</th><th>Montant</th><th>Statut</th><th></th></tr></thead><tbody>' + f.map(function (x) { var l = lib[x.statut] || [x.statut, '']; return '<tr><td><strong>' + esc(x.numero) + '</strong></td><td>' + fdate(x.date) + '</td><td class="m">' + (x.periode ? fdate(x.periode.start, { day: 'numeric', month: 'short' }) + ' → ' + fdate(x.periode.end, { day: 'numeric', month: 'short', year: 'numeric' }) : '—') + '</td><td><strong>' + euro(x.montant) + '</strong></td><td><span class="bd ' + l[1] + '">' + l[0] + '</span></td><td style="white-space:nowrap">' + (x.pdf ? '<a class="b ghost sm" href="' + esc(x.pdf) + '" target="_blank" rel="noopener">Télécharger (PDF)</a> ' : '') + (x.lien ? '<a class="b ghost sm" href="' + esc(x.lien) + '" target="_blank" rel="noopener">' + (x.statut === 'open' ? 'Payer' : 'Voir') + '</a>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : vide('Aucune facture pour le moment', 'Vos factures apparaîtront ici à chaque échéance.')) + '</div>'
      + '<div class="card"><h2>Mes documents</h2><div class="tw"><table><thead><tr><th>Document</th><th>Type</th><th>Date</th><th></th></tr></thead><tbody>' + all.map(function (x) { return '<tr><td><strong>' + esc(x.titre) + '</strong></td><td><span class="bd">' + esc(x.type) + '</span></td><td>' + (x.date ? fdate(x.date) : '<span class="m">en vigueur</span>') + '</td><td><a class="b ghost sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">Ouvrir</a></td></tr>'; }).join('') + '</tbody></table></div><p class="m" style="margin-top:10px">Besoin d’un autre document (attestation, devis, bon d’installation) ? Écrivez à <a href="mailto:contact@tarrelo.com">contact@tarrelo.com</a>, il sera ajouté ici.</p></div></section>';
  }
  function paneCompte() {
    var c = D.client;
    return '<section class="pane" id="p-compte">' + head('Mon compte')
      + '<div class="two"><div class="card"><h2>Mes informations</h2><dl class="kv2"><dt>Nom</dt><dd>' + esc(c.nom || '—') + '</dd><dt>Entreprise</dt><dd>' + esc(c.entreprise || '—') + '</dd><dt>E-mail de connexion</dt><dd>' + esc(c.email) + '</dd><dt>Mobile pour les SMS</dt><dd>' + esc(c.telephone || '—') + '</dd><dt>Formule</dt><dd>' + (D.plan === 'premium' ? 'Premium' : D.plan === 'standard' ? 'Standard' : '—') + '</dd></dl><p class="m" style="margin-top:14px">Les réglages de votre assistant (horaires, prestations, voix, transfert, message d’accueil) se modifient dans <a href="#assistant">Mon assistant</a>.</p></div>'
      + '<div class="card"><h2>Sécurité</h2><p class="m" style="font-size:14px;margin-bottom:12px">Pour changer de mot de passe, recevez un lien sécurisé sur votre e-mail de connexion.</p><button class="b ghost" data-act="mdp">Changer mon mot de passe</button><div class="sep" style="height:1px;background:#F0E8DD;margin:18px 0"></div><button class="b danger" data-act="logout">Se déconnecter</button></div></div>'
      + '<div class="card"><h2>Support</h2><p style="font-size:14px">' + (premium() ? 'Formule Premium : <strong>réponse sous 24 h ouvrées</strong> garantie.' : 'Nous répondons au plus vite, du lundi au vendredi. Les clients Premium bénéficient d’une réponse sous 24 h ouvrées.') + '</p><p style="margin-top:10px"><a class="b ghost sm" href="mailto:contact@tarrelo.com">contact@tarrelo.com</a> <a class="b ghost sm" href="tel:+33978466369">09 78 46 63 69</a></p></div></section>';
  }

  // ---------- Mon assistant (mise en route + personnalisation) ----------
  var A = null, OPEN = null, FIRST = true;
  var ETAPES_TXT = {
    entreprise: 'Ce que votre assistant doit savoir pour répondre à vos clients.',
    assistant: 'Son prénom, sa voix et sa façon de se présenter.',
    rdv: 'Quand l’assistant peut proposer des rendez-vous, et où il les inscrit.',
    transfert: 'Le numéro vers lequel transférer les vraies urgences.',
    ligne: 'Votre numéro professionnel et le renvoi vers l’assistant.',
    test: 'Un appel de contrôle pour vérifier que tout fonctionne.'
  };
  function aPost(data) {
    if (DEMO) return Promise.resolve(demoSave(data));
    data.t = T; return post('ec/assistant', data);
  }
  function loadAssistant() {
    if (DEMO) { A = demoAssistant(DEMO); paintAssistant(); return; }
    post('ec/assistant', { t: T, action: 'lire' }).then(function (j) {
      if (j && j.auth === false) { logout(); return; }
      if (j && j.ok) { A = j; paintAssistant(); } else paintAssistant('Impossible de charger les réglages de votre assistant. Réessayez dans un instant.');
    }).catch(function () { paintAssistant('Connexion impossible. Réessayez dans un instant.'); });
  }
  function nbFaits() { return A ? A.etapes.filter(function (e) { return e.fait; }).length : 0; }
  function nbTot() { return A ? A.etapes.length : 6; }
  function paintAssistant(erreur) {
    stopVoix();
    var p = document.getElementById('p-assistant'); if (!p) return;
    if (erreur) { p.innerHTML = head('Mon assistant') + '<div class="card">' + vide('Réglages indisponibles', erreur) + '</div>'; return; }
    p.innerHTML = paneAssistantBody();
    var n = nbFaits(), em = document.querySelector('#ec-app a.nav[data-p="assistant"] em');
    if (em) em.remove();
    var nv = document.querySelector('#ec-app a.nav[data-p="assistant"]');
    if (nv && n < nbTot()) nv.insertAdjacentHTML('beforeend', '<em>' + n + '/' + nbTot() + '</em>');
    var tdb = document.querySelector('#p-tdb .top'), old = document.getElementById('ec-onb');
    if (old) old.remove();
    if (tdb && n < nbTot()) tdb.insertAdjacentHTML('afterend', '<div class="banner" id="ec-onb"><p><strong>Mise en route : ' + n + '/' + nbTot() + ' étapes.</strong> Terminez la configuration de votre assistant pour qu’il décroche à votre place.</p><button class="b" data-go="assistant">' + (n ? 'Continuer' : 'Commencer') + '</button></div>');
    if (FIRST) { FIRST = false; if (n < nbTot() && !location.hash) location.hash = 'assistant'; }
  }
  function fld(lbl, html, aide) { return '<label class="fld"><span>' + lbl + '</span>' + html + (aide ? '<small>' + aide + '</small>' : '') + '</label>'; }
  function inp(name, v, ph, type) { return '<input name="' + name + '" type="' + (type || 'text') + '" value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '">'; }
  function ta(name, v, ph, r) { return '<textarea name="' + name + '" rows="' + (r || 3) + '" placeholder="' + esc(ph || '') + '">' + esc(v || '') + '</textarea>'; }
  function sel(name, v, opts) { return '<select name="' + name + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
  function lisible(p) { var m = String(p || '').replace('+33', '0'); return m.replace(/(..)(?=.)/g, '$1 '); }
  function formEtape(id) {
    var c = A.config || {}, P = A.plan === 'premium';
    if (id === 'entreprise') return '<form data-sec="entreprise"><div class="fg">'
      + fld('Nom de l’entreprise *', inp('entreprise', c.entreprise, 'Plomberie Dupont'))
      + fld('Votre métier *', inp('metier', c.metier, 'Plombier chauffagiste'))
      + fld('Zone d’intervention', inp('zone', c.zone, 'Mantes-la-Jolie et 20 km autour'))
      + fld('Adresse (si vous recevez du public)', inp('adresse', c.adresse, '12 rue de la Gare, 78200 Mantes-la-Jolie'))
      + fld('Horaires', inp('horaires', c.horaires, 'Du lundi au vendredi, 8 h – 18 h'))
      + fld('Mobile pour recevoir les SMS récap', inp('mobile_sms', c.mobile_sms ? lisible(c.mobile_sms) : '', '06 12 34 56 78', 'tel'), 'Après chaque appel, vous recevez un SMS avec le résumé.')
      + '</div>' + fld('Prestations et services', ta('prestations', c.prestations, 'Dépannage, entretien de chaudière, remplacement de ballon d’eau chaude…', 3))
      + fld('Tarifs que l’assistant peut annoncer', ta('tarifs', c.tarifs, 'Déplacement 49 € dans la zone. Devis gratuit.', 2), 'Laissez vide si vous préférez que l’assistant ne parle jamais de prix.')
      + fld('Autres informations utiles', ta('infos', c.infos, 'Délais habituels, marques, moyens de paiement, ce qu’il ne faut pas promettre…', 4))
      + '<div class="fa"><button class="b">Enregistrer et continuer</button></div></form>';
    if (id === 'assistant') return '<form data-sec="assistant"><div class="fg">'
      + fld('Prénom de l’assistant *', inp('prenom', c.prenom, 'Léa'))
      + fld('Ton', sel('ton', c.ton || 'chaleureux', [['chaleureux', 'Chaleureux et proche'], ['professionnel', 'Professionnel et posé'], ['dynamique', 'Dynamique et souriant']]))
      + '</div>' + fld('Phrase d’accueil', ta('accueil', c.accueil, 'Laissez vide : « Bonjour, ' + (c.entreprise || 'votre entreprise') + ', je suis ' + (c.prenom || 'Léa') + ', l’assistante virtuelle. Que puis-je faire pour vous ? »', 2))
      + '<div class="fld"><span>Voix</span><div class="vx">' + A.voix.map(function (v) {
        return '<label class="v' + (v.ok ? '' : ' lk') + '"><input type="radio" name="voix" value="' + v.id + '"' + (c.voix === v.id ? ' checked' : '') + (v.ok ? '' : ' disabled') + '><span class="vn">' + esc(v.nom) + (v.plan === 'premium' ? ' <em>PREMIUM</em>' : '') + '</span><span class="m">' + esc(v.desc) + '</span>' + '<button type="button" class="b ghost sm" data-voix="' + v.id + '" data-ex="' + esc(v.ex || '') + '">▶ Écouter</button>' + '</label>';
      }).join('') + '</div>' + (P ? '' : '<small>Les 7 voix supplémentaires sont incluses dans Premium. <a href="#" data-act="upgrade">Passer en Premium</a></small>') + '</div>'
      + fld('Débit de parole' + (P ? '' : ' <em class="pk">PREMIUM</em>'), '<input type="range" name="vitesse" min="0.85" max="1.15" step="0.05" value="' + (c.vitesse || 1) + '"' + (P ? '' : ' disabled') + '>', 'Plus lent à gauche, plus rapide à droite.')
      + '<div class="fa"><button class="b">Enregistrer et continuer</button></div></form>';
    if (id === 'rdv') {
      var J = c.rdv_jours || [1, 2, 3, 4, 5], NJ = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      return '<form data-sec="rdv"><div class="fg">'
        + fld('Prise de rendez-vous', sel('rdv_actif', c.rdv_actif === false ? 'non' : 'oui', [['oui', 'L’assistant propose et réserve les créneaux'], ['non', 'L’assistant note seulement la demande']]))
        + fld('Durée d’un rendez-vous', sel('rdv_duree', String(c.rdv_duree || 60), [['15', '15 min'], ['30', '30 min'], ['45', '45 min'], ['60', '1 h'], ['90', '1 h 30'], ['120', '2 h']]))
        + '</div><div class="fld"><span>Jours où l’assistant peut proposer un rendez-vous</span><div class="jrs">' + NJ.map(function (n, i) { return '<label><input type="checkbox" name="rdv_jours" value="' + (i + 1) + '"' + (J.indexOf(i + 1) >= 0 ? ' checked' : '') + '><span>' + n + '</span></label>'; }).join('') + '</div></div><div class="fg">'
        + fld('De', inp('rdv_debut', c.rdv_debut || '08:00', '', 'time')) + fld('À', inp('rdv_fin', c.rdv_fin || '18:00', '', 'time'))
        + fld('Pause déjeuner (facultatif)', '<div class="dbl">' + inp('rdv_pause_debut', c.rdv_pause_debut || '', '', 'time') + inp('rdv_pause_fin', c.rdv_pause_fin || '', '', 'time') + '</div>')
        + fld('Délai minimum avant un rendez-vous', sel('rdv_delai', String(c.rdv_delai == null ? 2 : c.rdv_delai), [['0', 'Aucun'], ['1', '1 h'], ['2', '2 h'], ['4', '4 h'], ['24', '24 h'], ['48', '48 h']]))
        + '</div>' + fld('E-mail de votre agenda', inp('agenda_email', c.agenda_email || (D.client || {}).email || '', 'vous@gmail.com', 'email'), 'Chaque rendez-vous y arrive sous forme d’invitation : un clic sur « Accepter » et il est dans votre agenda (Google, Outlook, Apple).')
        + (P ? fld('Lien de votre calendrier <em class="pk">PREMIUM</em>', inp('agenda_ics', c.agenda_ics || '', 'https://calendar.google.com/calendar/ical/…/basic.ics', 'url'), 'L’assistant lit votre agenda et ne propose que les créneaux réellement libres.') + '<details class="aide"><summary>Où trouver ce lien ?</summary><p><strong>Google Agenda</strong> : sur ordinateur, Paramètres → cliquez sur votre agenda à gauche → « Intégrer l’agenda » → copiez l’<em>Adresse secrète au format iCal</em>.</p><p><strong>Outlook</strong> : Paramètres → Calendrier → Calendriers partagés → « Publier un calendrier » → « Peut afficher toutes les informations » → copiez le lien <em>ICS</em>.</p><p><strong>Apple iCloud</strong> : app Calendrier → clic droit sur le calendrier → Partager → « Calendrier public » → copiez le lien (webcal://).</p><p class="m">Ce lien reste privé : seul votre assistant l’utilise pour vérifier vos disponibilités.</p></details>'
             : '<div class="lockbox"><strong>Synchronisation avec votre agenda <em class="pk">PREMIUM</em></strong><p class="m">Avec Premium, l’assistant lit votre agenda Google, Outlook ou Apple et ne propose que vos créneaux réellement libres.</p><a href="#" class="b sm" data-act="upgrade">Passer en Premium</a></div>')
        + '<div class="fa"><button class="b">Enregistrer et continuer</button></div></form>';
    }
    if (id === 'transfert') return '<form data-sec="transfert"><div class="fg">'
      + fld('Numéro de transfert', inp('transfert_num', c.transfert_num ? lisible(c.transfert_num) : '', '06 12 34 56 78', 'tel'), 'Votre mobile personnel ou celui de l’associé d’astreinte. Il doit être différent de votre ligne pro.')
      + fld('Quand transférer ?', sel('transfert_quand', c.transfert_quand || 'urgences', [['urgences', 'Uniquement les vraies urgences'], ['demande', 'Urgences et quand l’appelant le demande'], ['jamais', 'Jamais : prendre le message']]))
      + '</div>' + fld('Ce que vous considérez comme une urgence', ta('urgences', c.urgences, 'Fuite d’eau importante, plus de chauffage chez une personne âgée, porte claquée…', 3))
      + '<div class="fa"><button class="b">Enregistrer et continuer</button></div></form>';
    if (id === 'ligne') {
      var num = A.numero_assistant, nl = A.numero_lisible, nn = String(num || '').replace('+33', '0');
      var codes = num ? '<div class="codes"><h4>Activez le renvoi depuis votre ligne</h4><p class="m">Composez ces codes depuis le téléphone de votre ligne pro, puis appuyez sur Appeler.</p><table><tbody>'
        + '<tr><td><strong>Recommandé</strong> : si vous ne décrochez pas (après ~20 s)</td><td><code>**61*' + nn + '**20#</code></td></tr>'
        + '<tr><td>Si vous êtes déjà en ligne</td><td><code>**67*' + nn + '#</code></td></tr>'
        + '<tr><td>Si votre téléphone est éteint ou sans réseau</td><td><code>**62*' + nn + '#</code></td></tr>'
        + '<tr><td>Tous les appels, sans faire sonner votre téléphone</td><td><code>**21*' + nn + '#</code></td></tr>'
        + '<tr><td>Désactiver tous les renvois</td><td><code>##002#</code></td></tr></tbody></table>'
        + '<p class="m">Ligne fixe ou box : le renvoi s’active depuis votre espace opérateur ou avec les codes de votre opérateur. <a href="/ressources/renvoi-appel" target="_blank" rel="noopener">Guide pas à pas par opérateur</a>.</p></div>'
        : '<div class="warn">' + (c.ligne_pro ? 'Le numéro de votre assistant est en cours d’attribution. Il s’affichera ici avec les codes de renvoi à composer.' : 'Indiquez votre ligne pro : le numéro de votre assistant vous sera ensuite attribué.') + '</div>';
      return '<form data-sec="ligne">' + (num ? '<div class="nasst"><span class="m">Numéro de votre assistant</span><strong>' + esc(nl) + '</strong></div>' : '') + '<div class="fg">'
        + fld('Votre numéro professionnel *', inp('ligne_pro', c.ligne_pro ? lisible(c.ligne_pro) : '', '06 12 34 56 78 ou 01 23 45 67 89', 'tel'), 'Le numéro que vos clients appellent. Il ne change pas.')
        + fld('Type de ligne', sel('ligne_type', c.ligne_type || 'mobile', [['mobile', 'Mobile'], ['fixe', 'Fixe / box']]))
        + fld('Opérateur', sel('operateur', c.operateur || '', [['', 'Choisir…'], ['Orange', 'Orange / Sosh'], ['SFR', 'SFR / RED'], ['Bouygues', 'Bouygues Telecom / B&You'], ['Free', 'Free'], ['Autre', 'Autre']]))
        + '</div>' + codes + '<div class="fa"><button class="b">' + (num ? 'J’ai activé le renvoi' : 'Enregistrer') + '</button></div></form>';
    }
    if (id === 'test') {
      var dejaLigne = A.etapes.filter(function (e) { return e.id === 'ligne'; })[0].fait;
      return '<form data-sec="test"><ol class="ol"><li>Depuis un autre téléphone, appelez votre ligne pro' + (A.config.ligne_pro ? ' (' + esc(lisible(A.config.ligne_pro)) + ')' : '') + '.</li><li>Ne décrochez pas : votre assistant prend l’appel et se présente.</li><li>Faites une demande comme un client (rendez-vous, devis…), puis raccrochez.</li><li>Vous recevez le SMS récap et l’appel apparaît dans l’onglet Appels.</li></ol>'
        + (dejaLigne ? '' : '<p class="warn">Terminez d’abord l’étape « Votre ligne ».</p>')
        + '<p class="m">Un souci ? Appelez-nous au <a href="tel:+33978466369">09 78 46 63 69</a>, nous vérifions avec vous.</p><div class="fa"><button class="b"' + (dejaLigne ? '' : ' disabled') + '>Mon assistant a bien décroché</button></div></form>';
    }
    return '';
  }
  function paneKb() {
    var P = A.plan === 'premium', kb = A.kb || [];
    if (!P) return '<div class="card kbx"><h2>Connaissances <em class="pk">PREMIUM</em></h2><p>Avec Premium, votre assistant apprend votre site internet et vos documents (tarifs, catalogue, FAQ, conditions) pour répondre précisément à vos clients.</p><button class="b" data-act="upgrade">Passer en Premium</button></div>';
    return '<div class="card kbx"><h2>Connaissances</h2><p class="m">Votre assistant apprend ces sources et s’en sert pour répondre. Il n’invente rien de ce qui n’y figure pas. 10 sources maximum.</p>'
      + (kb.length ? '<ul class="kbl">' + kb.map(function (k) { return '<li><span class="bd">' + (k.type === 'url' ? 'Site' : 'Fichier') + '</span><strong>' + esc(k.name) + '</strong><span class="m">' + esc(k.source || '') + '</span><button class="b danger sm" data-kbdel="' + esc(k.id) + '">Retirer</button></li>'; }).join('') + '</ul>' : '<p class="vide" style="padding:14px">Aucune source pour l’instant.</p>')
      + '<div class="two"><form data-kb="url">' + fld('Ajouter une page de votre site', inp('url', A.config.site_web || '', 'https://www.monentreprise.fr/tarifs', 'url'), 'Une adresse par page (accueil, tarifs, FAQ…).') + '<button class="b ghost">Apprendre cette page</button></form>'
      + '<form data-kb="fichier">' + fld('Ajouter un document', '<input type="file" name="f" accept=".pdf,.docx,.txt,.md,.html,.epub">', 'PDF, Word ou texte, 8 Mo maximum.') + '<button class="b ghost">Apprendre ce document</button></form></div></div>';
  }
  function paneAssistantBody() {
    var n = nbFaits(), cur = OPEN || (A.etapes.filter(function (e) { return !e.fait; })[0] || {}).id;
    var steps = A.etapes.map(function (e, i) {
      var on = e.id === cur;
      return '<div class="stp' + (e.fait ? ' ok' : '') + (on ? ' open' : '') + '" data-s="' + e.id + '"><button type="button" class="sh" data-step="' + e.id + '"><span class="sn">' + (e.fait ? '✓' : i + 1) + '</span><span class="st"><strong>' + e.titre + '</strong><span class="m">' + ETAPES_TXT[e.id] + '</span></span><span class="se">' + (e.fait ? 'Fait · modifier' : (on ? '' : 'À faire')) + '</span></button>' + (on ? '<div class="sb">' + formEtape(e.id) + '</div>' : '') + '</div>';
    }).join('');
    var intro = n < A.etapes.length ? '<div class="onb"><div><h2>Mise en route de votre assistant</h2><p>' + A.etapes.length + ' étapes, une dizaine de minutes. Chaque enregistrement met votre assistant à jour immédiatement.</p></div><div class="pg"><div class="pgb"><span style="width:' + Math.round(n * 100 / A.etapes.length) + '%"></span></div><span>' + n + '/' + A.etapes.length + '</span></div></div>' : '<div class="okb">✓ Votre assistant est configuré et en service. Modifiez n’importe quel réglage ci-dessous : la mise à jour est immédiate.</div>';
    return head('Mon assistant', 'Personnalisez votre assistant vous-même, à tout moment.') + intro + '<div class="stps">' + steps + '</div>' + paneKb();
  }
  function formData(f) { var o = {}; Array.prototype.forEach.call(f.elements, function (el) { if (!el.name || el.disabled) return; if (el.type === 'radio' && !el.checked) return; if (el.type === 'checkbox') { o[el.name] = o[el.name] || []; if (el.checked) o[el.name].push(Number(el.value)); return; } o[el.name] = el.value; }); if (o.rdv_actif) o.rdv_actif = o.rdv_actif !== 'non'; return o; }
  function saveEtape(f) {
    var b = f.querySelector('button.b:not([type=button])'), sec = f.dataset.sec, lab = b.textContent;
    b.disabled = true; b.textContent = 'Mise à jour de l’assistant…';
    aPost({ action: 'enregistrer', section: sec, data: JSON.stringify(formData(f)) }).then(function (j) {
      if (j && j.auth === false) { logout(); return; }
      if (!j || !j.ok) { b.disabled = false; b.textContent = lab; if (j && j.premium) { ACT.upgrade(); return; } toast((j && j.error) || 'Enregistrement impossible, réessayez.', true); return; }
      A = j; var nx = A.etapes.filter(function (e) { return !e.fait; })[0];
      OPEN = sec === 'ligne' && !A.numero_assistant ? 'ligne' : (nx ? nx.id : null);
      paintAssistant(); toast(j.message || 'Enregistré.');
      var o = document.querySelector('#p-assistant .stp.open'); if (o) o.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () { b.disabled = false; b.textContent = lab; toast('Connexion impossible. Réessayez.', true); });
  }
  function kbDone(b, lab) { return function (j) { if (b) { b.disabled = false; b.textContent = lab; } if (j && j.auth === false) { logout(); return; } if (!j || !j.ok) { if (j && j.premium) { ACT.upgrade(); return; } toast((j && j.error) || 'Opération impossible.', true); return; } A.kb = j.kb; paintAssistant(); toast(j.message); }; }
  function saveKb(f) {
    var b = f.querySelector('button'), lab = b.textContent;
    if (f.dataset.kb === 'url') { var u = f.url.value.trim(); if (!u) return; b.disabled = true; b.textContent = 'Lecture de la page…'; aPost({ action: 'kb_url', url: u }).then(kbDone(b, lab)).catch(function () { kbDone(b, lab)(null); }); return; }
    var file = f.f.files[0]; if (!file) { toast('Choisissez un fichier.', true); return; }
    if (file.size > 8 * 1024 * 1024) { toast('Fichier trop lourd (8 Mo maximum).', true); return; }
    b.disabled = true; b.textContent = 'Lecture du document…';
    var r = new FileReader();
    r.onload = function () { var s = String(r.result), i = s.indexOf(','); aPost({ action: 'kb_fichier', nom: file.name, mime: file.type || 'application/octet-stream', fichier: s.slice(i + 1) }).then(kbDone(b, lab)).catch(function () { kbDone(b, lab)(null); }); };
    r.readAsDataURL(file);
  }

  // Une seule lecture à la fois ; la voix lit la phrase d'accueil saisie
  var LECTEUR = null, BTN = null, CACHE = {};
  function stopVoix() { if (LECTEUR) { LECTEUR.pause(); LECTEUR = null; } if (BTN) { BTN.textContent = '▶ Écouter'; BTN.classList.remove('on'); BTN = null; } }
  function texteAccueil() {
    var f = document.querySelector('#p-assistant form[data-sec="assistant"]'), c = (A && A.config) || {};
    var t = f && f.accueil ? f.accueil.value.trim() : '';
    if (t) return t;
    var pr = (f && f.prenom && f.prenom.value.trim()) || c.prenom || 'Léa';
    return 'Bonjour, ' + (c.entreprise || 'bienvenue') + ', je suis ' + pr + ', votre assistant virtuel. Que puis-je faire pour vous ?';
  }
  function ecouterVoix(b) {
    var meme = BTN === b; stopVoix(); if (meme) return;
    var f = document.querySelector('#p-assistant form[data-sec="assistant"]');
    var vit = f && f.vitesse && !f.vitesse.disabled ? f.vitesse.value : 1;
    var txt = texteAccueil(), cle = b.dataset.voix + '|' + vit + '|' + txt;
    BTN = b; b.classList.add('on'); b.textContent = '… Préparation';
    var jouer = function (src) { if (BTN !== b) return; var a = new Audio(src); LECTEUR = a; b.textContent = '■ Arrêter'; a.addEventListener('ended', function () { if (LECTEUR === a) stopVoix(); }); a.play().catch(function () { stopVoix(); }); };
    if (DEMO) { if (b.dataset.ex) jouer(b.dataset.ex); else { stopVoix(); toast('Aperçu : la voix lirait votre phrase d’accueil.'); } return; }
    if (CACHE[cle]) { jouer(CACHE[cle]); return; }
    var p = new URLSearchParams(); p.append('t', T); p.append('voix', b.dataset.voix); p.append('texte', txt); p.append('vitesse', vit);
    fetch(API + 'ec/apercu-voix', { method: 'POST', body: p }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) { CACHE[cle] = URL.createObjectURL(bl); jouer(CACHE[cle]); }).catch(function () { if (b.dataset.ex) jouer(b.dataset.ex); else { stopVoix(); toast('Lecture indisponible, réessayez.', true); } });
  }
  function bindAssistant(app) {
    app.addEventListener('submit', function (e) {
      var f = e.target; if (!f.closest('#p-assistant')) return; e.preventDefault();
      if (f.dataset.sec) saveEtape(f); else if (f.dataset.kb) saveKb(f);
    });
    app.addEventListener('click', function (e) {
      var s = e.target.closest('[data-step]'); if (s) { e.preventDefault(); OPEN = s.closest('.stp').classList.contains('open') ? '__' : s.dataset.step; paintAssistant(); return; }
      var x = e.target.closest('[data-voix]'); if (x) { e.preventDefault(); ecouterVoix(x); return; }
      var k = e.target.closest('[data-kbdel]'); if (k) { e.preventDefault(); modal('<h3>Retirer cette source ?</h3><p>Votre assistant ne s’en servira plus pour répondre.</p>', function (done) { aPost({ action: 'kb_supprimer', id: k.dataset.kbdel }).then(function (j) { done(); kbDone(null)(j); }).catch(function () { done('Connexion impossible.'); }); }, 'Retirer', true); }
    });
  }
  function demoAssistant(plan) {
    var V = [['MNKK2Wl2wbbsEPQTHZGt', 'Koraly', 'f', 'Posée et crédible', 'standard'], ['5Qfm4RqcAer0xoyWtoHC', 'Maxime', 'm', 'Jeune et décontracté', 'standard'], ['YxrwjAKoUKULGd0g8K9Y', 'Lucie', 'f', 'Empathique, relation client', 'premium'], ['fBpCO0Kf0krKLYGOu65w', 'Émilie', 'f', 'Conseillère, souriante', 'premium'], ['lvQdCgwZfBuOzxyV5pxu', 'Audia', 'f', 'Accueil client naturel', 'premium'], ['WQKwBV2Uzw1gSGr69N8I', 'Mylène', 'f', 'Spontanée et chaleureuse', 'premium'], ['3C1zYzXNXNzrB66ON8rj', 'Jade', 'f', 'Claire et structurée', 'premium'], ['IbbR6Av0dWuQJS0b8JVT', 'Hugo', 'm', 'Chaleureux et posé', 'premium'], ['NyxenPOqNyllHIzSoPbJ', 'Théo', 'm', 'Doux et proche', 'premium'], ['eOwAMwUJEGkP44SKOXIH', 'Julien', 'm', 'Calme, service client', 'premium']];
    return { ok: true, plan: plan, config: { entreprise: 'Plomberie Dupont', metier: 'Plombier chauffagiste', zone: 'Mantes-la-Jolie et 20 km autour', mobile_sms: '+33612345678', prenom: 'Léa', ton: 'chaleureux', voix: 'MNKK2Wl2wbbsEPQTHZGt', vitesse: 1, transfert_quand: 'urgences', ligne_type: 'mobile', faites: ['entreprise'], rdv_actif: true, rdv_duree: 60, rdv_jours: [1, 2, 3, 4, 5], rdv_debut: '08:00', rdv_fin: '18:00', rdv_delai: 2, agenda_email: 'contact@exemple.fr' }, kb: plan === 'premium' ? [{ id: 'demo1', name: 'plomberie-dupont.fr', type: 'url', source: 'https://plomberie-dupont.fr' }] : [], numero_assistant: '+33159000000', numero_lisible: '01 59 00 00 00', agent: true, etapes: [{ id: 'entreprise', titre: 'Votre entreprise', fait: true }, { id: 'assistant', titre: 'Votre assistant', fait: false }, { id: 'rdv', titre: 'Rendez-vous et agenda', fait: false }, { id: 'transfert', titre: 'Urgences et transfert', fait: false }, { id: 'ligne', titre: 'Votre ligne', fait: false }, { id: 'test', titre: 'Premier appel test', fait: false }], voix: V.map(function (v) { return { id: v[0], nom: v[1], genre: v[2], desc: v[3], plan: v[4], ex: '', ok: plan === 'premium' || v[4] === 'standard' }; }) };
  }
  function demoSave(d) {
    if (d.action === 'enregistrer') { A.etapes.forEach(function (e) { if (e.id === d.section) e.fait = true; }); var o = JSON.parse(d.data || '{}'); Object.keys(o).forEach(function (k) { A.config[k] = o[k]; }); return Object.assign({}, A, { message: 'Aperçu : votre assistant serait mis à jour immédiatement.' }); }
    if (d.action === 'kb_supprimer') return { ok: true, kb: A.kb.filter(function (k) { return k.id !== d.id; }), message: 'Aperçu : source retirée.' };
    return { ok: true, kb: A.kb.concat([{ id: 'demo' + Date.now(), name: d.nom || d.url, type: d.url ? 'url' : 'file', source: d.url || d.nom }]), message: 'Aperçu : votre assistant apprendrait cette source.' };
  }

  // ---------- Interactions ----------
  function go(id) {
    var ok = ['tdb', 'assistant', 'appels', 'rdv', 'dossiers', 'commandes', 'stats', 'abonnement', 'factures', 'compte'];
    if (ok.indexOf(id) < 0) id = 'tdb';
    document.querySelectorAll('#ec-app a.nav').forEach(function (a) { a.classList.toggle('on', a.dataset.p === id); });
    var sh = document.querySelector('#ec-app .sheet'); if (sh && !sh.hidden) { sh.hidden = true; document.body.classList.remove('ec-lock'); }
    document.querySelectorAll('#ec-app section.pane').forEach(function (p) { p.classList.toggle('on', p.id === 'p-' + id); });
    window.scrollTo(0, 0);
    if (typeof stopVoix === 'function') stopVoix();
  }
  function filterTable(id) {
    var t = document.getElementById(id); if (!t) return;
    var q = (document.querySelector('[data-filter="' + id + '"]') || {}).value || '';
    q = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var fm = (document.querySelector('[data-fm="' + id + '"]') || {}).value || '', fs = (document.querySelector('[data-fs="' + id + '"]') || {}).value || '', fp = Number((document.querySelector('[data-fp="' + id + '"]') || {}).value || 0);
    var n = 0;
    t.querySelectorAll('tbody tr').forEach(function (r) {
      var ok = r.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(q) > -1;
      if (ok && fm) ok = r.dataset.m === fm;
      if (ok && fs) ok = r.dataset.s === fs;
      if (ok && fp) ok = since(r.dataset.q, fp);
      r.style.display = ok ? '' : 'none'; if (ok) n++;
    });
    var c = document.querySelector('[data-count="' + id + '"]'); if (c) c.textContent = n + ' élément' + (n > 1 ? 's' : '');
  }
  function toast(m, ko) { var t = document.createElement('div'); t.className = 'toast' + (ko ? ' ko' : ''); t.setAttribute('role', 'status'); t.textContent = m; document.getElementById('ec-app').appendChild(t); setTimeout(function () { t.remove(); }, 5200); }
  function modal(html, onOk, okLabel, danger) {
    var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="mb">' + html + '<p class="err" hidden></p><div class="row"><button class="b ghost" data-x>Annuler</button>' + (onOk ? '<button class="b' + (danger ? ' danger' : '') + '" data-ok>' + okLabel + '</button>' : '') + '</div></div>';
    document.getElementById('ec-app').appendChild(m);
    var close = function () { m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m || e.target.hasAttribute('data-x')) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    var ok = m.querySelector('[data-ok]');
    if (ok) ok.addEventListener('click', function () { ok.disabled = true; ok.textContent = 'Un instant…'; onOk(function (err) { if (err) { var e = m.querySelector('.err'); e.hidden = false; e.textContent = err; ok.disabled = false; ok.textContent = okLabel; } else close(); }); });
    var f = m.querySelector('[data-ok]') || m.querySelector('[data-x]'); if (f) f.focus();
  }
  function abo(action, done, msg) {
    if (DEMO) { done(); toast('Aperçu : aucune modification réelle.'); return; }
    post('ec/abonnement', { t: T, action: action }).then(function (j) {
      if (j && j.auth === false) { logout(); return; }
      if (!j || !j.ok) { done((j && j.error) || 'L’opération n’a pas abouti. Réessayez.'); return; }
      if (j.url) { window.location.href = j.url; return; }
      done(); refresh(j.message || msg);
    }).catch(function () { done('Connexion impossible. Réessayez dans un instant.'); });
  }
  var ACT = {
    logout: function () { logout(); },
    menu: function (el) { var sh = document.querySelector('#ec-app .sheet'); if (!sh) return; var open = sh.hidden; sh.hidden = !open; if (el) el.setAttribute('aria-expanded', open ? 'true' : 'false'); document.body.classList.toggle('ec-lock', open); },
    upgrade: function () {
      if (premium()) { go('abonnement'); return; }
      if (!D.abonnement) { location.href = '/tarifs'; return; }
      var diff = PRIX.premium - PRIX.standard;
      modal('<h3>Passer en Premium</h3><p>Votre nouvelle mensualité : <strong>' + euro(prixNet('premium')) + ' /mois</strong> (+' + euro(diff) + '). Le changement est immédiat ; la différence au prorata de la période en cours est facturée aujourd’hui sur votre carte enregistrée.</p>'  + '<p style="margin:0 0 6px;color:#14213D;font-weight:700">Vous débloquez immédiatement :</p><ul class="feat">' + PREM.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p class="m" style="margin-top:12px">Sans engagement : vous pouvez revenir en Standard à tout moment depuis cet espace.</p>', function (done) { abo('premium', done); }, 'Confirmer le passage en Premium');
    },
    downgrade: function () {
      modal('<h3>Passer en Standard ?</h3><p>Votre mensualité passe à <strong>' + euro(prixNet('standard')) + ' /mois</strong>. Le trop-perçu de la période en cours sera déduit de votre prochaine facture.</p><p>Vous perdrez l’accès à :</p><ul class="feat"><li class="no">Écoute des enregistrements et transcriptions</li><li class="no">Récaps par e-mail</li><li class="no">Dossiers clients, commandes et statistiques détaillées</li><li class="no">Synchronisation agenda, voix personnalisée, appels sortants</li></ul>', function (done) { abo('standard', done); }, 'Confirmer le passage en Standard', true);
    },
    resilier: function () {
      var ab = D.abonnement || {};
      modal('<h3>Résilier votre abonnement ?</h3><p>Votre assistant continuera de décrocher jusqu’au <strong>' + fdate(ab.fin_periode) + '</strong>, puis vos appels ne seront plus pris en charge. Pensez à désactiver le renvoi d’appel sur votre ligne à cette date.</p>' + (ab.remise ? '<p><strong>Attention :</strong> votre remise « ' + esc(ab.remise_nom || 'à vie') + ' » sera définitivement perdue.</p>' : '') + (ab.formule === 'premium' ? '<p>Vous pouvez aussi simplement <a href="#" data-act="downgrade">passer en Standard</a> pour payer moins.</p>' : '') + '<p class="m">Vous pourrez annuler la résiliation jusqu’à cette date.</p>', function (done) { abo('resilier', done); }, 'Confirmer la résiliation', true);
    },
    reprendre: function (el) { if (el) el.disabled = true; abo('reprendre', function (e) { if (e) toast(e, true); }); },
    portail: function (el) { if (el) { el.disabled = true; el.textContent = 'Ouverture…'; } abo('portail', function (e) { if (e) toast(e, true); if (el) { el.disabled = false; el.textContent = 'Moyen de paiement'; } }); },
    mdp: function (el) { if (DEMO) { toast('Aperçu : aucun e-mail envoyé.'); return; } el.disabled = true; post('compte/oubli', { email: D.client.email }).catch(function () {}).then(function () { toast('Un lien pour choisir un nouveau mot de passe vient d’être envoyé à ' + D.client.email + '.'); el.disabled = false; }); },
    csv: function () {
      var rows = [['Date', 'Appelant', 'Numéro', 'Motif', 'Urgent', 'Rendez-vous', 'Durée (s)', 'Statut', 'Résumé']].concat((D.appels || []).map(function (x) { return [fdt(x.quand), x.nom, x.appelant, (MOTIFS[x.motif] || MOTIFS.autre)[0], x.urgent ? 'oui' : 'non', x.rdv, x.duree_s, STATUTS[x.statut] || x.statut, x.resume]; }));
      var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'appels-tarrelo.csv'; a.click();
    }
  };
  function bind() {
    var app = document.getElementById('ec-app');
    if (app.dataset.b) return; app.dataset.b = '1';
    bindAssistant(app);
    app.addEventListener('click', function (e) {
      var a = e.target.closest('[data-act]');
      if (a) { e.preventDefault(); var m = document.querySelector('#ec-app .modal'); if (m && a.dataset.act !== 'upgrade' && !a.closest('.modal')) m.remove(); if (m && a.closest('.modal')) m.remove(); ACT[a.dataset.act] && ACT[a.dataset.act](a); return; }
      if (e.target.classList && e.target.classList.contains('sheet')) { ACT.menu(); return; }
      var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); location.hash = g.dataset.go; return; }
      var au = e.target.closest('[data-audio]');
      if (au && au.dataset.audio === 'demo') { toast('Aperçu : ici, vous écoutez l’enregistrement réel de chaque appel.'); return; }
      var dla = e.target.closest('a[href^="demo"]'); if (dla) { e.preventDefault(); toast('Aperçu : téléchargement de l’enregistrement en MP3.'); return; }
      if (au) { var el = document.createElement('audio'); el.controls = true; el.preload = 'auto'; el.src = au.dataset.audio; el.addEventListener('error', function () { toast('Enregistrement indisponible pour le moment.', true); }); document.querySelectorAll('#ec-app audio').forEach(function (o) { o.pause(); }); el.addEventListener('play', function () { document.querySelectorAll('#ec-app audio').forEach(function (o) { if (o !== el) o.pause(); }); }); au.replaceWith(el); el.play().catch(function () {}); }
    });
    app.addEventListener('input', function (e) { var id = e.target.dataset.filter; if (id) filterTable(id); });
    app.addEventListener('change', function (e) {
      var t = e.target, id = t.dataset.fm || t.dataset.fs || t.dataset.fp; if (id) { filterTable(id); return; }
      if (t.dataset.statut) {
        var call = (D.appels || []).filter(function (x) { return String(x.id) === t.dataset.statut; })[0];
        if (call) call.statut = t.value;
        var tr = t.closest('tr'); if (tr) tr.dataset.s = t.value;
        if (DEMO) { toast('Statut mis à jour (aperçu).'); return; }
        post('ec/appel', { t: T, id: t.dataset.statut, statut: t.value }).then(function (j) { toast(j && j.ok ? 'Statut mis à jour.' : 'Mise à jour impossible, réessayez.', !(j && j.ok)); });
      }
    });
  }
  window.addEventListener('hashchange', function () { if (D) go(location.hash.slice(1)); });

  // ---------- Aperçu (données fictives) ----------
  function demoData(plan) {
    var now = Date.now(), H = 3600e3;
    var noms = ['M. Martin', 'Mme Bernard', 'SCI Les Tilleuls', 'M. Petit', 'Mme Durand', 'M. Leroy', 'Mme Moreau', '', 'M. Fournier', 'Mme Girard'];
    var mot = ['rdv', 'devis', 'urgence', 'information', 'rdv', 'devis', 'commande', 'autre', 'rdv', 'rappel'];
    var res = { rdv: 'Souhaite un rendez-vous pour l’entretien annuel de sa chaudière. Disponible en semaine après 17 h.', devis: 'Demande un devis pour le remplacement d’un ballon d’eau chaude de 200 L, maison à Mantes-la-Jolie.', urgence: 'Fuite importante sous l’évier, eau coupée au compteur. Demande une intervention rapide.', information: 'Demande les horaires d’ouverture et si vous intervenez à Poissy.', commande: 'Commande deux mitigeurs thermostatiques, retrait en magasin vendredi.', autre: 'Démarchage commercial, aucune suite à donner.', rappel: 'Rappelle au sujet du devis envoyé la semaine dernière, souhaite être recontacté.' };
    var appels = [];
    for (var i = 0; i < 46; i++) { var m = mot[i % 10], q = new Date(now - (i * 15.5 + (i % 3) * 4) * H); appels.push({ id: i + 1, quand: q.toISOString(), appelant: '06 1' + (i % 10) + ' 4' + (i % 7) + ' 2' + (i % 5) + ' 8' + (i % 9), nom: noms[i % 10], motif: m, resume: res[m], rdv: m === 'rdv' ? ['Mardi 14 h', 'Jeudi matin', 'Lundi 17 h 30'][i % 3] : '', urgent: m === 'urgence', duree_s: 70 + (i * 37) % 240, statut: i < 3 ? 'a_rappeler' : (i < 6 ? 'nouveau' : 'traite'), audio: plan === 'premium' ? 'demo' : undefined, transcript: plan === 'premium' ? 'Assistant : Bonjour, Plomberie Dupont, je suis Léa, l’assistante virtuelle. Que puis-je faire pour vous ?\nAppelant : Bonjour, ' + res[m].toLowerCase() + '\nAssistant : Très bien, je note votre demande. Pouvez-vous me donner votre nom et votre adresse ?' : undefined }); }
    return { ok: true, plan: plan, client: { email: 'contact@exemple.fr', nom: 'Jean Dupont', entreprise: 'Plomberie Dupont', telephone: '06 12 34 56 78', assistant_branche: true, carte: true }, abonnement: { id: 'sub_demo', statut: 'active', statut_lib: 'Actif', formule: plan, prix_base: PRIX[plan], remise: 2000, remise_nom: 'Black Friday −20 €/mois à vie', prix_net: PRIX[plan] - 2000, fin_periode: Math.round(now / 1000) + 18 * 86400, annulation_prevue: false, debut: Math.round(now / 1000) - 60 * 86400 }, factures: [{ numero: 'A1B2C3-0002', date: Math.round(now / 1000) - 12 * 86400, montant: PRIX[plan] - 2000, statut: 'paid', pdf: '', lien: '', periode: { start: Math.round(now / 1000) - 12 * 86400, end: Math.round(now / 1000) + 18 * 86400 } }, { numero: 'A1B2C3-0001', date: Math.round(now / 1000) - 42 * 86400, montant: 0, statut: 'paid', pdf: '', lien: '', periode: null }], documents: [{ titre: 'Récapitulatif d’installation', type: 'Installation', url: '/cgv', date: new Date(now - 58 * 864e5).toISOString() }], appels: appels };
  }

  // ---------- Démarrage ----------
  document.addEventListener('DOMContentLoaded', function () {
    var app = document.createElement('div'); app.id = 'ec-app'; document.body.appendChild(app);
    initLogin();
    var q = new URLSearchParams(location.search);
    if (q.get('apercu') === 'premium' || q.get('apercu') === 'standard') { DEMO = q.get('apercu'); start(); return; }
    T = load(KEY);
    if (T) start();
  });
})();
