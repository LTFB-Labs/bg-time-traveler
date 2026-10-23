import YAML from 'yaml';
import { splitFrontMatter, splitParagraphs } from './frontmatter.mjs';
import { countWords, renderMarkdown } from './markdown.mjs';
import { linkTerms } from './terms.mjs';
import { problem } from './problems.mjs';
import { isIndexIn, isMap, isNumberPair, isText, validateQuestions } from './questions.mjs';

const STORY_KEYS = ['year', 'approx', 'label', 'box', 'borders', 'ghost', 'marks', 'path', 'move', 'photo', 'words', 'next', 'predict'];
const KEYS = { story: STORY_KEYS, summary: [...STORY_KEYS, 'lead', 'goals', 'names'], check: ['questions'] };
const REQUIRED = ['id', 'grade', 'number', 'title', 'map', 'span', 'eras'];
const PARAGRAPHS = [3, 4];
const PARAGRAPH_WORDS = [40, 110];
const TOTAL_WORDS = 1800;
const MAX_PARTS = 8;
const MIN_PARTS = 6;
const PART_COMMENT = /^<!--\s*part:\s*(summary|check)\s*-->$/;
const FACT_PREFIX = /^Знаеш ли, че(…|\.\.\.)\s*/;

// ---------- parsing ----------

export function parseLesson(text, file) {
    try {
        const { meta, body } = splitFrontMatter(text);
        const { strip = true, ...rest } = isMap(meta) ? meta : {};
        return { ...rest, strip, parts: parseParts(body), file, ...(isMap(meta) ? {} : { parseError: 'front matter must be a key/value map' }) };
    } catch (error) {
        return { strip: true, parts: [], file, parseError: error.message };
    }
}

function parseParts(body) {
    return body.split(/^## /m).slice(1).map(parsePart);
}

function parsePart(chunk) {
    const [heading, ...lines] = chunk.split('\n');
    const type = PART_COMMENT.exec(lines[0]?.trim())?.[1];
    const rest = type ? lines.slice(1) : lines;
    const blank = rest.findIndex((line) => line.trim() === '');
    const yamlLines = blank === -1 ? rest : rest.slice(0, blank);
    const bodyLines = blank === -1 ? [] : rest.slice(blank);
    return { type: type ?? 'story', heading: heading.trim(), ...readMeta(yamlLines.join('\n')), ...readBody(bodyLines.join('\n')) };
}

function readMeta(text) {
    try {
        const meta = YAML.parse(text) ?? {};
        return isMap(meta) ? { meta } : { meta: {}, parseError: 'part block must be a key/value map' };
    } catch (error) {
        return { meta: {}, parseError: error.message };
    }
}

function readBody(body) {
    const blocks = splitParagraphs(body);
    const first = blocks.findIndex(isQuote);
    if (first === -1) {
        return { paragraphs: blocks };
    }
    return { paragraphs: blocks.filter((_, i) => i !== first), fact: unquote(blocks[first]) };
}

const isQuote = (block) => block.startsWith('> ');

function unquote(block) {
    return block.split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n').trim().replace(FACT_PREFIX, '').trim();
}

// ---------- validation ----------

export function validateLesson(lesson, ctx) {
    if (lesson.parseError) {
        return [problem(lesson.file, `cannot read front matter: ${lesson.parseError}`)];
    }
    const messages = [
        ...frontMatterProblems(lesson),
        ...structureProblems(lesson.parts, ctx),
        ...lesson.parts.flatMap((part) => partProblems(part, lesson, ctx)),
        ...totalWordsProblems(lesson),
    ];
    return messages.map((message) => problem(lesson.file, message));
}

function frontMatterProblems(lesson) {
    const missing = REQUIRED.filter((key) => lesson[key] === undefined).map((key) => `front matter is missing ${key}`);
    return [...missing, ...spanProblems(lesson), ...eraProblems(lesson)];
}

function spanProblems(lesson) {
    if (lesson.span === undefined) {
        return [];
    }
    if (!isNumberPair(lesson.span)) {
        return ['span must be [from, to]'];
    }
    return lesson.span[0] < lesson.span[1] ? [] : ['span must start before it ends'];
}

function eraProblems(lesson) {
    if (lesson.eras === undefined || !isNumberPair(lesson.span)) {
        return [];
    }
    if (!Array.isArray(lesson.eras)) {
        return ['eras must be a list'];
    }
    const [from, to] = lesson.span;
    return lesson.eras.filter((era) => !(Array.isArray(era) && era[0] >= from && era[1] <= to && era[0] < era[1])).map((era) => `era ${JSON.stringify(era)} must lie inside span`);
}

function structureProblems(parts, ctx) {
    const stories = parts.filter((part) => part.type === 'story').length;
    const [min, max] = [ctx.minParts ?? MIN_PARTS, ctx.maxParts ?? MAX_PARTS];
    const shape = parts.filter((part) => part.type !== 'story');
    const ok = parts[0]?.type === 'summary' && parts.at(-1)?.type === 'check' && shape.length === 2;
    return [...(ok ? [] : ['lesson needs one summary first and one check last']), ...(stories >= min && stories <= max ? [] : [`lesson needs ${min} to ${max} story parts, has ${stories}`])];
}

function partProblems(part, lesson, ctx) {
    const label = `part "${part.heading}"`;
    const messages = part.parseError
        ? [`cannot read the key block: ${part.parseError}`]
        : [...keyProblems(part, ctx, storyCount(lesson)), ...(part.type === 'story' ? storyProblems(part) : [])];
    return messages.map((message) => `${label}: ${message}`);
}

const storyCount = (lesson) => lesson.parts.filter((part) => part.type === 'story').length;

function keyProblems(part, ctx, count) {
    const known = KEYS[part.type];
    const unknown = Object.keys(part.meta).filter((key) => !known.includes(key)).map((key) => `unknown key ${key}`);
    const bad = Object.entries(part.meta).filter(([key]) => known.includes(key)).flatMap(([key, value]) => keyCheck(key, value, part, ctx, count));
    const missing = part.type === 'story' && part.meta.year === undefined && part.meta.label === undefined ? ['needs year or label'] : [];
    const questions = part.type === 'check' && part.meta.questions === undefined ? validateQuestions(undefined, ctx, count) : [];
    return [...unknown, ...bad, ...missing, ...questions];
}

function keyCheck(key, value, part, ctx, count) {
    if (key === 'questions') {
        return validateQuestions(value, ctx, count);
    }
    const message = KEY_RULES[key](value, ctx, part);
    return message ? [`${key} ${message}`] : [];
}

const isList = Array.isArray;
const unknownIds = (ids, known) => ids.filter((id) => !known.has(id));
const idList = (what, source) => (value, ctx) => {
    if (!isList(value)) {
        return 'must be a list of ids';
    }
    const unknown = unknownIds(value, ctx[source]);
    return unknown.length > 0 ? `has unknown ${what} id ${unknown.join(', ')}` : '';
};
const text = (value) => (isText(value) ? '' : 'must be text');

const KEY_RULES = {
    year: (value, _ctx, part) => (Number.isInteger(value) || (part.type === 'summary' && value === 'span') ? '' : 'must be an integer'),
    approx: (value) => (typeof value === 'boolean' ? '' : 'must be true or false'),
    label: text,
    box: (value) => (isBox(value) ? '' : 'must be [west, south, east, north] with west < east and south < north'),
    borders: idList('border', 'borders'),
    ghost: (value, ctx) => (value === 'none' || ctx.borders.has(value) ? '' : `has unknown border id ${value}`),
    marks: idList('card', 'cards'),
    names: idList('card', 'cards'),
    path: (value) => (isList(value) && value.length >= 2 && value.every(isNumberPair) ? '' : 'must be a list of at least 2 [lon, lat] pairs'),
    move: moveProblem,
    photo: (value, ctx) => (ctx.photos.has(value) ? '' : `has unknown photo ${value}`),
    words: (value) => (isList(value) && value.every((entry) => isMap(entry) && Object.keys(entry).length === 1) ? '' : 'must be a list of one-key maps'),
    next: text,
    lead: text,
    goals: (value) => (isList(value) && value.every(isText) ? '' : 'must be a list of texts'),
    predict: predictProblem,
};

function isBox(value) {
    return isList(value) && value.length === 4 && value.every(Number.isFinite) && value[0] < value[2] && value[1] < value[3];
}

// a figure that rides the part's route arrow
function moveProblem(value, ctx, part) {
    if (part.meta.path === undefined) {
        return 'needs a path in the same part';
    }
    return ctx.figures.has(value) ? '' : `has unknown figure ${value}`;
}

function predictProblem(value) {
    if (!isMap(value) || !isText(value.q) || !isText(value.reveal)) {
        return 'needs q and reveal';
    }
    const options = value.options;
    if (!isList(options) || options.length !== 3 || !options.every(isText)) {
        return 'needs options: 3 texts';
    }
    return isIndexIn(value.answer, options) ? '' : 'needs answer: an index inside options';
}

function storyProblems(part) {
    const quotes = part.paragraphs.filter(isQuote).length;
    const paragraphs = part.paragraphs.filter((block) => !isQuote(block));
    const [min, max] = PARAGRAPHS;
    return [
        ...(paragraphs.length >= min && paragraphs.length <= max ? [] : [`needs ${min} or ${max} paragraphs, has ${paragraphs.length}`]),
        ...paragraphs.map(countWords).filter(outsideWordBand).map((n) => `a paragraph has ${n} words, allowed ${PARAGRAPH_WORDS[0]} to ${PARAGRAPH_WORDS[1]}`),
        ...(part.fact === undefined || quotes > 0 ? [`needs exactly one fact quote, has ${part.fact === undefined ? 0 : 1 + quotes}`] : []),
    ];
}

const outsideWordBand = (n) => n < PARAGRAPH_WORDS[0] || n > PARAGRAPH_WORDS[1];

function totalWordsProblems(lesson) {
    const total = lesson.parts.filter((part) => part.type === 'story').flatMap((part) => part.paragraphs).reduce((sum, block) => sum + countWords(block), 0);
    return total > TOTAL_WORDS ? [`story text has ${total} words, allowed at most ${TOTAL_WORDS}`] : [];
}

// ---------- rendering ----------

export function renderLesson(lesson, aliasIndex) {
    const render = (markdown) => linkTerms(renderMarkdown(markdown), aliasIndex);
    const parts = lesson.parts.map((part) => ({
        ...part,
        html: part.paragraphs.map(render).join('\n'),
        ...(part.fact === undefined ? {} : { factHtml: render(part.fact) }),
    }));
    return { ...lesson, parts };
}
