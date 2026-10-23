import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { problem } from './problems.mjs';

const CREDIT_FIELDS = ['a', 'l', 'u'];
const SVG = /<svg\b[^>]*?\bviewBox="([^"]*)"[^>]*>([\s\S]*)<\/svg>/;
const FILL = /\s+fill=("[^"]*"|'[^']*')/g;

// Reads the route figures in <dir>/figures/*.svg and their credits in <dir>/figures.json.
// Fills are dropped so the page colours the figures; a missing folder or credits file reads as empty.
export function readFigures(dir) {
    const credits = readCredits(join(dir, 'figures.json'));
    const files = readSvgFiles(join(dir, 'figures'));
    const figures = Object.fromEntries(files.flatMap(({ id, text }) => figureEntry(id, text)));
    const unreadable = files.filter(({ id }) => !figures[id]).map(({ id }) => problem(`figures/${id}.svg`, 'is not an SVG with a viewBox'));
    return { figures, problems: [...credits.problems, ...unreadable, ...creditProblems(credits.value, files.map(({ id }) => id))] };
}

function readCredits(file) {
    if (!existsSync(file)) {
        return { value: {}, problems: [] };
    }
    try {
        return { value: JSON.parse(readFileSync(file, 'utf8')), problems: [] };
    } catch (error) {
        return { value: {}, problems: [problem('figures.json', `cannot read: ${error.message}`)] };
    }
}

function readSvgFiles(folder) {
    const names = existsSync(folder) ? readdirSync(folder).filter((name) => name.endsWith('.svg')).sort() : [];
    return names.map((name) => ({ id: basename(name, '.svg'), text: readFileSync(join(folder, name), 'utf8') }));
}

function figureEntry(id, text) {
    const match = SVG.exec(text);
    return match ? [[id, { viewBox: match[1], body: match[2].replace(FILL, '').trim() }]] : [];
}

function creditProblems(credits, ids) {
    const withoutCredit = ids.filter((id) => !Object.hasOwn(credits, id)).map((id) => problem(`figures/${id}.svg`, 'has no entry in figures.json'));
    const withoutFile = Object.keys(credits).filter((id) => !ids.includes(id)).map((id) => problem('figures.json', `"${id}" has no file figures/${id}.svg`));
    return [...withoutCredit, ...withoutFile, ...Object.entries(credits).flatMap(incompleteCredit)];
}

function incompleteCredit([id, credit]) {
    return CREDIT_FIELDS.filter((field) => !credit?.[field]).map((field) => problem('figures.json', `"${id}" is missing "${field}"`));
}
