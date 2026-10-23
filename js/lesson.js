// The lesson player: the reading pane for CONTENT.lessons[id], one part at a time.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    clamp,
    icon,
} from './map.js';
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
        markSteps(current);
        updateNav(lesson, current);
        history.replaceState(null, '', `#lesson/${lesson.id}/${current}`);
    };
    const player = { goTo, next: () => goTo(current + 1), prev: () => goTo(current - 1), current: () => current };
    showPane();
    renderHead(lesson, goTo);
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

// the SVG still fills the window; the camera fits its boxes into the visible map pane
function fitMapPane(map) {
    const r = $('lsMap').getBoundingClientRect();
    map.setFreeRect({ x: r.x, y: r.y, w: r.width, h: r.height });
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

const SHORT_MAX = 24;

// a chapter chip: the heading up to its first dash or colon, cut at a word to at most 24 characters
export function shortHeading(heading) {
    const head = heading.split(/ [—–] |:/)[0];
    if (head.length <= SHORT_MAX) return head;
    const cut = head.slice(0, SHORT_MAX + 1);
    return cut.slice(0, cut.lastIndexOf(' ')) || head.slice(0, SHORT_MAX);
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

const storyCount = (lesson) => lesson.parts.filter((p) => p.type === 'story').length;

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
