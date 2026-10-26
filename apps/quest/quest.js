// The Quest at #quest: one winding road across an old map, left to right. Each stop is a lesson, each section ends with a boss.
// Only the first unwon stop can be fought; won stops show the lesson's picture and stars, the next one waits locked and the
// rest of the road lies in the fog. A fight asks the questions of the info packages, and the third mistake loses it.
// It reads only CONTENT and the progress store, so it stands apart from the lessons and can be removed on its own.
import { LIVES, fightQuestions, questStops, starsFor } from './quest-path.js';
import { fogClouds, terrainSvg } from './quest-terrain.js';
import { esc } from '../../modules/lesson/lesson.js';
import { iconHtml } from '../../modules/lesson/lesson-list.js';
import { MOCK_LESSONS } from '../../modules/lesson/mock-lessons.js';
import { loadProgress, setQuestStars } from '../../code/store.js';

const STEP = 210; // road length between two stops, in pixels
const SECTION_HEAD = 350; // room for a section's picture and description before its first stop
// castles drawn as thin ink lines, like the icons of an old map; lessons take the four small ones in turn, a boss the big fortress.
// .wall shapes are filled with paper so the road does not show through, .line strokes stay open, .flag takes the section's colour
const svg = (body) => `<svg class="castle" viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
const CASTLES = [
    // a tower with battlements, a window and a door
    svg('<path class="wall" d="M14 46V18l-3-3V5h5v4h4V5h8v4h4V5h5v10l-3 3v28z"/><path class="line" d="M14 18h20M21.5 30v-4.5a2.5 2.5 0 0 1 5 0V30zM20 46v-6a4 4 0 0 1 8 0v6M8 46h32"/>'),
    // a keep between two low walls
    svg('<path class="wall" d="M6 46V22h3v3h3v-3h3v3h2v21zM31 46V25h2v-3h3v3h3v-3h3v24z"/><path class="wall" d="M17 46V15l-2-2V4h4v3h3V4h4v3h3V4h4v9l-2 2v31z"/><path class="line" d="M17 15h14M21.5 28v-4a2.5 2.5 0 0 1 5 0v4zM4 46h40"/>'),
    // two towers with a gate between them
    svg('<path class="wall" d="M19 46V27h2v-3h2v3h2v-3h2v3h2v19z"/><path class="wall" d="M6 46V18l-2-2V7h4v3h3V7h3v3h3V7h4v9l-2 2v28zM42 46V18l2-2V7h-4v3h-3V7h-3v3h-3V7h-4v9l2 2v28z"/><path class="line" d="M6 18h13M29 18h13M10.5 29v-3.5a2 2 0 0 1 4 0V29zM33.5 29v-3.5a2 2 0 0 1 4 0V29zM20.5 46v-6a3.5 3.5 0 0 1 7 0v6M3 46h42"/>'),
    // a round tower with a pointed roof and a flag
    svg('<path class="flag" d="M24 3h6l-1.8 1.6L30 6.2h-6z"/><path class="line" d="M24 10V3"/><path class="wall" d="M16 46V24h16v22z"/><path class="wall" d="M13 24h22L24 10z"/><path class="line" d="M21.5 36v-4.5a2.5 2.5 0 0 1 5 0V36zM10 46h28"/>'),
];
const FORTRESS = svg('<path class="flag" d="M11 3h5l-1.4 1.3L16 5.6h-5zM37 3h5l-1.4 1.3L42 5.6h-5z"/><path class="line" d="M11 9V3M37 9V3"/>'
    + '<path class="wall" d="M17 46V30h2v-3h3v3h4v-3h3v3h2v16z"/><path class="wall" d="M5 46V22h12v24zM31 46V22h12v24z"/><path class="wall" d="M3 22h16L11 9zM29 22h16L37 9z"/>'
    + '<path class="line" d="M9 35v-3.5a2 2 0 0 1 4 0V35zM35 35v-3.5a2 2 0 0 1 4 0V35zM20.5 46v-6a3.5 3.5 0 0 1 7 0v6M1 46h46"/>');
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.2l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"/></svg>';

let root;
let trail;
// closes the open fight; a fight sets it when it starts
let closeFight = () => {};

export function startQuest() {
    root = document.getElementById('quest');
    trail = root.querySelector('.trail');
    root.hidden = false;
    const box = root.querySelector('.fight');
    box.addEventListener('click', (e) => {
        if (e.target === box || e.target.closest('.x')) closeFight();
    });
    addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeFight();
    });
    draw(true);
    wireScroll();
    addEventListener('resize', () => draw(false));
}

function data() {
    const { sections } = CONTENT.quest;
    return questStops({ sections, lessons: CONTENT.lessons, grades: CONTENT.grades, cards: CONTENT.cards, photos: CONTENT.photos, stars: loadProgress().quest }, MOCK_LESSONS);
}

// lays out the sections, the road and the stops for the trail's height; center puts the stop to fight in the middle
function draw(center, justWon) {
    const stops = data();
    const H = trail.clientHeight;
    const { sections } = CONTENT.quest;
    let x = 40;
    const bands = [];
    const placed = [];
    sections.forEach((section) => {
        const from = x;
        x += SECTION_HEAD;
        stops.filter((stop) => stop.section === section.id).forEach((stop) => {
            const k = placed.length;
            placed.push({ ...stop, x, y: Math.round(H * (0.63 + 0.17 * Math.sin(k * 1.25 + 0.6))) });
            x += stop.kind === 'boss' ? STEP + 40 : STEP;
        });
        bands.push({ section, from, to: x });
    });
    const width = x + 120;
    const fogAt = placed.find((stop) => stop.isFog);
    const land = root.querySelector('.land');
    land.style.width = `${width}px`;
    // the section cards: the land leaves them empty
    const keepOut = bands.map(({ from }) => ({ x0: from + 10, y0: 10, x1: from + 315, y1: 300 }));
    land.innerHTML = `<svg class="terrain" width="${width}" height="${H}" aria-hidden="true">${terrainSvg({ width, height: H, stops: placed, keepOut })}</svg>
        ${bands.map(bandHtml).join('')}
        <svg class="road" width="${width}" height="${H}" aria-hidden="true"><path class="edge" d="${roadPath(placed, H, width)}"/><path class="stitch" d="${roadPath(placed, H, width)}"/></svg>
        ${placed.map((stop, i) => stopHtml(stop, i)).join('')}
        ${fogAt ? `<div class="fog">${fogClouds({ from: fogAt.x - 110, width, height: H })}</div>` : ''}`;
    const total = stops.reduce((sum, stop) => sum + stop.stars, 0);
    root.querySelector('.total').innerHTML = `${STAR}<b>${total}</b> от ${stops.length * 3}`;
    land.querySelectorAll('.stop.open').forEach((el) => el.addEventListener('click', () => fight(placed.find((s) => s.id === el.dataset.id))));
    const target = placed.find((stop) => stop.state === 'open' || stop.state === 'soon') ?? placed.at(-1);
    if (center && target) trail.scrollLeft = target.x - trail.clientWidth / 2;
    if (justWon && target) {
        land.querySelector(`.stop[data-id="${target.id}"]`)?.classList.add('fresh');
        trail.scrollTo({ left: target.x - trail.clientWidth / 2, behavior: 'smooth' });
    }
}

function bandHtml({ section, from, to }) {
    const photo = CONTENT.photos[section.photo]?.f;
    const count = section.lessons.length;
    return `<section class="band" style="left:${from}px;width:${to - from}px;--c:${section.color}">
        <div class="head">${photo ? `<img src="${esc(photo)}" alt="">` : ''}
        <h2>${iconHtml(section.icon)}${esc(section.title)}</h2><p>${esc(section.description)}</p>
        <span class="meta">${count} ${count === 1 ? 'урок' : 'урока'} и бос</span></div></section>`;
}

// a smooth road through every stop: from the left edge, through the stops, to the right edge
function roadPath(stops, H, width) {
    const points = [[0, Math.round(H * 0.72)], ...stops.map((s) => [s.x, s.y]), [width, Math.round(H * 0.7)]];
    let d = `M${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const mid = (x0 + x1) / 2;
        d += ` C${mid} ${y0} ${mid} ${y1} ${x1} ${y1}`;
    }
    return d;
}

function stopHtml(stop, i) {
    const isBoss = stop.kind === 'boss';
    const castle = isBoss ? FORTRESS : CASTLES[i % CASTLES.length];
    const won = stop.state === 'won';
    const label = isBoss ? `<b>Бос</b><span>${esc(stop.title)}</span>` : `<b>Урок ${stop.number}</b><span>${esc(stop.title)}</span>`;
    const stars = won ? `<span class="stars">${[1, 2, 3].map((n) => `<i class="${n <= stop.stars ? 'on' : ''}">${STAR}</i>`).join('')}</span>` : '';
    const picture = won && stop.photo ? `<img class="pic" src="${esc(stop.photo)}" alt="">` : '';
    const note = { open: 'Битка!', soon: 'Скоро', locked: '' }[stop.state] ?? '';
    const tag = stop.state === 'open' ? 'button' : 'div';
    return `<${tag} class="stop ${stop.state}${isBoss ? ' boss' : ''}${stop.isFog ? ' fogged' : ''}" data-id="${esc(stop.id)}" style="left:${stop.x}px;top:${stop.y}px;--c:${stop.color}"${tag === 'button' ? ' type="button"' : ''}>
        ${stars}${picture}${castle}
        <span class="ribbon">${iconHtml(stop.icon)}<span class="txt">${label}${note ? `<em>${note}</em>` : ''}</span></span></${tag}>`;
}

/* ---------- a fight: the questions one by one, three lives; a wrong answer shows where the answer is written ---------- */
function fight(stop) {
    const box = root.querySelector('.fight');
    const questions = fightQuestions(stop);
    let i = 0;
    let mistakes = 0;
    const close = () => {
        box.hidden = true;
        closeFight = () => {};
    };
    closeFight = close;
    // the stars still to win: each mistake puts one out
    const lives = () => Array.from({ length: LIVES }, (_, k) => `<i class="${k < LIVES - mistakes ? 'on' : ''}">${STAR}</i>`).join('');
    const top = () => `<header>${iconHtml(stop.icon)}<h2>${stop.kind === 'boss' ? `Бос · ${esc(stop.title)}` : `Урок ${stop.number} · ${esc(stop.title)}`}</h2>
        <span class="lives stars" aria-label="Още ${LIVES - mistakes} звезди">${lives()}</span><button class="x" type="button" aria-label="Затвори">×</button></header>
        <div class="bar"><i style="width:${(i / questions.length) * 100}%"></i></div>`;
    const ask = () => {
        const question = questions[i];
        box.querySelector('.sheet').innerHTML = `${top()}
            <p class="count">Въпрос ${i + 1} от ${questions.length}</p>
            <h3>${esc(question.q)}</h3>
            <div class="choices">${question.choices.map((choice) => `<button class="choice" type="button">${esc(choice)}</button>`).join('')}</div>
            <div class="why" hidden></div>`;
        box.querySelectorAll('.choice').forEach((button) => button.addEventListener('click', () => answer(button, question)));
    };
    const answer = (button, question) => {
        const isRight = button.textContent === question.answer;
        box.querySelectorAll('.choice').forEach((b) => {
            b.disabled = true;
            if (b.textContent === question.answer) b.classList.add('right');
        });
        if (isRight) {
            button.classList.add('right');
            setTimeout(next, 650);
            return;
        }
        button.classList.add('wrong');
        mistakes++;
        box.querySelector('.lives').innerHTML = lives();
        if (mistakes >= LIVES) {
            setTimeout(() => end(0), 900);
            return;
        }
        const why = box.querySelector('.why');
        why.hidden = false;
        why.innerHTML = `<p>Отговорът е в „${esc(question.cardTitle)}“:</p><blockquote>${markAnswer(question.quote, question.answer)}</blockquote>
            <button class="btn pri" type="button">Напред</button>`;
        why.querySelector('.btn').addEventListener('click', next);
    };
    const next = () => {
        i++;
        if (i < questions.length) ask();
        else end(starsFor(mistakes));
    };
    const end = (stars) => {
        if (stars > 0) setQuestStars(stop.id, stars);
        box.querySelector('.sheet').innerHTML = stars > 0
            ? `${top()}<div class="result win"><h3>Победа!</h3><span class="stars big">${[1, 2, 3].map((n) => `<i class="${n <= stars ? 'on' : ''}" style="--d:${n * 0.18}s">${STAR}</i>`).join('')}</span>
                <p>${['', 'Две грешки – една звезда.', 'Една грешка – две звезди.', 'Без нито една грешка!'][stars]}</p><button class="btn pri" type="button">Към пътеката</button></div>`
            : `${top()}<div class="result lose"><h3>Този път не стана</h3><p>Три грешки. Прочети картичките още веднъж и опитай пак!</p>
                <div class="row"><button class="btn again" type="button">Опитай пак</button><button class="btn pri" type="button">Към пътеката</button></div></div>`;
        box.querySelector('.result .pri').addEventListener('click', () => {
            close();
            draw(false, stars > 0);
        });
        box.querySelector('.result .again')?.addEventListener('click', () => {
            close();
            fight(stop);
        });
    };
    box.hidden = false;
    ask();
}

// the quote with the answer in it marked, so the child sees where it is written
function markAnswer(quote, answer) {
    const at = quote.toLowerCase().indexOf(answer.toLowerCase());
    if (at < 0) return esc(quote);
    return `${esc(quote.slice(0, at))}<mark>${esc(quote.slice(at, at + answer.length))}</mark>${esc(quote.slice(at + answer.length))}`;
}

// the wheel and a mouse drag move the road sideways
function wireScroll() {
    trail.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        e.preventDefault();
        trail.scrollBy({ left: e.deltaY });
    }, { passive: false });
    let drag = null;
    trail.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && !e.target.closest('.stop.open')) drag = { x: e.clientX, left: trail.scrollLeft };
    });
    addEventListener('pointermove', (e) => {
        if (drag) trail.scrollLeft = drag.left - (e.clientX - drag.x);
    });
    addEventListener('pointerup', () => {
        drag = null;
    });
}
