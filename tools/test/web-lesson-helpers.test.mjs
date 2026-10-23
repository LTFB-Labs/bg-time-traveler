import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    photoBlock,
    shortHeading,
} from '../../js/lesson.js';

test('shortHeadingCutsAtDash', () => {
    assert.equal(shortHeading('Ситалк — царството в разцвет'), 'Ситалк');
    assert.equal(shortHeading('Кои са траките'), 'Кои са траките');
});

test('shortHeadingCutsLongHeadingAtWord', () => {
    assert.equal(shortHeading('Терес създава царството на одрисите'), 'Терес създава царството');
});

test('photoBlockWithoutPhoto', () => {
    assert.match(photoBlock(null), /class="noimg"/);
});

test('photoBlockWithPhoto', () => {
    const html = photoBlock({ f: 'photos/x.jpg', a: 'A', l: 'CC0', u: 'https://u' });
    assert.match(html, /photos\/x\.jpg/);
    assert.match(html, /Снимка:/);
});
