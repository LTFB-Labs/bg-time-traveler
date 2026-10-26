const QUOTE = /^>\s?/;
const BULLET = /^-\s+/;
const NUMBER = /^\d+\.\s+/;

function escapeHtml(text) {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function inline(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.+?)\*/g, '<i>$1</i>');
}

function blockKind(line) {
    if (QUOTE.test(line)) return 'quote';
    if (BULLET.test(line)) return 'ul';
    if (NUMBER.test(line)) return 'ol';
    return 'p';
}

function renderBlock(kind, lines) {
    if (kind === 'quote') {
        return `<blockquote><p>${inline(lines.map((l) => l.replace(QUOTE, '')).join(' '))}</p></blockquote>`;
    }
    if (kind === 'p') {
        return `<p>${inline(lines.join(' '))}</p>`;
    }
    const marker = kind === 'ul' ? BULLET : NUMBER;
    return `<${kind}>${lines.map((l) => `<li>${inline(l.replace(marker, ''))}</li>`).join('')}</${kind}>`;
}

export function renderMarkdown(text) {
    const out = [];
    let kind = null;
    let lines = [];
    const flush = () => {
        if (kind) out.push(renderBlock(kind, lines));
        kind = null;
        lines = [];
    };
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (line === '') {
            flush();
            continue;
        }
        const lineKind = blockKind(line);
        if (lineKind !== kind) flush();
        kind = lineKind;
        lines.push(line);
    }
    flush();
    return out.join('');
}

export function countWords(text) {
    return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}
