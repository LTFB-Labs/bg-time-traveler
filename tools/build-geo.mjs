// node build.mjs → ../geo.js  (land, lakes, rivers, realm frames as SVG paths in map pixels)
import fs from "fs";
import pc from "polygon-clipping";
import { FRAMES } from "./defs.mjs";
import { LON0, LON1, LAT0, LAT1, K, CX, W, H, P, BOX, close, r1, multiPath, area, labelPoint, chaikin } from "./lib/geo-core.mjs";
import { loadBorders, borderToRealm } from "./lib/borders.mjs";

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
const lakeF = read("ne_10m_lakes.geojson").features.flatMap((f) => asMulti(f.geometry));
const lakes = pc.intersection(lakeF, BOX).filter((poly) => Math.abs(area([poly])) > 40);

const ctx = { land, BOX, P };
const borders = Object.fromEntries(loadBorders("../content/borders").map((b) => [b.id, borderToRealm(b, ctx)]));
const geo = { W, H, k: K, cx: CX, lon0: LON0, lat1: LAT1, land: multiPath(land, 0.7), lakes: multiPath(lakes, 0.7), rivers: riverPath, frames: out, borders };
fs.writeFileSync("../geo.js", "/* generated by tools/build-geo.mjs — Natural Earth (public domain) + hand-drawn historical borders */\nconst GEO=" + JSON.stringify(geo) + ";\n");
console.log("geo.js", (fs.statSync("../geo.js").size / 1024).toFixed(0) + " KB", W, H);
