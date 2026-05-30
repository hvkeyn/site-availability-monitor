/**
 * Монитор доступности — клиентская проверка.
 *
 * Проверка идёт ИЗ браузера пользователя, с его IP.
 * Браузер из-за CORS не отдаёт содержимое чужих сайтов, поэтому мы проверяем
 * именно сетевую достижимость хоста с вашего IP (в т.ч. через VPN/прокси).
 * Несколько путей и способов параллельно — берём лучший (минимальный) отклик:
 *   1) fetch(no-cors) к /, /robots.txt, /favicon.ico — резолвится при любом ответе;
 *   2) загрузка <img> для favicon — дополнительная проверка иконки.
 * Только favicon недостаточен: Instagram/Meta часто блокируют иконку,
 * но главная страница через прокси доступна.
 *
 * Классификация по времени отклика:
 *   < SLOW_MS        → доступно (up)
 *   SLOW..TIMEOUT_MS → медленно (slow)
 *   таймаут/ошибка   → недоступно (down)
 */

(function () {
    'use strict';

    var SITES = window.__SITES__ || [];
    var TIMEOUT_MS = 8000;   // сетевой таймаут
    var SLOW_MS = 2500;      // порог «медленно»
    var CONCURRENCY = 6;     // параллельных проверок

    var autoTimer = null;
    var clockTimer = null;
    var isRunning = false;
    var lastRunAt = null;
    var statusFilter = null;  // 'up' | 'slow' | 'down' | 'idle' | null
    var originFilter = 'all'; // 'all' | 'ru' | 'foreign'

    var els = {
        grid: document.getElementById('grid'),
        checkAll: document.getElementById('checkAll'),
        autoRefresh: document.getElementById('autoRefresh'),
        interval: document.getElementById('interval'),
        sort: document.getElementById('sort'),
        search: document.getElementById('search'),
        filters: document.getElementById('filters'),
        originSeg: document.getElementById('originSeg'),
        stats: document.getElementById('stats'),
        cntUp: document.getElementById('cntUp'),
        cntSlow: document.getElementById('cntSlow'),
        cntDown: document.getElementById('cntDown'),
        cntWait: document.getElementById('cntWait'),
        cntTotal: document.getElementById('cntTotal'),
        gridEmpty: document.getElementById('gridEmpty'),
        gauge: document.getElementById('gauge'),
        gaugePct: document.getElementById('gaugePct'),
        updatedPill: document.getElementById('updatedPill'),
        updatedText: document.getElementById('updatedText'),
        ipText: document.getElementById('ipText'),
    };

    var STATE_LABEL = {
        idle: 'Ожидание',
        checking: 'Проверка…',
        up: 'Доступно',
        slow: 'Медленно',
        down: 'Недоступно',
    };
    var STATE_RANK = { down: 0, slow: 1, up: 2, checking: 3, idle: 4 };

    // Пути проверки: главная и robots.txt надёжнее favicon для Meta, YouTube и др.
    var DEFAULT_PROBE_PATHS = ['/', '/robots.txt', '/favicon.ico'];

    // ---------- Утилиты проверки ----------

    function bust(domain, path) {
        var base = path.charAt(0) === '/' ? path : '/' + path;
        return 'https://' + domain + base + '?_=' + Date.now() + Math.random().toString(36).slice(2);
    }

    function probePaths(site) {
        if (site.check_paths && site.check_paths.length) return site.check_paths;
        return DEFAULT_PROBE_PATHS;
    }

    /** fetch(no-cors): промис резолвится, если соединение с хостом установилось */
    function probeFetch(domain, path) {
        return new Promise(function (resolve) {
            if (!('fetch' in window) || !('AbortController' in window)) { resolve(null); return; }
            var ctrl = new AbortController();
            var t0 = performance.now();
            var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
            fetch(bust(domain, path), {
                mode: 'no-cors',
                cache: 'no-store',
                redirect: 'follow',
                signal: ctrl.signal,
            }).then(function () {
                clearTimeout(timer);
                resolve(performance.now() - t0);
            }).catch(function () {
                clearTimeout(timer);
                resolve(null);
            });
        });
    }

    function probeImage(domain, path) {
        path = path || '/favicon.ico';
        return new Promise(function (resolve) {
            var img = new Image();
            var t0 = performance.now();
            var done = false;
            var timer = setTimeout(function () {
                if (done) return;
                done = true;
                img.removeAttribute('src');
                resolve(null);
            }, TIMEOUT_MS);
            img.onload = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(performance.now() - t0);
            };
            img.onerror = function () {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(null);
            };
            img.src = bust(domain, path);
        });
    }

    /**
     * Загрузка страницы в скрытый iframe — ближе к реальному открытию сайта.
     * Помогает для Дзена (SmartCaptcha), Claude и др., где fetch/иконка дают ложный «недоступно».
     */
    function probeIframe(domain) {
        return new Promise(function (resolve) {
            if (!document.body) { resolve(null); return; }
            var iframe = document.createElement('iframe');
            iframe.setAttribute('aria-hidden', 'true');
            iframe.title = 'probe';
            iframe.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;border:0;opacity:0;pointer-events:none';
            var t0 = performance.now();
            var settled = false;
            function finish(ms) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                iframe.onload = iframe.onerror = null;
                try { document.body.removeChild(iframe); } catch (e) { /* ignore */ }
                resolve(ms);
            }
            var timer = setTimeout(function () { finish(null); }, TIMEOUT_MS);
            iframe.onload = function () { finish(performance.now() - t0); };
            iframe.onerror = function () { finish(null); };
            iframe.src = bust(domain, '/');
            document.body.appendChild(iframe);
        });
    }

    function classifyReachability(results) {
        var ok = results.filter(function (r) { return r.t !== null && !isNaN(r.t); });
        if (!ok.length) return { state: 'down', latency: null, hint: null };

        var times = ok.map(function (r) { return r.t; });
        var best = Math.min.apply(null, times);
        var hasFetch = ok.some(function (r) { return r.type === 'fetch'; });
        var hasIframe = ok.some(function (r) { return r.type === 'iframe'; });
        var hint = null;

        // Страница открывается в iframe, но лёгкие запросы не прошли — капча/защита (Дзен, Claude…)
        if (hasIframe && !hasFetch) {
            hint = 'возможна проверка безопасности';
        } else if (hasIframe && best >= SLOW_MS) {
            hint = 'возможна проверка безопасности';
        }

        var state = best < SLOW_MS ? 'up' : 'slow';
        // Сайт открывается (iframe), но защита/капча — не «недоступно», а жёлтый статус
        if (hint) state = 'slow';

        return {
            state: state,
            latency: Math.round(best),
            hint: hint,
        };
    }

    function checkSite(site) {
        var paths = probePaths(site);
        var probes = [];

        paths.forEach(function (path) {
            probes.push(
                probeFetch(site.domain, path).then(function (t) { return { type: 'fetch', t: t }; })
            );
            if (path === '/favicon.ico' || /\.(ico|png|svg|webp)$/i.test(path)) {
                probes.push(
                    probeImage(site.domain, path).then(function (t) { return { type: 'image', t: t }; })
                );
            }
        });

        probes.push(
            probeIframe(site.domain).then(function (t) { return { type: 'iframe', t: t }; })
        );

        return Promise.all(probes).then(function (results) {
            return classifyReachability(results);
        });
    }

    // ---------- Отрисовка карточки ----------

    function setCardState(card, state, latency, hint) {
        var led = card.querySelector('.status-led');
        var liveState = card.querySelector('.live-state');
        var latEl = card.querySelector('.latency');
        var fill = card.querySelector('.bar-fill');
        var checkedAt = card.querySelector('.checked-at');

        led.dataset.state = state;
        led.title = STATE_LABEL[state] || state;
        liveState.dataset.state = state;
        liveState.textContent = STATE_LABEL[state] || state;
        fill.dataset.state = state;
        card.dataset.state = state;
        card.dataset.lat = (latency != null ? latency : (state === 'down' ? 999999 : 888888));

        if (state === 'checking' || state === 'idle') {
            latEl.hidden = true;
            checkedAt.hidden = true;
            if (state === 'idle') { fill.style.width = '0'; }
            return;
        }

        latEl.hidden = false;
        if (latency != null) {
            latEl.textContent = latency + ' мс' + (hint ? ' · ' + hint : '');
        } else {
            latEl.textContent = hint || 'нет ответа';
        }
        checkedAt.hidden = false;
        checkedAt.textContent = 'проверено ' + new Date().toLocaleTimeString('ru-RU');

        var width;
        if (state === 'up')        { width = Math.max(35, 100 - (latency / SLOW_MS) * 65); }
        else if (state === 'slow') { width = Math.max(20, 70 - ((latency - SLOW_MS) / TIMEOUT_MS) * 50); }
        else                       { width = 6; }
        fill.style.width = width + '%';
    }

    function getCard(id) {
        return els.grid.querySelector('.card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    }

    // ---------- Сводка + кольцо ----------

    function updateStats() {
        var counts = { up: 0, slow: 0, down: 0, wait: 0 };
        var total = 0;
        // Считаем только видимые карточки (категория, страна, поиск, статус)
        els.grid.querySelectorAll('.card:not(.hidden)').forEach(function (card) {
            total++;
            var s = card.querySelector('.status-led').dataset.state;
            if (s === 'up') counts.up++;
            else if (s === 'slow') counts.slow++;
            else if (s === 'down') counts.down++;
            else counts.wait++;
        });
        animateNum(els.cntUp, counts.up);
        animateNum(els.cntSlow, counts.slow);
        animateNum(els.cntDown, counts.down);
        animateNum(els.cntWait, counts.wait);
        if (els.cntTotal) els.cntTotal.textContent = total;

        var pct = total ? Math.round((counts.up / total) * 100) : 0;
        els.gauge.style.setProperty('--pct', pct);
        els.gaugePct.textContent = pct + '%';
        var ring = pct >= 70 ? 'var(--up)' : (pct >= 40 ? 'var(--slow)' : 'var(--down)');
        els.gauge.style.setProperty('--ring', ring);
        els.gaugePct.style.color = ring;

        if (isRunning) renderUpdated();
    }

    function animateNum(el, target) {
        if (el._animTimer) { clearInterval(el._animTimer); el._animTimer = null; }
        var cur = parseInt(el.textContent, 10) || 0;
        if (cur === target) return;
        var step = cur < target ? 1 : -1;
        el._animTimer = setInterval(function () {
            cur += step;
            el.textContent = cur;
            if (cur === target) { clearInterval(el._animTimer); el._animTimer = null; }
        }, 35);
    }

    // ---------- «Обновлено N назад» ----------

    function touchUpdated() {
        lastRunAt = Date.now();
        renderUpdated();
    }
    function renderUpdated() {
        if (!els.updatedText) return;
        var pill = els.updatedPill;

        if (isRunning) {
            if (pill) pill.classList.add('is-checking');
            els.updatedText.textContent = 'Проверка';
            return;
        }

        if (pill) pill.classList.remove('is-checking');

        if (!lastRunAt) {
            els.updatedText.textContent = 'ещё не проверялось';
            return;
        }

        var s = Math.round((Date.now() - lastRunAt) / 1000);
        var txt;
        if (s < 5) txt = 'обновлено только что';
        else if (s < 60) txt = 'обновлено ' + s + ' с назад';
        else txt = 'обновлено ' + Math.round(s / 60) + ' мин назад';
        els.updatedText.textContent = txt;
    }

    // ---------- Очередь проверок ----------

    function runChecks(sites) {
        if (isRunning) return Promise.resolve();
        isRunning = true;
        toggleRunning(true);
        renderUpdated();

        sites.forEach(function (s) {
            var card = getCard(s.id);
            if (card) setCardState(card, 'checking');
        });
        applyFilter();

        var queue = sites.slice();
        var workers = [];

        function worker() {
            if (queue.length === 0) return Promise.resolve();
            var site = queue.shift();
            return checkSite(site).then(function (res) {
                var card = getCard(site.id);
                if (card) setCardState(card, res.state, res.latency, res.hint);
                applyFilter();
                return worker();
            });
        }
        for (var i = 0; i < Math.min(CONCURRENCY, queue.length); i++) workers.push(worker());

        return Promise.all(workers).then(function () {
            isRunning = false;
            toggleRunning(false);
            applyFilter();
            touchUpdated();
            sortGrid();
        });
    }

    function toggleRunning(running) {
        var spinner = els.checkAll.querySelector('.btn-spinner');
        els.checkAll.disabled = running;
        if (spinner) spinner.hidden = !running;
        if (!running) renderUpdated();
    }

    function visibleSites() {
        var result = [];
        els.grid.querySelectorAll('.card:not(.hidden)').forEach(function (card) {
            var s = SITES.find(function (x) { return x.id === card.dataset.id; });
            if (s) result.push(s);
        });
        return result;
    }

    // ---------- Фильтры, поиск, сортировка ----------

    function applyFilter() {
        var activeChip = els.filters.querySelector('.chip.active');
        var cat = activeChip ? activeChip.dataset.cat : 'all';
        var q = (els.search.value || '').trim().toLowerCase();

        var visible = 0;
        els.grid.querySelectorAll('.card').forEach(function (card) {
            var okCat = cat === 'all' || card.dataset.cat === cat;
            var okQ = !q || card.dataset.name.indexOf(q) !== -1;
            var okOrigin = originFilter === 'all' || card.dataset.origin === originFilter;
            var cardState = card.querySelector('.status-led').dataset.state;
            var okStatus = !statusFilter ||
                (statusFilter === 'idle'
                    ? (cardState === 'idle' || cardState === 'checking')
                    : cardState === statusFilter);
            var show = okCat && okQ && okOrigin && okStatus;
            card.classList.toggle('hidden', !show);
            if (show) visible++;
        });

        if (els.gridEmpty) {
            els.gridEmpty.classList.toggle('hidden', visible > 0);
        }

        updateStats();
    }

    function sortGrid() {
        var mode = els.sort.value;
        if (mode === 'default') {
            // Вернуть исходный порядок по data-order
            var arr = Array.prototype.slice.call(els.grid.children);
            arr.sort(function (a, b) { return (+a.dataset.order) - (+b.dataset.order); });
            arr.forEach(function (c) { els.grid.appendChild(c); });
            return;
        }
        var cards = Array.prototype.slice.call(els.grid.children);
        cards.sort(function (a, b) {
            if (mode === 'name') {
                return a.dataset.name.localeCompare(b.dataset.name, 'ru');
            }
            if (mode === 'latency') {
                return (+a.dataset.lat || 999999) - (+b.dataset.lat || 999999);
            }
            if (mode === 'origin') {
                // Сначала российские, затем зарубежные; внутри — исходный порядок
                var oa = a.dataset.origin === 'ru' ? 0 : 1;
                var ob = b.dataset.origin === 'ru' ? 0 : 1;
                if (oa !== ob) return oa - ob;
                return (+a.dataset.order) - (+b.dataset.order);
            }
            // status: сначала недоступные
            var sa = STATE_RANK[a.dataset.state || 'idle'];
            var sb = STATE_RANK[b.dataset.state || 'idle'];
            if (sa !== sb) return sa - sb;
            return (+a.dataset.lat || 0) - (+b.dataset.lat || 0);
        });
        cards.forEach(function (c) { els.grid.appendChild(c); });
    }

    // ---------- Внешний IP ----------

    function loadIP() {
        if (!('fetch' in window)) { els.ipText.textContent = 'IP недоступен'; return; }
        fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (d) { els.ipText.textContent = 'Ваш IP: ' + d.ip; })
            .catch(function () { els.ipText.textContent = 'IP скрыт'; });
    }

    // ---------- Автообновление ----------

    function setupAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        if (!els.autoRefresh.checked) return;
        var sec = parseInt(els.interval.value, 10) || 30;
        autoTimer = setInterval(function () {
            if (!isRunning) runChecks(visibleSites());
        }, sec * 1000);
    }

    // ---------- События ----------

    els.checkAll.addEventListener('click', function () { runChecks(visibleSites()); });
    els.autoRefresh.addEventListener('change', setupAuto);
    els.interval.addEventListener('change', setupAuto);
    els.search.addEventListener('input', applyFilter);
    els.sort.addEventListener('change', sortGrid);

    els.filters.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        els.filters.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        applyFilter();
    });

    els.originSeg.addEventListener('click', function (e) {
        var seg = e.target.closest('.seg');
        if (!seg) return;
        originFilter = seg.dataset.origin;
        els.originSeg.querySelectorAll('.seg').forEach(function (s) { s.classList.remove('active'); });
        seg.classList.add('active');
        applyFilter();
    });

    // Клик по карточке статистики = фильтр по статусу (повторный клик — сброс)
    els.stats.addEventListener('click', function (e) {
        var stat = e.target.closest('button.stat');
        if (!stat) return;
        var f = stat.dataset.filter;
        if (statusFilter === f) {
            statusFilter = null;
            stat.classList.remove('active');
        } else {
            statusFilter = f;
            els.stats.querySelectorAll('.stat').forEach(function (s) { s.classList.remove('active'); });
            stat.classList.add('active');
        }
        applyFilter();
    });

    els.grid.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-recheck');
        if (!btn) return;
        var card = btn.closest('.card');
        var site = SITES.find(function (x) { return x.id === card.dataset.id; });
        if (!site) return;
        setCardState(card, 'checking');
        if (els.updatedPill) els.updatedPill.classList.add('is-checking');
        els.updatedText.textContent = 'Проверка';
        checkSite(site).then(function (res) {
            setCardState(card, res.state, res.latency, res.hint);
            applyFilter();
            touchUpdated();
            if (els.updatedPill) els.updatedPill.classList.remove('is-checking');
        });
    });

    // ---------- Старт ----------

    // Запоминаем исходный порядок для сортировки «По умолчанию».
    Array.prototype.slice.call(els.grid.children).forEach(function (c, i) { c.dataset.order = i; });

    loadIP();
    clockTimer = setInterval(renderUpdated, 1000);
    runChecks(SITES);
})();
