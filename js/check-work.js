/* =====================================================================
   Check My Work: type a problem and your steps, one per line.
   Finds the first step that goes wrong, names the mistake by
   reproducing it, shows the correct move, and records progress.
   ===================================================================== */
(function () {
'use strict';
if (typeof EH === 'undefined' || typeof Paper === 'undefined') return;
var P = Paper, esc = P.esc, B = EH.B, U = EH.U, F = EH.F, num = EH.num;
function $(id) { return document.getElementById(id); }
var TRIG = /^(sin|cos|tan|sec|csc|cot)$/;

/* ---------------- reading a line ---------------- */
var NOTE_RE = /^(check|so|therefore|thus|answer|note|because|since)\b[:,]?\s*/i;
function cleanLine(s) {
  return String(s).replace(/^\s*(\d+[.)]|step\s*\d+[.:]?)\s*/i, '').replace(/^\s*(=|⇒|=>|→|->|∴)\s*/, '').replace(NOTE_RE, '').trim();
}
function parseValues(rhs) {
  var vals = [];
  rhs.split(/\s*(?:,|;|\bor\b|\band\b)\s*/i).forEach(function (part) {
    part = part.replace(/^[a-zθ]\s*=\s*/i, '').replace(/\(.*?(reject|extraneous|no good|✗|x).*?\)/i, '').trim();
    if (!part) return;
    var a = EH.parse(part); if (EH.vars(a).length) throw new Error('not a value');
    var v = EH.evaluate(a); vals.push({ f: v.f, text: v.text });
  });
  return vals;
}
function readLine(raw, v, isIneq) {
  var s = cleanLine(raw);
  var o = { raw: raw, src: s };
  if (!s) { o.kind = 'blank'; return o; }
  if (/no (real )?solution|∅/i.test(s)) { o.kind = 'set'; o.set = []; return o; }
  if (/all real numbers|infinitely many|identity|0\s*=\s*0/i.test(s) && !/[a-z]\s*=/.test(s.replace(/all real numbers/i, ''))) { o.kind = 'set'; o.set = 'ALL'; return o; }
  o.reject = /reject|extraneous|no good|✗|doesn'?t work|does not work/i.test(s);
  if (/[≠]|!=/.test(s)) { o.kind = 'note'; return o; }
  /* answer lines: x = 3 or x = -1,   x = 3, -1 */
  var m = new RegExp('^\\s*' + v + '\\s*=\\s*(.+)$').exec(s.replace(/\s*\((reject|extraneous)[^)]*\)\s*/ig, ' '));
  if (m && !new RegExp('\\b' + v + '\\b').test(m[1].replace(new RegExp('\\bor\\s+' + v + '\\s*=', 'g'), ',').replace(new RegExp(',\\s*' + v + '\\s*=', 'g'), ','))) {
    try { o.kind = 'values'; o.vals = parseValues(m[1].replace(new RegExp('\\bor\\s+' + v + '\\s*=', 'g'), ',').replace(new RegExp(',\\s*' + v + '\\s*=', 'g'), ',')); return o; } catch (e) {}
  }
  if (isIneq && /^[\[(].*,.*[\])]/.test(s)) { var st = EH.parseSet(s); if (st) { o.kind = 'interval'; o.set = st; return o; } }
  try { o.ast = EH.parse(s.replace(/\s*\((reject|extraneous)[^)]*\)\s*$/i, '')); o.kind = o.ast.t === 'rel' ? 'rel' : 'expr'; }
  catch (e) { o.kind = /[a-z]{4,}/i.test(s) && !/(sin|cos|tan|log|sqrt)/i.test(s) ? 'note' : 'bad'; o.err = e.message; }
  return o;
}

/* ---------------- solution sets ---------------- */
function numericRoots(f, lo, hi) {
  var out = [], n = 12000, px = lo, pv = f(lo);
  for (var i = 1; i <= n; i++) {
    var x = lo + (hi - lo) * i / n, fv = f(x);
    if (isFinite(pv) && isFinite(fv)) {
      if (pv === 0) out.push(px);
      else if (pv * fv < 0) { var a = px, b = x; for (var k = 0; k < 70; k++) { var mid = (a + b) / 2; if (f(a) * f(mid) <= 0) b = mid; else a = mid; } var r = (a + b) / 2; if (Math.abs(f(r)) < 1e-6) out.push(r); }
    }
    px = x; pv = fv;
  }
  return out.filter(function (x, i) { return !out.slice(0, i).some(function (y) { return Math.abs(x - y) < 1e-6; }); });
}
function solveSet(ast, v, trig) {
  var src = EH.txt(ast);
  try {
    var r = EH.analyze(src, 'solve', {});
    if (!r.error) {
      var a0 = (r.answer[0] || '');
      if (/All real numbers \(identity\)/.test(a0)) return 'ALL';
      if (/^No (real )?solution/.test(a0) && !(r.sols && r.sols.length)) return [];
      if (r.sols) return r.sols.map(function (s) { return { f: s.f, text: s.text }; });
    }
  } catch (e) {}
  var f = function (x) { var e = {}; e[v] = x; return EH.fval(ast.l, e) - EH.fval(ast.r, e); };
  var lo = trig ? 0 : -60, hi = trig ? 2 * Math.PI - 1e-9 : 60;
  var ok = 0; for (var t = 0; t < 7; t++) { var x = lo + (hi - lo) * (t + 0.31) / 7; if (Math.abs(f(x)) < 1e-9) ok++; }
  if (ok === 7) return 'ALL';
  return numericRoots(f, lo, hi).map(function (x) { var s = EH.snapPi(x); return { f: x, text: s.text }; });
}
function setKey(S) { return S === 'ALL' ? 'ALL' : S.map(function (x) { return x.f.toFixed(6); }).sort().join('|'); }
function cmpSets(A, B) {         /* -> same | lost | gained | different */
  if (A === 'ALL' || B === 'ALL') return A === B ? 'same' : (A === 'ALL' ? 'lost' : 'gained');
  var inB = function (x) { return B.some(function (y) { return Math.abs(x.f - y.f) < 1e-6; }); }, inA = function (y) { return A.some(function (x) { return Math.abs(x.f - y.f) < 1e-6; }); };
  var missing = A.filter(function (x) { return !inB(x); }), extra = B.filter(function (y) { return !inA(y); });
  if (!missing.length && !extra.length) return { r: 'same' };
  if (missing.length && !extra.length) return { r: 'lost', missing: missing };
  if (!missing.length && extra.length) return { r: 'gained', extra: extra };
  return { r: 'different', missing: missing, extra: extra };
}
/* inequality: membership on a fine grid */
function ineqMember(ast, v) { return function (x) { var e = {}; e[v] = x; var a = EH.fval(ast.l, e), b = EH.fval(ast.r, e); if (!isFinite(a) || !isFinite(b)) return null; return { '<': a < b - 1e-12, '>': a > b + 1e-12, '<=': a <= b + 1e-12, '>=': a >= b - 1e-12, '=': Math.abs(a - b) < 1e-9, '!=': Math.abs(a - b) > 1e-9 }[ast.op]; }; }
function setMember(set) { return function (x) { return set.some(function (r) { return (x > r.lo.f || (r.lc && Math.abs(x - r.lo.f) < 1e-9)) && (x < r.hi.f || (r.hc && Math.abs(x - r.hi.f) < 1e-9)); }); }; }
function friendlyPts() {
  var p = [0]; for (var i = 1; i <= 20; i++) p.push(i, -i);
  [0.5, -0.5, 1.5, -1.5, 2.5, -2.5].forEach(function (x) { p.push(x); });
  for (var k = -400; k <= 400; k++) p.push(k * 0.05 + 0.0137);
  return p;
}
function sameMembership(m1, m2, pts) { for (var i = 0; i < pts.length; i++) { var a = m1(pts[i]), b = m2(pts[i]); if (a === null || b === null) continue; if (a !== b) return pts[i]; } return null; }

/* ---------------- equality of expressions ---------------- */
function samplePts(v, trig) { var p = []; for (var i = 0; i < 9; i++) p.push(trig ? 0.23 + i * 0.67 : -4.37 + i * 1.13); return p; }
function exprDiff(a, b, v, trig) {      /* first x where a and b differ, or null */
  var pts = samplePts(v, trig), tested = 0;
  for (var i = 0; i < pts.length; i++) {
    var e = {}; e[v] = pts[i];
    var x = EH.fval(a, e), y = EH.fval(b, e);
    if (!isFinite(x) || !isFinite(y)) continue; tested++;
    if (Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(x))) return { x: pts[i], a: x, b: y };
  }
  return tested ? null : { x: NaN };
}

/* ---------------- naming the mistake: reproduce it ---------------- */
function replaceIn(tree, target, rep) {
  if (tree === target) return rep;
  if (!tree || typeof tree !== 'object') return tree;
  var c = {}; for (var k in tree) c[k] = (k === 'a' || k === 'b' || k === 'l' || k === 'r') && tree[k] && typeof tree[k] === 'object' ? replaceIn(tree[k], target, rep) : tree[k];
  return c;
}
function isSum(n) { return n && (n.t === 'add' || n.t === 'sub'); }
function isLog(n) { return n && n.t === 'fn' && (n.name === 'log' || n.name === 'ln'); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
var MUTATORS = [
  function (n) { if (n.t === 'pow' && isSum(n.a) && n.b.t === 'num' && n.b.q.n === 2 && n.b.q.d === 1) return [{ ast: B(n.a.t, B('pow', n.a.a, num(2)), B('pow', n.a.b, num(2))), mistake: 'Squared a sum term by term', fix: B(n.a.t, B('add', B('pow', n.a.a, num(2)), B('mul', num(2), B('mul', n.a.a, n.a.b))), B('pow', n.a.b, num(2))) }]; },
  function (n) { if (n.t === 'root' && isSum(n.a)) return [{ ast: B(n.a.t, EH.R(n.n, n.a.a), EH.R(n.n, n.a.b)), mistake: 'Split a root over a sum' }]; },
  function (n) { if (isLog(n) && isSum(n.a)) return [{ ast: B(n.a.t, F(n.name, n.a.a, n.base), F(n.name, n.a.b, n.base)), mistake: 'Split a log over a sum' }]; },
  function (n) {
    var out = [];
    if (n.t === 'add' && isLog(n.a) && isLog(n.b)) out.push({ ast: F(n.a.name, B('add', n.a.a, n.b.a), n.a.base), mistake: 'Log rule misused', fix: F(n.a.name, B('mul', n.a.a, n.b.a), n.a.base) });
    if (n.t === 'sub' && isLog(n.a) && isLog(n.b)) { out.push({ ast: B('div', n.a, n.b), mistake: 'Log rule misused', fix: F(n.a.name, B('div', n.a.a, n.b.a), n.a.base) }); out.push({ ast: F(n.a.name, B('sub', n.a.a, n.b.a), n.a.base), mistake: 'Log rule misused', fix: F(n.a.name, B('div', n.a.a, n.b.a), n.a.base) }); }
    if (n.t === 'mul' && !EH.vars(n.a).length && isLog(n.b)) out.push({ ast: F(n.b.name, B('mul', n.a, n.b.a), n.b.base), mistake: 'Log rule misused', fix: F(n.b.name, B('pow', n.b.a, n.a), n.b.base) });
    return out.length ? out : null;
  },
  function (n) {
    if (n.t === 'mul' && isSum(n.b)) return [{ ast: B(n.b.t, B('mul', n.a, n.b.a), n.b.b), mistake: 'Did not distribute to every term', fix: B(n.b.t, B('mul', n.a, n.b.a), B('mul', n.a, n.b.b)) }, { ast: B(n.b.t, n.b.a, B('mul', n.a, n.b.b)), mistake: 'Did not distribute to every term', fix: B(n.b.t, B('mul', n.a, n.b.a), B('mul', n.a, n.b.b)) }];
    if (n.t === 'mul' && isSum(n.a)) return [{ ast: B(n.a.t, B('mul', n.a.a, n.b), n.a.b), mistake: 'Did not distribute to every term', fix: B(n.a.t, B('mul', n.a.a, n.b), B('mul', n.a.b, n.b)) }];
  },
  function (n) {
    if (n.t === 'sub' && isSum(n.b)) return [{ ast: B(n.b.t, B('sub', n.a, n.b.a), n.b.b), mistake: 'Minus sign not distributed', fix: B(n.b.t === 'add' ? 'sub' : 'add', B('sub', n.a, n.b.a), n.b.b) }];
    if (n.t === 'neg' && isSum(n.a)) return [{ ast: B(n.a.t, U('neg', n.a.a), n.a.b), mistake: 'Minus sign not distributed', fix: B(n.a.t === 'add' ? 'sub' : 'add', U('neg', n.a.a), n.a.b) }];
  },
  function (n) {
    var out = [];
    if (n.t === 'mul' && n.a.t === 'pow' && n.b.t === 'pow' && same(n.a.a, n.b.a)) out.push({ ast: B('pow', n.a.a, B('mul', n.a.b, n.b.b)), mistake: 'Exponent rule misused', fix: B('pow', n.a.a, B('add', n.a.b, n.b.b)) });
    if (n.t === 'pow' && n.a.t === 'pow') out.push({ ast: B('pow', n.a.a, B('add', n.a.b, n.b)), mistake: 'Exponent rule misused', fix: B('pow', n.a.a, B('mul', n.a.b, n.b)) });
    if (n.t === 'div' && n.a.t === 'pow' && n.b.t === 'pow' && same(n.a.a, n.b.a)) out.push({ ast: B('pow', n.a.a, B('div', n.a.b, n.b.b)), mistake: 'Exponent rule misused', fix: B('pow', n.a.a, B('sub', n.a.b, n.b.b)) });
    return out.length ? out : null;
  },
  function (n) { if (n.t === 'add' && n.a.t === 'div' && n.b.t === 'div') return [{ ast: B('div', B('add', n.a.a, n.b.a), B('add', n.a.b, n.b.b)), mistake: 'Fractions added top-and-bottom' }]; },
  function (n) {
    if (n.t === 'div' && isSum(n.a)) {
      var out = [];
      if (same(n.a.a, n.b)) out.push({ ast: n.a.t === 'add' ? B('add', num(1), n.a.b) : B('sub', num(1), n.a.b), mistake: 'Cancelled terms, not factors' }, { ast: n.a.b, mistake: 'Cancelled terms, not factors' });
      if (same(n.a.b, n.b)) out.push({ ast: n.a.a, mistake: 'Cancelled terms, not factors' });
      if (isSum(n.b) && same(n.a.a, n.b.a)) out.push({ ast: B('div', n.a.b, n.b.b), mistake: 'Cancelled terms, not factors' });
      if (n.b.t === 'num' || n.b.t === 'var') out.push({ ast: B(n.a.t, B('div', n.a.a, n.b), n.a.b), mistake: 'Cancelled terms, not factors' });
      return out.length ? out : null;
    }
  }
];
function terms(n, sign, out) { out = out || []; sign = sign || 1; if (n.t === 'add') { terms(n.a, sign, out); terms(n.b, sign, out); } else if (n.t === 'sub') { terms(n.a, sign, out); terms(n.b, -sign, out); } else out.push({ s: sign, n: n }); return out; }
function sumOf(ts) { if (!ts.length) return num(0); var r = null; ts.forEach(function (t) { var node = t.n; r = r === null ? (t.s < 0 ? U('neg', node) : node) : B(t.s < 0 ? 'sub' : 'add', r, node); }); return r; }
function foldNums(n) {        /* 3·2 -> 6 so a corrected line reads naturally */
  if (!n || typeof n !== 'object') return n;
  var c = {}; for (var k in n) c[k] = (k === 'a' || k === 'b' || k === 'l' || k === 'r') && n[k] && typeof n[k] === 'object' ? foldNums(n[k]) : n[k];
  var one = function (x) { return x && x.t === 'num' && x.q.isOne(); };
  if (c.t === 'mul' && one(c.b)) return c.a;
  if (c.t === 'mul' && one(c.a)) return c.b;
  if (/^(mul|add|sub|div|pow|neg)$/.test(c.t) && !EH.vars(c).length && !EH.find(c, function (x) { return x.t === 'const' || x.t === 'fn' || x.t === 'root'; }).length) {
    try { var v = EH.evaluate(c); if (v.ex && v.ex.isRational()) return EH.N(v.ex.rat()); } catch (e) {}
  }
  return c;
}
function candidates(prev, depth) {
  var out = [], nodes = EH.find(prev, function () { return true; });
  /* a legal move done first, then a mistake: squaring both sides of a radical equation */
  if (!depth && prev.t === 'rel' && EH.find(prev, function (x) { return x.t === 'root' && x.n === 2; }).length) {
    var unroot = function (n) { return n.t === 'root' && n.n === 2 ? n.a : B('pow', n, num(2)); };
    var sq = { t: 'rel', op: prev.op, l: unroot(prev.l), r: unroot(prev.r) };
    candidates(sq, 1).forEach(function (c) { c.squared = true; out.push(c); });
  }
  MUTATORS.forEach(function (m) {
    nodes.forEach(function (nd) {
      var r = m(nd); if (!r) return;
      r.forEach(function (x) { out.push({ ast: replaceIn(prev, nd, x.ast), mistake: x.mistake, fixFull: x.fix ? foldNums(replaceIn(prev, nd, x.fix)) : null }); });
    });
  });
  if (prev.t === 'rel') {
    /* moving a term across the = without changing its sign */
    ['l', 'r'].forEach(function (side) {
      var other = side === 'l' ? 'r' : 'l', ts = terms(prev[side]);
      if (ts.length < 2 && side === 'l' && !EH.vars(prev.l).length) return;
      ts.forEach(function (t, i) {
        var rest = ts.filter(function (_, j) { return j !== i; });
        var wrong = {}, fix = {};
        wrong.t = fix.t = 'rel'; wrong.op = fix.op = prev.op;
        wrong[side] = sumOf(rest); wrong[other] = B(t.s > 0 ? 'add' : 'sub', prev[other], t.n);
        fix[side] = sumOf(rest); fix[other] = B(t.s > 0 ? 'sub' : 'add', prev[other], t.n);
        out.push({ ast: wrong, mistake: 'Sign error moving a term', fixFull: fix, term: t });
      });
    });
    if (/[<>]/.test(prev.op)) {
      var flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[prev.op];
      out.push({ ast: { t: 'rel', op: flip, l: prev.l, r: prev.r }, mistake: 'Inequality sign not flipped', flipCheck: true });
    }
  }
  return out;
}
function equivalentRel(a, b, v, trig) {
  if (/[<>]/.test(a.op) || /[<>]/.test(b.op)) {
    var pts = friendlyPts();
    return !sameMembership(ineqMember(a, v), ineqMember(b, v), pts);
  }
  var sa = solveSet(a, v, trig), sb = solveSet(b, v, trig), c = cmpSets(sa, sb);
  return c === 'same' || c.r === 'same';
}
function classify(prev, cur, v, trig, mode) {
  /* inequality: the line is right except the direction of the sign */
  if (mode === 'eq' && cur.ast && cur.ast.t === 'rel' && /[<>]/.test(cur.ast.op)) {
    var flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[cur.ast.op];
    try { if (equivalentRel(prev.ast, { t: 'rel', op: flip, l: cur.ast.l, r: cur.ast.r }, v, trig)) return { mistake: 'Inequality sign not flipped', fix: { t: 'rel', op: flip, l: cur.ast.l, r: cur.ast.r } }; } catch (e) {}
  }
  var cs = candidates(prev.ast);
  for (var i = 0; i < cs.length; i++) {
    var c = cs[i];
    try {
      if (c.flipCheck) {   /* the student's line equals the previous one rearranged, but with the sign the wrong way */
        continue;
      }
      var hit = mode === 'expr' ? !exprDiff(c.ast, cur.ast, v, trig) : (cur.ast.t === 'rel' && equivalentRel(c.ast, cur.ast, v, trig));
      if (hit) return c;
    } catch (e) {}
  }
  /* arithmetic slip: polynomial difference is a constant or a single term */
  try {
    var pp = mode === 'expr' ? EH.toRF(prev.ast, v) : EH.toRF(B('sub', prev.ast.l, prev.ast.r), v);
    var cc = mode === 'expr' ? EH.toRF(cur.ast, v) : EH.toRF(B('sub', cur.ast.l, cur.ast.r), v);
    if (pp && cc && pp.isPoly() && cc.isPoly()) {
      var p1 = pp.poly(), c1 = cc.poly();
      if (p1.deg() === c1.deg() && p1.deg() >= 0) {
        var k = mode === 'expr' ? EH.q(1) : c1.lead().div(p1.lead()), d = c1.sub(p1.scale(k));
        if (d.deg() <= 0 || d.terms && d.c.filter(function (x) { return !x.isZero(); }).length === 1) return { mistake: 'Arithmetic slip' };
      }
    }
  } catch (e) {}
  return null;
}

/* ---------------- explanations ---------------- */
var EXPLAIN = {
  'Sign error moving a term': 'When a term moves to the other side of the = sign, its sign changes. Adding something to one side means adding it to the other: + becomes −, − becomes +.',
  'Did not distribute to every term': 'The number in front multiplies EVERY term inside the parentheses, not just the first one.',
  'Minus sign not distributed': 'A minus sign in front of parentheses changes the sign of EVERY term inside: −(a − b) = −a + b.',
  'Squared a sum term by term': '(a + b)² is (a + b)(a + b) = a² + 2ab + b². The middle term 2ab does not disappear.',
  'Split a root over a sum': '√(a + b) is NOT √a + √b. Roots split over products and quotients only. To undo a root, square both sides instead.',
  'Split a log over a sum': 'log(M + N) does NOT split. Only log(MN) = log M + log N and log(M/N) = log M − log N.',
  'Log rule misused': 'The rules go: log M + log N = log(MN), log M − log N = log(M/N), p·log M = log(Mᵖ). The number in front becomes an exponent, not a factor inside.',
  'Exponent rule misused': 'Same base: multiply → ADD exponents, divide → SUBTRACT, power of a power → MULTIPLY.',
  'Fractions added top-and-bottom': 'You cannot add fractions by adding tops and adding bottoms. Get a common denominator first.',
  'Cancelled terms, not factors': 'You can only cancel FACTORS (things multiplied), never terms (things added). Factor the top and bottom first.',
  'Inequality sign not flipped': 'Multiplying or dividing both sides of an inequality by a NEGATIVE number flips the inequality sign.',
  'Arithmetic slip': 'The method is right, but a number came out wrong (adding, subtracting or multiplying the numbers). Redo the arithmetic on this line.',
  'Lost a solution': 'This step threw away a solution. Common causes: dividing both sides by an expression with the variable in it (factor it out instead), or taking a square root without the ±.',
  'Extra (extraneous) solution kept': 'Squaring both sides, or multiplying by an expression with the variable, can create answers that do not work in the original. Check every answer in the ORIGINAL equation and throw out the ones that fail.',
  'Wrong final answer': 'Your final answer does not match the solutions of the original problem.',
  'Not equivalent to the line before': 'This line does not have the same solutions as the line before it, so something changed that should not have.'
};
var REVIEW = {
  'Sign error moving a term': ['algebra-linear-equations', 'arithmetic-sign-rules'], 'Did not distribute to every term': ['algebra-distribute'], 'Minus sign not distributed': ['algebra-distribute', 'arithmetic-sign-rules'],
  'Squared a sum term by term': ['exponents-exponent-laws'], 'Split a root over a sum': ['exponents-simplifying-radicals'], 'Split a log over a sum': ['exp-log-log-rules'], 'Log rule misused': ['exp-log-log-rules'],
  'Exponent rule misused': ['exponents-exponent-laws'], 'Fractions added top-and-bottom': ['arithmetic-adding-subtracting-fractions'], 'Cancelled terms, not factors': ['rational-cancel-factors-not-terms', 'factoring'],
  'Inequality sign not flipped': ['algebra-inequalities'], 'Arithmetic slip': ['arithmetic-sign-rules', 'fractions'], 'Lost a solution': ['quadratics-zero-product-property', 'quadratics-square-root-method'],
  'Extra (extraneous) solution kept': ['rational', 'exponents-fractional-exponents'], 'Wrong final answer': [], 'Not equivalent to the line before': []
};
function reviewLinks(m) {
  return (REVIEW[m] || []).map(function (id) {
    var el = document.getElementById(id); if (!el) return '';
    var hd = /^H[1-6]$/.test(el.tagName) ? el : (el.querySelector('h2,h3') || el);
    /* the heading's own words only (skip calculator badges and other nested labels) */
    var t = Array.prototype.filter.call(hd.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.nodeValue; }).join('').trim() || hd.textContent;
    return '<a class="xref" href="#' + id + '">' + esc(t.trim().slice(0, 60)) + '</a>';
  }).join('');
}

/* ---------------- the checker ---------------- */
function check(problem, linesText) {
  var info = EH.classify(problem, {}), v = info.v || 'x';
  var mode = info.kind === 'equation' || info.kind === 'inequality' ? 'eq' : info.kind === 'function' || info.kind === 'number' ? 'expr' : null;
  if (!mode) throw new Error('Type a problem with one variable: an equation or inequality to solve, or an expression to simplify, factor or expand.');
  var isIneq = info.kind === 'inequality', trig = !!info.isTrig;
  var start = mode === 'expr' ? (info.body || info.ast) : info.ast;
  var lines = String(linesText || '').split('\n').map(function (l) { return readLine(l, v, isIneq); }).filter(function (l) { return l.kind !== 'blank'; });
  if (!lines.length) throw new Error('Type your steps in the big box, one line per step.');
  var res = { info: info, v: v, mode: mode, lines: lines, firstError: null, warnings: [] };
  var truth = null;
  if (mode === 'eq' && !isIneq) truth = solveSet(info.ast, v, trig);
  var prev = { ast: start, set: mode === 'eq' && !isIneq ? truth : null, kind: mode === 'eq' ? 'rel' : 'expr' };
  var rejected = [];
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i];
    if (L.kind === 'note') { L.verdict = 'note'; continue; }
    if (L.kind === 'bad') { L.verdict = 'unread'; continue; }
    if (mode === 'expr') {
      if (L.kind === 'rel') { L.ast = L.ast.r; }          /* "f(x) = ..." */
      if (!L.ast) { L.verdict = 'unread'; continue; }
      var d = exprDiff(prev.ast, L.ast, v, trig);
      if (!d) { L.verdict = 'ok'; prev = { ast: L.ast }; continue; }
      if (isNaN(d.x)) { L.verdict = 'unread'; continue; }
      L.verdict = 'bad';
      var c = classify(prev, L, v, trig, 'expr');
      L.mistake = c ? c.mistake : 'Not equivalent to the line before';
      if (c && c.fixFull) L.fixLine = EH.txt(c.fixFull);
      L.counter = 'At ' + v + ' = ' + (+d.x.toFixed(2)) + ': the line before gives ' + (+d.a.toFixed(4)) + ', this line gives ' + (+d.b.toFixed(4)) + '.';
      res.firstError = res.firstError || i;
      break;
    }
    /* equations and inequalities */
    if (isIneq) {
      var pts = friendlyPts();
      var mPrev = prev.kind === 'interval' ? setMember(prev.set) : ineqMember(prev.ast, v);
      var mCur = L.kind === 'interval' ? setMember(L.set) : L.kind === 'rel' ? ineqMember(L.ast, v) : null;
      if (!mCur) { L.verdict = 'unread'; continue; }
      var bad = sameMembership(mPrev, mCur, pts);
      if (bad === null) { L.verdict = 'ok'; prev = L; continue; }
      L.verdict = 'bad'; res.firstError = i;
      var c2 = L.kind === 'rel' && prev.ast ? classify(prev, L, v, trig, 'eq') : null;
      L.mistake = c2 ? c2.mistake : 'Not equivalent to the line before';
      if (c2 && (c2.fixFull || c2.fix)) L.fixLine = EH.txt(c2.fixFull || c2.fix);
      L.counter = 'Try ' + v + ' = ' + (+bad.toFixed(2)) + ': it ' + (mPrev(bad) ? 'works' : 'fails') + ' in the line before but ' + (mCur(bad) ? 'works' : 'fails') + ' in this line.';
      break;
    }
    var S;
    if (L.kind === 'values') S = L.vals;
    else if (L.kind === 'set') S = L.set;
    else if (L.kind === 'rel') S = solveSet(L.ast, v, trig);
    else { L.verdict = 'unread'; continue; }
    if (L.reject && L.kind === 'values') {
      var realOnes = truth && truth !== 'ALL' ? L.vals.filter(function (x) { return truth.some(function (y) { return Math.abs(x.f - y.f) < 1e-6; }); }) : [];
      if (realOnes.length) {
        L.verdict = 'bad'; res.firstError = i; L.mistake = 'Lost a solution';
        L.note = v + ' = ' + realOnes[0].text + ' is NOT extraneous: it works in the original equation, so keep it.';
        L.counter = 'Plug ' + v + ' = ' + realOnes[0].text + ' into the original: both sides come out equal.';
        break;
      }
      L.vals.forEach(function (x) { rejected.push(x); }); L.verdict = 'ok'; L.rejectNote = true;
      if (prev.set && prev.set !== 'ALL') prev = { ast: prev.ast, set: prev.set.filter(function (x) { return !L.vals.some(function (y) { return Math.abs(x.f - y.f) < 1e-6; }); }), kind: prev.kind };
      continue;
    }
    L.set = S;
    var cmp = cmpSets(prev.set, S), r = cmp === 'same' ? 'same' : cmp === 'lost' || cmp === 'gained' ? cmp : cmp.r;
    if (r === 'same') { L.verdict = 'ok'; prev = L; continue; }
    if (r === 'gained' && L.kind === 'rel') {
      L.verdict = 'warn'; L.extra = cmp.extra;
      L.note = 'Allowed, but this kind of step (squaring, or multiplying by an expression with ' + v + ') can add answers that do not work in the original: ' + (cmp.extra || []).map(function (x) { return v + ' = ' + x.text; }).join(', ') + '. Check every answer at the end.';
      prev = L; continue;
    }
    if (r === 'lost') {
      L.verdict = 'bad'; res.firstError = i; L.mistake = 'Lost a solution';
      var lostT = (cmp.missing || []).map(function (x) { return v + ' = ' + x.text; }).join(', ');
      var kept = S === 'ALL' ? [] : S;
      if (cmp.missing && cmp.missing.length === 1 && kept.some(function (x) { return Math.abs(x.f + cmp.missing[0].f) < 1e-6 && Math.abs(x.f) > 1e-9; })) L.note = 'You kept ' + v + ' = ' + kept.filter(function (x) { return Math.abs(x.f + cmp.missing[0].f) < 1e-6; })[0].text + ' but lost its opposite: a square root needs ± (both signs).';
      L.counter = 'Lost: ' + lostT + ' solves the line before but not this one.';
      break;
    }
    /* different */
    L.verdict = 'bad'; res.firstError = i;
    var c3 = L.kind === 'rel' && prev.ast ? classify(prev, L, v, trig, 'eq') : null;
    if (!c3 && L.kind === 'values' && prev.ast) {
      L.mistake = 'Arithmetic slip';
      L.counter = 'Plug in your answer: ' + (cmp.extra || []).slice(0, 1).map(function (x) { var e = {}; e[v] = x.f; return v + ' = ' + x.text + ' gives ' + (+EH.fval(prev.ast.l, e).toFixed(4)) + ' on the left and ' + (+EH.fval(prev.ast.r, e).toFixed(4)) + ' on the right of the line before.'; }).join('');
    } else {
      L.mistake = c3 ? c3.mistake : 'Not equivalent to the line before';
      if (c3 && (c3.fixFull || c3.fix)) L.fixLine = EH.txt(c3.fixFull || c3.fix);
      var miss = cmp.missing && cmp.missing[0], ext = cmp.extra && cmp.extra[0];
      L.counter = miss ? v + ' = ' + miss.text + ' solves the line before but not this line.' : ext ? v + ' = ' + ext.text + ' solves this line but not the line before.' : '';
    }
    break;
  }
  /* final answer */
  if (res.firstError === null && mode === 'eq' && !isIneq) {
    var lastSet = null;
    for (var j = lines.length - 1; j >= 0; j--) if (lines[j].set !== undefined && lines[j].verdict !== 'note') { lastSet = lines[j].set; break; }
    if (lastSet && lastSet !== 'ALL') lastSet = lastSet.filter(function (x) { return !rejected.some(function (y) { return Math.abs(x.f - y.f) < 1e-6; }); });
    if (lastSet) {
      var fc = cmpSets(truth, lastSet), fr = fc === 'same' ? 'same' : fc.r || fc;
      if (fr === 'same') res.final = { ok: true };
      else if (fr === 'gained') res.final = { ok: false, mistake: 'Extra (extraneous) solution kept', text: 'Your final answer includes ' + fc.extra.map(function (x) { return v + ' = ' + x.text; }).join(', ') + ', which does NOT work in the original equation. Plug it in: one side is undefined or the sides are unequal.' };
      else if (fr === 'lost') res.final = { ok: false, mistake: 'Lost a solution', text: 'Your final answer is missing ' + fc.missing.map(function (x) { return v + ' = ' + x.text; }).join(', ') + '.' };
      else res.final = { ok: false, mistake: 'Wrong final answer', text: 'The correct solution set is ' + (truth === 'ALL' ? 'all real numbers' : truth.length ? truth.map(function (x) { return x.text; }).join(', ') : 'empty (no solution)') + '.' };
    }
  }
  res.correct = EH.analyze(problem, mode === 'eq' ? 'solve' : undefined, {});
  return res;
}
window.CheckWork = { check: check, readLine: readLine };

/* ---------------- interface ---------------- */
var EXAMPLES = [
  { p: '3x + 5 = 2x - 7', s: '3x - 2x = -7 + 5\nx = -2', label: 'Linear (sign slip)' },
  { p: '√(x + 3) = x - 3', s: 'x + 3 = (x - 3)^2\nx + 3 = x^2 - 6x + 9\n0 = x^2 - 7x + 6\n0 = (x - 1)(x - 6)\nx = 1 or x = 6', label: 'Radical (extraneous)' },
  { p: '√(x + 7) = x + 1', s: 'x + 7 = x^2 + 1\n0 = x^2 - x - 6\n0 = (x - 3)(x + 2)\nx = 3 or x = -2', label: 'Radical (squared a sum)' },
  { p: 'log_2(x) + log_2(x - 2) = 3', s: 'log_2(2x - 2) = 3\n2x - 2 = 8\nx = 5', label: 'Logs (wrong rule)' },
  { p: '-2x + 4 > 10', s: '-2x > 6\nx > -3', label: 'Inequality (sign flip)' },
  { p: 'x^2 = 5x', s: 'x = 5', label: 'Lost a solution' },
  { p: '3(x - 2) + 4', s: '3x - 2 + 4\n3x + 2', label: 'Simplify (distribute)' }
];
var host = typeof document !== 'undefined' && $('check-work');
if (host) {
  var pIn = $('cw-problem'), sIn = $('cw-steps'), out = $('cw-out'), prev = $('cw-preview');
  $('cw-examples').innerHTML = '<span class="small">Try an example with a mistake in it:</span> ' + EXAMPLES.map(function (e, i) { return '<button type="button" class="eh-ex" data-i="' + i + '">' + esc(e.label) + '</button>'; }).join('');
  $('cw-examples').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; var ex = EXAMPLES[+b.getAttribute('data-i')]; pIn.value = ex.p; sIn.value = ex.s; preview(); run(); });
  function preview() {
    var ls = sIn.value.split('\n').filter(function (l) { return l.trim(); });
    var ph = '';
    try { ph = pIn.value.trim() ? '<div class="pp-line cw-probline">' + P.inline(EH.displayText ? EH.displayText(EH.classify(pIn.value)) : pIn.value) + '</div>' : ''; } catch (e) { ph = '<div class="pp-line">' + esc(pIn.value) + '</div>'; }
    prev.innerHTML = ls.length || ph ? ph + ls.map(function (l) { var c = cleanLine(l); var t; try { t = P.inline(EH.txt(EH.parse(c))); } catch (e) { t = P.inline(c); } return '<div class="pp-line">' + t + '</div>'; }).join('') : '<span class="small">Your steps appear here, the way they look on paper.</span>';
    prev.classList.add('pp-sheet');
  }
  pIn.addEventListener('input', preview); sIn.addEventListener('input', preview);
  function run() {
    var r;
    try { r = check(pIn.value, sIn.value); } catch (e) { out.innerHTML = '<div class="eh-msg eh-err">' + esc(e.message || String(e)) + '</div>'; return; }
    var h = ['<div class="cw-result">'], v = r.v;
    /* the work, line by line, marked like a teacher would */
    h.push('<div class="cw-sheet pp-sheet"><div class="pp-line cw-probline">' + P.inline(EH.displayText(r.info)) + '</div>');
    r.lines.forEach(function (L, i) {
      var mark = { ok: '✓', bad: '✗', warn: '!', note: '·', unread: '?' }[L.verdict] || '';
      h.push('<div class="cw-line cw-' + (L.verdict || 'skip') + (i > (r.firstError === null ? 1e9 : r.firstError) ? ' cw-after' : '') + '"><span class="cw-mark" aria-label="' + (L.verdict || '') + '">' + mark + '</span><span class="cw-text">' + (function () { try { return P.inline(L.ast ? EH.txt(L.ast) : L.src); } catch (e) { return esc(L.src); } })() + '</span></div>');
    });
    h.push('</div>');
    var bad = r.firstError !== null ? r.lines[r.firstError] : null;
    if (bad) {
      h.push('<div class="cw-verdict cw-v-bad"><h4>Line ' + (r.firstError + 1) + ' goes wrong: ' + esc(bad.mistake) + '</h4><p>' + esc(EXPLAIN[bad.mistake] || '') + '</p>' + (bad.note ? '<p>' + esc(bad.note) + '</p>' : '') + (bad.counter ? '<p class="cw-counter"><b>Number check.</b> ' + P.inline(bad.counter) + '</p>' : '') +
        (bad.fixLine ? '<div class="cw-fix"><b>The correct move:</b><div class="pp-sheet cw-fixline">' + P.inline(bad.fixLine) + '</div></div>' : '') +
        '<div class="cw-review">' + reviewLinks(bad.mistake) + '<button type="button" class="cw-practice" data-m="' + esc(bad.mistake) + '">Practice this</button></div></div>');
    } else if (r.final && !r.final.ok) {
      h.push('<div class="cw-verdict cw-v-bad"><h4>Every step is valid, but the final answer is off: ' + esc(r.final.mistake) + '</h4><p>' + esc(r.final.text) + '</p><p>' + esc(EXPLAIN[r.final.mistake] || '') + '</p><div class="cw-review">' + reviewLinks(r.final.mistake) + '<button type="button" class="cw-practice" data-m="' + esc(r.final.mistake) + '">Practice this</button></div></div>');
    } else {
      var warns = r.lines.filter(function (L) { return L.verdict === 'warn'; });
      var unread = r.lines.filter(function (L) { return L.verdict === 'unread'; });
      h.push('<div class="cw-verdict cw-v-ok"><h4>' + (r.mode === 'eq' && !r.final ? 'Every step checks out.' : 'All correct! Every step is valid' + (r.final ? ' and the final answer is right.' : '.')) + '</h4>' + (warns.length ? '<p>You used a step that can add extra answers (squaring or multiplying by an expression with ' + esc(v) + ') and you handled it.</p>' : '') + (unread.length ? '<p class="small">Lines marked ? could not be read as math and were skipped.</p>' : '') + '</div>');
    }
    r.lines.filter(function (L) { return L.verdict === 'warn' && L.note; }).forEach(function (L) { h.push('<div class="warning eh-note">' + esc(L.note) + '</div>'); });
    if (r.correct && !r.correct.error) h.push('<details class="eh-allsec cw-correct"' + (bad || (r.final && !r.final.ok) ? ' open' : '') + '><summary>The correct solution, step by step</summary>' + (window.EHUI ? EHUI.answerHtml(r.correct) + EHUI.stepsHtml(r.correct.steps) : '') + '</details>');
    h.push('</div>');
    out.innerHTML = h.join('');
    /* progress */
    if (window.Progress) {
      var ok = !bad && !(r.final && !r.final.ok), title = (r.correct && r.correct.title) || 'Problem';
      Progress.record('check', title, ok, { src: pIn.value });
      var m = bad ? bad.mistake : r.final && !r.final.ok ? r.final.mistake : null;
      if (m) Progress.record('mistake', 'Mistake: ' + m, false, { src: pIn.value });
    }
    out.scrollIntoView({ block: 'nearest' });
  }
  out.addEventListener('click', function (e) { var b = e.target.closest('.cw-practice'); if (b && window.Progress) Progress.practice('mistake', 'Mistake: ' + b.getAttribute('data-m')); });
  $('cw-go').addEventListener('click', run);
  $('cw-clear').addEventListener('click', function () { pIn.value = ''; sIn.value = ''; out.innerHTML = ''; preview(); });
  $('cw-from-helper').addEventListener('click', function () { var i = $('eh-input'); if (i && i.value.trim()) { pIn.value = EH.intent(i.value).src; preview(); sIn.focus(); } });
  preview();
}
})();
