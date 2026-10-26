# Three more grade 5 lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three new lessons after "Царството на одрисите" (Светът на траките, Древна Тракия в римския свят, Залезът на Римската империя), the old lesson trimmed and renumbered, and the made-up "скоро" lessons removed from the lesson hall.

**Architecture:** Almost all of this is content in `learning-materials/`: Markdown lessons, info packs (cards) with photos from Wikimedia Commons, and GeoJSON borders. The build in `tools/` validates everything and writes `content.js`, `geo.js` and `CREDITS.md`, which are committed with the content. The one code change deletes the mock lessons file and the hall's support for it.

**Tech Stack:** Markdown with YAML front matter, GeoJSON, plain ES modules in the browser, Node's built-in test runner (`npm --prefix tools test`).

**Spec:** `docs/superpowers/specs/2026-10-26-three-more-lessons-design.md`, which builds on `docs/superpowers/specs/2026-10-23-grade-lessons-design.md` (sections 3, 7 and 8) and the README section "Как се добавя съдържание". Read all three before starting.

**Before you start:** branch off main (`git checkout -b three-lessons`). Commit on that branch; never push. Leave the untracked `package-lock.json` at the repo root alone. Run `cd tools && npm install` once if `tools/node_modules` is missing.

## Global Constraints

- Lesson rules, enforced by the build: 6 to 8 story parts; 3 or 4 paragraphs per part, 40 to 110 words each (aim for 3 paragraphs of 60 to 90); at most 1800 words of story text; exactly one `> Знаеш ли, че…` per part; 5 to 7 check questions of types `tap`, `order`, `pick-border`, `choose`, `match`; one `predict` per lesson.
- Card rules: two paragraphs of 50 to 90 words (an `event` card may have one paragraph); `at` within longitude 12 to 42 and latitude 34 to 49.5; every id in `related` exists; every file in a pack's folders is listed in `media`.
- New cards never get `legacyKind`. That field puts a card on the free map, which starts at 600.
- Writing: Bulgarian for a 10-year-old; sentences under 20 words; speak to "ти"; no exclamation marks outside quotes; dates as "480 г. пр.Хр." and "46 г. сл.Хр."; centuries as "V век пр.Хр."; "ок." before approximate years; names spelled as the textbook spells them.
- Every fact checked against two sources (Bulgarian Wikipedia counts as one; the book summary, a museum site or an academic source as the other). Where sources disagree, the text says "около" or names who says it. Each task report lists every fact with its two sources.
- Nothing is copied from the textbook, domashno.bg or any site. Write each sentence fresh.
- Photos: Wikimedia Commons only, free licences only (public domain, CC0, CC BY, CC BY-SA; no NC or ND), 6 to 9 per lesson, fetched with `npm --prefix tools run photos`.
- After any content change: `npm --prefix tools run build` with no problems; after any border change, `npm --prefix tools run geo` first. Commit `content.js`, `geo.js` and `CREDITS.md` with the content that changed them.
- New code and test edits: 4-space indent, single quotes, semicolons, trailing commas in multiline literals.
- Browser checks: the repo root is served at http://127.0.0.1:8765/ (start `python3 -m http.server 8765` from the repo root if nothing listens there). Hard-reload after each build. Close the test browser when done; it runs animations unthrottled.
- Book summaries to work from, never to copy: `/private/tmp/claude-502/-Users-martin-apostolov-work-projects-bg-time-traveler/6cc1f1bb-70ee-491c-b57d-32ae29ffcc3f/scratchpad/book/`. If that folder is gone, fetch `https://domashno.bg/istoriq/5/bulvest/<name>` again.

## Review Focus

- **A new alias steals an old bold word.** A card alias such as "Тракия" or "Рим" would turn the same bold word in another lesson into a link to the wrong card. Each lesson task diffs the old lessons' term links before and after (Task 4, step 6).
- **A border that hides or swaps land.** A Danube edge drawn a little off puts a Roman city on the wrong side, or a border vanishes after clipping to land. Task 3 checks named cities inside and outside every border.
- **The last lesson has no next lesson.** On lesson 52's summary, "Към следващия урок" must not lead to a dead end. Task 6 checks it.
- **A trimmed lesson whose check still asks about what was cut.** Task 2 re-reads every check question of lesson 37 against the trimmed text.
- **The lesson hall with only four cards.** The hall's left and right scrolling was tried with 14 cards. With fewer, it must still show all of them and no stray arrows. Task 1 checks the hall with one card, and Task 6 checks it with four.

---

### Task 1: Remove the made-up lessons from the hall

**Files:**
- Delete: `modules/lesson/mock-lessons.js`
- Modify: `modules/lesson/lesson-list.js` (lines 1-31 and the call in `startLessonList`)
- Modify: `tools/test/web-lesson-list.test.mjs` (the test `mocksComeAfterTheRealLessonsAndDoNotOpen`)

**Interfaces:**
- Produces: `hallCards({ grades, lessons, photos, passed })` with no second parameter, returning one card per entry in the grade lists. A grade list entry without `file` still shows as "Скоро".

- [ ] **Step 1: Delete the mock test.** Remove `mocksComeAfterTheRealLessonsAndDoNotOpen` from `tools/test/web-lesson-list.test.mjs`.
- [ ] **Step 2: Delete the mocks.** Delete `modules/lesson/mock-lessons.js`. In `lesson-list.js` remove its import, the `mocks` parameter, the `made` list and the `MOCK_LESSONS` argument in `startLessonList`. `hallCards` returns `real` directly. In the header comment, replace "a mock one (mock-lessons.js) shows as "скоро"" with "an entry without a file shows as "скоро"".
- [ ] **Step 3: Run the tests.** Run `npm --prefix tools test`. Expected: all pass. Run `grep -rn "mock" modules`. Expected: no output.
- [ ] **Step 4: Check the hall.** Open http://127.0.0.1:8765/#lessons. Expected: exactly one card, "Урок 26 · Древна Тракия. Царството на одрисите", that opens the lesson; no "Скоро" cards; no scroll arrows pointing at nothing; no console errors.
- [ ] **Step 5: Commit.**

```bash
git add -A modules/lesson tools/test/web-lesson-list.test.mjs
git commit -m "chore: the lesson hall shows only real lessons; the made-up скоро lessons are gone"
```

### Task 2: Trim and renumber the Thracian kingdom lesson

**Files:**
- Modify: `learning-materials/lessons/5/odrisko-tsarstvo.md`
- Regenerated: `content.js`

**Interfaces:**
- Produces: lesson `5-odrisko-tsarstvo` with `number: 37` and `textbook: Булвест 2000, урок 37`. Its last story part hands over to lesson 38, "Светът на траките".

- [ ] **Step 1: Renumber.** Set `number: 37` and `textbook: Булвест 2000, урок 37` in the front matter.
- [ ] **Step 2: Trim part 6, "Севт III и Севтополис".** Keep Севт III and Севтополис. Cut Голямата Косматка, the gold wreath and the bronze head down to one sentence that says his tomb is near Казанлък and that the next lesson opens it. Replace the fact box about the Казанлък tomb with a different fact about Севт III or Севтополис. Drop `golyama-kosmatka` and `kazanlak-tomb` from the part's `marks` if the text no longer names them.
- [ ] **Step 3: Trim part 7, "Завещано от траките".** Keep the treasures (Вълчитрън, Панагюрище, Рогозен) and the old names (Хемус, Хеброс). Shrink Orpheus and Eurydice, Dionysus, Perperikon, the Свещари tomb and the Horseman to short mentions, at most two sentences together. Rewrite "За това ще научиш в следващия урок" and "Следващия път на картата ще дойдат римските легиони" so they point to the next lesson, about what the Thracians believed. Write "около 45–46 г. сл.Хр." for the province, and "според гръцкия писател Плутарх" before calling Spartacus a Thracian. Update the part's `next` box and `marks` to match.
- [ ] **Step 4: Update the summary part.** Its `goals` list still promises "какво крият могилите край Казанлък" and "легенди". Rewrite those two goals to match the trimmed parts.
- [ ] **Step 5: Check the check.** Read every question in `## Проверка` against the trimmed text. Every answer and `explain` must still be found in the part its `part:` points to. Fix any that are not.
- [ ] **Step 6: Build.** Run `npm --prefix tools run build`. Expected: no problems, and the word count of every paragraph within the limits.
- [ ] **Step 7: Check in the browser.** Open http://127.0.0.1:8765/#lesson/5-odrisko-tsarstvo/6 and /7. Expected: the trimmed parts read as a story, the hand-off names the Thracians' beliefs, the map marks match the text. The hall card reads "Урок 37".
- [ ] **Step 8: Commit.**

```bash
git add learning-materials/lessons/5/odrisko-tsarstvo.md content.js
git commit -m "feat: the Thracian kingdom is lesson 37, its last two parts leave beliefs and tombs to the next lesson and hand over to it"
```

### Task 3: Roman-era borders

**Files:**
- Create: ten files in `learning-materials/maps/borders/`, listed below
- Regenerated: `geo.js`

**Interfaces:**
- Produces these border ids for Tasks 4 to 6. Name is the `name` property, shown on the map.

| Id | Name | Kind | Colour | Shape |
|---|---|---|---|---|
| `rome-macedonia` | Македония (римска) | state | `#8a5fb0` | Roman Macedonia in 146 BC: Adriatic coast of Epirus to the Mesta, north to about Скупи |
| `thracian-kingdom` | Тракийско царство | state | `#c8402f` | The dependent kingdom, about 15 to 46 AD: Haemus to the Aegean, Mesta to the Black Sea |
| `moesia` | Мизия | state | `#8a5fb0` | Danube to Haemus, from the Drina to the Danube delta, Dobruja included |
| `thracia` | Тракия (римска) | state | `#8a5fb0` | The province of 46 AD; same outline as `thracian-kingdom` |
| `dacia` | Дакия | state | `#8a5fb0` | Trajan's Dacia: Banat, Oltenia, Transylvania inside the Carpathians |
| `rome-251` | Римска империя | state | `#8a5fb0` | Everything south of the Sava and Danube, plus Dacia, Anatolia and Italy |
| `goths` | Готи | tribes | `#7d6b5a` | North of the Danube east of Dacia: Muntenia, Moldavia, the steppe to the Dnieper |
| `rome-east-395` | Източна Римска империя | state | `#8a5fb0` | Balkans east of the line from the Sava at the Drina down to Lake Scutari, plus Anatolia |
| `rome-west-395` | Западна Римска империя | state | `#4f8f8a` | Italy, Dalmatia and Pannonia west of that line |
| `huns` | Хуни | tribes | `#c6a54c` | North of the Danube: the Pannonian plain, Wallachia and the steppe |

`#8a5fb0` is the free map's colour for Byzantium, so Rome on the lessons runs into Byzantium at 600. `#c6a54c` is the free map's steppe colour.

- [ ] **Step 1: Draw the borders.** Write each file as one GeoJSON `Feature` (Polygon or MultiPolygon) with `name`, `kind` and `colour`, 7 to 25 points, the way the existing files are. Take the Danube, Sava, Haemus and Carpathian edges from the arrays `DAN`, `SAVA`, `BLK` and `CARP` at the top of `tools/defs.mjs`, and the Balkan outline from `BALKANS` and `ANATOLIA` there. Coasts can run out to sea; the build clips every border to land.
- [ ] **Step 2: Check cities on both sides.** Save this script in the scratchpad (not in the repo) and run it from the repo root with `node <scratchpad>/check-borders.mjs`. Expected: no line starting with `WRONG`.

```js
import fs from 'node:fs';
// [lon, lat] of places that must sit inside (+) or outside (-) each border
const P = { serdica: [23.32, 42.70], philippopolis: [24.75, 42.15], thessaloniki: [22.94, 40.64], dyrrachium: [19.45, 41.32], ratiaria: [22.9, 43.8], novae: [25.38, 43.62], marcianopolis: [27.58, 43.32], bizye: [27.75, 41.57], sarmizegetusa: [22.79, 45.51], napoca: [23.6, 46.77], bucharest: [26.1, 44.43], iasi: [27.6, 47.16], constantinople: [28.98, 41.01], nicomedia: [29.92, 40.77], naissus: [21.9, 43.32], salona: [16.48, 43.54], sirmium: [19.61, 44.97], rome: [12.5, 41.9], szeged: [20.15, 46.25] };
const CHECKS = {
    'rome-macedonia': ['+thessaloniki', '+dyrrachium', '-philippopolis', '-serdica'],
    'thracian-kingdom': ['+philippopolis', '+bizye', '-ratiaria', '-thessaloniki'],
    moesia: ['+ratiaria', '+novae', '+marcianopolis', '-philippopolis', '-bucharest'],
    thracia: ['+philippopolis', '+serdica', '+bizye', '-novae'],
    dacia: ['+sarmizegetusa', '+napoca', '-bucharest', '-serdica'],
    'rome-251': ['+serdica', '+sarmizegetusa', '+nicomedia', '+rome', '-bucharest', '-iasi'],
    goths: ['+bucharest', '+iasi', '-serdica', '-sarmizegetusa'],
    'rome-east-395': ['+serdica', '+naissus', '+constantinople', '+thessaloniki', '-salona', '-sirmium', '-rome'],
    'rome-west-395': ['+rome', '+salona', '+sirmium', '-naissus', '-serdica'],
    huns: ['+bucharest', '+szeged', '-serdica', '-constantinople'],
};
const inRing = ([x, y], ring) => ring.reduce((inside, [xi, yi], i) => {
    const [xj, yj] = ring.at(i - 1);
    return (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi ? !inside : inside;
}, false);
const inFeature = (pt, { type, coordinates }) => (type === 'Polygon' ? [coordinates] : coordinates).some((poly) => inRing(pt, poly[0]) && !poly.slice(1).some((hole) => inRing(pt, hole)));
for (const [id, checks] of Object.entries(CHECKS)) {
    const { geometry } = JSON.parse(fs.readFileSync(`learning-materials/maps/borders/${id}.geojson`, 'utf8'));
    for (const c of checks) {
        const ok = inFeature(P[c.slice(1)], geometry) === (c[0] === '+');
        console.log(`${ok ? 'ok   ' : 'WRONG'} ${id} ${c}`);
    }
}
```

- [ ] **Step 3: Build the map.** Run `npm --prefix tools run geo`, then `npm --prefix tools run build`. Expected: no errors, and `geo.js` has all ten ids under `GEO.borders`.
- [ ] **Step 4: Commit.**

```bash
git add learning-materials/maps/borders geo.js content.js
git commit -m "feat: borders for Roman Thrace and the late empire: provinces, the split of 395, Goths and Huns"
```

### Task 4: Lesson 38, Светът на траките

**Files:**
- Create: `learning-materials/lessons/5/svetat-na-trakite.md`
- Create: about 8 new info packs in `learning-materials/information/<id>/`
- Modify: `learning-materials/lessons/5/index.json`, and existing packs only to add photos or `related` links
- Regenerated: `content.js`, `CREDITS.md`

**Interfaces:**
- Consumes: borders `thrace-tribes`, `getae`, `seuthes-iii` (existing) and `moesia`, `thracia` (Task 3). Existing cards `orpheus`, `herodotus`, `perperikon`, `thracian-horseman`, `sveshtari-tomb`, `kazanlak-tomb`, `golyama-kosmatka`, `valley-of-thracian-kings`, `seuthopolis`, `seuthes-iii`.
- Produces: lesson `5-svetat-na-trakite`, listed second in `index.json`.

- [ ] **Step 1: Record the old term links.** Run `npm --prefix tools run build`, then copy `content.js` to the scratchpad as `content-before.js`.
- [ ] **Step 2: Research and fact list.** Follow the outline in spec section 5, "Lesson 1". Read the book summaries `svetat-na-trakite.md`, `v-dolinata-na-tsarete-geografiya-na-nadgrobnite-mogili.md` and `taynite-na-mogilata-golyamata-kosmatka.md`. List every fact the lesson will state, each with two sources. Perperikon as a sanctuary of Dionysus is one archaeologist's view: say so in the text or leave it out.
- [ ] **Step 3: Cards and photos.** Create the new packs the outline needs, at least `tatul` (place), `glava-panega` (place) and the Great Mother Goddess and Dionysus (idea). Aliases must be the exact bold forms the lesson uses, and must not repeat an alias of another card. Add 6 to 9 photos with `commons:` names, then run `npm --prefix tools run photos`.
- [ ] **Step 4: Write the lesson.** Front matter: `id: 5-svetat-na-trakite`, `grade: 5`, `number: 38`, `title: Светът на траките`, `textbook: Булвест 2000, урок 38`, `map: balkans`, `span: [-1500, 300]`, `big: [-1500, 2026]`, and eras inside the span. Summary first, 7 or 8 story parts as in the outline, `predict` on the part about burial, check last. Part 8 shows `moesia` and `thracia`. The last part's `next` box hands over to lesson 48, about Thrace in the Roman world.
- [ ] **Step 5: Add to the list and build.** Insert `{ "id": "5-svetat-na-trakite", "file": "svetat-na-trakite.md", "state": "ready" }` after the Thracian kingdom in `index.json`. Run `npm --prefix tools run build`. Expected: no problems.
- [ ] **Step 6: Check that old bold words still link to the same cards.** Compare the rendered HTML of lesson `5-odrisko-tsarstvo` in `content-before.js` and the new `content.js`. Expected: the only differences are links to cards that did not exist before; no existing link changed its card.
- [ ] **Step 7: Play it through in the browser.** Open http://127.0.0.1:8765/#lesson/5-svetat-na-trakite/0. Step through every part: each has a photo, marks that match the text, and a camera box that shows them. Answer the predict question. Pass the check. Reach the summary. Open lesson 37's summary: "Към следващия урок" opens lesson 38. No console errors.
- [ ] **Step 8: Commit.**

```bash
git add learning-materials content.js CREDITS.md
git commit -m "feat: lesson 38, Светът на траките: sanctuaries, gods, Orpheus, the mounds and the Horseman"
```

### Task 5: Lesson 48, Древна Тракия в римския свят

**Files:**
- Create: `learning-materials/lessons/5/trakiya-v-rimskiya-svyat.md`
- Create: about 14 new info packs
- Modify: `learning-materials/lessons/5/index.json`
- Regenerated: `content.js`, `CREDITS.md`

**Interfaces:**
- Consumes: borders `thrace-tribes`, `rome-macedonia`, `thracian-kingdom`, `moesia`, `thracia`, `dacia` (Task 3). Existing cards `spartacus`, `philippopolis`, `odessos`.
- Produces, for Task 6: card `serdica` (place, `at: [23.32, 42.70]`, alias `Сердика`), card `rome` (place, the city, `at: [12.5, 41.9]`, alias `Рим`), card `roman-empire` (state, aliases `Римската империя` and `Римската република`). Lesson `5-trakiya-v-rimskiya-svyat`, listed third.

- [ ] **Step 1: Record the old term links,** as in Task 4, step 1.
- [ ] **Step 2: Research and fact list.** Follow spec section 5, "Lesson 2", and the book summary `drevna-trakiya-v-rimskiya-svyat.md`. Moesia: write "при император Август", no exact year. The province of Thracia: "около 45–46 г.". Spartacus: name Plutarch as the source. The Longinus Sdapeze gravestone from Colchester is a good fact box.
- [ ] **Step 3: Cards and photos,** as in Task 4, step 3, including the three shared cards above.
- [ ] **Step 4: Write the lesson.** Front matter: `id: 5-trakiya-v-rimskiya-svyat`, `grade: 5`, `number: 48`, `title: Древна Тракия в римския свят`, `textbook: Булвест 2000, урок 48`, `map: balkans`, `span: [-200, 400]`, `big: [-1300, 2026]`, and eras inside the span. Seven story parts as in the outline, `predict` before the province of Thracia, Spartacus's march as a `path` in southern Italy. The last part's `next` box hands over to lesson 52, the fall of the empire.
- [ ] **Step 5: Add to the list and build.** Insert `{ "id": "5-trakiya-v-rimskiya-svyat", "file": "trakiya-v-rimskiya-svyat.md", "state": "ready" }` after lesson 38. Run the build. Expected: no problems.
- [ ] **Step 6: Check old bold words,** as in Task 4, step 6, for lessons 37 and 38.
- [ ] **Step 7: Play it through,** as in Task 4, step 7, at #lesson/5-trakiya-v-rimskiya-svyat/0. Years after Christ read "46 г. сл.Хр." on the part and the timeline. Lesson 38's "Към следващия урок" opens lesson 48.
- [ ] **Step 8: Commit.**

```bash
git add learning-materials content.js CREDITS.md
git commit -m "feat: lesson 48, Древна Тракия в римския свят: the provinces, the roads and the Roman towns"
```

### Task 6: Lesson 52, Залезът на Римската империя

**Files:**
- Create: `learning-materials/lessons/5/zalezat-na-rimskata-imperiya.md`
- Create: about 15 new info packs
- Modify: `learning-materials/lessons/5/index.json`
- Regenerated: `content.js`, `CREDITS.md`

**Interfaces:**
- Consumes: borders `rome-251`, `goths`, `rome-east-395`, `rome-west-395`, `huns` (Task 3); cards `serdica`, `rome`, `roman-empire` (Task 5).
- Produces: card `constantinople` (place, `at: [28.98, 41.01]`, aliases `Константинопол` and `Византион`), separate from the 1453 event card `carigrad`; a new card for the battle of Adrianople in 378, separate from `odrin` (the Balkan War). Lesson `5-zalezat-na-rimskata-imperiya`, listed fourth and last.

- [ ] **Step 1: Record the old term links,** as in Task 4, step 1.
- [ ] **Step 2: Research and fact list.** Follow spec section 5, "Lesson 3", and the book summary `zalezat-na-rimskata-imperiya.md`. "Сердика е моят Рим": write "според предание". Both the Edict of Serdica (311) and the Edict of Milan (313) appear.
- [ ] **Step 3: Cards and photos,** as in Task 4, step 3. The existing `vizantia` card is Byzantine rule after 1018; do not reuse it for the Eastern empire of 395.
- [ ] **Step 4: Write the lesson.** Front matter: `id: 5-zalezat-na-rimskata-imperiya`, `grade: 5`, `number: 52`, `title: Залезът на Римската империя`, `textbook: Булвест 2000, урок 52`, `map: balkans`, `span: [250, 480]`, `big: [-1300, 2026]`, and eras inside the span. Seven story parts as in the outline, `predict` before Adrianople, Gothic raids as a `path`. The last part's camera ends at Rome on the western edge. The summary's and last part's `next` boxes point to the free map, where the Slavs and Asparuh come after 600.
- [ ] **Step 5: Add to the list and build.** Append `{ "id": "5-zalezat-na-rimskata-imperiya", "file": "zalezat-na-rimskata-imperiya.md", "state": "ready" }`. Run the build. Expected: no problems.
- [ ] **Step 6: Check old bold words,** as in Task 4, step 6, for lessons 37, 38 and 48.
- [ ] **Step 7: Play it through,** as in Task 4, step 7, at #lesson/5-zalezat-na-rimskata-imperiya/0. Then:
  - Lesson 48's "Към следващия урок" opens lesson 52.
  - On lesson 52's summary, "Към следващия урок" is hidden or disabled, never a dead link.
  - The hall at #lessons shows four cards in this order: 37, 38, 48, 52. All four open.
  - The search finds "Сердика", "Константинопол" and the year 378, and each result opens the right lesson part.
  - No console errors. Close the test browser.
- [ ] **Step 8: Run all tests.** Run `npm --prefix tools test`. Expected: all pass.
- [ ] **Step 9: Commit.**

```bash
git add learning-materials content.js CREDITS.md
git commit -m "feat: lesson 52, Залезът на Римската империя, told from the Balkans: Abritus, Serdica, Constantinople, Adrianople, the split and the Huns"
```

## After the last task

Martin reads four texts before anything ships: lessons 38, 48 and 52, and the trimmed lesson 37. Hand him the four files and the fact lists from the task reports. He also checks the lesson numbers against his copy of the book.
