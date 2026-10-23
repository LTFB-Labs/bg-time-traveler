import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    bandLayout,
    bigLayout,
    eraAt,
    tickYears,
} from '../../js/timeline.js';

const ERAS = [
    [-1300, -480, 'Тракийски племена', 'tribes'],
    [-480, -341, 'Одриско царство', 'main'],
    [-341, -320, 'Македония', 'other'],
    [-320, -250, 'Севт III и наследниците му', 'main2'],
];
const BIG = [-1300, 2026];

const assertNear = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('bandLayoutWeighsErasByLength', () => {
    const bands = bandLayout(ERAS, [-1300, -250]);
    [820, 139, 21, 70].forEach((years, i) => assertNear(bands[i].weight, years / 1050));
    assert.deepEqual(bands.map((b) => b.color), ['#b07a3c', '#c8402f', '#5f84b5', '#d98c6a']);
});

test('bandLayoutHidesLabelUnderTenPercent', () => {
    assert.deepEqual(bandLayout(ERAS, [-1300, -250]).map((b) => b.hideLabel), [false, false, true, true]);
});

test('tickYearsEvery200YearsInsideSpan', () => {
    assert.deepEqual(tickYears([-1300, -250]), [-1200, -1000, -800, -600, -400]);
});

test('bigLayoutFramesLessonSpan', () => {
    const frame = bigLayout([-1300, -250], BIG);
    assert.equal(frame.left, 0);
    assertNear(frame.width, (1050 / 3326) * 100);
});

test('bigLayoutFramesSpanInsideBig', () => {
    const frame = bigLayout([681, 1018], BIG);
    assertNear(frame.left, (1981 / 3326) * 100);
    assertNear(frame.width, (337 / 3326) * 100);
});

test('bigLayoutClampsEarlierSpanToLeftEdge', () => {
    const frame = bigLayout([-1400000, -3000], BIG);
    assert.equal(frame.left, 0);
    assert.ok(frame.width > 0);
});

test('eraAtFindsEraHoldingYear', () => {
    assert.equal(eraAt(ERAS, -431), 'Одриско царство');
    assert.equal(eraAt(ERAS, -480), 'Одриско царство');
});

test('eraAtNoneOutsideAllEras', () => {
    assert.equal(eraAt(ERAS, -2000), undefined);
    assert.equal(eraAt(ERAS, -100), undefined);
});

test('eraAtLastEraHoldsItsEndYear', () => {
    assert.equal(eraAt(ERAS, -250), 'Севт III и наследниците му');
});
