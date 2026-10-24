import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../js/store.js';

const fakeStorage = (initial) => {
    const data = { ...initial };
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
};
const EMPTY = { passed: {}, cards: [], position: {}, pins: 'seal' };

test('loadsDefaultsWhenEmpty', () => {
    assert.deepEqual(createStore(fakeStorage()).loadProgress(), EMPTY);
});

test('loadsDefaultsWhenCorrupt', () => {
    assert.deepEqual(createStore(fakeStorage({ bgtt: '{not json' })).loadProgress(), EMPTY);
});

test('markCardOpenedDeduplicates', () => {
    const store = createStore(fakeStorage());
    store.markCardOpened('troy');
    store.markCardOpened('troy');
    store.markCardOpened('thracians');
    assert.deepEqual(store.loadProgress().cards, ['troy', 'thracians']);
});

test('markPassedWritesDate', () => {
    const store = createStore(fakeStorage());
    store.markPassed('l1');
    assert.match(store.loadProgress().passed.l1, /^\d{4}-\d{2}-\d{2}/);
});

test('setPositionPerLesson', () => {
    const store = createStore(fakeStorage());
    store.setPosition('a', 2);
    store.setPosition('b', 5);
    assert.deepEqual(store.loadProgress().position, { a: 2, b: 5 });
});

test('setPinsKeepsTheChosenLook', () => {
    const store = createStore(fakeStorage());
    store.setPins('banner');
    assert.equal(store.loadProgress().pins, 'banner');
});
