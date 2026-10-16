/* ===================== РЕНДЕР И ОТКРЫТИЕ ПРИЛОЖЕНИЙ ===================== */
function renderTop() {
  var z = $('#adminZone'); if (!z) return;
  z.innerHTML = adminMode
    ? '<span class="adbadge">✏️ Владелец</span><button class="btn ghost slim" onclick="logout()">Выйти</button>'
    : '<button class="btn ghost slim" onclick="askAdmin()">🔒 Вход владельца</button>';
}

function setFac(k) {
  state.fac = k; state.q = '';
  var qi = $('#qInp'); if (qi) qi.value = '';
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

function renderItems() {
  var list = itemsByFac(state.fac);
  var q = state.q.toLowerCase();
  if (q) {
    list = list.filter(function(x) {
      return ((x.title || '') + ' ' + (x.text || '') + ' ' + (x.author || '')).toLowerCase().indexOf(q) >= 0;
    });
  }
  if (!list.length) {
    $('#items').innerHTML = '<div class="empty">Пока нет предложений в этой категории' +
      (adminMode ? ' — нажмите «＋ Добавить предложение»' : '') +
      (q ? ' — или измените поисковый запрос' : '') + '</div>';
    return;
  }

  var h = '<div class="suglist">';
  for (var i = 0; i < list.length; i++) {
    var it = list[i]; var num = i + 1;
    var ttl = itemTitle(it) || 'Без заголовка';
    var appCfg = it.appUrl && DEMO_APPS[it.appUrl] ? DEMO_APPS[it.appUrl] : null;

    h += '<div class="sug" data-id="' + esc(it.id) + '" style="animation-delay:' + Math.min(i * 40, 340) + 'ms">';
    h += '<div class="sug-head"><span class="sug-num">' + num + '.</span><div class="sug-titlewrap">';

    /* Если к идее привязано приложение — рендерим кликабельную кнопку-заголовок */
    if (appCfg && appCfg.url) {
      h += '<button type="button" class="sug-app-btn" data-open-app="' + esc(it.appUrl) + '" data-app-title="' + esc(ttl) + '">' +
           '<span>' + (appCfg.icon || '🚀') + ' ' + esc(ttl) + '</span>' +
           '<span class="app-badge">' + esc(appCfg.badge || 'Открыть приложение') + ' ↗</span>' +
           '</button>';
    } else {
      h += '<span class="sug-title">' + esc(ttl) + '</span>';
    }

    h += '</div></div>';

    var body = itemBody(it);
    if (body) h += '<div class="sug-body">' + bodyToHtml(body) + '</div>';

    if (it.images && it.images.length) {
      h += '<div class="sug-images">';
      for (var k = 0; k < it.images.length; k++) {
        h += '<img src="' + esc(it.images[k]) + '" data-img="' + esc(it.images[k]) + '" alt="" loading="lazy" data-rtry="1">';
      }
      h += '</div>';
    }
    if (it.videos && it.videos.length) {
      h += '<div class="sug-videos">';
      for (var v = 0; v < it.videos.length; v++) {
        h += '<video controls playsinline preload="metadata" src="' + esc(it.videos[v]) + '" data-rtry="1"></video>';
      }
      h += '</div>';
    }
    if (adminMode) {
      h += '<div class="sug-tools">' +
           '<button class="stool drag-handle" title="Перетащите, чтобы изменить порядок">⠿</button>' +
           '<button class="stool" title="Редактировать" data-edit="' + esc(it.id) + '">✏️</button>' +
           '<button class="stool stool-del" title="Удалить" data-del="' + esc(it.id) + '">✕</button>' +
           '</div>';
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
  $('#hSub').textContent = adminMode
    ? 'Изменения сохраняются на GitHub — нажмите на кнопку заголовка идеи, чтобы запустить интерактивный прототип'
    : 'Нажмите на подсвеченное название-кнопку в карточке, чтобы открыть интерактивное приложение идеи';
  $('#addBtn').style.display = adminMode ? '' : 'none';
  renderItems();
}

/* Открытие и закрытие интерактивных демо-приложений */
function openAppDemo(appKey, customTitle) {
  var cfg = DEMO_APPS[appKey];
  if (!cfg || !cfg.url) return;
  var ov = $('#appOverlay'), fr = $('#appFrame');
  if (!ov || !fr) return;
  $('#appOvIcon').textContent = cfg.icon || '🚀';
  $('#appOvName').textContent = customTitle || cfg.name;
  fr.src = cfg.url;
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAppDemo() {
  var ov = $('#appOverlay'), fr = $('#appFrame');
  if (!ov || !fr) return;
  ov.style.display = 'none';
  fr.src = 'about:blank';
  document.body.style.overflow = '';
}
window.openAppDemo = openAppDemo;
window.closeAppDemo = closeAppDemo;

/* Лайтбокс для изображений */
function openLb(url) {
  var lb = $('#lb'), img = $('#lbImg');
  if (!lb || !img) return;
  img.src = url;
  lb.classList.add('show');
  requestAnimationFrame(function() { requestAnimationFrame(function() { lb.classList.add('zoom'); }); });
}
function closeLb() {
  var lb = $('#lb'); if (!lb) return;
  lb.classList.remove('zoom');
  setTimeout(function() { lb.classList.remove('show'); var im = $('#lbImg'); if (im) im.src = ''; }, 240);
}
window.openLb = openLb;
window.closeLb = closeLb;
