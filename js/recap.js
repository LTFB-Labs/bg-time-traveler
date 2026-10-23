// The recap after the check: the lead, all dots done, the names, and a replay of the main borders, one per second.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
import {
    esc,
    nameChip,
} from './lesson.js';

const REPLAY_MS = 1000;

// the main border of each story part in order, a repeat of the one before left out
export function replayBorders(lesson, isState) {
    const mains = lesson.parts
        .filter((p) => p.type === 'story')
        .map((p) => (p.meta.borders ?? []).find(isState));
    return mains.filter((id, i) => id && id !== mains[i - 1]);
}

// the next lesson of the grade when it is ready, else undefined
export function nextLesson(grades, lesson) {
    const entries = grades[lesson.grade] ?? [];
    const next = entries[entries.findIndex((e) => e.id === lesson.id) + 1];
    return next?.state === 'ready' ? next : undefined;
}

// returns the function that stops the replay
export function renderRecap(container, map, lesson, timeline) {
    const { lead, names } = lesson.parts[0].meta;
    const next = nextLesson(CONTENT.grades, lesson);
    container.innerHTML = `<div class="meta"><span class="chip">Край на урока</span></div>
        <h2>${esc(lesson.title)}</h2>
        <p class="lead">${esc(lead)}</p>
        <div class="names"><div class="t">Срещнахме</div>${names.map(nameChip).join('')}</div>
        <div class="recap-acts">
            <button type="button" class="btn" id="lsReplay">Пусни пак</button>
            ${nextLink(next)}
            <a class="btn" href="#free">Към началото</a>
        </div>`;
    timeline.setPart(lesson.parts.length);
    const replay = startReplay(map, replayBorders(lesson, (id) => GEO.borders[id]?.kind === 'state'));
    container.querySelector('#lsReplay').addEventListener('click', replay.restart);
    return replay.stop;
}

const nextLink = (next) => (next
    ? `<a class="btn pri" href="#lesson/${esc(next.id)}">Към следващия урок</a>`
    : '<button type="button" class="btn pri" disabled>Към следващия урок</button>');

function startReplay(map, ids) {
    let timer;
    const stop = () => clearInterval(timer);
    const restart = () => {
        stop();
        let i = 0;
        const step = () => {
            map.showBorders([ids[i]]);
            if (++i === ids.length) stop();
        };
        step();
        timer = setInterval(step, REPLAY_MS);
    };
    restart();
    return { stop, restart };
}
