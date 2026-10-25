// Search on the free map: a query is read as a year and as words, and what it finds in CONTENT.search comes back in groups.
// The build normalizes the index with the same normalize function.
import { fmtSpan } from './years.js';

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

export const MIN_QUERY = 2;
const GROUP_SIZE = 5;
// the groups of results, in the order the list shows them, and the entry types each one holds
const GROUPS = {
    'Година': ['year'],
    'Владетели': ['ruler'],
    'Места': ['place'],
    'Събития': ['event'],
    'Картички от уроците': ['card'],
    'Уроци': ['lesson', 'part'],
};
// digits, an optional "г.", then an optional era: "пр.Хр.", "пр.н.е." or "сл.Хр.", dots and spaces as a child types them
const YEAR = /^(\d{1,4})\s*(?:г\.?)?\s*(?:(пр|сл)\.?\s*(?:хр|н\.?\s*е)\.?)?$/;

// a year before Christ comes back negative; anything that is not just a year gives null
export function parseYear(query) {
    const match = query.trim().toLowerCase().match(YEAR);
    if (!match) return null;
    const year = Number(match[1]);
    return match[2] === 'пр' ? -year : year;
}

// index: CONTENT.search; lessons: the lessons, for a year before the free map's start; span: [START, END] of the free map
export function findResults(query, { index, lessons, span }) {
    if (query.trim().length < MIN_QUERY) return [];
    const found = [...yearResults(parseYear(query), index, lessons, span), ...textResults(query, index)];
    return Object.entries(GROUPS)
        .map(([name, types]) => ({ name, items: unique(found.filter((item) => types.includes(item.type))).slice(0, GROUP_SIZE) }))
        .filter((group) => group.items.length > 0);
}

function yearResults(year, index, lessons, [start, end]) {
    if (year === null || year > end) return [];
    if (year < start) return lessons.filter(({ span }) => span[0] <= year && year <= span[1]).map(toLessonItem);
    const events = index.filter((entry) => entry.type === 'event' && Math.floor(entry.year) === year);
    return [{ type: 'year', title: `Иди в ${year} г.`, year }, ...events];
}

function toLessonItem({ id, number, title, span }) {
    return { type: 'lesson', id, title: `Урок ${number} · ${title}`, date: fmtSpan(span), lesson: id };
}

// every word of the query starts some word of the entry; entries that match on their title come first
function textResults(query, index) {
    const words = normalize(query).split(' ').filter(Boolean);
    if (words.length === 0) return [];
    const matches = index.filter((entry) => startsWords(entry.text, words));
    const onTitle = matches.filter((entry) => startsWords(normalize(entry.title), words));
    return [...onTitle, ...matches.filter((entry) => !onTitle.includes(entry))];
}

function startsWords(text, words) {
    const own = text.split(' ');
    return words.every((word) => own.some((w) => w.startsWith(word)));
}

function unique(items) {
    const keys = items.map((item) => `${item.type}:${item.id}`);
    return items.filter((_, i) => keys.indexOf(keys[i]) === i);
}
