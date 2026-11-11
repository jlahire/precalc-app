/* =====================================================================
   Graph: hand-drawn function graphs on graph paper (inline SVG).
   Graph.svg({ fns:[{f, cls, label}], win:{xmin,xmax,ymin,ymax}, pi:true,
               vas:[x], has:[y], slants:[{m,b}], points:[{x,y,label,open}] })
   Graph.autoWindow(f, {xs:[], ys:[], trig:{period, start}})
   ===================================================================== */
(function (global) {
'use strict';

function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }
function niceStep(span, target) {
  var raw = span / (target || 10), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
/* x as a fraction of π, e.g. 0.75π -> "3π/4" */
function piLabel(x) {
  var r = x / Math.PI;
  for (var d = 1; d <= 12; d++) {
    var n = Math.round(r * d);
    if (Math.abs(n / d - r) < 1e-7) {
      if (n === 0) return '0';
      var g = gcd(n, d); n /= g; var dd = d / g;
      var top = (n < 0 ? '-' : '') + (Math.abs(n) === 1 ? '' : Math.abs(n)) + 'π';
      return dd === 1 ? top : top + '/' + dd;
    }
  }
  return fmt(x);
}
function fmt(x) { var r = Math.round(x * 1000) / 1000; return (Math.abs(r) < 1e-9 ? 0 : r).toString(); }

function percentile(arr, p) { if (!arr.length) return 0; var i = Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1)))); return arr[i]; }

function autoWindow(f, hints) {
  hints = hints || {};
  var xs = (hints.xs || []).filter(isFinite), ys = (hints.ys || []).filter(isFinite);
  var xmin, xmax;
  if (hints.trig) {
    var P = hints.trig.period, st = hints.trig.start || 0;
    xmin = Math.min(st - P * 0.5, -P * 0.25); xmax = Math.max(st + P * 1.75, P * 1.25);
    if (hints.trig.cycles) { xmax = Math.max(xmax, st + P * hints.trig.cycles + P * 0.25); }
  } else if (xs.length) {
    var lo = Math.min.apply(null, xs.concat([0])), hi = Math.max.apply(null, xs.concat([0]));
    var span = Math.max(hi - lo, 4), pad = Math.max(2, span * 0.45);
    xmin = lo - pad; xmax = hi + pad;
  } else { xmin = -10; xmax = 10; }
  if (hints.xmin != null) xmin = hints.xmin;
  if (hints.xmax != null) xmax = hints.xmax;
  /* y from the samples, ignoring blow-ups near asymptotes */
  var vals = [];
  for (var i = 0; i <= 400; i++) { var x = xmin + (xmax - xmin) * i / 400, y; try { y = f(x); } catch (e) { y = NaN; } if (isFinite(y)) vals.push(y); }
  vals.sort(function (a, b) { return a - b; });
  var ymin, ymax;
  if (!vals.length) { ymin = -10; ymax = 10; }
  else {
    var p0 = percentile(vals, hints.vas && hints.vas.length ? 0.08 : 0), p1 = percentile(vals, hints.vas && hints.vas.length ? 0.92 : 1);
    ymin = Math.min(p0, 0); ymax = Math.max(p1, 0);
    ys.forEach(function (y) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); });
    var h = ymax - ymin; if (h < 4) { var mid = (ymax + ymin) / 2; ymin = Math.min(ymin, mid - 2); ymax = Math.max(ymax, mid + 2); h = ymax - ymin; }
    ymin -= h * 0.15; ymax += h * 0.15;
    if (ymax - ymin > 60) { var med = percentile(vals, 0.5); ymin = Math.max(ymin, med - 30); ymax = Math.min(ymax, med + 30); }
  }
  return { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
}

function wobblePath(pts, rand, amt) {
  if (!pts.length) return '';
  var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (var i = 1; i < pts.length; i++) d += 'L' + (pts[i][0] + (rand() - 0.5) * amt).toFixed(1) + ' ' + (pts[i][1] + (rand() - 0.5) * amt).toFixed(1);
  return d;
}
function handLine(x1, y1, x2, y2, rand) {      /* slightly bowed straight line */
  var mx = (x1 + x2) / 2 + (rand() - 0.5) * 2.2, my = (y1 + y2) / 2 + (rand() - 0.5) * 2.2;
  return 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/* a label; "a/b" is drawn as a little stacked fraction */
function label(x, y, s, cls, anchor) {
  s = String(s);
  var m = /^(-?)([^/]+)\/(.+)$/.exec(s);
  if (m) {
    var w = Math.max(m[2].length, m[3].length) * 6.4 + 4, cx = anchor === 'end' ? x - w / 2 : anchor === 'start' ? x + w / 2 + (m[1] ? 8 : 0) : x;
    return '<g class="' + cls + '">' + (m[1] ? '<text x="' + (cx - w / 2 - 3).toFixed(1) + '" y="' + (y + 1).toFixed(1) + '" text-anchor="end">−</text>' : '') +
      '<text x="' + cx.toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle">' + esc(m[2]) + '</text>' +
      '<path class="gp-fbar" d="M' + (cx - w / 2).toFixed(1) + ' ' + (y - 2.5).toFixed(1) + 'q' + (w / 2).toFixed(1) + ' -1 ' + w.toFixed(1) + ' 0.6"/>' +
      '<text x="' + cx.toFixed(1) + '" y="' + (y + 10).toFixed(1) + '" text-anchor="middle">' + esc(m[3]) + '</text></g>';
  }
  return '<text class="' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (anchor || 'middle') + '">' + esc(s.replace(/^-/, '−')) + '</text>';
}

function svg(spec) {
  var narrow = typeof window !== 'undefined' && window.innerWidth && window.innerWidth < 600;
  var W = spec.w || (narrow ? 400 : 600), H = spec.h || (narrow ? 330 : 400), M = { l: 14, r: 14, t: 14, b: 14 };
  var win = spec.win || autoWindow(spec.fns[0].f, spec.hints || {});
  var x0 = win.xmin, x1 = win.xmax, y0 = win.ymin, y1 = win.ymax;
  var X = function (x) { return M.l + (x - x0) / (x1 - x0) * (W - M.l - M.r); };
  var Y = function (y) { return H - M.b - (y - y0) / (y1 - y0) * (H - M.t - M.b); };
  var rand = rng(spec.seed || 12345);
  var id = 'gp' + Math.floor(Math.random() * 1e9).toString(36);
  var out = [];
  REG[id] = { fns: spec.fns || [], x0: x0, x1: x1, y0: y0, y1: y1, W: W, H: H, M: M, pi: !!spec.pi };
  regOrder.push(id); if (regOrder.length > 80) delete REG[regOrder.shift()];
  out.push('<svg class="gp" data-gid="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(spec.aria || 'Graph') + '" xmlns="http://www.w3.org/2000/svg">');
  out.push('<defs><clipPath id="' + id + '"><rect x="' + M.l + '" y="' + M.t + '" width="' + (W - M.l - M.r) + '" height="' + (H - M.t - M.b) + '"/></clipPath></defs>');
  out.push('<rect class="gp-paper" x="0" y="0" width="' + W + '" height="' + H + '" rx="4"/>');
  /* grid */
  var xs, xstep;
  if (spec.pi) {
    var piSteps = [1 / 12, 1 / 8, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 1, 2, 4, 8];
    xstep = Math.PI * (spec.xstepPi || piSteps.filter(function (s) { return (x1 - x0) / (s * Math.PI) <= 16; })[0] || 8);
  } else xstep = spec.xstep || niceStep(x1 - x0, 12);
  var ystep = spec.ystep || niceStep(y1 - y0, 10);
  var g = [];
  for (var gx = Math.ceil(x0 / xstep) * xstep; gx <= x1 + 1e-9; gx += xstep) g.push('M' + X(gx).toFixed(1) + ' ' + M.t + 'V' + (H - M.b));
  for (var gy = Math.ceil(y0 / ystep) * ystep; gy <= y1 + 1e-9; gy += ystep) g.push('M' + M.l + ' ' + Y(gy).toFixed(1) + 'H' + (W - M.r));
  out.push('<path class="gp-grid" d="' + g.join('') + '"/>');
  /* axes */
  var ax = Math.min(Math.max(0, y0), y1), ay = Math.min(Math.max(0, x0), x1);
  out.push('<path class="gp-axis" d="' + handLine(M.l, Y(ax), W - M.r, Y(ax), rand) + handLine(X(ay), H - M.b, X(ay), M.t, rand) + '"/>');
  out.push('<path class="gp-axis" d="M' + (W - M.r - 9) + ' ' + (Y(ax) - 5) + 'L' + (W - M.r) + ' ' + Y(ax) + 'L' + (W - M.r - 9) + ' ' + (Y(ax) + 5) + 'M' + (X(ay) - 5) + ' ' + (M.t + 9) + 'L' + X(ay) + ' ' + M.t + 'L' + (X(ay) + 5) + ' ' + (M.t + 9) + '"/>');
  out.push(label(W - M.r - 4, Y(ax) - 9, spec.xname || 'x', 'gp-axname', 'end') + label(X(ay) + 12, M.t + 14, spec.yname || 'y', 'gp-axname', 'start'));
  /* tick labels */
  var labs = [], every = Math.max(1, Math.ceil(((x1 - x0) / xstep) / (W / 70)));
  var k = 0;
  for (var tx = Math.ceil(x0 / xstep) * xstep; tx <= x1 + 1e-9; tx += xstep, k++) {
    if (Math.abs(tx) < xstep / 2 || k % every) continue;
    var px = X(tx);
    labs.push('<path class="gp-tick" d="M' + px.toFixed(1) + ' ' + (Y(ax) - 4) + 'v8"/>');
    var ly = Y(ax) + 17; if (ly > H - M.b - 4) ly = Y(ax) - 18;
    labs.push(label(px, ly, spec.pi ? piLabel(tx) : fmt(tx), 'gp-lab'));
  }
  var everyY = Math.max(1, Math.ceil(((y1 - y0) / ystep) / (H / 34)));
  k = 0;
  for (var ty = Math.ceil(y0 / ystep) * ystep; ty <= y1 + 1e-9; ty += ystep, k++) {
    if (Math.abs(ty) < ystep / 2 || k % everyY) continue;
    var py = Y(ty), lx = X(ay) - 7, anc = 'end';
    if (lx < M.l + 18) { lx = X(ay) + 7; anc = 'start'; }
    labs.push('<path class="gp-tick" d="M' + (X(ay) - 4) + ' ' + py.toFixed(1) + 'h8"/>');
    labs.push(label(lx, py + 5, fmt(ty), 'gp-lab', anc));
  }
  out.push(labs.join(''));
  out.push('<g clip-path="url(#' + id + ')">');
  /* asymptotes */
  (spec.vas || []).forEach(function (v) { if (v >= x0 && v <= x1) out.push('<path class="gp-asym" d="' + handLine(X(v), M.t, X(v), H - M.b, rand) + '"/>'); });
  (spec.has || []).forEach(function (v) { if (v >= y0 && v <= y1) out.push('<path class="gp-asym" d="' + handLine(M.l, Y(v), W - M.r, Y(v), rand) + '"/>'); });
  (spec.slants || []).forEach(function (s) { out.push('<path class="gp-asym" d="M' + X(x0) + ' ' + Y(s.m * x0 + s.b) + 'L' + X(x1) + ' ' + Y(s.m * x1 + s.b) + '"/>'); });
  (spec.hlines || []).forEach(function (h) { out.push('<path class="gp-mid" d="' + handLine(M.l, Y(h), W - M.r, Y(h), rand) + '"/>'); });
  /* curves */
  var Hspan = y1 - y0;
  (spec.fns || []).forEach(function (fn, fi) {
    var N = spec.samples || 900, segs = [], cur = [], prev = null;
    for (var i = 0; i <= N; i++) {
      var x = x0 + (x1 - x0) * i / N, y;
      try { y = fn.f(x); } catch (e) { y = NaN; }
      var ok = isFinite(y) && Math.abs(y) < 1e7;
      if (ok && prev !== null && Math.abs(y - prev) > Hspan * 1.1) {
        if (cur.length > 1) segs.push(cur); cur = [];
      }
      if (ok) {
        var cy = Math.max(y0 - Hspan * 2, Math.min(y1 + Hspan * 2, y));
        cur.push([X(x), Y(cy)]); prev = y;
      } else { if (cur.length > 1) segs.push(cur); cur = []; prev = null; }
    }
    if (cur.length > 1) segs.push(cur);
    var d = segs.map(function (s) { return wobblePath(s, rand, 0.5); }).join('');
    out.push('<path class="gp-curve ' + (fn.cls || ('gp-c' + fi)) + '" d="' + d + '"/>');
  });
  out.push('</g>');
  /* points */
  (spec.points || []).forEach(function (p) {
    if (!(p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1)) return;
    var px = X(p.x), py = Y(p.y);
    out.push('<circle class="' + (p.open ? 'gp-open' : 'gp-pt') + (p.cls ? ' ' + p.cls : '') + '" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (p.open ? 4.6 : 4.2) + '"/>');
    if (p.label) {
      var right = px < W - 120, up = py > M.t + 30;
      out.push('<text class="gp-plab" x="' + (px + (right ? 8 : -8)).toFixed(1) + '" y="' + (py + (up ? -9 : 18)).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '">' + esc(p.label) + '</text>');
    }
  });
  if (spec.legend && spec.legend.length) {
    var lyy = M.t + 6;
    spec.legend.forEach(function (lg, i) {
      out.push('<path class="gp-curve ' + (lg.cls || 'gp-c' + i) + '" d="M' + (W - M.r - 150) + ' ' + (lyy + 14 + i * 20) + 'h26"/>' + '<text class="gp-plab" x="' + (W - M.r - 118) + '" y="' + (lyy + 19 + i * 20) + '">' + esc(lg.label) + '</text>');
    });
  }
  out.push('<g class="gp-trace" aria-hidden="true"></g></svg>');
  return out.join('');
}

/* ---------------- tracing: hover with a mouse, or drag a finger, to read coordinates ---------------- */
var REG = {}, regOrder = [];
function niceX(x, g) {
  var span = g.x1 - g.x0;
  if (g.pi) { for (var d = 1; d <= 12; d++) { var n = Math.round(x / Math.PI * d); if (Math.abs(n * Math.PI / d - x) < span / 180) return { x: n * Math.PI / d, t: piLabel(n * Math.PI / d) }; } }
  var st = niceStep(span, 60), xs = Math.round(x / st) * st;
  return { x: xs, t: fmt(xs) };
}
function traceAt(svg, clientX) {
  var g = REG[svg.getAttribute('data-gid')], layer = svg.querySelector('.gp-trace');
  if (!g || !layer) return;
  var r = svg.getBoundingClientRect(), px = (clientX - r.left) / r.width * g.W;
  var x = g.x0 + (px - g.M.l) / (g.W - g.M.l - g.M.r) * (g.x1 - g.x0);
  if (x < g.x0 || x > g.x1) { layer.innerHTML = ''; return; }
  var nx = niceX(x, g), X = function (v) { return g.M.l + (v - g.x0) / (g.x1 - g.x0) * (g.W - g.M.l - g.M.r); }, Y = function (v) { return g.H - g.M.b - (v - g.y0) / (g.y1 - g.y0) * (g.H - g.M.t - g.M.b); };
  var h = '<path class="gp-trace-line" d="M' + X(nx.x).toFixed(1) + ' ' + g.M.t + 'V' + (g.H - g.M.b) + '"/>', row = 0;
  g.fns.slice(0, 2).forEach(function (fn, i) {
    var y; try { y = fn.f(nx.x); } catch (e) { y = NaN; }
    var cx = X(nx.x), right = cx < g.W - 150;
    if (!isFinite(y) || y < g.y0 || y > g.y1) { h += '<text class="gp-trace-lab" x="' + (cx + (right ? 8 : -8)) + '" y="' + (g.M.t + 18 + row++ * 22) + '" text-anchor="' + (right ? 'start' : 'end') + '">x = ' + esc(nx.t) + ': undefined here</text>'; return; }
    var cy = Y(y), yt = String(Math.round(y * 100) / 100);
    var lbl = '(' + nx.t + (g.pi && nx.t !== fmt(nx.x) ? ' ≈ ' + fmt(nx.x) : '') + ', ' + yt + ')';
    h += '<circle class="gp-trace-pt ' + (fn.cls || 'gp-c' + i) + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5.5"/>' +
      '<text class="gp-trace-lab" x="' + (cx + (right ? 10 : -10)).toFixed(1) + '" y="' + (cy + (cy > g.M.t + 30 ? -12 : 22) + i * 20).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '">' + esc(lbl) + '</text>';
  });
  layer.innerHTML = h;
}
if (typeof document !== 'undefined') {
  var active = null;
  document.addEventListener('pointermove', function (e) {
    var svg = e.target.closest && e.target.closest('svg.gp[data-gid]');
    if (svg) { active = svg; traceAt(svg, e.clientX); }
    else if (active && e.pointerType === 'mouse') { active.querySelector('.gp-trace').innerHTML = ''; active = null; }
  }, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    var svg = e.target.closest && e.target.closest('svg.gp[data-gid]');
    if (svg) { active = svg; traceAt(svg, e.clientX); }
  }, { passive: true });
}

global.Graph = { svg: svg, autoWindow: autoWindow, piLabel: piLabel, niceStep: niceStep };
})(typeof window !== 'undefined' ? window : globalThis);
