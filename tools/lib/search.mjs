import { normalize } from '../../code/search.js';

export { normalize };

export function buildSearchIndex(content) {
    const { RULERS = [], CITIES = [], END } = content.maps?.balkans ?? {};
    const lessons = Object.values(content.lessons);
    const cards = Object.values(content.cards).map((card) => toCardEntry(card, lessons));
    const parts = lessons.flatMap(toPartEntries);
    const rulers = RULERS.map((ruler, i) => toRulerEntry(ruler, i, END));
    const places = CITIES.flatMap((city, i) => city.n.map((name, k) => toPlaceEntry(name, i, k, END)));
    return [...cards, ...parts, ...rulers, ...places];
}

function toCardEntry(card, lessons) {
    const type = card.legacyKind ? 'event' : 'card';
    const aliases = type === 'card' ? card.aliases : [];
    const entry = { type, id: card.id, title: card.title, text: normalize(plain([card.title, ...aliases, ...card.paragraphs].join(' '))) };
    return type === 'event' ? { ...entry, ...eventYear(card) } : { ...entry, date: card.dates ?? '', ...firstPartWith(card.id, lessons) };
}

// an event without years gets neither; real events always have them
function eventYear({ years }) {
    return years ? { date: `${Math.floor(years[0])} г.`, year: years[0] } : {};
}

// the first story part, in lesson order, that marks the card or links it from its text or its fact box; the summary only when no story part has it
function firstPartWith(id, lessons) {
    const link = `data-card="${id}"`;
    const holds = (part) => (part.meta.marks ?? []).includes(id) || Boolean(part.html?.includes(link) || part.factHtml?.includes(link));
    for (const type of ['story', 'summary']) {
        for (const lesson of lessons) {
            const part = lesson.parts.findIndex((p) => p.type === type && holds(p));
            if (part >= 0) return { lesson: lesson.id, part };
        }
    }
    return {};
}

function toPartEntries(lesson) {
    return lesson.parts.filter((part) => part.type === 'story').map((part, index) => toPartEntry(lesson, part, index + 1));
}

function toPartEntry(lesson, part, number) {
    const text = [part.heading, ...part.paragraphs, part.fact ?? ''].join(' ');
    return { type: 'part', id: `${lesson.id}#${number}`, title: part.heading, text: normalize(plain(text)), date: `Урок ${lesson.number}`, lesson: lesson.id, part: number };
}

// the title word goes before the name, except "водач", which reads wrong there (the HUD drops it too)
function toRulerEntry([from, to, title, name], i, end) {
    const shown = title === 'водач' ? name : `${title} ${name}`;
    return { type: 'ruler', id: `ruler-${i}`, title: shown, text: normalize(`${title} ${name}`), date: period(from, to, end), year: from };
}

function toPlaceEntry([from, to, name], i, k, end) {
    return { type: 'place', id: `place-${i}-${k}`, title: name, text: normalize(name), date: period(from, to, end), year: from, city: i };
}

// the data ends a reign or a name that lasts until now after the map's last year; it reads "днес"
function period(from, to, end) {
    return `${from}–${to > end ? 'днес' : to}`;
}

function plain(markdown) {
    return markdown.replace(/[*>]/g, ' ').replace(/(^|\s)[-+]\s/g, ' ');
}
