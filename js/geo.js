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

export function clampViewBox(vb, { minW, maxW, world: { W, H } }) {
    const w = clamp(vb.w, minW, maxW);
    const h = vb.h * w / vb.w;
    return { x: clamp(vb.x, -W * 0.25, W * 1.25 - w), y: clamp(vb.y, -H * 0.25, H * 1.25 - h), w, h };
}
