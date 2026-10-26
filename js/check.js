// The check: the last part's questions one under another, each with its own feedback line.
// No score: green or red with one sentence and "Опитай пак" on red; passed when every question was green once in this sitting.
import {
    answer,
    initialState,
    isCorrect,
    isPassed,
    redSentence,
    retry,
    shuffle,
} from './check-state.js';
import {
    CHOICE_COLOURS,
    CHOICE_LETTERS,
} from './map.js';
import { markPassed } from './store.js';

// each lesson's answers for this sitting, so leaving through "Виж отново" and coming back keeps them
const sittings = new Map();

// goTo opens a part of the lesson in place, without the page reload a hash change would cause
export function renderCheck(container, map, lesson, { onPassed, goTo }) {
    const { questions } = lesson.parts.find((p) => p.type === 'check').meta;
    const drafts = questions.map(newDraft);
    const stateNow = () => sittings.get(lesson.id) ?? initialState();
    const draw = () => {
        const state = stateNow();
        const owner = mapOwner(questions, state);
        container.innerHTML = questions.map((q, i) => questionHtml(q, viewOf(lesson, state, drafts, owner, i))).join('');
        showOnMap(map, lesson, questions, state, owner, (lonlat) => submit(owner, lonlat));
    };
    const submit = (i, value) => {
        const before = stateNow();
        const after = answer(before, i, isCorrect(questions[i], value), value);
        sittings.set(lesson.id, after);
        draw();
        if (isPassed(before, questions) || !isPassed(after, questions)) return;
        markPassed(lesson.id);
        onPassed();
    };
    const control = {
        questions,
        drafts,
        submit,
        goTo,
        change: (i, edit) => { edit(drafts[i]); draw(); },
        retry: (i) => {
            sittings.set(lesson.id, retry(stateNow(), i));
            drafts[i] = newDraft(questions[i]);
            draw();
        },
    };
    container.addEventListener('click', (e) => runAction(e, control));
    draw();
}

// the picks of an order or match question before Провери: an id list, or { card id: description } and the selected card
const newDraft = (q) => ({ picks: q.type === 'match' ? {} : [], selected: null });

const viewOf = (lesson, state, drafts, owner, i) => ({ i, lessonId: lesson.id, record: state.answers[i], draft: drafts[i], owner });

/* ---------- the map ---------- */
const MAP_TYPES = ['tap', 'pick-border'];

// the first map question still open owns the map; a later open map question waits for it
const mapOwner = (questions, state) => questions.findIndex((q, i) => MAP_TYPES.includes(q.type) && !state.answers[i]);

// pick-border shows its choices; tap and no owner show the summary's borders, and only an open tap hears the map
function showOnMap(map, lesson, questions, state, owner, onTap) {
    const q = questions[owner];
    if (q?.type === 'pick-border') map.showChoices(q.options);
    else map.showBorders(lesson.parts[0].meta.borders);
    map.onMapClick(q?.type === 'tap' ? onTap : null);
    map.setMarkers(pins(questions, state), () => {});
}

// the kid's pin of each answered tap question, green or red; after a red one the right spot too
function pins(questions, state) {
    return questions.flatMap((q, i) => (q.type === 'tap' && state.answers[i] ? tapPins(q, i, state.answers[i]) : []));
}

function tapPins(q, i, { isCorrect: isRight, value }) {
    const mine = { id: `check-pin-${i}`, at: value, kind: 'pin', title: 'Твоят отговор', tone: isRight ? 'ok' : 'bad' };
    const right = { id: `check-spot-${i}`, at: q.at, kind: 'pin', title: 'Верното място', tone: 'ok' };
    return isRight ? [mine] : [mine, right];
}

/* ---------- clicks ---------- */
// every button and link of the check carries data-act; data-v is its value
function runAction(e, control) {
    const target = e.target.closest('[data-act]');
    if (!target) return;
    e.preventDefault();
    const i = Number(target.closest('.q').dataset.i);
    ACTIONS[target.dataset.act](control, i, target.dataset.v);
    // the question was drawn anew: keyboard focus stays in it
    e.currentTarget.querySelector(`.q[data-i="${i}"] :is(button, a):not(:disabled)`)?.focus({ preventScroll: true });
}

const ACTIONS = {
    pick: (c, i, v) => c.submit(i, Number(v)),
    chip: (c, i, id) => c.change(i, (d) => d.picks.push(id)),
    clear: (c, i) => c.change(i, (d) => { d.picks = []; }),
    left: (c, i, id) => c.change(i, (d) => selectLeft(d, id)),
    right: (c, i, k) => c.change(i, (d) => pairRight(d, c.questions[i], Number(k))),
    submit: (c, i) => c.submit(i, structuredClone(c.drafts[i].picks)),
    retry: (c, i) => c.retry(i),
    see: (c, i, part) => c.goTo(Number(part)),
};

// a paired card lets go of its description; tapping the selected card again unselects it
function selectLeft(d, id) {
    const wasSelected = d.selected === id;
    delete d.picks[id];
    d.selected = wasSelected ? null : id;
}

// a description goes to the selected card, else to the first card still without one
function pairRight(d, q, k) {
    const id = d.selected ?? q.pairs.map(([cardId]) => cardId).find((cardId) => !d.picks[cardId]);
    d.picks[id] = q.pairs[k][1];
    d.selected = null;
}

/* ---------- questions ---------- */
function questionHtml(q, view) {
    return `<section class="q" data-i="${view.i}">
        <p class="qt"><b>${view.i + 1}.</b> ${esc(q.q)}</p>
        ${BODY[q.type](q, view)}
        ${feedbackHtml(q, view)}
    </section>`;
}

const tapBody = (q, view) => (view.record ? '' : hintHtml(view, 'Натисни на картата.'));

function orderBody(q, { i, record, draft }) {
    if (record) return chipRow(record.value);
    const pool = shuffle(q.items, i).map((id) => `<button type="button" class="pick" data-act="chip" data-v="${esc(id)}"${off(draft.picks.includes(id))}>${title(id)}</button>`);
    return `<div class="pool">${pool.join('')}</div>
        ${chipRow(draft.picks)}
        ${actsHtml(draft.picks.length < q.items.length, '<button type="button" class="btn" data-act="clear">Изчисти</button>')}`;
}

function pickBorderBody(q, view) {
    const isWaiting = view.owner !== view.i;
    const letter = (k) => `<i style="background:${CHOICE_COLOURS[k]}"></i>${CHOICE_LETTERS[k]}`;
    const buttons = q.options.map((_, k) => optionButton(k, letter(k), view.record, isWaiting));
    return `${view.record ? '' : hintHtml(view, 'Виж буквите на картата.')}<div class="opts letters">${buttons.join('')}</div>`;
}

function chooseBody(q, { record }) {
    return `<div class="opts">${q.options.map((o, k) => optionButton(k, esc(o), record, false)).join('')}</div>`;
}

function matchBody(q, { i, record, draft }) {
    const picks = record ? record.value : draft.picks;
    const cards = q.pairs.map(([id]) => leftButton(id, picks[id], draft.selected === id, Boolean(record)));
    if (record) return `<div class="opts">${cards.join('')}</div>`;
    const used = new Set(Object.values(picks));
    const order = shuffle([...q.pairs.keys()], i);
    const texts = order.filter((k) => !used.has(q.pairs[k][1])).map((k) => `<button type="button" class="pick" data-act="right" data-v="${k}">${esc(q.pairs[k][1])}</button>`);
    return `<div class="match"><div>${cards.join('')}</div><div>${texts.join('')}</div></div>
        ${actsHtml(Object.keys(picks).length < q.pairs.length, '')}`;
}

const BODY = { tap: tapBody, order: orderBody, 'pick-border': pickBorderBody, choose: chooseBody, match: matchBody };

// an open map question that waits for an earlier one says which
function hintHtml({ i, owner }, text) {
    return `<p class="hint">${owner === i ? text : `Първо отговори на въпрос ${owner + 1}.`}</p>`;
}

function optionButton(k, label, record, isWaiting) {
    const mark = record?.value === k ? ` chosen ${record.isCorrect ? 'ok' : 'bad'}` : '';
    return `<button type="button" class="opt${mark}" data-act="pick" data-v="${k}"${off(Boolean(record) || isWaiting)}>${label}</button>`;
}

function leftButton(id, text, isSelected, isAnswered) {
    const paired = text ? `<small>${esc(text)}</small>` : '';
    return `<button type="button" class="pick${isSelected ? ' sel' : ''}" data-act="left" data-v="${esc(id)}"${off(isAnswered)}>${title(id)}${paired}</button>`;
}

const chipRow = (ids) => `<ol class="row">${ids.map((id) => `<li>${title(id)}</li>`).join('')}</ol>`;

function actsHtml(isIncomplete, extra) {
    return `<div class="acts">${extra}<button type="button" class="btn pri" data-act="submit"${off(isIncomplete)}>Провери</button></div>`;
}

/* ---------- feedback ---------- */
function feedbackHtml(q, { record, lessonId }) {
    if (!record) return '';
    const see = q.part ? ` <a href="#lesson/${esc(lessonId)}/${q.part}" data-act="see" data-v="${q.part}">Виж отново</a>` : '';
    if (record.isCorrect) return `<div class="fb ok">Точно така.${see}</div>`;
    return `<div class="fb bad">${esc(redSentence(q))}${see}
        <button type="button" class="btn" data-act="retry">Опитай пак</button></div>`;
}

const off = (isOff) => (isOff ? ' disabled' : '');
const title = (id) => esc(CONTENT.cards[id]?.title ?? id);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
