/* Project page behavior for "One Photon, Many Worlds". Vanilla JS, no dependencies, no build step (Hi-SPAD page kit).
   1. Lazy autoplay: muted loops (video[data-autoplay]) play only while on screen.
   2. Tabs (.tabs-lite): exactly one panel visible.
   3. Photon title (.photon-wordmark): the title's first line drawn as a simulated SPAD capture. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Lazy autoplay. Reduced motion or no IntersectionObserver: show controls instead. */
  var autos = Array.prototype.slice.call(document.querySelectorAll('video[data-autoplay]'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    autos.forEach(function (v) { v.controls = true; });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting && !v.closest('[hidden]')) {
          var p = v.play();
          if (p && p.catch) p.catch(function () { v.controls = true; });
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    autos.forEach(function (v) { io.observe(v); });
  }

  /* 2. Tabs: <div class="tabs-lite" role="tablist"><button data-tab="panel-id" aria-selected="true">…</button>…</div>
     Panels are elements with those ids; all but the selected one carry the hidden attribute. */
  document.querySelectorAll('.tabs-lite').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[data-tab]'));
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) {
          var on = o === t;
          o.setAttribute('aria-selected', String(on));
          var panel = document.getElementById(o.dataset.tab);
          if (!panel) return;
          panel.hidden = !on;
          var v = panel.querySelector('video');
          if (v) { if (on && !reduceMotion) { v.play().catch(function () {}); } else { v.pause(); } }
        });
      });
    });
  });
})();

/* 3. Photon title. Vanilla JS, no dependencies.
   The title letters fill in as a simulated SPAD capture, using the paper's measurement model (MS Eq. 1–2):
   in every binary frame, pixel i detects at least one photon with probability rho_i = 1 - exp(-TAU * s_i),
   where s_i = 1 inside the letters and S_BG outside. Counts accumulate over N frames; the canvas shows each
   pixel's count divided by the expected count of a letter pixel (clipped at 1). N grows geometrically from 0
   to N_MAX, then holds. prefers-reduced-motion: the final frame only.
   Markup (inside the page's <h1>; the text stays for screen readers, and shows if this script never runs):
     <span class="photon-wordmark" data-text="…"><span class="photon-text">…</span><canvas aria-hidden="true"></canvas></span>
   and, after the <h1>: <p class="photon-caption">… <span class="photon-count"></span> <button class="photon-replay">…</button></p> */
(function () {
  'use strict';
  var box = document.querySelector('.photon-wordmark');
  if (!box) return;
  var canvas = box.querySelector('canvas');
  if (!canvas || !canvas.getContext) return;   // the text title stays
  var countEl = document.querySelector('.photon-caption .photon-count');
  var replayBtn = document.querySelector('.photon-caption .photon-replay');
  var TEXT = box.dataset.text || 'One Photon, Many Worlds';
  var TAU = 0.01;        // light level per binary frame (the paper's value for edges, digits, QR)
  var S_BG = 0.01;       // faint background: early frames show stray detections everywhere, the final frame no box
  var N_MAX = 100000;    // the paper's high-count target N_1 for faces (author asked for more than 10,000)
                         // (an illustrative combination: the face simulations themselves use tau = 0.1)
  var DURATION = 8000;   // ms from N = 1 to N_MAX (about 1.6 s per decade)
  var HOLD0 = 400;       // ms at N = 0 before the first frame
  var CELL = 3;          // CSS px per SPAD pixel
  var MAX_FONT_PX = 66;  // letter size of the photon line on wide screens (CSS px)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RHO_LETTER = 1 - Math.exp(-TAU);
  var BLACK = 0.04;      // display black level: levels below 4% of a letter pixel's expected count draw as empty
                         // (removes the uniform haze of the faint background at large N; single detections at
                         // small N are unaffected because they are drawn at full intensity)
  var ctx, img, rho, counts, n = 0, raf = null, t0 = 0, lastW = 0;

  function font(px) { return '700 ' + px + 'px "Google Sans", "Noto Sans", sans-serif'; }

  /* Rasterize the text into a cols x rows grid of SPAD pixels: one line if the letters stay at least
     MIN_F pixels tall, otherwise two lines split at the comma. */
  function layout() {
    var W = box.clientWidth;
    lastW = W;
    var cols = Math.max(40, Math.floor(W / CELL));
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = font(100);
    var lines = [TEXT];
    var F = Math.floor(cols * 0.96 / (probe.measureText(TEXT).width / 100));
    var MIN_F = 18;
    if (F < MIN_F && TEXT.indexOf(', ') > 0) {
      var cut = TEXT.indexOf(', ');
      lines = [TEXT.slice(0, cut + 1), TEXT.slice(cut + 2)];
      var wmax = Math.max(probe.measureText(lines[0]).width, probe.measureText(lines[1]).width) / 100;
      F = Math.floor(cols * 0.96 / wmax);
    }
    F = Math.max(8, Math.min(F, Math.floor(MAX_FONT_PX / CELL)));
    probe.font = font(F);
    var textW = Math.max.apply(null, lines.map(function (l) { return probe.measureText(l).width; }));
    cols = Math.min(cols, Math.ceil(textW) + 10);   // keep the stray detections close to the letters
    var lineH = Math.round(F * 1.12);
    var rows = lineH * lines.length + Math.round(F * 0.22);
    var m = document.createElement('canvas');
    m.width = cols; m.height = rows;
    var mc = m.getContext('2d');
    mc.fillStyle = '#000';
    mc.font = font(F);
    mc.textAlign = 'center';
    mc.textBaseline = 'alphabetic';
    lines.forEach(function (l, i) { mc.fillText(l, cols / 2, Math.round(F * 0.92) + i * lineH); });
    var a = mc.getImageData(0, 0, cols, rows).data;
    rho = new Float32Array(cols * rows);
    for (var i = 0; i < rho.length; i++) {
      var s = S_BG + (1 - S_BG) * (a[i * 4 + 3] / 255);
      rho[i] = 1 - Math.exp(-TAU * s);
    }
    counts = new Uint16Array(cols * rows);
    canvas.width = cols; canvas.height = rows;
    canvas.style.width = (cols * CELL) + 'px';
    canvas.style.height = (rows * CELL) + 'px';
    ctx = canvas.getContext('2d');
    img = ctx.createImageData(cols, rows);
    n = 0;
  }

  /* Detections in k more frames. Per pixel this is Binomial(k, rho) with rho <= 0.01, so a Poisson draw is an
     excellent approximation (normal approximation once the mean exceeds 30). */
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function poisson(lam) {
    if (lam > 30) return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss()));
    var L = Math.exp(-lam), k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }
  function addFrames(k) {
    if (k <= 0) return;
    for (var i = 0; i < counts.length; i++) {
      var c = k === 1 ? (Math.random() < rho[i] ? 1 : 0) : poisson(k * rho[i]);
      counts[i] = Math.min(65535, counts[i] + Math.min(c, k));
    }
    n += k;
  }

  function inkRGB() {
    var c = getComputedStyle(document.documentElement).getPropertyValue('--ink-strong').trim() || '#363636';
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) { var h = parseInt(m[1], 16); return [h >> 16 & 255, h >> 8 & 255, h & 255]; }
    m = c.match(/(\d+)\D+(\d+)\D+(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [54, 54, 54];
  }

  function draw() {
    var rgb = inkRGB();
    var norm = Math.max(1, n * RHO_LETTER);   // expected count of a letter pixel after n frames
    var d = img.data;
    for (var i = 0; i < counts.length; i++) {
      var j = i * 4;
      d[j] = rgb[0]; d[j + 1] = rgb[1]; d[j + 2] = rgb[2];
      var v = Math.min(1, counts[i] / norm);
      d[j + 3] = Math.round(Math.max(0, (v - BLACK) / (1 - BLACK)) * 255);
    }
    ctx.putImageData(img, 0, 0);
    if (countEl) countEl.textContent = 'N = ' + n.toLocaleString('en-US') + (n === 1 ? ' binary frame' : ' binary frames');
  }

  function tick(ts) {
    if (!t0) t0 = ts;
    var t = ts - t0 - HOLD0;
    var target = t <= 0 ? 0 : Math.min(N_MAX, Math.round(Math.expm1(Math.min(1, t / DURATION) * Math.log1p(N_MAX))));
    if (target > n) { addFrames(target - n); draw(); }
    raf = n < N_MAX ? requestAnimationFrame(tick) : null;
  }

  function finishNow() { layout(); addFrames(N_MAX); draw(); box.classList.add('is-live'); }
  function play() {
    if (raf) cancelAnimationFrame(raf);
    raf = null; t0 = 0;
    if (reduce) { finishNow(); return; }
    layout(); draw();
    box.classList.add('is-live');
    raf = requestAnimationFrame(tick);
  }

  if (replayBtn) replayBtn.addEventListener('click', play);
  // Redraw in the new ink color when the theme changes (the draft preview's toggle sets data-theme)
  new MutationObserver(function () { if (ctx) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // A change in the box's width (window resize, or any layout change around it) re-rasterizes the text;
  // a finished animation stays finished
  var rt = null;
  function onWidth() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!ctx || box.clientWidth === lastW) return;
      if (raf) play(); else finishNow();
    }, 150);
  }
  if ('ResizeObserver' in window) new ResizeObserver(onWidth).observe(box);
  else window.addEventListener('resize', onWidth);

  var fontReady = document.fonts && document.fonts.load ? document.fonts.load(font(40)) : Promise.resolve();
  var started = false;
  function start() { if (!started) { started = true; play(); } }
  fontReady.then(start, start);
  setTimeout(start, 1500);   // never wait longer than this for the web font
})();
