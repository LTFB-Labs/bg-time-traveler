import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    nextLesson,
    replayBorders,
} from '../../modules/lesson/recap.js';

const story = (...borders) => ({ type: 'story', meta: { borders } });
const isState = (id) => id.startsWith('s');

test('replayBordersKeepsMainBordersInOrderWithoutRepeats', () => {
    const lesson = { parts: [{ type: 'summary', meta: { borders: ['s0'] } }, story('t1', 's1'), story('s1'), story('x'), story('s2', 's1'), { type: 'check', meta: {} }] };
    assert.deepEqual(replayBorders(lesson, isState), ['s1', 's2']);
});

test('replayBordersIsEmptyWithoutStateBorders', () => {
    assert.deepEqual(replayBorders({ parts: [story('t1'), story()] }, isState), []);
});

test('nextLessonIsTheReadyEntryAfterThisOne', () => {
    const lesson = { id: 'a', grade: 5 };
    assert.equal(nextLesson({ 5: [{ id: 'a', state: 'ready' }] }, lesson), undefined);
    assert.equal(nextLesson({ 5: [{ id: 'a', state: 'ready' }, { id: 'b', state: 'soon' }] }, lesson), undefined);
    assert.equal(nextLesson({ 5: [{ id: 'a', state: 'ready' }, { id: 'b', state: 'ready' }] }, lesson).id, 'b');
    assert.equal(nextLesson({}, lesson), undefined);
});
