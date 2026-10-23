// The map: static Balkans base, era frames, camera and the HTML overlay (cities, markers, path).
// Moved from the inline script of index.html; moved code keeps its original style.
import {
    boxToViewBox,
    clampViewInPane,
} from './geo.js';

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const P = (lon, lat) => [(lon - GEO.lon0) * GEO.cx * GEO.k, (GEO.lat1 - lat) * GEO.k];
// the inverse of P: map units back to [lon, lat]
const unP = (x, y) => [x / (GEO.cx * GEO.k) + GEO.lon0, GEO.lat1 - y / GEO.k];

const COLORS = {
  bg: "#c8402f", bg2: "#e3825a", byz: "#8a5fb0", steppe: "#c6a54c", steppe2: "#a98a5a", slav: "#6f9a45",
  west: "#5f84b5", west2: "#86a3c6", arab: "#c9a07a", serb: "#c7822f", serb2: "#a59660", croat: "#6c96b8",
  hun: "#5f9f78", rus: "#8ea25d", turk: "#3e8a6a", turk2: "#7aa88f", latin: "#4d6fa8", latin2: "#7f97c4",
  greek: "#a183c4", greece: "#4ea5cf", venice: "#b25c74", wal: "#d6b13c", wal2: "#c99a4c", aus: "#9a93b8",
  alb: "#b8737b", mkd: "#e2a35a", ita: "#77a873",
};
export const KIND = {
  person: { n: "Личност", i: '<path d="M4 18h16l1-10-5 4-4-7-4 7-5-4z" fill="currentColor"/><rect x="4" y="19" width="16" height="2" rx="1" fill="currentColor"/>' },
  building: { n: "Сграда", i: '<path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>' },
  battle: { n: "Битка", i: '<path d="M4 4l10 10M14 14l-2 4 4-2M20 4L10 14M10 14l2 4-4-2M4 20l3-3M20 20l-3-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' },
  event: { n: "Събитие", i: '<path d="M6 3h10l3 3v15H6z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M9 10h7M9 14h7M9 18h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' },
  pin: { n: "Място", i: '<circle cx="12" cy="12" r="6" fill="currentColor"/>' },
};
export const icon = (k) => `<svg viewBox="0 0 24 24">${KIND[k].i}</svg>`;
// lesson cards have their own kinds; free-mode events use the KIND keys directly
const CARD_ICON = { person: 'person', people: 'person', place: 'building', state: 'building', object: 'event', event: 'event', idea: 'event' };
// the icon of a card kind; map kinds that are not card kinds pass through
export const cardIcon = (kind) => icon(CARD_ICON[kind] ?? kind);
// the check's border choices: the letters on the map and on the answer buttons, and their colours
export const CHOICE_LETTERS = ['А', 'Б', 'В'];
export const CHOICE_COLOURS = ['#4d6fa8', '#8a5fb0', '#c7822f'];

export function createMap(svg, ov) {
/* ---------- static map ---------- */
const defs = el("defs", {}, svg);
el("path", { d: GEO.land }, el("clipPath", { id: "landClip" }, defs));
const hatch = el("pattern", { id: "hatch", width: 9, height: 9, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" }, defs);
el("line", { x1: 0, y1: 0, x2: 0, y2: 9, stroke: "#000", "stroke-width": 3.2, "stroke-opacity": .5 }, hatch);
const arrow = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 6, refY: 5, markerWidth: 4.2, markerHeight: 4.2, orient: "auto-start-reverse" }, defs);
el("path", { d: "M0 0L10 5L0 10z", fill: "#7a1e12" }, arrow);

const world = el("g", {}, svg);
el("rect", { x: -3000, y: -3000, width: GEO.W + 6000, height: GEO.H + 6000, fill: "#c9d5c6" }, world);
const ripple = el("g", { fill: "none", "stroke-linejoin": "round" }, world);
[[26, .06], [16, .1], [8, .16]].forEach(([w, o]) => el("path", { d: GEO.land, stroke: "#5f8378", "stroke-width": w, "stroke-opacity": o }, ripple));
el("path", { d: GEO.land, fill: "#f2e6c6" }, world);
const realmsG = el("g", { "clip-path": "url(#landClip)" }, world);
el("path", { d: GEO.lakes, fill: "#c9d5c6", stroke: "#6f8f86", "stroke-width": .8 }, world);
el("path", { d: GEO.rivers, fill: "none", stroke: "#5c8fa3", "stroke-width": 1.5, "stroke-opacity": .85, "stroke-linecap": "round", "stroke-linejoin": "round" }, world);
el("path", { d: GEO.land, fill: "none", stroke: "#5b4a33", "stroke-width": 1.1, "stroke-opacity": .8 }, world);

// mountains: little humps along each range
const mtG = el("g", { fill: "none", stroke: "#7a6142", "stroke-width": 1.4, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: .65 }, world);
MOUNTAINS.forEach((m) => {
  const pts = m.p.map((c) => P(c[0], c[1]));
  let acc = 0, d = "";
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], len = Math.hypot(x1 - x0, y1 - y0);
    for (let t = (10 - acc) / len; t <= 1; t += 13 / len) {
      const x = lerp(x0, x1, t), y = lerp(y0, y1, t), s = 5 + ((i * 7 + t * 13) % 3);
      d += `M${(x - s).toFixed(1)} ${(y + s * .45).toFixed(1)}Q${(x - s * .3).toFixed(1)} ${(y - s * 1.1).toFixed(1)} ${x.toFixed(1)} ${(y - s * .9).toFixed(1)}Q${(x + s * .4).toFixed(1)} ${(y - s * .4).toFixed(1)} ${(x + s).toFixed(1)} ${(y + s * .45).toFixed(1)}`;
    }
    acc = 0;
  }
  el("path", { d }, mtG);
});
const labelsStatic = el("g", {}, world);
SEAS.forEach((s) => { const [x, y] = P(s.at[0], s.at[1]); el("text", { x, y, class: "sea-lab", "font-size": s.s, transform: s.r ? `rotate(${s.r} ${x} ${y})` : "" }, labelsStatic).textContent = s.n; });
const mtLabG = el("g", {}, world);
[["Стара планина", 25.3, 42.95, 13], ["Родопи", 24.8, 41.45, 12], ["Карпати", 24.3, 45.75, 14], ["Динарски планини", 17.3, 43.85, 12], ["Пинд", 21.6, 39.55, 11]].forEach(([n, lon, lat, s]) => {
  const [x, y] = P(lon, lat); el("text", { x, y, class: "mt-lab", "font-size": s }, mtLabG).textContent = n;
});
const frameG = el("g", {}, world);
const migG = el("g", {}, world);

/* ---------- realm frames and lesson borders ---------- */
const frames = GEO.frames;
const layers = new Map();
let clipSeq = 0;
function buildFrame(i) {
    const L = newLayer();
    frames[i].realms.forEach((r) => {
        const col = COLORS[r.c] || '#999';
        if (r.tribe) drawTribe(L.gFill, r.d, col, r.over ? .12 : .2);
        else drawState(L.gFill, r.d, col, r.c === 'bg' || r.c === 'bg2');
        drawRealmLabel(L.gLab, r, col, r.c === 'bg' && !r.tribe);
    });
    return L;
}
// lesson mode: the borders of GEO.borders by id, the first state among them is the main one;
// the ghost is an earlier border drawn as a faint dashed outline, so growth and loss are visible
function buildBorders(ids, ghostId) {
    const L = newLayer();
    const mainId = ids.find((id) => GEO.borders[id].kind === 'state');
    ids.forEach((id) => {
        const b = GEO.borders[id];
        if (b.kind === 'tribes') drawTribe(L.gFill, b.d, b.c, .2);
        else drawState(L.gFill, b.d, b.c, id === mainId);
        drawRealmLabel(L.gLab, b, b.c, id === mainId);
    });
    if (ghostId) drawGhost(L, GEO.borders[ghostId]);
    return L;
}
const LETTER_R = 17;
// all fills first, then all outlines, so a larger border never hides a smaller one's edge
function buildChoices(ids) {
    const L = newLayer();
    const borders = ids.map((id) => GEO.borders[id]);
    borders.forEach((b, i) => el('path', { d: b.d, fill: CHOICE_COLOURS[i], 'fill-opacity': .14 }, L.gFill));
    borders.forEach((b, i) => el('path', { d: b.d, fill: 'none', stroke: CHOICE_COLOURS[i], 'stroke-width': 3, 'stroke-linejoin': 'round' }, L.gFill));
    letterSpots(borders).forEach(([x, y], i) => drawLetter(L.gLab, x, y, i));
    return L;
}
// label points of nested borders sit close together: a letter that would touch an earlier one moves down until it is clear
function letterSpots(borders) {
    const spots = [];
    borders.forEach((b) => {
        let y = b.ly;
        while (spots.some(([x, sy]) => Math.hypot(x - b.lx, sy - y) < LETTER_R * 2.4)) y += LETTER_R;
        spots.push([b.lx, y]);
    });
    return spots;
}
function drawLetter(gLab, x, y, i) {
    el('circle', { cx: x, cy: y, r: LETTER_R, fill: CHOICE_COLOURS[i], stroke: PAPER, 'stroke-width': 3 }, gLab);
    el('text', { x, y, class: 'choice-lab', 'font-size': LETTER_R * 1.25 }, gLab).textContent = CHOICE_LETTERS[i];
}
// a layer is opaque: it has its own paper base
function newLayer() {
    const gFill = el('g', { class: 'layer', style: 'opacity:0' });
    const gLab = el('g', { class: 'layer', style: 'opacity:0' });
    el('rect', { x: -3000, y: -3000, width: GEO.W + 6000, height: GEO.H + 6000, fill: PAPER }, gFill);
    return { gFill, gLab };
}
function drawTribe(gFill, d, col, fillOpacity) {
    const g = el('g', {}, gFill);
    el('path', { d, fill: col, 'fill-opacity': fillOpacity }, g);
    el('path', { d, fill: 'url(#hatch)', opacity: .35, style: 'mix-blend-mode:multiply' }, g);
    el('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', 'stroke-opacity': .9 }, g);
}
// a state: paper tinted with its colour, a glow inside the edge (clipped to the shape) and an outline
function drawState(gFill, d, col, isMain) {
    const g = el('g', {}, gFill);
    const clipId = `rc${clipSeq++}`;
    el('path', { d }, el('clipPath', { id: clipId }, defs));
    el('path', { d, fill: mix(PAPER, col, isMain ? .42 : .26) }, g);
    el('path', { d, fill: 'none', stroke: col, 'stroke-width': isMain ? 16 : 11, 'stroke-opacity': isMain ? .55 : .38, 'clip-path': `url(#${clipId})` }, g);
    const outline = isMain ? '#7a1e12' : '#5b4a33';
    el('path', { d, fill: 'none', stroke: outline, 'stroke-width': isMain ? 2.2 : 1.1, 'stroke-opacity': isMain ? .9 : .55, 'stroke-dasharray': isMain ? '' : '5 3' }, g);
}
function drawRealmLabel(gLab, r, col, isBig) {
    if (!r.n || r.lx == null) return;
    const name = isBig ? r.n.toUpperCase() : r.n;
    const fs = labelSize(r.lr, name, isBig);
    const t = el('text', { x: r.lx, y: r.ly, class: 'rlab' + (isBig ? ' bg' : ''), 'font-size': fs.toFixed(1), 'stroke-width': (fs / 5).toFixed(1), fill: shade(col, -.45) }, gLab);
    t.textContent = name;
}
// grows with the realm's label radius, then shrinks so a long name still fits inside
function labelSize(lr, name, isBig) {
    const fs = clamp(lr * (isBig ? .55 : .42), isBig ? 15 : 9, isBig ? 46 : 42);
    return Math.max(Math.min(fs, (lr * 2.6) / Math.max(4, name.length * .55)), isBig ? 13 : 8);
}
function drawGhost(L, b) {
    el('path', { d: b.d, fill: 'none', stroke: '#5b4a33', 'stroke-width': 2, 'stroke-dasharray': '8 6', opacity: .55 }, L.gFill);
    const t = el('text', { x: b.lx, y: b.ly + 22, class: 'rlab', 'font-size': GHOST_FONT, 'stroke-width': GHOST_FONT / 5, fill: '#6e5536', opacity: .8 }, L.gLab);
    t.textContent = `${b.n} преди`;
}
const GHOST_FONT = 16;
const PAPER = "#f2e6c6";
function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = [16, 8, 0].map((sh) => Math.round(lerp((A >> sh) & 255, (B >> sh) & 255, t))); return `rgb(${c.join(",")})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r * (1 + k)); g = Math.round(g * (1 + k)); b = Math.round(b * (1 + k)); return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`; }
let curLayer = -1;
// Each layer is opaque (it has its own paper base), so the new layer fades in on top of the old one,
// which stays fully visible underneath until the fade is over: no see-through dip between frames.
function showFrame(i) {
    showLayer(i, () => buildFrame(i));
}
function showBorders(ids, ghostId) {
    assertKnownBorders('showBorders', ids.concat(ghostId || []));
    showLayer(`${ids.join(' ')}|${ghostId ?? ''}`, () => buildBorders(ids, ghostId));
}
// the check: the borders to choose from, drawn alike, each in its own colour with its letter at its label point
function showChoices(ids) {
    assertKnownBorders('showChoices', ids);
    showLayer(`choices|${ids.join(' ')}`, () => buildChoices(ids));
}
function assertKnownBorders(caller, ids) {
    const unknown = ids.filter((id) => !Object.hasOwn(GEO.borders, id));
    if (unknown.length) throw new Error(`${caller}: unknown border id ${unknown.join(', ')}`);
}
function showLayer(key, build) {
    if (key === curLayer) return;
    const prev = curLayer; curLayer = key;
    if (!layers.has(key)) layers.set(key, build());
    const L = layers.get(key);
    clearTimeout(L.t);
    realmsG.appendChild(L.gFill); frameG.appendChild(L.gLab);
    fade(L.gFill, 0, 1, 650); fade(L.gLab, 0, 1, 650);
    layers.forEach((o, k) => {
        if (k === key) return;
        clearTimeout(o.t);
        if (k !== prev) { o.gFill.remove(); o.gLab.remove(); return; }
        fade(o.gLab, null, 0, 450);
        o.t = setTimeout(() => { if (curLayer !== k) { o.gFill.remove(); o.gLab.remove(); } }, 700);
    });
}
// Web Animations start on the next frame no matter how busy the page is; a CSS transition on a just-inserted
// element can be skipped or start late while the slider tween keeps the main thread busy.
function fade(node, from, to, ms) {
  const cur = from == null ? +getComputedStyle(node).opacity : from;
  if (node._fade) node._fade.cancel();
  node.style.opacity = to;
  node._fade = node.animate([{ opacity: cur }, { opacity: to }], { duration: ms, easing: "ease-out" });
}

// build every frame's layer ahead of time while the page is idle, so crossing a border change never stalls
function prebuildFrames() {
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 10 }), 60));
  let n = 0;
  const step = (d) => { while (n < frames.length && (d.timeRemaining() > 3 || n === 0)) { if (!layers.has(n)) layers.set(n, buildFrame(n)); n++; if (d.timeRemaining() <= 3) break; } if (n < frames.length) idle(step); };
  idle(step);
}

/* ---------- camera ---------- */
// free mode: the camera follows the CAMERA keyframes for a year and fits them into the free rect;
// it eases faster while the kid scrubs the timeline.
// lesson mode: flyTo fits a box instead and keeps it as home; from then on the year no longer moves the camera.
let vb = { x: 0, y: 0, w: GEO.W, h: GEO.H }, vbT = null, freeRect = null, scrubbing = false, home = null, flyRate = 1, onUserMoveCb = () => {};
function boxAt(y) {
  let i = 0; while (i < CAMERA.length - 1 && CAMERA[i + 1][0] <= y) i++;
  const a = CAMERA[i], b = CAMERA[Math.min(i + 1, CAMERA.length - 1)];
  const t = a === b ? 0 : ease(clamp((y - a[0]) / (b[0] - a[0]), 0, 1));
  return a[1].map((v, k) => lerp(v, b[1][k], t));
}
const targetVB = (y) => fitBox(boxAt(y));
const fitBox = (box) => boxToViewBox(box, { w: innerWidth, h: innerHeight }, freeRect, P);
function applyVB() {
  svg.setAttribute("viewBox", `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
  placeOverlay();
}
const toScreen = (lon, lat) => { const [x, y] = P(lon, lat), s = innerWidth / vb.w; return [(x - vb.x) * s, (y - vb.y) * s]; };
// a window point back through the current viewBox to [lon, lat]
function toLonLat(sx, sy) {
    const s = vb.w / innerWidth;
    return unP(vb.x + sx * s, vb.y + sy * s);
}
function followYear(y) {
    if (home) return;
    vbT = targetVB(y);
}
function flyTo(box, { ms = 900 } = {}) {
    home = box;
    flyRate = rateFor(ms);
    vbT = fitBox(box);
    onUserMoveCb(false);
}
// ponytail: per-frame easing like free mode, so ms holds at 60 frames a second; time-based steps if other refresh rates matter
const rateFor = (ms) => ms > 0 ? 1 - Math.pow(.01, (1000 / 60) / ms) : 1;
// whoever owns the resize handler only sets the new rect; a lesson camera re-fits its home box to it,
// which also drops a hand move: its view no longer matches the window's shape
function setFreeRect(rect) {
    freeRect = rect;
    resetCamera();
}
// back to the last box given to flyTo; the free camera has none
function resetCamera() {
    if (home) flyTo(home);
}
function snapToYear(y) {
    if (home) return;
    vb = targetVB(y);
    vbT = null;
    applyVB();
}
function tick() {
  if (vbT) {
    const k = home ? flyRate : scrubbing ? .2 : .12; let moving = false;
    for (const key of ["x", "y", "w", "h"]) { const d = vbT[key] - vb[key]; if (Math.abs(d) > .05) { vb[key] += d * k; moving = true; } else vb[key] = vbT[key]; }
    if (moving) applyVB(); else { applyVB(); vbT = null; }
  }
  requestAnimationFrame(tick);
}

/* ---------- pan and zoom by hand ---------- */
// lesson mode: one pointer drags the map, two pinch it, the wheel zooms about the cursor.
// free mode: the wheel scrubs the year (free.js) unless the corner toggle turned wheelZoom on or a trackpad pinch sends ctrlKey,
// and only two pointers move the map. Markers sit in the overlay, so a press on one never reaches the svg.
// The limits measure what the kid sees, the free rect, not the whole window behind the reading pane.
// The projection scales longitude by GEO.cx, so a map unit is 111 / GEO.k km both ways and 50 km is 50 / 111 * GEO.k units.
const LIMITS = { minW: 50 / 111 * GEO.k, maxW: GEO.W, world: GEO };
const SLOP = 6; // pixels a press may move and still count as a tap
const WHEEL_STEP = [.002, .05, 1]; // zoom per wheel unit for deltaMode pixel, line, page (the d3-zoom values)
const TRACKPAD_PINCH = 10; // a trackpad pinch sends small deltas with ctrlKey
let mode = 'free', wheelZoom = false, dragged = false;
const pointers = new Map();
const zoomsOnWheel = (e) => mode === 'lesson' || wheelZoom || e.ctrlKey;
const movesWithPointers = () => mode === 'lesson' || pointers.size > 1;
svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged = pointers.size > 1;
});
svg.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (!dragged && Math.hypot(e.clientX - p.x, e.clientY - p.y) < SLOP) return;
    dragged = true;
    const before = spread();
    Object.assign(p, { x: e.clientX, y: e.clientY });
    const after = spread();
    if (movesWithPointers()) moveByHand(zoomed(panned(vb, after.x - before.x, after.y - before.y), before.d / after.d, after.x, after.y));
});
const lift = (e) => pointers.delete(e.pointerId);
svg.addEventListener('pointerup', lift);
svg.addEventListener('pointercancel', lift);
// a drag is not a tap: click listeners on the map only hear presses that stayed put
svg.addEventListener('click', (e) => { if (dragged) e.stopImmediatePropagation(); }, true);
// the check's map question hears taps on the map as [lon, lat]; marker buttons sit in the overlay, so a tap on one never gets here
let onMapClickCb = null;
svg.addEventListener('click', (e) => onMapClickCb?.(toLonLat(e.clientX, e.clientY)));
// the overlay too: a wheel over a marker button zooms like one over the map
[svg, ov].forEach((target) => target.addEventListener('wheel', (e) => {
    if (!zoomsOnWheel(e)) return;
    e.preventDefault();
    moveByHand(zoomed(vb, wheelFactor(e), e.clientX, e.clientY));
}, { passive: false }));
// the midpoint of the first two pointers and their distance; a single pointer gets distance 1, so it never scales
function spread() {
    const [a, b = a] = pointers.values();
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}
// the free rect, or the whole window before any mode has set one
const paneRect = () => freeRect ?? { x: 0, y: 0, w: innerWidth, h: innerHeight };
const wheelFactor = (e) => 2 ** (e.deltaY * WHEEL_STEP[e.deltaMode] * (e.ctrlKey ? TRACKPAD_PINCH : 1));
// the view shifted by a screen offset, so the map follows the finger
function panned(v, dx, dy) {
    const s = v.w / innerWidth;
    return { ...v, x: v.x - dx * s, y: v.y - dy * s };
}
// the view scaled by f about a screen point, which keeps the map point under it; the width limits apply here so the point holds at a limit
function zoomed(v, f, sx, sy) {
    const s = v.w / innerWidth;
    const seenW = paneRect().w * s;
    const k = clamp(seenW * f, LIMITS.minW, LIMITS.maxW) / seenW;
    return { x: v.x + sx * s * (1 - k), y: v.y + sy * s * (1 - k), w: v.w * k, h: v.h * k };
}
// a hand move replaces the view and drops the tween's target, so nothing pulls the view back
function moveByHand(next) {
    vb = clampViewInPane(next, { pane: paneRect(), screenW: innerWidth, ...LIMITS });
    vbT = null;
    applyVB();
    onUserMoveCb(true);
}

/* ---------- overlay: cities + markers ---------- */
let cityList = [], cityEls = [], cityYear = 0;
const mkEls = new Map();
let labEl = document.createElement("div"); labEl.className = "mk-lab"; labEl.style.opacity = 0; ov.appendChild(labEl);
let markers = [], activeId = null, onMarkerClick = null;
function setCities(list, year) {
    if (list !== cityList) buildCities(list);
    cityYear = year;
    placeOverlay();
}
function buildCities(list) {
    cityEls.forEach((d) => d.remove());
    cityList = list;
    cityEls = list.map((c) => { const d = document.createElement("div"); d.className = "city"; d.innerHTML = "<i></i><span></span>"; return d; });
    ov.prepend(...cityEls);
}
// list items { id, at, kind, title, photo?, opacity? }, already in drawing order
function setMarkers(list, onClick) {
    onMarkerClick = onClick;
    const ids = new Set(list.map((m) => m.id));
    mkEls.forEach((b, id) => { if (!ids.has(id)) { b.remove(); mkEls.delete(id); } });
    markers = list;
    list.forEach((m) => { mkFor(m).style.opacity = m.opacity ?? 1; });
    setActiveMarker(ids.has(activeId) ? activeId : null);
}
function setActiveMarker(id) {
    activeId = id;
    mkEls.forEach((b, mid) => b.classList.toggle('on', mid === id));
    const act = markers.find((m) => m.id === id);
    labEl.textContent = act ? act.title : ''; labEl.style.opacity = act && innerWidth > 760 ? 1 : 0;
    placeOverlay();
}
function mkFor(m) {
    const b = mkEls.get(m.id) ?? newMarkerButton(m.id);
    paintMarker(b, m);
    return b;
}
function newMarkerButton(id) {
  const b = document.createElement("button"); b.className = "mk"; b.type = "button";
  b.addEventListener("click", (e) => { e.stopPropagation(); onMarkerClick(markers.find((m) => m.id === id)); });
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  ov.appendChild(b); mkEls.set(id, b); b.classList.add("pop");
  return b;
}
// a later list may reuse an id with a new title, kind, photo or tone; repaint only when one of them changed
// tone: 'ok' or 'bad' colours a pin of the check green or red
function paintMarker(b, m) {
    const look = [m.title, m.kind, m.photo, m.tone].join('|');
    if (b._look === look) return;
    b._look = look;
    b.dataset.tone = m.tone ?? '';
    b.setAttribute('aria-label', m.title);
    b.innerHTML = cardIcon(m.kind);
    b.classList.toggle('has-img', Boolean(m.photo));
    b.style.backgroundImage = m.photo ? `url("${m.photo}")` : '';
}
function placeOverlay() {
  const y = cityYear;
  cityList.forEach((c, i) => {
    const d = cityEls[i], nm = c.n.find((r) => y >= r[0] && y < r[1]);
    if (!nm) { d.style.display = "none"; return; }
    const isCap = (c.cap || []).some((r) => y >= r[0] && y < r[1]);
    d.style.display = ""; d.className = "city" + (isCap ? " cap" : "");
    d.firstChild.textContent = isCap ? "♛" : "";
    d.lastChild.textContent = nm[2];
    const [x, sy] = toScreen(c.at[0], c.at[1]); d.style.left = x + "px"; d.style.top = sy + "px";
  });
  // markers with simple de-overlap: nudge later ones around earlier ones at the same spot
  const placed = [];
  markers.forEach((m) => {
    const b = mkFor(m); let [x, sy] = toScreen(m.at[0], m.at[1]);
    for (let k = 0; k < 8; k++) { const hit = placed.find((p) => Math.hypot(p[0] - x, p[1] - sy) < 40); if (!hit) break; const a = (k * 2.2) + .6; x = hit[0] + Math.cos(a) * 44; sy = hit[1] + Math.sin(a) * 44; }
    placed.push([x, sy]); b.style.left = x + "px"; b.style.top = sy + "px";
    if (m.id === activeId) { labEl.style.left = x + "px"; labEl.style.top = sy + "px"; }
  });
}
function drawPath(points) {
  migG.innerHTML = "";
  if (!points) return;
  const pts = points.map((c) => P(c[0], c[1]));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; d += `Q${x0 + (x1 - x0) * .5 + (y1 - y0) * .12} ${y0 + (y1 - y0) * .5 - (x1 - x0) * .12} ${x1} ${y1}`; }
  el("path", { d, class: "mig", "stroke-width": 5, "marker-end": "url(#arrow)" }, migG);
}

/* ---------- paper grain ---------- */
(function grain() {
  const c = document.createElement("canvas"); c.width = c.height = 300; const x = c.getContext("2d"), im = x.createImageData(300, 300);
  for (let i = 0; i < im.data.length; i += 4) { const v = 200 + Math.random() * 55; im.data[i] = v; im.data[i + 1] = v * .96; im.data[i + 2] = v * .88; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0); document.getElementById("grain").style.backgroundImage = `url(${c.toDataURL()})`;
})();

requestAnimationFrame(tick);
return {
    P,
    showFrame,
    showBorders,
    showChoices,
    prebuildFrames,
    setFreeRect,
    setScrubbing: (isScrubbing) => { scrubbing = isScrubbing; },
    followYear,
    snapToYear,
    flyTo,
    toScreen,
    setCities,
    setMarkers,
    setActiveMarker,
    drawPath,
    setMode: (m) => { mode = m; },
    setWheelZoom: (isOn) => { wheelZoom = isOn; },
    zoomsOnWheel,
    onUserMove: (cb) => { onUserMoveCb = cb; },
    onMapClick: (cb) => { onMapClickCb = cb; },
    resetCamera,
};
}
