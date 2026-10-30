/* SAZ v2 — menu, lite video embeds, release viewer, filters */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header on home: go solid after the hero
  const top = $('.top');
  if (document.body.classList.contains('home') && top) {
    const onScroll = () => top.classList.toggle('solid', scrollY > innerHeight * 0.6);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // menu
  const btn = $('.menu-btn'), menu = $('#menu');
  const setMenu = open => {
    menu.hidden = !open; btn.setAttribute('aria-expanded', open); btn.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    if (open) $('a', menu)?.focus();
  };
  btn?.addEventListener('click', () => setMenu(menu.hidden));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { setMenu(false); btn.focus(); } });

  // lite youtube
  const ytFrame = id => `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  document.addEventListener('click', e => {
    const lite = e.target.closest('.lite');
    if (lite && !lite.querySelector('iframe')) { lite.insertAdjacentHTML('beforeend', ytFrame(lite.dataset.yt)); }
  });

  // album "play here"
  $$('.play-here').forEach(b => b.addEventListener('click', () => {
    const slot = b.closest('.album-copy').querySelector('.embed-slot');
    if (slot.innerHTML) { slot.innerHTML = ''; b.textContent = 'Play here'; return; }
    const e = JSON.parse(b.dataset.embed);
    slot.innerHTML = playerHTML(e, b.dataset.title);
    b.textContent = 'Hide player';
  }));

  function playerHTML(e, title = '') {
    if (e.type === 'yt') return `<div class="video">${ytFrame(e.id).replace('autoplay=1&', '')}</div>`;
    if (e.type === 'vimeo') return `<div class="video"><iframe src="https://player.vimeo.com/video/${e.id}?title=0&byline=0&portrait=0&color=f2b880" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Vimeo video"></iframe></div>`;
    const t = String(title).replace(/"/g, '&quot;');
    return `<iframe class="player player-${e.type}" src="${e.src}" height="${e.h}" title="${t || 'Player'}" allow="autoplay; encrypted-media; clipboard-write" sandbox="allow-same-origin allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  }

  // filters
  $$('.filters').forEach(f => {
    const grid = f.closest('main').querySelector('.grid');
    $$('.chip', f).forEach(c => c.addEventListener('click', () => {
      $$('.chip', f).forEach(x => x.setAttribute('aria-pressed', x === c));
      const k = c.dataset.filter;
      const run = () => $$('.tile', grid).forEach(t => t.hidden = !(k === 'all' || t.dataset.kind === k));
      (document.startViewTransition && !reduce) ? document.startViewTransition(run) : run();
    }));
    if (location.hash === '#videos') $('[data-filter=video]', f)?.click();
  });

  // viewer
  const dlg = $('.viewer');
  if (!dlg) return;
  const art = $('.viewer-art', dlg), info = $('.viewer-info', dlg), count = $('.v-count', dlg);
  let items = [], idx = 0, grid = null;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function visible() { return $$('.tile', grid).filter(t => !t.hidden).map(t => +t.dataset.i); }

  function render(i) {
    idx = i; const it = items[i];
    dlg.classList.toggle('is-video', it.k !== 'img');
    dlg.classList.toggle('is-bare', it.k === 'img' && !(it.title || it.credits || (it.embeds || []).length));
    if (it.k === 'img') {
      dlg.style.setProperty('--c', it.color || '#000');
      art.style.setProperty('--c', it.color || '#000');
      art.innerHTML = `<img src="${esc(it.src)}" data-remote="${esc(it.remote)}" alt="${esc(it.title || 'Release artwork')}" onerror="this.onerror=null;this.src=this.dataset.remote">`;
      info.innerHTML = (it.title ? `<h2 class="h-xl">${esc(it.title)}</h2>` : '')
        + (it.credits ? `<div class="credits">${it.credits}</div>` : '')
        + (it.embeds || []).map(e => playerHTML(e, it.title)).join('');
    } else {
      art.style.setProperty('--c', '#000');
      art.innerHTML = it.k === 'yt' ? `<div class="video">${ytFrame(it.id)}</div>` : playerHTML({ type: 'vimeo', id: it.id });
      info.innerHTML = '';
    }
    const vis = visible(); count.textContent = `${vis.indexOf(i) + 1} of ${vis.length}`;
  }
  function step(d) { const vis = visible(); const p = vis.indexOf(idx); render(vis[(p + d + vis.length) % vis.length]); }

  document.addEventListener('click', e => {
    const tile = e.target.closest('.tile[data-i]');
    if (!tile) return;
    grid = tile.closest('.grid');
    items = JSON.parse(document.getElementById(grid.dataset.items).textContent);
    const open = () => { render(+tile.dataset.i); dlg.showModal(); };
    const im = tile.querySelector('img');
    if (document.startViewTransition && !reduce && im && tile.dataset.kind === 'art') {
      im.style.viewTransitionName = 'cover';
      const vt = document.startViewTransition(() => { im.style.viewTransitionName = ''; open(); const a = art.querySelector('img'); if (a) a.style.viewTransitionName = 'cover'; });
      vt.finished.finally(() => { const a = art.querySelector('img'); if (a) a.style.viewTransitionName = ''; });
    } else open();
  });
  $('.v-prev', dlg).addEventListener('click', () => step(-1));
  $('.v-next', dlg).addEventListener('click', () => step(1));
  $('.v-close', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { art.innerHTML = ''; info.innerHTML = ''; });
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

  // contact form: open the visitor's mail app with the message filled in
  const form = $('#contact-form');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const body = `${d.get('message')}\n\n${d.get('name')} <${d.get('email')}>`;
    location.href = `mailto:deathbyleisure@gmail.com?subject=${encodeURIComponent('Message from ' + d.get('name'))}&body=${encodeURIComponent(body)}`;
    $('.form-note', form).textContent = 'Your email app should open with the message ready to send.';
  });
})();

// store: search + in-page BeatStars player
(() => {
  const q = document.getElementById('beat-q');
  if (!q) return;
  const rows = [...document.querySelectorAll('.beat')], empty = document.querySelector('.beats-empty'), count = document.getElementById('beat-count');
  q.addEventListener('input', () => {
    const terms = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    rows.forEach(r => { const ok = terms.every(t => r.dataset.search.includes(t)); r.hidden = !ok; shown += ok; });
    empty.hidden = shown > 0; count.textContent = shown;
  });
  const bar = document.getElementById('beat-player'), frame = bar.querySelector('iframe');
  document.addEventListener('click', e => {
    const b = e.target.closest('.beat-play');
    if (b) {
      document.querySelectorAll('.beat.is-playing').forEach(r => r.classList.remove('is-playing'));
      b.closest('.beat').classList.add('is-playing');
      frame.src = `https://www.beatstars.com/embed/track?id=${b.dataset.id}`;
      frame.title = `${b.dataset.title} on BeatStars`;
      bar.hidden = false; document.body.classList.add('has-player');
    }
    if (e.target.closest('.beat-player-close')) {
      frame.src = 'about:blank'; bar.hidden = true; document.body.classList.remove('has-player');
      document.querySelectorAll('.beat.is-playing').forEach(r => r.classList.remove('is-playing'));
    }
  });
})();

// homepage films selector
(() => {
  const film = document.querySelector('[data-film]');
  if (!film) return;
  const stage = film.querySelector('.film-stage');
  film.addEventListener('click', e => {
    const b = e.target.closest('.film-pick');
    if (!b) return;
    film.querySelectorAll('.film-pick').forEach(x => x.setAttribute('aria-pressed', x === b));
    stage.innerHTML = `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0" title="${b.querySelector('strong').textContent.replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    if (matchMedia('(max-width: 860px)').matches) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();


// light / dark theme
(() => {
  const btn = document.querySelector('.theme-btn'), meta = document.querySelector('meta[name="theme-color"]');
  if (!btn) return;
  const sync = () => {
    const light = document.documentElement.dataset.theme === 'light';
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    if (meta) meta.content = light ? '#eef1f5' : '#0f1626';
  };
  sync();
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => { document.documentElement.dataset.theme = next; sync(); };
    (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) ? document.startViewTransition(apply) : apply();
    try { localStorage.setItem('saz-theme', next); } catch (e) {}
  });
})();
