/* =========================================================
   PRAXI DAILY GOALS
   ========================================================= */

/* =========================================================
   THEME
   ========================================================= */

function applyDailyGoalsTheme(theme) {

  let resolvedTheme = theme;

  if (theme === 'system') {

    const prefersDark =
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

    resolvedTheme =
      prefersDark
        ? 'dark'
        : 'light';
  }

  document.documentElement.dataset.theme =
    resolvedTheme === 'light'
      ? 'light'
      : 'dark';
}


const addGoalDialog =
  document.getElementById(
    'addGoalDialog'
  );

const goalInput =
  document.getElementById(
    'goalInput'
  );

const cancelGoalButton =
  document.getElementById(
    'cancelGoalButton'
  );

const confirmGoalButton =
  document.getElementById(
    'confirmGoalButton'
  );

const todaySection =
  document.getElementById(
    'todaySection'
  );

const historySection =
  document.getElementById(
    'historySection'
  );

const todayGoals =
  document.getElementById(
    'todayGoals'
  );

const goalHistory =
  document.getElementById(
    'goalHistory'
  );

const addGoalButton =
  document.getElementById(
    'addGoalButton'
  );

const todayProgress =
  document.getElementById(
    'todayProgress'
  );

const progressBar =
  document.getElementById(
    'progressBar'
  );

const tabButtons =
  document.querySelectorAll(
    '.daily-goals-tab'
  );


/* =========================================================
   DAILY GOALS DATA
   ========================================================= */

let todayGoalsData = [];
let historyData = [];
let startedNewDay = false;

const currentDate =
  new Date().toLocaleDateString('en-CA');

/* =========================================================
   LOAD SAVED DATA
   ========================================================= */

async function loadDailyGoals() {

  try {

    const saved =
      await window.praxiAPI.getDailyGoals();


    if (
      !saved ||
      !saved.today
    ) {

      todayGoalsData = [];

      historyData = [];

      return;
    }


    historyData =
      Array.isArray(
        saved.history
      )
        ? saved.history
        : [];


    /*
     * Check whether the saved goals belong
     * to today or to a previous day.
     */
    if (
  saved.today.date !==
  currentDate
) {

  startedNewDay = true;

  /*
   * If there was a previous day's goal data,
   * archive it before starting a fresh day.
   */
      /*
       * If there was a previous day's goal data,
       * archive it before starting a fresh day.
       */
      if (
        saved.today.date &&
        Array.isArray(saved.today.goals) &&
        saved.today.goals.length
      ) {

        historyData.unshift({
          date: saved.today.date,
          goals: saved.today.goals
        });

      }


      /*
       * Start today with a completely fresh list.
       */
      todayGoalsData = [];


      /*
       * Save the rollover immediately so we don't
       * archive the same day again next time.
       */
      await window.praxiAPI.saveDailyGoals({
        today: {
          date: currentDate,
          goals: []
        },

        history: historyData
      });

    } else {

      todayGoalsData =
        Array.isArray(
          saved.today.goals
        )
          ? saved.today.goals
          : [];

    }

  } catch (error) {

    console.error(
      'Failed to load Daily Goals:',
      error
    );

    todayGoalsData = [];

    historyData = [];
  }
}

/* =========================================================
   SAVE DATA
   ========================================================= */

async function saveDailyGoals() {

  try {

    await window.praxiAPI.saveDailyGoals({

      today: {
        date: currentDate,
        goals: todayGoalsData
      },

      history: historyData,

      newDay: startedNewDay

    });

  } catch (error) {

    console.error(
      'Failed to save Daily Goals:',
      error
    );
  }
}


/* =========================================================
   TAB SWITCHING
   ========================================================= */

tabButtons.forEach((button) => {

  button.addEventListener(
    'click',
    () => {

      const tab =
        button.dataset.tab;


      tabButtons.forEach(
        (tabButton) => {

          tabButton.classList.remove(
            'active'
          );

        }
      );


      button.classList.add(
        'active'
      );


      if (tab === 'today') {

        todaySection.classList.remove(
          'hidden'
        );

        historySection.classList.add(
          'hidden'
        );

      } else {

        todaySection.classList.add(
          'hidden'
        );

        historySection.classList.remove(
          'hidden'
        );

      }

    }
  );

});


/* =========================================================
   RENDER TODAY'S GOALS
   ========================================================= */

function renderTodayGoals() {

  todayGoals.innerHTML = '';


  if (
    todayGoalsData.length === 0
  ) {

    todayGoals.innerHTML = `
      <div class="empty-state">

        <strong>
          No goals yet
        </strong>

        Add something you'd like
        to accomplish today.

      </div>
    `;

    updateProgress();

    return;
  }


  todayGoalsData.forEach(
    (goal) => {

      const card =
        document.createElement(
          'div'
        );


      card.className =
        'goal-card';


      if (goal.completed) {

        card.classList.add(
          'completed'
        );

      }


      const checkbox =
        document.createElement(
          'input'
        );


      checkbox.type =
        'checkbox';


      checkbox.className =
        'goal-checkbox';


      checkbox.checked =
        goal.completed;


      checkbox.addEventListener(
  'change',
  async () => {
    goal.completed =
      checkbox.checked;

    card.classList.toggle(
      'completed',
      goal.completed
    );

    updateProgress();

    await saveDailyGoals();

    if (goal.completed) {

  const total =
    todayGoalsData.length;

  const completed =
    todayGoalsData.filter(
      (item) =>
        item.completed
    ).length;

  const remaining =
    total - completed;

  await window.praxiAPI.emitBehavior(
    'goal.completed',
    {
      goalId: goal.id,
      title: goal.title,
      completed,
      total,
      remaining,
      allCompleted:
        total > 0 &&
        completed === total
    }
  );
}
  }
);


      const title =
        document.createElement(
          'div'
        );


      title.className =
        'goal-title';


      title.textContent =
        goal.title;


      /* =====================================================
         EDIT GOAL BUTTON
         ===================================================== */

      const editButton =
        document.createElement(
          'button'
        );


      editButton.type =
        'button';


      editButton.className =
        'edit-goal-button';


      editButton.textContent =
        '✏️';


      editButton.title =
        'Edit goal';


      editButton.addEventListener(
        'click',
        () => {

          openEditGoalDialog(
            goal
          );

        }
      );


      card.appendChild(
        checkbox
      );


      card.appendChild(
        title
      );


      card.appendChild(
        editButton
      );


      todayGoals.appendChild(
        card
      );

    }
  );


  updateProgress();
}

/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {

  const total =
    todayGoalsData.length;


  const completed =
    todayGoalsData.filter(
      (goal) =>
        goal.completed
    ).length;


  const percentage =
    total === 0
      ? 0
      : Math.round(
          (completed / total) *
          100
        );


  todayProgress.querySelector(
    '.progress-text strong'
  ).textContent =
    `${completed} / ${total} completed`;


  progressBar.style.width =
    `${percentage}%`;
}

/* =========================================================
   ADD / EDIT GOAL
   ========================================================= */

let editingGoal = null;


/* =========================================================
   OPEN ADD GOAL DIALOG
   ========================================================= */

function openAddGoalDialog() {

  editingGoal = null;


  addGoalDialog.classList.remove(
    'hidden'
  );


  addGoalDialog
    .querySelector('h2')
    .textContent =
      'Add Daily Goal';


  addGoalDialog
    .querySelector('p')
    .textContent =
      'What would you like to accomplish today?';


  confirmGoalButton.textContent =
    'Add Goal';


  goalInput.value = '';


  setTimeout(
    () => {

      goalInput.focus();

    },
    50
  );
}


/* =========================================================
   OPEN EDIT GOAL DIALOG
   ========================================================= */

function openEditGoalDialog(
  goal
) {

  editingGoal =
    goal;


  addGoalDialog.classList.remove(
    'hidden'
  );


  addGoalDialog
    .querySelector('h2')
    .textContent =
      'Edit Daily Goal';


  addGoalDialog
    .querySelector('p')
    .textContent =
      'Update your goal below.';


  confirmGoalButton.textContent =
    'Save Changes';


  goalInput.value =
    goal.title;


  setTimeout(
    () => {

      goalInput.focus();

      goalInput.select();

    },
    50
  );
}


/* =========================================================
   CLOSE GOAL DIALOG
   ========================================================= */

function closeAddGoalDialog() {

  addGoalDialog.classList.add(
    'hidden'
  );


  goalInput.value = '';


  editingGoal = null;


  addGoalDialog
    .querySelector('h2')
    .textContent =
      'Add Daily Goal';


  addGoalDialog
    .querySelector('p')
    .textContent =
      'What would you like to accomplish today?';


  confirmGoalButton.textContent =
    'Add Goal';
}


/* =========================================================
   ADD GOAL BUTTON
   ========================================================= */

addGoalButton.addEventListener(
  'click',
  () => {

    openAddGoalDialog();

  }
);


/* =========================================================
   CANCEL BUTTON
   ========================================================= */

cancelGoalButton.addEventListener(
  'click',
  () => {

    closeAddGoalDialog();

  }
);


/* =========================================================
   CONFIRM ADD / EDIT
   ========================================================= */

confirmGoalButton.addEventListener(
  'click',
  async () => {

    const title =
      goalInput.value.trim();


    if (!title) {

      goalInput.focus();

      return;
    }


    /* -----------------------------------------------------
       EDIT EXISTING GOAL
       ----------------------------------------------------- */

    if (editingGoal) {

      editingGoal.title =
        title;


      await saveDailyGoals();


      closeAddGoalDialog();

      renderTodayGoals();

      return;
    }


    /* -----------------------------------------------------
       ADD NEW GOAL
       ----------------------------------------------------- */

    const newGoal = {
  id: Date.now(),
  title: title,
  completed: false
};

todayGoalsData.push(
  newGoal
);

await saveDailyGoals();

await window.praxiAPI.recordMoment(
  'goal.created',
  {
    goalId: newGoal.id,
    title: newGoal.title
  }
);

closeAddGoalDialog();
renderTodayGoals();

  }
);


/* =========================================================
   KEYBOARD SHORTCUTS
   ========================================================= */
goalInput.addEventListener(
  'keydown',
  (event) => {

    if (
      event.key === 'Enter'
    ) {

      event.preventDefault();

      confirmGoalButton.click();

    }


    if (
      event.key === 'Escape'
    ) {

      closeAddGoalDialog();

    }

  }
);

/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderHistory() {

  goalHistory.innerHTML = '';


  if (
    historyData.length === 0
  ) {

    goalHistory.innerHTML = `
      <div class="empty-state">

        <strong>
          No history yet
        </strong>

        Your completed days
        will appear here.

      </div>
    `;

    return;
  }


  historyData.forEach(
    (day) => {

      const dayCard =
        document.createElement(
          'article'
        );


      dayCard.className =
        'history-day';


      const date =
        document.createElement(
          'div'
        );


      date.className =
        'history-date';


      date.textContent =
        `📅 ${day.date}`;


      const goals =
        document.createElement(
          'div'
        );


      goals.className =
        'history-goals';


      let completedCount = 0;


      day.goals.forEach(
        (goal) => {

          if (goal.completed) {

            completedCount++;

          }


          const goalRow =
            document.createElement(
              'div'
            );


          goalRow.className =
            'history-goal';


          if (goal.completed) {

            goalRow.classList.add(
              'completed'
            );

          }


          const box =
            document.createElement(
              'span'
            );


          box.className =
            'history-goal-box';


          box.textContent =
            goal.completed
              ? '✓'
              : '';


          const title =
            document.createElement(
              'span'
            );


          title.className =
            'history-goal-title';


          title.textContent =
            goal.title;


          goalRow.appendChild(
            box
          );


          goalRow.appendChild(
            title
          );


          goals.appendChild(
            goalRow
          );

        }
      );


      const summary =
        document.createElement(
          'div'
        );


      summary.className =
        'history-summary';


      summary.textContent =
        `${completedCount} / ${day.goals.length} completed`;


      dayCard.appendChild(
        date
      );


      dayCard.appendChild(
        goals
      );


      dayCard.appendChild(
        summary
      );


      goalHistory.appendChild(
        dayCard
      );

    }
  );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeDailyGoals() {

  /* -----------------------------------------------------
     Load and apply the saved Praxi theme
     ----------------------------------------------------- */

  try {

    const settings =
      await window.praxiAPI.getSettings();

    applyDailyGoalsTheme(
      settings?.theme || 'dark'
    );

  } catch (error) {

    console.error(
      'Failed to load Praxi theme:',
      error
    );

    applyDailyGoalsTheme('dark');
  }


  /* -----------------------------------------------------
     Load Daily Goals
     ----------------------------------------------------- */

  await loadDailyGoals();

  renderTodayGoals();

  renderHistory();
}


initializeDailyGoals();

window.praxiAPI.onOpenAddGoalDialog(() => {
  openAddGoalDialog();
});