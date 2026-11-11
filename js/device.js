/* =====================================================================
   Device: detect phone / tablet / computer and adapt the page.
   Sets on <html>:
     data-device = phone | tablet | desktop   (Settings can override)
     data-input  = touch | mouse
     data-os     = ios | android | mac | windows | chromeos | linux | other
     data-orient = portrait | landscape
     class "standalone" when installed to the home screen
   Loaded in <head> so the layout is right before the first paint.
   ===================================================================== */
(function () {
'use strict';
var de = document.documentElement, KEY = 'precalc-device', MKEY = 'precalc-mathkeys';
function mm(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

function detect() {
  var ua = navigator.userAgent || '', mtp = navigator.maxTouchPoints || 0;
  var coarse = mm('(pointer: coarse)'), anyFine = mm('(any-pointer: fine)');
  var iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && mtp > 1);       /* iPadOS 13+ says "Macintosh" */
  var iPhone = /iPhone|iPod/.test(ua);
  var android = /Android/.test(ua), androidPhone = android && /Mobile/.test(ua);
  var shortSide = Math.min(screen.width || 9999, screen.height || 9999);
  var type;
  if (iPhone || androidPhone) type = 'phone';
  else if (iPad || android) type = 'tablet';
  else if (coarse && !anyFine) type = shortSide < 600 ? 'phone' : 'tablet';
  else type = 'desktop';
  var os = iPhone || iPad ? 'ios' : android ? 'android' : /CrOS/.test(ua) ? 'chromeos' : /Mac/.test(ua) ? 'mac' : /Win/.test(ua) ? 'windows' : /Linux/.test(ua) ? 'linux' : 'other';
  return { type: type, touch: type !== 'desktop' || (coarse && !anyFine), os: os, mac: os === 'mac' || os === 'ios' };
}
var detected = detect();
var Device = window.Device = { detected: detected, type: detected.type, touch: detected.touch, os: detected.os };

function apply() {
  var o = store(KEY);
  var type = o && /^(phone|tablet|desktop)$/.test(o) ? o : detected.type;
  Device.type = type;
  Device.touch = type === 'desktop' ? false : (detected.touch || o === 'phone' || o === 'tablet');
  de.setAttribute('data-device', type);
  de.setAttribute('data-input', Device.touch ? 'touch' : 'mouse');
  de.setAttribute('data-os', detected.os);
  orient();
  var mk = store(MKEY);
  Device.mathKeys = Device.touch && (mk === null ? type === 'phone' : mk === '1');
  de.classList.toggle('mathkeys', !!Device.mathKeys);
  de.classList.toggle('standalone', mm('(display-mode: standalone)') || navigator.standalone === true);
}
function orient() {
  de.setAttribute('data-orient', window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  de.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
}
Device.set = function (mode) { store(KEY, mode || 'auto'); apply(); document.dispatchEvent(new CustomEvent('devicechange')); };
Device.setMathKeys = function (on) { store(MKEY, on ? '1' : '0'); apply(); document.dispatchEvent(new CustomEvent('devicechange')); };
Device.label = function (t) { return { phone: 'Phone', tablet: 'Tablet / iPad', desktop: 'Computer' }[t || Device.type]; };
apply();
window.addEventListener('resize', orient);
window.addEventListener('orientationchange', function () { setTimeout(orient, 200); });

/* ---------------- page adjustments (after the page loads) ---------------- */
function $(id) { return document.getElementById(id); }
function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
function insertAt(input, ins, caret) {
  var s = input.selectionStart == null ? input.value.length : input.selectionStart, e = input.selectionEnd == null ? s : input.selectionEnd;
  input.value = input.value.slice(0, s) + ins + input.value.slice(e);
  var c = s + (caret == null ? ins.length : caret);
  input.setSelectionRange(c, c);
  input.dispatchEvent(new Event('input'));
}

ready(function () {
  var input = $('eh-input'), keypad = document.querySelector('#equation-helper .eh-keypad');

  /* 1. number keys on the math keypad (shown on touch screens) */
  if (keypad && !keypad.querySelector('.eh-krow-digits')) {
    var row = document.createElement('div');
    row.className = 'eh-krow eh-krow-digits'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Numbers');
    row.innerHTML = '789456123'.split('').concat(['0', '.', ',']).map(function (d) { return '<button type="button" data-ins="' + d + '">' + d + '</button>'; }).join('');
    keypad.insertBefore(row, keypad.firstChild);
  }
  /* keep the text box focused when a key is pressed (stops the keyboard from flickering) */
  if (keypad) keypad.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });

  /* 2. "math keys only": hide the phone/tablet keyboard so the keypad has the screen */
  var kbBtn = null;
  if (input) {
    kbBtn = document.createElement('button');
    kbBtn.type = 'button'; kbBtn.id = 'eh-kbd-toggle'; kbBtn.className = 'eh-kbd-toggle';
    input.parentNode.insertBefore(kbBtn, input.nextSibling);
    kbBtn.addEventListener('click', function () { Device.setMathKeys(!Device.mathKeys); input.focus(); });
  }
  function syncKeys() {
    if (!input) return;
    if (Device.mathKeys) input.setAttribute('inputmode', 'none'); else input.removeAttribute('inputmode');
    if (kbBtn) { kbBtn.textContent = Device.mathKeys ? '⌨ Keyboard' : '🔢 Math keys'; kbBtn.title = Device.mathKeys ? 'Use your device keyboard instead of the math keys' : 'Hide the device keyboard and use only the math keys'; kbBtn.setAttribute('aria-pressed', Device.mathKeys ? 'true' : 'false'); }
  }
  syncKeys();

  /* 3. phone: a bottom bar with the three main buttons, always in reach */
  var helper = $('equation-helper'), dock = null;
  if (helper && $('eh-go')) {
    dock = document.createElement('div');
    dock.id = 'eh-dock'; dock.setAttribute('role', 'toolbar'); dock.setAttribute('aria-label', 'Equation Helper actions');
    dock.innerHTML = '<button type="button" data-for="eh-go" class="eh-dock-main">Show me</button><button type="button" data-for="eh-all">Solve all</button><button type="button" data-for="eh-similar">More like this</button>';
    document.body.appendChild(dock);
    dock.addEventListener('mousedown', function (e) { e.preventDefault(); });
    dock.addEventListener('click', function (e) { var b = e.target.closest('button[data-for]'); if (b) $(b.getAttribute('data-for')).click(); });
    var visible = false;
    var syncDock = function () {
      var shown = helper.offsetParent !== null && getComputedStyle(helper).display !== 'none';
      var focusedOs = document.activeElement === input && !Device.mathKeys;      /* the OS keyboard is up: get out of its way */
      visible = shown && !focusedOs;
      document.documentElement.classList.toggle('eh-dock-on', visible);
    };
    window.addEventListener('hashchange', function () { setTimeout(syncDock, 60); });
    if (input) { input.addEventListener('focus', syncDock); input.addEventListener('blur', function () { setTimeout(syncDock, 120); }); }
    document.addEventListener('devicechange', syncDock);
    setTimeout(syncDock, 300);
  }

  /* 4. after a result appears on a small screen: drop the keyboard and scroll to the answer */
  ['eh-go', 'eh-all', 'eh-similar'].forEach(function (id) {
    var b = $(id); if (!b) return;
    b.addEventListener('click', function () {
      if (Device.type === 'desktop' || (Device.type === 'tablet' && window.innerWidth >= 1150)) return;
      if (input && !Device.mathKeys) input.blur();
      setTimeout(function () {
        var t = $(id === 'eh-similar' ? 'eh-more' : 'eh-output');
        if (t && t.firstChild) { var y = t.getBoundingClientRect().top + window.pageYOffset - 70; window.scrollTo({ top: y, behavior: 'smooth' }); }
      }, id === 'eh-similar' ? 700 : 80);
    });
  });

  /* 5. computer: keyboard shortcuts */
  var mod = detected.mac ? '⌘' : 'Ctrl';
  var hint = document.createElement('p');
  hint.className = 'small eh-shortcuts';
  hint.innerHTML = 'Shortcuts: <kbd>Enter</kbd> Show me · <kbd>' + mod + '</kbd>+<kbd>Enter</kbd> Solve all · <kbd>' + mod + '</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> More like this · <kbd>/</kbd> jump to the box · <kbd>Esc</kbd> clear';
  var typing = document.querySelector('#equation-helper .eh-typing');
  if (typing) typing.parentNode.insertBefore(hint, typing.nextSibling);
  document.addEventListener('keydown', function (e) {
    if (!helper || helper.offsetParent === null) return;
    var inField = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
    if (e.key === '/' && !inField && input) { e.preventDefault(); input.focus(); input.select(); return; }
    if (document.activeElement !== input) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); $(e.shiftKey ? 'eh-similar' : 'eh-all').click(); }
    else if (e.key === 'Escape') { e.preventDefault(); input.value = ''; input.dispatchEvent(new Event('input')); }
  }, true);

  /* 6. Graph practice: a row of math keys on touch screens */
  var gpa = $('gp-answer');
  if (gpa && !$('gp-keyrow')) {
    var kr = document.createElement('div');
    kr.id = 'gp-keyrow'; kr.className = 'eh-krow gp-keyrow'; kr.setAttribute('role', 'group'); kr.setAttribute('aria-label', 'Math keys');
    var keys = [['π', 'π'], ['x', 'x'], ['^', '^()', 2], ['√', '√()', 2], ['( )', '()', 1], ['/', '/'], ['−', '-'], ['+', '+'], ['sin', 'sin()', 4], ['cos', 'cos()', 4], ['tan', 'tan()', 4], ['|x|', '||', 1], ['log', 'log_()()', 5]];
    kr.innerHTML = keys.map(function (k, i) { return '<button type="button" data-i="' + i + '">' + k[0] + '</button>'; }).join('') + '<button type="button" data-back="1" class="eh-k-edit" aria-label="Delete">⌫</button>';
    gpa.closest('.gp-ansrow').insertAdjacentElement('afterend', kr);
    kr.addEventListener('mousedown', function (e) { e.preventDefault(); });
    kr.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-back')) { var s = gpa.selectionStart || 0, en = gpa.selectionEnd || s; if (s === en && s > 0) s--; gpa.value = gpa.value.slice(0, s) + gpa.value.slice(en); gpa.setSelectionRange(s, s); }
      else { var k = keys[+b.getAttribute('data-i')]; insertAt(gpa, k[1], k[2]); }
      gpa.focus();
    });
  }

  /* 7. Settings: layout override and math-keys switch */
  var dlg = document.querySelector('.settings-dialog');
  if (dlg && !$('set-device')) {
    var r1 = document.createElement('div');
    r1.className = 'settings-row';
    r1.innerHTML = '<span><b>Layout</b><small id="set-device-note"></small></span><select id="set-device" aria-label="Layout"><option value="auto">Auto-detect</option><option value="phone">Phone</option><option value="tablet">Tablet / iPad</option><option value="desktop">Computer</option></select>';
    var r2 = document.createElement('label');
    r2.className = 'settings-row set-touch-only';
    r2.innerHTML = '<span><b>Math keys only</b><small>Hide the phone/tablet keyboard in the Equation Helper and use the on-screen math keys (they include numbers).</small></span><input id="set-mathkeys" type="checkbox"/>';
    var first = dlg.querySelector('.settings-row');
    if (first) { first.parentNode.insertBefore(r1, first); first.parentNode.insertBefore(r2, first); } else { dlg.appendChild(r1); dlg.appendChild(r2); }
    var sel = $('set-device'), mk = $('set-mathkeys');
    var syncSet = function () {
      sel.value = store(KEY) && store(KEY) !== 'auto' ? store(KEY) : 'auto';
      $('set-device-note').textContent = 'Detected: ' + Device.label(detected.type) + (detected.os !== 'other' ? ' (' + { ios: 'iOS / iPadOS', android: 'Android', mac: 'Mac', windows: 'Windows', chromeos: 'Chromebook', linux: 'Linux' }[detected.os] + ')' : '') + '. Now using: ' + Device.label() + '.';
      mk.checked = !!Device.mathKeys;
    };
    sel.addEventListener('change', function () { Device.set(sel.value); });
    mk.addEventListener('change', function () { Device.setMathKeys(mk.checked); });
    document.addEventListener('devicechange', syncSet);
    syncSet();
  }
  document.addEventListener('devicechange', syncKeys);
});
})();
