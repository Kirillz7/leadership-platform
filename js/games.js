/* ============================================================
   ИГРЫ: «Найди пару», «Угадай стиль», «Собери качества»
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------------- Игра 1: Найди пару ----------------
  const pairs = { deck: [], open: [], matched: 0, moves: 0, lock: false, perRound: 6 };

  function startPairs() {
    const all = (window.DATA?.games?.pairs) || [];
    const chosen = shuffle(all).slice(0, pairs.perRound);
    pairs.deck = shuffle(chosen.flatMap((p, i) => ([
      { pid: i, type: 'term', text: p.term },
      { pid: i, type: 'def',  text: p.def }
    ])));
    pairs.open = []; pairs.matched = 0; pairs.moves = 0; pairs.lock = false;
    renderPairs(); updatePairsStats();
    const msg = $('#pairs-msg'); if (msg) msg.classList.remove('is-show');
  }

  function renderPairs() {
    const box = $('#pairs-grid'); if (!box) return;
    box.innerHTML = pairs.deck.map((c, idx) => `
      <button class="mem-card" data-idx="${idx}" aria-label="Карточка">
        <span class="mem-card__inner">
          <span class="mem-card__face mem-card__front">?</span>
          <span class="mem-card__face mem-card__back">${c.text}</span>
        </span>
      </button>
    `).join('');
  }

  function updatePairsStats() {
    const m = $('#pairs-moves'), f = $('#pairs-found');
    if (m) m.textContent = pairs.moves;
    if (f) f.textContent = pairs.matched;
  }

  function onPairsClick(e) {
    const card = e.target.closest('.mem-card');
    if (!card || pairs.lock) return;
    if (card.classList.contains('is-open') || card.classList.contains('is-done')) return;
    if (window.Sound) window.Sound.play('click');

    const idx = Number(card.dataset.idx);
    card.classList.add('is-open');
    pairs.open.push(idx);

    if (pairs.open.length === 2) {
      pairs.moves++; updatePairsStats();
      const [a, b] = pairs.open;
      const A = pairs.deck[a], B = pairs.deck[b];
      const cards = $$('.mem-card', $('#pairs-grid'));

      if (A.pid === B.pid && A.type !== B.type) {
        cards[a].classList.add('is-done');
        cards[b].classList.add('is-done');
        pairs.matched++; pairs.open = []; updatePairsStats();
        if (window.Sound) window.Sound.play('correct');
        if (pairs.matched === pairs.deck.length / 2) {
          const msg = $('#pairs-msg');
          if (msg) { msg.className = 'feedback ok is-show'; msg.innerHTML = `<strong>Победа!</strong> Все пары найдены за ${pairs.moves} ходов. 🎉`; }
          if (window.Sound) window.Sound.play('win');
        }
      } else {
        pairs.lock = true;
        if (window.Sound) window.Sound.play('wrong');
        setTimeout(() => {
          cards[a].classList.remove('is-open');
          cards[b].classList.remove('is-open');
          pairs.open = []; pairs.lock = false;
        }, 750);
      }
    }
  }

  // ---------------- Игра 2: Угадай стиль ----------------
  const styleG = { order: [], i: 0, score: 0, answered: false, options: [] };

  function startStyle() {
    const data = window.DATA?.games?.style || {};
    styleG.order = shuffle(data.questions || []);
    styleG.options = data.options || ['Авторитарный','Демократический','Либеральный','Трансформационный'];
    styleG.i = 0; styleG.score = 0;
    renderStyleQ();
  }

  function renderStyleQ() {
    const total = styleG.order.length;
    if (!total) return;
    const q = styleG.order[styleG.i];
    styleG.answered = false;

    const num = $('#style-num'), sc = $('#style-score'), bar = $('#style-bar');
    if (num) num.textContent = styleG.i + 1;
    if (sc) sc.textContent = styleG.score;
    if (bar) bar.style.width = Math.round((styleG.i / total) * 100) + '%';

    const options = shuffle(styleG.options);
    const box = $('#style-body'); if (!box) return;
    box.innerHTML = `
      <p class="q-text">${q.text}</p>
      <div class="options">
        ${options.map(o => `<button class="opt" data-opt="${o}">${o}</button>`).join('')}
      </div>
      <div class="feedback" id="style-fb"></div>
    `;

    $$('.opt', box).forEach(btn => btn.addEventListener('click', () => onStyleAnswer(btn, q)));
  }

  function onStyleAnswer(btn, q) {
    if (styleG.answered) return;
    styleG.answered = true;
    const chosen = btn.dataset.opt;
    const ok = chosen === q.answer;
    if (ok) styleG.score++;

    $$('.opt', $('#style-body')).forEach(b => {
      b.disabled = true;
      if (b.dataset.opt === q.answer) b.classList.add('is-correct');
      else if (b === btn) b.classList.add('is-wrong');
    });

    if (window.Sound) window.Sound.play(ok ? 'correct' : 'wrong');

    const fb = $('#style-fb');
    fb.className = 'feedback is-show ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = `<strong>${ok ? 'Верно!' : 'Не совсем.'}</strong> Правильный ответ: <strong>${q.answer}</strong>. ${q.why}`;

    const sc = $('#style-score'); if (sc) sc.textContent = styleG.score;

    const isLast = styleG.i === styleG.order.length - 1;
    const next = document.createElement('button');
    next.className = 'btn btn--primary btn--sm';
    next.style.marginTop = '12px';
    next.textContent = isLast ? 'Показать результат' : 'Далее →';
    next.addEventListener('click', () => {
      if (isLast) showStyleResult();
      else { styleG.i++; renderStyleQ(); }
    });
    fb.appendChild(document.createElement('br'));
    fb.appendChild(next);
  }

  function showStyleResult() {
    const total = styleG.order.length, s = styleG.score;
    const bar = $('#style-bar'); if (bar) bar.style.width = '100%';
    let v = '';
    if (s === total) v = 'Идеально! Отлично различаешь стили. 🏆';
    else if (s >= total * 0.7) v = 'Хороший результат!';
    else if (s >= total * 0.4) v = 'Неплохо, загляни в раздел «Теория → Стили».';
    else v = 'Пока сложно. Прочитай теорию и попробуй снова.';

    const box = $('#style-body');
    box.innerHTML = `
      <div class="result">
        <div class="result__emoji">${s === total ? '🏆' : '📊'}</div>
        <h3>Результат: ${s} из ${total}</h3>
        <p>${v}</p>
        <button class="btn btn--primary btn--sm" id="style-again">🔄 Пройти заново</button>
      </div>`;
    if (window.Sound) window.Sound.play('win');
    $('#style-again').addEventListener('click', startStyle);
  }

  // ---------------- Игра 3: Собери качества ----------------
  const qual = { selected: new Set(), checked: false, items: [] };

  function startQual() {
    qual.items = (window.DATA?.games?.qualities) || [];
    qual.selected = new Set();
    qual.checked = false;
    renderQual();
    const msg = $('#qualities-msg');
    if (msg) { msg.className = 'feedback info'; msg.textContent = ''; }
    const sel = $('#q-selected'); if (sel) sel.textContent = '0';
  }

  function renderQual() {
    const box = $('#qualities-chips'); if (!box) return;
    box.innerHTML = qual.items.map((it, i) => `<button class="chip" data-i="${i}">${it.t}</button>`).join('');
    $$('.chip', box).forEach(chip => {
      chip.addEventListener('click', () => {
        if (qual.checked) return;
        if (window.Sound) window.Sound.play('click');
        const i = Number(chip.dataset.i);
        if (qual.selected.has(i)) { qual.selected.delete(i); chip.classList.remove('is-selected'); }
        else { qual.selected.add(i); chip.classList.add('is-selected'); }
        const sel = $('#q-selected'); if (sel) sel.textContent = qual.selected.size;
      });
    });
  }

  function checkQual() {
    if (qual.checked) return;
    qual.checked = true;
    let correct = 0, wrong = 0, missed = 0;

    $$('#qualities-chips .chip').forEach(chip => {
      const i = Number(chip.dataset.i);
      const item = qual.items[i];
      const picked = qual.selected.has(i);
      chip.classList.remove('is-selected');
      if (item.ok && picked) { chip.classList.add('is-right'); correct++; }
      else if (item.ok && !picked) { chip.classList.add('is-missed'); missed++; }
      else if (!item.ok && picked) { chip.classList.add('is-wrong'); wrong++; }
    });

    const totalOk = qual.items.filter(q => q.ok).length;
    const perfect = correct === totalOk && wrong === 0;
    if (window.Sound) window.Sound.play(perfect ? 'win' : 'pop');

    const msg = $('#qualities-msg');
    msg.className = 'feedback is-show ' + (perfect ? 'ok' : wrong > 2 ? 'bad' : 'info');
    msg.innerHTML = `<strong>${perfect ? 'Идеально! 🏆' : 'Результат:'}</strong> верно — <strong>${correct}</strong>/${totalOk}; лишних — <strong>${wrong}</strong>; пропущено — <strong>${missed}</strong>.`;

    const btn = $('#qualities-check');
    if (btn) { btn.textContent = 'Проверено'; btn.disabled = true; }
  }

  // ---------------- Инициализация вкладок и слушателей ----------------
  function init() {
    // Табы
    $$('.tab[data-game]').forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.Sound) window.Sound.play('click');
        $$('.tab[data-game]').forEach(t => t.classList.remove('is-active'));
        $$('.game').forEach(g => g.classList.remove('is-active'));
        tab.classList.add('is-active');
        const target = $('#game-' + tab.dataset.game);
        if (target) target.classList.add('is-active');
      });
    });

    startPairs(); startStyle(); startQual();

    const pg = $('#pairs-grid');
    if (pg) pg.addEventListener('click', onPairsClick);
    const pr = $('#pairs-restart');
    if (pr) pr.addEventListener('click', () => { if (window.Sound) window.Sound.play('click'); startPairs(); });
    const qc = $('#qualities-check');
    if (qc) qc.addEventListener('click', checkQual);
    const qr = $('#qualities-reset');
    if (qr) qr.addEventListener('click', () => {
      const btn = $('#qualities-check');
      if (btn) { btn.textContent = '✅ Проверить'; btn.disabled = false; }
      startQual();
    });
  }

  window.Games = { init };
})();