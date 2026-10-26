// node build-library.mjs → ../img/library.svg: a repeating tile of bookshelves for the lesson hall's background.
// The books are drawn from a fixed seed, so the tile is the same on every build.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 640, SHELF = 150, ROWS = 3, BOARD = 14;
const COLORS = ['#7a1e12', '#8e3b22', '#5f84b5', '#3e6a5a', '#b07a3c', '#6b4a1d', '#9a5a3a', '#2f5a6a', '#a8833f', '#5a3a5a', '#7d6a3a', '#3f4a6a'];

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (xs) => xs[Math.floor(rand() * xs.length)];

const parts = [];
for (let row = 0; row < ROWS; row++) {
    const floor = (row + 1) * SHELF - BOARD;
    let x = 0;
    while (x < W) {
        if (rand() < .06) { x += 18 + rand() * 30; continue; } // a gap on the shelf
        const w = 12 + Math.round(rand() * 16);
        const h = 84 + Math.round(rand() * 44);
        const lean = rand() < .05 ? 8 : 0;
        const c = pick(COLORS);
        const y = floor - h;
        const book = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}"/>`
            + `<rect x="${x + 2}" y="${y + 10}" width="${w - 4}" height="3" fill="#e9d9b0" opacity=".55"/>`
            + `<rect x="${x + 2}" y="${y + h - 16}" width="${w - 4}" height="3" fill="#e9d9b0" opacity=".45"/>`;
        parts.push(lean ? `<g transform="rotate(${lean} ${x} ${floor})">${book}</g>` : book);
        x += w + 2 + (lean ? 6 : 0);
    }
    parts.push(`<rect x="0" y="${floor}" width="${W}" height="${BOARD}" fill="#8a6234"/><rect x="0" y="${floor}" width="${W}" height="3" fill="#a87c48"/><rect x="0" y="${floor + BOARD - 3}" width="${W}" height="3" fill="#5e4021" opacity=".6"/>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROWS * SHELF}" viewBox="0 0 ${W} ${ROWS * SHELF}">`
    + `<rect width="100%" height="100%" fill="#6b4a2a"/>${parts.join('')}</svg>\n`;
writeFileSync(join(import.meta.dirname, '../img/library.svg'), svg);
console.log('img/library.svg', svg.length, 'bytes');
