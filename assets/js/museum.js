/* SAZ museum: a walkable pixel-art gallery with a cinema. three.js r128 (global THREE). */
const initMuseum = () => {
  const wrap = document.getElementById('museum');
  if (!wrap) return;
  const data = JSON.parse(document.getElementById('museum-data').textContent);
  const $ = s => wrap.querySelector(s);
  const canvas = $('canvas'), startEl = $('.m-start'), label = $('.m-label'), panel = $('.m-panel'), chips = $('.m-rooms');
  const sitBtn = $('.m-sit'), cin = $('.m-cinema');

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); } catch (e) {}
  if (!renderer) { startEl.querySelector('.m-start-inner').innerHTML = '<h1 class="h-xl">museum</h1><p class="lede">Your browser could not start 3D graphics. You can see the same work in the <a href="gallery.html">gallery</a> and on the <a href="releases.html">releases</a> page.</p>'; return; }
  renderer.setPixelRatio(1);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const W = 10, H = 4.4, DOOR = 3, DOOR_H = 3, EYE = 1.65, SEAT_EYE = 1.2, FOV = 68;
  const BG = 0x12062b;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 22, 60);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120);
  camera.rotation.order = 'YXZ';

  // ---------- pixel texture helpers
  const PX = '"Silkscreen", "Courier New", monospace';
  function pix(t) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding; return t; }
  // crisp: snap text edges to hard pixels; under: paint a background beneath afterwards
  function cv(w, h, draw, crisp, under) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x, w, h);
    if (crisp) { const d = x.getImageData(0, 0, w, h), a = d.data; for (let i = 3; i < a.length; i += 4) a[i] = a[i] > 110 ? 255 : 0; x.putImageData(d, 0, 0); }
    if (under) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-over'; under(x, w, h); }
    return c;
  }
  const tex = (w, h, draw, crisp, under) => pix(new THREE.CanvasTexture(cv(w, h, draw, crisp, under)));
  const soft = t => { t.minFilter = THREE.LinearFilter; return t; };
  function lines(ctx, text, maxW) {
    const out = []; let line = '';
    for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  }
  const shade = (hex, k) => { const c = new THREE.Color(hex).multiplyScalar(k); c.r = Math.min(1, c.r); c.g = Math.min(1, c.g); c.b = Math.min(1, c.b); return '#' + c.getHexString(); };
  const signTex = (name, sub, colr) => soft(tex(176, 44, (c, w, h) => {
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = colr; c.font = `700 16px ${PX}`; c.fillText(name.toUpperCase(), w / 2, 15, w - 6);
    c.fillStyle = '#ffffff'; c.font = `400 8px ${PX}`; c.fillText(sub.toUpperCase(), w / 2, 35, w - 6);
  }, true));
  const plaqueTex = (title, colr) => (tex(64, 64, (c, w, h) => {
    c.fillStyle = '#1a0b33'; c.textBaseline = 'top'; c.font = `700 8px ${PX}`;
    lines(c, title.toUpperCase(), w - 8).slice(0, 4).forEach((l, i) => c.fillText(l, 5, 9 + i * 10));
    c.textAlign = 'center'; c.fillText('READ >', w / 2, h - 11);
  }, true, (c, w, h) => { c.fillStyle = colr; c.fillRect(0, 0, w, 4); c.fillRect(0, h - 14, w, 14); c.fillStyle = '#fff8e7'; c.fillRect(0, 0, w, h); }));
  const logoTex = () => tex(128, 50, (c, w, h) => {
    const svg = document.querySelector('.mark svg'), p = svg && svg.querySelector('path');
    c.fillStyle = '#ffffff';
    if (p) { const vb = svg.viewBox.baseVal, s = Math.min(w * 0.94 / vb.width, h * 0.94 / vb.height); c.translate((w - vb.width * s) / 2, (h - vb.height * s) / 2); c.scale(s, s); c.fill(new Path2D(p.getAttribute('d')), 'evenodd'); }
  }, true);
  const floorTex = (a, b) => tex(2, 2, c => { c.fillStyle = a; c.fillRect(0, 0, 2, 2); c.fillStyle = b; c.fillRect(0, 0, 1, 1); c.fillRect(1, 1, 1, 1); });
  const wallCanvas = (colr, trim) => cv(32, 32, (c, w, h) => {
    c.fillStyle = colr; c.fillRect(0, 0, w, h);
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 34; i++) { c.fillStyle = shade(colr, rnd() > 0.5 ? 1.07 : 0.92); c.fillRect(Math.floor(rnd() * 16) * 2, 3 + Math.floor(rnd() * 12) * 2, 2, 2); }
    c.fillStyle = trim; c.fillRect(0, 0, w, 2);
    c.fillStyle = shade(colr, 0.55); c.fillRect(0, h - 3, w, 3);
    c.fillStyle = shade(colr, 0.75); c.fillRect(0, h - 4, w, 1);
  });

  // ---------- build rooms
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), planeGeo = new THREE.PlaneGeometry(1, 1);
  const basic = c => new THREE.MeshBasicMaterial({ color: c });
  const pickables = [], rooms = [], dividers = [], blocks = [];
  function box(mat, w, h, d, x, y, z) { const m = new THREE.Mesh(boxGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); scene.add(m); return m; }
  function plane(mat, w, h, x, y, z, ry) { const m = new THREE.Mesh(planeGeo, mat); m.scale.set(w, h, 1); m.position.set(x, y, z); if (ry) m.rotation.y = ry; scene.add(m); return m; }
  const lampMat = basic(0xfffbe0);
  let cinema = null;

  let z = 0;
  data.rooms.forEach((r, ri) => {
    const wc = wallCanvas(r.color, r.trim);
    const wallMat = (len, k) => { const t = pix(new THREE.CanvasTexture(wc)); t.wrapS = THREE.RepeatWrapping; t.repeat.x = Math.max(1, Math.round(len / H)); const m = new THREE.MeshBasicMaterial({ map: t }); if (k) m.color.setScalar(k); return m; };
    const isCin = r.type === 'cinema';
    // columns of pictures: two small ones stacked, or one big one
    const cols = []; let pend = null;
    (r.items || []).forEach(it => {
      if (it.type !== 'img' || it.big) { pend = null; cols.push({ items: [it], w: it.big ? 2.9 : it.type === 'logo' ? 3.6 : 2.0 }); }
      else if (pend) { pend.items.push(it); pend = null; }
      else { pend = { items: [it], w: 1.75 }; cols.push(pend); }
    });
    const side = [1.5, 1.5];
    cols.forEach(c => { c.s = side[0] <= side[1] ? 0 : 1; c.off = side[c.s] + c.w / 2; side[c.s] += c.w; });
    const D = isCin ? 15 : Math.max(8, Math.max(side[0], side[1]) + 1.5);
    const z0 = z, z1 = z - D, zc = (z0 + z1) / 2;
    const ft = floorTex(r.floor[0], r.floor[1]); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(W / 2, Math.round(D) / 2);
    const fl = plane(new THREE.MeshBasicMaterial({ map: ft }), W, D, 0, 0, zc); fl.rotation.x = -Math.PI / 2;
    const ce = plane(basic(shade(r.color, 0.32)), W, D, 0, H, zc); ce.rotation.x = Math.PI / 2;
    box(wallMat(D), 0.3, H, D, -W / 2 - 0.15, H / 2, zc); box(wallMat(D), 0.3, H, D, W / 2 + 0.15, H / 2, zc);
    if (!isCin) for (let lz = z0 - 2; lz > z1 + 1; lz -= 3.5) box(lampMat, 1.2, 0.08, 1.2, 0, H - 0.04, lz);
    if (ri === 0) box(wallMat(W, 0.82), W, H, 0.3, 0, H / 2, z0 + 0.15);
    const last = ri === data.rooms.length - 1;
    if (last) box(wallMat(W, 0.82), W, H, 0.3, 0, H / 2, z1 - 0.15);
    else {
      const sw = (W - DOOR) / 2;
      box(wallMat(sw, 0.82), sw, H, 0.3, -(DOOR / 2 + sw / 2), H / 2, z1); box(wallMat(sw, 0.82), sw, H, 0.3, DOOR / 2 + sw / 2, H / 2, z1);
      box(basic(shade(r.color, 0.7)), DOOR, H - DOOR_H, 0.3, 0, DOOR_H + (H - DOOR_H) / 2, z1);
      const nx = data.rooms[ri + 1];
      plane(new THREE.MeshBasicMaterial({ map: signTex(nx.name, nx.years, nx.trim), transparent: true }), 4.4, 1.1, 0, DOOR_H + (H - DOOR_H) / 2, z1 + 0.16);
      dividers.push(z1);
    }
    const room = { ...r, z0, z1, i: ri, arts: [], loaded: false };
    const frameMat = basic(r.trim), backMat = basic(0x12062b);
    cols.forEach(c => c.items.forEach((it, k) => {
      const pair = c.items.length === 2, hgt = it.big ? 2.3 : it.type === 'text' ? 1.4 : pair ? 1.25 : 1.4;
      const y = it.big ? 2.0 : pair ? (k ? 1.3 : 2.85) : 1.85;
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: it.type === 'img' ? shade(r.color, 0.6) : 0xffffff });
      const pic = new THREE.Mesh(planeGeo, mat), fr = new THREE.Mesh(boxGeo, frameMat), bk = new THREE.Mesh(boxGeo, backMat);
      pic.position.z = 0.07; g.add(bk, fr, pic);
      const setSize = aspect => { let h = hgt, w = h * aspect; const mw = c.w - 0.35; if (w > mw) { w = mw; h = w / aspect; } pic.scale.set(w, h, 1); fr.scale.set(w + 0.16, h + 0.16, 0.1); bk.scale.set(w + 0.3, h + 0.3, 0.06); };
      setSize(it.type === 'logo' ? 2.56 : 1);
      g.position.set(c.s ? W / 2 - 0.01 : -W / 2 + 0.01, y, z0 - c.off); g.rotation.y = c.s ? -Math.PI / 2 : Math.PI / 2;
      scene.add(g);
      if (it.type === 'logo') { fr.visible = bk.visible = false; mat.map = logoTex(); mat.transparent = true; mat.needsUpdate = true; return; }
      pic.userData.item = it; pickables.push(pic);
      if (it.type === 'text') { mat.map = plaqueTex(it.title, r.trim); mat.needsUpdate = true; }
      else room.arts.push({ it, mat, setSize });
    }));
    if (isCin) {
      const sw = 7.6, sh = sw * 9 / 16, sy = 2.3;
      box(basic(r.trim), sw + 0.3, sh + 0.3, 0.1, 0, sy, z1 + 0.06);
      const st = tex(160, 90, (c, w, h) => {
        c.fillStyle = '#12062b'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `700 24px ${PX}`; c.fillText('SAZ CINEMA', w / 2, 34, w - 10);
        c.font = `400 8px ${PX}`; c.fillText('TAKE A SEAT TO WATCH', w / 2, 62);
      }, true, (c, w, h) => { c.fillStyle = '#fff8e7'; c.fillRect(0, 0, w, h); });
      const screen = plane(new THREE.MeshBasicMaterial({ map: st }), sw, sh, 0, sy, z1 + 0.12);
      const sit = { type: 'seat', title: 'Cinema' }; screen.userData.item = sit; pickables.push(screen);
      const seatMat = basic(0xff2e63), seatBack = basic(0xc2124a), arm = basic(0x2b0f4f);
      const rowsZ = [z1 + 6.6, z1 + 8.3, z1 + 10];
      rowsZ.forEach(rz => { for (let i = -2; i <= 2; i++) {
        const x = i * 1.15;
        const a = box(seatMat, 0.9, 0.5, 0.8, x, 0.25, rz), b = box(seatBack, 0.9, 1.05, 0.2, x, 0.72, rz + 0.5);
        box(arm, 0.14, 0.7, 0.8, x - 0.52, 0.35, rz); if (i === 2) box(arm, 0.14, 0.7, 0.8, x + 0.52, 0.35, rz);
        a.userData.item = b.userData.item = sit; pickables.push(a, b);
      } });
      for (let lz = z1 + 2; lz < z0 - 1; lz += 2) { box(basic(r.trim), 0.16, 0.06, 0.5, -W / 2 + 0.5, 0.03, lz); box(basic(r.trim), 0.16, 0.06, 0.5, W / 2 - 0.5, 0.03, lz); }
      blocks.push({ x0: -3.4, x1: 3.4, z0: rowsZ[0] - 0.9, z1: rowsZ[2] + 1.1 });
      cinema = { i: ri, seat: { x: 0, z: rowsZ[0] - 0.1 }, screenZ: z1 + 0.12, sw, sh, sy };
    }
    rooms.push(room); z = z1;
  });
  const zEnd = z;

  // ---------- lazy pixelated pictures
  function loadRoom(room) {
    if (!room || room.loaded) return; room.loaded = true;
    room.arts.forEach(a => {
      const im = new Image();
      im.onload = () => {
        const max = a.it.big ? 104 : 60, k = max / Math.max(im.width, im.height), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        try { x.filter = 'saturate(1.45) contrast(1.08)'; } catch (e) {}
        x.drawImage(im, 0, 0, w, h);
        a.mat.map = pix(new THREE.CanvasTexture(c)); a.mat.color.set(0xffffff); a.mat.needsUpdate = true; a.setSize(im.width / im.height);
      };
      im.src = a.it.src;
    });
  }

  // ---------- player
  const me = { x: 0, z: -1.4, y: EYE, yaw: 0, pitch: 0, fov: FOV }, keys = new Set();
  let glide = null, cur = -1, running = false, seated = false, joy = { x: 0, y: 0 }, baseFov = FOV;
  const roomAt = zz => rooms.findIndex(r => zz <= r.z0 && zz > r.z1);
  const inBlock = (x, zz) => blocks.some(b => x > b.x0 && x < b.x1 && zz > b.z0 && zz < b.z1);
  function move(dx, dz) {
    const lim = W / 2 - 0.7, dh = DOOR / 2 - 0.45;
    let nx = Math.max(-lim, Math.min(lim, me.x + dx)), nz = Math.max(zEnd + 0.7, Math.min(-0.7, me.z + dz));
    for (const d of dividers) {
      const near = Math.abs(nz - d) < 0.6, crossed = (me.z - d) * (nz - d) < 0;
      if (near || crossed) { if (Math.abs(me.x) > dh && Math.abs(me.z - d) >= 0.6) nz = me.z; else if (Math.abs(nz - d) < 0.6) nx = Math.max(-dh, Math.min(dh, nx)); }
    }
    if (!inBlock(me.x, me.z)) { if (inBlock(nx, me.z)) nx = me.x; if (inBlock(nx, nz)) nz = me.z; }
    me.x = nx; me.z = nz;
  }
  function setRoom(i) {
    if (i === cur || i < 0) return; cur = i;
    [...chips.children].forEach((c, k) => c.setAttribute('aria-pressed', k === i));
    loadRoom(rooms[i]); loadRoom(rooms[i + 1]); loadRoom(rooms[i - 1]);
    sitBtn.hidden = !(cinema && i === cinema.i) || seated;
  }

  // ---------- cinema
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const films = data.films || [], cinScreen = cin.querySelector('.m-cin-screen'), cinTitle = cin.querySelector('.m-cin-title'), cinList = cin.querySelector('.m-cin-list');
  let film = 0, sitTimer = null;
  const filmSrc = f => f.k === 'list' ? `https://www.youtube-nocookie.com/embed/videoseries?list=${f.id}&autoplay=1&rel=0`
    : f.k === 'vimeo' ? `https://player.vimeo.com/video/${f.id}?autoplay=1&title=0&byline=0&portrait=0&color=ff2e63`
    : `https://www.youtube-nocookie.com/embed/${f.id}?autoplay=1&rel=0`;
  const filmThumb = f => f.k === 'vimeo' ? `https://vumbnail.com/${f.id}.jpg` : f.k === 'list' ? '' : `https://i.ytimg.com/vi/${f.id}/mqdefault.jpg`;
  cinList.innerHTML = films.map((f, i) => `<button type="button" class="m-film" data-i="${i}" aria-pressed="false">${filmThumb(f) ? `<img src="${filmThumb(f)}" alt="" loading="lazy">` : '<span class="m-film-all">ALL</span>'}<span>${esc(f.title)}</span></button>`).join('');
  function play(i) {
    film = (i + films.length) % films.length; const f = films[film];
    cinScreen.innerHTML = `<iframe src="${filmSrc(f)}" title="${esc(f.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    cinTitle.textContent = f.title;
    [...cinList.children].forEach((b, k) => { b.setAttribute('aria-pressed', k === film); if (k === film) cinList.scrollLeft = b.offsetLeft - cinList.offsetLeft - (cinList.clientWidth - b.offsetWidth) / 2; });
  }
  cinList.addEventListener('click', e => { const b = e.target.closest('.m-film'); if (b) play(+b.dataset.i); });
  cin.querySelector('.m-cin-prev').addEventListener('click', () => play(film - 1));
  cin.querySelector('.m-cin-next').addEventListener('click', () => play(film + 1));
  function screenFov() {
    const d = cinema.seat.z - cinema.screenZ, v = 2 * Math.atan((cinema.sh / 2) / d), hz = 2 * Math.atan(((cinema.sw / 2) / d) / camera.aspect);
    return Math.max(v, hz) * 180 / Math.PI * 1.04;
  }
  function sit() {
    if (!cinema || seated) return;
    seated = true; closePanel(); keys.clear(); sitBtn.hidden = true; label.hidden = true; wrap.classList.add('is-seated');
    glide = { x: cinema.seat.x, z: cinema.seat.z, yaw: 0, y: SEAT_EYE, pitch: Math.atan((cinema.sy - SEAT_EYE) / (cinema.seat.z - cinema.screenZ)), fov: screenFov(), hold: true };
    clearTimeout(sitTimer);
    sitTimer = setTimeout(() => { if (!seated) return; cin.hidden = false; play(film); cin.querySelector('.m-stand').focus(); }, 1900);
  }
  function stand() {
    if (!seated) return;
    seated = false; clearTimeout(sitTimer); cin.hidden = true; cinScreen.innerHTML = ''; wrap.classList.remove('is-seated');
    glide = { x: 4.1, z: cinema.seat.z, yaw: 0, y: EYE, pitch: 0, fov: baseFov };
    sitBtn.hidden = false; canvas.focus();
  }
  sitBtn.addEventListener('click', sit);
  cin.querySelector('.m-stand').addEventListener('click', stand);

  // ---------- input
  const typing = () => /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
  addEventListener('keydown', e => {
    if (!running || typing()) return;
    if (e.key === 'Escape') { if (seated) stand(); else closePanel(); return; }
    if (seated) return;
    if ((e.key === 'Enter' || e.key === ' ') && cinema && cur === cinema.i && document.activeElement === canvas) { sit(); e.preventDefault(); return; }
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); if (k !== 'shift') glide = null; e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  let drag = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); ray.far = 13;
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.item : null;
  }
  const hint = it => it.type === 'seat' ? 'Click to sit down and watch' : it.type === 'text' ? `${it.title}: click to read` : `${it.title || 'Untitled'}: click to open`;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (seated) return;
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6) { me.yaw -= dx * 0.004; me.pitch = Math.max(-0.9, Math.min(0.9, me.pitch - dy * 0.003)); glide = null; }
    } else if (e.pointerType === 'mouse') {
      const it = pick(e); canvas.style.cursor = it ? 'pointer' : 'grab';
      label.textContent = it ? hint(it) : ''; label.hidden = !it;
    }
  });
  canvas.addEventListener('pointerup', e => { if (!seated && drag && drag.moved <= 6) { const it = pick(e); if (it) it.type === 'seat' ? sit() : openPanel(it); } drag = null; });
  canvas.addEventListener('pointercancel', () => drag = null);

  // joystick (touch)
  const stick = $('.m-joy'), knob = $('.m-joy i');
  let jid = null;
  const jmove = e => { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } joy = { x, y }; knob.style.transform = `translate(${Math.round(x * 28)}px, ${Math.round(y * 28)}px)`; glide = null; };
  stick.addEventListener('pointerdown', e => { jid = e.pointerId; stick.setPointerCapture(jid); jmove(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
  const jend = () => { jid = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; };
  stick.addEventListener('pointerup', jend); stick.addEventListener('pointercancel', jend);

  // room chips
  rooms.forEach(r => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = r.name; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { if (seated) return; glide = { x: 0, z: r.z0 - 1.4, yaw: 0, y: EYE, pitch: 0, fov: baseFov }; closePanel(); }); chips.appendChild(b); });

  // ---------- panel
  function openPanel(it) {
    panel.querySelector('.m-panel-body').innerHTML = (it.type === 'text' ? '' : `<img src="${esc(it.full || it.src)}" alt="${esc(it.title || 'Artwork')}">`)
      + (it.title ? `<h2 class="h-l">${esc(it.title)}</h2>` : '') + (it.sub ? `<div class="credits">${it.type === 'text' ? esc(it.sub) : it.sub}</div>` : '')
      + (it.href ? `<p><a class="btn" href="${esc(it.href)}">${esc(it.cta || 'Open the release')}</a></p>` : '');
    panel.hidden = false; panel.querySelector('.m-panel-close').focus(); keys.clear();
  }
  function closePanel() { if (!panel.hidden) { panel.hidden = true; canvas.focus(); } }
  panel.querySelector('.m-panel-close').addEventListener('click', closePanel);

  // ---------- loop
  function size() {
    const w = wrap.clientWidth, h = wrap.clientHeight, px = Math.max(2, Math.round(Math.min(w, h * 1.6) / 300));
    renderer.setSize(Math.ceil(w / px), Math.ceil(h / px), false);
    camera.aspect = w / h; baseFov = w < h ? 82 : FOV;
    if (seated && glide) glide.fov = screenFov(); else if (seated) me.fov = screenFov(); else me.fov = baseFov;
  }
  addEventListener('resize', size); size();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) {
      if (glide) {
        const k = 1 - Math.pow(0.004, dt), g = glide;
        me.x += (g.x - me.x) * k; me.z += (g.z - me.z) * k; me.yaw += (g.yaw - me.yaw) * k; me.pitch += (g.pitch - me.pitch) * k; me.y += (g.y - me.y) * k;
        // zoom starts once we are nearly in place
        if (Math.hypot(g.x - me.x, g.z - me.z) < 0.6) me.fov += (g.fov - me.fov) * (1 - Math.pow(0.03, dt));
        if (Math.hypot(g.x - me.x, g.z - me.z) < 0.03 && Math.abs(g.fov - me.fov) < 0.2) { me.x = g.x; me.z = g.z; me.y = g.y; me.fov = g.fov; me.pitch = g.pitch; glide = null; }
      } else if (panel.hidden && !seated) {
        me.y = EYE; me.fov = baseFov;
        let f = 0, s = 0;
        if (keys.has('w') || keys.has('arrowup')) f += 1; if (keys.has('s') || keys.has('arrowdown')) f -= 1;
        if (keys.has('d') || keys.has('e')) s += 1; if (keys.has('a') || keys.has('q')) s -= 1;
        if (keys.has('arrowleft')) me.yaw += 2.1 * dt; if (keys.has('arrowright')) me.yaw -= 2.1 * dt;
        f -= joy.y; me.yaw -= joy.x * 1.7 * dt;
        if (f || s) { const sp = (keys.has('shift') ? 9 : 5.6) * dt, sn = Math.sin(me.yaw), cs = Math.cos(me.yaw); move((-sn * f + cs * s) * sp, (-cs * f - sn * s) * sp); }
      }
      setRoom(roomAt(me.z));
    } else { me.yaw = Math.sin(now / 4000) * 0.25; }
    camera.position.set(me.x, me.y, me.z); camera.rotation.y = me.yaw; camera.rotation.x = me.pitch;
    if (camera.fov !== me.fov) { camera.fov = me.fov; }
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  loadRoom(rooms[0]); loadRoom(rooms[1]);
  requestAnimationFrame(frame);
  $('.m-enter').addEventListener('click', () => { startEl.hidden = true; running = true; me.yaw = 0; wrap.classList.add('is-running'); canvas.focus(); setRoom(0); });
  window.__museum = { me, rooms, openPanel, pickables, sit, stand, cinema };
};
(() => {
  const go = () => { try { initMuseum(); } catch (e) { console.error(e); } };
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 16px Silkscreen'), document.fonts.load('400 8px Silkscreen')]) : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 2200))]).then(go, go);
})();
