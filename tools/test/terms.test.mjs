import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAliasIndex, linkTerms } from '../lib/terms.mjs';

const card = (id, aliases) => ({ id, aliases, file: `cards/${id}.md` });
const { index } = buildAliasIndex([card('thracians', ['траки', 'Тракия'])]);

test('linksWholeBoldTerm', () => {
    assert.equal(linkTerms('<p><b>траки</b> и <b> Тракия </b></p>', index), '<p><b class="term" data-card="thracians">траки</b> и <b class="term" data-card="thracians"> Тракия </b></p>');
});

test('linksOnlyWholeTerms', () => {
    assert.equal(linkTerms('<b>тракийски</b>', index), '<b>тракийски</b>');
    assert.equal(linkTerms('<b>траки</b>', index), '<b class="term" data-card="thracians">траки</b>');
});

test('leavesUnknownBold', () => {
    assert.equal(linkTerms('<b>друго</b> <i>траки</i>', index), '<b>друго</b> <i>траки</i>');
});

test('reportsDuplicateAlias', () => {
    const result = buildAliasIndex([card('a', ['x']), card('b', ['x']), card('a', ['x'])]);
    assert.equal(result.index.get('x'), 'a');
    assert.equal(result.problems.length, 1);
    assert.equal(result.problems[0].file, 'cards/b.md');
    assert.match(result.problems[0].message, /"x".*cards\/a\.md.*cards\/b\.md/);
});
