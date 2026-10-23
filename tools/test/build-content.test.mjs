import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildContent, renderContentJs } from '../build-content.mjs';

const root = join(import.meta.dirname, 'fixtures/content-ok');

test('buildsCompatibilityGlobals', () => {
    const { content, problems } = buildContent(root);
    assert.deepEqual(problems, []);
    assert.equal(content.cards.teres.title, 'Терес I');
    assert.equal(content.cards.teres.file, undefined);
    const text = renderContentJs(content);
    assert.match(text, /const EVENTS = \[/);
    assert.match(text, /"START":600/);
    assert.match(text, /const CONTENT = \{/);
});

test('reportsCardProblems', () => {
    const { problems } = buildContent(join(import.meta.dirname, 'fixtures/content-bad-photo'));
    assert.equal(problems.length, 1);
});
