// today's Bulgaria for the map's "Граници днес" layer: the stretches of its border that follow nature
import { P, r1 } from './geo-core.mjs';

// a stretch of the border runs along a neighbour when it lies within this many degrees of the neighbour's own edge
const SHARED = .02;
// the stretches that follow nature, by the neighbour across them and where along the border they lie;
// a stretch with no neighbour across it is the Black Sea coast
const NATURE = {
    ROU: { kind: 'water', isAlong: ([lon]) => lon < 27.3 }, // the Danube, from the Timok's mouth to Silistra
    SRB: { kind: 'water', isAlong: ([, lat]) => lat > 44.08 }, // the lower Timok
    GRC: { kind: 'mountains', isAlong: ([lon]) => lon > 23.9 }, // the Rhodopes
    TUR: { kind: 'mountains', isAlong: ([lon]) => lon > 26.95 }, // Strandzha
};

// ring: today's Bulgaria as [lon, lat] points, the last one the same as the first; neighbours: { country code: its rings }.
// Answers the water and the mountain stretches as SVG paths in map units.
export function todayBorder(ring, neighbours) {
    const kinds = ring.slice(1).map((b, i) => kindOf(midpoint(ring[i], b), neighbours));
    return {
        water: pathOf(stretches(ring, kinds, 'water')),
        mountains: pathOf(stretches(ring, kinds, 'mountains')),
    };
}

function kindOf(point, neighbours) {
    const across = Object.keys(neighbours).find((code) => neighbours[code].some((edge) => isOn(point, edge)));
    if (!across) return 'water';
    const nature = NATURE[across];
    return nature?.isAlong(point) ? nature.kind : 'plain';
}

const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const isOn = (point, edge) => edge.some((b, i) => i > 0 && distanceToSegment(point, edge[i - 1], b) < SHARED);

function distanceToSegment(p, a, b) {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

// the runs of neighbouring segments of one kind, each run as its points
function stretches(ring, kinds, kind) {
    const runs = [];
    kinds.forEach((k, i) => {
        if (k !== kind) return;
        if (kinds[i - 1] === kind) runs.at(-1).push(ring[i + 1]);
        else runs.push([ring[i], ring[i + 1]]);
    });
    return runs;
}

const pathOf = (runs) => runs.map((run) => 'M' + run.map((p) => P(p).map(r1).join(' ')).join('L')).join('');
