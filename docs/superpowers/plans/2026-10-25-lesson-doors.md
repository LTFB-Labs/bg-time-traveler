# The way into lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A lesson list that mirrors the textbook, three doors into it (the start screen, the free map, a lesson's header), and a button in the settings that deletes the child's progress.

**Architecture:** The build already turns each grade's `index.json` into `CONTENT.grades`; it gains a check for lessons listed without a file (the unready ones). A new module `js/lesson-list.js` holds a pure function that turns a grade's entries and the saved progress into rows, tested in node, and draws the list screen at a new address, `#lessons`. The progress store gains a reset that keeps the marker look; the settings menu calls it after a second click.

**Tech Stack:** Plain ES modules in the browser, no bundler; Node's built-in test runner (`npm --prefix tools test`); the content build (`npm --prefix tools run build`).

**Spec:** `docs/superpowers/specs/2026-10-25-free-map-search-lessons-album-design.md`, section 5 (with sections 2 and 8 for goals and constraints).

**Before you start:** branch off main (`git checkout -b lesson-doors`).

## Global Constraints

- A static site: plain ES modules, no bundler, no new dependencies. Code holds no history text. Interface text is Bulgarian.
- No browser alert, confirm or prompt dialogs. Delete progress asks for a second click on the same button.
- A still screen runs no animation at all. Nothing in this plan animates forever.
- Any hash change reloads the page (`js/app.js`); new screens follow that rule.
- Copy, exactly: start-screen and free-map button `Уроци`; list heading `Уроци`; grade tabs `5. клас`, `6. клас`, `7. клас`; unready mark `скоро`; row title `Урок N · <title>`; delete button `Изтрий напредъка`, then `Сигурен ли си?`; the list's way back `Към началото`.
- Delete progress clears passed lessons, opened cards and lesson positions, and keeps the marker look (`pins`). It resets through the store's defaults, so lists added later (found characters) are cleared too.
- New code: 4-space indent, single quotes, semicolons, trailing commas in multiline literals. In `js/free.js` and `index.html`, untouched lines keep their older style.
- `content.js` is generated: change `tools/build-content.mjs`, then run `npm --prefix tools run build`.
- Browser checks run against the repo root served without caching (the no-cache server on port 8778 if it runs, else `python3 -m http.server`), and the test browser is closed afterwards.

## Review Focus

1. One click on `Изтрий напредъка`, then closing the menu, must delete nothing; reopening shows `Изтрий напредъка` again. (Task 2, browser check.)
2. An `index.json` entry whose lesson has no page in `CONTENT.lessons` must show as `скоро`, never as a link to "Няма такъв урок". (Task 3, test `lessonWithoutPageIsSoon`.)
3. A private window or blocked storage: the list still draws and delete progress does not throw. (Store guards already exist; Task 3 browser check with a corrupt `bgtt` value.)
4. At 390 × 844 the list has no sideways scroll and a long title wraps. (Task 3, browser check.)
5. Keyboard: the tabs and the ready rows take focus with Tab and open with Enter; unready rows and greyed tabs do not. (Task 3, browser check.)

---

### Task 1: The build checks lessons listed without a file

**Files:**
- Modify: `tools/build-content.mjs` (`readGrade`)
- Test: `tools/test/build-content.test.mjs`

**Interfaces:**
- Produces: `CONTENT.grades[grade]` keeps index order. A ready entry is `{ id, state, title, number, span, map }` (unchanged). An unready entry is passed through as written, minus `file`: at least `{ number, title }`.

An unready entry in `index.json` is `{ "number": 1, "title": "Какво е история" }`: no `file`. It needs an integer `number` and a non-empty string `title`; anything else is one problem on `lessons/<grade>/index.json`.

- [ ] **Step 1: Write the failing tests**, after `reportsIndexIdThatDiffersFromLesson`:

```js
test('passesUnreadyLessonToThePage', () => {
    const index = '[{ "number": 1, "title": "Какво е история" }, { "id": "5-test", "file": "test-lesson.md", "state": "ready" }]';
    const { content, problems } = buildContent(copyOkWith({ 'content/lessons/5/index.json': index }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.grades['5'][0], { number: 1, title: 'Какво е история' });
    assert.equal(content.grades['5'][1].id, '5-test');
});

test('reportsUnreadyLessonWithoutNumberOrTitle', () => {
    const index = '[{ "title": "Без номер" }, { "number": 2 }, { "id": "5-test", "file": "test-lesson.md", "state": "ready" }]';
    const { problems } = buildContent(copyOkWith({ 'content/lessons/5/index.json': index }));
    assert.deepEqual(problems.map((p) => p.file), ['lessons/5/index.json', 'lessons/5/index.json']);
    assert.match(problems[0].message, /number and a title/);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `npm --prefix tools test 2>&1 | grep -E "^not ok|^# (pass|fail)"`
Expected: `reportsUnreadyLessonWithoutNumberOrTitle` fails (no problems reported); `passesUnreadyLessonToThePage` may already pass.

- [ ] **Step 3: Add the check to `readGrade`** as a small function next to `unlistedProblems`, one problem per bad entry, message: `a lesson without a file needs a number and a title`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix tools test 2>&1 | grep -E "^# (pass|fail)"`
Expected: fail 0.

- [ ] **Step 5: Rebuild and commit**

Run: `npm --prefix tools run build` — Expected: `content.js written: 108 cards, 1 lessons, 200 search entries` and no problems (the real `index.json` is unchanged until Martin adds the table of contents).

```bash
git add tools/build-content.mjs tools/test/build-content.test.mjs
git commit -m "feat: the build checks that a lesson listed without a file has a number and a title"
```

---

### Task 2: Delete progress in the settings

**Files:**
- Modify: `js/store.js`, `js/options.js`, `index.html` (the `#options` markup and CSS)
- Test: `tools/test/web-store.test.mjs`

**Interfaces:**
- Produces: `resetProgress()` exported from `js/store.js`, also returned by `createStore`. It saves the defaults with the current `pins`.

Behaviour of the button, under the marker-look fieldset in `#options`:
- It reads `Изтрий напредъка`. The first click changes it to `Сигурен ли си?` and marks it (a class that turns it red).
- A second click calls `resetProgress()` and reloads the page, so every screen re-reads the progress.
- Closing the menu (the popover's `toggle` event with `newState === 'closed'`) puts the button back to `Изтрий напредъка` unmarked.

- [ ] **Step 1: Write the failing test** after `setPinsKeepsTheChosenLook`:

```js
test('resetProgressKeepsOnlyTheMarkerLook', () => {
    const store = createStore(fakeStorage());
    store.setPins('banner');
    store.markPassed('l1');
    store.markCardOpened('troy');
    store.setPosition('l1', 3);
    store.resetProgress();
    assert.deepEqual(store.loadProgress(), { ...EMPTY, pins: 'banner' });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm --prefix tools test 2>&1 | grep -E "^not ok|^# (pass|fail)"`
Expected: `resetProgressKeepsOnlyTheMarkerLook` fails with "store.resetProgress is not a function".

- [ ] **Step 3: Add `resetProgress` to `createStore` and to the exports**, built on `defaults()`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix tools test 2>&1 | grep -E "^# (pass|fail)"`
Expected: fail 0.

- [ ] **Step 5: Add the button and its two-click logic.** Markup: `<button class="btn" id="reset" type="button">Изтрий напредъка</button>` after the fieldset in `#options`. CSS in `index.html` next to the other `#options` rules: full width, a top margin, and a red background with white text while marked. Logic in `startOptions` in `js/options.js`, as the behaviour list says.

- [ ] **Step 6: Browser check on http://localhost:8778/**
  1. In the console set progress: `localStorage.bgtt = JSON.stringify({ passed: { '5-odrisko-tsarstvo': '2026-10-25' }, cards: ['troy'], position: { '5-odrisko-tsarstvo': 3 }, pins: 'banner' })`, reload.
  2. Open the gear menu, click `Изтрий напредъка` once: it reads `Сигурен ли си?` in red. Press Escape. Reopen: it reads `Изтрий напредъка`, and `localStorage.bgtt` still holds the passed lesson.
  3. Click twice: the page reloads, and `JSON.parse(localStorage.bgtt)` is `{ passed: {}, cards: [], position: {}, pins: 'banner' }`. The markers still use the shield look.
  4. Repeat step 3 from inside `#lesson/5-odrisko-tsarstvo`: the lesson reopens at its summary.

- [ ] **Step 7: Commit**

```bash
git add js/store.js js/options.js index.html tools/test/web-store.test.mjs
git commit -m "feat: the settings can delete the child's progress after a second click, keeping the marker look"
```

---

### Task 3: The lesson list and its three doors

**Files:**
- Create: `js/lesson-list.js`
- Modify: `js/app.js` (route), `index.html` (list markup, intro button, free-map button and their CSS), `css/lesson.css` (list CSS, lesson-header button), `README.md`
- Test: `tools/test/web-lesson-list.test.mjs`

**Interfaces:**
- Consumes: `CONTENT.grades` and `CONTENT.lessons` (Task 1), `loadProgress().passed` (`js/store.js`), `fmtSpan` (`js/years.js`).
- Produces: `listRows(entries, { lessons, passed })` returns `[{ number, title, date, href, isPassed }]` in the entries' order: `href` is `#lesson/<id>` for an entry whose `id` is a key of `lessons`, else `null`; `date` is `fmtSpan(span)` when the entry has a span, else `''`; `isPassed` is true when `passed` has the entry's id. `startLessonList()` draws the screen.

The screen, at `#lessons`:
- A full-window sheet with the start screen's paper background. At its top, `Към началото` (a link to `#free`) and the heading `Уроци`.
- Grade tabs for 5, 6 and 7, as buttons. A grade with entries in `CONTENT.grades` is open; the first open grade is active. A grade without entries is disabled and reads `6. клас` with `скоро`. Clicking an open tab shows its rows.
- One row per entry. A ready row is a link: a round badge with the lesson number, `Урок N · <title>`, and the date under it. A passed lesson's badge has a gold ring. An unready row is greyed, not a link, with `скоро` in place of the date.
- `body.lessons` hides the free map's furniture (`#hud`, `#card`, `#tl`, `#intro`), the same way `body.lesson` does.

The doors:
- Start screen: the link `Урок: Древна Тракия` becomes `<a class="btn" href="#lessons">Уроци</a>`.
- Free map: an `Уроци` link to `#lessons` beside the gear in `#hud`, in one row with it, styled like `#wheelMode`. Both keep `pointer-events:auto`.
- Lesson header: an `Уроци` link to `#lessons` beside the gear in `#lsHead`, left of it, same size. `renderHead` reads the first two children of `#lsCrumbs`, so the link goes outside `#lsCrumbs`.

- [ ] **Step 1: Write the failing tests** in `tools/test/web-lesson-list.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listRows } from '../../js/lesson-list.js';

const READY = { id: '5-odrisko-tsarstvo', state: 'ready', title: 'Древна Тракия. Царството на одрисите', number: 26, span: [-1300, -250], map: 'balkans' };
const lessons = { '5-odrisko-tsarstvo': {} };

test('readyLessonOpensAndShowsItsYears', () => {
    assert.deepEqual(listRows([READY], { lessons, passed: {} }), [
        { number: 26, title: 'Древна Тракия. Царството на одрисите', date: '1300 — 250 г. пр.Хр.', href: '#lesson/5-odrisko-tsarstvo', isPassed: false },
    ]);
});

test('lessonWithoutFileIsSoon', () => {
    assert.deepEqual(listRows([{ number: 1, title: 'Какво е история' }], { lessons, passed: {} }), [
        { number: 1, title: 'Какво е история', date: '', href: null, isPassed: false },
    ]);
});

test('lessonWithoutPageIsSoon', () => {
    assert.equal(listRows([READY], { lessons: {}, passed: {} })[0].href, null);
});

test('passedLessonGetsTheRing', () => {
    assert.equal(listRows([READY], { lessons, passed: { '5-odrisko-tsarstvo': '2026-10-25T10:00:00.000Z' } })[0].isPassed, true);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm --prefix tools test 2>&1 | grep -E "^not ok|^# (pass|fail)"`
Expected: the new file fails to load ("Cannot find module").

- [ ] **Step 3: Write `listRows` and `startLessonList` in `js/lesson-list.js`**, with a one-line header comment. Nothing touches the page at import time, so node can import it. Escape titles with `esc` from `js/lesson.js` if the rows are built as HTML.

- [ ] **Step 4: Run the tests and see them pass**

Run: `npm --prefix tools test 2>&1 | grep -E "^# (pass|fail)"`
Expected: fail 0.

- [ ] **Step 5: Route and markup.** In `js/app.js`, `#lessons` adds `body.lessons` and calls `startLessonList()`; update the header comment's route list. Add the list's markup shell (`<main id="lessonList" hidden>`) to `index.html` before `#intro`, the three doors, and the CSS.

- [ ] **Step 6: Add a README paragraph** after the search paragraph: the start screen and the free map open the lesson list; the list mirrors the textbook, greys unready lessons and rings passed ones; the settings can delete progress.

- [ ] **Step 7: Browser check on http://localhost:8778/ (desktop size, then 390 × 844)**
  1. The start screen shows `Тръгваме!` and `Уроци`. `Уроци` opens `#lessons`.
  2. The list shows `5. клас` active, `6. клас` and `7. клас` greyed with `скоро`, and one row `Урок 26 · Древна Тракия. Царството на одрисите` with `1300 — 250 г. пр.Хр.`. No free-map HUD, card or timeline shows.
  3. Clicking the row opens the lesson. Its header shows `Уроци` beside the gear; it leads back to the list.
  4. Set `passed` for the lesson in `localStorage.bgtt` and reload `#lessons`: the badge has a gold ring.
  5. Temporarily add `{ "number": 1, "title": "Какво е история" }` to the top of `content/lessons/5/index.json`, rebuild, reload: that row is greyed with `скоро` and a click does nothing. Restore the file and rebuild.
  6. On the free map, after `Тръгваме!`, `Уроци` sits beside the gear and opens the list.
  7. Tab moves through `Към началото`, the open tab and the ready row, skipping the greyed ones; Enter on the row opens the lesson.
  8. Set `localStorage.bgtt = '{broken'` and reload `#lessons`: the list draws without rings and the console shows no error.
  9. At 390 × 844: no sideways scroll; the row's title wraps.
  10. The page at rest runs no animations (`document.getAnimations().length` is 0 after a second).

- [ ] **Step 8: Run the tests**

Run: `npm --prefix tools test 2>&1 | grep -E "^# (pass|fail)"`
Expected: fail 0.

- [ ] **Step 9: Commit**

```bash
git add js/lesson-list.js js/app.js index.html css/lesson.css README.md tools/test/web-lesson-list.test.mjs
git commit -m "feat: a lesson list mirrors the textbook, and the start screen, the free map and a lesson's header lead to it"
```
