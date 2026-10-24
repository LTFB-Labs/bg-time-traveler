// The lesson timeline under the map: era bands, a numbered stop per story part with its year under it, the traveller's
// head over the current stop, and under it the whole history with the lesson's span framed.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    fmtSpan,
    fmtYear,
} from './years.js';

export function createTimeline(rootEl, lesson, { onPick }) {
    const find = (id) => rootEl.querySelector(`#${id}`);
    const hasStrip = lesson.strip !== false;
    const at = stopScale(lesson.parts.filter(isOnStrip).map((p) => p.meta.year), lesson.span);
    find('lsTlHead').hidden = !hasStrip;
    find('lsTrack').hidden = !hasStrip;
    find('lsBig').innerHTML = bigHtml(lesson);
    if (hasStrip) buildStrip(find, lesson, at, onPick);
    return { setPart: (n) => setPart(find, lesson, at, n) };
}

function buildStrip(find, lesson, at, onPick) {
    const stops = lesson.parts.filter(isOnStrip).map((p) => p.meta);
    find('lsTlHead').querySelector('b').textContent = fmtSpan(lesson.span);
    find('lsBands').replaceChildren(...bandLayout(lesson.eras, at).map(bandEl));
    find('lsTicks').replaceChildren(...yearMarks(stops, lesson.span, at).map(markEl));
    find('lsDots').replaceChildren(...lesson.parts.flatMap((p, n) => (isOnStrip(p) ? [dotEl(lesson, n, at, onPick)] : [])));
}

// a story part with a year sits on the strip; the summary, the check and label-only parts do not
export const isOnStrip = (p) => p.type === 'story' && typeof p.meta.year === 'number';

function setPart(find, lesson, at, n) {
    const p = lesson.parts[n] ?? RECAP_PART;
    const year = isOnStrip(p) ? p.meta.year : null;
    placeKnob(find('lsKnob'), year === null ? null : at(year));
    markDots(find('lsDots'), n);
    markBand(find('lsBands'), lesson.eras, year);
    find('lsTlHead').lastElementChild.textContent = HEAD_RIGHT[p.type](lesson, n);
}

// the traveller's head slides to the current stop; without a year it fades out where it stands
function placeKnob(knob, left) {
    knob.classList.toggle('off', left === null);
    if (left !== null) knob.style.left = `${left}%`;
}

function markDots(dots, n) {
    [...dots.children].forEach((d) => {
        d.classList.toggle('on', Number(d.dataset.n) === n);
        d.classList.toggle('seen', Number(d.dataset.n) < n);
    });
}

function markBand(bands, eras, year) {
    const cur = year === null ? -1 : eraIndex(eras, year);
    [...bands.children].forEach((b, i) => b.classList.toggle('cur', i === cur));
}

// the era that holds the year: from its start up to its end, and the last era also holds its end year
function eraIndex(eras, year) {
    const isLastEnd = (to, i) => i === eras.length - 1 && year === to;
    return eras.findIndex(([from, to], i) => year >= from && (year < to || isLastEnd(to, i)));
}

export const eraAt = (eras, year) => eras[eraIndex(eras, year)]?.[2];

const HEAD_RIGHT = {
    summary: () => 'Преглед на урока',
    story: (lesson, n) => `${n} от ${storyCount(lesson)}: ${shortHeading(lesson.parts[n].heading)}`,
    check: () => 'Проверка',
    recap: () => 'Край на урока',
};

// the recap sits after the last part: no year, every dot done
const RECAP_PART = { type: 'recap' };

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

// eras are [from, to, name, class]; weight is the era's share of the strip, measured on the stop scale
export function bandLayout(eras, at) {
    return eras.map(([from, to, name, cls]) => {
        const weight = (at(to) - at(from)) / 100;
        return { name, color: ERA_COLOR[cls], weight, hideLabel: weight < MIN_LABEL_SHARE };
    });
}

function bandEl({ name, color, weight, hideLabel }) {
    const d = document.createElement('div');
    d.style.flex = `${weight} 0 0`;
    d.style.background = color;
    d.title = name;
    d.textContent = hideLabel ? '' : name;
    return d;
}

const EDGE = 6;
const LONG_GAP = 300;

// every stop gets the same room on the strip, and a long gap between two stops twice that, so parts close in time stay
// apart; the years between two stops stretch or squeeze to fit. Answers a function from a year to its place in percent.
export function stopScale(years, [from, to]) {
    const sorted = [...years].sort((a, b) => a - b);
    const weights = sorted.slice(1).map((y, i) => (y - sorted[i] >= LONG_GAP ? 2 : 1));
    const unit = (100 - 2 * EDGE) / Math.max(1, sum(weights));
    const places = weights.reduce((acc, w) => [...acc, acc.at(-1) + w * unit], [sorted.length > 1 ? EDGE : 50]);
    const points = [[from, 0], ...sorted.map((y, i) => [y, places[i]]), [to, 100]];
    return (year) => interpolate(points, year);
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

function interpolate(points, year) {
    const i = points.findIndex(([y]) => y >= year);
    if (i === -1) return 100;
    if (i === 0) return 0;
    const [[y0, x0], [y1, x1]] = [points[i - 1], points[i]];
    return x0 + ((x1 - x0) * (year - y0)) / (y1 - y0);
}

// the year under each stop, short when the whole span sits on one side of Christ (the head names the era),
// and between two stops far apart, how many years lie between them
export function yearMarks(stops, span, at) {
    const isOneEra = span[0] >= 0 || span[1] <= 0;
    return stops.flatMap((meta, i) => {
        const mark = { text: isOneEra ? shortYear(meta) : fmtYear(meta), left: at(meta.year), isGap: false };
        const next = stops[i + 1];
        if (!next || next.year - meta.year < LONG_GAP) return [mark];
        return [mark, { text: `← ${next.year - meta.year} години →`, left: (at(meta.year) + at(next.year)) / 2, isGap: true }];
    });
}

const shortYear = ({ year, approx }) => `${approx ? 'ок. ' : ''}${Math.abs(year)}`;

function markEl({ text, left, isGap }) {
    const t = document.createElement('span');
    t.textContent = text;
    t.className = isGap ? 'gap' : '';
    t.style.left = `${left}%`;
    return t;
}

// a stop carries the number of its waypoint on the trail, where the summary is waypoint 0
function dotEl(lesson, n, at, onPick) {
    const { heading, meta } = lesson.parts[n];
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.dataset.n = n;
    d.title = `${fmtYear(meta)} — ${heading}`;
    d.setAttribute('aria-label', d.title);
    d.textContent = n;
    d.style.left = `${at(meta.year)}%`;
    d.addEventListener('click', () => onPick(n));
    return d;
}

// a year's place on a [from, to] line, in percent, kept inside the line
const pct = (year, [a, b]) => Math.min(100, Math.max(0, ((year - a) / (b - a)) * 100));

/* ---------- whole history ---------- */
const BIG_ERAS = [[-1300, 46, 'Траки', '#b07a3c'], [46, 681, 'Рим и Византия', '#8a5fb0'], [681, 1396, 'България', '#c8402f'], [1396, 1878, 'Османска власт', '#3e8a6a'], [1878, 2026, 'България', '#c8402f']];
const BIG_LABELS = [[-1300, '1300 пр.Хр.'], [681, '681 България'], [2026, 'днес']];
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
