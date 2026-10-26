// npm run photos: downloads the Commons images that info packages list (media.images with "commons") but do not have yet,
// writes each one's file, credit and size back into its package's info.md, and renders CREDITS.md from all packages.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { parseCard } from './lib/cards.mjs';
import { collectPhotos, packageFolders } from './lib/info.mjs';
import { fetchMissing, renderCredits } from './lib/photos.mjs';
import { formatProblems } from './lib/problems.mjs';

const ROOT = join(import.meta.dirname, '..');
const MATERIALS = join(ROOT, 'learning-materials');
const INFO = join(MATERIALS, 'information');

const cards = packageFolders(INFO)
    .filter((name) => existsSync(join(INFO, name, 'info.md')))
    .map((name) => parseCard(readFileSync(join(INFO, name, 'info.md'), 'utf8'), `information/${name}/info.md`));
const base = (file) => `learning-materials/${dirname(file)}`;
const { photos, owners } = collectPhotos(cards, (card) => base(card.file));
const icons = JSON.parse(readFileSync(join(MATERIALS, 'icons.json'), 'utf8'));
const io = {
    fetch,
    writeFile: async (f, data) => {
        await mkdir(dirname(join(ROOT, f)), { recursive: true });
        await writeFile(join(ROOT, f), data);
    },
    exists: (f) => existsSync(join(ROOT, f)),
};
const result = await fetchMissing(photos, io, (key) => `${base(owners[key])}/images`);

for (const [key, entry] of Object.entries(result.photos)) {
    if (entry !== photos[key]) writeBack(owners[key], key, entry);
}
writeFileSync(join(ROOT, 'CREDITS.md'), renderCredits(result.photos, icons));
if (result.problems.length > 0) {
    console.error(formatProblems(result.problems));
    process.exit(1);
}

// the downloaded image's file, credit and size go into its media.images entry; the rest of info.md stays as written
function writeBack(file, key, entry) {
    const path = join(MATERIALS, file);
    const text = readFileSync(path, 'utf8');
    const lines = text.split('\n');
    const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === '---');
    const doc = YAML.parseDocument(lines.slice(1, end).join('\n'));
    const images = doc.getIn(['media', 'images']);
    const item = images.items.find((it) => it.get('id') === key);
    const folder = base(file);
    const fields = { file: entry.f.slice(folder.length + 1), author: entry.a, license: entry.l, source: entry.u, width: entry.w, height: entry.h };
    for (const [name, value] of Object.entries(fields)) if (value !== undefined) item.set(name, value);
    writeFileSync(path, ['---', String(doc).trimEnd(), ...lines.slice(end)].join('\n'));
}
