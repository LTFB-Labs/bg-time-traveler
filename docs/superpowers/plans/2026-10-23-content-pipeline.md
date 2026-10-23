# Content Pipeline Implementation Plan (plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all history content out of code into `content/` (Markdown cards and lessons, JSON maps and photos, GeoJSON borders), with a build that validates it and writes the single `content.js` the page loads, while the existing free timeline keeps working unchanged.

**Architecture:** Three Node scripts under `tools/`, no bundler: `build-geo.mjs` (today's `data-src/build.mjs`, plus GeoJSON lesson borders), `build-content.mjs` (parses and validates `content/`, writes `content.js`), `fetch-photos.mjs` (downloads and credits pictures). The page stays static HTML plus plain scripts; `content.js` defines the same globals the page reads today, so `index.html` changes only its script tags in this plan. Plans 2 and 3 build the lesson player, search UI, album and start screen on top of `content.js`.

**Tech Stack:** Node 24 (built-in `node:test`, `fetch`), `yaml` for front matter, `polygon-clipping` for land clipping (already used). Playwright MCP for one smoke check.

**Spec:** `docs/superpowers/specs/2026-10-23-grade-lessons-design.md`

## Global Constraints

- Static site: plain HTML and script tags, no bundler, no runtime Markdown library. Served by `python3 -m http.server 8765` or the NAS.
- Generated files (`geo.js`, `content.js`, `CREDITS.md`) are committed, so serving needs no build.
- New code follows the dprint style: 4-space indent (2 for JSON), single quotes, semicolons, trailing commas in multiline literals, line width 180. Existing `index.html` and `defs.mjs` keep their style.
- All text shown to the kid is Bulgarian. Years: `480 г. пр.Хр.`, `46 г. сл.Хр.`, `ок.` for approximate; before 10 000 BC `преди N години`.
- Card kinds: `person | place | object | people | idea | event | state`. Card body: two paragraphs of 50 to 90 words; kind `event` may have one paragraph.
- Lesson: 6 to 8 story parts, each 3 paragraphs (4 allowed), paragraphs 40 to 110 words (error band; writing target is 60 to 90), at most 1800 story words per lesson. One `Знаеш ли, че…` quote block per story part.
- Part front-matter keys are a closed list: `year`, `label`, `box`, `borders`, `ghost`, `marks`, `path`, `photo`, `words`, `next`, `predict`; summary adds `lead`, `goals`, `names`; check uses `questions`. Unknown keys fail the build.
- Allowed picture licences: `Public domain`, `CC0`, `CC BY` (any version), `CC BY-SA` (any version). Pictures are stored at 900 px on the long side under `photos/`.
- Deviation from the spec, agreed in this plan: the 35 existing free-timeline frames stay in `tools/defs.mjs` in their current form. Only new lesson borders are GeoJSON. Both end up in `geo.js`. Exporting the old frames to GeoJSON is deferred.

## Review Focus

1. A bold term whose alias is part of a longer word ("траки" inside "тракийски"): must not link. Test in Task 5 (`linksOnlyWholeTerms`).
2. A Commons file name with spaces, commas, brackets or Cyrillic: the download URL must still resolve. Test in Task 8 (`buildsEncodedFilePathUrl`).
3. A part with `label` and no `year` (deep time): the lesson must build and the part must carry `label` through to `content.js`. Test in Task 6 (`acceptsLabelInsteadOfYear`).
4. Search for a word typed with a different final letter ("Терес" vs "Тереса", "Севтополис" vs "Севтополиса") and with "й" vs "и": must match. Test in Task 9 (`normalizeFoldsEndings`).
5. A missing photo file referenced by a card, or a border id used by a lesson with no GeoJSON file: the build must exit non-zero and name the file and the offending id. Tests in Task 6 (`reportsMissingReferences`) and Task 10 (`cliExitsOnError`).

---

## File structure

```
tools/
  package.json                 type: module; deps: yaml, polygon-clipping; scripts: test, build, geo, photos
  defs.mjs                     moved from data-src/defs.mjs, unchanged
  build-geo.mjs                moved from data-src/build.mjs + GeoJSON borders → GEO.borders
  build-content.mjs            CLI: content/ → content.js, exit 1 on validation errors
  fetch-photos.mjs             CLI: photos.json → photos/, CREDITS.md
  migrate-legacy.mjs           one-shot: events.js, data.js, photos.js → content/ (deleted after Task 7)
  lib/
    frontmatter.mjs            splitFrontMatter(text) → { meta, body }
    markdown.mjs               renderMarkdown(text) → html; splitParagraphs(text) → string[]
    cards.mjs                  parseCard(text, file) → Card; validateCard(card, ctx) → Problem[]
    lessons.mjs                parseLesson(text, file) → Lesson; validateLesson(lesson, ctx) → Problem[]
    terms.mjs                  linkTerms(html, aliasIndex) → html
    search.mjs                 normalize(s) → string; buildSearchIndex(content) → Entry[]
    photos.mjs                 commonsFileUrl(name, width) → string; isAllowedLicence(s) → boolean; renderCredits(photos) → string
    problems.mjs               problem(file, message) → Problem; formatProblems(list) → string
  test/
    fixtures/content-ok/       a minimal valid content tree (1 card, 1 lesson, 1 border, photos.json)
    fixtures/content-bad/      same with a missing photo and an unknown border id
    *.test.mjs                 one file per lib module
content/
  cards/*.md
  lessons/5/index.json
  lessons/5/*.md
  maps/balkans.json            eras, rulers, cities, mountains, seas, camera, start, end, frames (year → realm ids)
  borders/*.geojson
  photos.json
photos/                        unchanged location
content.js                     generated
geo.js                         generated
```

`content.js` shape (consumed by the page):

```js
const CONTENT = {
    cards: { [id]: { id, kind, title, dates, at, years, photo, aliases, html, lesson } },
    lessons: { [id]: Lesson },
    grades: { '5': [{ id, number, title, span, map, state: 'ready' | 'partial' | 'other-map' }] },
    photos: { [key]: { f, a, l, u, w, h } },
    maps: { balkans: { ERAS, RULERS, CITIES, MOUNTAINS, SEAS, CAMERA, START, END } },
    search: [{ type: 'card' | 'part' | 'event', id, title, text, lesson, part }],
};
// compatibility globals for index.html, removed in plan 2
const EVENTS = /* cards of kind event in legacy shape */;
const PHOTOS = CONTENT.photos;
const { ERAS, RULERS, CITIES, MOUNTAINS, SEAS, CAMERA, START, END } = CONTENT.maps.balkans;
```

Types used across tasks:

```ts
type Problem = { file: string; message: string };
type Card = { id, kind, title, dates?, at?: [number, number], years?: [number, number], photo?, aliases: string[], paragraphs: string[], file };
type Part = { type: 'summary' | 'story' | 'check'; heading; meta: object; paragraphs: string[]; fact?: string; html?: string };
type Lesson = { id, grade, number, title, textbook, map, span: [number, number], eras: Array<[number, number, string, string]>, strip: boolean, parts: Part[], file };
type Entry = { type: 'card' | 'part' | 'event'; id: string; title: string; text: string; lesson?: string; part?: number };
```

---

### Task 1: Tools package and geo build moved under `tools/`

**Files:**
- Create: `tools/package.json`, `tools/.gitignore` (`node_modules/`, `*.geojson` for the Natural Earth downloads)
- Move: `data-src/defs.mjs` → `tools/defs.mjs`; `data-src/build.mjs` → `tools/build-geo.mjs`
- Delete: `data-src/package.json`, `data-src/package-lock.json`
- Modify: `.gitignore` (replace the `data-src/` lines with `tools/node_modules/`, `tools/ne_*.geojson`), `README.md` (build commands)

**Interfaces:**
- Produces: `cd tools && npm run geo` writes `../geo.js`; `npm test` runs `node --test test/`.

- [ ] **Step 1: Create `tools/package.json`** with `"type": "module"`, dependencies `yaml` and `polygon-clipping` (same version as today), scripts `test: node --test test/`, `geo: node build-geo.mjs`, `build: node build-content.mjs`, `photos: node fetch-photos.mjs`.
- [ ] **Step 2: `git mv` the two files**, update the import of `defs.mjs` and the Natural Earth file paths in `build-geo.mjs` so they resolve from `tools/`, and the output path to `../geo.js`.
- [ ] **Step 3: Download the Natural Earth files** named in `build-geo.mjs` into `tools/` (the README lists the sources), run `npm install` and `npm run geo`.
- [ ] **Step 4: Verify** that the regenerated `geo.js` is identical to the committed one apart from the header comment line: `diff <(sed 1d geo.js) <(git show HEAD:geo.js | sed 1d)` prints nothing.
- [ ] **Step 5: Commit** `chore: move the geo build under tools/`.

### Task 2: GeoJSON lesson borders in the geo build

**Files:**
- Modify: `tools/build-geo.mjs`
- Create: `tools/lib/borders.mjs`, `tools/test/borders.test.mjs`, `content/borders/README.md` (how to draw one on geojson.io)

**Interfaces:**
- Produces: `GEO.borders: { [id]: { n: string, kind: 'state' | 'tribes', c: string, d: string, lx, ly, lr } }` in `geo.js`. `d` is a land-clipped SVG path in map pixels, like a frame realm's `d`.
- Produces: `loadBorders(dir) → Array<{ id, name, kind, colour, geometry }>` and `borderToRealm(border, { land, BOX, P }) → GEO.borders[id]` in `tools/lib/borders.mjs`.

A border file is a GeoJSON `Feature` with `properties: { name, kind, colour }` and a `Polygon` or `MultiPolygon` geometry in longitude and latitude. The file name without extension is the id. `kind: tribes` gets the same Chaikin smoothing frames give tribal polygons today.

- [ ] **Step 1: Write failing tests** in `tools/test/borders.test.mjs`:
  - `loadsFeatureWithIdFromFileName`: a fixture `tools/test/fixtures/borders/tri.geojson` (triangle around Plovdiv) loads with `id === 'tri'`, `name`, `kind`.
  - `rejectsMissingProperties`: a feature without `kind` throws an error whose message contains the file name.
  - `clipsToLandAndLabels`: `borderToRealm` on the triangle returns `d` starting with `M`, and `lx, ly` inside the triangle's projected bounding box.
- [ ] **Step 2: Run** `cd tools && npm test` → FAIL, module not found.
- [ ] **Step 3: Implement `tools/lib/borders.mjs`** by extracting `P`, `BOX`, `labelPoint`, `multiPath`, `chaikin` from `build-geo.mjs` into a shared `tools/lib/geo-core.mjs` and calling them. Keep the output numbers identical for frames.
- [ ] **Step 4: Wire it in `build-geo.mjs`:** after frames, `GEO.borders = Object.fromEntries(loadBorders('../content/borders').map(b => [b.id, borderToRealm(b, ctx)]))`.
- [ ] **Step 5: Run** `npm test` → PASS; `npm run geo` → `geo.js` frames unchanged (same diff check as Task 1) and `GEO.borders` present (empty object until Step 6).
- [ ] **Step 6: Add the eight borders from the sample** as GeoJSON files, converting the arrays in `spike/lesson.html` (`THRACE_TRIBES`, `ODRYSAE_CORE`, `ODRYSAE_PEAK`, `ODRYSAE_KOTYS`, `MACEDON_PHILIP`, `GETAE`, `SEUTHES`, `LYSIMACHUS`) with ids `thrace-tribes`, `odrysae-core`, `odrysae-peak`, `odrysae-kotys`, `macedon-philip`, `getae`, `seuthes-iii`, `lysimachus`, and the Macedonia-at-431 polygon as `macedon-431`. Colours: main realms `#c8402f`, Macedon and Lysimachus `#5f84b5`, tribes `#b07a3c`.
- [ ] **Step 7: Run** `npm run geo`; open `geo.js` and check `GEO.borders['odrysae-peak'].d` exists and `lr > 20`.
- [ ] **Step 8: Commit** `feat: lesson borders from GeoJSON in the geo build`.

### Task 3: Front matter and Markdown helpers

**Files:**
- Create: `tools/lib/frontmatter.mjs`, `tools/lib/markdown.mjs`, `tools/test/frontmatter.test.mjs`, `tools/test/markdown.test.mjs`

**Interfaces:**
- `splitFrontMatter(text: string) → { meta: object, body: string }`. Front matter is the YAML between a leading `---` line and the next `---` line; no front matter gives `meta = {}`.
- `splitParagraphs(body: string) → string[]`: blocks separated by blank lines, trimmed, empty ones dropped.
- `renderMarkdown(text: string) → string`: supports paragraphs, `**bold**` → `<b>`, `*italic*` → `<i>`, `> quote` → `<blockquote>`, `- item` → `<ul><li>`, `1. item` → `<ol><li>`. Escapes `<`, `>`, `&`. Nothing else.
- `countWords(text: string) → number`: words are runs of letters or digits (Cyrillic included), so `„Тракия“` counts one.

- [ ] **Step 1: Write failing tests**: `parsesYamlMeta` (nested list in meta), `noFrontMatterGivesEmptyMeta`, `rendersBoldAndQuote` (exact HTML string), `escapesAngleBrackets`, `countsCyrillicWords` (`'Ако имаха един владетел — казва той.'` → 5).
- [ ] **Step 2: Run** `npm test` → FAIL.
- [ ] **Step 3: Implement** both modules. `renderMarkdown` works line by line with a small state machine for list and quote blocks; no regex over the whole document.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat: front matter and markdown helpers`.

### Task 4: Card parser and validation

**Files:**
- Create: `tools/lib/cards.mjs`, `tools/lib/problems.mjs`, `tools/test/cards.test.mjs`, `tools/test/fixtures/cards/teres.md` (the Teres card from the spec, section 6.1)

**Interfaces:**
- `parseCard(text, file) → Card`: paragraphs via `splitParagraphs`; `aliases` is the front-matter list plus `title`, de-duplicated.
- `validateCard(card, ctx: { photos: Set<string> }) → Problem[]` with rules: required `id, kind, title`; `kind` in the closed list; paragraph count 2 (1 allowed for `event`); each paragraph 50 to 90 words except for `event`; `photo` present in `ctx.photos` when given; `at` is `[lon, lat]` within `[12, 42] × [34, 49.5]`; `years` is `[a, b]` with `a <= b`; `id` matches the file name.
- `problem(file, message) → Problem`; `formatProblems(problems) → string` one line per problem `file: message`.

- [ ] **Step 1: Write failing tests**: `parsesTeresCard` (id, kind, two paragraphs, aliases contains title), `rejectsUnknownKind`, `allowsOneParagraphForEvent`, `rejectsMissingPhoto` (message contains the photo key), `rejectsIdNotMatchingFile`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `cards.mjs` and `problems.mjs`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: card parser and validation`.

### Task 5: Term linking

**Files:**
- Create: `tools/lib/terms.mjs`, `tools/test/terms.test.mjs`

**Interfaces:**
- `buildAliasIndex(cards: Card[]) → Map<string, string>` alias → card id; a duplicate alias across two cards is a `Problem` returned alongside: `buildAliasIndex(cards) → { index, problems }`.
- `linkTerms(html: string, index: Map<string, string>) → string`: every `<b>…</b>` whose inner text equals an alias exactly (after trimming) becomes `<b class="term" data-card="ID">…</b>`; other bold stays as is. Matching is on the whole bold text, never a substring.

- [ ] **Step 1: Write failing tests**: `linksWholeBoldTerm`, `linksOnlyWholeTerms` (`<b>тракийски</b>` with alias `траки` stays unlinked; `<b>траки</b>` links), `leavesUnknownBold`, `reportsDuplicateAlias`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** with a regex over `<b>([^<]*)</b>` only, since `renderMarkdown` never nests tags in bold.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: link bold terms to cards`.

### Task 6: Lesson parser and validation

**Files:**
- Create: `tools/lib/lessons.mjs`, `tools/test/lessons.test.mjs`, `tools/test/fixtures/lessons/odrysae.md` (a 2-story-part cut of the spec example in section 6.2, with a summary and a check), `tools/test/fixtures/lessons/deep-time.md` (one part with `label: преди 40 000 години`, `strip: false`)

**Interfaces:**
- `parseLesson(text, file) → Lesson`. Parts split on `## ` headings. The lines right after a heading up to the first blank line are YAML and become `meta`; an HTML comment `<!-- part: summary -->` or `<!-- part: check -->` on the first line sets `type`, otherwise `story`. Body paragraphs via `splitParagraphs`; a paragraph starting with `> ` is the `fact` (its `Знаеш ли, че…` prefix stripped).
- `validateLesson(lesson, ctx: { cards: Map<string, Card>, borders: Set<string>, photos: Set<string> }) → Problem[]`, rules:
  - lesson front matter: `id, grade, number, title, map, span, eras` required; `span[0] < span[1]`; each era inside `span`.
  - exactly one `summary` first, one `check` last, 6 to 8 story parts in between (the fixture is allowed fewer via `ctx.minParts`, default 6).
  - part keys from the closed list for its type; `year` or `label` required on story parts; `year` numeric; `box` is four numbers west, south, east, north; `borders`, `ghost` ids in `ctx.borders`; `marks`, `names` ids in `ctx.cards`; `photo` in `ctx.photos`; `words` a list of single-key maps.
  - story text: 3 or 4 paragraphs, each 40 to 110 words, exactly one `fact`; lesson total at most 1800 words over story paragraphs.
  - `predict`: `q`, `options` (3 strings), `answer` index inside `options`, `reveal`.
  - `check.questions`: 5 to 7 items; each has `type` in `tap | order | pick-border | choose | match`, `q`, and per type: `tap` needs `at`, `tolerance_km`; `order` needs `items` (card ids, 3 to 5); `pick-border` needs `options` (border ids) and `answer`; `choose` needs `options` and `answer`; `match` needs `pairs` (list of `[card id, text]`). Optional `explain`, `part` (1-based story part index within range).
- `renderLesson(lesson, aliasIndex) → Lesson` with `html` per part (`renderMarkdown` then `linkTerms`) and `fact` rendered the same way.

- [ ] **Step 1: Write failing tests**: `splitsPartsAndMeta` (3 parts, types summary/story/check, `meta.year === -1200`, `fact` text), `acceptsLabelInsteadOfYear`, `rejectsUnknownPartKey` (message names the key and the heading), `reportsMissingReferences` (unknown border id and unknown mark id each produce a problem naming the id), `enforcesWordBudget` (a story paragraph of 120 words fails; total above 1800 fails), `validatesCheckQuestions` (a `tap` without `at` fails).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `lessons.mjs`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: lesson parser and validation`.

### Task 7: Migrate today's data into `content/` and switch the page to `content.js`

**Files:**
- Create: `tools/migrate-legacy.mjs` (one-shot), `tools/build-content.mjs` (first version: cards, maps, photos, compatibility globals; lessons and search come in Tasks 9 and 10), `content/maps/balkans.json`, `content/photos.json`, `content/cards/*.md` (66 event cards), `content/lessons/5/index.json` (empty list `[]`)
- Modify: `index.html` script tags (`geo.js`, `content.js`), `README.md`
- Delete: `events.js`, `data.js`, `photos.js`

**Interfaces:**
- `build-content.mjs` exports `buildContent(rootDir) → { content, problems }` and, when run as a CLI, writes `content.js` or prints `formatProblems` and exits 1.
- Event card front matter adds `path` (the migration arrow) and `legacyKind: event | person | building | battle` so the free timeline keeps its icons. The compatibility `EVENTS` array is rebuilt from cards with `legacyKind` as `{ id, y: years[0], kind: legacyKind, at, t: title, d: paragraphs[0], path }`.

- [ ] **Step 1: Write `migrate-legacy.mjs`** that loads the three legacy files with `vm.runInNewContext` and writes: one card per event (`kind: event`, `years: [y, y]`, `legacyKind`, `photo` when `PHOTOS[id]` exists, body = `d`), `content/photos.json` from `PHOTOS` (same keys and fields), `content/maps/balkans.json` with `ERAS, RULERS, CITIES, MOUNTAINS, SEAS, CAMERA, START, END` as they are.
- [ ] **Step 2: Run it once** and inspect three cards by eye (one with a `path`, one without a photo).
- [ ] **Step 3: Write a failing test** `tools/test/build-content.test.mjs::buildsCompatibilityGlobals` against `fixtures/content-ok`: the generated text contains `const EVENTS = [` and `const START = 600`, and `CONTENT.cards` has the fixture card.
- [ ] **Step 4: Implement `build-content.mjs`** (cards, photos, maps, compatibility globals; `lessons: {}`, `grades: { '5': [] }`, `search: []` for now).
- [ ] **Step 5: Run** `npm test` → PASS; `npm run build` → `content.js` written with 66 event cards and no problems.
- [ ] **Step 6: Switch `index.html`** to load `geo.js` and `content.js` only, delete the three legacy files, delete `migrate-legacy.mjs`.
- [ ] **Step 7: Smoke check** with Playwright against `http://127.0.0.1:8765/`: no console errors; `document.querySelectorAll('.dot').length === 66`; after `BGTT.setYear(681)` the card heading reads `Основаването на България` and its image loads.
- [ ] **Step 8: Commit** `refactor: history content lives in content/, page loads content.js`.

### Task 8: Photo fetcher and credits

**Files:**
- Create: `tools/lib/photos.mjs`, `tools/fetch-photos.mjs`, `tools/test/photos.test.mjs`
- Generated: `CREDITS.md` (replaces the hand-written one, same information)

**Interfaces:**
- `photos.json` entry: `{ f: 'photos/<key>.jpg', a, l, u, w, h, src?: '<Commons file name>' }`. Entries with `src` and no file on disk are fetched.
- `commonsFileUrl(name, width = 900) → string`: `https://commons.wikimedia.org/wiki/Special:FilePath/` + `encodeURIComponent(name)` + `?width=` + width.
- `commonsInfoUrl(name) → string`: the `api.php?action=query&prop=imageinfo&iiprop=extmetadata|size|url&format=json&titles=File:…` URL.
- `pickCredit(extmetadata) → { a, l, u }` from `Artist` (tags stripped), `LicenseShortName`, and the file page URL.
- `isAllowedLicence(shortName) → boolean` for `Public domain`, `CC0`, `CC BY …`, `CC BY-SA …`; anything else false.
- `renderCredits(photos) → string` Markdown table sorted by key: file, author, licence, source link.
- `fetchMissing(photos, { fetch, writeFile }) → { photos, problems }`: injectable I/O so the test needs no network.

- [ ] **Step 1: Write failing tests**: `buildsEncodedFilePathUrl` (a name with spaces, a comma, brackets and Cyrillic encodes to one URL with no raw spaces), `rejectsNonCommercialLicence` (`CC BY-NC 2.0` false), `acceptsByAndBySa`, `rendersCreditsTable`, `fetchMissingSkipsExisting` (fake `fetch` is not called for an entry whose file exists).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the module and the CLI (downloads the 900 px thumbnail, saves as JPEG or PNG by content type, fills `a, l, u, w, h`, writes `photos.json` back and `CREDITS.md`).
- [ ] **Step 4: Run** → PASS. Then run the CLI once with the seven sample pictures added to `photos.json` by `src` (file names are in `spike/lesson.html`); check the seven files appear under `photos/` and the credits table lists them with allowed licences.
- [ ] **Step 5: Commit** `feat: photo fetcher with licence check and generated credits`.

### Task 9: Search index

**Files:**
- Create: `tools/lib/search.mjs`, `tools/test/search.test.mjs`
- Modify: `tools/build-content.mjs` (fills `CONTENT.search`)

**Interfaces:**
- `normalize(s: string) → string`: lower-case; `й` → `и`; `ѝ` → `и`; a final `ъ`, `а`, `я`, `о`, `е`, `и`, `ът`, `та`, `то`, `те` on words of 5 letters or more stripped; punctuation removed; whitespace collapsed.
- `buildSearchIndex(content) → Entry[]`: one entry per card (`title + ' ' + aliases + ' ' + plain text`), one per lesson story part (`heading + plain text`, with `lesson` and `part`), one per legacy event (`type: 'event'`, text from its card). `text` is stored already normalized; `title` is the display title.

- [ ] **Step 1: Write failing tests**: `normalizeFoldsEndings` (`normalize('Севтополиса') === normalize('Севтополис')`, `normalize('Тереса')` equals `normalize('Терес')`), `normalizeFoldsIKratko`, `indexesCardsAndParts` (fixture gives one card entry and two part entries with `lesson` and `part` set).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: search index in content.js`.

### Task 10: Lessons in the build, the sample lesson as real content, validation CLI

**Files:**
- Modify: `tools/build-content.mjs` (lessons, grades, alias index, term linking, search), `tools/test/build-content.test.mjs`
- Create: `content/lessons/5/index.json`, `content/lessons/5/odrisko-tsarstvo.md`, cards for the lesson (`content/cards/*.md`, about 24 from the sample's glossary plus the marks), `content/photos.json` entries for their pictures
- Create: `tools/test/fixtures/content-bad/`

**Interfaces:**
- `content/lessons/5/index.json`: `[{ "id": "5-odrisko-tsarstvo", "file": "odrisko-tsarstvo.md", "state": "ready" }, …]`; lessons without a file yet list `title`, `number` and `state: 'other-map' | 'partial'`.
- `CONTENT.grades['5']` is that list enriched with `title, number, span, map` from the parsed lesson when there is one.

- [ ] **Step 1: Write the lesson file** from the sample's text and the spec's format. Trim to the budget: 7 story parts, 3 paragraphs each, 60 to 90 words, under 1800 words total; keep the hooks and the `Следва` lines; add the prediction question before the Philip II part and the check with the four questions from the spec plus two `choose` questions.
- [ ] **Step 2: Write the cards** the lesson references (marks, names, bold terms) following the card rules; reuse the glossary text from the sample, cut to 50 to 90 words per paragraph.
- [ ] **Step 3: Write failing tests**: `buildsLessonWithLinkedTerms` (fixture lesson's first story part `html` contains `class="term" data-card="teres"`), `cliExitsOnError` (spawn `node build-content.mjs --root test/fixtures/content-bad`; exit code 1; stderr names the missing photo key and the unknown border id).
- [ ] **Step 4: Run** → FAIL.
- [ ] **Step 5: Implement** the rest of `build-content.mjs`: load borders ids from `content/borders/*.geojson` file names, parse and validate all cards, build the alias index, parse, validate and render lessons, build `grades`, `search`, write `content.js`; `--root` option for tests.
- [ ] **Step 6: Run** `npm test` → PASS; `npm run build` → no problems; `node -e "const s=require('fs').readFileSync('content.js','utf8'); eval(s); console.log(Object.keys(CONTENT.lessons), CONTENT.search.length)"` prints the lesson id and a count above 80.
- [ ] **Step 7: Smoke check** the free timeline again as in Task 7 Step 7 (nothing visible changes).
- [ ] **Step 8: Commit** `feat: first lesson and its cards as content; build validates everything`.

### Task 11: Documentation and clean-up

**Files:**
- Modify: `README.md` (how to add a card, a lesson, a border, a picture; the three commands), `content/borders/README.md`
- Delete: `spike/` once plan 2 starts; leave it for now.

- [ ] **Step 1: Write the README sections** in Bulgarian, in the style of the current README.
- [ ] **Step 2: Run** `cd tools && npm test && npm run build && npm run geo` → all green, no diff in `geo.js` and `content.js`.
- [ ] **Step 3: Commit** `docs: how content is written and built`.

---

## Plans 2 and 3 (to be written when plan 1 lands)

**Plan 2, lesson player** (spec 5.3 to 5.7, 4.14): `js/` modules loaded with `<script type="module">`: `map.js` (extracted from `index.html`: static map, realm layers, camera, overlay; new: pan and zoom with limits and `Върни ме`), `timeline.js` (lesson strip and whole-history bar), `cards.js` (card pop-over, marker and city clicks), `lesson.js` (parts, ghost border, prediction, check, recap), `app.js` (router: free, lesson). The sample `spike/lesson.html` is the visual reference and is deleted at the end. Tests: `node:test` for pure functions (camera box fitting, year formatting, check scoring) and a Playwright run through all parts of the first lesson.

**Plan 3, ways in** (spec 5.1, 5.2, 5.8, 5.9, 11): start screen with the grade choice, lesson list with states and gold rings, search UI over `CONTENT.search`, card album, progress in `localStorage` under one key with `Изтрий напредъка`.

After plan 3, each further lesson is one template task: write the Markdown, draw borders in geojson.io, add pictures by `src`, run `npm run photos && npm run build`, review with Martin, commit.
