import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtSpan, fmtYear } from '../../js/years.js';

test('fmtYearBc', () => {
    assert.equal(fmtYear({ year: -480 }), '480 г. пр.Хр.');
    assert.equal(fmtYear({ year: -480, approx: true }), 'ок. 480 г. пр.Хр.');
});

test('fmtYearAd', () => {
    assert.equal(fmtYear({ year: 46 }), '46 г. сл.Хр.');
    assert.equal(fmtYear({ year: 1396 }), '1396 г.');
    assert.equal(fmtYear({ year: 0 }), '1 г. сл.Хр.');
});

test('fmtYearDeepTime', () => {
    assert.equal(fmtYear({ year: -40000 }), 'преди 42000 години');
    assert.equal(fmtYear({ year: -1400000 }), 'преди 1400000 години');
    assert.equal(fmtYear({ year: -1403000 }), 'преди 1410000 години');
});

test('fmtYearPrefersLabel', () => {
    assert.equal(fmtYear({ year: -1200, label: 'преди 40 000 години' }), 'преди 40 000 години');
});

test('fmtSpanBothBc', () => {
    assert.equal(fmtSpan([-1300, -250]), '1300 — 250 г. пр.Хр.');
});

test('fmtSpanMixed', () => {
    assert.equal(fmtSpan([46, 681]), '46 — 681 г. сл.Хр.');
    assert.equal(fmtSpan([46, 1396]), '46 г. сл.Хр. — 1396 г.');
    assert.equal(fmtSpan([-100, 46]), '100 г. пр.Хр. — 46 г. сл.Хр.');
});
