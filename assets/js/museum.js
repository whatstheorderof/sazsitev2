/* SAZ museum: a walkable gallery. three.js r128 (global THREE). */
const initMuseum = () => {
  const wrap = document.getElementById('museum');
  if (!wrap) return;
  const data = JSON.parse(document.getElementById('museum-data').textContent);
  const $ = s => wrap.querySelector(s);
  const canvas = $('canvas'), startEl = $('.m-start'), label = $('.m-label'), panel = $('.m-panel'), chips = $('.m-rooms');

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) {}
  if (!renderer) { startEl.querySelector('.m-start-inner').innerHTML = '<h1 class="h-xl">museum</h1><p class="lede">Your browser could not start 3D graphics. You can see the same work in the <a href="gallery.html">gallery</a> and on the <a href="releases.html">releases</a> page.</p>'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const W = 12, H = 4.2, DOOR = 3, DOOR_H = 3, EYE = 1.65;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b101c);
  scene.fog = new THREE.Fog(0x0b101c, 14, 46);
  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 120);
  camera.rotation.order = 'YXZ';
  scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x1a1f2c, 0.85));

  // ---------- text helpers
  const DISPLAY = '"Big Shoulders Display", "Arial Narrow", sans-serif', TEXT = 'Newsreader, Georgia, serif';
  function textTexture(draw, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = t; }
    if (line) ctx.fillText(line, x, y); return y + lh;
  }
  const signTex = (name, years) => textTexture((c, w, h) => {
    c.fillStyle = '#f2b880'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `900 ${h * 0.5}px ${DISPLAY}`; c.fillText(name.toLowerCase(), w / 2, h * 0.38, w * 0.94);
    c.fillStyle = '#d7dde6'; c.font = `400 ${h * 0.2}px ${TEXT}`; c.fillText(years, w / 2, h * 0.82);
  }, 1024, 256);
  const plaqueTex = (title, body) => textTexture((c, w, h) => {
    c.fillStyle = '#e9edf3'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#121a2b'; c.textBaseline = 'top';
    c.font = `900 84px ${DISPLAY}`; c.fillText(title.toLowerCase(), 56, 48, w - 112);
    c.font = `400 40px ${TEXT}`; wrapText(c, body, 56, 170, w - 112, 56);
  }, 1024, 1024);
  const logoTex = () => textTexture((c, w, h) => {
    const p = document.querySelector('.mark svg path'), vb = document.querySelector('.mark svg').viewBox.baseVal;
    c.fillStyle = '#d7dde6';
    if (p) { const s = Math.min(w * 0.9 / vb.width, h * 0.9 / vb.height); c.translate((w - vb.width * s) / 2, (h - vb.height * s) / 2); c.scale(s, s); c.fill(new Path2D(p.getAttribute('d')), 'evenodd'); }
  }, 1024, 400);

  // ---------- build rooms
  const wallGeo = new THREE.BoxGeometry(1, 1, 1), planeGeo = new THREE.PlaneGeometry(1, 1);
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x0a0d14 });
  const pickables = [], rooms = [], dividers = [];
  function box(mat, w, h, d, x, y, z) { const m = new THREE.Mesh(wallGeo, mat); m.scale.set(w, h, d); m.position.set(x, y, z); scene.add(m); return m; }

  let z = 0;
  data.rooms.forEach((r, ri) => {
    const col = new THREE.Color(r.color);
    const wallMat = new THREE.MeshLambertMaterial({ color: col });
    const floorMat = new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(0.45) });
    const ceilMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.42) });
    // lay out items along both walls
    const side = [2.2, 2.2], placed = [];
    r.items.forEach((it, i) => {
      const s = i % 2, allow = it.big ? 4.2 : 2.7;
      placed.push({ it, s, off: side[s] + allow / 2, allow }); side[s] += allow;
    });
    const D = Math.max(11, Math.max(side[0], side[1]) + 2.2);
    const z0 = z, z1 = z - D, zc = (z0 + z1) / 2;
    box(floorMat, W, 0.2, D, 0, -0.1, zc); box(ceilMat, W, 0.2, D, 0, H + 0.1, zc);
    box(wallMat, 0.3, H, D, -W / 2 - 0.15, H / 2, zc); box(wallMat, 0.3, H, D, W / 2 + 0.15, H / 2, zc);
    if (ri === 0) box(wallMat, W, H, 0.3, 0, H / 2, z0 + 0.15);
    const last = ri === data.rooms.length - 1;
    if (last) {
      box(wallMat, W, H, 0.3, 0, H / 2, z1 - 0.15);
      const lg = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: logoTex(), transparent: true })); lg.scale.set(6, 2.34, 1); lg.position.set(0, 2.2, z1 + 0.02); scene.add(lg);
    } else {
      const sw = (W - DOOR) / 2;
      box(wallMat, sw, H, 0.3, -(DOOR / 2 + sw / 2), H / 2, z1); box(wallMat, sw, H, 0.3, DOOR / 2 + sw / 2, H / 2, z1);
      box(wallMat, DOOR, H - DOOR_H, 0.3, 0, DOOR_H + (H - DOOR_H) / 2, z1);
      const nx = data.rooms[ri + 1];
      const sign = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: signTex(nx.name, nx.years), transparent: true }));
      sign.scale.set(4.4, 1.1, 1); sign.position.set(0, DOOR_H + (H - DOOR_H) / 2, z1 + 0.16); scene.add(sign);
      dividers.push(z1);
    }
    const lamp = new THREE.PointLight(0xfff1dd, 0.55, D * 1.4); lamp.position.set(0, H - 0.4, zc); scene.add(lamp);
    const room = { ...r, z0, z1, i: ri, arts: [], loaded: false };
    placed.forEach(({ it, s, off, allow }) => {
      const hgt = it.big ? 2.3 : 1.5, g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: it.type === 'img' ? col.clone().multiplyScalar(1.5) : 0xffffff });
      const pic = new THREE.Mesh(planeGeo, mat), fr = new THREE.Mesh(wallGeo, frameMat);
      pic.position.z = 0.05; g.add(fr, pic);
      const setSize = aspect => { let h = hgt, w = h * aspect; const mw = allow - 0.5; if (w > mw) { w = mw; h = w / aspect; } pic.scale.set(w, h, 1); fr.scale.set(w + 0.14, h + 0.14, 0.07); };
      setSize(it.type === 'logo' ? 2.56 : 1);
      g.position.set(s ? W / 2 - 0.01 : -W / 2 + 0.01, it.big ? 1.95 : 1.75, z0 - off); g.rotation.y = s ? -Math.PI / 2 : Math.PI / 2;
      scene.add(g);
      if (it.type === 'text') { mat.map = plaqueTex(it.title, it.sub); mat.needsUpdate = true; }
      else if (it.type === 'logo') { fr.visible = false; mat.map = logoTex(); mat.transparent = true; mat.needsUpdate = true; }
      else { pic.userData.item = it; pickables.push(pic); room.arts.push({ it, mat, setSize }); }
    });
    rooms.push(room); z = z1;
  });
  const zEnd = z;

  // ---------- lazy textures
  const loader = new THREE.TextureLoader();
  function loadRoom(room) {
    if (!room || room.loaded) return; room.loaded = true;
    room.arts.forEach(a => loader.load(a.it.src, t => {
      t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      a.mat.map = t; a.mat.color.set(0xffffff); a.mat.needsUpdate = true; a.setSize(t.image.width / t.image.height);
    }, undefined, () => {}));
  }

  // ---------- player
  const me = { x: 0, z: -1.6, yaw: 0, pitch: 0 }, keys = new Set();
  let glide = null, cur = -1, running = false, joy = { x: 0, y: 0 };
  const roomAt = zz => rooms.findIndex(r => zz <= r.z0 && zz > r.z1);
  function move(dx, dz) {
    const lim = W / 2 - 0.7, dh = DOOR / 2 - 0.45;
    let nx = Math.max(-lim, Math.min(lim, me.x + dx)), nz = Math.max(zEnd + 0.7, Math.min(-0.7, me.z + dz));
    for (const d of dividers) {
      const near = Math.abs(nz - d) < 0.6, crossed = (me.z - d) * (nz - d) < 0;
      if (near || crossed) { if (Math.abs(me.x) > dh && Math.abs(me.z - d) >= 0.6) nz = me.z; else if (Math.abs(nz - d) < 0.6) nx = Math.max(-dh, Math.min(dh, nx)); }
    }
    me.x = nx; me.z = nz;
  }
  function setRoom(i) {
    if (i === cur || i < 0) return; cur = i;
    [...chips.children].forEach((c, k) => c.setAttribute('aria-pressed', k === i));
    loadRoom(rooms[i]); loadRoom(rooms[i + 1]); loadRoom(rooms[i - 1]);
  }

  // ---------- input
  const typing = () => /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
  addEventListener('keydown', e => {
    if (!running || typing()) return;
    if (e.key === 'Escape') { closePanel(); return; }
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); glide = null; e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  let drag = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); ray.far = 11;
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.item : null;
  }
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6) { me.yaw -= dx * 0.004; me.pitch = Math.max(-0.9, Math.min(0.9, me.pitch - dy * 0.003)); glide = null; }
    } else if (e.pointerType === 'mouse') {
      const it = pick(e); canvas.style.cursor = it ? 'pointer' : 'grab';
      label.textContent = it ? `${it.title || 'Untitled'}: click to open` : ''; label.hidden = !it;
    }
  });
  canvas.addEventListener('pointerup', e => { if (drag && drag.moved <= 6) { const it = pick(e); if (it) openPanel(it); } drag = null; });
  canvas.addEventListener('pointercancel', () => drag = null);

  // joystick (touch)
  const stick = $('.m-joy'), knob = $('.m-joy i');
  let jid = null;
  const jmove = e => { const r = stick.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } joy = { x, y }; knob.style.transform = `translate(${x * 28}px, ${y * 28}px)`; glide = null; };
  stick.addEventListener('pointerdown', e => { jid = e.pointerId; stick.setPointerCapture(jid); jmove(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
  const jend = () => { jid = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; };
  stick.addEventListener('pointerup', jend); stick.addEventListener('pointercancel', jend);

  // room chips
  rooms.forEach((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = r.name; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => { glide = { x: 0, z: r.z0 - 1.6, yaw: 0 }; closePanel(); }); chips.appendChild(b); });

  // ---------- panel
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openPanel(it) {
    panel.querySelector('.m-panel-body').innerHTML = `<img src="${esc(it.full || it.src)}" alt="${esc(it.title || 'Artwork')}">`
      + (it.title ? `<h2 class="h-l">${esc(it.title)}</h2>` : '') + (it.sub ? `<div class="credits">${it.sub}</div>` : '')
      + (it.href ? `<p><a class="btn" href="${esc(it.href)}">${esc(it.cta || 'Open the release')}</a></p>` : '');
    panel.hidden = false; panel.querySelector('.m-panel-close').focus(); keys.clear();
  }
  function closePanel() { if (!panel.hidden) { panel.hidden = true; canvas.focus(); } }
  panel.querySelector('.m-panel-close').addEventListener('click', closePanel);

  // ---------- loop
  function size() { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 82 : 68; camera.updateProjectionMatrix(); }
  addEventListener('resize', size); size();
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running) {
      if (glide) {
        const k = 1 - Math.pow(0.002, dt); me.x += (glide.x - me.x) * k; me.z += (glide.z - me.z) * k; me.yaw += (glide.yaw - me.yaw) * k; me.pitch += (0 - me.pitch) * k;
        if (Math.abs(glide.z - me.z) < 0.05) glide = null;
      } else if (panel.hidden) {
        let f = 0, s = 0;
        if (keys.has('w') || keys.has('arrowup')) f += 1; if (keys.has('s') || keys.has('arrowdown')) f -= 1;
        if (keys.has('d') || keys.has('e')) s += 1; if (keys.has('a') || keys.has('q')) s -= 1;
        if (keys.has('arrowleft')) me.yaw += 1.9 * dt; if (keys.has('arrowright')) me.yaw -= 1.9 * dt;
        f -= joy.y; me.yaw -= joy.x * 1.6 * dt;
        if (f || s) { const sp = 4.2 * dt, sn = Math.sin(me.yaw), cs = Math.cos(me.yaw); move((-sn * f + cs * s) * sp, (-cs * f - sn * s) * sp); }
      }
      setRoom(roomAt(me.z));
    } else { me.yaw = Math.sin(now / 4000) * 0.25; }
    camera.position.set(me.x, EYE, me.z); camera.rotation.y = me.yaw; camera.rotation.x = me.pitch;
    renderer.render(scene, camera);
  }
  loadRoom(rooms[0]); loadRoom(rooms[1]);
  requestAnimationFrame(frame);
  $('.m-enter').addEventListener('click', () => { startEl.hidden = true; running = true; me.yaw = 0; wrap.classList.add('is-running'); canvas.focus(); setRoom(0); });
  window.__museum = { me, rooms, openPanel, pickables };
};
(() => {
  const go = () => { try { initMuseum(); } catch (e) { console.error(e); } };
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('900 40px "Big Shoulders Display"'), document.fonts.load('400 40px Newsreader')]) : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1800))]).then(go, go);
})();
