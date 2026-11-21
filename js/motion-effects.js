// Анимации интерфейса на библиотеке Motion (js/vendor/motion.min.js).
// Если пользователь включил «Уменьшить движение» или библиотека не загрузилась,
// страница работает без анимаций: все элементы видимы сразу.
(() => {
  const api = {};
  window.siteMotion = api;

  const M = window.Motion;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || reduceMotion) {
    document.documentElement.classList.remove('motion-ready');
    return;
  }

  const { animate, inView, scroll, stagger, hover, press } = M;
  const ease = [0.22, 1, 0.36, 1];
  const spring = { type: 'spring', stiffness: 380, damping: 30 };

  /* Появление первого экрана */
  const heroItems = document.querySelectorAll('[data-hero-item]');
  if (heroItems.length) {
    animate(heroItems, { opacity: [0, 1], y: [28, 0] }, { duration: 0.7, ease, delay: stagger(0.08) });
  }

  const heroTiles = [...document.querySelectorAll('[data-hero-tile]')];
  const sticker = heroTiles.find((el) => el.classList.contains('hero__sticker'));
  const tiles = heroTiles.filter((el) => el !== sticker);
  if (tiles.length) {
    animate(tiles, { opacity: [0, 1], y: [40, 0], scale: [0.94, 1] },
      { type: 'spring', bounce: 0.2, visualDuration: 0.7, delay: stagger(0.12, { startDelay: 0.25 }) });
  }
  if (sticker) {
    animate(sticker, { opacity: [0, 1], scale: [0.4, 1], rotate: [-30, 10] },
      { type: 'spring', bounce: 0.45, visualDuration: 0.6, delay: 0.75 });
  }

  /* Появление блоков при прокрутке */
  inView('[data-reveal]', (el) => {
    animate(el, { opacity: [0, 1], y: [36, 0] }, { duration: 0.75, ease });
  }, { amount: 0.15 });

  inView('[data-stagger]', (el) => {
    animate([...el.children], { opacity: [0, 1], y: [30, 0] }, { duration: 0.6, ease, delay: stagger(0.07) });
  }, { amount: 0.1 });

  /* Счётчики в блоке статистики */
  const formatNumber = (value, decimals) => value
    .toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  inView('[data-count]', (el) => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    animate(0, target, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: (v) => { el.textContent = formatNumber(v, decimals) + suffix; },
    });
  }, { amount: 0.6 });

  /* Индикатор прокрутки страницы под шапкой */
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    scroll(animate(progress, { scaleX: [0, 1] }, { ease: 'linear' }));
  }

  /* Параллакс плиток hero и большого логотипа в подвале */
  const heroVisual = document.querySelector('.hero__visual');
  if (heroVisual) {
    scroll(animate(heroVisual, { y: [0, 80] }, { ease: 'linear' }), {
      target: document.querySelector('.hero'),
      offset: ['start start', 'end start'],
    });
  }

  const wordmark = document.querySelector('.site-footer__wordmark');
  if (wordmark) {
    scroll(animate(wordmark, { y: ['45%', '8%'], opacity: [0.2, 1] }, { ease: 'linear' }), {
      target: wordmark,
      offset: ['start end', 'end end'],
    });
  }

  /* Наведение и нажатие: пружинные микровзаимодействия */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hover('.product-card, .feature, .contact-card, .review-card', (el) => {
      animate(el, { y: -6 }, spring);
      return () => animate(el, { y: 0 }, spring);
    });
  }

  press('.button, .socials__link, .back-to-top, .site-header__toggle', (el) => {
    animate(el, { scale: 0.95 }, { type: 'spring', stiffness: 600, damping: 30 });
    return () => animate(el, { scale: 1 }, { type: 'spring', stiffness: 500, damping: 22 });
  });

  /* Публичные методы для main.js */
  api.openDialog = (dialog) => {
    animate(dialog, { opacity: [0, 1], y: [32, 0], scale: [0.96, 1] },
      { type: 'spring', bounce: 0.18, visualDuration: 0.4 });
    animate(dialog.querySelectorAll('.order-form__group'), { opacity: [0, 1], y: [12, 0] },
      { duration: 0.35, ease, delay: stagger(0.03, { startDelay: 0.08 }) });
  };

  api.openNav = (nav) => {
    animate(nav, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.25, ease });
    animate(nav.querySelectorAll('.site-nav__item'), { opacity: [0, 1], x: [-16, 0] },
      { duration: 0.35, ease, delay: stagger(0.04) });
  };

  api.animateCards = (cards) => {
    if (!cards.length) return;
    animate(cards, { opacity: [0, 1], scale: [0.96, 1] },
      { duration: 0.35, ease, delay: stagger(0.035) });
  };

  api.pop = (el) => {
    animate(el, { opacity: [0, 1], scale: [0.95, 1] }, { type: 'spring', bounce: 0.3, visualDuration: 0.4 });
  };
})();
