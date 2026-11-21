// Личный кабинет: вход, заявки, избранное, бонусы и профиль.
// Данные хранятся в localStorage этого браузера.
(() => {
  const store = window.voltStore;
  const dataScript = document.getElementById('products-data');
  if (!store || !dataScript) return;

  const products = JSON.parse(dataScript.textContent);
  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map(products.map((p) => [p.name, p]));
  const TOPICS = { product: 'Заказ товара', consultation: 'Консультация', delivery: 'Доставка' };
  const BONUS_RATE = 0.05;

  const auth = document.getElementById('account-auth');
  const dashboard = document.getElementById('account-dashboard');
  const ordersList = document.getElementById('orders-list');
  const ordersEmpty = document.getElementById('orders-empty');
  const favoritesGrid = document.getElementById('favorites-grid');
  const favoritesEmpty = document.getElementById('favorites-empty');
  const loginForm = document.getElementById('login-form');
  const profileForm = document.getElementById('profile-form');
  const toast = (text) => window.voltToast?.(text);
  const motion = () => window.siteMotion || {};

  const formatMoney = (value) => `${value.toLocaleString('ru-RU')} ₽`;
  const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function productImage(product, className) {
    const img = el('img', className);
    img.src = product ? product.image : 'images/favicon.svg';
    img.alt = '';
    img.width = 160;
    img.height = 120;
    img.loading = 'lazy';
    return img;
  }

  function renderOrders(orders) {
    ordersList.replaceChildren();
    orders.forEach((order) => {
      const product = byName.get(order.product);
      const item = el('li', 'order-item');
      item.append(productImage(product, 'order-item__image'));
      item.append(el('p', 'order-item__name', order.product));
      item.append(el('p', 'order-item__meta', `${TOPICS[order.topic] || 'Заявка'} · ${formatDate(order.date)}`));

      const side = el('div', 'order-item__side');
      if (product) side.append(el('span', 'order-item__price', product.priceText));
      side.append(el('span', 'order-item__status', 'Принята'));
      item.append(side);
      ordersList.append(item);
    });
    ordersEmpty.hidden = orders.length > 0;
  }

  function renderFavorites(favorites) {
    favoritesGrid.replaceChildren();
    favorites.map((id) => byId.get(id)).filter(Boolean).forEach((product) => {
      const card = el('li', 'fav-card');
      const image = productImage(product, 'fav-card__image');
      image.alt = product.alt;
      card.append(image);
      card.append(el('p', 'fav-card__category', product.category));

      const name = el('p', 'fav-card__name');
      const link = el('a', '', product.name);
      link.href = `catalog.html#product-${product.id}`;
      name.append(link);
      card.append(name);
      card.append(el('p', 'fav-card__price', product.priceText));

      const actions = el('div', 'fav-card__actions');
      const order = el('a', 'button button--primary button--small', 'Заказать');
      order.href = `order.html?product=${product.id}`;
      order.setAttribute('aria-label', `Заказать: ${product.name}`);
      const remove = el('button', 'button button--ghost button--small', 'Убрать');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Убрать из избранного: ${product.name}`);
      remove.addEventListener('click', () => {
        store.set('volt-favorites', store.get('volt-favorites', []).filter((item) => item !== product.id));
        window.voltSyncFavorites?.();
        render();
        toast(`«${product.name}» убран из избранного`);
        document.getElementById('tab-favorites').focus();
      });
      actions.append(order, remove);
      card.append(actions);
      favoritesGrid.append(card);
    });
    favoritesEmpty.hidden = favoritesGrid.children.length > 0;
  }

  function render() {
    const user = store.get('volt-user', null);
    auth.hidden = Boolean(user);
    dashboard.hidden = !user;
    if (!user) return;

    document.getElementById('account-name').textContent = user.name;
    document.getElementById('account-email').textContent = [user.email, user.phone].filter(Boolean).join(' · ');
    document.getElementById('account-avatar').textContent = user.name.trim().charAt(0).toUpperCase() || 'В';

    const orders = store.get('volt-orders', []);
    const favorites = store.get('volt-favorites', []);
    const total = orders.reduce((sum, order) => sum + (byName.get(order.product)?.price || 0), 0);

    renderOrders(orders);
    renderFavorites(favorites);
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-favorites').textContent = favorites.filter((id) => byId.has(id)).length;
    document.getElementById('stat-bonus').textContent = Math.round(total * BONUS_RATE).toLocaleString('ru-RU');

    profileForm.elements.name.value = user.name || '';
    profileForm.elements.email.value = user.email || '';
    profileForm.elements.phone.value = user.phone || '';
    profileForm.elements.city.value = user.city || '';
  }

  /* Вход и регистрация */
  loginForm.addEventListener('form:valid', (event) => {
    event.preventDefault();
    const data = event.detail;
    store.set('volt-user', {
      name: data.get('name').trim(),
      email: data.get('email').trim(),
      phone: data.get('phone') || '',
      city: '',
    });
    loginForm.reset();
    render();
    motion().pop?.(dashboard);
    toast('Вы вошли в личный кабинет');
    document.getElementById('tab-orders').focus();
  });

  /* Сохранение профиля */
  profileForm.addEventListener('form:valid', (event) => {
    event.preventDefault();
    const data = event.detail;
    const user = store.get('volt-user', {});
    store.set('volt-user', {
      ...user,
      name: data.get('name').trim(),
      email: data.get('email').trim(),
      phone: data.get('phone') || '',
      city: (data.get('city') || '').trim(),
    });
    render();
    toast('Изменения сохранены');
  });

  /* Выход */
  document.getElementById('logout-button').addEventListener('click', () => {
    store.remove('volt-user');
    render();
    toast('Вы вышли из кабинета');
    document.getElementById('login-name').focus();
  });

  /* Вкладки: щелчок и стрелки на клавиатуре */
  const tabs = [...document.querySelectorAll('.tabs__tab')];

  function selectTab(tab, focus = true) {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
    motion().pop?.(document.getElementById(tab.getAttribute('aria-controls')));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (event.key in keys) {
        event.preventDefault();
        selectTab(tabs[(index + keys[event.key] + tabs.length) % tabs.length]);
      } else if (event.key === 'Home') {
        event.preventDefault();
        selectTab(tabs[0]);
      } else if (event.key === 'End') {
        event.preventDefault();
        selectTab(tabs[tabs.length - 1]);
      }
    });
  });

  // Изменения из других вкладок браузера.
  window.addEventListener('storage', render);

  render();
})();
