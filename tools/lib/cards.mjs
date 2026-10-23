import { basename } from 'node:path';
import { splitFrontMatter, splitParagraphs } from './frontmatter.mjs';
import { countWords } from './markdown.mjs';
import { problem } from './problems.mjs';

const KINDS = { person: 1, place: 1, object: 1, people: 1, idea: 1, event: 1, state: 1 };
const LON = [12, 42];
const LAT = [34, 49.5];
const WORDS = [50, 90];

export function parseCard(text, file) {
    try {
        const { meta, body } = splitFrontMatter(text);
        if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
            throw new Error('front matter must be a key/value map');
        }
        return buildCard(meta, splitParagraphs(body), file);
    } catch (error) {
        return { ...buildCard({}, [], file), parseError: error.message };
    }
}

function buildCard(meta, paragraphs, file) {
    const listed = Array.isArray(meta.aliases) ? meta.aliases.filter(isText) : [];
    const aliases = [...new Set([...listed, ...(isText(meta.title) ? [meta.title] : [])])];
    return { ...meta, file, aliases, rawAliases: meta.aliases, paragraphs };
}

export function validateCard(card, ctx) {
    if (card.parseError) {
        return [problem(card.file, `unreadable front matter: ${card.parseError}`)];
    }
    const rules = [requiredFields, textRules, kindRule, paragraphRules, photoRule, atRule, yearsRule, idRule];
    return rules.flatMap((rule) => rule(card, ctx).map((message) => problem(card.file, message)));
}

function requiredFields(card) {
    return ['id', 'kind', 'title'].filter((field) => !card[field]).map((field) => `missing required field "${field}"`);
}

function textRules(card) {
    const titleProblems = card.title === undefined || isText(card.title) ? [] : ['"title" must be text'];
    const aliasesOk = card.rawAliases === undefined || (Array.isArray(card.rawAliases) && card.rawAliases.every(isText));
    return aliasesOk ? titleProblems : [...titleProblems, '"aliases" must be a list of text'];
}

function isText(value) {
    return typeof value === 'string';
}

function kindRule(card) {
    return !card.kind || Object.hasOwn(KINDS, card.kind) ? [] : [`unknown kind "${card.kind}", expected one of ${Object.keys(KINDS).join(', ')}`];
}

function paragraphRules(card) {
    const isEvent = card.kind === 'event';
    const count = card.paragraphs.length;
    const countOk = count === 2 || (isEvent && count === 1);
    const countProblems = countOk ? [] : [`expected 2 paragraphs${isEvent ? ' (1 allowed for event)' : ''}, found ${count}`];
    return isEvent ? countProblems : [...countProblems, ...card.paragraphs.flatMap(wordProblems)];
}

function wordProblems(paragraph, i) {
    const words = countWords(paragraph);
    return words >= WORDS[0] && words <= WORDS[1] ? [] : [`paragraph ${i + 1} has ${words} words, expected ${WORDS[0]} to ${WORDS[1]}`];
}

function photoRule(card, ctx) {
    return !card.photo || ctx.photos.has(card.photo) ? [] : [`photo "${card.photo}" not found`];
}

function atRule(card) {
    const at = card.at;
    if (at === undefined) {
        return [];
    }
    const valid = Array.isArray(at) && at.length === 2 && inRange(at[0], LON) && inRange(at[1], LAT);
    return valid ? [] : [`"at" must be [lon, lat] within ${LON[0]}..${LON[1]} and ${LAT[0]}..${LAT[1]}`];
}

function yearsRule(card) {
    const years = card.years;
    if (years === undefined) {
        return [];
    }
    const valid = Array.isArray(years) && years.length === 2 && years.every(Number.isFinite) && years[0] <= years[1];
    return valid ? [] : ['"years" must be [a, b] with a <= b'];
}

function idRule(card) {
    const name = basename(card.file, '.md');
    return !card.id || card.id === name ? [] : [`id "${card.id}" does not match file name "${name}"`];
}

function inRange(value, [min, max]) {
    return Number.isFinite(value) && value >= min && value <= max;
}
