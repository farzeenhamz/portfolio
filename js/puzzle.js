/*!
 * puzzle.js - dependency free jigsaw geometry.
 *
 * Every piece on the site comes from here: cards, chips, the dragon's body
 * segments and the masks used for chapter transitions.
 *
 *   Puzzle.piece({ width, height, sides, seed })   -> path data in px
 *   Puzzle.normalized(sides, seed, margin)         -> { d, size, margin }
 *
 * sides accepts { top, right, bottom, left }, each 'out', 'in' or 'flat'.
 * A tab that is 'out' on one piece is 'in' on its neighbour, so two pieces
 * that share an edge interlock. Tab position, width and depth are jittered
 * from the seed, so no two pieces look the same.
 */
(function (global) {
  'use strict';

  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function n(v) {
    return Math.round(v * 100) / 100;
  }

  function edge(x0, y0, x1, y1, nx, ny, kind, rnd, depth) {
    if (!kind || kind === 'flat') {
      return ' L ' + n(x1) + ' ' + n(y1);
    }
    var dx = x1 - x0;
    var dy = y1 - y0;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len;
    var uy = dy / len;
    var sign = kind === 'in' ? -1 : 1;

    var tabW = len * (0.30 + rnd() * 0.12);
    var d = len * depth * (0.82 + rnd() * 0.36) * sign;
    var mid = len * (0.41 + rnd() * 0.18);
    var a = mid - tabW * 0.5;
    var b = mid + tabW * 0.5;

    function pt(u, v) {
      return n(x0 + ux * u + nx * v) + ' ' + n(y0 + uy * u + ny * v);
    }

    return (
      ' L ' + pt(a, 0) +
      ' C ' + pt(mid - tabW * 0.70, d * 0.04) + ' ' + pt(mid - tabW * 1.00, d * 0.52) + ' ' + pt(mid - tabW * 0.52, d * 0.90) +
      ' C ' + pt(mid - tabW * 0.14, d * 1.14) + ' ' + pt(mid + tabW * 0.14, d * 1.14) + ' ' + pt(mid + tabW * 0.52, d * 0.90) +
      ' C ' + pt(mid + tabW * 1.00, d * 0.52) + ' ' + pt(mid + tabW * 0.70, d * 0.04) + ' ' + pt(b, 0) +
      ' L ' + n(x1) + ' ' + n(y1)
    );
  }

  function build(w, h, sides, seed, depth) {
    var rnd = rng(seed);
    var d = 'M 0 0';
    d += edge(0, 0, w, 0, 0, -1, sides.top, rnd, depth);
    d += edge(w, 0, w, h, 1, 0, sides.right, rnd, depth);
    d += edge(w, h, 0, h, 0, 1, sides.bottom, rnd, depth);
    d += edge(0, h, 0, 0, -1, 0, sides.left, rnd, depth);
    return d + ' Z';
  }

  function piece(opts) {
    opts = opts || {};
    var w = opts.width || 100;
    var h = opts.height || 100;
    var sides = opts.sides || {};
    return build(w, h, sides, opts.seed || 1, opts.depth == null ? 0.17 : opts.depth);
  }

  function normalized(sides, seed, margin, depth) {
    var m = margin == null ? 0.09 : margin;
    var size = 1 - m * 2;
    return { d: build(size, size, sides || {}, seed || 1, depth == null ? 0.1 : depth), size: size, margin: m };
  }

  var SIDES = [
    { top: 'out', right: 'in', bottom: 'flat', left: 'in' },
    { top: 'in', right: 'out', bottom: 'in', left: 'flat' },
    { top: 'flat', right: 'in', bottom: 'out', left: 'out' },
    { top: 'in', right: 'flat', bottom: 'in', left: 'out' },
    { top: 'out', right: 'flat', bottom: 'flat', left: 'in' },
    { top: 'in', right: 'in', bottom: 'out', left: 'flat' }
  ];

  global.Puzzle = { piece: piece, normalized: normalized, sides: SIDES };
})(window);
