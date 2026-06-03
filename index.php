<?php
$config = require __DIR__ . '/config.php';
$sites = $config['sites'];
$categories = $config['categories'];
$updated = $config['updated'];

// Сводка по официальным статусам (справочно)
$summary = ['ok' => 0, 'slow' => 0, 'blocked' => 0, 'left' => 0];
foreach ($sites as $s) {
    if (isset($summary[$s['status']])) {
        $summary[$s['status']]++;
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Монитор доступности сайтов — проверка из вашего браузера</title>
    <meta name="description" content="Реальная проверка доступности популярных сайтов из РФ напрямую из вашего браузера и с вашего IP.">
    <link rel="preconnect" href="https://icons.duckduckgo.com">
    <link rel="stylesheet" href="assets/css/style.css?v=7">
</head>
<body>
    <div class="bg-grid" aria-hidden="true"></div>

    <header class="site-header">
        <div class="container">
            <div class="brand">
                <div class="brand-pulse"></div>
                <h1>Монитор доступности</h1>
            </div>
            <div class="header-right">
                <span class="updated-pill" id="updatedPill" title="Время последней проверки">
                    <span class="upd-dot"></span>
                    <span class="upd-hourglass" aria-hidden="true">⏳</span>
                    <span id="updatedText">ещё не проверялось</span>
                </span>
                <div class="ip-badge" id="ipBadge" title="Ваш внешний IP-адрес">
                    <span class="ip-dot"></span>
                    <span id="ipText">определяем IP…</span>
                </div>
            </div>
        </div>
    </header>

    <main class="container">

        <!-- Сводка в реальном времени -->
        <section class="summary">
            <div class="gauge-card">
                <div class="gauge" id="gauge" style="--pct:0">
                    <div class="gauge-inner">
                        <span class="gauge-num" id="gaugePct">0%</span>
                        <span class="gauge-label">доступно<br>с вашего IP</span>
                    </div>
                </div>
            </div>
            <div class="stats" id="stats">
                <button class="stat stat-up" data-filter="up">
                    <span class="stat-num" id="cntUp">0</span>
                    <span class="stat-label">Доступно</span>
                </button>
                <button class="stat stat-slow" data-filter="slow">
                    <span class="stat-num" id="cntSlow">0</span>
                    <span class="stat-label">Медленно</span>
                </button>
                <button class="stat stat-down" data-filter="down">
                    <span class="stat-num" id="cntDown">0</span>
                    <span class="stat-label">Недоступно</span>
                </button>
                <button class="stat stat-wait" data-filter="idle">
                    <span class="stat-num" id="cntWait"><?= count($sites) ?></span>
                    <span class="stat-label">В очереди</span>
                </button>
                <div class="stat stat-meta" title="С учётом категории, страны и поиска">
                    <span class="stat-num-wrap">
                        <span class="stat-num" id="cntTotal"><?= count($sites) ?></span><span class="stat-num-suffix" id="cntTotalOf">/<?= count($sites) ?></span>
                    </span>
                    <span class="stat-label">Показано</span>
                </div>
            </div>
        </section>

        <!-- Модуль приватности: что видно сайтам с вашего IP -->
        <section class="privacy" id="privacy" aria-label="Мои данные и приватность">
            <div class="pv-head">
                <div class="pv-head-text">
                    <h2>Мои данные</h2>
                    <p class="pv-sub">Что видно сайтам с вашего адреса прямо сейчас</p>
                </div>
                <div class="pv-verdict" id="pvVerdict" data-state="idle" title="Сводный вывод по приватности">
                    <span class="pv-verdict-dot"></span>
                    <span id="pvVerdictText">Анализируем…</span>
                </div>
                <button class="btn btn-ghost pv-refresh" id="pvRefresh" title="Обновить данные">↻</button>
            </div>

            <div class="pv-grid">
                <div class="pv-row" data-key="ip">
                    <span class="pv-ico" aria-hidden="true">🌐</span>
                    <span class="pv-label">IP-адрес</span>
                    <span class="pv-value" id="pvIp">определяем…</span>
                    <button class="pv-copy" id="pvCopy" title="Скопировать IP" hidden>⧉</button>
                </div>
                <div class="pv-row" data-key="geo">
                    <span class="pv-ico" aria-hidden="true">📍</span>
                    <span class="pv-label">Местоположение</span>
                    <span class="pv-value" id="pvGeo">определяем…</span>
                </div>
                <div class="pv-row" data-key="isp">
                    <span class="pv-ico" aria-hidden="true">🏢</span>
                    <span class="pv-label">Провайдер</span>
                    <span class="pv-value" id="pvIsp">определяем…</span>
                </div>
                <div class="pv-row" data-key="browser">
                    <span class="pv-ico" aria-hidden="true">🧭</span>
                    <span class="pv-label">Браузер</span>
                    <span class="pv-value" id="pvBrowser">—</span>
                </div>
                <div class="pv-row" data-key="os">
                    <span class="pv-ico" aria-hidden="true">💻</span>
                    <span class="pv-label">Система</span>
                    <span class="pv-value" id="pvOs">—</span>
                </div>
                <div class="pv-row" data-key="proxy">
                    <span class="pv-ico" aria-hidden="true">🛡️</span>
                    <span class="pv-label">Прокси / VPN</span>
                    <span class="pv-value pv-flag" id="pvProxy" data-state="idle">проверяем…</span>
                </div>
                <div class="pv-row" data-key="webrtc">
                    <span class="pv-ico" aria-hidden="true">📡</span>
                    <span class="pv-label">WebRTC-утечка</span>
                    <span class="pv-value pv-flag" id="pvWebrtc" data-state="idle">проверяем…</span>
                </div>
                <div class="pv-row" data-key="tz">
                    <span class="pv-ico" aria-hidden="true">🕒</span>
                    <span class="pv-label">Часовой пояс</span>
                    <span class="pv-value pv-flag" id="pvTz" data-state="idle">—</span>
                </div>
                <div class="pv-row" data-key="lang">
                    <span class="pv-ico" aria-hidden="true">🗣️</span>
                    <span class="pv-label">Язык системы</span>
                    <span class="pv-value pv-flag" id="pvLang" data-state="idle">—</span>
                </div>
            </div>

            <div class="pv-tips" id="pvTips" hidden>
                <h3>Как закрыть утечки</h3>
                <ul id="pvTipsList"></ul>
            </div>
            <p class="pv-foot">Все проверки выполняются в браузере. Данные геолокации берутся из публичного IP‑сервиса и не сохраняются.</p>
        </section>

        <!-- Панель управления -->
        <section class="toolbar">
            <div class="toolbar-left">
                <button class="btn btn-primary" id="checkAll">
                    <span class="btn-spinner" hidden></span>
                    Проверить все
                </button>
                <label class="switch">
                    <input type="checkbox" id="autoRefresh">
                    <span class="switch-track"></span>
                    <span class="switch-label">Автообновление</span>
                </label>
                <select class="select" id="interval" aria-label="Интервал автообновления">
                    <option value="15">15 сек</option>
                    <option value="30" selected>30 сек</option>
                    <option value="60">1 мин</option>
                    <option value="300">5 мин</option>
                </select>
            </div>
            <div class="toolbar-right">
                <select class="select" id="sort" aria-label="Сортировка">
                    <option value="default">По умолчанию</option>
                    <option value="origin">Сначала российские</option>
                    <option value="status">Сначала недоступные</option>
                    <option value="latency">По скорости отклика</option>
                    <option value="name">По названию</option>
                </select>
                <input type="search" class="search" id="search" placeholder="Поиск по названию…" aria-label="Поиск">
            </div>
        </section>

        <!-- Фильтры по категориям + по стране -->
        <section class="filters-row">
            <div class="filters" id="filters">
                <button class="chip active" data-cat="all">Все</button>
                <?php foreach ($categories as $key => $label): ?>
                    <button class="chip" data-cat="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($label) ?></button>
                <?php endforeach; ?>
            </div>
            <div class="origin-seg" id="originSeg" role="group" aria-label="Фильтр по стране">
                <button class="seg active" data-origin="all">Все</button>
                <button class="seg" data-origin="ru">Российские</button>
                <button class="seg" data-origin="foreign">Зарубежные</button>
            </div>
        </section>

        <!-- Сетка ресурсов -->
        <section class="grid" id="grid">
            <?php foreach ($sites as $s): ?>
                <article class="card" data-id="<?= htmlspecialchars($s['id']) ?>" data-cat="<?= htmlspecialchars($s['category']) ?>" data-origin="<?= htmlspecialchars($s['origin'] ?? 'foreign') ?>" data-name="<?= htmlspecialchars(mb_strtolower($s['name'])) ?>">
                    <div class="card-head">
                        <img class="favicon" alt="" loading="lazy"
                             src="https://icons.duckduckgo.com/ip3/<?= htmlspecialchars($s['domain']) ?>.ico"
                             onerror="this.classList.add('favicon-fallback');this.removeAttribute('src');this.textContent='<?= htmlspecialchars(mb_strtoupper(mb_substr($s['name'],0,1))) ?>';">
                        <div class="card-title">
                            <a href="<?= htmlspecialchars($s['url']) ?>" target="_blank" rel="noopener noreferrer"><?= htmlspecialchars($s['name']) ?></a>
                            <span class="card-domain"><?= htmlspecialchars($s['domain']) ?></span>
                        </div>
                        <span class="status-led" data-state="idle" title="Ожидание проверки"></span>
                    </div>

                    <div class="card-body">
                        <div class="live-row">
                            <span class="live-state" data-state="idle">Ожидание</span>
                            <span class="latency" hidden></span>
                        </div>
                        <div class="bar"><span class="bar-fill"></span></div>
                        <span class="checked-at" hidden></span>
                    </div>

                    <div class="card-foot">
                        <div class="badges">
                            <span class="badge badge-<?= htmlspecialchars($s['status']) ?>">
                                <?php
                                echo [
                                    'ok' => 'Без ограничений',
                                    'slow' => 'Замедление',
                                    'blocked' => 'Заблокирован в РФ',
                                    'left' => 'Ушёл из РФ',
                                ][$s['status']] ?? $s['status'];
                                ?>
                            </span>
                            <?php $isRu = ($s['origin'] ?? 'foreign') === 'ru'; ?>
                            <span class="badge badge-origin <?= $isRu ? 'origin-ru' : 'origin-foreign' ?>">
                                <?= $isRu ? 'РФ' : 'Зарубеж' ?>
                            </span>
                        </div>
                        <button class="btn btn-ghost btn-recheck" title="Проверить этот ресурс">↻</button>
                    </div>
                    <p class="card-note"><?= htmlspecialchars($s['note']) ?></p>
                </article>
            <?php endforeach; ?>
        </section>
        <p class="grid-empty hidden" id="gridEmpty">Нет ресурсов по выбранным фильтрам. Смените категорию, страну или сбросьте фильтр статуса.</p>

        <section class="info-block">
            <h2>Как это работает</h2>
            <p>
                Проверка выполняется <strong>прямо в вашем браузере</strong>: к каждому ресурсу
                отправляются лёгкие запросы (главная страница, robots.txt, favicon) с вашего IP,
                в том числе через VPN или прокси. Если соединение устанавливается — ресурс
                помечается как <span class="dot up"></span>доступный,
                если соединение долгое — <span class="dot slow"></span>медленный,
                если оборвано/не отвечает — <span class="dot down"></span>недоступный.
            </p>
            <p class="muted">
                ⚠️ Из-за политики безопасности браузера (CORS) это проверка <em>сетевой достижимости</em>,
                а не полноценная загрузка страницы. Результат зависит от вашего провайдера, региона,
                VPN и кэша. Метка «Заблокирован в РФ» — это справочная информация об известных
                ограничениях, а не результат живой проверки. Данные актуальны на <?= htmlspecialchars($updated) ?>.
            </p>
        </section>
    </main>

    <footer class="site-footer">
        <div class="container">
            <span>Проверка идёт с вашего устройства · ничего не сохраняется на сервере</span>
            <span class="muted">Справочные ограничения обновлены: <?= htmlspecialchars($updated) ?></span>
        </div>
    </footer>

    <script>
        window.__SITES__ = <?= json_encode($sites, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;
    </script>
    <script src="assets/js/app.js?v=10"></script>
    <script src="assets/js/privacy.js?v=1"></script>
</body>
</html>
