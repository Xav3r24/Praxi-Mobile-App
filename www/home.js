/* =========================================================
   PRAXI HOME
   Main Application Navigation
   ========================================================= */


document.addEventListener(
  'DOMContentLoaded',
  () => {

    console.log(
      'Praxi Home initialized.'
    );

/*
 * =========================================================
 * CONFESSION LIBRARY
 * =========================================================
 */

let confessions = {};
let todaysConfession = null;

// Temporary state for the confession currently being viewed.
// This is NOT saved to localStorage or settings.
let declaredConfessionId = null;

/*
 * Load Confession Library.
 */

async function loadConfessions() {

  try {

const response =
  await fetch(
    'config/confessions.json'
  );

    if (!response.ok) {

      throw new Error(
        `Failed to load confessions.json: ${response.status}`
      );

    }

    const data =
      await response.json();

    confessions =
      data;

    console.log(
      '[CONFESSIONS] Library loaded:',
      confessions
    );

    return confessions;

  } catch (error) {

    console.error(
      '[CONFESSIONS] Failed to load confession library:',
      error
    );

    confessions = {
      categories: []
    };

    return confessions;

  }

}

/*
 * Get every built-in confession
 * from every category.
 */

function getAllConfessions() {

  if (
    !confessions ||
    !Array.isArray(
      confessions.categories
    )
  ) {

    return [];

  }

  return confessions.categories.flatMap(
    category => {

      if (
        !Array.isArray(
          category.confessions
        )
      ) {

        return [];

      }

      return category.confessions.map(
        confession => ({

          ...confession,

          categoryId:
            category.id,

          categoryName:
            category.name,

          categoryIcon:
            category.icon

        })
      );

    }
  );

}

/*
 * Choose a random confession.
 */

function chooseTodaysConfession() {

  const allConfessions =
    getAllConfessions();

  if (
    allConfessions.length === 0
  ) {

    console.warn(
      '[CONFESSIONS] No confessions available.'
    );

    return null;

  }

  const randomIndex =
    Math.floor(
      Math.random() *
      allConfessions.length
    );

  const confession =
    allConfessions[
      randomIndex
    ];

  todaysConfession =
    confession;

  console.log(
    '[CONFESSIONS] Selected:',
    confession
  );

  return confession;

}

/*
 * Display Today's Confession
 * in the Prayer page card.
 */

function displayTodaysConfession() {

  const titleElement =
    document.getElementById(
      'today-confession-title'
    );

  const textElement =
    document.getElementById(
      'today-confession-text'
    );

  if (
    !titleElement ||
    !textElement
  ) {

    console.warn(
  "[CONFESSIONS] Today's confession elements not found."
);

    return;

  }

  const confession =
    chooseTodaysConfession();

  if (!confession) {
    return;
  }

  titleElement.textContent =
  confession.title;

let previewText =
  confession.text
    .replace(/\s+/g, ' ')
    .trim();

const sentences =
  previewText.match(
    /[^.!?]+[.!?]+/g
  );

if (
  sentences &&
  sentences.length > 2
) {
  previewText =
    sentences
      .slice(0, 2)
      .join(' ')
      .trim() + '…';
}

textElement.textContent =
  previewText;

}

/*
 * Today's Confession button.
 */

/*
 * Today's Confession button.
 */

function setupConfessionButton() {

  const openConfessionButton =
    document.getElementById(
      'open-confession-button'
    );

  if (!openConfessionButton) {

    console.warn(
      '[CONFESSIONS] Read Today\'s Confession button not found.'
    );

    return;

  }

  console.log(
    '[CONFESSIONS] Read Today\'s Confession button found.'
  );

  openConfessionButton.addEventListener(
    'click',
    () => {

      console.log(
        '[CONFESSIONS] Read Today\'s Confession clicked.'
      );

      if (!todaysConfession) {

        console.warn(
          '[CONFESSIONS] No confession selected yet.'
        );

        /*
         * Try selecting one now in case
         * the button was clicked before
         * the library finished loading.
         */

        const confession =
          chooseTodaysConfession();

        if (!confession) {

          console.error(
            '[CONFESSIONS] Confession library is empty.'
          );

          return;

        }

      }

      console.log(
        '[CONFESSIONS] Opening:',
        todaysConfession
      );

      showConfessionPage(
  todaysConfession
);

    }
  );

}

function setupConfessionDeclareButton() {
  const declareButton =
    document.getElementById(
      'declare-confession-button'
    );

  if (!declareButton) {
    console.warn(
      '[CONFESSIONS] Declare button not found.'
    );

    return;
  }

  console.log(
    '[CONFESSIONS] Declare button found.'
  );

  declareButton.addEventListener(
    'click',
    () => {
      if (!todaysConfession) {
        console.warn(
          '[CONFESSIONS] No confession is currently selected.'
        );

        return;
      }

      if (declaredConfessionId) {
        return;
      }

      declaredConfessionId =
        todaysConfession.id;

      declareButton.textContent =
        '✓ AMEN';

      declareButton.classList.add(
        'declared'
      );

      declareButton.disabled =
        true;

      console.log(
        '[CONFESSIONS] Confession declared:',
        todaysConfession
      );
    }
  );
}

/*
 * =========================================================
 * CONFESSION PAGE
 * =========================================================
 */

/*
 * Open the full confession reader page.
 */

function showConfessionPage(
  confession
) {
  if (!confession) {
    console.warn(
      '[CONFESSIONS] Cannot open confession page.'
    );

    return;
  }

  // Track only the confession currently being viewed.
  // This is temporary and is never saved.
  todaysConfession =
    confession;

  const readerTitleElement =
  document.getElementById(
    'confession-reader-title'
  );

const readerTextElement =
  document.getElementById(
    'confession-reader-text'
  );


if (
  !readerTitleElement ||
  !readerTextElement
) {

    console.error(
      '[CONFESSIONS] Confession page elements not found.'
    );

    return;

  }


  /*
   * Populate the page.
   */

 readerTitleElement.textContent =
  confession.title;

readerTextElement.textContent =
  confession.text;
  
  const declareButton =
  document.getElementById(
    'declare-confession-button'
  );

if (declareButton) {
  // Every newly selected confession starts fresh.
  declaredConfessionId = null;

  declareButton.textContent =
    '🔥 I DECLARE THIS';

  declareButton.disabled =
    false;

  declareButton.classList.remove(
    'declared'
  );
}

const libraryPreview =
  document.querySelector(
    '.confession-library-preview'
  );

const reader =
  document.querySelector(
    '.confession-reader'
  );

const categoryView =
  document.getElementById(
    'confession-category-view'
  );


if (libraryPreview) {
  libraryPreview.style.display =
    'block';
}

if (categoryView) {
  categoryView.style.display =
    'none';
}

if (reader) {
  reader.style.display =
    'block';
}

  /*
   * Show the confession page.
   */

  showPage(
    'confessions'
  );


  console.log(
    '[CONFESSIONS] Confession page opened:',
    confession
  );

}

/*
 * =========================================================
 * CONFESSION LIBRARY
 * =========================================================
 */

function renderConfessionCategories() {

  const grid =
    document.getElementById(
      'confession-category-grid'
    );

  if (!grid) {

    console.warn(
      '[CONFESSIONS] Category grid not found.'
    );

    return;

  }

  if (
    !confessions ||
    !Array.isArray(
      confessions.categories
    )
  ) {

    console.warn(
      '[CONFESSIONS] No categories available.'
    );

    return;

  }


  grid.innerHTML = '';


  confessions.categories.forEach(
    category => {

      const card =
        document.createElement(
          'button'
        );

      card.type = 'button';

      card.className =
        'confession-category-card';


      card.innerHTML = `
        <div class="confession-category-icon">
          ${category.icon || '📢'}
        </div>

        <div class="confession-category-content">

          <h3>
            ${category.name}
          </h3>

          <p>
            ${category.confessions?.length || 0}
            confessions
          </p>

        </div>

        <div class="confession-category-arrow">
          →
        </div>
      `;


      card.addEventListener(
        'click',
        () => {

          console.log(
            '[CONFESSIONS] Category selected:',
            category
          );

          showConfessionCategory(
            category
          );

        }
      );


      grid.appendChild(
        card
      );

    }
  );


  /* Custom confessions category (always available). */
  const praxiCustomCount = praxiCustomConfessions().length;
  const praxiCustomCard = document.createElement('button');
  praxiCustomCard.type = 'button';
  praxiCustomCard.className = 'confession-category-card confession-category-card-custom';
  praxiCustomCard.innerHTML = `
    <div class="confession-category-icon">✍️</div>
    <div class="confession-category-content">
      <h3>Custom</h3>
      <p>${praxiCustomCount} ${praxiCustomCount === 1 ? 'confession' : 'confessions'}</p>
    </div>
    <div class="confession-category-arrow">→</div>
  `;
  praxiCustomCard.addEventListener('click', () => {
    showCustomConfessionCategory();
  });
  grid.appendChild(praxiCustomCard);

  console.log(
    '[CONFESSIONS] Category library rendered.'
  );

}

/*
 * =========================================================
 * CONFESSION CATEGORY VIEW
 * =========================================================
 */

function showConfessionCategory(
  category
) {

  if (!category) {

    console.warn(
      '[CONFESSIONS] No category supplied.'
    );

    return;

  }


  const libraryPreview =
    document.querySelector(
      '.confession-library-preview'
    );

  const reader =
    document.querySelector(
      '.confession-reader'
    );

  const categoryView =
    document.getElementById(
      'confession-category-view'
    );

  const titleElement =
    document.getElementById(
      'confession-category-title'
    );

  const descriptionElement =
    document.getElementById(
      'confession-category-description'
    );

  const confessionList =
    document.getElementById(
      'confession-list'
    );


  if (
    !categoryView ||
    !titleElement ||
    !descriptionElement ||
    !confessionList
  ) {

    console.error(
      '[CONFESSIONS] Category view elements not found.'
    );

    return;

  }


  /*
   * Populate category information.
   */

  titleElement.textContent =
    category.name;

  descriptionElement.textContent =
    category.description ||
    'Explore confessions from this category.';


  /*
   * Clear previous confessions.
   */

  confessionList.innerHTML = '';


  /*
   * Create confession items.
   */

  if (
    !Array.isArray(
      category.confessions
    ) ||
    category.confessions.length === 0
  ) {

    confessionList.innerHTML = `
      <div class="confession-empty-state">
        <div class="confession-empty-icon">
  📢
</div>

        <h3>
          No confessions yet
        </h3>

        <p>
          This category doesn't have any
          confessions yet.
        </p>
      </div>
    `;

  } else {

    category.confessions.forEach(
      confession => {

        const item =
          document.createElement(
            'button'
          );

        item.type = 'button';

        item.className =
          'confession-list-item';


        item.innerHTML = `
          <div class="confession-list-icon">
            ${category.icon || '📢'}
          </div>

          <div class="confession-list-content">

            <h3>
              ${confession.title}
            </h3>

            <p>
              ${confession.text}
            </p>

          </div>

          <div class="confession-list-arrow">
            →
          </div>
        `;


        item.addEventListener(
          'click',
          () => {

            showConfessionPage({

              ...confession,

              categoryId:
                category.id,

              categoryName:
                category.name,

              categoryIcon:
                category.icon

            });

          }
        );


        confessionList.appendChild(
          item
        );

      }
    );

  }


  /*
   * Hide the main library view.
   */

  if (libraryPreview) {
    libraryPreview.style.display =
      'none';
  }

  if (reader) {
    reader.style.display =
      'none';
  }


  /*
   * Show category view.
   */

  categoryView.style.display =
    'block';


  console.log(
    '[CONFESSIONS] Category opened:',
    category.name
  );

}

/*
 * =========================================================
 * CUSTOM CONFESSIONS (user-authored)
 * =========================================================
 */

function praxiCustomConfessions() {
  try {
    if (
      window.PraxiStore &&
      typeof window.PraxiStore.getCustomConfessions === 'function'
    ) {
      return window.PraxiStore.getCustomConfessions();
    }
  } catch (e) {
    /* store optional */
  }
  return [];
}

function praxiEscape(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );
}

function updateCustomCategoryCount() {
  const card = document.querySelector(
    '.confession-category-card-custom'
  );
  if (!card) {
    return;
  }
  const count = praxiCustomConfessions().length;
  const p = card.querySelector('p');
  if (p) {
    p.textContent =
      count + ' ' + (count === 1 ? 'confession' : 'confessions');
  }
}

function renderCustomConfessionList() {
  const confessionList = document.getElementById('confession-list');
  if (!confessionList) {
    return;
  }

  const items = praxiCustomConfessions();

  const composer = document.createElement('div');
  composer.className = 'custom-confession-composer';
  composer.innerHTML = `
    <div class="custom-confession-composer-head">
      <span class="custom-confession-composer-icon">✍️</span>
      <div>
        <strong>Add your own confession</strong>
        <span>Type or paste it — add as many as you like.</span>
      </div>
    </div>
    <input
      type="text"
      class="custom-confession-title-input"
      id="custom-confession-title"
      placeholder="Title (optional)"
      autocomplete="off"
    >
    <textarea
      class="custom-confession-text-input"
      id="custom-confession-text"
      rows="4"
      placeholder="Type or paste your confession here..."
    ></textarea>
    <div class="custom-confession-composer-actions">
      <button
        type="button"
        class="custom-confession-add"
        id="custom-confession-add"
      >
        + Add confession
      </button>
    </div>
  `;

  confessionList.innerHTML = '';
  confessionList.appendChild(composer);

  const addButton = composer.querySelector('#custom-confession-add');
  const titleInput = composer.querySelector('#custom-confession-title');
  const textInput = composer.querySelector('#custom-confession-text');

  if (addButton) {
    addButton.addEventListener('click', () => {
      const text = textInput ? textInput.value.trim() : '';
      if (!text) {
        if (textInput) {
          textInput.focus();
        }
        return;
      }
      const title =
        titleInput && titleInput.value.trim()
          ? titleInput.value.trim()
          : 'My confession';
      if (
        window.PraxiStore &&
        typeof window.PraxiStore.addCustomConfession === 'function'
      ) {
        window.PraxiStore.addCustomConfession(title, text);
      }
      updateCustomCategoryCount();
      renderCustomConfessionList();
    });
  }

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'confession-empty-state';
    empty.innerHTML = `
      <div class="confession-empty-icon">✍️</div>
      <h3>No custom confessions yet</h3>
      <p>Write your first one above — it saves on this device.</p>
    `;
    confessionList.appendChild(empty);
    return;
  }

  items
    .slice()
    .reverse()
    .forEach(confession => {
      const row = document.createElement('div');
      row.className = 'custom-confession-row';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'confession-list-item';
      open.innerHTML = `
        <div class="confession-list-icon">✍️</div>
        <div class="confession-list-content">
          <h3>${praxiEscape(confession.title)}</h3>
          <p>${praxiEscape(confession.text)}</p>
        </div>
        <div class="confession-list-arrow">→</div>
      `;
      open.addEventListener('click', () => {
        showConfessionPage({
          ...confession,
          categoryId: 'custom',
          categoryName: 'Custom',
          categoryIcon: '✍️'
        });
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'custom-confession-delete';
      remove.title = 'Delete confession';
      remove.setAttribute('aria-label', 'Delete confession');
      remove.textContent = '×';
      remove.addEventListener('click', event => {
        event.stopPropagation();
        if (
          window.PraxiStore &&
          typeof window.PraxiStore.deleteCustomConfession === 'function'
        ) {
          window.PraxiStore.deleteCustomConfession(confession.id);
        }
        updateCustomCategoryCount();
        renderCustomConfessionList();
      });

      row.appendChild(open);
      row.appendChild(remove);
      confessionList.appendChild(row);
    });
}

function showCustomConfessionCategory() {
  const libraryPreview = document.querySelector(
    '.confession-library-preview'
  );
  const reader = document.querySelector('.confession-reader');
  const categoryView = document.getElementById(
    'confession-category-view'
  );
  const titleElement = document.getElementById(
    'confession-category-title'
  );
  const descriptionElement = document.getElementById(
    'confession-category-description'
  );

  if (!categoryView || !titleElement || !descriptionElement) {
    console.error(
      '[CONFESSIONS] Category view elements not found.'
    );
    return;
  }

  titleElement.textContent = 'Custom';
  descriptionElement.textContent =
    'Your own confessions — write or paste as many as you like.';

  renderCustomConfessionList();

  if (libraryPreview) {
    libraryPreview.style.display = 'none';
  }

  if (reader) {
    reader.style.display = 'none';
  }

  categoryView.style.display = 'block';

  console.log('[CONFESSIONS] Custom category opened.');
}

/*
 * RHAPSODY READER BACK BUTTON
 */

const rhapsodyReaderBack =
  document.getElementById(
    'rhapsody-reader-back'
  );

const rhapsodyCompletionOverlay =
  document.getElementById(
    'rhapsody-completion-overlay'
  );

const rhapsodyTopicInput =
  document.getElementById(
    'rhapsody-topic-input'
  );

const rhapsodyCompletionCancel =
  document.getElementById(
    'rhapsody-completion-cancel'
  );

const rhapsodyCompletionSubmit =
  document.getElementById(
    'rhapsody-completion-submit'
  );

const rhapsodyStreakCelebration =
  document.getElementById(
    'rhapsody-streak-celebration'
  );

const rhapsodyCelebrationStreak =
  document.getElementById(
    'rhapsody-celebration-streak'
  );

const rhapsodyCelebrationMessage =
  document.getElementById(
    'rhapsody-celebration-message'
  );

const rhapsodyCelebrationClose =
  document.getElementById(
    'rhapsody-celebration-close'
  );
  
  if (rhapsodyCelebrationClose) {

  rhapsodyCelebrationClose.addEventListener(
    'click',
    () => {

      if (rhapsodyStreakCelebration) {

        rhapsodyStreakCelebration.classList.add(
          'hidden'
        );

      }

    }
  );

}


if (rhapsodyReaderBack) {

  rhapsodyReaderBack.addEventListener(
    'click',
    () => {

      window.praxiAPI.closeRhapsodyReader();

      rhapsodyReaderBack.classList.remove(
        'visible'
      );

      showRhapsodyCompletionPopup();

    }
  );

}

    /*
     * SIDEBAR NAVIGATION
     */
    const navItems =
      document.querySelectorAll(
        '.nav-item'
      );


    /*
     * Change the active sidebar item.
     */
    function setActiveNavigation(
      selectedButton
    ) {

      navItems.forEach(
        (item) => {

          item.classList.remove(
            'active'
          );

        }
      );


      if (selectedButton) {

        selectedButton.classList.add(
          'active'
        );

      }

    }


    /*
     * Show an internal Praxi page.
     *
     * We will expand this function as
     * each feature gets its own page.
     */
 function showPage(pageName) {
  console.log('Praxi page:', pageName);

  if (pageName !== 'rhapsody') {
    window.praxiAPI.closeRhapsodyReader();
  }

  if (pageName !== 'prayer') {
    window.praxiAPI.closePrayathon();
  }

  const pages = document.querySelectorAll('.app-page');

  pages.forEach(
    (page) => {

      page.classList.remove(
        'active'
      );

    }
  );

  const targetPage =
    document.getElementById(
      `page-${pageName}`
    );

  if (targetPage) {

    targetPage.classList.add(
      'active'
    );

  }

}

function showRhapsodyCompletionPopup() {

  if (!rhapsodyCompletionOverlay) {
    return;
  }

  rhapsodyCompletionOverlay.classList.remove(
    'hidden'
  );

  if (rhapsodyTopicInput) {

    rhapsodyTopicInput.value = '';

    setTimeout(
      () => {
        rhapsodyTopicInput.focus();
      },
      100
    );

  }

  // Prefill any reflection already saved for today so it can be
  // edited again from the Rhapsody page.
  const reflectionInput =
    document.getElementById(
      'rhapsody-reflection-input'
    );

  if (reflectionInput) {

    let savedReflection = '';

    if (
      window.PraxiStore &&
      typeof window.PraxiStore.getRhapsodyStatus === 'function'
    ) {

      try {

        const status =
          window.PraxiStore.getRhapsodyStatus();

        savedReflection =
          (status && status.reflection)
            ? String(status.reflection)
            : '';

      } catch (e) {
        savedReflection = '';
      }

    }

    reflectionInput.value = savedReflection;

    reflectionInput.setAttribute(
      'placeholder',
      'A verse, a line, a thought worth keeping...'
    );

  }

}

function hideRhapsodyCompletionPopup() {

  if (!rhapsodyCompletionOverlay) {
    return;
  }

  rhapsodyCompletionOverlay.classList.add(
    'hidden'
  );

}

if (rhapsodyCompletionCancel) {

  rhapsodyCompletionCancel.addEventListener(
    'click',
    () => {

      hideRhapsodyCompletionPopup();

    }
  );

}


if (rhapsodyCompletionSubmit) {

  rhapsodyCompletionSubmit.addEventListener(
    'click',
    async () => {

      let topic =
        rhapsodyTopicInput?.value
          ?.trim();

      const reflectionInput =
        document.getElementById(
          'rhapsody-reflection-input'
        );

      const reflection =
        reflectionInput
          ? reflectionInput.value.trim()
          : '';

      // Allow editing just the reflection when today was already
      // read — the topic is kept from the saved entry.
      if (!topic) {

        if (
          window.PraxiStore &&
          typeof window.PraxiStore.getRhapsodyStatus === 'function'
        ) {

          try {

            const status =
              window.PraxiStore.getRhapsodyStatus();

            if (status && status.read) {
              topic = status.topic || '';
            }

          } catch (e) {
            topic = '';
          }

        }

      }

      if (!topic) {

        if (rhapsodyTopicInput) {
          rhapsodyTopicInput.focus();
        }

        return;
      }

      try {

        const result =
          await window.praxiAPI.markRhapsodyRead(
            topic,
            reflection
          );

        console.log(
          'Rhapsody completed:',
          result
        );

        if (reflectionInput) {
          reflectionInput.value = '';
        }

        hideRhapsodyCompletionPopup();

        await updateRhapsodyPageStatus();

        showRhapsodyStreakCelebration(
          result?.streak
        );

      } catch (error) {

        console.error(
          'Failed to save Rhapsody completion:',
          error
        );

      }

    }
  );

}

function renderRhapsodyWeek(history = []) {

  const weekContainer =
    document.getElementById(
      'rhapsody-week'
    );

  if (!weekContainer) {
    return;
  }

  const completedDates =
    new Set(
      history
        .filter(
          entry =>
            entry &&
            entry.date
        )
        .map(
          entry =>
            entry.date
        )
    );

  const today =
    new Date();

  const dayOfWeek =
    today.getDay();

  // Convert Sunday = 0 into
  // Monday = 0.
  const mondayOffset =
    dayOfWeek === 0
      ? -6
      : 1 - dayOfWeek;

  const monday =
    new Date(today);

  monday.setHours(
    0,
    0,
    0,
    0
  );

  monday.setDate(
    today.getDate() +
    mondayOffset
  );

  const dayLabels = [
    'M',
    'T',
    'W',
    'T',
    'F',
    'S',
    'S'
  ];

  const days =
    weekContainer.querySelectorAll(
      '.rhapsody-day'
    );

  days.forEach(
    (dayElement, index) => {

      const date =
        new Date(monday);

      date.setDate(
        monday.getDate() +
        index
      );

      const dateKey =
        date.toLocaleDateString(
          'en-CA'
        );

      const isToday =
        dateKey ===
        today.toLocaleDateString(
          'en-CA'
        );

      const completed =
        completedDates.has(
          dateKey
        );

      const label =
        dayElement.querySelector(
          'span'
        );

      const marker =
        dayElement.querySelector(
          'strong'
        );

      if (label) {
        label.textContent =
          dayLabels[index];
      }

      if (marker) {
        marker.textContent =
          completed
            ? '✓'
            : '•';
      }

      dayElement.classList.toggle(
        'completed',
        completed
      );

      dayElement.classList.toggle(
        'today',
        isToday
      );

      dayElement.title =
        `${date.toLocaleDateString(
          undefined,
          {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          }
        )}${
          completed
            ? ' • Read'
            : ''
        }`;
    }
  );
}

function escapeRhapsodyHistoryText(
  value
) {

  return String(value ?? '')
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}

function renderRhapsodyHistory(
  history = []
) {

  const historyContainer =
    document.getElementById(
      'rhapsody-history'
    );

  if (!historyContainer) {
    return;
  }

  const validHistory =
    history
      .filter(
        entry =>
          entry &&
          entry.date
      )
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );

  if (
    validHistory.length === 0
  ) {

    historyContainer.innerHTML = `
      <div class="rhapsody-history-empty">
        <div>
          📖
        </div>
        <p>
          Your Rhapsody reading history
          will appear here.
        </p>
      </div>
    `;

    return;
  }

  historyContainer.innerHTML =
    validHistory
      .map(
        entry => {

          const date =
            new Date(
              `${entry.date}T00:00:00`
            );

          const formattedDate =
            date.toLocaleDateString(
              undefined,
              {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }
            );

          const formattedTime =
            entry.readAt
              ? new Date(
                  entry.readAt
                ).toLocaleTimeString(
                  [],
                  {
                    hour: 'numeric',
                    minute: '2-digit'
                  }
                )
              : (entry.time || '');

          const topic =
  escapeRhapsodyHistoryText(
    entry.topic ||
    'Rhapsody reading'
  );

          return `
            <article
              class="rhapsody-history-item"
            >

              <div
                class="rhapsody-history-icon"
              >
                📖
              </div>

              <div
                class="rhapsody-history-content"
              >

                <div
                  class="rhapsody-history-top"
                >
                  <strong>
                    ${topic}
                  </strong>

                  <span
                    class="rhapsody-history-status"
                  >
                    ✓ Read
                  </span>
                </div>

                <div
                  class="rhapsody-history-meta"
                >
                  <span>
                    ${formattedDate}
                  </span>

                  ${
                    formattedTime
                      ? `
                        <span>
                          ${formattedTime}
                        </span>
                      `
                      : ''
                  }
                </div>

              </div>

            </article>
          `;
        }
      )
      .join('');
}

async function updateRhapsodyPageStatus() {

  try {

    const status =
      await window.praxiAPI.getRhapsodyStatus();

    const history =
      Array.isArray(
        status?.history
      )
        ? status.history
        : [];

    const streakCount =
      document.getElementById(
        'rhapsody-streak-count'
      );

    const todayTopic =
      document.getElementById(
        'rhapsody-today-topic'
      );

    const todayTime =
      document.getElementById(
        'rhapsody-today-time'
      );

    const todayStatus =
      document.getElementById(
        'rhapsody-today-reading-status'
      );

    const pageStatusText =
      document.getElementById(
        'rhapsody-page-status-text'
      );

    const pageStatusDot =
      document.getElementById(
        'rhapsody-page-status-dot'
      );

    /*
     * -------------------------
     * STREAK
     * -------------------------
     */

    if (streakCount) {

      streakCount.textContent =
        Number(status?.streak) || 0;

    }


    /*
     * -------------------------
     * TODAY
     * -------------------------
     */

    if (status?.read) {

      if (todayTopic) {

        todayTopic.textContent =
          status.topic ||
          'Not recorded';

      }

      if (todayTime) {

        todayTime.textContent =
          status.readAt
            ? new Date(
                status.readAt
              ).toLocaleTimeString(
                [],
                {
                  hour: 'numeric',
                  minute: '2-digit'
                }
              )
            : (status.time || 'Not recorded');

      }

      if (todayStatus) {

        todayStatus.textContent =
          'Read today';

      }

      if (pageStatusText) {

        pageStatusText.textContent =
          'Read today';

      }

      if (pageStatusDot) {

        pageStatusDot.classList.add(
          'read'
        );

      }

    } else {

      if (todayTopic) {

        todayTopic.textContent =
          'Not recorded';

      }

      if (todayTime) {

        todayTime.textContent =
          'Not recorded';

      }

      if (todayStatus) {

        todayStatus.textContent =
          'Not read yet';

      }

      if (pageStatusText) {

        pageStatusText.textContent =
          'Not read yet';

      }

      if (pageStatusDot) {

        pageStatusDot.classList.remove(
          'read'
        );

      }

    }


    /*
     * -------------------------
     * TODAY'S REFLECTION
     * -------------------------
     */

    const reflectionBox =
      document.getElementById(
        'rhapsody-today-reflection-box'
      );

    const reflectionText =
      document.getElementById(
        'rhapsody-today-reflection-text'
      );

    const todayReflection =
      (status && status.reflection)
        ? String(status.reflection).trim()
        : '';

    if (reflectionBox) {

      if (todayReflection && status?.read) {

        reflectionBox.classList.remove(
          'hidden'
        );

        if (reflectionText) {

          reflectionText.textContent =
            todayReflection;

        }

      } else {

        reflectionBox.classList.add(
          'hidden'
        );

        if (reflectionText) {

          reflectionText.textContent = '';

        }

      }

    }


    /*
     * -------------------------
     * WEEKLY VIEW
     * -------------------------
     */

    renderRhapsodyWeek(
      history
    );


    /*
     * -------------------------
     * READING HISTORY
     * -------------------------
     */

    renderRhapsodyHistory(
      history
    );

  } catch (error) {

    console.error(
      'Failed to update Rhapsody page:',
      error
    );

  }

}

function showRhapsodyStreakCelebration(
  streak
) {

  if (!rhapsodyStreakCelebration) {
    return;
  }

  const safeStreak =
    Math.max(
      1,
      Number(streak) || 1
    );

  if (rhapsodyCelebrationStreak) {

    rhapsodyCelebrationStreak.textContent =
      `${safeStreak} ${
        safeStreak === 1
          ? 'DAY'
          : 'DAYS'
      }`;

  }

  if (rhapsodyCelebrationMessage) {

    if (safeStreak === 1) {

      rhapsodyCelebrationMessage.textContent =
        'You started your streak. Keep going!';

    } else if (safeStreak < 7) {

      rhapsodyCelebrationMessage.textContent =
        'Keep showing up and keep the Word close.';

    } else if (safeStreak === 7) {

      rhapsodyCelebrationMessage.textContent =
        'One full week! Keep the momentum going.';

    } else {

      rhapsodyCelebrationMessage.textContent =
        'Another day added to your Rhapsody journey.';

    }

  }

  rhapsodyStreakCelebration.classList.remove(
    'hidden'
  );

}

window.praxiAPI.onNavigateHomePage(
  (pageName) => {

showPage(pageName);

if (pageName === 'rhapsody') {

  updateRhapsodyPageStatus();

}

    if (pageName === 'rhapsody') {

      const rhapsodyNav =
        [...navItems].find(
          item =>
            item.querySelector(
              'span:last-child'
            )?.textContent
              ?.trim() ===
            'Rhapsody'
        );

      setActiveNavigation(
        rhapsodyNav
      );

    }

  }
);

/*
 * Confession page back button.
 */

const confessionBackButton =
  document.getElementById(
    'confession-back-button'
  );

if (confessionBackButton) {

  confessionBackButton.addEventListener(
    'click',
    () => {

      showPage(
        'prayer'
      );

    }
  );

}

const confessionCategoryBackButton =
  document.getElementById(
    'confession-category-back-button'
  );

if (confessionCategoryBackButton) {

  confessionCategoryBackButton.addEventListener(
    'click',
    () => {

      const libraryPreview =
        document.querySelector(
          '.confession-library-preview'
        );

      const reader =
        document.querySelector(
          '.confession-reader'
        );

      const categoryView =
        document.getElementById(
          'confession-category-view'
        );


      if (reader) {

        reader.style.display =
          'block';

      }

      if (libraryPreview) {

        libraryPreview.style.display =
          'block';

      }

      if (categoryView) {

        categoryView.style.display =
          'none';

      }

    }
  );

}

    /*
     * SIDEBAR CLICK HANDLERS
     */
    navItems.forEach(
      (button) => {

        button.addEventListener(
          'click',
          () => {

            const label =
              button.querySelector(
                'span:last-child'
              )?.textContent
              ?.trim();


            if (!label) {
              return;
            }


            setActiveNavigation(
              button
            );


            switch (label) {

              case 'Home':

                showPage(
                  'home'
                );

                break;


              case 'Daily Goals':

                showPage(
                  'daily-goals'
                );

                break;


              case 'Prayer':

                showPage(
                  'prayer'
                );

                break;


              case 'Rhapsody':
  showPage('rhapsody');
  updateRhapsodyPageStatus();
  break;


              case 'Quick Notes':

                showPage(
                  'quick-notes'
                );

                break;


              case 'Notifications':

                showPage(
                  'notifications'
                );

                break;


              case 'Moments':

                showPage(
                  'moments'
                );

                break;


              case 'Games':

                showPage(
                  'games'
                );

                break;


              case 'Settings':

                showPage(
                  'settings'
                );

                break;

            }

          }
        );

      }
    );

// =========================================================
// QUICK NOTES
// =========================================================

const newNoteButton = document.getElementById('new-note-button');
const emptyNewNoteButton = document.getElementById('empty-new-note-button');

if (newNoteButton) {
  newNoteButton.addEventListener('click', () => {
    openQuickNotePage();
  });
}

if (emptyNewNoteButton) {
  emptyNewNoteButton.addEventListener('click', () => {
    openQuickNotePage();
  });
}

const backToNotesButton = document.getElementById('back-to-notes-button');

if (backToNotesButton) {
  backToNotesButton.addEventListener('click', () => {

    currentEditingQuickNoteId = null;

    showPage('quick-notes');

    // Make Quick Notes active in the sidebar
    const quickNotesNav = Array.from(navItems).find((item) => {
      return item.querySelector('span:last-child')?.textContent?.trim() === 'Quick Notes';
    });

    setActiveNavigation(quickNotesNav);

    renderQuickNotes();
  });
}

const notesSearchInput = document.getElementById(
  'notes-search-input'
);

if (notesSearchInput) {
  notesSearchInput.addEventListener('input', () => {
    renderQuickNotes();
  });
}

// =========================================================
// QUICK NOTE TAGS
// =========================================================

let currentQuickNoteTags = [];
let activeQuickNoteTag = null;

const newNoteTagInput = document.getElementById(
  'new-note-tag-input'
);

const newNoteTagsList = document.getElementById(
  'new-note-tags-list'
);

const newNoteTagDropdown = document.getElementById(
  'new-note-tag-dropdown'
);

function renderNewNoteTags() {
  if (!newNoteTagsList) {
    return;
  }

  newNoteTagsList.innerHTML = '';

  currentQuickNoteTags.forEach((tag, index) => {

    const tagElement = document.createElement('span');

    tagElement.className = 'new-note-tag';

    tagElement.innerHTML = `
      <span class="new-note-tag-text">
        ${escapeQuickNoteHTML(tag)}
      </span>

      <button
        type="button"
        class="new-note-tag-remove"
        title="Remove tag"
        aria-label="Remove ${escapeQuickNoteHTML(tag)}"
      >
        ×
      </button>
    `;

    const removeButton = tagElement.querySelector(
      '.new-note-tag-remove'
    );

    if (removeButton) {
      removeButton.addEventListener('click', () => {

        currentQuickNoteTags.splice(index, 1);

        renderNewNoteTags();

        handleNewNoteEdited();
      });
    }

    newNoteTagsList.appendChild(tagElement);
  });
}

function addQuickNoteTag(tagText) {
  const tag = tagText.trim();

  if (!tag) {
    return;
  }

  if (currentQuickNoteTags.includes(tag)) {
    return;
  }

  currentQuickNoteTags.push(tag);

  renderNewNoteTags();

  handleNewNoteEdited();
}

function renderNewNoteTagDropdown() {
  if (!newNoteTagDropdown) {
    return;
  }

  const notes = getQuickNotes();

  const tagSet = new Set();

  notes.forEach((note) => {
    if (!Array.isArray(note.tags)) {
      return;
    }

    note.tags.forEach((tag) => {
      if (typeof tag === 'string' && tag.trim()) {
        tagSet.add(tag.trim());
      }
    });
  });

  const searchTerm = newNoteTagInput
    ? newNoteTagInput.value.trim().toLowerCase()
    : '';

  const availableTags = Array.from(tagSet)
    .filter((tag) => !currentQuickNoteTags.includes(tag))
    .filter((tag) => {
      if (!searchTerm) {
        return true;
      }

      return tag.toLowerCase().includes(searchTerm);
    })
    .sort((a, b) => a.localeCompare(b));

  newNoteTagDropdown.innerHTML = '';

  if (availableTags.length === 0) {
    newNoteTagDropdown.style.display = 'none';
    return;
  }

  availableTags.forEach((tag) => {
    const tagOption = document.createElement('button');

    tagOption.type = 'button';
    tagOption.className = 'new-note-tag-option';

    tagOption.textContent = tag;

    tagOption.addEventListener('click', () => {
      addQuickNoteTag(tag);

      if (newNoteTagInput) {
        newNoteTagInput.value = '';
      }

      renderNewNoteTagDropdown();
    });

    newNoteTagDropdown.appendChild(tagOption);
  });

  newNoteTagDropdown.style.display = 'block';
}

function commitNewNoteTag() {
  if (!newNoteTagInput) {
    return;
  }

  const value = newNoteTagInput.value;

  if (!value || !value.trim()) {
    return;
  }

  addQuickNoteTag(value);

  newNoteTagInput.value = '';

  renderNewNoteTagDropdown();
}

if (newNoteTagInput) {

  newNoteTagInput.addEventListener('focus', () => {
    renderNewNoteTagDropdown();
  });

  newNoteTagInput.addEventListener('input', () => {
    renderNewNoteTagDropdown();
  });

  // Commit the typed tag on Enter. Android soft keyboards vary:
  // some report the key on keydown, others only on keyup, and a
  // few send keyCode 13/229 with key === 'Unidentified'. Cover all
  // of them. The value is cleared on the first commit, so the
  // second event is a harmless no-op (no duplicate tags).
  const isEnterKey = (event) =>
    event.key === 'Enter' ||
    event.keyCode === 13 ||
    event.which === 13;

  newNoteTagInput.addEventListener('keydown', (event) => {
    if (!isEnterKey(event)) {
      return;
    }

    event.preventDefault();

    commitNewNoteTag();
  });

  newNoteTagInput.addEventListener('keyup', (event) => {
    if (!isEnterKey(event)) {
      return;
    }

    commitNewNoteTag();
  });
}

const newNoteTagAdd = document.getElementById(
  'new-note-tag-add'
);

if (newNoteTagAdd) {
  newNoteTagAdd.addEventListener('click', () => {
    commitNewNoteTag();

    if (newNoteTagInput) {
      newNoteTagInput.focus();
    }
  });
}

function openQuickNotePage() {
  const titleInput = document.getElementById('new-note-title');
  const bodyInput = document.getElementById('new-note-body');
  const saveStatus = document.getElementById('new-note-save-status');
  const themeSelect = document.getElementById('new-note-theme');

  // This is a NEW note
  currentEditingQuickNoteId = null;
currentQuickNoteTags = [];

renderNewNoteTags();
  if (titleInput) {
    titleInput.value = '';
  }

  if (bodyInput) {
    bodyInput.innerHTML = '';
  }

  // New notes use Praxi Dark by default
  if (themeSelect) {
    themeSelect.value = 'praxi';
  }

  applyNewNoteTheme('praxi');

  if (saveStatus) {
    saveStatus.textContent = 'Unsaved';
  }

  // A fresh note starts from a clean undo history
  resetNoteEditorHistory();

  showPage('new-note');

  if (titleInput) {
    titleInput.focus();
  }
}

// =========================================================
// NEW NOTE EDITOR
// =========================================================

const newNoteTitle = document.getElementById('new-note-title');
const newNoteBody = document.getElementById('new-note-body');
const newNoteTheme = document.getElementById('new-note-theme');
const newNoteSaveStatus = document.getElementById('new-note-save-status');

const noteToolbarButtons = document.querySelectorAll(
  '.new-note-toolbar [data-command]'
);

noteToolbarButtons.forEach((button) => {
  button.addEventListener('mousedown', (event) => {
    // Prevent the editor from losing its text selection
    event.preventDefault();

    const command = button.dataset.command;

    if (!command || !newNoteBody) return;

    newNoteBody.focus();

    document.execCommand(command, false, null);

    updateNewNoteSaveStatus();

    recordNoteEditorChange();
  });
});

function updateNewNoteSaveStatus() {
  if (!newNoteSaveStatus) return;

  newNoteSaveStatus.textContent = 'Unsaved';
}

/* ---------------------------------------------------------
   AUTO-SAVE
   Debounced save of the in-progress note so closing the app
   can't lose anything. A note created by autosave keeps its
   id, so later keystrokes update the same note.
   --------------------------------------------------------- */

let noteAutoSaveTimer = null;

function scheduleNoteAutoSave() {
  window.clearTimeout(noteAutoSaveTimer);
  noteAutoSaveTimer = window.setTimeout(() => {
    saveCurrentQuickNote({ silent: true });
  }, 800);
}

/* ---------------------------------------------------------
   UNDO / REDO
   In-memory history of editor snapshots (capped at 60). The
   Undo/Redo buttons plus Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y)
   move through the stack.
   --------------------------------------------------------- */

const NOTE_EDIT_HISTORY_LIMIT = 60;
let noteEditStack = [];
let noteEditIndex = -1;

function captureNoteEditorSnapshot() {
  const titleEl = document.getElementById('new-note-title');
  const bodyEl = document.getElementById('new-note-body');
  const themeEl = document.getElementById('new-note-theme');
  return {
    title: titleEl ? titleEl.value : '',
    html: bodyEl ? bodyEl.innerHTML : '',
    theme: themeEl ? themeEl.value : 'praxi',
    tags: currentQuickNoteTags.slice()
  };
}

function noteSnapshotsEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.title === b.title &&
    a.html === b.html &&
    a.theme === b.theme &&
    (a.tags || []).join('\u0001') ===
      (b.tags || []).join('\u0001')
  );
}

function updateNoteUndoRedoButtons() {
  const undoBtn = document.getElementById('new-note-undo');
  const redoBtn = document.getElementById('new-note-redo');
  if (undoBtn) undoBtn.disabled = noteEditIndex <= 0;
  if (redoBtn) redoBtn.disabled = noteEditIndex >= noteEditStack.length - 1;
}

function applyNoteEditorSnapshot(snapshot) {
  if (!snapshot) return;

  const titleEl = document.getElementById('new-note-title');
  const bodyEl = document.getElementById('new-note-body');
  const themeEl = document.getElementById('new-note-theme');

  if (titleEl) titleEl.value = snapshot.title;
  if (bodyEl) bodyEl.innerHTML = snapshot.html || '';
  if (themeEl) {
    themeEl.value = snapshot.theme || 'praxi';
    applyNewNoteTheme(themeEl.value);
  }

  currentQuickNoteTags = (snapshot.tags || []).slice();

  renderNewNoteTags();

  updateNewNoteSaveStatus();
}

function recordNoteEditorChange() {
  const now = captureNoteEditorSnapshot();
  const current = noteEditStack[noteEditIndex];

  if (noteSnapshotsEqual(current, now)) {
    scheduleNoteAutoSave();
    return;
  }

  // Drop any redo future, then push the new state.
  noteEditStack = noteEditStack.slice(0, noteEditIndex + 1);
  noteEditStack.push(now);
  noteEditIndex += 1;

  if (noteEditStack.length > NOTE_EDIT_HISTORY_LIMIT) {
    noteEditStack.shift();
    noteEditIndex -= 1;
  }

  updateNoteUndoRedoButtons();
  scheduleNoteAutoSave();
}

function resetNoteEditorHistory() {
  noteEditStack = [captureNoteEditorSnapshot()];
  noteEditIndex = 0;
  updateNoteUndoRedoButtons();
}

function undoNoteEditor() {
  if (noteEditIndex <= 0) return;
  noteEditIndex -= 1;
  applyNoteEditorSnapshot(noteEditStack[noteEditIndex]);
  updateNoteUndoRedoButtons();
  scheduleNoteAutoSave();
}

function redoNoteEditor() {
  if (noteEditIndex >= noteEditStack.length - 1) return;
  noteEditIndex += 1;
  applyNoteEditorSnapshot(noteEditStack[noteEditIndex]);
  updateNoteUndoRedoButtons();
  scheduleNoteAutoSave();
}

function handleNewNoteEdited() {
  updateNewNoteSaveStatus();
  recordNoteEditorChange();
}

if (newNoteTitle) {
  newNoteTitle.addEventListener('input', handleNewNoteEdited);
}

if (newNoteBody) {
  newNoteBody.addEventListener('input', handleNewNoteEdited);
}

if (newNoteTheme) {
  newNoteTheme.addEventListener('change', () => {
    applyNewNoteTheme(newNoteTheme.value);
    handleNewNoteEdited();
  });
}

document.addEventListener('keydown', (event) => {
  const page = document.getElementById('page-new-note');
  if (!page || !page.classList.contains('active')) return;

  const mod = event.ctrlKey || event.metaKey;
  if (!mod || event.altKey) return;

  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redoNoteEditor();
    } else {
      undoNoteEditor();
    }
  } else if (key === 'y') {
    event.preventDefault();
    redoNoteEditor();
  }
});

const newNoteUndoButton = document.getElementById('new-note-undo');
const newNoteRedoButton = document.getElementById('new-note-redo');

if (newNoteUndoButton) {
  newNoteUndoButton.addEventListener('click', undoNoteEditor);
}

if (newNoteRedoButton) {
  newNoteRedoButton.addEventListener('click', redoNoteEditor);
}

// The editor is static HTML (hidden until opened); start it with a
// clean undo history.
resetNoteEditorHistory();

function applyNewNoteTheme(theme) {
  const newNotePage = document.querySelector(
    '#page-new-note .new-note-page'
  );

  if (!newNotePage) return;

  newNotePage.dataset.noteTheme = theme;
}

// =========================================================
// QUICK NOTES STORAGE
// =========================================================

const QUICK_NOTES_STORAGE_KEY = 'praxiQuickNotes';
let currentEditingQuickNoteId = null;

function getQuickNotes() {
  if (
    window.PraxiStore &&
    typeof window.PraxiStore.getQuickNotes === 'function'
  ) {
    try {
      return window.PraxiStore.getQuickNotes();
    } catch (e) {
      // fall through to the direct read below
    }
  }

  try {
    const savedNotes = localStorage.getItem(QUICK_NOTES_STORAGE_KEY);

    if (!savedNotes) {
      return [];
    }

    const notes = JSON.parse(savedNotes);

    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.error('Failed to load Quick Notes:', error);
    return [];
  }
}


function saveQuickNotes(notes) {
  if (
    window.PraxiStore &&
    typeof window.PraxiStore.saveQuickNotes === 'function'
  ) {
    try {
      return window.PraxiStore.saveQuickNotes(notes);
    } catch (e) {
      // fall through to the direct write below
    }
  }

  try {
    localStorage.setItem(
      QUICK_NOTES_STORAGE_KEY,
      JSON.stringify(notes)
    );

    return true;
  } catch (error) {
    console.error('Failed to save Quick Notes:', error);
    return false;
  }
}

function saveCurrentQuickNote(options) {
  const opts = options || {};

  const titleInput = document.getElementById('new-note-title');
  const bodyInput = document.getElementById('new-note-body');
  const themeSelect = document.getElementById('new-note-theme');
  const saveStatus = document.getElementById('new-note-save-status');

  if (!titleInput || !bodyInput) {
    console.warn('Quick Note editor elements not found.');
    return;
  }

  const title = titleInput.value.trim();
  const bodyText = bodyInput.innerText.trim();
  const content = bodyInput.innerHTML.trim();
  const theme = themeSelect?.value || 'praxi';
  const tags = [...currentQuickNoteTags];

  // Don't save a completely empty note
  if (!title && !bodyText) {
    if (saveStatus && !opts.silent) {
      saveStatus.textContent = 'Nothing to save';
    }

    return;
  }

  const notes = getQuickNotes();

  const now = new Date().toISOString();


  // =======================================================
  // EDITING AN EXISTING NOTE
  // =======================================================

  if (currentEditingQuickNoteId) {

    const noteIndex = notes.findIndex(
      (note) => note.id === currentEditingQuickNoteId
    );

    if (noteIndex !== -1) {

      notes[noteIndex].title =
        title || 'Untitled Note';

      notes[noteIndex].content = content;

      notes[noteIndex].theme = theme;

      notes[noteIndex].tags = tags;

      notes[noteIndex].updatedAt = now;

      saveQuickNotes(notes);

      if (saveStatus) {
        saveStatus.textContent = 'Saved';
      }

      console.log(
        'Quick Note updated:',
        notes[noteIndex]
      );

      if (opts.silent) {
        return;
      }

      renderQuickNotes();

      showPage('quick-notes');

      const quickNotesNav = Array.from(navItems).find((item) => {
        return (
          item.querySelector('span:last-child')
            ?.textContent
            ?.trim() === 'Quick Notes'
        );
      });

      setActiveNavigation(quickNotesNav);

      return;
    }
  }


  // =======================================================
  // CREATING A NEW NOTE
  // =======================================================

  const newNote = {
  id: `note-${Date.now()}`,
  title: title || 'Untitled Note',
  content,
  theme,
  tags,
  pinned: false,
  archived: false,
  createdAt: now,
  updatedAt: now
};

  notes.unshift(newNote);

  const saved = saveQuickNotes(notes);

  if (!saved) {
    if (saveStatus) {
      saveStatus.textContent = 'Save failed';
    }

    return;
  }

  if (saveStatus) {
    saveStatus.textContent = 'Saved';
  }

  console.log('Quick Note created:', newNote);

  if (opts.silent) {
    // Keep editing this exact note so later keystrokes update it
    // instead of creating duplicates.
    currentEditingQuickNoteId = newNote.id;

    return;
  }

  renderQuickNotes();

  showPage('quick-notes');

  const quickNotesNav = Array.from(navItems).find((item) => {
    return (
      item.querySelector('span:last-child')
        ?.textContent
        ?.trim() === 'Quick Notes'
    );
  });

  setActiveNavigation(quickNotesNav);

  // Reset editor state
  currentEditingQuickNoteId = null;
}

const saveNewNoteButton = document.getElementById(
  'save-new-note-button'
);

if (saveNewNoteButton) {
  saveNewNoteButton.addEventListener('click', () => {
    saveCurrentQuickNote();
  });
}

// =========================================================
// QUICK NOTE TAG FILTERS
// =========================================================

function renderQuickNoteTagFilters() {
  const filterList = document.getElementById(
    'quick-notes-tag-filter-list'
  );

  if (!filterList) {
    return;
  }

  const notes = getQuickNotes();

  // Collect every unique tag from all notes
  const tagSet = new Set();

  notes.forEach((note) => {
    if (!Array.isArray(note.tags)) {
      return;
    }

    note.tags.forEach((tag) => {
      if (typeof tag === 'string' && tag.trim()) {
        tagSet.add(tag.trim());
      }
    });
  });

  const tags = Array.from(tagSet).sort((a, b) =>
    a.localeCompare(b)
  );

if (tags.length === 0) {
  filterList.style.display = 'none';
  return;
}

filterList.style.display = 'flex';

  filterList.innerHTML = '';

  // All Notes button
  const allButton = document.createElement('button');

  allButton.type = 'button';
  allButton.className = 'quick-notes-tag-filter';
  
  if (!activeQuickNoteTag) {
    allButton.classList.add('active');
  }

  allButton.textContent = 'All Notes';

  allButton.addEventListener('click', () => {
    activeQuickNoteTag = null;

    renderQuickNoteTagFilters();
    renderQuickNotes();
  });

  filterList.appendChild(allButton);

  // Individual tag buttons
  tags.forEach((tag) => {
    const tagButton = document.createElement('button');

    tagButton.type = 'button';
    tagButton.className = 'quick-notes-tag-filter';

    if (activeQuickNoteTag === tag) {
      tagButton.classList.add('active');
    }

    tagButton.textContent = tag;

    tagButton.addEventListener('click', () => {
      activeQuickNoteTag = tag;

      renderQuickNoteTagFilters();
      renderQuickNotes();
    });

    filterList.appendChild(tagButton);
  });
}

// =========================================================
// QUICK NOTES DISPLAY
// =========================================================

function renderQuickNotes() {

  renderQuickNoteTagFilters();

  const allNotesList = document.getElementById('all-notes-list');
  const emptyState = document.getElementById('notes-empty-state');
  const pinnedSection = document.getElementById('pinned-notes-section');
  const searchInput = document.getElementById('notes-search-input');

  if (!allNotesList) {
    return;
  }

  const notes = getQuickNotes();

  let activeNotes = notes.filter((note) => !note.archived);
  
  /*
 * ---------------------------------------------------------
 * TAG FILTER
 * ---------------------------------------------------------
 */

if (activeQuickNoteTag) {
  activeNotes = activeNotes.filter((note) => {
    return (
      Array.isArray(note.tags) &&
      note.tags.includes(activeQuickNoteTag)
    );
  });
}

  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */

  const searchTerm = searchInput
    ? searchInput.value.trim().toLowerCase()
    : '';

  if (searchTerm) {
    activeNotes = activeNotes.filter((note) => {

      const title = (note.title || '').toLowerCase();

      const temporaryElement = document.createElement('div');

      temporaryElement.innerHTML = note.content || '';

      const content = (temporaryElement.innerText || '')
        .toLowerCase();

      return (
        title.includes(searchTerm) ||
        content.includes(searchTerm)
      );
    });
  }

  /*
   * ---------------------------------------------------------
   * PINNED NOTES FIRST
   * ---------------------------------------------------------
   */

  activeNotes.sort((a, b) => {

    if (a.pinned && !b.pinned) {
      return -1;
    }

    if (!a.pinned && b.pinned) {
      return 1;
    }

    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  allNotesList.innerHTML = '';

  // Hide the old separate pinned section.
  if (pinnedSection) {
    pinnedSection.style.display = 'none';
  }

  /*
   * ---------------------------------------------------------
   * EMPTY / NO RESULTS
   * ---------------------------------------------------------
   */

  if (activeNotes.length === 0) {

    if (emptyState) {
      emptyState.style.display = 'block';

      const emptyTitle =
        emptyState.querySelector('h2');

      const emptyText =
        emptyState.querySelector('p');

      const emptyButton =
        emptyState.querySelector(
          '#empty-new-note-button'
        );

      if (searchTerm) {

        if (emptyTitle) {
          emptyTitle.textContent = 'No notes found.';
        }

        if (emptyText) {
          emptyText.textContent =
            `Nothing matches "${searchInput.value.trim()}".`;
        }

        if (emptyButton) {
          emptyButton.style.display = 'none';
        }

      } else {

        if (emptyTitle) {
          emptyTitle.textContent = 'Nothing here yet.';
        }

        if (emptyText) {
          emptyText.textContent =
            'Create your first note and get that thought out of your head and somewhere useful.';
        }

        if (emptyButton) {
          emptyButton.style.display = '';
        }
      }
    }

    return;
  }

  /*
   * ---------------------------------------------------------
   * SHOW RESULTS
   * ---------------------------------------------------------
   */

  if (emptyState) {
    emptyState.style.display = 'none';
  }

  activeNotes.forEach((note) => {
    allNotesList.appendChild(
      createQuickNoteCard(note)
    );
  });
}

function createQuickNoteCard(note) {
  const card = document.createElement('article');

  card.className = 'quick-note-card';

  card.dataset.noteTheme = note.theme || 'praxi';

  const previewText = getQuickNotePreview(note.content);

  const noteTags = Array.isArray(note.tags)
    ? note.tags
    : [];

  const tagsHTML = noteTags.length > 0
    ? `
      <div class="quick-note-card-tags">
        ${noteTags.map((tag) => `
          <span class="quick-note-card-tag">
            ${escapeQuickNoteHTML(tag)}
          </span>
        `).join('')}
      </div>
    `
    : '';

  card.innerHTML = `
    <div class="quick-note-card-header">

      <h3 class="quick-note-card-title">
        ${escapeQuickNoteHTML(note.title || 'Untitled Note')}
      </h3>

      <button
        type="button"
        class="quick-note-card-pin-button"
        title="${note.pinned ? 'Unpin note' : 'Pin note'}"
        aria-label="${note.pinned ? 'Unpin note' : 'Pin note'}"
      >
        ${note.pinned ? '📌' : '📍'}
      </button>

    </div>

    <p class="quick-note-card-preview">
      ${escapeQuickNoteHTML(previewText)}
    </p>

    ${tagsHTML}

    <div class="quick-note-card-footer">
      ${formatQuickNoteDate(note.updatedAt)}
    </div>
  `;

  // Open this note when the card itself is clicked
  card.addEventListener('click', () => {
    openQuickNote(note.id);
  });

  // Pin / unpin this note
  const pinButton = card.querySelector(
    '.quick-note-card-pin-button'
  );

  if (pinButton) {
    pinButton.addEventListener('click', (event) => {
      event.stopPropagation();

      toggleQuickNotePin(note.id);
    });
  }

  return card;
}

function toggleQuickNotePin(noteId) {
  const notes = getQuickNotes();

  const note = notes.find((item) => item.id === noteId);

  if (!note) {
    console.warn('Quick Note not found:', noteId);
    return;
  }

  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();

  const saved = saveQuickNotes(notes);

  if (!saved) {
    console.error('Failed to save pin state.');
    return;
  }

  console.log(
    note.pinned
      ? 'Quick Note pinned:'
      : 'Quick Note unpinned:',
    note
  );

  renderQuickNotes();
}

function openQuickNote(noteId) {
  const notes = getQuickNotes();

  const note = notes.find((item) => item.id === noteId);

  if (!note) {
    console.warn('Quick Note not found:', noteId);
    return;
  }

  const titleInput = document.getElementById('new-note-title');
  const bodyInput = document.getElementById('new-note-body');
  const themeSelect = document.getElementById('new-note-theme');
  const saveStatus = document.getElementById('new-note-save-status');

  if (!titleInput || !bodyInput) {
    console.warn('Quick Note editor elements not found.');
    return;
  }

  // Remember which note we're editing
  currentEditingQuickNoteId = note.id;

  // Load the note
  titleInput.value = note.title || '';
  bodyInput.innerHTML = note.content || '';

currentQuickNoteTags = Array.isArray(note.tags)
  ? [...note.tags]
  : [];

renderNewNoteTags();

  // Restore its theme
  const theme = note.theme || 'praxi';

  if (themeSelect) {
    themeSelect.value = theme;
  }

  applyNewNoteTheme(theme);

  if (saveStatus) {
    saveStatus.textContent = 'Saved';
  }

  // Restore a clean undo history for the loaded note
  resetNoteEditorHistory();

  // Open the editor page
  showPage('new-note');

  // Focus the title
  titleInput.focus();
}

function getQuickNotePreview(html) {
  const temporaryElement = document.createElement('div');

  temporaryElement.innerHTML = html || '';

  const text = temporaryElement.innerText
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return 'No text in this note.';
  }

  return text.length > 120
    ? `${text.substring(0, 120)}...`
    : text;
}


function escapeQuickNoteHTML(text) {
  const element = document.createElement('div');

  element.textContent = text || '';

  return element.innerHTML;
}


function formatQuickNoteDate(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/*
 * DASHBOARD QUICK ACTIONS
 */

const openDailyGoalsDashboard =
  document.getElementById(
    'open-daily-goals-dashboard'
  );


if (openDailyGoalsDashboard) {

  openDailyGoalsDashboard.addEventListener(
    'click',
    () => {

      showPage(
        'daily-goals'
      );


      const dailyGoalsNav =
        [...navItems].find(
          item =>
            item.querySelector(
              'span:last-child'
            )?.textContent
              ?.trim() ===
            'Daily Goals'
        );


      setActiveNavigation(
        dailyGoalsNav
      );

    }
  );

}

/*
 * OPEN RHAPSODY FROM DASHBOARD
 */

const openRhapsodyDashboard =
  document.getElementById(
    'open-rhapsody-dashboard'
  );


if (openRhapsodyDashboard) {

  openRhapsodyDashboard.addEventListener(
    'click',
    () => {

      showPage(
        'rhapsody'
      );


      const rhapsodyNav =
        [...navItems].find(
          item =>
            item.querySelector(
              'span:last-child'
            )?.textContent
              ?.trim() ===
            'Rhapsody'
        );


      setActiveNavigation(
        rhapsodyNav
      );


      updateRhapsodyPageStatus();

    }
  );

}

/*
 * RHAPSODY READ NOW BUTTON
 */

const rhapsodyReadNow =
  document.getElementById(
    'rhapsody-read-now'
  );


if (rhapsodyReadNow) {

  rhapsodyReadNow.addEventListener(
    'click',
    async () => {

      await window.praxiAPI.openRhapsody();

      if (rhapsodyReaderBack) {

        rhapsodyReaderBack.classList.add(
          'visible'
        );

      }

    }
  );

}

const rhapsodyReflectionEdit =
  document.getElementById(
    'rhapsody-reflection-edit'
  );

if (rhapsodyReflectionEdit) {

  rhapsodyReflectionEdit.addEventListener(
    'click',
    () => {

      showRhapsodyCompletionPopup();

    }
  );

}

/* =========================================================
   PRAYER
   Prayer Requests
   ========================================================= */

const PRAYER_STORAGE_KEY =
  'praxiPrayerRequests';


let prayerRequests = [];


/*
 * Load saved prayer requests.
 */

function loadPrayerRequests() {

  try {

    const saved =
      localStorage.getItem(
        PRAYER_STORAGE_KEY
      );


    if (!saved) {

      prayerRequests = [];

      return;

    }


    const parsed =
      JSON.parse(saved);


    prayerRequests =
      Array.isArray(parsed)
        ? parsed
        : [];

  } catch (error) {

    console.error(
      'Failed to load prayer requests:',
      error
    );

    prayerRequests = [];

  }

}


/*
 * Save prayer requests.
 */

function savePrayerRequests() {

  try {

    localStorage.setItem(
      PRAYER_STORAGE_KEY,
      JSON.stringify(
        prayerRequests
      )
    );

  } catch (error) {

    console.error(
      'Failed to save prayer requests:',
      error
    );

  }

}


/*
 * Escape text before inserting
 * prayer data into HTML.
 */

function escapePrayerText(
  value
) {

  return String(value ?? '')
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );

}


/*
 * Render Prayer Requests.
 */

function renderPrayerRequests() {

  const container =
    document.getElementById(
      'prayer-requests-list'
    );


  const emptyState =
    document.getElementById(
      'prayer-empty-state'
    );


  if (!container) {
    return;
  }


  /*
   * Remove previously rendered
   * request cards.
   */

  container
    .querySelectorAll(
      '.prayer-request-item'
    )
    .forEach(
      item => item.remove()
    );


  /*
   * Show empty state when there
   * are no prayer requests.
   */

  if (
    !Array.isArray(prayerRequests) ||
    prayerRequests.length === 0
  ) {

    if (emptyState) {

      emptyState.style.display =
        'flex';

    }

    updatePrayerStats();

    return;

  }


  /*
   * Hide empty state.
   */

  if (emptyState) {

    emptyState.style.display =
      'none';

  }


  /*
   * Newest requests first.
   */

  const sortedRequests =
    [...prayerRequests]
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );


  sortedRequests.forEach(
    request => {

      const item =
        document.createElement(
          'article'
        );


      item.className =
        'prayer-request-item';


      const createdDate =
        request.createdAt
          ? new Date(
              request.createdAt
            )
          : new Date();


      const formattedDate =
        createdDate.toLocaleDateString(
          undefined,
          {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }
        );


      item.innerHTML = `
        <div class="prayer-request-content">

          <h3 class="prayer-request-title">
            ${escapePrayerText(
              request.title
            )}
          </h3>

          ${
            request.details
              ? `
                <p class="prayer-request-text">
                  ${escapePrayerText(
                    request.details
                  )}
                </p>
              `
              : ''
          }

          <div class="prayer-request-date">
            Added ${formattedDate}
          </div>

        </div>

                <div class="prayer-request-actions">

  <span
    class="prayer-request-status ${
      request.status === 'answered'
        ? 'answered'
        : ''
    }"
  >
    ${
      request.status === 'answered'
        ? '✓ Answered'
        : 'Active'
    }
  </span>

  ${
    request.status !== 'answered'
      ? `
        <button
          type="button"
          class="prayer-mark-answered"
          data-prayer-id="${escapePrayerText(
            request.id
          )}"
        >
          Mark Answered
        </button>
      `
      : ''
  }

  <button
    type="button"
    class="prayer-edit-button"
    data-prayer-id="${escapePrayerText(
      request.id
    )}"
  >
    Edit
  </button>

  <button
    type="button"
    class="prayer-delete-button"
    data-prayer-id="${escapePrayerText(
      request.id
    )}"
  >
    Delete
  </button>

</div>
      `;


      container.appendChild(
        item
      );

    }
  );

  /*
   * Mark a prayer request as answered.
   */

  container
    .querySelectorAll(
      '.prayer-mark-answered'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const prayerId =
              button.dataset.prayerId;

            const request =
              prayerRequests.find(
                prayer =>
                  prayer.id === prayerId
              );

            if (!request) {
              return;
            }

            request.status =
              'answered';

            request.answeredAt =
              new Date().toISOString();

            savePrayerRequests();

            renderPrayerRequests();

          }
        );

      }
    );

/*
 * Edit Prayer Request.
 */

container
  .querySelectorAll(
    '.prayer-edit-button'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          const prayerId =
            button.dataset.prayerId;

          const request =
            prayerRequests.find(
              prayer =>
                prayer.id === prayerId
            );

          if (!request) {
            return;
          }

          const dialog =
            document.getElementById(
              'prayer-request-dialog'
            );

          const dialogTitle =
            document.getElementById(
              'prayer-dialog-title'
            );

          const titleInput =
            document.getElementById(
              'prayer-title-input'
            );

          const detailsInput =
            document.getElementById(
              'prayer-details-input'
            );

          if (!dialog || !titleInput) {
            return;
          }

          /*
           * Store which prayer is being edited.
           */
          dialog.dataset.editingPrayerId =
            request.id;

          /*
           * Change the dialog into Edit mode.
           */
          if (dialogTitle) {
            dialogTitle.textContent =
              'Edit Prayer Request';
          }

          /*
           * Fill the existing prayer data.
           */
          titleInput.value =
            request.title || '';

          if (detailsInput) {
            detailsInput.value =
              request.details || '';
          }

          /*
           * Open the dialog.
           */
          dialog.classList.remove(
            'hidden'
          );

          setTimeout(
            () => {
              titleInput.focus();
            },
            100
          );

        }
      );

    }
  );

/*
 * Delete Prayer Request.
 */

container
  .querySelectorAll(
    '.prayer-delete-button'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          const prayerId =
            button.dataset.prayerId;

          const request =
            prayerRequests.find(
              prayer =>
                prayer.id === prayerId
            );

          if (!request) {
            return;
          }

          const confirmed =
            window.confirm(
              `Delete "${request.title}" from your prayer requests?`
            );

          if (!confirmed) {
            return;
          }

          prayerRequests =
            prayerRequests.filter(
              prayer =>
                prayer.id !== prayerId
            );

          savePrayerRequests();

          renderPrayerRequests();

        }
      );

    }
  );

  updatePrayerStats();

}


/*
 * Update Prayer statistics.
 */

function updatePrayerStats() {

  const activeRequests =
    prayerRequests.filter(
      request =>
        request.status !== 'answered'
    );


  const answeredRequests =
    prayerRequests.filter(
      request =>
        request.status === 'answered'
    );


  const activeCount =
    document.getElementById(
      'prayer-active-count'
    );


  const answeredCount =
    document.getElementById(
      'prayer-answered-count'
    );


  const monthCount =
    document.getElementById(
      'prayer-month-count'
    );


  if (activeCount) {

    activeCount.textContent =
      activeRequests.length;

  }


  if (answeredCount) {

    answeredCount.textContent =
      answeredRequests.length;

  }


  /*
   * Count requests created during
   * the current calendar month.
   */

  const now =
    new Date();


  const currentYear =
    now.getFullYear();


  const currentMonth =
    now.getMonth();


  const thisMonth =
    prayerRequests.filter(
      request => {

        if (!request.createdAt) {
          return false;
        }


        const date =
          new Date(
            request.createdAt
          );


        return (
          date.getFullYear() ===
            currentYear &&
          date.getMonth() ===
            currentMonth
        );

      }
    );


  if (monthCount) {

    monthCount.textContent =
      thisMonth.length;

  }


  /*
   * Update Home dashboard.
   */

  const dashboardPrayerCount =
    document.getElementById(
      'dashboard-prayer-count'
    );


  if (dashboardPrayerCount) {

    dashboardPrayerCount.textContent =
      activeRequests.length;

  }

}


/*
 * Open the Add Prayer Request dialog.
 */

function openPrayerRequestDialog() {

  const dialog =
    document.getElementById(
      'prayer-request-dialog'
    );

  if (!dialog) {
    return;
  }

  const dialogTitle =
    document.getElementById(
      'prayer-dialog-title'
    );

  const titleInput =
    document.getElementById(
      'prayer-title-input'
    );

  const detailsInput =
    document.getElementById(
      'prayer-details-input'
    );

  /*
   * Clear edit mode.
   */
  dialog.dataset.editingPrayerId = '';

  /*
   * Restore Add mode.
   */
  if (dialogTitle) {
    dialogTitle.textContent =
      'Add Prayer Request';
  }

  /*
   * Clear the form.
   */
  if (titleInput) {
    titleInput.value = '';
  }

  if (detailsInput) {
    detailsInput.value = '';
  }

  /*
   * Show the dialog.
   */
  dialog.classList.remove(
    'hidden'
  );

  /*
   * Focus the title field.
   */
  setTimeout(
    () => {

      if (titleInput) {
        titleInput.focus();
      }

    },
    100
  );

}


/*
 * Close the Prayer Request dialog.
 */

function closePrayerRequestDialog() {

  const dialog =
    document.getElementById(
      'prayer-request-dialog'
    );

  if (!dialog) {
    return;
  }

  const dialogTitle =
    document.getElementById(
      'prayer-dialog-title'
    );

  /*
   * Clear edit mode.
   */
  dialog.dataset.editingPrayerId = '';

  /*
   * Restore Add mode for the
   * next time the dialog opens.
   */
  if (dialogTitle) {
    dialogTitle.textContent =
      'Add Prayer Request';
  }

  dialog.classList.add(
    'hidden'
  );

}


/*
 * Save a new Prayer Request.
 */

function savePrayerRequest() {
  const titleInput =
    document.getElementById(
      'prayer-title-input'
    );

  const detailsInput =
    document.getElementById(
      'prayer-details-input'
    );

  const dialog =
    document.getElementById(
      'prayer-request-dialog'
    );

  if (!titleInput || !dialog) {
    return;
  }

  const title =
    titleInput.value.trim();

  const details =
    detailsInput
      ? detailsInput.value.trim()
      : '';

  if (!title) {
    titleInput.focus();
    return;
  }

  const editingPrayerId =
    dialog.dataset.editingPrayerId;

  /*
   * Editing an existing prayer.
   */
  if (editingPrayerId) {

    const request =
      prayerRequests.find(
        prayer =>
          prayer.id ===
          editingPrayerId
      );

    if (!request) {
      return;
    }

    request.title =
      title;

    request.details =
      details;

    savePrayerRequests();

    renderPrayerRequests();

    closePrayerRequestDialog();

    return;
  }

  /*
   * Creating a new prayer.
   */
  const newRequest = {
    id:
      `prayer-${Date.now()}`,

    title,

    details,

    status:
      'active',

    createdAt:
      new Date().toISOString(),

    answeredAt:
      null
  };

  prayerRequests.push(
    newRequest
  );

  savePrayerRequests();

  renderPrayerRequests();

  closePrayerRequestDialog();
}


/*
 * Add Prayer Request buttons.
 */

const addPrayerRequestButton =
  document.getElementById(
    'add-prayer-request-button'
  );


const prayerEmptyAddButton =
  document.getElementById(
    'prayer-empty-add-button'
  );


if (addPrayerRequestButton) {

  addPrayerRequestButton.addEventListener(
    'click',
    openPrayerRequestDialog
  );

}


if (prayerEmptyAddButton) {

  prayerEmptyAddButton.addEventListener(
    'click',
    openPrayerRequestDialog
  );

}


/*
 * Cancel button.
 */

const cancelPrayerButton =
  document.getElementById(
    'cancel-prayer-button'
  );


if (cancelPrayerButton) {

  cancelPrayerButton.addEventListener(
    'click',
    closePrayerRequestDialog
  );

}


/*
 * Save button.
 */

const savePrayerButton =
  document.getElementById(
    'save-prayer-button'
  );


if (savePrayerButton) {

  savePrayerButton.addEventListener(
    'click',
    savePrayerRequest
  );

}


/*
 * Allow Enter to save when the
 * title field is active.
 */

const prayerTitleInput =
  document.getElementById(
    'prayer-title-input'
  );


if (prayerTitleInput) {

  prayerTitleInput.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Enter'
      ) {

        event.preventDefault();

        savePrayerRequest();

      }

    }
  );

}


/*
 * Close dialog when clicking
 * outside the modal.
 */

const prayerDialog =
  document.getElementById(
    'prayer-request-dialog'
  );


if (prayerDialog) {

  prayerDialog.addEventListener(
    'click',
    event => {

      if (
        event.target ===
        prayerDialog
      ) {

        closePrayerRequestDialog();

      }

    }
  );

}


/*
 * Dashboard Prayer button.
 */

const openPrayerDashboard =
  document.getElementById(
    'open-prayer-dashboard'
  );


if (openPrayerDashboard) {

  openPrayerDashboard.addEventListener(
    'click',
    () => {

      showPage(
        'prayer'
      );


      const prayerNav =
        [...navItems].find(
          item =>
            item.querySelector(
              'span:last-child'
            )?.textContent
              ?.trim() ===
            'Prayer'
        );


      setActiveNavigation(
        prayerNav
      );

    }
  );

}

/*
 * Render Prayer History.
 */
function renderPrayerHistory() {
  const container =
    document.getElementById(
      'prayer-history-list'
    );

  if (!container) {
    return;
  }

  container.innerHTML = '';

  const answeredRequests =
    prayerRequests
      .filter(
        request =>
          request.status === 'answered'
      )
      .sort(
        (a, b) =>
          new Date(
            b.answeredAt ||
            b.createdAt
          ) -
          new Date(
            a.answeredAt ||
            a.createdAt
          )
      );

  if (
    answeredRequests.length === 0
  ) {
    container.innerHTML = `
      <div class="prayer-history-empty">

        <div class="prayer-history-empty-icon">
          ✨
        </div>

        <h3>
          No answered prayers yet.
        </h3>

        <p>
          When you mark a prayer request as answered,
          it will appear here as part of your prayer journey.
        </p>

      </div>
    `;

    return;
  }

  answeredRequests.forEach(
    request => {

      const createdDate =
        request.createdAt
          ? new Date(
              request.createdAt
            )
          : null;

      const answeredDate =
        request.answeredAt
          ? new Date(
              request.answeredAt
            )
          : null;

      const formattedCreatedDate =
        createdDate
          ? createdDate.toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }
            )
          : '';

      const formattedAnsweredDate =
        answeredDate
          ? answeredDate.toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }
            )
          : '';

      const item =
        document.createElement(
          'article'
        );

      item.className =
        'prayer-history-item';

      item.innerHTML = `
        <div class="prayer-history-item-icon">
          ✓
        </div>

        <div class="prayer-history-item-content">

          <div class="prayer-history-item-top">

            <h3>
              ${escapePrayerText(
                request.title
              )}
            </h3>

            <span class="prayer-history-answered">
              Answered
            </span>

          </div>

          ${
            request.details
              ? `
                <p>
                  ${escapePrayerText(
                    request.details
                  )}
                </p>
              `
              : ''
          }

          <div class="prayer-history-dates">

            <span>
              Prayed:
              ${formattedCreatedDate}
            </span>

            ${
              formattedAnsweredDate
                ? `
                  <span>
                    Answered:
                    ${formattedAnsweredDate}
                  </span>
                `
                : ''
            }

          </div>

        </div>
      `;

      container.appendChild(
        item
      );
    }
  );
}

/*
 * Open Prayer History.
 */
function openPrayerHistory() {
  const dialog =
    document.getElementById(
      'prayer-history-dialog'
    );

  if (!dialog) {
    return;
  }

  renderPrayerHistory();

  dialog.classList.remove(
    'hidden'
  );
}

/*
 * Close Prayer History.
 */
function closePrayerHistory() {
  const dialog =
    document.getElementById(
      'prayer-history-dialog'
    );

  if (!dialog) {
    return;
  }

  dialog.classList.add(
    'hidden'
  );
}

/*
 * Prayer History button.
 */
const viewPrayerHistoryButton =
  document.getElementById(
    'view-prayer-history-button'
  );

if (viewPrayerHistoryButton) {
  viewPrayerHistoryButton.addEventListener(
    'click',
    openPrayerHistory
  );
}

/*
 * Close Prayer History button.
 */
const closePrayerHistoryButton =
  document.getElementById(
    'close-prayer-history-button'
  );

if (closePrayerHistoryButton) {
  closePrayerHistoryButton.addEventListener(
    'click',
    closePrayerHistory
  );
}

/*
 * Close Prayer History when clicking
 * outside the dialog.
 */
const prayerHistoryDialog =
  document.getElementById(
    'prayer-history-dialog'
  );

if (prayerHistoryDialog) {
  prayerHistoryDialog.addEventListener(
    'click',
    event => {
      if (
        event.target ===
        prayerHistoryDialog
      ) {
        closePrayerHistory();
      }
    }
  );
}

/*
 * Pastor Chris Live Pray-A-Thon.
 */

const joinPrayathonButton =
  document.getElementById(
    'join-prayathon-button'
  );

const prayathonReaderBack =
  document.getElementById(
    'prayathon-reader-back'
  );

if (joinPrayathonButton) {

  joinPrayathonButton.addEventListener(
    'click',
    async () => {

      await window.praxiAPI.openPrayathon();

      if (prayathonReaderBack) {
        prayathonReaderBack.classList.add(
          'visible'
        );
      }

    }
  );

}

if (prayathonReaderBack) {

  prayathonReaderBack.addEventListener(
    'click',
    async () => {

      await window.praxiAPI.closePrayathon();

      prayathonReaderBack.classList.remove(
        'visible'
      );

      showPage('prayer');

      const prayerNav =
        [...navItems].find(
          item =>
            item.querySelector(
              'span:last-child'
            )?.textContent?.trim() ===
            'Prayer'
        );

      setActiveNavigation(
        prayerNav
      );

    }
  );

}

/*
 * Load Prayer data immediately.
 */

loadPrayerRequests();

renderPrayerRequests();


/*
 * Set up the confession button immediately.
 *
 * The button does not need to wait for
 * confessions.json to finish loading.
 */

setupConfessionButton();

setupConfessionDeclareButton();

loadConfessions()
  .then(
    () => {
      displayTodaysConfession();
      renderConfessionCategories();
    }
  );
  
  renderQuickNotes();

    /*
     * TOP-RIGHT SETTINGS BUTTON
     */
    const settingsButton =
      document.querySelector(
        '.topbar-actions .icon-button[title="Settings"]'
      );


    if (settingsButton) {

      settingsButton.addEventListener(
        'click',
        () => {

          /*
           * Find the sidebar Settings button
           * and activate it too.
           */
          const settingsNav =
            [...navItems].find(
              item =>
                item.querySelector(
                  'span:last-child'
                )?.textContent
                  ?.trim() ===
                'Settings'
            );


          setActiveNavigation(
            settingsNav
          );


          showPage(
            'settings'
          );

        }
      );

    }


    /*
     * TOP-RIGHT NOTIFICATIONS BUTTON
     */
    const notificationButton =
      document.querySelector(
        '.topbar-actions .icon-button[title="Notifications"]'
      );


        if (notificationButton) {

      notificationButton.addEventListener(
        'click',
        () => {

          const notificationNav =
            [...navItems].find(
              item =>
                item.querySelector(
                  'span:last-child'
                )?.textContent
                  ?.trim() ===
                'Notifications'
            );

          setActiveNavigation(
            notificationNav
          );

          showPage(
            'notifications'
          );

        }
      );

    }


    /*
     * SETTINGS SAVE BUTTON
     */
    const settingsSaveButton =
      document.getElementById(
        'settings-save-button'
      );

    if (settingsSaveButton) {

      settingsSaveButton.addEventListener(
        'click',
        () => {

          savePraxiSettings();

        }
      );

    }


    /*
     * TEST NOTIFICATION BUTTON
     */
    const testNotificationButton =
      document.getElementById(
        'settings-testNotification'
      );

    if (testNotificationButton) {

      testNotificationButton.addEventListener(
        'click',
        () => {

          sendTestNotification();

        }
      );

    }
	
	 /*
     * SETTINGS CORNER BUTTONS
     */
    const settingsCornerButtons =
      document.querySelectorAll(
        '.settings-corner-actions button'
      );

    settingsCornerButtons.forEach(
      (button) => {

        button.addEventListener(
          'click',
          () => {

            const horizontal =
              Number(
                button.dataset.horizontal
              );

            const vertical =
              Number(
                button.dataset.vertical
              );

            setSettingsCorner(
              horizontal,
              vertical
            );

          }
        );

      }
    );

/* =========================================================
   PRAXI SETTINGS
   Embedded Settings Page
   ========================================================= */

let praxiSettings = null;

function getSettingsElement(id) {
  return document.getElementById(`settings-${id}`);
}


function updateSettingsLabelValues() {

  const petSize =
    getSettingsElement('petSize');

  const animationSpeed =
    getSettingsElement('animationSpeed');

  const horizontalPosition =
    getSettingsElement('horizontalPosition');

  const verticalPosition =
    getSettingsElement('verticalPosition');

  const dormantEyeSize =
    getSettingsElement('dormantEyeSize');

  const dormantEyeRotation =
    getSettingsElement('dormantEyeRotation');


  const petSizeValue =
    getSettingsElement('petSizeValue');

  const animationSpeedValue =
    getSettingsElement('animationSpeedValue');

  const horizontalValue =
    getSettingsElement('horizontalValue');

  const verticalValue =
    getSettingsElement('verticalValue');

  const dormantEyeSizeValue =
    getSettingsElement('dormantEyeSizeValue');

  const dormantEyeRotationValue =
    getSettingsElement('dormantEyeRotationValue');


  if (petSize && petSizeValue) {
    petSizeValue.textContent =
      Number(petSize.value).toFixed(2) + '×';
  }


  if (animationSpeed && animationSpeedValue) {
    animationSpeedValue.textContent =
      Number(animationSpeed.value).toFixed(1) + '×';
  }


  if (horizontalPosition && horizontalValue) {
    horizontalValue.textContent =
      horizontalPosition.value + '%';
  }


  if (verticalPosition && verticalValue) {
    verticalValue.textContent =
      verticalPosition.value + '%';
  }


  if (dormantEyeSize && dormantEyeSizeValue) {
    dormantEyeSizeValue.textContent =
      Math.round(
        Number(dormantEyeSize.value)
      ) + ' px';
  }


  if (dormantEyeRotation && dormantEyeRotationValue) {
    dormantEyeRotationValue.textContent =
      Math.round(
        Number(dormantEyeRotation.value)
      ) + '°';
  }
}


function setSettingsCorner(
  horizontal,
  vertical
) {

  const horizontalPosition =
    getSettingsElement(
      'horizontalPosition'
    );

  const verticalPosition =
    getSettingsElement(
      'verticalPosition'
    );


  if (
    !horizontalPosition ||
    !verticalPosition
  ) {
    return;
  }


  horizontalPosition.value =
    horizontal;

  verticalPosition.value =
    vertical;


  updateSettingsLabelValues();
}

function applyPraxiTheme(theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

    root.dataset.theme =
      prefersDark ? 'dark' : 'light';

    return;
  }

  root.dataset.theme =
    theme === 'light'
      ? 'light'
      : 'dark';
}

function fillPraxiSettings(
  settings
) {

  if (!settings) {
    return;
  }


  const theme =
    getSettingsElement('theme');

  if (theme) {
    theme.value =
      settings.theme || 'dark';
  }

  applyPraxiTheme(
    settings.theme || 'dark'
  );


  praxiSettings = settings;


  getSettingsElement('enabled').checked =
    settings.enabled;

  getSettingsElement('alwaysOnTop').checked =
    settings.alwaysOnTop;

  getSettingsElement('soundEnabled').checked =
    settings.soundEnabled;


  getSettingsElement('petSize').value =
    settings.petSize;

  getSettingsElement('animationSpeed').value =
    settings.animationSpeed;


  getSettingsElement('horizontalPosition').value =
    settings.horizontalPosition ?? 0;

  getSettingsElement('verticalPosition').value =
    settings.verticalPosition ?? 100;


  getSettingsElement('dormantEyeSize').value =
    settings.dormantEyeSize ?? 90;

  getSettingsElement('dormantEyeRotation').value =
    settings.dormantEyeRotation ?? 0;


  getSettingsElement('breakIntervalMinutes').value =
    settings.breakIntervalMinutes ?? 20;

  getSettingsElement('workIntervalHours').value =
    settings.workIntervalHours ?? 2;

  getSettingsElement('rhapsodyStartTime').value =
    settings.rhapsodyStartTime ?? '07:00';

  getSettingsElement('rhapsodyIntervalHours').value =
    settings.rhapsodyIntervalHours ?? 1;

  getSettingsElement('userName').value = settings.userName ?? 'Xavier';

  getSettingsElement('breaksEnabled').checked =
    settings.reminders?.breaks?.enabled ?? false;

  getSettingsElement('rhapsodyEnabled').checked =
    settings.reminders?.rhapsody?.enabled ?? false;

  getSettingsElement('greetingsEnabled').checked =
    settings.reminders?.greetings?.enabled ?? false;

  getSettingsElement('workEnabled').checked =
    settings.reminders?.work?.enabled ?? false;


  getSettingsElement('quietEnabled').checked =
    settings.quietHours?.enabled ?? false;

  getSettingsElement('quietStart').value =
    settings.quietHours?.start ?? '22:00';

  getSettingsElement('quietEnd').value =
    settings.quietHours?.end ?? '07:00';


  getSettingsElement('messagesEditor').value =
    JSON.stringify(
      settings.messageLibrary || {},
      null,
      2
    );


  updateSettingsLabelValues();
}


async function loadPraxiSettings() {

  try {

    const settings =
      await window.praxiAPI.getSettings();

    fillPraxiSettings(
      settings
    );

  } catch (error) {

    console.error(
      'Failed to load Praxi settings:',
      error
    );

  }
}


/* ---------------------------------------------------------
   Native reminders (Android)
   ---------------------------------------------------------
   The phone's system notifications are scheduled by the native
   layer (AlarmManager + NotificationManager) from the very same
   settings + message pools the app already uses, so the two
   always agree.
   --------------------------------------------------------- */

function nativeRemindersPayload() {
  return JSON.stringify({
    settings: praxiSettings || {},

    messages:
      window.PraxiStore &&
      typeof window.PraxiStore.getMessages === 'function'
        ? window.PraxiStore.getMessages()
        : {}
  });
}

function scheduleNativeReminders() {
  try {
    if (
      window.PraxiNative &&
      typeof window.PraxiNative.scheduleReminders ===
        'function'
    ) {
      window.PraxiNative.scheduleReminders(
        nativeRemindersPayload()
      );

      return true;
    }
  } catch (error) {
    console.warn(
      'Could not schedule native reminders:',
      error
    );
  }

  return false;
}

function setNotifStatus(message, kind) {
  const el =
    document.getElementById(
      'settings-notif-status'
    );

  if (!el) {
    return;
  }

  el.textContent = message || '';

  el.className =
    'settings-tip' +
    (kind ? ' ' + kind : '');
}

function sendTestNotification() {
  try {
    if (
      window.PraxiNative &&
      typeof window.PraxiNative.postTestNotification ===
        'function'
    ) {
      window.PraxiNative.postTestNotification(
        nativeRemindersPayload()
      );

      setNotifStatus(
        'Test notification sent — look in your status bar.',
        'success'
      );

      return;
    }
  } catch (error) {
    console.warn(
      'Could not post native test notification:',
      error
    );
  }

  setNotifStatus(
    'Notifications only fire in the installed Android app.',
    'warn'
  );
}


async function savePraxiSettings() {

  if (!praxiSettings) {
    return;
  }


  const settings =
    praxiSettings;

settings.theme =
  getSettingsElement(
    'theme'
  )?.value || 'dark';

  settings.enabled =
    getSettingsElement(
      'enabled'
    ).checked;


  settings.alwaysOnTop =
    getSettingsElement(
      'alwaysOnTop'
    ).checked;


  settings.soundEnabled =
    getSettingsElement(
      'soundEnabled'
    ).checked;


  settings.petSize =
    Number(
      getSettingsElement(
        'petSize'
      ).value
    );


  settings.animationSpeed =
    Number(
      getSettingsElement(
        'animationSpeed'
      ).value
    );


  settings.horizontalPosition =
    Number(
      getSettingsElement(
        'horizontalPosition'
      ).value
    );


  settings.verticalPosition =
    Number(
      getSettingsElement(
        'verticalPosition'
      ).value
    );


  settings.dormantEyeSize =
    Number(
      getSettingsElement(
        'dormantEyeSize'
      ).value
    );


  settings.dormantEyeRotation =
    Number(
      getSettingsElement(
        'dormantEyeRotation'
      ).value
    );


  settings.breakIntervalMinutes =
    Math.max(
      1,
      Number(
        getSettingsElement(
          'breakIntervalMinutes'
        ).value
      ) || 20
    );


  settings.workIntervalHours =
    Math.min(
      12,
      Math.max(
        1,
        Number(
          getSettingsElement(
            'workIntervalHours'
          ).value
        ) || 2
      )
    );


  settings.rhapsodyStartTime =
    getSettingsElement(
      'rhapsodyStartTime'
    ).value || '07:00';


  settings.rhapsodyIntervalHours =
    Math.min(
      12,
      Math.max(
        1,
        Number(
          getSettingsElement(
            'rhapsodyIntervalHours'
          ).value
        ) || 1
      )
    );


  settings.userName =
    getSettingsElement(
      'userName'
    ).value || 'Xavier';


  // Normalise the reminder flags. Older builds stored these as
  // plain booleans, so coerce anything that is not an object into
  // the { enabled } shape before writing.
  settings.reminders =
    settings.reminders || {};

  ['breaks', 'rhapsody', 'greetings', 'work'].forEach(
    (key) => {

      if (
        !settings.reminders[key] ||
        typeof settings.reminders[key] !== 'object'
      ) {

        settings.reminders[key] = {
          enabled: !!settings.reminders[key]
        };

      }

    }
  );


  settings.reminders.breaks.enabled =
    getSettingsElement(
      'breaksEnabled'
    ).checked;


  settings.reminders.rhapsody.enabled =
    getSettingsElement(
      'rhapsodyEnabled'
    ).checked;


  settings.reminders.greetings.enabled =
    getSettingsElement(
      'greetingsEnabled'
    ).checked;


  settings.reminders.work.enabled =
    getSettingsElement(
      'workEnabled'
    ).checked;


  settings.quietHours.enabled =
    getSettingsElement(
      'quietEnabled'
    ).checked;


  settings.quietHours.start =
    getSettingsElement(
      'quietStart'
    ).value;


  settings.quietHours.end =
    getSettingsElement(
      'quietEnd'
    ).value;


  const status =
    getSettingsElement(
      'status'
    );


  try {

    settings.messageLibrary =
      JSON.parse(
        getSettingsElement(
          'messagesEditor'
        ).value || '{}'
      );

  } catch (error) {

    if (status) {

      status.textContent =
        'Message JSON has an error. Fix it before saving.';

      status.className =
        'warn';

    }

    return;
  }


  try {

  const savedSettings =
  await window.praxiAPI.saveSettings(
    settings
  );


applyPraxiTheme(
  savedSettings.theme || 'dark'
);


// Push the new cadence to the phone's notification scheduler.
const remindersScheduled =
  scheduleNativeReminders();


if (status) {

  status.textContent =
    remindersScheduled
      ? 'Saved ✓ — reminders updated'
      : 'Saved ✓';

  status.className =
    'success';

}

  } catch (error) {

    console.error(
      'Failed to save Praxi settings:',
      error
    );


    if (status) {

      status.textContent =
        'Could not save settings.';

      status.className =
        'warn';

    }

  }
}


async function pauseSettings(
  duration
) {

  try {

    await window.praxiAPI.pauseFor(
      duration
    );


    const status =
      getSettingsElement(
        'status'
      );


    if (status) {

      status.textContent =
        'Pause scheduled ✓';

      status.className =
        'success';

    }

  } catch (error) {

    console.error(
      'Failed to schedule Praxi pause:',
      error
    );

  }
}


function initializePraxiSettings() {

  const petSize =
    getSettingsElement(
      'petSize'
    );


  if (!petSize) {
    return;
  }

  const theme =
    getSettingsElement(
      'theme'
    );


  if (theme) {

    theme.addEventListener(
      'change',
      () => {

        applyPraxiTheme(
          theme.value
        );

      }
    );

  }

   [
    'petSize',
    'animationSpeed',
    'horizontalPosition',
    'verticalPosition',
    'dormantEyeSize',
    'dormantEyeRotation'
  ].forEach(
    (id) => {

      const element =
        getSettingsElement(id);

      if (element) {

        element.addEventListener(
          'input',
          updateSettingsLabelValues
        );

      }

    }
  );


  /*
   * Pause & recovery buttons
   */

  const pause30Button =
    document.getElementById(
      'pause-30-button'
    );

  const pause60Button =
    document.getElementById(
      'pause-60-button'
    );

  const pauseTomorrowButton =
    document.getElementById(
      'pause-tomorrow-button'
    );

  const bringBackButton =
    document.getElementById(
      'bring-back-button'
    );


  if (pause30Button) {

    pause30Button.addEventListener(
      'click',
      () => {
        pauseSettings(30);
      }
    );

  }


  if (pause60Button) {

    pause60Button.addEventListener(
      'click',
      () => {
        pauseSettings(60);
      }
    );

  }


  if (pauseTomorrowButton) {

    pauseTomorrowButton.addEventListener(
      'click',
      () => {
        pauseSettings('tomorrow');
      }
    );

  }


  if (bringBackButton) {

    bringBackButton.addEventListener(
      'click',
      () => {

        window.praxiAPI.bringBack();

      }
    );

  }


  loadPraxiSettings();
}


initializePraxiSettings();
/* =========================================================
   HOME DASHBOARD STATS
   ========================================================= */

async function loadDashboardStats() {

  try {

    const saved =
      await window.praxiAPI.getDailyGoals();


    if (!saved || !saved.today) {
      return;
    }


    /*
     * TODAY'S GOALS
     */

    const todayGoals =
      Array.isArray(saved.today.goals)
        ? saved.today.goals
        : [];


    const totalGoals =
      todayGoals.length;


    const completedGoals =
      todayGoals.filter(
        goal => goal.completed
      ).length;


    const percentage =
      totalGoals === 0
        ? 0
        : Math.round(
            (completedGoals / totalGoals) * 100
          );


    /*
     * Update Today's Goals stat.
     */

    const dashboardGoals =
      document.getElementById(
        'dashboard-goals'
      );


    if (dashboardGoals) {

      dashboardGoals.textContent =
        `${completedGoals} / ${totalGoals}`;

    }


    /*
     * Update Daily Goals progress.
     */

    const dashboardGoalsProgress =
      document.getElementById(
        'dashboard-goals-progress'
      );


    if (dashboardGoalsProgress) {

      dashboardGoalsProgress.textContent =
        `${completedGoals} / ${totalGoals}`;

    }


    /*
     * Update progress bar.
     */

    const dashboardGoalsProgressBar =
      document.getElementById(
        'dashboard-goals-progress-bar'
      );


    if (dashboardGoalsProgressBar) {

  dashboardGoalsProgressBar.style.width =
    `${percentage}%`;

  dashboardGoalsProgressBar.style.minWidth =
    '0';

}


    const rhapsodyStatus =
  await window.praxiAPI.getRhapsodyStatus();

/*
 * CURRENT STREAK
 *
 * Keep the Home dashboard synchronized
 * with the Rhapsody streak.
 */

const rhapsodyStreak =
  Number(rhapsodyStatus?.streak) || 0;

const dashboardStreak =
  document.getElementById(
    'dashboard-streak'
  );

if (dashboardStreak) {
  dashboardStreak.textContent =
    `${rhapsodyStreak} ${
      rhapsodyStreak === 1
        ? 'day'
        : 'days'
    }`;
}


/*
 * TODAY'S RHAPSODY
 */




const dashboardRhapsody =
  document.getElementById(
    'dashboard-rhapsody'
  );


if (dashboardRhapsody) {

  dashboardRhapsody.textContent =
    rhapsodyStatus &&
    rhapsodyStatus.read
      ? 'Read'
      : 'Unread';

}


const dashboardRhapsodyStatus =
  document.getElementById(
    'dashboard-rhapsody-status'
  );


const dashboardRhapsodyStatusDot =
  document.getElementById(
    'dashboard-rhapsody-status-dot'
  );


if (rhapsodyStatus?.read) {

  if (dashboardRhapsodyStatus) {

    dashboardRhapsodyStatus.textContent =
      'Read today';

  }

  if (dashboardRhapsodyStatusDot) {

    dashboardRhapsodyStatusDot.classList.add(
      'read'
    );

  }

} else {

  if (dashboardRhapsodyStatus) {

    dashboardRhapsodyStatus.textContent =
      'Not read yet';

  }

  if (dashboardRhapsodyStatusDot) {

    dashboardRhapsodyStatusDot.classList.remove(
      'read'
    );

  }

}

/*
 * MOMENTS
 */

const moments =
  await window.praxiAPI.getMoments();


const dashboardMoments =
  document.getElementById(
    'dashboard-moments'
  );


if (dashboardMoments) {

  dashboardMoments.textContent =
    Array.isArray(moments)
      ? moments.length
      : 0;

}

  } catch (error) {

    console.error(
      'Failed to load Home dashboard stats:',
      error
    );

  }

}

loadDashboardStats();

window.addEventListener(
  'focus',
  () => {
    loadDashboardStats();
  }
);

  /* Expose navigation to other modules (mobile chrome / widget buttons). */
  window.PraxiNav = showPage;

/*
 * Close the main Praxi Home DOMContentLoaded handler.
 */
  }
);

/* =========================================================
   PRAYER SCRIPTURE ROTATION
   ========================================================= */

const prayerScriptures = [
  {
    text:
      "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.",
    reference: "Jeremiah 33:3"
  },

  {
    text:
      "I will be with him in trouble; I will deliver him, and honour him.",
    reference: "Psalm 91:15"
  },

  {
    text:
      "Pray without ceasing.",
    reference: "1 Thessalonians 5:17"
  },

  {
    text:
      "Men ought always to pray, and not to faint.",
    reference: "Luke 18:1"
  },

  {
    text:
      "Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered.",
    reference: "Romans 8:26"
  },

  {
    text:
      "Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.",
    reference: "Mark 11:24"
  },

  {
    text:
      "And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us.",
    reference: "1 John 5:14"
  },

  {
    text:
      "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
    reference: "Philippians 4:6"
  },

  {
    text:
      "The effectual fervent prayer of a righteous man availeth much.",
    reference: "James 5:16"
  },

  {
    text:
      "Again I say unto you, That if two of you shall agree on earth as touching any thing that they shall ask, it shall be done for them of my Father which is in heaven.",
    reference: "Matthew 18:19"
  }
];

let prayerScriptureIndex = 0;

const prayerScripture =
  document.querySelector(
    '.prayer-scripture'
  );

const prayerScriptureText =
  document.getElementById(
    'prayer-scripture-text'
  );

const prayerScriptureReference =
  document.getElementById(
    'prayer-scripture-reference'
  );


function rotatePrayerScripture() {

  const prayerPage =
    document.getElementById(
      'page-prayer'
    );

  if (
    !prayerPage ||
    !prayerPage.classList.contains('active') ||
    !prayerScripture ||
    !prayerScriptureText ||
    !prayerScriptureReference
  ) {
    return;
  }

  prayerScripture.classList.add(
    'is-changing'
  );

  setTimeout(() => {

    prayerScriptureIndex =
      (prayerScriptureIndex + 1) %
      prayerScriptures.length;

    const scripture =
      prayerScriptures[
        prayerScriptureIndex
      ];

    prayerScriptureText.textContent =
      scripture.text;

    prayerScriptureReference.textContent =
      scripture.reference;

    prayerScripture.classList.remove(
      'is-changing'
    );

  }, 280);
}


setInterval(
  rotatePrayerScripture,
  5000
);