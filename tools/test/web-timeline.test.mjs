import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    bandLayout,
    bigLayout,
    eraAt,
    stopScale,
    yearMarks,
} from '../../code/timeline/timeline.js';

const ERAS = [
    [-1300, -480, 'Тракийски племена', 'tribes'],
    [-480, -341, 'Одриско царство', 'main'],
    [-341, -320, 'Македония', 'other'],
    [-320, -250, 'Севт III и наследниците му', 'main2'],
];
const BIG = [-1300, 2026];
const SPAN = [-1300, -250];
// the Thrace lesson's story parts; 720 years lie between the first two
const STOPS = [
    { year: -1200, approx: true },
    { year: -480, approx: true },
    { year: -431 },
    { year: -380, approx: true },
    { year: -341 },
    { year: -320, approx: true },
    { year: -300, approx: true },
];
const linear = (year) => ((year - SPAN[0]) / (SPAN[1] - SPAN[0])) * 100;

const assertNear = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('bandLayoutWeighsErasByTheirShareOfTheStrip', () => {
    const bands = bandLayout(ERAS, linear);
    [820, 139, 21, 70].forEach((years, i) => assertNear(bands[i].weight, years / 1050));
    assert.deepEqual(bands.map((b) => b.color), ['#b07a3c', '#c8402f', '#5f84b5', '#d98c6a']);
});

test('bandLayoutHidesLabelUnderTenPercent', () => {
    assert.deepEqual(bandLayout(ERAS, linear).map((b) => b.hideLabel), [false, false, true, true]);
});

test('stopScaleGivesEveryStopTheSameRoomAndALongGapTwice', () => {
    const at = stopScale(STOPS.map((s) => s.year), SPAN);
    const unit = 88 / 7;
    assertNear(at(-1200), 6);
    assertNear(at(-480) - at(-1200), 2 * unit);
    assertNear(at(-431) - at(-480), unit);
    assertNear(at(-300), 94);
});

test('stopScaleStretchesTheYearsBetweenStops', () => {
    const at = stopScale(STOPS.map((s) => s.year), SPAN);
    assert.equal(at(SPAN[0]), 0);
    assert.equal(at(SPAN[1]), 100);
    assertNear(at(-400), at(-431) + (at(-380) - at(-431)) * (31 / 51));
});

test('stopScaleCentresALoneStop', () => {
    assert.equal(stopScale([-480], SPAN)(-480), 50);
});

test('yearMarksShortenYearsAndNameALongGap', () => {
    const marks = yearMarks(STOPS, SPAN, stopScale(STOPS.map((s) => s.year), SPAN));
    assert.deepEqual(marks.slice(0, 4).map((m) => m.text), ['ок. 1200', '← 720 години →', 'ок. 480', '431']);
    assert.equal(marks.filter((m) => m.isGap).length, 1);
});

test('yearMarksNameTheEraWhenTheSpanCrossesChrist', () => {
    const stops = [{ year: -50 }, { year: 40 }];
    assert.deepEqual(yearMarks(stops, [-100, 100], (y) => y).map((m) => m.text), ['50 г. пр.Хр.', '40 г. сл.Хр.']);
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
