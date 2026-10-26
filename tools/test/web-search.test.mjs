import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    findResults,
    normalize,
    parseYear,
} from '../../code/search.js';

const entry = (type, id, title, extra = {}) => ({ type, id, title, text: normalize(`${title} ${extra.body ?? ''}`), ...extra });
const SIMEON = entry('ruler', 'ruler-0', 'цар Симеон Велики', { date: '893–927', year: 893 });
const TARNOVO = entry('place', 'place-0-0', 'Търново', { date: '1185–1965', year: 1185, city: 0 });
const PRESLAV = entry('event', 'preslav', 'Преслав става столица', { date: '893 г.', year: 893 });
const AHELOY = entry('event', 'aheloy', 'Битката при Ахелой', { date: '917 г.', year: 917, body: 'Симеон разбива византийците.' });
const INDEX = [AHELOY, PRESLAV, SIMEON, TARNOVO];
const LESSON = { id: '5-odrisko-tsarstvo', number: 26, title: 'Древна Тракия. Царството на одрисите', span: [-1300, -250] };
const find = (query, index = INDEX) => findResults(query, { index, lessons: [LESSON], span: [600, 2026] });
const names = (groups) => groups.map((group) => group.name);
const ids = (groups, name) => groups.find((group) => group.name === name)?.items.map((item) => item.id);

test('parsesYearsTheWayChildrenWriteThem', () => {
    assert.equal(parseYear('893'), 893);
    assert.equal(parseYear(' 893 г. '), 893);
    assert.equal(parseYear('893г'), 893);
    assert.equal(parseYear('500 пр.Хр.'), -500);
    assert.equal(parseYear('500 г. пр. Хр.'), -500);
    assert.equal(parseYear('300 пр.н.е.'), -300);
    assert.equal(parseYear('Симеон'), null);
    assert.equal(parseYear('893 Симеон'), null);
});

test('findsRulerWhateverTheEnding', () => {
    assert.deepEqual(ids(find('Симеона'), 'Владетели'), ['ruler-0']);
});

test('findsWhileTyping', () => {
    assert.deepEqual(ids(find('Симе'), 'Владетели'), ['ruler-0']);
    assert.deepEqual(ids(find('търн'), 'Места'), ['place-0-0']);
});

test('titleMatchesComeFirst', () => {
    const story = entry('event', 'simeon-story', 'Цар Симеон', { year: 900 });
    assert.deepEqual(ids(find('Симеон', [AHELOY, story]), 'Събития'), ['simeon-story', 'aheloy']);
});

test('yearOffersGoingThereThenItsEvents', () => {
    const groups = find('893');
    assert.deepEqual(groups[0], { name: 'Година', items: [{ type: 'year', title: 'Иди в 893 г.', year: 893 }] });
    assert.deepEqual(ids(groups, 'Събития'), ['preslav']);
});

test('earlyYearOffersTheLessonThatHoldsIt', () => {
    const groups = find('500 пр.Хр.');
    assert.equal(names(groups).includes('Година'), false);
    assert.deepEqual(groups.find((group) => group.name === 'Уроци').items[0], {
        type: 'lesson', id: LESSON.id, title: 'Урок 26 · Древна Тракия. Царството на одрисите', date: '1300 — 250 г. пр.Хр.', lesson: LESSON.id,
    });
    assert.deepEqual(find('300'), []);
});

test('groupsComeInTheirOrder', () => {
    const groups = find('Симеон', [AHELOY, TARNOVO, entry('place', 'place-1-0', 'Симеоновград', { year: 1900 }), SIMEON]);
    assert.deepEqual(names(groups), ['Владетели', 'Места', 'Събития']);
});

test('oneLetterFindsNothing', () => {
    assert.deepEqual(find('С'), []);
    assert.deepEqual(find('  '), []);
});

test('capsEachGroupAtFive', () => {
    const many = Array.from({ length: 7 }, (_, i) => entry('ruler', `ruler-${i}`, `цар Иван ${i}`, { year: 1200 + i }));
    assert.equal(find('Иван', many)[0].items.length, 5);
});

test('readsTheWordGodina', () => {
    assert.equal(parseYear('893 година'), 893);
    assert.equal(parseYear('893 год.'), 893);
    assert.equal(parseYear('500 година пр.Хр.'), -500);
});
