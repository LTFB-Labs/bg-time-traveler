export function problem(file, message) {
    return { file, message };
}

export function formatProblems(problems) {
    return problems.map((p) => `${p.file}: ${p.message}`).join('\n');
}
