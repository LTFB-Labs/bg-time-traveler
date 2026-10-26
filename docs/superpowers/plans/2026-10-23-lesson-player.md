# Lesson Player Implementation Plan (plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play a lesson from `content.js` on the existing map: a reading pane with the summary, seven story parts and a check, the map changing under each part, a lesson timeline strip, cards opening from bold terms and markers, a prediction question, a check with instant feedback and a recap; plus pan and zoom on the map.

**Architecture:** The page script in `index.html` is split into ES modules under `js/` (`<script type="module">`, no bundler): `map.js` owns the SVG map, layers, camera, overlay and pan/zoom; `free.js` is today's free timeline unchanged in behaviour; `lesson.js` drives a lesson from `CONTENT.lessons[id]`; `timeline.js`, `cards.js`, `check.js`, `recap.js` are its pieces; `app.js` is a hash router (`#lesson/<id>/<n>`); `store.js` keeps progress in `localStorage`. Pure helpers (`years.js`, `geo.js`, `check-state.js`) are tested with `node --test` from `tools/test/`; everything visual is verified with a Playwright run through every part of the Odrysian lesson.

**Tech Stack:** Plain HTML, CSS and ES modules in the browser; Node 24 `node --test` for pure modules; Playwright MCP for the browser checks; `content.js` and `geo.js` from plan 1.

**Spec:** `docs/superpowers/specs/2026-10-23-grade-lessons-design.md` (sections 4.3 to 4.15, 5.3 to 5.7, 5.10, 6.6, 11, 12). Plan 1: `docs/superpowers/plans/2026-10-23-content-pipeline.md` (the `content.js` contract).

## Global Constraints

- Static site: plain HTML, CSS and `<script type="module">` files served as-is (Python `http.server` or the NAS). No bundler, no runtime Markdown library, no framework.
- Generated inputs are read-only: `content.js` defines `CONTENT = { cards, lessons, grades, photos, maps, search }` plus the globals `EVENTS, PHOTOS, ERAS, RULERS, CITIES, MOUNTAINS, SEAS, CAMERA, START, END`; `geo.js` defines `GEO = { W, H, k, cx, lon0, lat1, land, lakes, rivers, frames, borders }`.
- Projection, shared by every module: `P(lon, lat) = [(lon - GEO.lon0) * GEO.cx * GEO.k, (GEO.lat1 - lat) * GEO.k]`.
- The free timeline keeps today's behaviour exactly (69 dots, year scrubbing by wheel, play, cards, camera), with one fix: the keydown handler must not throw after the intro is removed.
- The kid taps Next; nothing advances by itself. Layout: laptop map left about 56 percent, reading pane right; phone map on top about 42 percent of the height, pane below. Visual reference: `spike/lesson.html` (fonts, colours, chips, timeline strip, card pop-over) until Task 12 deletes it.
- Years: `480 г. пр.Хр.`, `46 г. сл.Хр.` for years 1 to 999, `1396 г.` from 1000 on, `ок.` before approximate; a part `label` wins over `year`; years before 10 000 BC as `преди N години`.
- No scores. Feedback is green or red with one sentence; "Опитай пак" on red; a lesson is passed when every question has been green at least once in this sitting.
- Camera pan and zoom limits: no further out than the whole map, no closer than about 50 km across. "Върни ме" appears after the kid moves the map; Next also returns the camera.
- Progress in `localStorage` under the single key `bgtt`: `{ passed: { [lessonId]: isoDate }, cards: [cardId], position: { [lessonId]: n } }`; a "Изтрий напредъка" button is plan 3.
- Code style for new files: 4-space indent, single quotes, semicolons, trailing commas in multiline literals, width 180; short functions, early returns, lookup maps over switches. Moved code keeps its style.
- All UI copy in Bulgarian. Exact strings in this plan are fixed.

## Review Focus

1. A part with `label` and no numeric `year` (deep time) must render with the label in the year corner and the timeline knob hidden. Test in Task 2 (`fmtYearPrefersLabel`) and Task 5 smoke step with a label part injected in the browser.
2. A tap question must measure distance in kilometres on the ground, not in degrees or pixels, so a 40 km tolerance means 40 km at latitude 42 too. Test in Task 2 (`haversineKnownDistance`) and Task 9 (`tapWithinToleranceIsCorrect`).
3. An unknown lesson id in the hash (`#lesson/nope`) must show a friendly message and a way back, never a blank page or a console error. Test in Task 4 smoke step.
4. After the kid pans the map, Next must return the camera to the new part's box; a stale user offset must not persist. Test in Task 7 smoke step.
5. A part whose `photo` key is missing from `CONTENT.photos` or whose picture fails to load must still render its text and show a placeholder, not a broken image. Test in Task 4 (`photoBlockFallsBackToPlaceholder`).

---

## File structure

```
index.html                   keeps CSS for the free timeline; adds the lesson pane markup (hidden by default) and a module script tag
css/lesson.css               styles for the lesson pane, timeline strip, cards pop-over, check and recap (ported from the spike)
js/package.json              { "type": "module" } so node --test can import these files
js/app.js                    hash router: '' or '#free' → free mode; '#lesson/<id>' or '#lesson/<id>/<n>' → lesson; unknown → message
js/map.js                    createMap(svg, overlay) → map API (static map, layers, camera, overlay, path, pan/zoom)
js/free.js                   startFree(map) — today's free timeline, extracted from index.html
js/lesson.js                 startLesson(map, lesson, { part }) — parts, reading pane, chips, part changes on the map
js/timeline.js               lesson timeline strip and whole-history bar
js/cards.js                  card pop-over: openCard(id), close(); wires term clicks
js/check.js                  check UI: question renderers, feedback, retry, pass detection
js/check-state.js            pure: reducer for answers → per-question state and passed flag
js/recap.js                  recap screen
js/predict.js                prediction block UI
js/store.js                  loadProgress(), saveProgress(p), markCardOpened(id), markPassed(lessonId), setPosition(lessonId, n)
js/years.js                  pure: fmtYear({ year, approx, label }) → string; fmtSpan([a, b]) → string
js/geo.js                    pure: haversineKm(a, b); boxToViewBox(box, pane, inset); clampViewBox(vb, limits)
tools/test/web-years.test.mjs, web-geo.test.mjs, web-check-state.test.mjs
content/figures/*.svg         route figures (Task 11), credits in content/figures.json
tools/lib/figures.mjs         reads and checks the figures for the content build (Task 11)
```

Map API produced by Task 1 and extended in Task 3 (all later tasks consume it):

```ts
type Box = [west: number, south: number, east: number, north: number];
type Marker = { id: string; at: [number, number]; kind: string; title: string; photo?: string };
map.showFrame(i: number): void                         // free mode: era frame i from GEO.frames
map.showBorders(ids: string[], ghostId?: string): void // lesson mode: GEO.borders by id, main = first 'state' border; ghost dashed + label 'преди'
map.flyTo(box: Box, opts?: { ms?: number }): void      // eases the viewBox so box fits the free rect; clears any user offset
map.setMarkers(list: Marker[], onClick: (m: Marker) => void): void
map.setActiveMarker(id: string | null): void
map.setCities(list: typeof CITIES, year: number): void // free mode only
map.drawPath(points: [number, number][] | null, move?: string): void // move: figure id riding the path (Task 11)
map.setMode('free' | 'lesson'): void                   // lesson: drag pans, wheel zooms; free: wheel scrubs year unless wheelZoom is on
map.onUserMove(cb: (moved: boolean) => void): void     // true after a pan/zoom by hand, false after flyTo
map.resetCamera(): void                                // flies back to the last box given to flyTo
map.onMapClick(cb: (lonlat: [number, number]) => void): void
map.showChoices(ids: string[]): void                    // check: the given borders in equal styling with letters А, Б, В at their label points (Task 9)
map.toScreen(lon, lat): [x, y]; map.setFreeRect(rect: { x, y, w, h }): void
```

Lesson part fields consumed from `CONTENT.lessons[id].parts[n]`: `type` (`summary|story|check`), `heading`, `html`, `factHtml`, `meta` with `year|label|approx|box|borders|ghost|marks|path|photo|words|next|predict|lead|goals|names|questions`.

---

### Task 1: Split the page script into modules with the free timeline unchanged

**Files:**
- Create: `js/package.json`, `js/app.js`, `js/map.js`, `js/free.js`
- Modify: `index.html` (replace the inline `<script>` with `<script type="module" src="js/app.js"></script>`; keep CSS and markup)

**Interfaces:**
- Produces: `createMap(svgEl, overlayEl) → map` with the methods listed above that free mode needs now: `showFrame`, `flyTo` (used internally by free mode through `setFreeRect` + the camera tween), `setMarkers`, `setActiveMarker`, `setCities`, `drawPath`, `toScreen`, `P`. `startFree(map)` boots today's behaviour and keeps `window.BGTT = { setYear }`.
- The router in `app.js`: `location.hash` empty or `#free` → `startFree`; anything starting with `#lesson/` → a placeholder that logs and shows the free timeline (replaced in Task 4). Re-routes on `hashchange` by reloading the page (`location.reload()`); a single-page switch is not required.

- [ ] **Step 1: Move the map code** (static map build, mountains, labels, frame layers, `fade`, `prebuildFrames`, camera `targetVB`/`applyVB`/`tick`, overlay placement, markers, migration arrow, paper grain) from `index.html` into `js/map.js` as `createMap`. Keep the algorithms verbatim; only wrap them in an object and replace direct reads of `state.year` and `$("card")` with values passed in (`setCities(CITIES, year)`, `setFreeRect(rect)`).
- [ ] **Step 2: Move the rest** (HUD, card, timeline track, play, keyboard, wheel-scrub, intro, boot) into `js/free.js` as `startFree(map)`. Fix the keydown handler: read the intro element once and skip the intro branch when it is gone.
- [ ] **Step 3: Write `js/app.js`** with the router and `js/package.json` with `{ "type": "module" }`.
- [ ] **Step 4: Smoke check in the browser** (`http://127.0.0.1:8765/?v=<sha>`): 0 console errors; `document.querySelectorAll('.dot').length === 69`; `BGTT.setYear(681)` → card heading `Основаването на България` and image `naturalWidth > 0`; press `ArrowRight` twice after the intro is gone → the year advances and no error is logged; wheel over the map changes the year.
- [ ] **Step 5: Commit** `refactor: page script split into js/ modules, free timeline unchanged`.

### Task 2: Pure helpers with tests

**Files:**
- Create: `js/years.js`, `js/geo.js`, `tools/test/web-years.test.mjs`, `tools/test/web-geo.test.mjs`

**Interfaces:**
- `fmtYear({ year, approx, label }) → string`: `label` wins; `year <= -10000` → `преди N години` with `N = 2026 - year` rounded to the nearest 1000 (nearest 10 000 above 100 000); `year < 0` → `${approx ? 'ок. ' : ''}${-year} г. пр.Хр.`; `1..999` → `${n} г. сл.Хр.`; `>= 1000` → `${n} г.`; `year === 0` is treated as 1.
- `fmtSpan([a, b]) → string`: `1300 — 250 г. пр.Хр.` when both BC; `46 г. сл.Хр. — 681 г.` when mixed (each side formatted with `fmtYear`, duplicated suffix dropped when both sides share it).
- `haversineKm([lon1, lat1], [lon2, lat2]) → number` (Earth radius 6371 km).
- `boxToViewBox(box, pane: { w, h }, free: { x, y, w, h }, P) → { x, y, w, h }`: the same arithmetic as today's `targetVB` (fit the projected box into the free rect, centre it, viewBox sized to the pane).
- `clampViewBox(vb, { minW, maxW, world: { W, H } }) → vb`: width clamped to `[minW, maxW]` (height follows the pane ratio), position clamped so the view stays inside `[-W*0.25, W*1.25] × [-H*0.25, H*1.25]`.

- [ ] **Step 1: Write failing tests**: `fmtYearBc` (`{ year: -480 }` → `480 г. пр.Хр.`; `{ year: -480, approx: true }` → `ок. 480 г. пр.Хр.`), `fmtYearAd` (`46` → `46 г. сл.Хр.`, `1396` → `1396 г.`), `fmtYearDeepTime` (`-40000` → `преди 42000 години`; `-1400000` → `преди 1400000 години` rounded to 10 000), `fmtYearPrefersLabel` (`{ year: -1200, label: 'преди 40 000 години' }` → the label), `fmtSpanBothBc` (`[-1300, -250]` → `1300 — 250 г. пр.Хр.`), `haversineKnownDistance` (Sofia `[23.32, 42.7]` to Plovdiv `[24.75, 42.15]` is 133 km ± 3), `boxToViewBoxFitsAndCentres` (a square box in a wide pane: the box centre maps to the free rect centre), `clampViewBoxLimits` (width below `minW` becomes `minW`; a view far outside the world is pulled back).
- [ ] **Step 2: Run** `cd tools && npm test` → FAIL (modules missing). Imports use `../../js/years.js` and `../../js/geo.js`.
- [ ] **Step 3: Implement** both modules, dependency-free (no `GEO` access; `P` is passed in).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: year formatting and camera geometry helpers`.

### Task 3: Map API for lessons: borders, ghost, markers from cards, camera from boxes

**Files:**
- Modify: `js/map.js`

**Interfaces:**
- `showBorders(ids, ghostId?)`: builds a layer like a frame layer (paper rect, then each border from `GEO.borders[id]` drawn with the same fill/glow/outline rules as frames: `kind === 'tribes'` hatched, `state` filled; the first `state` border is the main one and gets the uppercase label), plus the ghost: `GEO.borders[ghostId].d` as a dashed outline (`stroke #5b4a33, width 2, dasharray 8 6, opacity .55`) with the text `${n} преди` at `(lx, ly + 22)`. Cross-fades like frames do. Label font size scales with `lr` as frames do (`clamp(lr * .55, 15, 46)` for main, `clamp(lr * .42, 9, 42)` for others).
- `flyTo(box, { ms = 900 })`: uses `boxToViewBox` from `js/geo.js` with the current free rect, stores the box as the "home" box, clears the user-moved flag, eases the viewBox with the existing tween.
- `setMarkers(list, onClick)`: list items `{ id, at, kind, title, photo }`; icon by kind through a lookup `{ person: crown, people: crown, place: building, state: building, object: star, event: star, idea: star }` using the SVG icon strings already in the file; `photo` sets the background image when given; de-overlap as today; clicking calls `onClick(marker)`.
- `drawPath(points)` as today's `drawMigration` but from an argument.
- The HUD year, legend and the lesson timeline are not the map's job.

- [ ] **Step 1: Implement** the four methods in `js/map.js`. No new tests at node level (SVG); the check is visual in Step 2.
- [ ] **Step 2: Smoke check** with a temporary console call in the browser: `const m = BGTT.map; m.showBorders(['odrysae-peak', 'macedon-431'], 'odrysae-core'); m.flyTo([21, 39.5, 30.2, 45.9])` → the map shows a filled red realm with the uppercase label `ОДРИСКО ЦАРСТВО`, a blue Macedonia, a dashed ghost with `Одриско царство преди`, and 0 console errors. Expose `BGTT.map = map` in `free.js` for this.
- [ ] **Step 3: Commit** `feat: map draws lesson borders, ghost outline and card markers`.

### Task 4: Lesson pane, router and part rendering

**Files:**
- Create: `js/lesson.js`, `css/lesson.css`
- Modify: `index.html` (lesson pane markup, `<link rel="stylesheet" href="css/lesson.css">`), `js/app.js` (route `#lesson/<id>/<n>`)

**Interfaces:**
- `startLesson(map, lesson, { part = 0 }) → { goTo(n), next(), prev(), current() }`. `n` is the index into `lesson.parts` (0 = summary, last = check).
- Markup added to `index.html` (ids are the contract for later tasks): `<aside id="lesson" hidden>` containing `#lsHead` (chips row `#lsCrumbs` with `.chip.grade` and `.chip`, `h1#lsTitle`, chapter chips `#lsSteps`), `#lsBody` (scrollable), `#lsPop` (card pop-over, Task 6), `#lsNav` with `button#lsPrev`, `button#lsNext`, `span.hint`. The map pane gets `#lsHud` (`#lsYear`, `#lsEra`), `#lsLegend`, `#lsTl` (Task 5) and `button#lsReturn` (Task 7).
- `app.js`: `#lesson/<id>` → `startLesson(map, CONTENT.lessons[id], { part: n ?? 0 })` (Task 6 changes the default to the stored position); unknown id → `#lsBody` shows `Няма такъв урок.` and a link `Към началото` (`#free`); the intro is skipped in lesson mode; `body.classList.add('lesson')` switches the layout (map pane 56 percent / pane 44 percent on laptops; map 42vh on phones at `max-width: 820px`).
- Rendering per part type:
  - summary: picture block, meta chips (`fmtSpan(lesson.span)`, `Преглед на урока`), `h2`, `p.lead`, `ol.goals` (one `li` per goal with a numbered badge), `.names` chips from `names` card ids (`CONTENT.cards[id].title` bold plus the first three words of `dates` or nothing), `.onmap` line listing marker titles, `.teaser` with `<small>Следва</small>` and `next`.
  - story: picture block, meta chips (`fmtYear(meta)`, `Част ${n} от ${storyCount}`), `h2`, `html`, `.fact` with `<span class="t">Знаеш ли, че…</span>` + `factHtml`, `.onmap` line, `dl.words` from `words`, `.teaser` when `next` exists.
  - check: delegated to Task 9 (render `Проверка` heading and a placeholder until then).
- Picture block: `CONTENT.photos[meta.photo]` → `<img src="{f}">` with credit `Снимка: <a href="{u}">{a}</a>, {l}`; missing key or `img.onerror` → `.noimg` placeholder with the kind icon, no broken image.
- Chapter chips: one per part; summary chip text `Начало`, story chips `${n}. ${short}` where `short` is the heading cut at the first ` — `, ` — ` or `:` and at most 24 characters, check chip `Проверка`; classes `cur|done|todo`; click → `goTo`.
- Position: the hash is updated to `#lesson/<id>/<n>` with `history.replaceState` on every part change (Task 6 adds `setPosition(lessonId, n)` and resuming from the stored position).
- Keyboard: ArrowRight/ArrowLeft → next/prev; Escape closes the pop-over (Task 6).

- [ ] **Step 1: Write the failing test** `tools/test/web-lesson-helpers.test.mjs` for two pure helpers exported from `js/lesson.js`: `shortHeading('Ситалк — царството в разцвет') === 'Ситалк'`, `shortHeading('Кои са траките') === 'Кои са траките'`, `photoBlock(null)` returns HTML containing `class="noimg"`, `photoBlock({ f: 'photos/x.jpg', a: 'A', l: 'CC0', u: 'https://u' })` contains `photos/x.jpg` and `Снимка:`. Keep these helpers free of DOM access so Node can import the module (guard any DOM use behind functions).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `js/lesson.js`, `css/lesson.css` (port the spike's pane, chips, fact, words, teaser, goals, names styles; dark text on the paper palette already in `index.html`), the markup and the route.
- [ ] **Step 4: Run** `npm test` → PASS. **Smoke check**: `#lesson/5-odrisko-tsarstvo` shows `Какво ще научим` with 7 goals and 6 name chips; `#lesson/5-odrisko-tsarstvo/3` shows `Ситалк — царството в разцвет` with 3 paragraphs, a fact box and 2 explained words; `#lesson/nope` shows `Няма такъв урок.`; 0 console errors on all three; at 390 px width the map is on top and the pane below.
- [ ] **Step 5: Commit** `feat: lesson pane renders summary and story parts from content.js`.

### Task 5: The map follows the part; lesson timeline strip and whole-history bar

**Files:**
- Create: `js/timeline.js`
- Modify: `js/lesson.js`, `index.html` (`#lsTl` markup: `#lsTlHead`, `#lsTrack` with `#lsBands`, `#lsDots`, `#lsTicks`, `#lsKnob` (traveller head image), `#lsBig`), `css/lesson.css`

**Interfaces:**
- `createTimeline(rootEl, lesson, { onPick(n) }) → { setPart(n) }`. Bands from `lesson.eras` with colours by class: `{ tribes: '#b07a3c', main: '#c8402f', other: '#5f84b5', main2: '#d98c6a' }`; band text hidden when the band is narrower than 10 percent of the span. Ticks every 200 years across `lesson.span`, the first labelled `${n} г. пр.Хр.`, the rest just the number (positive numbers for BC). One dot per story part at its `year` (label-only parts get no dot); knob (`traveler-head.svg`) slides with a 0.9 s CSS transition; hidden on the summary, the check, and label-only parts. Head line: `Линия на времето на урока: <b>{fmtSpan(span)}</b>` and on the right `{n} от {storyCount}: {short}` or `Преглед на урока`. The whole-history bar below: segments `[-1300, 46, 'Траки', '#b07a3c'], [46, 681, 'Рим и Византия', '#8a5fb0'], [681, 1396, 'България', '#c8402f'], [1396, 1878, 'Османска власт', '#3e8a6a'], [1878, 2026, 'България', '#c8402f']` spanning `lesson.big`, a red frame over `lesson.span`, labels `1300 пр.Хр., Хр., 681 България, 1396, 1878, днес`, caption `Къде сме в цялата история`. When `lesson.strip === false` the strip is hidden and only the bar shows, its frame clamped to the left edge with the text `много по-рано`.
- On each part change `lesson.js` does, in order: `map.showBorders(meta.borders, ghostId)` where `ghostId` is `meta.ghost` if given, else the previous story part's main border when it differs from this part's main border, else none; `map.setMarkers(markersFromCards(meta.marks), onMarkerClick)`; `map.drawPath(meta.path ?? null)`; `map.flyTo(meta.box)`; `#lsYear` = `fmtYear(meta)` (summary: `fmtSpan(span)` in a smaller size); `#lsLegend` one pill per border (hatched swatch for tribes); `timeline.setPart(n)`.
- `markersFromCards(ids) → Marker[]` maps card ids to `{ id, at, kind, title, photo: CONTENT.photos[card.photo]?.f }`, skipping cards without `at` (and logging a warning once). Lessons have no separate city list: the free timeline's `CITIES` start at 600 and are not shown in lesson mode; ancient towns (Севтополис, Филипопол, the colonies) are `place` cards used as marks.

- [ ] **Step 1: Write failing tests** in `tools/test/web-timeline.test.mjs` for pure exports of `js/timeline.js`: `bandLayout(eras, span)` returns flex weights proportional to each era's length and `hideLabel: true` for a band under 10 percent; `tickYears([-1300, -250])` → `[-1200, -1000, -800, -600, -400]`; `bigLayout(span, big)` → `{ left: 0, width: ... }` percentages with the frame at the left edge when `span[0] <= big[0]`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Smoke check**: step through parts 0 to 7 by hash; at part 3 the map shows `ОДРИСКО ЦАРСТВО`, the ghost `Одриско царство преди`, a dashed arrow, 3 markers, the knob at 431 and the band `Одриско царство` highlighted; at part 6 the legend shows three pills; inject a label part in the console (`CONTENT.lessons['5-odrisko-tsarstvo'].parts[1].meta = { ...meta, label: 'преди 40 000 години', year: undefined }` then `goTo(1)`) → the year corner shows the label and the knob is hidden; 0 console errors.
- [ ] **Step 6: Commit** `feat: map, year, legend and timeline strip follow the lesson part`.

### Task 6: Card pop-over and progress store

**Files:**
- Create: `js/cards.js`, `js/store.js`, `tools/test/web-store.test.mjs`
- Modify: `js/lesson.js` (wire term and marker clicks), `css/lesson.css`

**Interfaces:**
- `store.js` (also wired in `app.js`: when the hash has no `/<n>`, start at `loadProgress().position[id] ?? 0`; `lesson.js` calls `setPosition` on each part change): `loadProgress() → { passed: {}, cards: [], position: {} }` (defaults when missing or unparsable; `try/catch` around every storage access), `saveProgress(p)`, `markCardOpened(id)` (de-duplicated), `markPassed(lessonId)` (ISO date), `setPosition(lessonId, n)`. The storage object is injectable for tests: `createStore(storage)`; the default export uses `window.localStorage`.
- `cards.js`: `createCards(popEl, { onShowOnMap? }) → { open(id), close() }`. `open(id)` renders `CONTENT.cards[id]`: picture block (same helper as Task 4), `span.kind` with the Bulgarian label by kind `{ person: 'Личност', place: 'Място', object: 'Предмет', people: 'Народ', idea: 'Понятие', event: 'Събитие', state: 'Държава' }`, `h3` title, `dates` line when present, `card.html`, a `×` button; calls `markCardOpened(id)`. Closes on `×`, Escape, a click in `#lsBody` outside a term, and on part change. In `lesson.js`: after rendering a part, every `b.term[data-card]` gets a click handler → `cards.open(id)`; marker click → `map.setActiveMarker(id)` + `cards.open(id)`.

- [ ] **Step 1: Write failing tests** `web-store.test.mjs` with a fake storage object: `loadsDefaultsWhenEmpty`, `loadsDefaultsWhenCorrupt` (storage holds `{not json`), `markCardOpenedDeduplicates`, `markPassedWritesDate`, `setPositionPerLesson`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `store.js` and `cards.js`. **Step 4: Run** → PASS.
- [ ] **Step 5: Smoke check**: at part 1 click the bold `траките` → pop-over with `Народ`, title `Траките` and a picture; Escape closes it; click the marker `Троя` → pop-over `Място`/`Троя`; `JSON.parse(localStorage.bgtt).cards` contains `thracians` and `troy`; 0 console errors.
- [ ] **Step 6: Commit** `feat: card pop-over from terms and markers; progress store`.

### Task 7: Pan and zoom with "Върни ме"

**Files:**
- Modify: `js/map.js`, `js/free.js` (wheel toggle), `index.html` (`button#lsReturn`, free-mode toggle `button#wheelMode`), `css/lesson.css`

**Interfaces:**
- `map.setMode('lesson')`: pointer drag pans (pointer capture, ignore drags starting on a marker), wheel zooms about the cursor, pinch zooms (two pointers), all through `clampViewBox` with `minW = 50 km` in map units (`50 / 111 * GEO.k` at the equator scaled by `GEO.cx`, computed once) and `maxW = GEO.W`. After any hand move `onUserMove(true)`; `flyTo`/`resetCamera` → `onUserMove(false)`.
- `map.setMode('free')`: wheel scrubs the year as today unless `wheelZoom` is on; two-finger drag and pinch always move the map; `button#wheelMode` in the corner toggles `wheelZoom` with the labels `Колелце: година` / `Колелце: мащаб`.
- `button#lsReturn` (`Върни ме`) is shown when `onUserMove(true)` and hidden on `false`; click → `map.resetCamera()`. Next/Prev call `flyTo` for the new part, which clears the flag.

- [ ] **Step 1: Implement** in `map.js` and wire the buttons.
- [ ] **Step 2: Smoke check** (Playwright): in lesson part 3, `mouse.wheel` over the map changes the viewBox width by at least 10 percent and `#lsReturn` becomes visible; click it → viewBox returns to within 1 percent of the home box and the button hides; pan by drag, then click Next → the camera lands on part 4's box with the button hidden; zoom in 20 times → the viewBox width never drops below the 50 km limit; in free mode the wheel still changes the year and `#wheelMode` flips it to zoom; 0 console errors.
- [ ] **Step 3: Commit** `feat: pan and zoom on the map with a return button`.

### Task 8: Prediction block

**Files:**
- Create: `js/predict.js`
- Modify: `js/lesson.js`, `css/lesson.css`

**Interfaces:**
- `renderPredict(container, predict, onReveal)`: shows `q` and three option buttons before the part's text; any click disables the buttons, marks the chosen one, shows `reveal` in a `.reveal` box, calls `onReveal()`, after which `lesson.js` reveals the text (it is rendered but hidden with the `.held` class until then). No right or wrong colouring. Revealed state is remembered for the sitting (in memory) so Back/Next does not ask again.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Smoke check**: part 5 shows the question and three options and no story text; after a click the reveal `Ето какво става — от запад идва Македония.` and the three paragraphs appear; going Back and Next does not ask again.
- [ ] **Step 3: Commit** `feat: prediction question before the Philip II part`.

### Task 9: The check

**Files:**
- Create: `js/check-state.js`, `js/check.js`, `tools/test/web-check-state.test.mjs`
- Modify: `js/lesson.js` (render the check part through `check.js`; map clicks), `css/lesson.css`

**Interfaces:**
- `check-state.js` (pure): `initialState(questions) → { answers: {}, greenOnce: {} }`; `answer(state, qIndex, isCorrect) → state'` (records the latest and sets `greenOnce[qIndex] = true` on a correct answer); `isPassed(state, questions) → boolean` (every index in `greenOnce`); `tapIsCorrect(q, lonlat) → boolean` using `haversineKm(q.at, lonlat) <= q.tolerance_km`; `orderIsCorrect(q, chosenIds) → boolean` (equal to `q.items`); `chooseIsCorrect(q, idx)`, `pickBorderIsCorrect(q, idx)`, `matchIsCorrect(q, pairsChosen)`.
- `check.js`: `renderCheck(container, map, lesson, { onPassed })` renders the questions one under another, each with its own feedback line. Per type:
  - `tap`: text `Натисни на картата.`; `map.onMapClick` active only while this question is unanswered or being retried; on click, a pin is placed; feedback green `Точно така.` or red with `explain`; the correct spot is shown after a red answer.
  - `order`: the items as chips shown as card titles in a shuffled order (deterministic shuffle by `qIndex`); tapping chips appends them to an ordered row; `Провери` button; `Изчисти` resets.
  - `pick-border`: the three borders drawn on the map with letters `А, Б, В` at their label points (`map.showBorders` of all three with equal styling plus letter labels; add `map.showChoices(ids)` in `map.js` for this) and three buttons `А`, `Б`, `В`.
  - `choose`: option buttons.
  - `match`: left column of card titles, right column of descriptions shuffled; tap one of each to pair; `Провери`.
  - Feedback: `.fb.ok` or `.fb.bad` with one sentence (`explain` when present, else `Виж отново частта.`), a `Виж отново` link to `#lesson/<id>/<part>` when `part` is set, and `Опитай пак` on red which resets that question. When `isPassed` becomes true: `markPassed(lesson.id)` and `onPassed()`; the Next button reads `Към обобщението`.
- `shuffle(list, seed) → list` is pure (a small seeded shuffle) and tested.

- [ ] **Step 1: Write failing tests** `web-check-state.test.mjs`: `tapWithinToleranceIsCorrect` (a point 30 km from `[25.33, 42.62]` is correct at `tolerance_km: 40`; 50 km is not), `orderMustMatchExactly`, `passedOnlyWhenEveryQuestionGreenOnce` (a red after a green keeps the pass), `shuffleIsDeterministicAndComplete`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** both modules and `map.showChoices`. **Step 4: Run** → PASS.
- [ ] **Step 5: Smoke check**: part 8 renders 6 questions; a map click near Sevtopolis turns question 1 green; choosing `Омир` turns question 4 red with the Herodotus explanation and shows `Опитай пак`; after answering all six green the Next button reads `Към обобщението` and `JSON.parse(localStorage.bgtt).passed['5-odrisko-tsarstvo']` is set; 0 console errors.
- [ ] **Step 6: Commit** `feat: end-of-lesson check with instant feedback and retry`.

### Task 10: Recap

**Files:**
- Create: `js/recap.js`
- Modify: `js/lesson.js`, `css/lesson.css`

**Interfaces:**
- `renderRecap(container, map, lesson, timeline)`: shown after the check as a final virtual part (chapter chip `Край`). Content: the lesson lead, the timeline strip with all dots marked done, the name chips from the summary, and a border replay: `map.showBorders` of each story part's main border in order, one per second, then the last one stays (a `Пусни пак` button replays). Buttons: `Към следващия урок` (enabled only when `CONTENT.grades[grade]` has a next entry with `state === 'ready'`, which links to it), `Към началото` (`#free`).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Smoke check**: after the check, Next shows the recap with 6 name chips, the replay changes the main border at least three times within 8 seconds, `Към следващия урок` is disabled, `Към началото` returns to the free timeline; 0 console errors.
- [ ] **Step 3: Commit** `feat: lesson recap with border replay`.

### Task 11: Moving figures on routes

Spec section 5.10 and 6.6. The figure source is still open (spec open question 2); this task uses the free game-icons.net figures, so a later switch to bought figures only replaces files and `content/figures.json`.

**Files:**
- Create: `content/figures/army.svg`, `riders.svg`, `settlers.svg`, `ship.svg`, `walker.svg`; `content/figures.json`; `tools/lib/figures.mjs`; `tools/test/figures.test.mjs` (fixtures under `tools/test/fixtures/`)
- Modify: `tools/build-content.mjs` (read figures, add `CONTENT.figures`, pass `move` into `EVENTS`), `tools/lib/lessons.mjs` (`move` key), `tools/lib/cards.mjs` (`move` key), `tools/lib/photos.mjs` and `tools/fetch-photos.mjs` (figure credits in `CREDITS.md`), `js/map.js`, `js/free.js`, `js/lesson.js`, `index.html` (two keyframes), the eight route sources listed below, regenerated `content.js` and `CREDITS.md`

**Interfaces:**
- Figure files come from `https://game-icons.net/icons/000000/transparent/1x1/<author>/<name>.svg`: army `delapouite/pikeman`, riders `delapouite/cavalry`, settlers `delapouite/old-wagon`, ship `delapouite/caravel`, walker `delapouite/walk`. Download them once with curl into `content/figures/<id>.svg`. `figures.json`: `{ "<id>": { "a": "Delapouite", "l": "CC BY 3.0", "u": "https://game-icons.net/1x1/<author>/<name>.html" } }`.
- `readFigures(dir) → { figures: { [id]: { viewBox, body } }, problems }` in `tools/lib/figures.mjs`: `body` is the inner markup of the `<svg>` with every `fill` attribute removed, so the page colours it; a file without a `figures.json` entry, an entry without a file, or an entry missing `a`, `l` or `u` is a problem. `CONTENT.figures` holds the result.
- `move` key: allowed on lesson story parts and on cards, valid only when the same part or card has `path` and the value is a key of `CONTENT.figures`. `EVENTS` entries carry `move` when the card has it.
- `renderCredits(photos, figures)`: after the photo table, a section `## Фигури`, the line `Фигурите са от [game-icons.net](https://game-icons.net/), лиценз CC BY 3.0.` and a table `| Фигура | Автор | Лиценз | Източник |`.
- `map.drawPath(points, move)`: when `move` is given, after the arrow it adds `g.fig` holding `<use href="#fig-<move>">` that rides the arrow with `animateMotion` + `mpath` (repeat indefinitely). Seconds per run by id: `{ army: 9, riders: 5, settlers: 12, ship: 7, walker: 10 }`, default 9. The figure is mirrored when the path's last point lies west of its first. It stays about 40 screen pixels high at any zoom: its scale is updated whenever the viewBox changes. Ink `#3d2a17` with a cream outline (`stroke #f2e6c6`, `paint-order: stroke`). An inner group bobs (`translateY(-3px)`, 0.5 s alternate) or, for `ship`, rocks (±7 degrees, 1.6 s alternate); the two keyframes go in `index.html`. Symbols `#fig-<id>` are added to `defs` once from `CONTENT.figures`. With `prefers-reduced-motion: reduce` there is no `animateMotion`; the figure stands at the path's end.
- Callers: `free.js` passes `activeEv.move`; `lesson.js` passes `meta.move`.
- Route sources to tag: cards `slavs` settlers, `ongal` riders, `kuber` settlers, `osmanli` army, `botev` walker; in `content/lessons/5/odrisko-tsarstvo.md` the parts with a `path`: the Teres part riders, the Sitalces part army, the Philip II part army.

- [ ] **Step 1: Write failing tests**: `figures.test.mjs` `readsBodyWithoutFill` (fixture svg with `fill="#000"` → body has no `fill=`, viewBox `0 0 512 512`), `figureWithoutCreditIsAProblem`, `creditWithoutFileIsAProblem`; in `lessons.test.mjs` `moveWithoutPathIsAProblem` and `unknownMoveIsAProblem`; in `cards.test.mjs` `cardMoveWithoutPathIsAProblem`; in `photos.test.mjs` `creditsListFigures`; in `build-content.test.mjs` `eventsCarryMove`.
- [ ] **Step 2: Run** `cd tools && npm test` → FAIL.
- [ ] **Step 3: Implement** the build side, download the five figures, tag the eight routes, run `npm run build` and `node fetch-photos.mjs` (it downloads nothing new and rewrites `CREDITS.md`). **Run** `npm test` → PASS.
- [ ] **Step 4: Implement** the map side and the two callers.
- [ ] **Step 5: Smoke check**: free mode `BGTT.setYear(610)` → one `#map g.fig` whose `use` points to `#fig-settlers`; its screen position moves at least 5 px between two samples 1 s apart; its rendered height is 40 px ± 8 both before and after zooming the free map in by about 3 times; lesson part with Sitalces → `#fig-army`; with reduced motion emulated (`page.emulateMedia({ reducedMotion: 'reduce' })`) the figure sits at the arrow's end and does not move; `map.drawPath(points)` without a move draws the arrow and no figure; 0 console errors.
- [ ] **Step 6: Commit** `feat: moving figures ride the route arrows`.

### Task 12: Entry point, clean-up and the full run

**Files:**
- Modify: `index.html` (intro gets a second button `Урок: Древна Тракия` → `#lesson/5-odrisko-tsarstvo`, temporary until plan 3), `README.md` (one paragraph: how to open a lesson by its address), `.gitignore` (remove the `spike/` line)
- Delete: `spike/`

- [ ] **Step 1: Add the intro button and the README paragraph; delete the spike folder.**
- [ ] **Step 2: Full run** (Playwright, laptop size 1440×900 and phone size 390×844): start at `/`, click `Урок: Древна Тракия`, press Next through every part to the recap, answering the check correctly, opening one card and one marker on the way; assert 0 console errors at the end, the recap visible, `localStorage.bgtt.passed` set; then `Към началото` shows the free timeline with 69 dots. Record the exact numbers in the report.
- [ ] **Step 3: Run** `cd tools && npm test` → all green; `npm run build` → no diff.
- [ ] **Step 4: Commit** `feat: lesson entry from the intro; sample removed`.

---

## Plan 3 (to be written when plan 2 lands)

Start screen with the grade choice (5 enabled, 6 and 7 greyed with `скоро`), the lesson list with states (`ready`, `partial`, `other-map`) and gold rings from `progress.passed`, the search box and results over `CONTENT.search` (query normalised with the same rules as `tools/lib/search.mjs`, matched as a substring of the normalised text, results grouped `Картички`, `Уроци`, `Събития`), the card album from `progress.cards`, and `Изтрий напредъка`.
