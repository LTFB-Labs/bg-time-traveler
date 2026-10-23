// The prediction block: guess first, then the part's text. Any choice is fine; nothing is marked right or wrong.
export function renderPredict(container, predict, onReveal) {
    container.innerHTML = `<div class="predict">
        <div class="t">Първо познай</div>
        <p class="q">${esc(predict.q)}</p>
        <div class="opts">${predict.options.map((o) => `<button type="button" class="opt">${esc(o)}</button>`).join('')}</div>
    </div>`;
    const buttons = [...container.querySelectorAll('.opt')];
    buttons.forEach((b) => b.addEventListener('click', () => {
        buttons.forEach((x) => { x.disabled = true; });
        b.classList.add('chosen');
        container.querySelector('.predict').insertAdjacentHTML('beforeend', `<div class="reveal">${esc(predict.reveal)}</div>`);
        onReveal();
    }));
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
