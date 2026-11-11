/* =====================================================================
   Equation Helper extensions, part C: gaps found by sweeping the
   built-in practice bank.
   1. "Inverse" for a function that is NOT one-to-one: explain the
      horizontal line test with a concrete counterexample, and give the
      inverse on a restricted domain when the function is a quadratic.
   2. Range of any rational function: set y = f(x), solve for x, and keep
      the y-values for which a real x exists (discriminant method), with
      a careful numeric method for higher degrees.
   ===================================================================== */
(function (EH) {
'use strict';
if (!EH || !EH.analyze) return;
var Q = EH.Q, q = EH.q, P = EH.P, txt = EH.txt, MathError = EH.MathError;
var baseAnalyze = EH.analyze;
function step(steps, note, math, rule) { steps.push({ note: note, math: math, rule: rule }); }
function fx(body, v) { return function (x) { var e = {}; e[v] = x; return EH.fval(body, e); }; }
function snap(x) { var s = EH.snapPi(x); return s.ex ? s.text : String(+x.toFixed(4)); }

/* ---------------- 1. one-to-one test ---------------- */
function exactAt(body, v, a) { try { var r = EH.evaluate(EH.subst(body, v, EH.num(a))); return r; } catch (e) { return null; } }
function oneToOne(body, v) {
  var f = fx(body, v), N = 6000, lo = -40, hi = 40, prev = null, dir = 0, branches = [], cur = null;
  for (var i = 0; i <= N; i++) {
    var x = lo + (hi - lo) * i / N, y = f(x);
    if (!isFinite(y) || Math.abs(y) > 1e9) { if (cur) branches.push(cur); cur = null; prev = null; dir = 0; continue; }
    if (cur && prev !== null && Math.abs(y - prev) > 1e6) { branches.push(cur); cur = null; dir = 0; }
    if (!cur) cur = { min: y, max: y };
    if (prev !== null && cur) {
      var d = y - prev;
      if (Math.abs(d) > 1e-12) { var s = d > 0 ? 1 : -1; if (dir && s !== dir) return { ok: false, turn: x }; dir = s; }
    }
    cur.min = Math.min(cur.min, y); cur.max = Math.max(cur.max, y); prev = y;
  }
  if (cur) branches.push(cur);
  for (var a = 0; a < branches.length; a++) for (var b = a + 1; b < branches.length; b++)
    if (Math.min(branches[a].max, branches[b].max) - Math.max(branches[a].min, branches[b].min) > 1e-6) return { ok: false, overlap: true };
  return { ok: true };
}
function counterexample(body, v) {
  /* two different whole numbers with exactly the same output */
  var vals = [];
  for (var a = -6; a <= 6; a++) { var r = exactAt(body, v, a); if (r && r.ex) vals.push({ a: a, r: r }); }
  var best = null;
  for (var i = 0; i < vals.length; i++) for (var j = i + 1; j < vals.length; j++) if (vals[i].r.ex.eq(vals[j].r.ex)) {
    var size = Math.max(Math.abs(vals[i].a), Math.abs(vals[j].a));
    if (!best || size < best.size) best = { a: vals[i].a, b: vals[j].a, y: vals[i].r.text, size: size };
  }
  return best;
}
function notOneToOne(info, res) {
  var body = info.body, v = info.v, fam = info.family || {}, steps = res.steps, A = res.answer;
  var fname = info.fname && info.fname !== 'y' ? info.fname : 'f';
  var ce = counterexample(body, v);
  step(steps, 'An inverse must send every output back to ONE input. That only works if the function is one-to-one: no two inputs share an output. Graph test: the horizontal line test. If some horizontal line hits the graph more than once, there is no inverse.', null, 'inverse');
  if (ce) step(steps, 'Find two inputs with the same output:', fname + '(' + ce.a + ') = ' + ce.y + '   and   ' + fname + '(' + ce.b + ') = ' + ce.y + '\nThe horizontal line y = ' + ce.y + ' hits the graph at x = ' + ce.a + ' and x = ' + ce.b + '.', 'inverse');
  else step(steps, 'The graph turns around (it rises, then falls, or the reverse), so a horizontal line just above or below the turning point crosses it twice.', null, 'inverse');
  A.push(fname + ' has no inverse function: it is not one-to-one' + (ce ? ' (' + fname + '(' + ce.a + ') = ' + fname + '(' + ce.b + ') = ' + ce.y + ')' : '') + '.');
  res.svgHline = ce ? Number(EH.fval(EH.parse(ce.y))) : null;
  if (fam.name === 'quadratic') {
    var p = fam.poly, a = p.co(2), bq = p.co(1), c = p.co(0);
    var h = bq.neg().div(a.mul(q(2))), k = p.eval ? p.eval(h) : c.sub(bq.mul(bq).div(a.mul(q(4))));
    var X = v, wrap = function (t) { return /^-/.test(t) || /\//.test(t) ? '(' + t + ')' : t; };
    var shift = h.isZero() ? X : '(' + X + (h.sign() > 0 ? ' - ' + h : ' + ' + h.neg()) + ')';
    var vform = (a.isOne() ? '' : a.eq(q(-1)) ? '-' : wrap(a.toString())) + shift + '²' + (k.isZero() ? '' : k.sign() > 0 ? ' + ' + k : ' - ' + k.neg());
    var top = a.sign() > 0 ? (k.isZero() ? X : X + (k.sign() > 0 ? ' - ' + k : ' + ' + k.neg())) : (k.isZero() ? '-' + X : k + ' - ' + X);
    var aa = a.abs(), inside = aa.isOne() ? top : (/ /.test(top) ? '(' + top + ')' : top) + '/' + wrap(aa.toString());
    var hT = h.isZero() ? '' : h.toString() + ' + ';
    var inv = hT + '√(' + inside + ')';
    step(steps, 'Fix: restrict the domain to ONE side of the vertex, where the parabola only rises or only falls. Write it in vertex form first (complete the square); the vertex is (' + h + ', ' + k + ').', 'y = ' + vform + ',   ' + X + ' ≥ ' + h, 'complete-square');
    var yform = vform.replace(new RegExp(X === 'x' ? 'x' : X, 'g'), 'y'), sqY = shift.replace(new RegExp(X === 'x' ? 'x' : X, 'g'), 'y') + '²';
    var lhsK = k.isZero() ? X : X + (k.sign() > 0 ? ' - ' + k : ' + ' + k.neg());
    var sw = [X + ' = ' + yform];
    if (!k.isZero()) sw.push(lhsK + ' = ' + (a.isOne() ? '' : a.eq(q(-1)) ? '-' : wrap(a.toString())) + sqY + '        (' + (k.sign() > 0 ? 'subtract ' + k : 'add ' + k.neg()) + ' on both sides)');
    if (!a.isOne()) sw.push(inside + ' = ' + sqY + '        (divide both sides by ' + a + ')');
    sw.push('±√(' + inside + ') = ' + shift.replace(new RegExp(X === 'x' ? 'x' : X, 'g'), 'y').replace(/^\((.*)\)$/, '$1') + '        (square root of both sides)');
    sw.push('y = ' + inv + '        (' + (h.isZero() ? '' : 'add ' + h + '; ') + 'keep +, since the restricted inputs are ≥ ' + h + ')');
    step(steps, 'Now swap ' + X + ' and y and solve for y, one move at a time.', sw.join('\n'), 'inverse');
    A.push('With the domain restricted to ' + X + ' ≥ ' + h + ':   ' + fname + '⁻¹(' + X + ') = ' + inv + (a.sign() > 0 ? ',   ' + X + ' ≥ ' + k : ',   ' + X + ' ≤ ' + k));
    res.notes.push('Restricting to ' + X + ' ≤ ' + h + ' instead gives the other half: ' + (h.isZero() ? '' : h + ' ') + '- √(' + inside + ').');
  } else {
    res.notes.push('To get an inverse anyway, restrict the domain to a stretch where the graph only rises or only falls (between turning points), then swap x and y on that piece.');
  }
  res.title = 'Function (not one-to-one)';
  res.topics.push('inverse');
}

/* ---------------- 2. range of a rational function ---------------- */
function lin(c0, c1) { return new P([c0, c1]); }              /* c0 + c1·y */
function removePoint(set, val, text) {
  var out = [];
  set.forEach(function (r) {
    var inside = val > r.lo.f && val < r.hi.f || (val === r.lo.f && r.lc) || (val === r.hi.f && r.hc);
    if (!inside) { out.push(r); return; }
    if (r.lo.f === r.hi.f) return;
    var p = { f: val, text: text };
    if (val > r.lo.f || (val === r.lo.f && false)) out.push({ lo: r.lo, hi: p, lc: r.lc, hc: false });
    if (val < r.hi.f) out.push({ lo: p, hi: r.hi, lc: false, hc: r.hc });
  });
  return out.filter(function (r) { return r.lo.f < r.hi.f || (r.lc && r.hc); });
}
function addPoint(set, val, text) {
  if (set.some(function (r) { return (val > r.lo.f && val < r.hi.f) || (val === r.lo.f && r.lc) || (val === r.hi.f && r.hc); })) return set;
  return EH.union(set, [{ lo: { f: val, text: text }, hi: { f: val, text: text }, lc: true, hc: true }]);
}
function realRoots(a, b, c) {          /* floats */
  if (Math.abs(a) < 1e-14) return Math.abs(b) < 1e-14 ? [] : [-c / b];
  var d = b * b - 4 * a * c; if (d < -1e-12) return []; d = Math.max(0, d);
  return [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)];
}
function rationalRange(info, res) {
  var v = info.v, fam = info.family, steps = res.steps, X = v;
  var rf = fam.rf, red = rf.reduce(), g = EH.pgcd(rf.n, rf.d), Nn = red.n, D = red.d;
  var holes = g.deg() > 0 ? EH.numericRoots(g) : [];
  var deg = Math.max(Nn.deg(), D.deg());
  if (deg > 2) return numericRange(info, res, red, holes);
  var co = function (p, i) { return p.co(i); };
  var Ay = lin(co(Nn, 2).neg(), co(D, 2)), By = lin(co(Nn, 1).neg(), co(D, 1)), Cy = lin(co(Nn, 0).neg(), co(D, 0));
  var yt = function (p) { var t = p.text('y'); return /[ +\-]/.test(t.slice(1)) ? '(' + t + ')' : t; };
  step(steps, 'The range is every y that some real x produces. Set y = f(' + X + ') and solve for ' + X + ': whatever y makes that impossible is NOT in the range.' + (holes.length ? ' Use the simplified function, then deal with the hole at the end.' : ''), 'y = ' + EH.fracText(Nn.text(X), D.text(X)), 'range');
  var eqParts = [];
  if (!Ay.isZero()) eqParts.push(yt(Ay) + X + '²'); if (!By.isZero()) eqParts.push(yt(By) + X); if (!Cy.isZero()) eqParts.push(yt(Cy));
  step(steps, 'Multiply both sides by the denominator, then move everything to one side and group by powers of ' + X + '.', 'y(' + D.text(X) + ') = ' + Nn.text(X) + '\n' + eqParts.join(' + ') + ' = 0', 'range');
  var set;
  if (Ay.isZero()) {
    /* B(y)·x + C(y) = 0 */
    set = EH.ALL.slice();
    if (By.deg() >= 1) {
      var y0 = By.co(0).neg().div(By.co(1));
      var c0 = Cy.co(0).add(Cy.co(1).mul(y0));
      step(steps, 'This is linear in ' + X + ': ' + X + ' = -(' + Cy.text('y') + ')/(' + By.text('y') + '). That works unless the coefficient of ' + X + ' is 0.', By.text('y') + ' = 0   →   y = ' + y0 + (c0.isZero() ? '   (then every x works, so y = ' + y0 + ' stays)' : '   (then the equation says ' + c0 + ' = 0: impossible)'), 'range');
      if (!c0.isZero()) set = removePoint(set, y0.val(), y0.toString());
    }
  } else {
    var Dy = By.mul(By).sub(Ay.mul(Cy).scale(q(4)));
    step(steps, 'A quadratic in ' + X + ' has a real solution exactly when its discriminant is not negative: b² - 4ac ≥ 0 (here a, b, c contain y).', '(' + By.text('y') + ')² - 4' + yt(Ay) + yt(Cy) + ' ≥ 0\n' + Dy.text('y') + ' ≥ 0', 'discriminant');
    if (Dy.deg() <= 0) set = Dy.co(0).sign() >= 0 ? EH.ALL.slice() : [];
    else {
      var iq = EH.solveInequality(EH.parse(Dy.text('y') + ' >= 0'), 'y', steps);
      if (!iq) throw new MathError('unsupported');
      set = iq.set;
    }
    /* where the x² coefficient vanishes the equation is linear: check it separately */
    if (Ay.deg() >= 1) {
      var y1 = Ay.co(0).neg().div(Ay.co(1)), b1 = By.co(0).add(By.co(1).mul(y1)), c1 = Cy.co(0).add(Cy.co(1).mul(y1));
      var ok1 = !b1.isZero() || c1.isZero();
      step(steps, 'Special case y = ' + y1 + ': the ' + X + '² term disappears, so check that linear equation on its own.', b1 + X + ' + ' + c1 + ' = 0   →   ' + (ok1 ? (b1.isZero() ? 'true for every x' : X + ' = ' + c1.neg().div(b1) + ', so y = ' + y1 + ' IS reached') : 'impossible, so y = ' + y1 + ' is NOT reached'), 'range');
      set = ok1 ? addPoint(set, y1.val(), y1.toString()) : removePoint(set, y1.val(), y1.toString());
    }
  }
  /* holes: their y-value is lost unless another x also produces it */
  var fr = function (x) { return Nn.evalF(x) / D.evalF(x); };
  holes.forEach(function (hx) {
    var yh = fr(hx), A2 = Ay.evalF(yh), B2 = By.evalF(yh), C2 = Cy.evalF(yh);
    var others = realRoots(A2, B2, C2).filter(function (r) { return Math.abs(r - hx) > 1e-7 && Math.abs(D.evalF(r)) > 1e-9; });
    var yT = snap(yh);
    step(steps, 'The hole at ' + X + ' = ' + snap(hx) + ' would have height y = ' + yT + '. ' + (others.length ? 'Another input (' + X + ' ≈ ' + snap(others[0]) + ') also gives that height, so y = ' + yT + ' stays in the range.' : 'No other input gives that height, so remove y = ' + yT + '.'), null, 'holes');
    if (!others.length) set = removePoint(set, yh, yT);
  });
  var text = EH.setText(set);
  step(steps, 'Put it together.', 'Range: ' + text, 'range');
  return text;
}
function numericRange(info, res, red, holes) {
  var v = info.v, steps = res.steps, Nn = red.n, D = red.d;
  var f = function (x) { return Nn.evalF(x) / D.evalF(x); };
  var vas = D.deg() > 0 ? EH.numericRoots(D).sort(function (a, b) { return a - b; }) : [];
  var cuts = [-Infinity].concat(vas, [Infinity]), set = [];
  var big = function (t) { return Math.abs(t) > 1e7; };
  step(steps, 'The top has degree ' + Nn.deg() + ' and the bottom degree ' + D.deg() + ', so solving y = f(' + v + ') for ' + v + ' is not a quadratic. Instead, look at each piece of the graph between vertical asymptotes: on each piece the graph is unbroken, so it covers every height between its lowest and highest values.', vas.length ? 'vertical asymptotes at ' + v + ' = ' + vas.map(snap).join(', ') : 'no vertical asymptotes', 'range');
  var dn = Nn.deg(), dd = D.deg(), ld = Nn.lead().val() / D.lead().val();
  function endLimit(at, side) {        /* limit of f at an asymptote (side -1 = from the left) or at ±∞ */
    if (!isFinite(at)) {
      if (dn > dd) { var sgn = ld * ((dn - dd) % 2 && at < 0 ? -1 : 1); return sgn > 0 ? Infinity : -Infinity; }
      return dn === dd ? ld : 0;
    }
    var y = f(at + side * 1e-9); return y > 0 ? Infinity : -Infinity;
  }
  for (var k = 0; k < cuts.length - 1; k++) {
    var a = cuts[k], b = cuts[k + 1], lo = Infinity, hi = -Infinity, loAt = null, hiAt = null, n = 4000;
    for (var i = 1; i < n; i++) {
      var t = -Math.PI / 2 + Math.PI * i / n, x;
      if (!isFinite(a) && !isFinite(b)) x = Math.tan(t);
      else if (!isFinite(a)) x = b - Math.tan(Math.PI / 2 * (1 - i / n)) - 1e-9;
      else if (!isFinite(b)) x = a + Math.tan(Math.PI / 2 * i / n) + 1e-9;
      else x = a + (b - a) * i / n;
      var y = f(x); if (!isFinite(y)) continue;
      if (y < lo) { lo = y; loAt = i; } if (y > hi) { hi = y; hiAt = i; }
    }
    var e1 = endLimit(a, 1), e2 = endLimit(b, -1);
    var interiorLo = loAt > 3 && loAt < n - 3 && lo < Math.min(e1, e2) - 1e-9, interiorHi = hiAt > 3 && hiAt < n - 3 && hi > Math.max(e1, e2) + 1e-9;
    if (!interiorLo) lo = Math.min(e1, e2); if (!interiorHi) hi = Math.max(e1, e2);
    var L = !isFinite(lo) ? { f: -Infinity, text: '-∞' } : { f: lo, text: snap(lo) }, H = !isFinite(hi) ? { f: Infinity, text: '∞' } : { f: hi, text: snap(hi) };
    set = EH.union(set, [{ lo: L, hi: H, lc: interiorLo, hc: interiorHi }]);
    step(steps, 'Piece ' + (k + 1) + (isFinite(a) || isFinite(b) ? ' (' + (isFinite(a) ? snap(a) : '-∞') + ' < ' + v + ' < ' + (isFinite(b) ? snap(b) : '∞') + ')' : '') + ': heights from ' + L.text + ' to ' + H.text + (interiorLo || interiorHi ? ' (a turning point is reached and included)' : '') + '.', null, 'range');
  }
  holes.forEach(function (hx) {
    var yh = f(hx), others = [], g2 = function (x) { return f(x) - yh; }, px = -200, pv = g2(-200);
    for (var i = 1; i <= 40000; i++) {
      var x = -200 + i * 0.01, gv = g2(x);
      if (isFinite(pv) && isFinite(gv) && (pv === 0 || pv * gv < 0)) {
        var lo2 = px, hi2 = x; for (var it = 0; it < 60; it++) { var mid = (lo2 + hi2) / 2; if (g2(lo2) * g2(mid) <= 0) hi2 = mid; else lo2 = mid; }
        var root = (lo2 + hi2) / 2; if (Math.abs(root - hx) > 1e-6) others.push(root);
      }
      px = x; pv = gv;
    }
    var yT = snap(yh);
    step(steps, 'The hole at ' + v + ' = ' + snap(hx) + ' has height y = ' + yT + '. ' + (others.length ? 'Another input (' + v + ' ≈ ' + snap(others[0]) + ') reaches that height, so it stays.' : 'No other input reaches that height, so remove y = ' + yT + '.'), null, 'holes');
    if (!others.length) set = removePoint(set, yh, yT);
  });
  var text = EH.setText(set);
  res.notes.push('Turning points were located numerically (finding them exactly takes calculus); a decimal endpoint is an approximation.');
  step(steps, 'Combine the pieces.', 'Range: ' + text, 'range');
  return text;
}

/* ---------------- hook into analyze ---------------- */
EH.analyze = function (src, goal, opts) {
  var info0;
  try { info0 = EH.classify(src, opts); } catch (e) { return baseAnalyze(src, goal, opts); }
  var g = goal || info0.intentGoal || info0.goals[0];
  if (info0.kind === 'function' && g === 'inverse' && info0.family && info0.family.name !== 'constant') {
    var t = oneToOne(info0.body, info0.v);
    if (!t.ok) {
      var res = { info: info0, steps: [], answer: [], notes: [], topics: [], goal: 'inverse', src: info0.src };
      try { notOneToOne(info0, res); } catch (e) { return baseAnalyze(src, goal, opts); }
      return res;
    }
  }
  var r = baseAnalyze(src, goal, opts);
  /* one-to-one, but x appears several times until it is simplified */
  if (r.goal === 'inverse' && r.error && /appears more than once/.test(r.error) && info0.family) {
    var fam = info0.family, v = info0.v, fname = info0.fname && info0.fname !== 'y' ? info0.fname : 'f';
    var r3 = { info: r.info, steps: [], answer: [], notes: [], topics: ['inverse'], goal: 'inverse', src: r.src, title: r.title };
    var polyLike = fam.poly || (fam.name === 'rational' && fam.rf.reduce().d.isConst() ? fam.rf.reduce().n.scale(fam.rf.reduce().d.co(0).inv()) : null);
    if (polyLike) {
      var p = polyLike, ts = p.c.map(function (c, i) { return { c: c, i: i }; }).filter(function (t) { return !t.c.isZero(); });
      var top = ts[ts.length - 1], n = top.i, a = top.c, bq = p.co(0);
      var mono = ts.length <= 2 && (ts.length === 1 || ts[0].i === 0);
      if (mono && (n % 2 === 1)) {
        step(r3.steps, 'Simplify first: ' + v + ' really appears only once.', 'y = ' + p.text(v), 'simplify');
        step(r3.steps, 'Swap ' + v + ' and y, then undo the operations in reverse order: subtract, divide, take the root.', v + ' = ' + p.text('y'), 'inverse');
        /* x = (y - b)/a, written with a positive denominator */
        var neg = a.sign() < 0, aa = a.abs();
        var num = neg ? (bq.isZero() ? '-' + v : bq + ' - ' + v) : (bq.isZero() ? v : v + (bq.sign() > 0 ? ' - ' + bq : ' + ' + bq.neg()));
        var inside = aa.isOne() ? num : (/ /.test(num) ? '(' + num + ')' : num) + '/' + (aa.isInt() ? aa : '(' + aa + ')');
        var invT = n === 1 ? inside : n === 3 ? '∛(' + inside + ')' : (/^[a-zθ]$/.test(inside) ? inside : '(' + inside + ')') + '^(1/' + n + ')';
        step(r3.steps, n === 1 ? 'Solve for y.' : 'Take the ' + (n === 3 ? 'cube' : n + 'th') + ' root (an odd root keeps the sign, so no ±)' + (n > 3 ? '. The ' + n + 'th root is the same as the power 1/' + n : '') + '.', 'y = ' + invT, 'inverse');
        r3.answer.push(fname + '⁻¹(' + v + ') = ' + invT);
        return r3;
      }
      step(r3.steps, 'This polynomial is one-to-one (it only rises or only falls), so an inverse exists, but solving y = ' + p.text(v) + ' for ' + v + ' needs the cubic formula or beyond. Precalculus stops at the graph: reflect it across y = x.', null, 'inverse');
      r3.answer.push(fname + ' is one-to-one, so ' + fname + '⁻¹ exists, but it has no formula you can get with algebra at this level. Its graph is the reflection of ' + fname + ' across y = x.');
      return r3;
    }
    if (fam.name === 'rational') {
      var red = fam.rf.reduce(), g = EH.pgcd(fam.rf.n, fam.rf.d);
      var redSrc = fname + '(' + v + ') = (' + red.n.text(v) + ')/(' + red.d.text(v) + ')';
      var rr = baseAnalyze(redSrc, 'inverse', opts);
      if (!rr.error) {
        var holeXs = g.deg() > 0 ? EH.polyRoots(g).roots.map(function (z) { return z.val; }) : [];
        step(r3.steps, 'Simplify first: factor and cancel the common factor' + (g.deg() > 0 ? ' (' + g.text(v) + ')' : '') + '. Now ' + v + ' appears once on top and once on the bottom.', 'y = ' + EH.fracText(red.n.text(v), red.d.text(v)) + (holeXs.length ? ',   ' + v + ' ≠ ' + holeXs.map(function (z) { return z.text; }).join(', ') : ''), 'cancel');
        r3.steps = r3.steps.concat(rr.steps);
        r3.answer = rr.answer.slice();
        holeXs.forEach(function (z) {
          var hy = EH.evaluate(EH.parse('(' + red.n.text('x') + ')/(' + red.d.text('x') + ')').t ? EH.subst(EH.parse('(' + red.n.text('x') + ')/(' + red.d.text('x') + ')'), 'x', { t: 'raw', s: z.text, val: z }) : null);
          r3.notes.push('The original has a hole at ' + v + ' = ' + z.text + ' (height ' + hy.text + '). Domain and range swap, so the inverse leaves out ' + v + ' = ' + hy.text + ' as well.');
        });
        return r3;
      }
    }
  }
  if (r.goal === 'range' && r.error && /range of this (rational )?function is not automated/i.test(r.error) && info0.family && info0.family.name === 'rational') {
    var r2 = { info: r.info, steps: [], answer: [], notes: [], topics: ['range', 'rational-fn'], goal: 'range', src: r.src, title: 'Rational function' };
    try { r2.answer.push('Range: ' + rationalRange(info0, r2)); return r2; } catch (e) { if (!(e instanceof MathError) && !(e instanceof EH.Overflow)) throw e; }
  }
  return r;
};
EH._rationalRange = rationalRange; EH._oneToOne = oneToOne;
})(typeof EH !== 'undefined' ? EH : undefined);
