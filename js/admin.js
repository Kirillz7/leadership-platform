/* ============================================================
   АДМИН-ПАНЕЛЬ: вход, CRUD, экспорт/импорт
   ------------------------------------------------------------
   Пароль хранится в открытом виде — для учебного проекта этого достаточно.
   Для продакшена используйте Firebase Auth.
   ============================================================ */
(function () {
  const ADMIN_PASSWORD = 'leader2025'; // ← СМЕНИТЕ ПАРОЛЬ ЗДЕСЬ
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Вход ----------
  function initLogin() {
    const passInput = $('#login-pass');
    const btn = $('#login-btn');
    const err = $('#login-error');
    const screen = $('#login-screen');
    const app = $('#admin-app');

    if (!passInput || !btn || !screen || !app) {
      console.error('admin.js: не найдены элементы экрана входа');
      return;
    }

    // Уже авторизован в этой сессии?
    if (sessionStorage.getItem('admin_authed') === 'yes') {
      screen.style.display = 'none';
      app.style.display = '';
      safeInitApp();
      return;
    }

    const tryLogin = () => {
      const value = (passInput.value || '').trim();
      console.log('[admin] попытка входа, длина:', value.length);

      if (value === ADMIN_PASSWORD) {
        console.log('[admin] пароль верный, входим…');
        try {
          sessionStorage.setItem('admin_authed', 'yes');
        } catch (e) {
          console.warn('sessionStorage недоступен:', e);
        }
        // Жёстко прячем экран входа, чтобы CSS не мог перебить
        screen.style.display = 'none';
        app.style.display = '';
        screen.removeAttribute('hidden');
        app.removeAttribute('hidden');
        safeInitApp();
      } else {
        console.warn('[admin] неверный пароль');
        err.textContent = 'Неверный пароль. Проверьте раскладку и уберите пробелы.';
        if (window.Sound) window.Sound.play('wrong');
        passInput.select();
      }
    };

    btn.addEventListener('click', tryLogin);
    passInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); tryLogin(); }
    });

    setTimeout(() => passInput.focus(), 100);
  }

  // Обёртка с try/catch, чтобы ошибки не «глотались»
  async function safeInitApp() {
    try {
      await initApp();
    } catch (e) {
      console.error('[admin] ошибка инициализации:', e);
      alert('Ошибка инициализации админ-панели:\n' + e.message + '\n\nПодробности — в Console.');
    }
  }

  // ---------- Основная логика ----------
  async function initApp() {
    // Тема
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    const themeBtn = $('#admin-theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
    });

    // Выход
    const logoutBtn = $('#logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('admin_authed');
      location.reload();
    });

    // Загрузка данных
    if (!window.DataStore) {
      throw new Error('DataStore не загружен. Проверьте js/data-loader.js');
    }
    await window.DataStore.loadAll();

    // Табы
    $$('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab[data-tab]').forEach(t => t.classList.remove('is-active'));
        $$('.admin-section').forEach(s => s.classList.remove('is-active'));
        tab.classList.add('is-active');
        const sec = $(`.admin-section[data-section="${tab.dataset.tab}"]`);
        if (sec) sec.classList.add('is-active');
      });
    });

    renderAll();

    // Кнопки «+ Добавить»
    $$('[data-add]').forEach(btn => btn.addEventListener('click', () => addItem(btn.dataset.add)));

    // Экспорт
    $$('[data-export]').forEach(btn => btn.addEventListener('click', () => exportData(btn.dataset.export)));

    // Импорт
    const imp = $('#import-file');
    if (imp) imp.addEventListener('change', importFile);

    // Сброс
    const resetBtn = $('#reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (confirm('Удалить все правки и вернуть исходные данные из /data/?')) {
        window.DataStore.reset();
        location.reload();
      }
    });

    console.log('[admin] панель готова');
  }

  function updateThemeIcon(theme) {
    const btn = $('#admin-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  // ---------- Отрисовка всех списков ----------
  function renderAll() {
    renderCards(); renderPairs(); renderStyle(); renderQual();
    renderQuiz(); renderResults(); renderSim(); renderTheory();
  }

  // Утилита: сохранить состояние
  function save() {
    window.DataStore.save(window.DATA);
  }

  // ---------- КАРТОЧКИ ----------
  function renderCards() {
    const box = $('#admin-cards-list'); if (!box) return;
    box.innerHTML = (window.DATA.cards || []).map((c, i) => `
      <div class="admin-item" data-kind="cards" data-i="${i}">
        <span class="admin-item__num">${i + 1}</span>
        <div class="admin-item__row"><label>Термин</label><input data-f="term" value="${escapeAttr(c.term)}"></div>
        <div class="admin-item__row"><label>Описание</label><textarea data-f="definition">${escapeHtml(c.definition)}</textarea></div>
        <div class="admin-item__row"><label>Якорь</label><input data-f="anchor" value="${escapeAttr(c.anchor)}"></div>
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'cards');
  }

  // ---------- ПАРЫ ----------
  function renderPairs() {
    const box = $('#admin-pairs-list'); if (!box) return;
    box.innerHTML = (window.DATA.games.pairs || []).map((p, i) => `
      <div class="admin-item" data-kind="pairs" data-i="${i}">
        <span class="admin-item__num">${i + 1}</span>
        <div class="admin-item__row"><label>Термин</label><input data-f="term" value="${escapeAttr(p.term)}"></div>
        <div class="admin-item__row"><label>Определение</label><input data-f="def" value="${escapeAttr(p.def)}"></div>
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'pairs');
  }

  // ---------- СТИЛИ ----------
  function renderStyle() {
    const box = $('#admin-style-list'); if (!box) return;
    const qs = window.DATA.games.style?.questions || [];
    const opts = window.DATA.games.style?.options || [];
    box.innerHTML = qs.map((q, i) => `
      <div class="admin-item" data-kind="style" data-i="${i}">
        <span class="admin-item__num">${i + 1}</span>
        <div class="admin-item__row"><label>Описание</label><textarea data-f="text">${escapeHtml(q.text)}</textarea></div>
        <div class="admin-item__row"><label>Ответ</label>
          <select data-f="answer">${opts.map(o => `<option ${o === q.answer ? 'selected' : ''}>${o}</option>`).join('')}</select>
        </div>
        <div class="admin-item__row"><label>Пояснение</label><textarea data-f="why">${escapeHtml(q.why)}</textarea></div>
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'style');
  }

  // ---------- КАЧЕСТВА ----------
  function renderQual() {
    const box = $('#admin-qual-list'); if (!box) return;
    box.innerHTML = (window.DATA.games.qualities || []).map((q, i) => `
      <div class="admin-item" data-kind="qual" data-i="${i}">
        <span class="admin-item__num">${i + 1}</span>
        <div class="admin-item__row"><label>Качество</label><input data-f="t" value="${escapeAttr(q.t)}"></div>
        <div class="admin-item__row"><label>Верное?</label>
          <select data-f="ok">
            <option value="true" ${q.ok ? 'selected' : ''}>Да, это качество лидера</option>
            <option value="false" ${!q.ok ? 'selected' : ''}>Нет, ловушка</option>
          </select>
        </div>
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'qual');
  }

  // ---------- ТЕСТ ----------
  function renderQuiz() {
    const box = $('#admin-quiz-list'); if (!box) return;
    box.innerHTML = (window.DATA.test.quiz || []).map((q, i) => `
      <div class="admin-item" data-kind="quiz" data-i="${i}">
        <span class="admin-item__num">Вопрос ${i + 1}</span>
        <div class="admin-item__row"><label>Текст</label><textarea data-f="q">${escapeHtml(q.q)}</textarea></div>
        ${q.a.map((opt, j) => `
          <div class="admin-item__row">
            <label>Ответ ${j + 1}</label>
            <input data-opt="${j}" data-of="t" value="${escapeAttr(opt.t)}">
          </div>
          <div class="admin-item__row">
            <label>Стиль</label>
            <select data-opt="${j}" data-of="s">
              <option value="A" ${opt.s === 'A' ? 'selected' : ''}>A — Авторитарный</option>
              <option value="D" ${opt.s === 'D' ? 'selected' : ''}>D — Демократический</option>
              <option value="L" ${opt.s === 'L' ? 'selected' : ''}>L — Либеральный</option>
              <option value="T" ${opt.s === 'T' ? 'selected' : ''}>T — Трансформационный</option>
            </select>
          </div>
        `).join('')}
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'quiz');
  }

  // ---------- РЕЗУЛЬТАТЫ ----------
  function renderResults() {
    const box = $('#admin-results-list'); if (!box) return;
    const keys = ['A', 'D', 'L', 'T'];
    box.innerHTML = keys.map(k => {
      const r = window.DATA.test.results[k] || {};
      return `
        <div class="admin-item" data-kind="results" data-k="${k}">
          <span class="admin-item__num">Стиль ${k}</span>
          <div class="admin-item__row"><label>Имя</label><input data-f="name" value="${escapeAttr(r.name || '')}"></div>
          <div class="admin-item__row"><label>Эмодзи</label><input data-f="emoji" value="${escapeAttr(r.emoji || '')}"></div>
          <div class="admin-item__row"><label>Стиль</label><input data-f="style" value="${escapeAttr(r.style || '')}"></div>
          <div class="admin-item__row"><label>Описание</label><textarea data-f="text">${escapeHtml(r.text || '')}</textarea></div>
          <div class="admin-item__row"><label>Плюсы (через ;)</label><input data-f="strengths" value="${escapeAttr((r.strengths || []).join('; '))}"></div>
          <div class="admin-item__row"><label>Риски (через ;)</label><input data-f="risks" value="${escapeAttr((r.risks || []).join('; '))}"></div>
          <div class="admin-item__row"><label>Совет</label><textarea data-f="advice">${escapeHtml(r.advice || '')}</textarea></div>
        </div>`;
    }).join('');
    bindItemEvents(box, 'results');
  }

  // ---------- СИМУЛЯТОР ----------
  function renderSim() {
    const box = $('#admin-sim-list'); if (!box) return;
    box.innerHTML = (window.DATA.test.sim || []).map((s, i) => `
      <div class="admin-item" data-kind="sim" data-i="${i}">
        <span class="admin-item__num">Ситуация ${i + 1}</span>
        <div class="admin-item__row"><label>Заголовок</label><input data-f="title" value="${escapeAttr(s.title)}"></div>
        <div class="admin-item__row"><label>Текст</label><textarea data-f="text">${escapeHtml(s.text)}</textarea></div>
        ${s.options.map((o, j) => `
          <div class="admin-item__row"><label>Вариант ${j + 1}</label><input data-opt="${j}" data-of="t" value="${escapeAttr(o.t)}"></div>
          <div class="admin-item__row"><label>Стиль</label>
            <select data-opt="${j}" data-of="s">
              <option value="A" ${o.s === 'A' ? 'selected' : ''}>A</option>
              <option value="D" ${o.s === 'D' ? 'selected' : ''}>D</option>
              <option value="L" ${o.s === 'L' ? 'selected' : ''}>L</option>
              <option value="T" ${o.s === 'T' ? 'selected' : ''}>T</option>
            </select>
          </div>
          <div class="admin-item__row"><label>Разбор</label><textarea data-opt="${j}" data-of="fb">${escapeHtml(o.fb)}</textarea></div>
        `).join('')}
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'sim');
  }

  // ---------- ТЕОРИЯ ----------
  function renderTheory() {
    const box = $('#admin-theory-list'); if (!box) return;
    box.innerHTML = (window.DATA.theory || []).map((s, i) => `
      <div class="admin-item" data-kind="theory" data-i="${i}">
        <span class="admin-item__num">${i + 1}</span>
        <div class="admin-item__row"><label>ID</label><input data-f="id" value="${escapeAttr(s.id)}"></div>
        <div class="admin-item__row"><label>Иконка</label><input data-f="icon" value="${escapeAttr(s.icon || '')}"></div>
        <div class="admin-item__row"><label>Заголовок</label><input data-f="title" value="${escapeAttr(s.title)}"></div>
        <div class="admin-item__row"><label>HTML</label><textarea data-f="html">${escapeHtml(s.html)}</textarea></div>
        <div class="admin-item__actions"><button class="btn btn--danger btn--sm" data-del>Удалить</button></div>
      </div>
    `).join('');
    bindItemEvents(box, 'theory');
  }

  // ---------- Универсальная привязка событий ----------
  function bindItemEvents(box, kind) {
    $$('.admin-item', box).forEach(item => {
      // Обновление полей
      $$('input, textarea, select', item).forEach(field => {
        field.addEventListener('change', () => {
          updateField(kind, item, field);
          save();
        });
      });
      // Удаление
      const del = $('[data-del]', item);
      if (del) del.addEventListener('click', () => {
        if (confirm('Удалить элемент?')) {
          removeItem(kind, item);
          save();
          renderAll();
        }
      });
    });
  }

  // ---------- Обновление поля ----------
  function updateField(kind, item, field) {
    const i = Number(item.dataset.i);
    const k = item.dataset.k;
    const f = field.dataset.f;
    const optIdx = field.dataset.opt;
    const optField = field.dataset.of;
    let value = field.value;
    if (f === 'ok') value = value === 'true';

    if (kind === 'cards')  window.DATA.cards[i][f] = value;
    if (kind === 'pairs')  window.DATA.games.pairs[i][f] = value;
    if (kind === 'style')  window.DATA.games.style.questions[i][f] = value;
    if (kind === 'qual')   window.DATA.games.qualities[i][f] = value;
    if (kind === 'theory') window.DATA.theory[i][f] = value;

    if (kind === 'quiz') {
      const q = window.DATA.test.quiz[i];
      if (f) q[f] = value;
      if (optIdx !== undefined) q.a[Number(optIdx)][optField] = value;
    }
    if (kind === 'sim') {
      const s = window.DATA.test.sim[i];
      if (f) s[f] = value;
      if (optIdx !== undefined) s.options[Number(optIdx)][optField] = value;
    }
    if (kind === 'results') {
      const r = window.DATA.test.results[k];
      if (f === 'strengths' || f === 'risks') {
        r[f] = value.split(';').map(s => s.trim()).filter(Boolean);
      } else {
        r[f] = value;
      }
    }
  }

  // ---------- Добавление ----------
  function addItem(kind) {
    const templates = {
      cards:  { term: 'Новый термин', definition: 'Определение', anchor: 'theory-what' },
      pairs:  { term: 'Новый термин', def: 'Определение' },
      style:  { text: 'Описание поведения лидера', answer: 'Авторитарный', why: 'Пояснение' },
      qual:   { t: 'Новое качество', ok: true },
      quiz:   { q: 'Новый вопрос?', a: [
                { t: 'Вариант 1', s: 'A' }, { t: 'Вариант 2', s: 'D' },
                { t: 'Вариант 3', s: 'L' }, { t: 'Вариант 4', s: 'T' }] },
      sim:    { title: 'Новая ситуация', text: 'Описание…', options: [
                { t: 'Вариант A', s: 'A', fb: 'Разбор A' },
                { t: 'Вариант D', s: 'D', fb: 'Разбор D' },
                { t: 'Вариант L', s: 'L', fb: 'Разбор L' }] },
      theory: { id: 'theory-' + Date.now(), icon: '📘', title: 'Новый раздел', html: '<p>Текст раздела…</p>' }
    };
    const t = templates[kind];
    if (!t) return;

    if (kind === 'cards')  window.DATA.cards.push(t);
    if (kind === 'pairs')  window.DATA.games.pairs.push(t);
    if (kind === 'style')  window.DATA.games.style.questions.push(t);
    if (kind === 'qual')   window.DATA.games.qualities.push(t);
    if (kind === 'quiz')   window.DATA.test.quiz.push(t);
    if (kind === 'sim')    window.DATA.test.sim.push(t);
    if (kind === 'theory') window.DATA.theory.push(t);

    save();
    renderAll();
  }

  // ---------- Удаление ----------
  function removeItem(kind, item) {
    const i = Number(item.dataset.i);
    if (kind === 'cards')  window.DATA.cards.splice(i, 1);
    if (kind === 'pairs')  window.DATA.games.pairs.splice(i, 1);
    if (kind === 'style')  window.DATA.games.style.questions.splice(i, 1);
    if (kind === 'qual')   window.DATA.games.qualities.splice(i, 1);
    if (kind === 'quiz')   window.DATA.test.quiz.splice(i, 1);
    if (kind === 'sim')    window.DATA.test.sim.splice(i, 1);
    if (kind === 'theory') window.DATA.theory.splice(i, 1);
  }

  // ---------- Экспорт ----------
  function exportData(what) {
    const map = {
      cards:  { data: window.DATA.cards,       name: 'cards.json' },
      games:  { data: window.DATA.games,       name: 'games.json' },
      test:   { data: window.DATA.test,        name: 'test.json' },
      theory: { data: window.DATA.theory,      name: 'theory.json' }
    };
    if (what === 'all') {
      const all = {
        cards: window.DATA.cards, games: window.DATA.games,
        test: window.DATA.test, theory: window.DATA.theory
      };
      download('leadership-data.json', JSON.stringify(all, null, 2));
      return;
    }
    const item = map[what];
    if (item) download(item.name, JSON.stringify(item.data, null, 2));
  }

  function download(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // ---------- Импорт ----------
  function importFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.cards || data.games || data.test || data.theory) {
          if (data.cards)  window.DATA.cards = data.cards;
          if (data.games)  window.DATA.games = data.games;
          if (data.test)   window.DATA.test = data.test;
          if (data.theory) window.DATA.theory = data.theory;
        } else if (Array.isArray(data)) {
          if (data[0]?.term && data[0]?.anchor) window.DATA.cards = data;
          else if (data[0]?.q) window.DATA.test.quiz = data;
          else if (data[0]?.html) window.DATA.theory = data;
        }
        save();
        renderAll();
        const msg = $('#import-msg');
        msg.className = 'feedback ok is-show';
        msg.textContent = '✅ Данные успешно загружены и сохранены.';
      } catch (err) {
        const msg = $('#import-msg');
        msg.className = 'feedback bad is-show';
        msg.textContent = '❌ Ошибка чтения файла: ' + err.message;
      }
    };
    reader.readAsText(file);
  }

  // ---------- Утилиты ----------
  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // ---------- Точка входа ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();