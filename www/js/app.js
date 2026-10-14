/* =========================================================
   PRAXI MOBILE — APP LOGIC (home + pet + daily goals)
   Time-of-day boundaries ported from desktop renderer.js:
   morning 05-11, afternoon 12-16, evening 17-19,
   night 20-21, lateNight 22-04.
   ========================================================= */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = { goals: null, settings: null, reaction: null, reactionTimer: null };

  const EXPRESSIONS = {
    morning: 'morningAwake.png',
    afternoon: 'afternoonChill.png',
    evening: 'eveningTired.png',
    night: 'nightCalm.png',
    lateNight: 'nightCalm.png'
  };

  function getTimeOfDay(d) {
    d = d || new Date();
    const h = d.getHours();
    if (h >= 5 && h <= 11) return 'morning';
    if (h >= 12 && h <= 16) return 'afternoon';
    if (h >= 17 && h <= 19) return 'evening';
    if (h >= 20 && h <= 21) return 'night';
    return 'lateNight';
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function renderPet() {
    const tod = getTimeOfDay();
    const goals = state.goals.today.goals;
    const done = goals.filter(function (g) { return g.completed; }).length;
    let src = state.reaction || EXPRESSIONS[tod];
    if (!state.reaction && goals.length && done === goals.length) src = 'praxi-happy.png';
    $('petImg').src = 'assets/' + src;
  }

  function setReaction(name) {
    state.reaction = name;
    renderPet();
    clearTimeout(state.reactionTimer);
    state.reactionTimer = setTimeout(function () {
      state.reaction = null;
      renderPet();
    }, 1800);
  }

  function greeting() {
    const lib = window.PraxiStore.getMessages();
    let pool = (lib.timeMessages && lib.timeMessages[getTimeOfDay()]) || lib.greetings || ['Hi Xavier.'];
    const userName = (window.PraxiStore.getSettings && window.PraxiStore.getSettings().userName) || 'Xavier';
    if (pool && Array.isArray(pool)) {
      pool = pool.map(function (msg) {
        return String(msg).replace(/Xavier/g, userName);
      });
    }
    $('greeting').textContent = pick(pool);
  }

  function renderGoals() {
    const goals = state.goals.today.goals;
    const done = goals.filter(function (g) { return g.completed; }).length;
    const total = goals.length;

    $('goalsDate').textContent = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric'
    });
    $('progressLabel').textContent = total ? done + ' of ' + total + ' done today' : 'No goals yet';
    $('progressBar').style.width = total ? Math.round((done / total) * 100) + '%' : '0%';

    const list = $('goalList');
    list.innerHTML = '';
    if (!total) {
      const li = document.createElement('li');
      li.className = 'goal-empty';
      li.textContent = 'Add a goal for today.';
      list.appendChild(li);
    }
    goals.forEach(function (goal) {
      const li = document.createElement('li');
      li.className = 'goal' + (goal.completed ? ' done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!goal.completed;
      cb.addEventListener('change', function () { toggleGoal(goal.id); });
      const span = document.createElement('span');
      span.textContent = goal.title;
      li.appendChild(cb);
      li.appendChild(span);
      list.appendChild(li);
    });
    renderHistory();
  }

  async function toggleGoal(id) {
    const goals = state.goals.today.goals;
    const goal = goals.find(function (g) { return g.id === id; });
    if (!goal) return;
    goal.completed = !goal.completed;
    if (goal.completed) {
      const done = goals.filter(function (g) { return g.completed; }).length;
      await window.praxiAPI.emitBehavior('goal.completed', {
        goalId: goal.id,
        title: goal.title,
        completed: done,
        total: goals.length,
        remaining: goals.length - done,
        allCompleted: goals.length > 0 && done === goals.length
      });
      setReaction('praxi-happy.png');
    }
    await window.praxiAPI.saveDailyGoals(state.goals);
    state.goals = await window.praxiAPI.getDailyGoals();
    renderGoals();
    renderPet();
  }

  async function addGoal() {
    const input = $('goalInput');
    const title = input.value.trim();
    if (!title) return;
    const goal = { id: 'g' + Date.now(), title: title, completed: false };
    state.goals.today.goals.push(goal);
    await window.praxiAPI.saveDailyGoals(state.goals);
    state.goals = await window.praxiAPI.getDailyGoals();
    input.value = '';
    renderGoals();
    renderPet();
    setReaction('praxi-excited.png');
  }

  function renderHistory() {
    const hist = (state.goals.history || []).slice(0, 7);
    const wrap = $('historyList');
    wrap.innerHTML = '';
    if (!hist.length) {
      const li = document.createElement('li');
      li.className = 'goal-empty';
      li.textContent = 'No previous days yet.';
      wrap.appendChild(li);
      return;
    }
    hist.forEach(function (day) {
      const li = document.createElement('li');
      const d = day.goals || [];
      const done = d.filter(function (g) { return g.completed; }).length;
      li.textContent = day.date + ' — ' + done + '/' + d.length + ' done';
      wrap.appendChild(li);
    });
  }

  async function boot() {
    await window.PraxiStore.init();
    state.settings = await window.praxiAPI.getSettings();
    state.goals = await window.praxiAPI.getDailyGoals(); // performs rollover if needed
    greeting();
    renderGoals();
    renderPet();
    $('addGoalBtn').addEventListener('click', addGoal);
    $('goalInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') addGoal(); });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();