// The lesson timeline under the map: era bands, a dot per story part, the traveller's head at the part's year,
// and under it the whole history with the lesson's span framed.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    fmtSpan,
    fmtYear,
} from './years.js';

export function createTimeline(rootEl, lesson, { onPick }) {
    const find = (id) => rootEl.querySelector(`#${id}`);
    const hasStrip = lesson.strip !== false;
    find('lsTlHead').hidden = !hasStrip;
    find('lsTrack').hidden = !hasStrip;
    find('lsBig').innerHTML = bigHtml(lesson);
    if (hasStrip) buildStrip(find, lesson, onPick);
    return { setPart: (n) => setPart(find, lesson, n) };
}

function buildStrip(find, lesson, onPick) {
    find('lsTlHead').querySelector('b').textContent = fmtSpan(lesson.span);
    find('lsBands').replaceChildren(...bandLayout(lesson.eras, lesson.span).map(bandEl));
    find('lsTicks').replaceChildren(...tickYears(lesson.span).map((year, i) => tickEl(year, i, lesson.span)));
    find('lsDots').replaceChildren(...lesson.parts.flatMap((p, n) => (isOnStrip(p) ? [dotEl(lesson, n, onPick)] : [])));
}

// a story part with a year sits on the strip; the summary, the check and label-only parts do not
const isOnStrip = (p) => p.type === 'story' && typeof p.meta.year === 'number';

function setPart(find, lesson, n) {
    const p = lesson.parts[n];
    const year = isOnStrip(p) ? p.meta.year : null;
    placeKnob(find('lsKnob'), year, lesson.span);
    markDots(find('lsDots'), n);
    markBand(find('lsBands'), year);
    find('lsTlHead').lastElementChild.textContent = HEAD_RIGHT[p.type](lesson, n);
}

// the traveller's head slides to the year; without a year it fades out where it stands
function placeKnob(knob, year, span) {
    knob.classList.toggle('off', year === null);
    if (year !== null) knob.style.left = `${pct(year, span)}%`;
}

function markDots(dots, n) {
    [...dots.children].forEach((d) => {
        d.classList.toggle('on', Number(d.dataset.n) === n);
        d.classList.toggle('seen', Number(d.dataset.n) < n);
    });
}

function markBand(bands, year) {
    [...bands.children].forEach((b) => b.classList.toggle('cur', year !== null && year >= Number(b.dataset.from) && year < Number(b.dataset.to)));
}

const HEAD_RIGHT = {
    summary: () => 'Преглед на урока',
    story: (lesson, n) => `${n} от ${storyCount(lesson)}: ${shortHeading(lesson.parts[n].heading)}`,
    check: () => 'Проверка',
};

export const storyCount = (lesson) => lesson.parts.filter((p) => p.type === 'story').length;

const SHORT_MAX = 24;

// a part's short name, for the chapter chips and the timeline head:
// the heading up to its first dash or colon, cut at a word to at most 24 characters
export function shortHeading(heading) {
    const head = heading.split(/ [—–] |:/)[0];
    if (head.length <= SHORT_MAX) return head;
    const cut = head.slice(0, SHORT_MAX + 1);
    return cut.slice(0, cut.lastIndexOf(' ')) || head.slice(0, SHORT_MAX);
}

/* ---------- lesson strip ---------- */
const ERA_COLOR = { tribes: '#b07a3c', main: '#c8402f', other: '#5f84b5', main2: '#d98c6a' };
const MIN_LABEL_SHARE = .1;

// eras are [from, to, name, class]; weight is the era's share of the span
export function bandLayout(eras, [a, b]) {
    return eras.map(([from, to, name, cls]) => {
        const weight = (to - from) / (b - a);
        return { from, to, name, color: ERA_COLOR[cls], weight, hideLabel: weight < MIN_LABEL_SHARE };
    });
}

function bandEl({ from, to, name, color, weight, hideLabel }) {
    const d = document.createElement('div');
    Object.assign(d.dataset, { from, to });
    d.style.flex = `${weight} 0 0`;
    d.style.background = color;
    d.title = name;
    d.textContent = hideLabel ? '' : name;
    return d;
}

const TICK_STEP = 200;

export function tickYears([a, b]) {
    const years = [];
    for (let y = Math.ceil(a / TICK_STEP) * TICK_STEP; y <= b; y += TICK_STEP) years.push(y);
    return years;
}

// the first tick names the era, the rest are plain numbers
function tickEl(year, i, span) {
    const t = document.createElement('span');
    t.textContent = i ? String(Math.abs(year)) : fmtYear({ year });
    t.style.left = `${pct(year, span)}%`;
    return t;
}

function dotEl(lesson, n, onPick) {
    const { heading, meta } = lesson.parts[n];
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.dataset.n = n;
    d.title = `${fmtYear(meta)} — ${heading}`;
    d.setAttribute('aria-label', d.title);
    d.style.left = `${pct(meta.year, lesson.span)}%`;
    d.addEventListener('click', () => onPick(n));
    return d;
}

// a year's place on a [from, to] line, in percent, kept inside the line
const pct = (year, [a, b]) => Math.min(100, Math.max(0, ((year - a) / (b - a)) * 100));

/* ---------- whole history ---------- */
const BIG_ERAS = [[-1300, 46, 'Траки', '#b07a3c'], [46, 681, 'Рим и Византия', '#8a5fb0'], [681, 1396, 'България', '#c8402f'], [1396, 1878, 'Османска власт', '#3e8a6a'], [1878, 2026, 'България', '#c8402f']];
const BIG_LABELS = [[-1300, '1300 пр.Хр.'], [0, 'Хр.'], [681, '681 България'], [1396, '1396'], [1878, '1878'], [2026, 'днес']];
// a span far before the bar still gets a visible frame at its left edge
const MIN_FRAME = 1.5;

export function bigLayout([a, b], big) {
    const left = pct(a, big);
    return { left, width: Math.max(pct(b, big) - left, MIN_FRAME) };
}

function bigHtml(lesson) {
    const { left, width } = bigLayout(lesson.span, lesson.big);
    const early = lesson.strip === false ? '<em>много по-рано</em>' : '';
    const bar = BIG_ERAS.map(([a, b, name, color]) => `<i style="flex:${b - a} 0 0;background:${color}" title="${name}"></i>`).join('');
    const labels = BIG_LABELS.map(([year, text]) => `<span style="left:${pct(year, lesson.big)}%">${text}</span>`).join('');
    return `<span class="lbl">Къде сме в цялата история</span><div class="bar">${bar}</div><div class="win" style="left:${left}%;width:${width}%">${early}</div>${labels}`;
}
