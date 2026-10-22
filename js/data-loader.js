/* ============================================================
   DATA-LOADER: загрузка данных из JSON + переопределение из localStorage
   ------------------------------------------------------------
   Логика:
   1. Пытаемся взять данные из localStorage (если админ что-то менял).
   2. Иначе — загружаем из /data/*.json.
   3. Кэшируем в window.DATA.
   ============================================================ */
(function () {
  const STORAGE_KEY = 'leadership_data_v1';

  // Названия файлов и ключей
  const SOURCES = {
    cards:  'data/cards.json',
    games:  'data/games.json',   // { pairs, style, qualities }
    test:   'data/test.json',    // { quiz, results, sim }
    theory: 'data/theory.json'
  };

  // Считать данные из localStorage
  function readLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Ошибка чтения localStorage:', e);
      return null;
    }
  }

  // Сохранить данные в localStorage
  function writeLocal(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Ошибка сохранения localStorage:', e);
    }
  }

  // Загрузка JSON-файла
  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить ' + url);
    return res.json();
  }

  // Главный загрузчик
  async function loadAll() {
    const local = readLocal();

    // Если есть локальные правки — используем их
    if (local) {
      window.DATA = local;
      window.DATA_SOURCE = 'local';
      return window.DATA;
    }

    // Иначе — грузим файлы
    const [cards, games, test, theory] = await Promise.all([
      loadJSON(SOURCES.cards),
      loadJSON(SOURCES.games),
      loadJSON(SOURCES.test),
      loadJSON(SOURCES.theory)
    ]);

    window.DATA = { cards, games, test, theory };
    window.DATA_SOURCE = 'file';
    return window.DATA;
  }

  // Публичные методы для админки
  window.DataStore = {
    STORAGE_KEY,
    loadAll,
    readLocal,
    writeLocal,
    save(data) {
      window.DATA = data;
      writeLocal(data);
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      window.DATA = null;
    }
  };
})();