import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    ghostFor,
    markersFromCards,
    photoBlock,
} from '../../js/lesson.js';
import { shortHeading } from '../../js/timeline.js';

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

const part = (type, borders) => ({ type, meta: { borders } });

test('ghostForIsPreviousStoryMainBorderWhenItChanges', () => {
    globalThis.GEO = { borders: { tribes: { kind: 'tribes' }, core: { kind: 'state' }, peak: { kind: 'state' } } };
    const lesson = { parts: [part('summary', ['peak']), part('story', ['tribes']), part('story', ['core', 'tribes']), part('story', ['peak']), part('story', ['peak'])] };
    assert.equal(ghostFor(lesson, 1), undefined);
    assert.equal(ghostFor(lesson, 2), undefined);
    assert.equal(ghostFor(lesson, 3), 'core');
    assert.equal(ghostFor(lesson, 4), undefined);
});

test('ghostForNoneWhenPartHasNoMainBorder', () => {
    globalThis.GEO = { borders: { tribes: { kind: 'tribes' }, seuthes: { kind: 'state' } } };
    const lesson = { parts: [part('story', ['seuthes']), part('story', ['tribes'])] };
    assert.equal(ghostFor(lesson, 1), undefined);
});

test('ghostForPrefersPartGhost', () => {
    globalThis.GEO = { borders: { core: { kind: 'state' }, peak: { kind: 'state' } } };
    const lesson = { parts: [part('story', ['core']), { type: 'story', meta: { borders: ['peak'], ghost: 'tribes' } }] };
    assert.equal(ghostFor(lesson, 1), 'tribes');
});

test('markersFromCardsSkipsCardsWithoutPlace', () => {
    globalThis.CONTENT = {
        cards: {
            teres: { id: 'teres', kind: 'person', title: 'Терес', at: [26, 42], photo: 'mask' },
            idea: { id: 'idea', kind: 'idea', title: 'Идея' },
        },
        photos: { mask: { f: 'photos/mask.png' } },
    };
    assert.deepEqual(markersFromCards(['teres', 'idea', 'missing']), [{ id: 'teres', at: [26, 42], kind: 'person', title: 'Терес', photo: 'photos/mask.png' }]);
});
