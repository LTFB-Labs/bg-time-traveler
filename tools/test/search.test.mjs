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

const balkans = (RULERS, CITIES) => ({ balkans: { RULERS, CITIES, END: 2026 } });

test('indexesRulers', () => {
    const index = buildSearchIndex({ cards: {}, lessons: {}, maps: balkans([[893, 927, 'цар', 'Симеон Велики'], [1954, 1989, 'водач', 'Тодор Живков']], []) });
    assert.deepEqual(index.map(({ text, ...entry }) => entry), [
        { type: 'ruler', id: 'ruler-0', title: 'цар Симеон Велики', date: '893–927', year: 893 },
        { type: 'ruler', id: 'ruler-1', title: 'Тодор Живков', date: '1954–1989', year: 1954 },
    ]);
    assert.ok(index[1].text.includes(normalize('водач')));
});

test('indexesEveryNameOfACity', () => {
    const CITIES = [{ at: [25.6, 43.1], n: [[1185, 1965, 'Търново'], [1965, 2027, 'Велико Търново']] }];
    const index = buildSearchIndex({ cards: {}, lessons: {}, maps: balkans([], CITIES) });
    assert.deepEqual(index.map(({ text, ...entry }) => entry), [
        { type: 'place', id: 'place-0-0', title: 'Търново', date: '1185–1965', year: 1185, city: 0 },
        { type: 'place', id: 'place-0-1', title: 'Велико Търново', date: '1965–днес', year: 1965, city: 0 },
    ]);
});

test('eventEntryKeepsExactYear', () => {
    const botev = { id: 'botev', kind: 'event', legacyKind: 'war', title: 'Ботев', years: [1876.4], aliases: [], paragraphs: ['Четата.'] };
    const [entry] = buildSearchIndex({ cards: { botev }, lessons: {} });
    assert.equal(entry.year, 1876.4);
    assert.equal(entry.date, '1876 г.');
});

test('cardEntryPointsToItsFirstStoryPart', () => {
    const lesson = parseLesson(readFileSync(join(import.meta.dirname, 'fixtures/lessons/odrysae.md'), 'utf8'), 'odrysae.md');
    const troy = { id: 'troy', kind: 'place', title: 'Троя', dates: 'ок. 1200 г. пр.Хр.', aliases: [], paragraphs: ['Град.'] };
    const athens = { id: 'athens', kind: 'place', title: 'Атина', aliases: [], paragraphs: ['Град.'] };
    const index = buildSearchIndex({ cards: { troy, athens }, lessons: { [lesson.id]: lesson } });
    const card = (id) => index.find((entry) => entry.id === id);
    assert.deepEqual([card('troy').lesson, card('troy').part, card('troy').date], ['5-odrisko-tsarstvo', 1, 'ок. 1200 г. пр.Хр.']);
    assert.deepEqual([card('athens').lesson, card('athens').part, card('athens').date], [undefined, undefined, '']);
    assert.equal(index.find((entry) => entry.type === 'part').date, 'Урок 26');
});

test('cardOnlyInAFactPointsToItsPart', () => {
    const part = (type, factHtml = '') => ({ type, heading: 'Част', meta: {}, paragraphs: ['Текст.'], html: '<p>Текст.</p>', factHtml });
    const lesson = { id: '5-test', number: 1, title: 'Урок', parts: [part('summary'), part('story'), part('story', '<b class="term" data-card="rhyton">Ритон</b>')] };
    const rhyton = { id: 'rhyton', kind: 'object', title: 'Ритон', aliases: [], paragraphs: ['Съд.'] };
    const [entry] = buildSearchIndex({ cards: { rhyton }, lessons: { [lesson.id]: lesson } });
    assert.deepEqual([entry.lesson, entry.part], ['5-test', 2]);
});

test('rulerReigningTodayEndsToday', () => {
    const [entry] = buildSearchIndex({ cards: {}, lessons: {}, maps: balkans([[2026, 2027, 'президент', 'Илияна Йотова']], []) });
    assert.equal(entry.date, '2026–днес');
});
