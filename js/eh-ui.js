/* =====================================================================
   Interface for the Equation Helper extensions:
   paper-style answers and steps, Solve all, More like this,
   Graph → Equation practice, the Memory Sheet, and the paper switch.
   ===================================================================== */
(function () {
'use strict';
if (typeof EH === 'undefined' || typeof Paper === 'undefined') return;
var P = Paper, esc = P.esc;
function $(id) { return document.getElementById(id); }
function goalLabel(g, info) {
  if (/^solve:/.test(g)) return 'Solve for ' + g.split(':')[1];
  if (g === 'solve') return info && info.kind === 'inequality' ? 'Solve the inequality' : 'Solve for ' + ((info && info.v) || 'x');
  return EH.GOAL_LABEL[g] || g;
}

/* ---------------- result pieces ---------------- */
function answerHtml(res) {
  return '<div class="eh-pans pp-sheet"><div class="eh-pans-tag">Answer</div>' + res.answer.map(function (a) { return '<div class="pp-line">' + P.inline(a) + '</div>'; }).join('') + '</div>';
}
function stepsHtml(steps) {
  var n = 0, h = [];
  steps.forEach(function (s) {
    if (!s.note && !s.math) return;
    n++;
    h.push('<li class="eh-pstep"><span class="eh-pnum">' + n + '</span><div class="eh-pbody">' +
      (s.note ? '<div class="eh-pnote">' + P.inline(s.note).replace(/class="pp-t pp-j\d"/g, 'class="pp-tt"') + '</div>' : '') +
      (s.math ? '<div class="eh-pwork pp-sheet">' + P.block(s.math) + '</div>' : '') + '</div></li>');
  });
  return n ? '<ol class="eh-psteps">' + h.join('') + '</ol>' : '';
}
function explainHtml(res) {
  var e = EH.explain(res); if (!e) return '';
  return '<div class="eh-explain"><div><b>What the question asks.</b> ' + esc(e.what) + '</div>' +
    (e.meaning ? '<div class="eh-meaning"><b>What the answer means.</b> ' + P.inline(e.meaning.replace(/^In words: /, '')) + '</div>' : '') +
    '<div><b>The big idea.</b> ' + esc(e.idea) + '</div><div><b>How to check it.</b> ' + esc(e.check) + '</div></div>';
}
function visualHtml(res) {
  var parts = [];
  var line = EH.setLine(res); if (line) parts.push('<figure class="eh-fig">' + line + '<figcaption>Number line: filled dot = included, open dot = not included.</figcaption></figure>');
  var g = EH.graphFor(res);
  if (g) {
    var cap = res.goal === 'prove' ? 'Both sides graphed: the two curves lie exactly on top of each other. That is what an identity means: equal for every allowed angle (gaps are where a side is undefined).'
      : res.goal === 'simplify-trig' ? 'The graph of the expression. The simplified form has exactly the same graph.'
      : res.goal === 'angle' ? 'The angle drawn in standard position: start on the positive x-axis and turn ' + (/-/.test(res.src || '') ? 'clockwise (negative)' : 'counterclockwise (positive)') + '. The shaded wedge is the reference angle.'
      : res.info && res.info.kind === 'equation' ? 'Each side of the equation graphed as its own curve. The solutions are where the curves cross.'
      : res.info && res.info.kind === 'inequality' ? 'Each side graphed. The solution is where the blue curve is ' + (/[<≤]/.test(res.src || '') ? 'below' : 'above') + ' the red one.'
      : 'The graph. Dashed red lines are asymptotes, open circles are holes.';
    parts.push('<figure class="eh-fig">' + g + '<figcaption>' + esc(cap) + '</figcaption></figure>');
  }
  return parts.join('');
}
function calcHtml(res) {
  if (res.calc && res.calc.keys && res.calc.keys.indexOf('?') < 0)
    return '<div class="calc-box"><strong>TI-30XIIS check.</strong> ' + (res.calc.mode ? 'Mode: <kbd>' + esc(res.calc.mode) + '</kbd>. ' : '') + '<span class="keys">' + esc(res.calc.keys + '   →   ' + res.calc.value) + '</span>Match the decimal to your exact answer.</div>';
  return '';
}
function resultCore(res, opts) {
  opts = opts || {};
  var h = [];
  if (res.error) { h.push('<div class="warning eh-err"><strong>Not automated:</strong> ' + esc(res.error) + '</div>'); return h.join(''); }
  h.push(answerHtml(res));
  res.notes.forEach(function (n) { h.push('<div class="warning eh-note">' + esc(n) + '</div>'); });
  if (!opts.noVisual) h.push(visualHtml(res));
  if (!opts.noExplain) h.push(explainHtml(res));
  var st = stepsHtml(res.steps);
  if (st) h.push('<h4 class="eh-sub">On paper, step by step</h4>' + st);
  h.push(calcHtml(res));
  return h.join('');
}
window.EHUI = { answerHtml: answerHtml, stepsHtml: stepsHtml, explainHtml: explainHtml, visualHtml: visualHtml, resultCore: resultCore, goalLabel: goalLabel };

/* ---------------- Solve all / More like this ---------------- */
var root = $('equation-helper');
if (root) {
  var input = $('eh-input'), out = $('eh-output'), more = $('eh-more'), goalSel = $('eh-goal');
  var intSel = $('eh-interval');
  var btnAll = $('eh-all'), btnMore = $('eh-similar');
  if (btnAll) btnAll.addEventListener('click', function () {
    var src = input.value.trim();
    if (!src) { out.innerHTML = '<div class="eh-msg">Type or paste an expression or an equation first.</div>'; return; }
    var all;
    try { all = EH.solveAll(src, {}); } catch (e) { out.innerHTML = '<div class="eh-msg eh-err">' + esc(e.message || String(e)) + '</div>'; return; }
    var info = all.info, h = ['<div class="eh-result">'];
    h.push('<div class="eh-head"><div class="eh-kind">Solve all · <strong>' + esc((all.sections[0] && all.sections[0].title) || 'expression') + '</strong> · ' + all.sections.length + ' results</div><div class="eh-echo pp-sheet">' + P.inline(EH.displayText(info)) + '</div></div>');
    var seenG = false;
    var firstVis = all.sections.filter(function (r) { return !r.error; })[0];
    if (firstVis) { var vis = visualHtml(firstVis); if (vis) { h.push(vis); seenG = true; } }
    h.push('<div class="eh-allnav">' + all.sections.map(function (r, i) { return '<a href="#eh-all-' + i + '">' + esc(r.extraLabel || goalLabel(r.goal, info)) + '</a>'; }).join('') + '</div>');
    all.sections.forEach(function (r, i) {
      h.push('<details class="eh-allsec" id="eh-all-' + i + '"' + (i < 3 ? ' open' : '') + '><summary>' + esc(r.extraLabel || goalLabel(r.goal, info)) + (r.error ? ' <span class="small">(not automated)</span>' : '') + '</summary>' +
        resultCore(r, { noVisual: r === firstVis && seenG }) + '</details>');
    });
    h.push('</div>');
    out.innerHTML = h.join('');
    out.scrollIntoView({ block: 'nearest' });
  });
  function moreRun(n) {
    var src = input.value.trim();
    if (!src) { more.innerHTML = '<div class="eh-msg">Type or paste a problem first; new ones will be made just like it.</div>'; return; }
    more.innerHTML = '<div class="eh-msg">Making problems…</div>';
    setTimeout(function () {
      var r;
      try { r = EH.similar(src, goalSel.value || '', n); }
      catch (e) { more.innerHTML = '<div class="eh-msg eh-err">' + esc(e.message || String(e)) + '</div>'; return; }
      if (!r.list.length) { more.innerHTML = '<div class="eh-msg">I could not make clean variations of this one. Try a slightly simpler version, or pick a different goal.</div>'; return; }
      var info = r.orig.info, gl = goalLabel(r.orig.goal, info);
      var h = ['<div class="eh-more-head"><h3>Practice: ' + r.list.length + ' more like this</h3><p class="small">Same type, same goal (' + esc(gl) + '). Work each one on paper first, then reveal the steps or the answer.</p>',
        '<div class="eh-more-tools"><label>How many <select id="eh-more-n">' + [3, 5, 8, 10].map(function (k) { return '<option' + (k === n ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label><button type="button" id="eh-more-new">New set</button><button type="button" id="eh-more-print">Print</button><button type="button" id="eh-more-reveal">Reveal all</button></div></div>'];
      r.list.forEach(function (p, i) {
        var res = p.res;
        h.push('<div class="eh-prob" data-i="' + i + '"><div class="eh-prob-q"><span class="eh-prob-n">' + (i + 1) + '</span><span class="eh-prob-goal">' + esc(gl) + ':</span><span class="pp-sheet eh-prob-text">' + P.inline(EH.intent(p.src).src.replace(/\*/g, '·')) + '</span></div>' +
          '<div class="eh-prob-btns"><button type="button" data-show="steps">Show how to solve</button><button type="button" data-show="ans">Show answer</button>' + (EH.graphFor(res) ? '<button type="button" data-show="graph">Show graph</button>' : '') + '<button type="button" data-open="1">Open in helper</button></div>' +
          '<div class="eh-prob-ans" hidden>' + answerHtml(res) + '</div>' +
          '<div class="eh-prob-steps" hidden>' + stepsHtml(res.steps) + explainHtml(res) + '</div>' +
          '<div class="eh-prob-graph" hidden></div></div>');
      });
      more.innerHTML = h.join('');
      more._list = r.list;
      $('eh-more-new').onclick = function () { moreRun(+$('eh-more-n').value); };
      $('eh-more-n').onchange = function () { moreRun(+this.value); };
      $('eh-more-reveal').onclick = function () { more.querySelectorAll('.eh-prob-ans,.eh-prob-steps').forEach(function (d) { d.hidden = false; }); };
      $('eh-more-print').onclick = function () { printMore(r, gl); };
      more.scrollIntoView({ block: 'nearest' });
    }, 30);
  }
  if (more) more.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var card = b.closest('.eh-prob'); if (!card) return;
    var p = more._list[+card.getAttribute('data-i')];
    var which = b.getAttribute('data-show');
    if (b.getAttribute('data-open')) { input.value = EH.intent(p.src).src; input.dispatchEvent(new Event('input')); goalSel.value = p.res.goal; if (window.EHrun) window.EHrun(); root.scrollIntoView({ behavior: 'smooth' }); return; }
    var box = card.querySelector(which === 'ans' ? '.eh-prob-ans' : which === 'steps' ? '.eh-prob-steps' : '.eh-prob-graph');
    if (which === 'graph' && !box.innerHTML) box.innerHTML = visualHtml(p.res);
    box.hidden = !box.hidden;
    b.textContent = (box.hidden ? 'Show ' : 'Hide ') + (which === 'ans' ? 'answer' : which === 'steps' ? 'how to solve' : 'graph');
  });
  if (btnMore) btnMore.addEventListener('click', function () { moreRun(5); });
}
function printMore(r, gl) {
  var css = Array.prototype.map.call(document.querySelectorAll('link[href*="paper.css"]'), function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
  var probs = r.list.map(function (p, i) { return '<div class="pq"><b>' + (i + 1) + '.</b> <span class="pp-sheet">' + P.inline(EH.intent(p.src).src) + '</span><div style="height:7rem"></div></div>'; }).join('');
  var key = r.list.map(function (p, i) { return '<div class="pk"><b>' + (i + 1) + '.</b> ' + answerHtml(p.res) + stepsHtml(p.res.steps) + '</div>'; }).join('');
  var w = window.open('', '_blank'); if (!w) return;
  w.document.write('<!doctype html><html class="pp-on"><head><meta charset="utf-8"><title>Practice: ' + esc(gl) + '</title>' + css + '<style>body{font-family:Georgia,serif;margin:1.2rem;color:#000}.pq{margin:.6rem 0;break-inside:avoid}.pk{break-inside:avoid;margin:.8rem 0}h1{font-size:1.3rem}.key{break-before:page}.eh-pnum{display:inline-block;min-width:1.4em;font-weight:700}.eh-psteps{list-style:none;padding:0}.eh-pnote{font-size:.9rem;color:#444}</style></head><body><h1>Practice: ' + esc(gl) + '</h1><p>Name: ____________________</p>' + probs + '<div class="key"><h1>Answer key</h1>' + key + '</div><script>setTimeout(function(){print()},400)<\/script></body></html>');
  w.document.close();
}

/* ---------------- Graph → Equation practice ---------------- */
var gp = $('graph-practice');
if (gp) {
  var host = $('gp-host'), famSel = $('gp-family'), lvlSel = $('gp-level');
  Object.keys(EH.GP_FAMILIES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = EH.GP_FAMILIES[k]; famSel.appendChild(o); });
  var cur = null, score = { right: 0, tries: 0 };
  try { var sv = JSON.parse(localStorage.getItem('precalc-gp-score') || 'null'); if (sv) score = sv; } catch (e) {}
  function saveScore() { try { localStorage.setItem('precalc-gp-score', JSON.stringify(score)); } catch (e) {} $('gp-score').textContent = score.right + ' correct out of ' + score.tries + ' tries'; }
  function draw(showKey) {
    var spec = { fns: [{ f: cur.f }], win: cur.win, pi: cur.pi, xstepPi: cur.xstepPi, ystep: cur.ystep, vas: cur.vas || [], has: cur.has || [], hlines: showKey ? (cur.hlines || []) : [], points: showKey ? cur.key.map(function (k) { return { x: k.x, y: k.y }; }) : [], aria: 'Graph to write the equation for', seed: 99 };
    $('gp-graph').innerHTML = Graph.svg(spec);
  }
  function fresh() {
    cur = EH.graphProblem(famSel.value, +lvlSel.value);
    host.querySelector('#gp-form').innerHTML = 'Use the form&nbsp; <span class="pp-sheet gp-formtxt">' + P.inline(cur.form) + '</span>' + (cur.pi ? '&nbsp; (x-axis marked in multiples of π)' : '');
    $('gp-answer').value = ''; $('gp-msg').innerHTML = ''; $('gp-msg').className = 'gp-msg';
    $('gp-sol').hidden = true; $('gp-sol').innerHTML = ''; $('gp-hint').hidden = true;
    $('gp-keys').setAttribute('aria-pressed', 'false');
    draw(false);
  }
  $('gp-new').addEventListener('click', fresh);
  famSel.addEventListener('change', fresh); lvlSel.addEventListener('change', fresh);
  $('gp-keys').addEventListener('click', function () { var on = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', on); draw(on); });
  $('gp-hint-btn').addEventListener('click', function () { var hb = $('gp-hint'); hb.innerHTML = '<b>Hint.</b> ' + esc(cur.hint); hb.hidden = !hb.hidden; });
  $('gp-show').addEventListener('click', function () { var s = $('gp-sol'); if (!s.innerHTML) s.innerHTML = '<div class="move">' + esc(cur.solution) + '</div>'; s.hidden = !s.hidden; P.enhance(s); });
  function check() {
    var r = EH.checkGraphAnswer(cur, $('gp-answer').value);
    if (window.Progress && cur._rec !== $('gp-answer').value && $('gp-answer').value.trim()) { cur._rec = $('gp-answer').value; Progress.record('graph', 'Graph → equation: ' + cur.famName, r.ok, { eq: cur.eq }); }
    score.tries++; if (r.ok) score.right++; saveScore();
    var m = $('gp-msg');
    m.className = 'gp-msg ' + (r.ok ? 'gp-ok' : 'gp-no');
    var mine = '';
    try { var s = $('gp-answer').value.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, ''); mine = s ? '<div class="pp-sheet gp-mine">y = ' + P.inline(EH.txt(EH.parse(s))) + '</div>' : ''; } catch (e) {}
    m.innerHTML = mine + esc(r.msg) + (r.ok ? ' One answer in standard form: <span class="pp-sheet">' + P.inline(cur.eq) + '</span>' : '');
    if (!r.ok) {
      /* overlay the student's guess in red */
      try {
        var ast = EH.parse($('gp-answer').value.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=\s*/i, ''));
        $('gp-graph').innerHTML = Graph.svg({ fns: [{ f: cur.f, cls: 'gp-c0' }, { f: function (x) { return EH.fval(ast, { x: x }); }, cls: 'gp-c1' }], win: cur.win, pi: cur.pi, xstepPi: cur.xstepPi, ystep: cur.ystep, vas: cur.vas || [], has: cur.has || [], seed: 99, legend: [{ label: 'the graph', cls: 'gp-c0' }, { label: 'your equation', cls: 'gp-c1' }] });
      } catch (e) {}
    }
  }
  $('gp-check').addEventListener('click', check);
  $('gp-answer').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
  saveScore(); fresh();
}

/* ---------------- Memory Sheet ---------------- */
function tbl(head, rows, cls) {
  return '<div class="pp-tablewrap"><table class="pp-table pp-grid ' + (cls || '') + '"><tr>' + head.map(function (c) { return '<th>' + P.inline(c) + '</th>'; }).join('') + '</tr>' +
    rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + P.inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
}
function lines(arr) { return arr.map(function (l) { return typeof l === 'string' ? '<div class="pp-line">' + P.inline(l) + '</div>' : '<div class="ms-note">' + esc(l.note) + '</div>'; }).join(''); }
function ol(arr, start) { return '<ol class="ms-ol" start="' + (start || 1) + '">' + arr.map(function (l) { return '<li>' + P.inline(l) + '</li>'; }).join('') + '</ol>'; }
var MS = [
  { t: 'Trig ratios: write this table first', wide: 1, h: tbl(['', 'unit circle (r = 1)', 'any point (x, y)', 'right triangle', 'undefined when', 'positive in'], [
    ['sin θ', 'y', 'y/r', 'opp/hyp', 'never', 'QI, QII'],
    ['cos θ', 'x', 'x/r', 'adj/hyp', 'never', 'QI, QIV'],
    ['tan θ', 'y/x', 'y/x', 'opp/adj', 'x = 0:  θ = π/2, 3π/2', 'QI, QIII'],
    ['sec θ', '1/x', 'r/x', 'hyp/adj', 'x = 0:  θ = π/2, 3π/2', 'QI, QIV'],
    ['cot θ', 'x/y', 'x/y', 'adj/opp', 'y = 0:  θ = 0 (2π), π', 'QI, QIII'],
    ['csc θ', '1/y', 'r/y', 'hyp/opp', 'y = 0:  θ = 0 (2π), π', 'QI, QII']]) +
    lines(['r = √(x² + y²)   (always positive)', { note: 'SOH CAH TOA. Reciprocals pair up: sin ↔ csc, cos ↔ sec, tan ↔ cot (each pair has the same sign and the same "undefined" spots as its partner\'s zeros). Signs: All Students Take Calculus (QI all, QII sin, QIII tan, QIV cos).' }]) },
  { t: 'Special angles (first quadrant)', h: tbl(['θ', '0', 'π/6 (30°)', 'π/4 (45°)', 'π/3 (60°)', 'π/2 (90°)'], [
    ['sin θ', '0', '1/2', '√2/2', '√3/2', '1'], ['cos θ', '1', '√3/2', '√2/2', '1/2', '0'], ['tan θ', '0', '√3/3', '1', '√3', 'UND']]) +
    lines([{ note: 'Trick: sin counts up √0/2, √1/2, √2/2, √3/2, √4/2; cos is the same list backwards. tan = sin/cos.' }]) },
  { t: 'Reciprocal & quotient identities', h: lines(['csc θ = 1/(sin θ)        sin θ = 1/(csc θ)', 'sec θ = 1/(cos θ)        cos θ = 1/(sec θ)', 'cot θ = 1/(tan θ)        tan θ = 1/(cot θ)', 'tan θ = (sin θ)/(cos θ)        cot θ = (cos θ)/(sin θ)']) },
  { t: 'Pythagorean identities', h: lines(['sin²θ + cos²θ = 1', '1 + tan²θ = sec²θ', '1 + cot²θ = csc²θ', { note: 'Rearranged (these are what you actually spot in problems):' }, 'sin²θ = 1 - cos²θ        cos²θ = 1 - sin²θ', 'tan²θ = sec²θ - 1        cot²θ = csc²θ - 1', 'sec²θ - tan²θ = 1        csc²θ - cot²θ = 1', { note: 'Get #2 and #3 by dividing #1 by cos²θ or by sin²θ.' }]) },
  { t: 'Even / odd (negative angle) identities', h: lines(['sin(-θ) = -sin θ        csc(-θ) = -csc θ', 'cos(-θ) = cos θ          sec(-θ) = sec θ', 'tan(-θ) = -tan θ        cot(-θ) = -cot θ', { note: 'Only cosine and secant are EVEN (the minus disappears). The other four are ODD (the minus comes out front).' }]) },
  { t: 'Cofunction identities', h: lines(['sin(π/2 - θ) = cos θ        cos(π/2 - θ) = sin θ', 'tan(π/2 - θ) = cot θ        cot(π/2 - θ) = tan θ', 'sec(π/2 - θ) = csc θ        csc(π/2 - θ) = sec θ', { note: 'In degrees: 90° - θ. A function of an angle equals its co-function of the complement.' }]) },
  { t: 'Sum & difference formulas', h: lines(['sin(A ± B) = sin A cos B ± cos A sin B', 'cos(A ± B) = cos A cos B ∓ sin A sin B', 'tan(A ± B) = (tan A ± tan B)/(1 ∓ tan A tan B)', { note: 'Cosine flips the sign (∓). Sine keeps it and mixes sin·cos.' }]) },
  { t: 'Double-angle, half-angle, power-reducing', h: lines(['sin(2θ) = 2 sin θ cos θ', 'cos(2θ) = cos²θ - sin²θ = 1 - 2sin²θ = 2cos²θ - 1', 'tan(2θ) = (2tan θ)/(1 - tan²θ)', 'sin²θ = (1 - cos(2θ))/2        cos²θ = (1 + cos(2θ))/2', 'sin(θ/2) = ±√((1 - cos θ)/2)        cos(θ/2) = ±√((1 + cos θ)/2)', 'tan(θ/2) = (1 - cos θ)/(sin θ) = (sin θ)/(1 + cos θ)', { note: 'Half-angle sign: decided by the quadrant of θ/2, not θ.' }]) },
  { t: 'Inverse trig: domains and ranges', wide: 1, h: tbl(['function', 'input (domain)', 'output (range)', 'output quadrants'], [
    ['sin⁻¹ x', '-1 ≤ x ≤ 1', '[-π/2, π/2]', 'QIV, QI'], ['cos⁻¹ x', '-1 ≤ x ≤ 1', '[0, π]', 'QI, QII'], ['tan⁻¹ x', 'all real numbers', '(-π/2, π/2)', 'QIV, QI'],
    ['cot⁻¹ x', 'all real numbers', '(0, π)', 'QI, QII'], ['sec⁻¹ x', '|x| ≥ 1', '[0, π/2) ∪ (π/2, π]', 'QI, QII'], ['csc⁻¹ x', '|x| ≥ 1', '[-π/2, 0) ∪ (0, π/2]', 'QIV, QI']]) +
    lines([{ note: 'The answer to an inverse trig function is an ANGLE, and it must come from this range. sin⁻¹ x is NOT 1/sin x (that is csc x).' }]) },
  { t: 'Inverse trig identities (all of them, numbered)', wide: 1, h:
    '<div class="ms-cols"><div><div class="ms-note">Cancellation (watch the restrictions)</div>' + ol(['sin(sin⁻¹ x) = x   for -1 ≤ x ≤ 1', 'sin⁻¹(sin x) = x   for -π/2 ≤ x ≤ π/2', 'cos(cos⁻¹ x) = x   for -1 ≤ x ≤ 1', 'cos⁻¹(cos x) = x   for 0 ≤ x ≤ π', 'tan(tan⁻¹ x) = x   for all x', 'tan⁻¹(tan x) = x   for -π/2 < x < π/2'], 1) +
    '<div class="ms-note">Negative inputs</div>' + ol(['sin⁻¹(-x) = -sin⁻¹ x', 'cos⁻¹(-x) = π - cos⁻¹ x', 'tan⁻¹(-x) = -tan⁻¹ x', 'csc⁻¹(-x) = -csc⁻¹ x', 'sec⁻¹(-x) = π - sec⁻¹ x', 'cot⁻¹(-x) = π - cot⁻¹ x'], 7) + '</div><div>' +
    '<div class="ms-note">Reciprocal relations</div>' + ol(['csc⁻¹ x = sin⁻¹(1/x)   for |x| ≥ 1', 'sec⁻¹ x = cos⁻¹(1/x)   for |x| ≥ 1', 'cot⁻¹ x = tan⁻¹(1/x)   for x > 0  (π + tan⁻¹(1/x) for x < 0)'], 13) +
    '<div class="ms-note">Complementary pairs</div>' + ol(['sin⁻¹ x + cos⁻¹ x = π/2', 'tan⁻¹ x + cot⁻¹ x = π/2', 'sec⁻¹ x + csc⁻¹ x = π/2'], 16) +
    '<div class="ms-note">Compositions (draw the triangle)</div>' + ol(['sin(cos⁻¹ x) = √(1 - x²)', 'cos(sin⁻¹ x) = √(1 - x²)', 'tan(sin⁻¹ x) = x/√(1 - x²)', 'sin(tan⁻¹ x) = x/√(1 + x²)', 'cos(tan⁻¹ x) = 1/√(1 + x²)', 'tan(cos⁻¹ x) = √(1 - x²)/x'], 19) + '</div></div>' +
    lines([{ note: 'Memory hook for negatives: sin, tan, csc (odd) pass the minus outside; cos, sec, cot give "π minus".' }]) },
  { t: 'Log properties', h: lines(['log_b x = y   means   b^y = x', 'log_b 1 = 0        log_b b = 1', 'log_b(b^x) = x        b^(log_b x) = x', 'log_b(MN) = log_b M + log_b N', 'log_b(M/N) = log_b M - log_b N', 'log_b(M^p) = p·log_b M', 'log_b(1/M) = -log_b M', 'log_b a = (log a)/(log b) = (ln a)/(ln b)', 'log_b M = log_b N   ⇒   M = N', 'ln x = log_e x        ln e = 1        e^(ln x) = x',
    { note: 'Domain: the input must be > 0; the base b > 0 and b ≠ 1.' }, { note: 'Traps: log(M + N) does NOT split.  (log M)/(log N) ≠ log(M/N).  (log x)² ≠ 2 log x.' }]) },
  { t: 'Exponent rules', h: lines(['x^m · x^n = x^(m + n)        x^m/x^n = x^(m - n)', '(x^m)^n = x^(mn)        (xy)^n = x^n y^n        (x/y)^n = x^n/y^n', 'x^0 = 1        x^(-n) = 1/x^n', 'x^(m/n) = ⁿ√(x^m) = (ⁿ√x)^m'.replace(/ⁿ√/g, '√'), { note: 'Trap: (a + b)² = a² + 2ab + b², never a² + b².' }]) },
  { t: 'Domain rules: what breaks a function', wide: 1, h: tbl(['you see', 'rule', 'example'], [
    ['a fraction A/B', 'B ≠ 0', '1/(x - 3):  x ≠ 3'],
    ['an even root √A', 'A ≥ 0', '√(x - 2):  x ≥ 2'],
    ['an even root in a denominator  1/√A', 'A > 0   (not ≥: zero would make the bottom 0)', '1/√(x - 2):  x > 2'],
    ['a log  log_b A', 'A > 0', 'ln(x + 1):  x > -1'],
    ['tan x  or  sec x', 'x ≠ π/2 + πn  (cos x ≠ 0)', 'tan(2x):  2x ≠ π/2 + πn'],
    ['cot x  or  csc x', 'x ≠ πn  (sin x ≠ 0)', 'csc x:  x ≠ 0, π, 2π…'],
    ['sin⁻¹ A  or  cos⁻¹ A', '-1 ≤ A ≤ 1', 'sin⁻¹(2x):  -1/2 ≤ x ≤ 1/2'],
    ['an odd root ∛A, a polynomial, b^x, sin, cos', 'no restriction: all real numbers', '∛(x - 5):  (-∞, ∞)'],
    ['several of these at once', 'ALL conditions must hold: intersect', '√x/(x - 4):  [0, 4) ∪ (4, ∞)']]) },
  { t: 'Parent ranges', h: tbl(['parent', 'range'], [['x², |x|, √x', '[0, ∞)'], ['x, x³, ∛x, ln x, tan x', '(-∞, ∞)'], ['b^x', '(0, ∞)'], ['1/x', 'y ≠ 0'], ['sin x, cos x', '[-1, 1]'], ['sec x, csc x', '(-∞, -1] ∪ [1, ∞)']]) + lines([{ note: 'Then: stretch by |a|, flip if a < 0, shift by k.' }]) },
  { t: 'Reading a sinusoid', h: lines(['y = A sin(B(x - C)) + D', 'amplitude = |A|        midline  y = D', 'period = 2π/|B|   (tan, cot: π/|B|)', 'phase shift = C   (right if C > 0)', 'max = D + |A|        min = D - |A|', { note: 'Factor B out first: sin(2x - π) = sin(2(x - π/2)), so the shift is π/2, not π.' }]) },
  { t: 'Angles', h: lines(['degrees → radians: × π/180°        radians → degrees: × 180°/π', 'coterminal:  θ ± 360°n   or   θ ± 2πn', 'reference angle:  QI θ   QII 180° - θ   QIII θ - 180°   QIV 360° - θ', 'arc length s = rθ        sector area A = (1/2)r²θ   (θ in radians)']) }
];
/* hand-drawn unit-circle pictures: which angles each inverse function can return */
var SPECIAL = [[0, '0', '1', '0'], [1 / 6, 'π/6', '√3/2', '1/2'], [1 / 4, 'π/4', '√2/2', '√2/2'], [1 / 3, 'π/3', '1/2', '√3/2'], [1 / 2, 'π/2', '0', '1'],
  [2 / 3, '2π/3', '-1/2', '√3/2'], [3 / 4, '3π/4', '-√2/2', '√2/2'], [5 / 6, '5π/6', '-√3/2', '1/2'], [1, 'π', '-1', '0'],
  [-1 / 6, '-π/6', '√3/2', '-1/2'], [-1 / 4, '-π/4', '√2/2', '-√2/2'], [-1 / 3, '-π/3', '1/2', '-√3/2'], [-1 / 2, '-π/2', '0', '-1']];
function invDiagram(kind) {
  /* kind 'right': angles -π/2..π/2 (arcsin, arctan);  'top': angles 0..π (arccos) */
  var right = kind === 'right', W = right ? 300 : 440, H = right ? 440 : 260, cx = right ? 60 : 220, cy = right ? 220 : 225, R = right ? 170 : 170;
  var pts = SPECIAL.filter(function (s) { return right ? s[0] >= -0.5 && s[0] <= 0.5 : s[0] >= 0 && s[0] <= 1; });
  var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
  var a0 = right ? -Math.PI / 2 : 0, a1 = right ? Math.PI / 2 : Math.PI;
  var arc = []; for (var k = 0; k <= 60; k++) { var t = a0 + (a1 - a0) * k / 60; arc.push((cx + R * Math.cos(t)).toFixed(1) + ' ' + (cy - R * Math.sin(t)).toFixed(1)); }
  svg.push('<path class="inv-arc" d="M' + arc.join('L') + '"/>');
  svg.push('<path class="inv-axis" d="' + (right ? 'M' + cx + ' 8V' + (H - 8) + 'M' + (cx - 30) + ' ' + cy + 'H' + (W - 8) : 'M8 ' + cy + 'H' + (W - 8) + 'M' + cx + ' 10V' + (H - 6)) + '"/>');
  var labs = [];
  pts.forEach(function (s, idx) {
    var t = s[0] * Math.PI, ex = cx + R * Math.cos(t), ey = cy - R * Math.sin(t);
    svg.push('<path class="inv-ray" d="M' + cx + ' ' + cy + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '"/><circle class="inv-dot" cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="3.5"/>');
    /* the angle sits just outside its point on the circle */
    var ax = cx + R * 1.17 * Math.cos(t), ay = cy - R * 1.17 * Math.sin(t);
    labs.push('<span class="inv-ang" style="left:' + (ax / W * 100).toFixed(1) + '%;top:' + (ay / H * 100).toFixed(1) + '%">' + P.inline(s[1]) + '</span>');
  });
  svg.push('</svg>');
  var rows = pts.slice().sort(function (a, b) { return a[0] - b[0]; }).map(function (s) {
    var r = [s[1], '(' + s[2] + ', ' + s[3] + ')'];
    if (right) { var tv = Math.abs(s[0]) === 0.5 ? 'UND' : { '0.0000': '0', '0.1667': '√3/3', '0.2500': '1', '0.3333': '√3' }[Math.abs(s[0]).toFixed(4)]; r.push(s[0] < 0 && tv !== 'UND' && tv !== '0' ? '-' + tv : tv); }
    return r;
  });
  return '<div class="inv-dia inv-' + kind + '" style="aspect-ratio:' + W + '/' + H + '">' + svg.join('') + labs.join('') + '</div>' +
    tbl(right ? ['angle', '(cos, sin)', 'tan'] : ['angle', '(cos, sin)'], rows, 'inv-tbl');
}
var INV_CARD = '<div class="inv-cols"><div><div class="pp-line">' + P.inline('arcsin x  (or sin⁻¹x)') + '</div><div class="pp-line inv-sub">' + P.inline('returns an angle in [-π/2, π/2]') + '</div><div class="pp-line">' + P.inline('arctan x  (or tan⁻¹x)') + '</div><div class="pp-line inv-sub">' + P.inline('returns an angle in (-π/2, π/2)') + '</div>' +
  invDiagram('right') + '<div class="ms-note">Quadrants I and IV only: the right half of the circle. Read the angle whose y-coordinate (sine) or y/x (tangent) matches. arctan never reaches ±π/2 (tan is undefined there).</div></div>' +
  '<div><div class="pp-line">' + P.inline('arccos x  (or cos⁻¹x)') + '</div><div class="pp-line inv-sub">' + P.inline('returns an angle in [0, π]') + '</div>' + invDiagram('top') +
  '<div class="ms-note">Quadrants I and II only: the top half. Read the angle whose x-coordinate (cosine) matches. A negative input lands in Quadrant II, never at a negative angle.</div>' +
  '<div class="inv-box pp-sheet">' + lines(['tan(π/6) = √3/3', 'tan(π/4) = 1', 'tan(π/3) = √3']) + '</div><div class="ms-note">Box this one: arctan questions are these read backwards (arctan(√3/3) = π/6, arctan(1) = π/4, arctan(√3) = π/3), with a minus sign for negative inputs.</div></div></div>';
var invAt = MS.findIndex(function (c) { return /^Inverse trig: domains/.test(c.t); });
MS.splice(invAt < 0 ? MS.length : invAt, 0,
  { t: 'Inverse trig functions: the angle each one returns', wide: 1, h: INV_CARD },
  { t: 'Tangent of the special angles (box this)', h: '<div class="inv-box pp-sheet">' + lines(['tan(π/6) = √3/3', 'tan(π/4) = 1', 'tan(π/3) = √3']) + '</div>' + lines([{ note: 'Why: tan = sin/cos. At π/6: (1/2)/(√3/2) = 1/√3 = √3/3. At π/4: sin = cos, so 1. At π/3: (√3/2)/(1/2) = √3.' }]) });
var ms = $('memory-sheet-grid');
if (ms) {
  ms.innerHTML = MS.map(function (c) { return '<div class="pp-card ms-card' + (c.wide ? ' ms-wide' : '') + '"><h3>' + esc(c.t) + '</h3>' + c.h + '</div>'; }).join('');
}

/* ---------------- Worksheet drill: "Write all the requested identities" (the class's Question 1) ---------------- */
var WS = [
  { id: 'a', title: 'a) Reciprocal Identities', kind: 'recip', items: [['sin x', '1/(csc x)'], ['csc x', '1/(sin x)'], ['cos x', '1/(sec x)'], ['sec x', '1/(cos x)'], ['tan x', '1/(cot x)'], ['cot x', '1/(tan x)']] },
  { id: 'b', title: 'b) Quotient Identities', kind: 'quot', items: [['tan x', '(sin x)/(cos x)'], ['cot x', '(cos x)/(sin x)']] },
  { id: 'c', title: 'c) Pythagorean Identities (only the main 3, not the alternate forms)', kind: 'pyth', items: [[null, 'sin²x + cos²x = 1'], [null, '1 + tan²x = sec²x'], [null, '1 + cot²x = csc²x']] },
  { id: 'c2', title: 'c-2) Pythagorean Identities: alternate forms', kind: 'alt', items: [['sin²x', '1 - cos²x'], ['cos²x', '1 - sin²x'], ['tan²x', 'sec²x - 1'], ['cot²x', 'csc²x - 1'], ['1', 'sec²x - tan²x', 'sec'], ['1', 'csc²x - cot²x', 'csc']] },
  { id: 'd', title: 'd) Even/odd Identities', kind: 'eo', items: [['sin(-x)', '-sin x'], ['csc(-x)', '-csc x'], ['cos(-x)', 'cos x'], ['sec(-x)', 'sec x'], ['tan(-x)', '-tan x'], ['cot(-x)', '-cot x']] }
];
var PYMAIN = [
  { fam: 'sin/cos', sides: [['cos²x', 'sin²x'], ['1']] }, { fam: 'tan/sec', sides: [['1', 'tan²x'], ['sec²x']] }, { fam: 'cot/csc', sides: [['1', 'cot²x'], ['csc²x']] }
];
function terms(n, out) {      /* top-level + / − terms, as sorted text */
  out = out || [];
  if (n.t === 'add') { terms(n.a, out); terms(n.b, out); }
  else if (n.t === 'sub') { terms(n.a, out); out.push('-' + EH.ttxt(n.b, 'x')); }
  else out.push(EH.ttxt(n, 'x').replace(/\s/g, ''));
  return out.map(function (t) { return t.replace(/\s/g, ''); }).sort();
}
function isMainPy(raw, fam) {
  try {
    var a = EH.parse(raw); if (a.t !== 'rel') return false;
    var L = terms(a.l), R = terms(a.r), m = PYMAIN[fam], same = function (x, y) { return x.join('|') === y.join('|'); };
    return (same(L, m.sides[0]) && same(R, m.sides[1])) || (same(R, m.sides[0]) && same(L, m.sides[1]));
  } catch (e) { return false; }
}
function wsParse(raw, lhs) {
  var s = String(raw || '').trim();
  if (lhs) { var pre = new RegExp('^\\s*' + lhs.replace(/[()]/g, '\\$&').replace(/\s/g, '\\s*') + '\\s*=\\s*'); s = s.replace(pre, ''); }
  return EH.parse(s);
}
function notationHint(raw) {
  if (/(sin|cos|tan|sec|csc|cot)\s*\(?\s*x\s*\)?\s*(\^\s*2|²)/i.test(raw) && !/(sin|cos|tan|sec|csc|cot)\s*(\^\s*2|²)/i.test(raw)) return ' Notation: "sin x²" means sine of x². Write the square on the function: sin²x (type sin^2 x).';
  if (/(sin|cos|tan|sec|csc|cot)\s*-\s*1/i.test(raw)) return ' Careful: sin⁻¹ is inverse sine, not 1/sin.';
  return '';
}
function checkWS(sec, it, raw, all) {
  if (!String(raw || '').trim()) return { s: 'empty' };
  var ast;
  try {
    if (sec.kind === 'pyth') { ast = EH.parse(raw); if (ast.t !== 'rel' || ast.op !== '=') return { s: 'bad', msg: 'Write the whole identity with an = sign.' }; }
    else ast = wsParse(raw, it[0]);
  } catch (e) { return { s: 'bad', msg: e.message }; }
  var hint = notationHint(raw);
  if (sec.kind === 'pyth') {
    if (EH.vars(ast).join('') !== 'x' || !EH.isIdentity(ast.l, ast.r, 'x')) return { s: 'bad', msg: 'Not an identity: the two sides are not equal for every x.' + hint };
    var L = terms(ast.l), R = terms(ast.r);
    var fam = /tan|sec/.test(raw) ? 1 : /cot|csc/.test(raw) ? 2 : 0;
    var main = PYMAIN[fam], same = function (a, b) { return a.join('|') === b.join('|'); };
    var isMain = (same(L, main.sides[0]) && same(R, main.sides[1])) || (same(R, main.sides[0]) && same(L, main.sides[1]));
    if (!isMain) return { s: 'warn', msg: 'True, but this is an alternate form. The main one is ' + WS[2].items[fam][1] + ' (alternate forms go in part c-2).' };
    var dup = all.filter(function (o) { return o !== raw && o && ((/tan|sec/.test(o) ? 1 : /cot|csc/.test(o) ? 2 : 0) === fam) && isMainPy(o, fam); }).length;
    if (dup) return { s: 'warn', msg: 'True, but another box already has the ' + main.fam + ' identity. Each box needs a different one.' };
    return { s: 'ok', fam: fam };
  }
  var lhs = EH.parse(it[0].replace(/²x/g, '(x)^2').replace(/^(\w+) x$/, '$1(x)'));
  if (!EH.isIdentity(lhs, ast, 'x')) return { s: 'bad', msg: 'Not equal to ' + it[0] + ' for every x.' + hint };
  var trig = function (n) { return n && n.t === 'fn' && /^(sin|cos|tan|sec|csc|cot)$/.test(n.name) && n.a.t === 'var'; };
  if (sec.kind === 'recip' && !(ast.t === 'div' && ast.a.t === 'num' && ast.a.q.isOne() && trig(ast.b)))
    return { s: 'warn', msg: 'True, but this section wants the RECIPROCAL form: 1 over one trig function, ' + it[1].replace(/[()]/g, '') + '.' };
  if (sec.kind === 'quot' && !(ast.t === 'div' && trig(ast.a) && trig(ast.b)))
    return { s: 'warn', msg: 'True, but this section wants the QUOTIENT form: one trig function over another.' };
  if (sec.kind === 'eo') {
    var core = ast.t === 'neg' ? ast.a : ast, nm = it[0].slice(0, 3);
    if (!(trig(core) && core.name === nm)) return { s: 'warn', msg: 'True, but write it with the same function: ' + it[1] + '.' };
  }
  if (sec.kind === 'alt') {
    var avoid = it[2] ? it[2] : it[0].slice(0, 3);
    if (it[0] !== '1' && new RegExp(avoid).test(EH.ttxt(ast, 'x'))) return { s: 'warn', msg: 'True, but the alternate form rewrites ' + it[0] + ' using the OTHER function: ' + it[1] + '.' };
    if (it[0] === '1' && !new RegExp(avoid).test(EH.ttxt(ast, 'x'))) return { s: 'warn', msg: 'True, but this line should use ' + avoid + ': ' + it[1] + '.' };
  }
  return { s: 'ok' };
}
var msHost = $('memory-sheet-grid');
if (msHost && !$('ws-quiz')) {
  var q = document.createElement('div');
  q.id = 'ws-quiz'; q.className = 'pp-card ws-card';
  var html = ['<h3>Practice: Question 1 · Write all the requested identities. <i>Use proper notation.</i></h3>',
    '<p class="ms-note">The same page you get in class. Type the right-hand side in each box (for the Pythagorean boxes type the whole identity). Type powers as <code>sin^2 x</code> and fractions as <code>1/csc x</code>. Each answer must be in the form its section asks for.</p>'];
  var count = 0;
  WS.forEach(function (sec, si) {
    html.push('<div class="ws-sec"><div class="ws-title">' + esc(sec.title) + '</div><div class="ws-grid' + (sec.kind === 'pyth' ? ' ws-full' : '') + '">');
    sec.items.forEach(function (it, ii) {
      count++;
      var id = 'ws-' + si + '-' + ii;
      html.push('<div class="ws-item" data-s="' + si + '" data-i="' + ii + '">' + (it[0] ? '<label for="' + id + '" class="ws-lhs pp-sheet">' + P.inline(it[0]) + ' =</label>' : '') +
        '<input id="' + id + '" class="ws-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="' + esc((it[0] ? it[0] + ' equals' : 'Pythagorean identity ' + (ii + 1))) + '"/>' +
        '<span class="ws-prev pp-sheet" aria-hidden="true"></span><div class="ws-fb" aria-live="polite"></div><div class="ws-ans pp-sheet" hidden>' + P.inline(it[0] ? it[0] + ' = ' + it[1] : it[1]) + '</div></div>');
    });
    html.push('</div></div>');
  });
  html.push('<div class="ws-tools"><button type="button" id="ws-check" class="eh-go">Check my answers</button><button type="button" id="ws-show">Show answers</button><button type="button" id="ws-clear">Clear</button><button type="button" id="ws-print">Print blank page</button><span id="ws-score" class="ws-score" aria-live="polite"></span></div>');
  q.innerHTML = html.join('');
  msHost.parentNode.insertBefore(q, msHost);
  var inputs = q.querySelectorAll('.ws-in');
  function itemOf(inp) { var w = inp.closest('.ws-item'); return { w: w, sec: WS[+w.getAttribute('data-s')], it: WS[+w.getAttribute('data-s')].items[+w.getAttribute('data-i')] }; }
  inputs.forEach(function (inp) {
    inp.addEventListener('input', function () {
      var o = itemOf(inp), pv = o.w.querySelector('.ws-prev');
      o.w.classList.remove('ws-ok', 'ws-bad', 'ws-warn'); o.w.querySelector('.ws-fb').textContent = '';
      try { var a = o.sec.kind === 'pyth' ? EH.parse(inp.value) : wsParse(inp.value, o.it[0]); pv.innerHTML = inp.value.trim() ? P.inline(a.t === 'rel' ? EH.ttxt(a.l, 'x') + ' = ' + EH.ttxt(a.r, 'x') : EH.ttxt(a, 'x')) : ''; }
      catch (e) { pv.innerHTML = ''; }
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var nx = inputs[Array.prototype.indexOf.call(inputs, inp) + 1]; if (nx) nx.focus(); else $('ws-check').click(); } });
  });
  $('ws-check').addEventListener('click', function () {
    var ok = 0, pyAll = Array.prototype.filter.call(inputs, function (i) { return itemOf(i).sec.kind === 'pyth'; }).map(function (i) { return i.value; });
    inputs.forEach(function (inp) {
      var o = itemOf(inp), r = checkWS(o.sec, o.it, inp.value, pyAll);
      if (window.Progress && r.s !== 'empty' && inp.dataset.rec !== inp.value) {
        inp.dataset.rec = inp.value;
        Progress.record('identities', { recip: 'Reciprocal identities', quot: 'Quotient identities', pyth: 'Pythagorean identities', alt: 'Pythagorean alternate forms', eo: 'Even/odd identities' }[o.sec.kind], r.s === 'ok', { box: o.it[0] || 'pythagorean' });
      }
      o.w.classList.remove('ws-ok', 'ws-bad', 'ws-warn');
      if (r.s === 'ok') { ok++; o.w.classList.add('ws-ok'); }
      else if (r.s === 'warn') o.w.classList.add('ws-warn');
      else if (r.s === 'bad') o.w.classList.add('ws-bad');
      o.w.querySelector('.ws-fb').textContent = r.s === 'ok' ? '✓' : r.s === 'empty' ? 'Blank' : r.msg;
    });
    $('ws-score').textContent = ok + ' / ' + count + ' correct' + (ok === count ? '. Perfect! Now try it on paper from memory.' : '');
  });
  $('ws-show').addEventListener('click', function () { var hid = q.querySelector('.ws-ans').hidden; q.querySelectorAll('.ws-ans').forEach(function (a) { a.hidden = !hid; }); this.textContent = hid ? 'Hide answers' : 'Show answers'; });
  $('ws-clear').addEventListener('click', function () { inputs.forEach(function (i) { i.value = ''; i.dispatchEvent(new Event('input')); }); $('ws-score').textContent = ''; });
  $('ws-print').addEventListener('click', function () {
    var css = Array.prototype.map.call(document.querySelectorAll('link[href*="paper.css"]'), function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
    var body = WS.map(function (sec) {
      return '<h3>' + esc(sec.title) + '</h3>' + (sec.kind === 'pyth' ? '<table class="wsp-box">' + sec.items.map(function () { return '<tr><td></td></tr>'; }).join('') + '</table>' :
        '<div class="wsp-grid">' + sec.items.map(function (it) { return '<div class="wsp-item">' + P.inline(it[0]) + ' =</div>'; }).join('') + '</div>');
    }).join('');
    var w = window.open('', '_blank'); if (!w) return;
    w.document.write('<!doctype html><html class="pp-on"><head><meta charset="utf-8"><title>Question 1: identities</title>' + css + '<style>body{font-family:Georgia,serif;margin:.7in;color:#000}h2{font-size:1.1rem}h3{font-size:1rem;text-decoration:underline;margin:1.4rem 0 .4rem}.wsp-grid{display:grid;grid-template-columns:1fr 1fr;row-gap:2.6rem;column-gap:2rem;margin-left:1.5rem}.wsp-item .pp-t,.wsp-item{font-family:Georgia,serif;transform:none;color:#000;font-size:1.05rem}.wsp-box{width:100%;border-collapse:collapse}.wsp-box td{border:1px solid #000;height:3rem}</style></head><body><h2>Question 1</h2><p>Write <b>all</b> the requested identities. <b><i>Use proper notation.</i></b></p>' + body + '<script>setTimeout(function(){print()},400)<\/script></body></html>');
    w.document.close();
  });
}

/* ---------------- Drill: Inverse Trigonometric Functions (Part A + True/False) ---------------- */
var INV_RANGE = { arcsin: '[-π/2, π/2]', arccos: '[0, π]', arctan: '(-π/2, π/2)' };
var INV_CLASS = {
  eval: [['arcsin', '1/2'], ['arcsin', '-√3/2'], ['arcsin', '0'], ['arccos', '1'], ['arccos', '-1/2'], ['arccos', '0'], ['arctan', '1'], ['arctan', '-1'], ['arctan', '√3'], ['arcsin', '√3/2'], ['arccos', '-√2/2'], ['arctan', '-√3/3']],
  tf: [['arcsin', '√3/2', '2π/3'], ['arccos', '1/2', '-π/3'], ['arctan', '1', '5π/4']]
};
var INV_VALS = { arcsin: ['0', '1/2', '-1/2', '√2/2', '-√2/2', '√3/2', '-√3/2', '1', '-1'], arccos: ['0', '1/2', '-1/2', '√2/2', '-√2/2', '√3/2', '-√3/2', '1', '-1'], arctan: ['0', '1', '-1', '√3', '-√3', '√3/3', '-√3/3'] };
function invExact(fn, x) { return EH.evaluate(EH.parse(fn + '(' + x + ')')); }
function invWrong(fn, x) {        /* a tempting wrong angle: right ratio, wrong quadrant */
  var r = invExact(fn, x), rp = r.ex.piMultiple() || EH.Q.ZERO;
  var w = fn === 'arcsin' ? EH.q(1).sub(rp) : fn === 'arccos' ? rp.neg() : rp.add(EH.q(1));
  if (w.eq(rp)) w = rp.add(EH.q(2));
  return EH.piText(w);
}
function invSet(classSheet) {
  if (classSheet) return { eval: INV_CLASS.eval.slice(), tf: INV_CLASS.tf.slice() };
  var fns = ['arcsin', 'arccos', 'arctan'], ev = [], tf = [], seen = {};
  while (ev.length < 12) {
    var f = fns[ev.length % 3 === 0 ? 0 : ev.length % 3 === 1 ? 1 : 2], x = INV_VALS[f][Math.floor(Math.random() * INV_VALS[f].length)];
    if (seen[f + x]) continue; seen[f + x] = 1; ev.push([f, x]);
  }
  for (var k = 0; k < 3; k++) {
    var f2 = fns[Math.floor(Math.random() * 3)], x2 = INV_VALS[f2][Math.floor(Math.random() * INV_VALS[f2].length)];
    tf.push([f2, x2, Math.random() < 0.4 ? invExact(f2, x2).text : invWrong(f2, x2)]);
  }
  return { eval: ev, tf: tf };
}
function invCheck(fn, x, raw) {
  var s = String(raw || '').trim(); if (!s) return { s: 'empty' };
  if (/°|deg/.test(s)) return { s: 'warn', msg: 'Give the answer in radians, not degrees.' };
  var v; try { v = EH.fval(EH.parse(s)); } catch (e) { return { s: 'bad', msg: e.message }; }
  var ans = invExact(fn, x), xv = EH.fval(EH.parse(x)), base = fn.slice(3);
  if (Math.abs(v - ans.f) < 1e-9) return /\d\.\d/.test(s) ? { s: 'warn', msg: 'Right value, but give it exactly in terms of π (' + ans.text + ').' } : { s: 'ok' };
  if (Math.abs(v - ans.f) < 1e-3) return { s: 'warn', msg: 'Close decimal; give the exact answer in terms of π.' };
  var fx = Math[base](v);
  if (isFinite(fx) && Math.abs(fx - xv) < 1e-9) return { s: 'bad', msg: base + ' of your angle IS ' + x + ', but ' + fn + ' only returns angles in ' + INV_RANGE[fn] + '. Pick the angle in that interval.' };
  return { s: 'bad', msg: 'Not right: ' + base + '(' + s + ') is not ' + x + '. Find the point on the circle whose ' + (base === 'cos' ? 'x-coordinate' : base === 'sin' ? 'y-coordinate' : 'y/x') + ' is ' + x + '.' };
}
if (msHost && !$('inv-quiz')) {
  var iq = document.createElement('div');
  iq.id = 'inv-quiz'; iq.className = 'pp-card ws-card';
  var wsq = $('ws-quiz');
  (wsq ? wsq.parentNode : msHost.parentNode).insertBefore(iq, wsq ? wsq.nextSibling : msHost);
  var invCur = null;
  var drawInv = function (classSheet) {
    invCur = invSet(classSheet);
    var h = ['<h3>Practice: Inverse Trigonometric Functions</h3><p class="ms-note">Part A: evaluate, giving answers in radians (typing pi turns into π; √ as <code>sqrt</code> or √). True or False: decide, then check. ' + (classSheet ? 'These are the questions from the class sheet.' : 'New random problems of the same kinds.') + '</p>',
      '<div class="ws-title">Part A: Evaluate (give answers in radians)</div><div class="ws-grid">'];
    invCur.eval.forEach(function (p, i) {
      h.push('<div class="ws-item" data-k="e' + i + '"><label class="ws-lhs pp-sheet" for="inv-e' + i + '">' + (i + 1) + '.  ' + P.inline(p[0] + '(' + p[1] + ')') + ' =</label><input id="inv-e' + i + '" class="ws-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"/><span class="ws-prev pp-sheet" aria-hidden="true"></span><div class="ws-fb" aria-live="polite"></div><div class="ws-ans pp-sheet" hidden>' + P.inline(p[0] + '(' + p[1] + ') = ' + invExact(p[0], p[1]).text) + '</div><button type="button" class="ws-how" data-fn="' + p[0] + '" data-x="' + esc(p[1]) + '">How?</button><div class="ws-howbox" hidden></div></div>');
    });
    h.push('</div><div class="ws-title">True or False</div><div class="ws-grid ws-full">');
    invCur.tf.forEach(function (p, i) {
      var truth = Math.abs(EH.fval(EH.parse(p[2])) - invExact(p[0], p[1]).f) < 1e-9;
      h.push('<div class="ws-item ws-tf" data-k="t' + i + '" data-truth="' + truth + '"><span class="ws-lhs pp-sheet">' + (13 + i) + '.  ' + P.inline(p[0] + '(' + p[1] + ') = ' + p[2]) + '  →</span><span class="ws-tfbtns"><label><input type="radio" name="inv-t' + i + '" value="true"/> True</label><label><input type="radio" name="inv-t' + i + '" value="false"/> False</label></span><div class="ws-fb" aria-live="polite"></div><div class="ws-ans pp-sheet" hidden>' + P.inline((truth ? 'True' : 'False: ' + p[0] + '(' + p[1] + ') = ' + invExact(p[0], p[1]).text)) + '</div><button type="button" class="ws-how" data-fn="' + p[0] + '" data-x="' + esc(p[1]) + '">Why?</button><div class="ws-howbox" hidden></div></div>');
    });
    h.push('</div><div class="ws-tools"><button type="button" id="inv-check" class="eh-go">Check my answers</button><button type="button" id="inv-show">Show answers</button><button type="button" id="inv-new">New problems</button><button type="button" id="inv-class">Class sheet</button><span id="inv-score" class="ws-score" aria-live="polite"></span></div>');
    iq.innerHTML = h.join('');
    iq.querySelectorAll('.ws-in').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var w = inp.closest('.ws-item'), pv = w.querySelector('.ws-prev'); w.classList.remove('ws-ok', 'ws-bad', 'ws-warn'); w.querySelector('.ws-fb').textContent = '';
        try { pv.innerHTML = inp.value.trim() ? P.inline(EH.txt(EH.parse(inp.value))) : ''; } catch (e) { pv.innerHTML = ''; }
      });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var all = iq.querySelectorAll('.ws-in'), nx = all[Array.prototype.indexOf.call(all, inp) + 1]; if (nx) nx.focus(); else $('inv-check').click(); } });
    });
    $('inv-check').onclick = function () {
      var ok = 0, n = 0;
      invCur.eval.forEach(function (p, i) {
        n++; var w = iq.querySelector('[data-k="e' + i + '"]'), inpE = $('inv-e' + i), r = invCheck(p[0], p[1], inpE.value);
        if (window.Progress && r.s !== 'empty' && inpE.dataset.rec !== inpE.value) { inpE.dataset.rec = inpE.value; Progress.record('inverse-trig', p[0] + ' (evaluate)', r.s === 'ok', { q: p[0] + '(' + p[1] + ')' }); }
        w.classList.remove('ws-ok', 'ws-bad', 'ws-warn'); if (r.s !== 'empty') w.classList.add('ws-' + (r.s === 'ok' ? 'ok' : r.s));
        if (r.s === 'ok') ok++;
        w.querySelector('.ws-fb').textContent = r.s === 'ok' ? '✓' : r.s === 'empty' ? 'Blank' : r.msg;
      });
      invCur.tf.forEach(function (p, i) {
        n++; var w = iq.querySelector('[data-k="t' + i + '"]'), sel = iq.querySelector('input[name="inv-t' + i + '"]:checked'), truth = w.getAttribute('data-truth') === 'true';
        w.classList.remove('ws-ok', 'ws-bad', 'ws-warn');
        var right = invExact(p[0], p[1]).text;
        if (!sel) { w.querySelector('.ws-fb').textContent = 'Pick True or False.'; return; }
        var good = (sel.value === 'true') === truth; if (good) ok++;
        if (window.Progress && w.dataset.rec !== sel.value) { w.dataset.rec = sel.value; Progress.record('inverse-trig', 'Inverse trig true/false', good, { q: p[0] + '(' + p[1] + ') = ' + p[2] }); }
        w.classList.add(good ? 'ws-ok' : 'ws-bad');
        w.querySelector('.ws-fb').textContent = (good ? '✓ ' : '✗ ') + (truth ? 'True: ' + p[2] + ' is in ' + INV_RANGE[p[0]] + ' and its ' + p[0].slice(3) + ' is ' + p[1] + '.' : 'False: ' + p[2] + (Math.abs(Math[p[0].slice(3)](EH.fval(EH.parse(p[2]))) - EH.fval(EH.parse(p[1]))) < 1e-9 ? ' has the right ' + p[0].slice(3) + ' but is outside ' + INV_RANGE[p[0]] : ' does not even have ' + p[0].slice(3) + ' = ' + p[1]) + '. The answer is ' + right + '.');
      });
      $('inv-score').textContent = ok + ' / ' + n + ' correct';
    };
    $('inv-show').onclick = function () { var hid = iq.querySelector('.ws-ans').hidden; iq.querySelectorAll('.ws-ans').forEach(function (a) { a.hidden = !hid; }); this.textContent = hid ? 'Hide answers' : 'Show answers'; };
    iq.querySelectorAll('.ws-how').forEach(function (b) {
      var label = b.textContent;
      b.addEventListener('click', function () {
        var box = b.nextElementSibling, fn = b.getAttribute('data-fn'), x = b.getAttribute('data-x');
        if (!box.innerHTML) {
          var r = EH.analyze(fn + '(' + x + ')'), base = fn.slice(3), coord = base === 'cos' ? 'x-coordinate' : base === 'sin' ? 'y-coordinate' : 'ratio y/x';
          box.innerHTML = '<div class="eh-explain"><div><b>The question.</b> ' + esc(fn) + ' asks: which angle in ' + P.inline(INV_RANGE[fn]) + ' has ' + esc(base) + ' equal to ' + P.inline(x) + '? On the unit circle, look for the point whose ' + coord + ' is ' + P.inline(x) + '.</div>' +
            '<div><b>Stay in the range.</b> ' + (fn === 'arccos' ? 'arccos answers live in the top half of the circle (Quadrants I and II): a negative input gives an angle in Quadrant II, written as π minus the reference angle.' : 'Answers live in the right half of the circle (Quadrants I and IV): a negative input gives a NEGATIVE angle, never one in Quadrant II or III.') + '</div></div>' + stepsHtml(r.steps) + answerHtml(r);
        }
        box.hidden = !box.hidden; b.textContent = box.hidden ? label : 'Hide';
      });
    });
    $('inv-new').onclick = function () { drawInv(false); };
    $('inv-class').onclick = function () { drawInv(true); };
  };
  drawInv(true);
}

/* deep links straight to a drill (#ws-quiz, #inv-quiz) on a fresh load */
if (/^#(ws-quiz|inv-quiz)$/.test(location.hash)) setTimeout(function () { window.dispatchEvent(new HashChangeEvent('hashchange')); }, 50);

/* ---------------- settings: paper switch ---------------- */
var setDlg = document.querySelector('.settings-dialog');
if (setDlg && !$('set-paper')) {
  var row = document.createElement('label');
  row.className = 'settings-row';
  row.innerHTML = '<span><b>Hand-written paper style</b><small>Worked steps, answers and cheat sheets look written on lined paper, with real stacked fractions. Turn off for plain typed text.</small></span><input id="set-paper" type="checkbox"/>';
  var anchor = setDlg.querySelector('#set-autohide');
  if (anchor && anchor.closest('.settings-row')) anchor.closest('.settings-row').after(row); else setDlg.appendChild(row);
  var cb = $('set-paper'); cb.checked = P.enabled();
  cb.addEventListener('change', function () { P.setEnabled(cb.checked); });
}
})();
