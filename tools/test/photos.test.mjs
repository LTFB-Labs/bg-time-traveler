import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonsFileUrl, fetchMissing, isAllowedLicence, renderCredits } from '../lib/photos.mjs';

test('buildsEncodedFilePathUrl', () => {
    const url = commonsFileUrl('Свети Иван, Рила [1] (2).jpg', 900);
    assert.ok(!url.includes(' '));
    assert.equal(url, 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent('Свети Иван, Рила [1] (2).jpg') + '?width=900');
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

const info = (licence) => ({
    ok: true,
    json: async () => ({ query: { pages: { 1: { imageinfo: [{ width: 2000, height: 1000, extmetadata: { Artist: { value: '<a href="x">Ann  <b>Lee</b></a>' }, LicenseShortName: { value: licence } } }] } } } }),
});

test('fetchMissingRefusesBadLicenceWithoutDownload', async () => {
    const urls = [];
    const fetch = async (url) => (urls.push(url), info('CC BY-NC 2.0'));
    const { problems } = await fetchMissing({ k: { src: 'K.jpg' } }, { fetch, writeFile: async () => {}, exists: () => false });
    assert.equal(urls.length, 1);
    assert.match(problems[0].message, /CC BY-NC 2\.0/);
    assert.equal(problems[0].file, 'k');
});

test('fetchMissingFillsEntry', async () => {
    const written = [];
    const fetch = async (url) => url.includes('api.php') ? info('CC BY-SA 4.0') : { ok: true, headers: new Headers({ 'content-type': 'image/png' }), arrayBuffer: async () => new ArrayBuffer(3) };
    const { photos, problems } = await fetchMissing({ k: { src: 'K x.png' } }, { fetch, writeFile: async (f) => written.push(f), exists: () => false });
    assert.deepEqual(problems, []);
    assert.deepEqual(photos.k, { src: 'K x.png', f: 'photos/k.png', a: 'Ann Lee', l: 'CC BY-SA 4.0', u: 'https://commons.wikimedia.org/wiki/File:K_x.png', w: 900, h: 450 });
    assert.deepEqual(written, ['photos/k.png']);
});
