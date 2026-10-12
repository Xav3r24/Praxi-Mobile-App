/* =========================================================
   PRAXI ARCADE (GAMES)
   ---------------------------------------------------------
   - Praxi Arcade page: Word Scramble + SOAR cards
   - Word Scramble: fully offline, 10 puzzles per round
   - SOAR: "in development" card + coming-soon modal
   - Best score persisted through the single-writer store
   No network, no accounts, no ads, no leaderboards.
   ========================================================= */
(function () {
  'use strict';

  var CORE = window.PraxiScramble;
  var ROUND_SIZE = 10;

  // Configurable card artwork. When the real SOAR art is dropped
  // into www/assets, set window.PRAXI_SOAR_IMAGE (or name the file
  // assets/soar.png) and it is used automatically. If it cannot be
  // loaded, the card falls back to a bundled Praxi image so the
  // layout never breaks.
  var SOAR_IMAGE = (typeof window.PRAXI_SOAR_IMAGE === 'string' && window.PRAXI_SOAR_IMAGE)
    ? window.PRAXI_SOAR_IMAGE
    : 'assets/soar.png';
  var SOAR_FALLBACK = 'assets/praxi-closeup.png';

  // Optional art for the Word Scramble card. Left unset by default
  // so the card shows its icon; drop in an image and define
  // window.PRAXI_SCRAMBLE_IMAGE to use it.
  var SCRAMBLE_IMAGE = (typeof window.PRAXI_SCRAMBLE_IMAGE === 'string' && window.PRAXI_SCRAMBLE_IMAGE)
    ? window.PRAXI_SCRAMBLE_IMAGE
    : '';

  function $(id) { return document.getElementById(id); }

  function setActiveNav(label) {
    var items = document.querySelectorAll('.nav-item');
    Array.prototype.forEach.call(items, function (item) {
      var span = item.querySelector('span:last-child');
      var text = span && span.textContent ? span.textContent.trim() : '';
      item.classList.toggle('active', text === label);
    });
  }

  function goTo(pageName) {
    if (typeof window.PraxiNav === 'function') {
      window.PraxiNav(pageName);
    } else {
      var pages = document.querySelectorAll('.app-page');
      Array.prototype.forEach.call(pages, function (p) { p.classList.remove('active'); });
      var target = $('page-' + pageName);
      if (target) target.classList.add('active');
    }
  }

  /* ---------------- best score ---------------- */

  function readStats() {
    try {
      if (window.PraxiStore && typeof window.PraxiStore.getArcadeStats === 'function') {
        return window.PraxiStore.getArcadeStats();
      }
    } catch (e) { /* storage optional */ }
    return { bestScore: 0, roundsPlayed: 0, bestAccuracy: 0, lastPlayedAt: 0 };
  }

  function saveStats(patch) {
    try {
      if (window.PraxiStore && typeof window.PraxiStore.saveArcadeStats === 'function') {
        return window.PraxiStore.saveArcadeStats(patch);
      }
    } catch (e) { /* storage optional */ }
    return null;
  }

  function updateBestLabel() {
    var el = $('arcade-scramble-best');
    if (!el) return;
    var stats = readStats();
    if (stats.roundsPlayed > 0) {
      el.textContent = 'Best score: ' + stats.bestScore + '  ·  ' + stats.roundsPlayed +
        (stats.roundsPlayed === 1 ? ' round' : ' rounds');
    } else {
      el.textContent = 'No rounds played yet';
    }
  }

  /* ---------------- card artwork ---------------- */

  function wireArt(imgEl, iconEl, configured, fallback) {
    if (!imgEl) return;
    if (!configured) {
      // No image configured: keep the icon, hide the image slot.
      imgEl.hidden = true;
      if (iconEl) iconEl.hidden = false;
      return;
    }
    imgEl.onerror = function () {
      imgEl.onerror = null;
      if (fallback) {
        imgEl.src = fallback;
        imgEl.classList.add('arcade-art-fallback');
      } else {
        imgEl.hidden = true;
        if (iconEl) iconEl.hidden = false;
      }
    };
    imgEl.hidden = false;
    if (iconEl) iconEl.hidden = true;
    imgEl.src = configured;
  }

  /* ---------------- SOAR modal ---------------- */

  function openSoarModal() {
    var modal = $('soar-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var dismiss = $('soar-modal-dismiss');
    if (dismiss) {
      try { dismiss.focus(); } catch (e) { /* ignore */ }
    }
  }

  function closeSoarModal() {
    var modal = $('soar-modal');
    if (modal) modal.classList.add('hidden');
  }

  /* ---------------- word scramble ---------------- */

  var round = null;

  function bank() {
    var list = window.PraxiWordBank;
    if (!Array.isArray(list) || !list.length) return null;
    return CORE.ensureBank(list);
  }

  function setFeedback(text, kind) {
    var el = $('scramble-feedback');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'scramble-feedback' + (kind ? ' scramble-feedback-' + kind : '');
  }

  function lockInput(locked) {
    var input = $('scramble-input');
    var submit = $('scramble-submit');
    var hint = $('scramble-hint-button');
    if (input) input.disabled = !!locked;
    if (submit) submit.disabled = !!locked;
    if (hint) hint.disabled = !!locked;
  }

  function showAnswer(text) {
    var el = $('scramble-answer');
    if (!el) return;
    if (text) {
      el.textContent = 'Answer: ' + text;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function renderQuestion() {
    var puzzle = CORE.currentPuzzle(round);
    if (!puzzle) { finishRound(); return; }

    var play = $('scramble-play');
    var results = $('scramble-results');
    if (play) play.hidden = false;
    if (results) results.hidden = true;

    var wordEl = $('scramble-word');
    if (wordEl) wordEl.textContent = puzzle.scramble.split('').join(' ');
    var lenEl = $('scramble-length');
    if (lenEl) lenEl.textContent = puzzle.answer.length + ' letters';
    var catEl = $('scramble-category');
    if (catEl) catEl.textContent = puzzle.category || '';

    var hintEl = $('scramble-hint');
    if (hintEl) { hintEl.textContent = ''; hintEl.hidden = true; }
    showAnswer('');
    setFeedback('', '');
    lockInput(false);

    var input = $('scramble-input');
    if (input) { input.value = ''; }

    var hintBtn = $('scramble-hint-button');
    if (hintBtn) hintBtn.disabled = false;

    var nextBtn = $('scramble-next');
    if (nextBtn) nextBtn.hidden = true;
    var skipBtn = $('scramble-skip');
    if (skipBtn) skipBtn.hidden = false;

    var progress = $('scramble-progress');
    if (progress) {
      progress.textContent = 'Question ' + (round.index + 1) + ' of ' + round.puzzles.length;
    }
    updateScoreLabel();

    if (input) {
      try { input.focus(); } catch (e) { /* ignore */ }
    }
  }

  function updateScoreLabel() {
    var el = $('scramble-score-label');
    if (el) el.textContent = 'Score: ' + round.score;
  }

  function startRound() {
    var list = bank();
    var play = $('scramble-play');
    var results = $('scramble-results');
    if (results) results.hidden = true;

    if (!list) {
      if (play) play.hidden = false;
      setFeedback('The word bank could not be loaded.', 'incorrect');
      lockInput(true);
      return;
    }

    round = CORE.createRound(list, ROUND_SIZE, Math.random);
    renderQuestion();
  }

  function onHint() {
    if (!round) return;
    var hint = CORE.useHint(round);
    if (hint == null) return;
    var hintEl = $('scramble-hint');
    if (hintEl) {
      hintEl.textContent = '💡 ' + hint;
      hintEl.hidden = false;
    }
    var hintBtn = $('scramble-hint-button');
    if (hintBtn) hintBtn.disabled = true;
    setFeedback('Hint used — this puzzle is now worth ' + CORE.scoreFor(true, true) + ' points.', '');
  }

  function finalisePuzzle() {
    lockInput(true);
    var nextBtn = $('scramble-next');
    if (nextBtn) nextBtn.hidden = false;
    var skipBtn = $('scramble-skip');
    if (skipBtn) skipBtn.hidden = true;
    var input = $('scramble-input');
    if (input) {
      try { input.blur(); } catch (e) { /* ignore */ }
    }
  }

  function onSubmit() {
    if (!round) return;
    var input = $('scramble-input');
    var value = input ? input.value : '';
    var result = CORE.submitAnswer(round, value);

    if (result.status === 'correct') {
      setFeedback('✅ Correct! +' + result.awarded + ' points.', 'correct');
      updateScoreLabel();
      finalisePuzzle();
    } else if (result.status === 'incorrect') {
      setFeedback('❌ Not quite — try again.', 'incorrect');
      if (input) {
        try { input.focus(); input.select(); } catch (e) { /* ignore */ }
      }
    } else if (result.status === 'locked') {
      setFeedback('This one is already solved.', '');
    }
  }

  function onSkip() {
    if (!round) return;
    var result = CORE.skipPuzzle(round);
    if (result.status === 'skipped') {
      showAnswer(result.answer);
      setFeedback('Skipped.', '');
    }
    finalisePuzzle();
  }

  function onNext() {
    if (!round) return;
    CORE.advance(round);
    if (round.done) {
      finishRound();
    } else {
      showAnswer('');
      renderQuestion();
    }
  }

  function finishRound() {
    var play = $('scramble-play');
    var results = $('scramble-results');
    if (play) play.hidden = true;
    if (results) results.hidden = false;

    var stats = CORE.summary(round);
    var scoreEl = $('result-score');
    if (scoreEl) scoreEl.textContent = String(stats.score);
    var correctEl = $('result-correct');
    if (correctEl) correctEl.textContent = stats.correct + ' / ' + stats.total;
    var accEl = $('result-accuracy');
    if (accEl) accEl.textContent = stats.accuracy + '%';

    var previous = readStats();
    var best = Math.max(previous.bestScore || 0, stats.score);
    var nextStats = {
      bestScore: best,
      roundsPlayed: (previous.roundsPlayed || 0) + 1,
      bestAccuracy: Math.max(previous.bestAccuracy || 0, stats.accuracy),
      lastPlayedAt: Date.now()
    };
    saveStats(nextStats);

    var bestEl = $('result-best');
    if (bestEl) bestEl.textContent = String(best);
    updateBestLabel();
  }

  function openGame() {
    goTo('word-scramble');
    startRound();
  }

  function backToArcade() {
    goTo('games');
    setActiveNav('Games');
    updateBestLabel();
  }

  /* ---------------- boot ---------------- */

  function boot() {
    wireArt($('soar-art'), $('soar-card-icon'), SOAR_IMAGE, SOAR_FALLBACK);
    wireArt($('scramble-card-art'), $('scramble-card-icon'), SCRAMBLE_IMAGE, '');

    var startBtn = $('start-word-scramble');
    if (startBtn) startBtn.addEventListener('click', openGame);

    var openSoar = $('open-soar');
    if (openSoar) openSoar.addEventListener('click', openSoarModal);

    var soarCard = $('arcade-soar-card');
    if (soarCard) {
      soarCard.addEventListener('click', function (ev) {
        // Whole card opens the coming-soon modal; the button does too.
        if (ev.target && ev.target.closest && ev.target.closest('button')) return;
        openSoarModal();
      });
    }

    var dismiss = $('soar-modal-dismiss');
    if (dismiss) dismiss.addEventListener('click', closeSoarModal);

    var overlay = $('soar-modal');
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) closeSoarModal();
      });
    }

    var backBtn = $('word-scramble-back');
    if (backBtn) backBtn.addEventListener('click', backToArcade);

    var submit = $('scramble-submit');
    if (submit) submit.addEventListener('click', onSubmit);

    var hintBtn = $('scramble-hint-button');
    if (hintBtn) hintBtn.addEventListener('click', onHint);

    var skipBtn = $('scramble-skip');
    if (skipBtn) skipBtn.addEventListener('click', onSkip);

    var nextBtn = $('scramble-next');
    if (nextBtn) nextBtn.addEventListener('click', onNext);

    var replay = $('scramble-replay');
    if (replay) replay.addEventListener('click', startRound);

    var resultsBack = $('scramble-results-back');
    if (resultsBack) resultsBack.addEventListener('click', backToArcade);

    var input = $('scramble-input');
    if (input) {
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          onSubmit();
        }
      });
    }

    // Keep the best-score label fresh once the store is ready.
    try {
      if (window.PraxiStore && typeof window.PraxiStore.ready === 'function') {
        window.PraxiStore.ready().then(updateBestLabel).catch(function () { updateBestLabel(); });
      } else {
        updateBestLabel();
      }
    } catch (e) { updateBestLabel(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
