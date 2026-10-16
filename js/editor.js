var editingId = null;
var editDraft = { fac: 'general', title: '', text: '', appUrl: '', images: [], videos: [] };

function askAdmin() {
  if (!REPO) {
    adminMode = true; render();
    toast('Демо-режим: данные сохраняются локально в браузере');
    return;
  }
  $('#mroot').innerHTML =
    '<div class="back" onclick="if(event.target===this)closeM()"><div class="modal smw">' +
    '<div class="m-head"><div class="mh-nm" style="font-size:16px">🔒 Вход владельца</div>' +
    '<div class="mh-sub">Введите токен с правом записи в репозиторий <b>' + esc(REPO) + '</b>.</div>' +
    '<button class="m-close" onclick="closeM()">✕</button></div>' +
    '<div class="m-body"><label class="flab">Токен доступа (ghp_...)</label>' +
    '<input class="inp" id="fKey" type="password" placeholder="ghp_..." autocomplete="off"></div>' +
    '<div class="m-foot"><button class="btn ghost" onclick="closeM()">Отмена</button><button class="btn" onclick="tryLogin()">Войти</button></div></div></div>';
}

function tryLogin() {
  var kk = $('#fKey'); var tok = kk ? kk.value.trim() : '';
  if (!tok) { toast('Введите токен', true); return; }
  checkToken(tok).then(function(ok) {
    if (!ok) { toast('Токен без права записи', true); return; }
    ADMIN_KEY = tok; LS.set(KEY_K, tok); adminMode = true;
    closeM(); render();
    if (needSeed || dataDirty) { dataDirty = true; doPush(); }
    toast('Вход выполнен');
  }).catch(function() { toast('Неверный токен или ошибка сети', true); });
}

function logout() {
  ADMIN_KEY = ''; adminMode = false; LS.remove(KEY_K);
  render(); toast('Вы вышли');
}
window.askAdmin = askAdmin; window.tryLogin = tryLogin; window.logout = logout;

function openAdd() {
  if (!adminMode) return;
  editingId = null;
  editDraft = { fac: (state.fac === 'all' ? 'general' : state.fac), title: '', text: '', appUrl: '', images: [], videos: [] };
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
    '<button class="m-close" onclick="closeM()">✕</button></div>' +
    '<div class="m-body">' +
      '<label class="flab">Раздел</label><select class="sel" id="fFac">' + facOpts + '</select><div style="height:12px"></div>' +
      '<label class="flab">Заголовок предложения</label><input class="inp" id="fTitle" value="' + esc(editDraft.title) + '"><div style="height:12px"></div>' +
      '<label class="flab">Кнопка интерактивного приложения напротив названия</label><select class="sel" id="fAppUrl">' + appOpts + '</select><div style="height:12px"></div>' +
      '<label class="flab">Описание</label><textarea class="inp" id="fText">' + esc(editDraft.text) + '</textarea>' +
    '</div>' +
    '<div class="m-foot"><button class="btn ghost" onclick="closeM()">Отмена</button><button class="btn" onclick="saveItem()">Сохранить</button></div></div></div>';
}

function saveItem() {
  if (!adminMode) return;
  captureForm();
  var ttl = (editDraft.title || '').trim(), txt = (editDraft.text || '').trim();
  if (!ttl && !txt) { toast('Заполните заголовок или описание', true); return; }
  if (editingId) {
    var it = byId(editingId);
    if (it) {
      it.fac = editDraft.fac; it.title = ttl; it.text = txt; it.appUrl = editDraft.appUrl || '';
      markDirty(it.id);
    }
  } else {
    var ni = {
      id: 'i' + Date.now().toString(36) + rand(),
      fac: editDraft.fac, title: ttl, text: txt, appUrl: editDraft.appUrl || '',
      author: 'Владелец', date: today(), images: [], videos: []
    };
    ITEMS.unshift(ni); markDirty(ni.id);
  }
  editingId = null; closeM(); commit(); render(); toast('✓ Сохранено');
}
window.saveItem = saveItem;

function askDel(id) {
  if (!adminMode) return;
  if (!confirm('Удалить предложение?')) return;
  var idx = ITEMS.findIndex(function(x) { return x.id === id; });
  if (idx >= 0) { ITEMS.splice(idx, 1); markDeleted(id); commit(); render(); }
}
window.askDel = askDel;
