import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitFrontMatter, splitParagraphs } from '../lib/frontmatter.mjs';

test('parsesYamlMeta', () => {
    const { meta, body } = splitFrontMatter('---\ntitle: Хан Аспарух\ntags:\n  - state\n  - war\nnested:\n  list: [1, 2]\n---\nПърви ред.\n\nВтори ред.\n');
    assert.deepEqual(meta, { title: 'Хан Аспарух', tags: ['state', 'war'], nested: { list: [1, 2] } });
    assert.equal(body.trim(), 'Първи ред.\n\nВтори ред.');
});

test('noFrontMatterGivesEmptyMeta', () => {
    const { meta, body } = splitFrontMatter('Само текст.\n');
    assert.deepEqual(meta, {});
    assert.equal(body, 'Само текст.\n');
});

test('splitsParagraphsOnBlankLines', () => {
    assert.deepEqual(splitParagraphs('  един\nдва \n\n\n\nтри\n\n  \n'), ['един\nдва', 'три']);
});
