import { problem } from './problems.mjs';

const LONG_SIDE = 900;
const USER_AGENT = 'bg-time-traveler-photos/1.0 (educational project; Node fetch)';
const HEADERS = { 'User-Agent': USER_AGENT };
const FILE_PAGE = 'https://commons.wikimedia.org/wiki/File:';

export function commonsFileUrl(name, width = LONG_SIDE) {
    return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(name)}&w=${width}`;
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
    return shortName.startsWith('CC BY') && !/-N[CD]\b|\bN[CD]\b/.test(shortName);
}

// Checks the photos.json entries that cards and lessons use. Files are matched against the folder listing, so the letter case must match too.
// owners: photo id → the info.md that lists it, so a problem points at the package to fix
export function photoProblems(keys, photos, files, owners = {}) {
    return keys.filter((key) => Object.hasOwn(photos, key)).flatMap((key) => entryProblems(photos[key], files).map((message) => problem(owners[key] ?? 'photos.json', `"${key}": ${message}`)));
}

function entryProblems(entry, files) {
    if (!entry.f) return ['no "f" (file); run npm run photos'];
    const fileProblems = files.has(entry.f) ? [] : [`file "${entry.f}" is missing`];
    return isAllowedLicence(entry.l ?? '') ? fileProblems : [...fileProblems, `licence "${entry.l}" is not allowed`];
}

// icons: the learning-materials/icons.json credits of the drawings on the map, such as the ships
export function renderCredits(photos, icons = {}) {
    const rows = Object.keys(photos).filter((key) => photos[key].u).sort().map((key) => creditRow(key, photos[key]));
    return [
        '# Снимки',
        '',
        'Всички снимки са от [Wikimedia Commons](https://commons.wikimedia.org/).',
        '',
        '| Снимка | Автор | Лиценз | Файл |',
        '|---|---|---|---|',
        ...rows,
        '',
        ...iconCredits(icons),
        ...TERRAIN_CREDITS,
    ].join('\n');
}

// the relief layer of the map (tools/build-terrain.py); the sources' own wording, as their licences ask
const TERRAIN_CREDITS = [
    '## Релеф',
    '',
    'Рисунките на планините, хълмовете и дърветата са направени за това приложение. Местата им са по височините от [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), отворени данни в AWS:',
    '',
    '- Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers;',
    '- Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich;',
    '- Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration;',
    '- Global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.',
    '',
];

function iconCredits(icons) {
    const rows = Object.keys(icons).sort().map((id) => `| ${id} | ${icons[id].a} | ${icons[id].l} | ${icons[id].u} |`);
    if (rows.length === 0) return [];
    return [
        '## Рисунки',
        '',
        'Рисунките на картата и иконите на учебниците, секциите и уроците са от [game-icons.net](https://game-icons.net/), лиценз CC BY 3.0.',
        '',
        '| Рисунка | Автор | Лиценз | Източник |',
        '|---|---|---|---|',
        ...rows,
        '',
    ];
}

// folderOf(key): where a downloaded photo goes; the package's images/ folder, or photos/ for a loose photos.json
export async function fetchMissing(photos, io, folderOf = () => 'photos') {
    const result = {};
    const problems = [];
    for (const [key, entry] of Object.entries(photos)) {
        const folder = folderOf(key);
        const missing = entry.src && !io.exists(entry.f ?? `${folder}/${key}.jpg`) && !io.exists(`${folder}/${key}.png`);
        if (!missing) {
            result[key] = entry;
            continue;
        }
        const outcome = await fetchOne(key, entry, io, folder);
        result[key] = outcome.entry ?? entry;
        if (outcome.problem) problems.push(outcome.problem);
    }
    return { photos: result, problems };
}

async function fetchOne(key, entry, io, folder) {
    try {
        return await downloadEntry(key, entry, io, folder);
    } catch (error) {
        return failure(key, `request failed (${error.message})`);
    }
}

async function downloadEntry(key, entry, io, folder) {
    const probe = await io.fetch(commonsInfoUrl(entry.src), { redirect: 'follow', headers: HEADERS });
    if (!probe.ok) return failure(key, `metadata request failed (${probe.status})`);
    const original = firstImageInfo(await probe.json());
    if (!original?.width || !original?.height) return failure(key, `no size for Commons file ${entry.src}`);
    const credit = pickCredit(original.extmetadata ?? {}, entry.src);
    if (!isAllowedLicence(credit.l)) return failure(key, `licence "${credit.l}" is not allowed`);
    const response = await io.fetch(commonsFileUrl(entry.src, targetWidth(original)), { redirect: 'follow', headers: HEADERS });
    if (!response.ok) return failure(key, `download failed (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const size = imageSize(bytes);
    if (!size) return failure(key, `downloaded file for ${entry.src} is not a readable JPEG or PNG`);
    const f = `${folder}/${key}.${extensionFor(response.headers.get('content-type'))}`;
    await io.writeFile(f, bytes);
    return { entry: { ...entry, f, ...credit, ...size } };
}

// Long side becomes 900 px; never wider than the original. The recorded w/h are read from the downloaded bytes, not computed.
function targetWidth({ width, height }) {
    return Math.min(width, Math.round(LONG_SIDE * width / Math.max(width, height)));
}

export function imageSize(bytes) {
    if (bytes.subarray(1, 4).toString() === 'PNG') return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegSize(bytes);
    return undefined;
}

function jpegSize(bytes) {
    let at = 2;
    while (at + 9 < bytes.length) {
        const marker = bytes[at + 1];
        const isFrameHeader = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isFrameHeader) return { w: bytes.readUInt16BE(at + 7), h: bytes.readUInt16BE(at + 5) };
        at += 2 + bytes.readUInt16BE(at + 2);
    }
    return undefined;
}

function failure(key, message) {
    return { problem: problem(key, message) };
}

function firstImageInfo(json) {
    return Object.values(json.query?.pages ?? {})[0]?.imageinfo?.[0];
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
