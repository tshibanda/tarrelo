/* Tarrelo — navigation : menu Métiers, menu mobile, page active */
(function () {
  var hd = document.querySelector('.site-hd');
  var ddBtn = document.querySelector('.navdd-btn');
  var dd = document.getElementById('ddp');
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mnav');

  function closeDd() { if (dd && !dd.hidden) { dd.hidden = true; ddBtn.setAttribute('aria-expanded', 'false'); } }
  function openDd() { dd.hidden = false; ddBtn.setAttribute('aria-expanded', 'true'); }
  function closeMenu() {
    if (mnav && !mnav.hidden) {
      mnav.hidden = true; burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu'); document.body.classList.remove('menu-open');
    }
  }
  function openMenu() {
    if (hd) mnav.style.setProperty('--hd-bottom', hd.getBoundingClientRect().bottom + 'px');
    mnav.hidden = false; burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fermer le menu'); document.body.classList.add('menu-open');
  }

  if (ddBtn && dd) {
    ddBtn.addEventListener('click', function (e) { e.stopPropagation(); dd.hidden ? openDd() : closeDd(); });
    dd.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  if (burger && mnav) {
    burger.addEventListener('click', function (e) { e.stopPropagation(); mnav.hidden ? openMenu() : closeMenu(); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  }
  // Clic ailleurs ou touche Échap : on ferme
  document.addEventListener('click', function () { closeDd(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (dd && !dd.hidden) { closeDd(); ddBtn.focus(); }
      if (mnav && !mnav.hidden) { closeMenu(); burger.focus(); }
    }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) closeMenu(); });

  // Ombre de l'en-tête au défilement
  function onScroll() { if (hd) hd.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Lien de la page en cours
  var path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.site-hd a[href^="/"]').forEach(function (a) {
    var h = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (h !== '/' && (path === h || path.indexOf(h + '/') === 0) && !a.classList.contains('btn')) a.setAttribute('aria-current', 'page');
  });
})();

/* Barre d'action mobile : n'apparaît qu'une fois le bouton principal du haut de page dépassé */
(function () {
  var bar = document.querySelector('.mcta');
  if (!bar) return;
  bar.classList.add('mcta-bar');
  var target = document.querySelector('#top .btn, main section:first-of-type .btn');
  if (!target || !('IntersectionObserver' in window)) return;
  bar.classList.add('is-hidden');
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { bar.classList.toggle('is-hidden', e.isIntersecting || e.boundingClientRect.top > 0); });
  }).observe(target);
})();

/* Mesure d'audience Tarrelo : sans cookie, anonyme (adresse IP jamais stockée) */
(function () {
  if (navigator.doNotTrack === '1' || /^(localhost|127\.)/.test(location.hostname)) return;
  function send(d) {
    var b = JSON.stringify(d);
    try { if (navigator.sendBeacon && navigator.sendBeacon('/api/h', b)) return; } catch (e) {}
    try { fetch('/api/h', { method: 'POST', body: b, keepalive: true }); } catch (e) {}
  }
  var q = new URLSearchParams(location.search);
  send({ t: 'v', p: location.pathname.replace(/\.html$/, '') || '/', r: document.referrer, w: window.innerWidth, s: q.get('utm_source') || '' });
  window.tarreloTrack = function (n) { send({ t: 'e', n: n, p: location.pathname.replace(/\.html$/, '') || '/' }); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (/^tel:/.test(h)) tarreloTrack('tel');
    else if (/buy\.stripe\.com/.test(h)) tarreloTrack('paiement');
    else if (/^\/tarifs/.test(h) && /essai|offert|mois/i.test(a.textContent)) tarreloTrack('cta_essai');
    else if (/^\/demo/.test(h)) tarreloTrack('cta_demo');
    else if (/^\/espace-client/.test(h)) tarreloTrack('espace_client');
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target, p = location.pathname;
    if (/demo/.test(p)) tarreloTrack('demo_envoyee');
    else if (/newsletter/.test(p)) tarreloTrack('newsletter');
    else if (/calculateur/.test(p)) tarreloTrack('calculateur');
    else if (/test-accueil/.test(p)) tarreloTrack('test_accueil');
  }, true);
})();

/* Effets premium : cartes lumineuses, apparition au défilement, téléphone flottant */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Cartes blanches à coins arrondis
  document.querySelectorAll('main [style*="background: #FFFFFF"], main .card').forEach(function (el) {
    var st = el.getAttribute('style') || '';
    if (/border-radius:\s*(1[2-9]|2\d)px/.test(st) || el.classList.contains('card')) el.classList.add('pc');
  });
  document.querySelectorAll('main [style*="border: 1px solid #E8DFD3"]').forEach(function (el) {
    var st = el.getAttribute('style') || '';
    if (/border-radius:\s*(1[2-9]|2\d)px/.test(st) && el.offsetWidth > 180) el.classList.add('pc');
  });
  // Téléphone de la page d'accueil
  document.querySelectorAll('main [style*="border-radius: 56px"]').forEach(function (p) { p.classList.add('phone'); if (p.parentElement) p.parentElement.classList.add('phone-wrap'); });
  // Lumière qui suit la souris
  if (!reduce) document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.pc'); if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  // Apparition progressive
  if (reduce || !('IntersectionObserver' in window)) return;
  var els = [];
  document.querySelectorAll('main section').forEach(function (sec, i) {
    if (i === 0) return;
    var w = sec.querySelector('.wrap') || sec;
    Array.prototype.slice.call(w.children, 0, 12).forEach(function (el, j) { el.style.setProperty('--d', Math.min(j, 6) * 0.07 + 's'); els.push(el); });
  });
  document.querySelectorAll('main .pc').forEach(function (el) { if (els.indexOf(el) < 0) els.push(el); });
  var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return; el.classList.add('rv'); io.observe(el); });
})();
