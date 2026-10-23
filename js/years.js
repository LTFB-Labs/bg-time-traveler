const NOW = 2026;
const SUFFIX = / г\. пр\.Хр\.$| г\. сл\.Хр\.$| г\.$/;

function roundTo(n, step) {
    return Math.round(n / step) * step;
}

function deepTime(year) {
    const ago = NOW - year;
    return `преди ${roundTo(ago, ago > 100000 ? 10000 : 1000)} години`;
}

function plainYear(year) {
    if (year < 0) return `${-year} г. пр.Хр.`;
    if (year < 1000) return `${year} г. сл.Хр.`;
    return `${year} г.`;
}

export function fmtYear({ year, approx, label }) {
    if (label) return label;
    if (year <= -10000) return deepTime(year);
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
