import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hallCards } from '../../modules/lesson/lesson-list.js';

const READY = { id: '5-odrisko-tsarstvo', state: 'ready', title: 'Древна Тракия. Царството на одрисите', number: 26, span: [-1300, -250], map: 'balkans' };
const LESSON = {
    parts: [
        { type: 'summary', heading: 'Какво ще научим', meta: { lead: 'Кратко описание.', photo: 'panagyurishte' } },
        { type: 'story', heading: 'Кои са траките', meta: {} },
        { type: 'story', heading: 'Терес създава царството', meta: {} },
        { type: 'check', heading: 'Проверка', meta: {} },
    ],
};
const data = (over = {}) => ({ grades: { 5: [READY] }, lessons: { '5-odrisko-tsarstvo': LESSON }, photos: { panagyurishte: { f: 'p.jpg' } }, passed: {}, ...over });

test('readyLessonCardHasItsStoryChaptersLeadAndPhoto', () => {
    assert.deepEqual(hallCards(data()), [{
        number: 26,
        title: 'Древна Тракия. Царството на одрисите',
        date: '1300 — 250 г. пр.Хр.',
        lead: 'Кратко описание.',
        chapters: ['Кои са траките', 'Терес създава царството'],
        photo: 'p.jpg',
        href: '#lesson/5-odrisko-tsarstvo',
        isPassed: false,
    }]);
});

test('lessonWithoutPageIsSoon', () => {
    const [card] = hallCards(data({ lessons: {} }));
    assert.equal(card.href, null);
    assert.deepEqual(card.chapters, []);
});

test('passedLessonIsMarked', () => {
    assert.equal(hallCards(data({ passed: { '5-odrisko-tsarstvo': '2026-10-25T10:00:00.000Z' } }))[0].isPassed, true);
});

test('lessonsOfAllGradesFollowEachOther', () => {
    const other = { id: '6-x', title: 'Шести клас', number: 1, span: [600, 700] };
    assert.deepEqual(hallCards(data({ grades: { 6: [other], 5: [READY] } })).map((c) => c.number), [26, 1]);
});

test('mocksComeAfterTheRealLessonsAndDoNotOpen', () => {
    const mock = { number: 27, title: 'Римляните', span: [-250, 395], photo: 'panagyurishte', lead: 'Описание.', chapters: ['А'] };
    const cards = hallCards(data(), [mock]);
    assert.equal(cards.length, 2);
    assert.deepEqual(cards[1], { number: 27, title: 'Римляните', date: '250 г. пр.Хр. — 395 г. сл.Хр.', lead: 'Описание.', chapters: ['А'], photo: 'p.jpg', href: null, isPassed: false });
});
