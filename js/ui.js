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

/* Генерация сводной таблицы рангов (Слева № ранга, справа фракции и вниз должности) */
function buildRanksComparisonTable() {
  var rows = [
    [1,  'Рядовой',            'Рядовой',         'Рядовой',            'Санитар',                              'Локомотивная (ТЧМ): Ученик машиниста | Станционная (ДСП): Сигналист | Путевая: Монтёр пути | Энерго: Электромонтёр | Вагонная: Осмотрщик вагонов'],
    [2,  'Младший сержант',    'Младший сержант', 'Ефрейтор',           'Старший санитар',                      'Локомотивная: Помощник машиниста | Станционная: Дежурный стрелочного поста | Путевая: Бригадир пути | Энерго: Электромеханик | Вагонная: Старший осмотрщик'],
    [3,  'Сержант',            'Сержант',         'Младший сержант',    'Младший медицинский работник',         'Локомотивная: Машинист | Станционная: Маневровый диспетчер / составитель поездов | Путевая: Дорожный мастер | Энерго: Энергодиспетчер | Вагонная: Мастер'],
    [4,  'Старший сержант',    'Старший сержант', 'Сержант',            'Медицинский работник',                 'Диспетчерская (ДНЦ): Поездной диспетчер (ДНЦ) | Локомотивная: Машинист 3 класса | Станционная: Дежурный по станции (ДСП) | Путевая: Старший дорожный мастер | Энерго: Старший энергодиспетчер'],
    [5,  'Старшина',           'Старшина',        'Старший сержант',    'Старший медицинский работник',         'Диспетчерская: Старший поездной диспетчер | Локомотивная: Машинист 2 класса | Станционная: Старший ДСП | Путевая: Начальник участка пути'],
    [6,  'Прапорщик',          'Прапорщик',       'Старшина',           'Фельдшер',                             'Диспетчерская: Дорожный диспетчер (ЕДЦУ) | Локомотивная: Машинист 1 класса | Станционная: Начальник смены станции'],
    [7,  'Старший прапорщик',  'Старший прапорщик','Прапорщик',         'Старший фельдшер',                     'Диспетчерская: Начальник смены диспетчерского центра | Локомотивная: Машинист-инструктор / Машинист-ревизор | Станционная: Зам. начальника станции'],
    [8,  'Младший лейтенант',  'Младший лейтенант','Старший прапорщик', 'Главный медработник (среднее звено)',  'Диспетчерская: Зам. начальника диспетчерского центра | Локомотивная: Начальник колонны (локомотивных бригад)'],
    [9,  'Лейтенант',          'Лейтенант',       'Младший лейтенант',  'Врач-ординатор',                       'Локомотивная: Заместитель начальника эксплуатационного локомотивного депо'],
    [10, 'Старший лейтенант',  'Старший лейтенант','Лейтенант',         'Врач-стажёр (под наставником)',        'Руководители линейных подразделений: Начальник станции / Начальник дистанции пути / Начальник дистанции электроснабжения / Начальник вагонного депо'],
    [11, 'Капитан',            'Капитан',         'Старший лейтенант',  'Врач (аккредитованный специалист)',    'Начальник эксплуатационного локомотивного депо (ТЧМ) / Начальник диспетчерского центра (ДЦУП / ЕДЦУ)'],
    [12, 'Майор',              'Майор',           'Капитан',            'Врач второй категории',                'Уровень железной дороги (регион): Заместители начальника железной дороги (по службам)'],
    [13, 'Подполковник',       'Подполковник',    'Майор',              'Врач первой категории',                'Уровень железной дороги (регион): Первый заместитель начальника железной дороги'],
    [14, 'Полковник',          'Полковник (Макс.)','Подполковник',      'Врач высшей категории',                'Уровень железной дороги (регион): Начальник железной дороги'],
    [15, 'Генерал-майор',      '—',               'Полковник',          'Ведущий специалист',                   'Высшее руководство (корпоративный уровень): Вице-президенты (по направлениям: перевозки, тяга, инфраструктура)'],
    [16, 'Генерал-лейтенант',  '—',               'Генерал-майор',      'Зам. заведующего отделением',          'Высшее руководство (корпоративный уровень): Заместители генерального директора (по направлениям)'],
    [17, 'Генерал-полковник',  '—',               'Генерал-лейтенант',  'Заведующий отделением',                'Высшее руководство (корпоративный уровень): Первый заместитель генерального директора'],
    [18, 'Генерал полиции',    '—',               'Генерал-полковник',  'Заместитель главного врача',           'Высшее руководство (корпоративный уровень): Генеральный директор — Председатель правления ОАО «РЖД»'],
    [19, '—',                  '—',               'Генерал армии',      'Главный врач / Рук. департамента',     '—'],
    [20, '—',                  '—',               'Маршал',             'Министр здравоохранения',              '—']
  ];

  var h = '<div style="margin-top:16px;overflow-x:auto;border:1px solid rgba(167,139,250,.3);border-radius:14px;background:rgba(10,14,22,.85)">' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:980px">' +
    '<thead><tr style="background:rgba(124,93,250,.18);text-align:left;color:#fff">' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);width:64px;text-align:center">№ ранга</th>' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:#60a5fa">🛡️ УМВД</th>' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:#38bdf8">🚓 ОГИБДД</th>' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:#34d399">🎖️ Минобороны (МО)</th>' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:#f87171">🏥 Минздрав (МЗ)</th>' +
      '<th style="padding:10px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:#fbbf24">🚂 ОАО «РЖД» (Параллельные вертикали по службам)</th>' +
    '</tr></thead><tbody>';

  rows.forEach(function(r, idx) {
    var bg = (idx % 2 === 1) ? 'rgba(255,255,255,.02)' : 'transparent';
    h += '<tr style="background:' + bg + ';border-bottom:1px solid rgba(255,255,255,.05)">' +
      '<td style="padding:9px 10px;text-align:center;font-weight:900;color:#c4b5fd">' + r[0] + '</td>' +
      '<td style="padding:9px 10px;font-weight:700;color:#e2e8f0">' + esc(r[1]) + '</td>' +
      '<td style="padding:9px 10px;font-weight:700;color:#bae6fd">' + esc(r[2]) + '</td>' +
      '<td style="padding:9px 10px;font-weight:700;color:#e2e8f0">' + esc(r[3]) + '</td>' +
      '<td style="padding:9px 10px;color:#cbd5e1">' + esc(r[4]) + '</td>' +
      '<td style="padding:9px 10px;color:#fde68a;line-height:1.45">' + esc(r[5]) + '</td>' +
    '</tr>';
  });

  h += '</tbody></table></div>';
  return h;
}

function bodyToHtml(text) {
  if (!text) return '';
  var s = esc(text);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g, function(m, pre, url) {
    return pre + '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
  });
  s = s.replace(/\n/g, '<br>');
  if (s.indexOf('[[RANKS_TABLE]]') >= 0) {
    s = s.replace('[[RANKS_TABLE]]', buildRanksComparisonTable());
  }
  return s;
}

function toggleIdeaSpoiler(btn, id) {
  var body = btn.nextElementSibling;
  if (!body) return;
  var isOpen = body.classList.toggle('open');
  if (id) openedSpoilers[id] = isOpen;
  btn.innerHTML = isOpen ? '▴ Скрыть описание' : '▾ Открыть описание';
}
window.toggleIdeaSpoiler = toggleIdeaSpoiler;

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

window.removeQuickMedia = function(ev, itemId, kind, idx) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  if (!adminMode) return;
  var it = byId(itemId);
  if (!it) return;
  if (kind === 'img' && Array.isArray(it.images)) {
    it.images.splice(idx, 1);
  } else if (kind === 'vid' && Array.isArray(it.videos)) {
    it.videos.splice(idx, 1);
  }
  openedSpoilers[it.id] = true;
  if (typeof markDirty === 'function') markDirty(it.id);
  if (typeof saveLocal === 'function') saveLocal(ITEMS);
  if (typeof cacheItems === 'function') cacheItems();
  if (typeof commit === 'function') commit();
  render();
  toast('✓ Прикреплённый файл удалён');
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
        h += '<div class="sug-media-item" style="display:flex;flex-direction:column;gap:6px">' +
          '<img src="' + esc(url) + '" alt="Фото ' + (ix + 1) + '" onclick="openLb(\'' + esc(url) + '\')">' +
          (adminMode
            ? '<button type="button" class="btn warn slim" style="width:100%;padding:6px 10px;font-size:11.5px" onclick="removeQuickMedia(event,\'' + esc(it.id) + '\',\'img\',' + ix + ')">🗑 Удалить фото</button>'
            : '') +
        '</div>';
      });
      h += '</div>';
    }
    if (vids.length) {
      h += '<div class="sug-videos">';
      vids.forEach(function(url, vx) {
        h += '<div class="sug-media-item" style="display:flex;flex-direction:column;gap:6px">' +
          '<video src="' + esc(url) + '" controls preload="metadata"></video>' +
          (adminMode
            ? '<button type="button" class="btn warn slim" style="align-self:flex-start;padding:6px 14px;font-size:11.5px" onclick="removeQuickMedia(event,\'' + esc(it.id) + '\',\'vid\',' + vx + ')">🗑 Удалить видео</button>'
            : '') +
        '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  }

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
