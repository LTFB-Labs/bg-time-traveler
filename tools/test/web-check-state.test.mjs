import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    answer,
    initialState,
    isPassed,
    matchIsCorrect,
    orderIsCorrect,
    redSentence,
    retry,
    shuffle,
    tapIsCorrect,
} from '../../js/check-state.js';

const KM_PER_DEGREE_LAT = 6371 * Math.PI / 180;
const kmNorthOf = ([lon, lat], km) => [lon, lat + km / KM_PER_DEGREE_LAT];

test('tapWithinToleranceIsCorrect', () => {
    const q = { type: 'tap', at: [25.33, 42.62], tolerance_km: 40 };
    assert.equal(tapIsCorrect(q, kmNorthOf(q.at, 30)), true);
    assert.equal(tapIsCorrect(q, kmNorthOf(q.at, 50)), false);
});

test('orderMustMatchExactly', () => {
    const q = { type: 'order', items: ['teres', 'sitalces', 'philip-ii', 'seuthes-iii'] };
    assert.equal(orderIsCorrect(q, ['teres', 'sitalces', 'philip-ii', 'seuthes-iii']), true);
    assert.equal(orderIsCorrect(q, ['sitalces', 'teres', 'philip-ii', 'seuthes-iii']), false);
    assert.equal(orderIsCorrect(q, ['teres', 'sitalces', 'philip-ii']), false);
});

test('passedOnlyWhenEveryQuestionGreenOnce', () => {
    const questions = [{ type: 'choose' }, { type: 'choose' }];
    let state = initialState(questions);
    state = answer(state, 0, true);
    assert.equal(isPassed(state, questions), false);
    state = answer(state, 1, false);
    assert.equal(isPassed(state, questions), false);
    state = retry(state, 1);
    state = answer(state, 1, true);
    assert.equal(isPassed(state, questions), true);
    state = answer(state, 0, false);
    assert.equal(isPassed(state, questions), true);
    assert.equal(state.answers[0].isCorrect, false);
});

test('shuffleIsDeterministicAndComplete', () => {
    const list = ['a', 'b', 'c', 'd'];
    // 100 seeds: a few of them land on the original order before the turn-by-one rule
    for (let seed = 0; seed < 100; seed++) {
        const once = shuffle(list, seed);
        assert.deepEqual(shuffle(list, seed), once);
        assert.deepEqual([...once].sort(), list);
        assert.notDeepEqual(once, list);
    }
    assert.deepEqual(list, ['a', 'b', 'c', 'd']);
});

test('matchNeedsEveryPairRight', () => {
    const q = { type: 'match', pairs: [['teres', 'основава царството'], ['sitalces', 'царството в разцвет']] };
    assert.equal(matchIsCorrect(q, { teres: 'основава царството', sitalces: 'царството в разцвет' }), true);
    assert.equal(matchIsCorrect(q, { teres: 'царството в разцвет', sitalces: 'основава царството' }), false);
    assert.equal(matchIsCorrect(q, { teres: 'основава царството' }), false);
});

test('redSentenceFallsBackByType', () => {
    assert.equal(redSentence({ type: 'tap', explain: 'Севтополис е на Тунджа.', part: 6 }), 'Севтополис е на Тунджа.');
    assert.equal(redSentence({ type: 'order' }), 'Погледни годините на линията на времето.');
    assert.equal(redSentence({ type: 'order', part: 2 }), 'Отговорът е в една от частите на урока.');
    assert.equal(redSentence({ type: 'choose', part: 1 }), 'Отговорът е в една от частите на урока.');
    assert.equal(redSentence({ type: 'choose' }), 'Виж отново частта.');
});
