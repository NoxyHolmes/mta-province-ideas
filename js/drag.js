var drag = null;

function startDrag(ev, handle) {
  var card = handle.closest('.sug'); if (!card) return;
  ev.preventDefault();
  drag = { id: card.getAttribute('data-id'), card: card, moved: false };
  card.classList.add('dragging'); document.body.classList.add('drag-now');
}

function endDrag(apply) {
  var d = drag; drag = null; if (!d) return;
  d.card.classList.remove('dragging'); document.body.classList.remove('drag-now');
  if (!apply || !d.moved) { render(); return; }
  var order = [];
  var cards = document.querySelectorAll('#items .sug');
  for (var i = 0; i < cards.length; i++) order.push(cards[i].getAttribute('data-id'));
  var fac = state.fac, sub = [], out = [], p = 0;
  for (var j = 0; j < ITEMS.length; j++) if (fac === 'all' || ITEMS[j].fac === fac) sub.push(ITEMS[j]);
  if (sub.length === order.length) {
    var newSub = [];
    for (var k = 0; k < order.length; k++) {
      var f = sub.findIndex(function(m) { return m && m.id === order[k]; });
      if (f < 0) { newSub = null; break; }
      newSub.push(sub[f]); sub.splice(f, 1);
    }
    if (newSub) {
      for (var n = 0; n < ITEMS.length; n++) {
        if (fac === 'all' || ITEMS[n].fac === fac) out.push(newSub[p++]); else out.push(ITEMS[n]);
      }
      ITEMS = out; commit();
    }
  }
  render();
}
