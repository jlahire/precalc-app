/* =====================================================================
   Paper: render math text the way it looks written by hand on paper.
   "(x - 2)/(x - 3)" becomes a stacked fraction with a drawn bar,
   "√(1 - x²)" gets a drawn radical, "2^3" a raised exponent,
   "log_2(x)" / "log₂(x)" a lowered base, and column-aligned lines
   become a hand-ruled table.
   Paper.inline(text)  -> HTML for one line
   Paper.block(text)   -> HTML for a multi-line worked solution
   Paper.enhance(root) -> upgrade every .move (and other paper areas)
   ===================================================================== */
(function (global) {
'use strict';

var FN = { sin: 1, cos: 1, tan: 1, sec: 1, csc: 1, cot: 1, log: 1, ln: 1, arcsin: 1, arccos: 1, arctan: 1, exp: 1, sqrt: 1, lim: 1, f: 1, g: 1, h: 1 };
var SUPMAP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', 'ⁿ': 'n', '⁽': '(', '⁾': ')', 'ˣ': 'x', 'ʸ': 'y', 'ᵐ': 'm', 'ᵗ': 't', 'ᵏ': 'k' };
var SUBMAP = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₙ': 'n', '₊': '+', '₋': '-', 'ₓ': 'x', 'ᵦ': 'b' };
var SUPRE = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ⁽⁾ˣʸᵐᵗᵏ]/, SUBRE = /[₀₁₂₃₄₅₆₇₈₉ₙ₊₋ₓᵦ]/;

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------------- tokenizer ---------------- */
function tokenize(s) {
  var out = [], i = 0, m;
  while (i < s.length) {
    var c = s[i], rest = s.slice(i);
    if ((m = /^ +/.exec(rest))) { out.push({ t: 'sp', v: m[0] }); i += m[0].length; continue; }
    if ((m = /^\d+(?:\.\d+)?/.exec(rest))) { out.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z]+/.exec(rest))) { out.push({ t: 'w', v: m[0] }); i += m[0].length; continue; }
    if (SUPRE.test(c)) { var j = i; while (j < s.length && SUPRE.test(s[j])) j++; out.push({ t: 'sup', v: s.slice(i, j).split('').map(function (x) { return SUPMAP[x]; }).join('') }); i = j; continue; }
    if (SUBRE.test(c)) { var k = i; while (k < s.length && SUBRE.test(s[k])) k++; out.push({ t: 'sub', v: s.slice(i, k).split('').map(function (x) { return SUBMAP[x]; }).join('') }); i = k; continue; }
    if ('([{'.indexOf(c) >= 0) { out.push({ t: 'open', v: c }); i++; continue; }
    if (')]}'.indexOf(c) >= 0) { out.push({ t: 'close', v: c }); i++; continue; }
    if (c === '/') { out.push({ t: 'slash', v: c }); i++; continue; }
    if (c === '^') { out.push({ t: 'caret', v: c }); i++; continue; }
    if (c === '_') { out.push({ t: 'under', v: c }); i++; continue; }
    if (c === '√' || c === '∛' || c === '∜') { out.push({ t: 'rad', v: c }); i++; continue; }
    if (c === '|') { out.push({ t: 'bar', v: c }); i++; continue; }
    /* surrogate pairs */
    var cp = s.codePointAt(i), ch = String.fromCodePoint(cp);
    out.push({ t: 'sym', v: ch }); i += ch.length;
  }
  return out;
}

/* ---------------- grouping: brackets and |abs| ---------------- */
var PAIR = { '(': ')', '[': ']', '{': '}' };
function group(toks) {
  var root = { t: 'list', items: [] }, stack = [root];
  toks.forEach(function (tk) {
    var top = stack[stack.length - 1];
    if (tk.t === 'open') { var g = { t: 'grp', open: tk.v, close: PAIR[tk.v], items: [] }; top.items.push(g); stack.push(g); }
    else if (tk.t === 'close') {
      /* close the nearest matching group; unmatched closers (interval notation "[3, 5)") stay literal */
      var idx = -1;
      for (var s = stack.length - 1; s > 0; s--) { if (stack[s].t === 'grp') { idx = s; break; } }
      if (idx > 0 && stack[idx].close === tk.v && idx === stack.length - 1) { stack.pop(); }
      else if (idx > 0 && idx === stack.length - 1) { stack[idx].close = tk.v; stack.pop(); }   /* mixed brackets: [3, 5) */
      else top.items.push({ t: 'sym', v: tk.v });
    } else top.items.push(tk);
  });
  /* unclosed groups: flatten back to literal text */
  while (stack.length > 1) {
    var g2 = stack.pop(), parent = stack[stack.length - 1];
    var at = parent.items.indexOf(g2);
    parent.items.splice.apply(parent.items, [at, 1, { t: 'sym', v: g2.open }].concat(g2.items));
  }
  absGroups(root);
  return root;
}
function absGroups(node) {
  if (!node.items) return;
  node.items.forEach(absGroups);
  var it = node.items, out = [], i = 0;
  while (i < it.length) {
    if (it[i].t === 'bar') {
      var j = i + 1;
      while (j < it.length && it[j].t !== 'bar') j++;
      if (j < it.length && j > i + 1 && j - i <= 24 && it.slice(i + 1, j).filter(function (x) { return x.t === 'sp'; }).length <= 4) {
        out.push({ t: 'grp', open: '|', close: '|', items: it.slice(i + 1, j), abs: true }); i = j + 1; continue;
      }
    }
    out.push(it[i]); i++;
  }
  node.items = out;
}

/* ---------------- structure: ^, _, √, / ---------------- */
function isTerm(n) { return n && (n.t === 'num' || n.t === 'w' || n.t === 'grp' || n.t === 'frac' || n.t === 'rad' && n.body || n.t === 'sym' && /[πθαβφe∞°′']/.test(n.v) || n.t === 'sup' || n.t === 'sub' || n.t === 'supx' || n.t === 'subx'); }
function stripG(n) { return n && n.t === 'grp' && !n.abs && (n.open === '(' || n.open === '[' || n.open === '{') ? n.items : [n]; }
var TRIG = { sin: 1, cos: 1, tan: 1, sec: 1, csc: 1, cot: 1, log: 1, ln: 1, arcsin: 1, arccos: 1, arctan: 1 };
function isFn(n) { return n && n.t === 'w' && TRIG[n.v.toLowerCase()]; }
function isArg(n) { return n && (n.t === 'sym' && /[θαβφx]/.test(n.v) || n.t === 'w' && n.v.length <= 2 && !FN[n.v.toLowerCase()]); }
var MATHWORD = { opp: 1, adj: 1, hyp: 1, rise: 1, run: 1 };
function wordy(n) { return n.t === 'w' && n.v.length >= 3 && !FN[n.v.toLowerCase()] && !MATHWORD[n.v.toLowerCase()] && !/^(arc|sec|csc|cot)/i.test(n.v); }

function structure(items) {
  items = items.map(function (n) { return n.t === 'grp' ? { t: 'grp', open: n.open, close: n.close, abs: n.abs, items: structure(n.items) } : n; });
  var out = [], i;
  /* exponent / subscript markers */
  for (i = 0; i < items.length; i++) {
    var n = items[i];
    if ((n.t === 'caret' || n.t === 'under') && out.length && items[i + 1] && items[i + 1].t !== 'sp') {
      var arg = [items[i + 1]], skip = 1;
      if (items[i + 1].t === 'sym' && /[-−+]/.test(items[i + 1].v) && items[i + 2] && items[i + 2].t !== 'sp') { arg = [items[i + 1], items[i + 2]]; skip = 2; }
      if (arg[arg.length - 1].t === 'grp') arg = arg.slice(0, -1).concat(stripG(arg[arg.length - 1]));
      out.push({ t: n.t === 'caret' ? 'supx' : 'subx', items: arg });
      i += skip; continue;
    }
    out.push(n);
  }
  items = out; out = [];
  /* radicals */
  for (i = items.length - 1; i >= 0; i--) {
    var r = items[i];
    if (r.t === 'rad' && !r.body) {
      var nxt = out[0];
      if (nxt && nxt.t !== 'sp' && (nxt.t === 'grp' || nxt.t === 'num' || nxt.t === 'w' || nxt.t === 'sym' && /[πθαβe]/.test(nxt.v))) {
        out.shift();
        var body = nxt.t === 'grp' && !nxt.abs ? nxt.items : [nxt];
        /* a radical of a single letter followed by a power keeps the power outside: √x² is rare, keep simple */
        out.unshift({ t: 'rad', v: r.v, body: body });
        continue;
      }
    }
    out.unshift(r);
  }
  items = out;
  /* fractions, left to right */
  out = [];
  for (i = 0; i < items.length; i++) {
    var s = items[i];
    if (s.t === 'slash' && out.length && isTerm(out[out.length - 1]) && items[i + 1] && isTerm(items[i + 1])) {
      /* numerator: run of adjacent terms back to a space/operator */
      var k = out.length - 1;
      while (k > 0 && isTerm(out[k - 1]) && !(out[k - 1].t === 'sym' && out[k - 1].v === '°')) k--;
      /* "sin θ/cos θ": a function name and its argument stay together in the numerator */
      if (k === out.length - 1 && isArg(out[k]) && out[k - 1] && out[k - 1].t === 'sp' && out[k - 1].v.length === 1) {
        var fk = out[k - 2] && (out[k - 2].t === 'sup' || out[k - 2].t === 'supx') ? k - 3 : k - 2;
        if (isFn(out[fk])) { k = fk; while (k > 0 && isTerm(out[k - 1]) && !(out[k - 1].t === 'sym' && out[k - 1].v === '°')) k--; }
      }
      var numer = out.slice(k);
      /* denominator */
      var j = i + 1, den = [items[j]];
      var first = items[j];
      /* ".../cos θ" or ".../cos²θ ": keep the function with its argument in the denominator */
      if (isFn(first)) {
        var a = j + 1;
        if (items[a] && (items[a].t === 'sup' || items[a].t === 'supx')) a++;
        if (items[a] && items[a].t === 'sp' && items[a].v.length === 1 && isArg(items[a + 1])) {
          den = items.slice(j, a + 2); j = a + 1;
          var nn0 = numer.length === 1 ? stripG(numer[0]) : numer;
          out.splice(k, out.length - k, { t: 'frac', n: nn0, d: den });
          i = j; continue;
        }
      }
      if (first.t === 'w' && FN[first.v.toLowerCase()] && items[j + 1] && items[j + 1].t === 'grp') { den.push(items[j + 1]); j++; }
      else if (first.t === 'w' && FN[first.v.toLowerCase()] && items[j + 1] && (items[j + 1].t === 'supx' || items[j + 1].t === 'sup') && items[j + 2] && items[j + 2].t === 'grp') { den.push(items[j + 1], items[j + 2]); j += 2; }
      if (items[j + 1] && (items[j + 1].t === 'sup' || items[j + 1].t === 'supx') && first.t !== 'grp') {
        den.push(items[j + 1]); j++;
        /* cos²x, sin²θ: the function's argument follows the exponent with no space */
        if (first.t === 'w' && FN[first.v.toLowerCase()] && items[j + 1] && (items[j + 1].t === 'w' && items[j + 1].v.length <= 2 || items[j + 1].t === 'sym' && /[θα]/.test(items[j + 1].v))) { den.push(items[j + 1]); j++; }
      }
      if (first.t === 'num' && items[j + 1] && items[j + 1].t === 'sym' && /[π°]/.test(items[j + 1].v)) { den.push(items[j + 1]); j++; }
      /* prose like "and/or", "rise/run": leave alone */
      if (numer.length === 1 && wordy(numer[0]) || den.length === 1 && wordy(den[0])) { out.push(s); continue; }
      var nn = numer.length === 1 ? stripG(numer[0]) : numer, dd = den.length === 1 ? stripG(den[0]) : den;
      out.splice(k, out.length - k, { t: 'frac', n: nn, d: dd });
      i = j; continue;
    }
    out.push(s);
  }
  return out;
}

/* ---------------- HTML output ---------------- */
var JIT = 6;
function word(v, cls) {
  var h = hash(v + (word.n = (word.n || 0) + 1));
  return '<span class="pp-t pp-j' + (h % JIT) + (cls ? ' ' + cls : '') + '">' + v + '</span>';
}
function glyph(ch) {
  if (ch === 'π') return '<span class="pp-g pp-pi"><span class="pp-sr">π</span></span>';
  if (ch === 'θ') return '<span class="pp-g pp-th"><span class="pp-sr">θ</span></span>';
  if (ch === '∞') return '<span class="pp-g pp-inf"><span class="pp-sr">∞</span></span>';
  if (ch === '−' || ch === '-') return '<span class="pp-op">−</span>';
  if (ch === '·' || ch === '×' || ch === '*') return '<span class="pp-op">' + (ch === '*' ? '·' : ch) + '</span>';
  if (/[=+<>≤≥≠±→⇒⇔≈∪∩∈÷:]/.test(ch)) return '<span class="pp-op">' + esc(ch) + '</span>';
  return word(esc(ch));
}
function html(items) {
  var s = '', lastStart = 0;
  for (var i = 0; i < items.length; i++) {
    var n = items[i];
    /* "y = 1": keep the left side and the = sign together (no line may start with =) */
    if (n.t === 'sp' && n.v.length === 1 && i > 0 && items[i + 1] && items[i + 1].t === 'sym' && /[=≠≈<>≤≥]/.test(items[i + 1].v) && items[i - 1].t !== 'sp') {
      s = s.slice(0, lastStart) + '<span class="pp-nowrap">' + s.slice(lastStart) + '&nbsp;' + glyph(items[i + 1].v) + '</span>'; i++; continue;
    }
    lastStart = s.length;
    /* a negative number stays in one piece: "−2" never splits across lines */
    if (n.t === 'sym' && (n.v === '-' || n.v === '−') && items[i + 1] && items[i + 1].t === 'num' && (i === 0 || /^(sp|open)$/.test(items[i - 1].t) || items[i - 1].t === 'sym' && /[=<>≤≥(,]/.test(items[i - 1].v))) {
      s += '<span class="pp-nowrap">' + glyph('−') + word(items[i + 1].v) + '</span>'; i++; continue;
    }
    switch (n.t) {
      case 'sp': s += n.v.length >= 2 ? '<span class="pp-gap" style="width:' + Math.min(4, n.v.length * 0.28).toFixed(2) + 'em"></span>' : ' '; break;
      case 'num': s += word(n.v); break;
      case 'w': if (n.v.toLowerCase() === 'pi') { s += glyph('π'); break; } s += word(esc(n.v), FN[n.v.toLowerCase()] ? 'pp-fn' : (n.v.length === 1 ? 'pp-var' : '')); break;
      case 'sym': s += glyph(n.v); break;
      case 'sup': s += '<sup class="pp-sup"><span class="pp-sr">^(</span>' + html(structure(group(tokenize(n.v)).items)) + '<span class="pp-sr">)</span></sup>'; break;
      case 'sub': s += '<sub class="pp-sub">' + html(structure(group(tokenize(n.v)).items)) + '</sub>'; break;
      case 'supx': s += '<sup class="pp-sup"><span class="pp-sr">^(</span>' + html(n.items) + '<span class="pp-sr">)</span></sup>'; break;
      case 'subx': s += '<sub class="pp-sub">' + html(n.items) + '</sub>'; break;
      case 'grp':
        if (n.abs) s += '<span class="pp-abs">' + html(n.items) + '</span>';
        else s += '<span class="pp-grp"><span class="pp-br">' + esc(n.open) + '</span>' + html(n.items) + '<span class="pp-br">' + esc(n.close) + '</span></span>';
        break;
      case 'frac': s += '<span class="pp-frac pp-w' + (hash(JSON.stringify(n.n).slice(0, 40)) % 3) + '"><span class="pp-num"><span class="pp-sr">(</span>' + html(n.n) + '<span class="pp-sr">)/(</span></span><span class="pp-den">' + html(n.d) + '<span class="pp-sr">)</span></span></span>'; break;
      case 'rad':
        if (!n.body) { s += word(n.v); break; }
        s += '<span class="pp-rad">' + (n.v === '∛' ? '<span class="pp-idx">3</span>' : n.v === '∜' ? '<span class="pp-idx">4</span>' : '') + '<span class="pp-rsign"><span class="pp-sr">' + n.v + '(</span></span><span class="pp-rbody">' + html(n.body) + '<span class="pp-sr">)</span></span></span>';
        break;
      case 'slash': s += '<span class="pp-op">/</span>'; break;
      case 'caret': s += '^'; break;
      case 'under': s += '_'; break;
      case 'bar': s += '<span class="pp-op">|</span>'; break;
      case 'open': case 'close': s += esc(n.v); break;
      default: s += esc(n.v || '');
    }
  }
  return s;
}

function inline(text) {
  if (text == null) return '';
  text = String(text).replace(/\t/g, '    ').replace(/ /g, ' ');
  try {
    var items = structure(group(tokenize(text)).items);
    /* keep each side of an equation in one piece: lines may only break at =, ≈, <, ≤ ... */
    var chunks = [[]], ops = [];
    items.forEach(function (n) {
      if (n.t === 'sym' && /^[=≈≠<>≤≥→]$/.test(n.v)) { ops.push(n); chunks.push([]); }
      else chunks[chunks.length - 1].push(n);
    });
    if (chunks.length === 1) return '<span class="pp-chunk">' + html(items) + '</span>';
    var out = '';
    chunks.forEach(function (c, i) {
      while (c.length && c[0].t === 'sp') c.shift();
      while (c.length && c[c.length - 1].t === 'sp') c.pop();
      if (i > 0) out += ' <span class="pp-chunk">' + glyph(ops[i - 1].v) + '&nbsp;' + html(c) + '</span>';
      else out += '<span class="pp-chunk">' + html(c) + '</span>';
    });
    return out;
  }
  catch (e) { return esc(text); }
}

/* ---------------- blocks: step labels, aligned columns, ruled tables ---------------- */
function cellPos(line) {
  var out = [], re = /\S+(?: \S+)*/g, m;
  while ((m = re.exec(line))) out.push({ at: m.index, s: m[0] });
  return out;
}
function splitCells(line) { return line.trim().split(/ {2,}/); }
function indent0(line) { return line.match(/^ */)[0].length; }
function isDashLine(line) { return /^\s*-{3,}(?=\s|$)/.test(line || ''); }
/* rebuild "num / ----- / den" (several side by side, with = or · between) as drawn fractions */
function asciiFrac(top, mid, bot) {
  var runs = [], re = /-{3,}/g, m;
  while ((m = re.exec(mid))) runs.push({ s: m.index, e: m.index + m[0].length, n: [], d: [] });
  var nearest = function (c) {
    var mid0 = c.at + c.s.length / 2, best = 0, bd = Infinity;
    runs.forEach(function (r, k) { var d = mid0 < r.s ? r.s - mid0 : mid0 > r.e ? mid0 - r.e : 0; if (d < bd) { bd = d; best = k; } });
    return best;
  };
  cellPos(top).forEach(function (c) { runs[nearest(c)].n.push(c.s); });
  cellPos(bot).forEach(function (c) { runs[nearest(c)].d.push(c.s); });
  var h = '', at = 0;
  runs.forEach(function (r) {
    var between = mid.slice(at, r.s).trim();
    if (between) h += ' ' + inline(between) + ' ';
    h += '<span class="pp-frac pp-w' + (hash(r.n.join(' ')) % 3) + '"><span class="pp-num"><span class="pp-sr">(</span>' + inline(r.n.join('  ')) +
      '<span class="pp-sr">)/(</span></span><span class="pp-den">' + inline(r.d.join('  ')) + '<span class="pp-sr">)</span></span></span>';
    at = r.e;
  });
  var tail = mid.slice(at).trim();
  if (tail) h += ' ' + inline(tail);
  return '<div class="pp-line pp-fracline" style="padding-left:' + Math.min(4, Math.min(indent0(top), indent0(mid)) * 0.3).toFixed(2) + 'em">' + h + '</div>';
}
function isHeader(cells) { return cells.every(function (c) { return !/[0-9=]/.test(c) && c.length < 24; }); }
function block(text, opts) {
  opts = opts || {};
  var lines = String(text).replace(/\r/g, '').replace(/\s+$/, '').split('\n');
  var out = [], i = 0;
  while (i < lines.length) {
    var raw = lines[i];
    if (!raw.trim()) { out.push('<div class="pp-blank"></div>'); i++; continue; }
    var m = /^\s*(Step\s+\d+[a-z]?\.?|Check:?|Answer:?|Why:?|Note:?)\s{2,}(.*)$/.exec(raw) || /^\s*(Step\s+\d+[a-z]?[.:])\s*(.*)$/.exec(raw);
    if (m) { out.push('<div class="pp-line pp-stepline"><span class="pp-stepno">' + esc(m[1].replace(/[.:]$/, '')) + '</span> <span class="pp-note">' + inline(m[2]) + '</span></div>'); i++; continue; }
    /* typed fractions: a numerator line, a line of dashes, a denominator line -> drawn fraction bars */
    if (i + 2 < lines.length && isDashLine(lines[i + 1]) && lines[i + 2].trim() && !isDashLine(raw)) {
      if (/^\s*[+\-−]\s/.test(raw)) {   /* column addition ("+ 5x - 2y = 8"): just a solid rule under it */
        out.push('<div class="pp-line" style="padding-left:' + Math.min(4, indent0(raw) * 0.3).toFixed(2) + 'em">' + inline(raw.trim()) + '</div><div class="pp-sumrule"></div>');
        i += 2; continue;
      }
      out.push(asciiFrac(raw, lines[i + 1], lines[i + 2]));
      i += 3; continue;
    }
    if (isDashLine(raw)) { out.push('<div class="pp-sumrule"></div>'); i++; continue; }
    var indent = raw.match(/^ */)[0].length, cells = splitCells(raw);
    /* a run of lines that were lined up with spaces (monospace columns): rebuild the columns from character positions */
    if (cells.length >= 2) {
      var runL = [raw], j = i + 1;
      while (j < lines.length && lines[j].trim() && Math.abs(lines[j].match(/^ */)[0].length - indent) <= 2 && splitCells(lines[j]).length >= 2 && !/^\s*Step\s+\d/.test(lines[j])) { runL.push(lines[j]); j++; }
      if (runL.length >= 2) {
        var rows = runL.map(cellPos), starts = [];
        rows.forEach(function (r) { r.forEach(function (c) { starts.push(c.at); }); });
        starts.sort(function (a, b) { return a - b; });
        var cols = [];
        starts.forEach(function (st) { if (!cols.length || st - cols[cols.length - 1] > 2) cols.push(st); });
        var colOf = function (at) { var best = 0; cols.forEach(function (c, k) { if (Math.abs(c - at) <= 2 || c <= at) best = k; }); return best; };
        var hdr = runL.length >= 3 && isHeader(rows[0].map(function (c) { return c.s; })) && rows[0].length === cols.length;
        var h = '<div class="pp-tablewrap" style="margin-left:' + Math.min(3, indent * 0.22).toFixed(2) + 'em"><table class="pp-table' + (hdr ? ' pp-ruled' : '') + '">';
        rows.forEach(function (r, ri) {
          var tag = hdr && ri === 0 ? 'th' : 'td', cellsH = '', at = 0;
          r.forEach(function (c, k) {
            var cc = Math.max(at, colOf(c.at)), nx = k + 1 < r.length ? Math.max(cc + 1, colOf(r[k + 1].at)) : cols.length;
            while (at < cc) { cellsH += '<' + tag + '></' + tag + '>'; at++; }
            var span = nx - cc;
            cellsH += '<' + tag + (span > 1 ? ' colspan="' + span + '"' : '') + '>' + inline(c.s) + '</' + tag + '>'; at = cc + span;
          });
          h += '<tr>' + cellsH + '</tr>';
        });
        out.push(h + '</table></div>'); i = j; continue;
      }
    }
    var prose = /^[A-Z][a-z]+(\s+[a-z']+){3,}/.test(raw.trim()) && !/[=<>≤≥]/.test(raw);
    out.push('<div class="pp-line' + (prose ? ' pp-prose' : '') + '" style="padding-left:' + Math.min(4, indent * 0.3).toFixed(2) + 'em">' + inline(raw.trim().replace(/ {2,}/g, function (s) { return s; })) + '</div>');
    i++;
  }
  return '<div class="pp-block' + (opts.cls ? ' ' + opts.cls : '') + '">' + out.join('') + '</div>';
}

/* ---------------- inline math inside existing HTML (cheat sheets, step practice) ---------------- */
var MATHY = /[\/^_√∛⁰¹²³⁴⁵⁶⁷⁸⁹⁻₀₁₂₃₄₅₆₇₈₉πθ∞]/;
function textNodes(root) {
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!MATHY.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      for (var p = n.parentNode; p && p !== root; p = p.parentNode) {
        if (/^(SCRIPT|STYLE|MATH|SVG|TEXTAREA|INPUT|BUTTON|A|CODE|KBD|SELECT|OPTION)$/i.test(p.nodeName) || p.classList && (p.classList.contains('pp-done') || p.classList.contains('pp-ink'))) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var list = [], n;
  while ((n = walker.nextNode())) list.push(n);
  list.forEach(function (t) {
    var span = document.createElement('span');
    span.className = 'pp-ink';
    span.innerHTML = inline(t.nodeValue);
    span.setAttribute('data-pp-src', t.nodeValue);
    t.parentNode.replaceChild(span, t);
  });
}
function undoTextNodes(root) {
  root.querySelectorAll('span.pp-ink[data-pp-src]').forEach(function (s) { s.parentNode.replaceChild(document.createTextNode(s.getAttribute('data-pp-src')), s); });
}

/* ---------------- shrink-to-fit: one written line stays on one line ---------------- */
var FIT_LINES = '.pp-line:not(.pp-prose):not(.pp-stepline), .cw-text, .ws-prev, .ws-ans, .eh-prob-text, .pp-tablewrap, .pg-tablewrap, .cw-fixline';
var FIT_HOSTS = '.pp-block, .eh-pans, .cw-sheet, .ws-item, .eh-prob-q, .eh-echo, .pg-tablewrap, .cw-fix, .pp-card';
var MIN_SCALE = 0.25;            /* always fit: shrink as far as needed, never scroll */
function fitOne(el) {
  if (!el.clientWidth) return;
  el.style.fontSize = '';
  var avail = el.clientWidth, need = el.scrollWidth;
  if (need <= avail + 1) return;
  var scale = Math.max(MIN_SCALE, avail / need * 0.98);
  el.style.fontSize = (scale * 100).toFixed(1) + '%';
  /* one more pass: fractions and radicals do not always scale exactly linearly */
  if (scale > MIN_SCALE && el.scrollWidth > el.clientWidth + 1) el.style.fontSize = (Math.max(MIN_SCALE, scale * el.clientWidth / el.scrollWidth * 0.98) * 100).toFixed(1) + '%';
}
function fitIn(host) { if (host.matches && host.matches(FIT_LINES)) fitOne(host); host.querySelectorAll(FIT_LINES).forEach(fitOne); }
var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function (ents) {
  ents.forEach(function (en) { var w = Math.round(en.contentRect.width); if (en.target._fitW !== w) { en.target._fitW = w; fitIn(en.target); } });
}) : null;
function watchFit(root) {
  (root || document).querySelectorAll(FIT_HOSTS).forEach(function (h) {
    if (h.hasAttribute('data-fit')) return;
    h.setAttribute('data-fit', '1');
    if (ro) ro.observe(h); else fitIn(h);
  });
}

/* ---------------- enhancing the page ---------------- */
var KEY = 'precalc-paper-style';
function enabled() { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } }
function renderMove(el) {
  if (el.hasAttribute('data-pp')) return;
  el.setAttribute('data-pp', '1');
  el._ppOrig = el.innerHTML;
  el.innerHTML = block(el.textContent);
  el.classList.add('pp-paper');
  watchFit(el);
}
function restoreMove(el) {
  if (!el.hasAttribute('data-pp')) return;
  el.innerHTML = el._ppOrig != null ? el._ppOrig : el.textContent;
  el.removeAttribute('data-pp'); el.classList.remove('pp-paper');
}
var INK_SEL = '.st-paper, .cheat-card, .cs-card, .pp-auto';
var io = null;
function observe(el) {
  if (!io) { renderMove(el); return; }
  io.observe(el);
}
function enhance(root) {
  root = root || document;
  if (typeof document !== 'undefined') watchFit(document);
  if (!enabled()) return;
  var moves = root.querySelectorAll ? root.querySelectorAll('.move:not([data-pp]), .stack:not([data-pp])') : [];
  moves.forEach(observe);
  if (root.matches && root.matches('.move:not([data-pp])')) observe(root);
  var inks = root.querySelectorAll ? root.querySelectorAll(INK_SEL) : [];
  inks.forEach(function (el) { if (!el.closest('.pp-off')) { textNodes(el); el.classList.add('pp-done-ink'); } });
}
function setEnabled(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
  document.documentElement.classList.toggle('pp-on', on);
  if (on) enhance(document);
  else {
    document.querySelectorAll('[data-pp]').forEach(restoreMove);
    document.querySelectorAll(INK_SEL).forEach(undoTextNodes);
  }
}

function init() {
  var on = enabled();
  document.documentElement.classList.toggle('pp-on', on);
  if ('IntersectionObserver' in global) {
    io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); if (enabled()) renderMove(en.target); } });
    }, { rootMargin: '800px 0px' });
  }
  enhance(document);
  /* content added later (helper output, practice sheets, step practice) */
  var pending = false;
  new MutationObserver(function (muts) {
    if (pending) return;
    var need = muts.some(function (m) { return m.addedNodes.length && Array.prototype.some.call(m.addedNodes, function (n) { return n.nodeType === 1 && !(n.classList && (n.classList.contains('pp-block') || n.classList.contains('pp-ink'))) && !(n.parentNode && n.parentNode.closest && n.parentNode.closest('.pp-block')); }); });
    if (!need) return;
    pending = true;
    (global.requestAnimationFrame || setTimeout)(function () { pending = false; if (enabled()) enhance(document); else watchFit(document); });
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(loadAssets, 2500);
  /* printing: render everything first */
  global.addEventListener('beforeprint', function () { if (enabled()) document.querySelectorAll('.move:not([data-pp]), .stack:not([data-pp])').forEach(renderMove); });
}

/* ---------------- standalone files (downloaded practice sheets) ---------------- */
var assets = { css: null };
function loadAssets() {
  if (assets.loading || typeof fetch === 'undefined') return;
  assets.loading = true;
  var cssUrl = (document.querySelector('link[href*="paper.css"]') || {}).href;
  if (!cssUrl) return;
  Promise.all([
    fetch(cssUrl).then(function (r) { return r.ok ? r.text() : Promise.reject(); }),
    fetch(new URL('../fonts/caveat-latin.woff2', cssUrl)).then(function (r) { return r.ok ? r.blob() : Promise.reject(); }).then(function (b) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); });
    })
  ]).then(function (v) { assets.css = v[0].replace(/url\(\.\.\/fonts\/caveat-latin\.woff2\)/, 'url(' + v[1] + ')'); }).catch(function () {});
}
/* turn every .move block inside an HTML string into paper */
function paperize(htmlStr) {
  var t = document.createElement('template');
  t.innerHTML = htmlStr;
  t.content.querySelectorAll('.move, .stack').forEach(function (el) { el.innerHTML = block(el.textContent); el.classList.add('pp-paper'); el.setAttribute('data-pp', '1'); });
  return t.innerHTML;
}

global.Paper = { fit: fitIn, watchFit: watchFit, assets: assets, paperize: paperize, inline: inline, block: block, esc: esc, enhance: enhance, textNodes: textNodes, enabled: enabled, setEnabled: setEnabled, init: init, _tok: tokenize, _struct: function (t) { return structure(group(tokenize(t)).items); } };
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}
})(typeof window !== 'undefined' ? window : globalThis);
