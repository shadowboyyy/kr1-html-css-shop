// Страница товара: показывает только выбранный товар.
// Адрес вида product.html?id=3 (поддерживается и старый вариант product.html#product-3).
(() => {
  const dataScript = document.getElementById('product-data');
  const root = document.querySelector('[data-product-page]');
  if (!dataScript || !root) return;

  const products = JSON.parse(dataScript.textContent);
  const params = new URLSearchParams(window.location.search);
  const hashId = window.location.hash.match(/^#product-(\d+)$/);
  const requestedId = Number(params.get('id') || (hashId && hashId[1]) || products[0].id);
  const product = products.find((item) => item.id === requestedId) || products[0];
  const part = (name) => document.querySelector(`[data-pp="${name}"]`);

  // Ссылка с якорем приводится к основному адресу страницы товара.
  if (hashId || params.get('id') !== String(product.id)) {
    window.history.replaceState(null, '', `product.html?id=${product.id}`);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderProduct() {
    document.title = `${product.name} — Вольт`;
    part('crumb').textContent = product.name;
    part('name').textContent = product.name;
    part('category').textContent = [product.category, product.brand].filter(Boolean).join(' · ');
    part('short').textContent = product.short;
    part('long').textContent = product.long;
    part('caption').textContent = `Характеристики: ${product.name}`;

    // Цена, фото и бейдж — разметка сайта из каталога (не пользовательские данные).
    part('price').innerHTML = product.priceHtml;
    part('media').innerHTML = product.media;
    const badge = part('badge');
    badge.className = `product-card__badge ${product.badgeClass}`;
    badge.textContent = product.badge;

    const features = part('features');
    const check = features.querySelector('svg');
    features.replaceChildren(...product.features.map((feature) => {
      const li = el('li');
      if (check) li.append(check.cloneNode(true));
      li.append(feature);
      return li;
    }));

    part('specs').replaceChildren(...product.specs.map(([key, value]) => {
      const row = el('tr');
      row.setAttribute('role', 'row');
      const th = el('th', '', key);
      th.scope = 'row';
      th.setAttribute('role', 'rowheader');
      const td = el('td', '', value);
      td.setAttribute('role', 'cell');
      row.append(th, td);
      return row;
    }));

    const order = part('order');
    order.dataset.product = product.name;
    order.dataset.price = product.priceText;
    order.setAttribute('aria-label', `Заказать: ${product.name}`);
    part('order-link').href = `order.html?product=${product.id}`;

    const fav = part('fav');
    fav.dataset.fav = product.id;
    fav.setAttribute('aria-label', `В избранное: ${product.name}`);
    window.voltSyncFavorites?.();
  }

  function renderRelated() {
    const list = part('related');
    const index = products.indexOf(product);
    const others = [1, 2, 3].map((step) => products[(index + step) % products.length]);

    list.replaceChildren(...others.map((item) => {
      const li = el('li', 'related-card');
      const img = el('img', 'related-card__image');
      img.src = item.thumb;
      img.alt = '';
      img.width = 320;
      img.height = 240;
      img.loading = 'lazy';

      const body = el('div', 'related-card__body');
      body.append(el('p', 'related-card__category', item.category));
      const title = el('p', 'related-card__title');
      const link = el('a', 'related-card__link', item.name);
      link.href = `product.html?id=${item.id}`;
      title.append(link);
      body.append(title, el('p', 'related-card__price', item.priceText));

      li.append(img, body);
      return li;
    }));
  }

  renderProduct();
  renderRelated();
})();
