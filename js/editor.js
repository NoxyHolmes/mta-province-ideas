/* ===================== РЕДАКТОР И АВТОРИЗАЦИЯ ===================== */
var editingId = null;
var editDraft = { fac: 'general', title: '', text: '', appUrl: '', images: [], videos: [] };
var editUploading = [];
var freshPreview = {};

function askAdmin() {
  if (!REPO) {
    adminMode = true; render();
    toast('Демо-режим: данные сохраняются локально в этом браузере');
    return;
  }
  $('#mroot').innerHTML =
    '<div class="back" onclick="if(event.target===this)closeM()"><div class="modal smw">' +
    '<div class="m-head"><div class="mh-nm" style="font-size:16px">🔒 Вход владельца</div>' +
    '<div class="mh-sub">Токен должен иметь право записи в репозиторий <b>' + esc(REPO) + '</b>.</div>' +
    '<button class="m-close" onclick="closeM()">✕</button></div>' +
    '<div class="m-body"><label class="flab">Токен доступа (ghp_...)</label>' +
    '<input class="inp" id="fKey" type="password" placeholder="ghp_..." autocomplete="off">' +
    '<div class="hint">GitHub → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → галочка <b>repo</b>.</div></div>' +
    '<div class="m-foot"><button class="btn ghost" onclick="closeM()">Отмена</button>' +
    '<button class="btn" onclick="tryLogin()">Войти</button></div></div></div>';
  setTimeout(function() { var k = $('#fKey'); if (k) k.focus(); }, 60);
}

function tryLogin() {
  var kk = $('#fKey'); var tok = kk ? kk.value.trim() : '';
  if (!tok) { toast('Введите токен', true); return; }
  setSync('busy', 'Проверка…');
  checkToken(tok).then(function(ok) {
    if (!ok) { setSync('err', 'Ошибка'); toast('Токен без права записи', true); return; }
    ADMIN_KEY = tok; LS.set(KEY_K, tok); adminMode = true;
    closeM(); render();
    if (needSeed || dataDirty || LS.get(PENDING_K)) { dataDirty = true; doPush(); }
    toast('Вход выполнен — доступно редактирование');
  }).catch(function(code) {
    setSync('err', 'Ошибка');
    toast(code === 401 ? 'Неверный токен' : 'Ошибка проверки сети', true);
  });
}

function logout() {
  ADMIN_KEY = ''; adminMode = false; LS.remove(KEY_K);
  clearTimeout(pushTimer); pushTimer = null;
  writeQ = []; dataDirty = false; pushInFlight = false; pendingRev = null;
  invalidateGitCache(); hideSavebar(); render();
  toast('Вы вышли');
}
window.askAdmin = askAdmin; window.tryLogin = tryLogin; window.logout = logout;

function openAdd() {
  if (!adminMode) return;
  editingId = null;
  editDraft = { fac: (state.fac === 'all' ? 'general' : state.fac), title: '', text: '', appUrl: '', images: [], videos: [] };
  editUploading = [];
  openEditor();
}

function openEdit(id) {
  if (!adminMode) return;
  var it = byId(id); if (!it) return;
  editingId = id;
  editDraft = {
    fac: it.fac || 'general',
    title: itemTitle(it),
    text: itemBody(it),
    appUrl: it.appUrl || '',
    images: (it.images || []).slice(),
    videos: (it.videos || []).slice()
  };
  editUploading = [];
  openEditor();
}
window.openAdd = openAdd; window.openEdit = openEdit;

function captureForm() {
  var elFac = $('#fFac'), elTitle = $('#fTitle'), elText = $('#fText'), elApp = $('#fAppUrl');
  if (elFac && elFac.value) editDraft.fac = elFac.value;
  if (elTitle) editDraft.title = elTitle.value;
  if (elText) editDraft.text = elText.value;
  if (elApp) editDraft.appUrl = elApp.value;
}

function openEditor() {
  var isEdit = !!editingId;
  var facOpts = '';
  for (var i = 0; i < FACTS.length; i++) {
    if (FACTS[i].k === 'all') continue;
    facOpts += '<option value="' + FACTS[i].k + '"' + (editDraft.fac === FACTS[i].k ? ' selected' : '') + '>' + FACTS[i].ic + ' ' + esc(FACTS[i].n) + '</option>';
  }

  var appOpts = '';
  for (var ak in DEMO_APPS) {
    if (!Object.prototype.hasOwnProperty.call(DEMO_APPS, ak)) continue;
    appOpts += '<option value="' + esc(ak) + '"' + (editDraft.appUrl === ak ? ' selected' : '') + '>' + esc(DEMO_APPS[ak].name) + '</option>';
  }

  $('#mroot').innerHTML =
    '<div class="back" onclick="if(event.target===this)closeM()"><div class="modal">' +
    '<div class="m-head"><div class="mh-nm">' + (isEdit ? '✏️ Редактирование' : '💡 Новое предложение') + '</div>' +
    '<div class="mh-sub">Вы можете привязать к заголовку интерактивное приложение (Автопарк или Телефон МВД)</div>' +
    '<button class="m-close" onclick="closeM()">✕</button></div>' +
    '<div class="m-body">' +
      '<label class="flab">Раздел</label>' +
      '<select class="sel" id="fFac">' + facOpts + '</select>' +
      '<div style="height:12px"></div>' +
      '<label class="flab">Заголовок (станет кнопкой, если выбрано приложение)</label>' +
      '<input class="inp" id="fTitle" placeholder="Например: Фракционный транспорт" maxlength="200" value="' + esc(editDraft.title) + '">' +
      '<div style="height:12px"></div>' +
      '<label class="flab">Интерактивное приложение при клике на название</label>' +
      '<select class="sel" id="fAppUrl">' + appOpts + '</select>' +
      '<div style="height:12px"></div>' +
      '<label class="flab">Описание под кнопкой</label>' +
      '<textarea class="inp" id="fText" placeholder="Подробности: что предлагаете, зачем и как это должно работать…">' + esc(editDraft.text) + '</textarea>' +
      '<div style="height:14px"></div>' +
      '<label class="flab">Фото и видео</label>' +
      '<div class="phgrid" id="phGrid"></div>' +
    '</div>' +
    '<div class="m-foot">' +
      '<button class="btn ghost" onclick="closeM()">Отмена</button>' +
      '<button class="btn" onclick="saveItem()">' + (isEdit ? 'Сохранить' : 'Добавить') + '</button>' +
    '</div></div></div>';

  renderMediaGrid();
  setTimeout(function() { var t = $('#fTitle'); if (t) t.focus(); }, 80);
}

function renderMediaGrid() {
  var grid = $('#phGrid'); if (!grid) return;
  var h = '';
  for (var i = 0; i < editDraft.images.length; i++) {
    var url = editDraft.images[i];
    h += '<div class="phtile"><img src="' + esc(freshPreview[url] || url) + '" alt=""><button type="button" class="phrm" data-phrm="' + i + '">✕</button></div>';
  }
  for (var v = 0; v < editDraft.videos.length; v++) {
    var vu = editDraft.videos[v];
    h += '<div class="phtile"><video src="' + esc(freshPreview[vu] || vu) + '" preload="metadata" muted playsinline></video><span class="vbadge">🎬</span><button type="button" class="phrm" data-vrm="' + v + '">✕</button></div>';
  }
  h += '<div class="phadd" id="phAdd"><span class="phadd-ic">＋</span><b>Добавить медиа</b><span>фото ' + editDraft.images.length + '/' + MAX_IMAGES + '</span></div>';
  grid.innerHTML = h;
  var phAdd = $('#phAdd');
  if (phAdd) phAdd.addEventListener('click', function() { var f = $('#fileInp'); if (f) f.click(); });
}

function saveItem() {
  if (!adminMode) return;
  captureForm();
  var ttl = (editDraft.title || '').trim();
  var txt = (editDraft.text || '').trim();
  if (!ttl && !txt) { toast('Заполните заголовок или описание', true); return; }

  var isEdit = !!editingId;
  if (isEdit) {
    var it = byId(editingId);
    if (!it) { editingId = null; closeM(); render(); return; }
    it.fac = editDraft.fac; it.title = ttl; it.text = txt; it.appUrl = editDraft.appUrl || '';
    it.images = editDraft.images.slice(); it.videos = editDraft.videos.slice();
    markDirty(it.id);
  } else {
    var ni = {
      id: 'i' + Date.now().toString(36) + rand(),
      fac: editDraft.fac, title: ttl, text: txt, appUrl: editDraft.appUrl || '',
      author: 'Владелец', date: today(),
      images: editDraft.images.slice(), videos: editDraft.videos.slice()
    };
    ITEMS.unshift(ni);
    markDirty(ni.id);
  }
  editingId = null;
  closeM(); commit(); render();
  toast(isEdit ? '✓ Изменения сохранены' : '✓ Предложение добавлено');
}
window.saveItem = saveItem;

function askDel(id) {
  if (!adminMode) return;
  var it = byId(id); if (!it) return;
  $('#croot').innerHTML =
    '<div class="back" onclick="if(event.target===this)closeC()"><div class="modal smw">' +
    '<div class="m-head"><div class="mh-nm" style="font-size:16px">🗑 Удалить предложение?</div>' +
    '<div class="mh-sub">«' + esc(itemTitle(it) || 'Без заголовка') + '» будет удалено.</div>' +
    '<button class="m-close" onclick="closeC()">✕</button></div>' +
    '<div class="m-foot"><button class="btn ghost" onclick="closeC()">Отмена</button>' +
    '<button class="btn warn" onclick="delItem(\'' + esc(id) + '\')">Удалить</button></div></div></div>';
}

function delItem(id) {
  closeC();
  var idx = ITEMS.findIndex(function(x) { return x.id === id; });
  if (idx < 0) return;
  ITEMS.splice(idx, 1);
  markDeleted(id);
  commit(); render();
}
window.askDel = askDel; window.delItem = delItem;
