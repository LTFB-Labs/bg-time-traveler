// The Quest's path as data: every stop in order (the lessons of each section, then the section's boss), what each stop asks,
// how far the child has come and how much of the path still lies in the fog. Node imports this module, so it touches no DOM.

// a boss asks this many questions, picked from every section so far
export const BOSS_SIZE = 10;
// a fight is lost on the third mistake
export const LIVES = 3;

// no mistake wins 3 stars, one wins 2, two win 1; the third mistake loses the fight (0)
export const starsFor = (mistakes) => Math.max(0, LIVES - mistakes);

// sections: CONTENT.quest.sections; lessons, grades, cards, photos: from CONTENT; stars: the progress store's quest;
// mocks: made-up lessons that only fill the path for now (modules/lesson/mock-lessons.js)
export function questStops({ sections, lessons, grades, cards, photos, stars }, mocks = []) {
    const pool = [];
    const stops = sections.flatMap((section) => {
        const own = section.lessons.map((number) => lessonStop(section, number, { lessons, grades, cards, photos }, mocks));
        pool.push(...own.flatMap((stop) => stop.questions));
        const boss = { id: `boss-${section.id}`, kind: 'boss', section: section.id, color: section.color, title: section.title, icon: section.icon ?? null, photo: photos[section.photo]?.f ?? null, questions: [...pool] };
        return [...own, boss];
    });
    const front = stops.findIndex((stop) => !(stars[stop.id] > 0));
    return stops.map((stop, i) => ({
        ...stop,
        stars: stars[stop.id] ?? 0,
        // won stops, the one to fight now and the next one are clear; the rest of the path is in the fog
        state: front === -1 || i < front ? 'won' : i > front ? 'locked' : stop.questions.length ? 'open' : 'soon',
        isFog: front !== -1 && i > front + 1,
    }));
}

function lessonStop(section, number, { lessons, grades, cards, photos }, mocks) {
    const entry = (grades[section.grade] ?? []).find((row) => row.number === number);
    const lesson = entry && lessons[entry.id];
    const mock = mocks.find((m) => m.grade === section.grade && m.number === number);
    const summary = lesson?.parts.find((part) => part.type === 'summary');
    return {
        id: lesson ? lesson.id : `${section.grade}-${number}`,
        kind: 'lesson',
        section: section.id,
        color: section.color,
        number,
        title: entry?.title ?? mock?.title ?? `Урок ${number}`,
        icon: lesson?.icon ?? mock?.icon ?? null,
        photo: photos[summary?.meta.photo ?? mock?.photo]?.f ?? null,
        questions: lesson ? lessonQuestions(lesson, cards) : [],
    };
}

// every question of every info package the lesson uses, with the package it comes from
function lessonQuestions(lesson, cards) {
    return lessonCards(lesson).flatMap((id) => (cards[id]?.questions ?? []).map((question) => ({ ...question, card: id, cardTitle: cards[id].title })));
}

// what one fight asks: a lesson all its questions, a boss BOSS_SIZE of its pool; both shuffled, and so are the choices
export function fightQuestions(stop, random = Math.random) {
    const picked = shuffle(stop.questions, random).slice(0, stop.kind === 'boss' ? BOSS_SIZE : undefined);
    return picked.map((question) => ({ ...question, choices: shuffle([question.answer, ...question.wrong], random) }));
}

function shuffle(items, random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const k = Math.floor(random() * (i + 1));
        [out[i], out[k]] = [out[k], out[i]];
    }
    return out;
}

// the cards a lesson marks on its map or links from its text, in order of first appearance
const CARD_LINK = /data-card="([^"]+)"/g;
function lessonCards(lesson) {
    const ids = lesson.parts.flatMap((part) => [...(part.meta.marks ?? []), ...linkedCards(part.html), ...linkedCards(part.factHtml)]);
    return [...new Set(ids)];
}

const linkedCards = (html) => [...(html ?? '').matchAll(CARD_LINK)].map((match) => match[1]);
