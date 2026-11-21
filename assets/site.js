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
