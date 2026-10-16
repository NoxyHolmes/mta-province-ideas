/* ===================== УТИЛИТЫ И ХРАНИЛИЩЕ ===================== */
var LS = (function() {
  var mem = {}, ok = false;
  try {
    var t = '__ls__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    ok = true;
  } catch (e) { ok = false; }
  return {
    get: function(k) {
      if (ok) { try { return window.localStorage.getItem(k); } catch (e) {} }
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
    },
    set: function(k, v) {
      v = String(v);
      if (ok) { try { window.localStorage.setItem(k, v); return; } catch (e) {} }
      mem[k] = v;
    },
    remove: function(k) {
      if (ok) { try { window.localStorage.removeItem(k); return; } catch (e) {} }
      delete mem[k];
    }
  };
})();

function $(s) { return document.querySelector(s); }

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function b64e(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64d(s) { return decodeURIComponent(escape(atob(s))); }

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function rand() { return Math.random().toString(36).slice(2, 7); }
function delay(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
function pageUrl(file) { return PAGE_DIR + file + '?v=' + Date.now(); }

function toast(msg, warn) {
  var t = document.createElement('div');
  t.className = 'toast' + (warn ? ' warn' : '');
  t.textContent = msg;
  var root = $('#troot');
  if (root) root.appendChild(t);
  setTimeout(function() { t.classList.add('out'); }, 4200);
  setTimeout(function() { t.remove(); }, 4700);
}

function fetchT(url, opts, ms) {
  var ctl = null, to = null;
  try { if (typeof AbortController !== 'undefined') ctl = new AbortController(); } catch (e) { ctl = null; }
  var o = {};
  if (opts) {
    for (var k in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k];
    }
  }
  if (ctl) {
    o.signal = ctl.signal;
    to = setTimeout(function() { try { ctl.abort(); } catch (e) {} }, ms || 8000);
  }
  return fetch(url, o).then(
    function(r) { if (to) { clearTimeout(to); to = null; } return r; },
    function(e) { if (to) { clearTimeout(to); to = null; } throw e; }
  );
}

function closeM() { var m = $('#mroot'); if (m) m.innerHTML = ''; }
function closeC() { var c = $('#croot'); if (c) c.innerHTML = ''; }
window.closeM = closeM;
window.closeC = closeC;
