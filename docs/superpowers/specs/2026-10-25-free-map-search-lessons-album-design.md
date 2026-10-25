# Пътешествие във времето: search, the way into lessons, hidden characters and the album

Design document, 25 October 2026. Written after a brainstorming session with Martin, with two throwaway mockups (the search box placement and an album sketch) in `.superpowers/brainstorm/`. It builds on the grade-lessons design of 23 October (`2026-10-23-grade-lessons-design.md`, "the first design" below) and replaces its sections 5.1, 5.2, 5.8, 5.9 and 5.11 where the two differ. Everything else in the first design still stands, including its content model (section 6) and its writing guidelines (section 8).

## 1. Intent

Martin described how a child uses the app, in his words: "go in the free map as it is quite entertaining - there they can go through the years and ages to see how things change. They can search for something they are interested in. When they have a lesson to learn, they will go to the lesson itself."

So the free map is home. Search follows a child's own curiosity. Lessons are for homework, reached through a quiet side door. Hidden characters and an album turn the free map into a collecting game: a child finds story characters on the map, each one lands in the album as a collected card, and the goal is to collect them all.

Today the app has the free map, one lesson (lesson 26, the Odrysian kingdom), a search index in `content.js` that no screen uses, and a progress store that remembers opened cards but shows them nowhere.

## 2. Goals, non-goals, anti-goals

Goals

- A search box on the free map that finds rulers, battles and other events, places, years, lesson cards and lesson parts, and takes the child there.
- A lesson list that mirrors the textbook: the same lesson numbers and titles, in the same order, because the teacher names a lesson by its number and title.
- About 25 hidden characters on the free map, each with a short first-person greeting and a card telling the story of its place.
- An album holding every character found and every card opened, with counts that show what is left.

Non-goals (this round)

- Search inside a lesson or on the lesson list. The box lives on the free map only.
- Painted figures. The characters are simple figures drawn in code for now. Painted ones can replace them later without changing anything else.
- Lessons other than lesson 26. The list shows the others greyed out; writing them is separate work.
- Characters inside lessons, or before 600 (the first design's section 12a).

Anti-goals: failures even if it works

- Anything that moves forever. A still map runs no animation at all; this was measured in Safari earlier and must stay true (see section 8).
- Pressure. No timers, no lives, no points beyond the counts. The pull is curiosity.
- A search that punishes spelling. A child's spelling must still find things.
- Clutter on the map that a child can't read or tell apart.

## 3. What Martin decided

- Order of work: search first, then the way into lessons, then the hidden characters and the album.
- The search box sits under the year, in the free map's top-left corner (option B of the mockup), not at the top centre.
- A child searches for names of rulers, battles, places or a year. The result behaviour in section 4 matched what Martin saw in the mockup ("the search looks right").
- The lesson list mirrors the textbook's numbers and titles.
- The list shows every lesson in the book, with the unready ones greyed out. Martin will add a photo of the textbook's table of contents.
- Finding a character adds its card to the album as collected. The child's goal is to collect them all.
- The album holds both: the characters found and every card opened.
- A free-map event counts as opened only when the year stops on it, not while the timeline knob passes over it during a drag.
- The figures are drawn simply in code for now.
- Claude drafts the characters' greetings and stories; Martin reviews them before they ship, as with lessons.

## 4. Part 1: search on the free map

### The box

A search field under the year, era chip and ruler line in the free map's top-left corner, with the placeholder "Търси владетел, битка, място или година". Results drop down under it as the child types, over the map's left side.

### What it finds

The index in `content.js` today holds 69 free-map events, 39 lesson cards and the lesson's 7 story parts. Search adds:

- **Rulers:** the 56 entries of `RULERS` in `content/maps/balkans.json`, each `[from, to, title, name]`, such as `цар Симеон Велики 893–927`.
- **Places:** the 21 entries of `CITIES` in the same file. A city has names over periods (`Търново 1185–1965`, `Велико Търново 1965–2027`); each name is searchable.
- **Years:** a query that is a year from 600 to today offers "Иди в N г." as the first result, followed by that year's events.

Matching stays as built: case-insensitive, word endings stripped, й and ѝ read as и (`tools/lib/search.mjs`). Results show grouped, in this order: Година, Владетели, Места, Събития, Картички от уроците, Уроци. Each group shows its title and a short date: a reign, a city name's period, an event's year, a lesson card's dates, a lesson's number.

### What a pick does

| Result | What happens |
|---|---|
| A year | The free map moves to that year. |
| A ruler | The free map moves to the first year of the reign; the ruler line then shows the ruler. |
| A place | The free map moves to the first year (600 or later) the city bears that name, and the city is briefly marked. The mark fades within a couple of seconds. |
| An event | The free map moves to its year and its card shows in the free map's card panel, as when a child steps onto it today. |
| A lesson card | The free map starts at 600, so ancient cards can't be shown on it. The card opens over the free map, with a button to the lesson part where it first appears. |
| A lesson part | The lesson opens at that part. |

A card opened from search counts as opened (for the album). A hidden character picked from search opens its card but does not count as found (section 6).

### Claude's calls (Martin can overturn any)

- Enter picks the first result, the arrow keys move through results, Escape closes the list. While the box has focus, the arrow keys no longer move the timeline.
- A year before 600, or written with "пр.Хр.", offers the lessons whose span holds it.
- On a phone the box keeps its place under the year and the list covers the map.

## 5. Part 2: the way into lessons

### Doors

- The start screen keeps its welcome. Its main button "Тръгваме!" still opens the free map. The direct link to lesson 26 becomes a "Уроци" button that opens the lesson list.
- The free map gets a "Уроци" button in its top-left corner, next to the gear (Claude's call).
- A lesson's header gets a way back to the list (Claude's call).

### The lesson list

- Grade tabs: "5. клас" active; "6. клас" and "7. клас" greyed out with "скоро".
- One row per textbook lesson, in book order: "Урок 26 · Древна Тракия. Царството на одрисите" and the lesson's span of years.
- A ready lesson opens on click. An unready one is greyed out with "скоро" and doesn't open.
- A passed lesson (the check passed at least once) gets a gold ring.
- Until Martin adds the table of contents, the list holds only lesson 26. The unready lessons come from the grade's `index.json`: an entry with a number and a title but no file is shown greyed out.

### Delete progress

A "Изтрий напредъка" button in the settings window. It asks for a second click on the same button ("Сигурен ли си?") instead of a browser dialog (Claude's call). It clears passed lessons, opened cards, found characters and lesson positions, and keeps the chosen marker look.

## 6. Part 3: hidden characters on the free map

Most of the first design's section 5.11 stands. In short:

- About 25 characters across 600 to today, about three per era, each at a place with a story worth telling: monasteries, capitals, battlefields, craft towns, ports, schools.
- A character shows only while the free map's year is inside its years. At most 8 show at once at the whole-map zoom; more appear when the child zooms in. Unfound characters are shown before found ones.
- A tap opens a speech bubble with its greeting, then its card. The first tap marks it found: a gold ring on the figure and a short "Откри нова история!" that fades.
- A counter under the year reads "Открити 7 от 25". Tapping it opens the album.
- A "Следа" button points an arrow from the map's edge toward the nearest unfound character in the current year. If there is none in this year, it names the era with the most left.
- Only a tap on the map counts as found. Opening the character's card through search or the album doesn't.

Changed from the first design:

- **Figures:** simple figures drawn in code, one per figure id of the first design's section 6.6 (ruler, monk, scribe, merchant, peasant, builder, craftsman, soldier, horseman, sailor, teacher, rebel). Ink brown with a thin cream outline, about 32 pixels tall, the same size on screen at any zoom. The Leremy and game-icons options of the first design are not used now.
- **Movement:** a character's small idle loop, and a walking character's walk along its route, run only while the map is awake. The rule matches the living lesson map: awake for 10 seconds after the year changes or the camera moves, slowing to a stop over the last 3 seconds, then fully still with no animation left on the page. The first design had the idle loop running all the time.

### Content

Each character is a card, with the extra keys of the first design's section 6.1: `figure`, `greet`, optional `route`, plus the usual `at` and `years`. The card's two paragraphs tell the story of the place. The greeting is one first-person sentence of at most 15 words. The validator checks the figure id, the greeting's length, and that `at` and `years` are present.

Claude drafts the first batch: a list of about 25 characters (who, where, which years, which figure), then their greetings and cards. Martin reviews the list first, then the texts. Facts follow the two-source rule of the first design's section 8.

## 7. Part 4: the album

A screen with two parts, opened from the character counter on the free map and from a button on the lesson list.

**Герои.** Every character has a slot, grouped by era. A found one shows its figure, name, place and year. A missing one shows a dark shape and a hint of its time, such as "някъде в 13 век", so a child sees what's left and where in time to look. Above them: "Открити 3 от 25 истории".

**Картички.** Every card the child has opened, grouped by where it comes from: one group per lesson with a count ("14 от 24 картички от този урок"), and one group for the free map's events with its own count.

What counts as opened:

- A lesson card counts when the child clicks its bold term, its marker or its search result (Claude's call).
- A free-map event counts when the year stops on it with its card in the free map's card panel: after a search pick, a marker click, the Next button, Play, or the end of a drag or a wheel scrub. An event the knob only passes over during a drag doesn't count, so one drag from 600 to today doesn't fill the album (Martin's decision).

Opening a card from the album shows it, with "Покажи на картата":

- a lesson card opens the lesson part where it first appears;
- an event moves the free map to its year;
- a character moves the free map to its years and place.

Progress stays in the browser on this device, in the existing progress store, which gains the list of found characters.

## 8. Constraints

- A static site: plain ES modules, no bundler, no new dependencies. Content lives in `content/` files; code holds no history text.
- Energy: a still map runs no animation at all, because macOS keeps redrawing a layer that has even a paused one. Every new animation ends on its own: the place mark, the "Откри нова история!" pop, the bubble, the hint arrow, the characters' idle loops. Check in Safari that the free map at rest stays as cheap as today.
- Interface text is Bulgarian. The writing guidelines of the first design's section 8 apply to greetings and stories.
- No browser alert, confirm or prompt dialogs.
- Tests: `node --test` for the pure parts (search matching and grouping, year parsing, which characters a year shows, album grouping and counts); a browser check of each part on the real pages, closing the test browser afterwards.

## 9. Left to the builder

- Exact HTML, CSS and file split.
- How many results each group shows, and prefix matching while typing.
- The figure drawings, the speech bubble, the hint arrow and the found pop.
- Whether characters are HTML buttons over the map, like the markers, or drawn in the SVG. Over the map keeps them a constant size and crisp.
- The addresses of the new screens (for example `#lessons` and `#album`), keeping today's rule that a hash change reloads the page.
- How the grade's `index.json` describes unready lessons, as long as the build validates it.

## 10. Order of work

1. Search on the free map.
2. The doors, the lesson list and the delete-progress button.
3. The album with opened cards.
4. Hidden characters: the list of about 25 for Martin's review, then the texts for his review, then the build. Found characters fill the album's Герои part.

## 11. Open items

- The textbook's table of contents: Martin adds a photo under `docs/superpowers/specs/textbook/`. Until then the lesson list shows only lesson 26.
- Martin's review of the character list and texts before they ship.
- Painted figures can replace the code-drawn ones later.
