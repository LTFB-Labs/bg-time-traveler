const NOW = 2026;
const SUFFIX = / г\. пр\.Хр\.$| г\. сл\.Хр\.$| г\.$/;

function roundTo(n, step) {
    return Math.round(n / step) * step;
}

// years this far back are told as years ago, since no one counts them from Christ
export const isDeepYear = (year) => year <= -10000;

function deepTime(year) {
    const ago = NOW - year;
    return `преди ${grouped(roundTo(ago, ago > 100000 ? 10000 : 1000))} години`;
}

// 45000 as "45 000", with a no-break space so the number never splits over two lines;
// Bulgarian groups only numbers of five digits or more, so 5000 stays as it is
export const grouped = (n) => (n < 10000 ? String(n) : String(n).replace(/\B(?=(\d{3})+$)/g, ' '));

function plainYear(year) {
    if (year < 0) return `${-year} г. пр.Хр.`;
    if (year < 1000) return `${year} г. сл.Хр.`;
    return `${year} г.`;
}

export function fmtYear({ year, approx, label }) {
    if (label) return label;
    if (isDeepYear(year)) return deepTime(year);
    const text = plainYear(year === 0 ? 1 : year);
    return approx ? `ок. ${text}` : text;
}

const asYear = (v) => (typeof v === 'object' ? v : { year: v });

export function fmtSpan([a, b]) {
    const from = fmtYear(asYear(a));
    const to = fmtYear(asYear(b));
    const suffix = from.match(SUFFIX)?.[0];
    return suffix && suffix === to.match(SUFFIX)?.[0] ? `${from.slice(0, -suffix.length)} — ${to}` : `${from} — ${to}`;
}
