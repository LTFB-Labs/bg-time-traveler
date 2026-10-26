import { test } from 'node:test';
import assert from 'node:assert/strict';
import { albumGroups } from '../../js/album.js';

const part = (marks, html = '', factHtml = '') => ({ meta: { marks }, html, factHtml });
const LESSON = {
    id: '5-test',
    number: 26,
    title: 'Древна Тракия',
    parts: [part(['teres'], '<b class="term" data-card="sitalces">Ситалк</b>'), part(['teres', 'kabyle'], '', '<b data-card="orpheus">Орфей</b>')],
};
const EVENTS = [{ id: 'asparuh' }, { id: 'krum' }, { id: 'simeon' }];
const groups = (opened) => albumGroups({ lessons: [LESSON], events: EVENTS, opened });

test('groupsLessonCardsInLessonOrder', () => {
    assert.deepEqual(groups(['kabyle', 'teres'])[0], {
        name: 'Урок 26 · Древна Тракия',
        ids: ['teres', 'kabyle'],
        count: '2 от 4 картички от този урок',
        empty: 'Отвори картичка в урока и тя ще дойде тук.',
    });
});

test('countsFreeMapEventsInTheirOrder', () => {
    assert.deepEqual(groups(['simeon', 'asparuh'])[1], {
        name: 'Свободната карта',
        ids: ['asparuh', 'simeon'],
        count: '2 от 3 събития от картата',
        empty: 'Спри годината на събитие на картата и то ще дойде тук.',
    });
});

test('ignoresOpenedCardsOutsideTheGroups', () => {
    const [lesson, events] = groups(['athens', 'old-id', 'orpheus']);
    assert.deepEqual(lesson.ids, ['orpheus']);
    assert.deepEqual(events.ids, []);
});

test('emptyAlbumKeepsEveryGroup', () => {
    assert.deepEqual(groups([]).map((g) => g.count), ['0 от 4 картички от този урок', '0 от 3 събития от картата']);
});
