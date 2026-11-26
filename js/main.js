/*!
 * main.js - the scroll journey.
 * Starfield, particles, the puzzle dragon, chapter progress, reveals,
 * the transition mask and the small navigation helpers.
 * Everything degrades to a readable page: no JS, no motion, or "Skip the journey".
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SVGNS = 'http://www.w3.org/2000/svg';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function el(name, attrs) {
    var node = doc.createElementNS(SVGNS, name);
    if (attrs) { Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); }); }
    return node;
  }

  var state = {
    plain: false,
    vw: 0,
    vh: 0,
    scrollY: 0,
    active: -1,
    running: false,
    last: 0,
    speed: 1,
    pathLen: 1,
    chapterTops: [],
    dragonLen: 0,
    stations: null,
    list: []
  };

  var chapters = $$('.chapter');
  var themes = $$('.world__theme');
  var railLinks = $$('.rail a');
  var navLinks = $$('.site-nav a');
  var stationBlocks = $$('.station-block');

  /* ---------------------------------------------------------------- canvas */
  var particles = (function () {
    var canvas = $('.world__particles');
    if (!canvas) return { resize: function () {}, draw: function () {} };
    var ctx = canvas.getContext('2d');
    var dots = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      var w = state.vw;
      var h = state.vh;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = w < 700 ? 18 : (w < 1100 ? 34 : 54);
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.5,
          vy: -(0.04 + Math.random() * 0.16),
          vx: (Math.random() - 0.5) * 0.1,
          a: 0.18 + Math.random() * 0.5,
          teal: Math.random() > 0.72,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function draw(dt, speed) {
      var w = state.vw;
      var h = state.vh;
      var step = (dt / 16.7) * speed;
      ctx.clearRect(0, 0, w, h);
      /* one path per tint: two fills a frame instead of one per dot */
      var tints = [[], []];
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.y += d.vy * step;
        d.x += d.vx * step;
        d.phase += 0.01 * step;
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
        if (d.x < -10) d.x = w + 10;
        if (d.x > w + 10) d.x = -10;
        tints[d.teal ? 1 : 0].push(d);
      }
      for (var t = 0; t < 2; t++) {
        var list = tints[t];
        if (!list.length) continue;
        var alpha = 0;
        for (var k = 0; k < list.length; k++) alpha += list[k].a;
        alpha = alpha / list.length * 0.8;
        ctx.beginPath();
        for (var j = 0; j < list.length; j++) {
          var dot = list[j];
          var fade = 0.65 + 0.35 * Math.sin(dot.phase);
          ctx.moveTo(dot.x + dot.r, dot.y);
          ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
          ctx.globalAlpha = Math.min(1, fade);
        }
        ctx.fillStyle = t ? 'rgba(92,225,230,' + alpha.toFixed(3) + ')' : 'rgba(234,242,255,' + alpha.toFixed(3) + ')';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    return { resize: resize, draw: draw };
  })();

  /* ------------------------------------------------------------------ path */
  var pathSvg = null;
  var pathEl = null;

  function buildPath() {
    var w = state.vw;
    var h = Math.max(doc.body.scrollHeight, state.vh);
    if (!pathSvg) {
      pathSvg = el('svg', { 'aria-hidden': 'true', focusable: 'false' });
      pathSvg.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;opacity:0;pointer-events:none';
      pathEl = el('path', { fill: 'none' });
      pathSvg.appendChild(pathEl);
      doc.body.appendChild(pathSvg);
    }
    pathSvg.setAttribute('width', w);
    pathSvg.setAttribute('height', h);

    var cx = w * 0.64;
    var amp = Math.min(w * 0.15, 190);
    var step = Math.max(340, state.vh * 0.72);
    var d = 'M ' + cx.toFixed(1) + ' 0';
    var y = 0;
    var i = 0;
    while (y < h) {
      var ny = Math.min(y + step, h);
      var x1 = cx + Math.sin(i * 1.13 + 0.5) * amp;
      var x2 = cx + Math.sin(i * 1.13 + 1.55) * amp;
      var x3 = cx + Math.sin((i + 1) * 1.13 + 0.5) * amp;
      d += ' C ' + x1.toFixed(1) + ' ' + (y + step * 0.3).toFixed(1) +
           ', ' + x2.toFixed(1) + ' ' + (ny - step * 0.3).toFixed(1) +
           ', ' + x3.toFixed(1) + ' ' + ny.toFixed(1);
      y = ny;
      i++;
      if (i > 200) break;
    }
    pathEl.setAttribute('d', d);
    state.pathLen = pathEl.getTotalLength() || 1;
    buildLenTable();
  }

  function pointAt(len) {
    if (!pathEl) return { x: 0, y: 0, angle: 0 };
    var l = clamp(len, 0, state.pathLen);
    var p = pathEl.getPointAtLength(l);
    var p2 = pathEl.getPointAtLength(clamp(l + 6, 0, state.pathLen));
    var p0 = pathEl.getPointAtLength(clamp(l - 6, 0, state.pathLen));
    var angle = Math.atan2(p2.y - p0.y, p2.x - p0.x) * 180 / Math.PI;
    return { x: p.x, y: p.y, angle: angle };
  }

  /* the path is longer than the page because it weaves, so map document y
     to a path length through a small lookup table built once per resize */
  var lenTable = [];

  function buildLenTable() {
    lenTable = [];
    if (!pathEl) return;
    var step = 14;
    for (var l = 0; l <= state.pathLen; l += step) {
      var p = pathEl.getPointAtLength(l);
      lenTable.push({ l: l, y: p.y });
    }
    var end = pathEl.getPointAtLength(state.pathLen);
    lenTable.push({ l: state.pathLen, y: end.y });
  }

  function lenForY(y) {
    if (!lenTable.length) return 0;
    if (y <= lenTable[0].y) return lenTable[0].l;
    var last = lenTable[lenTable.length - 1];
    if (y >= last.y) return last.l;
    var lo = 0;
    var hi = lenTable.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (lenTable[mid].y < y) lo = mid;
      else hi = mid;
    }
    var a = lenTable[lo];
    var b = lenTable[hi];
    var t = (y - a.y) / Math.max(0.0001, b.y - a.y);
    return a.l + (b.l - a.l) * t;
  }

  /* path length that keeps the dragon on screen, easing near chapter tops */
  function lenForScroll(y) {
    var targetY = y + state.vh * 0.56;
    for (var i = 0; i < state.chapterTops.length; i++) {
      var u = (y - state.chapterTops[i]) / (state.vh * 0.62);
      if (u > -1 && u < 1) {
        targetY -= state.vh * 0.2 * (1 + Math.cos(Math.PI * u)) / 2;
      }
    }
    return lenForY(targetY);
  }

  /* ---------------------------------------------------------------- dragon */
  var dragon = { group: null, trail: null, segs: [], head: null, wings: [] };

  function buildDragon() {
    var group = $('#dragon-group');
    var trail = $('#dragon-trail');
    if (!group || !window.Puzzle) return;
    dragon.group = group;
    dragon.trail = trail;

    var count = 10;
    for (var i = 0; i < count; i++) {
      var t = i / (count - 1);
      var w = lerp(56, 26, t);
      var h = lerp(42, 20, t);
      var g = el('g', { class: 'dragon__seg-wrap' });
      var shape = window.Puzzle.piece({
        width: w,
        height: h,
        sides: i === 0
          ? { left: 'flat', right: 'flat', top: 'out', bottom: 'flat' }
          : { left: 'in', right: 'out', top: 'flat', bottom: 'flat' },
        seed: 7 + i * 3,
        depth: 0.16
      });
      var p = el('path', {
        class: 'dragon__seg' + (i > count - 3 ? ' dragon__seg--tail' : ''),
        d: shape,
        transform: 'translate(' + (-w / 2).toFixed(1) + ' ' + (-h / 2).toFixed(1) + ')'
      });
      g.appendChild(p);

      if (i === 0) {
        g.appendChild(el('path', {
          class: 'dragon__snout',
          d: 'M24 -11 q24 -3 32 8 q-6 11 -32 8 z'
        }));
        g.appendChild(el('path', {
          class: 'dragon__jaw',
          d: 'M24 4 q18 2 30 6'
        }));
        g.appendChild(el('circle', { class: 'dragon__eye', cx: 17, cy: -7, r: 3.2 }));
        g.appendChild(el('path', { class: 'dragon__horn', d: 'M-6 -24 l9 -17 l6 15 z' }));
        g.appendChild(el('path', { class: 'dragon__horn', d: 'M6 -25 l7 -13 l6 12 z' }));
        g.appendChild(el('path', { class: 'dragon__horn', d: 'M-18 -18 l2 -12 l8 9 z' }));
        g.appendChild(el('path', {
          class: 'dragon__scale',
          d: 'M-2 -18 q10 -6 20 0'
        }));

        var wingL = el('g', { class: 'dragon__wing-wrap' });
        wingL.appendChild(el('path', {
          class: 'dragon__wing',
          d: 'M-4 -12 q-28 -34 -58 -22 q8 26 28 38 q18 10 30 -16 z'
        }));
        wingL.appendChild(el('path', {
          class: 'dragon__wing-rib',
          d: 'M-4 -12 l-44 -18 M-4 -12 l-34 2 M-4 -12 l-24 14'
        }));
        var wingR = el('g', { class: 'dragon__wing-wrap dragon__wing--right' });
        wingR.appendChild(el('path', {
          class: 'dragon__wing',
          d: 'M-4 8 q-24 30 -52 22 q6 -22 24 -34 q16 -10 28 12 z'
        }));
        wingR.appendChild(el('path', {
          class: 'dragon__wing-rib',
          d: 'M-4 8 l-40 16 M-4 8 l-30 0'
        }));
        g.appendChild(wingL);
        g.appendChild(wingR);
        dragon.wings = [wingL, wingR];
        dragon.head = g;
      }
      group.appendChild(g);
      dragon.segs.push(g);
    }

    /* faint glow under the body */
    var halo = el('ellipse', { class: 'dragon__halo', cx: 0, cy: 0, rx: 40, ry: 22 });
    group.insertBefore(halo, group.firstChild);
    dragon.halo = halo;
  }

  var REST = {
    opening: { x: 0.8, y: 0.63, scale: 1 },
    quiet: { x: 0.6, y: 0.52, scale: 0.9 },
    contact: { x: 0.74, y: 0.5, scale: 0.95 }
  };

  function updateDragon(now) {
    if (!dragon.group) return;
    var vw = state.vw;
    var vh = state.vh;
    var scroll = state.scrollY;
    var len = lenForScroll(scroll);
    state.dragonLen = len;

    var ch = state.list[state.active] || state.list[0];
    var curl = 0;
    var activeId = ch && ch.el ? ch.el.id : '';
    if (ch) {
      if (activeId === 'opening') curl = 1 - clamp((ch.p - 0.1) / 0.55, 0, 1);
      else if (activeId === 'quiet') curl = Math.sin(clamp((ch.p - 0.05) / 0.85, 0, 1) * Math.PI) * 0.95;
      else if (activeId === 'contact') curl = clamp((ch.p - 0.15) / 0.5, 0, 1);
    }
    state.curl = curl;

    var rest = REST[activeId] || REST.opening;
    var restX = rest.x * vw;
    var restY = rest.y * vh;

    var head = pointAt(len);
    var hx = lerp(head.x, restX, curl);
    var hy = lerp(head.y - scroll, restY, curl);

    /* idle bob */
    var bob = Math.sin(now / 900) * 3;

    var segs = dragon.segs;
    var gap = lerp(30, 22, 0.5);
    var sizeScale = state.vw < 700 ? 0.6 : (state.vw < 980 ? 0.8 : 1);
    gap *= sizeScale;
    var trailPts = [];

    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var x;
      var y;
      var rot;
      var curlScale = 1;
      if (curl > 0.02) {
        var a = -2.1 + i * 0.42 + Math.sin(now / 3000) * 0.05;
        var r = lerp(96, 54, i / segs.length) * rest.scale;
        var sx = restX + Math.cos(a) * r * 1.25;
        var sy = restY + Math.sin(a) * r * 0.8;
        x = lerp(head.x + (i * -gap), sx, curl);
        y = lerp(head.y - scroll + (i * 2) + bob, sy, curl);
        rot = lerp(head.angle, (a * 180 / Math.PI) + 90, curl);
        curlScale = lerp(1, 0.72, curl);
      } else {
        curlScale = 1;
        var pl = len - i * gap;
        var pt = pointAt(pl);
        var wobble = Math.sin(now / 340 - i * 0.62) * (i === 0 ? 2 : 7);
        x = pt.x + Math.cos((pt.angle + 90) * Math.PI / 180) * wobble;
        y = pt.y - scroll + Math.sin((pt.angle + 90) * Math.PI / 180) * wobble + bob * (i === 0 ? 1 : 0.4);
        rot = pt.angle + Math.sin(now / 420 - i * 0.62) * 4;
        if (i === 0) rot += Math.sin(now / 700) * 2;
      }
      seg.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ') scale(' + (curlScale * sizeScale).toFixed(2) + ')');
      if (i % 2 === 0) trailPts.push(x.toFixed(1) + ' ' + y.toFixed(1));
    }

    if (dragon.halo) {
      dragon.halo.setAttribute('cx', hx.toFixed(1));
      dragon.halo.setAttribute('cy', hy.toFixed(1));
      dragon.halo.setAttribute('rx', (58 + Math.sin(now / 1100) * 6).toFixed(1));
    }

    if (dragon.trail) {
      var d = '';
      if (curl < 0.55) {
        for (var k = 0; k < 14; k++) {
          var lp = len - 44 - k * 26;
          var tp2 = pointAt(lp);
          d += (k === 0 ? 'M ' : ' L ') + tp2.x.toFixed(1) + ' ' + (tp2.y - scroll).toFixed(1);
        }
      }
      dragon.trail.setAttribute('d', d);
      dragon.trail.style.opacity = (0.55 * (1 - clamp(curl / 0.55, 0, 1))).toFixed(2);
    }

    /* veil grows from the dragon, and only while it is still growing */
    if (ch && ch.el && ch.p < 0.3) {
      var veilVars = (hx / vw * 100).toFixed(2) + '%';
      var veilVarsY = (hy / vh * 100).toFixed(2) + '%';
      if (ch.vx !== veilVars) { ch.el.style.setProperty('--vx', veilVars); ch.vx = veilVars; }
      if (ch.vy !== veilVarsY) { ch.el.style.setProperty('--vy', veilVarsY); ch.vy = veilVarsY; }
    }
  }

  /* ------------------------------------------------------------ scroll loop */
  function chapterById(id) {
    for (var i = 0; i < state.list.length; i++) {
      if (state.list[i].el.id === id) return state.list[i];
    }
    return null;
  }

  function measure() {
    state.vw = window.innerWidth;
    state.vh = window.innerHeight;
    var y = window.scrollY;
    state.list = chapters.map(function (el, i) {
      var r = el.getBoundingClientRect();
      var top = r.top + y;
      var h = r.height;
      return {
        el: el,
        index: i,
        top: top,
        height: h,
        span: Math.max(1, h - state.vh),
        theme: el.getAttribute('data-theme'),
        p: 0
      };
    });
    state.chapterTops = state.list.map(function (c) { return c.top; });
  }

  function applyProgress() {
    if (!state.list.length) return;
    var y = state.scrollY;
    var vh = state.vh;
    var active = 0;
    var best = -1;

    for (var i = 0; i < state.list.length; i++) {
      var c = state.list[i];
      var p = clamp((y - c.top) / c.span, 0, 1);
      c.p = p;
      var near = y + vh * 0.5 >= c.top && y + vh * 0.5 < c.top + c.height;
      if (near) { active = i; best = i; }

      if (Math.abs(c.top - y) < vh * 2.2 || near) {
        var sp = clamp((p + 0.12) / 0.5, 0, 1);
        var tp = clamp(p / 0.24, 0, 1);
        var sps = sp.toFixed(3);
        var tps = tp.toFixed(3);
        if (c.sps !== sps) { c.el.style.setProperty('--sp', sps); c.sps = sps; }
        if (c.tps !== tps) { c.el.style.setProperty('--tp', tps); c.tps = tps; }
      }
    }
    if (best < 0) active = y + vh * 0.5 < state.list[0].top ? 0 : state.list.length - 1;
    var moved = active !== state.active;
    state.active = active;

    if (moved) {
      var theme = state.list[active].theme;
      for (var t = 0; t < themes.length; t++) {
        themes[t].classList.toggle('is-on', themes[t].getAttribute('data-theme') === theme);
      }

      for (var r = 0; r < railLinks.length; r++) {
        if (r === active) railLinks[r].setAttribute('aria-current', 'true');
        else railLinks[r].removeAttribute('aria-current');
      }
      var navMap = { 0: '#opening', 1: '#education', 2: '#management', 3: '#research', 4: '#deloitte', 5: '#skills', 6: '#quiet', 7: '#explore', 8: '#contact' };
      for (var n = 0; n < navLinks.length; n++) {
        if (navLinks[n].getAttribute('href') === navMap[active]) navLinks[n].setAttribute('aria-current', 'true');
        else navLinks[n].removeAttribute('aria-current');
      }
    }

    /* the three Deloitte stations take turns */
    if (stationBlocks.length) {
      var dc = chapterById('deloitte');
      if (dc) {
        var idx = dc.p < 0.3 ? 0 : (dc.p < 0.64 ? 1 : 2);
        if (state.stations !== idx) {
          state.stations = idx;
          for (var s = 0; s < stationBlocks.length; s++) {
            stationBlocks[s].classList.toggle('is-live', s === idx);
          }
        }
      }
    }

    /* particles slow down in the quiet chapter */
    state.speed = (active === 5) ? 0.3 : 1;
  }

  function frame(now) {
    if (!state.running) return;
    window.requestAnimationFrame(frame);
    if (doc.hidden) return;
    var dt = state.last ? Math.min(48, now - state.last) : 16;
    state.last = now;
    state.scrollY = window.scrollY;
    state.frameNo = (state.frameNo || 0) + 1;
    applyProgress();
    if (state.frameNo % 2 === 0) {
      updateDragon(now);
      particles.draw(dt * 2, state.speed);
    }
  }

  function start() {
    if (state.running || state.plain) return;
    state.running = true;
    state.last = 0;
    window.requestAnimationFrame(frame);
  }

  function stop() {
    state.running = false;
  }

  /* --------------------------------------------------------------- reveals */
  function initToolClusters() {
    var clusters = $$('.tools-cluster');
    if (!clusters.length) return;
    if (!('IntersectionObserver' in window) || state.plain) {
      clusters.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    clusters.forEach(function (n) { io.observe(n); });
  }

  function initReveals() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || state.plain) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------- plain / reduced */
  function goPlain(scrollTo) {
    if (state.plain) {
      if (scrollTo) {
        var t = doc.querySelector(scrollTo);
        if (t) t.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
      return;
    }
    state.plain = true;
    stop();
    root.classList.add('is-plain');
    $$('.reveal').forEach(function (n) { n.classList.add('is-in'); });
    $$('.tools-cluster').forEach(function (n) { n.classList.add('is-in'); });
    if (scrollTo) {
      var target = doc.querySelector(scrollTo);
      if (target) {
        window.setTimeout(function () {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
        }, 40);
      }
    }
  }

  function wireNav() {
    $$('[data-skip-journey]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goPlain('#education');
      });
    });
    $$('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href === '#' || state.plain) return;
        var target = doc.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ block: 'start', behavior: reduceMQ.matches ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', href);
      });
    });
  }

  /* ------------------------------------------------------------ case cards */
  function wipeTo(card, href) {
    var r = card.getBoundingClientRect();
    var wipe = doc.createElement('div');
    wipe.className = 'page-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    wipe.style.setProperty('--ox', (r.left + r.width / 2).toFixed(0) + 'px');
    wipe.style.setProperty('--oy', (r.top + r.height / 2).toFixed(0) + 'px');
    doc.body.appendChild(wipe);
    window.requestAnimationFrame(function () {
      wipe.classList.add('is-on');
    });
    window.setTimeout(function () {
      if (doc.startViewTransition) {
        doc.startViewTransition(function () { window.location.href = href; });
      } else {
        window.location.href = href;
      }
    }, 430);
  }

  function wireCaseCards() {
    $$('[data-case-card]').forEach(function (card) {
      var link = $('.read-study', card);
      if (!link) return;
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href') || link.getAttribute('data-href');
        if (!href) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (reduceMQ.matches) return;
        e.preventDefault();
        wipeTo(card, href);
      });
    });
  }

  /* ------------------------------------------------------------------ init */
  function onResize() {
    measure();
    buildPath();
    particles.resize();
    if (state.running) {
      applyProgress();
    }
  }

  /* --------------------------------------------------------- PRD explorers */
  function initPrd() {
    var panels = $$('.panel[data-panel]');
    if (!panels.length) return;

    var rail = doc.querySelector('.prd-rail');
    var links = $$('.prd-rail a');

    /* the rail piece for the section at the reading line lights up */
    var lastActive = -1;
    function updateRail() {
      var mid = (state.vh || window.innerHeight) * 0.45;
      var best = 0;
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].getBoundingClientRect().top <= mid) best = i;
      }
      if (best === lastActive) return;
      lastActive = best;
      for (var l = 0; l < links.length; l++) {
        if (links[l].getAttribute('href') === '#' + panels[best].id) links[l].setAttribute('aria-current', 'true');
        else links[l].removeAttribute('aria-current');
      }
      if (rail) rail.style.setProperty('--rail-p', ((best + 1) / panels.length).toFixed(3));
      if (links[best] && rail && rail.scrollWidth > rail.clientWidth) {
        var target = links[best].offsetLeft - (rail.clientWidth - links[best].offsetWidth) / 2;
        rail.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
      }
    }

    /* panels assemble as they arrive */
    if ('IntersectionObserver' in window) {
      var inIO = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('is-in');
            inIO.unobserve(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
      for (var q = 0; q < panels.length; q++) inIO.observe(panels[q]);
    } else {
      for (var q2 = 0; q2 < panels.length; q2++) panels[q2].classList.add('is-in');
    }

    /* requirement cards flip on click, Enter and Space */
    var flips = $$('.flip');
    for (var f = 0; f < flips.length; f++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var on = btn.getAttribute('aria-pressed') === 'true';
          btn.setAttribute('aria-pressed', on ? 'false' : 'true');
        });
      })(flips[f]);
    }

    /* scroll driven blocks */
    var reduced = reduceMQ.matches;
    var blocks = [];
    var nodes = $$('[data-anim]');
    for (var n = 0; n < nodes.length; n++) {
      var el = nodes[n];
      var type = el.getAttribute('data-anim');
      var b = { el: el, type: type, items: [], p: -1, links: [] };
      if (type === 'rows') {
        b.items = Array.prototype.slice.call(el.querySelectorAll('tbody tr'));
      } else if (type === 'risk' || type === 'roadmap') {
        b.items = Array.prototype.slice.call(el.querySelectorAll('.risk-tile, .rm-card'));
      }
      blocks.push(b);
    }

    function prepJourney(b) {
      b.tangles = b.el.querySelectorAll('.journey__tangle');
      b.clean = b.el.querySelector('.journey__clean');
      b.runner = b.el.querySelector('.journey__runner');
      b.nextDots = b.el.querySelector('.journey__dots--next');
      b.nowDots = b.el.querySelector('.journey__dots--now');
      if (b.clean) {
        b.len = b.clean.getTotalLength();
        b.clean.style.strokeDasharray = b.len;
        b.clean.style.strokeDashoffset = b.len;
      }
    }

    function addLink(b, svg, box, a, c, aEl, cEl, pEl) {
      var x1 = a.right - box.left;
      var y1 = a.top + a.height / 2 - box.top;
      var x2 = c.left - box.left;
      var y2 = c.top + c.height / 2 - box.top;
      var dx = Math.max(24, (x2 - x1) / 2);
      var d = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
              ' C ' + (x1 + dx).toFixed(1) + ' ' + y1.toFixed(1) + ', ' +
              (x2 - dx).toFixed(1) + ' ' + y2.toFixed(1) + ', ' +
              x2.toFixed(1) + ' ' + y2.toFixed(1);

      var line = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', d);
      line.setAttribute('class', 'line');
      var hit = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', d);
      hit.setAttribute('class', 'hit');
      svg.appendChild(line);
      svg.appendChild(hit);

      var link = { line: line, hit: hit, a: aEl, c: cEl, p: pEl, len: line.getTotalLength() };
      line.style.strokeDasharray = link.len;
      line.style.strokeDashoffset = link.len;
      b.links.push(link);
      return link;
    }

    function wireHit(b, link) {
      if (!link || !link.hit) return;
      link.hit.addEventListener('mouseenter', function () { refreshHot(b, [link]); });
      link.hit.addEventListener('mouseleave', function () { refreshHot(b, []); });
    }

    function refreshHot(b, hotLinks) {
      var fig = b.el;
      var nodes = fig.querySelectorAll('.tn.is-hot');
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('is-hot');
      for (var j = 0; j < b.links.length; j++) b.links[j].line.classList.remove('is-hot');
      for (var k = 0; k < hotLinks.length; k++) {
        var l = hotLinks[k];
        l.line.classList.add('is-hot');
        if (l.a) l.a.classList.add('is-hot');
        if (l.c) l.c.classList.add('is-hot');
        if (l.p) l.p.classList.add('is-hot');
      }
    }

    function linksFor(b, node) {
      var out = [];
      for (var i = 0; i < b.links.length; i++) if (b.links[i].p === node) out.push(b.links[i]);
      return out;
    }

    function prepTrace(b) {
      var fig = b.el;
      var svg = fig.querySelector('.trace__lines');
      if (!svg) return;
      var box = fig.getBoundingClientRect();
      if (!box.width) return;

      for (var o = 0; o < b.links.length; o++) {
        if (b.links[o].line.parentNode) b.links[o].line.parentNode.removeChild(b.links[o].line);
      }
      svg.innerHTML = '';
      b.links = [];

      svg.setAttribute('viewBox', '0 0 ' + Math.round(box.width) + ' ' + Math.round(box.height));
      svg.style.width = box.width + 'px';
      svg.style.height = box.height + 'px';

      var prob = fig.querySelectorAll('.tn--problem');
      for (var i = 0; i < prob.length; i++) {
        (function (node) {
          var on = function () { refreshHot(b, linksFor(b, node)); };
          var off = function () { refreshHot(b, []); };
          node.addEventListener('mouseenter', on);
          node.addEventListener('mouseleave', off);
          node.addEventListener('focus', on);
          node.addEventListener('blur', off);
        })(prob[i]);
        var pEl = prob[i];
        var pr = pEl.getBoundingClientRect();
        var reqs = (pEl.getAttribute('data-reqs') || '').split(/\s+/).filter(Boolean);
        var metrics = (pEl.getAttribute('data-metric') || '').split(/\s+/).filter(Boolean);
        for (var r = 0; r < reqs.length; r++) {
          var rEl = doc.getElementById('tn-' + reqs[r]);
          if (!rEl) continue;
          var rr = rEl.getBoundingClientRect();
          var l1 = addLink(b, svg, box, pr, rr, pEl, rEl, pEl);
          wireHit(b, l1);
          for (var m = 0; m < metrics.length; m++) {
            var mEl = doc.getElementById('tn-' + metrics[m]);
            if (mEl) {
              var l2 = addLink(b, svg, box, rr, mEl.getBoundingClientRect(), rEl, mEl, pEl);
              wireHit(b, l2);
            }
          }
        }
      }
    }

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function apply(b, p) {
      var i, k, lag;
      if (b.type === 'rows') {
        for (i = 0; i < b.items.length; i++) {
          lag = i * 0.06;
          k = easeOut(clamp((p - lag) / 0.45, 0, 1));
          b.items[i].style.opacity = k.toFixed(2);
          b.items[i].style.transform = 'translateX(' + ((1 - k) * -14).toFixed(1) + 'px)';
        }
      } else if (b.type === 'risk') {
        for (i = 0; i < b.items.length; i++) {
          lag = i * 0.07;
          k = easeOut(clamp((p - lag) / 0.4, 0, 1));
          b.items[i].style.opacity = k.toFixed(2);
          b.items[i].style.transform = 'translateY(' + ((1 - k) * -26).toFixed(1) + 'px) scale(' + (0.96 + 0.04 * k).toFixed(3) + ')';
        }
      } else if (b.type === 'roadmap') {
        for (i = 0; i < b.items.length; i++) {
          lag = i * 0.1;
          k = easeOut(clamp((p - lag) / 0.4, 0, 1));
          b.items[i].style.opacity = k.toFixed(2);
          b.items[i].style.transform = 'translateX(' + ((1 - k) * 46).toFixed(1) + 'px)';
        }
      } else if (b.type === 'journey') {
        if (b.tangles) {
          for (var t = 0; t < b.tangles.length; t++) {
            b.tangles[t].style.opacity = (1 - clamp(p * 1.6, 0, 1)).toFixed(2);
            b.tangles[t].style.strokeDashoffset = (-p * 300).toFixed(1);
          }
        }
        if (b.nowDots) b.nowDots.style.opacity = (1 - clamp(p * 1.4, 0, 1)).toFixed(2);
        if (b.clean) {
          b.clean.style.strokeDashoffset = (b.len * (1 - p)).toFixed(1);
          if (b.runner) {
            var pt = b.clean.getPointAtLength(b.len * Math.max(0.001, p));
            b.runner.style.left = (pt.x / 900 * 100).toFixed(2) + '%';
            b.runner.style.top = (pt.y / 240 * 100).toFixed(2) + '%';
            b.runner.style.opacity = p > 0.03 ? '1' : '0';
          }
        }
        if (b.nextDots) b.nextDots.style.opacity = clamp(p * 1.3, 0, 1).toFixed(2);
      } else if (b.type === 'trace') {
        for (i = 0; i < b.links.length; i++) {
          lag = i * 0.035;
          k = clamp((p - lag) / 0.5, 0, 1);
          b.links[i].line.style.strokeDashoffset = (b.links[i].len * (1 - k)).toFixed(1);
        }
      }
    }

    function frame() {
      var vh = state.vh || window.innerHeight;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var r = b.el.getBoundingClientRect();
        if (r.bottom < -vh * 0.3 || r.top > vh * 1.25) continue;
        var p = clamp((vh * 0.9 - r.top) / (vh * 0.55), 0, 1);
        if (Math.abs(p - b.p) < 0.003) continue;
        b.p = p;
        apply(b, p);
      }
    }

    function rebuild() {
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].type === 'journey') prepJourney(blocks[i]);
        if (blocks[i].type === 'trace') prepTrace(blocks[i]);
      }
    }

    rebuild();

    if (reduced) {
      for (var rb = 0; rb < blocks.length; rb++) {
        blocks[rb].p = 1;
        apply(blocks[rb], 1);
      }
      updateRail();
      var rq = false;
      window.addEventListener('scroll', function () {
        if (rq) return;
        rq = true;
        window.requestAnimationFrame(function () {
          rq = false;
          state.vh = window.innerHeight;
          updateRail();
        });
      }, { passive: true });
      return;
    }

    frame();
    updateRail();

    var queued = false;
    function onScrollPrd() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        state.vh = window.innerHeight;
        frame();
        updateRail();
      });
    }

    window.addEventListener('scroll', onScrollPrd, { passive: true });
    window.addEventListener('resize', function () {
      window.clearTimeout(state.prdResize);
      state.prdResize = window.setTimeout(function () {
        state.vh = window.innerHeight;
        rebuild();
        frame();
        updateRail();
      }, 200);
    });
  }

  function init() {
    state.vw = window.innerWidth;
    state.vh = window.innerHeight;
    measure();
    particles.resize();
    initReveals();
    initToolClusters();
    initPrd();
    wireNav();
    wireCaseCards();

    /* case pages have no chapters: reveals and links are all they need */
    if (!chapters.length) return;

    if (reduceMQ.matches) {
      goPlain(null);
      return;
    }

    buildDragon();
    buildPath();
    measure();
    applyProgress();
    updateDragon(performance.now());
    start();

    var t;
    window.addEventListener('resize', function () {
      window.clearTimeout(t);
      t = window.setTimeout(onResize, 180);
    }, { passive: true });

    if (doc.fonts && doc.fonts.ready) {
      doc.fonts.ready.then(function () { window.setTimeout(onResize, 60); });
    }

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) {
        state.last = 0;
      }
    });

    if (reduceMQ.addEventListener) {
      reduceMQ.addEventListener('change', function (e) {
        if (e.matches) goPlain(null);
      });
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
