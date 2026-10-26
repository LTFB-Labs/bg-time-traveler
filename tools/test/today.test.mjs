import test from 'node:test';
import assert from 'node:assert/strict';
import { P, r1 } from '../lib/geo-core.mjs';
import { todayBorder } from '../lib/today.mjs';

const path = (...pts) => 'M' + pts.map((p) => P(p).map(r1).join(' ')).join('L');
const square = (...ring) => [[...ring, ring[0]]];

// a made-up Bulgaria with one stretch of each kind: the Danube and a land border to the north, the coast, Strandzha and
// the Rhodopes to the south, a land border to the west
const A = [23, 44], B = [27, 44], C = [28, 44], D = [28, 42], E = [26, 41.5], F = [23, 42];
const NEIGHBOURS = {
    ROU: square(A, C, [28, 45], [23, 45]),
    TUR: square(D, E, [26, 40], [28, 40]),
    GRC: square(E, F, [23, 40], [26, 40]),
    SRB: square(F, A, [21, 44], [21, 42]),
};

test('todayBorderFollowsNature', () => {
    const today = todayBorder([A, B, C, D, E, F, A], NEIGHBOURS);
    assert.equal(today.water, path(A, B) + path(C, D));
    assert.equal(today.mountains, path(D, E, F));
});
