<?php
/**
 * Конфигурация монитора доступности.
 *
 * Каждый ресурс описывается полями:
 *   id       — уникальный идентификатор;
 *   name     — отображаемое имя;
 *   domain   — домен, который реально пингуется из браузера пользователя;
 *   url      — ссылка для открытия сайта;
 *   category — категория (для фильтра);
 *   status   — официальный статус в РФ: ok | slow | blocked | left
 *   note     — короткое пояснение про ограничения.
 *
 * Поле "status" — это СПРАВОЧНАЯ информация (известные ограничения в РФ).
 * Реальная доступность проверяется в браузере по IP пользователя (см. app.js).
 *
 * Статусы:
 *   ok      — работает без ограничений;
 *   slow    — работает, но замедляется/деградирует;
 *   blocked — официально заблокирован в РФ (доступ часто только через VPN);
 *   left    — сервис сам ушёл из РФ / геоблокировка с его стороны.
 */

return [
    'updated' => '2026-05',
    'categories' => [
        'search'    => 'Поиск',
        'social'    => 'Соцсети',
        'messenger' => 'Мессенджеры',
        'video'     => 'Видео и стриминг',
        'content'   => 'Контент и донаты',
        'shop'      => 'Маркетплейсы',
        'dev'       => 'Разработка',
        'gaming'    => 'Игры',
        'ai'        => 'ИИ-сервисы',
        'info'      => 'Справка и новости',
        'cloud'     => 'Облака и сети',
    ],
    // Порядок = приоритет вывода. Сверху — простые и важные для обычных
    // пользователей сервисы, ниже — нишевые/инфраструктурные и для разработчиков.
    'sites' => [
        // ── Поиск ─────────────────────────────────────────────
        ['id' => 'google',     'name' => 'Google',          'domain' => 'www.google.com',      'url' => 'https://www.google.com',      'category' => 'search',    'status' => 'ok',      'note' => 'Поиск работает.', 'origin' => 'foreign'],
        ['id' => 'yandex',     'name' => 'Яндекс',          'domain' => 'ya.ru',               'url' => 'https://ya.ru',               'category' => 'search',    'status' => 'ok',      'note' => 'Российский сервис, работает.', 'origin' => 'ru'],
        ['id' => 'duckduckgo', 'name' => 'DuckDuckGo',      'domain' => 'duckduckgo.com',      'url' => 'https://duckduckgo.com',      'category' => 'search',    'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],
        ['id' => 'bing',       'name' => 'Bing',            'domain' => 'www.bing.com',        'url' => 'https://www.bing.com',        'category' => 'search',    'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],

        // ── Соцсети ───────────────────────────────────────────
        ['id' => 'vk',         'name' => 'ВКонтакте',       'domain' => 'vk.com',              'url' => 'https://vk.com',              'category' => 'social',    'status' => 'ok',      'note' => 'Российская соцсеть, работает.', 'origin' => 'ru'],
        ['id' => 'ok',         'name' => 'Одноклассники',   'domain' => 'ok.ru',               'url' => 'https://ok.ru',               'category' => 'social',    'status' => 'ok',      'note' => 'Работает.', 'origin' => 'ru'],
        ['id' => 'instagram',  'name' => 'Instagram',       'domain' => 'www.instagram.com',   'url' => 'https://www.instagram.com',   'category' => 'social',    'status' => 'blocked', 'note' => 'Заблокирован с 2022 (Meta признана экстремистской в РФ).', 'origin' => 'foreign'],
        ['id' => 'facebook',   'name' => 'Facebook',        'domain' => 'www.facebook.com',    'url' => 'https://www.facebook.com',    'category' => 'social',    'status' => 'blocked', 'note' => 'Заблокирован с 2022 (Meta).', 'origin' => 'foreign'],
        ['id' => 'threads',    'name' => 'Threads',         'domain' => 'www.threads.net',     'url' => 'https://www.threads.net',     'category' => 'social',    'status' => 'blocked', 'note' => 'Заблокирован (продукт Meta).', 'origin' => 'foreign'],
        ['id' => 'x',          'name' => 'X (Twitter)',     'domain' => 'x.com',               'url' => 'https://x.com',               'category' => 'social',    'status' => 'blocked', 'note' => 'Замедлен/заблокирован с 2022.', 'origin' => 'foreign'],
        ['id' => 'linkedin',   'name' => 'LinkedIn',        'domain' => 'www.linkedin.com',    'url' => 'https://www.linkedin.com',    'category' => 'social',    'status' => 'blocked', 'note' => 'Заблокирован с 2016.', 'origin' => 'foreign'],

        // ── Мессенджеры ───────────────────────────────────────
        ['id' => 'telegram',   'name' => 'Telegram',        'domain' => 'web.telegram.org',    'url' => 'https://web.telegram.org',    'category' => 'messenger', 'status' => 'blocked', 'note' => 'Массовые сбои и фактическая блокировка с мая 2026; звонки заблокированы с 2025.', 'origin' => 'foreign'],
        ['id' => 'whatsapp',   'name' => 'WhatsApp',        'domain' => 'web.whatsapp.com',    'url' => 'https://web.whatsapp.com',    'category' => 'messenger', 'status' => 'blocked', 'note' => 'Полностью заблокирован: домены удалены из НСДИ (фев. 2026).', 'origin' => 'foreign'],
        ['id' => 'max',        'name' => 'MAX (Макс)',      'domain' => 'max.ru',              'url' => 'https://max.ru',              'category' => 'messenger', 'status' => 'ok',      'note' => 'Государственный мессенджер, работает.', 'origin' => 'ru'],
        ['id' => 'imo',        'name' => 'imo',             'domain' => 'imo.im',              'url' => 'https://imo.im',              'category' => 'messenger', 'status' => 'ok',      'note' => 'Работает, вырос в популярности в 2025–2026.', 'origin' => 'foreign'],
        ['id' => 'discord',    'name' => 'Discord',         'domain' => 'discord.com',         'url' => 'https://discord.com',         'category' => 'messenger', 'status' => 'blocked', 'note' => 'Заблокирован в 2024.', 'origin' => 'foreign'],
        ['id' => 'viber',      'name' => 'Viber',           'domain' => 'www.viber.com',       'url' => 'https://www.viber.com',       'category' => 'messenger', 'status' => 'blocked', 'note' => 'Заблокирован в 2024.', 'origin' => 'foreign'],
        ['id' => 'signal',     'name' => 'Signal',          'domain' => 'signal.org',          'url' => 'https://signal.org',          'category' => 'messenger', 'status' => 'blocked', 'note' => 'Заблокирован/ограничен с 2024.', 'origin' => 'foreign'],

        // ── Видео и стриминг ──────────────────────────────────
        ['id' => 'youtube',    'name' => 'YouTube',         'domain' => 'www.youtube.com',     'url' => 'https://www.youtube.com',     'category' => 'video',     'status' => 'blocked', 'note' => 'Фактически заблокирован в начале 2026 после замедления 2024–2025.', 'origin' => 'foreign'],
        ['id' => 'rutube',     'name' => 'RUTUBE',          'domain' => 'rutube.ru',           'url' => 'https://rutube.ru',           'category' => 'video',     'status' => 'ok',      'note' => 'Российский сервис, работает.', 'origin' => 'ru'],
        ['id' => 'tiktok',     'name' => 'TikTok',          'domain' => 'www.tiktok.com',      'url' => 'https://www.tiktok.com',      'category' => 'video',     'status' => 'slow',    'note' => 'Загрузка/просмотр нового контента ограничены с 2022.', 'origin' => 'foreign'],
        ['id' => 'twitch',     'name' => 'Twitch',          'domain' => 'www.twitch.tv',       'url' => 'https://www.twitch.tv',       'category' => 'video',     'status' => 'slow',    'note' => 'Работает, периодические ограничения.', 'origin' => 'foreign'],
        ['id' => 'vkvideo',    'name' => 'VK Видео',        'domain' => 'vkvideo.ru',          'url' => 'https://vkvideo.ru',          'category' => 'video',     'status' => 'ok',      'note' => 'Российский сервис, работает.', 'origin' => 'ru'],
        ['id' => 'dzen',       'name' => 'Дзен',            'domain' => 'dzen.ru',             'url' => 'https://dzen.ru',             'category' => 'video',     'status' => 'ok',      'note' => 'Работает; иногда SmartCaptcha «Вы не робот?».', 'origin' => 'ru'],
        ['id' => 'netflix',    'name' => 'Netflix',         'domain' => 'www.netflix.com',     'url' => 'https://www.netflix.com',     'category' => 'video',     'status' => 'left',    'note' => 'Сервис ушёл из РФ в 2022.', 'origin' => 'foreign'],
        ['id' => 'spotify',    'name' => 'Spotify',         'domain' => 'open.spotify.com',    'url' => 'https://open.spotify.com',    'category' => 'video',     'status' => 'left',    'note' => 'Сервис ушёл из РФ в 2022.', 'origin' => 'foreign'],

        // ── Маркетплейсы ──────────────────────────────────────
        ['id' => 'wildberries','name' => 'Wildberries',     'domain' => 'www.wildberries.ru',  'url' => 'https://www.wildberries.ru',  'category' => 'shop',      'status' => 'ok',      'note' => 'Российский маркетплейс, работает.', 'origin' => 'ru'],
        ['id' => 'ozon',       'name' => 'Ozon',            'domain' => 'www.ozon.ru',         'url' => 'https://www.ozon.ru',         'category' => 'shop',      'status' => 'ok',      'note' => 'Российский маркетплейс, работает.', 'origin' => 'ru'],
        ['id' => 'aliexpress', 'name' => 'AliExpress',      'domain' => 'aliexpress.ru',       'url' => 'https://aliexpress.ru',       'category' => 'shop',      'status' => 'ok',      'note' => 'Российская версия работает.', 'origin' => 'ru'],
        ['id' => 'amazon',     'name' => 'Amazon',          'domain' => 'www.amazon.com',      'url' => 'https://www.amazon.com',      'category' => 'shop',      'status' => 'left',    'note' => 'Доставка/продажи в РФ недоступны.', 'origin' => 'foreign'],

        // ── Госуслуги и сервисы для жизни ─────────────────────
        ['id' => 'gosuslugi',  'name' => 'Госуслуги',       'domain' => 'www.gosuslugi.ru',    'url' => 'https://www.gosuslugi.ru',    'category' => 'cloud',     'status' => 'ok',      'note' => 'Государственный портал, работает.', 'origin' => 'ru'],

        // ── Контент и донаты ──────────────────────────────────
        ['id' => 'boosty',     'name' => 'Boosty',          'domain' => 'boosty.to',           'url' => 'https://boosty.to',           'category' => 'content',   'status' => 'ok',      'note' => 'Российская платформа (VK), работает.', 'origin' => 'ru'],
        ['id' => 'patreon',    'name' => 'Patreon',         'domain' => 'www.patreon.com',     'url' => 'https://www.patreon.com',     'category' => 'content',   'status' => 'slow',    'note' => 'Доступ нестабилен, оплата из РФ ограничена.', 'origin' => 'foreign'],
        ['id' => 'pikabu',     'name' => 'Пикабу',          'domain' => 'pikabu.ru',           'url' => 'https://pikabu.ru',           'category' => 'content',   'status' => 'ok',      'note' => 'Российский сервис, работает.', 'origin' => 'ru'],
        ['id' => 'pinterest',  'name' => 'Pinterest',       'domain' => 'www.pinterest.com',   'url' => 'https://www.pinterest.com',   'category' => 'content',   'status' => 'slow',    'note' => 'Работает с периодическими замедлениями.', 'origin' => 'foreign'],

        // ── Игры ──────────────────────────────────────────────
        ['id' => 'steam',      'name' => 'Steam',           'domain' => 'store.steampowered.com','url' => 'https://store.steampowered.com','category' => 'gaming',  'status' => 'ok',      'note' => 'Работает, оплата ограничена.', 'origin' => 'foreign'],
        ['id' => 'epic',       'name' => 'Epic Games',      'domain' => 'store.epicgames.com', 'url' => 'https://store.epicgames.com',  'category' => 'gaming',    'status' => 'ok',      'note' => 'Работает, оплата ограничена.', 'origin' => 'foreign'],
        ['id' => 'playstation','name' => 'PlayStation',     'domain' => 'www.playstation.com', 'url' => 'https://www.playstation.com',  'category' => 'gaming',    'status' => 'left',    'note' => 'Store недоступен в РФ.', 'origin' => 'foreign'],

        // ── ИИ-сервисы ────────────────────────────────────────
        ['id' => 'openai',     'name' => 'ChatGPT (OpenAI)','domain' => 'chatgpt.com',         'url' => 'https://chatgpt.com',         'category' => 'ai',        'status' => 'left',    'note' => 'Геоблокировка со стороны OpenAI.', 'origin' => 'foreign'],
        ['id' => 'claude',     'name' => 'Claude',          'domain' => 'claude.ai',           'url' => 'https://claude.ai',           'category' => 'ai',        'status' => 'left',    'note' => 'Официально недоступен в РФ; сайт открывается, иногда проверка безопасности.', 'origin' => 'foreign'],
        ['id' => 'gemini',     'name' => 'Gemini',          'domain' => 'gemini.google.com',   'url' => 'https://gemini.google.com',   'category' => 'ai',        'status' => 'left',    'note' => 'Недоступен в РФ.', 'origin' => 'foreign'],

        // ── Справка и новости ─────────────────────────────────
        ['id' => 'wikipedia',  'name' => 'Wikipedia',       'domain' => 'ru.wikipedia.org',    'url' => 'https://ru.wikipedia.org',    'category' => 'info',      'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],
        ['id' => 'reddit',     'name' => 'Reddit',          'domain' => 'www.reddit.com',      'url' => 'https://www.reddit.com',      'category' => 'info',      'status' => 'slow',    'note' => 'Периодическое замедление.', 'origin' => 'foreign'],
        ['id' => 'bbc',        'name' => 'BBC',             'domain' => 'www.bbc.com',         'url' => 'https://www.bbc.com',         'category' => 'info',      'status' => 'blocked', 'note' => 'Заблокирован с 2022.', 'origin' => 'foreign'],

        // ── Бренды и магазины техники ─────────────────────────
        ['id' => 'microsoft',  'name' => 'Microsoft',       'domain' => 'www.microsoft.com',   'url' => 'https://www.microsoft.com',   'category' => 'cloud',     'status' => 'ok',      'note' => 'Сайт работает, часть сервисов ограничена.', 'origin' => 'foreign'],
        ['id' => 'apple',      'name' => 'Apple',           'domain' => 'www.apple.com',       'url' => 'https://www.apple.com',       'category' => 'cloud',     'status' => 'ok',      'note' => 'Сайт работает, продажи ограничены.', 'origin' => 'foreign'],

        // ═══ Ниже — сервисы для разработчиков и инфраструктура ═══

        // ── Разработка ────────────────────────────────────────
        ['id' => 'github',     'name' => 'GitHub',          'domain' => 'github.com',          'url' => 'https://github.com',          'category' => 'dev',       'status' => 'ok',      'note' => 'Работает, изредка частичные ограничения.', 'origin' => 'foreign'],
        ['id' => 'figma',      'name' => 'Figma',           'domain' => 'www.figma.com',       'url' => 'https://www.figma.com',       'category' => 'dev',       'status' => 'blocked', 'note' => 'По сообщениям — ограничен/недоступен в РФ (неофициально); часто только через VPN.', 'origin' => 'foreign'],
        ['id' => 'gitlab',     'name' => 'GitLab',          'domain' => 'gitlab.com',          'url' => 'https://gitlab.com',          'category' => 'dev',       'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],
        ['id' => 'habr',       'name' => 'Habr',            'domain' => 'habr.com',            'url' => 'https://habr.com',            'category' => 'dev',       'status' => 'ok',      'note' => 'Российский IT-портал, работает.', 'origin' => 'ru'],
        ['id' => 'npm',        'name' => 'npm registry',    'domain' => 'www.npmjs.com',       'url' => 'https://www.npmjs.com',       'category' => 'dev',       'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],
        ['id' => 'docker',     'name' => 'Docker Hub',      'domain' => 'hub.docker.com',      'url' => 'https://hub.docker.com',      'category' => 'dev',       'status' => 'slow',    'note' => 'Периодические ограничения доступа.', 'origin' => 'foreign'],
        ['id' => 'telegram_api','name' => 'Telegram API',    'domain' => 'api.telegram.org',    'url' => 'https://core.telegram.org/api', 'category' => 'dev',     'status' => 'blocked', 'note' => 'API (api.telegram.org) ограничен вместе с инфраструктурой Telegram.', 'origin' => 'foreign'],

        // ── Облака, хостинг и сети ────────────────────────────
        ['id' => 'cloudflare', 'name' => 'Cloudflare',      'domain' => 'www.cloudflare.com',  'url' => 'https://www.cloudflare.com',  'category' => 'cloud',     'status' => 'ok',      'note' => 'Работает.', 'origin' => 'foreign'],
        ['id' => 'beget',      'name' => 'Beget',           'domain' => 'beget.com',           'url' => 'https://beget.com/ru',        'category' => 'cloud',     'status' => 'ok',      'note' => 'Российский хостинг-провайдер, работает.', 'origin' => 'ru'],
        ['id' => 'proton',     'name' => 'Proton',          'domain' => 'proton.me',           'url' => 'https://proton.me',           'category' => 'cloud',     'status' => 'blocked', 'note' => 'Proton Mail/VPN заблокирован.', 'origin' => 'foreign'],
        ['id' => 'tor',        'name' => 'Tor Project',     'domain' => 'www.torproject.org',  'url' => 'https://www.torproject.org',  'category' => 'cloud',     'status' => 'blocked', 'note' => 'Сайт и сеть Tor заблокированы.', 'origin' => 'foreign'],
    ],
];
