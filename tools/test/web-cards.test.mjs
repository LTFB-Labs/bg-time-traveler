import { test } from 'node:test';
import assert from 'node:assert/strict';
import { longestWord, postmarkText } from '../../modules/cards/cards.js';

test('postmarkTextPrefersTheCardsDates', () => {
    assert.equal(postmarkText({ dates: 'IV век пр.Хр.', years: [-400, -301] }), 'IV век пр.Хр.');
});

test('postmarkTextWritesTheYearsWhenThereAreNoDates', () => {
    assert.equal(postmarkText({ years: [917, 917] }), '917 г. сл.Хр.');
    assert.equal(postmarkText({ years: [1878.5, 1878.5] }), '1878 г.');
    assert.equal(postmarkText({ years: [-331, -300] }), '331 — 300 г. пр.Хр.');
});

test('postmarkTextFallsBackToTheGamesName', () => {
    assert.equal(postmarkText({}), 'Пътешествие във времето');
});

test('longestWordCountsTheTitlesLongestWord', () => {
    assert.equal(longestWord('Рогозенското съкровище'), 12);
    assert.equal(longestWord('Хан Кубрат и Стара Велика България'), 8);
});
