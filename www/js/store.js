/* =========================================================
   PRAXI MOBILE — SINGLE-WRITER DATA STORE
   ---------------------------------------------------------
   This module is the ONLY writer of persisted app state on
   mobile (localStorage-backed, mirroring the desktop JSON
   file shapes exactly: settings, daily-goals, moment-ledger).
   The UI and the praxiAPI bridge read through here.
   ========================================================= */
(function () {
  'use strict';

  const KEYS = {
    settings: 'praxi.settings',
    goals: 'praxi.dailyGoals',
    moments: 'praxi.momentLedger',
    rhapsody: 'praxi.rhapsody',
    customConfessions: 'praxi.customConfessions'
  };

  // Fallback defaults (mirror of desktop config/settings.json).
  // Replaced by the real file when fetch succeeds.
  const FALLBACK_SETTINGS = {
    enabled: true,
    alwaysOnTop: false,
    soundEnabled: true,
    theme: 'dark',
    animationSpeed: 1,
    petSize: 100,
    horizontalPosition: 80,
    verticalPosition: 80,
    breakIntervalMinutes: 20,
    rhapsodyStartTime: '07:00',
    rhapsodyIntervalHours: 1,
    workIntervalHours: 2,
    // Each reminder type carries its own enabled flag so the schedule
    // UI can drive them independently (and the native notifier can
    // read them straight off).
    reminders: {
      breaks: { enabled: true },
      rhapsody: { enabled: true },
      greetings: { enabled: false },
      work: { enabled: false }
    },
    quietHours: { enabled: false, start: '22:00', end: '07:00' },
    pauseUntil: 0,
    summonButtonPosition: 'top-right',
    messageLibrary: {}
  };

  let settings = null;
  let messages = null;
  let readyPromise = null;

  function deepMerge(base, override) {
    if (override === undefined || override === null) return base;
    if (typeof base !== 'object' || base === null) return override;
    if (Array.isArray(base) || Array.isArray(override)) return override;
    const out = {};
    for (const k of Object.keys(base)) out[k] = deepMerge(base[k], override ? override[k] : undefined);
    if (override) {
      for (const k of Object.keys(override)) {
        if (!(k in out)) out[k] = override[k];
      }
    }
    return out;
  }

  function readJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      console.error('store read failed', key, e);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function init() {
    try {
      const res = await fetch('config/settings.json', { cache: 'no-store' });
      const fileSettings = await res.json();
      settings = deepMerge(fileSettings, readJSON(KEYS.settings, null));
    } catch (e) {
      settings = deepMerge(FALLBACK_SETTINGS, readJSON(KEYS.settings, null));
    }
    try {
      const res = await fetch('config/messages.json', { cache: 'no-store' });
      messages = await res.json();
    } catch (e) {
      messages = {};
    }
  }

  function getSettings() { return settings; }

  // Guarantees init() (config fetch) has completed before a
  // caller reads settings/messages. The bridge awaits this.
  function ready() {
    if (!readyPromise) readyPromise = init();
    return readyPromise;
  }

  function saveSettings(s) {
    settings = deepMerge(settings || FALLBACK_SETTINGS, s || {});
    writeJSON(KEYS.settings, settings);
    return settings;
  }

  function getMessages() { return messages || {}; }

  function todayStr() { return new Date().toLocaleDateString('en-CA'); }

  function getGoals() {
    let goals = readJSON(KEYS.goals, null);
    if (!goals || !goals.today) {
      goals = { today: { date: todayStr(), goals: [] }, history: [], newDay: false };
    }
    return goals;
  }

  // Desktop-compatible rollover: archive yesterday, start fresh.
  function ensureCurrentDay() {
    const goals = getGoals();
    const now = todayStr();
    if (goals.today.date === now) return goals;
    const history = Array.isArray(goals.history) ? goals.history.slice() : [];
    if (goals.today.date && Array.isArray(goals.today.goals) && goals.today.goals.length) {
      history.unshift({ date: goals.today.date, goals: goals.today.goals });
    }
    const next = { today: { date: now, goals: [] }, history: history, newDay: true };
    saveGoals(next);
    return next;
  }

  function saveGoals(goals) {
    writeJSON(KEYS.goals, goals || getGoals());
    return getGoals();
  }

  function getMoments() { return readJSON(KEYS.moments, []); }

  // ---- Rhapsody reading state (date-keyed, desktop-compatible) ----

  function getRhapsody() {
    const r = readJSON(KEYS.rhapsody, null);
    if (!r || !Array.isArray(r.history)) return { history: [] };
    return r;
  }

  function computeStreak(history) {
    const days = new Set((history || []).map((h) => h.date));
    if (!days.size) return 0;
    let streak = 0;
    const cur = new Date();
    if (!days.has(todayStr())) cur.setDate(cur.getDate() - 1);
    const key = (d) => d.toLocaleDateString('en-CA');
    while (days.has(key(cur))) {
      streak += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return streak;
  }

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function getRhapsodyStatus() {
    const r = getRhapsody();
    const today = todayStr();
    const entry = r.history.find((h) => h.date === today);
    return {
      read: !!entry,
      topic: entry ? entry.topic : null,
      time: entry ? entry.time : null,
      readAt: entry ? (entry.readAt || null) : null,
      date: entry ? entry.date : null,
      streak: computeStreak(r.history),
      history: r.history.slice()
    };
  }

  function markRhapsodyRead(topic) {
    const r = getRhapsody();
    const today = todayStr();
    const time = nowTime();
    const readAt = new Date().toISOString();
    const existing = r.history.find((h) => h.date === today);
    if (existing) {
      existing.topic = topic || existing.topic;
      existing.time = time;
      existing.readAt = readAt;
    } else {
      r.history.unshift({ date: today, topic: topic || '', time, readAt });
    }
    writeJSON(KEYS.rhapsody, r);
    return {
      read: true,
      topic: topic || '',
      time,
      readAt,
      date: today,
      streak: computeStreak(r.history),
      history: r.history.slice()
    };
  }

  // ---- Custom confessions (user-authored, device-local) ----

  function getCustomConfessions() {
    const list = readJSON(KEYS.customConfessions, []);
    return Array.isArray(list) ? list : [];
  }

  function addCustomConfession(title, text) {
    const list = getCustomConfessions();
    const item = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title: String(title == null ? '' : title).trim() || 'My confession',
      text: String(text == null ? '' : text).trim(),
      createdAt: new Date().toISOString()
    };
    list.push(item);
    writeJSON(KEYS.customConfessions, list);
    return item;
  }

  function deleteCustomConfession(id) {
    const list = getCustomConfessions().filter((c) => c.id !== id);
    writeJSON(KEYS.customConfessions, list);
    return list;
  }

  function recordMoment(type, data) {
    const moments = getMoments();
    moments.push({
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      type: type,
      data: data || {}
    });
    writeJSON(KEYS.moments, moments);
    return moments[moments.length - 1];
  }

  window.PraxiStore = {
    init: init,
    ready: ready,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getMessages: getMessages,
    getGoals: getGoals,
    saveGoals: saveGoals,
    ensureCurrentDay: ensureCurrentDay,
    todayStr: todayStr,
    getMoments: getMoments,
    recordMoment: recordMoment,
    getRhapsodyStatus: getRhapsodyStatus,
    markRhapsodyRead: markRhapsodyRead,
    getCustomConfessions: getCustomConfessions,
    addCustomConfession: addCustomConfession,
    deleteCustomConfession: deleteCustomConfession,
    deepMerge: deepMerge
  };
})();