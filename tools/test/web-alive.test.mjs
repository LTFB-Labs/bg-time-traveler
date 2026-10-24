import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    standOf,
    visitedUpTo,
} from '../../js/alive.js';

const CARDS = {
    troy: { at: [26.2, 40.0] },
    odrysae: { at: [26.3, 42.2] },
    teres: { at: [26.3, 42.0] },
    idea: {},
};
const story = (meta) => ({ type: 'story', meta });
const LESSON = {
    parts: [
        { type: 'summary', meta: { marks: ['odrysae'] } },
        story({ marks: ['troy', 'odrysae'], stand: 'odrysae' }),
        story({ marks: ['idea', 'teres'] }),
        story({ marks: ['idea'] }),
        { type: 'check', meta: {} },
    ],
};

test('standOfPrefersTheCardTheStandNames', () => {
    assert.deepEqual(standOf(LESSON.parts[1], CARDS), [26.3, 42.2]);
});

test('standOfFallsBackToTheFirstMarkWithAPlace', () => {
    assert.deepEqual(standOf(LESSON.parts[2], CARDS), [26.3, 42.0]);
});

test('standOfIsNullWithoutAPlace', () => {
    assert.equal(standOf(LESSON.parts[3], CARDS), null);
});

test('visitedUpToKeepsStoryPartsWithAPlaceInOrder', () => {
    assert.deepEqual(visitedUpTo(LESSON, 0, CARDS), []);
    assert.deepEqual(visitedUpTo(LESSON, 4, CARDS), [[26.3, 42.2], [26.3, 42.0]]);
});
