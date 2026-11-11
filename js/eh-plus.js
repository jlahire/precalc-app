/* =====================================================================
   Equation Helper extensions, part B.
   - understands typed requests: "domain of f(x) = ...", "prove ...",
     "coterminal 405°", "simplify ...", "expand log(...)", ...
   - new goals: angle, prove, simplify-trig, expand-log, condense-log, expand
   - EH.graphFor(res): a hand-drawn graph (or number line / angle) for any result
   - EH.explain(res): plain-English meaning, big idea, how to check
   - EH.solveAll(src): every goal at once
   - EH.similar(src, goal, n): new practice problems shaped like the input
   - EH.graphProblem(family, level): a graph to write the equation for
   ===================================================================== */
(function (EH) {
'use strict';
if (!EH || !EH.classify) return;
var Q = EH.Q, q = EH.q, EX = EH.EX, MathError = EH.MathError, txt = EH.txt;
var N = EH.N, V = EH.V, K = EH.K, B = EH.B, U = EH.U, F = EH.F, num = EH.num;
var base = { classify: EH.classify, analyze: EH.analyze };
function step(steps, note, math, rule) { steps.push({ note: note, math: math, rule: rule }); }
function hasFn(ast, re) { return EH.find(ast, function (n) { return n.t === 'fn' && re.test(n.name); }).length > 0; }
var TRIGRE = /^(sin|cos|tan|sec|csc|cot)$/;

Object.assign(EH.GOAL_LABEL, {
  'angle': 'Coterminal & reference angle, quadrant, drawing', 'prove': 'Prove / verify the identity (name each identity)',
  'simplify-trig': 'Simplify using trig identities', 'expand-log': 'Expand the logarithm (log rules)', 'condense-log': 'Condense into a single logarithm',
  'expand': 'Expand / multiply out', 'graph': 'Graph it'
});

/* ---------------- typed requests ---------------- */
var INTENTS = [
  [/^\s*(?:find\s+)?(?:the\s+)?domain\s+and\s+range\s+(?:of\s+)?:?\s*/i, 'domain'],
  [/^\s*(?:find\s+)?(?:the\s+)?domain\s+(?:of\s+)?:?\s*/i, 'domain'],
  [/^\s*(?:find\s+)?(?:the\s+)?range\s+(?:of\s+)?:?\s*/i, 'range'],
  [/^\s*(?:find\s+)?(?:the\s+)?inverse\s+(?:function\s+)?(?:of\s+)?:?\s*/i, 'inverse'],
  [/^\s*(?:prove|verify|show)(?:\s+that)?(?:\s+the\s+identity)?\s*:?\s*/i, 'prove'],
  [/^\s*simplify\s*:?\s*/i, 'simplify*'],
  [/^\s*solve(?:\s+for\s+[a-zθ])?\s*:?\s*/i, 'solve'],
  [/^\s*factor(?:\s+completely)?\s*:?\s*/i, 'factor'],
  [/^\s*expand\s*:?\s*/i, 'expand*'],
  [/^\s*(?:condense|combine)\s*:?\s*/i, 'condense-log'],
  [/^\s*(?:find\s+)?(?:the\s+)?(?:coterminal|reference)(?:\s+and\s+reference)?(?:\s+angles?)?(?:\s+(?:of|for))?\s*:?\s*/i, 'angle'],
  [/^\s*(?:graph|sketch)\s*:?\s*/i, 'features'],
  [/^\s*(?:find\s+)?(?:the\s+)?(?:zeros|roots|x-intercepts)(?:\s+of)?\s*:?\s*/i, 'zeros'],
  [/^\s*(?:evaluate|compute|find)\s*:?\s*/i, null]
];
function intent(src) {
  var s = String(src || ''), goal = null;
  for (var i = 0; i < INTENTS.length; i++) { if (INTENTS[i][0].test(s)) { s = s.replace(INTENTS[i][0], ''); goal = INTENTS[i][1]; break; } }
  s = s.replace(/[.?]\s*$/, '').replace(/\s*,?\s*(?:for|where)\s+[0-9]+\s*[≤<]=?\s*[xθ]\s*[≤<]=?\s*2\s*π\s*$/i, '');
  return { src: s.trim(), goal: goal };
}
EH.intent = intent;
/* how to show an input back to the student: f(x) = ..., not f·x = ... */
EH.displayText = function (info) {
  if (info && info.kind === 'function' && info.fname && info.ast && info.ast.t === 'rel') return (info.fname === 'y' ? 'y' : info.fname + '(' + info.v + ')') + ' = ' + txt(info.ast.r);
  return info && info.ast ? txt(info.ast) : '';
};
function resolveGoal(g, info) {
  if (!g) return null;
  if (g === 'simplify*') {
    if (info.goals.indexOf('simplify-trig') >= 0) return 'simplify-trig';
    if (info.goals.indexOf('simplify') >= 0) return 'simplify';
    if (info.goals.indexOf('condense-log') >= 0) return 'condense-log';
    return info.goals.indexOf('evaluate') >= 0 ? 'evaluate' : info.goals[0];
  }
  if (g === 'expand*') return info.goals.indexOf('expand-log') >= 0 ? 'expand-log' : 'expand';
  return g;
}

/* ---------------- classify: more goals ---------------- */
EH.classify = function (src, opts) {
  var it = intent(src), info;
  try { info = base.classify(it.src, opts); }
  catch (e) {
    /* several letters inside logs, e.g. log(x²y/z): still expandable */
    throw e;
  }
  info.src = it.src;
  var ast = info.ast, G = info.goals.slice();
  function add(g, front) { var i = G.indexOf(g); if (i >= 0) G.splice(i, 1); if (front) G.unshift(g); else G.push(g); }
  if (info.kind === 'number') {
    var A = EH.angleOf && EH.angleOf(ast);
    if (A) {
      var deg = EH.find(ast, function (n) { return n.t === 'deg'; }).length > 0, already = false;
      try { already = EH.evaluate(ast).text.replace(/\s/g, '') === it.src.replace(/[\s()]/g, '').replace(/pi/g, 'π'); } catch (e) {}
      add('angle', deg || already);
    }
  } else if (info.kind === 'equation' && info.ast.op === '=' && info.isTrig) {
    var v = info.v;
    try { if (EH.isIdentity(ast.l, ast.r, v)) { add('prove', true); } } catch (e) {}
  } else if (info.kind === 'function') {
    var trigNodes = EH.find(info.body, function (n) { return n.t === 'fn' && TRIGRE.test(n.name); });
    if (trigNodes.length && (info.family.name === 'other' || trigNodes.length > 1)) add('simplify-trig', true);
    if (hasFn(info.body, /^(log|ln)$/)) { add('expand-log', info.family.name === 'other'); add('condense-log'); }
    if (info.family.poly && info.family.poly.deg() >= 2 && EH.find(info.body, function (n) { return (n.t === 'pow' && n.a.t !== 'var') || (n.t === 'mul' && (n.a.t === 'add' || n.a.t === 'sub' || n.b.t === 'add' || n.b.t === 'sub')); }).length) add('expand');
  } else if (info.kind === 'multi' && hasFn(ast, /^(log|ln)$/)) {
    G = ['expand-log', 'condense-log'];
  }
  info.goals = G;
  info.intentGoal = resolveGoal(it.goal, info);
  if (info.intentGoal && G.indexOf(info.intentGoal) > 0) { G.splice(G.indexOf(info.intentGoal), 1); G.unshift(info.intentGoal); }
  return info;
};

/* ---------------- logs: expand and condense ---------------- */
function isLog(n) { return n && n.t === 'fn' && (n.name === 'log' || n.name === 'ln'); }
function logOf(n, arg) { return F(n.name, arg, n.base); }
function baseVal(n) { return n.name === 'ln' ? K('e') : (n.base || num(10)); }
function sameNode(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function rewriteLogOnce(node, used) {
  var changed = false;
  function rec(n) {
    if (!n || typeof n !== 'object') return n;
    if (isLog(n)) {
      var a = n.a;
      if (a.t === 'mul') { changed = true; used.product = 1; return B('add', logOf(n, a.a), logOf(n, a.b)); }
      if (a.t === 'div') { changed = true; used.quotient = 1; return B('sub', logOf(n, a.a), logOf(n, a.b)); }
      if (a.t === 'pow') { changed = true; used.power = 1; return B('mul', a.b.t === 'num' || a.b.t === 'var' || a.b.t === 'const' ? a.b : a.b, logOf(n, a.a)); }
      if (a.t === 'root') { changed = true; used.root = 1; return B('mul', num(1, a.n), logOf(n, a.a)); }
      if (sameNode(a, baseVal(n))) { changed = true; used.self = 1; return num(1); }
      if (a.t === 'num' && a.q.isOne()) { changed = true; used.one = 1; return num(0); }
      if (!EH.vars(a).length) {
        try { var v = EH.evaluate(n); if (v.ex && v.ex.isRational()) { changed = true; used.eval = 1; return N(v.ex.rat()); } } catch (e) {}
      }
    }
    var o = {}; for (var k in n) o[k] = (k === 'a' || k === 'b' || k === 'l' || k === 'r') && n[k] && typeof n[k] === 'object' ? rec(n[k]) : n[k];
    return o;
  }
  var out = rec(node);
  return changed ? out : null;
}
function distribute(n) {        /* k·(A ± B) -> kA ± kB, so 2(log x + log y) becomes 2log x + 2log y */
  if (!n || typeof n !== 'object') return n;
  var o = {}; for (var k in n) o[k] = (k === 'a' || k === 'b') && n[k] && typeof n[k] === 'object' ? distribute(n[k]) : n[k];
  if (o.t === 'mul' && (o.b.t === 'add' || o.b.t === 'sub') && !EH.vars(o.a).length) return B(o.b.t, distribute(B('mul', o.a, o.b.a)), distribute(B('mul', o.a, o.b.b)));
  if (o.t === 'mul' && o.b.t === 'mul' && !EH.vars(o.a).length && !EH.vars(o.b.a).length) { try { var v = EH.evaluate(B('mul', o.a, o.b.a)); if (v.ex && v.ex.isRational()) return B('mul', N(v.ex.rat()), o.b.b); } catch (e) {} }
  if (o.t === 'mul' && o.a.t === 'num' && o.a.q.isOne()) return o.b;
  return o;
}
var LOGRULE = {
  product: 'Product rule: log_b(MN) = log_b M + log_b N', quotient: 'Quotient rule: log_b(M/N) = log_b M - log_b N',
  power: 'Power rule: log_b(M^p) = p·log_b M', root: 'Roots are powers: √M = M^(1/2), ∛M = M^(1/3), then the power rule',
  self: 'log_b b = 1  (and ln e = 1)', one: 'log_b 1 = 0', eval: 'Evaluate exact logs: log_b(b^k) = k'
};
function expandLog(ast, steps) {
  var cur = ast, guard = 0;
  step(steps, 'Assume every variable is positive, so every log is defined. Then peel the inside apart from the OUTSIDE in: products split into sums, quotients into differences, powers come down in front.', txt(ast), 'log-rules');
  while (guard++ < 12) {
    var used = {}, nx = rewriteLogOnce(cur, used);
    if (!nx) break;
    nx = distribute(nx);
    step(steps, Object.keys(used).map(function (k) { return LOGRULE[k]; }).join('.   '), '= ' + txt(nx), 'log-rules');
    cur = nx;
  }
  return cur;
}
function flattenTerms(n, sign, out) {
  if (n.t === 'add') { flattenTerms(n.a, sign, out); flattenTerms(n.b, sign, out); }
  else if (n.t === 'sub') { flattenTerms(n.a, sign, out); flattenTerms(n.b, -sign, out); }
  else if (n.t === 'neg') flattenTerms(n.a, -sign, out);
  else out.push({ s: sign, n: n });
  return out;
}
function condenseLog(ast, steps) {
  var terms = flattenTerms(ast, 1, []), logs = [], consts = [], baseNode = null, fname = null;
  terms.forEach(function (t) {
    var n = t.n, coef = num(1);
    if (n.t === 'mul' && isLog(n.b) && !EH.vars(n.a).length) { coef = n.a; n = n.b; }
    else if (n.t === 'mul' && isLog(n.a) && !EH.vars(n.b).length) { coef = n.b; n = n.a; }
    else if (n.t === 'div' && isLog(n.a) && !EH.vars(n.b).length) { coef = B('div', num(1), n.b); n = n.a; }
    if (isLog(n)) {
      var key = n.name + JSON.stringify(n.base);
      if (fname && fname !== key) throw new MathError('The logs have different bases. Use change of base first: log_b a = ln a / ln b.');
      fname = key; baseNode = n;
      logs.push({ s: t.s, c: coef, arg: n.a });
    } else if (!EH.vars(n).length) consts.push({ s: t.s, n: n });
    else throw new MathError('Every term must be a log (or a number) to condense.');
  });
  if (!logs.length) throw new MathError('There is no log to condense.');
  step(steps, 'Every log must have the same base. Plan: (1) coefficients become exponents (power rule), (2) plus signs multiply the insides (product rule), (3) minus signs divide (quotient rule).', txt(ast), 'log-rules');
  var powered = logs.map(function (L) {
    var cv = EH.evaluate(L.c), arg = L.arg;
    if (cv.ex && cv.ex.isRational() && !cv.ex.rat().isOne()) {
      var r = cv.ex.rat();
      if (r.eq(q(1, 2))) arg = EH.R(2, arg); else if (r.eq(q(1, 3))) arg = EH.R(3, arg);
      else arg = B('pow', arg, N(r));
      L.changed = true;
    }
    return { s: L.s, arg: arg, changed: L.changed };
  });
  if (powered.some(function (p) { return p.changed; })) {
    var line = powered.map(function (p, i) { return (i === 0 ? (p.s < 0 ? '-' : '') : (p.s < 0 ? ' - ' : ' + ')) + txt(logOf(baseNode, p.arg)); }).join('');
    step(steps, LOGRULE.power + '  (read right to left: the number in front becomes the exponent; ½ becomes a square root).', '= ' + line + consts.map(function (c) { return (c.s < 0 ? ' - ' : ' + ') + txt(c.n); }).join(''), 'log-rules');
  }
  /* constants: c = log_b(b^c) */
  consts.forEach(function (c) {
    var bv = baseNode.name === 'ln' ? null : EH.evaluate(baseVal(baseNode));
    var cv = EH.evaluate(c.n);
    if (bv && bv.ex && bv.ex.isRational() && cv.ex && cv.ex.isRational() && cv.ex.rat().isInt()) {
      var power = EH.evaluate(B('pow', N(bv.ex.rat()), N(cv.ex.rat()))), pn = N(power.ex.rat());
      step(steps, 'Write the number as a log with the same base: ' + txt(c.n) + ' = ' + txt(logOf(baseNode, pn)) + ' because ' + bv.text + '^' + cv.text + ' = ' + power.text + '.', null, 'log-form');
      powered.unshift({ s: c.s, arg: pn });
    } else if (baseNode.name === 'ln' && cv.ex && cv.ex.isRational() && cv.ex.rat().isInt()) {
      step(steps, 'Write the number as a natural log: ' + txt(c.n) + ' = ln(e^' + cv.text + ').', null, 'log-form');
      powered.push({ s: c.s, arg: B('pow', K('e'), N(cv.ex.rat())) });
    } else throw new MathError('The constant ' + txt(c.n) + ' cannot be folded into the log exactly.');
  });
  var top = null, bot = null;
  powered.forEach(function (p) { if (p.s > 0) top = top ? B('mul', top, p.arg) : p.arg; else bot = bot ? B('mul', bot, p.arg) : p.arg; });
  if (!top) top = num(1);
  var inside = bot ? B('div', top, bot) : top;
  var res = logOf(baseNode, inside);
  step(steps, (bot ? LOGRULE.product + ' and ' + LOGRULE.quotient : LOGRULE.product) + '. Added logs → multiply the insides; subtracted logs → divide.', '= ' + txt(res), 'log-rules');
  return res;
}
function raw(v) { return { t: 'raw', s: v.text, val: v }; }

/* ---------------- analyze: new goals, plus graph/explanation ---------------- */
var MINE = { angle: 1, prove: 1, 'simplify-trig': 1, 'expand-log': 1, 'condense-log': 1, expand: 1 };
EH.analyze = function (src, goal, opts) {
  opts = opts || {};
  var info = EH.classify(src, opts), s2 = info.src;
  if (!goal && info.intentGoal) goal = info.intentGoal;
  goal = goal && (info.goals.indexOf(goal) >= 0 || /^solve:/.test(goal)) ? goal : info.goals[0];
  var res;
  if (MINE[goal]) {
    res = { info: info, steps: [], answer: [], notes: [], topics: [], goal: goal };
    try { mine(res, info, goal, opts); }
    catch (e) {
      if (e instanceof EH.Overflow) res.error = 'The numbers got too large to keep exact.';
      else if (e instanceof MathError) res.error = e.message === 'unsupported' ? 'This form is not automated yet.' : e.message;
      else res.error = 'Something went wrong with this input (' + (e && e.message) + ').';
    }
  } else {
    res = base.analyze(s2, goal, opts);
    res.info = info;
  }
  res.goal = goal;
  res.src = s2;
  return res;
};
function mine(res, info, goal, opts) {
  var A = res.answer, steps = res.steps, X = info.v;
  if (goal === 'angle') {
    var an = EH.angleAnalysis(info.ast, opts);
    res.title = 'Angle'; res.steps = an.steps; res.answer = an.answer; res.svg = an.svg; res.topics.push('angle');
    return;
  }
  if (goal === 'prove') {
    var pr = EH.proveIdentity(info.ast.l, info.ast.r, X);
    if (pr.notIdentity) throw new MathError('This is not an identity: the two sides are different for some values of ' + X + '. Choose "Solve" to find where they are equal.');
    res.title = 'Trig identity';
    res.steps = pr.steps;
    A.push(EH.ttxt(info.ast.l, X) + ' = ' + EH.ttxt(info.ast.r, X) + '   ✓ identity');
    if (pr.used && pr.used.length) A.push('Identities used: ' + pr.used.map(function (u) { return u.text.split(':  ')[0]; }).filter(function (t, i, a) { return a.indexOf(t) === i; }).join(';   '));
    res.notes.push('Rules for a proof: work on ONE side only (usually the more complicated one) and never move terms across the equals sign. Every line must be equal to the line before it. It is only true where both sides are defined.');
    res.topics.push('trig-identity');
    return;
  }
  if (goal === 'simplify-trig') {
    var sm = EH.simplifyTrig(info.body, X);
    res.title = 'Trig expression';
    res.steps = sm.steps;
    if (sm.already) A.push(EH.ttxt(info.body, X) + ' is already as simple as it gets.');
    else A.push(EH.ttxt(info.body, X) + ' = ' + (sm.target ? EH.ttxt(sm.target, X) : sm.text));
    res.notes.push('The simplified form is equal wherever the original is defined. Values that made a denominator 0 in the original are still excluded.');
    res.topics.push('trig-identity');
    return;
  }
  if (goal === 'expand-log') {
    var body = info.body || info.ast;
    var e = expandLog(body, steps);
    res.title = 'Logarithm expression'; A.push(txt(body) + ' = ' + txt(e)); res.topics.push('log-rules');
    return;
  }
  if (goal === 'condense-log') {
    var body2 = info.body || info.ast;
    var c = condenseLog(body2, steps);
    res.title = 'Logarithm expression'; A.push(txt(body2) + ' = ' + txt(c)); res.topics.push('log-rules');
    return;
  }
  if (goal === 'expand') {
    var p = info.family.poly;
    step(steps, 'Distribute every term of one factor to every term of the other (FOIL for two binomials). For a power, write it as repeated multiplication first: (a + b)² = (a + b)(a + b) = a² + 2ab + b² (never a² + b²).', txt(info.body), 'distribute');
    step(steps, 'Combine like terms and write the powers in descending order.', '= ' + p.text(X), 'distribute');
    res.title = 'Polynomial'; A.push(txt(info.body) + ' = ' + p.text(X)); res.topics.push('factor');
  }
}

/* topics for the new goals (links into the book) */
Object.assign(EH.TOPICS, {
  'angle': { label: 'Angles', pages: ['section-5'], prereq: ['section-6'], cards: ['trig-angles', 'trig-unitcircle'], tips: ['Coterminal: add or subtract 360° (2π) as many times as needed.', 'Reference angle: the acute angle to the x-AXIS. QII 180° - θ, QIII θ - 180°, QIV 360° - θ.', 'All Students Take Calculus: QI all, QII sin, QIII tan, QIV cos are positive.'] },
  'trig-identity': { label: 'Trig identities', pages: ['section-9', 'section-10'], prereq: ['section-6', 'fractions', 'factoring'], cards: ['trig-identities', 'trig-formulas'], tips: ['Start with the more complicated side.', 'When stuck, rewrite everything in sine and cosine.', 'Combine fractions; look for sin² + cos² and for a difference of squares.', 'Conjugates: multiply top and bottom by 1 + sin x to make 1 - sin²x = cos²x.'] },
  'log-rules': { label: 'Log rules', pages: ['exp-log-log-rules'], prereq: ['exponents-exponent-laws'], cards: ['alg-explog', 'log'], tips: ['log(M + N) does NOT split. Only products, quotients and powers do.', 'The coefficient goes UP into the exponent when condensing.', 'Subtracted logs go to the denominator.'] }
});
['r-even-odd', 'r-cofunction', 'r-quotient', 'r-conjugate'].forEach(function (k) { EH.TOPICS[k] = EH.TOPICS[k] || { pages: ['section-9'], cards: ['trig-identities'] }; });

/* ---------------- number lines and graphs ---------------- */
function parseSet(text) {       /* "[3, 5) ∪ (5, ∞)" -> intervals with floats */
  if (!text) return null;
  var t = String(text).replace(/^[^:]*:\s*/, '');
  var val = function (s) { s = s.trim().replace(/−/g, '-'); if (/^-?∞$/.test(s)) return s.charAt(0) === '-' ? -Infinity : Infinity; try { return EH.fval(EH.parse(s)); } catch (e) { return NaN; } };
  if (/all real numbers except/i.test(t)) {
    var m = t.match(/except\s+[a-zθ]?\s*=?\s*(.*)$/i), pts = m ? m[1].split(/,\s*|\s+and\s+/).map(function (s) { return { f: val(s), text: s.trim() }; }).filter(function (p) { return isFinite(p.f); }) : [];
    pts.sort(function (a, b) { return a.f - b.f; });
    var out = [], lo = { f: -Infinity, text: '-∞' };
    pts.forEach(function (p) { out.push({ lo: lo, hi: p, lc: false, hc: false }); lo = p; });
    out.push({ lo: lo, hi: { f: Infinity, text: '∞' }, lc: false, hc: false });
    return out;
  }
  if (/^\(-∞,\s*∞\)|^all real/i.test(t)) return [{ lo: { f: -Infinity, text: '-∞' }, hi: { f: Infinity, text: '∞' } }];
  var re = /([\[(])\s*([^,\[\]()]+?)\s*,\s*([^,\[\]()]+?)\s*([\])])/g, mm, list = [];
  while ((mm = re.exec(t))) list.push({ lo: { f: val(mm[2]), text: mm[2].trim() }, hi: { f: val(mm[3]), text: mm[3].trim() }, lc: mm[1] === '[', hc: mm[4] === ']' });
  var sing = /\{([^}]+)\}/g; while ((mm = sing.exec(t))) mm[1].split(',').forEach(function (s) { var f = val(s); if (isFinite(f)) list.push({ lo: { f: f, text: s.trim() }, hi: { f: f, text: s.trim() }, lc: true, hc: true }); });
  return list.length ? list : null;
}
EH.parseSet = parseSet;
function numberLine(set, label) {
  if (!set || !set.length) return '';
  var pts = [];
  set.forEach(function (r) { if (isFinite(r.lo.f)) pts.push(r.lo); if (isFinite(r.hi.f)) pts.push(r.hi); });
  var fs = pts.map(function (p) { return p.f; }), lo = fs.length ? Math.min.apply(null, fs) : -1, hi = fs.length ? Math.max.apply(null, fs) : 1;
  var span = Math.max(hi - lo, 2), a = lo - span * 0.35, b = hi + span * 0.35;
  var W = 560, H = 92, y = 52, X = function (x) { return 28 + (Math.max(a, Math.min(b, x)) - a) / (b - a) * (W - 56); };
  var o = ['<svg class="gp nl" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Number line: ' + (label || '') + '" xmlns="http://www.w3.org/2000/svg"><rect class="gp-paper" width="' + W + '" height="' + H + '" rx="4"/>'];
  o.push('<path class="gp-axis" d="M12 ' + y + 'Q280 ' + (y - 1.5) + ' ' + (W - 12) + ' ' + y + 'M20 ' + (y - 6) + 'L12 ' + y + 'L20 ' + (y + 6) + 'M' + (W - 20) + ' ' + (y - 6) + 'L' + (W - 12) + ' ' + y + 'L' + (W - 20) + ' ' + (y + 6) + '"/>');
  set.forEach(function (r) {
    var x1 = isFinite(r.lo.f) ? X(r.lo.f) : 14, x2 = isFinite(r.hi.f) ? X(r.hi.f) : W - 14;
    if (r.lo.f !== r.hi.f) o.push('<path class="nl-shade" d="M' + x1.toFixed(1) + ' ' + (y - 1) + 'Q' + ((x1 + x2) / 2).toFixed(1) + ' ' + (y - 3) + ' ' + x2.toFixed(1) + ' ' + (y + 0.5) + '"/>');
  });
  var done = {};
  set.forEach(function (r) {
    [[r.lo, r.lc], [r.hi, r.hc]].forEach(function (pc) {
      var p = pc[0]; if (!isFinite(p.f)) return;
      var k = p.f.toFixed(6), closed = !!pc[1];
      if (done[k] !== undefined) { closed = closed || done[k]; }
      done[k] = closed;
    });
  });
  pts.forEach(function (p) {
    var k = p.f.toFixed(6); if (done[k] === 'drawn') return;
    var closed = done[k]; done[k] = 'drawn';
    o.push('<circle class="' + (closed ? 'gp-pt' : 'gp-open') + '" cx="' + X(p.f).toFixed(1) + '" cy="' + y + '" r="6"/>');
    o.push('<text class="gp-lab nl-lab" x="' + X(p.f).toFixed(1) + '" y="' + (y + 28) + '" text-anchor="middle">' + EH.esc(p.text.replace(/^-/, '−')) + '</text>');
  });
  o.push('<text class="gp-lab" x="14" y="20">' + EH.esc(label || '') + '</text></svg>');
  return o.join('');
}
EH.numberLine = numberLine;

function snapLabel(x) { var s = EH.snapPi(x); return s.ex ? s.text : String(+x.toFixed(2)); }
function scanFeatures(f, a, b) {
  var zeros = [], vas = [], n = 3000, px = a, pf = f(a);
  for (var i = 1; i <= n; i++) {
    var x = a + (b - a) * i / n, fx = f(x);
    if (isFinite(pf) && isFinite(fx)) {
      if (pf === 0) zeros.push(px);
      else if (pf * fx < 0) {
        var lo = px, hi = x; for (var k = 0; k < 70; k++) { var m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; }
        var r = (lo + hi) / 2, fr = f(r);
        if (Math.abs(fr) < 1e-6) zeros.push(r); else if (Math.abs(fr) > 1e3) vas.push(r);
      }
    } else if (isFinite(pf) !== isFinite(fx) && Math.abs(isFinite(pf) ? pf : fx) > 50) vas.push(x);
    px = x; pf = fx;
  }
  function uniq(l) { return l.filter(function (v, i) { return !l.slice(0, i).some(function (w) { return Math.abs(w - v) < (b - a) / 500; }); }); }
  return { zeros: uniq(zeros), vas: uniq(vas) };
}
EH.graphFor = function (res) {
  var info = res.info; if (!info) return '';
  if (res.svg) return res.svg;
  try {
    if (info.kind === 'function' && info.body) return functionGraph(info, res);
    if ((info.kind === 'equation' || info.kind === 'inequality') && info.ast && info.ast.t === 'rel') return equationGraph(info, res);
  } catch (e) { return ''; }
  return '';
};
EH.setLine = function (res) {
  var g = res.goal, line = (res.answer || []).filter(function (a) { return /^(Domain|Range)/.test(a); })[0];
  if (res.info && res.info.kind === 'inequality' && res.answer[0]) return numberLine(parseSet(res.answer[0]), 'Solution set');
  if (line && (g === 'domain' || g === 'range')) return numberLine(parseSet(line), line.split(':')[0]);
  return '';
};
function functionGraph(info, res) {
  var v = info.v, body = info.body, fam = info.family || {};
  var f = function (x) { var e = {}; e[v] = x; return EH.fval(body, e); };
  var spec = { fns: [{ f: f }], points: [], vas: [], has: [], slants: [], hlines: [], xname: v, aria: 'Graph of ' + txt(body) };
  var hints = { xs: [], ys: [] };
  if (/^(sinusoid|tangent|secant)$/.test(fam.name) && fam.lin) {
    var Bk = fam.lin.k.float(), P = (fam.name === 'tangent' ? Math.PI : 2 * Math.PI) / Math.abs(Bk), st = -fam.lin.c.float() / Bk;
    hints.trig = { period: P, start: st };
    spec.pi = true;
    if (fam.name === 'sinusoid') { spec.hlines.push(fam.k.float()); var amp = Math.abs(fam.a.float()); hints.ys = [fam.k.float() + amp, fam.k.float() - amp]; }
    var win0 = Graph.autoWindow(f, hints);
    if (fam.name !== 'sinusoid') { var D = fam.k.float(), Aa = Math.abs(fam.a.float()); win0.ymin = Math.min(-1, D - Aa * 4); win0.ymax = Math.max(1, D + Aa * 4); }
    spec.win = win0;
    var sf = scanFeatures(f, win0.xmin, win0.xmax);
    spec.vas = sf.vas;
    sf.zeros.slice(0, 8).forEach(function (z) { spec.points.push({ x: z, y: 0 }); });
    return Graph.svg(spec);
  }
  if (fam.name === 'rational' && fam.rf) {
    var rf = fam.rf, red = rf.reduce(), g = EH.pgcd(rf.n, rf.d);
    spec.vas = red.d.deg() > 0 ? EH.numericRoots(red.d) : [];
    var holes = g.deg() > 0 ? EH.numericRoots(g) : [];
    var fr = function (x) { return red.n.evalF(x) / red.d.evalF(x); };
    holes.forEach(function (h) { var y = fr(h); spec.points.push({ x: h, y: y, open: true, label: 'hole (' + snapLabel(h) + ', ' + snapLabel(y) + ')' }); hints.xs.push(h); });
    var dn = red.n.deg(), dd = red.d.deg();
    if (dn < dd) spec.has.push(0); else if (dn === dd) spec.has.push(red.n.lead().val() / red.d.lead().val());
    else if (dn === dd + 1) { var dm = red.n.divmod(red.d).q; spec.slants.push({ m: dm.co(1).val(), b: dm.co(0).val() }); }
    hints.xs = hints.xs.concat(spec.vas); hints.ys = spec.has.slice(); hints.vas = spec.vas;
  }
  /* zeros, y-intercept, vertex */
  var pre = scanFeatures(f, -60, 60);
  pre.zeros.forEach(function (z) { if (Math.abs(z) < 40) hints.xs.push(z); });
  if (!spec.vas.length) pre.vas.forEach(function (z) { if (Math.abs(z) < 40) { hints.xs.push(z); spec.vas.push(z); } });
  hints.vas = spec.vas;
  if (fam.name === 'quadratic') { var p = fam.poly, hx = -p.co(1).val() / (2 * p.co(2).val()); hints.xs.push(hx); spec.points.push({ x: hx, y: f(hx), label: 'vertex (' + snapLabel(hx) + ', ' + snapLabel(f(hx)) + ')' }); hints.ys.push(f(hx)); }
  if (/^(sqrt|log|exponential|abs)$/.test(fam.name) && fam.lin) { var x0 = -fam.lin.c.float() / fam.lin.k.float(); hints.xs.push(x0, x0 + (fam.name === 'exponential' ? 3 : 6)); if (fam.name === 'log') spec.vas.push(x0); if (fam.name === 'exponential') spec.has.push(fam.k.float()); }
  var win = Graph.autoWindow(f, hints);
  spec.win = win;
  pre.zeros.forEach(function (z) { spec.points.push({ x: z, y: 0, label: '(' + snapLabel(z) + ', 0)' }); });
  var y0 = f(0); if (isFinite(y0) && !pre.zeros.some(function (z) { return Math.abs(z) < 1e-9; })) spec.points.push({ x: 0, y: y0, label: '(0, ' + snapLabel(y0) + ')' });
  if (spec.points.length > 7) spec.points.forEach(function (pt, i) { if (i >= 6) pt.label = null; });
  return Graph.svg(spec);
}
function equationGraph(info, res) {
  var v = info.v, L = info.ast.l, R = info.ast.r;
  if (!v || EH.vars(info.ast).length !== 1) return '';
  var fl = function (x) { var e = {}; e[v] = x; return EH.fval(L, e); }, fr = function (x) { var e = {}; e[v] = x; return EH.fval(R, e); };
  var spec = { fns: [{ f: fl, cls: 'gp-c0' }, { f: fr, cls: 'gp-c1' }], points: [], xname: v, legend: [{ label: 'y = left side', cls: 'gp-c0' }, { label: 'y = right side', cls: 'gp-c1' }] };
  var xs = (res.sols || []).map(function (s) { return s.f; }).filter(isFinite);
  var hints = { xs: xs.slice() };
  if (info.isTrig) { spec.pi = true; hints.xmin = -0.3; hints.xmax = 2 * Math.PI + 0.3; }
  var diff = function (x) { return fl(x) - fr(x); };
  spec.win = Graph.autoWindow(diff, hints);
  /* window for both curves */
  var w2 = Graph.autoWindow(fl, { xmin: spec.win.xmin, xmax: spec.win.xmax, ys: xs.map(fl).filter(isFinite) }), w3 = Graph.autoWindow(fr, { xmin: spec.win.xmin, xmax: spec.win.xmax });
  spec.win.ymin = Math.min(w2.ymin, w3.ymin); spec.win.ymax = Math.max(w2.ymax, w3.ymax);
  (res.sols || []).forEach(function (s) { var y = fl(s.f); if (isFinite(y)) spec.points.push({ x: s.f, y: y, label: v + ' = ' + s.text }); });
  return Graph.svg(spec);
}

/* ---------------- explanations ---------------- */
function describeSet(text, letter) {
  letter = letter || 'x';
  var set = parseSet(text); if (!set) return '';
  if (set.length === 1 && !isFinite(set[0].lo.f) && !isFinite(set[0].hi.f)) return 'every real number works for ' + letter + '.';
  if (/except/i.test(text)) return letter + ' can be any real number except ' + text.replace(/^.*except\s+/i, '').replace(/^[a-z]\s*=\s*/i, '') + '.';
  return set.map(function (r) {
    if (r.lo.f === r.hi.f) return letter + ' = ' + r.lo.text;
    if (!isFinite(r.lo.f)) return letter + ' ' + (r.hc ? '≤ ' : '< ') + r.hi.text + ' (everything ' + (r.hc ? 'up to and including ' : 'less than ') + r.hi.text + ')';
    if (!isFinite(r.hi.f)) return letter + ' ' + (r.lc ? '≥ ' : '> ') + r.lo.text + ' (' + r.lo.text + (r.lc ? ' and everything bigger' : ' is NOT included, everything bigger is') + ')';
    return r.lo.text + (r.lc ? ' ≤ ' : ' < ') + letter + (r.hc ? ' ≤ ' : ' < ') + r.hi.text + ' (' + (r.lc ? 'including ' : 'not including ') + r.lo.text + ', ' + (r.hc ? 'including ' : 'not including ') + r.hi.text + ')';
  }).join('  OR  ') + '.';
}
EH.describeSet = describeSet;
var EXPLAIN = {
  evaluate: { what: 'Find the exact value of the expression.', idea: 'Work inside out with the order of operations, and keep fractions, radicals and π exact. A calculator decimal is only a check.', check: 'Type the original into the calculator and compare its decimal with the decimal of your exact answer.' },
  solve: { what: 'Find every value of the variable that makes the two sides equal.', idea: 'Undo operations in reverse order, doing the same thing to both sides. Squaring, multiplying by an expression, or using logs can create answers that do not really work, so you must check.', check: 'Substitute each answer into the ORIGINAL equation. Both sides must give the same number. Throw out anything that makes a denominator 0, a log input ≤ 0, or an even root negative.' },
  features: { what: 'List what you need to sketch the graph: shape, key points, intercepts, asymptotes and shifts.', idea: 'Start from the parent graph you already know, then apply the changes: inside the function moves left/right (opposite of what it looks like), outside moves up/down and stretches.', check: 'Plug in one x-value from your sketch and make sure the y-value matches the function.' },
  zeros: { what: 'Find where the graph crosses or touches the x-axis: the x-values where f(x) = 0.', idea: 'Set the function equal to 0 and solve. Each real solution is an x-intercept (x, 0).', check: 'f(zero) must equal 0 exactly.' },
  factor: { what: 'Write the expression as a product of simpler pieces that cannot be broken down further.', idea: 'GCF first, then count terms: 2 terms → special products; 3 terms → trinomial or AC method; 4 terms → grouping; still stuck → rational roots + synthetic division.', check: 'Multiply your factors back out. You must get the original exactly.' },
  domain: { what: 'Find every x-value you are ALLOWED to put into the function.', idea: 'Start with all real numbers and remove what breaks: a denominator of 0, an even root of a negative (a root in a denominator must be > 0), a log of 0 or a negative, tan/sec where cos = 0, cot/csc where sin = 0.', check: 'Pick a number inside your answer and one outside. The inside one must give a real output; the outside one must break.' },
  range: { what: 'Find every y-value (output) the function actually reaches.', idea: 'Know the parent range, then apply the vertical changes: stretch by |a|, flip if a < 0, shift by k. Asymptote heights are usually left out; a vertex or max/min height is included.', check: 'Look at the graph: slide a horizontal line up and down. The heights where it touches the graph are the range.' },
  inverse: { what: 'Find the function that undoes f: if f sends a to b, the inverse sends b back to a.', idea: 'Swap x and y, then solve for y. Domain and range trade places. Only one-to-one functions (horizontal line test) have inverses, so sometimes the domain must be restricted.', check: 'f(f⁻¹(x)) = x and f⁻¹(f(x)) = x. Try a number: put it into f, then into f⁻¹, and you should get it back.' },
  simplify: { what: 'Rewrite the rational expression with no common factors on top and bottom.', idea: 'Factor everything first; cancel FACTORS, never terms. Values that made the original denominator 0 stay excluded even if their factor cancels.', check: 'Pick an allowed x and evaluate both the original and the simplified form; they must match.' },
  'evaluate-at': { what: 'Find the output when the input is the given number.', idea: 'Replace every x with the number IN PARENTHESES, then use the order of operations.', check: 'Use the calculator with the same parentheses.' },
  angle: { what: 'Describe where the angle ends up: its terminal side, quadrant, reference angle and coterminal angles.', idea: 'Angles are measured from the positive x-axis, counterclockwise for positive and clockwise for negative. Adding a full turn (360° or 2π) lands in the same place, so coterminal angles share every trig value.', check: 'Your coterminal angle should differ from the original by a whole number of 360°. Your reference angle must be between 0° and 90°.' },
  prove: { what: 'Show the two sides are the same expression for every allowed value of the variable.', idea: 'Transform ONE side, one legal step at a time, until it looks exactly like the other side. Standard moves: rewrite in sine and cosine, combine fractions, use sin² + cos² = 1, factor, cancel, multiply by a conjugate.', check: 'Plug a random angle (like 0.7) into both ORIGINAL sides on the calculator: they must agree. This checks the identity but is not a proof.' },
  'simplify-trig': { what: 'Write the trig expression in its shortest equal form.', idea: 'Rewrite in sine and cosine, combine into one fraction, use the Pythagorean identities, cancel common factors, then translate back (sin/cos = tan, 1/cos = sec, ...).', check: 'Evaluate the original and your answer at the same angle on the calculator.' },
  'expand-log': { what: 'Break one log into a sum/difference of simpler logs.', idea: 'Inside to outside: products split into +, quotients into −, exponents come down in front. Roots are fractional exponents.', check: 'Condense your answer back; you should get the original.' },
  'condense-log': { what: 'Combine several logs into ONE log.', idea: 'Numbers in front go up as exponents, + becomes multiplication, − becomes division. All logs must have the same base.', check: 'Expand your answer; you should get back to the original.' },
  expand: { what: 'Multiply everything out and combine like terms.', idea: 'Every term of one factor multiplies every term of the other. (a + b)² has a middle term 2ab.', check: 'Plug x = 2 into the original and into your answer; both must give the same number.' }
};
EH.explain = function (res) {
  if (!res || res.error) return null;
  var g = /^solve/.test(res.goal || '') ? 'solve' : res.goal;
  var e = EXPLAIN[g]; if (!e) return null;
  var info = res.info || {}, X = info.v || 'x', meaning = '';
  var line = (res.answer || []).join(' | ');
  if (g === 'domain' || g === 'range') { var dl = (res.answer || [])[0] || ''; meaning = 'In words: ' + describeSet(dl, g === 'range' ? 'y' : X); }
  else if (info.kind === 'inequality' && res.answer && res.answer[0]) meaning = 'In words: ' + describeSet(res.answer[0], X);
  else if (g === 'solve' && res.sols) meaning = res.sols.length ? 'In words: the equation is true only when ' + X + ' = ' + res.sols.map(function (s) { return s.text; }).join(' or ') + '. On a graph, these are the x-values where the two sides cross.' : (/No (real )?solution/i.test(line) ? 'In words: no value of ' + X + ' makes both sides equal; the two graphs never meet.' : '');
  else if (g === 'zeros') meaning = 'In words: these are the points where the graph meets the x-axis.';
  else if (g === 'inverse') meaning = inverseExample(res);
  return { what: e.what, idea: e.idea, check: e.check, meaning: meaning };
};
function inverseExample(res) {
  try {
    var info = res.info, body = info.body, X = info.v, invTxt = (res.answer[0] || '').split('=').slice(1).join('=').trim();
    if (!invTxt) return '';
    var inv = EH.parse(invTxt);
    for (var a = 1; a <= 4; a++) {
      var fa = EH.evaluate(EH.subst(body, X, num(a)));
      if (!fa.ex || !fa.ex.isRational()) continue;
      var back = EH.evaluate(EH.subst(inv, 'x', N(fa.ex.rat())));
      if (back.ex && back.ex.isRational() && back.ex.rat().eq(q(a))) return 'Example: f(' + a + ') = ' + fa.text + ', and the inverse sends ' + fa.text + ' back: f⁻¹(' + fa.text + ') = ' + a + '. ✓';
    }
  } catch (e) {}
  return '';
}

/* ---------------- solve all ---------------- */
EH.solveAll = function (src, opts) {
  opts = opts || {};
  var info = EH.classify(src, opts), sections = [];
  var goals = info.goals.filter(function (g) { return g !== 'evaluate-at'; });
  if (info.kind === 'literal') goals = info.goals.slice(0, 6);
  goals.forEach(function (g) {
    var r = EH.analyze(src, g, opts);
    if (r.error && /not automated|not an identity|is for polynomials/i.test(r.error) && goals.length > 1) return;
    sections.push(r);
  });
  if (info.isTrig && (info.kind === 'equation') && goals.indexOf('solve') >= 0) {
    var gen = EH.analyze(src, 'solve', { interval: 'all' });
    if (!gen.error) { gen.extraLabel = 'All solutions (general form)'; sections.push(gen); }
    var dg = EH.analyze(src, 'solve', { interval: 'deg' });
    if (!dg.error) { dg.extraLabel = 'Solutions in degrees [0°, 360°)'; sections.push(dg); }
  }
  var main = sections.filter(function (r) { return !r.error; })[0] || sections[0];
  return { info: info, sections: sections, graph: main ? EH.graphFor(main) : '' };
};

/* ---------------- more problems like this one ---------------- */
function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function perturb(node, ctx) {
  if (!node || typeof node !== 'object') return node;
  if (node.t === 'deg') {
    var d = node.a.t === 'num' ? node.a.q.val() : 0, mag = Math.abs(d) || 360;
    var choices = []; for (var k = -1440; k <= 1440; k += 15) if (k && k % 360 && (k % 30 === 0 || k % 45 === 0)) { if (Math.abs(k) <= Math.max(360, mag * 1.6) && Math.sign(k || 1) === Math.sign(d || 1)) choices.push(k); }
    return U('deg', num(pick(choices.length ? choices : [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330])));
  }
  if (node.t === 'num') {
    if (ctx.keep) return node;
    if (Math.random() < 0.22) return node;
    var v = node.q;
    if (v.isInt()) {
      var n = v.n, s = n < 0 ? -1 : 1, m = Math.abs(n);
      if (m === 0) return node;
      if (m === 1 && Math.random() < 0.6) return node;
      var hi = Math.max(6, Math.min(12, m * 2)), nv = rnd(1, hi);
      return num(s * nv);
    }
    var den = pick([2, 3, 4, 5, 6].filter(function (d) { return d !== v.d; }).concat([v.d, v.d])), nn = rnd(1, Math.max(5, Math.abs(v.n) + 2)) * (v.n < 0 ? -1 : 1);
    return num(nn, den);
  }
  var o = {};
  for (var key in node) {
    var val = node[key];
    if (val && typeof val === 'object' && (key === 'a' || key === 'b' || key === 'l' || key === 'r' || key === 'base')) {
      var keep = (node.t === 'pow' && key === 'b' && val.t === 'num' && val.q.isInt() && Math.abs(val.q.n) <= 4) || key === 'base' || (node.t === 'root' && key === 'n');
      o[key] = perturb(val, { keep: keep });
    } else o[key] = val;
  }
  return o;
}
function srcOf(info, ast) {
  if (info.kind === 'function' && info.fname && info.fname !== 'y' && ast.t === 'rel') return info.fname + '(' + info.v + ') = ' + txt(ast.r);
  if (info.kind === 'function' && info.fname === 'y' && ast.t === 'rel') return 'y = ' + txt(ast.r);
  return txt(ast);
}
function niceRes(r, orig) {
  if (!r || r.error) return false;
  if (r.notes.some(function (n) { return /numeric approximation|Check failed/.test(n); })) return false;
  if (r.sols && r.sols.some(function (s) { return !s.ex; })) return false;
  var ans = r.answer.join(' ').replace(/\(≈[^)]*\)/g, ''), oa = orig.answer.join(' ').replace(/\(≈[^)]*\)/g, '');
  if (/√/.test(ans) && !/√/.test(oa)) return false;
  if (orig.sols && r.sols && orig.sols.length && r.sols.length < Math.min(2, orig.sols.length)) return false;
  if (/≈/.test(ans) && !/≈/.test(orig.answer.join(' ').replace(/\(≈[^)]*\)/g, ''))) return false;
  if (/No (real )?solution|does not factor|not automated|already as simple/i.test(ans) && !/No (real )?solution|does not factor|already/i.test(orig.answer.join(' '))) return false;
  if (ans.length > Math.max(160, orig.answer.join(' ').length * 2.2)) return false;
  if (r.steps.length > orig.steps.length + 6) return false;
  return true;
}
var IDENTITY_BANK = [
  'sin(x)cot(x) = cos(x)', 'cos(x)tan(x) = sin(x)', 'sec(x)cos(x) = 1', 'tan(x)cot(x) = 1', 'sin(x)csc(x) - cos(x)^2 = sin(x)^2', '(1 - sin(x))(1 + sin(x)) = cos(x)^2',
  'sec(x)^2 - tan(x)^2 = 1', 'csc(x)^2 - cot(x)^2 = 1', 'tan(x) + cot(x) = sec(x)csc(x)', 'sec(x) - cos(x) = sin(x)tan(x)', 'csc(x) - sin(x) = cos(x)cot(x)',
  'cos(x)/(1 - sin(x)) = sec(x) + tan(x)', 'sin(x)/(1 - cos(x)) = csc(x) + cot(x)', '(1 + tan(x)^2)cos(x)^2 = 1', 'sin(x)^4 - cos(x)^4 = sin(x)^2 - cos(x)^2',
  '1/(1 - sin(x)) + 1/(1 + sin(x)) = 2sec(x)^2', '1/(1 - cos(x)) + 1/(1 + cos(x)) = 2csc(x)^2', 'cos(x)/(1 + sin(x)) + (1 + sin(x))/cos(x) = 2sec(x)', '(sin(x) + cos(x))^2 = 1 + sin(2x)',
  'cos(2x) = 1 - 2sin(x)^2', 'cos(2x) = 2cos(x)^2 - 1', 'sin(2x) = 2tan(x)/(1 + tan(x)^2)', 'sin(-x)/cos(-x) = -tan(x)', 'cos(π/2 - x)sec(x) = tan(x)', 'sin(x + π) = -sin(x)',
  'cos(x - π/2) = sin(x)', 'tan(x)sin(x) + cos(x) = sec(x)', 'cot(x)cos(x) + sin(x) = csc(x)', 'sec(x)^2 + csc(x)^2 = sec(x)^2csc(x)^2', '(sec(x) - 1)(sec(x) + 1) = tan(x)^2',
  'cos(x)^2 - sin(x)^2 = 1 - 2sin(x)^2', 'sin(x)^3 + sin(x)cos(x)^2 = sin(x)', 'csc(x)/(cot(x) + tan(x)) = cos(x)', '(1 - cos(x)^2)csc(x) = sin(x)'];
var SIMPLIFY_BANK = ['sec(x)cos(x) - sin(x)^2', 'cot(x)sin(x)', '(1 + tan(x)^2)cos(x)^2', 'sin(x)^3 + sin(x)cos(x)^2', 'csc(x)tan(x)', 'sin(x)sec(x)', '(1 - cos(x))(1 + cos(x))', 'tan(x)cos(x)csc(x)', 'sec(x)^2 - 1', '(sec(x) - 1)(sec(x) + 1)', 'cos(x)^2 + cos(x)^2tan(x)^2', 'sin(x)/csc(x) + cos(x)/sec(x)', 'cot(x)/csc(x)', 'tan(x)/sec(x)', '1 - sin(x)^2cos(x)^2/cos(x)^2'];
function angleProblem(info) {
  var A = EH.angleOf(info.ast), deg = A && A.unit === 'deg';
  if (deg) { var k = pick([-3, -2, -1, 1, 2, 3, 4]) * 360 + pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330, 90, 180, 270]); return k + '°'; }
  var d = pick([2, 3, 4, 6]), kk = rnd(-5 * d, 7 * d); if (kk === 0 || EH.gcd(kk, d) !== 1) kk = (kk || 1) * 1 + (EH.gcd(kk + 1, d) === 1 ? 1 : 0);
  var r = q(kk, d); return EH.piText(r).replace('π', 'π');
}
EH.similar = function (src, goal, count) {
  count = count || 5;
  var orig = EH.analyze(src, goal);
  var info = orig.info, g = orig.goal, out = [], seen = {}, seenAns = {}, tries = 0;
  function norm(s) { try { return txt(EH.parse(EH.intent(s).src)).replace(/\s/g, ''); } catch (e) { return s.replace(/\s/g, ''); } }
  seen[norm(orig.src)] = 1;
  if (orig.error) throw new MathError('Fix this one first: ' + orig.error);
  function accept(s) {
    var k = norm(s); if (seen[k]) return false;
    var r = EH.analyze(s, g);
    if (!niceRes(r, orig)) return false;
    var ak = r.answer.join('|');
    if (seenAns[ak] && tries < 300) return false;
    seen[k] = 1; seenAns[ak] = 1; out.push({ src: s, res: r }); return true;
  }
  if (g === 'prove') { shuffle(IDENTITY_BANK.slice()).forEach(function (s) { if (out.length < count) accept(s.replace(/x/g, info.v || 'x')); }); return { orig: orig, list: out }; }
  if (g === 'simplify-trig') { shuffle(SIMPLIFY_BANK.slice()).forEach(function (s) { if (out.length < count) accept(s.replace(/x/g, info.v || 'x')); }); return { orig: orig, list: out }; }
  while (out.length < count && tries++ < 400) {
    var s;
    if (g === 'angle') s = angleProblem(info);
    else s = srcOf(info, perturb(info.ast, {}));
    try { accept(s); } catch (e) {}
  }
  return { orig: orig, list: out };
};

/* ---------------- graph -> equation practice ---------------- */
function fracT(r) { return r.isInt() ? String(r.n) : r.n + '/' + r.d; }
function coefT(r, sym) { if (r.isOne()) return sym; if (r.eq(q(-1))) return '-' + sym; return (r.isInt() ? r.n : '(' + fracT(r) + ')') + sym; }
function addT(r) { return r.isZero() ? '' : (r.sign() < 0 ? ' - ' + fracT(r.abs()) : ' + ' + fracT(r)); }
function shiftT(h, piUnits) {      /* "x - π/4", "x + 2" */
  if (h.isZero()) return 'x';
  var t = piUnits ? EH.piText(h.abs()) : fracT(h.abs());
  return 'x ' + (h.sign() > 0 ? '- ' : '+ ') + t;
}
var GP_FAMILIES = {
  sin: 'Sine', cos: 'Cosine', tan: 'Tangent', quadratic: 'Parabola (vertex form)', abs: 'Absolute value', sqrt: 'Square root', exp: 'Exponential', log: 'Logarithm', rational: 'Reciprocal (rational)'
};
EH.GP_FAMILIES = GP_FAMILIES;
EH.graphProblem = function (fam, level) {
  level = level || 2;
  if (fam === 'mix' || !GP_FAMILIES[fam]) fam = pick(level === 1 ? ['sin', 'cos', 'quadratic', 'abs'] : Object.keys(GP_FAMILIES));
  var p = { fam: fam, famName: GP_FAMILIES[fam] };
  if (fam === 'sin' || fam === 'cos' || fam === 'tan') {
    var As = level === 1 ? [1, 2, 3, -1, -2] : [1, 2, 3, -1, -2, -3, q(1, 2), q(-1, 2), q(3, 2)];
    var Bs = level === 1 ? [q(1), q(2), q(1, 2)] : level === 2 ? [q(1), q(2), q(3), q(1, 2), q(2, 3), q(4, 3)] : [q(1), q(2), q(3), q(1, 2), q(1, 3), q(2, 3), q(4, 3), q(3, 2), q(3, 4)];
    var A = pick(As); A = A instanceof Q ? A : q(A);
    var Bq = pick(Bs);
    var per = (fam === 'tan' ? q(1) : q(2)).div(Bq);          /* period in π units */
    var quarter = per.div(q(fam === 'tan' ? 2 : 4));
    var h = level === 1 ? q(0) : quarter.mul(q(rnd(-2, 2)));
    var D = q(level === 1 && Math.random() < 0.5 ? 0 : rnd(-2, 2));
    if (fam === 'tan') A = pick(level === 1 ? [q(1), q(-1)] : [q(1), q(2), q(-1), q(1, 2)]);
    var inner = Bq.isOne() ? shiftT(h, true) : (h.isZero() ? coefT(Bq, 'x') : coefT(Bq, '(' + shiftT(h, true) + ')'));
    var eq = 'y = ' + (A.isOne() ? '' : A.eq(q(-1)) ? '-' : (A.isInt() ? A.n : (A.sign() < 0 ? '-' : '') + '(' + fracT(A.abs()) + ')')) + fam + '(' + inner + ')' + addT(D);
    var Af = A.val(), Bf = Bq.val(), hf = h.val() * Math.PI, Df = D.val();
    var fn = { sin: Math.sin, cos: Math.cos, tan: Math.tan }[fam];
    p.eq = eq;
    p.f = function (x) { return Af * fn(Bf * (x - hf)) + Df; };
    p.pi = true; p.xstepPi = quarter.val();
    var P = per.val() * Math.PI, x0 = Math.min(0, hf) - P / 4, span = fam === 'tan' ? 2.5 * P : 2.25 * P;
    if (span / (quarter.val() * Math.PI) > 18) p.xstepPi = quarter.val() * 2;
    p.win = { xmin: x0, xmax: x0 + span, ymin: Math.min(-1, Df - Math.abs(Af) - 1.5), ymax: Math.max(1, Df + Math.abs(Af) + 1.5) };
    if (fam === 'tan') { p.win.ymin = Df - 5; p.win.ymax = Df + 5; }
    p.ystep = Math.abs(Af) < 1 ? 0.5 : 1;
    var pts = [];
    for (var i = 0; i <= 4; i++) { var px = hf + i * quarter.val() * Math.PI; pts.push({ x: px, y: p.f(px) }); }
    p.key = fam === 'tan' ? [{ x: hf, y: Df }, { x: hf + P / 4, y: Df + Af }, { x: hf - P / 4, y: Df - Af }] : pts;
    if (fam === 'tan') { p.vas = []; for (var kk = -4; kk <= 6; kk++) p.vas.push(hf + P / 2 + kk * P); }
    if (fam !== 'tan') p.hlines = [Df];
    var perT = EH.piText(per), hT = EH.piText(h);
    var lines = fam === 'tan' ? [
      'Step 1  Center: tangent has no max or min. Find a center point where the graph crosses its middle (it looks like a flattened S).',
      '          center (' + hT + ', ' + fracT(D) + ')  →  D = ' + fracT(D) + ',  C = ' + hT,
      'Step 2  Period: the distance between two asymptotes (dashed lines).',
      '          period = ' + perT + '  →  B = π/period = π/(' + perT + ') = ' + fracT(Bq),
      'Step 3  A: a quarter period right of the center the graph is at D + A.',
      '          y at x = center + period/4 is ' + fracT(D.add(A)) + '  →  A = ' + fracT(A),
      'Step 4  Assemble y = A tan(B(x - C)) + D.',
      '          ' + eq
    ] : [
      'Step 1  Read the highest and lowest y-values.',
      '          max = ' + fracT(D.add(A.abs())) + ',   min = ' + fracT(D.sub(A.abs())),
      'Step 2  Midline D is halfway between them. Amplitude |A| is half the distance between them.',
      '          D = (' + fracT(D.add(A.abs())) + ' + (' + fracT(D.sub(A.abs())) + '))/2 = ' + fracT(D) + '        |A| = (' + fracT(D.add(A.abs())) + ' - (' + fracT(D.sub(A.abs())) + '))/2 = ' + fracT(A.abs()),
      'Step 3  Period: distance from one peak to the next (or one full cycle).',
      '          period = ' + perT + '  →  B = 2π/period = 2π/(' + perT + ') = ' + fracT(Bq),
      'Step 4  Phase shift C: where does a cycle START? ' + (fam === 'sin' ? 'A sine cycle starts ON the midline' + (Af > 0 ? ' going UP' : ' going DOWN (so A is negative)') : 'A cosine cycle starts at the ' + (Af > 0 ? 'TOP (max)' : 'BOTTOM (min), so A is negative')) + '.',
      '          cycle starts at x = ' + hT + '  →  C = ' + hT + (A.sign() < 0 ? ',   A = ' + fracT(A) : ',   A = +' + fracT(A)),
      'Step 5  Assemble y = A ' + fam + '(B(x - C)) + D.',
      '          ' + eq
    ];
    p.solution = lines.join('\n');
    p.hint = fam === 'tan' ? 'Find the asymptotes first: the distance between two of them is the period.' : 'Midline first (halfway between max and min), then amplitude, then period, then where a cycle starts.';
    p.form = fam === 'tan' ? 'y = A tan(B(x - C)) + D' : 'y = A ' + fam + '(B(x - C)) + D';
    return p;
  }
  var a = pick(level === 1 ? [1, -1, 2] : [1, -1, 2, -2, q(1, 2), q(-1, 2), 3]); a = a instanceof Q ? a : q(a);
  var h2 = q(rnd(-4, 4)), k = q(rnd(-4, 4)), af = a.val(), hf2 = h2.val(), kf = k.val();
  var X = shiftT(h2, false), aT = a.isOne() ? '' : a.eq(q(-1)) ? '-' : (a.isInt() ? String(a.n) : '(' + fracT(a) + ')');
  p.pi = false; p.ystep = 1;
  if (fam === 'quadratic') {
    p.eq = 'y = ' + aT + (h2.isZero() ? 'x²' : '(' + X + ')²') + addT(k);
    p.f = function (x) { return af * (x - hf2) * (x - hf2) + kf; };
    p.key = [{ x: hf2, y: kf }, { x: hf2 + 1, y: kf + af }, { x: hf2 - 1, y: kf + af }, { x: hf2 + 2, y: kf + 4 * af }, { x: hf2 - 2, y: kf + 4 * af }];
    p.form = 'y = a(x - h)² + k';
    p.hint = 'Find the vertex (h, k). Then step 1 to the right of the vertex: the graph moves up or down by a.';
    p.solution = ['Step 1  Vertex: the turning point.', '          (h, k) = (' + fracT(h2) + ', ' + fracT(k) + ')', 'Step 2  Find a: go 1 unit right of the vertex and read how far the graph went up (+) or down (−) from k.', '          at x = ' + fracT(h2.add(q(1))) + ',  y = ' + fracT(k.add(a)) + '  →  a = ' + fracT(k.add(a)) + ' - (' + fracT(k) + ') = ' + fracT(a), 'Step 3  Opens ' + (af > 0 ? 'up (a > 0)' : 'down (a < 0)') + '. Assemble.', '          ' + p.eq].join('\n');
  } else if (fam === 'abs') {
    p.eq = 'y = ' + aT + '|' + X + '|' + addT(k);
    p.f = function (x) { return af * Math.abs(x - hf2) + kf; };
    p.key = [{ x: hf2, y: kf }, { x: hf2 + 1, y: kf + af }, { x: hf2 - 1, y: kf + af }, { x: hf2 + 2, y: kf + 2 * af }];
    p.form = 'y = a|x - h| + k';
    p.hint = 'The corner is (h, k). The slope of the right-hand side is a.';
    p.solution = ['Step 1  Vertex (the corner).', '          (h, k) = (' + fracT(h2) + ', ' + fracT(k) + ')', 'Step 2  a is the slope of the right arm: rise over run starting at the vertex.', '          from (' + fracT(h2) + ', ' + fracT(k) + ') to (' + fracT(h2.add(q(1))) + ', ' + fracT(k.add(a)) + ')  →  a = ' + fracT(a), 'Step 3  Assemble.', '          ' + p.eq].join('\n');
  } else if (fam === 'sqrt') {
    p.eq = 'y = ' + aT + '√(' + X + ')' + addT(k);
    p.f = function (x) { return x < hf2 ? NaN : af * Math.sqrt(x - hf2) + kf; };
    p.key = [{ x: hf2, y: kf }, { x: hf2 + 1, y: kf + af }, { x: hf2 + 4, y: kf + 2 * af }];
    p.form = 'y = a√(x - h) + k';
    p.hint = 'The graph starts at (h, k). One unit right of the start, it has moved by a.';
    p.solution = ['Step 1  Starting point (the endpoint).', '          (h, k) = (' + fracT(h2) + ', ' + fracT(k) + ')', 'Step 2  1 unit right of the start (√1 = 1) the graph is a units above (or below) k. Check with 4 units right (√4 = 2): 2a.', '          at x = ' + fracT(h2.add(q(1))) + ',  y = ' + fracT(k.add(a)) + '  →  a = ' + fracT(a), 'Step 3  Assemble.', '          ' + p.eq].join('\n');
  } else if (fam === 'exp') {
    var b = pick([2, 3, q(1, 2)]); b = b instanceof Q ? b : q(b); var bf = b.val();
    var a2 = pick([1, -1, 2]); a = q(a2); af = a2; aT = a.isOne() ? '' : a.eq(q(-1)) ? '-' : String(a2);
    var bT = b.isInt() ? String(b.n) : '(' + fracT(b) + ')';
    p.eq = 'y = ' + aT + (aT && aT !== '-' ? '·' : '') + bT + '^(' + X + ')' + addT(k);
    p.f = function (x) { return af * Math.pow(bf, x - hf2) + kf; };
    p.key = [{ x: hf2, y: kf + af }, { x: hf2 + 1, y: kf + af * bf }, { x: hf2 - 1, y: kf + af / bf }];
    p.has = [kf];
    p.form = 'y = a·b^(x - h) + k';
    p.hint = 'The horizontal asymptote is y = k. Then look at the point where the curve is a units from the asymptote.';
    p.solution = ['Step 1  Horizontal asymptote (dashed line).', '          y = ' + fracT(k) + '  →  k = ' + fracT(k), 'Step 2  The anchor point of b^x is (0, 1). Shifted, it is (h, k + a).', '          (' + fracT(h2) + ', ' + fracT(k.add(a)) + ')  →  h = ' + fracT(h2) + ', a = ' + fracT(a), 'Step 3  One unit right, the distance from the asymptote is multiplied by b.', '          distance ' + fracT(a.abs()) + ' → ' + fracT(a.abs().mul(b)) + '   so b = ' + fracT(b), 'Step 4  Assemble.', '          ' + p.eq].join('\n');
  } else if (fam === 'log') {
    var lb = pick([2, 3]), lbf = lb;
    var a3 = pick([1, -1, 2]); af = a3; aT = a3 === 1 ? '' : a3 === -1 ? '-' : String(a3);
    p.eq = 'y = ' + aT + 'log_' + lb + '(' + X + ')' + addT(k);
    p.f = function (x) { return x <= hf2 ? NaN : af * Math.log(x - hf2) / Math.log(lbf) + kf; };
    p.key = [{ x: hf2 + 1, y: kf }, { x: hf2 + lb, y: kf + af }, { x: hf2 + 1 / lb, y: kf - af }];
    p.vas = [hf2];
    p.form = 'y = a·log_b(x - h) + k';
    p.hint = 'The vertical asymptote is x = h. The curve passes through (h + 1, k).';
    p.solution = ['Step 1  Vertical asymptote (dashed line).', '          x = ' + fracT(h2) + '  →  h = ' + fracT(h2), 'Step 2  log_b(1) = 0, so the point 1 unit right of the asymptote is at height k.', '          (' + fracT(h2.add(q(1))) + ', ' + fracT(k) + ')  →  k = ' + fracT(k), 'Step 3  log_b(b) = 1: find where the height has changed by a. That x is h + b.', '          (' + fracT(h2.add(q(lb))) + ', ' + fracT(k.add(q(a3))) + ')  →  b = ' + lb + ', a = ' + a3, 'Step 4  Assemble.', '          ' + p.eq].join('\n');
  } else {        /* rational */
    if (!a.isInt()) { a = q(pick([1, -1, 2, -2, 3])); af = a.val(); }
    p.eq = 'y = ' + (a.isInt() ? a.n : '(' + fracT(a) + ')') + '/(' + X + ')' + addT(k);
    p.f = function (x) { return af / (x - hf2) + kf; };
    p.key = [{ x: hf2 + 1, y: kf + af }, { x: hf2 - 1, y: kf - af }, { x: hf2 + 2, y: kf + af / 2 }];
    p.vas = [hf2]; p.has = [kf];
    p.form = 'y = a/(x - h) + k';
    p.hint = 'Vertical asymptote x = h, horizontal asymptote y = k. One unit right of x = h the curve is a units from y = k.';
    p.solution = ['Step 1  Asymptotes (dashed).', '          x = ' + fracT(h2) + ',   y = ' + fracT(k) + '  →  h = ' + fracT(h2) + ', k = ' + fracT(k), 'Step 2  1 unit right of the vertical asymptote, read the height.', '          (' + fracT(h2.add(q(1))) + ', ' + fracT(k.add(a)) + ')  →  a = ' + fracT(k.add(a)) + ' - (' + fracT(k) + ') = ' + fracT(a), 'Step 3  Assemble.', '          ' + p.eq].join('\n');
  }
  var xs = p.key.map(function (pt) { return pt.x; }).concat(p.vas || []);
  var ys = p.key.map(function (pt) { return pt.y; }).concat(p.has || []);
  var lo = Math.min.apply(null, xs.concat([0])), hi = Math.max.apply(null, xs.concat([0]));
  var ylo = Math.min.apply(null, ys.concat([0])), yhi = Math.max.apply(null, ys.concat([0]));
  p.win = { xmin: Math.floor(lo - 3), xmax: Math.ceil(hi + 3), ymin: Math.floor(ylo - 3), ymax: Math.ceil(yhi + 3) };
  return p;
};
EH.checkGraphAnswer = function (p, src) {
  var s = String(src || '').trim().replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, '');
  if (!s) return { ok: false, msg: 'Type an equation first.' };
  var ast;
  try { ast = EH.parse(s); } catch (e) { return { ok: false, msg: e.message }; }
  var vs = EH.vars(ast);
  if (vs.length > 1 || (vs.length === 1 && vs[0] !== 'x')) return { ok: false, msg: 'Use x as the only variable.' };
  var bad = 0, tested = 0, worst = 0;
  for (var i = 0; i <= 80; i++) {
    var x = p.win.xmin + (p.win.xmax - p.win.xmin) * (i + 0.37) / 81, t = p.f(x);
    if (!isFinite(t) || Math.abs(t) > 40) continue;
    var u; try { u = EH.fval(ast, { x: x }); } catch (e) { u = NaN; }
    tested++;
    var err = Math.abs(u - t); if (!isFinite(err)) err = 99;
    worst = Math.max(worst, err);
    if (err > 1e-6 * (1 + Math.abs(t))) bad++;
  }
  if (!tested) return { ok: false, msg: 'Could not compare.' };
  if (!bad) return { ok: true, msg: 'Correct! Your equation matches the graph everywhere.' };
  return { ok: false, close: bad < tested * 0.3, msg: bad < tested * 0.3 ? 'Close, but not everywhere: check the sign of A or the shift.' : 'Not this one. Your graph is off at most points.' };
};

})(typeof EH !== 'undefined' ? EH : undefined);
