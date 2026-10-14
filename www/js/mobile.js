/* =========================================================
   PRAXI MOBILE — CHROME BEHAVIOR
   ---------------------------------------------------------
   - Sidebar drawer toggling
   - Notifications page (time-of-day message schedule)
   - Moments page (moment ledger)
   - Widget section: preview + allow toggle (+ native sync)
   ========================================================= */
(function () {
  'use strict';

  function boot() {
    var sidebar = document.querySelector('.sidebar');
    var btn = document.getElementById('mobileMenuButton');
    var overlay = document.getElementById('mobileOverlay');

    function openDrawer() {
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('show');
    }
    function closeDrawer() {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    }

    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (sidebar && sidebar.classList.contains('open')) closeDrawer();
        else openDrawer();
      });
    }
    if (overlay) overlay.addEventListener('click', closeDrawer);

    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (item) {
      item.addEventListener('click', function () {
        closeDrawer();
        refreshDynamic();
      });
    });

    initWidgetSection();
    consumeLaunchRoute();
    pushRemindersToNative();
    refreshDynamic();
    updateGreeting();

    setInterval(refreshDynamic, 20000);
    // Keep the greeting in step with the clock, and re-check it
    // whenever the app comes back to the foreground.
    setInterval(updateGreeting, 30000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) updateGreeting();
    });
    window.addEventListener('focus', updateGreeting);
  }

  /* ---------------- helpers ---------------- */

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var PERIODS = [
    { key: 'lateNight', label: 'Late night', from: 0, to: 5, range: '12:00am – 5:00am', icon: '🌙' },
    { key: 'morning', label: 'Morning', from: 5, to: 12, range: '5:00am – 12:00pm', icon: '☀️' },
    { key: 'afternoon', label: 'Afternoon', from: 12, to: 17, range: '12:00pm – 5:00pm', icon: '🌤️' },
    { key: 'evening', label: 'Evening', from: 17, to: 21, range: '5:00pm – 9:00pm', icon: '🌆' },
    { key: 'night', label: 'Night', from: 21, to: 24, range: '9:00pm – 12:00am', icon: '🌙' }
  ];

  function currentPeriod() {
    var h = new Date().getHours();
    for (var i = 0; i < PERIODS.length; i++) {
      if (h >= PERIODS[i].from && h < PERIODS[i].to) return PERIODS[i];
    }
    return PERIODS[PERIODS.length - 1];
  }

  /* ---------------- Home greeting (live, time-of-day aware) ------- */

  // Greeting wording is derived from the same period model the rest
  // of Praxi uses, so it always matches the current time.
  function greetingFor(periodKey) {
    switch (periodKey) {
      case 'afternoon':
        return 'Good afternoon';
      case 'evening':
      case 'night':
        return 'Good evening';
      // Late night (12am–5am) is still morning, so 3am reads
      // "Good morning" rather than a flat hello.
      case 'lateNight':
      case 'morning':
      default:
        return 'Good morning';
    }
  }

  function updateGreeting() {
    var el = document.getElementById('home-greeting');
    if (!el) return;
    var userName = window.PraxiStore && window.PraxiStore.getSettings
      ? (window.PraxiStore.getSettings().userName || 'Xavier')
      : 'Xavier';
    var text = greetingFor(currentPeriod().key) + ', ' + userName + '.';
    if (el.textContent !== text) el.textContent = text;
  }

  function poolFor(messages, key) {
    if (messages && messages.timeMessages && Array.isArray(messages.timeMessages[key])) {
      return messages.timeMessages[key];
    }
    return [];
  }

  function pickMessage(messages, key) {
    var pool = poolFor(messages, key);
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    if (messages && Array.isArray(messages.greetings) && messages.greetings.length) {
      return messages.greetings[Math.floor(Math.random() * messages.greetings.length)];
    }
    return 'Small steps still count.';
  }

  function refreshDynamic() {
    if (!window.PraxiStore || !window.PraxiStore.ready) return;
    window.PraxiStore.ready().then(function () {
      renderNotifications();
      renderMoments();
    });
  }

  /* ---------------- Widget preview (icon + style + action) ------- */

  // Pet art per time-of-day period. The early hours use the sleepy
  // Praxi, mornings use the bright/awake one, and so on.
  var PERIOD_ART = {
    lateNight: ['assets/praxi-deep sleep.png', 'assets/nightCalm.png'],
    morning: ['assets/morningAwake.png', 'assets/morningAwake2.png'],
    afternoon: ['assets/afternoonFocused.png', 'assets/afternoonChill.png', 'assets/afternoonCurious.png'],
    evening: ['assets/eveningReflective.png', 'assets/eveningConcerned.png', 'assets/eveningTired.png'],
    night: ['assets/nightCalm.png', 'assets/nightCurious.png', 'assets/praxi-sleepy.png']
  };

  var PERIOD_EMOJI = {
    lateNight: '🌙',
    morning: '☀️',
    afternoon: '🌤️',
    evening: '🌆',
    night: '🌙'
  };

  // A small set of widescreen widget backgrounds, so different
  // messages get different looks instead of one flat card.
  var WIDGET_STYLES = [
    'radial-gradient(circle at 84% 14%, rgba(82,115,232,0.36), transparent 58%), linear-gradient(135deg, #151922, #10141b)',
    'radial-gradient(circle at 86% 16%, rgba(232,150,82,0.32), transparent 58%), linear-gradient(135deg, #1a1712, #14100c)',
    'radial-gradient(circle at 84% 14%, rgba(94,214,170,0.30), transparent 58%), linear-gradient(135deg, #121a18, #0e1513)',
    'radial-gradient(circle at 86% 16%, rgba(196,120,232,0.30), transparent 58%), linear-gradient(135deg, #181324, #110d1b)',
    'radial-gradient(circle at 84% 14%, rgba(232,110,150,0.30), transparent 58%), linear-gradient(135deg, #1c1218, #150d12)',
    'radial-gradient(circle at 84% 14%, rgba(120,170,240,0.34), transparent 58%), linear-gradient(135deg, #121824, #0d1119)'
  ];

  function hashString(s) {
    var h = 0;
    s = String(s == null ? '' : s);
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function pickFrom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function widgetCardFor(messages, now) {
    // Rotate through the kinds of messages so the preview can show the
    // different widget states — and the buttons that come with some.
    var kinds = ['time'];
    if (messages && Array.isArray(messages.rhapsody) && messages.rhapsody.length) {
      kinds.push('rhapsody');
    }
    var goals = messages && messages.dailyGoals ? messages.dailyGoals : null;
    var goalsPool = null;
    if (goals) {
      if (Array.isArray(goals.noGoals)) goalsPool = goals.noGoals;
      else if (Array.isArray(goals.firstReminder)) goalsPool = goals.firstReminder;
    }
    if (goalsPool && goalsPool.length) kinds.push('goals');

    var kind = pickFrom(kinds);

    if (kind === 'rhapsody') {
      return {
        text: pickFrom(messages.rhapsody),
        label: 'Rhapsody',
        emoji: '📖',
        image: 'assets/ROR LOGO.png',
        action: { label: 'Read Rhapsody', page: 'rhapsody' }
      };
    }

    if (kind === 'goals') {
      return {
        text: pickFrom(goalsPool),
        label: 'Daily Goals',
        emoji: '🎯',
        image: 'assets/Target.gif',
        action: { label: 'Open Daily Goals', page: 'daily-goals' }
      };
    }

    return {
      text: pickMessage(messages, now.key),
      label: now.label,
      emoji: PERIOD_EMOJI[now.key] || '🌙',
      image: pickFrom(PERIOD_ART[now.key] || PERIOD_ART.morning),
      action: null
    };
  }

  function renderWidgetPreview(messages, now) {
    var preview = document.getElementById('widgetPreview');
    if (!preview) return;

    var icon = document.getElementById('widget-preview-icon');
    var period = document.getElementById('widget-preview-period');
    var msg = document.getElementById('widget-preview-message');
    var actions = document.getElementById('widget-preview-actions');

    var card = widgetCardFor(messages, now);

    if (icon) {
      icon.src = card.image;
      icon.alt = 'Praxi';
    }
    if (period) period.textContent = card.emoji + ' ' + card.label;
    if (msg) msg.textContent = card.text;

    // Varied, message-specific background.
    preview.style.background =
      WIDGET_STYLES[hashString(card.text) % WIDGET_STYLES.length];

    if (actions) {
      actions.innerHTML = '';
      if (card.action) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'widget-preview-action';
        btn.textContent = card.action.label;
        btn.addEventListener('click', function () {
          if (typeof window.PraxiNav === 'function') {
            window.PraxiNav(card.action.page);
          }
        });
        actions.appendChild(btn);
      }
    }
  }

  /* ---------------- Notifications page ---------------- */

  function renderNotifications() {
    var messages = window.PraxiStore.getMessages();
    var now = currentPeriod();

    var periodEl = document.getElementById('notif-current-period');
    var msgEl = document.getElementById('notif-current-message');

    var current = pickMessage(messages, now.key);
    if (periodEl) periodEl.textContent = now.icon + ' ' + now.label;
    if (msgEl) msgEl.textContent = current;

    renderWidgetPreview(messages, now);

    var schedule = document.getElementById('notif-schedule');
    if (!schedule) return;

    schedule.innerHTML = PERIODS.map(function (p) {
      var pool = poolFor(messages, p.key);
      var sample = pool.length ? pool[0] : '—';
      var isNow = p.key === now.key;
      return '' +
        '<article class="notif-slot' + (isNow ? ' notif-slot-now' : '') + '">' +
          '<div class="notif-slot-head">' +
            '<span class="notif-slot-icon">' + p.icon + '</span>' +
            '<strong>' + escapeHtml(p.label) + '</strong>' +
            '<span class="notif-slot-range">' + escapeHtml(p.range) + '</span>' +
            (isNow ? '<span class="notif-badge">NOW</span>' : '') +
          '</div>' +
          '<p>' + escapeHtml(sample) + '</p>' +
          '<span class="notif-slot-count">' + pool.length + ' messages</span>' +
        '</article>';
    }).join('');
  }

  /* ---------------- Moments page ---------------- */

  function momentIcon(type) {
    var t = String(type || '').toLowerCase();
    if (t.indexOf('goal') >= 0) return '🎯';
    if (t.indexOf('rhapsody') >= 0 || t.indexOf('read') >= 0) return '📖';
    if (t.indexOf('pray') >= 0) return '🙏';
    if (t.indexOf('note') >= 0) return '📝';
    if (t.indexOf('break') >= 0) return '☕';
    return '🧠';
  }

  function momentSummary(m) {
    var d = m && m.data ? m.data : {};
    if (typeof d === 'string') return d;
    if (d.title) return d.title;
    if (d.topic) return d.topic;
    if (d.text) return String(d.text).slice(0, 80);
    if (m.type) return String(m.type).replace(/[-_]/g, ' ');
    return '';
  }

  function renderMoments() {
    var list = document.getElementById('moments-list');
    if (!list) return;

    var moments = window.PraxiStore.getMoments();
    if (!moments.length) {
      list.innerHTML = '' +
        '<div class="activity-item">' +
          '<span class="activity-icon">🧠</span>' +
          '<div class="activity-content">' +
            '<strong>Nothing yet</strong>' +
            '<span>Moments will appear here as you use Praxi.</span>' +
          '</div>' +
        '</div>';
      return;
    }

    var recent = moments.slice(-40).reverse();
    list.innerHTML = recent.map(function (m) {
      var when = '';
      try {
        when = new Date(m.timestamp).toLocaleString([], {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });
      } catch (e) { when = ''; }
      return '' +
        '<div class="activity-item">' +
          '<span class="activity-icon">' + momentIcon(m.type) + '</span>' +
          '<div class="activity-content">' +
            '<strong>' + escapeHtml(String(m.type || 'moment').replace(/[-_]/g, ' ')) + '</strong>' +
            '<span>' + escapeHtml(momentSummary(m)) + '</span>' +
          '</div>' +
          '<time>' + escapeHtml(when) + '</time>' +
        '</div>';
    }).join('');
  }

  /* ---------------- Widget section ---------------- */

  function pushWidgetFlag(on) {
    try {
      if (window.PraxiNative && typeof window.PraxiNative.setWidgetEnabled === 'function') {
        window.PraxiNative.setWidgetEnabled(!!on);
      }
    } catch (e) { /* native bridge optional */ }
  }

  // If the app was opened from a widget button, jump to that page.
  function consumeLaunchRoute() {
    try {
      if (
        !window.PraxiNative ||
        typeof window.PraxiNative.getLaunchRoute !== 'function'
      ) {
        return;
      }
      var route = window.PraxiNative.getLaunchRoute();
      if (!route) return;
      window.PraxiStore.ready().then(function () {
        if (typeof window.PraxiNav === 'function') {
          window.PraxiNav(route);
        }
      });
    } catch (e) {
      /* native bridge optional */
    }
  }

  // The native host calls this when the app is already running and a
  // widget button (or notification) wants to switch pages.
  window.PraxiConsumeRoute = consumeLaunchRoute;

  // Keep the phone's reminder schedule in step with whatever the
  // settings currently say — even if the user never opens Settings.
  function pushRemindersToNative() {
    try {
      if (
        !window.PraxiNative ||
        typeof window.PraxiNative.scheduleReminders !== 'function'
      ) {
        return;
      }
      window.PraxiStore.ready().then(function () {
        var payload = {
          settings: window.PraxiStore.getSettings() || {},
          messages: window.PraxiStore.getMessages() || {}
        };
        window.PraxiNative.scheduleReminders(
          JSON.stringify(payload)
        );
      });
    } catch (e) {
      /* native bridge optional */
    }
  }

  function setWidgetStatus(message) {
    var el = document.getElementById('add-widget-status');
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function requestPinWidget(widgetType) {
    var type = widgetType || 'companion';
    try {
      if (
        window.PraxiNative &&
        typeof window.PraxiNative.requestPinWidget === 'function'
      ) {
        var supported = window.PraxiNative.requestPinWidget(type);
        if (supported) {
          setWidgetStatus(
            'Confirm “Add to Home screen” in the dialog that just opened.'
          );
        } else {
          setWidgetStatus(
            'This launcher can’t add widgets automatically. Long-press your ' +
            'home screen, tap Widgets, then drag the widget you picked onto it.'
          );
        }
        return supported;
      }
    } catch (e) {
      /* native bridge optional */
    }
    setWidgetStatus(
      'Long-press your home screen, tap Widgets, then drag your chosen widget onto it.'
    );
    return false;
  }

  // Which widget type (companion message card vs. daily goals card) the
  // user wants. The native side owns the type for pinning; settings is
  // the fallback when the bridge is absent.
  function getWidgetTypePref() {
    try {
      if (window.PraxiNative && typeof window.PraxiNative.getWidgetType === 'function') {
        var t = window.PraxiNative.getWidgetType();
        return (t === 'daily') ? 'daily' : 'companion';
      }
    } catch (e) { /* fall back to settings */ }
    var s = window.PraxiStore.getSettings ? window.PraxiStore.getSettings() : {};
    return (s.widgetType === 'daily') ? 'daily' : 'companion';
  }

  function applyWidgetTypeUI(type) {
    var buttons = document.querySelectorAll('.widget-type-option');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-widget-type') === type);
    });
    var companionPreview = document.getElementById('widgetPreview');
    var dailyPreview = document.getElementById('widgetPreviewDaily');
    if (companionPreview) companionPreview.classList.toggle('hidden', type !== 'companion');
    if (dailyPreview) dailyPreview.classList.toggle('hidden', type !== 'daily');
    if (type === 'daily') renderDailyWidgetPreview();
  }

  // Live mirror of the Daily widget: goals progress + Rhapsody status.
  function renderDailyWidgetPreview() {
    var goalsEl = document.getElementById('widget-preview-daily-goals');
    var rhapsodyEl = document.getElementById('widget-preview-daily-rhapsody');
    var dateEl = document.getElementById('widget-preview-daily-date');
    if (!goalsEl && !rhapsodyEl && !dateEl) return;

    window.PraxiStore.ready().then(function () {
      var goals = window.PraxiStore.ensureCurrentDay();
      var list = goals && goals.today && Array.isArray(goals.today.goals)
        ? goals.today.goals
        : [];
      var done = list.filter(function (g) { return g && g.completed; }).length;

      if (goalsEl) goalsEl.textContent = done + ' / ' + list.length + ' done';

      var rs = window.PraxiStore.getRhapsodyStatus();
      var rText = (rs && rs.read) ? 'Read today ✓' : 'Not read yet';
      if (rs && rs.streak > 0) rText += ' · ' + rs.streak + '-day streak';
      if (rhapsodyEl) rhapsodyEl.textContent = rText;

      if (dateEl) {
        var today = goals && goals.today && goals.today.date
          ? goals.today.date
          : null;
        dateEl.textContent = formatShortDate(today);
      }
    });
  }

  function formatShortDate(iso) {
    if (!iso) return 'Today';
    try {
      var parts = String(iso).split('-');
      if (parts.length !== 3) return 'Today';
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var m = Number(parts[1]);
      if (m < 1 || m > 12) return 'Today';
      return months[m - 1] + ' ' + Number(parts[2]);
    } catch (e) {
      return 'Today';
    }
  }

  function initWidgetSection() {
    var cb = document.getElementById('settings-widgetEnabled');
    if (!cb) return;

    window.PraxiStore.ready().then(function () {
      var s = window.PraxiStore.getSettings() || {};
      cb.checked = !!s.widgetEnabled;
      pushWidgetFlag(cb.checked);

      // Prime the native widget snapshot (goals + rhapsody) so the
      // Daily widget has data even before the user changes anything.
      if (
        window.PraxiWidgetSync &&
        typeof window.PraxiWidgetSync.refresh === 'function'
      ) {
        try { window.PraxiWidgetSync.refresh(); } catch (e) { /* optional */ }
      }
    });

    // ---- widget type picker (Companion / Daily) ----
    var pickerType = getWidgetTypePref();
    applyWidgetTypeUI(pickerType);

    var typeButtons = document.querySelectorAll('.widget-type-option');
    Array.prototype.forEach.call(typeButtons, function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-widget-type') === 'daily' ? 'daily' : 'companion';
        var prev = getWidgetTypePref();
        if (next === prev) return;

        try {
          if (window.PraxiNative && typeof window.PraxiNative.setWidgetType === 'function') {
            window.PraxiNative.setWidgetType(next);
          }
        } catch (e) { /* optional */ }

        try {
          if (window.PraxiStore && typeof window.PraxiStore.saveSettings === 'function') {
            window.PraxiStore.saveSettings({ widgetType: next });
          }
        } catch (e) { /* optional */ }

        applyWidgetTypeUI(next);

        // If the master toggle is on, offer to pin the newly chosen type.
        if (cb && cb.checked) {
          requestPinWidget(next);
        }
      });
    });

    cb.addEventListener('change', function () {
      window.PraxiStore.saveSettings({ widgetEnabled: cb.checked });
      pushWidgetFlag(cb.checked);

      // Turning the widget on is the natural moment to offer to pin
      // it, so the user actually gets it on the home screen.
      if (cb.checked) {
        requestPinWidget(getWidgetTypePref());
      } else {
        setWidgetStatus('');
      }
    });

    var addBtn = document.getElementById('add-widget-button');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        requestPinWidget(getWidgetTypePref());
      });
    }

    var shuffleBtn = document.getElementById('widget-preview-shuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', function () {
        refreshDynamic();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
