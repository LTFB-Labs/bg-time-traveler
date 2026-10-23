import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildContent, renderContentJs } from '../build-content.mjs';

const root = join(import.meta.dirname, 'fixtures/content-ok');
const badRoot = join(import.meta.dirname, 'fixtures/content-bad');

test('buildsCompatibilityGlobals', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    assert.equal(content.cards.teres.title, 'Терес I');
    assert.equal(content.cards.teres.file, undefined);
    assert.ok(content.search.some((entry) => entry.type === 'card'));
    const text = renderContentJs(content);
    assert.match(text, /const EVENTS = \[/);
    assert.match(text, /"START":600/);
    assert.match(text, /const CONTENT = \{/);
});

test('reportsCardProblems', () => {
    const { problems } = buildContent(badRoot);
    assert.deepEqual(problems.map((p) => p.file), ['teres.md', 'lessons/5/test-lesson.md']);
});

test('buildsLessonWithLinkedTerms', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    const lesson = content.lessons['5-test'];
    const firstStory = lesson.parts.find((part) => part.type === 'story');
    assert.match(firstStory.html, /<b class="term" data-card="teres">Терес<\/b>/);
    assert.equal(lesson.file, undefined);
    const entry = { id: '5-test', file: 'test-lesson.md', state: 'ready', title: 'Тестов урок', number: 1, span: [-500, -300], map: 'balkans' };
    assert.deepEqual(content.grades['5'], [entry]);
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
