// The lesson player: the reading pane for CONTENT.lessons[id], one part at a time.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    clamp,
    icon,
} from './map.js';
import {
    createTimeline,
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
    const goTo = (n) => {
        const target = clamp(n, 0, lesson.parts.length - 1);
        if (target === current) return;
        current = target;
        renderPart(lesson, current);
        showPartOnMap(map, lesson, current);
        renderYear(lesson, current);
        renderLegend(mapMeta(lesson, current).borders);
        timeline.setPart(current);
        markSteps(current);
        updateNav(lesson, current);
        history.replaceState(null, '', `#lesson/${lesson.id}/${current}`);
    };
    const player = { goTo, next: () => goTo(current + 1), prev: () => goTo(current - 1), current: () => current };
    showPane();
    renderHead(lesson, goTo);
    const timeline = createTimeline($('lsTl'), lesson, { onPick: goTo });
    wireNav(player);
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
    $('lsSteps').replaceChildren(...lesson.parts.map((p, n) => stepChip(p, n, goTo)));
}

const STEP_LABEL = {
    summary: () => 'Начало',
    story: (p, n) => `${n}. ${shortHeading(p.heading)}`,
    check: () => 'Проверка',
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
    // phones show the chips in one scrolling row
    chips[current].scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        if (e.key === 'ArrowRight') player.next();
        if (e.key === 'ArrowLeft') player.prev();
    });
}

function updateNav(lesson, current) {
    $('lsPrev').disabled = current === 0;
    $('lsNext').disabled = current === lesson.parts.length - 1;
}

/* ---------- map pane ---------- */
// the map follows the part: its borders with the ghost of the earlier main border, its markers, its arrow, its box
function showPartOnMap(map, lesson, n) {
    const meta = mapMeta(lesson, n);
    map.showBorders(meta.borders, ghostFor(lesson, n));
    map.setMarkers(markersFromCards(meta.marks ?? []), (m) => map.setActiveMarker(m.id));
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

// the part's own ghost, else the previous story part's main border when the main border changed
export function ghostFor(lesson, n) {
    const { meta } = lesson.parts[n];
    if (meta.ghost) return meta.ghost;
    const previous = lesson.parts.slice(0, n).findLast((p) => p.type === 'story');
    const before = previous && mainBorder(previous.meta.borders);
    return before && before !== mainBorder(meta.borders) ? before : undefined;
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
function renderPart(lesson, n) {
    const body = $('lsBody');
    body.innerHTML = PART_HTML[lesson.parts[n].type](lesson, n);
    body.scrollTop = 0;
    body.querySelectorAll('.ph img').forEach(swapForPlaceholderOnError);
}

function swapForPlaceholderOnError(img) {
    img.addEventListener('error', () => { img.parentElement.outerHTML = photoBlock(null); }, { once: true });
}

function summaryHtml(lesson) {
    const { heading, meta } = lesson.parts[0];
    return `${photoBlock(CONTENT.photos[meta.photo])}
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
    return `${photoBlock(CONTENT.photos[meta.photo])}
        <div class="meta"><span class="chip y">${fmtYear(meta)}</span><span class="chip">Част ${n} от ${storyCount(lesson)}</span></div>
        <h2>${esc(heading)}</h2>
        ${html}
        ${factHtml ? `<div class="fact"><span class="t">Знаеш ли, че…</span>${factHtml}</div>` : ''}
        ${onMapLine(meta.marks)}
        ${wordList(meta.words)}
        ${teaser(meta.next)}`;
}

// a placeholder until the check lands (Task 9)
const checkHtml = () => '<h2>Проверка</h2><p>Скоро тук ще има въпроси.</p>';

const PART_HTML = { summary: summaryHtml, story: storyHtml, check: checkHtml };

function nameChip(id) {
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

// the picture of a part (and later of a card): the photo with its credit, or the kind icon when there is none
export function photoBlock(photo, kind = 'event') {
    if (!photo) return `<div class="ph"><div class="noimg">${icon(kind)}</div></div>`;
    const credit = `Снимка: <a href="${esc(photo.u)}" target="_blank" rel="noopener">${esc(photo.a)}</a>, ${esc(photo.l)}`;
    return `<div class="ph"><img src="${esc(photo.f)}" alt=""><div class="cr">${credit}</div></div>`;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
