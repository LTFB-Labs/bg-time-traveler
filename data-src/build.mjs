// node build.mjs → ../geo.js  (land, lakes, rivers, realm frames as SVG paths in map pixels)
import fs from "fs";
import pc from "polygon-clipping";
import { FRAMES } from "./defs.mjs";

const LON0 = 12, LON1 = 42, LAT0 = 34, LAT1 = 49.5, K = 100, CX = Math.cos((42 * Math.PI) / 180);
const W = Math.round((LON1 - LON0) * CX * K), H = Math.round((LAT1 - LAT0) * K);
const P = ([lon, lat]) => [(lon - LON0) * CX * K, (LAT1 - lat) * K];
const BOX = [[[[LON0 - 0.6, LAT0 - 0.6], [LON1 + 0.6, LAT0 - 0.6], [LON1 + 0.6, LAT1 + 0.6], [LON0 - 0.6, LAT1 + 0.6], [LON0 - 0.6, LAT0 - 0.6]]]];
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);

// ---- land & countries ----
const land = pc.intersection(read("ne_50m_land.geojson").features.flatMap((f) => asMulti(f.geometry)), BOX);
const C = {};
for (const f of read("ne_50m_admin_0_countries.geojson").features) C[f.properties.ADM0_A3] = pc.intersection(asMulti(f.geometry), BOX);
const close = (ring) => { const r = ring.slice(); const a = r[0], b = r[r.length - 1]; if (a[0] !== b[0] || a[1] !== b[1]) r.push(a); return r; };
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

// ---- svg path helpers ----
const r1 = (v) => Math.round(v * 10) / 10;
function ringPath(ring, minStep = 0.8) {
  const pts = []; let last = null;
  for (const c of ring) { const p = P(c); if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < minStep) continue; pts.push(p); last = p; }
  if (pts.length < 3) return "";
  return "M" + pts.map((p) => r1(p[0]) + " " + r1(p[1])).join("L") + "Z";
}
const multiPath = (m, s) => m.map((poly) => poly.map((r) => ringPath(r, s)).join("")).join("");
function area(m) { let A = 0; for (const poly of m) poly.forEach((r, i) => { let a = 0; for (let j = 0; j < r.length - 1; j++) { const [x1, y1] = P(r[j]), [x2, y2] = P(r[j + 1]); a += x1 * y2 - x2 * y1; } A += (i ? -1 : 1) * Math.abs(a / 2); }); return A; }

// label point: grid search for the point farthest from the edge (in px) inside the land-clipped shape
function labelPoint(m) {
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

function chaikin(ring, n) { let r = close(ring); for (let k = 0; k < n; k++) { const o = []; for (let i = 0; i < r.length - 1; i++) { const [a, b] = [r[i], r[i + 1]]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } r = close(o); } return r; }
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
const lakeF = read("ne_10m_lakes.geojson").features.flatMap((f) => asMulti(f.geometry));
const lakes = pc.intersection(lakeF, BOX).filter((poly) => Math.abs(area([poly])) > 40);

const geo = { W, H, k: K, cx: CX, lon0: LON0, lat1: LAT1, land: multiPath(land, 0.7), lakes: multiPath(lakes, 0.7), rivers: riverPath, frames: out };
fs.writeFileSync("../geo.js", "/* generated by data-src/build.mjs — Natural Earth (public domain) + hand-drawn historical borders */\nconst GEO=" + JSON.stringify(geo) + ";\n");
console.log("geo.js", (fs.statSync("../geo.js").size / 1024).toFixed(0) + " KB", W, H);
