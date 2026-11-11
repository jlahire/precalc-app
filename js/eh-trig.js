/* =====================================================================
   Equation Helper extensions, part A: trig identities and angles.
   - EH.proveIdentity(left, right, v): a step-by-step proof that names
     every identity it uses (reciprocal, quotient, Pythagorean,
     even/odd, cofunction, sum/difference, double angle).
   - EH.simplifyTrig(expr, v): the simplest equal expression, with proof.
   - EH.angleAnalysis(ast): coterminal + reference angles, quadrant,
     conversions, all six trig values, and a standard-position drawing.
   ===================================================================== */
(function (EH) {
'use strict';
if (!EH || !EH.EX) return;
var Q = EH.Q, q = EH.q, EX = EH.EX, MathError = EH.MathError;
var N = EH.N, V = EH.V, K = EH.K, B = EH.B, U = EH.U, F = EH.F, num = EH.num;
var ONE = EX.int(1);
var TRIG6 = /^(sin|cos|tan|sec|csc|cot)$/;
function step(steps, note, math, rule) { steps.push({ note: note, math: math, rule: rule }); }
function sup(n) { return EH.sup(n); }

/* ===================== polynomials in s = sin v, c = cos v ===================== */
function P2(t) { this.t = t || {}; }
P2.k = function (ex) { var p = new P2(); if (!ex.isZero()) p.t['0,0'] = ex; return p; };
P2.mono = function (i, j, ex) { var p = new P2(); ex = ex || ONE; if (!ex.isZero()) p.t[i + ',' + j] = ex; return p; };
P2.prototype.terms = function () {
  var out = [];
  for (var k in this.t) { var a = k.split(','); out.push({ i: +a[0], j: +a[1], c: this.t[k] }); }
  out.sort(function (x, y) { return (y.i + y.j) - (x.i + x.j) || y.i - x.i; });
  return out;
};
P2.prototype.clone = function () { var p = new P2(); for (var k in this.t) p.t[k] = this.t[k]; return p; };
P2.prototype.addTerm = function (i, j, c) {
  var k = i + ',' + j, cur = this.t[k] ? this.t[k].add(c) : c;
  if (cur.isZero()) delete this.t[k]; else this.t[k] = cur;
  return this;
};
P2.prototype.add = function (o) { var p = this.clone(); o.terms().forEach(function (x) { p.addTerm(x.i, x.j, x.c); }); return p; };
P2.prototype.neg = function () { var p = new P2(); this.terms().forEach(function (x) { p.t[x.i + ',' + x.j] = x.c.neg(); }); return p; };
P2.prototype.sub = function (o) { return this.add(o.neg()); };
P2.prototype.mul = function (o) {
  var p = new P2(), A = this.terms(), Bt = o.terms();
  A.forEach(function (a) { Bt.forEach(function (b) { p.addTerm(a.i + b.i, a.j + b.j, a.c.mul(b.c)); }); });
  return p;
};
P2.prototype.scale = function (ex) { var p = new P2(); if (ex.isZero()) return p; this.terms().forEach(function (x) { p.t[x.i + ',' + x.j] = x.c.mul(ex); }); return p; };
P2.prototype.pow = function (n) { var r = P2.k(ONE); for (var i = 0; i < n; i++) r = r.mul(this); return r; };
P2.prototype.isZero = function () { return Object.keys(this.t).length === 0; };
P2.prototype.isConst = function () { var ts = this.terms(); return ts.length === 0 || (ts.length === 1 && ts[0].i === 0 && ts[0].j === 0); };
P2.prototype.constVal = function () { return this.t['0,0'] || new EX(); };
P2.prototype.eq = function (o) { return this.sub(o).isZero(); };
P2.prototype.key = function () { return this.terms().map(function (x) { return x.i + ',' + x.j + ':' + x.c.format(); }).join(';'); };
P2.prototype.size = function () { return this.terms().reduce(function (a, x) { return a + 1 + x.i + x.j; }, 0); };
P2.prototype.lead = function () {
  var best = null;
  this.terms().forEach(function (x) { if (!best || x.i > best.i || (x.i === best.i && x.j > best.j)) best = x; });
  return best;
};
P2.prototype.monoGcd = function () {
  var ts = this.terms(); if (!ts.length) return { i: 0, j: 0 };
  return { i: Math.min.apply(null, ts.map(function (x) { return x.i; })), j: Math.min.apply(null, ts.map(function (x) { return x.j; })) };
};
P2.prototype.divMono = function (i, j) { var p = new P2(); this.terms().forEach(function (x) { p.t[(x.i - i) + ',' + (x.j - j)] = x.c; }); return p; };
P2.prototype.exactDiv = function (g) {
  var r = this.clone(), quo = new P2(), L = g.lead(), guard = 0;
  if (!L) return null;
  while (!r.isZero() && guard++ < 200) {
    var lt = r.lead();
    if (lt.i < L.i || lt.j < L.j) return null;
    var c = lt.c.div(L.c); if (!c) return null;
    var t = P2.mono(lt.i - L.i, lt.j - L.j, c);
    quo = quo.add(t); r = r.sub(t.mul(g));
  }
  return r.isZero() ? quo : null;
};
P2.prototype.subC2 = function () {        /* every cos²v -> 1 - sin²v (one level) */
  var p = new P2();
  this.terms().forEach(function (x) {
    if (x.j >= 2) { p.addTerm(x.i, x.j - 2, x.c); p.addTerm(x.i + 2, x.j - 2, x.c.neg()); } else p.addTerm(x.i, x.j, x.c);
  });
  return p;
};
P2.prototype.subS2 = function () {
  var p = new P2();
  this.terms().forEach(function (x) {
    if (x.i >= 2) { p.addTerm(x.i - 2, x.j, x.c); p.addTerm(x.i - 2, x.j + 2, x.c.neg()); } else p.addTerm(x.i, x.j, x.c);
  });
  return p;
};
P2.prototype.canon = function () { var p = this, g = 0; while (p.terms().some(function (x) { return x.j >= 2; }) && g++ < 40) p = p.subC2(); return p; };
P2.prototype.hasC2 = function () { return this.terms().some(function (x) { return x.j >= 2; }); };
P2.prototype.hasS2 = function () { return this.terms().some(function (x) { return x.i >= 2; }); };
function fnPow(name, n, v) { return name + (n > 1 ? sup(n) : '') + (v.length === 1 && n > 1 ? '' : ' ') + v; }
function monoTxt(i, j, v) { var a = []; if (i) a.push(fnPow('sin', i, v)); if (j) a.push(fnPow('cos', j, v)); return a.join(' '); }
function coefTxt(c, hasMono) {
  if (c.isRational()) { var r = c.rat(); return (r.isOne() && hasMono) ? '' : r.toString(); }
  var t = c.format(); return hasMono ? t + ' ' : t;
}
P2.prototype.text = function (v) {
  var ts = this.terms(); if (!ts.length) return '0';
  var cp = ts.findIndex(function (x) { return x.i === 0 && x.j === 0 && x.c.float() > 0; });
  var fp = cp >= 0 ? cp : ts.findIndex(function (x) { return x.c.float() > 0; });      /* 1 + sin x, 1 - cos²x */
  if (fp > 0) ts.unshift(ts.splice(fp, 1)[0]);
  return ts.map(function (x, k) {
    var neg = x.c.float() < 0, c = neg ? x.c.neg() : x.c, m = monoTxt(x.i, x.j, v);
    var body = coefTxt(c, !!m) + m;
    return k === 0 ? (neg ? '-' : '') + body : (neg ? ' - ' : ' + ') + body;
  }).join('');
};
P2.prototype.factorText = function (v) {     /* pull out a common monomial for display: sin x(1 + cos x) */
  var g = this.monoGcd(), ts = this.terms();
  if (ts.length < 2 || (!g.i && !g.j)) return this.text(v);
  return monoTxt(g.i, g.j, v) + '(' + this.divMono(g.i, g.j).text(v) + ')';
};
P2.prototype.float = function (s, c) { var t = 0; this.terms().forEach(function (x) { t += x.c.float() * Math.pow(s, x.i) * Math.pow(c, x.j); }); return t; };

function RF2(n, d) { this.n = n; this.d = d || P2.k(ONE); }
RF2.prototype.add = function (o) { return new RF2(this.n.mul(o.d).add(o.n.mul(this.d)), this.d.mul(o.d)); };
RF2.prototype.sub = function (o) { return new RF2(this.n.mul(o.d).sub(o.n.mul(this.d)), this.d.mul(o.d)); };
RF2.prototype.mul = function (o) { return new RF2(this.n.mul(o.n), this.d.mul(o.d)); };
RF2.prototype.div = function (o) { if (o.n.isZero()) throw new MathError('Division by zero in the identity.'); return new RF2(this.n.mul(o.d), this.d.mul(o.n)); };
RF2.prototype.neg = function () { return new RF2(this.n.neg(), this.d); };
RF2.prototype.pow = function (k) { if (k < 0) return new RF2(this.d.pow(-k), this.n.pow(-k)); return new RF2(this.n.pow(k), this.d.pow(k)); };
function rfText(n, d, v) {
  if (d.isConst()) { var inv = d.constVal().inv(); return inv ? n.scale(inv).text(v) : '(' + n.text(v) + ')/(' + d.text(v) + ')'; }
  return wrapF(n.factorText(v)) + '/' + wrapF(d.factorText(v));
}
function wrapF(t) { return /^[\d.]+$/.test(t) || /^[a-zθ]$/.test(t) ? t : '(' + t + ')'; }

/* ===================== AST helpers ===================== */
function isV(n, v) { return n && n.t === 'var' && n.name === v; }
function raw(ex) { return { t: 'raw', s: ex.format(), val: new EH.Val(ex) }; }
function isZeroN(n) { return n.t === 'num' && n.q.isZero() || n.t === 'raw' && n.val.ex && n.val.ex.isZero(); }
function isOneN(n) { return n.t === 'num' && n.q.isOne() || n.t === 'raw' && n.val.ex && n.val.ex.eq(ONE); }
function sAdd(a, b) { if (isZeroN(a)) return b; if (isZeroN(b)) return a; return B('add', a, b); }
function sSub(a, b) { if (isZeroN(b)) return a; if (isZeroN(a)) return U('neg', b); return B('sub', a, b); }
function sMulK(ex, t) { if (ex.isZero()) return num(0); if (ex.eq(ONE)) return t; if (ex.eq(ONE.neg())) return U('neg', t); return B('mul', raw(ex), t); }
function exVal(ast) { var v = EH.evaluate(ast); if (!v.ex) throw new MathError('unsupported'); return v.ex; }
function S(v) { return F('sin', V(v)); }
function C(v) { return F('cos', V(v)); }

/* text printer for trig expressions: sin x, sin²x, (top)/(bottom) */
function ttxt(n, v, pp) {
  pp = pp || 0;
  var s, p;
  switch (n.t) {
    case 'num': s = n.q.toString(); p = n.q.n < 0 ? 2 : n.q.isInt() ? 9 : 3; break;
    case 'raw': s = n.s; p = /^-/.test(s) ? 2 : /[ +\-\/]/.test(s.slice(1)) ? 3 : 9; break;
    case 'var': case 'const': s = n.name; p = 9; break;
    case 'fn':
      var nm = /^arc(sin|cos|tan|sec|csc|cot)$/.test(n.name) ? n.name.slice(3) + '⁻¹' : n.name;
      if (isV(n.a, v) && TRIG6.test(n.name)) { s = nm + ' ' + v; p = 6; }
      else { s = nm + '(' + ttxt(n.a, v, 0) + ')'; p = 9; }
      break;
    case 'pow':
      if (n.a.t === 'fn' && TRIG6.test(n.a.name) && n.b.t === 'num' && n.b.q.isInt() && n.b.q.n > 0) {
        s = n.a.name + sup(n.b.q.n) + (isV(n.a.a, v) ? v : '(' + ttxt(n.a.a, v) + ')'); p = 6; break;
      }
      s = ttxt(n.a, v, 7) + (n.b.t === 'num' && n.b.q.isInt() && n.b.q.n >= 0 ? sup(n.b.q.n) : '^(' + ttxt(n.b, v) + ')'); p = 6; break;
    case 'neg': s = '-' + ttxt(n.a, v, 2.5); p = 2; break;
    case 'add': s = ttxt(n.a, v, 1) + ' + ' + ttxt(n.b, v, 1.5); p = 1; break;
    case 'sub': s = ttxt(n.a, v, 1) + ' - ' + ttxt(n.b, v, 1.5); p = 1; break;
    case 'mul':
      var a = ttxt(n.a, v, 3), b = ttxt(n.b, v, n.b.t === 'mul' ? 3 : 3.5);
      var numA = n.a.t === 'num' || n.a.t === 'raw';
      var fnB = /^(sin|cos|tan|sec|csc|cot|log|ln)/.test(b);
      if (n.b.t === 'div' || n.a.t === 'div') s = a + ' · ' + b;
      else if (numA && !/\//.test(a) && /^[a-zA-Zθ(√]/.test(b)) s = a + (fnB ? ' ' : '') + b;   /* 2 sin x, 2x, 2(1 + cos x) */
      else s = a + (numA ? '·' : ' ') + b;
      p = 3; break;
    case 'div': s = wrapF(ttxt(n.a, v, 0)) + '/' + wrapF(ttxt(n.b, v, 0)); p = 4; break;
    case 'root': s = '√(' + ttxt(n.a, v) + ')'; p = 9; break;
    case 'abs': s = '|' + ttxt(n.a, v) + '|'; p = 9; break;
    default: s = EH.txt(n); p = 9;
  }
  return p < pp ? '(' + s + ')' : s;
}
EH.ttxt = ttxt;

/* ===================== identity rewriting ===================== */
var SUMF = {
  sin: 'sin(A + B) = sin A cos B + cos A sin B', cos: 'cos(A + B) = cos A cos B - sin A sin B'
};
/* expand sin/cos of k·v + c into sin v, cos v (k = ±1..±4, c a multiple of π) */
function expandSC(name, k, c, v, used) {
  if (!c.isZero()) {
    var cs = exVal(F('cos', raw(c))), sn = exVal(F('sin', raw(c)));
    var A = expandSC('sin', k, new EX(), v, used), Bc = expandSC('cos', k, new EX(), v, used);
    var kt = k.eq(ONE) ? v : k.eq(ONE.neg()) ? '-' + v : ttxt(raw(k), v) + v;
    var ct = c.format(), cofn = c.piMultiple() && Math.abs(c.piMultiple().val()) === 0.5 && Math.abs(k.float()) === 1;
    var shown = name + '(' + kt + ' + ' + ct + ')';
    var label = cofn ? 'Cofunction identity (from the sum formula)' : 'Sum/difference formula';
    var res;
    if (name === 'sin') { res = sAdd(sMulK(cs, A), sMulK(sn, Bc)); used.push({ name: label, text: SUMF.sin + ':  ' + shown + ' = sin(' + kt + ')cos(' + ct + ') + cos(' + kt + ')sin(' + ct + ') = ' + ttxt(res, v), rule: 'sum-diff' }); }
    else { res = sSub(sMulK(cs, Bc), sMulK(sn, A)); used.push({ name: label, text: SUMF.cos + ':  ' + shown + ' = cos(' + kt + ')cos(' + ct + ') - sin(' + kt + ')sin(' + ct + ') = ' + ttxt(res, v), rule: 'sum-diff' }); }
    return res;
  }
  if (!k.isRational()) throw new MathError('unsupported');
  var kr = k.rat();
  if (!kr.isInt()) throw new MathError('Half-angle arguments like sin(x/2) are not automated in proofs. Use sin²(x/2) = (1 - cos x)/2 and cos²(x/2) = (1 + cos x)/2.');
  var kn = kr.n;
  if (kn === 1) return name === 'sin' ? S(v) : C(v);
  if (kn < 0) {
    var inner = expandSC(name, EX.int(-kn), new EX(), v, used);
    if (name === 'sin') { used.push({ name: 'Even/odd identity', text: 'sin(-' + v + ') = -sin ' + v + '   (sine is odd)', rule: 'even-odd' }); return U('neg', inner); }
    used.push({ name: 'Even/odd identity', text: 'cos(-' + v + ') = cos ' + v + '   (cosine is even)', rule: 'even-odd' }); return inner;
  }
  if (Math.abs(kn) > 4) throw new MathError('Multiple angles above 4x are not automated.');
  if (kn === 2) {
    if (name === 'sin') { used.push({ name: 'Double-angle identity', text: 'sin(2' + v + ') = 2 sin ' + v + ' cos ' + v, rule: 'double-angle' }); return B('mul', num(2), B('mul', S(v), C(v))); }
    used.push({ name: 'Double-angle identity', text: 'cos(2' + v + ') = cos²' + v + ' - sin²' + v + '  (= 1 - 2sin²' + v + ' = 2cos²' + v + ' - 1)', rule: 'double-angle' });
    return B('sub', B('pow', C(v), num(2)), B('pow', S(v), num(2)));
  }
  /* 3x = 2x + x, 4x = 2(2x) */
  if (kn === 4) {
    var s2 = expandSC('sin', EX.int(2), new EX(), v, used), c2 = expandSC('cos', EX.int(2), new EX(), v, used);
    used.push({ name: 'Double-angle identity', text: name === 'sin' ? 'sin(4' + v + ') = 2 sin(2' + v + ') cos(2' + v + ')' : 'cos(4' + v + ') = cos²(2' + v + ') - sin²(2' + v + ')', rule: 'double-angle' });
    return name === 'sin' ? B('mul', num(2), B('mul', s2, c2)) : B('sub', B('pow', c2, num(2)), B('pow', s2, num(2)));
  }
  var s2b = expandSC('sin', EX.int(2), new EX(), v, used), c2b = expandSC('cos', EX.int(2), new EX(), v, used);
  used.push({ name: 'Sum formula', text: name === 'sin' ? 'sin(3' + v + ') = sin(2' + v + ' + ' + v + ') = sin(2' + v + ')cos ' + v + ' + cos(2' + v + ')sin ' + v : 'cos(3' + v + ') = cos(2' + v + ' + ' + v + ') = cos(2' + v + ')cos ' + v + ' - sin(2' + v + ')sin ' + v, rule: 'sum-diff' });
  return name === 'sin' ? B('add', B('mul', s2b, C(v)), B('mul', c2b, S(v))) : B('sub', B('mul', c2b, C(v)), B('mul', s2b, S(v)));
}
var QUOT = {
  tan: { a: 'sin', b: 'cos', name: 'Quotient identity' }, cot: { a: 'cos', b: 'sin', name: 'Quotient identity' },
  sec: { a: null, b: 'cos', name: 'Reciprocal identity' }, csc: { a: null, b: 'sin', name: 'Reciprocal identity' }
};
function mapTree(n, fn) {
  if (!n || typeof n !== 'object') return n;
  var o = {}; for (var k in n) o[k] = (k === 'a' || k === 'b' || k === 'l' || k === 'r') && n[k] && typeof n[k] === 'object' ? mapTree(n[k], fn) : n[k];
  return fn(o);
}
/* Step 1: arguments other than plain v (2x, -x, x + π/2, π/2 - x) */
function expandArgs(ast, v, used) {
  return mapTree(ast, function (n) {
    if (n.t !== 'fn' || !TRIG6.test(n.name) || isV(n.a, v)) return n;
    if (!EH.has(n.a, v)) return n;
    var lin = EH.linearIn(n.a, v);
    if (!lin) throw new MathError('The angle inside ' + n.name + ' must be linear (like 2x or x + π/2) for a proof.');
    var even = n.name === 'cos' || n.name === 'sec';
    /* reciprocal/quotient functions of a plain -v: use even/odd directly */
    if (lin.c.isZero() && lin.k.eq(ONE.neg())) {
      used.push({ name: 'Even/odd identity', text: n.name + '(-' + v + ') = ' + (even ? '' : '-') + n.name + ' ' + v + '   (' + n.name + ' is ' + (even ? 'even' : 'odd') + ')', rule: 'even-odd' });
      return even ? F(n.name, V(v)) : U('neg', F(n.name, V(v)));
    }
    var cm = lin.c.piMultiple();
    if (lin.k.eq(ONE.neg()) && cm && cm.eq(q(1, 2))) {
      var CO = { sin: 'cos', cos: 'sin', tan: 'cot', cot: 'tan', sec: 'csc', csc: 'sec' };
      used.push({ name: 'Cofunction identity', text: n.name + '(π/2 - ' + v + ') = ' + CO[n.name] + ' ' + v, rule: 'cofunction' });
      return F(CO[n.name], V(v));
    }
    if (n.name === 'sin' || n.name === 'cos') return expandSC(n.name, lin.k, lin.c, v, used);
    var qd = QUOT[n.name], a = qd.a ? expandSC(qd.a, lin.k, lin.c, v, used) : num(1), b = expandSC(qd.b, lin.k, lin.c, v, used);
    return B('div', a, b);
  });
}
function tidy(ast) {
  return mapTree(ast, function (n) {
    if (n.t === 'neg' && n.a.t === 'neg') return n.a.a;
    if (n.t === 'sub' && n.b.t === 'neg') return B('add', n.a, n.b.a);
    if (n.t === 'add' && n.b.t === 'neg') return B('sub', n.a, n.b.a);
    if (n.t === 'mul' && n.a.t === 'neg' && n.b.t === 'neg') return B('mul', n.a.a, n.b.a);
    return n;
  });
}
/* Step 2: tan, cot, sec, csc -> sin and cos */
function toSinCos(ast, v, used) {
  var seen = {};
  function note(name) {
    if (seen[name]) return; seen[name] = 1;
    var d = QUOT[name], vv = v;
    used.push({ name: d.name, text: name + ' ' + vv + ' = (' + (d.a ? d.a + ' ' + vv : '1') + ')/(' + d.b + ' ' + vv + ')', rule: d.name === 'Quotient identity' ? 'quotient' : 'reciprocal' });
  }
  return mapTree(ast, function (n) {
    if (n.t === 'pow' && n.a.t === 'div' && n.b.t === 'num' && n.b.q.isInt() && n.b.q.n > 0)
      return B('div', isOneN(n.a.a) ? num(1) : B('pow', n.a.a, n.b), B('pow', n.a.b, n.b));
    if (n.t !== 'fn' || !QUOT[n.name] || !isV(n.a, v)) return n;
    note(n.name);
    var d = QUOT[n.name];
    return B('div', d.a ? F(d.a, V(v)) : num(1), F(d.b, V(v)));
  });
}
/* AST (already in sin v / cos v only) -> RF2 */
function toRF2(n, v) {
  switch (n.t) {
    case 'num': return new RF2(P2.k(EX.rat(n.q)));
    case 'raw': if (!n.val.ex) throw new MathError('unsupported'); return new RF2(P2.k(n.val.ex));
    case 'const': throw new MathError('unsupported');
    case 'var': throw new MathError(v + ' appears outside a trig function, so this is not a pure trig identity.');
    case 'fn':
      if (!isV(n.a, v)) { if (!EH.has(n.a, v)) return new RF2(P2.k(exVal(n))); throw new MathError('unsupported'); }
      if (n.name === 'sin') return new RF2(P2.mono(1, 0));
      if (n.name === 'cos') return new RF2(P2.mono(0, 1));
      if (n.name === 'tan') return new RF2(P2.mono(1, 0), P2.mono(0, 1));
      if (n.name === 'cot') return new RF2(P2.mono(0, 1), P2.mono(1, 0));
      if (n.name === 'sec') return new RF2(P2.k(ONE), P2.mono(0, 1));
      if (n.name === 'csc') return new RF2(P2.k(ONE), P2.mono(1, 0));
      throw new MathError('unsupported');
    case 'add': return toRF2(n.a, v).add(toRF2(n.b, v));
    case 'sub': return toRF2(n.a, v).sub(toRF2(n.b, v));
    case 'mul': return toRF2(n.a, v).mul(toRF2(n.b, v));
    case 'div': return toRF2(n.a, v).div(toRF2(n.b, v));
    case 'neg': return toRF2(n.a, v).neg();
    case 'pow':
      if (n.b.t === 'num' && n.b.q.isInt() && Math.abs(n.b.q.n) <= 8) return toRF2(n.a, v).pow(n.b.q.n);
      if (n.b.t === 'neg' && n.b.a.t === 'num' && n.b.a.q.isInt()) return toRF2(n.a, v).pow(-n.b.a.q.n);
      throw new MathError('unsupported');
    default: throw new MathError('This expression has a part (' + n.t + ') that the identity prover does not handle.');
  }
}

/* ===================== cancelling and Pythagorean moves ===================== */
var BIN = function () {
  return [
    { p: new P2({ '0,0': ONE, '1,0': ONE }), t: '1 + sin' }, { p: new P2({ '0,0': ONE, '1,0': ONE.neg() }), t: '1 - sin' },
    { p: new P2({ '0,0': ONE, '0,1': ONE }), t: '1 + cos' }, { p: new P2({ '0,0': ONE, '0,1': ONE.neg() }), t: '1 - cos' },
    { p: new P2({ '1,0': ONE, '0,1': ONE }), t: 'sin + cos' }, { p: new P2({ '1,0': ONE, '0,1': ONE.neg() }), t: 'sin - cos' }
  ];
}();
function cancel(Nn, Dd, v) {
  var notes = [];
  var g = { i: Math.min(Nn.monoGcd().i, Dd.monoGcd().i), j: Math.min(Nn.monoGcd().j, Dd.monoGcd().j) };
  if (!Nn.isZero() && (g.i || g.j)) { Nn = Nn.divMono(g.i, g.j); Dd = Dd.divMono(g.i, g.j); notes.push(monoTxt(g.i, g.j, v)); }
  /* a common whole number, e.g. (2 sin x)/(2 cos x) */
  var all = Nn.terms().concat(Dd.terms());
  if (!Dd.isConst() && all.every(function (x) { return x.c.isRational() && x.c.rat().isInt(); })) {
    var gn = all.reduce(function (a, x) { return EH.gcd(a, x.c.rat().n); }, 0);
    if (gn > 1) { var k = EX.rat(q(1, gn)); Nn = Nn.scale(k); Dd = Dd.scale(k); notes.push(String(gn)); }
  }
  for (var k = 0; k < BIN.length; k++) {
    var guard = 0;
    while (guard++ < 4 && !Dd.isConst()) {
      var a = Nn.exactDiv(BIN[k].p), b = a && Dd.exactDiv(BIN[k].p);
      if (!a || !b) break;
      Nn = a; Dd = b; notes.push('(' + BIN[k].p.text(v) + ')');
    }
  }
  /* identical numerator and denominator */
  if (!Dd.isConst() && Nn.eq(Dd)) { notes.push('(' + Nn.text(v) + ')'); Nn = P2.k(ONE); Dd = P2.k(ONE); }
  else if (!Dd.isConst() && !Nn.isConst()) { var qn = Nn.exactDiv(Dd); if (qn) { notes.push('(' + Dd.text(v) + ')'); Nn = qn; Dd = P2.k(ONE); } }
  if (Dd.isConst() && !Dd.constVal().eq(ONE)) { var inv = Dd.constVal().inv(); if (inv) { Nn = Nn.scale(inv); Dd = P2.k(ONE); } }
  return { N: Nn, D: Dd, notes: notes };
}
function pairSum(P) {
  var ts = P.terms();
  for (var k = 0; k < ts.length; k++) {
    var x = ts[k]; if (x.i < 2) continue;
    var y = P.t[(x.i - 2) + ',' + (x.j + 2)];
    if (y && y.eq(x.c)) { var r = P.clone(); r.addTerm(x.i, x.j, x.c.neg()); r.addTerm(x.i - 2, x.j + 2, x.c.neg()); r.addTerm(x.i - 2, x.j, x.c); return r; }
  }
  return null;
}
function oneMinus(P, which) {        /* a·m - a·m·sin² -> a·m·cos²   (which = 's') */
  var ts = P.terms();
  for (var k = 0; k < ts.length; k++) {
    var x = ts[k], key = which === 's' ? (x.i + 2) + ',' + x.j : x.i + ',' + (x.j + 2), y = P.t[key];
    if (y && y.eq(x.c.neg())) {
      var r = P.clone(); r.addTerm(x.i, x.j, x.c.neg()); r.addTerm(+key.split(',')[0], +key.split(',')[1], y.neg());
      if (which === 's') r.addTerm(x.i, x.j + 2, x.c); else r.addTerm(x.i + 2, x.j, x.c);
      return r;
    }
  }
  return null;
}
function sq(f, v) { return f + '²' + v; }
var MOVES = [
  { f: pairSum, note: function (v) { return 'Pythagorean identity: ' + sq('sin', v) + ' + ' + sq('cos', v) + ' = 1'; } },
  { f: function (P) { return oneMinus(P, 's'); }, note: function (v) { return 'Pythagorean identity: 1 - ' + sq('sin', v) + ' = ' + sq('cos', v); } },
  { f: function (P) { return oneMinus(P, 'c'); }, note: function (v) { return 'Pythagorean identity: 1 - ' + sq('cos', v) + ' = ' + sq('sin', v); } },
  { f: function (P) { return P.hasC2() ? P.subC2() : null; }, note: function (v) { return 'Pythagorean identity: ' + sq('cos', v) + ' = 1 - ' + sq('sin', v); } },
  { f: function (P) { return P.hasS2() ? P.subS2() : null; }, note: function (v) { return 'Pythagorean identity: ' + sq('sin', v) + ' = 1 - ' + sq('cos', v); } }
];
function matches(Nn, Dd, T) { return Nn.mul(T.d).eq(T.n.mul(Dd)); }
function search(start, T, v, maxDepth) {
  var c0 = cancel(start.n, start.d, v);
  var first = { N: c0.N, D: c0.D, path: c0.notes.length ? [{ cancel: c0.notes, N: c0.N, D: c0.D }] : [] };
  var queue = [first], seen = {}, expanded = 0;
  seen[first.N.key() + '/' + first.D.key()] = 1;
  while (queue.length && expanded++ < 4000) {
    var st = queue.shift();
    if (matches(st.N, st.D, T)) return st;
    var depth = st.path.filter(function (p) { return !p.cancel; }).length;
    if (depth >= maxDepth) continue;
    for (var side = 0; side < 2; side++) {
      for (var m = 0; m < MOVES.length; m++) {
        var P = side ? st.D : st.N, r = MOVES[m].f(P);
        if (!r || r.isZero() && side) continue;
        var n2 = side ? st.N : r, d2 = side ? r : st.D;
        if (n2.size() > 40 || d2.size() > 40) continue;
        var cc = cancel(n2, d2, v), key = cc.N.key() + '/' + cc.D.key();
        if (seen[key]) continue; seen[key] = 1;
        var path = st.path.concat([{ note: MOVES[m].note(v), side: side, N: n2, D: d2 }]);
        if (cc.notes.length) path.push({ cancel: cc.notes, N: cc.N, D: cc.D });
        queue.push({ N: cc.N, D: cc.D, path: path });
      }
    }
    /* multiply top and bottom by the conjugate of a 1 ± sin / 1 ± cos factor */
    [[st.D, 0], [st.N, 1]].forEach(function (pr) {
      for (var b = 0; b < 4; b++) {
        var P = pr[0], bin = BIN[b].p;
        if (!P.exactDiv(bin)) continue;
        var conj = BIN[b ^ 1].p, n3 = st.N.mul(conj), d3 = st.D.mul(conj);
        var tgt = pr[1] ? n3 : d3, after = oneMinus(tgt, b < 2 ? 's' : 'c');
        if (!after) continue;
        var n4 = pr[1] ? after : n3, d4 = pr[1] ? d3 : after;
        var cc2 = cancel(n4, d4, v), key2 = cc2.N.key() + '/' + cc2.D.key();
        if (seen[key2]) continue; seen[key2] = 1;
        var path2 = st.path.concat([
          { note: 'Multiply the top and the bottom by the conjugate ' + conj.text(v) + ' (this does not change the value; it creates a difference of squares).', N: n3, D: d3, conj: true },
          { note: 'Pythagorean identity: 1 - ' + sq(b < 2 ? 'sin' : 'cos', v) + ' = ' + sq(b < 2 ? 'cos' : 'sin', v), side: 1 - pr[1], N: n4, D: d4 }]);
        if (cc2.notes.length) path2.push({ cancel: cc2.notes, N: cc2.N, D: cc2.D });
        queue.push({ N: cc2.N, D: cc2.D, path: path2 });
      }
    });
  }
  return null;
}
function complexity(n) {
  var c = 0;
  EH.find(n, function (x) {
    c++;
    if (x.t === 'div') c += 3;
    if (x.t === 'fn' && /^(tan|cot|sec|csc)$/.test(x.name)) c += 2;
    if (x.t === 'fn' && TRIG6.test(x.name) && x.a.t !== 'var') c += 3;
    if (x.t === 'pow') c += 1;
    return false;
  });
  return c;
}
function trigVar(ast) { var vs = EH.vars(ast); return vs.length === 1 ? vs[0] : vs.indexOf('x') >= 0 ? 'x' : vs.indexOf('θ') >= 0 ? 'θ' : vs[0]; }

function identityList(used) {
  var seen = {}, out = [];
  used.forEach(function (u) { if (!seen[u.text]) { seen[u.text] = 1; out.push(u); } });
  return out;
}
function transformTo(A, Bn, v, sideName, otherName) {
  var steps = [], usedAll = [];
  step(steps, 'Start with the ' + sideName + ' side' + (sideName === 'left' || sideName === 'right' ? ' (work on the more complicated side; leave the other side alone)' : '') + '.', ttxt(A, v), 'identity');
  var used1 = [], A1 = tidy(expandArgs(A, v, used1));
  if (used1.length) {
    identityList(used1).forEach(function (u) { step(steps, u.name + ':', u.text, u.rule); usedAll.push(u); });
    step(steps, 'Substitute those in.', '= ' + ttxt(A1, v), used1[0].rule);
  }
  var used2 = [], A2 = toSinCos(A1, v, used2);
  if (used2.length) {
    var ids = identityList(used2);
    step(steps, 'Rewrite everything in terms of sine and cosine. ' + ids.map(function (u) { return u.name + ': ' + u.text; }).join('.   ') + '.', '= ' + ttxt(A2, v), ids[0].rule);
    usedAll = usedAll.concat(ids);
  }
  var rf = toRF2(A2, v);
  var B1 = expandArgs(Bn, v, []), B2 = toSinCos(B1, v, []), T = toRF2(B2, v);
  var combined = rfText(rf.n, rf.d, v);
  var cur = ttxt(A2, v);
  if (combined.replace(/\s/g, '') !== cur.replace(/\s/g, '')) {
    var hasFrac = /\//.test(cur);
    var lcdShow = hasFrac ? lcdLines(A2, v) : null;
    step(steps, hasFrac ? 'Combine into ONE fraction: use a common denominator (multiply each fraction top and bottom by the factor its denominator is missing), then multiply out the top.' : 'Multiply out (distribute / FOIL) and combine like terms.', (lcdShow ? lcdShow.map(function (l) { return '= ' + l; }).join('\n') + '\n' : '') + '= ' + combined, hasFrac ? 'fractions' : 'distribute');
  }
  var found = search(rf, T, v, 4);
  if (!found) return null;
  found.path.forEach(function (p) {
    if (p.cancel) step(steps, 'Cancel the common factor' + (p.cancel.length > 1 ? 's ' : ' ') + p.cancel.join(', ') + ' (top and bottom).', '= ' + rfText(p.N, p.D, v), 'cancel');
    else if (p.conj) { step(steps, p.note, '= ' + wrapF(p.N.factorText(v)) + '/' + wrapF(p.D.text(v)), 'conjugate'); usedAll.push({ name: 'Conjugate', text: 'multiply top and bottom by the conjugate' }); }
    else { step(steps, p.note + (p.side ? '  (in the denominator)' : ''), '= ' + rfText(p.N, p.D, v), 'pythagorean'); usedAll.push({ name: 'Pythagorean identity', text: p.note.replace(/^Pythagorean identity: /, '') }); }
  });
  var last = rfText(found.N, found.D, v), b2t = ttxt(B2, v), bt = ttxt(Bn, v);
  if (b2t.replace(/\s/g, '') !== last.replace(/\s/g, '')) step(steps, 'Split / rearrange to match the ' + otherName + ' side written in sine and cosine.', '= ' + b2t, 'identity');
  if (bt.replace(/\s/g, '') !== b2t.replace(/\s/g, '')) step(steps, 'Rewrite with the quotient / reciprocal identities (read them backwards).', '= ' + bt, 'reciprocal');
  return { steps: steps, used: identityList(usedAll) };
}


/* written-out common denominator: "= (sin x·sin x)/(cos x·sin x) + (cos x·cos x)/(sin x·cos x)" */
function lcdLines(A, v) {
  var ts = [];
  (function flat(n, sg) { if (n.t === 'add') { flat(n.a, sg); flat(n.b, sg); } else if (n.t === 'sub') { flat(n.a, sg); flat(n.b, -sg); } else ts.push({ s: sg, n: n }); })(A, 1);
  if (ts.length < 2) return null;
  var parts = [];
  for (var i = 0; i < ts.length; i++) {
    var n = ts[i].n, nu, de;
    if (n.t === 'div') { nu = n.a; de = n.b; }
    else if (n.t === 'mul' && n.b.t === 'div') { nu = B('mul', n.a, n.b.a); de = n.b.b; }
    else if (n.t === 'mul' && n.a.t === 'div') { nu = B('mul', n.a.a, n.b); de = n.a.b; }
    else { nu = n; de = null; }
    if (EH.find(nu, function (x) { return x.t === 'div'; }).length || (de && EH.find(de, function (x) { return x.t === 'div'; }).length)) return null;
    parts.push({ s: ts[i].s, nu: nu, de: de });
  }
  var dens = [];
  parts.forEach(function (p) { if (p.de && !dens.some(function (d) { return ttxt(d, v) === ttxt(p.de, v); })) dens.push(p.de); });
  if (!dens.length || dens.length > 3) return null;
  var w = function (t) { var d = 0; for (var i = 1; i < t.length; i++) { if (t[i] === '(') d++; else if (t[i] === ')') d--; else if (d === 0 && (t[i] === '+' || (t[i] === '-' && t[i - 1] === ' '))) return '(' + t + ')'; } return t; };
  var lcdT = dens.map(function (d) { return w(ttxt(d, v)); }).join('·');
  var line1 = [], tops = [];
  parts.forEach(function (p, i) {
    var miss = dens.filter(function (d) { return !p.de || ttxt(d, v) !== ttxt(p.de, v); }).map(function (d) { return w(ttxt(d, v)); });
    var top = w(ttxt(p.nu, v)) + (miss.length ? '·' + miss.join('·') : '');
    var own = p.de ? [w(ttxt(p.de, v))].concat(miss).join('·') : miss.join('·');
    line1.push((i === 0 ? (p.s < 0 ? '-' : '') : (p.s < 0 ? ' - ' : ' + ')) + '(' + top + ')/(' + own + ')');
    tops.push((i === 0 ? (p.s < 0 ? '-' : '') : (p.s < 0 ? ' - ' : ' + ')) + top);
  });
  return [line1.join(''), '(' + tops.join('') + ')/(' + lcdT + ')'];
}
function isIdentity(l, r, v) {
  var ok = 0, tries = 0;
  for (var i = 0; i < 40 && ok < 6; i++) {
    var x = 0.137 + i * 0.731, e = {}; e[v] = x;
    var a = EH.fval(l, e), b = EH.fval(r, e);
    if (!isFinite(a) || !isFinite(b) || Math.abs(a) > 1e6) continue;
    tries++;
    if (Math.abs(a - b) > 1e-8 * Math.max(1, Math.abs(a))) return false;
    ok++;
  }
  return ok >= 4;
}
EH.isIdentity = isIdentity;

function proveIdentity(l, r, v) {
  if (!isIdentity(l, r, v)) return { notIdentity: true };
  /* half (or third) angles: let u = x/2 so every angle becomes a whole multiple of u */
  var d = 1;
  EH.find({ t: 'add', a: l, b: r }, function (n) { return n.t === 'fn' && TRIG6.test(n.name) && EH.has(n.a, v); }).forEach(function (n) {
    var lin = EH.linearIn(n.a, v);
    if (lin && lin.k.isRational()) d = EH.lcm(d, lin.k.rat().d);
  });
  if (d > 1 && d <= 4) {
    var u = v === 'u' ? 'w' : 'u', sub = B('mul', num(d), V(u));
    var tidyArgs = function (ast) { return mapTree(EH.subst(ast, v, sub), function (n) {
      if (n.t !== 'fn' || !TRIG6.test(n.name)) return n;
      var li = EH.linearIn(n.a, u); if (!li || !li.c.isZero() || !li.k.isRational()) return n;
      var kk = li.k.rat(); return F(n.name, kk.isOne() ? V(u) : B('mul', N(kk), V(u)));
    }); };
    var L2 = tidyArgs(l), R2 = tidyArgs(r);
    var res = proveIdentity(L2, R2, u);
    if (res.notIdentity) return res;
    res.steps.unshift({ note: 'The angles are ' + v + '/' + d + ' and multiples of it. Substitute u = ' + v + '/' + d + ', so ' + v + ' = ' + d + 'u. Now every angle is a whole multiple of u, and the double-angle identities apply.', math: ttxt(l, v) + ' = ' + ttxt(r, v) + '\nbecomes   ' + ttxt(L2, u) + ' = ' + ttxt(R2, u), rule: 'half-angle' });
    res.steps.push({ note: 'Replace u with ' + v + '/' + d + ' to state it in terms of ' + v + '. ✓', math: null, rule: 'identity' });
    return res;
  }
  var order = complexity(l) >= complexity(r) ? [[l, r, 'left', 'right'], [r, l, 'right', 'left']] : [[r, l, 'right', 'left'], [l, r, 'left', 'right']];
  for (var k = 0; k < 2; k++) {
    try {
      var t = transformTo(order[k][0], order[k][1], v, order[k][2], order[k][3]);
      if (t) { t.side = order[k][2]; return t; }
    } catch (e) { if (!(e instanceof MathError)) throw e; if (k === 1) throw e; }
  }
  /* both sides to the same expression */
  var steps = [], used = [];
  [[l, 'left'], [r, 'right']].forEach(function (pair) {
    var u1 = [], a1 = expandArgs(pair[0], v, u1), u2 = [], a2 = toSinCos(a1, v, u2), rf = toRF2(a2, v);
    var n = rf.n.canon(), d = rf.d.canon(), cc = cancel(n, d, v);
    used = used.concat(u1, u2);
    step(steps, 'Work the ' + pair[1] + ' side on its own: ' + identityList(u1.concat(u2)).map(function (u) { return u.name + ' ' + u.text; }).join('; ') + (u1.length + u2.length ? '; ' : '') + 'then replace every cos²' + v + ' with 1 - sin²' + v + ' (Pythagorean identity) and cancel.', ttxt(pair[0], v) + '\n= ' + rfText(cc.N, cc.D, v), 'pythagorean');
  });
  step(steps, 'Both sides simplify to the same expression, so the identity holds wherever both sides are defined.', null, 'identity');
  return { steps: steps, used: identityList(used), both: true };
}
EH.proveIdentity = proveIdentity;

/* simplest equal expression from a list, then prove it */
var TARGETS = ['0', '1', '-1', '2', '-2', 'sin(x)', 'cos(x)', 'tan(x)', 'cot(x)', 'sec(x)', 'csc(x)', '-sin(x)', '-cos(x)', '-tan(x)', '-cot(x)', '-sec(x)', '-csc(x)',
  '2sin(x)', '2cos(x)', '2tan(x)', '2sec(x)', '2csc(x)', '2cot(x)', 'sin(x)^2', 'cos(x)^2', 'tan(x)^2', 'cot(x)^2', 'sec(x)^2', 'csc(x)^2', '-sin(x)^2', '-cos(x)^2', '-tan(x)^2', '-cot(x)^2',
  '2sec(x)^2', '2csc(x)^2', '2sin(x)^2', '2cos(x)^2', 'sin(x)cos(x)', 'sin(x)tan(x)', 'cos(x)cot(x)', 'sec(x)csc(x)', 'sec(x)tan(x)', 'csc(x)cot(x)', 'sin(2x)', 'cos(2x)', 'tan(2x)',
  '1 + sin(x)', '1 - sin(x)', '1 + cos(x)', '1 - cos(x)', 'sin(x) + cos(x)', 'sin(x) - cos(x)', 'sec(x) + tan(x)', 'csc(x) + cot(x)', 'sec(x) - tan(x)', 'csc(x) - cot(x)',
  'sin(x)^3', 'cos(x)^3', 'tan(x)^3', '1 + tan(x)', '1 + cot(x)', 'tan(x) + cot(x)', '2tan(x)^2', 'sin(x)^4', 'cos(x)^4', 'sec(x)^4', 'tan(x)^4', 'sin(x)^2cos(x)^2', '1 + sin(x)^2', '1 + cos(x)^2', '2 - sin(x)^2', '2 - cos(x)^2', '1 + 2sin(x)cos(x)', '1 - 2sin(x)cos(x)', 'cos(x)^2 - sin(x)^2'];
function simplifyTrig(ast, v) {
  var steps = [];
  for (var i = 0; i < TARGETS.length; i++) {
    var t = EH.parse(TARGETS[i].replace(/x/g, v === 'x' ? 'x' : v));
    if (isIdentity(ast, t, v)) {
      if (ttxt(t, v).replace(/\s/g, '') === ttxt(ast, v).replace(/\s/g, '')) return { already: true, target: t, steps: [] };
      try {
        var tr = transformTo(ast, t, v, 'given', 'simplified');
        if (tr) return { target: t, steps: tr.steps, used: tr.used };
      } catch (e) { if (!(e instanceof MathError)) throw e; }
    }
  }
  /* no short target: smallest sin/cos form */
  var used = [], a1 = expandArgs(ast, v, used), a2 = toSinCos(a1, v, used), rf = toRF2(a2, v);
  step(steps, 'Rewrite in sine and cosine' + (used.length ? ' (' + identityList(used).map(function (u) { return u.text; }).join('; ') + ')' : '') + ', then combine into one fraction.', ttxt(ast, v) + '\n= ' + ttxt(a2, v) + '\n= ' + rfText(rf.n, rf.d, v), 'quotient');
  var best = cancel(rf.n, rf.d, v), bestSize = best.N.size() + best.D.size();
  [rf.n.canon(), rf.n.subS2()].forEach(function (n, k) {
    var c = cancel(n, k ? rf.d.subS2() : rf.d.canon(), v), sz = c.N.size() + c.D.size();
    if (sz < bestSize) { best = c; bestSize = sz; }
  });
  step(steps, 'Use the Pythagorean identity to shrink it and cancel common factors.', '= ' + rfText(best.N, best.D, v), 'pythagorean');
  return { target: null, text: rfText(best.N, best.D, v), steps: steps };
}
EH.simplifyTrig = simplifyTrig;
EH.trigVar = trigVar;
EH._P2 = P2;

/* ===================== angles ===================== */
function piText(r) {        /* Q multiple of π -> "7π/4" */
  if (r.isZero()) return '0';
  var n = r.n, d = r.d, top = (n < 0 ? '-' : '') + (Math.abs(n) === 1 ? '' : Math.abs(n)) + 'π';
  return d === 1 ? top : top + '/' + d;
}
function degText(r) { return r.toString() + '°'; }
function angleOf(ast) {
  if (EH.vars(ast).length) return null;
  if (EH.find(ast, function (n) { return n.t === 'fn' || n.t === 'root' || n.t === 'abs'; }).length) return null;
  var isDeg = EH.find(ast, function (n) { return n.t === 'deg'; }).length > 0;
  var isPi = EH.find(ast, function (n) { return n.t === 'const' && n.name === 'π'; }).length > 0;
  if (!isDeg && !isPi) return null;
  var f = EH.fval(ast);
  if (!isFinite(f)) return null;
  var r = Q.fromFloat(f / Math.PI);
  if (!r || r.d > 360) return null;
  return { rPi: r, deg: r.mul(q(180)), unit: isDeg ? 'deg' : 'rad' };
}
EH.angleOf = angleOf;
function modQ(a, m) { var k = Math.floor(a.val() / m.val()); return { r: a.sub(m.mul(q(k))), k: k }; }

function angleSvg(rPi, refPi, quad, label, refLabel, pointLabel) {
  var W = 340, H = 340, cx = 170, cy = 170, R = 112;
  var th = rPi.val() * Math.PI, th0 = modQ(rPi, q(2)).r.val() * Math.PI;
  var o = [];
  o.push('<svg class="gp ang" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Angle ' + label + ' in standard position" xmlns="http://www.w3.org/2000/svg">');
  o.push('<rect class="gp-paper" x="0" y="0" width="' + W + '" height="' + H + '" rx="4"/>');
  var g = []; for (var k = 10; k < W; k += 20) g.push('M' + k + ' 0V' + H + 'M0 ' + k + 'H' + W);
  o.push('<path class="gp-grid" d="' + g.join('') + '"/>');
  o.push('<path class="gp-axis" d="M14 ' + (cy + 1) + 'Q170 ' + (cy - 1.5) + ' 326 ' + cy + 'M' + (cx - 1) + ' 326Q' + (cx + 1.5) + ' 170 ' + cx + ' 14M318 ' + (cy - 5) + 'L326 ' + cy + 'L318 ' + (cy + 5) + 'M' + (cx - 5) + ' 22L' + cx + ' 14L' + (cx + 5) + ' 22"/>');
  o.push('<circle class="gp-mid" cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none"/>');
  ['I', 'II', 'III', 'IV'].forEach(function (t, i) { var a = Math.PI / 4 + i * Math.PI / 2; o.push('<text class="gp-quad' + (quad === i + 1 ? ' gp-quad-on' : '') + '" x="' + (cx + 140 * Math.cos(a)).toFixed(1) + '" y="' + (cy - 140 * Math.sin(a) + 6).toFixed(1) + '" text-anchor="middle">' + t + '</text>'); });
  /* reference angle wedge */
  if (refPi && !refPi.isZero() && quad) {
    var axisAng = (quad === 1 || quad === 4) ? (quad === 4 ? 2 * Math.PI : 0) : Math.PI;
    var a1 = Math.min(axisAng, th0), a2 = Math.max(axisAng, th0), rr = 46;
    var p1 = [cx + rr * Math.cos(a1), cy - rr * Math.sin(a1)], p2 = [cx + rr * Math.cos(a2), cy - rr * Math.sin(a2)];
    o.push('<path class="ang-ref" d="M' + cx + ' ' + cy + 'L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'A' + rr + ' ' + rr + ' 0 0 0 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'Z"/>');
    var am = (a1 + a2) / 2;
    o.push('<text class="ang-reflab" x="' + (cx + 70 * Math.cos(am)).toFixed(1) + '" y="' + (cy - 70 * Math.sin(am) + 5).toFixed(1) + '" text-anchor="middle">' + refLabel + '</text>');
  }
  /* rotation spiral from the positive x-axis */
  var turns = Math.abs(th) / (2 * Math.PI), pts = [], n = Math.max(30, Math.ceil(Math.abs(th) / 0.05));
  for (var i = 0; i <= n; i++) {
    var t = th * i / n, rad = 22 + 14 * Math.abs(t) / (2 * Math.PI);
    pts.push([cx + rad * Math.cos(t), cy - rad * Math.sin(t)]);
  }
  if (Math.abs(th) > 1e-9) {
    o.push('<path class="ang-arc" d="M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L') + '"/>');
    var e = pts[pts.length - 1], pe = pts[pts.length - 2], ang = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
    o.push('<path class="ang-arc" d="M' + (e[0] - 9 * Math.cos(ang - 0.45)).toFixed(1) + ' ' + (e[1] - 9 * Math.sin(ang - 0.45)).toFixed(1) + 'L' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + 'L' + (e[0] - 9 * Math.cos(ang + 0.45)).toFixed(1) + ' ' + (e[1] - 9 * Math.sin(ang + 0.45)).toFixed(1) + '"/>');
  }
  /* initial and terminal sides */
  o.push('<path class="ang-init" d="M' + cx + ' ' + cy + 'L' + (cx + R + 18) + ' ' + cy + '"/>');
  var tx = cx + (R + 22) * Math.cos(th0), ty = cy - (R + 22) * Math.sin(th0);
  o.push('<path class="ang-term" d="M' + cx + ' ' + cy + 'Q' + ((cx + tx) / 2 + 1.5).toFixed(1) + ' ' + ((cy + ty) / 2 - 1.5).toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + '"/>');
  var px = cx + R * Math.cos(th0), py = cy - R * Math.sin(th0);
  o.push('<circle class="gp-pt" cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="4.3"/>');
  if (pointLabel) {
    var right = Math.cos(th0) >= -0.05 && px < W - 120, lx = px + (right ? 8 : -8), ly = py + (Math.sin(th0) >= 0 ? -10 : 20);
    if (!right && px > W - 120) lx = Math.min(px + 4, W - 8);
    o.push('<text class="gp-plab" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '">' + pointLabel + '</text>');
  }
  o.push('<text class="ang-lab" x="' + (cx + 34) + '" y="' + (cy + (th >= 0 ? -32 - 6 * Math.min(turns, 3) : 44 + 6 * Math.min(turns, 3))) + '">θ = ' + label + '</text>');
  if (turns > 1) o.push('<text class="gp-lab" x="18" y="' + (H - 14) + '">' + Math.floor(turns) + ' full turn' + (Math.floor(turns) > 1 ? 's' : '') + (th < 0 ? ' clockwise' : '') + ' + more</text>');
  o.push('</svg>');
  return o.join('');
}

function angleAnalysis(ast, opts) {
  opts = opts || {};
  var A = angleOf(ast);
  if (!A) throw new MathError('This is not an angle I can work with. Use degrees (like 405°) or a multiple of π (like -7π/4).');
  var steps = [], ans = [], notes = [];
  var rPi = A.rPi, deg = A.deg, two = q(2), d360 = q(360);
  var degMode = A.unit === 'deg';
  var given = degMode ? degText(deg) : piText(rPi);
  /* 1. convert */
  if (degMode) {
    var raw = deg.mul(q(1, 180));
    step(steps, 'Convert degrees to radians: multiply by π/180° (the degree signs cancel), then reduce the fraction.', given + ' · π/180° = ' + (deg.isInt() ? deg.n + 'π/180' : '(' + deg + ')π/180') + ' = ' + piText(raw), 'deg-rad');
  } else {
    step(steps, 'Convert radians to degrees: multiply by 180°/π (the π cancels). Tip: π/' + (rPi.d) + ' is ' + (180 / rPi.d) + '°, so just multiply.', given + ' · 180°/π = ' + (rPi.d === 1 ? rPi.n + '(180°)' : rPi.n + '(180°/' + rPi.d + ')') + ' = ' + degText(deg), 'deg-rad');
  }
  ans.push('In radians: ' + piText(rPi) + '   ·   in degrees: ' + degText(deg));
  /* 2. coterminal in [0, 360) */
  var m = modQ(deg, d360), base = m.r, k = m.k, baseR = base.mul(q(1, 180));
  if (k === 0) step(steps, 'The angle is already between 0° and 360° (one turn), so it is its own principal coterminal angle.', degText(deg) + '   (' + piText(rPi) + ')', 'coterminal');
  else {
    var times = Math.abs(k), sign = k > 0 ? '-' : '+';
    var dLine = degText(deg) + ' ' + sign + ' ' + (times === 1 ? '360°' : times + '(360°)') + ' = ' + degText(base);
    var rLine = piText(rPi) + ' ' + sign + ' ' + (times === 1 ? '2π' : times + '(2π)') + ' = ' + piText(rPi) + ' ' + sign + ' ' + piText(q(2 * times * rPi.d, rPi.d)).replace(/^(\d+)π$/, '$1π') + (rPi.d > 1 ? '' : '') + ' = ' + piText(baseR);
    if (rPi.d > 1) rLine = piText(rPi) + ' ' + sign + ' ' + (times === 1 ? '2π' : times + '(2π)') + ' = ' + piText(rPi) + ' ' + sign + ' ' + (2 * times * rPi.d) + 'π/' + rPi.d + ' = ' + piText(baseR);
    step(steps, 'Coterminal angles share the same terminal side. ' + (k > 0 ? 'Subtract' : 'Add') + ' full turns (360° = 2π) until the angle lands in [0°, 360°). ' + (times > 1 ? degText(deg.abs()) + ' ÷ 360° ≈ ' + (Math.abs(deg.val()) / 360).toFixed(2) + ', so ' + times + ' full turns.' : ''), dLine + '\n' + rLine, 'coterminal');
  }
  ans.push('Coterminal angle in [0°, 360°): ' + degText(base) + '   =   ' + piText(baseR));
  var pos = base.isZero() ? d360 : base.add(d360), negA = base.sub(d360);
  var cands = [deg.add(d360), deg.sub(d360), base.add(d360), base.sub(d360), deg.add(q(720)), deg.sub(q(720))].filter(function (x, i, a) { return !x.eq(deg) && !x.eq(base) && a.findIndex(function (y) { return y.eq(x); }) === i; });
  var pos2 = cands.filter(function (x) { return x.val() > 0; })[0] || base.add(d360), neg2 = cands.filter(function (x) { return x.val() < 0; })[0] || base.sub(d360);
  function sh(x) { var d = x.sub(deg), n = Math.round(d.val() / 360); return degText(deg) + (n > 0 ? ' + ' : ' - ') + (Math.abs(n) === 1 ? '' : Math.abs(n)) + (Math.abs(n) === 1 ? '360°' : '(360°)') + ' = ' + degText(x); }
  step(steps, 'More coterminal angles: keep adding or subtracting 360° (2π). One positive and one negative:', sh(pos2) + '\n' + sh(neg2) + '\nin radians:   ' + piText(pos2.mul(q(1, 180))) + '   and   ' + piText(neg2.mul(q(1, 180))), 'coterminal');
  ans.push('Other coterminal angles: ' + degText(pos2) + ', ' + degText(neg2) + '   (' + piText(pos2.mul(q(1, 180))) + ', ' + piText(neg2.mul(q(1, 180))) + ')');
  ans.push('Positive & negative coterminal (smallest): ' + degText(base.isZero() ? d360 : base) + ' and ' + degText(negA) + '   (' + piText(base.isZero() ? two : baseR) + ' and ' + piText(baseR.sub(two)) + ')');
  ans.push('All coterminal angles: ' + degText(base) + ' + 360°n   =   ' + piText(baseR) + ' + 2πn   (n any integer)');
  /* 3. quadrant + reference */
  var b = base.val(), quad = 0, axis = null;
  if (b % 90 === 0) axis = { 0: 'positive x-axis', 90: 'positive y-axis', 180: 'negative x-axis', 270: 'negative y-axis' }[b];
  else quad = b < 90 ? 1 : b < 180 ? 2 : b < 270 ? 3 : 4;
  var ref, refLine;
  if (axis) {
    ref = null;
    step(steps, 'The terminal side lies ON an axis (a quadrantal angle), so it is in no quadrant and there is no reference angle in the usual sense. Read the trig values off the point on the unit circle.', 'terminal side on the ' + axis, 'unit-circle');
    ans.push('Terminal side: on the ' + axis + ' (quadrantal angle)');
  } else {
    var rule = { 1: ['θ\' = θ', function (x) { return x; }], 2: ['θ\' = 180° - θ', function (x) { return q(180).sub(x); }], 3: ['θ\' = θ - 180°', function (x) { return x.sub(q(180)); }], 4: ['θ\' = 360° - θ', function (x) { return q(360).sub(x); }] }[quad];
    ref = rule[1](base);
    var refR = ref.mul(q(1, 180));
    var rr = { 1: piText(baseR), 2: 'π - ' + piText(baseR), 3: piText(baseR) + ' - π', 4: '2π - ' + piText(baseR) }[quad];
    refLine = rule[0] + '   →   ' + (quad === 1 ? degText(base) : quad === 2 ? '180° - ' + degText(base) : quad === 3 ? degText(base) + ' - 180°' : '360° - ' + degText(base)) + ' = ' + degText(ref) + '\nradians:   ' + rr + ' = ' + piText(refR);
    step(steps, 'Quadrant: ' + degText(base) + ' is between ' + ((quad - 1) * 90) + '° and ' + (quad * 90) + '°, so the terminal side is in Quadrant ' + ['I', 'II', 'III', 'IV'][quad - 1] + '. The reference angle is the ACUTE angle between the terminal side and the x-axis (never the y-axis).', refLine, 'reference');
    ans.push('Quadrant: ' + ['I', 'II', 'III', 'IV'][quad - 1]);
    ans.push('Reference angle: ' + degText(ref) + '   =   ' + piText(refR));
    var pos3 = { 1: 'all six are positive', 2: 'sin and csc are positive; the rest are negative', 3: 'tan and cot are positive; the rest are negative', 4: 'cos and sec are positive; the rest are negative' }[quad];
    step(steps, 'Signs (All Students Take Calculus): in Quadrant ' + ['I', 'II', 'III', 'IV'][quad - 1] + ' ' + pos3 + '.', null, 'unit-circle');
  }
  /* 4. six trig values */
  var tv = trigValues(rPi, steps);
  if (tv.lines.length) ans.push.apply(ans, tv.lines);
  var refLabel = ref ? 'θ\' = ' + degText(ref) : '';
  var svg = angleSvg(rPi, ref ? ref.mul(q(1, 180)) : null, quad, given, refLabel, tv.point);
  return { steps: steps, answer: ans, notes: notes, svg: svg, title: 'Angle', quad: quad, ref: ref, base: base };
}
EH.angleAnalysis = angleAnalysis;

function trigValues(rPi, steps, only) {
  var angle = raw(rPi.isZero() ? new EX() : EX.pi(rPi)), out = [], vals = {}, point = null;
  var names = ['sin', 'cos', 'tan', 'csc', 'sec', 'cot'];
  var exact = true;
  names.forEach(function (nm) {
    try { var v = EH.evaluate(F(nm, angle)); vals[nm] = v; if (!v.ex) exact = false; }
    catch (e) { vals[nm] = null; }
  });
  if (!exact) return { lines: [], point: null };
  var s = vals.sin, c = vals.cos;
  point = '(' + c.text + ', ' + s.text + ')';
  var deg = rPi.mul(q(180)).toString() + '°';
  var tbl = 'sin θ = y = ' + s.text + '        csc θ = 1/y = ' + (vals.csc ? vals.csc.text : 'undefined (y = 0)') +
    '\ncos θ = x = ' + c.text + '        sec θ = 1/x = ' + (vals.sec ? vals.sec.text : 'undefined (x = 0)') +
    '\ntan θ = y/x = ' + (vals.tan ? vals.tan.text : 'undefined (x = 0)') + '        cot θ = x/y = ' + (vals.cot ? vals.cot.text : 'undefined (y = 0)');
  step(steps, 'Point on the unit circle at ' + deg + ': (x, y) = (cos θ, sin θ) = ' + point + '. The other four come from x and y: tan = y/x, and the reciprocals flip sin, cos, tan.', tbl, 'unit-circle');
  out.push('Point on the unit circle: ' + point);
  out.push('sin θ = ' + s.text + ',  cos θ = ' + c.text + ',  tan θ = ' + (vals.tan ? vals.tan.text : 'undefined'));
  out.push('csc θ = ' + (vals.csc ? vals.csc.text : 'undefined') + ',  sec θ = ' + (vals.sec ? vals.sec.text : 'undefined') + ',  cot θ = ' + (vals.cot ? vals.cot.text : 'undefined'));
  return { lines: out, point: point, vals: vals };
}
EH.trigValues = trigValues;
EH.piText = piText;

})(typeof EH !== 'undefined' ? EH : undefined);
