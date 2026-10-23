import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseLesson } from '../lib/lessons.mjs';
import { buildSearchIndex, normalize } from '../lib/search.mjs';

test('normalizeFoldsEndings', () => {
    assert.equal(normalize('Севтополиса'), normalize('Севтополис'));
    assert.equal(normalize('Тереса'), normalize('Терес'));
});

test('normalizeFoldsIKratko', () => {
    assert.equal(normalize('Йордан'), normalize('иордан'));
});

test('normalizeSplitsOnPunctuation', () => {
    assert.deepEqual(normalize('Тракия-Македония').split(' '), [normalize('Тракия'), normalize('Македония')]);
});

test('normalizeFoldsDefiniteEndings', () => {
    assert.equal(normalize('градът'), normalize('град'));
    assert.equal(normalize('царят'), normalize('цар'));
});

test('normalizeKeepsShortWords', () => {
    assert.equal(normalize('вода'), 'вода');
});

test('indexesCardsAndParts', () => {
    const card = { id: 'teres', kind: 'person', title: 'Терес I', aliases: ['Терес'], paragraphs: ['Цар на **одрисите**.'] };
    const event = { id: 'battle', kind: 'event', legacyKind: 'war', title: 'Битка', aliases: [], paragraphs: ['> Голяма битка.'] };
    const lesson = parseLesson(readFileSync(join(import.meta.dirname, 'fixtures/lessons/odrysae.md'), 'utf8'), 'odrysae.md');
    const index = buildSearchIndex({ cards: { teres: card, battle: event }, lessons: { [lesson.id]: lesson } });
    const cards = index.filter((entry) => entry.type === 'card');
    const parts = index.filter((entry) => entry.type === 'part');
    assert.equal(cards.length, 1);
    assert.equal(cards[0].title, 'Терес I');
    assert.ok(!cards[0].text.includes('*'));
    assert.equal(index.filter((entry) => entry.type === 'event').length, 1);
    assert.equal(parts.length, 2);
    assert.deepEqual(parts.map((p) => p.part), [1, 2]);
    assert.equal(parts[0].lesson, lesson.id);
    assert.equal(parts[0].id, `${lesson.id}#1`);
});
