import fs from 'node:fs';
import path from 'node:path';
import pc from 'polygon-clipping';
import { chaikin, labelPoint, multiPath, r1 } from './geo-core.mjs';

// Chaikin smoothing passes. Tribes get 3, the same as tribal frames in build-geo.mjs (1 pass, then 2 more for every plain polygon).
const KINDS = { state: 2, tribes: 3 };
const GEOMETRIES = ['Polygon', 'MultiPolygon'];

export function loadBorders(dir) {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.geojson')).sort().map((file) => readBorder(dir, file));
}

export function borderToRealm(border, { land, BOX }) {
    const smooth = (ring) => chaikin(ring, KINDS[border.kind]);
    const smoothed = toMulti(border.geometry).map((poly) => poly.map(smooth));
    const shape = pc.intersection(pc.intersection(smoothed, BOX), land);
    const label = labelPoint(shape);
    if (!label) throw new Error(`border "${border.id}" lies outside the land on the map`);
    return { n: border.name, kind: border.kind, c: border.colour, d: multiPath(shape, 1.6), lx: r1(label.x), ly: r1(label.y), lr: r1(label.d) };
}

function readBorder(dir, file) {
    const feature = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const { name, kind, colour } = feature.properties ?? {};
    if (!name || !colour || !(kind in KINDS)) throw new Error(`${file}: properties need name, colour and kind (state or tribes)`);
    if (!GEOMETRIES.includes(feature.geometry?.type)) throw new Error(`${file}: geometry must be a Polygon or MultiPolygon`);
    return { id: path.basename(file, '.geojson'), name, kind, colour, geometry: feature.geometry };
}

function toMulti(geometry) {
    return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}
