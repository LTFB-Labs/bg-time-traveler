import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchMissing, renderCredits } from './lib/photos.mjs';
import { formatProblems } from './lib/problems.mjs';

const ROOT = '..';
const PHOTOS_FILE = join(ROOT, 'content/photos.json');

const photos = JSON.parse(readFileSync(PHOTOS_FILE, 'utf8'));
const io = {
    fetch,
    writeFile: (f, data) => writeFile(join(ROOT, f), data),
    exists: (f) => existsSync(join(ROOT, f)),
};
const result = await fetchMissing(photos, io);
writeFileSync(PHOTOS_FILE, JSON.stringify(result.photos, null, 2) + '\n');
writeFileSync(join(ROOT, 'CREDITS.md'), renderCredits(result.photos));
if (result.problems.length > 0) {
    console.error(formatProblems(result.problems));
    process.exit(1);
}
