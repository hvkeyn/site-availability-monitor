/**
 * Модуль «Мои данные» — клиентская проверка приватности.
 *
 * Всё считается в браузере пользователя:
 *   - IP, геолокация, провайдер — из публичного IP-сервиса (ipwho.is → ipapi.co → ipify);
 *   - браузер и ОС — из user agent;
 *   - WebRTC-утечка — реальный IP через RTCPeerConnection (STUN);
 *   - признаки VPN/прокси — несовпадение часового пояса и языка системы с регионом IP,
 *     расхождение WebRTC-IP и внешнего IP, отсутствие HTTPS.
 *
 * Никакие данные не отправляются на наш сервер.
 */

(function () {
    'use strict';

    var el = {
        ip: document.getElementById('pvIp'),
        copy: document.getElementById('pvCopy'),
        geo: document.getElementById('pvGeo'),
        isp: document.getElementById('pvIsp'),
        browser: document.getElementById('pvBrowser'),
        os: document.getElementById('pvOs'),
        proxy: document.getElementById('pvProxy'),
        webrtc: document.getElementById('pvWebrtc'),
        tz: document.getElementById('pvTz'),
        lang: document.getElementById('pvLang'),
        verdict: document.getElementById('pvVerdict'),
        verdictText: document.getElementById('pvVerdictText'),
        refresh: document.getElementById('pvRefresh'),
        tips: document.getElementById('pvTips'),
        tipsList: document.getElementById('pvTipsList'),
        ipHeader: document.getElementById('ipText'),
    };

    if (!el.ip) return; // модуль не на странице

    var running = false;

    // ---------- Утилиты ----------

    function setVal(node, text, state, loading) {
        if (!node) return;
        node.textContent = text;
        if (state) node.dataset.state = state;
        node.classList.toggle('is-loading', !!loading);
    }

    function fetchJson(url, timeoutMs) {
        return new Promise(function (resolve, reject) {
            if (!('fetch' in window)) { reject(new Error('no fetch')); return; }
            var ctrl = ('AbortController' in window) ? new AbortController() : null;
            var timer = setTimeout(function () {
                if (ctrl) ctrl.abort();
                reject(new Error('timeout'));
            }, timeoutMs || 6000);
            fetch(url, {
                cache: 'no-store',
                signal: ctrl ? ctrl.signal : undefined,
            }).then(function (r) {
                clearTimeout(timer);
                if (!r.ok) { reject(new Error('http ' + r.status)); return; }
                return r.json();
            }).then(function (j) { resolve(j); })
              .catch(function (e) { clearTimeout(timer); reject(e); });
        });
    }

    function countryFlag(code) {
        if (!code || code.length !== 2) return '';
        var cc = code.toUpperCase();
        var base = 0x1F1E6;
        return String.fromCodePoint(base + cc.charCodeAt(0) - 65) +
               String.fromCodePoint(base + cc.charCodeAt(1) - 65);
    }

    // ---------- Геолокация ----------

    function fetchGeo() {
        return fetchJson('https://ipwho.is/', 6500).then(function (d) {
            if (!d || d.success === false || !d.ip) throw new Error('ipwho empty');
            return {
                ip: d.ip,
                city: d.city || null,
                country: d.country || null,
                countryCode: d.country_code || null,
                flag: (d.flag && d.flag.emoji) || countryFlag(d.country_code),
                isp: (d.connection && (d.connection.isp || d.connection.org)) || null,
                tz: (d.timezone && d.timezone.id) || null,
                source: 'ipwho.is',
            };
        }).catch(function () {
            return fetchJson('https://ipapi.co/json/', 6500).then(function (d) {
                if (!d || !d.ip || d.error) throw new Error('ipapi empty');
                return {
                    ip: d.ip,
                    city: d.city || null,
                    country: d.country_name || null,
                    countryCode: d.country_code || null,
                    flag: countryFlag(d.country_code),
                    isp: d.org || null,
                    tz: d.timezone || null,
                    source: 'ipapi.co',
                };
            });
        }).catch(function () {
            return fetchJson('https://api.ipify.org?format=json', 5000).then(function (d) {
                return { ip: (d && d.ip) || null, partial: true, source: 'ipify' };
            });
        });
    }

    // ---------- WebRTC ----------

    function detectWebRTC(timeoutMs) {
        return new Promise(function (resolve) {
            var result = { supported: false, localIps: [], publicIps: [], mdns: false };
            var RTC = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
            if (!RTC) { resolve(result); return; }
            result.supported = true;

            var pc;
            try {
                pc = new RTC({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            } catch (e) { resolve(result); return; }

            var done = false;
            function finish() {
                if (done) return;
                done = true;
                clearTimeout(timer);
                try { pc.onicecandidate = null; pc.close(); } catch (e) { /* ignore */ }
                resolve(result);
            }
            var timer = setTimeout(finish, timeoutMs || 3500);

            pc.onicecandidate = function (e) {
                if (!e || !e.candidate || !e.candidate.candidate) { finish(); return; }
                var cand = e.candidate.candidate;
                if (/\.local(\s|$)/i.test(cand)) result.mdns = true;
                var m = cand.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
                if (m) {
                    var ip = m[1];
                    var isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|127\.|0\.)/.test(ip);
                    if (isPrivate) {
                        if (result.localIps.indexOf(ip) < 0) result.localIps.push(ip);
                    } else if (result.publicIps.indexOf(ip) < 0) {
                        result.publicIps.push(ip);
                    }
                }
            };

            try {
                pc.createDataChannel('probe');
                pc.createOffer().then(function (o) { return pc.setLocalDescription(o); })
                                .catch(function () { finish(); });
            } catch (e) { finish(); }
        });
    }

    // ---------- User agent ----------

    function parseBrowser(ua) {
        ua = ua || '';
        var m;
        if ((m = ua.match(/YaBrowser\/([\d.]+)/))) return 'Яндекс.Браузер ' + m[1].split('.').slice(0, 2).join('.');
        if (/Edg\//.test(ua) && (m = ua.match(/Edg\/([\d.]+)/))) return 'Microsoft Edge ' + m[1].split('.')[0];
        if (/OPR\//.test(ua) && (m = ua.match(/OPR\/([\d.]+)/))) return 'Opera ' + m[1].split('.')[0];
        if (/Firefox\//.test(ua) && (m = ua.match(/Firefox\/([\d.]+)/))) return 'Firefox ' + m[1].split('.')[0];
        if (/Chrome\//.test(ua) && (m = ua.match(/Chrome\/([\d.]+)/))) return 'Chrome ' + m[1].split('.')[0];
        if (/Version\/([\d.]+).*Safari/.test(ua) && (m = ua.match(/Version\/([\d.]+)/))) return 'Safari ' + m[1].split('.').slice(0, 2).join('.');
        return 'неизвестно';
    }

    function parseOS(ua) {
        ua = ua || '';
        var m;
        if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
        if ((m = ua.match(/Windows NT ([\d.]+)/))) return 'Windows ' + m[1];
        if (/Android/.test(ua)) { m = ua.match(/Android ([\d.]+)/); return 'Android' + (m ? ' ' + m[1] : ''); }
        if (/iPhone|iPad|iPod/.test(ua)) { m = ua.match(/OS ([\d_]+)/); return 'iOS' + (m ? ' ' + m[1].replace(/_/g, '.') : ''); }
        if (/Mac OS X ([\d_]+)/.test(ua)) { m = ua.match(/Mac OS X ([\d_]+)/); return 'macOS ' + m[1].replace(/_/g, '.'); }
        if (/Linux/.test(ua)) return 'Linux';
        return 'неизвестно';
    }

    // ---------- Анализ ----------

    function analyse(geo, rtc) {
        var issues = [];
        var localTz = '';
        try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
        var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
        var primaryLang = (langs[0] || '').toLowerCase();

        // --- IP ---
        if (geo.ip) {
            setVal(el.ip, geo.ip, null, false);
            if (el.copy) el.copy.hidden = false;
            if (el.ipHeader) el.ipHeader.textContent = 'Ваш IP: ' + geo.ip;
        } else {
            setVal(el.ip, 'не удалось определить', null, false);
        }

        // --- Геолокация ---
        if (geo.country) {
            var place = (geo.flag ? geo.flag + ' ' : '') +
                        [geo.city, geo.country].filter(Boolean).join(', ');
            setVal(el.geo, place, null, false);
        } else {
            setVal(el.geo, geo.partial ? 'сервис геолокации недоступен' : 'неизвестно', null, false);
        }

        // --- Провайдер ---
        setVal(el.isp, geo.isp || 'неизвестно', null, false);

        // --- Браузер / ОС ---
        setVal(el.browser, parseBrowser(navigator.userAgent), null, false);
        setVal(el.os, parseOS(navigator.userAgent), null, false);

        // --- Часовой пояс ---
        var tzMismatch = false;
        if (localTz && geo.tz) {
            tzMismatch = localTz !== geo.tz;
            if (tzMismatch) {
                setVal(el.tz, localTz + ' ≠ ' + geo.tz, 'warn', false);
                issues.push({
                    sev: 'warn',
                    text: '<b>Часовой пояс не совпадает с регионом IP</b> (' + localTz + ' против ' + geo.tz +
                          '). Это классический признак VPN. Включите в VPN/системе пояс под страну выхода или используйте антидетект-профиль.',
                });
            } else {
                setVal(el.tz, localTz + ' (совпадает)', 'good', false);
            }
        } else {
            setVal(el.tz, localTz || 'неизвестно', 'idle', false);
        }

        // --- Язык ---
        var langMismatch = false;
        if (primaryLang && geo.countryCode) {
            var cc = geo.countryCode.toUpperCase();
            var isRuLang = primaryLang.indexOf('ru') === 0;
            // ru-язык вне рус-говорящих стран ИЛИ не-ru язык при RU-IP — потенциальное расхождение
            var ruCountries = ['RU', 'BY', 'KZ', 'KG', 'UA'];
            if (isRuLang && ruCountries.indexOf(cc) < 0) langMismatch = true;
            if (!isRuLang && cc === 'RU') langMismatch = true;

            if (langMismatch) {
                setVal(el.lang, langs[0] + ' ↔ ' + cc, 'warn', false);
                issues.push({
                    sev: 'warn',
                    text: '<b>Язык системы не вяжется со страной IP</b> (' + langs[0] + ' при IP из ' + cc +
                          '). Сайты используют это для детекта VPN. По возможности подберите язык/регион под точку выхода.',
                });
            } else {
                setVal(el.lang, langs[0] + ' (ок)', 'good', false);
            }
        } else {
            setVal(el.lang, langs[0] || 'неизвестно', 'idle', false);
        }

        // --- WebRTC ---
        var rtcLeak = false;
        if (!rtc.supported) {
            setVal(el.webrtc, 'WebRTC отключён', 'good', false);
        } else if (rtc.publicIps.length) {
            var leakedExternal = rtc.publicIps.filter(function (ip) { return ip !== geo.ip; });
            if (leakedExternal.length && geo.ip) {
                rtcLeak = true;
                setVal(el.webrtc, 'утечка: ' + leakedExternal[0], 'bad', false);
                issues.push({
                    sev: 'bad',
                    text: '<b>WebRTC раскрывает другой публичный IP</b> (' + leakedExternal[0] +
                          '), отличный от вашего внешнего адреса. За VPN/прокси это раскрывает реальный IP. ' +
                          'Отключите WebRTC или поставьте расширение WebRTC Leak Prevent / включите режим, скрывающий локальные IP.',
                });
            } else {
                setVal(el.webrtc, 'IP совпадает с внешним', 'good', false);
            }
        } else if (rtc.localIps.length) {
            setVal(el.webrtc, 'виден локальный ' + rtc.localIps[0], 'warn', false);
            issues.push({
                sev: 'warn',
                text: '<b>WebRTC отдаёт локальный IP</b> (' + rtc.localIps[0] +
                      '). Утечки внешнего адреса нет, но это часть отпечатка. Можно скрыть через флаг браузера или расширение.',
            });
        } else if (rtc.mdns) {
            setVal(el.webrtc, 'скрыто браузером (mDNS)', 'good', false);
        } else {
            setVal(el.webrtc, 'не обнаружено', 'good', false);
        }

        // --- HTTPS ---
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            issues.push({
                sev: 'warn',
                text: '<b>Страница открыта без HTTPS</b> — часть проверок и геолокация могут работать нестабильно, а трафик не шифруется. Откройте сайт по https://.',
            });
        }

        // --- Прокси / VPN: сводный вывод ---
        var proxySignals = [];
        if (tzMismatch) proxySignals.push('часовой пояс');
        if (langMismatch) proxySignals.push('язык');
        if (rtcLeak) proxySignals.push('WebRTC');

        if (rtcLeak) {
            setVal(el.proxy, 'VPN/прокси с утечкой', 'bad', false);
        } else if (tzMismatch || langMismatch) {
            setVal(el.proxy, 'есть признаки (' + proxySignals.join(', ') + ')', 'warn', false);
        } else if (geo.partial) {
            setVal(el.proxy, 'не удалось проверить', 'idle', false);
        } else {
            setVal(el.proxy, 'явных признаков нет', 'good', false);
        }

        renderVerdict(issues, geo);
        renderTips(issues);
    }

    function renderVerdict(issues, geo) {
        var hasBad = issues.some(function (i) { return i.sev === 'bad'; });
        var hasWarn = issues.some(function (i) { return i.sev === 'warn'; });
        if (geo.partial && !issues.length) {
            el.verdict.dataset.state = 'idle';
            el.verdictText.textContent = 'Часть данных недоступна';
        } else if (hasBad) {
            el.verdict.dataset.state = 'bad';
            el.verdictText.textContent = 'Есть утечка данных';
        } else if (hasWarn) {
            el.verdict.dataset.state = 'warn';
            el.verdictText.textContent = 'Есть на что обратить внимание';
        } else {
            el.verdict.dataset.state = 'good';
            el.verdictText.textContent = 'Заметных утечек не найдено';
        }
    }

    function renderTips(issues) {
        el.tipsList.innerHTML = '';
        if (!issues.length) {
            el.tips.hidden = true;
            return;
        }
        // bad сначала
        issues.sort(function (a, b) {
            var rank = { bad: 0, warn: 1 };
            return (rank[a.sev] || 2) - (rank[b.sev] || 2);
        });
        issues.forEach(function (i) {
            var li = document.createElement('li');
            li.innerHTML = i.text;
            el.tipsList.appendChild(li);
        });
        el.tips.hidden = false;
    }

    // ---------- Запуск ----------

    function run() {
        if (running) return;
        running = true;

        [el.geo, el.isp].forEach(function (n) { setVal(n, 'определяем…', null, true); });
        setVal(el.proxy, 'проверяем…', 'idle', true);
        setVal(el.webrtc, 'проверяем…', 'idle', true);
        el.verdict.dataset.state = 'idle';
        el.verdictText.textContent = 'Анализируем…';

        Promise.all([
            fetchGeo().catch(function () { return { ip: null, partial: true }; }),
            detectWebRTC(3500),
        ]).then(function (res) {
            analyse(res[0], res[1]);
        }).catch(function () {
            setVal(el.proxy, 'ошибка проверки', 'idle', false);
            setVal(el.webrtc, 'ошибка проверки', 'idle', false);
        }).then(function () {
            running = false;
        });
    }

    if (el.refresh) {
        el.refresh.addEventListener('click', run);
    }
    if (el.copy) {
        el.copy.addEventListener('click', function () {
            var ip = (el.ip.textContent || '').trim();
            if (!ip || !navigator.clipboard) return;
            navigator.clipboard.writeText(ip).then(function () {
                el.copy.classList.add('copied');
                el.copy.textContent = '✓';
                setTimeout(function () {
                    el.copy.classList.remove('copied');
                    el.copy.textContent = '⧉';
                }, 1500);
            }).catch(function () { /* ignore */ });
        });
    }

    run();
})();
