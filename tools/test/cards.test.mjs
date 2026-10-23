import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCard, validateCard } from '../lib/cards.mjs';
import { countWords } from '../lib/markdown.mjs';

const FILE = 'test/fixtures/cards/teres.md';
const TEXT = readFileSync(new URL('./fixtures/cards/teres.md', import.meta.url), 'utf8');
const ctx = { photos: new Set(['teres-mask.jpg']) };

function messages(card) {
    return validateCard(card, ctx).map((p) => p.message);
}

test('parsesTeresCard', () => {
    const card = parseCard(TEXT, FILE);
    assert.equal(card.id, 'teres');
    assert.equal(card.kind, 'person');
    assert.equal(card.paragraphs.length, 2);
    assert.ok(card.aliases.includes(card.title));
    assert.deepEqual(card.aliases, ['Терес', 'Терес Първи', 'Терес I']);
    assert.deepEqual(validateCard(card, ctx), []);
    card.paragraphs.forEach((p) => assert.ok(countWords(p) >= 50 && countWords(p) <= 90));
});

test('rejectsUnknownKind', () => {
    const card = parseCard(TEXT.replace('kind: person', 'kind: dragon'), FILE);
    assert.ok(messages(card).some((m) => m.includes('dragon')));
});

test('allowsOneParagraphForEvent', () => {
    const card = parseCard('---\nid: teres\nkind: event\ntitle: Събитие\n---\nКратко.\n', FILE);
    assert.deepEqual(validateCard(card, ctx), []);
});

test('rejectsMissingPhoto', () => {
    const card = parseCard(TEXT.replace('teres-mask.jpg', 'nope.jpg'), FILE);
    assert.ok(messages(card).some((m) => m.includes('nope.jpg')));
});

test('rejectsIdNotMatchingFile', () => {
    const card = parseCard(TEXT, 'content/cards/other.md');
    assert.ok(messages(card).some((m) => m.includes('other')));
});

test('rejectsMissingFieldsBadCoordinatesAndYears', () => {
    const card = parseCard('---\nat: [50, 40]\nyears: [10, 5]\n---\nКратко.\n', FILE);
    const found = messages(card);
    assert.ok(['id', 'kind', 'title'].every((f) => found.some((m) => m.includes(`"${f}"`))));
    assert.ok(found.some((m) => m.includes('at')));
    assert.ok(found.some((m) => m.includes('years')));
    assert.ok(found.some((m) => m.includes('paragraph')));
});

test('badYamlBecomesProblemNamingFile', () => {
    const card = parseCard('---\nid: [oops\n---\nТекст.\n', FILE);
    const problems = validateCard(card, ctx);
    assert.equal(problems[0].file, FILE);
});
