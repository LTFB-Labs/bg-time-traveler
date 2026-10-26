// One package per piece of information: learning-materials/information/<id>/ holds info.md and the files its media lists
// (images/, audio/, videos/, maps/, texts/). The fields of info.md's front matter are the contract in information/info.schema.json.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { problem } from './problems.mjs';

export const MEDIA_FOLDERS = ['images', 'audio', 'videos', 'maps', 'texts'];

export function packageFolders(infoDir) {
    return readdirSync(infoDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

// the contract ships with the code, so every content root (also a test fixture) is checked against the same one
export const CONTRACT = join(import.meta.dirname, '../../learning-materials/information/info.schema.json');

export function compileContract(schemaFile = CONTRACT) {
    const schema = JSON.parse(readFileSync(schemaFile, 'utf8'));
    return new Ajv2020({ allErrors: true }).compile(schema);
}

// the front matter as written: parseCard adds file, paragraphs and a merged alias list on top of it
function frontMatterOf({ file, paragraphs, aliases, rawAliases, ...meta }) {
    return rawAliases === undefined ? meta : { ...meta, aliases: rawAliases };
}

export function contractProblems(card, validate) {
    if (card.parseError || validate(frontMatterOf(card))) return [];
    return validate.errors.map((e) => problem(card.file, `${e.instancePath || 'front matter'} ${e.message}${e.params?.additionalProperty ? ` "${e.params.additionalProperty}"` : ''}`));
}

// every file media lists is in the package and every file in a media folder is listed (cards.mjs checks the id against the folder);
// matched against the folder listing, so the letter case must match also on a disk that ignores it
export function packageProblems(card, packageDir) {
    const listed = MEDIA_FOLDERS.flatMap((kind) => (card.media?.[kind] ?? []).map((item) => item?.file)).filter((f) => typeof f === 'string');
    const present = MEDIA_FOLDERS.flatMap((kind) => filesIn(join(packageDir, kind)).map((name) => `${kind}/${name}`));
    return [
        ...listed.filter((f) => !present.includes(f)).map((f) => `${f} is listed in media but missing`),
        ...present.filter((f) => !listed.includes(f)).map((f) => `${f} is in the package but not listed in media`),
    ].map((message) => problem(card.file, message));
}

function filesIn(dir) {
    return existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith('.')) : [];
}

// every question is answered by its own package: the quote is in the text (bold marks and spacing aside), the answer is in the quote,
// and no wrong answer is the right one
export function questionProblems(card) {
    const flat = (text) => text.replaceAll('**', '').replace(/\s+/g, ' ').trim().toLowerCase();
    const body = flat((card.paragraphs ?? []).join(' '));
    return (card.questions ?? []).flatMap((question, i) => {
        const { answer, wrong, quote } = question ?? {};
        if (typeof answer !== 'string' || typeof quote !== 'string' || !Array.isArray(wrong)) return [];
        return [
            ...(body.includes(flat(quote)) ? [] : ['its quote is not in the text']),
            ...(flat(quote).includes(flat(answer)) ? [] : ['its answer is not in its quote']),
            ...(wrong.some((w) => typeof w === 'string' && flat(w) === flat(answer)) ? ['a wrong answer is the right one'] : []),
        ].map((message) => problem(card.file, `question ${i + 1}: ${message}`));
    });
}

export function relatedProblems(card, ids) {
    return (card.related ?? []).filter((id) => !ids.has(id)).map((id) => problem(card.file, `related "${id}" is not an info package`));
}

// The page keeps one map of photos by id, in the shape it always had: { f, a, l, u, w, h, c, src }.
// base(card) is the package folder as the page sees it, e.g. learning-materials/information/aheloy.
export function collectPhotos(cards, base) {
    const photos = {};
    const owners = {};
    const problems = [];
    for (const card of cards) {
        for (const image of card.media?.images ?? []) {
            if (!image?.id) continue;
            if (owners[image.id]) {
                problems.push(problem(card.file, `image id "${image.id}" is already used by ${owners[image.id]}`));
                continue;
            }
            owners[image.id] = card.file;
            photos[image.id] = toPhotoRecord(image, base(card));
        }
    }
    return { photos, owners, problems };
}

function toPhotoRecord(image, folder) {
    const record = { src: image.commons, f: `${folder}/${image.file}`, a: image.author, l: image.license, u: image.source, w: image.width, h: image.height, c: image.caption };
    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

// the image files that exist, as the page addresses them
export function photoFiles(cards, base, packageDir) {
    return new Set(cards.flatMap((card) => filesIn(join(packageDir(card), 'images')).map((name) => `${base(card)}/images/${name}`)));
}
