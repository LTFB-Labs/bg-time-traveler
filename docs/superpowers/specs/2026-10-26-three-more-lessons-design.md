# Three more grade 5 lessons

Design document, 26 October 2026. Written after a short brainstorming session with Martin. It adds three lessons to the one that exists, "Древна Тракия. Царството на одрисите". Everything about how a lesson looks and works is already settled in `2026-10-23-grade-lessons-design.md` (the main spec) and in the README section "Как се добавя съдържание". This document only says which lessons, what goes in them, and what is new on the map.

## 1. Intent

The kid has one lesson. Martin asked for "the next 3 lessons" from the Булвест 2000 textbook "История и цивилизации за 5. клас". The book's own next lessons after the Thracian kingdom are about the birth of Rome and the Roman Republic, in Italy. They need a wider Mediterranean map that does not exist (main spec, section 9). Martin chose the next three lessons in book order that happen on the Balkans map instead. Together they fill the gap from the Thracians to the year 600, where the free timeline begins.

## 2. The three lessons

The book's lesson list was taken from domashno.bg, which mirrors the Булвест book with summaries of every lesson. The summaries are saved for the builder in the scratchpad copies listed in section 8.

| Book no. (domashno.bg) | Book title | Our id | File |
|---|---|---|---|
| 38, with practical pages 38.1 | Светът на траките | `5-svetat-na-trakite` | `svetat-na-trakite.md` |
| 48 | Древна Тракия в римския свят | `5-trakiya-v-rimskiya-svyat` | `trakiya-v-rimskiya-svyat.md` |
| 52 | Залезът на Римската империя | `5-zalezat-na-rimskata-imperiya` | `zalezat-na-rimskata-imperiya.md` |

All three go into `learning-materials/lessons/5/` and into `index.json` after the Thracian kingdom, in book order, with `state: ready`.

## 3. Goals, non-goals, anti-goals

Goals

- Three lessons that pass the build and follow every rule in the README and in sections 7 and 8 of the main spec.
- Each lesson covers the same facts as the book's lesson, in our own simpler words.
- Each lesson reads as one story, with a hook from part to part and from lesson to lesson. The last part of lesson 3 hands over to the free map, where the Slavs and Asparuh arrive.
- New borders, cards and photos that the next lessons can reuse.

Non-goals

- The wider Mediterranean map, and the Rome lessons that need it (book lessons 39 to 47).
- Book lesson 51, "Появата на християнството". Lesson 3 mentions Christianity only where it happens on our map.
- Grey "скоро" rows for the other book lessons. A grey row between two ready lessons would break "Към следващия урок" (see section 6).
- Code changes, with one exception: deleting the made-up "скоро" lessons (section 6). Everything else is content only. If a lesson needs something the player cannot do, the builder stops and asks.

Anti-goals: these would make it a failure even if it builds

- Copying text from the book, from domashno.bg or from any site.
- A wrong fact. Every fact is checked against two sources (main spec, section 8). Where sources disagree, the text says "около" or names who says it.
- Lesson 1 repeating lesson "Царството на одрисите". Today that lesson's last two parts tell much of what lesson 1 plans. They get trimmed (section 4, decision 3), and lesson 1 does not retell the kings.
- A lesson over 1800 words of story text, or a part without something to see on the map.

## 4. Decisions

Martin's decisions

1. These three lessons, in this order, on the Balkans map.
2. All rules from the main spec and the README apply unchanged.
3. **The Thracian kingdom lesson is trimmed and its hand-off fixed.** Today its last two parts tell what lesson 1 now tells in full:
   - Part 6, "Севт III и Севтополис", tells Голямата Косматка with the gold wreath and the bronze head, and has the Казанлък tomb in its fact box. It keeps Севт III and Севтополис. His tomb shrinks to one sentence that points to the next lesson.
   - Part 7, "Завещано от траките", tells Orpheus and Eurydice, Dionysus, Perperikon, the Свещари tomb and the Horseman. These shrink to short mentions. The part keeps the treasures and the old names, such as Хемус and Хеброс.
   - Its lines "За това ще научиш в следващия урок" (about the province of 46 AD) and "Следващия път на картата ще дойдат римските легиони" become false. They are rewritten to hand over to lesson 1, about the Thracians' beliefs.
   - Its flat claims that Spartacus was a Thracian and that the province dates to 46 AD get the same hedging as lesson 2.
   - The part keeps its word counts and its single "Знаеш ли, че…" box. Martin re-reads the trimmed lesson along with the three new ones.
4. **The made-up "скоро" lessons are deleted.** Nikolay added 10 of them today, numbered 27 to 36, so the lesson hall had enough cards to test scrolling. Their own comment says to delete them once real lessons exist. One of them, "Римляните по нашите земи", covers lessons 2 and 3, and the rest are medieval lessons for grades 6 and 7. The builder deletes the mock lessons file and its import in the lesson list, in a commit of its own.

Calls made in this document, for Martin to check

1. **Lesson numbers.** The app calls the Thracian kingdom "урок 26". That number was never checked (main spec, open question 1). The domashno.bg list numbers it 37 and numbers the new lessons 38, 48 and 52. The book says it has 61 lessons in total, which matches domashno.bg's list. So the builder uses 38, 48 and 52, and changes the Thracian kingdom to 37 (its `number` and its `textbook` line). Progress is stored by lesson id, so renumbering loses nothing. Nikolay's made-up lessons were numbered 27 to 36, so he may count from 26 too. Martin checks the numbers against his copy of the book before the lessons ship.
2. **The practical pages 38.1** (the Valley of the Kings and Голямата Косматка) become one part of lesson 1, not lessons of their own.
3. **Lesson 3 is told from the Balkans.** The book tells the fall of the Western empire from Rome. Our map reaches Rome only at its western edge, so the lesson follows the events that happen on our land: Abritus, Serdica, Constantinople, Adrianople, the split of 395 and the Huns. The fall of Rome in 476 is the last part, with the camera at the western edge.
4. **Lesson 3 ends at 476,** as the book does. It does not tell the Slavs. Its summary's "Следва" box points to the free map, which starts at 600.

## 5. What goes in each lesson

The outlines below are the plan, not the final text. Each line is one story part. Years are suggestions; the builder checks each one. The builder may merge or split parts while staying within 6 to 8 story parts.

### Lesson 1: Светът на траките

Span about 2000 BC to 300 AD. The thread: the Thracians left no writing, so we read their beliefs from rocks, tombs, pictures and Greek writers.

| # | Part | Year | On the map |
|---|---|---|---|
| 1 | Where the Thracians prayed: rock sanctuaries under the open sky, Татул and Перперикон | ок. 1500 BC | Eastern Rhodopes; marks for both sites |
| 2 | How we know what they believed: no writing, but pictures on vessels and walls, and Herodotus | ок. 440 BC | All of Thrace with the tribes border |
| 3 | The gods: the Great Mother Goddess, and Dionysus, also called Сабазий | ок. 400 BC | Thrace; marks for sanctuaries and treasures with the goddess |
| 4 | Orpheus and Eurydice: the myth, and the Greek vase that shows Orpheus among Thracian warriors | ок. 440 BC | The Rhodopes, where the legend places him |
| 5 | Life after death: what Herodotus says about tribes that mourn births and feast at funerals; mounds over the graves | ок. 300 BC | Mounds across the country |
| 6 | The Valley of the Kings: the Казанлък tomb, Голямата Косматка and the bronze head of Севт III | ок. 300 BC | Close-up of the Казанлък valley; Севтополис |
| 7 | The Свещари tomb, with its ten stone women holding up the vault | ок. 280 BC | Getic lands in the north-east |
| 8 | The Thracian Horseman: thousands of stone plaques, such as the one from Глава Панега | ок. 250 AD | Thrace inside the Roman provinces from lesson 2 |

Notes

- Parts 2 and 4 share a date. The builder can order by year, or put Orpheus after the gods and use a label instead of a year.
- Part 8 jumps 500 years forward. Its "Следва" box and lesson 2 explain how Thrace became Roman.
- Perperikon as a sanctuary of Dionysus is one archaeologist's view. The text says so, or leaves it out.
- Prediction question, suggested: before part 5 or 6, "Какво слагат траките в гроба на знатен воин?" with three answers. The reveal: horses, a chariot, weapons and gifts, so he has them in the other world.

### Lesson 2: Древна Тракия в римския свят

Span about 200 BC to 400 AD. The thread: Rome arrives, the Thracians resist for two centuries, then Thrace becomes Roman and changes.

| # | Part | Year | On the map |
|---|---|---|---|
| 1 | Rome comes to the Balkans: Macedonia becomes a Roman province, and the first clashes with Thracian tribes | 146 BC | Roman Macedonia; the Thracian tribes |
| 2 | Spartacus, the Thracian who led a slave revolt in Italy | 73 BC | Southern Italy; a path for his march |
| 3 | Moesia: under Augustus, the land between Macedonia and the Danube becomes a province | ок. 15 AD | Moesia; a Thracian kingdom that depends on Rome |
| 4 | The province of Thracia: after a revolt and a murdered king, the last Thracian kingdom becomes a province | 46 AD | Thracia next to Moesia |
| 5 | Trajan, Dacia and Nicopolis ad Istrum: Rome crosses the Danube | 106 AD | Dacia north of the Danube; mark for Nicopolis |
| 6 | Roads and cities: the military road through Serdica and Philippopolis, Latin on the Danube and Greek in Thrace | ок. 150 AD | A path along the road; marks for the cities |
| 7 | Living like a Roman: the Plovdiv theatre, the Serdica amphitheatre, the Varna baths, the Армира villa | ок. 200 AD | Marks for the four places |

Notes

- The book dates Moesia to 27 BC, the start of Augustus' rule. Most sources give a date between 6 and 15 AD. The text says "при император Август" and gives no exact year. The part's year is approximate.
- The book gives 45 AD for the province of Thracia; many sources give 46. The text uses "около 45–46 г." or checks a third source.
- A fact for a "Знаеш ли, че…" box: the gravestone of Longinus Sdapeze, a Thracian cavalryman from Serdica, was found in Colchester, England.
- Plutarch says Spartacus was a Thracian. The text names Plutarch, since his tribe and home are not certain.
- Prediction question, suggested: before part 4, "Тракийският цар е убит при бунт. Какво прави Рим?" The reveal: Rome turns the kingdom into a province.

### Lesson 3: Залезът на Римската империя

Span about 250 to 476. The thread: the empire shakes, moves its heart east to our side of the map, splits, and the West falls while the East survives.

| # | Part | Year | On the map |
|---|---|---|---|
| 1 | The Goths cross the Danube and kill Emperor Decius at Abritus, near today's Razgrad | 251 | Empire along the Danube; Goths to the north; a path for their raid |
| 2 | Diocletian and the four rulers: two "augusti" and two "caesars" | 293 | Capitals on our map: Nicomedia, Sirmium, Thessaloniki |
| 3 | Serdica: Galerius stops the persecution of Christians there in 311, two years before Milan; Constantine's saying "Serdica is my Rome" | 311 | Close-up of Serdica; the St George rotunda |
| 4 | Constantinople, the new Rome on the Bosporus, on the site of old Byzantion | 330 | The Bosporus; the city as a mark |
| 5 | The Goths win at Adrianople and kill Emperor Valens | 378 | Thrace; a path for the Goths |
| 6 | The empire splits in two, and Christianity becomes its only religion | 395 | East and West, with the line through the western Balkans |
| 7 | Attila's Huns burn the Balkan cities, and in 476 the West falls | 476 | The Huns north of the Danube; the camera pans to Rome at the western edge |

Notes

- "Serdica is my Rome" comes from a later Byzantine writer. The text says "според предание".
- The book names the Edict of Milan (313). The Edict of Serdica (311) is extra, but it happened on our land and is well sourced. Both appear.
- Prediction question, suggested: before part 5, "Готите молят да живеят в империята, а после се бунтуват. Какво става при Адрианопол?" The reveal: the Roman army loses and the emperor dies.

## 6. What is new

**Borders.** Nothing before 600 exists on the map except the Thracian borders. Expected new files in `learning-materials/maps/borders/`, simple polygons like the existing ones (7 to 21 points):

| Lesson | Borders |
|---|---|
| 2 | Roman Macedonia (146 BC), the dependent Thracian kingdom, Moesia, Thracia, Dacia |
| 3 | The empire in the Balkans in 251, the Goths, the Eastern and Western empires in 395, the Huns |

Colours follow the existing ones: Rome gets one colour across both lessons, so the kid sees the same power grow. Lesson 1 reuses the Thracian borders, and in part 8 the Roman provinces from lesson 2.

**Cards.** About 8 new cards for lesson 1, about 14 for lesson 2 and about 15 for lesson 3. Many existing cards are reused: Orpheus, Herodotus, Perperikon, the Thracian Horseman, the Свещари and Казанлък tombs, Голямата Косматка, the Valley of the Kings, Севтополис, Spartacus, Philippopolis and Odessos.

Clashes to watch:

- Constantinople needs a place card. The existing "carigrad" card is the 1453 event and has no aliases.
- Adrianople 378 needs its own card. The existing "odrin" card is the Balkan War.
- The existing "vizantia" card is the Byzantine rule of the Balkans after 1018. It is not the Eastern Roman Empire of 395.

**Photos.** 6 to 9 per lesson, from Wikimedia Commons with free licences only, fetched with the photos command in the tools folder.

**Lesson list.** The lesson hall takes its cards from two places: the grade's list file and a file of made-up lessons. After the mock file is deleted (section 4, decision 4), the hall shows four ready rows: 37, 38, 48 and 52. "Към следващия урок" chains them, because each next row is ready. The builder checks that the hall still works with only four cards, since the mocks were added to test scrolling.

```
modules/lesson/mock-lessons.js
modules/lesson/lesson-list.js
```

## 7. Done means

- The build passes with no problems.
- Each lesson opens at its address, plays through every part, passes its check and reaches the summary.
- "Към следващия урок" leads from the Thracian kingdom to lesson 1, then to lesson 2 and to lesson 3.
- Every photo shows, with its author in the credits.
- The lesson hall shows exactly the four real lessons and no "скоро" cards.
- Martin has read all three new texts and the trimmed Thracian kingdom lesson. The lessons ship only after that.

## 8. Left to the builder

- The exact wording, within the writing rules in section 8 of the main spec.
- Which cards to create and their texts, camera boxes, era bands, and the exact shape of each border.
- Which photos to use.
- The check questions: 5 to 7 per lesson, mostly on the map and timeline, with the five question types.
- Whether a part uses a year or a label.

Book summaries saved for the builder (fetched from domashno.bg, not to be copied):

```
<scratchpad>/book/svetat-na-trakite.md
<scratchpad>/book/v-dolinata-na-tsarete-geografiya-na-nadgrobnite-mogili.md
<scratchpad>/book/taynite-na-mogilata-golyamata-kosmatka.md
<scratchpad>/book/drevna-trakiya-v-rimskiya-svyat.md
<scratchpad>/book/zalezat-na-rimskata-imperiya.md
```

Where scratchpad is `/private/tmp/claude-502/-Users-martin-apostolov-work-projects-bg-time-traveler/6cc1f1bb-70ee-491c-b57d-32ae29ffcc3f/scratchpad`. The pages can also be fetched again from `https://domashno.bg/istoriq/5/bulvest/<name>`.
