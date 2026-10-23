// The map: static Balkans base, era frames, camera and the HTML overlay (cities, markers, path).
// Moved from the inline script of index.html; moved code keeps its original style.
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const P = (lon, lat) => [(lon - GEO.lon0) * GEO.cx * GEO.k, (GEO.lat1 - lat) * GEO.k];

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
};
export const icon = (k) => `<svg viewBox="0 0 24 24">${KIND[k].i}</svg>`;

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

/* ---------- realm frames ---------- */
const frames = GEO.frames;
const layers = new Map();
function buildFrame(i) {
  const f = frames[i];
  const gFill = el("g", { class: "layer", style: "opacity:0" });
  const gLab = el("g", { class: "layer", style: "opacity:0" });
  el("rect", { x: -3000, y: -3000, width: GEO.W + 6000, height: GEO.H + 6000, fill: PAPER }, gFill);
  f.realms.forEach((r, j) => {
    const col = COLORS[r.c] || "#999";
    const isBg = r.c === "bg" || r.c === "bg2";
    const g = el("g", {}, gFill);
    if (r.tribe) {
      el("path", { d: r.d, fill: col, "fill-opacity": r.over ? .12 : .2 }, g);
      el("path", { d: r.d, fill: "url(#hatch)", opacity: .35, style: `mix-blend-mode:multiply` }, g);
      el("path", { d: r.d, fill: "none", stroke: col, "stroke-width": 2, "stroke-dasharray": "2 6", "stroke-linecap": "round", "stroke-opacity": .9 }, g);
    } else {
      const id = `rc${i}_${j}`;
      el("path", { d: r.d }, el("clipPath", { id }, defs));
      el("path", { d: r.d, fill: mix(PAPER, col, isBg ? .42 : .26) }, g);
      el("path", { d: r.d, fill: "none", stroke: col, "stroke-width": isBg ? 16 : 11, "stroke-opacity": isBg ? .55 : .38, "clip-path": `url(#${id})` }, g);
      el("path", { d: r.d, fill: "none", stroke: isBg ? "#7a1e12" : "#5b4a33", "stroke-width": isBg ? 2.2 : 1.1, "stroke-opacity": isBg ? .9 : .55, "stroke-dasharray": isBg ? "" : "5 3" }, g);
    }
    if (r.n && r.lx != null) {
      const big = r.c === "bg" && !r.tribe;
      let fs = clamp(r.lr * (big ? .55 : .42), big ? 15 : 9, big ? 46 : 42);
      const name = big ? r.n.toUpperCase() : r.n;
      fs = Math.min(fs, (r.lr * 2.6) / Math.max(4, name.length * .55));
      fs = Math.max(fs, big ? 13 : 8);
      const t = el("text", { x: r.lx, y: r.ly, class: "rlab" + (big ? " bg" : ""), "font-size": fs.toFixed(1), "stroke-width": (fs / 5).toFixed(1), fill: shade(col, -.45) }, gLab);
      t.textContent = name;
    }
  });
  return { gFill, gLab };
}
const PAPER = "#f2e6c6";
function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = [16, 8, 0].map((sh) => Math.round(lerp((A >> sh) & 255, (B >> sh) & 255, t))); return `rgb(${c.join(",")})`; }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r * (1 + k)); g = Math.round(g * (1 + k)); b = Math.round(b * (1 + k)); return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`; }
let curFrame = -1;
// Each layer is opaque (it has its own paper base), so the new frame fades in on top of the old one,
// which stays fully visible underneath until the fade is over: no see-through dip between frames.
function showFrame(i) {
  if (i === curFrame) return;
  const prev = curFrame; curFrame = i;
  if (!layers.has(i)) layers.set(i, buildFrame(i));
  const L = layers.get(i);
  clearTimeout(L.t);
  realmsG.appendChild(L.gFill); frameG.appendChild(L.gLab);
  fade(L.gFill, 0, 1, 650); fade(L.gLab, 0, 1, 650);
  layers.forEach((o, k) => {
    if (k === i) return;
    clearTimeout(o.t);
    if (k !== prev) { o.gFill.remove(); o.gLab.remove(); return; }
    fade(o.gLab, null, 0, 450);
    o.t = setTimeout(() => { if (curFrame !== k) { o.gFill.remove(); o.gLab.remove(); } }, 700);
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
// it eases faster while the kid scrubs the timeline
let vb = { x: 0, y: 0, w: GEO.W, h: GEO.H }, vbT = null, freeRect = null, scrubbing = false;
function boxAt(y) {
  let i = 0; while (i < CAMERA.length - 1 && CAMERA[i + 1][0] <= y) i++;
  const a = CAMERA[i], b = CAMERA[Math.min(i + 1, CAMERA.length - 1)];
  const t = a === b ? 0 : ease(clamp((y - a[0]) / (b[0] - a[0]), 0, 1));
  return a[1].map((v, k) => lerp(v, b[1][k], t));
}
function targetVB(y) {
  const [w, s, e, n] = boxAt(y); const [x0, y0] = P(w, n), [x1, y1] = P(e, s);
  const fr = freeRect, bw = x1 - x0, bh = y1 - y0;
  const sc = Math.min(fr.w / bw, fr.h / bh);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { x: cx - (fr.x + fr.w / 2) / sc, y: cy - (fr.y + fr.h / 2) / sc, w: innerWidth / sc, h: innerHeight / sc };
}
function applyVB() {
  svg.setAttribute("viewBox", `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
  placeOverlay();
}
const toScreen = (lon, lat) => { const [x, y] = P(lon, lat), s = innerWidth / vb.w; return [(x - vb.x) * s, (y - vb.y) * s]; };
function followYear(y) {
    vbT = targetVB(y);
}
function snapToYear(y) {
    vb = targetVB(y);
    vbT = null;
    applyVB();
}
function tick() {
  if (vbT) {
    const k = scrubbing ? .2 : .12; let moving = false;
    for (const key of ["x", "y", "w", "h"]) { const d = vbT[key] - vb[key]; if (Math.abs(d) > .05) { vb[key] += d * k; moving = true; } else vb[key] = vbT[key]; }
    if (moving) applyVB(); else { applyVB(); vbT = null; }
  }
  requestAnimationFrame(tick);
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
    placeOverlay();
}
function setActiveMarker(id) {
    activeId = id;
    mkEls.forEach((b, mid) => b.classList.toggle('on', mid === id));
    const act = markers.find((m) => m.id === id);
    labEl.textContent = act ? act.title : ''; labEl.style.opacity = act && innerWidth > 760 ? 1 : 0;
    placeOverlay();
}
function mkFor(m) {
  if (mkEls.has(m.id)) return mkEls.get(m.id);
  const b = document.createElement("button"); b.className = "mk"; b.type = "button"; b.setAttribute("aria-label", m.title);
  b.innerHTML = icon(m.kind);
  if (m.photo) { b.classList.add("has-img"); b.style.backgroundImage = `url("${m.photo}")`; }
  b.addEventListener("click", (e) => { e.stopPropagation(); onMarkerClick(m); });
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  ov.appendChild(b); mkEls.set(m.id, b); b.classList.add("pop");
  return b;
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
    prebuildFrames,
    setFreeRect: (rect) => { freeRect = rect; },
    setScrubbing: (isScrubbing) => { scrubbing = isScrubbing; },
    followYear,
    snapToYear,
    toScreen,
    setCities,
    setMarkers,
    setActiveMarker,
    drawPath,
};
}
