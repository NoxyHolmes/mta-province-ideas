window.addEventListener('error', function(ev) {
  if (!(ev instanceof ErrorEvent) || !ev.message) return;
  var b = document.getElementById('errbox');
  if (b) { b.style.display = 'block'; b.textContent = 'Ошибка: ' + ev.message; }
}, true);

document.addEventListener('click', function(ev) {
  var t = ev.target; if (!t || !t.closest) return;
  var el;
  if ((el = t.closest('[data-open-app]'))) {
    openAppDemo(el.getAttribute('data-open-app'), el.getAttribute('data-app-title'));
    return;
  }
  if ((el = t.closest('[data-img]'))) { openLb(el.getAttribute('data-img')); return; }
  if ((el = t.closest('[data-edit]'))) { openEdit(el.getAttribute('data-edit')); return; }
  if ((el = t.closest('[data-del]'))) { askDel(el.getAttribute('data-del')); return; }
  var facEl = t.closest('.sb-item[data-fac]') || t.closest('.mchip[data-fac]');
  if (facEl) { setFac(facEl.getAttribute('data-fac')); return; }
});

document.addEventListener('keydown', function(ev) {
  if (ev.key === 'Escape') { closeAppDemo(); closeLb(); closeC(); closeM(); }
});

var qEl = $('#qInp');
if (qEl) qEl.addEventListener('input', function() { state.q = this.value; renderItems(); });

renderTop();
initRemote();
