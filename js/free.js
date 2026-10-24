// The free timeline: HUD, card, timeline track, play, keyboard, wheel scrub, intro and boot.
// Moved from the inline script of index.html; moved code keeps its original style.
import {
    KIND,
    clamp,
    ease,
    icon,
    lerp,
} from './map.js';

export function startFree(map) {
const $ = (id) => document.getElementById(id);
const PH = typeof PHOTOS !== "undefined" ? PHOTOS : {};
const yInt = (y) => Math.floor(y + 1e-6);
const EV = EVENTS.slice().sort((a, b) => a.y - b.y);
const frames = GEO.frames;
const frameAt = (y) => { let i = 0; for (let k = 0; k < frames.length; k++) if (frames[k].y <= y + 1e-6) i = k; return i; };

/* ---------- camera: the map area left free by the card and the timeline ---------- */
function freeRect() {
  const W = innerWidth, H = innerHeight, tl = $("tl").offsetHeight, mobile = W <= 760;
  if (mobile) { const ch = $("card").offsetHeight; return { x: 8, y: 110, w: W - 16, h: Math.max(120, H - tl - ch - 120) }; }
  const cw = $("card").offsetWidth + 32;
  return { x: 16, y: 120, w: Math.max(200, W - cw - 24), h: Math.max(200, H - tl - 130) };
}
function aimCamera() {
    map.setFreeRect(freeRect());
    map.followYear(state.year);
}

/* ---------- markers ---------- */
let activeEv = null;
const SPAN = (ev) => ev.y < 1400 ? 70 : ev.y < 1850 ? 60 : ev.y < 1950 ? 14 : 12;
function updateMarkers() {
  const y = state.year;
  const vis = EV.filter((e) => e.y <= y + 1e-6 && y - e.y <= SPAN(e));
  const act = [...EV].reverse().find((e) => e.y <= y + 1e-6 && y - e.y <= SPAN(e)) || null;
  vis.sort((a, b) => (a === act) - (b === act)); // active last → on top
  map.setMarkers(vis.map((e) => { const age = (y - e.y) / SPAN(e); return toMarker(e, e === act ? 1 : (1 - age * .55).toFixed(2)); }), onMarkerClick);
  map.setActiveMarker(act ? act.id : null);
  if (act !== activeEv) { activeEv = act; renderCard(); map.drawPath(act ? act.path : null, act?.move); }
}
const toMarker = (e, opacity) => ({ id: e.id, at: e.at, kind: e.kind, title: e.t, photo: PH[e.id]?.f, opacity });
const onMarkerClick = (m) => { stopPlay(); goTo(EV.find((e) => e.id === m.id).y, 900); };

/* ---------- card ---------- */
const card = $("card");
const nextAfter = (y) => EV.find((e) => e.y > y + 1e-6);
const prevBefore = (y) => [...EV].reverse().find((e) => e.y < y - 1e-6);
const eraAt = (y) => ERAS.find((e) => y >= e.a && y < e.b) || ERAS[ERAS.length - 1];
function renderCard() {
  const ph = card.querySelector(".ph"), body = card.querySelector(".body"), y = state.year;
  card.classList.remove("open");
  const e = activeEv;
  if (e) {
    const p = PH[e.id];
    setPhoto(ph, p, e.kind);
    body.innerHTML = `<div class="meta"><span class="chip y">${yInt(e.y)} г.</span><span class="chip">${icon(e.kind)}${KIND[e.kind].n}</span></div><h2>${esc(e.t)}</h2><p>${esc(e.d)}</p>`;
  } else {
    const era = eraAt(y), nx = nextAfter(y);
    setPhoto(ph, null, "event", era.c);
    body.innerHTML = `<div class="meta"><span class="chip y">${era.a}–${era.b > 2026 ? "днес" : era.b}</span><span class="chip">Епоха</span></div><h2>${esc(era.n)}</h2><p>${esc(era.d)}</p>${nx ? `<div class="next">Следва: ${esc(nx.t)} (${yInt(nx.y)} г.)</div>` : ""}`;
  }
  body.scrollTop = 0;
  $("prev").disabled = !prevBefore(y);
  $("next").disabled = !nextAfter(y);
  requestAnimationFrame(aimCamera);
}
// swap the card photo without a blank gap: the new picture is decoded first, then fades in over the old one
let photoToken = 0;
function setPhoto(ph, p, kind, tint) {
  const token = ++photoToken;
  const cr = ph.querySelector(".cr"); if (cr) cr.remove();
  const put = (node) => {
    if (token !== photoToken) return;
    const olds = [...ph.children]; ph.appendChild(node);
    if (p) ph.insertAdjacentHTML("beforeend", `<div class="cr">Снимка: <a href="${p.u}" target="_blank" rel="noopener">${esc(p.a)}</a>, ${esc(p.l)}</div>`);
    setTimeout(() => olds.forEach((o) => o.remove()), 650);
  };
  if (p) {
    const im = new Image(); im.alt = ""; im.src = p.f;
    (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => put(im));
  } else {
    const d = document.createElement("div"); d.className = "noimg"; if (tint) d.style.background = tint + "22"; d.innerHTML = icon(kind); put(d);
  }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- HUD ---------- */
function updateHUD() {
  const y = state.year, yi = yInt(y);
  $("year").innerHTML = `${yi}<small>г.</small>`;
  const era = eraAt(y); $("era").firstElementChild.style.background = era.c; $("era").lastElementChild.textContent = era.n;
  const r = RULERS.find((q) => yi >= q[0] && yi < q[1]) || (yi >= 2026 ? RULERS[RULERS.length - 1] : null);
  $("ruler").innerHTML = r ? `${r[2] === "президент" ? "Президент" : r[2] === "водач" ? "Начело" : "Владетел"}: <b>${r[2] === "президент" || r[2] === "водач" ? "" : r[2] + " "}${esc(r[3])}</b>` : "";
  [...$("bands").children].forEach((b, i) => b.classList.toggle("cur", ERAS[i] === era));
}

/* ---------- timeline ---------- */
const track = $("track"), knob = $("knob"), tip = $("tip");
const yToX = (y) => ((y - START) / (END - START)) * track.clientWidth;
const xToY = (x) => clamp(START + (x / track.clientWidth) * (END - START), START, END);
function buildTimeline() {
  const bands = $("bands"); bands.innerHTML = "";
  ERAS.forEach((e) => { const d = document.createElement("div"); d.style.flex = `${Math.min(e.b, END) - e.a} 0 0`; d.style.background = e.c; d.textContent = e.n; d.title = `${e.n} (${e.a}–${e.b > 2026 ? "днес" : e.b})`; bands.appendChild(d); });
  // hide band labels that do not fit
  requestAnimationFrame(() => [...bands.children].forEach((d) => { d.style.color = d.scrollWidth > d.clientWidth + 1 ? "transparent" : ""; }));
  const ticks = $("ticks"); ticks.innerHTML = "";
  const step = track.clientWidth / 14 > 44 ? 100 : 200;
  for (let y = 700; y <= 2000; y += step) { const s = document.createElement("span"); s.textContent = y; s.style.left = yToX(y) + "px"; ticks.appendChild(s); }
  const dots = $("dots"); dots.innerHTML = "";
  EV.forEach((e) => { const d = document.createElement("div"); d.className = "dot"; d.dataset.id = e.id; d.style.left = yToX(e.y) + "px"; d.title = `${yInt(e.y)} — ${e.t}`; dots.appendChild(d); });
  placeKnob();
}
function placeKnob() {
  knob.style.left = yToX(state.year) + "px";
  const a = activeEv;
  [...$("dots").children].forEach((d) => { const e = EV.find((q) => q.id === d.dataset.id); d.classList.toggle("on", e === a); d.classList.toggle("seen", e.y <= state.year && e !== a); });
}
let dragging = false;
function yearFromEvent(e) { const r = track.getBoundingClientRect(); return xToY(e.clientX - r.left); }
track.addEventListener("pointerdown", (e) => {
  stopPlay(); dragging = true; map.setScrubbing(true); track.classList.add("drag"); track.setPointerCapture(e.pointerId);
  const dot = e.target.closest(".dot");
  if (dot) { const ev = EV.find((q) => q.id === dot.dataset.id); goTo(ev.y, 700); return; }
  setYear(yearFromEvent(e)); showTip(e);
});
track.addEventListener("pointermove", (e) => {
  if (dragging) { setYear(yearFromEvent(e)); showTip(e); }
  else if (e.pointerType === "mouse") { const y = yearFromEvent(e); const near = nearestDot(y, 7); tip.textContent = near ? `${yInt(near.y)} — ${near.t}` : yInt(y); tip.style.left = (e.clientX - track.getBoundingClientRect().left) + "px"; tip.classList.add("show"); }
});
const endDrag = () => {
  if (!dragging) return; dragging = false; map.setScrubbing(false); track.classList.remove("drag"); tip.classList.remove("show");
  const near = nearestDot(state.year, 12); if (near) goTo(near.y, 350);
};
track.addEventListener("pointerup", endDrag); track.addEventListener("pointercancel", endDrag);
track.addEventListener("pointerleave", () => { if (!dragging) tip.classList.remove("show"); });
function nearestDot(y, px) { const pxPerYear = track.clientWidth / (END - START); let best = null; EV.forEach((e) => { const d = Math.abs(e.y - y) * pxPerYear; if (d < px && (!best || d < best.d)) best = { e, d }; }); return best && best.e; }
function showTip(e) { tip.textContent = yInt(state.year); tip.style.left = yToX(state.year) + "px"; tip.classList.add("show"); }

/* ---------- state & animation ---------- */
const state = { year: START };
let tween = null;
function setYear(y) {
  state.year = clamp(y, START, END);
  map.showFrame(frameAt(state.year));
  aimCamera();
  map.setCities(CITIES, state.year);
  updateMarkers(); updateHUD(); placeKnob();
}
// the year tween runs on animation frames only while it lasts: goTo starts the frames when none run, tick stops at the end
function goTo(y, ms = 900) {
  const from = state.year, t0 = performance.now();
  if (!tween) requestAnimationFrame(tick);
  tween = { from, to: y, t0, ms };
}
function tick(now) {
  const t = clamp((now - tween.t0) / tween.ms, 0, 1);
  setYear(lerp(tween.from, tween.to, ease(t)));
  if (t < 1) { requestAnimationFrame(tick); return; }
  tween = null; setYear(state.year);
}

/* ---------- play ---------- */
let playing = false, playTimer = null;
const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.5" height="15" rx="1.2"/><rect x="13.5" y="4.5" width="4.5" height="15" rx="1.2"/></svg>';
function stopPlay() { playing = false; clearTimeout(playTimer); $("play").innerHTML = PLAY_ICON; $("play").setAttribute("aria-label", "Пусни"); }
function playStep() {
  if (!playing) return;
  const nx = nextAfter(state.year);
  if (!nx) { stopPlay(); return; }
  const gap = nx.y - state.year, ms = clamp(500 + Math.sqrt(gap) * 260, 700, 4200);
  goTo(nx.y, ms);
  playTimer = setTimeout(() => { playTimer = setTimeout(playStep, readTime(nx)); }, ms);
}
const readTime = (e) => clamp(2600 + e.d.length * 28, 4500, 9000);
$("play").addEventListener("click", () => {
  if (playing) { stopPlay(); return; }
  if (state.year >= END - .01) setYear(START);
  playing = true; $("play").innerHTML = PAUSE_ICON; $("play").setAttribute("aria-label", "Пауза"); playStep();
});
const stepNext = () => { stopPlay(); const n = nextAfter(state.year); if (n) goTo(n.y, clamp(500 + Math.sqrt(n.y - state.year) * 220, 600, 2600)); };
const stepPrev = () => { stopPlay(); const p = prevBefore(state.year); if (p) goTo(p.y, clamp(500 + Math.sqrt(state.year - p.y) * 220, 600, 2600)); };
$("next").addEventListener("click", stepNext); $("sNext").addEventListener("click", stepNext);
$("prev").addEventListener("click", stepPrev); $("sPrev").addEventListener("click", stepPrev);
$("more").addEventListener("click", () => { card.classList.toggle("open"); $("more").textContent = card.classList.contains("open") ? "По-малко" : "Още"; requestAnimationFrame(aimCamera); });
// the intro is read once: start() removes it from the page, so a fresh lookup would come back empty
const intro = $("intro");
addEventListener("keydown", (e) => {
  if (intro.isConnected && !intro.classList.contains("leave")) { if (e.key === "Enter" || e.key === " ") start(); return; }
  if (e.key === "ArrowRight") { e.shiftKey ? (stopPlay(), goTo(state.year + 10, 300)) : stepNext(); e.preventDefault(); }
  if (e.key === "ArrowLeft") { e.shiftKey ? (stopPlay(), goTo(state.year - 10, 300)) : stepPrev(); e.preventDefault(); }
  if (e.key === " ") { $("play").click(); e.preventDefault(); }
});

/* ---------- wheel on map scrubs time, unless the corner toggle gives the wheel to the map's zoom ---------- */
let wheelZoom = false;
$('wheelMode').addEventListener('click', () => {
    wheelZoom = !wheelZoom;
    map.setWheelZoom(wheelZoom);
    $('wheelMode').textContent = wheelZoom ? 'Колелце: мащаб' : 'Колелце: година';
});
$("map").addEventListener("wheel", (e) => { if (map.zoomsOnWheel(e)) return; e.preventDefault(); stopPlay(); setYear(state.year + (e.deltaY + e.deltaX) * .08); }, { passive: false });

/* ---------- intro & boot ---------- */
function start() {
  intro.classList.add("leave");
  setTimeout(() => intro.remove(), 700);
  try { localStorage.setItem("bgtt-seen", "1"); } catch (e) {}
}
$("go").addEventListener("click", start);
addEventListener("resize", () => { buildTimeline(); aimCamera(); });
buildTimeline();
setYear(START);
map.setFreeRect(freeRect()); map.snapToYear(START);
map.prebuildFrames();
window.BGTT = { setYear: (y) => { stopPlay(); setYear(y); }, map };
}
