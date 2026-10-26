import { problem } from './problems.mjs';

const BOLD = /<b>([^<]*)<\/b>/g;

export function buildAliasIndex(cards) {
    const index = new Map();
    const owners = new Map();
    const problems = [];
    for (const card of cards) {
        for (const alias of card.aliases.map((a) => a.trim())) {
            const owner = owners.get(alias);
            if (!owner) {
                index.set(alias, card.id);
                owners.set(alias, card);
                continue;
            }
            if (owner.id !== card.id) {
                problems.push(problem(card.file, `alias "${alias}" is claimed by both ${owner.file} and ${card.file}`));
            }
        }
    }
    return { index, problems };
}

export function linkTerms(html, index) {
    return html.replace(BOLD, (whole, inner) => {
        const id = index.get(inner.trim());
        return id ? `<b class="term" data-card="${id}">${inner}</b>` : whole;
    });
}
