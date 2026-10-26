// The Quest's made-up land: mountain ranges, rivers, lakes, forests and hills in ink, like an old hand-drawn map, and the fog
// clouds over the road ahead. A fixed seed draws the same land every time; nothing stands on the road, on a stop or on a
// section's card. Node imports this module, so it builds strings only.

// a small seeded random: the same seed gives the same land
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const r1 = (n) => Math.round(n * 10) / 10;

// the road as the same curve quest.js draws: from the left edge through every stop to the right edge
export function roadPoints(stops, height, width) {
    const points = [[0, Math.round(height * 0.72)], ...stops.map((s) => [s.x, s.y]), [width, Math.round(height * 0.7)]];
    const samples = [];
    for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const mid = (x0 + x1) / 2;
        for (let t = 0; t <= 1; t += 0.05) {
            const u = 1 - t;
            samples.push([u ** 3 * x0 + 3 * u * u * t * mid + 3 * u * t * t * mid + t ** 3 * x1, u ** 3 * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t ** 3 * y1]);
        }
    }
    return { points, samples };
}

// stops: the placed stops ({ x, y }); keepOut: rects { x0, y0, x1, y1 } to leave empty (the section cards)
export function terrainSvg({ width, height, stops, keepOut, seed = 26 }) {
    const rand = seeded(seed);
    const between = (a, b) => a + rand() * (b - a);
    const { points, samples } = roadPoints(stops, height, width);
    const busy = [
        ...keepOut,
        // a stop, its picture and stars above it and its ribbon to the right
        ...stops.map((s) => ({ x0: s.x - 60, y0: s.y - 215, x1: s.x + 240, y1: s.y + 24 })),
    ];
    const isFree = (x, y, r) => y - r > 8 && y + r < height - 8 && x - r > 8 && x + r < width - 8
        && samples.every(([px, py]) => (px - x) ** 2 + (py - y) ** 2 > (r + 30) ** 2)
        && busy.every((b) => x + r < b.x0 || x - r > b.x1 || y + r < b.y0 || y - r > b.y1);
    const spot = (r, tries = 30) => {
        for (let i = 0; i < tries; i++) {
            const x = between(0, width);
            const y = between(0, height);
            if (isFree(x, y, r)) return [x, y];
        }
        return null;
    };

    const water = [];
    const land = [];
    // rivers: from the top edge down to the bottom, in the gaps between stops, crossing under the road but never under a stop
    for (let i = 1; i < points.length - 1; i += 3) {
        const left = points[i][0] + 45;
        const right = points[i + 1][0] - 45;
        let x = (left + right) / 2;
        const path = [[x, 0]];
        for (let y = 40; y < height + 40; y += 40) {
            x = Math.min(right, Math.max(left, x + between(-28, 28)));
            path.push([x, Math.min(y, height)]);
        }
        water.push(`<path class="river" d="${smooth(path)}"/>`);
    }
    // lakes: round, uneven blobs
    for (let n = Math.max(2, Math.round(width / 700)); n > 0; n--) {
        const r = between(22, 42);
        const at = spot(r + 6);
        if (!at) continue;
        const ring = Array.from({ length: 11 }, (_, k) => {
            const a = (k / 11) * Math.PI * 2;
            const d = r * between(0.72, 1.18);
            return [at[0] + Math.cos(a) * d * 1.4, at[1] + Math.sin(a) * d * 0.8];
        });
        water.push(`<path class="lake" d="${smooth(ring, true)}"/>`);
    }
    // mountain ranges: a row of peaks along a short line, drawn back to front, the right slopes hatched
    for (let n = Math.round(width / 170); n > 0; n--) {
        const at = spot(26);
        if (!at) continue;
        const angle = between(-0.5, 0.5);
        const peaks = [];
        let [x, y] = at;
        for (let k = Math.round(between(4, 10)); k > 0; k--) {
            const w = between(10, 20);
            const h = w * between(1.1, 1.6);
            if (isFree(x, y - h / 2, w)) peaks.push({ x, y, w, h });
            x += w * between(1.1, 1.5);
            y += Math.sin(angle) * w + between(-5, 5);
        }
        peaks.sort((a, b) => a.y - b.y).forEach(({ x, y, w, h }) => land.push(mountain(x, y, w, h, between)));
    }
    // forests: clusters of firs and round trees
    for (let n = Math.round(width / 150); n > 0; n--) {
        const at = spot(20);
        if (!at) continue;
        const trees = [];
        const radius = between(26, 58);
        for (let k = Math.round(between(12, 32)); k > 0; k--) {
            const x = at[0] + between(-radius, radius) * 1.3;
            const y = at[1] + between(-radius, radius) * 0.6;
            if (isFree(x, y - 6, 6)) trees.push([x, y]);
        }
        const isFir = rand() < 0.5;
        trees.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => land.push(isFir ? fir(x, y) : tree(x, y)));
    }
    // hills: small ink bumps scattered over the open land
    for (let n = Math.round(width / 50); n > 0; n--) {
        const at = spot(12, 8);
        if (!at) continue;
        const [x, y] = at;
        const w = between(8, 14);
        land.push(`<path class="hill" d="M${r1(x - w)} ${r1(y)}q${r1(w)} ${r1(-w * 0.9)} ${r1(w * 2)} 0M${r1(x - w * 0.3)} ${r1(y - w * 0.25)}l${r1(w * 0.25)} ${r1(w * 0.2)}"/>`);
    }
    return `<g class="water">${water.join('')}</g><g class="landmarks">${land.join('')}</g>`;
}

function mountain(x, y, w, h, between) {
    const top = [x + between(-2, 2), y - h];
    const hatch = Array.from({ length: 3 }, (_, k) => {
        const t = (k + 1) / 4;
        return `M${r1(top[0] + w * t * 0.9)} ${r1(top[1] + h * t * 0.9)}l${r1(-w * 0.18)} ${r1(h * 0.28)}`;
    }).join('');
    return `<path class="peak" d="M${r1(x - w)} ${r1(y)}L${r1(top[0])} ${r1(top[1])}L${r1(x + w)} ${r1(y)}"/><path class="hatch" d="${hatch}"/>`;
}

const fir = (x, y) => `<path class="fir" d="M${r1(x)} ${r1(y - 13)}l4.5 9.5h-9zM${r1(x)} ${r1(y - 3.5)}v3.5"/>`;
const tree = (x, y) => `<circle class="crown" cx="${r1(x)}" cy="${r1(y - 7)}" r="4.6"/><path class="trunk" d="M${r1(x)} ${r1(y - 2.4)}v2.4"/>`;

// a soft line through the points: each corner is rounded through the middle of its two sides
function smooth(pts, isClosed = false) {
    const all = isClosed ? [...pts, pts[0], pts[1]] : pts;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = isClosed ? mid(all[0], all[1]) : all[0];
    let d = `M${r1(start[0])} ${r1(start[1])}`;
    for (let i = 1; i < all.length - 1; i++) {
        const m = mid(all[i], all[i + 1]);
        d += `Q${r1(all[i][0])} ${r1(all[i][1])} ${r1(m[0])} ${r1(m[1])}`;
    }
    if (!isClosed) d += `L${r1(all.at(-1)[0])} ${r1(all.at(-1)[1])}`;
    return `${d}${isClosed ? 'Z' : ''}`;
}

// the fog over the road ahead: soft clouds of different sizes, their front edge ragged, thicker the further they lie
export function fogClouds({ from, width, height, seed = 9 }) {
    const rand = seeded(seed);
    const between = (a, b) => a + rand() * (b - a);
    const clouds = [];
    for (let x = from - 120; x < width; x += 95) {
        const depth = Math.min(1, (x - from + 120) / 500);
        for (let y = -80; y < height + 60; y += between(80, 140)) {
            const size = between(220, 360);
            const left = x + (x < from + 120 ? between(-60, 90) : between(-40, 40));
            clouds.push(`<i style="left:${Math.round(left - size / 2)}px;top:${Math.round(y - size / 2)}px;width:${Math.round(size * 1.3)}px;height:${Math.round(size)}px;opacity:${(0.35 + 0.35 * depth + between(0, 0.15)).toFixed(2)}"></i>`);
        }
    }
    return clouds.join('');
}
