import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listRows } from '../../js/lesson-list.js';

const READY = { id: '5-odrisko-tsarstvo', state: 'ready', title: 'Древна Тракия. Царството на одрисите', number: 26, span: [-1300, -250], map: 'balkans' };
const lessons = { '5-odrisko-tsarstvo': {} };

test('readyLessonOpensAndShowsItsYears', () => {
    assert.deepEqual(listRows([READY], { lessons, passed: {} }), [
        { number: 26, title: 'Древна Тракия. Царството на одрисите', date: '1300 — 250 г. пр.Хр.', href: '#lesson/5-odrisko-tsarstvo', isPassed: false },
    ]);
});

test('lessonWithoutFileIsSoon', () => {
    assert.deepEqual(listRows([{ number: 1, title: 'Какво е история' }], { lessons, passed: {} }), [
        { number: 1, title: 'Какво е история', date: '', href: null, isPassed: false },
    ]);
});

test('lessonWithoutPageIsSoon', () => {
    assert.equal(listRows([READY], { lessons: {}, passed: {} })[0].href, null);
});

test('passedLessonGetsTheRing', () => {
    assert.equal(listRows([READY], { lessons, passed: { '5-odrisko-tsarstvo': '2026-10-25T10:00:00.000Z' } })[0].isPassed, true);
});
