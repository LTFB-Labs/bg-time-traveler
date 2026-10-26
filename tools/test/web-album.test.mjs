import { test } from 'node:test';
import assert from 'node:assert/strict';
import { albumGroups } from '../../modules/album/album.js';

const part = (marks, html = '', factHtml = '') => ({ meta: { marks }, html, factHtml });
const LESSON = {
    id: '5-test',
    number: 26,
    title: 'Древна Тракия',
    parts: [part(['teres'], '<b class="term" data-card="sitalces">Ситалк</b>'), part(['teres', 'kabyle'], '', '<b data-card="orpheus">Орфей</b>')],
};
const groups = (opened) => albumGroups({ lessons: [LESSON], opened });

test('groupsLessonCardsInLessonOrder', () => {
    assert.deepEqual(groups(['kabyle', 'teres'])[0], {
        name: 'Урок 26 · Древна Тракия',
        ids: ['teres', 'kabyle'],
        count: '2 от 4 картички от този урок',
        empty: 'Отвори картичка в урока и тя ще дойде тук.',
    });
});

test('ignoresOpenedCardsOutsideTheGroups', () => {
    const [lesson] = groups(['athens', 'old-id', 'orpheus']);
    assert.deepEqual(lesson.ids, ['orpheus']);
});

test('emptyAlbumKeepsEveryGroup', () => {
    assert.deepEqual(groups([]).map((g) => g.count), ['0 от 4 картички от този урок']);
});
