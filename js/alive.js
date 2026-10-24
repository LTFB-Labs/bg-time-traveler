// The living lesson map: wave marks on the sea, small white vapours, flocks of birds and ships of the time.
// The border trace lives in map.js.
// Energy: nothing here redraws the map itself. The waves sit still on a canvas above it, drawn again only when the camera
// moves; the ships sit on an SVG layer of their own; the vapours and the birds move as layers of their own. Everything moves for AWAKE_MS after a part opens or the camera moves, slowing to a stop over the last
// SLOW_MS, then holds still. Still means no animation at all: macOS keeps redrawing a layer that has even a paused one.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
const NS = 'http://www.w3.org/2000/svg';
const AWAKE_MS = 10000;
const SLOW_MS = 3000;
// ponytail: one fleet of ancient ships for every lesson; give lessons their own fleet when a lesson from a later era comes
// ships on sea lanes in [lon, lat]; px is the drawing's height on screen, seconds one crossing
const FLEET = [
    { kind: 'galley', px: 30, seconds: 80, lane: [[28.9, 43.6], [28.4, 43.0], [28.2, 42.6], [28.3, 42.1], [28.9, 41.4]] },
    { kind: 'trireme', px: 34, seconds: 70, lane: [[23.4, 39.3], [24.1, 39.9], [24.6, 40.3], [25.1, 40.5], [25.2, 40.7]] },
    { kind: 'trireme', px: 26, seconds: 90, lane: [[26.0, 38.6], [25.2, 39.2], [24.2, 39.6], [23.6, 40.1]] },
    { kind: 'sailboat', px: 20, seconds: 55, lane: [[27.6, 40.78], [28.2, 40.88], [28.85, 40.9]] },
    { kind: 'galley', px: 26, seconds: 110, lane: [[30.2, 41.6], [29.9, 42.6], [29.6, 43.8]] },
    { kind: 'sailboat', px: 22, seconds: 75, lane: [[17.5, 42.2], [16.5, 42.9], [15.2, 43.6]] },
];
const WAVE_STEP = 40;
const WAVE_INK = '#36574e';
const WAVE_LEVEL = .3;
// the waves are at full strength up to this zoom (screen pixels per map unit) and fade as the kid zooms closer
const WAVE_FULL_ZOOM = 1.3;
const VAPOURS = 6;
// a flock takes off only this long before the map starts to slow down, so it is seen before it fades
const FLOCK_LEAD_MS = 4000;
const MAX_FLOCKS = 2;

export function startAlive(map) {
    const scene = { map, isCalm: matchMedia('(prefers-reduced-motion: reduce)').matches, isAwake: false, slowing: null, ships: [] };
    scene.timers = { slow: 0, birds: 0 };
    scene.waves = addWaves(scene);
    scene.layer = addLayer();
    scene.clouds = addClouds();
    if (!scene.isCalm) addFleet(scene);
    map.onView(() => onView(scene));
    onView(scene);
    if (scene.isCalm) sleep(scene);
    return { showPart: () => wake(scene) };
}

function onView(scene) {
    wake(scene);
    drawWaves(scene);
    followCamera(scene);
}

function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    parent?.append(e);
    return e;
}

function random(from, to) {
    return from + Math.random() * (to - from);
}

/* ---------- awake and still ---------- */
function wake(scene) {
    if (scene.isCalm) return;
    clearTimeout(scene.timers.slow);
    scene.timers.slow = setTimeout(() => slowDown(scene), AWAKE_MS - SLOW_MS);
    scene.sleepsAt = performance.now() + AWAKE_MS;
    if (scene.slowing) keepPace(scene);
    if (scene.isAwake) return;
    scene.isAwake = true;
    document.documentElement.classList.remove('fx-still');
    scene.layer.unpauseAnimations();
    driftClouds(scene.clouds);
    scheduleFlock(scene, random(300, 1200));
}

// over the last SLOW_MS everything slows to a stop together: the vapours, the rocking ships and the coin take a pace
// that eases down to 0, and the ships sail on a clock that runs at that pace; the birds fly on and fade away
function slowDown(scene) {
    fadeFlocks();
    scene.layer.pauseAnimations();
    document.documentElement.classList.add('fx-slowing');
    const anims = [scene.layer, scene.clouds.sky].flatMap((e) => e.getAnimations({ subtree: true }));
    const now = performance.now();
    scene.slowing = { anims, start: now, last: now, shipTime: scene.layer.getCurrentTime() };
    requestAnimationFrame(() => stepSlowing(scene, scene.slowing));
}

function stepSlowing(scene, slowing) {
    if (scene.slowing !== slowing) return;
    const now = performance.now();
    const t = Math.min(1, (now - slowing.start) / SLOW_MS);
    // the pace eases from 1 down to 0, gently at both ends
    const pace = 1 - t * t * (3 - 2 * t);
    slowing.anims.forEach((a) => { a.playbackRate = pace; });
    slowing.shipTime += ((now - slowing.last) / 1000) * pace;
    slowing.last = now;
    scene.layer.setCurrentTime(slowing.shipTime);
    if (t < 1) requestAnimationFrame(() => stepSlowing(scene, slowing));
    else sleep(scene);
}

// woken while slowing down: everything goes back to full pace from where it is
function keepPace(scene) {
    scene.slowing.anims.forEach((a) => { a.playbackRate = 1; });
    scene.slowing = null;
    document.documentElement.classList.remove('fx-slowing');
    scene.layer.unpauseAnimations();
    scheduleFlock(scene, random(300, 1200));
}

function sleep(scene) {
    holdPoses(scene.slowing?.anims ?? []);
    scene.slowing = null;
    scene.isAwake = false;
    document.documentElement.classList.remove('fx-slowing');
    document.documentElement.classList.add('fx-still');
    scene.layer.pauseAnimations();
    parkClouds(scene.clouds);
    clearTimeout(scene.timers.birds);
    document.querySelectorAll('.fx-birds').forEach((flock) => flock.remove());
}

// the stopped elements keep the pose they stopped in, so taking their animations away moves nothing
function holdPoses(anims) {
    anims.forEach(({ effect }) => { effect.target.style.transform = getComputedStyle(effect.target).transform; });
}

/* ---------- sea ---------- */
// small still wave marks over the open sea, on a canvas above the map
function addWaves(scene) {
    const canvas = Object.assign(document.createElement('canvas'), { className: 'fx-waves' });
    document.getElementById('map').after(canvas);
    const waves = { canvas, spots: seaSpots(scene.map) };
    sizeWaves(canvas);
    addEventListener('resize', () => {
        sizeWaves(canvas);
        drawWaves(scene);
    });
    return waves;
}

// a jittered grid over the whole map, without the spots on land
function seaSpots(map) {
    const spots = [];
    const rowStep = WAVE_STEP * .8;
    for (let row = 0; row * rowStep < GEO.H; row++) {
        for (let x = (row % 2) * WAVE_STEP / 2; x < GEO.W; x += WAVE_STEP) {
            const at = [x + random(-12, 12), row * rowStep + random(-12, 12)];
            if (!map.isLand(...at)) spots.push(at);
        }
    }
    return spots;
}

function sizeWaves(canvas) {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
}

function drawWaves(scene) {
    const view = scene.map.view();
    const zoom = innerWidth / view.w;
    const { canvas, spots } = scene.waves;
    drawWaveLayer(canvas.getContext('2d'), spots, view, zoom);
    canvas.style.opacity = (WAVE_LEVEL * Math.min(1, WAVE_FULL_ZOOM / zoom)).toFixed(2);
}

// each mark is two little arcs, five map units each, drawn in screen pixels for the current camera
function drawWaveLayer(ctx, spots, view, zoom) {
    const w = 5 * zoom;
    const h = 2.2 * zoom;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.strokeStyle = WAVE_INK;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    spots.forEach(([mx, my]) => {
        const x = (mx - view.x) * zoom;
        const y = (my - view.y) * zoom;
        if (x < -2 * w || x > innerWidth || y < -h || y > innerHeight + h) return;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + w / 2, y - h, x + w, y);
        ctx.quadraticCurveTo(x + 1.5 * w, y + h, x + 2 * w, y);
    });
    ctx.stroke();
}

/* ---------- sky ---------- */
// small white vapours at their own heights, widths and speeds; they drift west to east while the map is awake
function addClouds() {
    const sky = document.createElement('div');
    sky.className = 'fx-clouds';
    document.getElementById('vignette').after(sky);
    return { sky, vapours: Array.from({ length: VAPOURS }, () => vapour(sky)) };
}

function vapour(sky) {
    const v = { el: document.createElement('i'), ms: random(70, 130) * 1000, at: Math.random(), anim: null };
    Object.assign(v.el.style, { top: `${random(4, 72).toFixed(1)}vh`, width: `${random(110, 240).toFixed(0)}px`, transform: `translateX(${cloudX(v.at)}px)` });
    sky.append(v.el);
    return v;
}

// a vapour's place across its drift, from 0 (off the left edge) to 1 (off the right edge), in pixels
function cloudX(at) {
    return ((at * 1.4 - .3) * innerWidth).toFixed(0);
}

function driftClouds({ vapours }) {
    vapours.forEach((v) => {
        v.anim = v.el.animate([{ transform: `translateX(${cloudX(0)}px)` }, { transform: `translateX(${cloudX(1)}px)` }], { duration: v.ms, iterations: Infinity });
        v.anim.currentTime = v.at * v.ms;
    });
}

// the vapours stay where they are: their current place becomes their style, then the animation goes
function parkClouds({ vapours }) {
    vapours.forEach((v) => {
        if (!v.anim) return;
        v.at = (v.anim.currentTime % v.ms) / v.ms;
        v.el.style.transform = `translateX(${cloudX(v.at)}px)`;
        v.anim.cancel();
        v.anim = null;
    });
}

function scheduleFlock(scene, ms) {
    clearTimeout(scene.timers.birds);
    scene.timers.birds = setTimeout(() => flyBirds(scene), ms);
}

// a flock of 3 to 9 birds crosses the map on a line of its own, and a second one may take off while it flies; a flock
// takes off only when it will be seen for a while before the map slows down, and fades away while the map slows down
function flyBirds(scene) {
    if (scene.sleepsAt - SLOW_MS - performance.now() < FLOCK_LEAD_MS) return;
    if (document.querySelectorAll('.fx-birds').length >= MAX_FLOCKS) return;
    const { keyframes, ms } = flightPath();
    const flock = document.createElement('div');
    flock.className = 'fx-birds';
    flock.innerHTML = flockSvg(3 + Math.floor(Math.random() * 7));
    scene.clouds.sky.before(flock);
    flock.animate(keyframes, { duration: ms, easing: 'linear' }).onfinish = () => flock.remove();
    scheduleFlock(scene, random(1000, 3500));
}

// the flocks still in the air fade away while the map slows down, and are gone when it goes still
function fadeFlocks() {
    document.querySelectorAll('.fx-birds').forEach((flock) => {
        flock.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SLOW_MS, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => flock.remove();
    });
}

// a V behind the leader; the flock faces east and the flight turns it. Each bird keeps its place in the V on a group of
// its own, because its flap animates the path's transform and would carry a place set on the path with it; the wings
// beat in a ripple from the leader back
function flockSvg(count) {
    const scale = random(.8, 1.4);
    const birds = Array.from({ length: count }, (_, i) => `<g transform="translate(${vSpot(i).join(' ')})"><path d="M-6 0q3 -4 6 0q3 -4 6 0" style="animation-delay:-${(i * .13).toFixed(2)}s"/></g>`);
    return `<svg viewBox="-70 -45 85 90" style="width:${(85 * scale).toFixed(0)}px">${birds.join('')}</svg>`;
}

function vSpot(i) {
    const row = Math.ceil(i / 2);
    return [-row * 12, (i % 2 ? -1 : 1) * row * 8];
}

// east or west across the visible map (the right end slips under the reading sheet), tilted up to about 25 degrees,
// at 50 to 70 pixels a second
function flightPath() {
    const width = document.getElementById('lsMap').getBoundingClientRect().right;
    const dir = Math.random() < .5 ? 1 : -1;
    const x0 = dir > 0 ? -160 : width + 160;
    const y0 = innerHeight * random(.08, .7);
    const dx = dir * (width + 320);
    const tilt = random(-.45, .45);
    const dy = Math.tan(tilt) * Math.abs(dx);
    const pose = `rotate(${(dir * tilt).toFixed(3)}rad) scaleX(${dir})`;
    const ms = (Math.hypot(dx, dy) / random(50, 70)) * 1000;
    return { ms, keyframes: [{ transform: `translate(${x0}px, ${y0}px) ${pose}` }, { transform: `translate(${x0 + dx}px, ${(y0 + dy).toFixed(0)}px) ${pose}` }] };
}

/* ---------- ships and trail ---------- */
// an SVG layer of its own that follows the map's camera, so its ships and trail never redraw the map
function addLayer() {
    const layer = el('svg', { class: 'fx-layer' });
    document.getElementById('vignette').after(layer);
    return layer;
}

function addFleet(scene) {
    FLEET.forEach((ship, i) => sail(scene, ship, i));
}

// a ship sails its lane and fades in and out at the ends; the drawings face east, so a ship sailing west is mirrored
function sail(scene, { kind, px, seconds, lane }, i) {
    const points = lane.map(([lon, lat]) => scene.map.P(lon, lat));
    const id = `fx-lane${i}`;
    el('path', { id, d: `M${points.join('L')}`, fill: 'none' }, scene.layer);
    const ship = el('g', { class: 'fx-ship' }, scene.layer);
    el('mpath', { href: `#${id}` }, el('animateMotion', { dur: `${seconds}s`, begin: `-${random(0, seconds).toFixed(0)}s`, repeatCount: 'indefinite' }, ship));
    el('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;.06;.94;1', dur: `${seconds}s`, repeatCount: 'indefinite' }, ship);
    const sized = el('g', {}, ship);
    el('image', { href: `img/ships/${kind}.svg`, x: -px / 2, y: -px, width: px, height: px }, el('g', { class: 'bob' }, sized));
    scene.ships.push({ sized, mirror: points.at(-1)[0] < points[0][0] ? -1 : 1 });
}

// the layer shows what the map shows; the ships keep their size on screen at any zoom
function followCamera(scene) {
    const view = scene.map.view();
    const zoom = innerWidth / view.w;
    scene.layer.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    scene.ships.forEach(({ sized, mirror }) => sized.setAttribute('transform', `scale(${(mirror / zoom).toFixed(4)} ${(1 / zoom).toFixed(4)})`));
}

