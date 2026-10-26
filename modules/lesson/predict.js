// The prediction block: guess first, then the part's text. Any choice is fine; nothing is marked right or wrong.
// chosen: the option index when the part was already guessed; the block then shows the answered state.
export function renderPredict(container, predict, onReveal, chosen) {
    container.innerHTML = `<div class="predict">
        <div class="t">Първо познай</div>
        <p class="q">${esc(predict.q)}</p>
        <div class="opts">${predict.options.map((o) => `<button type="button" class="opt">${esc(o)}</button>`).join('')}</div>
    </div>`;
    const buttons = [...container.querySelectorAll('.opt')];
    const answer = (i) => {
        buttons.forEach((x) => { x.disabled = true; });
        buttons[i].classList.add('chosen');
        container.querySelector('.predict').insertAdjacentHTML('beforeend', `<div class="reveal">${esc(predict.reveal)}</div>`);
    };
    buttons.forEach((b, i) => b.addEventListener('click', () => {
        answer(i);
        onReveal(i);
    }));
    if (chosen !== undefined) answer(chosen);
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
