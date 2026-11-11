/* =====================================================================
   Graph It with a Table: y = A·sin(Bx − C) + D  /  y = A·cos(Bx − C) + D
   Blank table + blank graph, like the class worksheet. The student can
   fill the table and tap points onto the graph, or step through it:
     1. read A, B, C, D        2. parent x and y
     3. new x = parent x ÷ B + C/B (each row written out)
     4. new y = A·(parent y) + D (each row written out)
     5. plot the points        6. connect them with the curve
   ===================================================================== */
(function () {
'use strict';
if (typeof EH === 'undefined' || typeof Paper === 'undefined' || typeof Graph === 'undefined') return;
var P = Paper, esc = P.esc, Q = EH.Q, q = EH.q;
function $(id) { return document.getElementById(id); }
var host = $('graph-table'); if (!host) return;

var PARENT_X = [q(0), q(1, 2), q(1), q(3, 2), q(2)];            /* in units of π */
var PARENT_Y = { sin: [0, 1, 0, -1, 0], cos: [1, 0, -1, 0, 1] };
var CLASS = [
  { src: 'y = -3/2 cos(1/2 x) - 2', fn: 'cos', A: q(-3, 2), B: q(1, 2), C: q(0), D: q(-2) },
  { src: 'y = sin(3/4 x)', fn: 'sin', A: q(1), B: q(3, 4), C: q(0), D: q(0) }
];
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function piT(r) { return EH.piText(r); }
function qT(r) { return r.toString(); }
function wrapQ(r) { var t = r.toString(); return /[\/-]/.test(t) ? '(' + t + ')' : t; }
function coefT(A) { return A.isOne() ? '' : A.eq(q(-1)) ? '-' : (A.isInt() ? String(A.n) : (A.sign() < 0 ? '-' : '') + A.abs().toString()); }
function eqText(p) {
  var inner = (p.B.isOne() ? '' : p.B.isInt() ? p.B.n : p.B.toString()) + 'x' + (p.C.isZero() ? '' : (p.C.sign() > 0 ? ' - ' : ' + ') + piT(p.C.abs()));
  return 'y = ' + coefT(p.A) + p.fn + '(' + inner + ')' + (p.D.isZero() ? '' : (p.D.sign() > 0 ? ' + ' : ' - ') + p.D.abs());
}
function generate(fn, level) {
  fn = fn === 'mix' || !fn ? pick(['sin', 'cos']) : fn;
  var A = pick(level === 1 ? [q(1), q(2), q(3), q(-1), q(-2)] : [q(1), q(2), q(3), q(-1), q(-2), q(1, 2), q(-1, 2), q(3, 2), q(-3, 2)]);
  var B = pick(level === 1 ? [q(1), q(2), q(1, 2)] : [q(1), q(2), q(3), q(1, 2), q(1, 3), q(2, 3), q(3, 4), q(4, 3)]);
  var D = level === 1 ? q(0) : q(pick([0, 0, 1, -1, 2, -2, 3, -3]));
  var shift = level === 3 ? PARENT_X[1].div(B).mul(q(pick([-2, -1, 1, 2]))).div(q(1)) : q(0);    /* a multiple of a quarter period */
  var C = shift.mul(B);                                                                            /* Bx − C  with  C = B·shift */
  return { fn: fn, A: A, B: B, C: C, D: D };
}
function fromEquation(src) {
  var info = EH.classify(src.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, 'y = '));
  var fam = info.family;
  if (!fam || fam.name !== 'sinusoid' || !fam.lin) throw new Error('Type a sine or cosine like  y = -3/2 cos(1/2 x) - 2  or  y = 2sin(3x - π) + 1.');
  var A = fam.a, k = fam.lin.k, c = fam.lin.c, D = fam.k;
  if (!A.isRational() || !k.isRational() || !D.isRational()) throw new Error('A, B and D need to be numbers or fractions (no radicals) for the table method.');
  var cp = c.piMultiple(); if (!cp) throw new Error('The shift inside needs to be a multiple of π (like π, π/4) for exact table values.');
  return { fn: fam.core.name, A: A.rat(), B: k.rat(), C: cp.neg(), D: D.rat() };
}
function solveRows(p) {
  var shift = p.C.div(p.B);
  return PARENT_X.map(function (px, i) {
    var py = PARENT_Y[p.fn][i], nx = px.div(p.B).add(shift), ny = p.A.mul(q(py)).add(p.D);
    var kind = py === 0 ? 'midline' : (py * p.A.sign() > 0 ? 'max' : 'min');
    return { px: px, py: py, nx: nx, ny: ny, kind: kind };
  });
}

/* ---------------- steps, written out like the worksheet ---------------- */
function buildSteps(p, rows) {
  var shift = p.C.div(p.B), Bt = wrapQ(p.B), steps = [];
  var per = q(2).div(p.B);
  steps.push({ note: 'Match the form y = A·' + p.fn + '(Bx − C) + D and read off the four numbers. A stretches (and flips if negative), B changes the period, C/B is the shift, D moves it up or down.', math: eqText(p) + '\nA = ' + qT(p.A) + ',   B = ' + qT(p.B) + ',   C = ' + piT(p.C) + ',   D = ' + qT(p.D) + '\nperiod = 2π/B = 2π ÷ ' + Bt + ' = ' + piT(per) + (shift.isZero() ? '' : '\nshift = C/B = ' + piT(p.C) + ' ÷ ' + Bt + ' = ' + piT(shift) + (shift.sign() > 0 ? ' (right)' : ' (left)')), fill: 0 });
  steps.push({ note: 'Fill in the PARENT columns first: the five key points of y = ' + p.fn + ' x over one cycle, 0 to 2π.', math: 'x:   0,   π/2,   π,   3π/2,   2π\ny = ' + p.fn + ' x:   ' + PARENT_Y[p.fn].join(',   '), fill: 2 });
  var xl = rows.map(function (r) {
    var div = p.B.isOne() ? piT(r.px) : piT(r.px) + ' ÷ ' + Bt + (r.px.isZero() ? '' : ' = ' + piT(r.px) + ' · ' + wrapQ(p.B.inv())) + ' = ' + piT(r.px.div(p.B));
    return (shift.isZero() ? div : '(' + div + ') ' + (shift.sign() > 0 ? '+ ' : '- ') + piT(shift.abs()) + ' = ' + piT(r.nx));
  });
  steps.push({ note: 'NEW x: divide each parent x by B' + (shift.isZero() ? '' : ', then add the shift C/B = ' + piT(shift)) + '. (Dividing by a fraction = multiplying by its flip.)', math: 'new x = parent x ÷ B' + (shift.isZero() ? '' : ' + C/B') + '\n' + xl.join('\n'), fill: 3 });
  var yl = rows.map(function (r) {
    var prod = p.A.mul(q(r.py));
    return wrapQ(p.A) + '(' + r.py + ')' + (p.D.isZero() ? '' : (p.D.sign() > 0 ? ' + ' : ' - ') + p.D.abs()) + ' = ' + qT(prod) + (p.D.isZero() ? '' : (p.D.sign() > 0 ? ' + ' : ' - ') + p.D.abs() + ' = ' + qT(r.ny));
  });
  steps.push({ note: 'NEW y: multiply each parent y by A, then add D.' + (p.A.sign() < 0 ? ' A is negative, so the graph flips: the parent maximum becomes a minimum.' : ''), math: 'new y = A·(parent y) + D\n' + yl.join('\n'), fill: 4 });
  steps.push({ note: 'Plot the five (new x, new y) points. Label them: the maximum, the minimum, and the midline points (on y = ' + qT(p.D) + (p.D.isZero() ? ', which here are the x-intercepts' : '') + ').', math: rows.map(function (r) { return '(' + piT(r.nx) + ', ' + qT(r.ny) + ')   ' + r.kind; }).join('\n'), plot: true });
  steps.push({ note: 'Connect the points with a smooth wave (rounded at the max and min, never pointed). That is one full cycle; it repeats every ' + piT(per) + '.', math: 'max ' + qT(p.D.add(p.A.abs())) + ',   min ' + qT(p.D.sub(p.A.abs())) + ',   midline y = ' + qT(p.D) + ',   period ' + piT(per), curve: true });
  return steps;
}

/* ---------------- state + rendering ---------------- */
var cur = null, rows = null, steps = null, shown = 0, plotted = [], win = null;
function f(x) { var th = cur.B.val() * x - cur.C.val() * Math.PI; return cur.A.val() * (cur.fn === 'sin' ? Math.sin(th) : Math.cos(th)) + cur.D.val(); }
function windowFor() {
  var per = 2 / cur.B.val() * Math.PI, start = cur.C.div(cur.B).val() * Math.PI, qtr = per / 4;
  var lo = Math.min(0, start) - qtr, hi = Math.max(start + per, 0) + qtr;
  var ymax = Math.max(1, cur.D.val() + Math.abs(cur.A.val())) + 1, ymin = Math.min(-1, cur.D.val() - Math.abs(cur.A.val())) - 1;
  return { xmin: lo, xmax: hi, ymin: Math.floor(ymin), ymax: Math.ceil(ymax), qtrPi: cur.B.inv().div(q(2)).val() };
}
function drawGraph() {
  var spec = { fns: [], win: win, pi: true, xstepPi: win.qtrPi, ystep: Math.abs(cur.A.val()) % 1 || cur.D.val() % 1 ? 0.5 : 1, points: [], seed: 7, aria: 'Graph paper for ' + eqText(cur) };
  var showPts = steps.slice(0, shown).some(function (s) { return s.plot; }), showCurve = steps.slice(0, shown).some(function (s) { return s.curve; });
  if (showCurve) spec.fns.push({ f: f, cls: 'gp-c0' });
  if (showPts) rows.forEach(function (r) { spec.points.push({ x: r.nx.val() * Math.PI, y: r.ny.val(), label: '(' + piT(r.nx) + ', ' + qT(r.ny) + ')' }); });
  plotted.forEach(function (pt) { spec.points.push({ x: pt.x, y: pt.y, cls: 'tg-mine' + (pt.ok === true ? ' tg-ok' : pt.ok === false ? ' tg-no' : ''), label: null }); });
  if (!spec.fns.length) spec.fns.push({ f: function () { return NaN; } });
  if (showCurve) spec.hlines = [cur.D.val()];
  $('tg-graph').innerHTML = Graph.svg(spec);
}
function tableHtml() {
  var h = ['<div class="tg-fnlabel pp-sheet">' + P.inline(cur.fn + ' x') + '</div><table class="tg-table"><tr><th>x</th><th>y</th><th>new x</th><th>new y</th></tr>'];
  rows.forEach(function (r, i) {
    h.push('<tr>' + ['px', 'py', 'nx', 'ny'].map(function (k, j) { return '<td><input class="tg-cell" data-r="' + i + '" data-k="' + k + '" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="row ' + (i + 1) + ' ' + ['parent x', 'parent y', 'new x', 'new y'][j] + '"/><span class="tg-fill pp-sheet" hidden></span></td>'; }).join('') + '</tr>');
  });
  return h.join('') + '</table>';
}
function fillTable() {
  var level = 0;
  steps.slice(0, shown).forEach(function (s) { if (s.fill) level = Math.max(level, s.fill); });
  host.querySelectorAll('.tg-cell').forEach(function (inp) {
    var r = rows[+inp.getAttribute('data-r')], k = inp.getAttribute('data-k'), sp = inp.nextElementSibling;
    var show = (k === 'px' || k === 'py') ? level >= 2 : k === 'nx' ? level >= 3 : level >= 4;
    var val = k === 'px' ? piT(r.px) : k === 'py' ? String(r.py) : k === 'nx' ? piT(r.nx) : qT(r.ny);
    sp.hidden = !show; inp.hidden = show;
    if (show) sp.innerHTML = P.inline(val);
  });
}
function renderSteps() {
  var box = $('tg-steps');
  box.innerHTML = shown ? (window.EHUI ? EHUI.stepsHtml(steps.slice(0, shown)) : '') : '';
  $('tg-next').disabled = shown >= steps.length;
  $('tg-next').textContent = shown ? (shown >= steps.length ? 'All steps shown' : 'Next step (' + (shown + 1) + ' of ' + steps.length + ')') : 'Start step by step';
}
function load(p) {
  cur = p; rows = solveRows(p); steps = buildSteps(p, rows); shown = 0; plotted = []; win = windowFor();
  $('tg-eq').innerHTML = P.inline(eqText(p));
  $('tg-tablebox').innerHTML = tableHtml();
  $('tg-msg').innerHTML = ''; $('tg-msg').className = 'gp-msg';
  fillTable(); drawGraph(); renderSteps();
}
function parseCell(t) { t = String(t || '').trim(); if (!t) return null; try { return EH.fval(EH.parse(t.replace(/÷/g, '/'))); } catch (e) { return NaN; } }

/* ---------------- tap to plot ---------------- */
$('tg-graph').addEventListener('click', function (e) {
  var svg = e.target.closest('svg'); if (!svg) return;
  var vb = svg.viewBox.baseVal, M = 14, r = svg.getBoundingClientRect();
  var px = (e.clientX - r.left) / r.width * vb.width, py = (e.clientY - r.top) / r.height * vb.height;
  var x = win.xmin + (px - M) / (vb.width - 2 * M) * (win.xmax - win.xmin), y = win.ymax - (py - M) / (vb.height - 2 * M) * (win.ymax - win.ymin);
  var gx = Math.PI / 24; x = Math.round(x / gx) * gx; y = Math.round(y * 4) / 4;
  var near = plotted.findIndex(function (pt) { return Math.abs(pt.x - x) < 1e-6 && Math.abs(pt.y - y) < 1e-6; });
  if (near >= 0) plotted.splice(near, 1); else plotted.push({ x: x, y: y });
  drawGraph();
  $('tg-plotted').textContent = plotted.length ? 'Your points: ' + plotted.map(function (pt) { return '(' + Graph.piLabel(pt.x) + ', ' + pt.y + ')'; }).join('  ') : '';
});

/* ---------------- buttons ---------------- */
$('tg-next').addEventListener('click', function () { if (shown < steps.length) { shown++; fillTable(); drawGraph(); renderSteps(); } });
$('tg-all').addEventListener('click', function () { shown = steps.length; fillTable(); drawGraph(); renderSteps(); });
$('tg-new').addEventListener('click', function () { load(generate($('tg-fn').value, +$('tg-level').value)); });
$('tg-class').addEventListener('click', function () { var i = +(this.getAttribute('data-i') || 0); load(CLASS[i]); this.setAttribute('data-i', (i + 1) % CLASS.length); this.textContent = 'Class sheet: problem ' + ((i + 1) % CLASS.length + 1); });
$('tg-own-go').addEventListener('click', function () { try { load(fromEquation($('tg-own').value)); } catch (e) { $('tg-msg').className = 'gp-msg gp-no'; $('tg-msg').textContent = e.message; } });
$('tg-own').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('tg-own-go').click(); } });
$('tg-clear').addEventListener('click', function () { host.querySelectorAll('.tg-cell').forEach(function (i) { i.value = ''; i.classList.remove('tg-good', 'tg-bad'); }); plotted = []; drawGraph(); $('tg-plotted').textContent = ''; $('tg-msg').innerHTML = ''; });
$('tg-check').addEventListener('click', function () {
  var cells = host.querySelectorAll('.tg-cell:not([hidden])'), right = 0, filled = 0, firstBad = null;
  cells.forEach(function (inp) {
    var r = rows[+inp.getAttribute('data-r')], k = inp.getAttribute('data-k'), v = parseCell(inp.value);
    inp.classList.remove('tg-good', 'tg-bad');
    if (v === null) return; filled++;
    var want = k === 'px' ? r.px.val() * Math.PI : k === 'py' ? r.py : k === 'nx' ? r.nx.val() * Math.PI : r.ny.val();
    var ok = Math.abs(v - want) < 1e-6; if (ok) right++; else if (!firstBad) firstBad = { k: k, r: r, row: +inp.getAttribute('data-r') };
    inp.classList.add(ok ? 'tg-good' : 'tg-bad');
  });
  /* plotted points */
  var ptsOk = 0;
  plotted.forEach(function (pt) { pt.ok = rows.some(function (r) { return Math.abs(r.nx.val() * Math.PI - pt.x) < 1e-6 && Math.abs(r.ny.val() - pt.y) < 1e-6; }); if (pt.ok) ptsOk++; });
  var missing = rows.filter(function (r) { return !plotted.some(function (pt) { return Math.abs(r.nx.val() * Math.PI - pt.x) < 1e-6 && Math.abs(r.ny.val() - pt.y) < 1e-6; }); }).length;
  drawGraph();
  var msg = [], m = $('tg-msg');
  if (filled) msg.push('Table: ' + right + ' of ' + filled + ' filled cells are right.');
  if (firstBad) {
    var hint = { px: 'Parent x values are 0, π/2, π, 3π/2, 2π.', py: 'Parent y values for ' + cur.fn + ' x are ' + PARENT_Y[cur.fn].join(', ') + '.',
      nx: 'new x = parent x ÷ ' + qT(cur.B) + (cur.C.isZero() ? '' : ' + ' + piT(cur.C.div(cur.B))) + '. Row ' + (firstBad.row + 1) + ': ' + piT(firstBad.r.px) + ' ÷ ' + wrapQ(cur.B) + ' = ' + piT(firstBad.r.px.div(cur.B)) + (cur.C.isZero() ? '' : ', then add the shift') + '.',
      ny: 'new y = ' + wrapQ(cur.A) + '·(parent y) ' + (cur.D.sign() < 0 ? '- ' + cur.D.abs() : '+ ' + cur.D) + '. Row ' + (firstBad.row + 1) + ': ' + wrapQ(cur.A) + '(' + firstBad.r.py + ')' + (cur.D.isZero() ? '' : (cur.D.sign() < 0 ? ' - ' + cur.D.abs() : ' + ' + cur.D)) + ' = ' + qT(firstBad.r.ny) + '.' }[firstBad.k];
    msg.push('First one to fix: ' + hint);
  }
  if (plotted.length) msg.push('Graph: ' + ptsOk + ' of your ' + plotted.length + ' points are key points' + (missing ? ', and ' + missing + ' key point' + (missing > 1 ? 's are' : ' is') + ' still missing.' : '. All five are plotted!'));
  if (!filled && !plotted.length) msg.push('Fill in some table cells or tap points onto the graph first.');
  var allGood = filled === 20 && right === 20 && plotted.length && !missing && ptsOk === plotted.length;
  m.className = 'gp-msg ' + (allGood ? 'gp-ok' : 'gp-no');
  m.innerHTML = esc(msg.join(' ')).replace(/π/g, 'π') + (allGood ? ' <b>Everything is correct.</b>' : '');
  if (window.Progress && (filled || plotted.length)) Progress.record('graph-table', 'Table → graph: ' + (cur.fn === 'sin' ? 'sine' : 'cosine'), allGood || (filled > 0 && right === filled && (!plotted.length || (!missing && ptsOk === plotted.length))), { eq: eqText(cur) });
});
load(CLASS[0]);
})();
