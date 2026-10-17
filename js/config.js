var APP_VER = 'v11.7';

var REPO = (function() {
  var h = location.hostname, p = location.pathname;
  if (!/\.github\.io$/.test(h)) return null;
  var owner = h.replace(/\.github\.io$/, '');
  var seg = p.split('/').filter(Boolean);
  return owner + '/' + (seg.length ? seg[0] : (owner + '.github.io'));
})();

var BRANCH = 'main';

var PAGE_DIR = (function() {
  var p = location.pathname || '/';
  var i = p.lastIndexOf('/');
  var last = p.substring(i + 1);
  if (last.indexOf('.') >= 0) p = p.substring(0, i + 1);
  if (p.charAt(p.length - 1) !== '/') p += '/';
  return p;
})();

var NET_TO_READ = 12000, NET_TO_WRITE = 30000;
var MAX_IMAGES = 10, MAX_VIDEOS = 5, MAX_IMG_MB = 15, MAX_VID_MB = 100;
var LOCAL_K = 'idea_local_v8', CACHE_K = 'idea_cache_v8', KEY_K = 'idea_admin_key', PENDING_K = 'idea_pending_v8';

var GROUPS = [{ n: 'Фракции' }, { n: 'Прочие предложения' }];

var FACTS = [
  { k: 'all',     n: 'Все предложения', ic: '📋', g: 0 },
  { k: 'general', n: 'Общие',           ic: '💡', g: 0 },
  { k: 'mvd',     n: 'МВД',             ic: '🛡️', g: 0 },
  { k: 'mo',      n: 'Минобороны',      ic: '🎖️', g: 0 },
  { k: 'mz',      n: 'Минздрав',        ic: '🏥', g: 0 },
  { k: 'mt',      n: 'Минтранс',        ic: '🚂', g: 0 },
  { k: 'opg',     n: 'ОПГ',             ic: '🔫', g: 0 },
  { k: 'other',   n: 'Прочее',          ic: '📦', g: 0 },
  { k: 'works',   n: 'Работы и прочее', ic: '💼', g: 1 }
];

var DEMO_APPS = {
  '': { name: 'Нет (обычное предложение)', url: '', icon: '', btnText: '' },
  'mvd_phone': {
    name: '📱 Функциональное фракционное приложение',
    url: 'apps/mvd-phone.html',
    icon: '📱',
    btnText: '📱 Открыть телефон'
  }
};

function facName(k) {
  for (var i = 0; i < FACTS.length; i++) if (FACTS[i].k === k) return FACTS[i].n;
  return 'Раздел';
}

function seed() {
  return [
    {
      id: 's1',
      fac: 'general',
      title: 'Функциональное фракционное приложение',
      text: 'Единое многофункциональное приложение в смартфоне для государственных фракций: при клике на кнопку справа открывается телефон, где через иконку МВД доступны «Личный состав» (управление сотрудниками, смены, должности, взыскания, склад, финансы, приказы, логи за 90 дней, ЧС/ОЧС) и «База данных» (розыск граждан и транспорта, штрафы, лишение прав).',
      appUrl: 'mvd_phone',
      author: 'Система',
      date: '2026-10-17',
      images: [],
      videos: []
    }
  ];
}
