import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFigures } from '../lib/figures.mjs';

const fixture = (name) => join(import.meta.dirname, 'fixtures', name);
const bad = readFigures(fixture('figures-bad'));

test('readsBodyWithoutFill', () => {
    const { figures, problems } = readFigures(fixture('figures-ok'));
    assert.deepEqual(problems, []);
    assert.equal(figures.army.viewBox, '0 0 512 512');
    assert.match(figures.army.body, /^<path d="M0 0h10v10z"\/>/);
    assert.doesNotMatch(figures.army.body, /fill=/);
});

test('figureWithoutCreditIsAProblem', () => {
    assert.ok(bad.problems.some((p) => p.file === 'figures/army.svg' && /figures\.json/.test(p.message)));
});

test('creditWithoutFileIsAProblem', () => {
    assert.ok(bad.problems.some((p) => p.file === 'figures.json' && /"ship"/.test(p.message)));
});

test('creditWithoutLicenceIsAProblem', () => {
    assert.ok(bad.problems.some((p) => p.file === 'figures.json' && /"riders".*"l"/.test(p.message)));
});

test('scriptElementInAFigureIsAProblem', () => {
    const { problems } = readFigures(fixture('figures-script'));
    assert.ok(problems.some((p) => p.file === 'figures/army.svg' && /script/.test(p.message)));
});

test('onAttributeInAFigureIsAProblem', () => {
    const { problems } = readFigures(fixture('figures-onload'));
    assert.ok(problems.some((p) => p.file === 'figures/army.svg' && /onload/.test(p.message)));
});
