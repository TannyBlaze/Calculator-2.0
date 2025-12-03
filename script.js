const state = { mode: 'standard', angleMode: 'DEG', current: '0', first: null, operator: null, waitingForSecond: false, memory: Number(localStorage.getItem('calc_memory') || 0), history: JSON.parse(localStorage.getItem('calc_history') || '[]'), base: Number(localStorage.getItem('calc_base') || 10), lastAns: null };
const displayEl = document.getElementById('display-output');
const historyLine = document.getElementById('display-history');
const keysArea = document.getElementById('keys-area');
const historyList = document.getElementById('history-list');
const tabs = document.querySelectorAll('.tab');
const fmt = v => String(v).length > 16 ? Number(v).toPrecision(10) : String(v);
const safeNumber = s => { const n = Number(s); return Number.isFinite(n) ? n : NaN };
const persist = () => { localStorage.setItem('calc_history', JSON.stringify(state.history.slice(0, 200))); localStorage.setItem('calc_memory', String(state.memory)); localStorage.setItem('calc_base', String(state.base)) };
const pushHistory = entry => { state.history.unshift(entry); if (state.history.length > 200) state.history.pop(); persist(); renderHistory() };
const standardKeys = [
    [{ t: 'AC', k: 'clear', cls: 'clear' }, { t: '+/-', k: 'neg', cls: 'func' }, { t: '%', k: 'percent', cls: 'func' }, { t: '÷', k: 'op', v: '/' }],
    ['7', '8', '9', { t: '×', k: 'op', v: '*' }],
    ['4', '5', '6', { t: '−', k: 'op', v: '-' }],
    ['1', '2', '3', { t: '+', k: 'op', v: '+' }],
    [{ t: '0', k: 'digit', span: 2 }, { t: '.', k: 'decimal' }, { t: '=', k: 'eq', cls: 'equals' }]
];
const scientificExtra = [
    [{ t: 'sin', k: 'func', v: 'sin', cls: 'func' }, { t: 'cos', k: 'func', v: 'cos', cls: 'func' }, { t: 'tan', k: 'func', v: 'tan', cls: 'func' }, { t: '√', k: 'func', v: 'sqrt', cls: 'func' }, { t: 'x²', k: 'func', v: 'sqr', cls: 'func' }],
    [{ t: 'ln', k: 'func', v: 'ln', cls: 'func' }, { t: 'log', k: 'func', v: 'log', cls: 'func' }, { t: 'exp', k: 'func', v: 'exp', cls: 'func' }, { t: 'xʸ', k: 'pow', v: '^', cls: 'func' }, { t: '!', k: 'func', v: 'fact', cls: 'func' }]
];
const programmerKeys = [
    [{ t: 'AC', k: 'clear', cls: 'clear' }, { t: '←', k: 'back', cls: 'func' }, { t: '(', k: 'paren', v: '(' }, { t: ')', k: 'paren', v: ')' }, { t: '÷', k: 'op', v: '/' }],
    [{ t: 'A', k: 'digit' }, { t: 'B', k: 'digit' }, { t: 'C', k: 'digit' }, { t: '×', k: 'op', v: '*' }, { t: '<<', k: 'op', v: '<<' }],
    [{ t: 'D', k: 'digit' }, { t: 'E', k: 'digit' }, { t: 'F', k: 'digit' }, { t: '−', k: 'op', v: '-' }, { t: '>>', k: 'op', v: '>>' }],
    ['7', '8', '9', { t: '&', k: 'op', v: '&' }, { t: '|', k: 'op', v: '|' }],
    ['4', '5', '6', { t: '^', k: 'op', v: '^' }, { t: '%', k: 'percent', cls: 'func' }],
    ['1', '2', '3', { t: '+', k: 'op', v: '+' }, { t: '=', k: 'eq', cls: 'equals' }],
    [{ t: '0', k: 'digit', span: 2 }, { t: '.', k: 'decimal' }]
];
function validDigitForBase(char, base) { if (/^[0-9]$/.test(char)) return Number(char) < base; if (/^[A-F]$/i.test(char)) return base === 16; return false }
function clearKeysArea() { keysArea.innerHTML = ''; keysArea.className = 'keys mt-3' }
function makeBtn(def) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (def.cls || (def.k === 'digit' ? 'digit' : 'func'));
    btn.innerText = def.t || def;
    btn.dataset.key = def.k || (typeof def === 'string' ? 'digit' : '');
    if (def.v) btn.dataset.val = def.v;
    if (def.span) btn.style.gridColumn = 'span ' + def.span;
    btn.addEventListener('pointerdown', e => {
        const rect = btn.getBoundingClientRect();
        const r = document.createElement('span'); r.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        r.style.width = r.style.height = size + 'px';
        r.style.left = (e.clientX - rect.left - size / 2) + 'px';
        r.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(r); setTimeout(() => r.remove(), 700);
    });
    btn.addEventListener('click', () => handlePress(def));
    return btn;
}
function renderStandard() { clearKeysArea(); standardKeys.forEach(row => { row.forEach(cell => { const def = (typeof cell === 'string') ? { t: cell, k: 'digit' } : cell; keysArea.appendChild(makeBtn(def)) }) }) }
function renderScientific() { clearKeysArea(); scientificExtra.flat().forEach(def => keysArea.appendChild(makeBtn(def))); standardKeys.forEach(row => { row.forEach(cell => { const def = (typeof cell === 'string') ? { t: cell, k: 'digit' } : cell; keysArea.appendChild(makeBtn(def)) }) }) }
function renderProgrammer() { clearKeysArea(); keysArea.classList.add('programmer'); programmerKeys.forEach(row => { row.forEach(cell => { const def = (typeof cell === 'string') ? { t: cell, k: 'digit' } : cell; keysArea.appendChild(makeBtn(def)) }) }) }
function refreshDisplay() {
    displayEl.classList.remove('pop'); void displayEl.offsetWidth; displayEl.classList.add('pop');
    const txt = fmt(state.current);
    const n = Number(state.current);
    if (!Number.isFinite(n) && String(state.current).toLowerCase() !== 'infinity') { displayEl.textContent = String(state.current); displayEl.classList.add('error') } else { displayEl.classList.remove('error'); displayEl.textContent = txt }
    displayEl.classList.toggle('small', txt.length > 12);
    historyLine.textContent = (state.first !== null && state.operator) ? `${fmt(state.first)} ${state.operator}` : '';
    document.getElementById('mem-status').innerText = `M = ${state.memory}`;
    const baseSelect = document.getElementById('base-select'); if (baseSelect) baseSelect.value = String(state.base);
}
function renderHistory() { historyList.innerHTML = ''; state.history.slice(0, 100).forEach(h => { const d = document.createElement('div'); d.className = 'p-2 rounded text-sm'; d.style.borderBottom = '1px solid rgba(255,255,255,0.02)'; if (typeof h === 'string') { d.innerHTML = `<div class="muted">${h}</div>` } else { d.innerHTML = `<div class="muted">${h.label}</div><div style="font-weight:600">${h.result}</div>` } historyList.appendChild(d) }) }
function factorial(n) { n = Math.floor(n); if (n < 0) return NaN; if (n === 0 || n === 1) return 1; let r = 1; for (let i = 2; i <= n; i++)r *= i; return r }
function applyUnary(fnName) {
    const x = safeNumber(state.current);
    if (Number.isNaN(x)) return;
    let res = x;
    switch (fnName) {
        case 'neg': res = -x; break;
        case 'percent': res = x / 100; break;
        case 'sin': res = state.angleMode === 'DEG' ? Math.sin(x * Math.PI / 180) : Math.sin(x); break;
        case 'cos': res = state.angleMode === 'DEG' ? Math.cos(x * Math.PI / 180) : Math.cos(x); break;
        case 'tan': res = state.angleMode === 'DEG' ? Math.tan(x * Math.PI / 180) : Math.tan(x); break;
        case 'sqrt': res = x < 0 ? NaN : Math.sqrt(x); break;
        case 'sqr': res = Math.pow(x, 2); break;
        case 'ln': res = x > 0 ? Math.log(x) : NaN; break;
        case 'log': res = x > 0 ? Math.log10(x) : NaN; break;
        case 'exp': res = Math.exp(x); break;
        case 'fact': res = factorial(x); break;
        default: return
    }
    pushHistory({ label: `${fnName}(${x})`, result: fmt(res) });
    state.current = String(res);
    state.waitingForSecond = false;
    state.lastAns = res;
    persist();
    refreshDisplay();
}
function operateMath(op, a, b) { switch (op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b === 0 ? (a === 0 ? NaN : Infinity) : a / b; case '^': return Math.pow(a, b); default: return b } }
function operateBitwise(op, a, b) { switch (op) { case '&': return a & b; case '|': return a | b; case '^': return a ^ b; case '<<': return a << b; case '>>': return a >> b; default: return b } }
function handleOperator(op) {
    if (state.mode === 'programmer' && ['&', '|', '^', '<<', '>>'].includes(op)) {
        if (state.first === null) { state.first = parseInt(state.current, state.base) || 0 } else if (state.operator) {
            const right = parseInt(state.current, state.base) || 0;
            state.first = operateBitwise(state.operator, state.first, right);
            state.current = String(state.first);
        }
        state.operator = op; state.waitingForSecond = true; refreshDisplay(); return;
    }
    const num = safeNumber(state.current);
    if (state.first === null) { state.first = num }
    else if (state.operator && !state.waitingForSecond) { state.first = operateMath(state.operator, state.first, num); state.current = String(state.first); pushHistory({ label: 'calc', result: fmt(state.first) }) }
    state.operator = op; state.waitingForSecond = true; refreshDisplay();
}
function performEquals() {
    if (state.operator === null) return;
    if (state.mode === 'programmer' && ['&', '|', '^', '<<', '>>'].includes(state.operator)) {
        const right = parseInt(state.current, state.base) || 0;
        const res = operateBitwise(state.operator, state.first, right);
        pushHistory({ label: `${state.first} ${state.operator} ${right}`, result: formatProgrammerResult(res) });
        state.current = String(res);
    } else {
        const res = operateMath(state.operator, state.first, safeNumber(state.current));
        pushHistory({ label: `${state.first} ${state.operator} ${state.current}`, result: fmt(res) });
        state.current = String(res);
    }
    state.operator = null; state.first = null; state.waitingForSecond = false; state.lastAns = state.current;
    persist(); refreshDisplay();
}
function handlePress(def) {
    const key = def.k || (typeof def === 'string' ? 'digit' : '');
    const char = def.t || def;
    if (key === 'digit') {
        if (state.mode === 'programmer' && !validDigitForBase(char.toUpperCase(), state.base)) return;
        if (state.waitingForSecond || state.current === '0') { state.current = char; state.waitingForSecond = false } else { state.current = state.current + char }
        refreshDisplay(); return;
    }
    if (key === 'decimal') { if (state.mode === 'programmer') return; if (state.waitingForSecond) { state.current = '0.'; state.waitingForSecond = false } else if (!state.current.includes('.')) state.current += '.'; refreshDisplay(); return }
    if (key === 'clear') { state.current = '0'; state.first = null; state.operator = null; state.waitingForSecond = false; refreshDisplay(); return }
    if (key === 'back') { if (state.current.length > 1) state.current = state.current.slice(0, -1); else state.current = '0'; refreshDisplay(); return }
    if (key === 'neg') { state.current = String(-safeNumber(state.current)); refreshDisplay(); return }
    if (key === 'percent') { state.current = String(safeNumber(state.current) / 100); refreshDisplay(); return }
    if (key === 'paren') { return }
    if (key === 'func') { applyUnary(def.v); return }
    if (key === 'pow') { handleOperator('^'); return }
    if (key === 'op') { handleOperator(def.v); return }
    if (key === 'eq') { performEquals(); return }
}
function formatProgrammerResult(n) { return `DEC:${n}  BIN:${n.toString(2)}  HEX:${n.toString(16).toUpperCase()}` }
document.getElementById('m-plus').addEventListener('click', () => { state.memory += Number(state.current); document.getElementById('mem-status').innerText = `M = ${state.memory}`; persist() });
document.getElementById('m-minus').addEventListener('click', () => { state.memory -= Number(state.current); document.getElementById('mem-status').innerText = `M = ${state.memory}`; persist() });
document.getElementById('mr').addEventListener('click', () => { state.current = String(state.memory); refreshDisplay() });
document.getElementById('mc').addEventListener('click', () => { state.memory = 0; document.getElementById('mem-status').innerText = `M = ${state.memory}`; persist() });
document.getElementById('hist-toggle').addEventListener('click', () => { const s = document.getElementById('sidebar'); s.style.display = (s.style.display === 'none') ? 'flex' : 'none' });
document.getElementById('clear-history').addEventListener('click', () => { state.history = []; persist(); renderHistory() });
document.getElementById('to-binary').addEventListener('click', () => { const n = parseInt(state.current, state.base); if (isNaN(n)) return; state.current = n.toString(2); state.base = 2; persist(); refreshDisplay(); pushHistory({ label: 'toBinary', result: state.current }) });
document.getElementById('to-hex').addEventListener('click', () => { const n = parseInt(state.current, state.base); if (isNaN(n)) return; state.current = n.toString(16).toUpperCase(); state.base = 16; persist(); refreshDisplay(); pushHistory({ label: 'toHex', result: state.current }) });
document.getElementById('to-oct').addEventListener('click', () => { const n = parseInt(state.current, state.base); if (isNaN(n)) return; state.current = n.toString(8); state.base = 8; persist(); refreshDisplay(); pushHistory({ label: 'toOct', result: state.current }) });
document.getElementById('op-and').addEventListener('click', () => handleOperator('&'));
document.getElementById('op-or').addEventListener('click', () => handleOperator('|'));
document.getElementById('op-xor').addEventListener('click', () => handleOperator('^'));
document.getElementById('op-shl').addEventListener('click', () => handleOperator('<<'));
document.getElementById('op-shr').addEventListener('click', () => handleOperator('>>'));
document.getElementById('base-select').addEventListener('change', e => { const newBase = Number(e.target.value); const dec = parseInt(state.current, state.base); if (isNaN(dec)) { state.base = newBase; persist(); refreshDisplay(); return } state.base = newBase; state.current = (newBase === 10) ? String(dec) : dec.toString(newBase).toUpperCase(); persist(); refreshDisplay() });
document.addEventListener('keydown', e => { const k = e.key; if (k >= '0' && k <= '9') { handlePress({ t: k, k: 'digit' }); e.preventDefault(); return } if (k === '.') { handlePress({ k: 'decimal' }); e.preventDefault(); return } if (k === 'Enter' || k === '=') { handlePress({ k: 'eq' }); e.preventDefault(); return } if (k === 'Backspace') { handlePress({ k: 'back' }); e.preventDefault(); return } if (k === 'Escape') { handlePress({ k: 'clear' }); e.preventDefault(); return } if (['+', '-', '*', '/', '^'].includes(k)) { handlePress({ k: 'op', v: k }); e.preventDefault(); return } if (/[a-fA-F]/.test(k)) { handlePress({ t: k.toUpperCase(), k: 'digit' }); e.preventDefault(); return } if (k === '(' || k === ')') { handlePress({ t: k, k: 'paren' }); e.preventDefault(); return } });
tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); state.mode = tab.dataset.mode; if (state.mode === 'standard') renderStandard(); if (state.mode === 'scientific') renderScientific(); if (state.mode === 'programmer') renderProgrammer(); refreshDisplay() }) });
renderStandard(); renderHistory(); refreshDisplay();
