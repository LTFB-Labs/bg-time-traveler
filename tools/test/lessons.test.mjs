import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLesson, renderLesson, validateLesson } from '../lib/lessons.mjs';

const read = (name) => readFileSync(new URL(`./fixtures/lessons/${name}.md`, import.meta.url), 'utf8');
const card = (id) => ({ id, aliases: [id], file: `cards/${id}.md` });
const ids = ['troy', 'odrysae', 'teres', 'philip-ii', 'seuthes-iii'];
const ctx = (extra = {}) => ({
    cards: new Map(ids.map((id) => [id, card(id)])),
    borders: new Set(['thrace-tribes', 'odrysae-peak', 'ghost-b']),
    photos: new Set(['thracian-horseman.jpg']),
    minParts: 2,
    ...extra,
});
const check = (text, extra) => validateLesson(parseLesson(text, 'odrysae.md'), ctx(extra));
const words = (n) => Array.from({ length: n }, () => 'дума').join(' ');

test('splitsPartsAndMeta', () => {
    const lesson = parseLesson(read('odrysae'), 'odrysae.md');
    assert.deepEqual(lesson.parts.map((p) => p.type), ['summary', 'story', 'story', 'check']);
    assert.equal(lesson.parts[1].meta.year, -1200);
    assert.equal(lesson.parts[1].heading, 'Кои са траките');
    assert.match(lesson.parts[1].fact, /^древните хора/);
    assert.equal(lesson.parts[1].paragraphs.length, 3);
    assert.deepEqual(check(read('odrysae')), []);
});

test('acceptsLabelInsteadOfYear', () => {
    const lesson = parseLesson(read('deep-time'), 'deep-time.md');
    assert.equal(lesson.strip, false);
    assert.deepEqual(validateLesson(lesson, ctx({ minParts: 1 })), []);
});

test('rejectsUnknownPartKey', () => {
    const problems = check(read('odrysae').replace('year: -341', 'year: -341\ncolour: red'));
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /colour/);
    assert.match(problems[0].message, /Филип II завладява Тракия/);
});

test('reportsMissingReferences', () => {
    const text = read('odrysae').replace('borders: [thrace-tribes]', 'borders: [nowhere]').replace('marks: [troy, odrysae]\nphoto', 'marks: [ghosttown]\nphoto');
    const messages = check(text).map((p) => p.message).join('\n');
    assert.match(messages, /nowhere/);
    assert.match(messages, /ghosttown/);
});

test('enforcesWordBudget', () => {
    const lesson = parseLesson(read('odrysae'), 'odrysae.md');
    const withParagraph = (text) => ({ ...lesson, parts: lesson.parts.map((p, i) => (i === 1 ? { ...p, paragraphs: [text, ...p.paragraphs.slice(1)] } : p)) });
    assert.match(validateLesson(withParagraph(words(120)), ctx()).map((p) => p.message).join('\n'), /120 words/);
    const stories = lesson.parts.filter((p) => p.type === 'story');
    const many = Array.from({ length: 8 }, (_, i) => ({ ...stories[i % 2], paragraphs: stories[0].paragraphs.map(() => words(100)) }));
    const big = { ...lesson, parts: [lesson.parts[0], ...many, lesson.parts.at(-1)] };
    assert.match(validateLesson(big, ctx()).map((p) => p.message).join('\n'), /1800/);
});

test('validatesCheckQuestions', () => {
    const problems = check(read('odrysae').replace('    at: [25.33, 42.62]\n', ''));
    assert.ok(problems.some((p) => /tap/.test(p.message) && /at/.test(p.message)));
});

test('rendersHtmlAndLinksTerms', () => {
    const lesson = parseLesson(read('odrysae'), 'odrysae.md');
    const out = renderLesson(lesson, new Map([['траките', 'thracians']]));
    assert.match(out.parts[1].html, /<b class="term" data-card="thracians">траките<\/b>/);
    assert.match(out.parts[1].factHtml, /^<p>/);
    assert.equal(lesson.parts[1].html, undefined);
});

test('requiresCheckQuestions', () => {
    const problems = check(read('odrysae').replace(/<!-- part: check -->\nquestions:[\s\S]*$/, '<!-- part: check -->\n'));
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /Проверка/);
    assert.match(problems[0].message, /5 to 7/);
});

test('checksSpanWhenAnotherKeyIsMissing', () => {
    const noTitle = read('odrysae').replace(/^title: .*\n/m, '');
    assert.deepEqual(check(noTitle).map((p) => p.message), ['front matter is missing title']);
    const messages = check(noTitle.replace('span: [-1300, -250]', 'span: [5, 2]')).map((p) => p.message);
    assert.ok(messages.includes('span must start before it ends'));
});

test('stripsFactPrefixWithThreeDots', () => {
    const lesson = parseLesson(read('odrysae').replace('Знаеш ли, че…', 'Знаеш ли, че...'), 'odrysae.md');
    assert.match(lesson.parts[1].fact, /^древните хора/);
});
