const exprLine = document.getElementById('exprLine');
const resultLine = document.getElementById('resultLine');
const quoteBox = document.getElementById('quoteBox');

const quotes = [
  "Imagination is more important than knowledge. – Albert Einstein",
  "Science is the poetry of reality. – Richard Dawkins",
  "Somewhere, something incredible is waiting to be known. – Carl Sagan",
  "If I have seen further, it is by standing on the shoulders of giants. – Isaac Newton",
  "The good thing about science is that it’s true whether or not you believe in it. – Neil deGrasse Tyson",
  "Research is what I’m doing when I don’t know what I’m doing. – Richard Feynman",
  "The important thing is not to stop questioning. – Albert Einstein",
  "Equipped with his five senses, man explores the universe around him. – Edwin Hubble",
  "Nothing in life is to be feared, it is only to be understood. – Marie Curie",
  "Science is the great antidote to the poison of enthusiasm and superstition. – Adam Smith"
];

// ---- Quote rotation ----
let quoteIndex = 0;
setInterval(() => {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  quoteBox.style.opacity = '0';
  setTimeout(() => {
    quoteBox.textContent = quotes[quoteIndex];
    quoteBox.style.opacity = '1';
  }, 500);
}, 5000);

// =====================================================================
//  DISPLAY MODEL
//  The whole expression lives in one string. A fraction is encoded as
//  F_START + numerator + F_MID + denominator + F_END, so a single
//  integer cursor can move through text AND through the fraction boxes.
// =====================================================================
const F_START = '\uE000';
const F_MID   = '\uE001';
const F_END   = '\uE002';

let expr = '';
let cursor = 0;

let sciMode = false;
let lastResult = null;
let lastResultRaw = '';
let showingResult = false;

const history = [];
let historyIndex = -1;

// =====================================================================
//  NUMBER FORMATTING
// =====================================================================
function groupThousands(str) {
  return str.replace(/\d+(\.\d+)?/g, (match) => {
    const [intPart, decPart] = match.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? grouped + '.' + decPart : grouped;
  });
}

// e.g. 1234.5 -> "1.2345×10^3"
function sciFormat(value) {
  if (value === 0) return '0';
  const [mantissaRaw, expRaw] = value.toExponential(8).split('e');
  const mantissa = mantissaRaw.replace(/\.?0+$/, '');
  const exponent = parseInt(expRaw, 10);
  return mantissa + '×10^' + exponent;
}

// Format a number for display (thousands separators are added while rendering)
function formatNumber(value) {
  if (typeof value !== 'number' || !isFinite(value)) return String(value);
  if (sciMode) return sciFormat(value);

  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e21 || abs < 1e-10)) return sciFormat(value);

  return value.toFixed(10)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

// =====================================================================
//  RENDERING
// =====================================================================
let caretPlaced = false;

function makeCaret() {
  caretPlaced = true;
  const c = document.createElement('span');
  c.className = 'caret';
  return c;
}

function addText(text) {
  if (text === '') return;
  const span = document.createElement('span');
  span.className = 'tok';
  span.textContent = groupThousands(text);
  exprLine.appendChild(span);
}

function setBoxText(el, text) {
  el.textContent = text === '' ? '\u00A0' : groupThousands(text);
}

function fillBoxWithCaret(el, text, offset) {
  const left = text.slice(0, offset);
  const right = text.slice(offset);
  if (left) el.appendChild(document.createTextNode(groupThousands(left)));
  el.appendChild(makeCaret());
  if (right) el.appendChild(document.createTextNode(groupThousands(right)));
}

// Build the stacked fraction that starts at `start`
function buildFracEl(start) {
  const mid = expr.indexOf(F_MID, start);
  const end = expr.indexOf(F_END, start);

  const wrap = document.createElement('span');
  wrap.className = 'frac';

  const numEl = document.createElement('span');
  numEl.className = 'frac-num';
  const bar = document.createElement('span');
  bar.className = 'frac-bar';
  const denEl = document.createElement('span');
  denEl.className = 'frac-den';

  const numStart = start + 1;
  const denStart = mid + 1;

  if (!caretPlaced && cursor >= numStart && cursor <= mid) {
    numEl.classList.add('frac-active');
    fillBoxWithCaret(numEl, expr.slice(numStart, mid), cursor - numStart);
  } else {
    setBoxText(numEl, expr.slice(numStart, mid));
  }

  if (!caretPlaced && cursor >= denStart && cursor <= end) {
    denEl.classList.add('frac-active');
    fillBoxWithCaret(denEl, expr.slice(denStart, end), cursor - denStart);
  } else {
    setBoxText(denEl, expr.slice(denStart, end));
  }

  wrap.append(numEl, bar, denEl);
  return wrap;
}

function renderDisplay() {
  exprLine.innerHTML = '';
  caretPlaced = false;

  let i = 0;
  while (i < expr.length) {
    if (!caretPlaced && cursor === i) exprLine.appendChild(makeCaret());

    if (expr[i] === F_START) {
      exprLine.appendChild(buildFracEl(i));
      i = expr.indexOf(F_END, i) + 1;
      continue;
    }

    // plain text run up to the next control character
    let j = i;
    while (j < expr.length && expr[j] !== F_START && expr[j] !== F_MID && expr[j] !== F_END) j++;

    let seg = i;
    for (let k = i; k <= j; k++) {
      if (!caretPlaced && k === cursor) {
        addText(expr.slice(seg, k));
        exprLine.appendChild(makeCaret());
        seg = k;
      }
    }
    addText(expr.slice(seg, j));

    i = j;
  }

  if (!caretPlaced) exprLine.appendChild(makeCaret());
  exprLine.scrollLeft = exprLine.scrollWidth;
}

// =====================================================================
//  INPUT HANDLERS
// =====================================================================
function appendChar(ch) {
  if (showingResult) {
    if (/^[0-9.]$/.test(ch) || ch === '(' || /[a-zA-Zπ√]/.test(ch)) {
      // start a brand-new calculation
      expr = '';
      cursor = 0;
      resultLine.textContent = '';
    } else if (/^[+\-*/^%!]$/.test(ch)) {
      // keep calculating from the last answer
      expr = lastResultRaw;
      cursor = expr.length;
    } else {
      expr = '';
      cursor = 0;
    }
    showingResult = false;
    historyIndex = -1;
  }

  expr = expr.slice(0, cursor) + ch + expr.slice(cursor);
  cursor += ch.length;
  renderDisplay();
}

// Insert / step through a fraction. Denominator is entered first.
function insertFraction() {
  showingResult = false;
  historyIndex = -1;

  const f = findEnclosingFraction(cursor);
  if (f) {
    if (cursor > f.mid) {
      cursor = f.mid;          // in denominator -> jump to numerator
    } else {
      cursor = f.end + 1;      // in numerator -> leave the fraction
    }
    renderDisplay();
    return;
  }

  const ins = F_START + F_MID + F_END;      // empty fraction
  expr = expr.slice(0, cursor) + ins + expr.slice(cursor);
  cursor = cursor + 2;                       // caret into the denominator box
  renderDisplay();
}

// Insert an nth-root template: root(degree,value).
// The caret lands in the degree slot; use ▶ to jump to the value.
function insertRoot() {
  showingResult = false;
  historyIndex = -1;

  const ins = 'root(,)';
  expr = expr.slice(0, cursor) + ins + expr.slice(cursor);
  cursor += 'root('.length;                  // caret inside the degree slot
  renderDisplay();
}

// Insert the previous answer (Ans) at the cursor.
function insertAns() {
  if (showingResult) {
    expr = '';
    cursor = 0;
    resultLine.textContent = '';
  }
  showingResult = false;
  historyIndex = -1;

  const val = lastResultRaw || '0';
  expr = expr.slice(0, cursor) + val + expr.slice(cursor);
  cursor += val.length;
  renderDisplay();
}

// =====================================================================
//  MEMORY KEYS (MC / MR / M+ / M-) and RECIPROCAL (1/x)
// =====================================================================
let memory = 0;

function updateMemIndicator() {
  const ind = document.getElementById('memIndicator');
  if (ind) ind.classList.toggle('on', memory !== 0);
}

function memoryClear() {
  memory = 0;
  updateMemIndicator();
}

function memoryRecall() {
  if (showingResult) {
    expr = '';
    cursor = 0;
    resultLine.textContent = '';
  }
  showingResult = false;
  historyIndex = -1;

  const val = formatNumber(memory);
  expr = expr.slice(0, cursor) + val + expr.slice(cursor);
  cursor += val.length;
  renderDisplay();
}

// The value the memory keys operate on: the last computed result.
function currentDisplayedValue() {
  return (showingResult && lastResult !== null) ? lastResult : null;
}

function memoryAdd() {
  const v = currentDisplayedValue();
  if (v === null) return;
  memory += v;
  updateMemIndicator();
}

function memorySubtract() {
  const v = currentDisplayedValue();
  if (v === null) return;
  memory -= v;
  updateMemIndicator();
}

function reciprocal() {
  const base = showingResult ? (lastResultRaw || '0') : expr;
  expr = (base && base.trim() !== '') ? '1/(' + base + ')' : '1/(';
  cursor = expr.length;
  showingResult = false;
  historyIndex = -1;
  resultLine.textContent = '';
  renderDisplay();
}

function findEnclosingFraction(pos) {
  const start = expr.lastIndexOf(F_START, pos);
  if (start === -1) return null;
  const end = expr.indexOf(F_END, start);
  if (end === -1) return null;
  if (pos > start && pos <= end) {
    return { start, mid: expr.indexOf(F_MID, start), end };
  }
  return null;
}

function removeWholeFraction(pos) {
  let start, end;
  if (expr[pos] === F_START) {
    start = pos;
    end = expr.indexOf(F_END, pos);
  } else {
    end = pos;
    start = expr.lastIndexOf(F_START, pos);
  }
  if (start < 0 || end < 0) return;
  expr = expr.slice(0, start) + expr.slice(end + 1);
  cursor = start;
  renderDisplay();
}

function deleteChar() {
  showingResult = false;
  if (cursor === 0) { renderDisplay(); return; }

  const prev = expr[cursor - 1];

  if (prev === F_END || prev === F_START) {
    removeWholeFraction(cursor - 1);
    return;
  }

  if (prev === F_MID) {
    cursor -= 1;               // empty denominator -> move to numerator
    renderDisplay();
    return;
  }

  expr = expr.slice(0, cursor - 1) + expr.slice(cursor);
  cursor -= 1;
  renderDisplay();
}

// ---- Cursor movement ----
function moveCursor(dir) {
  cursor = Math.max(0, Math.min(expr.length, cursor + dir));
  renderDisplay();
}

// Up / down: switch between numerator & denominator inside a fraction,
// otherwise recall previous calculations (like the Casio REPLAY pad).
function moveVertical(dir) {
  const f = findEnclosingFraction(cursor);
  if (f) {
    cursor = dir < 0 ? f.mid : f.mid + 1;   // up = numerator, down = denominator
    renderDisplay();
    return;
  }
  recallHistory(dir);
}

// The d-pad's up/down keys: move the input caret between the numerator and
// the denominator of a fraction (outside a fraction they recall history).
function recallHistory(dir) {
  if (history.length === 0) return;
  if (historyIndex === -1) historyIndex = history.length;
  historyIndex = Math.max(0, Math.min(history.length - 1, historyIndex + dir));
  expr = history[historyIndex];
  cursor = expr.length;
  showingResult = false;
  resultLine.textContent = '';
  renderDisplay();
}

function clearDisplay() {
  expr = '';
  cursor = 0;
  lastResult = null;
  lastResultRaw = '';
  showingResult = false;
  historyIndex = -1;
  resultLine.textContent = '';
  renderDisplay();
}

function toggleSci() {
  sciMode = !sciMode;
  const btn = document.getElementById('sciBtn');
  if (btn) btn.classList.toggle('active', sciMode);

  if (showingResult && lastResult !== null) {
    lastResultRaw = formatNumber(lastResult);
    resultLine.textContent = groupThousands(lastResultRaw);
  }
}

// =====================================================================
//  EVALUATION
// =====================================================================
function decodeExpr(raw) {
  // Split into contiguous text runs and fraction terms, then join them
  // (inserting an implicit "*" only across a fraction boundary, e.g. 5(1)/(2)).
  const pieces = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === F_START) {
      const mid = raw.indexOf(F_MID, i);
      const end = raw.indexOf(F_END, i);
      const num = raw.slice(i + 1, mid) || '0';
      const den = raw.slice(mid + 1, end) || '1';
      pieces.push('(' + num + ')/(' + den + ')');
      i = end + 1;
    } else {
      let j = i;
      while (j < raw.length && raw[j] !== F_START && raw[j] !== F_MID && raw[j] !== F_END) j++;
      pieces.push(raw.slice(i, j));
      i = j;
    }
  }

  let out = '';
  for (const piece of pieces) {
    if (out !== '' && needsImplicitMul(out[out.length - 1], piece[0])) out += '*';
    out += piece;
  }
  return out;
}

function needsImplicitMul(a, b) {
  const leftValue = /[0-9).!]/.test(a);
  const rightValue = /[0-9.(]/.test(b) || /[a-zA-Zπ√]/.test(b);
  return leftValue && rightValue;
}

function calculate() {
  try {
    if (expr.trim() === '') {
      resultLine.textContent = '0';
      return;
    }

    let expression = decodeExpr(expr)
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**')
      .replace(/²/g, '**2')
      .replace(/³/g, '**3')
      .replace(/π/g, 'Math.PI')
      .replace(/sin⁻¹\s*\(/g, 'Math.asin(')
      .replace(/cos⁻¹\s*\(/g, 'Math.acos(')
      .replace(/tan⁻¹\s*\(/g, 'Math.atan(')
      .replace(/\b(sin|cos|tan|log|ln)\s*\(/g, (m, name) => {
        const map = {
          sin: 'Math.sin',
          cos: 'Math.cos',
          tan: 'Math.tan',
          log: 'Math.log10',
          ln: 'Math.log'
        };
        return map[name] + '(';
      })
      .replace(/∛\s*\(?/g, 'Math.cbrt(')
      .replace(/\broot\s*\(/g, 'nthroot(')
      .replace(/√\s*\(?/g, 'Math.sqrt(')
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\be\b/g, 'Math.E')
      .replace(/Math\.Math\./g, 'Math.');

    expression = autoCloseParens(expression);
    expression = expression.replace(/%/g, '/100');

    if (expression.includes('!')) expression = handleFactorial(expression);

    expression = convertTrigToDegrees(expression);
    expression = convertInverseTrigToDegrees(expression);

    const result = eval(expression);
    if (typeof result === 'number' && isFinite(result)) {
      lastResult = result;
      lastResultRaw = formatNumber(result);
      resultLine.textContent = groupThousands(lastResultRaw);
      showingResult = true;
      history.push(expr);
    } else {
      lastResult = null;
      lastResultRaw = '';
      resultLine.textContent = 'Error';
      showingResult = false;
    }
  } catch {
    lastResult = null;
    lastResultRaw = '';
    resultLine.textContent = 'Error';
    showingResult = false;
  }

  historyIndex = -1;
  cursor = expr.length;
  renderDisplay();
}

// Add closing brackets for any unclosed "(" the user typed
function autoCloseParens(str) {
  let open = 0;
  for (const ch of str) {
    if (ch === '(') open++;
    else if (ch === ')') open--;
  }
  if (open > 0) str += ')'.repeat(open);
  return str;
}

function handleFactorial(str) {
  return str.replace(/(\d+)!/g, (_, n) => factorial(parseInt(n)));
}

// nth root: root(degree, value) -> value^(1/degree).
// Handles negative radicands for odd integer degrees.
function nthroot(degree, value) {
  const n = Number(degree);
  if (!isFinite(n) || n === 0) return NaN;
  if (value < 0 && Math.round(n) % 2 !== 0) {
    return -Math.pow(-value, 1 / n);
  }
  return Math.pow(value, 1 / n);
}

// Trig buttons use degrees like a normal calculator.
// If the argument contains Math.PI, keep radians as-is.
function convertTrigToDegrees(expression) {
  const funcs = ['Math.sin', 'Math.cos', 'Math.tan'];
  for (const fn of funcs) {
    let searchFrom = 0;
    let idx;
    while ((idx = expression.indexOf(fn + '(', searchFrom)) !== -1) {
      const openIdx = idx + fn.length;
      let depth = 0;
      let closeIdx = -1;
      for (let i = openIdx; i < expression.length; i++) {
        if (expression[i] === '(') depth++;
        else if (expression[i] === ')') {
          depth--;
          if (depth === 0) { closeIdx = i; break; }
        }
      }
      if (closeIdx === -1) { searchFrom = idx + 1; continue; }

      const inner = expression.slice(openIdx + 1, closeIdx);
      let replacement;
      if (inner.includes('Math.PI')) {
        replacement = fn + '(' + inner + ')';
      } else {
        replacement = fn + '((' + inner + ')*Math.PI/180)';
      }
      expression = expression.slice(0, idx) + replacement + expression.slice(closeIdx + 1);
      searchFrom = idx + replacement.length;
    }
  }
  return expression;
}

// Inverse trig returns an angle: in degree mode the result must be
// converted from radians to degrees (unless Math.PI is used explicitly).
function convertInverseTrigToDegrees(expression) {
  const funcs = ['Math.asin', 'Math.acos', 'Math.atan'];
  for (const fn of funcs) {
    let searchFrom = 0;
    let idx;
    while ((idx = expression.indexOf(fn + '(', searchFrom)) !== -1) {
      const openIdx = idx + fn.length;
      let depth = 0;
      let closeIdx = -1;
      for (let i = openIdx; i < expression.length; i++) {
        if (expression[i] === '(') depth++;
        else if (expression[i] === ')') {
          depth--;
          if (depth === 0) { closeIdx = i; break; }
        }
      }
      if (closeIdx === -1) { searchFrom = idx + 1; continue; }

      const inner = expression.slice(openIdx + 1, closeIdx);
      let replacement;
      if (inner.includes('Math.PI')) {
        replacement = fn + '(' + inner + ')';
      } else {
        replacement = '(' + fn + '(' + inner + ')*180/Math.PI)';
      }
      expression = expression.slice(0, idx) + replacement + expression.slice(closeIdx + 1);
      searchFrom = idx + replacement.length;
    }
  }
  return expression;
}

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// initial paint (shows the blinking caret)
renderDisplay();
updateMemIndicator();
