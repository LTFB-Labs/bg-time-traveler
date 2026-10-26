// shared projection and path helpers for build-geo.mjs and lib/borders.mjs
export const LON0 = 6, LON1 = 48, LAT0 = 31, LAT1 = 53, K = 100, CX = Math.cos((42 * Math.PI) / 180);
export const W = Math.round((LON1 - LON0) * CX * K), H = Math.round((LAT1 - LAT0) * K);
export const P = ([lon, lat]) => [(lon - LON0) * CX * K, (LAT1 - lat) * K];
export const BOX = [[[[LON0 - 0.6, LAT0 - 0.6], [LON1 + 0.6, LAT0 - 0.6], [LON1 + 0.6, LAT1 + 0.6], [LON0 - 0.6, LAT1 + 0.6], [LON0 - 0.6, LAT0 - 0.6]]]];
export const close = (ring) => { const r = ring.slice(); const a = r[0], b = r[r.length - 1]; if (a[0] !== b[0] || a[1] !== b[1]) r.push(a); return r; };
export const r1 = (v) => Math.round(v * 10) / 10;
export function ringPath(ring, minStep = 0.8) {
  const pts = []; let last = null;
  for (const c of ring) { const p = P(c); if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < minStep) continue; pts.push(p); last = p; }
  if (pts.length < 3) return "";
  return "M" + pts.map((p) => r1(p[0]) + " " + r1(p[1])).join("L") + "Z";
}
export const multiPath = (m, s) => m.map((poly) => poly.map((r) => ringPath(r, s)).join("")).join("");
export function area(m) { let A = 0; for (const poly of m) poly.forEach((r, i) => { let a = 0; for (let j = 0; j < r.length - 1; j++) { const [x1, y1] = P(r[j]), [x2, y2] = P(r[j + 1]); a += x1 * y2 - x2 * y1; } A += (i ? -1 : 1) * Math.abs(a / 2); }); return A; }

// label point: grid search for the point farthest from the edge (in px) inside the land-clipped shape
export function labelPoint(m) {
  let best = null; const polys = m.map((poly) => poly.map((r) => r.map(P)));
  const segs = polys.flatMap((poly) => poly.flatMap((r) => r.slice(1).map((p, i) => [r[i], p])));
  const inside = (x, y) => polys.some((poly) => poly.reduce((acc, r, i) => { let c = false; for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xa, ya] = r[a], [xb, yb] = r[b]; if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c; } return i === 0 ? c : acc && !c; }, false));
  const dseg = (x, y, [[ax, ay], [bx, by]]) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((x - ax) * dx + (y - ay) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - ax - t * dx, y - ay - t * dy); };
  let [x0, y0, x1, y1] = [1e9, 1e9, -1e9, -1e9]; for (const [[ax, ay]] of segs) { x0 = Math.min(x0, ax); y0 = Math.min(y0, ay); x1 = Math.max(x1, ax); y1 = Math.max(y1, ay); }
  x0 = Math.max(x0, 0); y0 = Math.max(y0, 0); x1 = Math.min(x1, W); y1 = Math.min(y1, H);
  const step = Math.max(6, Math.min(x1 - x0, y1 - y0) / 40);
  for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
    if (!inside(x, y)) continue; let d = 1e9; for (const s of segs) d = Math.min(d, dseg(x, y, s));
    const score = d * Math.min(1, (1.6 * d) / 40); if (!best || score > best.s) best = { x, y, d, s: score };
  }
  return best;
}

export function chaikin(ring, n) { let r = close(ring); for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < r.length - 1; i++) { const [a, b] = [r[i], r[i + 1]]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } r = close(o); } return r; }
