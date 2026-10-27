import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../code/store.js';

const fakeStorage = (initial) => {
    const data = { ...initial };
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
};
const EMPTY = { passed: {}, cards: [], position: {}, pins: 'seal', today: false, bar: false, quest: {}, last: null, blur: { on: true, px: 1.5 } };

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

test('resetProgressKeepsOnlyTheMarkerLook', () => {
    const store = createStore(fakeStorage());
    store.setPins('banner');
    store.markPassed('l1');
    store.markCardOpened('troy');
    store.setPosition('l1', 3);
    store.resetProgress();
    assert.deepEqual(store.loadProgress(), { ...EMPTY, pins: 'banner' });
});

test('setTodayRemembersTheButton', () => {
    const store = createStore(fakeStorage());
    store.setToday(true);
    assert.equal(store.loadProgress().today, true);
});

test('resetProgressKeepsTodaysBorders', () => {
    const store = createStore(fakeStorage());
    store.setToday(true);
    store.markCardOpened('troy');
    store.resetProgress();
    assert.deepEqual(store.loadProgress(), { ...EMPTY, today: true });
});

test('setBarRemembersTheHeaderBar', () => {
    const store = createStore(fakeStorage());
    store.setBar(true);
    assert.equal(store.loadProgress().bar, true);
});

test('resetProgressKeepsTheHeaderBar', () => {
    const store = createStore(fakeStorage());
    store.setBar(true);
    store.markCardOpened('troy');
    store.resetProgress();
    assert.deepEqual(store.loadProgress(), { ...EMPTY, bar: true });
});

test('questStarsKeepTheBestAndGoWithTheProgress', () => {
    const store = createStore(fakeStorage());
    store.setQuestStars('l1', 2);
    store.setQuestStars('l1', 1);
    store.setQuestStars('boss-a', 3);
    assert.deepEqual(store.loadProgress().quest, { l1: 2, 'boss-a': 3 });
    store.resetProgress();
    assert.deepEqual(store.loadProgress().quest, {});
});

test('theLastLessonIsRememberedAndGoesWithTheProgress', () => {
    const store = createStore(fakeStorage());
    store.setLast('5-a');
    store.setLast('5-b');
    assert.equal(store.loadProgress().last, '5-b');
    store.resetProgress();
    assert.equal(store.loadProgress().last, null);
});

test('setBlurChangesOnlyWhatIsGivenAndStays', () => {
    const store = createStore(fakeStorage());
    store.setBlur({ px: 3 });
    store.setBlur({ on: false });
    assert.deepEqual(store.loadProgress().blur, { on: false, px: 3 });
    store.markCardOpened('troy');
    store.resetProgress();
    assert.deepEqual(store.loadProgress(), { ...EMPTY, blur: { on: false, px: 3 } });
});
