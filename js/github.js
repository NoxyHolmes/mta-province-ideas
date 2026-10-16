/* ===================== СИНХРОНИЗАЦИЯ С GITHUB ===================== */
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

function apiText(path, auth) {
  var h = { Accept: 'application/vnd.github.raw' };
  if (auth && ADMIN_KEY) h.Authorization = 'token ' + ADMIN_KEY;
  return fetchT('https://api.github.com/repos/' + REPO + '/contents/' + path + '?t=' + Date.now(), { headers: h, cache: 'no-store' }, NET_TO_READ).then(function(r) {
    if (r.ok) return r.text();
    var e = new Error('api ' + r.status); e.status = r.status;
    if (r.status === 404) e.nf = true;
    if (r.status === 403 && !(auth && ADMIN_KEY)) e.rl = true;
    throw e;
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
      var e = new Error('HTTP ' + r.status);
      e.status = r.status; e.body = txt;
      var ra = r.headers.get('Retry-After');
      if (ra) { var w = parseInt(ra, 10); if (w > 0) e.retryAfter = w; }
      throw e;
    });
  });
}

function parseRevTxt(t) {
  t = String(t || '').trim();
  var i = t.indexOf(':');
  if (i < 0) return { rev: parseInt(t, 10) || 0, sha: null };
  return { rev: parseInt(t.substring(0, i), 10) || 0, sha: t.substring(i + 1).trim() };
}

function checkToken(tok) {
  return fetchT('https://api.github.com/user', { headers: { Authorization: 'token ' + tok } }, NET_TO_READ)
    .then(function(r) { if (!r.ok) throw r.status; return fetchT('https://api.github.com/repos/' + REPO, { headers: { Authorization: 'token ' + tok } }, NET_TO_READ); })
    .then(function(r) { if (!r.ok) throw r.status; return r.json(); })
    .then(function(j) { return !j.permissions || !!j.permissions.push; });
}

function handleGhError(err, what) {
  var code = (err && typeof err.status === 'number') ? err.status : (typeof err === 'number' ? err : 0);
  if (code === 401) { toast('Токен недействителен (401) — войдите заново', true); return; }
  if (code === 403) { setSync('err', 'Нет прав'); toast('Токен без права записи (403) — нужен classic-токен с галочкой repo', true); return; }
  if (code === 404) { toast('Не найдено (404) — нет доступа к репозиторию', true); return; }
  if (code === 422) { toast('Отклонено (422) — возможно, файл слишком большой', true); return; }
  toast('Не удалось: ' + what + (code ? ' (' + code + ')' : ' — нет сети'), true);
}

function detectBranch() {
  var cached = LS.get('idea_branch_v1');
  var ts = parseInt(LS.get('idea_branch_ts'), 10) || 0;
  if (cached && ts && Date.now() - ts < 86400000) { BRANCH = cached; return Promise.resolve(); }
  var h = {}; if (ADMIN_KEY) h.Authorization = 'token ' + ADMIN_KEY;
  return fetchT('https://api.github.com/repos/' + REPO, { headers: h, cache: 'no-store' }, NET_TO_READ)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(j) {
      if (j && j.default_branch) {
        BRANCH = j.default_branch;
        LS.set('idea_branch_v1', BRANCH);
        LS.set('idea_branch_ts', String(Date.now()));
      } else if (cached) { BRANCH = cached; }
    }).catch(function() { if (cached) BRANCH = cached; });
}

function checkRev() {
  var h = { Accept: 'application/vnd.github.raw' };
  if (ADMIN_KEY) h.Authorization = 'token ' + ADMIN_KEY;
  return fetchT('https://api.github.com/repos/' + REPO + '/contents/rev.txt?t=' + Date.now(), { headers: h, cache: 'no-store' }, NET_TO_READ).then(function(r) {
    if (r.ok) return r.text().then(function(t) { return parseRevTxt(t); });
    var e = new Error(r.status); e.status = r.status;
    if (r.status === 404) e.nf = true;
    if (r.status === 403 && !ADMIN_KEY) e.rl = true;
    throw e;
  });
}

function ghRef() {
  return ghReq('GET', 'git/refs/heads/' + BRANCH).catch(function(e) {
    if ((e && e.status) === 404 && BRANCH !== 'master') { BRANCH = 'master'; return ghReq('GET', 'git/refs/heads/master'); }
    throw e;
  });
}

function ghBlobXhr(b64, onprog) {
  return new Promise(function(res, rej) {
    var x = new XMLHttpRequest();
    x.open('POST', 'https://api.github.com/repos/' + REPO + '/git/blobs', true);
    x.setRequestHeader('Authorization', 'token ' + ADMIN_KEY);
    x.setRequestHeader('Accept', 'application/vnd.github+json');
    x.setRequestHeader('Content-Type', 'application/json');
    x.upload.onprogress = function(ev) { if (ev.lengthComputable && onprog) onprog(ev.loaded / ev.total); };
    x.timeout = 600000;
    x.ontimeout = function() { var e = new Error('timeout'); e.status = 0; rej(e); };
    x.onload = function() {
      if (x.status >= 200 && x.status < 300) {
        try { res(JSON.parse(x.responseText)); } catch (e) { rej(new Error('parse')); }
      } else { var er = new Error('HTTP ' + x.status); er.status = x.status; rej(er); }
    };
    x.onerror = function() { rej(new Error('net')); };
    x.send(JSON.stringify({ content: b64, encoding: 'base64' }));
  });
}

function enqueueWrite(files, msg) {
  return new Promise(function(res, rej) {
    writeQ.push({ files: files, msg: msg, res: res, rej: rej });
    pumpWrite();
  });
}

function pumpWrite() {
  if (writeBusy || !writeQ.length) return;
  if (!ADMIN_KEY || !adminMode) { var t = writeQ.shift(); if (t) t.rej(new Error('no auth')); pumpWrite(); return; }
  writeBusy = true;
  var task = writeQ.shift();
  attemptTask(task, 0).then(
    function(r) { writeBusy = false; task.res(r); pumpWrite(); },
    function(e) { writeBusy = false; task.rej(e); pumpWrite(); }
  );
}

function attemptTask(task, n) {
  return runWriteTask(task).catch(function(e) {
    var st = (e && e.status) || 0;
    if (st === 422 && n < 1) return delay(400).then(function() { return attemptTask(task, n + 1); });
    if ((st === 409 || st === 0 || st >= 500) && n < 3) return delay(600 * (n + 1)).then(function() { return attemptTask(task, n + 1); });
    throw e;
  });
}

function runWriteTask(task) {
  return Promise.resolve().then(function() {
    if (lastHeadSha && lastTreeSha) return { c: lastHeadSha, t: lastTreeSha };
    return ghRef().then(function(ref) {
      return ghReq('GET', 'git/commits/' + ref.object.sha).then(function(cm) {
        return { c: ref.object.sha, t: cm.tree.sha };
      });
    });
  }).then(function(base) {
    var anyProgress = task.files.some(function(f) { return !!f.onprog; });
    if (anyProgress) {
      var chain = Promise.resolve(), entries = [];
      task.files.forEach(function(f) {
        chain = chain.then(function() {
          var put = f.onprog ? ghBlobXhr(f.b64, f.onprog) : ghReq('POST', 'git/blobs', { content: f.b64, encoding: 'base64' });
          return put.then(function(bl) { entries.push({ path: f.path, mode: '100644', type: 'blob', sha: bl.sha }); });
        });
      });
      return chain.then(function() { return { base: base, entries: entries }; });
    }
    return Promise.all(task.files.map(function(f) {
      return ghReq('POST', 'git/blobs', { content: f.b64, encoding: 'base64' }).then(function(bl) {
        return { path: f.path, mode: '100644', type: 'blob', sha: bl.sha };
      });
    })).then(function(entries) { return { base: base, entries: entries }; });
  }).then(function(x) {
    return ghReq('POST', 'git/trees', { base_tree: x.base.t, tree: x.entries }).then(function(nt) {
      return ghReq('POST', 'git/commits', { message: task.msg, tree: nt.sha, parents: [x.base.c] }).then(function(nc) {
        return ghReq('PATCH', 'git/refs/heads/' + BRANCH, { sha: nc.sha }).then(function() {
          lastHeadSha = nc.sha; lastTreeSha = nt.sha;
        });
      });
    });
  }).catch(function(e) {
    if (e && e.status === 422) invalidateGitCache();
    throw e;
  });
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
  LS.set(PENDING_K, String(rev));
  var snapshot = JSON.stringify({ rev: rev, items: ITEMS });
  cacheItems();
  dataDirty = false;
  enqueueWrite([
    { path: 'data.json', b64: b64e(snapshot) },
    { path: 'rev.txt', b64: b64e(String(rev)) }
  ], 'ideas: ' + rev).then(function() {
    pushInFlight = false;
    localRev = rev; pendingRev = null; pushRetries = 0;
    if (rev > knownRev) knownRev = rev;
    dirtyIds = {}; deletedIds = {};
    cacheItems();
    LS.remove(PENDING_K);
    setSync('ok', 'GitHub');
    hideSavebar();
    if (dataDirty) pushTimer = setTimeout(doPush, 150);
  }).catch(function(err) {
    pushInFlight = false;
    pendingRev = null;
    dataDirty = true;
    handlePushFail(err);
  });
}

function handlePushFail(err) {
  if (!adminMode) return;
  var code = (err && err.status) || 0;
  if (code === 401 || code === 403 || code === 404) {
    setSync('err', 'Не сохранено');
    handleGhError(err, 'запись');
    showSavebar('Ошибка доступа (' + code + ')');
    return;
  }
  pushRetries++;
  if (pushRetries <= 6) {
    setSync('busy', 'Повтор сохранения…');
    pushTimer = setTimeout(doPush, 2000 * pushRetries);
  } else {
    setSync('err', 'Не сохранено');
    showSavebar('Не удалось сохранить — нажмите «Повторить»');
  }
}

window.retryPush = function() {
  pushRetries = 0; dataDirty = true; invalidateGitCache();
  if (!pushInFlight) { clearTimeout(pushTimer); pushTimer = null; doPush(); }
};

function resolveRev() {
  return checkRev().catch(function() {
    return rawGet('rev.txt').then(function(t) { return parseRevTxt(t); });
  }).catch(function() {
    return { rev: 0, sha: null };
  });
}

function pullData(rv) {
  function parseOk(txt) {
    var j = null; try { j = JSON.parse(txt); } catch (e) {}
    var items = toArr(j && j.items);
    if (!items || !items.length) return null;
    var r = (typeof j.rev === 'number') ? j.rev : (rv && typeof rv.rev === 'number' ? rv.rev : 0);
    return { rev: (r || localRev || 0), items: normItems(items) };
  }
  return apiText('data.json', !!ADMIN_KEY).then(function(txt) {
    var res = parseOk(txt); if (!res) throw new Error('bad'); return res;
  }).catch(function() {
    return rawGet('data.json').then(function(d) {
      var res = parseOk(d); if (!res) throw new Error('bad'); return res;
    });
  });
}

function applyData(rev, items) {
  if (window.drag) endDrag(false);
  ITEMS = items; localRev = rev;
  if (rev > knownRev) knownRev = rev;
  invalidateGitCache();
  cacheItems(); render();
}

function initRemote() {
  if (!REPO) {
    ITEMS = loadLocal();
    booted = true;
    setSync('', 'Локально');
    render();
    return;
  }
  var cache = loadCache();
  if (cache && cache.items && cache.items.length) {
    ITEMS = cache.items; localRev = cache.rev; needSeed = false; booted = true;
    knownRev = Math.max(knownRev, localRev);
    render(); setSync('busy', 'Проверка обновлений…');
  } else {
    setSync('busy', 'Подключение…');
  }
  detectBranch().then(resolveRev).then(function(rv) {
    var noData = (!rv || !rv.rev);
    if (noData) {
      if (!ITEMS.length) { ITEMS = seed(); needSeed = true; }
      finishBoot('ok', 'GitHub');
      return;
    }
    if (rv.rev > knownRev) knownRev = rv.rev;
    if (ITEMS.length && localRev >= rv.rev) { finishBoot('ok', 'GitHub'); return; }
    return pullData(rv).then(function(res) {
      if (res && res.items && res.items.length) {
        ITEMS = res.items; localRev = res.rev; cacheItems(); needSeed = false;
      } else if (!ITEMS.length) { ITEMS = seed(); needSeed = true; }
      finishBoot('ok', 'GitHub');
    });
  }).catch(function() {
    if (!ITEMS.length) ITEMS = loadLocal();
    finishBoot('err', 'Автономно');
  });
}

function finishBoot(cls, txt) {
  booted = true; setSync(cls, txt); render();
  if (ADMIN_KEY && REPO) {
    checkToken(ADMIN_KEY).then(function(ok) {
      if (ok) {
        adminMode = true; render();
        if (needSeed || dataDirty || LS.get(PENDING_K)) { dataDirty = true; doPush(); }
      }
    }).catch(function() {});
  }
}
