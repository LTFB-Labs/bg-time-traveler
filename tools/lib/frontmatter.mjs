import YAML from 'yaml';

const FENCE = '---';

export function splitFrontMatter(text) {
    const lines = text.split('\n');
    if (lines[0].trimEnd() !== FENCE) {
        return { meta: {}, body: text };
    }
    const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === FENCE);
    if (end === -1) {
        return { meta: {}, body: text };
    }
    const meta = YAML.parse(lines.slice(1, end).join('\n')) ?? {};
    return { meta, body: lines.slice(end + 1).join('\n') };
}

export function splitParagraphs(body) {
    return body
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter((block) => block !== '');
}
