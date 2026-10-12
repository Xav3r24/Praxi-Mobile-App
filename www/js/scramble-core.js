/* =========================================================
   PRAXI ARCADE - SCRAMBLE CORE
   ---------------------------------------------------------
   Pure, DOM-free word-scramble logic. Shared by the UI
   (www/games.js) and by the Node unit tests, so the rules
   can be verified without a browser or a device.

   No storage, no network, no DOM access here.
   ========================================================= */
(function () {
  'use strict';

  var BASE_POINTS = 10;
  var HINT_PENALTY = 5;

  function normalize(value) {
    return String(value == null ? '' : value)
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  function hashString(text) {
    var s = String(text == null ? '' : text);
    var h = 2166136261;
    for (var i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A deterministic RNG seeded from the word itself, so the same
  // word always scrambles the same way (stable previews/tests).
  function seededRng(seedText) {
    return mulberry32(hashString(seedText));
  }

  // Returns a rearrangement of `word` that is never identical to
  // it, or null when no such rearrangement exists (e.g. a single
  // letter, or a word made of one repeated letter).
  function scramble(word, rng) {
    var src = normalize(word).replace(/ /g, '');
    if (src.length < 2) return null;
    if (new Set(src).size < 2) return null;

    var random = typeof rng === 'function' ? rng : seededRng(src);

    for (var attempt = 0; attempt < 200; attempt += 1) {
      var letters = src.split('');
      for (var i = letters.length - 1; i > 0; i -= 1) {
        var j = Math.floor(random() * (i + 1));
        var tmp = letters[i];
        letters[i] = letters[j];
        letters[j] = tmp;
      }
      var candidate = letters.join('');
      if (candidate !== src) return candidate;
    }

    // Extremely unlikely fallback: rotate one position.
    var rotated = src.slice(1) + src.charAt(0);
    return rotated !== src ? rotated : null;
  }

  // True only when `scrambled` is the same multiset of letters as
  // `word` AND differs from it.
  function isValidScramble(word, scrambled) {
    var w = normalize(word).replace(/ /g, '');
    var c = normalize(scrambled).replace(/ /g, '');
    if (!w || !c) return false;
    if (w.length !== c.length) return false;
    if (w === c) return false;
    return w.split('').sort().join('') === c.split('').sort().join('');
  }

  // Guarantees every entry has a valid scramble (repairs bad ones).
  function ensureBank(bank) {
    return (bank || []).map(function (entry) {
      var answer = String(entry.answer || '').toUpperCase();
      var scrambleText = String(entry.scramble || '').toUpperCase();
      if (!isValidScramble(answer, scrambleText)) {
        scrambleText = scramble(answer) || scrambleText;
      }
      return {
        answer: answer,
        scramble: scrambleText,
        hint: entry.hint || '',
        category: entry.category || ''
      };
    });
  }

  function shuffleInPlace(list, rng) {
    var random = typeof rng === 'function' ? rng : Math.random;
    for (var i = list.length - 1; i > 0; i -= 1) {
      var j = Math.floor(random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  // Picks `count` unique entries for a round.
  function buildRound(bank, count, rng) {
    var pool = (bank || []).slice();
    shuffleInPlace(pool, rng);
    var size = Math.max(1, Math.min(count || 10, pool.length || 1));
    return pool.slice(0, size);
  }

  function createRound(bank, count, rng) {
    var puzzles = buildRound(bank, count, rng).map(function (entry) {
      return {
        answer: normalize(entry.answer).replace(/ /g, ''),
        scramble: String(entry.scramble || '').toUpperCase(),
        hint: entry.hint || '',
        category: entry.category || '',
        hintUsed: false,
        answered: false,
        correct: false,
        awarded: 0
      };
    });

    return {
      puzzles: puzzles,
      index: 0,
      score: 0,
      correct: 0,
      done: puzzles.length === 0
    };
  }

  function currentPuzzle(round) {
    if (!round || round.index < 0 || round.index >= round.puzzles.length) return null;
    return round.puzzles[round.index];
  }

  // Points for a correct answer; a used hint costs HINT_PENALTY but
  // a correct answer always earns at least 1 point.
  function scoreFor(correct, hintUsed) {
    if (!correct) return 0;
    return Math.max(1, BASE_POINTS - (hintUsed ? HINT_PENALTY : 0));
  }

  function useHint(round) {
    var puzzle = currentPuzzle(round);
    if (!puzzle || puzzle.answered) return null;
    puzzle.hintUsed = true;
    return puzzle.hint;
  }

  // Evaluates an answer. A puzzle that is already answered is
  // locked, so repeat submissions can never award points twice.
  function submitAnswer(round, input) {
    var puzzle = currentPuzzle(round);
    if (!puzzle) return { status: 'done', awarded: 0 };
    if (puzzle.answered) return { status: 'locked', awarded: 0 };

    var isCorrect = normalize(input) === puzzle.answer;
    if (!isCorrect) {
      return { status: 'incorrect', awarded: 0, answer: puzzle.answer };
    }

    var awarded = scoreFor(true, puzzle.hintUsed);
    puzzle.answered = true;
    puzzle.correct = true;
    puzzle.awarded = awarded;
    round.score += awarded;
    round.correct += 1;
    return { status: 'correct', awarded: awarded, answer: puzzle.answer };
  }

  function skipPuzzle(round) {
    var puzzle = currentPuzzle(round);
    if (!puzzle) return { status: 'done' };
    if (puzzle.answered) return { status: 'locked' };
    puzzle.answered = true;
    puzzle.correct = false;
    puzzle.awarded = 0;
    return { status: 'skipped', answer: puzzle.answer };
  }

  function advance(round) {
    var puzzle = currentPuzzle(round);
    if (puzzle && !puzzle.answered) {
      puzzle.answered = true;
      puzzle.correct = false;
      puzzle.awarded = 0;
    }
    round.index += 1;
    if (round.index >= round.puzzles.length) {
      round.done = true;
    }
    return { done: round.done, index: round.index };
  }

  function summary(round) {
    var total = round.puzzles.length;
    return {
      total: total,
      correct: round.correct,
      score: round.score,
      accuracy: total ? Math.round((round.correct / total) * 100) : 0
    };
  }

  var PraxiScramble = {
    BASE_POINTS: BASE_POINTS,
    HINT_PENALTY: HINT_PENALTY,
    normalize: normalize,
    hashString: hashString,
    seededRng: seededRng,
    scramble: scramble,
    isValidScramble: isValidScramble,
    ensureBank: ensureBank,
    shuffleInPlace: shuffleInPlace,
    buildRound: buildRound,
    createRound: createRound,
    currentPuzzle: currentPuzzle,
    scoreFor: scoreFor,
    useHint: useHint,
    submitAnswer: submitAnswer,
    skipPuzzle: skipPuzzle,
    advance: advance,
    summary: summary
  };

  if (typeof window !== 'undefined') window.PraxiScramble = PraxiScramble;
  if (typeof module !== 'undefined' && module.exports) module.exports = PraxiScramble;
})();
