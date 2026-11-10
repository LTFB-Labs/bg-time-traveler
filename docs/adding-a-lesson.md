# Adding a lesson

Follow this checklist for every new lesson. It replaces the design document and the plan that earlier batches of lessons had.

The file formats are described in the README section "Как се добавя съдържание" and in `learning-materials/maps/borders/README.md`. This page gives the order of work and the rules the build does not check.

## Stop and ask Martin first if

- Most of the lesson happens outside the Balkans map (longitude 12 to 42, latitude 34 to 49.5). Examples: Egypt, Mesopotamia, early Rome.
- The lesson needs something the player cannot show today. Lessons are content only. Ask before any code change.
- The new lesson retells part of an existing lesson. Propose what to trim from the old one.
- A page of the lesson is missing from the photos or cannot be read.

## Sources

- **Martin's photos of the book pages are the main source.** They decide the lesson number, the title, what the lesson covers and how names are spelled. Never copy a sentence from them. Keep the photos out of git. If they must last past the session, put them in `.superpowers/textbook/<lesson number>/`, which git ignores.
- **domashno.bg is the fallback.** It mirrors the book with a summary of every lesson, at `https://domashno.bg/istoriq/5/bulvest/<slug>`. Use it only when there are no photos.
- **Every fact needs two sources.** Bulgarian Wikipedia counts as one. The book, a museum site or an academic source is the other. Where sources disagree, write "около", give the range, or name who says it ("според Плутарх", "според предание").

## Steps for one lesson

1. **Branch and snapshot.** Work on a branch off main and never push. Run `npm --prefix tools run build`, then copy `content.js` to the scratchpad as `content-before.js`.
2. **Outline and fact list, in the scratchpad.** Not in `docs/`. Write down:
   - the lesson's thread in one sentence;
   - a table of 6 to 8 story parts, with a title, a year and what the map shows for each;
   - the existing borders and cards to reuse, and the new ones needed (search `learning-materials/maps/borders/` and the `aliases` in `learning-materials/information/*/info.md`);
   - the predict question and the part it comes before;
   - every fact the lesson states, each with its two sources.
3. **Borders, only if new ones are needed.**
   - One GeoJSON `Feature` per file, 7 to 25 points.
   - Take river and mountain edges from `DAN`, `SAVA`, `BLK`, `CARP`, `BALKANS` and `ANATOLIA` in `tools/defs.mjs`. Coasts may run out to sea, because the build clips every border to land.
   - Reuse the existing colours. Rome is `#8a5fb0`, the same as Byzantium on the free map. Steppe peoples are `#c6a54c`.
   - Check named cities inside and outside each new border with the script in Task 3, step 2 of `docs/superpowers/plans/2026-10-26-three-more-lessons.md`. No output line may start with `WRONG`.
   - Run `npm --prefix tools run geo`.
4. **Cards and photos.**
   - Reuse a card only if it is about the same thing at the same time. Otherwise make a new card. For example, `carigrad` is the event of 1453, not the city founded in 330; `odrin` is the Balkan War, not the battle of 378; `vizantia` is Byzantine rule after 1018, not the Eastern empire of 395.
   - Aliases are the exact bold forms the lesson uses. No alias may repeat another card's alias.
   - Two paragraphs of 50 to 90 words; an `event` card may have one. `at` lies inside the map bounds.
   - Never add `legacyKind`. It puts the card on the free map, which starts at 600.
   - 6 to 9 photos per lesson, from Wikimedia Commons, free licences only (public domain, CC0, CC BY, CC BY-SA). Add each with a `commons:` name, then run `npm --prefix tools run photos`.
5. **Write the lesson.** Copy the closest existing lesson in `learning-materials/lessons/5/`.
   - Front matter: `id: <grade>-<file name>`, `grade`, `number` and `title` as in the book, `textbook: Булвест 2000, урок <number>`, `icon`, `map: balkans`, `span`, `eras` inside the span, and `big` as in the other lessons.
   - The summary part comes first and the check part last, with 6 to 8 story parts between.
   - Every story part has a year or a label, a camera box, and something on the map: a border, a mark or a path.
   - The first part picks up where the previous lesson ended. The last part's `next` hands over to the next lesson in the book. If the previous lesson's last `next` now points somewhere else, fix it.
6. **List it.**
   - Add the lesson to `learning-materials/lessons/5/index.json` in book order, with `state: ready`.
   - Add its number to the right section in `learning-materials/quest/sections.json`, if it is not there yet.
   - A new icon comes from game-icons.net into `img/icons/<id>.svg`, with its author in `learning-materials/icons.json`. Then run `npm --prefix tools run photos`.
7. **Build and compare.** Run `npm --prefix tools run build`. It must report no problems. Then compare the rendered HTML of every other lesson in `content-before.js` and `content.js`. The only allowed change is a new link to a new card. No existing link may change its card.
8. **Play it through.** If nothing listens on port 8765, serve the repo root with `python3 -m http.server 8765`. Open `http://127.0.0.1:8765/#lesson/<id>/0` and hard-reload after each build. Check that:
   - every part has a photo, marks that match the text, and a camera box that shows them;
   - the predict question works and the check can be passed;
   - the summary opens at the end;
   - the previous lesson's "Към следващия урок" opens this lesson;
   - the search finds a main name and a year from the lesson and opens the right part;
   - the console shows no errors.

   Close the test browser afterwards. It runs animations unthrottled and heats the laptop.
9. **Test and commit.** Run `npm --prefix tools test`. Commit the content together with `content.js`, `geo.js` and `CREDITS.md`, with a message like `feat: lesson <number>, <title>: <what it covers>`.
10. **Hand it to Martin.** Give him the lesson file and the fact list with its sources. The lesson ships only after he reads it. His fixes go in a separate `fix:` commit.

## Rules the build checks

The build reports these. They are listed here so the outline fits them from the start.

- 6 to 8 story parts.
- 3 or 4 paragraphs per part, 40 to 110 words each. Aim for 3 paragraphs of 60 to 90 words.
- At most 1800 words of story text.
- Exactly one `> Знаеш ли, че…` per part.
- A `predict` question has exactly three options.
- 5 to 7 check questions, of the types `tap`, `order`, `pick-border`, `choose` and `match`.
- Every border, card and photo id exists.

## Writing rules the build does not check

- Bulgarian for a 10-year-old. Sentences under 20 words, one idea each. Explain every new term in the text or in `words`.
- Speak to the reader as "ти". Questions to the reader are welcome. No exclamation marks outside quotes.
- Dates as "480 г. пр.Хр." and "46 г. сл.Хр.". Centuries as "V век пр.Хр.". Approximate years get `approx: true` on the part and "около" in the text.
- Names are spelled as the book spells them.
- Exactly one `predict` question per lesson.
- Every check answer and `explain` can be found in the part the question points to.

## Several lessons at once

- Draw the borders that several lessons share first.
- A card that two lessons share is created with the earlier lesson.
- Write the lessons in book order, because each hand-off depends on the lesson before.
- Martin can read them all together at the end.

## Mistakes to watch for

| Mistake | How to catch it |
|---|---|
| A new alias such as "Рим" turns the same bold word in an older lesson into a link to the wrong card. | The comparison in step 7. |
| A border edge drawn a little off puts a city on the wrong side of the Danube. | The city script in step 3. |
| A state is shown after it ended, such as Roman Dacia after 271. | Check each part's year against the dates of every border it shows. |
| A flat claim where the sources disagree, such as Spartacus being a Thracian or an exact year for Moesia. | Name the source or write "около". |
| A new lesson retells half of the previous one. | Stop and ask Martin what to trim. |
| The last lesson's "Към следващия урок" leads nowhere. | The play-through in step 8. |
