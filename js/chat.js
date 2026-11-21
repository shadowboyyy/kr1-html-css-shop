// Виджет чата с консультантом: быстрые вопросы и автоматические ответы.
(() => {
  const root = document.querySelector('[data-chat]');
  if (!root) return;

  const launcher = root.querySelector('.chat__launcher');
  const panel = root.querySelector('.chat__panel');
  const closeButton = root.querySelector('.chat__close');
  const messages = root.querySelector('.chat__messages');
  const form = root.querySelector('.chat__form');
  const input = root.querySelector('.chat__input');
  const badge = root.querySelector('.chat__badge');
  const motion = () => window.siteMotion || {};

  const HISTORY_KEY = 'volt-chat';
  const SEEN_KEY = 'volt-chat-seen';
  const PHONE = '<a href="tel:+79000000000">+7 (900) 000-00-00</a>';

  const GREETING = 'Здравствуйте! Я консультант «Вольт». Подскажу по доставке, оплате и гарантии и помогу выбрать товар. Выберите вопрос ниже или напишите свой.';

  const RULES = [
    [/привет|здравств|добрый|хай/i,
      'Здравствуйте! Чем могу помочь? Могу рассказать о доставке, оплате, гарантии или подобрать товар.'],
    [/доставк|привез|курьер|срок|когда/i,
      'По Москве привозим на следующий день, по России — от двух дней. Номер для отслеживания пришлём после подтверждения заказа.'],
    [/оплат|карт|налич|плат/i,
      'Оплата при получении — картой или наличными курьеру. Сначала осматриваете заказ, потом платите. Предоплата не нужна.'],
    [/гарант|возврат|обмен|слом|брак/i,
      'На всю технику — гарантия 12 месяцев. Если товар не подошёл, обменяем его или вернём деньги в течение 14 дней.'],
    [/скидк|акци|дешев|распрод/i,
      'Сейчас со скидкой GTA VI, клавиатура Вольт K87 и колонка Вольт S1. В <a href="catalog.html">каталоге</a> включите фильтр «Только со скидкой».'],
    [/выбор|выбрать|посовет|подобр|помог|какой|какую/i,
      'С радостью помогу! Напишите, для чего нужна покупка и на какой бюджет вы рассчитываете. А пока можно открыть <a href="catalog.html">каталог</a> и отфильтровать товары по категории и цене.'],
    [/заказ|заявк|купить|оформ/i,
      'Нажмите «Заказать» в карточке товара или откройте <a href="order.html">страницу заявки</a>. Менеджер перезвонит в течение часа и уточнит детали.'],
    [/кабинет|избран|бонус|балл/i,
      'В <a href="account.html">личном кабинете</a> собраны ваши заявки и избранное, а с каждой заявки начисляются бонусы — 5% от суммы.'],
    [/адрес|шоурум|где вы|наход|приехать/i,
      'Наш шоурум: Москва, ул. Вольтова, 12. Открыт каждый день с 10:00 до 21:00. Схема проезда — на странице <a href="contacts.html">контактов</a>.'],
    [/телефон|позвон|менеджер|оператор|человек|связ/i,
      `Позвоните нам: ${PHONE}, каждый день с 10:00 до 21:00. Или оставьте <a href="order.html">заявку</a> — перезвоним сами.`],
    [/спасибо|благодар/i,
      'Пожалуйста! Если появятся вопросы — пишите, я здесь.'],
  ];

  const FALLBACK = `Точный ответ на этот вопрос подскажет менеджер: позвоните ${PHONE} или оставьте <a href="order.html">заявку</a>. Ещё я могу рассказать о доставке, оплате, гарантии и скидках.`;

  const readSession = (key, fallback) => {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  };
  const writeSession = (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Переписка просто не сохранится между страницами.
    }
  };

  let history = readSession(HISTORY_KEY, []);

  const timeNow = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  function renderMessage(message, animate) {
    const bubble = document.createElement('div');
    bubble.className = `chat__msg chat__msg--${message.from}`;

    const author = document.createElement('span');
    author.className = 'visually-hidden';
    author.textContent = message.from === 'bot' ? 'Консультант: ' : 'Вы: ';
    bubble.append(author);

    const body = document.createElement('span');
    // Ответы консультанта — заранее заготовленный текст сайта, сообщения пользователя выводятся как текст.
    if (message.from === 'bot') body.innerHTML = message.text;
    else body.textContent = message.text;
    bubble.append(body);

    const time = document.createElement('span');
    time.className = 'chat__time';
    time.textContent = message.time;
    bubble.append(time);

    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    if (animate) motion().message?.(bubble);
  }

  function addMessage(from, text) {
    const message = { from, text, time: timeNow() };
    history.push(message);
    history = history.slice(-40);
    writeSession(HISTORY_KEY, history);
    renderMessage(message, true);
  }

  function replyTo(question) {
    const rule = RULES.find(([pattern]) => pattern.test(question));
    return rule ? rule[1] : FALLBACK;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'chat__msg chat__msg--bot chat__typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.append(typing);
    messages.scrollTop = messages.scrollHeight;
    return typing;
  }

  // Ответы идут по очереди: на каждый вопрос — свой ответ.
  let queue = Promise.resolve();

  function ask(question) {
    const text = question.trim();
    if (!text) return;
    addMessage('user', text);
    queue = queue.then(() => new Promise((resolve) => {
      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        addMessage('bot', replyTo(text));
        resolve();
      }, 700 + Math.min(text.length * 15, 900));
    }));
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Закрыть чат с консультантом');
    badge.hidden = true;
    writeSession(SEEN_KEY, true);

    if (!history.length) {
      addMessage('bot', GREETING);
    }
    messages.scrollTop = messages.scrollHeight;
    motion().chatOpen?.(panel);
    input.focus();
  }

  function closeChat(returnFocus = true) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Чат с консультантом');
    if (returnFocus) launcher.focus();
  }

  history.forEach((message) => renderMessage(message, false));
  if (readSession(SEEN_KEY, false)) badge.hidden = true;

  launcher.addEventListener('click', () => {
    if (panel.hidden) openChat();
    else closeChat();
  });

  closeButton.addEventListener('click', () => closeChat());

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.stopPropagation();
      closeChat();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
    input.value = '';
    input.focus();
  });

  root.querySelectorAll('[data-question]').forEach((chip) => {
    chip.addEventListener('click', () => {
      ask(chip.dataset.question);
      input.focus();
    });
  });
})();
