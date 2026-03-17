/* ═══════════════════════════════════════════════════════
   РЕШАТЕЛЬ УРАВНЕНИЙ — script.js
   ═══════════════════════════════════════════════════════ */

/* ── STATE ─────────────────────────────────────────────── */
const S = {
  expr: '', exprL: '', exprR: '', inputMode: 'single',
  L: -10, R: 10, step: 1, eps: 1e-6, dec: 6,
  f: null, df: null, d2f: null,
  derivStr: '', deriv2Str: '',
  polyCoeffs: null,
  foundIntervals: [],
  method: 'anal'
};
let chartInst = null, clickMode = null, clickA = null, clickB = null;
let previewTimer = null;

/* ── HELPERS ───────────────────────────────────────────── */
const $ = id => document.getElementById(id);
function H(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt(x, d) {
  const dec = d !== undefined ? d : S.dec;
  if (x === null || x === undefined) return '—';
  if (isNaN(x)) return 'NaN';
  if (!isFinite(x)) return x > 0 ? '+∞' : '−∞';
  return x.toFixed(dec);
}
function se(f, x) {
  try { const v = f(x); return (isFinite(v) && !isNaN(v)) ? v : null; }
  catch { return null; }
}

/* ── INPUT MODE ────────────────────────────────────────── */
function setInputMode(mode) {
  S.inputMode = mode;
  $('inputSingle').style.display  = mode === 'single' ? '' : 'none';
  $('inputDouble').style.display  = mode === 'double' ? '' : 'none';
  $('modeSingle').classList.toggle('active', mode === 'single');
  $('modeDouble').classList.toggle('active', mode === 'double');
  const title = $('liveGraphTitle');
  if (title) title.textContent = mode === 'double' ? 'Графики f(x) и g(x)' : 'График f(x)';
  updatePreview();
  updateLiveChart();
}

/* ── EXAMPLES ──────────────────────────────────────────── */
// single: setEx(expr, null, L, R, step)
// double: setEx(null, exprL, exprR, L, R, step)  — but we detect by type
function setEx(exprSingle, exprL, exprR, L, R, step) {
  if (exprSingle !== null) {
    // single mode
    setInputMode('single');
    $('funcInput').value = exprSingle;
    $('Linput').value = L;
    $('Rinput').value = R;
    if (step !== undefined) $('stepInput').value = step;
  } else {
    // double mode
    setInputMode('double');
    $('funcInputL').value = exprL;
    $('funcInputR').value = exprR;
    $('Linput').value = L;
    $('Rinput').value = R;
    if (step !== undefined) $('stepInput').value = step;
  }
  updatePreview();
  updateLiveChart();
}

/* ── FUNCTION PREVIEW (KaTeX) ──────────────────────────── */
function expr2latex(str) {
  if (!str.trim()) return '';
  let s = str.trim();
  // operators / functions
  s = s.replace(/\*\*/g, '^');
  s = s.replace(/Math\./g, '');
  s = s.replace(/sqrt\(/g, '\\sqrt{').replace(/cbrt\(/g, '\\sqrt[3]{');
  s = s.replace(/\bsin\(/g,   '\\sin(');
  s = s.replace(/\bcos\(/g,   '\\cos(');
  s = s.replace(/\btan\(/g,   '\\tan(');
  s = s.replace(/\bexp\(/g,   'e^{');
  s = s.replace(/\blog\(/g,   '\\ln(');
  s = s.replace(/\blog2\(/g,  '\\log_2(');
  s = s.replace(/\babs\(/g,   '|');
  s = s.replace(/\bpi\b/g,    '\\pi');
  s = s.replace(/\be\b/g,     'e');
  // a*x → a·x, x*x → x·x, remove explicit multiply before (
  s = s.replace(/(\d)\*([a-zA-Z(])/g, '$1$2');
  s = s.replace(/([a-zA-Z])\*([a-zA-Z(])/g, '$1$2');
  s = s.replace(/\*/g, '\\cdot ');
  // powers: x^2 → x^{2}
  s = s.replace(/\^(-?\d+(?:\.\d+)?)/g, '^{$1}');
  // fractions: a/b with no space
  s = s.replace(/(\w+)\/(\w+)/g, '\\dfrac{$1}{$2}');
  return s;
}
function updatePreview() {
  if (S.inputMode === 'double') {
    _previewDouble();
  } else {
    _previewSingle();
  }
}

function _previewSingle() {
  const raw = ($('funcInput') || {}).value?.trim() || '';
  const box = $('funcPreview');
  if (!box) return;
  if (!raw) { box.innerHTML = '<span class="prev-placeholder">введите f(x) выше...</span>'; return; }
  box.classList.add('updating');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    box.classList.remove('updating');
    try {
      box.innerHTML = '';
      const lbl = document.createElement('span'); lbl.className = 'prev-lbl'; lbl.textContent = 'ПРЕДПРОСМОТР';
      box.appendChild(lbl);
      const content = document.createElement('div'); content.className = 'prev-content';
      katex.render('f(x) = ' + expr2latex(raw), content, { throwOnError: false, displayMode: false });
      box.appendChild(content);
    } catch {
      box.innerHTML = `<span class="prev-lbl">ПРЕДПРОСМОТР</span><div class="prev-content" style="color:var(--amber2);font-family:var(--mono)">${H(raw)}</div>`;
    }
  }, 280);
}

function _previewDouble() {
  const rawL = ($('funcInputL') || {}).value?.trim() || '';
  const rawR = ($('funcInputR') || {}).value?.trim() || '';
  const box = $('funcPreviewDouble');
  if (!box) return;
  if (!rawL && !rawR) { box.innerHTML = '<span class="prev-placeholder">введите f(x) и g(x) выше...</span>'; return; }
  box.classList.add('updating');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    box.classList.remove('updating');
    try {
      box.innerHTML = '';
      const lbl = document.createElement('span'); lbl.className = 'prev-lbl'; lbl.textContent = 'ПРЕДПРОСМОТР';
      box.appendChild(lbl);
      const content = document.createElement('div'); content.className = 'prev-content';
      const latex = expr2latex(rawL || '?') + ' = ' + expr2latex(rawR || '?');
      katex.render(latex, content, { throwOnError: false, displayMode: false });
      box.appendChild(content);
    } catch {
      box.innerHTML = `<span class="prev-lbl">ПРЕДПРОСМОТР</span><div class="prev-content" style="color:var(--blue);font-family:var(--mono)">${H(rawL)} = ${H(rawR)}</div>`;
    }
  }, 280);
}


/* ── EXPRESSION NORMALIZER ─────────────────────────────
   Переводит пользовательский ввод в синтаксис math.js
   Поддерживает: ln, lg, log10, log2, tg, ctg, arctg, arcctg,
   arcsin, arccos, sh, ch, th, cth, sign, sgn, abs, pi, e, ...
─────────────────────────────────────────────────────── */
function normalizeExpr(raw) {
  let s = raw.trim();

  // ── Шаг 1: сначала переименовываем функции (до любых замен умножения) ──

  // Русские / альтернативные имена → math.js
  s = s.replace(/\bln\b/g,      '__LN__');
  s = s.replace(/\blg\b/g,      '__LG__');
  s = s.replace(/\blog10\b/g,   '__LG__');
  s = s.replace(/\blog2\b/g,    '__LOG2__');
  s = s.replace(/\bld\b/g,      '__LOG2__');

  // tg/ctg (до замены)
  s = s.replace(/\bctg\b/g,     '__CTG__');
  s = s.replace(/\btg\b/g,      '__TG__');

  // arc-функции
  s = s.replace(/\barcctg\b/g,  '__ARCCTG__');
  s = s.replace(/\barctg\b/g,   'atan');
  s = s.replace(/\barcsin\b/g,  'asin');
  s = s.replace(/\barccos\b/g,  'acos');
  s = s.replace(/\barctan\b/g,  'atan');

  // Гиперболические
  s = s.replace(/\bsh\b/g,      'sinh');
  s = s.replace(/\bch\b/g,      'cosh');
  s = s.replace(/\bth\b/g,      'tanh');
  s = s.replace(/\bcth\b/g,     '__CTH__');

  // sign/sgn
  s = s.replace(/\bsgn\b/g,     'sign');

  // степень ** → ^
  s = s.replace(/\*\*/g, '^');

  // ── Шаг 2: раскрываем плейсхолдеры в финальные имена math.js ──
  s = s.replace(/__LN__/g,     'log');       // math.js log() без 2-го аргумента = ln
  s = s.replace(/__LG__/g,     '__LOG10F__'); // временный маркер
  s = s.replace(/__LOG2__/g,   '__LOG2F__');
  s = s.replace(/__TG__/g,     'tan');
  s = s.replace(/__CTG__/g,    '__CTGF__');
  s = s.replace(/__CTH__/g,    '__CTHF__');

  // ── Шаг 3: неявное умножение ПОСЛЕ переименования ──
  // 2x → 2*x,  2( → 2*(
  s = s.replace(/(\d)([\(a-zA-Z_])/g, '$1*$2');
  // x( → x*(  (только если не имя функции заканчивается на букву перед скобкой)
  // Список всех допустимых имён после замен
  const knownFuncs = [
    'sin','cos','tan','asin','acos','atan','atan2',
    'log','exp','sqrt','cbrt','abs','sinh','cosh','tanh',
    'sign','ceil','floor','round','pow',
    '__LOG10F__','__LOG2F__','__CTGF__','__CTHF__','__ARCCTG__'
  ];
  // x*sin( — не трогать, x*y( — добавить ещё *  (уже добавили * после цифр)
  // Добавляем * перед ( после буквы/цифры, если предшествующее слово — не функция
  s = s.replace(/([a-zA-Z0-9_]+)\s*\(/g, (m, name) => {
    if (knownFuncs.includes(name)) return name + '(';
    if (name.length === 1) return name + '*('; // одиночная переменная: x( → x*(
    return name + '('; // многобуквенное — скорее всего уже функция
  });

  // ── Шаг 4: раскрываем финальные маркеры ──
  // __LOG10F__(x) → log(x, 10)
  s = s.replace(/__LOG10F__\(([^()]*)\)/g, (_, inner) => `log(${inner}, 10)`);
  // __LOG2F__(x) → log(x, 2)
  s = s.replace(/__LOG2F__\(([^()]*)\)/g,  (_, inner) => `log(${inner}, 2)`);
  // __CTGF__(x) → (1 / tan(x))
  s = s.replace(/__CTGF__\(([^()]*)\)/g,   (_, inner) => `(1 / tan(${inner}))`);
  // __CTHF__(x) → (1 / tanh(x))
  s = s.replace(/__CTHF__\(([^()]*)\)/g,   (_, inner) => `(1 / tanh(${inner}))`);
  // __ARCCTG__(x) → (pi / 2 - atan(x))
  s = s.replace(/__ARCCTG__\(([^()]*)\)/g, (_, inner) => `(pi / 2 - atan(${inner}))`);

  return s;
}

/* Безопасное вычисление с нормализованным выражением */
function safeEval(expr, x) {
  try {
    const v = math.evaluate(expr, { x });
    return (isFinite(v) && !isNaN(v) && typeof v === 'number') ? v : null;
  } catch { return null; }
}

/* ── MATH SETUP ────────────────────────────────────────── */
function setupFunction() {
  const raw = S.expr;
  const ex = normalizeExpr(raw);
  S.exprNorm = ex;
  S.f = x => safeEval(ex, x);
  try {
    const d1 = math.derivative(ex, 'x');
    S.df = x => { try { return d1.evaluate({ x }); } catch { return null; } };
    S.derivStr = d1.toString();
    try {
      const d2 = math.derivative(d1, 'x');
      S.d2f = x => { try { return d2.evaluate({ x }); } catch { return null; } };
      S.deriv2Str = d2.toString();
    } catch {
      const h = 1e-6;
      S.d2f = x => (S.f(x+h) - 2*S.f(x) + S.f(x-h)) / (h*h);
      S.deriv2Str = "f''(x) [числ.]";
    }
  } catch {
    const h = 1e-7;
    S.df = x => {
      const a = S.f(x+h), b = S.f(x-h);
      return (a !== null && b !== null) ? (a-b)/(2*h) : null;
    };
    S.derivStr = "f'(x) [числ.]";
    S.d2f = x => {
      const a = S.f(x+h), c = S.f(x), b = S.f(x-h);
      return (a!==null&&c!==null&&b!==null) ? (a-2*c+b)/(h*h) : null;
    };
    S.deriv2Str = "f''(x) [числ.]";
  }
  S.polyCoeffs = detectPoly(ex);
}

/* ── LIVE CHART ────────────────────────────────────────── */
let liveChartInst = null;
let liveTimer = null;

function updateLiveChart() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(_drawLiveChart, 350);
}

function _drawLiveChart() {
  const L = parseFloat($('Linput').value);
  const R = parseFloat($('Rinput').value);
  if (isNaN(L) || isNaN(R) || L >= R) return;

  const isDouble = S.inputMode === 'double';

  let rawF, rawG, normF, normG, normDiff;
  if (isDouble) {
    rawF = ($('funcInputL') || {}).value?.trim() || '';
    rawG = ($('funcInputR') || {}).value?.trim() || '';
    if (!rawF && !rawG) return;
    normF    = rawF ? normalizeExpr(rawF) : null;
    normG    = rawG ? normalizeExpr(rawG) : null;
    normDiff = (normF && normG) ? `(${normF}) - (${normG})` : (normF || normG);
  } else {
    rawF = ($('funcInput') || {}).value?.trim() || '';
    if (!rawF) return;
    normF    = normalizeExpr(rawF);
    normDiff = normF;
    normG    = null;
  }

  // Sanity check
  const mid = (L + R) / 2;
  const testOk = safeEval(normF || normDiff, mid) !== null ||
                 safeEval(normF || normDiff, L)   !== null;
  if (!testOk && !isDouble) return;

  const N = 700;
  const gStep = (R - L) / N;
  const xs = [];
  const ysF = [], ysG = [], ysDiff = [];
  for (let i = 0; i <= N; i++) {
    const x = L + i * gStep;
    xs.push(x);
    ysF.push(normF    ? safeEval(normF,    x) : null);
    ysG.push(normG    ? safeEval(normG,    x) : null);
    ysDiff.push(normDiff ? safeEval(normDiff, x) : null);
  }

  // Find intersections / zeros in diff
  const roots = [];
  for (let i = 0; i < xs.length - 1; i++) {
    if (ysDiff[i] !== null && ysDiff[i+1] !== null && ysDiff[i] * ysDiff[i+1] < 0) {
      let a = xs[i], b = xs[i+1];
      for (let k = 0; k < 55; k++) {
        const m = (a+b)/2, fm = safeEval(normDiff, m);
        if (fm === null || Math.abs(fm) < 1e-14) break;
        if (safeEval(normDiff, a) * fm < 0) b = m; else a = m;
      }
      const rx = (a+b)/2;
      // y-value: average of f and g at root for double mode
      const ry = isDouble && normF ? (safeEval(normF, rx) ?? 0) : 0;
      roots.push({ x: rx, y: ry });
    }
  }

  const sub = $('liveGraphSub');
  if (sub) {
    if (isDouble)
      sub.textContent = `f(x) = ${rawF}  ·  g(x) = ${rawG}  ·  [${L}, ${R}]  ·  пересечений: ${roots.length}`;
    else
      sub.textContent = `f(x) = ${rawF}  ·  [${L}, ${R}]  ·  нулей: ${roots.length}`;
  }

  const canvas = $('liveChart');
  if (!canvas) return;
  if (liveChartInst) { liveChartInst.destroy(); liveChartInst = null; }

  const datasets = [];

  if (isDouble) {
    // f(x) — amber
    if (normF) datasets.push({
      label: `f(x) = ${rawF}`,
      data: ysF,
      borderColor: '#f0a020',
      borderWidth: 2.5,
      fill: false, tension: 0.1, pointRadius: 0, spanGaps: false
    });
    // g(x) — blue
    if (normG) datasets.push({
      label: `g(x) = ${rawG}`,
      data: ysG,
      borderColor: '#4da6e8',
      borderWidth: 2.5,
      fill: false, tension: 0.1, pointRadius: 0, spanGaps: false
    });
    // Intersection points
    datasets.push({
      label: 'Пересечения',
      data: roots,
      type: 'scatter',
      pointRadius: 9, pointHoverRadius: 12,
      pointBackgroundColor: '#4ec885',
      pointBorderColor: '#07080f', pointBorderWidth: 2,
      showLine: false
    });
  } else {
    // y=0 axis
    datasets.push({
      label: 'y = 0',
      data: xs.map(() => 0),
      borderColor: 'rgba(255,255,255,.08)',
      borderWidth: 1, pointRadius: 0, fill: false
    });
    // f(x)
    datasets.push({
      label: `f(x) = ${rawF}`,
      data: ysF,
      borderColor: '#f0a020',
      borderWidth: 2.5,
      fill: false, tension: 0.1, pointRadius: 0, spanGaps: false
    });
    // Zeros
    datasets.push({
      label: 'Нули',
      data: roots,
      type: 'scatter',
      pointRadius: 8, pointHoverRadius: 11,
      pointBackgroundColor: '#4ec885',
      pointBorderColor: '#07080f', pointBorderWidth: 2,
      showLine: false
    });
  }

  liveChartInst = new Chart(canvas, {
    type: 'line',
    data: { labels: xs, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      scales: {
        x: {
          type: 'linear',
          ticks: { color: '#4a4d62', font: { family: "'JetBrains Mono'", size: 10 }, maxTicksLimit: 12,
            callback: v => typeof v === 'number' ? +v.toFixed(3) : v },
          grid: { color: '#111220' }, border: { color: '#1e2030' }
        },
        y: {
          ticks: { color: '#4a4d62', font: { family: "'JetBrains Mono'", size: 10 } },
          grid: { color: '#111220' }, border: { color: '#1e2030' }
        }
      },
      plugins: {
        legend: { labels: { color: '#6b6f88', font: { family: "'JetBrains Mono'", size: 10 }, boxWidth: 10 } },
        tooltip: {
          backgroundColor: '#0d0e18', borderColor: '#1e2030', borderWidth: 1,
          titleColor: '#f0a020', bodyColor: '#dde1f2',
          titleFont: { family: "'JetBrains Mono'", size: 11 },
          bodyFont:  { family: "'JetBrains Mono'", size: 11 },
          callbacks: {
            title: items => `x = ${parseFloat(items[0].label).toFixed(4)}`,
            label: item => {
              if (item.dataset.type === 'scatter') {
                const lbl = isDouble ? 'пересечение' : 'ноль';
                return ` ${lbl}: x ≈ ${item.raw.x.toFixed(6)}, y ≈ ${item.raw.y.toFixed(6)}`;
              }
              return ` ${item.dataset.label.split(' = ')[0]}: ${item.raw !== null ? parseFloat(item.raw).toFixed(6) : 'н/о'}`;
            }
          }
        }
      }
    }
  });
}



function detectPoly(exprStr) {
  try {
    let curr = math.parse(exprStr);
    for (let deg = 0; deg <= 10; deg++) {
      const pts = [-2.7, -1.1, 0, 1.3, 2.9];
      const vals = pts.map(x => { try { return curr.evaluate({ x }); } catch { return NaN; } });
      if (vals.some(v => isNaN(v) || !isFinite(v))) return null;
      const ref = vals[0];
      if (vals.every(v => Math.abs(v - ref) < 1e-7)) {
        let d = math.parse(exprStr);
        const ca = [];
        for (let k = 0; k <= deg; k++) {
          const v = d.evaluate({ x: 0 });
          let fac = 1; for (let j = 1; j <= k; j++) fac *= j;
          ca.push(Math.abs(v/fac) < 1e-10 ? 0 : Math.round(v/fac * 1e9) / 1e9);
          if (k < deg) d = math.derivative(d, 'x');
        }
        return ca.reverse();
      }
      curr = math.derivative(curr, 'x');
    }
    return null;
  } catch { return null; }
}

/* ── EXAMPLES / INPUTS ─────────────────────────────────── */
function setEx(expr, L, R, step) {
  $('funcInput').value = expr;
  $('Linput').value = L;
  $('Rinput').value = R;
  if (step !== undefined) $('stepInput').value = step;
  updatePreview();
  updateLiveChart();
}

function readInputs() {
  S.L = parseFloat($('Linput').value);
  S.R = parseFloat($('Rinput').value);
  S.step = parseFloat($('stepInput').value);
  S.eps = parseFloat($('epsInput').value);
  S.dec = parseInt($('decInput').value);
  if (isNaN(S.L) || isNaN(S.R) || S.L >= S.R) { alert('L < R обязательно'); return false; }
  if (isNaN(S.step) || S.step <= 0) { alert('Шаг h > 0'); return false; }
  if (isNaN(S.eps) || S.eps <= 0) { alert('ε > 0'); return false; }
  if (isNaN(S.dec) || S.dec < 1) { alert('Знаков ≥ 1'); return false; }

  if (S.inputMode === 'double') {
    const rawL = $('funcInputL').value.trim();
    const rawR = $('funcInputR').value.trim();
    if (!rawL || !rawR) { alert('Введите обе части уравнения f(x) и g(x)'); return false; }
    S.exprL = rawL;
    S.exprR = rawR;
    // Combined expr for zero-finding: f(x) - g(x)
    S.expr = `(${rawL}) - (${rawR})`;
  } else {
    S.expr = $('funcInput').value.trim();
    S.exprL = S.expr;
    S.exprR = null;
    if (!S.expr) { alert('Введите f(x)'); return false; }
  }

  const norm = normalizeExpr(S.expr);
  const mid = (S.L + S.R) / 2;
  if (safeEval(norm, mid) === null && safeEval(norm, S.L) === null && safeEval(norm, S.R) === null) {
    alert('Ошибка в функции или область вне области определения');
    return false;
  }
  setupFunction();
  return true;
}

/* ── METHOD SELECTOR ───────────────────────────────────── */
function selectMethod(m) {
  S.method = m;
  $('btnAnal').className  = 'msel-btn' + (m === 'anal'  ? ' active-anal'  : '');
  $('btnGraph').className = 'msel-btn' + (m === 'graph' ? ' active-graph' : '');
  $('badgeAnal').textContent  = m === 'anal'  ? '✓ ВЫБРАН' : 'ВЫБРАТЬ';
  $('badgeGraph').textContent = m === 'graph' ? '✓ ВЫБРАН' : 'ВЫБРАТЬ';
  $('findBtn').className = 'find-btn' + (m === 'graph' ? ' blue' : '');
  $('locResult').innerHTML = '';
  $('resultsPanel').classList.remove('vis');
}

/* ── DISPATCH ──────────────────────────────────────────── */
function runLocalization() {
  if (!readInputs()) return;
  const btn = $('findBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⟳</span> <span>Вычисляю...</span>';
  btn.classList.add('loading');
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = btn.classList.contains('blue')
      ? '▶ Найти отрезки [a, b]'
      : '▶ Найти отрезки [a, b]';
    btn.classList.remove('loading');
  }, 800);
  setTimeout(() => {
    if (S.method === 'anal') runAnalytical();
    else runGraphical();
  }, 60);
}

/* ═══════════════════════════════════════════════════════
   ANALYTICAL LOCALIZATION
   ═══════════════════════════════════════════════════════ */
function runAnalytical() {
  const { f, df, L, R } = S;
  // Шаг таблицы из параметров пользователя
  const userStep = (S.step && S.step > 0) ? S.step : 1;
  // Для надёжного поиска смен знака используем мелкую сетку (не менее 500 точек)
  const fineN = Math.max(500, Math.ceil((R - L) / Math.min(userStep, (R-L)/50)));
  const fineStep = (R - L) / fineN;

  // Мелкая сетка для поиска знакочередований и критических точек
  const finePts = [];
  for (let i = 0; i <= fineN; i++) {
    const x = L + i * fineStep;
    finePts.push({ i, x, fx: se(f, x), dfx: se(df, x) });
  }

  // Таблица по шагу пользователя
  const N_table = Math.round((R - L) / userStep);
  const pts = [];
  for (let i = 0; i <= N_table; i++) {
    const x = L + i * userStep;
    pts.push({ i, x, fx: se(f, x), dfx: se(df, x) });
  }
  // Убедимся что правая граница есть
  if (Math.abs(pts[pts.length-1].x - R) > 1e-9) {
    pts.push({ i: pts.length, x: R, fx: se(f, R), dfx: se(df, R) });
  }
  const N = pts.length - 1;
  const step = userStep;

  // Sign changes — ищем по мелкой сетке для надёжности
  const signChanges = [];
  for (let i = 0; i < finePts.length - 1; i++) {
    const p = finePts[i], n = finePts[i+1];
    if (p.fx !== null && n.fx !== null && p.fx * n.fx < 0)
      signChanges.push({ a: p.x, b: n.x, fa: p.fx, fb: n.fx });
  }

  // Critical points f'=0 — тоже по мелкой сетке
  const criticals = [];
  for (let i = 0; i < finePts.length - 1; i++) {
    const p = finePts[i], n = finePts[i+1];
    if (p.dfx !== null && n.dfx !== null && p.dfx * n.dfx < 0) {
      let ca = p.x, cb = n.x;
      for (let k = 0; k < 40; k++) {
        const cm = (ca+cb)/2, dm = se(df, cm);
        if (dm === null) break;
        if (se(df, ca) * dm <= 0) cb = cm; else ca = cm;
      }
      criticals.push({ x: (ca+cb)/2, fx: se(f, (ca+cb)/2) });
    }
  }

  // Build table — по пользовательскому шагу
  // Помечаем строки таблицы pts, попадающие рядом со сменой знака или критической точкой
  const scSet = new Set();
  const critSet = new Set();
  for (const sc of signChanges) {
    const ia = Math.round((sc.a - L) / step);
    const ib = Math.round((sc.b - L) / step);
    for (let d = -1; d <= 1; d++) { scSet.add(ia+d); scSet.add(ib+d); }
  }
  for (const c of criticals) {
    const idx = Math.round((c.x - L) / step);
    for (let d = -2; d <= 2; d++) critSet.add(idx + d);
  }
  // Показываем все строки если таблица небольшая, иначе прореживаем
  const tableRows = pts.length <= 50
    ? pts
    : pts.filter((p, i) => scSet.has(i) || critSet.has(i) || i === 0 || i === pts.length - 1 || i % Math.max(1, Math.floor(N/30)) === 0);

  S.foundIntervals = signChanges.map(sc => ({ a: sc.a, b: sc.b, fa: sc.fa, fb: sc.fb }));

  /* ── RENDER ── */
  let html = `<div class="proc-box">
    <div class="proc-hdr">
      <div class="proc-dot dot-amber"></div>
      <span class="proc-ttl">Аналитический метод · ${S.inputMode === "double" ? H(S.exprL) + " = " + H(S.exprR) : "f(x) = " + H(S.expr)} · [${S.L}, ${S.R}]</span>
    </div>
    <div class="proc-body">

    <div class="info-grid">
      <div class="info-card">
        <div class="ic-lbl">f(x)</div>
        <div class="ic-val">${H(S.expr)}</div>
      </div>
      <div class="info-card">
        <div class="ic-lbl">f'(x)</div>
        <div class="ic-val blue">${H(S.derivStr)}</div>
      </div>
      <div class="info-card">
        <div class="ic-lbl">Шаг таблицы h</div>
        <div class="ic-val white">${step.toFixed(step < 1 ? 4 : 2)}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--txt2);margin-top:3px">Строк таблицы: ${pts.length} · Сетка поиска: ${fineN}</div>
      </div>
      <div class="info-card">
        <div class="ic-lbl">Смен знака</div>
        <div class="ic-val ic-big">${signChanges.length}</div>
      </div>
    </div>`;

  if (criticals.length) {
    html += `<div class="warnbox" style="border-color:rgba(168,130,232,.3);color:var(--purple);background:rgba(168,130,232,.06)">
      📍 Критические точки f'(x) = 0 (смена монотонности):<br>
      ${criticals.map(c => `<b>x ≈ ${fmt(c.x, 4)}</b> [f ≈ ${fmt(c.fx, 4)}]`).join(' &nbsp;·&nbsp; ')}
    </div>`;
  }

  html += `<div class="sec-t" style="margin-bottom:8px">
    Таблица значений · шаг h = ${step.toFixed(step < 1 ? 4 : 2)} · ${tableRows.length} строк
    &nbsp;·&nbsp; <span style="color:var(--green)">●</span> смена знака
    &nbsp;·&nbsp; <span style="color:var(--purple)">●</span> критич. точка
  </div>
  <div class="tw" style="margin-bottom:18px">
    <table class="it">
      <thead><tr>
        <th>i</th><th>x</th><th>f(x)</th><th>f'(x)</th><th>sgn</th><th>Смена?</th>
      </tr></thead>
      <tbody>`;

  for (let i = 0; i < tableRows.length; i++) {
    const r = tableRows[i];
    // Проверяем, есть ли смена знака рядом с этой точкой в мелкой сетке
    const isNearSign = signChanges.some(sc => Math.abs(r.x - sc.a) < step * 1.5 || Math.abs(r.x - sc.b) < step * 1.5);
    const isSign = isNearSign;
    const isCrit = critSet.has(r.i) && !isSign;
    const sgnTxt = r.fx === null ? '—' : (r.fx > 0 ? '+' : (r.fx < 0 ? '−' : '0'));
    const sgnCls = r.fx === null ? '' : (r.fx > 0 ? 'pos' : (r.fx < 0 ? 'neg' : ''));
    let changeTxt = `<span class="nochange">—</span>`;
    if (isSign && i + 1 < tableRows.length) {
      const nxt = tableRows[i + 1];
      if (r.fx !== null && nxt.fx !== null && r.fx * nxt.fx < 0) {
        const f1 = r.fx > 0 ? '+' : '−';
        const f2 = nxt.fx > 0 ? '+' : '−';
        changeTxt = `<span class="chg">✓ ${f1}→${f2}</span>`;
      } else {
        changeTxt = `<span style="color:var(--green);font-size:10px">≈ нуль</span>`;
      }
    }
    html += `<tr class="${isSign ? 'sign-row' : ''}">
      <td class="nc">${r.i}</td>
      <td style="color:${isCrit?'var(--purple)':isSign?'var(--green)':'var(--txt)'}">${fmt(r.x, 4)}</td>
      <td class="${sgnCls}">${r.fx !== null ? fmt(r.fx, 4) : 'н/о'}</td>
      <td style="color:${isCrit?'var(--purple)':'var(--txt2)'}">${r.dfx !== null ? fmt(r.dfx, 4) : 'н/о'}</td>
      <td class="${sgnCls}" style="font-weight:600">${sgnTxt}</td>
      <td>${changeTxt}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;

  html += `<div class="infobox" style="margin-bottom:16px">
    <b style="color:var(--amber)">Теорема Больцано–Коши:</b> если f непрерывна на [a,b] и f(a)·f(b) &lt; 0,<br>
    то ∃ x* ∈ (a,b) : f(x*) = 0. Каждый отрезок содержит нечётное число корней.
  </div>`;

  html += renderFoundIntervals(S.foundIntervals, 'anal');
  html += `</div></div>`;
  $('locResult').innerHTML = html;
  if (S.foundIntervals.length) triggerSolve(S.foundIntervals);
}

/* ═══════════════════════════════════════════════════════
   GRAPHICAL LOCALIZATION
   ═══════════════════════════════════════════════════════ */
function runGraphical() {
  clickA = null; clickB = null; clickMode = null;
  const { L, R } = S;
  const norm = S.exprNorm || normalizeExpr(S.expr);
  const N = 600, gStep = (R - L) / N;
  const xs = [], ys = [];
  for (let i = 0; i <= N; i++) { const x = L + i*gStep; xs.push(x); ys.push(safeEval(norm, x)); }

  const autoIvs = [];
  for (let i = 0; i < xs.length - 1; i++) {
    if (ys[i] !== null && ys[i+1] !== null && ys[i] * ys[i+1] < 0)
      autoIvs.push({ a: xs[i], b: xs[i+1], fa: ys[i], fb: ys[i+1] });
  }
  S.foundIntervals = autoIvs;

  let html = `<div class="proc-box">
    <div class="proc-hdr">
      <div class="proc-dot dot-blue"></div>
      <span class="proc-ttl">Графический метод · ${S.inputMode === "double" ? H(S.exprL) + " = " + H(S.exprR) : "f(x) = " + H(S.expr)} · [${S.L}, ${S.R}]</span>
    </div>
    <div class="proc-body">
    <div class="graph-wrap">
      <div class="graph-sub">ГРАФИК f(x) на [${S.L}, ${S.R}] &nbsp;|&nbsp; Автоматически найдено нулей: ${autoIvs.length} &nbsp;|&nbsp; ◆ — нули</div>
      <div class="click-mode-bar">
        <span class="click-bar-lbl">Ручной выбор:</span>
        <button class="click-btn" id="clickBtnA" onclick="setClickMode('a')">📌 a</button>
        <button class="click-btn" id="clickBtnB" onclick="setClickMode('b')">📌 b</button>
        <button class="click-btn red-btn" onclick="clearClicks()">✕</button>
        <button class="find-btn green" style="padding:6px 14px;font-size:12px" onclick="applyManualInterval()">▶ Применить</button>
        <div class="picked-vals">a = <span id="pvA">—</span> &nbsp;|&nbsp; b = <span id="pvB">—</span></div>
      </div>
      <div class="graph-c"><canvas id="graphChart"></canvas></div>
      <div class="graph-hint">🖱 «Выбрать a» → кликните на графике = левая граница. Затем «Выбрать b» = правая. Нажмите «Применить» для уточнения. Либо используйте отрезки ниже.</div>
    </div>`;

  html += renderFoundIntervals(autoIvs, 'graph');
  html += `</div></div>`;
  $('locResult').innerHTML = html;

  // Build Chart.js
  setTimeout(() => {
    const canvas = $('graphChart');
    if (!canvas) return;
    if (chartInst) { chartInst.destroy(); chartInst = null; }

    const normDiff = S.exprNorm || normalizeExpr(S.expr);
    const normF2 = S.inputMode === 'double' ? normalizeExpr(S.exprL) : null;
    const normG2 = S.inputMode === 'double' ? normalizeExpr(S.exprR) : null;

    const rootData = autoIvs.map(iv => {
      let a = iv.a, b = iv.b;
      for (let k = 0; k < 60; k++) {
        const m = (a+b)/2, fm = safeEval(normDiff, m);
        if (fm === null || Math.abs(fm) < 1e-14) break;
        if (safeEval(normDiff, a) * fm < 0) b = m; else a = m;
      }
      const rx = (a+b)/2;
      const ry = S.inputMode === 'double' && normF2 ? (safeEval(normF2, rx) ?? 0) : 0;
      return { x: rx, y: ry };
    });

    // Build datasets
    const isDouble = S.inputMode === 'double';
    const graphDatasets = [];
    if (isDouble) {
      // f(x) amber, g(x) blue
      const ysF2 = xs.map(x => safeEval(normF2, x));
      const ysG2 = xs.map(x => safeEval(normG2, x));
      graphDatasets.push(
        { label: `f(x) = ${S.exprL}`, data: ysF2, borderColor: '#f0a020', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, spanGaps: false },
        { label: `g(x) = ${S.exprR}`, data: ysG2, borderColor: '#4da6e8', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, spanGaps: false }
      );
    } else {
      graphDatasets.push(
        { label: `f(x)`, data: ys, borderColor: '#f0a020', borderWidth: 2, fill: false, tension: 0.1, pointRadius: 0, spanGaps: false },
        { label: 'y = 0', data: xs.map(() => 0), borderColor: 'rgba(255,255,255,.06)', borderWidth: 1, pointRadius: 0, fill: false }
      );
    }
    graphDatasets.push(
      { label: isDouble ? 'Пересечения' : 'Нули (авто)', data: rootData, type: 'scatter',
        pointRadius: 9, pointHoverRadius: 11,
        pointBackgroundColor: '#4ec885', pointBorderColor: '#07080f', pointBorderWidth: 2, showLine: false },
      { label: 'a', data: [], type: 'scatter', pointRadius: 10, pointBackgroundColor: '#f0a020', pointBorderColor: '#000', pointBorderWidth: 2, showLine: false, id: 'dsA' },
      { label: 'b', data: [], type: 'scatter', pointRadius: 10, pointBackgroundColor: '#4da6e8', pointBorderColor: '#000', pointBorderWidth: 2, showLine: false, id: 'dsB' }
    );

    chartInst = new Chart(canvas, {
      type: 'line',
      data: {
        labels: xs,
        datasets: graphDatasets
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (evt) => onChartClick(evt, chartInst),
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { type: 'linear',
            ticks: { color: '#4a4d62', font: { family:"'JetBrains Mono'", size: 10 },
              maxTicksLimit: 10, callback: v => typeof v==='number' ? v.toFixed(1) : v },
            grid: { color: '#111220' }, border: { color: '#1e2030' } },
          y: { ticks: { color: '#4a4d62', font: { family:"'JetBrains Mono'", size: 10 } },
            grid: { color: '#111220' }, border: { color: '#1e2030' } }
        },
        plugins: {
          legend: { labels: { color: '#6b6f88', font: { family:"'JetBrains Mono'", size: 10 }, boxWidth: 10 } },
          tooltip: {
            backgroundColor: '#0d0e18', borderColor: '#1e2030', borderWidth: 1,
            titleColor: '#f0a020', bodyColor: '#dde1f2',
            titleFont: { family:"'JetBrains Mono'", size: 11 },
            bodyFont:  { family:"'JetBrains Mono'", size: 11 },
            callbacks: {
              title: items => `x = ${parseFloat(items[0].label).toFixed(S.dec)}`,
              label: item => {
                if (item.dataset.type === 'scatter') return ` ${item.dataset.label}: x=${item.raw.x.toFixed(S.dec)}`;
                return ` f(x) = ${item.raw !== null ? parseFloat(item.raw).toFixed(S.dec) : 'н/о'}`;
              }
            }
          }
        }
      }
    });
  }, 60);

  if (autoIvs.length) triggerSolve(autoIvs);
}

/* ── CHART CLICK (touch + mouse) ─────────────────────── */
function onChartClick(evt, chart) {
  if (!clickMode) return;
  const pts = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: false }, true);
  if (!pts.length) return;
  const xv = chart.data.labels[pts[0].index];
  const x = typeof xv === 'number' ? xv : parseFloat(xv);
  if (!isFinite(x)) return;

  if (clickMode === 'a') {
    clickA = x;
    $('pvA').textContent = fmt(x, 4);
    const ds = chart.data.datasets.find(d => d.id === 'dsA');
    if (ds) { ds.data = [{ x, y: 0 }]; chart.update(); }
    $('clickBtnA').className = 'click-btn';
    setClickMode(null);
  } else {
    clickB = x;
    $('pvB').textContent = fmt(x, 4);
    const ds = chart.data.datasets.find(d => d.id === 'dsB');
    if (ds) { ds.data = [{ x, y: 0 }]; chart.update(); }
    $('clickBtnB').className = 'click-btn';
    setClickMode(null);
  }
}

function setClickMode(m) {
  clickMode = m;
  const ba = $('clickBtnA'), bb = $('clickBtnB');
  if (ba) ba.className = 'click-btn' + (m === 'a' ? ' active-a' : '');
  if (bb) bb.className = 'click-btn' + (m === 'b' ? ' active-b' : '');
}

function clearClicks() {
  clickA = null; clickB = null; setClickMode(null);
  const pvA = $('pvA'), pvB = $('pvB');
  if (pvA) pvA.textContent = '—';
  if (pvB) pvB.textContent = '—';
  if (chartInst) {
    const da = chartInst.data.datasets.find(d => d.id === 'dsA');
    const db = chartInst.data.datasets.find(d => d.id === 'dsB');
    if (da) da.data = []; if (db) db.data = [];
    chartInst.update();
  }
}

function applyManualInterval() {
  if (clickA === null || clickB === null) { alert('Кликните на графике для выбора a и b'); return; }
  let a = Math.min(clickA, clickB), b = Math.max(clickA, clickB);
  if (a >= b) { alert('a < b'); return; }
  const fa = se(S.f, a), fb = se(S.f, b);
  const ivs = [{ a, b, fa: fa ?? 0, fb: fb ?? 0 }];
  S.foundIntervals = ivs;
  const chips = $('ivChips');
  if (chips) chips.innerHTML = `<span class="chip iv-chip">✓ [${fmt(a,4)}, ${fmt(b,4)}] — ручной</span>`;
  triggerSolve(ivs);
}

/* ── FOUND INTERVALS ───────────────────────────────────── */
function renderFoundIntervals(ivs, meth) {
  if (!ivs.length)
    return `<div class="errbox">Смен знака не обнаружено на [${S.L}, ${S.R}]. Расширьте область поиска.</div>`;

  let html = `<div class="iv-panel">
    <div class="iv-title">Найденные отрезки · f(a)·f(b) &lt; 0 · (${ivs.length} шт.)</div>
    <div class="chips" id="ivChips">`;
  for (const iv of ivs) {
    const s1 = iv.fa > 0 ? '+' : '−', s2 = iv.fb > 0 ? '+' : '−';
    html += `<span class="chip iv-chip">✓ [${fmt(iv.a,4)}, ${fmt(iv.b,4)}] <span style="color:var(--txt2);font-size:10px">(${s1}→${s2})</span></span>`;
  }
  html += `</div>`;
  if (meth === 'anal') {
    html += `<div style="margin-top:9px;font-family:var(--mono);font-size:11px;color:var(--txt2);line-height:1.8">
      Больцано–Коши: f непрерывна, f(a)·f(b) &lt; 0 ⟹ ∃ x* ∈ (a,b) : f(x*) = 0
    </div>`;
  } else {
    html += `<div style="margin-top:9px;font-family:var(--mono);font-size:11px;color:var(--txt2);line-height:1.8">
      Нули — визуальные пересечения графика с осью Ox. Для точного [a, b] — выберите кликами.
    </div>`;
  }
  html += `</div>`;
  return html;
}

/* ═══════════════════════════════════════════════════════
   NUMERICAL METHODS
   ═══════════════════════════════════════════════════════ */
function runBisect(a, b) {
  const f = S.f; let fa = se(f,a), fb = se(f,b);
  if (fa===null||fb===null) throw new Error('f не определена на концах');
  if (fa*fb > 0) throw new Error('f(a)·f(b) > 0');
  const rows = [];
  for (let i = 1; i <= 600; i++) {
    const c = (a+b)/2, fc = se(f,c), len = b-a;
    rows.push({ n:i, a, b, c, fa, fb, fc: fc??0, len, half: len/2 });
    if (fc===null||Math.abs(fc)<1e-15||len/2<=S.eps) break;
    if (fa*fc < 0) { b=c; fb=fc; } else { a=c; fa=fc; }
  }
  return rows;
}

function runChord(a, b) {
  const f = S.f; let fa = se(f,a), fb = se(f,b);
  if (fa===null||fb===null) throw new Error('f не определена на концах');
  if (fa*fb > 0) throw new Error('f(a)·f(b) > 0');
  const rows = []; let prev = null;
  for (let i = 1; i <= 600; i++) {
    if (Math.abs(fb-fa) < 1e-16) break;
    const x = a - fa*(b-a)/(fb-fa), fx = se(f,x);
    const delta = prev!==null ? Math.abs(x-prev) : null;
    rows.push({ n:i, a, b, x, fa, fb, fx: fx??0, delta });
    if (Math.abs(fx??1) <= S.eps || (delta!==null && delta<=S.eps)) break;
    if (fa*(fx??0) < 0) { b=x; fb=fx??fb; } else { a=x; fa=fx??fa; }
    prev = x;
  }
  return rows;
}

function runNewton(a, b) {
  const f = S.f, df = S.df, d2f = S.d2f;
  const fa = se(f,a), fb = se(f,b);
  let x0;
  try {
    const d2a = d2f(a), d2b = d2f(b);
    if (fa!==null && isFinite(d2a) && fa*d2a > 0) x0 = a;
    else if (fb!==null && isFinite(d2b) && fb*d2b > 0) x0 = b;
    else x0 = (a+b)/2;
  } catch { x0 = (a+b)/2; }
  const rows = []; let x = x0;
  for (let i = 1; i <= 600; i++) {
    const fx = se(f,x), dfx = df(x);
    if (fx===null) throw new Error('f(x) не опр. при x='+fmt(x));
    if (!isFinite(dfx)||Math.abs(dfx)<1e-15) throw new Error("f'(x)≈0 при x="+fmt(x));
    const xn = x - fx/dfx, delta = Math.abs(xn-x);
    rows.push({ n:i, x, fx, dfx, xn, delta });
    if (delta <= S.eps) { x = xn; break; }
    x = xn;
  }
  return { rows, x0 };
}

/* ── HORNER ─────────────────────────────────────────────── */

/* Комплексные числа { re, im } */
const C = {
  add: (a,b)=>({ re:a.re+b.re, im:a.im+b.im }),
  mul: (a,b)=>({ re:a.re*b.re - a.im*b.im, im:a.re*b.im + a.im*b.re }),
  fmtC(z, dec) {
    const d = dec ?? S.dec;
    const re = z.re.toFixed(d), im = Math.abs(z.im).toFixed(d);
    if (Math.abs(z.im) < 1e-10) return re;
    const sign = z.im < 0 ? ' − ' : ' + ';
    return `${re}${sign}${im}i`;
  }
};

function hornerEval(coeffs, r) {
  const n = coeffs.length - 1;
  const b = [coeffs[0]];
  const rows = [{ k:0, deg:n, ak:coeffs[0], prev:null, bk:coeffs[0] }];
  for (let i = 1; i <= n; i++) {
    const bi = b[i-1]*r + coeffs[i];
    b.push(bi);
    rows.push({ k:i, deg:n-i, ak:coeffs[i], prev:b[i-1], bk:bi });
  }
  return { value: b[n], quot: b.slice(0, n), rows };
}

/* Горнер с комплексным x — возвращает { re, im } */
function hornerEvalComplex(coeffs, z) {
  const n = coeffs.length - 1;
  let b = { re: coeffs[0], im: 0 };
  const rows = [{ k:0, deg:n, ak:coeffs[0], bk: {...b} }];
  for (let i = 1; i <= n; i++) {
    b = C.add(C.mul(b, z), { re: coeffs[i], im: 0 });
    rows.push({ k:i, deg:n-i, ak:coeffs[i], bk: {...b} });
  }
  return { value: b, rows };
}

/* Дискриминант и комплексные корни квадратного трёхчлена ax²+bx+c */
function solveQuadratic(coeffs) {
  if (coeffs.length !== 3) return null;
  const [a, b, c] = coeffs;
  if (Math.abs(a) < 1e-12) return null;
  const D = b*b - 4*a*c;
  if (D >= 0) {
    const r1 = (-b + Math.sqrt(D)) / (2*a);
    const r2 = (-b - Math.sqrt(D)) / (2*a);
    return { D, r1: {re:r1,im:0}, r2: {re:r2,im:0}, complex: false };
  } else {
    const re = -b / (2*a);
    const im =  Math.sqrt(-D) / (2*a);
    return { D, r1: {re, im}, r2: {re, im:-im}, complex: true };
  }
}

function poly2str(coeffs) {
  const n = coeffs.length - 1; const parts = [];
  for (let i = 0; i <= n; i++) {
    const c = coeffs[i], p = n - i;
    if (Math.abs(c) < 1e-9) continue;
    const ac = Math.abs(Math.round(c*1e9)/1e9);
    const sg = c < 0 ? '− ' : (parts.length ? '+ ' : '');
    let t;
    if (p===0) t = `${sg}${ac}`;
    else if (p===1) t = `${sg}${ac===1?'':ac}x`;
    else t = `${sg}${ac===1?'':ac}x^${p}`;
    parts.push(t.trim());
  }
  return parts.join(' ').trim() || '0';
}

/* Вспомогательная функция: уточнение корня методом Ньютона по полиному cc на [a,b] */
function newtonOnPoly(cc, a, b) {
  const pf  = x => hornerEval(cc,x).value;
  const pdf = x => { const{quot} = hornerEval(cc,x); return quot.length>0 ? hornerEval(quot,x).value : 0; };
  let x = (a+b)/2; const sr = [];
  for (let i = 1; i <= 200; i++) {
    const fx = pf(x), dfx = pdf(x);
    if (Math.abs(dfx) < 1e-14) break;
    const xn = x - fx/dfx, delta = Math.abs(xn-x);
    sr.push({ n:i, x, fx, dfx, xn, delta });
    if (delta < S.eps * 0.001) { x=xn; break; }
    x = xn;
  }
  return { root: x, sr };
}

function runHorner() {
  if (!S.polyCoeffs) return null;
  const ivs = S.foundIntervals; if (!ivs.length) return [];
  let cc = [...S.polyCoeffs];

  /* ── ШАГ 0: первый корень находим методом Ньютона (без схемы Горнера),
              делим полином, получаем Q(x) для дальнейшей работы ── */
  const firstStep = { skip: true, firstRootSteps: null };
  if (ivs.length >= 1) {
    const { a, b } = ivs[0];
    const { root: r0, sr: sr0 } = newtonOnPoly(cc, a, b);
    const { value: rem0, quot: qc0, rows: hr0 } = hornerEval(cc, r0);
    firstStep.root  = r0;
    firstStep.iv    = [a, b];
    firstStep.poly  = [...cc];
    firstStep.sr    = sr0;
    firstStep.hr    = hr0;
    firstStep.rem   = rem0;
    firstStep.qc    = [...qc0];
    cc = [...qc0];
  }

  /* ── ШАГИ 1, 2, …: 2-й, 3-й и т.д. корни — схемой Горнера ── */
  const steps = [];
  for (let ri = 1; ri < ivs.length && cc.length > 1; ri++) {
    const { a, b } = ivs[ri];
    const { root, sr } = newtonOnPoly(cc, a, b);
    const { value, quot:qc, rows:hr } = hornerEval(cc, root);
    steps.push({ idx: ri, root, iv:[a,b], poly:[...cc], sr, hr, rem:value, qc:[...qc] });
    cc = [...qc];
  }

  /* ── Линейный остаток — последний вещественный корень аналитически ── */
  if (cc.length === 2 && Math.abs(cc[0]) > 1e-9) {
    const root = -cc[1]/cc[0];
    if (root >= S.L - 0.5 && root <= S.R + 0.5) {
      const { rows:hr } = hornerEval(cc, root);
      steps.push({ idx: steps.length + 1, root, iv:[S.L,S.R], poly:[...cc], sr:[], hr, rem:0, qc:[cc[0]], isLinear:true });
      cc = [cc[0]];
    }
  }

  /* ── Квадратный остаток — ищем комплексные корни ── */
  if (cc.length === 3) {
    const quad = solveQuadratic(cc);
    if (quad) {
      /* Горнер с комплексным значением для каждого корня */
      const hr1 = hornerEvalComplex(cc, quad.r1).rows;
      const hr2 = hornerEvalComplex(cc, quad.r2).rows;
      steps.push({
        idx: steps.length + 1,
        poly: [...cc],
        quadratic: true,
        quad,
        hr1, hr2
      });
    }
  }

  return { firstStep, steps };
}

/* ═══════════════════════════════════════════════════════
   RENDER TABS
   ═══════════════════════════════════════════════════════ */
function bsBlock(iv, rows) {
  if (!rows.length) return '';
  const last = rows[rows.length-1], root = last.c;
  let t = `<div class="rb"><div class="rbh">
    <span class="rbi">Отрезок [${fmt(iv.a)}, ${fmt(iv.b)}]</span>
    <span class="rbv">x* ≈ ${fmt(root)}</span></div>
  <div class="rbb">
  <div class="resbox">
    <div class="ri"><span class="rl">x*</span><span class="rv">${fmt(root)}</span></div>
    <div class="ri"><span class="rl">f(x*)</span><span class="rv">${fmt(last.fc)}</span></div>
    <div class="ri"><span class="rl">|b−a| итог</span><span class="rv">${fmt(last.len)}</span></div>
    <div class="ri"><span class="rl">|b−a|/2</span><span class="rv">${fmt(last.half)}</span></div>
    <div class="ri"><span class="rl">Итераций</span><span class="rv">${rows.length}</span></div>
  </div>
  <div class="tw"><table class="it"><thead><tr>
    <th>n</th><th>a</th><th>b</th><th>c = (a+b)/2</th><th>f(a)</th><th>f(b)</th><th>f(c)</th><th>|b−a|</th><th>|b−a|/2</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], L = i===rows.length-1;
    t += `<tr class="${L?'sign-row':''}">
      <td class="nc">${r.n}</td>
      <td>${fmt(r.a)}</td><td>${fmt(r.b)}</td><td><b>${fmt(r.c)}</b></td>
      <td class="${r.fa<0?'neg':'pos'}">${fmt(r.fa)}</td>
      <td class="${r.fb<0?'neg':'pos'}">${fmt(r.fb)}</td>
      <td class="${r.fc<0?'neg':r.fc>0?'pos':'chg'}">${fmt(r.fc)}</td>
      <td>${fmt(r.len)}</td><td>${fmt(r.half)}</td>
    </tr>`;
  }
  t += `</tbody></table></div></div></div>`;
  return t;
}

function renderBisectTab() {
  const p = $('tp-bisection');
  const hdr = `<div class="mh"><div>
    <div class="mn">Метод половинного деления</div>
    <div class="mform">c = (a + b) / 2</div><br>
    <div class="mform" style="color:var(--txt2);font-size:11px">f(a)·f(c) &lt; 0 → b := c &nbsp;|&nbsp; иначе a := c</div>
  </div><div class="md">Отрезок делится пополам. Берётся та половина, где функция меняет знак. Останов: |b−a|/2 ≤ ε.</div></div>`;
  if (!S.foundIntervals.length) { p.innerHTML = hdr + `<div class="errbox">Нет локализованных отрезков.</div>`; return; }
  let html = hdr;
  for (const iv of S.foundIntervals) {
    try { html += bsBlock(iv, runBisect(iv.a, iv.b)); }
    catch (e) { html += `<div class="errbox">[${fmt(iv.a)}, ${fmt(iv.b)}]: ${H(e.message)}</div>`; }
  }
  p.innerHTML = html;
}

function chBlock(iv, rows) {
  if (!rows.length) return '';
  const last = rows[rows.length-1], root = last.x;
  let t = `<div class="rb"><div class="rbh">
    <span class="rbi">Отрезок [${fmt(iv.a)}, ${fmt(iv.b)}]</span>
    <span class="rbv">x* ≈ ${fmt(root)}</span></div>
  <div class="rbb">
  <div class="resbox">
    <div class="ri"><span class="rl">x*</span><span class="rv">${fmt(root)}</span></div>
    <div class="ri"><span class="rl">f(x*)</span><span class="rv">${fmt(last.fx)}</span></div>
    <div class="ri"><span class="rl">|δ| посл.</span><span class="rv">${last.delta!==null?fmt(last.delta):'—'}</span></div>
    <div class="ri"><span class="rl">Итераций</span><span class="rv">${rows.length}</span></div>
  </div>
  <div class="tw"><table class="it"><thead><tr>
    <th>n</th><th>a</th><th>b</th><th>x новое</th><th>f(a)</th><th>f(b)</th><th>f(x)</th><th>|x − xпред|</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], L = i===rows.length-1;
    t += `<tr class="${L?'sign-row':''}">
      <td class="nc">${r.n}</td>
      <td>${fmt(r.a)}</td><td>${fmt(r.b)}</td><td><b>${fmt(r.x)}</b></td>
      <td class="${r.fa<0?'neg':'pos'}">${fmt(r.fa)}</td>
      <td class="${r.fb<0?'neg':'pos'}">${fmt(r.fb)}</td>
      <td>${fmt(r.fx)}</td><td>${r.delta!==null?fmt(r.delta):'—'}</td>
    </tr>`;
  }
  t += `</tbody></table></div></div></div>`;
  return t;
}

function renderChordTab() {
  const p = $('tp-chord');
  const hdr = `<div class="mh"><div>
    <div class="mn">Метод хорд (ложного положения)</div>
    <div class="mform">x = a − f(a) · (b − a) / (f(b) − f(a))</div>
  </div><div class="md">Хорда через (a, f(a)) и (b, f(b)) пересекает Ox. Один конец остаётся фиксированным.</div></div>`;
  if (!S.foundIntervals.length) { p.innerHTML = hdr + `<div class="errbox">Нет локализованных отрезков.</div>`; return; }
  let html = hdr;
  for (const iv of S.foundIntervals) {
    try { html += chBlock(iv, runChord(iv.a, iv.b)); }
    catch (e) { html += `<div class="errbox">[${fmt(iv.a)}, ${fmt(iv.b)}]: ${H(e.message)}</div>`; }
  }
  p.innerHTML = html;
}

function nwBlock(iv, res) {
  const { rows, x0 } = res; if (!rows.length) return '';
  const last = rows[rows.length-1], root = last.xn;
  let t = `<div class="rb"><div class="rbh">
    <span class="rbi">Отрезок [${fmt(iv.a)}, ${fmt(iv.b)}] · x₀ = ${fmt(x0)}</span>
    <span class="rbv">x* ≈ ${fmt(root)}</span></div>
  <div class="rbb">
  <div class="resbox">
    <div class="ri"><span class="rl">x₀</span><span class="rv">${fmt(x0)}</span></div>
    <div class="ri"><span class="rl">x*</span><span class="rv">${fmt(root)}</span></div>
    <div class="ri"><span class="rl">f(x*)</span><span class="rv">${fmt(se(S.f, root))}</span></div>
    <div class="ri"><span class="rl">|δ| посл.</span><span class="rv">${fmt(last.delta)}</span></div>
    <div class="ri"><span class="rl">Итераций</span><span class="rv">${rows.length}</span></div>
  </div>
  <div class="tw"><table class="it"><thead><tr>
    <th>n</th><th>xₙ</th><th>f(xₙ)</th><th>f'(xₙ)</th><th>xₙ₊₁ = xₙ − f/f'</th><th>|xₙ₊₁ − xₙ|</th>
  </tr></thead><tbody>`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], L = i===rows.length-1;
    t += `<tr class="${L?'sign-row':''}">
      <td class="nc">${r.n}</td>
      <td>${fmt(r.x)}</td><td>${fmt(r.fx)}</td><td>${fmt(r.dfx)}</td>
      <td><b>${fmt(r.xn)}</b></td><td>${fmt(r.delta)}</td>
    </tr>`;
  }
  t += `</tbody></table></div></div></div>`;
  return t;
}

function renderNewtonTab() {
  const p = $('tp-newton');
  const hdr = `<div class="mh"><div>
    <div class="mn">Метод касательных (Ньютона)</div>
    <div class="mform">x<sub>n+1</sub> = x<sub>n</sub> − f(x<sub>n</sub>) / f'(x<sub>n</sub>)</div>
  </div><div class="md">Касательная в xₙ пересекает Ox → xₙ₊₁. x₀: f(x₀)·f''(x₀) &gt; 0.<br><span style="color:var(--blue)">f'(x) = ${H(S.derivStr)}</span></div></div>`;
  if (!S.foundIntervals.length) { p.innerHTML = hdr + `<div class="errbox">Нет локализованных отрезков.</div>`; return; }
  let html = hdr;
  for (const iv of S.foundIntervals) {
    try { html += nwBlock(iv, runNewton(iv.a, iv.b)); }
    catch (e) { html += `<div class="errbox">[${fmt(iv.a)}, ${fmt(iv.b)}]: ${H(e.message)}</div>`; }
  }
  p.innerHTML = html;
}

function renderComplexHornerTable(hr, z, rootNum) {
  const zStr = C.fmtC(z);
  let html = `<div style="margin-bottom:11px">
    <div class="sec-t">Проверка Q(${H(zStr)}) по схеме Горнера (комплексный x)</div>
    <div class="tw"><table class="it"><thead><tr>
      <th>Шаг k</th><th>Степень</th><th>aₖ</th><th>bₖ = aₖ + x·bₖ₋₁</th>
    </tr></thead><tbody>`;
  for (let i = 0; i < hr.length; i++) {
    const r = hr[i], L = i===hr.length-1;
    html += `<tr class="${L?'sign-row':''}">
      <td class="nc">${r.k}</td><td>${r.deg}</td><td>${r.ak}</td>
      <td><b>${H(C.fmtC(r.bk))}</b></td>
    </tr>`;
  }
  html += `</tbody></table></div></div>`;
  return html;
}

function renderQuadraticBlock(st) {
  const { poly, quad, hr1, hr2, idx } = st;
  const { D, r1, r2, complex } = quad;
  const rootNum1 = idx + 1, rootNum2 = idx + 2;
  const discColor = complex ? 'var(--purple)' : 'var(--green)';
  const typeLabel = complex
    ? '<span style="color:var(--purple)">Комплексно-сопряжённые корни (D &lt; 0)</span>'
    : '<span style="color:var(--green)">Два вещественных корня (D ≥ 0)</span>';
  const [a,b,c] = poly.map(v=>Math.round(v*1e8)/1e8);

  let html = `<div class="hstep" style="border-color:rgba(168,130,232,.3);background:rgba(168,130,232,.04)">
    <div class="hs-title" style="color:var(--purple)">Корни x<sub>${rootNum1}</sub> и x<sub>${rootNum2}</sub> &nbsp;<span style="font-size:11px;font-weight:400;color:var(--txt2)">(квадратный трёхчлен, схема Горнера)</span></div>
    <div style="margin-bottom:11px">
      <div class="sec-t">Квадратный трёхчлен Q(x) степени 2</div>
      <div class="pdis">Q(x) = ${H(poly2str(poly))}<span class="ssub">Коэф.: [${poly.map(v=>Math.round(v*1e8)/1e8).join(', ')}]</span></div>
    </div>
    <div class="infobox" style="margin-bottom:12px">
      <b>Дискриминант:</b> D = b² − 4ac = (${b})² − 4·(${a})·(${c}) = <b style="color:${discColor}">${Math.round(D*1e8)/1e8}</b><br>
      ${typeLabel}<br>
      <span style="font-size:11px;color:var(--txt2);font-family:var(--mono)">
        x = (−b ± √D) / 2a = (${-b} ± ${complex?'√('+Math.round(-D*1e8)/1e8+')'+'·i':'√'+Math.round(D*1e8)/1e8}) / ${2*a}
      </span>
    </div>`;

  // Горнер для r1
  html += renderComplexHornerTable(hr1, r1, rootNum1);
  // Горнер для r2
  html += renderComplexHornerTable(hr2, r2, rootNum2);

  html += `<div class="resbox">
    <div class="ri"><span class="rl">x<sub>${rootNum1}</sub></span><span class="rv" style="color:${complex?'var(--purple)':'var(--green)'}">${H(C.fmtC(r1))}</span></div>
    <div class="ri"><span class="rl">x<sub>${rootNum2}</sub></span><span class="rv" style="color:${complex?'var(--purple)':'var(--green)'}">${H(C.fmtC(r2))}</span></div>
    <div class="ri"><span class="rl">D</span><span class="rv" style="color:${discColor}">${Math.round(D*1e8)/1e8}</span></div>
  </div></div>`;
  return html;
}

function renderHornerStep(st) {
  if (st.quadratic) return renderQuadraticBlock(st);
  const { idx, root, iv, poly, sr, hr, rem, qc, isLinear } = st;
  const deg = poly.length - 1;
  const rootNum = idx + 1;
  let html = `<div class="hstep">
    <div class="hs-title">Корень x<sub>${rootNum}</sub> &nbsp;<span style="font-size:11px;font-weight:400;color:var(--txt2)">(шаг схемы Горнера)</span></div>
    <div style="margin-bottom:11px">
      <div class="sec-t">Текущий полином Q(x) степени ${deg} <span style="color:var(--txt2);font-size:10px">(после деления на предыдущий корень)</span></div>
      <div class="pdis">Q(x) = ${H(poly2str(poly))}<span class="ssub">Коэф.: [${poly.map(c=>Math.round(c*1e8)/1e8).join(', ')}]</span></div>
    </div>`;
  if (isLinear) {
    html += `<div class="infobox">${poly[0]}·x + ${poly[1]} = 0 &nbsp;→&nbsp; x = −${poly[1]}/${poly[0]} = <b style="color:var(--green)">${fmt(root)}</b></div>`;
  } else if (sr.length > 0) {
    html += `<div style="margin-bottom:11px">
      <div class="sec-t">Уточнение методом Ньютона на [${fmt(iv[0])}, ${fmt(iv[1])}]</div>
      <div class="tw"><table class="it"><thead><tr>
        <th>n</th><th>xₙ</th><th>Q(xₙ)</th><th>Q'(xₙ)</th><th>xₙ₊₁</th><th>|δ|</th>
      </tr></thead><tbody>`;
    for (let i = 0; i < sr.length; i++) {
      const r = sr[i], L = i===sr.length-1;
      html += `<tr class="${L?'sign-row':''}">
        <td class="nc">${r.n}</td>
        <td>${fmt(r.x)}</td><td>${fmt(r.fx)}</td><td>${fmt(r.dfx)}</td>
        <td><b>${fmt(r.xn)}</b></td><td>${fmt(r.delta)}</td>
      </tr>`;
    }
    html += `</tbody></table></div></div>`;
  }
  html += `<div style="margin-bottom:11px">
    <div class="sec-t">Проверка Q(${fmt(root)}) по схеме Горнера</div>
    <div class="tw"><table class="it"><thead><tr>
      <th>Шаг k</th><th>Степень</th><th>aₖ</th><th>bₖ₋₁</th><th>bₖ = aₖ + x · bₖ₋₁</th>
    </tr></thead><tbody>`;
  for (let i = 0; i < hr.length; i++) {
    const r = hr[i], L = i===hr.length-1;
    html += `<tr class="${L?'sign-row':''}">
      <td class="nc">${r.k}</td><td>${r.deg}</td><td>${r.ak}</td>
      <td>${r.prev!==null?fmt(r.prev):'—'}</td><td><b>${fmt(r.bk)}</b></td>
    </tr>`;
  }
  html += `</tbody></table></div></div>
  <div class="resbox">
    <div class="ri"><span class="rl">Корень x<sub>${rootNum}</sub></span><span class="rv">${fmt(root)}</span></div>
    <div class="ri"><span class="rl">Q(x<sub>${rootNum}</sub>)</span><span class="rv">${fmt(rem)}</span></div>
    <div class="ri"><span class="rl">Степень след. Q</span><span class="rv">${qc.length-1}</span></div>
  </div>
  <div class="defl">Q(x) = (x − ${fmt(root)}) · Q₁(x)<br>
    Q₁(x) = ${H(poly2str(qc))}<br>
    <span style="font-size:10px;color:var(--txt2)">Коэф. Q₁: [${qc.map(c=>Math.round(c*1e8)/1e8).join(', ')}]</span>
  </div></div>`;
  return html;
}

function renderFirstRootBlock(fs) {
  const { root, iv, poly, sr, hr, rem, qc } = fs;
  const deg = poly.length - 1;
  let html = `<div class="hstep" style="border-color:rgba(251,191,36,.25);background:rgba(251,191,36,.04)">
    <div class="hs-title" style="color:var(--amber)">Корень x<sub>1</sub> &nbsp;<span style="font-size:11px;font-weight:400;color:var(--txt2)">(найден методом Ньютона, без схемы Горнера)</span></div>
    <div style="margin-bottom:11px">
      <div class="sec-t">Исходный полином P(x) степени ${deg}</div>
      <div class="pdis">P(x) = ${H(poly2str(poly))}<span class="ssub">Коэф.: [${poly.map(c=>Math.round(c*1e8)/1e8).join(', ')}]</span></div>
    </div>`;
  if (sr.length > 0) {
    html += `<div style="margin-bottom:11px">
      <div class="sec-t">Метод Ньютона на [${fmt(iv[0])}, ${fmt(iv[1])}]</div>
      <div class="tw"><table class="it"><thead><tr>
        <th>n</th><th>xₙ</th><th>P(xₙ)</th><th>P'(xₙ)</th><th>xₙ₊₁</th><th>|δ|</th>
      </tr></thead><tbody>`;
    for (let i = 0; i < sr.length; i++) {
      const r = sr[i], L = i===sr.length-1;
      html += `<tr class="${L?'sign-row':''}">
        <td class="nc">${r.n}</td>
        <td>${fmt(r.x)}</td><td>${fmt(r.fx)}</td><td>${fmt(r.dfx)}</td>
        <td><b>${fmt(r.xn)}</b></td><td>${fmt(r.delta)}</td>
      </tr>`;
    }
    html += `</tbody></table></div></div>`;
  }
  html += `<div class="resbox">
    <div class="ri"><span class="rl">Корень x<sub>1</sub></span><span class="rv">${fmt(root)}</span></div>
    <div class="ri"><span class="rl">P(x<sub>1</sub>)</span><span class="rv">${fmt(rem)}</span></div>
  </div>
  <div class="defl">P(x) = (x − ${fmt(root)}) · Q(x)<br>
    Q(x) = ${H(poly2str(qc))}<br>
    <span style="font-size:10px;color:var(--txt2)">Коэф. Q: [${qc.map(c=>Math.round(c*1e8)/1e8).join(', ')}]</span>
  </div></div>`;
  return html;
}

function renderHornerTab() {
  const p = $('tp-horner');
  const hdr = `<div class="mh"><div>
    <div class="mn">Схема Горнера</div>
    <div class="mform">b<sub>0</sub> = a<sub>n</sub> ; &nbsp;b<sub>k</sub> = b<sub>k−1</sub>·x + a<sub>n−k</sub></div>
  </div><div class="md">x<sub>1</sub> найден методом Ньютона (шаг ③). P(x) делится на (x − x<sub>1</sub>) → Q(x). <b style="color:var(--purple)">Схема Горнера применяется для нахождения x<sub>2</sub> и x<sub>3</sub></b> из Q(x).</div></div>`;
  if (!S.polyCoeffs) {
    p.innerHTML = hdr + `<div class="warnbox">⚠ Функция не является полиномом (или степень > 10). Горнер применим только к многочленам.<br>Попробуйте: <b>x^3 - 6*x^2 + 11*x - 6</b> · <b>x^4 - 3*x^2 + 2</b> · <b>x^3 - x</b></div>`;
    return;
  }
  const deg = S.polyCoeffs.length - 1;
  let html = hdr + `<div class="rb" style="margin-bottom:18px"><div class="rbh">
    <span class="rbi">Исходный полином степени ${deg}</span></div>
    <div class="rbb"><div class="pdis">P(x) = ${H(poly2str(S.polyCoeffs))}<span class="ssub">
      Коэф. [a${deg}..a₀]: [${S.polyCoeffs.map(c=>Math.round(c*1e8)/1e8).join(', ')}]
    </span></div></div></div>`;
  const result = runHorner();
  if (!result) { p.innerHTML = html + `<div class="errbox">Корни не найдены на заданных отрезках.</div>`; return; }
  const { firstStep, steps } = result;
  if (firstStep && firstStep.root !== undefined) {
    html += renderFirstRootBlock(firstStep);
  }
  if (!steps.length) {
    html += `<div class="warnbox">⚠ x₂ и x₃ не найдены. Для работы схемы Горнера нужно минимум 2 локализованных отрезка (полином степени ≥ 3).</div>`;
  } else {
    for (const st of steps) html += renderHornerStep(st);
  }
  p.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════
   TRIGGER SOLVE
   ═══════════════════════════════════════════════════════ */
function triggerSolve(ivs) {
  S.foundIntervals = ivs;
  renderBisectTab(); renderChordTab(); renderNewtonTab(); renderHornerTab();
  const rp = $('resultsPanel');
  rp.classList.add('vis');
  const hp = $('hornerPanel');
  hp.classList.add('vis');
  swTab('bisection');
  setTimeout(() => rp.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
}

const tabMap = ['bisection', 'chord', 'newton'];
function swTab(id) {
  document.querySelectorAll('.tb').forEach((b, i) => b.classList.toggle('active', tabMap[i] === id));
  document.querySelectorAll('.tp').forEach(p => p.classList.remove('active'));
  const pp = $('tp-' + id); if (pp) pp.classList.add('active');
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  selectMethod('anal');
  setInputMode('single');
  updatePreview();
  updateLiveChart();

  const liveInputs = ['funcInput', 'funcInputL', 'funcInputR', 'Linput', 'Rinput', 'stepInput'];
  liveInputs.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => { updatePreview(); updateLiveChart(); });
    el.addEventListener('change', updateLiveChart);
  });

  $('funcInput').addEventListener('keydown', e => { if (e.key === 'Enter') runLocalization(); });
  $('funcInputL').addEventListener('keydown', e => { if (e.key === 'Enter') runLocalization(); });
  $('funcInputR').addEventListener('keydown', e => { if (e.key === 'Enter') runLocalization(); });
});
