// window.BGTT for a lesson: the contract of the free map (see the end of js/free.js), so narrator.js reads a lesson's
// parts the way it reads the free map's events. It reads the summary and the story parts, then leads the child to the check.
// The part's own picture is already on the sheet, so the teacher holds up no photo.
import { fmtYear } from './years.js';

// bus: the lesson's "focus" and "input" events; current: the open part's number; goTo: opens a part without counting as the child's input
export function lessonApi(lesson, { bus, current, goTo, isHeld }) {
    const readable = lesson.parts.map((p, n) => n).filter((n) => lesson.parts[n].type !== 'check');
    const check = lesson.parts.findIndex((p) => p.type === 'check');
    const item = (n) => teacherItem(lesson, n, isHeld(n));
    return {
        version: 1,
        title: lesson.title,
        end: check < 0 ? null : { say: 'Това е краят на разказа. Сега е твой ред: отговори на въпросите от проверката.', id: String(check) },
        items: () => readable.map(item),
        current: () => ({ item: readable.includes(current()) ? item(current()) : null, year: lesson.span[1], era: null }),
        goTo: (id) => new Promise((resolve) => {
            goTo(Number(id));
            setTimeout(resolve, 900); // the map's flight to the part's box
        }),
        stage: () => mapPane(),
        dock: () => document.getElementById('lsDock').getBoundingClientRect(),
        on: (name, cb) => {
            const h = (e) => cb(e.detail);
            bus.addEventListener(name, h);
            return () => bus.removeEventListener(name, h);
        },
    };
}

// the visible map beside the sheet, above the lesson timeline
function mapPane() {
    const r = document.getElementById('lsMap').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height - document.getElementById('lsTl').offsetHeight };
}

// held: the part asks its guess first; until the child picks, the teacher reads only the question and waits
export function teacherItem(lesson, n, held) {
    const part = lesson.parts[n];
    const { meta } = part;
    if (part.type === 'summary') {
        const goals = meta.goals.map((g) => `${g}.`).join(' ');
        return { id: String(n), year: lesson.span[0], when: spokenSpan(lesson.span), title: lesson.title, text: `${meta.lead} Ето какво ще научим. ${goals}`, era: null, photo: null };
    }
    const { predict } = meta;
    const text = [held || !predict ? '' : predict.reveal, ...part.paragraphs.map(plain), part.fact ? `Знаеш ли? ${plain(part.fact)}` : ''].filter(Boolean).join(' ');
    return {
        id: String(n),
        year: meta.year ?? null,
        when: meta.label ?? spokenYear(meta),
        title: part.heading,
        text,
        era: eraFor(lesson, meta.year),
        photo: null,
        wait: held ? guessQuestion(predict) : null,
    };
}

const ORDINAL = ['Първо', 'Второ', 'Трето', 'Четвърто', 'Пето'];

function guessQuestion({ q, options }) {
    return {
        say: ['Първо познай.', q, ...options.map((o, i) => `${ORDINAL[i]}: ${o}.`)],
        note: 'Избери отговор на листа и ще продължа.',
    };
}

function eraFor(lesson, year) {
    const era = year === undefined ? null : lesson.eras.find(([a, b]) => year >= a && year < b);
    return era ? { name: era[2], from: era[0], to: era[1], when: spokenSpan([era[0], era[1]]), text: '' } : null;
}

// the year as it is said aloud: "около 480 година преди Христа"
export function spokenYear(meta) {
    if (meta.year === undefined) return null;
    return spoken(fmtYear(meta));
}

// "от 480 до 341 година преди Христа"
export function spokenSpan([a, b]) {
    const bc = a < 0 && b < 0;
    const say = (y) => (bc ? `${-y}` : spoken(fmtYear({ year: y })));
    return `от ${say(a)} до ${say(b)}${bc ? ' година преди Христа' : ''}`;
}

const spoken = (s) => s.replace(/^ок\. /, 'около ').replace(/ г\. пр\.Хр\.$/, ' година преди Христа').replace(/ г\. сл\.Хр\.$/, ' година').replace(/ г\.$/, ' година');

// the lesson markdown marks card names in bold; the voice only needs the words
const plain = (s) => s.replace(/\*\*/g, '');
