var activeAppKey = null;
var openedSpoilers = {};
var quickUploadTargetId = null;

function renderTop() {
  var z = $('#adminZone'); if (!z) return;
  z.innerHTML = adminMode
    ? '<span class="adbadge">✏️ Владелец</span><button class="btn ghost slim" onclick="logout()">Выйти</button>'
    : '<button class="btn ghost slim" onclick="askAdmin()">🔒 Вход владельца</button>';
}

function setFac(k) {
  if (activeAppKey) closeAppDemo();
  state.fac = k; state.q = '';
  var qi = $('#qInp'); if (qi) qi.value = '';
  render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.setFac = setFac;

function renderNav() {
  var h = '';
  for (var g = 0; g < GROUPS.length; g++) {
    h += '<div class="sb-head' + (g > 0 ? ' mt' : '') + '">' + esc(GROUPS[g].n) + '</div>';
    for (var i = 0; i < FACTS.length; i++) {
      var f = FACTS[i]; if (f.g !== g) continue;
      var cnt = countItems(f.k);
      h += '<div class="sb-item' + (state.fac === f.k ? ' on' : '') + '" data-fac="' + f.k + '">' +
           '<span class="sb-ic">' + f.ic + '</span><span class="sb-n">' + esc(f.n) + '</span>' +
           (cnt ? '<span class="sb-c">' + cnt + '</span>' : '') + '</div>';
    }
  }
  $('#nav').innerHTML = h;

  var mh = '', startedG1 = false;
  for (var a = 0; a < FACTS.length; a++) {
    var f2 = FACTS[a]; var c2 = countItems(f2.k);
    var cls = 'mchip' + (state.fac === f2.k ? ' on' : '');
    if (f2.g === 1 && !startedG1) { cls += ' mchip-sep'; startedG1 = true; }
    mh += '<div class="' + cls + '" data-fac="' + f2.k + '">' + f2.ic + ' ' + esc(f2.n) + (c2 ? ' · ' + c2 : '') + '</div>';
  }
  $('#mnav').innerHTML = mh;
}

function bodyToHtml(text) {
  if (!text) return '';
  var s = esc(text);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g, function(m, pre, url) {
    return pre + '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
  });
  return s.replace(/\n/g, '<br>');
}

function toggleIdeaSpoiler(btn, id) {
  var body = btn.nextElementSibling;
  if (!body) return;
  var isOpen = body.classList.toggle('open');
  if (id) openedSpoilers[id] = isOpen;
  btn.innerHTML = isOpen ? '▴ Скрыть описание' : '▾ Открыть описание';
}
window.toggleIdeaSpoiler = toggleIdeaSpoiler;

/* Загрузка фото и видео (до 10 файлов) прямо внутри описания предложения (только для владельца) */
function ensureQuickFileInput() {
  var inp = document.getElementById('quickMediaInp');
  if (inp) return inp;
  inp = document.createElement('input');
  inp.type = 'file';
  inp.id = 'quickMediaInp';
  inp.multiple = true;
  inp.accept = 'image/*,video/*';
  inp.style.display = 'none';
  document.body.appendChild(inp);

  inp.addEventListener('change', function() {
    var files = Array.prototype.slice.call(inp.files || []);
    inp.value = '';
    if (!files.length || !quickUploadTargetId || !adminMode) return;
    var it = byId(quickUploadTargetId);
    if (!it) return;
    if (!it.images) it.images = [];
    if (!it.videos) it.videos = [];

    var totalNow = it.images.length + it.videos.length;
    var slotsLeft = 10 - totalNow;
    if (slotsLeft <= 0) {
      toast('Достигнут лимит: максимум 10 медиафайлов в одном предложении', true);
      return;
    }
    if (files.length > slotsLeft) {
      toast('Можно добавить ещё не более ' + slotsLeft + ' файл(ов)', true);
      files = files.slice(0, slotsLeft);
    }

    setSync('busy', 'Загрузка файлов…');
    var chain = Promise.resolve();
    files.forEach(function(file) {
      chain = chain.then(function() {
        var isVid = /^video\//i.test(file.type) || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
        var isImg = /^image\//i.test(file.type) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
        if (!isVid && !isImg) return;
        if (typeof uploadMediaFile === 'function') {
          return uploadMediaFile(file, isVid ? 'vid' : 'img').then(function(url) {
            if (isVid) it.videos.push(url);
            else it.images.push(url);
          });
        } else {
          return new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function(ev) {
              if (isVid) it.videos.push(ev.target.result);
              else it.images.push(ev.target.result);
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      });
    });

    chain.then(function() {
      openedSpoilers[it.id] = true;
      if (typeof markDirty === 'function') markDirty(it.id);
      if (typeof commit === 'function') commit();
      render();
      toast('✓ Файлы прикреплены к описанию');
    }).catch(function() {
      setSync('err', 'Ошибка загрузки файла');
      toast('Не удалось загрузить файл', true);
    });
  });
  return inp;
}

window.triggerQuickMediaUpload = function(itemId) {
  if (!adminMode) return;
  quickUploadTargetId = itemId;
  var inp = ensureQuickFileInput();
  inp.click();
};

window.removeQuickMedia = function(itemId, kind, idx) {
  if (!adminMode) return;
  var it = byId(itemId);
  if (!it) return;
  if (kind === 'img' && it.images) it.images.splice(idx, 1);
  if (kind === 'vid' && it.videos) it.videos.splice(idx, 1);
  openedSpoilers[it.id] = true;
  if (typeof markDirty === 'function') markDirty(it.id);
  if (typeof commit === 'function') commit();
  render();
  toast('Файл удалён');
};

function renderMediaBlockHtml(it) {
  var imgs = (it.images && it.images.length) ? it.images : [];
  var vids = (it.videos && it.videos.length) ? it.videos : [];
  var total = imgs.length + vids.length;
  var h = '';

  if (imgs.length || vids.length) {
    h += '<div class="sug-media-wrap">';
    if (imgs.length) {
      h += '<div class="sug-images">';
      imgs.forEach(function(url, ix) {
        h += '<div class="sug-media-item">' +
          '<img src="' + esc(url) + '" alt="Фото ' + (ix + 1) + '" onclick="openLb(\'' + esc(url) + '\')">' +
          (adminMode ? '<button type="button" class="media-del-btn" title="Удалить фото" onclick="removeQuickMedia(\'' + esc(it.id) + '\',\'img\',' + ix + ')">✕</button>' : '') +
        '</div>';
      });
      h += '</div>';
    }
    if (vids.length) {
      h += '<div class="sug-videos">';
      vids.forEach(function(url, vx) {
        h += '<div class="sug-media-item">' +
          '<video src="' + esc(url) + '" controls preload="metadata"></video>' +
          (adminMode ? '<button type="button" class="media-del-btn" title="Удалить видео" onclick="removeQuickMedia(\'' + esc(it.id) + '\',\'vid\',' + vx + ')">✕</button>' : '') +
        '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  }

  /* Кнопка добавления файлов доступна ТОЛЬКО владельцу (adminMode), другим пользователям она не видна */
  if (adminMode) {
    h += '<div class="sug-owner-upload">' +
      (total < 10
        ? '<button type="button" class="btn ghost slim" onclick="triggerQuickMediaUpload(\'' + esc(it.id) + '\')">📎 Добавить фото / видео (' + total + ' из 10)</button>'
        : '<span style="font-size:12px;color:var(--mut)">Достигнут максимум: 10 из 10 файлов</span>') +
    '</div>';
  }
  return h;
}

function renderItems() {
  var list = itemsByFac(state.fac);
  var q = state.q.toLowerCase();
  if (q) {
    list = list.filter(function(x) {
      return ((x.title || '') + ' ' + (x.text || '') + ' ' + (x.author || '')).toLowerCase().indexOf(q) >= 0;
    });
  }
  if (!list.length) {
    $('#items').innerHTML = '<div class="empty">Пока нет предложений в этой категории' + (adminMode ? ' — нажмите «＋ Добавить предложение»' : '') + '</div>';
    return;
  }

  var h = '<div class="suglist">';
  for (var i = 0; i < list.length; i++) {
    var it = list[i]; var num = i + 1;
    var ttl = itemTitle(it) || 'Без заголовка';
    var appCfg = it.appUrl && DEMO_APPS[it.appUrl] ? DEMO_APPS[it.appUrl] : null;
    var mediaCnt = ((it.images && it.images.length) ? it.images.length : 0) + ((it.videos && it.videos.length) ? it.videos.length : 0);
    var isOpen = !!openedSpoilers[it.id];

    h += '<div class="sug" data-id="' + esc(it.id) + '" style="animation-delay:' + Math.min(i * 40, 340) + 'ms">';
    h += '<div class="sug-head">';
    h += '<div class="sug-head-left"><span class="sug-num">' + num + '.</span><span class="sug-title">' + esc(ttl) + '</span></div>';

    if (appCfg && appCfg.url) {
      h += '<button type="button" class="sug-open-btn" data-open-app="' + esc(it.appUrl) + '" data-app-title="' + esc(ttl) + '">' +
           esc(appCfg.btnText || '📱 Открыть приложение') + '</button>';
    }
    h += '</div>';

    var body = itemBody(it);
    if (body || mediaCnt || adminMode) {
      var btnLbl = isOpen ? '▴ Скрыть описание' : ('▾ Открыть описание' + (mediaCnt ? ' · 📎 ' + mediaCnt : ''));
      h += '<button type="button" class="sug-spoiler-btn" onclick="toggleIdeaSpoiler(this,\'' + esc(it.id) + '\')">' + btnLbl + '</button>';
      h += '<div class="sug-spoiler-body' + (isOpen ? ' open' : '') + '">' +
           (body ? '<div class="sug-body">' + bodyToHtml(body) + '</div>' : '') +
           renderMediaBlockHtml(it) +
           '</div>';
    }

    if (adminMode) {
      h += '<div class="sug-tools">' +
           '<button class="stool drag-handle" title="Перетащите">⠿</button>' +
           '<button class="stool" title="Редактировать" data-edit="' + esc(it.id) + '">✏️</button>' +
           '<button class="stool stool-del" title="Удалить" data-del="' + esc(it.id) + '">✕</button></div>';
    }
    h += '</div>';
  }
  h += '</div>';
  $('#items').innerHTML = h;
}

function render() {
  document.body.classList.toggle('adm', !!adminMode);
  renderTop(); renderNav();
  var total = (state.fac === 'all') ? ITEMS.length : itemsByFac(state.fac).length;
  $('#hTitle').textContent = state.fac === 'all' ? 'Все предложения' : facName(state.fac);
  $('#hCnt').textContent = total;
  $('#hSub').textContent = 'Нажмите на кнопку напротив названия предложения, чтобы открыть интерактивную демонстрацию, или раскройте описание под заголовком';
  $('#addBtn').style.display = adminMode ? '' : 'none';
  renderItems();
}

function openAppDemo(appKey, customTitle) {
  var cfg = DEMO_APPS[appKey];
  if (!cfg || !cfg.url) return;
  activeAppKey = appKey;
  var ideasView = $('#ideasView'), appView = $('#appInlineView'), fr = $('#appFrame'), content = $('#content');
  if (!ideasView || !appView || !fr) return;
  $('#appOvIcon').textContent = cfg.icon || '📱';
  $('#appOvName').textContent = customTitle || cfg.name;
  ideasView.style.display = 'none';
  appView.style.display = 'flex';
  if (content) content.classList.add('app-mode');
  var sep = cfg.url.indexOf('?') >= 0 ? '&' : '?';
  var targetUrl = PAGE_DIR + cfg.url + sep + 'v=' + Date.now();
  setTimeout(function() {
    fr.src = targetUrl;
  }, 20);
}

function closeAppDemo() {
  activeAppKey = null;
  var ideasView = $('#ideasView'), appView = $('#appInlineView'), fr = $('#appFrame'), content = $('#content');
  if (!ideasView || !appView || !fr) return;
  appView.style.display = 'none';
  ideasView.style.display = 'block';
  fr.src = 'about:blank';
  if (content) content.classList.remove('app-mode');
}
window.openAppDemo = openAppDemo;
window.closeAppDemo = closeAppDemo;

function openLb(url) {
  var lb = $('#lb'), img = $('#lbImg');
  if (!lb || !img) return;
  img.src = url; lb.classList.add('show');
  requestAnimationFrame(function() { lb.classList.add('zoom'); });
}
function closeLb() {
  var lb = $('#lb'); if (!lb) return;
  lb.classList.remove('zoom');
  setTimeout(function() { lb.classList.remove('show'); }, 240);
}
window.openLb = openLb;
window.closeLb = closeLb;
