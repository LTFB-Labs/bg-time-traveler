import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxToViewBox, clampViewBox, haversineKm } from '../../js/geo.js';

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
    assert.deepEqual([far.x, far.y], [2500 - 500, -250]);
    const wide = clampViewBox({ x: 0, y: 0, w: 5000, h: 2500 }, limits);
    assert.deepEqual([wide.w, wide.h], [1000, 500]);
});
