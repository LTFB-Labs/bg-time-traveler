import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxToViewBox, clampViewBox, clampViewInPane, haversineKm, letterSpots, pathPoints } from '../../js/geo.js';

const P = (lon, lat) => [lon * 10, (50 - lat) * 10];

test('haversineKnownDistance', () => {
    const km = haversineKm([23.32, 42.7], [24.75, 42.15]);
    assert.ok(Math.abs(km - 133) <= 3, `got ${km}`);
});

test('boxToViewBoxFitsAndCentres', () => {
    const pane = { w: 1000, h: 500 };
    const free = { x: 0, y: 0, w: 600, h: 500 };
    const vb = boxToViewBox([10, 40, 20, 50], pane, free, P);
    const sc = pane.w / vb.w;
    assert.equal(vb.w, 1000 / 5);
    assert.equal(vb.h, 500 / 5);
    assert.equal((150 - vb.x) * sc, 300);
    assert.equal((50 - vb.y) * sc, 250);
});

test('clampViewBoxLimits', () => {
    const limits = { minW: 100, maxW: 1000, world: { W: 2000, H: 1000 } };
    const small = clampViewBox({ x: 0, y: 0, w: 50, h: 25 }, limits);
    assert.deepEqual([small.w, small.h], [100, 50]);
    const far = clampViewBox({ x: 9000, y: -9000, w: 500, h: 250 }, limits);
    assert.deepEqual([far.x, far.y], [1.25 * (2000 - 500), -(1000 - 250) / 4]);
    const wide = clampViewBox({ x: 0, y: 0, w: 5000, h: 2500 }, limits);
    assert.deepEqual([wide.w, wide.h], [1000, 500]);
});

test('clampViewBoxShowsTheWholeWorldWhenFullyOut', () => {
    const limits = { minW: 100, maxW: 2000, world: { W: 2000, H: 1000 } };
    const out = clampViewBox({ x: 300, y: -900, w: 2000, h: 1800 }, limits);
    assert.equal(out.x, 0);
    assert.equal(out.y, (1000 - 1800) / 2);
});

// a phone: the window is 390 x 844 but the map pane is a short strip at its top
const phone = { screenW: 390, pane: { x: 24, y: 24, w: 342, h: 200 } };
const paneLimits = { minW: 10, maxW: 400, world: { W: 400, H: 300 } };
const paneWidth = (vb) => vb.w * phone.pane.w / phone.screenW;

test('clampViewInPaneKeepsAHomeView', () => {
    const home = boxToViewBox([15, 35, 25, 45], { w: 390, h: 844 }, phone.pane, P);
    const clamped = clampViewInPane(home, { ...phone, ...paneLimits });
    for (const k of ['x', 'y', 'w', 'h']) assert.ok(Math.abs(clamped[k] - home[k]) < 1e-9, `${k}: ${clamped[k]} vs ${home[k]}`);
});

test('clampViewInPaneMeasuresWidthInThePane', () => {
    const close = clampViewInPane({ x: 100, y: 50, w: 5, h: 10.8 }, { ...phone, ...paneLimits });
    assert.ok(Math.abs(paneWidth(close) - 10) < 1e-9, `got ${paneWidth(close)}`);
    assert.ok(Math.abs(close.h / close.w - 10.8 / 5) < 1e-9);
    const far = clampViewInPane({ x: 0, y: 0, w: 2000, h: 4328 }, { ...phone, ...paneLimits });
    assert.ok(Math.abs(paneWidth(far) - 400) < 1e-9, `got ${paneWidth(far)}`);
});

test('pathPointsReadsCorners', () => {
    assert.deepEqual(pathPoints('M1 2L3.5 4L-5 6ZM7 8L9 10Z'), [[1, 2], [3.5, 4], [-5, 6], [7, 8], [9, 10]]);
});

test('letterSpotsSitOnOwnOutlineAwayFromOthers', () => {
    // a small square nested in the corner of a big one, sharing two of its edges
    const outer = [[0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50]];
    const inner = [[0, 0], [20, 0], [40, 0], [40, 20], [40, 40], [20, 40], [0, 40], [0, 20]];
    assert.deepEqual(letterSpots([outer, inner]), [[100, 100], [40, 40]]);
});
