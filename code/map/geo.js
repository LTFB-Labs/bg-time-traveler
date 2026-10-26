const EARTH_KM = 6371;
const rad = (deg) => deg * Math.PI / 180;

export function haversineKm([lon1, lat1], [lon2, lat2]) {
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

// Same arithmetic as the camera target in map.js: fit the projected box into the free rect, centre it, size the view to the pane.
export function boxToViewBox([west, south, east, north], pane, free, P) {
    const [x0, y0] = P(west, north);
    const [x1, y1] = P(east, south);
    const sc = Math.min(free.w / (x1 - x0), free.h / (y1 - y0));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    return { x: cx - (free.x + free.w / 2) / sc, y: cy - (free.y + free.h / 2) / sc, w: pane.w / sc, h: pane.h / sc };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

// The view never shows past the world's edge: it is no wider and no taller than the world, and it stays inside it.
export function clampViewBox(vb, { minW, maxW, world: { W, H } }) {
    const aspect = vb.h / vb.w;
    const w = clamp(vb.w, minW, Math.min(maxW, W, H / aspect));
    const h = w * aspect;
    return { x: clamp(vb.x, 0, W - w), y: clamp(vb.y, 0, H - h), w, h };
}

// The window view is wider than what the kid sees: the limits apply to the part of it inside the pane, a rect in window pixels.
export function clampViewInPane(vb, { pane, screenW, ...limits }) {
    const s = vb.w / screenW;
    const seen = clampViewBox({ x: vb.x + pane.x * s, y: vb.y + pane.y * s, w: pane.w * s, h: pane.h * s }, limits);
    const k = seen.w / pane.w;
    return { x: seen.x - pane.x * k, y: seen.y - pane.y * k, w: screenW * k, h: vb.h * k / s };
}

// the corners of an SVG path made of M, L and Z commands, as [x, y] pairs
export function pathPoints(d) {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    return numbers.flatMap((n, i) => (i % 2 ? [] : [[n, numbers[i + 1]]]));
}

// one spot on each outline for its letter: the corner farthest from every other outline and from the letters placed before,
// so a letter always sits on its own border, even where borders nest or share an edge
export function letterSpots(outlines) {
    const spots = [];
    outlines.forEach((points, i) => {
        const others = outlines.filter((_, k) => k !== i).flat().concat(spots);
        spots.push(farthestFrom(points, others));
    });
    return spots;
}

function farthestFrom(points, others) {
    const gaps = points.map((p) => Math.min(...others.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    return points[gaps.indexOf(Math.max(...gaps))];
}
