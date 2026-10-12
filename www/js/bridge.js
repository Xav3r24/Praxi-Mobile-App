/* =========================================================
   PRAXI MOBILE BRIDGE (window.praxiAPI)
   ---------------------------------------------------------
   Reimplements the desktop preload API surface for mobile.
   REAL channels: settings, daily goals, moment ledger,
   rhapsody reading state — all delegated to the single
   writer, window.PraxiStore.
   Everything else is an EXPLICIT STUB that never touches
   persisted data (logged, resolves immediately).
   ========================================================= */
(function () {
  'use strict';

  const listeners = {
    settingsUpdated: [],
    behavior: [],
    openAddGoalDialog: [],
    navigateHomePage: [],
    summon: []
  };

  function fire(name, payload) {
    (listeners[name] || []).forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error('[bridge] listener error (' + name + ')', e);
      }
    });
  }

  // Official destinations the desktop opened in its in-app reader.
  const RHAPSODY_URL = 'https://read.rhapsodyofrealities.org/';
  const PRAYATHON_URL = 'https://www.pastorchrislive.org/v2/index.php?r=Site/Index';

  // ---------------------------------------------------------
  // In-app reader overlay
  // ---------------------------------------------------------
  // Mirrors the desktop reader view: the content opens INSIDE
  // Praxi rather than jumping out to the phone browser.
  //
  // Rhapsody is rendered NATIVELY from its public JSON endpoint.
  // The website's own default request (/api/daily-devotional/<date>)
  // requires a signed-in JWT and, when that is missing, its spinner
  // never clears — which is exactly the "inner loading" stall. The
  // translations endpoint used here needs no sign-in and returns the
  // full devotional, so it always resolves.
  //
  // Pray-A-Thon still loads its live site inside a frame.
  const RHAPSODY_API = 'https://read.rhapsodyofrealities.org/api/ror-translations/';
  const RHAPSODY_LANGS = 'https://read.rhapsodyofrealities.org/api/list-ror-translations';
  const RHAPSODY_SITE = 'https://read.rhapsodyofrealities.org/';

  let readerRoot = null;
  let readerFrame = null;
  let readerTitleEl = null;
  let readerStatusEl = null;
  let readerKind = null;
  let readerDevoEl = null;
  let readerExternalEl = null;
  let currentReaderUrl = null;
  let devoLang = 'english';
  let devoLangsCache = null;

  function isoDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // The devotional HTML comes from the official API, but strip
  // anything scriptable before injecting it.
  function sanitizeHtml(html) {
    return String(html == null ? '' : html)
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*iframe[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  // Reuse the dashboard's own reader-back handlers so the existing
  // completion flow (and Rhapsody streak) still runs when we close.
  function readerBack() {
    var target = readerKind === 'prayathon'
      ? document.getElementById('prayathon-reader-back')
      : document.getElementById('rhapsody-reader-back');
    if (target) {
      target.click();
    } else {
      closeReader();
    }
  }

  // Let the native host (system Back button) close the reader.
  try { window.PraxiReaderBack = readerBack; } catch (e) { /* ignore */ }

  function setNativeReaderOpen(open) {
    try {
      if (window.PraxiNative && typeof window.PraxiNative.setReaderOpen === 'function') {
        window.PraxiNative.setReaderOpen(!!open);
      }
    } catch (e) { /* native bridge optional */ }
  }

  function ensureReader() {
    if (readerRoot) return;
    readerRoot = document.createElement('div');
    readerRoot.id = 'praxi-reader';
    readerRoot.className = 'praxi-reader';
    readerRoot.innerHTML =
      '<div class="praxi-reader-bar">' +
        '<button type="button" class="praxi-reader-back" id="praxi-reader-back" aria-label="Back to Praxi">' +
          '<span aria-hidden="true">←</span><span>Back</span>' +
        '</button>' +
        '<span class="praxi-reader-title" id="praxi-reader-title">Reading</span>' +
        '<button type="button" class="praxi-reader-external" id="praxi-reader-external">Open in browser</button>' +
      '</div>' +
      '<div class="praxi-reader-stage">' +
        '<div class="praxi-reader-status" id="praxi-reader-status">Loading…</div>' +
        '<iframe class="praxi-reader-frame" id="praxi-reader-frame" ' +
          'title="Praxi reader"></iframe>' +
        '<div class="praxi-devo" id="praxi-devo" hidden></div>' +
      '</div>';
    document.body.appendChild(readerRoot);

    readerFrame = readerRoot.querySelector('#praxi-reader-frame');
    readerTitleEl = readerRoot.querySelector('#praxi-reader-title');
    readerStatusEl = readerRoot.querySelector('#praxi-reader-status');
    readerDevoEl = readerRoot.querySelector('#praxi-devo');
    readerExternalEl = readerRoot.querySelector('#praxi-reader-external');

    readerRoot.querySelector('#praxi-reader-back').addEventListener('click', readerBack);

    if (readerExternalEl) {
      readerExternalEl.addEventListener('click', function () {
        openExternalUrl(currentReaderUrl || RHAPSODY_SITE);
      });
    }

    // Scripture links inside the devotional open in the phone's
    // browser instead of replacing the app.
    if (readerDevoEl) {
      readerDevoEl.addEventListener('click', function (ev) {
        if (!ev.target || typeof ev.target.closest !== 'function') return;
        const link = ev.target.closest('a[href]');
        if (link) {
          ev.preventDefault();
          openExternalUrl(link.getAttribute('href'));
        }
      });
    }

    readerFrame.addEventListener('load', function () {
      if (readerStatusEl && !readerRoot.classList.contains('is-devo')) {
        readerStatusEl.classList.add('hidden');
      }
    });
  }

  function setReaderMode(mode) {
    if (!readerRoot) return;
    readerRoot.classList.toggle('is-devo', mode === 'devo');
    if (mode === 'devo') {
      try { readerFrame.src = 'about:blank'; } catch (e) { /* ignore */ }
      if (readerFrame) readerFrame.style.display = 'none';
      if (readerDevoEl) readerDevoEl.hidden = false;
    } else {
      if (readerDevoEl) {
        readerDevoEl.hidden = true;
        readerDevoEl.innerHTML = '';
      }
      if (readerFrame) readerFrame.style.display = '';
    }
  }

  function showReaderStatus(text) {
    if (!readerStatusEl) return;
    readerStatusEl.textContent = text;
    readerStatusEl.classList.remove('hidden');
  }

  // ---- Rhapsody: native devotional render ----

  async function loadDevotional(lang) {
    devoLang = lang || devoLang || 'english';
    if (!readerDevoEl) return;

    readerDevoEl.innerHTML =
      '<div class="praxi-devo-loading">Loading today’s Rhapsody…</div>';
    showReaderStatus('Loading today’s Rhapsody…');

    const dates = [isoDate(0), isoDate(-1), isoDate(-2)];

    let payload = null;
    let usedDate = null;

    for (let i = 0; i < dates.length; i += 1) {
      try {
        const res = await fetch(
          RHAPSODY_API + dates[i] + '/' + encodeURIComponent(devoLang),
          { cache: 'no-store' }
        );
        const json = await res.json();
        const list = json && json.devotionals;
        if (Array.isArray(list) && list.length && list[0] && list[0].title) {
          payload = list[0];
          usedDate = dates[i];
          break;
        }
      } catch (e) {
        console.log('[bridge] devotional fetch failed', dates[i], e);
      }
    }

    if (readerStatusEl) readerStatusEl.classList.add('hidden');

    if (!payload) {
      readerDevoEl.innerHTML =
        '<div class="praxi-devo-error">' +
          '<p>We couldn’t load today’s devotional right now. ' +
          'Check your connection and try again.</p>' +
          '<button type="button" class="praxi-devo-open" id="praxi-devo-open">' +
            'Open rhapsodyofrealities.org' +
          '</button>' +
        '</div>';
      const openBtn = readerDevoEl.querySelector('#praxi-devo-open');
      if (openBtn) {
        openBtn.addEventListener('click', function () {
          openExternalUrl(RHAPSODY_SITE);
        });
      }
      return;
    }

    // "Read at" badge — the recorded time for today, if any.
    let readAtHtml = '';
    try {
      if (window.PraxiStore) {
        await window.PraxiStore.ready();
        const status = window.PraxiStore.getRhapsodyStatus();
        if (status && status.read && status.date === isoDate(0)) {
          const when = status.readAt
            ? new Date(status.readAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
              })
            : status.time;
          if (when) {
            readAtHtml =
              '<span class="praxi-devo-readat">✓ Read today at ' +
                escapeAttr(when) +
              '</span>';
          }
        }
      }
    } catch (e) { /* optional */ }

    const section = (heading, html) =>
      html
        ? '<section class="praxi-devo-section">' +
            (heading ? '<h2>' + heading + '</h2>' : '') +
            '<div class="praxi-devo-rich">' + sanitizeHtml(html) + '</div>' +
          '</section>'
        : '';

    readerDevoEl.innerHTML =
      '<div class="praxi-devo-toolbar">' +
        '<select class="praxi-devo-lang" id="praxi-devo-lang" aria-label="Devotional language"></select>' +
        readAtHtml +
      '</div>' +
      '<div class="praxi-devo-scroll">' +
        '<article class="praxi-devo-article">' +
          '<div class="praxi-devo-date">Rhapsody of Realities · ' +
            escapeAttr(payload.upload_date || usedDate || '') +
          '</div>' +
          '<h1>' + escapeAttr(payload.title) + '</h1>' +
          (payload.opening_scripture
            ? '<p class="praxi-devo-scripture">' +
                escapeAttr(payload.opening_scripture) +
              '</p>'
            : '') +
          section(null, payload.content_body) +
          section('Confession', payload.confession_or_prayer) +
          section(
            escapeAttr(payload.further_study_title || 'Further Study'),
            payload.further_study
          ) +
          section(
            escapeAttr(payload.one_yearbb_title || '1 Year Bible Reading'),
            payload.one_yearbb
          ) +
          section(
            escapeAttr(payload.two_yearbb_title || '2 Year Bible Reading'),
            payload.two_yearbb
          ) +
          '<button type="button" class="praxi-devo-open" id="praxi-devo-open">' +
            'Open rhapsodyofrealities.org' +
          '</button>' +
        '</article>' +
      '</div>';

    const openBtn = readerDevoEl.querySelector('#praxi-devo-open');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        openExternalUrl(RHAPSODY_SITE);
      });
    }

    populateLanguageSelect();
  }

  async function populateLanguageSelect() {
    if (!readerDevoEl) return;
    const select = readerDevoEl.querySelector('#praxi-devo-lang');
    if (!select) return;

    if (!devoLangsCache) {
      devoLangsCache = ['english'];
      try {
        const res = await fetch(RHAPSODY_LANGS, { cache: 'no-store' });
        const json = await res.json();
        if (json && Array.isArray(json.languages) && json.languages.length) {
          devoLangsCache = json.languages;
        }
      } catch (e) { /* keep english */ }
    }

    select.innerHTML = devoLangsCache
      .map(function (l) {
        const label = String(l).charAt(0).toUpperCase() + String(l).slice(1);
        return '<option value="' + escapeAttr(l) + '">' + escapeAttr(label) + '</option>';
      })
      .join('');

    select.value = devoLang;

    select.addEventListener('change', function () {
      loadDevotional(select.value);
    });
  }

  function openDevotional() {
    ensureReader();
    readerKind = 'rhapsody';
    currentReaderUrl = RHAPSODY_SITE;
    if (readerTitleEl) readerTitleEl.textContent = 'Rhapsody of Realities';
    setReaderMode('devo');
    readerRoot.classList.add('open');
    document.body.classList.add('reader-open');
    setNativeReaderOpen(true);
    loadDevotional(devoLang);
  }

  function openReader(url, title, kind) {
    if (!url) return;
    ensureReader();
    readerKind = kind || null;
    currentReaderUrl = url;
    if (readerTitleEl) readerTitleEl.textContent = title || 'Reading';
    setReaderMode('frame');
    if (readerStatusEl) {
      readerStatusEl.textContent = 'Loading…';
      readerStatusEl.classList.remove('hidden');
    }
    readerFrame.src = url;
    readerRoot.classList.add('open');
    document.body.classList.add('reader-open');
    setNativeReaderOpen(true);
  }

  function closeReader() {
    if (!readerRoot) return;
    readerRoot.classList.remove('open');
    document.body.classList.remove('reader-open');
    // Release the page and stop any media.
    try { readerFrame.src = 'about:blank'; } catch (e) { /* ignore */ }
    if (readerDevoEl) {
      readerDevoEl.hidden = true;
      readerDevoEl.innerHTML = '';
    }
    readerKind = null;
    setNativeReaderOpen(false);
  }

  // Opens a URL in the phone's system browser. Used only when a
  // caller explicitly asks for an external link.
  function openExternalUrl(url) {
    if (!url) return;
    try {
      if (window.PraxiNative && typeof window.PraxiNative.openExternal === 'function') {
        window.PraxiNative.openExternal(url);
        return;
      }
    } catch (e) { /* fall through to window.open */ }
    try {
      window.open(url, '_blank');
    } catch (e) {
      console.info('[bridge] openExternal blocked', url);
    }
  }

  const store = window.PraxiStore;

  const api = {
    // ---- real: backed by the single-writer store ----
    getSettings: () => store.ready().then(() => store.getSettings()),
    saveSettings: (s) => store.ready().then(() => {
      const saved = store.saveSettings(s);
      fire('settingsUpdated', saved);
      return saved;
    }),
    getDailyGoals: () => store.ready().then(() => store.ensureCurrentDay()),
    saveDailyGoals: (data) => store.ready().then(() => store.saveGoals(data)),
    clearDailyGoalsNewDay: () => store.ready().then(() => {
      const g = store.getGoals();
      g.newDay = false;
      return store.saveGoals(g);
    }),
    recordMoment: (payload) => store.ready().then(() =>
      store.recordMoment((payload && payload.type) || 'custom', (payload && payload.data) || {})
    ),
    getMoments: () => store.ready().then(() => store.getMoments().slice()),
    emitBehavior: (type, data) => store.ready().then(() => {
      store.recordMoment(type, data);
      fire('behavior', { type: type, data: data });
      return true;
    }),

    // ---- real: rhapsody reading state ----
    getRhapsodyStatus: () => store.ready().then(() => store.getRhapsodyStatus()),
    markRhapsodyRead: (topic) => store.ready().then(() => store.markRhapsodyRead(topic)),

    // ---- real: open the official Rhapsody / Pray-A-Thon sites in-app ----
    openRhapsody: () => { openDevotional(); return Promise.resolve(); },
    closeRhapsodyReader: () => { closeReader(); return Promise.resolve(); },
    openPrayathon: () => { openReader(PRAYATHON_URL, 'Pastor Chris Live • Pray-A-Thon', 'prayathon'); return Promise.resolve(); },
    closePrayathon: () => { closeReader(); return Promise.resolve(); },
    pauseFor: (minutes) => store.ready().then(() => {
      const until = Date.now() + Number(minutes || 0) * 60000;
      store.saveSettings({ pauseUntil: until });
      return true;
    }),
    bringBack: () => store.ready().then(() => store.saveSettings({ pauseUntil: 0 })),
    setWindowMode: () => Promise.resolve(),
    summonNow: () => { fire('summon', {}); },
    openSettings: () => { fire('navigateHomePage', 'settings'); },
    openDailyGoals: () => { fire('navigateHomePage', 'daily-goals'); },
    openHome: (page) => { fire('navigateHomePage', page || 'home'); },
    openDevTools: () => {},
    openDailyGoalsAdd: () => { fire('openAddGoalDialog', true); },
    openExternal: (url) => { openExternalUrl(url); return Promise.resolve(); },
    chatWithPraxi: () => { console.info('[bridge] chatWithPraxi stub'); },
    quit: () => { console.info('[bridge] quit stub'); },

    // ---- event registrations (real) ----
    onOpenAddGoalDialog: (cb) => { if (typeof cb === 'function') listeners.openAddGoalDialog.push(cb); },
    onNavigateHomePage: (cb) => { if (typeof cb === 'function') listeners.navigateHomePage.push(cb); },
    onBehavior: (cb) => { if (typeof cb === 'function') listeners.behavior.push(cb); },
    onSummon: (cb) => { if (typeof cb === 'function') listeners.summon.push(cb); },
    onSettingsUpdated: (cb) => { if (typeof cb === 'function') listeners.settingsUpdated.push(cb); }
  };

  window.praxiAPI = api;
})();
