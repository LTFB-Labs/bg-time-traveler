// The lesson player: the reading pane for CONTENT.lessons[id], one part at a time.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    cardIcon,
    clamp,
} from './map.js';
import { startAlive } from './alive.js';
import { createCards } from './cards.js';
import { renderCheck } from './check.js';
import { renderPredict } from './predict.js';
import { renderRecap } from './recap.js';
import {
    loadProgress,
    setPosition,
} from './store.js';
import {
    createTimeline,
    eraAt,
    isOnStrip,
    shortHeading,
    storyCount,
} from './timeline.js';
import {
    fmtSpan,
    fmtYear,
} from './years.js';

const $ = (id) => document.getElementById(id);

export function startLesson(map, lesson, { part = 0 } = {}) {
    let current = -1;
    let isCheckPassed = false;
    let stopReplay = () => {};
    const recapAt = lesson.parts.length;
    // the recap is the virtual part after the check; it opens once the check was passed in this sitting or the lesson is stored as passed
    const canRecap = () => isCheckPassed || Boolean(loadProgress().passed[lesson.id]);
    const cards = createCards($('lsPop'));
    const goTo = (n) => {
        const target = clamp(n, 0, canRecap() ? recapAt : recapAt - 1);
        if (target === current) return;
        current = target;
        cards.close();
        stopReplay();
        if (current === recapAt) stopReplay = openRecap();
        else openPart();
        markSteps(current);
        updateNav(lesson, current, canRecap());
        setPosition(lesson.id, current);
        history.replaceState(null, '', `#lesson/${lesson.id}/${current}`);
    };
    const openPart = () => {
        renderPart(lesson, current, cards);
        showScene(isHeld(lesson, current) ? sceneBefore(lesson, current) : current);
        wirePredict(lesson, current, () => showScene(current));
        wireCheck(map, lesson, current, { onPassed, goTo });
    };
    // the recap shows the summary's area with no markers, arrow or legend, and replays the borders over it
    const openRecap = () => {
        map.onMapClick(null);
        map.setMarkers([], () => {});
        map.drawPath(null);
        map.flyTo(lesson.parts[0].meta.box);
        renderYear(lesson, 0);
        renderEra(lesson, 0);
        renderLegend([]);
        const stop = renderRecap($('lsBody'), map, lesson, timeline);
        $('lsBody').scrollTop = 0;
        return stop;
    };
    // the map, year corner, era pill, legend and timeline knob of one part
    const showScene = (n) => {
        showPartOnMap(map, lesson, n, cards);
        renderYear(lesson, n);
        renderEra(lesson, n);
        renderLegend(legendIds(lesson, n));
        timeline.setPart(n);
        alive.showPart(n);
    };
    const onPassed = () => {
        isCheckPassed = true;
        updateNav(lesson, current, canRecap());
    };
    const player = { goTo, next: () => goTo(current + 1), prev: () => goTo(current - 1), current: () => current };
    showPane();
    renderHead(lesson, goTo);
    const timeline = createTimeline($('lsTl'), lesson, { onPick: goTo });
    const alive = startAlive(map, lesson);
    wireNav(player);
    wirePrint();
    wireHandCamera(map);
    fitMapPane(map);
    addEventListener('resize', () => fitMapPane(map));
    goTo(part);
    return player;
}

export function showNoLesson() {
    showPane();
    $('lsHead').hidden = true;
    $('lsNav').hidden = true;
    $('lsBody').innerHTML = '<p class="missing">Няма такъв урок. <a href="#free">Към началото</a></p>';
}

function showPane() {
    $('lesson').hidden = false;
}

const MAP_PAD = 24;

// the SVG still fills the window; the camera fits its boxes into the visible map pane above the timeline strip
function fitMapPane(map) {
    const r = $('lsMap').getBoundingClientRect();
    const strip = $('lsTl').offsetHeight;
    map.setFreeRect({ x: r.x + MAP_PAD, y: r.y + MAP_PAD, w: r.width - 2 * MAP_PAD, h: r.height - strip - 2 * MAP_PAD });
}

/* ---------- header ---------- */
function renderHead(lesson, goTo) {
    const [grade, position] = $('lsCrumbs').children;
    grade.textContent = `${lesson.grade}. клас`;
    position.textContent = `Урок ${lesson.number}`;
    $('lsTitle').textContent = lesson.title;
    $('lsSteps').replaceChildren(...[...lesson.parts.map((p, n) => stepChip(p, n, goTo)), stepChip({ type: 'recap', heading: 'Обобщение' }, lesson.parts.length, goTo)]);
}

const STEP_LABEL = {
    summary: () => 'Начало',
    story: (p, n) => `${n}. ${shortHeading(p.heading)}`,
    check: () => 'Проверка',
    recap: () => 'Край',
};

function stepChip(p, n, goTo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = STEP_LABEL[p.type](p, n);
    b.title = p.heading;
    b.addEventListener('click', () => goTo(n));
    return b;
}

function markSteps(current) {
    const chips = [...$('lsSteps').children];
    chips.forEach((b, i) => {
        b.className = stepClass(i, current);
        b.toggleAttribute('aria-current', i === current);
    });
}

function stepClass(i, current) {
    if (i < current) return 'done';
    return i === current ? 'cur' : 'todo';
}

/* ---------- navigation ---------- */
function wireNav(player) {
    $('lsPrev').addEventListener('click', player.prev);
    $('lsNext').addEventListener('click', player.next);
    addEventListener('keydown', (e) => {
        if (e.altKey || e.metaKey || e.ctrlKey || isTypingArea(e.target)) return;
        if (e.key === 'ArrowRight') player.next();
        if (e.key === 'ArrowLeft') player.prev();
    });
}

// a click on the part's print opens it large over the map; while it is open, any click or Escape closes it, except on the credit link
function wirePrint() {
    document.addEventListener('click', togglePrint);
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closePrint(); });
}

function togglePrint(e) {
    if (e.target.closest('a')) return;
    const open = $('lsBody').querySelector('.snap.big');
    if (open) {
        open.classList.remove('big');
        return;
    }
    e.target.closest('#lsBody .snap')?.classList.add('big');
}

function closePrint() {
    $('lsBody').querySelector('.snap.big')?.classList.remove('big');
}

// arrow keys belong to the field, the check or the prediction when the focus is in one
const isTypingArea = (el) => Boolean(el.closest?.('input, textarea, select, [contenteditable], #lsCheck, .predict'));

// the kid may pan and zoom the map; "Върни ме" shows once they do and flies back to the part's box
function wireHandCamera(map) {
    map.setMode('lesson');
    map.onUserMove((moved) => { $('lsReturn').hidden = !moved; });
    $('lsReturn').addEventListener('click', map.resetCamera);
}

// on the check Next stays disabled until the check is passed, then it names the recap; the recap is the last part
function updateNav(lesson, current, canRecap) {
    const isCheck = lesson.parts[current]?.type === 'check';
    const isPassedCheck = canRecap && isCheck;
    $('lsPrev').disabled = current === 0;
    $('lsNext').disabled = current === lesson.parts.length || (isCheck && !canRecap);
    $('lsNext').firstChild.textContent = isPassedCheck ? 'Към обобщението ' : 'Напред ';
}

/* ---------- map pane ---------- */
// the map follows the part: its borders with the ghost of the earlier main border, its markers, its arrow, its box
function showPartOnMap(map, lesson, n, cards) {
    const meta = mapMeta(lesson, n);
    map.showBorders(meta.borders, ghostFor(lesson, n));
    map.setMarkers(markersFromCards(meta.marks ?? []), (m) => {
        map.setActiveMarker(m.id);
        cards.open(m.id);
    });
    map.drawPath(meta.path ?? null);
    map.flyTo(meta.box);
}

// the check has no map of its own: it shows the summary's area and borders, without markers that would give answers away
function mapMeta(lesson, n) {
    const { meta } = lesson.parts[n];
    if (meta.box) return meta;
    const { box, borders } = lesson.parts[0].meta;
    return { box, borders };
}

// the part's own ghost, else the previous story part's main border when both parts have one and it changed
export function ghostFor(lesson, n) {
    const { meta } = lesson.parts[n];
    if (meta.ghost) return meta.ghost;
    const previous = lesson.parts.slice(0, n).findLast((p) => p.type === 'story');
    const before = previous && mainBorder(previous.meta.borders);
    const now = mainBorder(meta.borders);
    return before && now && before !== now ? before : undefined;
}

// the first state among the borders, as map.showBorders picks it
const mainBorder = (ids = []) => ids.find((id) => GEO.borders[id]?.kind === 'state');

export function markersFromCards(ids) {
    const cards = ids.map((id) => CONTENT.cards[id] ?? { id });
    cards.filter((c) => !c.at).forEach(warnNoPlace);
    return cards.filter((c) => c.at).map((c) => ({ id: c.id, at: c.at, kind: c.kind, title: c.title, photo: CONTENT.photos[c.photo]?.f }));
}

const warnedNoPlace = new Set();

function warnNoPlace({ id }) {
    if (warnedNoPlace.has(id)) return;
    warnedNoPlace.add(id);
    console.warn(`markersFromCards: card ${id} has no place on the map, skipped`);
}

// the check shows no legend: its map changes with the question, and border names would hint at answers
const legendIds = (lesson, n) => (lesson.parts[n].type === 'check' ? [] : mapMeta(lesson, n).borders);

// the year corner; the summary and the check show the lesson's span, smaller
function renderYear(lesson, n) {
    const { type, meta } = lesson.parts[n];
    const isStory = type === 'story';
    const year = $('lsYear');
    year.innerHTML = yearHtml(isStory ? fmtYear(meta) : fmtSpan(lesson.span));
    year.classList.toggle('span', !isStory);
}

// the number large and the era words small, as in spike/lesson.html
function yearHtml(text) {
    const [number, words] = text.split(/ (?=г\.)/);
    return words ? `${esc(number)}<small>${esc(words)}</small>` : esc(number);
}

// the era pill: the lesson era that holds the part's year; hidden without a year on the strip or an era around it
function renderEra(lesson, n) {
    const part = lesson.parts[n];
    const name = isOnStrip(part) ? eraAt(lesson.eras, part.meta.year) : undefined;
    $('lsEra').hidden = !name;
    $('lsEra').lastElementChild.textContent = name ?? '';
}

function renderLegend(ids) {
    const main = mainBorder(ids);
    $('lsLegend').innerHTML = ids.map((id) => legendPill(GEO.borders[id], id === main)).join('');
}

function legendPill(border, isMain) {
    return `<span><i style="background:${swatch(border, isMain)}"></i>${esc(border.n)}</span>`;
}

// tribes are hatched; states are the border colour on paper, the main one stronger
function swatch({ kind, c }, isMain) {
    if (kind === 'tribes') return `repeating-linear-gradient(35deg, ${c} 0 2px, #e8d7b0 2px 5px)`;
    return `color-mix(in srgb, ${c} ${isMain ? 55 : 35}%, #f2e6c6)`;
}

/* ---------- part body ---------- */
function renderPart(lesson, n, cards) {
    const body = $('lsBody');
    body.innerHTML = PART_HTML[lesson.parts[n].type](lesson, n);
    body.scrollTop = 0;
    body.querySelectorAll('.ph img').forEach((img) => swapForPlaceholderOnError(img));
    body.querySelectorAll('b.term[data-card]').forEach((b) => b.addEventListener('click', () => cards.open(b.dataset.card)));
}

// the guess is asked once per sitting (the chosen option is kept); until then the part's picture, heading, text and map change stay held back
const guessed = new Map();

const guessKey = (lesson, n) => `${lesson.id}:${n}`;

function isHeld(lesson, n) {
    return Boolean(lesson.parts[n].meta.predict) && !guessed.has(guessKey(lesson, n));
}

// while the guess is open the map shows the previous story part (or the summary), so nothing on screen gives the answer away
function sceneBefore(lesson, n) {
    const previous = lesson.parts.slice(0, n).findLastIndex((p) => p.type === 'story');
    return Math.max(previous, 0);
}

function wirePredict(lesson, n, onReveal) {
    const { predict } = lesson.parts[n].meta;
    if (!predict) return;
    const key = guessKey(lesson, n);
    renderPredict($('lsPredict'), predict, (chosen) => {
        guessed.set(key, chosen);
        $('lsBody').querySelectorAll('.held').forEach((el) => el.classList.remove('held'));
        onReveal();
    }, guessed.get(key));
}

// kind: the card kind whose icon replaces a picture that fails to load
export function swapForPlaceholderOnError(img, kind) {
    img.addEventListener('error', () => { img.parentElement.outerHTML = photoBlock(null, kind); }, { once: true });
}

function summaryHtml(lesson) {
    const { heading, meta } = lesson.parts[0];
    return `${printBlock(CONTENT.photos[meta.photo])}
        <div class="meta"><span class="chip y">${fmtSpan(lesson.span)}</span><span class="chip">Преглед на урока</span></div>
        <h2>${esc(heading)}</h2>
        <p class="lead">${esc(meta.lead)}</p>
        <ol class="goals">${meta.goals.map((g, i) => `<li><span>${i + 1}</span>${esc(g)}</li>`).join('')}</ol>
        <div class="names"><div class="t">Ще срещнем</div>${meta.names.map(nameChip).join('')}</div>
        ${onMapLine(meta.marks)}
        ${teaser(meta.next)}`;
}

function storyHtml(lesson, n) {
    const { heading, html, factHtml, meta } = lesson.parts[n];
    const held = isHeld(lesson, n) ? 'held' : '';
    return `<div class="${held}">${printBlock(CONTENT.photos[meta.photo])}</div>
        <div class="meta"><span class="chip y">${fmtYear(meta)}</span><span class="chip">Част ${n} от ${storyCount(lesson)}</span></div>
        <h2 class="${held}">${esc(heading)}</h2>
        <div id="lsPredict"></div>
        <div id="lsText" class="${held}">
            ${html}
            ${factHtml ? `<div class="fact"><span class="t">Знаеш ли, че…</span>${factHtml}</div>` : ''}
            ${onMapLine(meta.marks)}
            ${wordList(meta.words)}
            ${teaser(meta.next)}
        </div>`;
}

function checkHtml(lesson, n) {
    return `<div class="meta"><span class="chip y">${fmtSpan(lesson.span)}</span></div>
        <h2>${esc(lesson.parts[n].heading)}</h2>
        <div id="lsCheck"></div>`;
}

// the check owns the map taps while it is on screen; every other part turns them off
function wireCheck(map, lesson, n, handlers) {
    map.onMapClick(null);
    if (lesson.parts[n].type !== 'check') return;
    renderCheck($('lsCheck'), map, lesson, handlers);
}

const PART_HTML = { summary: summaryHtml, story: storyHtml, check: checkHtml };

export function nameChip(id) {
    const { title, dates } = CONTENT.cards[id];
    const when = dates ? ` ${esc(dates.split(' ').slice(0, 3).join(' '))}` : '';
    return `<span><b>${esc(title)}</b>${when}</span>`;
}

function onMapLine(marks = []) {
    const titles = marks.filter((id) => CONTENT.cards[id]).map((id) => esc(CONTENT.cards[id].title));
    return titles.length ? `<div class="onmap">На картата: <em>${titles.join(' · ')}</em>.</div>` : '';
}

function wordList(words = []) {
    const rows = words.map((w) => Object.entries(w)[0]).map(([term, meaning]) => `<div><dt>${esc(term)}</dt> — <dd>${esc(meaning)}</dd></div>`);
    return rows.length ? `<dl class="words">${rows.join('')}</dl>` : '';
}

const teaser = (next) => (next ? `<div class="teaser"><small>Следва</small>${esc(next)}</div>` : '');

// the picture of a part as an instant print: the photo, with its caption handwritten on the white strip below
function printBlock(photo) {
    return `<figure class="snap">${photoBlock(photo)}<figcaption>${esc(photo?.c ?? '')}</figcaption></figure>`;
}

// the picture of a part or a card: the photo with its credit, or the icon of the card kind when there is none
export function photoBlock(photo, kind = 'event') {
    if (!photo) return `<div class="ph"><div class="noimg">${cardIcon(kind)}</div></div>`;
    const credit = `Снимка: <a href="${esc(photo.u)}" target="_blank" rel="noopener">${esc(photo.a)}</a>, ${esc(photo.l)}`;
    return `<div class="ph"><img src="${esc(photo.f)}" alt=""><div class="cr">${credit}</div></div>`;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
