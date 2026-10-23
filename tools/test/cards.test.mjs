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
    assert.ok(found.some((m) => m.includes('"at"')));
    assert.ok(found.some((m) => m.includes('years')));
    assert.ok(found.some((m) => m.includes('expected 2 paragraphs')));
});

test('badYamlBecomesProblemNamingFile', () => {
    const card = parseCard('---\nid: [oops\n---\nТекст.\n', FILE);
    const problems = validateCard(card, ctx);
    assert.equal(problems[0].file, FILE);
});

test('rejectsNonMapFrontMatter', () => {
    ['- a\n- b', 'just text'].forEach((yaml) => {
        const problems = validateCard(parseCard(`---\n${yaml}\n---\nТекст.\n`, FILE), ctx);
        assert.equal(problems.length, 1);
        assert.ok(problems[0].message.includes('key/value map'));
    });
});

test('rejectsAliasesThatAreNotAList', () => {
    const card = parseCard(TEXT.replace(/aliases: .*/, 'aliases: foo'), FILE);
    assert.deepEqual(card.aliases, ['Терес I']);
    assert.ok(messages(card).some((m) => m.includes('"aliases" must be a list')));
});

test('rejectsNonTextTitleAndKindConstructor', () => {
    const card = parseCard(TEXT.replace('title: Терес I', 'title: 5').replace('kind: person', 'kind: constructor'), FILE);
    assert.ok(!card.aliases.includes(5));
    assert.ok(messages(card).some((m) => m.includes('"title" must be text')));
    assert.ok(messages(card).some((m) => m.includes('unknown kind "constructor"')));
});
