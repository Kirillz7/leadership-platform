/* ============================================================
   ТЕСТ «Какой ты лидер?» + СИМУЛЯТОР решений
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

  const STYLE_LABELS = { A: 'Авторитарный', D: 'Демократический', L: 'Либеральный', T: 'Трансформационный' };

  // ---------------- ТЕСТ ----------------
  const quiz = { i: 0, scores: { A: 0, D: 0, L: 0, T: 0 }, questions: [], results: {} };

  function startQuiz() {
    quiz.questions = (window.DATA?.test?.quiz) || [];
    quiz.results = (window.DATA?.test?.results) || {};
    quiz.i = 0;
    quiz.scores = { A: 0, D: 0, L: 0, T: 0 };
    renderQuizQ();
  }

  function renderQuizQ() {
    const total = quiz.questions.length;
    if (!total) return;
    const q = quiz.questions[quiz.i];

    const counter = $('#quiz-counter'), bar = $('#quiz-bar');
    if (counter) counter.textContent = `Вопрос ${quiz.i + 1} из ${total}`;
    if (bar) bar.style.width = Math.round((quiz.i / total) * 100) + '%';

    const box = $('#quiz-body');
    box.innerHTML = `
      <p class="q-text">${q.q}</p>
      <div class="options">
        ${q.a.map((opt, i) => `<button class="opt" data-i="${i}">${opt.t}</button>`).join('')}
      </div>
    `;

    $$('.opt', box).forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = q.a[Number(btn.dataset.i)];
        quiz.scores[opt.s]++;
        if (window.Sound) window.Sound.play('click');
        $$('.opt', box).forEach(b => b.disabled = true);
        btn.classList.add('is-correct');

        setTimeout(() => {
          quiz.i++;
          if (quiz.i < total) renderQuizQ();
          else showQuizResult();
        }, 260);
      });
    });
  }

  function showQuizResult() {
    const bar = $('#quiz-bar'); if (bar) bar.style.width = '100%';
    const sorted = Object.entries(quiz.scores).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const r = quiz.results[winner] || { emoji: '🎯', name: 'Лидер', style: '', text: '', strengths: [], risks: [], advice: '' };
    const total = quiz.questions.length;

    const bars = sorted.map(([key, val]) => {
      const pct = Math.round((val / total) * 100);
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;">
            <span>${STYLE_LABELS[key]}</span><span class="muted">${val} / ${total}</span>
          </div>
          <div class="progress" style="margin:0;height:7px;"><div class="progress__bar" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    const box = $('#quiz-body');
    box.innerHTML = `
      <div class="result">
        <div class="result__emoji">${r.emoji}</div>
        <h3>Ты — ${r.name}</h3>
        <div class="result__style">${r.style}</div>
        <p>${r.text}</p>
        <div class="result__cols">
          <div><h4>💪 Сильные стороны</h4><ul>${(r.strengths || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
          <div><h4>⚠️ Риски</h4><ul>${(r.risks || []).map(s => `<li>${s}</li>`).join('')}</ul></div>
        </div>
        <div class="note"><strong>Совет:</strong> ${r.advice}</div>
        <h4 style="margin-top:20px;">Твой профиль</h4>
        ${bars}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;">
          <button class="btn btn--primary btn--sm" id="quiz-again">🔄 Пройти заново</button>
          <a class="btn btn--ghost btn--sm" href="#sim">Перейти в симулятор →</a>
        </div>
      </div>`;
    if (window.Sound) window.Sound.play('win');
    $('#quiz-again').addEventListener('click', startQuiz);
  }

  // ---------------- СИМУЛЯТОР ----------------
  const sim = { i: 0, scores: { A: 0, D: 0, L: 0, T: 0 }, log: [], data: [], results: {} };

  function startSim() {
    sim.data = (window.DATA?.test?.sim) || [];
    sim.results = (window.DATA?.test?.results) || {};
    sim.i = 0;
    sim.scores = { A: 0, D: 0, L: 0, T: 0 };
    sim.log = [];
    renderSimStep();
  }

  function renderSimStep() {
    const total = sim.data.length;
    if (!total) return;
    const s = sim.data[sim.i];

    const counter = $('#sim-counter'), bar = $('#sim-bar');
    if (counter) counter.textContent = `Ситуация ${sim.i + 1} из ${total}`;
    if (bar) bar.style.width = Math.round((sim.i / total) * 100) + '%';

    const box = $('#sim-body');
    box.innerHTML = `
      <h3 style="font-size:17px;">${s.title}</h3>
      <p>${s.text}</p>
      <div class="options">
        ${s.options.map((o, i) => `<button class="opt" data-i="${i}">${o.t}</button>`).join('')}
      </div>
      <div class="feedback" id="sim-fb"></div>
    `;

    $$('.opt', box).forEach(btn => {
      btn.addEventListener('click', () => {
        const opt = s.options[Number(btn.dataset.i)];
        sim.scores[opt.s]++;
        sim.log.push({ sit: s.title, choice: opt.t });
        if (window.Sound) window.Sound.play('click');

        $$('.opt', box).forEach(b => { b.disabled = true; });
        btn.classList.add('is-correct');

        const fb = $('#sim-fb');
        fb.className = 'feedback info is-show';
        fb.innerHTML = `<strong>Разбор:</strong> ${opt.fb}`;

        const isLast = sim.i === total - 1;
        const next = document.createElement('button');
        next.className = 'btn btn--primary btn--sm';
        next.style.marginTop = '12px';
        next.textContent = isLast ? 'Показать итог' : 'Далее →';
        next.addEventListener('click', () => {
          if (isLast) showSimResult();
          else { sim.i++; renderSimStep(); }
        });
        fb.appendChild(document.createElement('br'));
        fb.appendChild(next);
      });
    });
  }

  function showSimResult() {
    const bar = $('#sim-bar'); if (bar) bar.style.width = '100%';
    const sorted = Object.entries(sim.scores).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];
    const r = sim.results[winner] || { emoji: '🎯', name: 'Лидер', style: '', text: '', advice: '' };
    const total = sim.data.length;

    const bars = sorted.map(([key, val]) => {
      const pct = Math.round((val / total) * 100);
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;">
            <span>${STYLE_LABELS[key]}</span><span class="muted">${val}</span>
          </div>
          <div class="progress" style="margin:0;height:7px;"><div class="progress__bar" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    const logHtml = sim.log.map(l => `
      <li style="margin-bottom:8px;">
        <strong>${l.sit}</strong><br>
        <span class="muted" style="font-size:13.5px;">${l.choice}</span>
      </li>`).join('');

    const box = $('#sim-body');
    box.innerHTML = `
      <div class="result">
        <div class="result__emoji">${r.emoji}</div>
        <h3>Итог симулятора</h3>
        <div class="result__style">Доминирующий стиль: ${r.style}</div>
        <p>${r.text}</p>
        <h4 style="margin-top:16px;">Твои решения</h4>
        <ul style="font-size:14px;padding-left:1.1em;">${logHtml}</ul>
        <h4 style="margin-top:16px;">Профиль решений</h4>
        ${bars}
        <div class="note" style="margin-top:18px;">
          <strong>Общий разбор:</strong> ${r.advice}<br><br>
          Помни: <strong>лидер формирует корпоративную культуру своими ежедневными решениями</strong>.
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;">
          <button class="btn btn--primary btn--sm" id="sim-again">🔄 Пройти заново</button>
          <a class="btn btn--ghost btn--sm" href="#cards">Карточки с QR →</a>
        </div>
      </div>`;
    if (window.Sound) window.Sound.play('win');
    $('#sim-again').addEventListener('click', startSim);
  }

  function init() {
    startQuiz();
    startSim();
  }

  window.Test = { init };
})();