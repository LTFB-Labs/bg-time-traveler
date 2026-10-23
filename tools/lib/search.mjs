const MIN_STEMMED_LENGTH = 5;
const ENDINGS = ['ът', 'та', 'то', 'те', 'ят', 'ъ', 'а', 'я', 'о', 'е', 'и'];

export function normalize(text) {
    return text.toLowerCase()
        .replace(/[йѝ]/g, 'и')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((word) => word !== '')
        .map(stripEnding)
        .join(' ');
}

function stripEnding(word) {
    if (word.length < MIN_STEMMED_LENGTH) {
        return word;
    }
    const ending = ENDINGS.find((candidate) => word.endsWith(candidate));
    return ending === undefined ? word : word.slice(0, -ending.length);
}

export function buildSearchIndex(content) {
    const cards = Object.values(content.cards).map(toCardEntry);
    const parts = Object.values(content.lessons).flatMap(toPartEntries);
    return [...cards, ...parts];
}

function toCardEntry(card) {
    const type = card.legacyKind ? 'event' : 'card';
    const aliases = type === 'card' ? card.aliases : [];
    return { type, id: card.id, title: card.title, text: normalize(plain([card.title, ...aliases, ...card.paragraphs].join(' '))) };
}

function toPartEntries(lesson) {
    return lesson.parts.filter((part) => part.type === 'story').map((part, index) => toPartEntry(lesson, part, index + 1));
}

function toPartEntry(lesson, part, number) {
    const text = [part.heading, ...part.paragraphs, part.fact ?? ''].join(' ');
    return { type: 'part', id: `${lesson.id}#${number}`, title: part.heading, text: normalize(plain(text)), lesson: lesson.id, part: number };
}

function plain(markdown) {
    return markdown.replace(/[*>]/g, ' ').replace(/(^|\s)[-+]\s/g, ' ');
}
