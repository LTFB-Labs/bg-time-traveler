# Search on the free map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A search box under the year on the free map finds rulers, places, years, events, lesson cards and lesson parts, and takes the child there.

**Architecture:** The build adds rulers and city names to the search index that `content.js` already carries, and gives every entry a short date and the year or lesson part it leads to. A pure module in `js/search.js` parses years and matches a query against the index into ordered groups; node tests cover it. A small DOM module draws the box and its list, and `js/free.js` decides what each pick does, because it owns the free map's year, card and play state.

**Tech Stack:** Plain ES modules in the browser, no bundler; Node's built-in test runner (`cd tools && npm test`); the content build (`cd tools && npm run build`).

**Spec:** `docs/superpowers/specs/2026-10-25-free-map-search-lessons-album-design.md`, section 4 (with sections 2 and 8 for goals and constraints).

**Before you start:** the working tree on main holds earlier uncommitted work (route, compass, realm style, river names, README edits). Martin commits or keeps it before this plan starts; then branch off main.

## Global Constraints

- A static site: plain ES modules, no bundler, no new dependencies.
- Content lives in `content/` files; code holds no history text. Interface text is Bulgarian.
- No browser alert, confirm or prompt dialogs.
- A still map runs no animation at all. Every new animation ends on its own (here: the city mark, gone within a couple of seconds).
- Search lives on the free map only, not in lessons.
- Placeholder copy, exactly: `Търси владетел, битка, място или година`.
- Group names and order, exactly: `Година`, `Владетели`, `Места`, `Събития`, `Картички от уроците`, `Уроци`.
- Year result copy, exactly: `Иди в N г.` (N is the year).
- Matching stays as built: case-insensitive, word endings stripped, й and ѝ read as и (the existing normalize function).
- New code: 4-space indent, single quotes, semicolons, trailing commas in multiline literals. In `js/free.js` and `js/map.js`, untouched lines keep their older style.
- `content.js` is generated: change `tools/lib/search.mjs`, then run `cd tools && npm run build`.
- Browser checks run against the repo root served without caching (the no-cache server on port 8778 if it runs, else `python3 -m http.server`), and the test browser is closed afterwards.

## Review Focus

1. A space or an arrow key typed in the search box must type in the box; it must not start Play or move the timeline. (Task 3, browser check.)
2. A year written the way a child writes it ("893 г.", "893г", "500 пр. Хр.", "300 пр.н.е.") must still be read as a year. (Task 2, test `parsesYearsTheWayChildrenWriteThem`.)
3. Picking an event that shares its year with another (the April Uprising and Botev, both 1876) must show the picked event's card, so an event entry keeps its exact year, fractions included. (Task 1, test `eventEntryKeepsExactYear`; Task 3, browser check.)
4. A query that finds nothing shows a friendly line ("Нищо не намерих."), not an empty box. (Task 3, browser check.)
5. One letter finds nothing, and no group lists more than 5 results, so the list never floods the map. (Task 2, tests `oneLetterFindsNothing` and `capsEachGroupAtFive`.)

---

### Task 1: The index holds rulers and places, and every entry knows where it leads

**Files:**
- Create: `js/search.js` (the normalize function moves here from `tools/lib/search.mjs`, unchanged)
- Modify: `tools/lib/search.mjs`
- Modify: `content.js` (rebuilt)
- Test: `tools/test/search.test.mjs`

**Interfaces:**
- Produces: `normalize(text: string) -> string`, exported from `js/search.js`. `tools/lib/search.mjs` imports it from `../../js/search.js` and re-exports it, so the existing tests keep their import.
- Produces: `buildSearchIndex(content)` returns entries of this shape (keys a type does not use are left out):

| type | id | title | date | year | other keys |
|---|---|---|---|---|---|
| `ruler` | `ruler-<i>` | `цар Симеон Велики` | `893–927` | first year of the reign | |
| `place` | `place-<i>-<k>` | the city's name in that period | `1185–1965`, or `1965–днес` when the period ends after END | first year of the name | `city`: the index into CITIES |
| `event` | card id | card title | `1876 г.` (whole year) | the card's exact first year, such as 1876.4 | |
| `card` | card id | card title | the card's dates, or `''` | | `lesson`, `part`: where the card first appears, when it does |
| `part` | `<lesson>#<n>` | part heading | `Урок 26` | | `lesson`, `part` (already built) |

Every entry keeps its `text` (the normalized words it matches on). A ruler's text holds its title word too, so "цар" or "президент" finds them all.

- [ ] **Step 1: Write the failing tests** in `tools/test/search.test.mjs`, after the existing ones:

```js
const balkans = (RULERS, CITIES) => ({ balkans: { RULERS, CITIES, END: 2026 } });

test('indexesRulers', () => {
    const index = buildSearchIndex({ cards: {}, lessons: {}, maps: balkans([[893, 927, 'цар', 'Симеон Велики'], [1954, 1989, 'водач', 'Тодор Живков']], []) });
    assert.deepEqual(index.map(({ text, ...entry }) => entry), [
        { type: 'ruler', id: 'ruler-0', title: 'цар Симеон Велики', date: '893–927', year: 893 },
        { type: 'ruler', id: 'ruler-1', title: 'Тодор Живков', date: '1954–1989', year: 1954 },
    ]);
    assert.ok(index[1].text.includes(normalize('водач')));
});

test('indexesEveryNameOfACity', () => {
    const CITIES = [{ at: [25.6, 43.1], n: [[1185, 1965, 'Търново'], [1965, 2027, 'Велико Търново']] }];
    const index = buildSearchIndex({ cards: {}, lessons: {}, maps: balkans([], CITIES) });
    assert.deepEqual(index.map(({ text, ...entry }) => entry), [
        { type: 'place', id: 'place-0-0', title: 'Търново', date: '1185–1965', year: 1185, city: 0 },
        { type: 'place', id: 'place-0-1', title: 'Велико Търново', date: '1965–днес', year: 1965, city: 0 },
    ]);
});

test('eventEntryKeepsExactYear', () => {
    const botev = { id: 'botev', kind: 'event', legacyKind: 'war', title: 'Ботев', years: [1876.4], aliases: [], paragraphs: ['Четата.'] };
    const [entry] = buildSearchIndex({ cards: { botev }, lessons: {} });
    assert.equal(entry.year, 1876.4);
    assert.equal(entry.date, '1876 г.');
});

test('cardEntryPointsToItsFirstStoryPart', () => {
    const lesson = parseLesson(readFileSync(join(import.meta.dirname, 'fixtures/lessons/odrysae.md'), 'utf8'), 'odrysae.md');
    const troy = { id: 'troy', kind: 'place', title: 'Троя', dates: 'ок. 1200 г. пр.Хр.', aliases: [], paragraphs: ['Град.'] };
    const athens = { id: 'athens', kind: 'place', title: 'Атина', aliases: [], paragraphs: ['Град.'] };
    const index = buildSearchIndex({ cards: { troy, athens }, lessons: { [lesson.id]: lesson } });
    const card = (id) => index.find((entry) => entry.id === id);
    assert.deepEqual([card('troy').lesson, card('troy').part, card('troy').date], ['5-odrisko-tsarstvo', 1, 'ок. 1200 г. пр.Хр.']);
    assert.deepEqual([card('athens').lesson, card('athens').part, card('athens').date], [undefined, undefined, '']);
    assert.equal(index.find((entry) => entry.type === 'part').date, 'Урок 26');
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `cd tools && node --test test/search.test.mjs`
Expected: the four new tests FAIL (no ruler or place entries, no `date`, `year`, `lesson` keys); the old ones pass.

- [ ] **Step 3: Move normalize to `js/search.js` and extend `buildSearchIndex(content)` in `tools/lib/search.mjs`**

- `js/search.js` starts with a one-line header comment and holds normalize with its two constants and stripEnding, unchanged. It reads no browser globals at import time.
- `buildSearchIndex` reads `content.maps?.balkans ?? {}`, with `RULERS` and `CITIES` defaulting to empty lists, so callers without maps still work. Order of entries: cards and events, parts, rulers, places.
- An event without `years` (the older test's fixture has one) gets no `year` and no `date`; real events always have years.
- A ruler's shown title is its title word and name, except the title word `водач`, which is dropped (the name alone reads right; the HUD drops it too).
- A card's lesson part (my call, a refinement of the spec's "where it first appears"): the first story part, in lesson order and part order, whose `meta.marks` holds the card id or whose `html` holds `data-card="<id>"`; the summary (part 0) only when no story part has it. A part's `part` number is its index in `lesson.parts`, which equals the existing story count plus one because every lesson starts with one summary.

- [ ] **Step 4: Run the tests and see them pass**

Run: `cd tools && npm test`
Expected: all tests pass (116 before this plan, 120 now).

- [ ] **Step 5: Rebuild `content.js`**

Run: `cd tools && npm run build`
Expected: `content.js written: 108 cards, 1 lessons, 200 search entries` (115 before, plus 56 rulers and 29 city names).

- [ ] **Step 6: Commit**

```bash
git add js/search.js tools/lib/search.mjs tools/test/search.test.mjs content.js
git commit -m "feat: the search index holds rulers and city names, and each entry knows its date and where it leads"
```

---

### Task 2: Reading years and matching a query into groups

**Files:**
- Modify: `js/search.js`
- Test: `tools/test/web-search.test.mjs` (new; the `web-` prefix marks tests of browser modules)

**Interfaces:**
- Consumes: `normalize` and the entry shape from Task 1. `fmtSpan` from `js/years.js` for a lesson's span.
- Produces: `parseYear(query: string) -> number | null`. Negative for a year before Christ; null when the query is not a year.
- Produces: `findResults(query: string, { index, lessons, span: [start, end] }) -> Array<{ name: string, items: Entry[] }>`. `index` is `CONTENT.search`, `lessons` is `Object.values(CONTENT.lessons)`, `span` is `[START, END]`. Only groups with items come back, in the order of the global constraints. Two synthetic entry types join the Task 1 ones:
  - `{ type: 'year', title: 'Иди в 893 г.', year: 893 }`
  - `{ type: 'lesson', id, title: 'Урок 26 · Древна Тракия. Царството на одрисите', date: fmtSpan(lesson.span), lesson: id }`

The rules `findResults` follows:

- A query shorter than 2 characters (after trimming) finds nothing.
- A year from start to end gives the Година group with one year entry, and puts that whole year's events (the event's year rounded down equals it) first in Събития.
- A year before start, or one written before Christ, gives the lessons whose span holds it, first in Уроци. A year after end gives nothing for the year.
- Text matching: an entry matches when every word of the normalized query is the start of some word of the entry's text. Within a group, entries whose normalized title matches come before the rest; otherwise index order stays.
- Year results and text results merge per group without repeats (by type and id), and each group keeps at most 5.

- [ ] **Step 1: Write the failing tests** in `tools/test/web-search.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    findResults,
    normalize,
    parseYear,
} from '../../js/search.js';

const entry = (type, id, title, extra = {}) => ({ type, id, title, text: normalize(`${title} ${extra.body ?? ''}`), ...extra });
const SIMEON = entry('ruler', 'ruler-0', 'цар Симеон Велики', { date: '893–927', year: 893 });
const TARNOVO = entry('place', 'place-0-0', 'Търново', { date: '1185–1965', year: 1185, city: 0 });
const PRESLAV = entry('event', 'preslav', 'Преслав става столица', { date: '893 г.', year: 893 });
const AHELOY = entry('event', 'aheloy', 'Битката при Ахелой', { date: '917 г.', year: 917, body: 'Симеон разбива византийците.' });
const INDEX = [AHELOY, PRESLAV, SIMEON, TARNOVO];
const LESSON = { id: '5-odrisko-tsarstvo', number: 26, title: 'Древна Тракия. Царството на одрисите', span: [-1300, -250] };
const find = (query, index = INDEX) => findResults(query, { index, lessons: [LESSON], span: [600, 2026] });
const names = (groups) => groups.map((group) => group.name);
const ids = (groups, name) => groups.find((group) => group.name === name)?.items.map((item) => item.id);

test('parsesYearsTheWayChildrenWriteThem', () => {
    assert.equal(parseYear('893'), 893);
    assert.equal(parseYear(' 893 г. '), 893);
    assert.equal(parseYear('893г'), 893);
    assert.equal(parseYear('500 пр.Хр.'), -500);
    assert.equal(parseYear('500 г. пр. Хр.'), -500);
    assert.equal(parseYear('300 пр.н.е.'), -300);
    assert.equal(parseYear('Симеон'), null);
    assert.equal(parseYear('893 Симеон'), null);
});

test('findsRulerWhateverTheEnding', () => {
    assert.deepEqual(ids(find('Симеона'), 'Владетели'), ['ruler-0']);
});

test('findsWhileTyping', () => {
    assert.deepEqual(ids(find('Симе'), 'Владетели'), ['ruler-0']);
    assert.deepEqual(ids(find('търн'), 'Места'), ['place-0-0']);
});

test('titleMatchesComeFirst', () => {
    const story = entry('event', 'simeon-story', 'Цар Симеон', { year: 900 });
    assert.deepEqual(ids(find('Симеон', [AHELOY, story]), 'Събития'), ['simeon-story', 'aheloy']);
});

test('yearOffersGoingThereThenItsEvents', () => {
    const groups = find('893');
    assert.deepEqual(groups[0], { name: 'Година', items: [{ type: 'year', title: 'Иди в 893 г.', year: 893 }] });
    assert.deepEqual(ids(groups, 'Събития'), ['preslav']);
});

test('earlyYearOffersTheLessonThatHoldsIt', () => {
    const groups = find('500 пр.Хр.');
    assert.equal(names(groups).includes('Година'), false);
    assert.deepEqual(groups.find((group) => group.name === 'Уроци').items[0], {
        type: 'lesson', id: LESSON.id, title: 'Урок 26 · Древна Тракия. Царството на одрисите', date: '1300 — 250 г. пр.Хр.', lesson: LESSON.id,
    });
    assert.deepEqual(find('300'), []);
});

test('groupsComeInTheirOrder', () => {
    const groups = find('Симеон', [AHELOY, TARNOVO, entry('place', 'place-1-0', 'Симеоновград', { year: 1900 }), SIMEON]);
    assert.deepEqual(names(groups), ['Владетели', 'Места', 'Събития']);
});

test('oneLetterFindsNothing', () => {
    assert.deepEqual(find('С'), []);
    assert.deepEqual(find('  '), []);
});

test('capsEachGroupAtFive', () => {
    const many = Array.from({ length: 7 }, (_, i) => entry('ruler', `ruler-${i}`, `цар Иван ${i}`, { year: 1200 + i }));
    assert.equal(find('Иван', many)[0].items.length, 5);
});
```

- [ ] **Step 2: Run the tests and see them fail**

Run: `cd tools && node --test test/web-search.test.mjs`
Expected: FAIL with "does not provide an export named 'findResults'".

- [ ] **Step 3: Implement `parseYear` and `findResults` in `js/search.js`**

parseYear accepts, case-insensitively and with any spaces: 1 to 4 digits, then an optional "г" with or without a dot, then an optional "пр.Хр.", "пр.н.е." or "сл.Хр." with or without dots. Nothing else may be in the query. Keep the group table as a lookup map from group name to entry types, and `MIN_QUERY = 2` and `GROUP_SIZE = 5` as named constants.

- [ ] **Step 4: Run all tests and see them pass**

Run: `cd tools && npm test`
Expected: all pass (129).

- [ ] **Step 5: Commit**

```bash
git add js/search.js tools/test/web-search.test.mjs
git commit -m "feat: search reads years the way children write them and groups what it finds"
```

---

### Task 3: The search box on the free map

**Files:**
- Create: `js/free-search.js`
- Modify: `js/free.js` (the pick, the keyboard guard, the start call)
- Modify: `index.html` (the box's markup in the HUD, its CSS, the HUD's stacking)
- Modify: `README.md` (one paragraph under "Как работи")

**Interfaces:**
- Consumes: `findResults` from Task 2; `esc` from `js/lesson.js` for titles and dates.
- Produces: `startSearch(root: HTMLElement, { find: (query) => Group[], onPick: (item) => void })` in `js/free-search.js`. The free map calls it once.

The markup goes in `#hud` right after `#ruler`:

```html
<div id="find" role="search">
  <input id="findBox" type="search" placeholder="Търси владетел, битка, място или година" autocomplete="off" spellcheck="false" aria-controls="findList" aria-expanded="false">
  <ul id="findList" role="listbox" hidden></ul>
</div>
```

How the box behaves (`js/free-search.js`):

- As the child types, the list shows the groups: a heading row per group, then one row per item with its title and its date on the right. A query of 2 or more characters that finds nothing shows one row: `Нищо не намерих.` A shorter query hides the list.
- Down and Up move a highlighted row through the items, wrapping at the ends; the input's active-descendant attribute follows it. Enter picks the highlighted row, or the first item when none is highlighted. Escape hides the list; a second Escape leaves the box.
- A click or tap on a row picks it. A pointer press outside `#find` hides the list. Focusing the box again with text in it shows the list again.
- A pick hides the list, leaves the box (so the arrow keys move the timeline again) and calls onPick.

What a pick does (`pickResult(item)` inside `startFree` in `js/free.js`; stop Play first):

| type | action |
|---|---|
| `year`, `ruler`, `event` | `goTo(item.year, 900)` |
| `place` | `goTo(item.year, 900)`; the city mark comes in Task 4 |
| `card` | nothing yet; Task 4 opens it over the map |
| `lesson` | `location.hash = '#lesson/<item.lesson>'` (the lesson resumes where the child left it) |
| `part` | `location.hash = '#lesson/<item.lesson>/<item.part>'` |

The free map's window keydown handler returns early when the key comes from an input, right after its intro check, so Space, the arrows and Enter type in the box.

CSS, in the index.html style block next to the HUD rules:

- `#find` takes pointer events (the HUD has none) and sits under the ruler line with the HUD's usual 6–8 px gap.
- The input is a pill like the ruler line, 300 px wide on a desktop, with a 16 px font, so iPhone Safari doesn't zoom into it.
- The list lies under the box, 360 px wide, at most 55% of the window tall, and scrolls. Rows are at least 40 px tall for fingers. Group headings are small, bold and muted. The highlighted row has the cream highlight the options menu uses (#fff6dd).
- `#hud` gets `z-index: 12`, so the open list lies above the card panel and the timeline, and below the intro (20).
- On a phone (the existing max-width 760 px block), the box keeps its place under the year at the full width minus the gutters, and the list is fixed from the screen's left to right edges (10 px gutters), covering the map down to the timeline.

README: add one paragraph after the free timeline's paragraph:

```markdown
**Търсенето.** Под годината на свободната карта има поле за търсене. То намира владетели, места, години, събития, картички от уроците и части от уроците. Изборът мести картата на годината, показва картичката или отваря урока. Година преди 600 г. предлага урока, който я разказва.
```

- [ ] **Step 1: Add the markup and the CSS to `index.html`**

- [ ] **Step 2: Write `startSearch` in `js/free-search.js`** with a one-line header comment, following the behaviour list above.

- [ ] **Step 3: Wire it in `js/free.js`:** the keydown guard, `pickResult`, and one start call next to the other boot calls:

```js
startSearch($('find'), { find: (query) => findResults(query, { index: CONTENT.search, lessons: Object.values(CONTENT.lessons), span: [START, END] }), onPick: pickResult });
```

- [ ] **Step 4: Browser check on http://localhost:8778/ (desktop size, then 390 × 844)**

Close the intro, then check each line; all must hold:

1. Typing `Симеон` lists Владетели first with `цар Симеон Велики 893–927`. Enter moves the map to 893 and the ruler line reads Симеон.
2. Typing `Ботев`, then Down and Enter, shows Botev's card at 1876, not the April Uprising's. `Априлско` then shows the April Uprising's card.
3. In the box, Space types a space, and Left and Right move the text cursor; Play doesn't start and the year doesn't move. After a pick, Right steps to the next event again.
4. `1878` lists `Иди в 1878 г.` first; picking it moves the map to 1878.
5. `500 пр.Хр.` lists lesson 26 under Уроци; picking it opens the lesson. Back on the free map, a lesson part result opens the lesson at that part.
6. `Илияна` finds the last ruler; picking it shows 2026 and her on the ruler line.
7. `жжж` shows `Нищо не намерих.`; `С` shows no list.
8. At 390 × 844 the box sits under the year and the open list covers the map above the timeline.
9. The browser console shows no errors. Close the test browser.

- [ ] **Step 5: Run the tests**

Run: `cd tools && npm test`
Expected: all pass (129).

- [ ] **Step 6: Commit**

```bash
git add js/free-search.js js/free.js index.html README.md
git commit -m "feat: a search box under the year takes the child to a ruler, a year, an event or a lesson"
```

---

### Task 4: A picked place is marked, and a lesson card opens over the free map

**Files:**
- Modify: `js/map.js` (the city mark)
- Modify: `js/cards.js` (an optional footer under a card)
- Modify: `js/free.js` (the place and card picks)
- Modify: `index.html` (the pop-over element, the mark's CSS)
- Modify: `css/lesson.css` (the pop-over's styles shared with the free map)

**Interfaces:**
- Consumes: the `place` and `card` entries of Task 1 (`city`, `lesson`, `part`); `pickResult` of Task 3.
- Produces: `map.flashCity(i: number)`, where `i` indexes the list passed to `setCities`.
- Produces: `createCards(popEl, { onOpen, onClose, footer })`, where `footer(id) -> string` is optional HTML placed at the end of the card's text block; the lesson keeps calling it without one.

The city mark (`js/map.js`): a `flashCity(i)` remembers `i` and re-places the overlay. The overlay's city loop rewrites each city's class every frame, so it adds `flash` to the remembered city there, or the class would be wiped on the next frame. Each city element gets one animationend listener, at build, that forgets the city and re-places the overlay. Export `flashCity` next to `setCities`.

The mark's CSS (index.html, next to the `.city` rules): a red ring (the map's `--red`) centred on the city's dot that swells and fades twice in about 2.4 seconds, then the class goes. The ring's resting style is invisible, so with reduced motion (which turns animations off) no ring stays behind. If the city is still hidden when the pick happens, the ring plays when the city appears, because a hidden element runs no animation.

The lesson card over the free map:

- `index.html` gets `<div id="freePop" hidden></div>` after `#card`.
- In `css/lesson.css`, the eleven `#lsPop` rules become `:is(#lsPop, #freePop)` rules. Right after them, `#freePop` gets its own place: fixed, top 110 px, centred in the map area left of the card panel, 420 px wide at most (the window minus 32 px on a phone), as tall as the space above the timeline allows, z-index 15. On a phone: 10 px from the left and right edges, just above the timeline, at most 60% of the window tall. These rules must come after the shared ones, because both selectors weigh the same.
- `js/free.js` makes one card pop-over at start: `createCards($('freePop'), { onOpen: () => {}, onClose: () => {}, footer: lessonLink })`. `lessonLink(id)` finds the card's `card` entry in `CONTENT.search` and, when it has a lesson, returns `<a class="btn pri" href="#lesson/<lesson>/<part>">Към урока</a>`; otherwise `''`.
- `pickResult` closes the pop-over first on every pick, then for a `card` opens it with the card id, and for a `place` also calls `map.flashCity(item.city)` after `goTo`.
- A lesson card opened this way counts as opened, because the card pop-over already stores every card it opens.

- [ ] **Step 1: Add `flashCity` to `js/map.js` and the ring's CSS to `index.html`**

- [ ] **Step 2: Add the footer option to `createCards` in `js/cards.js`**

- [ ] **Step 3: Add `#freePop` to `index.html`, share the pop-over styles in `css/lesson.css`, and wire the picks in `js/free.js`**

- [ ] **Step 4: Browser check on http://localhost:8778/ (desktop size, then 390 × 844)**

1. `Търново` lists both names under Места with their periods. Picking `Търново` moves the map to 1185, and a red ring swells round Търново twice and is gone within about 3 seconds.
2. Picking `Велико Търново` moves the map to 1965 and marks the city the same way.
3. `Троя` lists the card under Картички от уроците. Picking it opens the card over the map, with its photo, text and `Към урока`. The button opens lesson 26 at the part where Troy first appears.
4. Back on the free map, after opening that card, the browser's local storage key `bgtt` lists `troy` in its cards.
5. × and Escape close the card. Picking an event while the card is open closes the card and moves the map.
6. Lesson 26 still opens its own cards from bold terms and markers, with no `Към урока` button.
7. Once the ring is gone and the map stands still, the browser shows no running animations on the page.
8. The browser console shows no errors. Close the test browser.

- [ ] **Step 5: Run the tests**

Run: `cd tools && npm test`
Expected: all pass (129).

- [ ] **Step 6: Commit**

```bash
git add js/map.js js/cards.js js/free.js index.html css/lesson.css
git commit -m "feat: a searched place is marked for a moment, and a lesson card opens over the free map"
```

---

## Left for the later plans

- Free-map events counting as opened when the year stops on them: the album plan (spec section 7).
- A hidden character picked from search opens its card but doesn't count as found: the characters plan (spec section 6).
