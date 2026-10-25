// Search on the free map: the words a query and an index entry are compared on. The build normalizes the index with the same function.
const MIN_STEMMED_LENGTH = 5;
const ENDINGS = ['ът', 'та', 'то', 'те', 'ят', 'ъ', 'а', 'я', 'о', 'е', 'и'];

export function normalize(text) {
    return text.toLowerCase()
        .replace(/[йѝ]/g, 'и')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((word) => word !== '')
        .map(stripEnding)
        .join(' ');
}

function stripEnding(word) {
    if (word.length < MIN_STEMMED_LENGTH) {
        return word;
    }
    const ending = ENDINGS.find((candidate) => word.endsWith(candidate));
    return ending === undefined ? word : word.slice(0, -ending.length);
}
