var ITEMS = [], localRev = 0, pendingRev = null, needSeed = false, booted = false;
var knownRev = 0;
var state = { fac: 'general', q: '' };
var dirtyIds = {}, deletedIds = {};

function markDirty(id) { dirtyIds[id] = 1; if (deletedIds[id]) delete deletedIds[id]; }
function markDeleted(id) { deletedIds[id] = 1; if (dirtyIds[id]) delete deletedIds[id]; }

function toArr(x) {
  if (!x) return null;
  if (Array.isArray(x)) return x;
  var ks = Object.keys(x).sort(function(a, b) { return a - b; }), arr = [];
  for (var i = 0; i < ks.length; i++) arr[+ks[i]] = x[ks[i]];
  return arr;
}

function normItems(a) {
  if (!a) return a;
  var defSeed = seed()[0];
  for (var i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    if (!a[i].images) a[i].images = [];
    if (!a[i].videos) a[i].videos = [];
    if (typeof a[i].title !== 'string') a[i].title = '';
    if (typeof a[i].appUrl !== 'string' || !a[i].appUrl) {
      var ttl = (a[i].title || '').toLowerCase();
      if (i === 0 || a[i].id === 's1' || ttl.indexOf('приложен') >= 0) {
        a[i].appUrl = 'mvd_phone';
      } else {
        a[i].appUrl = '';
      }
    }
    if (a[i].id === 's1' && defSeed && String(a[i].text || '').indexOf('YI73TT4') < 0) {
      a[i].text = defSeed.text;
    }
  }
  return a;
}

function itemTitle(it) {
  if (it.title && String(it.title).trim()) return String(it.title).trim();
  var t = String(it.text || '').trim();
  if (!t) return '';
  var i = t.indexOf('\n');
  return (i >= 0 ? t.substring(0, i) : t).trim();
}

function itemBody(it) {
  if (it.title && String(it.title).trim()) return String(it.text || '');
  var t = String(it.text || '').trim();
  var i = t.indexOf('\n');
  if (i >= 0) return t.substring(i + 1).trim();
  return '';
}

function loadLocal() {
  try {
    var d = JSON.parse(LS.get(LOCAL_K) || 'null');
    if (d && d.items) {
      var a = toArr(d.items);
      if (a && a.length) return normItems(a);
    }
  } catch (e) {}
  return seed();
}

function saveLocal(items) {
  try { LS.set(LOCAL_K, JSON.stringify({ items: items })); }
  catch (e) { toast('Хранилище переполнено', true); }
}

function cacheItems() {
  try { LS.set(CACHE_K, JSON.stringify({ rev: localRev, items: ITEMS })); } catch (e) {}
}

function loadCache() {
  try {
    var c = JSON.parse(LS.get(CACHE_K) || 'null');
    if (c) {
      var a = toArr(c.items);
      if (a && a.length) return { rev: (typeof c.rev === 'number' ? c.rev : 0), items: normItems(a) };
    }
  } catch (e) {}
  return null;
}

function byId(id) {
  for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
  return null;
}

function itemsByFac(k) {
  if (k === 'all') return ITEMS.slice();
  var o = [];
  for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].fac === k) o.push(ITEMS[i]);
  return o;
}

function countItems(k) {
  if (k === 'all') return ITEMS.length;
  return itemsByFac(k).length;
}
