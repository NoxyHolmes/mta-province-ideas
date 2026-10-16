var ADMIN_KEY = LS.get(KEY_K) || '';
var adminMode = false;
var writeQ = [], writeBusy = false;
var lastHeadSha = null, lastTreeSha = null;
var pushTimer = null, pushInFlight = false, dataDirty = false, pushRetries = 0;

function invalidateGitCache() { lastHeadSha = null; lastTreeSha = null; }

function setSync(cls, txt) {
  var s = $('#sync'); if (s) s.className = 'sync ' + (cls || '');
  var e = $('#syncTxt'); if (txt && e) e.textContent = txt;
}

function showSavebar(msg) {
  var b = $('#savebar'); if (!b) return;
  var t = $('#savebarTxt'); if (t) t.textContent = msg || 'Изменения не сохранены';
  b.style.display = 'flex';
}
function hideSavebar() { var b = $('#savebar'); if (b) b.style.display = 'none'; }

function rawUrl(file, br) {
  return 'https://raw.githubusercontent.com/' + REPO + '/' + (br || BRANCH) + '/' + file + '?v=' + Date.now();
}

function rawGet(file, br) {
  return fetchT(rawUrl(file, br), { cache: 'no-store' }, NET_TO_READ).then(function(r) {
    if (r.status === 404) { var e = new Error('404'); e.nf = true; e.status = 404; throw e; }
    if (!r.ok) { var e2 = new Error('raw ' + r.status); e2.status = r.status; throw e2; }
    return r.text();
  });
}

function ghHeaders() {
  return { Authorization: 'token ' + ADMIN_KEY, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
}

function ghReq(method, path, body) {
  return fetchT('https://api.github.com/repos/' + REPO + '/' + path, {
    method: method,
    headers: ghHeaders(),
    body: body ? JSON.stringify(body) : undefined
  }, NET_TO_WRITE).then(function(r) {
    if (r.ok) {
      if (r.status === 204) return null;
      return r.json().catch(function() { return null; });
    }
    return r.text().catch(function() { return ''; }).then(function(txt) {
      var e = new Error('HTTP ' + r.status); e.status = r.status; e.body = txt; throw e;
    });
  });
}

function checkToken(tok) {
  return fetchT('https://api.github.com/user', { headers: { Authorization: 'token ' + tok } }, NET_TO_READ)
    .then(function(r) { if (!r.ok) throw r.status; return fetchT('https://api.github.com/repos/' + REPO, { headers: { Authorization: 'token ' + tok } }, NET_TO_READ); })
    .then(function(r) { if (!r.ok) throw r.status; return r.json(); })
    .then(function(j) { return !j.permissions || !!j.permissions.push; });
}

function detectBranch() {
  var cached = LS.get('idea_branch_v1');
  if (cached) { BRANCH = cached; return Promise.resolve(); }
  var h = {}; if (ADMIN_KEY) h.Authorization = 'token ' + ADMIN_KEY;
  return fetchT('https://api.github.com/repos/' + REPO, { headers: h, cache: 'no-store' }, NET_TO_READ)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(j) { if (j && j.default_branch) { BRANCH = j.default_branch; LS.set('idea_branch_v1', BRANCH); } }).catch(function() {});
}

function ghRef() {
  return ghReq('GET', 'git/refs/heads/' + BRANCH).catch(function(e) {
    if ((e && e.status) === 404 && BRANCH !== 'master') { BRANCH = 'master'; return ghReq('GET', 'git/refs/heads/master'); }
    throw e;
  });
}

function enqueueWrite(files, msg) {
  return new Promise(function(res, rej) { writeQ.push({ files: files, msg: msg, res: res, rej: rej }); pumpWrite(); });
}

function pumpWrite() {
  if (writeBusy || !writeQ.length) return;
  if (!ADMIN_KEY || !adminMode) { var t = writeQ.shift(); if (t) t.rej(new Error('no auth')); pumpWrite(); return; }
  writeBusy = true;
  var task = writeQ.shift();
  runWriteTask(task).then(function(r) { writeBusy = false; task.res(r); pumpWrite(); }, function(e) { writeBusy = false; task.rej(e); pumpWrite(); });
}

function runWriteTask(task) {
  return Promise.resolve().then(function() {
    if (lastHeadSha && lastTreeSha) return { c: lastHeadSha, t: lastTreeSha };
    return ghRef().then(function(ref) { return ghReq('GET', 'git/commits/' + ref.object.sha).then(function(cm) { return { c: ref.object.sha, t: cm.tree.sha }; }); });
  }).then(function(base) {
    return Promise.all(task.files.map(function(f) {
      return ghReq('POST', 'git/blobs', { content: f.b64, encoding: 'base64' }).then(function(bl) { return { path: f.path, mode: '100644', type: 'blob', sha: bl.sha }; });
    })).then(function(entries) { return { base: base, entries: entries }; });
  }).then(function(x) {
    return ghReq('POST', 'git/trees', { base_tree: x.base.t, tree: x.entries }).then(function(nt) {
      return ghReq('POST', 'git/commits', { message: task.msg, tree: nt.sha, parents: [x.base.c] }).then(function(nc) {
        return ghReq('PATCH', 'git/refs/heads/' + BRANCH, { sha: nc.sha }).then(function() { lastHeadSha = nc.sha; lastTreeSha = nt.sha; });
      });
    });
  }).catch(function(e) { if (e && e.status === 422) invalidateGitCache(); throw e; });
}

function commit() {
  if (!REPO) { saveLocal(ITEMS); return; }
  if (!adminMode) return;
  dataDirty = true; pushRetries = 0;
  LS.set(PENDING_K, String(Date.now()));
  cacheItems();
  if (pushInFlight || pushTimer) return;
  pushTimer = setTimeout(doPush, 60);
}

function doPush() {
  pushTimer = null;
  if (!adminMode || !REPO || pushInFlight || !dataDirty) return;
  pushInFlight = true;
  setSync('busy', 'Сохранение…');
  var rev = localRev + 1;
  pendingRev = rev;
  var snapshot = JSON.stringify({ rev: rev, items: ITEMS });
  cacheItems();
  dataDirty = false;
  enqueueWrite([{ path: 'data.json', b64: b64e(snapshot) }, { path: 'rev.txt', b64: b64e(String(rev)) }], 'ideas: ' + rev).then(function() {
    pushInFlight = false; localRev = rev; pendingRev = null; pushRetries = 0;
    dirtyIds = {}; deletedIds = {}; cacheItems(); LS.remove(PENDING_K);
    setSync('ok', 'GitHub'); hideSavebar();
    if (dataDirty) pushTimer = setTimeout(doPush, 150);
  }).catch(function() {
    pushInFlight = false; pendingRev = null; dataDirty = true;
    setSync('err', 'Не сохранено'); showSavebar('Ошибка сохранения — нажмите «Повторить»');
  });
}

window.retryPush = function() {
  pushRetries = 0; dataDirty = true; invalidateGitCache();
  if (!pushInFlight) { clearTimeout(pushTimer); pushTimer = null; doPush(); }
};

function initRemote() {
  var cache = loadCache();
  if (cache && cache.items && cache.items.length) {
    ITEMS = cache.items; localRev = cache.rev;
  } else {
    ITEMS = loadLocal();
  }
  booted = true;
  render();

  if (!REPO) { setSync('', 'Локально'); return; }
  setSync('busy', 'Синхронизация…');
  detectBranch().then(function() { return rawGet('data.json'); }).then(function(txt) {
    var j = JSON.parse(txt);
    var items = toArr(j && j.items);
    if (items && items.length) {
      ITEMS = normItems(items); localRev = j.rev || 1; cacheItems();
    } else if (!ITEMS.length) {
      ITEMS = seed(); needSeed = true;
    }
    setSync('ok', 'GitHub'); render();
  }).catch(function() {
    if (!ITEMS.length) { ITEMS = seed(); needSeed = true; }
    setSync('ok', 'GitHub'); render();
  });
}
