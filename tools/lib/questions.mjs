const TYPES = ['tap', 'order', 'pick-border', 'choose', 'match'];
const COUNT = [5, 7];
const ORDER_ITEMS = [3, 5];

export const isText = (value) => typeof value === 'string' && value.trim() !== '';
export const isMap = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export const isNumberPair = (value) => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
export const isIndexIn = (value, list) => Number.isInteger(value) && value >= 0 && value < list.length;

export function validateQuestions(questions, ctx, storyCount) {
    if (!Array.isArray(questions) || questions.length < COUNT[0] || questions.length > COUNT[1]) {
        return [`check needs ${COUNT[0]} to ${COUNT[1]} questions`];
    }
    return questions.flatMap((item, i) => validateQuestion(item, ctx, storyCount).map((message) => `question ${i + 1}: ${message}`));
}

function validateQuestion(item, ctx, storyCount) {
    if (!isMap(item)) {
        return ['must be a map'];
    }
    const rule = BY_TYPE[item.type];
    if (!rule) {
        return [`type must be one of ${TYPES.join(', ')}`];
    }
    return [...commonProblems(item, storyCount), ...rule(item, ctx)];
}

function commonProblems(item, storyCount) {
    const problems = [];
    if (!isText(item.q)) {
        problems.push('q is required');
    }
    if (item.explain !== undefined && !isText(item.explain)) {
        problems.push('explain must be text');
    }
    if (item.part !== undefined && !(Number.isInteger(item.part) && item.part >= 1 && item.part <= storyCount)) {
        problems.push(`part must be a story part number from 1 to ${storyCount}`);
    }
    return problems;
}

function tapProblems(item) {
    const problems = [];
    if (!isNumberPair(item.at)) {
        problems.push('tap needs at: [lon, lat]');
    }
    if (!(item.tolerance_km > 0)) {
        problems.push('tap needs tolerance_km above 0');
    }
    return problems;
}

function orderProblems(item, ctx) {
    const items = item.items;
    if (!Array.isArray(items) || items.length < ORDER_ITEMS[0] || items.length > ORDER_ITEMS[1]) {
        return [`order needs items: ${ORDER_ITEMS[0]} to ${ORDER_ITEMS[1]} card ids`];
    }
    return items.filter((id) => !ctx.cards.has(id)).map((id) => `order item ${id} is not a card`);
}

function pickBorderProblems(item, ctx) {
    const options = Array.isArray(item.options) ? item.options : [];
    const unknown = options.filter((id) => !ctx.borders.has(id)).map((id) => `pick-border option ${id} is not a border`);
    return [...optionProblems('pick-border', item), ...unknown];
}

function chooseProblems(item) {
    return optionProblems('choose', item);
}

function optionProblems(type, item) {
    if (!Array.isArray(item.options) || item.options.length < 2 || !item.options.every(isText)) {
        return [`${type} needs options: a list of at least 2 texts`];
    }
    return isIndexIn(item.answer, item.options) ? [] : [`${type} needs answer: an index inside options`];
}

function matchProblems(item, ctx) {
    const pairs = item.pairs;
    if (!Array.isArray(pairs) || pairs.length < 2) {
        return ['match needs pairs: a list of [card id, text]'];
    }
    return pairs.flatMap((pair) => (Array.isArray(pair) && ctx.cards.has(pair[0]) && isText(pair[1]) ? [] : [`match pair ${JSON.stringify(pair)} must be [card id, text]`]));
}

const BY_TYPE = { tap: tapProblems, order: orderProblems, 'pick-border': pickBorderProblems, choose: chooseProblems, match: matchProblems };
