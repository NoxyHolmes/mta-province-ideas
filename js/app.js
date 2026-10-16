/* ===================== ТОЧКА ВХОДА И СОБЫТИЯ ===================== */
window.addEventListener('error', function(ev) {
  if (!(ev instanceof ErrorEvent) || !ev.message) return;
  var b = document.getElementById('errbox');
  if (b) {
    b.style.display = 'block';
    b.textContent = 'Ошибка: ' + ev.message + (ev.filename ? '\n' + ev.filename + ':' + (ev.lineno || 0) : '');
  }
}, true);

document.addEventListener('click', function(ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  var el;

  /* Клик по кнопке-названию для открытия интерактивного приложения */
  if ((el = t.closest('[data-open-app]'))) {
    openAppDemo(el.getAttribute('data-open-app'), el.getAttribute('data-app-title'));
    return;
  }

  if ((el = t.closest('[data-img]'))) { openLb(el.getAttribute('data-img')); return; }
  if ((el = t.closest('[data-edit]'))) { openEdit(el.getAttribute('data-edit')); return; }
  if ((el = t.closest('[data-del]'))) { askDel(el.getAttribute('data-del')); return; }
  if ((el = t.closest('[data-phrm]'))) { captureForm(); editDraft.images.splice(+el.getAttribute('data-phrm'), 1); renderMediaGrid(); return; }
  if ((el = t.closest('[data-vrm]'))) { captureForm(); editDraft.videos.splice(+el.getAttribute('data-vrm'), 1); renderMediaGrid(); return; }

  var facEl = t.closest('.sb-item[data-fac]') || t.closest('.mchip[data-fac]');
  if (facEl) { setFac(facEl.getAttribute('data-fac')); return; }
});

document.addEventListener('keydown', function(ev) {
  if (ev.key === 'Escape') {
    closeAppDemo();
    closeLb();
    closeC();
    closeM();
  }
});

var lbEl = $('#lb');
if (lbEl) lbEl.addEventListener('click', closeLb);

document.addEventListener('pointerdown', function(ev) {
  if (drag) return;
  var h = (ev.target && ev.target.closest) ? ev.target.closest('.drag-handle') : null;
  if (h) startDrag(ev, h);
});

document.addEventListener('pointermove', function(ev) {
  if (!drag || !drag.card) return;
  drag.moved = true;
  var el = document.elementFromPoint(ev.clientX, ev.clientY);
  if (!el || !el.closest) return;
  var card = el.closest('.sug');
  var list = $('#items .suglist');
  if (!list || !card || card === drag.card) return;
  var rect = card.getBoundingClientRect();
  if (ev.clientY < rect.top + rect.height / 2) {
    if (card.previousSibling !== drag.card) list.insertBefore(drag.card, card);
  } else {
    if (card.nextSibling !== drag.card) list.insertBefore(drag.card, card.nextSibling);
  }
});

document.addEventListener('pointerup', function() { if (drag) endDrag(true); });
document.addEventListener('pointercancel', function() { if (drag) endDrag(false); });

var qEl = $('#qInp');
if (qEl) qEl.addEventListener('input', function() { state.q = this.value; renderItems(); });

/* Запуск приложения */
renderTop();
initRemote();
