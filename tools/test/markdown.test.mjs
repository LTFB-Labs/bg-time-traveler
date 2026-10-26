import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords, renderMarkdown } from '../lib/markdown.mjs';

test('rendersBoldAndQuote', () => {
    const html = renderMarkdown('Един **важен** и *тих* ден.\n\n> „Ако имаха\n> владетел“ — казва той.\n\n- първо **а**\n- второ\n\n1. една\n2. две');
    assert.equal(
        html,
        '<p>Един <b>важен</b> и <i>тих</i> ден.</p>'
            + '<blockquote><p>„Ако имаха владетел“ — казва той.</p></blockquote>'
            + '<ul><li>първо <b>а</b></li><li>второ</li></ul>'
            + '<ol><li>една</li><li>две</li></ol>',
    );
});

test('escapesAngleBrackets', () => {
    assert.equal(renderMarkdown('a < b & c > <script>'), '<p>a &lt; b &amp; c &gt; &lt;script&gt;</p>');
});

test('countsCyrillicWords', () => {
    assert.equal(countWords('Ако имаха един владетел — казва той.'), 6);
    assert.equal(countWords('„Тракия“'), 1);
    assert.equal(countWords('по-късно'), 2);
});
