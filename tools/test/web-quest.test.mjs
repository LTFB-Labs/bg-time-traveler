import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fightQuestions, questStops, starsFor } from '../../apps/quest/quest-path.js';

const question = (n) => ({ q: `q${n}`, answer: `a${n}`, wrong: [`w${n}`, `x${n}`], quote: `a${n}.` });
const LESSON = { id: '5-l', parts: [{ type: 'summary', meta: { marks: ['teres'], photo: 'p1' } }, { type: 'story', meta: { marks: ['troy'] }, html: '' }] };
const DATA = {
    sections: [
        { id: 'one', title: 'Едно', photo: 'p1', color: '#111111', grade: 5, lessons: [26, 27] },
        { id: 'two', title: 'Две', photo: 'p1', color: '#222222', grade: 5, lessons: [28] },
    ],
    lessons: { '5-l': LESSON },
    grades: { 5: [{ id: '5-l', number: 26, title: 'Траките' }] },
    cards: { teres: { title: 'Терес', questions: [question(1), question(2)] }, troy: { title: 'Троя', questions: [question(3)] } },
    photos: { p1: { f: 'p1.jpg' } },
};
const MOCKS = [{ grade: 5, number: 27, title: 'Римляните', photo: 'p1' }, { grade: 5, number: 28, title: 'Славяни', photo: 'p1' }];
const stops = (stars) => questStops({ ...DATA, stars }, MOCKS);

test('putsEachSectionsLessonsThenItsBoss', () => {
    assert.deepEqual(stops({}).map((s) => s.id), ['5-l', '5-27', 'boss-one', '5-28', 'boss-two']);
    assert.deepEqual(stops({})[0].questions.map((q) => [q.q, q.cardTitle]), [['q1', 'Терес'], ['q2', 'Терес'], ['q3', 'Троя']]);
    assert.equal(stops({})[1].title, 'Римляните');
});

test('aBossAsksEverySectionSoFar', () => {
    const all = stops({});
    assert.equal(all[2].questions.length, 3);
    assert.equal(all[4].questions.length, 3);
});

test('onlyTheFirstUnwonStopIsOpenAndTheFogStartsTwoAfterIt', () => {
    assert.deepEqual(stops({}).map((s) => [s.state, s.isFog]), [['open', false], ['locked', false], ['locked', true], ['locked', true], ['locked', true]]);
    assert.deepEqual(stops({ '5-l': 2 }).map((s) => [s.state, s.isFog]), [['won', false], ['soon', false], ['locked', false], ['locked', true], ['locked', true]]);
});

test('starsFallWithEachMistakeAndTheThirdLoses', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(starsFor), [3, 2, 1, 0, 0]);
});

test('aFightShufflesAndABossAsksTen', () => {
    const many = { kind: 'boss', questions: Array.from({ length: 14 }, (_, i) => question(i)) };
    assert.equal(fightQuestions(many).length, 10);
    const one = fightQuestions({ kind: 'lesson', questions: [question(1)] })[0];
    assert.deepEqual([...one.choices].sort(), ['a1', 'w1', 'x1']);
});
