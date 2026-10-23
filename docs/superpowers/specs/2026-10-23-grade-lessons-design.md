# Пътешествие във времето: grade lessons, encyclopedia cards and search

Design document, 23 October 2026. Written after a brainstorming session with Martin and a clickable sample at `spike/lesson.html` (throwaway; delete after the real build starts).

## 1. Intent

The app today is a free timeline: you drag a slider from 600 AD to today and watch Bulgaria's borders move on a map of the Balkans. It works, and the kid likes it.

The goal is to turn it into a learning aid for school history. Martin's own words: "a visual map of the history in his head" and "something like Google Earth and Wikipedia". A kid in 5th grade should open the app the week a lesson is taught, pick the lesson, and read it as an illustrated story told on the map, at their own pace, with every name and place one click away from a picture and a few extra facts. A short check at the end makes it stick.

Why a map and not a book: borders moving, armies marching and cities appearing on a map stay in memory far better than paragraphs. The map is the backbone. Text, pictures and questions hang on it.

## 2. Who it is for

- One kid in 5th grade in Bulgaria, using the Булвест 2000 textbook "История и цивилизации за 5. клас" (Арнаудов, Цветански, Стойчева, Котларска, ISBN 9789541809648). Lesson order and names follow that book.
- Martin, who reviews every lesson text before the kid sees it.
- Later: the same kid in 6th and 7th grade, when the existing 600–today map already covers the curriculum.

## 3. Goals, non-goals, anti-goals

Goals

- Grade mode: pick a grade, pick a lesson, read it as a story of 6 to 9 parts on the map, tapping Next.
- Full chapter content in our own simple words, not a summary. Each part carries 3 paragraphs plus a "Знаеш ли, че…" fact.
- Encyclopedia cards: every bold term in the text, every marker and every city on the map opens the same card, with a picture, a kind label, a title with dates and two short paragraphs.
- Search over cards, lessons and events, from any screen.
- A visible timeline for the lesson and a thin bar showing where the lesson sits in all of history.
- A summary part at the start of every lesson and a check at the end.
- Content lives in Markdown and JSON files that Martin can edit without touching code.

Non-goals (this round)

- Lessons for Egypt, Mesopotamia and the wider Greek and Roman world. They need a second, wider map. The design leaves room for it (section 9) but it is not built now.
- 6th and 7th grade lessons. The data model supports them; no content is written now.
- Accounts, servers, syncing between devices. Everything is a static site plus browser storage.
- Voice narration, auto-play of lessons.
- Spaced review, the open "explain it yourself" box, and a grade-level progress map. Second round.

Anti-goals: things that would make this a failure even if it worked

- Copying the textbook's text. We write our own text covering the same facts, in simpler words.
- Scores and grades. A wrong answer shows green and red with one sentence of explanation, never "4 out of 7".
- Lessons longer than about 15 minutes of reading. In numbers: 6 to 8 story parts, 3 paragraphs each, 60 to 90 words a paragraph, at most 1800 words of story text per lesson. The validator enforces the word count. The sample lesson is above this and gets trimmed when it becomes real content.
- Broken pictures. Every picture is a local file with a known licence and credit.

## 4. Decisions already made

Each of these was decided in the brainstorming session.

1. Same web app, no second site. The existing free timeline stays as it is. Grade mode and search are added to it.
2. Two maps in the long run: the current Balkans and Black Sea map, and a wider Mediterranean and Near East map for the non-Balkan lessons. Only the Balkans map is built now.
3. The kid taps Next. Nothing advances by itself.
4. Each part shows the full text for that section of the chapter, 3 to 4 paragraphs, not a caption.
5. Bold terms in the text are clickable and open a card with a picture and extra facts.
6. Every lesson opens with a summary part ("Какво ще научим") and closes with a check.
7. The seven parts read as one continuous story. Each part picks up the previous thread in its first sentence and ends with a hook into the next. A "Следва" box names what comes next.
8. Chapter names are visible at the top of the reading pane as a row of chips, with the current one highlighted. The chips are clickable.
9. A lesson timeline strip sits under the map, with era bands, a dot per part and the traveller's head sliding to the current year. Under it, a thin bar of the whole history with the lesson's span framed.
10. When the main border changes between parts, the previous border stays as a faint dashed line labelled "преди", so growth and loss are visible.
11. Pictures are downloaded into the repo, resized to about 900 px wide, with source, author and licence kept next to them. No hotlinking.
12. First-round learning features: the end-of-lesson check (5 to 7 questions, mostly on the map and timeline), one prediction question per lesson inside the story, a recap screen instead of a generated mind map, and a card album.

## 5. The product, screen by screen

### 5.1 Start screen

The current intro (the traveller, "Тръгваме!") gets a second choice: "Свободно пътуване" (today's free timeline) and "Уроци" with grade buttons. Only "5. клас" is enabled; 6 and 7 are shown greyed with "скоро". A search field sits on this screen too.

### 5.2 Lesson list

One screen per grade: the lessons in textbook order, each a row with number, name, the span of years and a small map thumbnail or icon. Lessons whose map is not built yet (the wider world) are shown greyed with "на другата карта, скоро". Done lessons have a gold ring; the ring appears only once the check was passed at least once.

### 5.3 Lesson screen

Layout on a laptop: map on the left, about 56 percent of the width; reading pane on the right. On a phone: map on top, about 42 percent of the height, reading pane below. The sample at `spike/lesson.html` is the reference for look and feel; it reuses the app's existing map style, fonts and colours.

Reading pane, top to bottom:

- Header: grade chip, lesson position ("Древна Тракия · Урок 1 от 4"), search field, lesson title, chapter chips.
- Body: picture with credit, year chip and "Част N от M", heading, paragraphs, fact box, "На картата" line listing the markers, two or three explained words, "Следва" box.
- Footer: Back, Next, keyboard hint. Left and right arrow keys work.

Map pane: year in the corner (or the lesson span on the summary part), era pill, legend of the borders on screen, the lesson timeline strip and the whole-history bar at the bottom.

Per part the map does five things: moves the camera to the part's box, swaps the border layer (with a fade, as the app does today), draws the ghost of the previous main border, places the part's markers, and draws a dashed marching arrow when the part has a path.

Clicking a marker or a city shows its name and opens its card. Clicking a bold term opens its card over the reading pane. The card closes with ×, Escape, Back or Next.

### 5.4 Summary part

The first part of every lesson. Map: the whole lesson at once, usually the largest border of the lesson plus the tribal lands, and four or five markers for the main things to come. Text: a two-sentence lead, a numbered list of what the lesson teaches (one line per story part), a row of names the kid will meet with three words each, and the "Следва" box. The timeline knob is hidden on this part.

### 5.5 Prediction question

One part per lesson carries a question asked before the text is shown, for example "Котис е мъртъв и царството е разделено на три. Какво мислиш, че става сега?" with three choices. Any choice reveals the part's text with one sentence that says what really happened. No right or wrong colouring here; the point is to guess before reading.

### 5.6 Check

After the last story part. 5 to 7 questions, drawn from these types:

- Tap on the map: "Къде беше Севтополис?" A tap within a tolerance circle counts.
- Pick a border: three outlines shown on the map, one question.
- Order on the timeline: drag 4 chips (events or rulers) into order.
- Choose one of three: who, what, when.
- Match: names to three-word descriptions.

Feedback is instant: green or red, one sentence, and a "Виж отново" link that jumps to the part where the answer lives. No score. "Опитай пак" on any red answer. The lesson counts as passed when every question has been answered green at least once in this sitting.

### 5.7 Recap

One screen after the check. The lesson timeline with all its dots, a small replay of the borders (each part's main border for one second, in order), the row of name chips, and the lead sentence from the summary. Buttons: "Към следващия урок", "Към списъка", "Албум".

### 5.8 Card album

A screen that lists every card the kid has opened, grouped by kind, with a count per lesson ("14 от 24 картички от този урок"). Opening a card from the album shows it full screen and offers "Покажи на картата", which opens the lesson part where the card first appears. Stored in browser storage per device.

### 5.9 Search

A search field on the start screen, the lesson list and the lesson header. It searches card titles, card text, lesson titles and part headings, and the existing events of the free timeline. Matching is case-insensitive and ignores the difference between "ъ" and "а" at the end of words and between "й" and "и", so that a kid's spelling still finds things. Results are grouped: Картички, Уроци, Събития. Picking a card opens it; picking a lesson part opens that part; picking an event jumps the free timeline to it.

## 6. Content model

Everything the kid reads lives in `content/`. Code never contains history text.

```
content/
  cards/            one Markdown file per card
    teres.md
    sevtopolis.md
  lessons/
    5/              one folder per grade
      index.json    lesson order and metadata for the grade
      05-01-odrisko-tsarstvo.md
  maps/
    balkans.json    camera boxes, eras for the free timeline, cities, mountains, seas (today in data.js)
  borders/          the hand-drawn polygons (today data-src/defs.mjs), one file per era group
  photos/           downloaded pictures
  photos.json       source, author, licence, size for every picture
```

### 6.1 Cards

A card is a Markdown file with front matter:

```markdown
---
id: teres
kind: person            # person | place | object | people | idea | event | state
title: Терес I
dates: упр. ок. 480–460 г. пр.Хр.
at: [26.3, 42.0]        # lon, lat; optional
years: [-480, -460]     # when it is "alive" on the map; optional
photo: teres-mask.jpg   # key in photos.json; optional
aliases: [Терес, Терес Първи]
---
Първият известен по име цар на одрисите. …

Второ кратко каре с интересен факт. …
```

Rules: two paragraphs, 50 to 90 words each, written for a 10-year-old. Aliases are the exact strings that may appear bold in lesson text; a bold term that matches an alias becomes a link to the card. A bold term with no card stays plain bold.

Cities on the map and markers in lessons reference cards by id, so there is one text per thing.

Two lighter forms are allowed. The 65 events migrated from the free timeline become cards of kind `event` with their existing single paragraph; the validator accepts one paragraph for that kind, and the free timeline renders them exactly as today. A city may have no card at all; then a click shows only its name. Cards are written for cities as lessons need them.

### 6.2 Lessons

A lesson is one Markdown file. Front matter gives the lesson's identity; each level-two heading starts a part; a small front-matter block under the heading drives the map.

```markdown
---
id: 5-odrisko-tsarstvo
grade: 5
number: 26                 # as in the textbook
title: Древна Тракия. Царството на одрисите
textbook: Булвест 2000, урок 26
map: balkans
span: [-1300, -250]
eras:                      # bands of the lesson timeline
  - [-1300, -480, Тракийски племена, tribes]
  - [-480, -341, Одриско царство, main]
  - [-341, -320, Македония, other]
  - [-320, -250, Севт III и наследниците му, main2]
big: [-1300, 2026]         # whole-history bar is always this; listed for clarity
---

## Какво ще научим
<!-- part: summary -->
year: span
box: [20.5, 39.6, 30.2, 46.2]
borders: [thrace-tribes, odrysae-peak]
marks: [odrysae-kings, greek-colonies, philip-ii, valley-of-kings]
photo: panagyurishte.jpg
lead: В този урок ще видиш как …
goals:
  - Кои са траките и къде живеят
  - …
names: [teres, sitalces, kotys-i, philip-ii, seuthes-iii, orpheus]
next: Започваме от най-далечното време — племената на Омир.

## Кои са траките
year: -1200 approx
box: [20.5, 39.6, 30.2, 46.2]
borders: [thrace-tribes]
marks: [troy, triballi, getae, bessi, odrysae]
photo: thracian-horseman.jpg
words:
  - племе: група хора с общ език и обичаи, водена от вожд
  - историк: човек, който проучва и описва миналото
next: От изток идват персите, а след тях — първият цар на траките.

Нашата история започва преди повече от 3000 години. … **траките** …

> Знаеш ли, че… Думата „Тракия“ и днес е …

## Филип II Македонски завладява Тракия
year: -341
predict:
  q: Котис е мъртъв и царството е разделено на три. Какво мислиш, че става сега?
  options: [Трима царе управляват мирно заедно, Отвън идва по-силен съсед, Траките избират нов общ цар]
  answer: 1
  reveal: Точно така става — от запад идва Македония.
…

## Проверка
<!-- part: check -->
questions:
  - type: tap
    q: Къде беше Севтополис?
    at: [25.33, 42.62]
    tolerance_km: 40
    explain: Севтополис е на Тунджа, днес под язовир „Копринка“.
    part: 6
  - type: order
    q: Подреди по време
    items: [teres, sitalces, philip-ii, seuthes-iii]
  - type: pick-border
    q: Коя е границата на царството при Ситалк?
    options: [odrysae-core, odrysae-peak, seuthes]
    answer: 1
  - type: choose
    q: Кой е казал „ако имаха един владетел, щяха да бъдат непобедими“?
    options: [Омир, Херодот, Тукидид]
    answer: 1
    part: 1
```

Rules for story parts: 3 paragraphs of 60 to 90 words each (4 only when a part cannot be split); the first sentence connects to the previous part; the last sentence is a hook; one "Знаеш ли, че…" quote block; two or three explained words; bold only for terms that have cards or are the part's key names.

Front-matter keys in parts are a short fixed list: `year`, `box`, `borders`, `ghost` (default: previous part's main border), `marks`, `path`, `photo`, `words`, `next`, `predict`, and for the summary `lead`, `goals`, `names`. The parser rejects unknown keys so typos surface at build time.

Deep time. The prehistory lesson spans from about 1.4 million years ago to 3000 BC, which no linear strip can show. So a part may give `label: преди 40 000 години` instead of a numeric `year`; the year corner then shows the label. A lesson may set `strip: false` to hide the lesson timeline and show only the whole-history bar, whose frame is clamped to its left edge with the text "много по-рано". Years before 10 000 BC are always written as "преди N години"; years after that as "N г. пр.Хр.".

### 6.3 Borders

The hand-drawn polygons stay in the same form as today (`data-src/defs.mjs`), split into files by period, and gain an `id` so lessons can reference them. The build script clips them to land and writes projected SVG paths, as it does today. Lesson borders and free-timeline frames are the same kind of thing: a free-timeline frame is a list of border ids at a year.

New borders needed for the first round, all approximate and hand-drawn: Thracian tribal lands, the Odrysian core under Teres, the kingdom under Sitalces, under Kotys, Macedon under Philip II (to the Balkan range), the Getae north of the range, Seuthes III's kingdom, Lysimachus' holdings, Greek colony dots, the Roman provinces of Moesia and Thracia (and Dacia if the Roman lesson needs it), the empire split at 395, the migration-era picture that hands over to the existing 600 AD frame.

### 6.4 Build step

A small Node script (`tools/build-content.mjs`, no bundler) reads `content/`, validates it, and writes one `content.js` with everything the page needs: cards, lessons with parts, the search index, photo credits. The page stays plain HTML plus JavaScript served as static files, as today, and still works from the Python server or the NAS. Markdown is converted to HTML at build time with a very small converter (paragraphs, bold, one quote block, lists); no runtime Markdown library.

The script also regenerates `CREDITS.md` from `photos.json`.

### 6.5 Pictures

`tools/fetch-photos.mjs` reads `photos.json`, downloads any picture not yet present from Wikimedia Commons by file name, resizes it to 900 px on the long side, and fills in author and licence from the Commons API. Allowed licences: public domain, CC0, CC BY, CC BY-SA. Anything else fails the build. About 100 kilobytes per picture; a few hundred pictures is fine for the repo.

## 7. First-round lesson scope

The 5th-grade lessons that happen on the Balkans map, in the order of the Булвест textbook. Lesson numbers must be confirmed against the book's table of contents (open question 1). Expected list:

1. Днешните български земи през праисторията: Козарника, Бачо Киро, Карановската могила, Варненският некропол, Магурата. Map: sites only, no borders.
2. Великата гръцка колонизация, the Balkan part: colonies on our Black Sea coast and the Aegean.
3. Древна Тракия. Царството на одрисите (the sample lesson).
4. Култура и религия на траките: treasures, tombs, Orpheus, Dionysus, the Horseman, Perperikon.
5. Общество и всекидневие на траките.
6. Завещано от траките.
7. Македония и Александър, the Balkan part: Philip II, the march of 335 BC across the Haemus.
8. Древна Тракия в римския свят: the conquest, provinces Moesia and Thracia, roads, cities (Serdica, Philippopolis, Nicopolis ad Istrum).
9. Християнството и краят на Античността по нашите земи: Constantine, the split of 395, Goths, Huns, the Slavs arrive. Ends where the free timeline begins, at 600.

Lessons 4, 5 and 6 may be a single textbook lesson or three; the book decides. Where the book has one lesson, we have one lesson.

Lessons 2 and 7 are only half on this map. In this round they cover the Balkan half only: the colonies on our coast, Philip and Alexander on the Balkans. The lesson list shows them as "частично" with a one-line note that the rest comes with the second map, and the check asks only about what was shown. No text-only parts with a still camera; every part has a camera box and something on the map.

Each lesson needs: its Markdown file, 15 to 30 cards (many shared between lessons), 6 to 9 pictures, 2 to 6 borders, 5 to 7 check questions, one prediction question.

## 8. Writing guidelines

- Bulgarian, for a 10-year-old. Sentences under 20 words. One idea per sentence. Explain every term the first time, in the text or in the words list.
- Dates as "480 г. пр.Хр." and "46 г. сл.Хр."; centuries as "V век пр.Хр." with the Roman numeral. "ок." before approximate years.
- Every fact checked against two sources (Bulgarian Wikipedia counts as one; the textbook, a museum site or an academic source as the other). Where sources disagree, say "около" or give the range.
- No copying from the textbook or any site. Martin reads every lesson before it ships.
- Names follow the textbook's spelling (Севт, Котис, Ситалк, Керсеблепт).
- Tone: a curious guide telling a story, speaking to "ти". Questions to the reader are welcome ("Защо точно тук?"). No exclamation marks except in quotes.

## 9. The second map (not built now)

The build script takes a bounding box and writes a geo file. A second run with roughly longitude -6 to 52 and latitude 22 to 50 gives a Mediterranean and Near East map for Egypt, Mesopotamia, Greece and Rome. A lesson's `map` key picks the geo file; everything else is the same. City labels, seas and mountains for that map are a new JSON file. Nothing in this round should assume there is only one map: camera, borders and cities are always looked up through the lesson's map.

## 10. Migration of what exists

- `events.js`, `data.js`, `photos.js` become `content/maps/balkans.json`, `content/photos.json` and, for the events, cards of kind `event` with `years` and `at`. The free timeline keeps working from the built `content.js` with the same behaviour as today.
- `data-src/defs.mjs` and `build.mjs` move under `tools/` and `content/borders/`; the build keeps producing `geo.js`.
- `index.html` grows a router for the three modes (free, lesson list, lesson). Splitting its script into a few files under `js/` is expected; keep plain script tags, no bundler.
- Visual style, fonts and the traveller stay.

## 11. Storage and progress

Browser storage only (`localStorage`), one JSON blob under a single key: lessons passed with date, cards opened, last position in each lesson. A "Изтрий напредъка" button on the start screen. Nothing leaves the device.

## 12. Left to the builder

- Exact HTML structure, CSS and file split, as long as the look matches the sample and the current app.
- How the check's drag-to-order works on touch.
- The marker de-overlap rule when several markers share a valley.
- The search index format and the tokeniser, within the matching rules in 5.9.
- Camera padding so the map never hides under the timeline strip.
- Test approach. Suggested: a content validation step that fails the build on missing cards, photos, borders or malformed parts, plus a short Playwright run that clicks through every lesson and checks for console errors.

## 13. Order of work

The plan covers steps 1 to 4 and the Odrysian lesson in full. Each further lesson is a repeat of one template task (write, draw borders, fetch pictures, write the check, Martin reviews) and is planned as such, one at a time, because the review loop is the critical path. The textbook's table of contents is needed before step 4, since the lesson list shows every 5th-grade lesson, including the greyed ones.

1. Content pipeline: `content/` layout, build script, photo fetcher, migration of today's data. The existing app keeps working at every step.
2. Lesson player with one lesson (the Odrysian kingdom), using the sample as the visual reference: parts, timeline strip, ghost borders, cards, summary, prediction, check, recap.
3. Search and the album.
4. Start screen and lesson list, progress storage.
5. The remaining 5th-grade Balkan lessons, written and reviewed one at a time, in textbook order.

## 14. Open questions for Martin

1. The textbook's table of contents: a photo of the "Съдържание" pages, so lesson numbers, names and the split of the Thrace lessons match the book.
2. Should lesson text be in the first round reviewed by Martin only, or also by the kid's teacher? This changes how formal the fact sourcing needs to be.

Settled as the author's calls after the builder check (Martin can overturn any of them): the free timeline stays at 600 to today in this round; the 15-minute limit wins over the paragraph budget; lessons 2 and 7 cover only their Balkan half for now; migrated events stay one paragraph; the prehistory lesson uses labels instead of numeric years.
