import { problem } from './problems.mjs';

const LONG_SIDE = 900;
const USER_AGENT = 'bg-time-traveler-photos/1.0 (educational project; Node fetch)';
const HEADERS = { 'User-Agent': USER_AGENT };
const FILE_PAGE = 'https://commons.wikimedia.org/wiki/File:';

export function commonsFileUrl(name, width = LONG_SIDE) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`;
}

export function commonsInfoUrl(name) {
    return `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata|size|url&format=json&origin=*&titles=${encodeURIComponent('File:' + name)}`;
}

export function pickCredit(extmetadata, name) {
    const author = stripTags(extmetadata.Artist?.value) || stripTags(extmetadata.Credit?.value) || 'Unknown author';
    return { a: author, l: extmetadata.LicenseShortName?.value ?? '', u: FILE_PAGE + name.replaceAll(' ', '_') };
}

export function isAllowedLicence(shortName) {
    if (/^(Public domain|PD|CC0)/.test(shortName)) return true;
    return shortName.startsWith('CC BY') && !/NC|ND/.test(shortName);
}

export function renderCredits(photos) {
    const rows = Object.keys(photos).sort().map((key) => creditRow(key, photos[key]));
    return [
        '# Снимки',
        '',
        'Всички снимки са от [Wikimedia Commons](https://commons.wikimedia.org/).',
        '',
        '| Снимка | Автор | Лиценз | Файл |',
        '|---|---|---|---|',
        ...rows,
        '',
    ].join('\n');
}

export async function fetchMissing(photos, io) {
    const result = {};
    const problems = [];
    for (const [key, entry] of Object.entries(photos)) {
        const missing = entry.src && !io.exists(entry.f ?? `photos/${key}.jpg`) && !io.exists(`photos/${key}.png`);
        if (!missing) {
            result[key] = entry;
            continue;
        }
        const outcome = await fetchOne(key, entry, io);
        result[key] = outcome.entry ?? entry;
        if (outcome.problem) problems.push(outcome.problem);
    }
    return { photos: result, problems };
}

async function fetchOne(key, entry, io) {
    const infoResponse = await io.fetch(commonsInfoUrl(entry.src), { redirect: 'follow', headers: HEADERS });
    if (!infoResponse.ok) return failure(key, `metadata request failed (${infoResponse.status})`);
    const info = firstImageInfo(await infoResponse.json());
    if (!info) return failure(key, `no Commons file named ${entry.src}`);
    const credit = pickCredit(info.extmetadata ?? {}, entry.src);
    if (!isAllowedLicence(credit.l)) return failure(key, `licence "${credit.l}" is not allowed`);
    const size = targetSize(info.width, info.height);
    const response = await io.fetch(commonsFileUrl(entry.src, size.w), { redirect: 'follow', headers: HEADERS });
    if (!response.ok) return failure(key, `download failed (${response.status})`);
    const f = `photos/${key}.${extensionFor(response.headers.get('content-type'))}`;
    await io.writeFile(f, Buffer.from(await response.arrayBuffer()));
    return { entry: { ...entry, f, ...credit, ...size } };
}

function failure(key, message) {
    return { problem: problem(key, message) };
}

function firstImageInfo(json) {
    return Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0];
}

function targetSize(width, height) {
    const scale = LONG_SIDE / Math.max(width, height);
    return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

function extensionFor(contentType) {
    return contentType?.includes('png') ? 'png' : 'jpg';
}

function stripTags(html) {
    return (html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function creditRow(key, entry) {
    const name = decodeURIComponent(entry.u.split('/wiki/File:')[1] ?? '').replaceAll('_', ' ');
    return `| ${key} | ${entry.a} | ${entry.l} | [File:${name}](${entry.u}) |`;
}
