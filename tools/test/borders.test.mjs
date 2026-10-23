import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pc from 'polygon-clipping';
import { loadBorders, borderToRealm } from '../lib/borders.mjs';
import { BOX, P } from '../lib/geo-core.mjs';

const GOOD = new URL('./fixtures/borders', import.meta.url).pathname;
const BAD = new URL('./fixtures/bad', import.meta.url).pathname;

test('loadsFeatureWithIdFromFileName', () => {
    const [border] = loadBorders(GOOD);
    assert.equal(border.id, 'tri');
    assert.equal(border.name, 'Триъгълник');
    assert.equal(border.kind, 'state');
});

test('rejectsMissingProperties', () => {
    assert.throws(() => loadBorders(BAD), /no-kind\.geojson/);
});

test('clipsToLandAndLabels', () => {
    const features = JSON.parse(fs.readFileSync('ne_50m_land.geojson', 'utf8')).features;
    const land = pc.intersection(features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)), BOX);
    const [border] = loadBorders(GOOD);
    const realm = borderToRealm(border, { land, BOX, P });
    assert.match(realm.d, /^M/);
    const xs = border.geometry.coordinates[0].map((c) => P(c)[0]);
    const ys = border.geometry.coordinates[0].map((c) => P(c)[1]);
    assert.ok(realm.lx >= Math.min(...xs) && realm.lx <= Math.max(...xs));
    assert.ok(realm.ly >= Math.min(...ys) && realm.ly <= Math.max(...ys));
});
