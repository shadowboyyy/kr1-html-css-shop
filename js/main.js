// Отмечаем, что JavaScript доступен: от этого зависят стили меню и фильтров.
document.documentElement.classList.add('js');

const motionApi = () => window.siteMotion || {};

/* ---------- Хранилище браузера (кабинет, избранное, тема) ---------- */

const store = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Хранилище недоступно (приватный режим) — сайт работает без сохранения.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Нечего удалять.
    }
  },
};
window.voltStore = store;

/* ---------- Уведомление внизу экрана ---------- */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => { toast.textContent = ''; }, 500);
  }, 4500);
}

window.voltToast = (text) => showToast(text);

/* ---------- Светлая и тёмная тема ---------- */

const themeToggle = document.querySelector('.theme-toggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light');

function syncThemeUI() {
  const dark = currentTheme() === 'dark';
  if (themeToggle) themeToggle.setAttribute('aria-pressed', String(dark));
  if (themeMeta) themeMeta.setAttribute('content', dark ? '#101116' : '#f5f3ee');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('volt-theme', theme);
  } catch (error) {
    // Тема просто не запомнится.
  }
  syncThemeUI();
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!document.startViewTransition || reduce) {
      applyTheme(next);
      return;
    }

    // Новая тема раскрывается кругом от кнопки.
    const rect = themeToggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;

    root.classList.add('theme-switching');
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
    transition.finished.finally(() => root.classList.remove('theme-switching'));
  });
}

systemDark.addEventListener('change', syncThemeUI);
syncThemeUI();

/* ---------- Шапка: мобильное меню и тень при прокрутке ---------- */

const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.site-header__toggle');
const siteNav = document.getElementById('site-nav');
const desktopQuery = window.matchMedia('(min-width: 768px)');

function setNavOpen(open) {
  if (!navToggle || !header) return;
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  header.classList.toggle('nav-open', open);
  if (open && motionApi().openNav) motionApi().openNav(siteNav);
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setNavOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setNavOpen(false);
  });
}

const backToTop = document.querySelector('.back-to-top');
const backToTopRing = document.querySelector('.back-to-top__progress');

function onScroll() {
  const y = window.scrollY;
  if (header) header.classList.toggle('site-header--scrolled', y > 8);
  if (backToTop) backToTop.classList.toggle('back-to-top--visible', y > 700);
  if (backToTopRing) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    backToTopRing.style.strokeDashoffset = String(1 - (max > 0 ? Math.min(y / max, 1) : 0));
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- Маска телефона: +7 (900) 000-00-00 ---------- */

function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  let result = '+7';
  if (rest.length > 0) result += ' (' + rest.slice(0, 3);
  if (rest.length >= 3) result += ')';
  if (rest.length > 3) result += ' ' + rest.slice(3, 6);
  if (rest.length > 6) result += '-' + rest.slice(6, 8);
  if (rest.length > 8) result += '-' + rest.slice(8, 10);
  return result;
}

document.querySelectorAll('input[type="tel"]').forEach((input) => {
  input.addEventListener('input', () => {
    const atEnd = input.selectionStart === input.value.length;
    if (input.value.replace(/\D/g, '') === '') {
      input.value = '';
      return;
    }
    // Если цифры ввели перед «+7», переносим их в конец номера.
    const raw = input.value;
    const prefixAt = raw.indexOf('+7');
    const normalized = prefixAt > 0 ? raw.slice(prefixAt) + raw.slice(0, prefixAt) : raw;
    input.value = formatPhone(normalized);
    if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
  });

  input.addEventListener('focus', () => {
    if (input.value) return;
    input.value = '+7 (';
    // Ставим курсор в конец, чтобы цифры вводились после кода страны.
    requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
  });

  input.addEventListener('blur', () => {
    if (input.value === '+7 (' || input.value === '+7') input.value = '';
  });
});

/* ---------- Проверка форм с текстовыми сообщениями об ошибках ---------- */

function errorText(field) {
  const v = field.validity;
  if (v.valueMissing) return field.dataset.errorRequired || 'Заполните это поле.';
  if (v.typeMismatch) return field.dataset.errorType || 'Проверьте формат значения.';
  if (v.patternMismatch) return field.dataset.errorPattern || 'Проверьте формат значения.';
  if (v.tooShort) return field.dataset.errorShort || `Минимальная длина — ${field.minLength} символа.`;
  return field.validationMessage;
}

function describedBy(field, id, add) {
  const ids = new Set((field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
  if (add) ids.add(id); else ids.delete(id);
  if (ids.size) field.setAttribute('aria-describedby', [...ids].join(' '));
  else field.removeAttribute('aria-describedby');
}

function validateField(field) {
  const error = document.getElementById(`${field.id}-error`);
  const valid = field.checkValidity();

  if (valid) {
    field.removeAttribute('aria-invalid');
    if (error) {
      error.hidden = true;
      error.textContent = '';
      describedBy(field, error.id, false);
    }
  } else {
    field.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = errorText(field);
      error.hidden = false;
      describedBy(field, error.id, true);
    }
  }
  return valid;
}

function pluralErrors(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} поле`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} поля`;
  return `${n} полей`;
}

const orderDialog = document.getElementById('order-dialog');

document.querySelectorAll('form[data-validate]').forEach((form) => {
  const summary = form.querySelector('.form-summary');
  const fields = Array.from(form.elements).filter((el) => el.willValidate && el.id);
  let submitted = false;

  fields.forEach((field) => {
    const eventName = field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(eventName, () => {
      if (submitted || field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
    field.addEventListener('blur', () => {
      if (submitted && field.value) validateField(field);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitted = true;

    const invalid = fields.filter((field) => !validateField(field));

    if (invalid.length) {
      if (summary) {
        summary.textContent = `Проверьте ${pluralErrors(invalid.length)}: исправьте ошибки, отмеченные красным.`;
        summary.hidden = false;
      }
      invalid[0].focus();
      return;
    }

    if (summary) summary.hidden = true;
    const data = new FormData(form);
    const product = data.get('product');

    // Формы кабинета обрабатывают отправку сами.
    const validEvent = new CustomEvent('form:valid', { cancelable: true, detail: data });
    if (!form.dispatchEvent(validEvent)) {
      submitted = false;
      return;
    }

    if (product && (form.id === 'dialog-form' || form.id === 'order-form')) {
      const orders = store.get('volt-orders', []);
      orders.unshift({ id: Date.now(), product, topic: data.get('topic'), date: new Date().toISOString() });
      store.set('volt-orders', orders.slice(0, 50));
    }

    if (form.dataset.success === 'dialog') {
      orderDialog?.close();
      showToast(product ? `Заказ «${product}» принят. Перезвоним в течение часа.` : 'Заказ принят. Перезвоним в течение часа.');
    } else {
      const success = form.nextElementSibling;
      if (success && success.classList.contains('success-message')) {
        success.hidden = false;
        success.focus();
        motionApi().pop?.(success);
      }
    }

    form.reset();
    submitted = false;
    fields.forEach((field) => field.removeAttribute('aria-invalid'));
    prefillFromProfile();
    form.dispatchEvent(new Event('change'));
  });
});

/* ---------- Модальное окно заказа ---------- */

if (orderDialog) {
  const productLabel = document.getElementById('order-dialog-product');
  const productInput = document.getElementById('dialog-selected-product');
  const dialogForm = document.getElementById('dialog-form');

  document.querySelectorAll('button[data-product]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.product;
      const price = button.dataset.price;
      productInput.value = name;
      productLabel.textContent = price ? `${name} — ${price}` : name;

      dialogForm.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      dialogForm.querySelectorAll('.form-error').forEach((el) => { el.hidden = true; });
      dialogForm.querySelector('.form-summary').hidden = true;

      orderDialog.showModal();
      motionApi().openDialog?.(orderDialog);
    });
  });

  orderDialog.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => orderDialog.close());
  });

  // Закрытие по клику на затемнённый фон.
  orderDialog.addEventListener('click', (event) => {
    if (event.target === orderDialog) orderDialog.close();
  });
}

/* ---------- Страница оформления заказа: выбор товара и превью ---------- */

const productSelect = document.getElementById('order-product');

if (productSelect) {
  const preview = document.getElementById('order-preview');
  const previewImage = document.getElementById('order-preview-image');
  const previewName = document.getElementById('order-preview-name');
  const previewPrice = document.getElementById('order-preview-price');
  const images = {
    1: 'images/tovar1-320.jpg', 2: 'images/tovar2-320.jpg', 3: 'images/tovar3-320.jpg',
    4: 'images/tovar4.svg', 5: 'images/tovar5.svg', 6: 'images/tovar6.svg',
    7: 'images/tovar7.svg', 8: 'images/tovar8.svg', 9: 'images/tovar9.svg',
  };

  const updatePreview = () => {
    const option = productSelect.selectedOptions[0];
    if (!option || !option.value) {
      preview.hidden = true;
      return;
    }
    previewImage.src = images[option.dataset.id];
    previewName.textContent = option.value;
    previewPrice.textContent = option.dataset.price;
    const wasHidden = preview.hidden;
    preview.hidden = false;
    if (wasHidden) motionApi().pop?.(preview);
  };

  const requested = new URLSearchParams(window.location.search).get('product');
  if (requested) {
    const option = productSelect.querySelector(`option[data-id="${CSS.escape(requested)}"]`);
    if (option) productSelect.value = option.value;
  }

  productSelect.addEventListener('change', updatePreview);
  productSelect.form.addEventListener('change', updatePreview);
  updatePreview();
}

/* ---------- Каталог: фильтры, сортировка и счётчик ---------- */

const filtersForm = document.getElementById('filters-form');
const catalogGrid = document.getElementById('catalog-grid');

if (filtersForm && catalogGrid) {
  const cards = Array.from(catalogGrid.querySelectorAll('.product-card'));
  const counter = document.getElementById('catalog-count');
  const empty = document.getElementById('catalog-empty');
  const toggle = document.querySelector('.catalog-filters__toggle');
  const compactQuery = window.matchMedia('(max-width: 1023px)');

  const word = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'товар';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара';
    return 'товаров';
  };

  const applyFilters = () => {
    const data = new FormData(filtersForm);
    const categories = data.getAll('category');
    const min = Number(data.get('price-from')) || 0;
    const max = Number(data.get('price-to')) || Infinity;
    const saleOnly = data.get('sale') === 'true';
    const sort = data.get('sort');

    const visible = cards.filter((card) => {
      const price = Number(card.dataset.price);
      const show = (categories.length === 0 || categories.includes(card.dataset.category))
        && price >= min && price <= max
        && (!saleOnly || card.dataset.sale === 'true');
      card.hidden = !show;
      return show;
    });

    const sorted = [...cards].sort((a, b) => {
      if (sort === 'price-asc') return a.dataset.price - b.dataset.price;
      if (sort === 'price-desc') return b.dataset.price - a.dataset.price;
      if (sort === 'name') {
        return a.querySelector('.product-card__title').textContent
          .localeCompare(b.querySelector('.product-card__title').textContent, 'ru');
      }
      return a.dataset.index - b.dataset.index;
    });
    sorted.forEach((card) => catalogGrid.append(card));

    counter.textContent = `Найдено: ${visible.length} ${word(visible.length)}`;
    empty.hidden = visible.length > 0;
    motionApi().animateCards?.(visible);
  };

  filtersForm.addEventListener('input', applyFilters);
  filtersForm.addEventListener('change', applyFilters);
  filtersForm.addEventListener('submit', (event) => event.preventDefault());
  filtersForm.addEventListener('reset', () => setTimeout(applyFilters));

  document.querySelectorAll('[data-reset-filters]').forEach((button) => {
    button.addEventListener('click', () => {
      filtersForm.reset();
      filtersForm.querySelector('input')?.focus();
    });
  });

  // На телефоне и планшете фильтры можно свернуть.
  const setFiltersOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Скрыть' : 'Показать';
    filtersForm.hidden = !open;
  };

  if (toggle) {
    setFiltersOpen(!compactQuery.matches);
    toggle.addEventListener('click', () => {
      setFiltersOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    compactQuery.addEventListener('change', (event) => setFiltersOpen(!event.matches));
  }
}

/* ---------- Каталог: карточка раскрывается по нажатию ---------- */

const expandableCards = [...document.querySelectorAll('.product-card--expandable')];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setCardOpen(card, open, { animate = true, scroll = true } = {}) {
  const toggle = card.querySelector('.product-card__toggle');
  const panel = card.querySelector('.product-card__details');
  if (!toggle || !panel || open === (toggle.getAttribute('aria-expanded') === 'true')) return;

  toggle.setAttribute('aria-expanded', String(open));

  if (open) {
    card.classList.add('product-card--open');
    panel.hidden = false;
    if (animate) motionApi().expand?.(panel);
    if (scroll) {
      requestAnimationFrame(() => card.scrollIntoView({
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
        block: 'start',
      }));
    }
    window.history.replaceState(null, '', `#${card.id}`);
    return;
  }

  const finish = () => {
    panel.hidden = true;
    card.classList.remove('product-card--open');
    // После сворачивания карточка возвращается в сетку — показываем её, если она ушла за экран.
    const top = card.getBoundingClientRect().top;
    const headerHeight = header ? header.offsetHeight : 0;
    if (scroll && (top < headerHeight || top > window.innerHeight - 120)) {
      card.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
  };
  const collapse = animate ? motionApi().collapse?.(panel) : null;
  if (collapse) collapse.then(finish);
  else finish();
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

expandableCards.forEach((card) => {
  const toggle = card.querySelector('.product-card__toggle');
  toggle.addEventListener('click', () => {
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    if (willOpen) {
      expandableCards.filter((other) => other !== card)
        .forEach((other) => setCardOpen(other, false, { animate: false }));
    }
    setCardOpen(card, willOpen);
  });
});

// Ссылка вида catalog.html#product-3 сразу открывает нужную карточку.
function openCardFromHash(options) {
  if (!window.location.hash.startsWith('#product-')) return;
  const target = document.getElementById(window.location.hash.slice(1));
  if (!target || !target.classList.contains('product-card--expandable')) return;
  expandableCards.filter((other) => other !== target)
    .forEach((other) => setCardOpen(other, false, { animate: false }));
  setCardOpen(target, true, options);
}

if (expandableCards.length) {
  openCardFromHash({ animate: false, scroll: false });
  window.addEventListener('hashchange', () => openCardFromHash({ animate: true, scroll: true }));
}

/* ---------- Подписка в подвале ---------- */

const subscribeForm = document.getElementById('subscribe-form');

if (subscribeForm) {
  const input = document.getElementById('subscribe-email');
  const status = document.getElementById('subscribe-status');

  subscribeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!input.checkValidity()) {
      input.setAttribute('aria-invalid', 'true');
      status.classList.add('subscribe__status--error');
      status.textContent = input.validity.valueMissing
        ? 'Введите e-mail, чтобы подписаться.'
        : 'Проверьте e-mail: нужен формат name@example.com.';
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    status.classList.remove('subscribe__status--error');
    status.textContent = 'Готово! Первое письмо придёт в понедельник.';
    subscribeForm.reset();
  });
}

/* ---------- Переход по якорю после загрузки шрифтов ---------- */

// Плавная прокрутка к якорю может прерваться, когда подгружаются шрифты
// и меняется высота блоков. Доводим страницу до нужного раздела ещё раз.
if (window.location.hash.length > 1) {
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) document.documentElement.classList.remove('is-anchor-load');
  if (target) {
    // offsetTop не учитывает анимационные сдвиги (transform), поэтому позиция точная.
    const pageTop = (el) => {
      let top = 0;
      for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
      return top;
    };
    const jump = () => {
      const headerHeight = header ? header.offsetHeight : 0;
      window.scrollTo({ top: pageTop(target) - headerHeight - 16, behavior: 'instant' });
      document.documentElement.classList.remove('is-anchor-load');
    };
    window.addEventListener('load', () => {
      const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
      fontsReady.then(() => requestAnimationFrame(jump));
    }, { once: true });
  }
}


/* ---------- Подстановка данных из личного кабинета ---------- */

function prefillFromProfile() {
  const user = store.get('volt-user', null);
  if (!user) return;
  const map = { name: user.name, email: user.email, phone: user.phone };
  ['dialog', 'order', 'contact'].forEach((prefix) => {
    Object.entries(map).forEach(([key, value]) => {
      const input = document.getElementById(`${prefix}-${key}`);
      if (input && value && !input.value) input.value = value;
    });
  });
}

prefillFromProfile();

/* ---------- Избранное ---------- */

const favButtons = document.querySelectorAll('[data-fav]');

function syncFavorites() {
  const favorites = store.get('volt-favorites', []);
  favButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(favorites.includes(Number(button.dataset.fav))));
  });
}

favButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const id = Number(button.dataset.fav);
    const name = button.closest('.product-card')?.querySelector('.product-card__title')?.textContent.trim() || 'Товар';
    let favorites = store.get('volt-favorites', []);
    const added = !favorites.includes(id);
    favorites = added ? [...favorites, id] : favorites.filter((item) => item !== id);
    store.set('volt-favorites', favorites);
    syncFavorites();
    motionApi().heart?.(button);
    showToast(added ? `«${name}» добавлен в избранное` : `«${name}» убран из избранного`);
  });
});

syncFavorites();
window.voltSyncFavorites = syncFavorites;
