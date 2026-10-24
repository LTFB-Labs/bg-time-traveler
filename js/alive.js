// The living lesson map: wave marks on the sea, small white vapours, flocks of birds, ships of the time, and the traveler
// standing at the part's place with a dotted trail of the places visited. The border trace lives in map.js.
// Energy: nothing here redraws the map itself. The waves sit on two canvases above it, drawn again only when the camera
// moves, and twinkle by swapping the canvases' opacity once a beat; the ships and the trail sit on an SVG layer of their
// own; the vapours, the birds and the traveler move as layers of their own. Everything moves for AWAKE_MS after a part
// opens or the camera moves, then holds still. Still means no animation at all: macOS keeps redrawing a layer that has
// even a paused one.
// Node imports this module for the pure helpers, so every DOM access stays inside a function.
const NS = 'http://www.w3.org/2000/svg';
const AWAKE_MS = 20000;
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
// the two wave canvases step through these opacities half a cycle apart, one step per beat
const WAVE_LEVELS = [.15, .45, .8, .45];
const WAVE_STILL_LEVEL = .5;
const BEAT_MS = 1000;
// the waves are at full strength up to this zoom (screen pixels per map unit) and fade as the kid zooms closer
const WAVE_FULL_ZOOM = 1.3;
const VAPOURS = 6;
const WALK_MS = 1600;

// where the traveler stands in a part: at the card its stand names, else at its first marked card with a place
export function standOf(part, cards) {
    const ids = part.meta.stand ? [part.meta.stand] : part.meta.marks ?? [];
    return ids.map((id) => cards[id]?.at).find(Boolean) ?? null;
}

// the places the traveler has stood on, story part by story part, up to part n
export function visitedUpTo(lesson, n, cards) {
    return lesson.parts.slice(0, n + 1).filter((p) => p.type === 'story').map((p) => standOf(p, cards)).filter(Boolean);
}

export function startAlive(map, lesson) {
    const scene = { map, lesson, isCalm: matchMedia('(prefers-reduced-motion: reduce)').matches, isAwake: false, beat: 0, ships: [] };
    scene.timers = { sleep: 0, beat: 0, birds: 0 };
    scene.waves = addWaves(scene);
    scene.layer = addLayer();
    scene.clouds = addClouds();
    if (!scene.isCalm) addFleet(scene);
    scene.traveler = addTraveler(scene);
    map.onView(() => onView(scene));
    onView(scene);
    if (scene.isCalm) sleep(scene);
    return { showPart: (n) => showPart(scene, n) };
}

function showPart(scene, n) {
    wake(scene);
    walkTo(scene, visitedUpTo(scene.lesson, n, CONTENT.cards).map(([lon, lat]) => scene.map.P(lon, lat)));
}

function onView(scene) {
    wake(scene);
    drawWaves(scene);
    followCamera(scene);
    if (scene.traveler.at) placeToken(scene);
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
    clearTimeout(scene.timers.sleep);
    scene.timers.sleep = setTimeout(() => sleep(scene), AWAKE_MS);
    if (scene.isAwake) return;
    scene.isAwake = true;
    document.documentElement.classList.remove('fx-still');
    scene.layer.unpauseAnimations();
    driftClouds(scene.clouds);
    drawWaves(scene);
    scene.timers.beat = setInterval(() => twinkle(scene), BEAT_MS);
    scheduleFlock(scene, random(1500, 4000));
}

function sleep(scene) {
    scene.isAwake = false;
    document.documentElement.classList.add('fx-still');
    scene.layer.pauseAnimations();
    parkClouds(scene.clouds);
    drawWaves(scene);
    clearInterval(scene.timers.beat);
    clearTimeout(scene.timers.birds);
}

/* ---------- sea ---------- */
// small wave marks over the open sea, split between two canvases above the map
function addWaves(scene) {
    const layers = [0, 1].map(() => Object.assign(document.createElement('canvas'), { className: 'fx-waves' }));
    document.getElementById('map').after(...layers);
    const waves = { layers, groups: seaSpots(scene.map), fade: 1 };
    sizeWaves(waves);
    addEventListener('resize', () => {
        sizeWaves(waves);
        drawWaves(scene);
    });
    return waves;
}

// a jittered grid over the whole map, without the spots on land, dealt at random between the two canvases
function seaSpots(map) {
    const groups = [[], []];
    const rowStep = WAVE_STEP * .8;
    for (let row = 0; row * rowStep < GEO.H; row++) {
        for (let x = (row % 2) * WAVE_STEP / 2; x < GEO.W; x += WAVE_STEP) {
            const at = [x + random(-12, 12), row * rowStep + random(-12, 12)];
            if (!map.isLand(...at)) groups[Math.random() < .5 ? 0 : 1].push(at);
        }
    }
    return groups;
}

function sizeWaves({ layers }) {
    layers.forEach((c) => {
        c.width = innerWidth * devicePixelRatio;
        c.height = innerHeight * devicePixelRatio;
    });
}

// awake, each canvas holds half the marks and the two twinkle; still, one canvas holds them all and the other is hidden
function drawWaves(scene) {
    const view = scene.map.view();
    const zoom = innerWidth / view.w;
    const [a, b] = scene.waves.groups;
    const marks = scene.isAwake ? [a, b] : [a.concat(b), []];
    scene.waves.fade = Math.min(1, WAVE_FULL_ZOOM / zoom);
    scene.waves.layers.forEach((c, i) => drawWaveLayer(c.getContext('2d'), marks[i], view, zoom));
    showWaveLevels(scene);
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

function twinkle(scene) {
    scene.beat++;
    showWaveLevels(scene);
}

function showWaveLevels(scene) {
    const { layers, fade } = scene.waves;
    layers.forEach((c, i) => { c.style.opacity = (waveLevel(scene, i) * fade).toFixed(2); });
    layers[1].hidden = !scene.isAwake;
}

function waveLevel(scene, i) {
    if (!scene.isAwake) return WAVE_STILL_LEVEL;
    return WAVE_LEVELS[(scene.beat + i * WAVE_LEVELS.length / 2) % WAVE_LEVELS.length];
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

// a flock of 3 to 9 birds crosses the map on a line of its own; the next one comes only while the map is awake
function flyBirds(scene) {
    const flock = document.createElement('div');
    flock.className = 'fx-birds';
    flock.innerHTML = flockSvg(3 + Math.floor(Math.random() * 7));
    scene.clouds.sky.before(flock);
    const { keyframes, ms } = flightPath();
    flock.animate(keyframes, { duration: ms, easing: 'linear' }).onfinish = () => {
        flock.remove();
        if (scene.isAwake) scheduleFlock(scene, random(6000, 18000));
    };
}

// a V behind the leader, or now and then a loose bunch; the flock faces east and the flight turns it
function flockSvg(count) {
    const isLoose = Math.random() < .3;
    const spots = Array.from({ length: count }, (_, i) => (isLoose ? looseSpot(i) : vSpot(i)));
    const scale = random(.8, 1.4);
    const birds = spots.map(([x, y]) => `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" d="M-6 0q3 -4 6 0q3 -4 6 0" style="animation-duration:${random(.26, .4).toFixed(2)}s;animation-delay:-${random(0, .4).toFixed(2)}s"/>`);
    return `<svg viewBox="-70 -45 85 90" style="width:${(85 * scale).toFixed(0)}px">${birds.join('')}</svg>`;
}

function vSpot(i) {
    const row = Math.ceil(i / 2);
    return [-row * 12 + random(-2, 2), (i % 2 ? -1 : 1) * row * 8 + random(-2, 2)];
}

function looseSpot(i) {
    return i ? [random(-55, 0), random(-30, 30)] : [0, 0];
}

// east or west, tilted up to about 25 degrees, at 60 to 110 pixels a second
function flightPath() {
    const dir = Math.random() < .5 ? 1 : -1;
    const x0 = dir > 0 ? -160 : innerWidth + 160;
    const y0 = innerHeight * random(.08, .7);
    const dx = dir * (innerWidth + 320);
    const dy = Math.tan(random(-.45, .45)) * Math.abs(dx);
    const pose = `rotate(${Math.atan2(dir * dy, Math.abs(dx)).toFixed(3)}rad) scaleX(${dir})`;
    const ms = (Math.hypot(dx, dy) / random(60, 110)) * 1000;
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

/* ---------- traveler ---------- */
// the traveler's coin floats over a pulsing ring next to the current place, above the map and below its markers
function addTraveler(scene) {
    const token = document.createElement('div');
    token.className = 'fx-token away';
    token.innerHTML = '<i class="pulse"></i><i class="shadow"></i><b><img src="traveler-head.svg" alt=""></b>';
    document.getElementById('ov').before(token);
    return { token, trail: el('path', { class: 'fx-trail' }, scene.layer), at: null, walk: null };
}

// the traveler walks to the last place visited, and the trail joins the places in order
function walkTo(scene, visited) {
    const me = scene.traveler;
    const here = visited.at(-1);
    me.token.classList.toggle('away', !here);
    if (!here) return;
    me.trail.setAttribute('d', visited.length > 1 ? `M${visited.join('L')}` : '');
    if (!me.at || scene.isCalm) {
        me.at = here;
        placeToken(scene);
        return;
    }
    if (String(me.walk?.to ?? me.at) === String(here)) return;
    const isWalking = Boolean(me.walk);
    me.walk = { from: me.at, to: here, start: performance.now() };
    if (!isWalking) requestAnimationFrame(() => stepWalk(scene));
}

function stepWalk(scene) {
    const me = scene.traveler;
    const { from, to, start } = me.walk;
    const t = Math.min(1, (performance.now() - start) / WALK_MS);
    const k = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    me.at = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    placeToken(scene);
    if (t < 1) requestAnimationFrame(() => stepWalk(scene));
    else me.walk = null;
}

function placeToken(scene) {
    const me = scene.traveler;
    const view = scene.map.view();
    const zoom = innerWidth / view.w;
    me.token.style.transform = `translate(${((me.at[0] - view.x) * zoom).toFixed(1)}px, ${((me.at[1] - view.y) * zoom).toFixed(1)}px)`;
}
