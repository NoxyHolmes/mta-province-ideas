/* ===================== КОНФИГУРАЦИЯ И РАЗДЕЛЫ ===================== */
var APP_VER = 'v11.4';

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

var NET_TO_READ = 12000;
var NET_TO_WRITE = 30000;
var MAX_IMAGES = 10, MAX_VIDEOS = 5, MAX_IMG_MB = 15, MAX_VID_MB = 100;

var LOCAL_K = 'idea_local_v5',
    CACHE_K = 'idea_cache_v5',
    KEY_K = 'idea_admin_key',
    PENDING_K = 'idea_pending_v5';

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

/* Реестр встраиваемых интерактивных приложений */
var DEMO_APPS = {
  '': { name: 'Нет (обычное текстовое предложение)', url: '', icon: '' },
  'garage': {
    name: '🚔 Приложение: Автопарк и форма фракций',
    url: 'apps/garage.html',
    icon: '🚔',
    badge: 'Открыть каталог авто и формы'
  },
  'mvd_phone': {
    name: '📱 Приложение: Служебный телефон и Личный состав МВД',
    url: 'apps/mvd-phone.html',
    icon: '📱',
    badge: 'Открыть планшет / телефон МВД'
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
      title: 'Фракционный транспорт и форма',
      text: 'Единая интерактивная система учёта служебного автопарка и форменной одежды для всех ведомств (УМВД, ОГИБДД, ЦГБ, ВС РФ, РЖД) и спецподразделений для мероприятий (ФСБ, СК, Прокуратура, МЧС, ФСО) с разделением транспорта по классам и скоростным характеристикам.\n\nНажмите на кнопку названия выше, чтобы протестировать интерактивный интерфейс.',
      appUrl: 'garage',
      author: 'Система',
      date: '2026-10-16',
      images: [],
      videos: []
    },
    {
      id: 's2',
      fac: 'mvd',
      title: 'Служебное приложение МВД в телефоне (Личный состав и База данных)',
      text: 'Полноценное внутриигровое приложение в смартфоне сотрудника МВД: управление личным составом, статичные должности, контроль онлайна и зарплат, выдача/отработка взысканий, склад вооружения, единый журнал логов за 90 дней, ЧС/ОЧС, а также оперативная База Данных (розыск граждан и ТС, штрафы, лишение прав).\n\nНажмите на кнопку названия выше, чтобы запустить симулятор телефона.',
      appUrl: 'mvd_phone',
      author: 'Система',
      date: '2026-10-16',
      images: [],
      videos: []
    }
  ];
}
