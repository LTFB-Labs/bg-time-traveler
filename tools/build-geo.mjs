// node build.mjs → ../geo.js  (land, lakes, rivers and their names, realm frames as SVG paths in map pixels)
import fs from "fs";
import pc from "polygon-clipping";
import { FRAMES } from "./defs.mjs";
import { LON0, LON1, LAT0, LAT1, K, CX, W, H, P, BOX, close, r1, ringPath, multiPath, area, labelPoint, chaikin } from "./lib/geo-core.mjs";
import { loadBorders, borderToRealm } from "./lib/borders.mjs";
import { todayBorder } from "./lib/today.mjs";

const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);

// ---- land & countries ----
const land = pc.intersection(read("ne_50m_land.geojson").features.flatMap((f) => asMulti(f.geometry)), BOX);
const C = {};
for (const f of read("ne_50m_admin_0_countries.geojson").features) C[f.properties.ADM0_A3] = pc.intersection(asMulti(f.geometry), BOX);
const SDOB = [[26.4,44.4],[26.55,44.05],[26.9,43.85],[27.4,43.62],[27.9,43.42],[28.1,43.33],[29.2,43.3],[29.2,44.6]];
C.SDOB = pc.intersection(C.BGR, [[close(SDOB)]]);
C.LAND = land;

function ev(e) {
  if (typeof e === "string") { const k = e.startsWith("C:") ? e.slice(2) : e; if (!C[k]) throw new Error("no " + e); return C[k]; }
  if (typeof e[0] === "string") {
    const [op, ...args] = e; const gs = args.map(ev);
    if (op === "U") return pc.union(...gs);
    if (op === "I") return gs.reduce((a, b) => pc.intersection(a, b));
    if (op === "D") return pc.difference(gs[0], ...gs.slice(1));
  }
  return [[chaikin(e, 2)]];
}

// ---- frames ----
const out = [];
for (const fr of FRAMES) {
  let taken = []; const realms = [];
  for (const r of fr.realms) {
    let g = pc.intersection(ev(r.tribe && Array.isArray(r.poly) && typeof r.poly[0] !== "string" ? chaikin(r.poly, 1) : r.poly), BOX);
    if (!r.over && taken.length) g = pc.difference(g, ...taken);
    if (!g.length) continue;
    const onLand = pc.intersection(g, land);
    const A = area(onLand);
    if (!r.over) taken.push(g);
    if (A < 30) continue;
    const lp = r.name ? labelPoint(onLand) : null;
    realms.push({ id: r.id, n: r.name, c: r.color, d: multiPath(g, 1.6), ...(r.tribe ? { tribe: 1 } : {}), ...(r.over ? { over: 1 } : {}), ...(lp ? { lx: r1(lp.x), ly: r1(lp.y), lr: r1(lp.d) } : {}), a: Math.round(A) });
  }
  // merge realms of the same name for labels: keep label on the biggest piece only
  const seen = {}; for (const r of [...realms].sort((a, b) => b.a - a.a)) { if (!r.n) continue; if (seen[r.n]) { delete r.lx; delete r.ly; } seen[r.n] = 1; }
  out.push({ y: fr.y, realms });
  console.log(fr.y, realms.map((r) => `${r.id}:${r.a}`).join(" "));
}

// ---- rivers & lakes ----
const RIV = { Danube: "Дунав", Donau: "Дунав", "Bratul Chillia": "", "Bratul Sulina": "", "Bratul Sfintu Gheorghe": "", Sava: "Сава", Drau: "Драва", Drava: "Драва", Tisa: "Тиса", Tisza: "Тиса", Morava: "Морава", Mures: "Муреш", Olt: "Олт", Prut: "Прут", Siret: "Сирет", Dniester: "Днестър", Dnipro: "Днепър", "Southern Bug": "Южен Буг", Don: "Дон", Kuban: "Кубан", Evros: "Марица", Maritsa: "Марица", Tundzha: "Тунджа", Arda: "Арда", Strymnas: "Струма", Strimonas: "Струма", Mesta: "Места", Yantra: "Янтра", Kamchiya: "Камчия", Drin: "Дрин", Drina: "Дрина", Haliacmon: "Бистрица", Ialomita: "Яломица", "Ialomița": "Яломица", Ogosta: "Огоста", "Levi Iskar": "Искър", Iskar: "Искър", Vardar: "Вардар", Axios: "Вардар", Treska: "Треска", Crna: "Черна", Nišava: "Нишава", Timok: "Тимок", "Beli Timok": "Тимок", Vedea: "Веди", "Argeș": "Арджеш", Jiu: "Жиу", Bosna: "Босна", Neretva: "Неретва", Sakarya: "Сакария", Kizilirmak: "Кизилърмак", "Kızılırmak": "Кизилърмак", "Kiz?lirmak": "Кизилърмак", Aoos: "Вьоса", Acheloos: "Ахелой", "Büyük Menderes": "Меандър", "Byk Menderes": "Меандър", Ergene: "Ергене", Struma: "Струма" };
const lines = [];
for (const fn of ["ne_10m_rivers.geojson", "ne_10m_rivers_eu.geojson"]) for (const f of read(fn).features) {
  const nm = f.properties.name; if (!f.geometry || !(nm in RIV)) continue;
  const ls = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const l of ls) {
    let cur = []; const flush = () => { if (cur.length > 1) lines.push({ n: RIV[nm], pts: cur }); cur = []; };
    for (const c of l) { if (c[0] < LON0 - 0.5 || c[0] > LON1 + 0.5 || c[1] < LAT0 - 0.5 || c[1] > LAT1 + 0.5) flush(); else cur.push(c); }
    flush();
  }
}
const riverPath = lines.map(({ pts }) => { const p = []; let last = null; for (const c of pts) { const q = P(c); if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) < 1.5) continue; p.push(q); last = q; } return p.length > 1 ? "M" + p.map((q) => r1(q[0]) + " " + r1(q[1])).join("L") : ""; }).join("");

// ---- river names ----
// [name, lon, lat]: a spot on the river, picked by hand where its name misses the realm, mountain and sea names
const RIVER_LABELS = [
    ['Дунав', 24.6, 43.7],
    ['Дунав', 18.9, 46.1],
    ['Марица', 25.3, 42.1],
    ['Тунджа', 26.45, 42.1],
    ['Арда', 26.05, 41.66],
    ['Струма', 23.15, 41.75],
    ['Места', 23.85, 41.45],
    ['Искър', 23.95, 43.25],
    ['Янтра', 25.6, 43.35],
    ['Морава', 21.3, 44.1],
    ['Сава', 18.4, 45.1],
    ['Тиса', 20.2, 45.7],
    ['Драва', 16.3, 46.4],
    ['Олт', 24.4, 44.5],
    ['Прут', 27.9, 46.6],
];
// about how many map units one letter of a river name takes with its spacing, at the font size js/map.js gives it
const LETTER = 6.5;
// every other named river gets its name at the middle of its longest piece
const riverLabels = [
    ...RIVER_LABELS.map(([n, lon, lat]) => ({ n, d: riverLabelPath(n, P([lon, lat])) })),
    ...unpickedRivers().map((n) => ({ n, d: riverLabelPath(n, middleOfLongest(n)) })),
];

function unpickedRivers() {
    const picked = new Set(RIVER_LABELS.map(([n]) => n));
    return [...new Set(lines.map((l) => l.n))].filter((n) => n && !picked.has(n));
}

function middleOfLongest(name) {
    const longest = lines.filter((l) => l.n === name).map((l) => resample(l.pts.map(P), 1)).reduce((a, b) => (b.length > a.length ? b : a));
    return longest[Math.floor(longest.length / 2)];
}

// the name runs along a smoothed stretch of its river around the point nearest the spot, twice as long as the name,
// and always left to right, so it never stands on its head
function riverLabelPath(name, at) {
    const need = name.length * LETTER * 2;
    const stretch = stretchAround(name, at, need);
    if (stretch.length < need * .9) console.warn(`river label ${name}: only ${stretch.length} of ${need} map units of river`);
    const pts = smooth(smooth(stretch, 8), 8).filter((_, i) => i % 2 === 0);
    if (pts.at(-1)[0] < pts[0][0]) pts.reverse();
    return 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L');
}

// the river's points one map unit apart, need units of them centred on the point nearest at
function stretchAround(name, at, need) {
    const runs = lines.filter((l) => l.n === name).map((l) => resample(l.pts.map(P), 1));
    const dist = ([x, y]) => Math.hypot(x - at[0], y - at[1]);
    const best = runs.map((pts) => ({ pts, i: pts.reduce((b, p, i) => (dist(p) < dist(pts[b]) ? i : b), 0) }))
        .reduce((a, b) => (dist(b.pts[b.i]) < dist(a.pts[a.i]) ? b : a));
    return best.pts.slice(Math.max(0, best.i - need / 2), best.i + need / 2);
}

function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const len = Math.hypot(x1 - x0, y1 - y0);
        for (let s = step - carry; s <= len; s += step) out.push([x0 + (x1 - x0) * s / len, y0 + (y1 - y0) * s / len]);
        carry = (carry + len) % step;
    }
    return out;
}

// a moving average over r points on each side
function smooth(pts, r) {
    return pts.map((_, i) => {
        const near = pts.slice(Math.max(0, i - r), i + r + 1);
        return [near.reduce((s, p) => s + p[0], 0) / near.length, near.reduce((s, p) => s + p[1], 0) / near.length];
    });
}

const lakeF = read("ne_10m_lakes.geojson").features.flatMap((f) => asMulti(f.geometry));
const lakes = pc.intersection(lakeF, BOX).filter((poly) => Math.abs(area([poly])) > 40);

// ---- today's Bulgaria, for the map's "Граници днес" button: its outline, the stretches that follow nature, its name's spot ----
const bulgaria = C.BGR.reduce((a, b) => (b[0].length > a[0].length ? b : a))[0];
const neighbours = Object.fromEntries(["ROU", "SRB", "MKD", "GRC", "TUR"].map((code) => [code, C[code].flat()]));
const todayLabel = labelPoint(C.BGR);
const today = { line: ringPath(bulgaria, 0.7), ...todayBorder(bulgaria, neighbours), label: [r1(todayLabel.x), r1(todayLabel.y)] };

const ctx = { land, BOX, P };
const borders = Object.fromEntries(loadBorders("../content/borders").map((b) => [b.id, borderToRealm(b, ctx)]));
const geo = { W, H, k: K, cx: CX, lon0: LON0, lat1: LAT1, land: multiPath(land, 0.7), lakes: multiPath(lakes, 0.7), rivers: riverPath, riverLabels, frames: out, borders, today };
fs.writeFileSync("../geo.js", "/* generated by tools/build-geo.mjs — Natural Earth (public domain) + hand-drawn historical borders */\nconst GEO=" + JSON.stringify(geo) + ";\n");
console.log("geo.js", (fs.statSync("../geo.js").size / 1024).toFixed(0) + " KB", W, H);
