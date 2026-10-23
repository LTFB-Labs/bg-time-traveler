import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonsFileUrl, fetchMissing, imageSize, isAllowedLicence, renderCredits } from '../lib/photos.mjs';

test('buildsEncodedFilePathUrl', () => {
    const url = commonsFileUrl('Свети Иван, Рила [1] (2).jpg', 900);
    assert.ok(!url.includes(' '));
    assert.equal(url, 'https://commons.wikimedia.org/w/thumb.php?f=' + encodeURIComponent('Свети Иван, Рила [1] (2).jpg') + '&w=900');
});

test('rejectsNonCommercialLicence', () => {
    assert.equal(isAllowedLicence('CC BY-NC 2.0'), false);
    assert.equal(isAllowedLicence('CC BY-ND 4.0'), false);
    assert.equal(isAllowedLicence('All rights reserved'), false);
});

test('acceptsByAndBySa', () => {
    for (const l of ['CC BY 3.0', 'CC BY-SA 4.0', 'CC0', 'Public domain', 'PD-old']) assert.equal(isAllowedLicence(l), true, l);
});

test('rendersCreditsTable', () => {
    const md = renderCredits({
        b: { f: 'photos/b.jpg', a: 'Ann', l: 'CC0', u: 'https://commons.wikimedia.org/wiki/File:B.jpg' },
        a: { f: 'photos/a.jpg', a: 'Bob', l: 'CC BY 3.0', u: 'https://commons.wikimedia.org/wiki/File:A.jpg' },
    });
    assert.ok(md.startsWith('# Снимки'));
    assert.ok(md.indexOf('| a |') < md.indexOf('| b |'));
    assert.ok(md.includes('| b | Ann | CC0 | [File:B.jpg](https://commons.wikimedia.org/wiki/File:B.jpg) |'));
});

test('fetchMissingSkipsExisting', async () => {
    const photos = { a: { f: 'photos/a.jpg', src: 'A.jpg' } };
    const fetch = () => assert.fail('fetch must not be called');
    const { photos: out, problems } = await fetchMissing(photos, { fetch, writeFile: fetch, exists: () => true });
    assert.deepEqual(out, photos);
    assert.deepEqual(problems, []);
});

const pngBytes = (w, h) => {
    const bytes = Buffer.alloc(24);
    bytes.write('\x89PNG', 0, 'latin1');
    bytes.writeUInt32BE(w, 16);
    bytes.writeUInt32BE(h, 20);
    return bytes;
};
// Fake Commons: the info call answers with the original size; the thumbnail is a PNG header whose size the "server" picks (default: the requested width, never above the original).
const commons = ({ width, height, licence = 'CC BY-SA 4.0', served, body }) => async (url) => {
    if (!url.includes('api.php')) {
        const asked = Number(new URL(url).searchParams.get('w'));
        const w = served?.w ?? Math.min(asked, width);
        const bytes = body ?? pngBytes(w, served?.h ?? Math.round(height * w / width));
        return { ok: true, headers: new Headers({ 'content-type': 'image/png' }), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) };
    }
    const extmetadata = { Artist: { value: '<a href="x">Ann  <b>Lee</b></a>' }, LicenseShortName: { value: licence } };
    return { ok: true, json: async () => ({ query: { pages: { 1: { imageinfo: [{ width, height, extmetadata }] } } } }) };
};
const run = (photos, fetch, written = []) => fetchMissing(photos, { fetch, writeFile: async (f) => written.push(f), exists: () => false });

test('fetchMissingRefusesBadLicenceWithoutDownload', async () => {
    const urls = [];
    const inner = commons({ width: 2000, height: 1000, licence: 'CC BY-NC 2.0' });
    const { problems } = await run({ k: { src: 'K.jpg' } }, async (url) => (urls.push(url), inner(url)));
    assert.ok(urls.every((u) => u.includes('api.php')));
    assert.match(problems[0].message, /CC BY-NC 2\.0/);
    assert.equal(problems[0].file, 'k');
});

test('fetchMissingFillsEntry', async () => {
    const written = [];
    const { photos, problems } = await run({ k: { src: 'K x.png' } }, commons({ width: 2000, height: 1000 }), written);
    assert.deepEqual(problems, []);
    assert.deepEqual(photos.k, { src: 'K x.png', f: 'photos/k.png', a: 'Ann Lee', l: 'CC BY-SA 4.0', u: 'https://commons.wikimedia.org/wiki/File:K_x.png', w: 900, h: 450 });
    assert.deepEqual(written, ['photos/k.png']);
});

test('fetchMissingDoesNotUpscaleSmallOriginal', async () => {
    const { photos } = await run({ k: { src: 'K.jpg' } }, commons({ width: 785, height: 601 }));
    assert.deepEqual([photos.k.w, photos.k.h], [785, 601]);
});

test('fetchMissingScalesPortraitToLongSide900', async () => {
    const { photos } = await run({ k: { src: 'K.jpg' } }, commons({ width: 2000, height: 3000 }));
    assert.deepEqual([photos.k.w, photos.k.h], [600, 900]);
});

test('fetchMissingRecordsServedSizeNotComputedTarget', async () => {
    const { photos } = await run({ k: { src: 'K.jpg' } }, commons({ width: 2000, height: 1000, served: { w: 960, h: 481 } }));
    assert.deepEqual([photos.k.w, photos.k.h], [960, 481]);
});

test('fetchMissingTurnsNetworkErrorIntoProblem', async () => {
    const { problems } = await run({ k: { src: 'K.jpg' } }, async () => { throw new Error('getaddrinfo ENOTFOUND'); });
    assert.equal(problems[0].file, 'k');
    assert.match(problems[0].message, /ENOTFOUND/);
});

test('fetchMissingRejectsMissingSize', async () => {
    const { photos, problems } = await run({ k: { src: 'K.jpg' } }, commons({ width: undefined, height: undefined }));
    assert.equal(problems[0].file, 'k');
    assert.equal(photos.k.w, undefined);
});

test('fetchMissingRejectsUnreadableImage', async () => {
    const { problems } = await run({ k: { src: 'K.jpg' } }, commons({ width: 2000, height: 1000, body: Buffer.from('<html>error</html>') }));
    assert.equal(problems[0].file, 'k');
});

test('imageSizeReadsJpegFrameHeader', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x02, 0x58, 0x03, 0x20, 0x01, 0x01, 0x11, 0x00]);
    assert.deepEqual(imageSize(jpeg), { w: 800, h: 600 });
});

test('creditsListFigures', () => {
    const photos = { a: { f: 'photos/a.jpg', a: 'Bob', l: 'CC BY 3.0', u: 'https://commons.wikimedia.org/wiki/File:A.jpg' } };
    const md = renderCredits(photos, { army: { a: 'Delapouite', l: 'CC BY 3.0', u: 'https://game-icons.net/1x1/delapouite/pikeman.html' } });
    assert.ok(md.indexOf('| a | Bob |') < md.indexOf('\n## Фигури\n'));
    assert.ok(md.includes('\nФигурите са от [game-icons.net](https://game-icons.net/), лиценз CC BY 3.0.\n'));
    assert.ok(md.includes('\n| Фигура | Автор | Лиценз | Източник |\n|---|---|---|---|\n| army | Delapouite | CC BY 3.0 | https://game-icons.net/1x1/delapouite/pikeman.html |\n'));
});
