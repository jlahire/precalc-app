/* =====================================================================
   Progress: remember graded practice on this device and show it.
   Progress.record(area, topic, ok, detail)   ok: true / false
   Areas: identities, inverse-trig, graph, check, mistake
   The "My Progress" page lists accuracy by topic, the weakest topics
   with one-tap practice, recent activity and the mistakes made most.
   ===================================================================== */
(function () {
'use strict';
var KEY = 'precalc-progress', MAX = 4000;
function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.events) return d; } catch (e) {} return { v: 1, events: [] }; }
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
var data = load(), listeners = [];

/* where the "Practice" button goes for each kind of topic */
var GP_KEY = { 'Sine': 'sin', 'Cosine': 'cos', 'Tangent': 'tan', 'Parabola (vertex form)': 'quadratic', 'Absolute value': 'abs', 'Square root': 'sqrt', 'Exponential': 'exp', 'Logarithm': 'log', 'Reciprocal (rational)': 'rational' };
var MISTAKE_PRACTICE = {
  'Sign error moving a term': '3x + 5 = 2x - 7', 'Did not distribute to every term': '3(x - 2) + 4 = 5x - 8', 'Minus sign not distributed': '7 - (2x - 3) = 4x',
  'Squared a sum term by term': '√(x + 3) = x - 3', 'Split a root over a sum': '√(x + 7) = x + 1', 'Split a log over a sum': 'log_2(x) + log_2(x - 2) = 3',
  'Log rule misused': 'log_3(x) + log_3(x - 8) = 2', 'Lost a solution': 'x^2 = 5x', 'Extra (extraneous) solution kept': '√(x + 3) = x - 3',
  'Exponent rule misused': '4^(x + 1) = 8^(x - 2)', 'Fractions added top-and-bottom': '1/x + 1/(x - 2) = 4/(x^2 - 2x)', 'Cancelled terms, not factors': 'f(x) = (x^2 - 4)/(x^2 - x - 6)',
  'Arithmetic slip': '2x^2 + 5x - 3 = 0', 'Wrong final answer': '2x^2 + 5x - 3 = 0', 'Not equivalent to the line before': '2x^2 + 5x - 3 = 0'
};
function practice(area, topic) {
  if (area === 'identities') { location.hash = '#ws-quiz'; return; }
  if (area === 'graph-table') { location.hash = '#graph-table'; setTimeout(function () { var s = document.getElementById('tg-fn'); if (s) s.value = /sine$/.test(topic) && !/cosine/.test(topic) ? 'sin' : 'cos'; var b = document.getElementById('tg-new'); if (b) b.click(); }, 120); return; }
  if (area === 'inverse-trig') { location.hash = '#inv-quiz'; setTimeout(function () { var b = document.getElementById('inv-new'); if (b) b.click(); }, 120); return; }
  if (area === 'graph') {
    location.hash = '#graph-practice';
    setTimeout(function () { var s = document.getElementById('gp-family'), fam = GP_KEY[topic.replace(/^Graph → equation: /, '')]; if (s && fam) { s.value = fam; s.dispatchEvent(new Event('change')); } }, 120);
    return;
  }
  var ex = area === 'mistake' ? MISTAKE_PRACTICE[topic.replace(/^Mistake: /, '')] : null;
  var src = ex || (data.events.filter(function (e) { return e.topic === topic && e.detail && e.detail.src; }).pop() || { detail: {} }).detail.src;
  if (!src) { location.hash = '#equation-helper'; return; }
  location.hash = '#equation-helper';
  setTimeout(function () {
    var i = document.getElementById('eh-input'); if (!i) return;
    i.value = src; i.dispatchEvent(new Event('input'));
    var b = document.getElementById('eh-similar'); if (b) b.click();
  }, 150);
}

var Progress = window.Progress = {
  record: function (area, topic, ok, detail) {
    data.events.push({ t: Date.now(), a: area, topic: topic, ok: ok === true ? 1 : ok === false ? 0 : null, detail: detail || null });
    if (data.events.length > MAX) data.events = data.events.slice(-MAX);
    save(data); listeners.forEach(function (f) { try { f(); } catch (e) {} });
  },
  reset: function () { data = { v: 1, events: [] }; save(data); listeners.forEach(function (f) { f(); }); },
  onChange: function (f) { listeners.push(f); },
  events: function () { return data.events.slice(); },
  practice: practice,
  stats: function () {
    var by = {}, graded = 0, right = 0, days = {};
    data.events.forEach(function (e) {
      days[new Date(e.t).toDateString()] = (days[new Date(e.t).toDateString()] || 0) + 1;
      if (e.ok === null) return;
      graded++; right += e.ok;
      var k = e.a + '|' + e.topic, b = by[k] || (by[k] = { area: e.a, topic: e.topic, n: 0, ok: 0, last: 0, recent: [] });
      b.n++; b.ok += e.ok; b.last = Math.max(b.last, e.t); b.recent.push(e.ok); if (b.recent.length > 10) b.recent.shift();
    });
    var topics = Object.keys(by).map(function (k) { var b = by[k]; b.acc = b.ok / b.n; b.recentAcc = b.recent.reduce(function (a, x) { return a + x; }, 0) / b.recent.length; return b; });
    var streak = 0, d = new Date();
    for (;;) { if (days[d.toDateString()]) { streak++; d.setDate(d.getDate() - 1); } else break; }
    return { graded: graded, right: right, topics: topics, days: days, streak: streak };
  }
};

/* ---------------- the My Progress page ---------------- */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
var AREA_LABEL = { 'graph-table': 'Graph It with a Table', identities: 'Identities drill', 'inverse-trig': 'Inverse trig drill', graph: 'Graph → Equation', check: 'Check My Work', mistake: 'Mistakes found' };
function ago(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }
function render() {
  var host = document.getElementById('progress-host'); if (!host) return;
  var s = Progress.stats(), h = [];
  var acc = s.graded ? Math.round(100 * s.right / s.graded) : 0, week = 0, now = Date.now();
  data.events.forEach(function (e) { if (now - e.t < 7 * 864e5 && e.ok !== null) week++; });
  h.push('<div class="pg-tiles"><div class="pg-tile"><b>' + s.graded + '</b><span>questions checked</span></div><div class="pg-tile"><b>' + (s.graded ? acc + '%' : '–') + '</b><span>correct overall</span></div><div class="pg-tile"><b>' + week + '</b><span>this week</span></div><div class="pg-tile"><b>' + s.streak + '</b><span>day streak</span></div></div>');
  if (!s.graded) {
    h.push('<div class="pg-empty">Nothing yet. Every answer you check in the <a href="#ws-quiz">identities drill</a>, the <a href="#inv-quiz">inverse trig drill</a>, <a href="#graph-practice">Graph → Equation</a> and <a href="#check-work">Check My Work</a> shows up here, and the topics that need work rise to the top.</div>');
    host.innerHTML = h.join(''); return;
  }
  /* 14-day activity */
  var bars = [], mx = 1, d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (var i = 13; i >= 0; i--) { var d = new Date(d0); d.setDate(d.getDate() - i); var n = s.days[d.toDateString()] || 0; mx = Math.max(mx, n); bars.push({ d: d, n: n }); }
  var W = 560, H = 110, bw = W / 14;
  h.push('<h3>Last 14 days</h3><svg class="pg-chart" viewBox="0 0 ' + W + ' ' + (H + 22) + '" role="img" aria-label="Practice activity over the last 14 days">' + bars.map(function (b, k) {
    var bh = b.n ? Math.max(4, b.n / mx * H) : 0;
    return '<rect class="pg-bar' + (k === 13 ? ' pg-today' : '') + '" x="' + (k * bw + 4).toFixed(1) + '" y="' + (H - bh).toFixed(1) + '" width="' + (bw - 8).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3"><title>' + b.d.toDateString() + ': ' + b.n + '</title></rect>' +
      '<text x="' + (k * bw + bw / 2).toFixed(1) + '" y="' + (H + 16) + '" text-anchor="middle">' + 'SMTWTFS'.charAt(b.d.getDay()) + '</text>' + (b.n ? '<text class="pg-n" x="' + (k * bw + bw / 2).toFixed(1) + '" y="' + (H - bh - 4).toFixed(1) + '" text-anchor="middle">' + b.n + '</text>' : '');
  }).join('') + '</svg>');
  /* weakest topics */
  var weak = s.topics.filter(function (t) { return t.area !== 'mistake' && t.n >= 2 && t.recentAcc < 0.8; }).sort(function (a, b) { return a.recentAcc - b.recentAcc || b.n - a.n; }).slice(0, 5);
  var mistakes = s.topics.filter(function (t) { return t.area === 'mistake'; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
  h.push('<h3>Focus on these</h3>');
  if (weak.length) h.push('<ol class="pg-focus">' + weak.map(function (t) { return '<li><span class="pg-ft"><b>' + esc(t.topic) + '</b><small>' + esc(AREA_LABEL[t.area] || t.area) + ' · ' + Math.round(t.recentAcc * 100) + '% of the last ' + t.recent.length + '</small></span><button type="button" class="pg-go" data-a="' + esc(t.area) + '" data-t="' + esc(t.topic) + '">Practice</button></li>'; }).join('') + '</ol>');
  else h.push('<p class="small">No weak spots right now: everything you have practiced is at 80% or better recently. Keep mixing it up.</p>');
  if (mistakes.length) h.push('<h3>Mistakes you make most</h3><ol class="pg-focus">' + mistakes.map(function (t) { return '<li><span class="pg-ft"><b>' + esc(t.topic.replace(/^Mistake: /, '')) + '</b><small>found ' + t.n + ' time' + (t.n > 1 ? 's' : '') + ' · last ' + ago(t.last) + '</small></span><button type="button" class="pg-go" data-a="mistake" data-t="' + esc(t.topic) + '">Practice</button></li>'; }).join('') + '</ol>');
  /* every topic */
  var all = s.topics.filter(function (t) { return t.area !== 'mistake'; }).sort(function (a, b) { return (a.area > b.area ? 1 : a.area < b.area ? -1 : 0) || a.acc - b.acc; });
  h.push('<h3>Every topic</h3><div class="pg-tablewrap"><table class="pg-table"><tr><th>Topic</th><th>Where</th><th>Tries</th><th>Correct</th><th>Last</th><th></th></tr>' + all.map(function (t) {
    var p = Math.round(t.acc * 100);
    return '<tr><td>' + esc(t.topic) + '</td><td>' + esc(AREA_LABEL[t.area] || t.area) + '</td><td>' + t.n + '</td><td><span class="pg-meter"><span style="width:' + p + '%" class="' + (p >= 80 ? 'pg-good' : p >= 50 ? 'pg-mid' : 'pg-low') + '"></span></span> ' + p + '%</td><td>' + ago(t.last) + '</td><td><button type="button" class="pg-go" data-a="' + esc(t.area) + '" data-t="' + esc(t.topic) + '">Practice</button></td></tr>';
  }).join('') + '</table></div>');
  h.push('<p class="small pg-foot">Saved only in this browser on this device. <button type="button" id="pg-reset">Reset my progress</button></p>');
  host.innerHTML = h.join('');
  var rb = document.getElementById('pg-reset');
  if (rb) rb.onclick = function () { if (confirm('Erase all saved progress on this device? This cannot be undone.')) Progress.reset(); };
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.pg-go'); if (!b) return;
  practice(b.getAttribute('data-a'), b.getAttribute('data-t'));
});
Progress.onChange(render);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
window.addEventListener('hashchange', function () { if (location.hash === '#progress') render(); });
})();
