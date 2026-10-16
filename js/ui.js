var activeAppKey = null;

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

    h += '<div class="sug" data-id="' + esc(it.id) + '" style="animation-delay:' + Math.min(i * 40, 340) + 'ms">';
    h += '<div class="sug-head">';
    h += '<div class="sug-head-left"><span class="sug-num">' + num + '.</span><span class="sug-title">' + esc(ttl) + '</span></div>';

    if (appCfg && appCfg.url) {
      h += '<button type="button" class="sug-open-btn" data-open-app="' + esc(it.appUrl) + '" data-app-title="' + esc(ttl) + '">' +
           esc(appCfg.btnText || '📱 Открыть приложение') + '</button>';
    }
    h += '</div>';

    var body = itemBody(it);
    if (body) h += '<div class="sug-body">' + bodyToHtml(body) + '</div>';

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
  $('#hSub').textContent = 'Нажмите на кнопку напротив названия предложения, чтобы открыть интерактивное приложение (левое меню останется доступным)';
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
  fr.src = cfg.url;
  ideasView.style.display = 'none';
  appView.style.display = 'flex';
  if (content) content.classList.add('app-mode');
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
