/* ============================================================
   MAIN: роутинг, тема, звук, reveal, счётчики, отрисовка
   ============================================================ */
(function () {
  const PAGES = ['home', 'theory', 'games', 'quiz', 'sim', 'cards'];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Тема ----------
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    $$('#theme-toggle, #admin-theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
        Sound.play('click');
      });
    });
  }
  function updateThemeIcon(theme) {
    $$('#theme-toggle, #admin-theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    });
  }

  // ---------- Звук (Web Audio API, без файлов) ----------
  const Sound = {
    enabled: localStorage.getItem('sound') !== 'off',
    ctx: null,
    ensure() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { this.enabled = false; }
      }
    },
    play(type) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const configs = {
        click:   { f: 440, d: 0.06, type: 'sine',     gain: 0.06 },
        pop:     { f: 660, d: 0.08, type: 'sine',     gain: 0.08 },
        correct: { f: 880, d: 0.15, type: 'sine',     gain: 0.09 },
        wrong:   { f: 220, d: 0.18, type: 'sawtooth', gain: 0.06 },
        win:     { f: 523, d: 0.4,  type: 'triangle', gain: 0.1, arp: [523, 659, 784, 1046] }
      };
      const c = configs[type] || configs.click;

      if (c.arp) {
        c.arp.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = c.type; o.frequency.value = freq;
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(c.gain, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
          o.connect(g).connect(ctx.destination);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.3);
        });
        return;
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = c.type;
      osc.frequency.setValueAtTime(c.f, now);
      gain.gain.setValueAtTime(c.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + c.d);
    },
    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('sound', this.enabled ? 'on' : 'off');
      updateSoundIcon();
      if (this.enabled) this.play('pop');
    }
  };
  window.Sound = Sound;

  function updateSoundIcon() {
    const btn = $('#sound-toggle');
    if (btn) btn.textContent = Sound.enabled ? '🔊' : '🔇';
  }

  function initSound() {
    const btn = $('#sound-toggle');
    if (btn) btn.addEventListener('click', () => Sound.toggle());
    updateSoundIcon();

    document.addEventListener('click', e => {
      const el = e.target.closest('[data-sound]');
      if (el) Sound.play(el.dataset.sound);
    }, { passive: true });
  }

  // ---------- Роутер ----------
  function showPage(name) {
    $$('.page').forEach(p => p.classList.toggle('is-active', p.dataset.page === name));
    $$('.nav a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function route() {
    const hash = decodeURIComponent(location.hash.replace('#', '')) || 'home';
    if (PAGES.includes(hash)) { showPage(hash); return; }
    const el = document.getElementById(hash);
    if (el) {
      const page = el.closest('[data-page]');
      showPage(page ? page.dataset.page : 'home');
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } else {
      showPage('home');
    }
  }

  // ---------- Reveal при скролле ----------
  window.observeReveal = function (root) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    $$('.reveal', root || document).forEach(el => io.observe(el));
  };

  // ---------- Анимированные счётчики ----------
  function initCounters() {
    const row = document.getElementById('stats-row');
    if (!row) return;
    const nums = row.querySelectorAll('.stat__num');

    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        nums.forEach(el => {
          const target = Number(el.dataset.count) || 0;
          const dur = 1200;
          const start = performance.now();
          const tick = now => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        io.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(row);
  }

  // ---------- Отрисовка главной ----------
  function renderHome() {
    const items = [
      { icon: '📚', title: 'Теория',     text: 'Стили, теории, качества лидера и три уровня культуры по Э. Шейну.' },
      { icon: '🎮', title: 'Три игры',   text: '«Найди пару», «Угадай стиль» и «Собери качества» — закрепление материала.' },
      { icon: '🧠', title: 'Тест',       text: '12 вопросов — узнаешь свой доминирующий стиль лидерства.' },
      { icon: '🧭', title: 'Симулятор',  text: '5 рабочих ситуаций с разбором решений в конце.' },
      { icon: '🔗', title: 'QR-карточки', text: '13 карточек с терминами — распечатай и раздай группе.' }
    ];
    const box = $('#home-cards');
    if (!box) return;
    box.innerHTML = items.map((it, i) => `
      <div class="mini reveal" style="transition-delay:${i * 70}ms">
        <div class="mini__icon">${it.icon}</div>
        <h3>${it.title}</h3>
        <p>${it.text}</p>
      </div>
    `).join('');
    window.observeReveal(box);
  }

  // ---------- Отрисовка теории ----------
  function renderTheory() {
    const box = $('#theory-box');
    if (!box) return;
    const list = (window.DATA && window.DATA.theory) || [];
    box.innerHTML = list.map((s, i) => `
      <article class="theory-block reveal" id="${s.id}" style="transition-delay:${i * 60}ms">
        <h2 class="theory-block__title"><span>${s.icon || '📘'}</span>${s.title}</h2>
        <div class="theory-block__body">${s.html}</div>
      </article>
    `).join('');
    window.observeReveal(box);
  }

  // ---------- Отрисовка QR-карточек ----------
  function renderCards() {
    const box = $('#qr-grid');
    if (!box) return;
    const list = (window.DATA && window.DATA.cards) || [];
    const baseUrl = (window.CONFIG && window.CONFIG.baseUrl) || location.origin + location.pathname;

    box.innerHTML = list.map((c, i) => {
      const url = baseUrl + '#' + c.anchor;
      const num = String(i + 1).padStart(2, '0');
      return `
        <article class="qcard reveal" style="transition-delay:${i * 40}ms">
          <span class="qcard__num">Карточка ${num}</span>
          <h3>${c.term}</h3>
          <p>${c.definition}</p>
          <div class="qcard__qr">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(url)}" alt="QR: ${c.term}" loading="lazy">
          </div>
          <span class="qcard__link">Наведи камеру → раздел сайта</span>
        </article>
      `;
    }).join('');
    window.observeReveal(box);
  }

  // ---------- Бургер ----------
  function initBurger() {
    const burger = $('#burger');
    const nav = $('#nav');
    if (!burger || !nav) return;
    burger.addEventListener('click', () => nav.classList.toggle('is-open'));
    $$('.nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));
  }

  // ---------- Инициализация ----------
  window.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initSound();
    initBurger();

    // Загружаем данные
    try {
      await window.DataStore.loadAll();
    } catch (e) {
      console.error('Ошибка загрузки данных:', e);
      window.DATA = window.DATA || { cards: [], games: {}, test: {}, theory: [] };
    }

    renderHome();
    renderTheory();
    renderCards();

    // Игры / тест подключаются своими файлами
    if (window.Games) window.Games.init();
    if (window.Test) window.Test.init();

    // ✅ Reveal для ВСЕХ элементов, включая статические из HTML
    window.observeReveal(document);

    // ✅ Страховка: через 800 мс показать всё, что уже в зоне видимости
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1) el.classList.add('is-visible');
      });
    }, 800);

    // Анимированные счётчики
    initCounters();

    // Роутинг
    window.addEventListener('hashchange', route);
    route();
  });
})();