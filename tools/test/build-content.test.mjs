import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { buildContent, renderContentJs } from '../build-content.mjs';

const root = join(import.meta.dirname, 'fixtures/content-ok');
const badRoot = join(import.meta.dirname, 'fixtures/content-bad');

test('buildsCompatibilityGlobals', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    assert.equal(content.cards.teres.title, 'Терес I');
    assert.equal(content.cards.teres.file, undefined);
    assert.match(content.cards.teres.html, /^<p>Терес е първият .*<\/p>\n<p>Знаеш ли/);
    assert.ok(content.search.some((entry) => entry.type === 'card'));
    const text = renderContentJs(content);
    assert.match(text, /const EVENTS = \[/);
    assert.match(text, /"START":600/);
    assert.match(text, /const CONTENT = \{/);
});

test('reportsCardProblems', () => {
    const { problems } = buildContent(badRoot);
    assert.deepEqual(problems.map((p) => p.file), ['cards/teres.md', 'lessons/5/test-lesson.md']);
});

test('buildsLessonWithLinkedTerms', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    const lesson = content.lessons['5-test'];
    const firstStory = lesson.parts.find((part) => part.type === 'story');
    assert.match(firstStory.html, /<b class="term" data-card="teres">Терес<\/b>/);
    assert.equal(lesson.file, undefined);
    const entry = { id: '5-test', state: 'ready', title: 'Тестов урок', number: 1, span: [-500, -300], map: 'balkans' };
    assert.deepEqual(content.grades['5'], [entry]);
    assert.equal(content.grades['5'][0].file, undefined);
    assert.ok(content.search.some((entry) => entry.type === 'part' && entry.lesson === '5-test'));
});

test('reportsIndexIdThatDiffersFromLesson', () => {
    const copy = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(root, copy, { recursive: true });
    writeFileSync(join(copy, 'content/lessons/5/index.json'), '[{ "id": "5-other", "file": "test-lesson.md", "state": "ready" }]');
    const { problems } = buildContent(copy);
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /5-other/);
});

test('cliExitsOnError', () => {
    const run = spawnSync(process.execPath, ['build-content.mjs', '--root', 'test/fixtures/content-bad'], { cwd: join(import.meta.dirname, '..'), encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /no-such-photo/);
    assert.match(run.stderr, /no-such-border/);
});

test('readsCardWithBomAndCrlf', () => {
    const card = readFileSync(join(root, 'content/cards/teres.md'), 'utf8');
    const { content, problems } = buildContent(copyOkWith({ 'content/cards/teres.md': '\uFEFF' + card.replaceAll('\n', '\r\n') }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.cards.teres, buildContent(root).content.cards.teres);
});

test('readsLessonWithCrlf', () => {
    const lesson = readFileSync(join(root, 'content/lessons/5/test-lesson.md'), 'utf8');
    const { content, problems } = buildContent(copyOkWith({ 'content/lessons/5/test-lesson.md': lesson.replaceAll('\n', '\r\n') }));
    assert.deepEqual(problems, []);
    assert.deepEqual(content.lessons['5-test'], buildContent(root).content.lessons['5-test']);
});

test('reportsBadPhotoEntries', () => {
    const cases = [
        [{ l: 'CC0' }, /no "f"/],
        [{ f: 'photos/Teres-Mask.jpg', l: 'CC0' }, /"photos\/Teres-Mask\.jpg" is not in photos/],
        [{ f: 'photos/teres-mask.jpg', l: 'CC BY-NC 4.0' }, /licence "CC BY-NC 4\.0"/],
    ];
    for (const [entry, expected] of cases) {
        const { problems } = buildContent(copyOkWith({ 'content/photos.json': JSON.stringify({ 'teres-mask.jpg': entry }) }));
        assert.deepEqual(problems.map((p) => p.file), ['photos.json']);
        assert.match(problems[0].message, expected);
    }
});

test('reportsUnlistedLessonsAndGradeWithoutIndex', () => {
    const { content, problems } = buildContent(copyOkWith({ 'content/lessons/5/draft.md': 'чернова', 'content/lessons/6/first.md': 'чернова' }));
    assert.deepEqual(problems.map((p) => p.file), ['lessons/5/draft.md', 'lessons/6/index.json', 'lessons/6/first.md']);
    assert.match(problems[0].message, /not listed in lessons\/5\/index\.json/);
    assert.match(problems[1].message, /missing/);
    assert.deepEqual(Object.keys(content.lessons), ['5-test']);
});

test('reportsUnreadableJsonByFileName', () => {
    const { problems } = buildContent(copyOkWith({ 'content/photos.json': '{ "teres-mask.jpg": { "f": "photos/teres-mask.jpg" "l": "CC0" } }' }));
    assert.equal(problems[0].file, 'photos.json');
    assert.match(problems[0].message, /cannot read: .*JSON/);
});

function copyOkWith(files) {
    const copy = mkdtempSync(join(tmpdir(), 'content-'));
    cpSync(root, copy, { recursive: true });
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(copy, path)), { recursive: true });
        writeFileSync(join(copy, path), text);
    }
    return copy;
}
