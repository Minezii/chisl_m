/* ═══════════════════════════════════════════════════════
   РЕШАТЕЛЬ УРАВНЕНИЙ — script.js
   ═══════════════════════════════════════════════════════ */

/* ── STATE ─────────────────────────────────────────────── */
const S = {
  expr: '', L: -10, R: 10, eps: 1e-6, dec: 6,
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
  const raw = $('funcInput').value.trim();
  const box = $('funcPreview');
  if (!box) return;
  if (!raw) {
    box.innerHTML = '<span class="prev-placeholder">введите f(x) выше...</span>';
    return;
  }
  box.classList.add('updating');
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    box.classList.remove('updating');
    const latex = 'f(x) = ' + expr2latex(raw);
    try {
      box.innerHTML = '';
      const lbl = document.createElement('span');
      lbl.className = 'prev-lbl'; lbl.textContent = 'ПРЕДПРОСМОТР';
      box.appendChild(lbl);
      const content = document.createElement('div');
      content.className = 'prev-content';
      katex.render(latex, content, { throwOnError: false, displayMode: false });
      box.appendChild(content);
    } catch {
      box.innerHTML = `<span class="prev-lbl">ПРЕДПРОСМОТР</span><div class="prev-content" style="color:var(--amber2);font-family:var(--mono)">${H(raw)}</div>`;
    }
  }, 280);
}

/* ── MATH SETUP ────────────────────────────────────────── */
function setupFunction() {
  const ex = S.expr;
  S.f = x => math.evaluate(ex, { x });
  try {
    const d1 = math.derivative(ex, 'x');
    S.df = x => d1.evaluate({ x });
    S.derivStr = d1.toString();
    try {
      const d2 = math.derivative(d1, 'x');
      S.d2f = x => d2.evaluate({ x });
      S.deriv2Str = d2.toString();
    } catch {
      const h = 1e-6;
      S.d2f = x => (S.f(x+h) - 2*S.f(x) + S.f(x-h)) / (h*h);
      S.deriv2Str = "f''(x) [числ.]";
    }
  } catch {
    const h = 1e-7;
    S.df = x => (S.f(x+h) - S.f(x-h)) / (2*h);
    S.derivStr = "f'(x) [числ.]";
    S.d2f = x => (S.f(x+h) - 2*S.f(x) + S.f(x-h)) / (h*h);
    S.deriv2Str = "f''(x) [числ.]";
  }
  S.polyCoeffs = detectPoly(ex);
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
function setEx(expr, L, R) {
  $('funcInput').value = expr;
  $('Linput').value = L;
  $('Rinput').value = R;
  updatePreview();
}

function readInputs() {
  S.expr = $('funcInput').value.trim();
  S.L = parseFloat($('Linput').value);
  S.R = parseFloat($('Rinput').value);
  S.eps = parseFloat($('epsInput').value);
  S.dec = parseInt($('decInput').value);
  if (!S.expr) { alert('Введите f(x)'); return false; }
  if (isNaN(S.L) || isNaN(S.R) || S.L >= S.R) { alert('L < R обязательно'); return false; }
  if (isNaN(S.eps) || S.eps <= 0) { alert('ε > 0'); return false; }
  if (isNaN(S.dec) || S.dec < 1) { alert('Знаков ≥ 1'); return false; }
  try { math.evaluate(S.expr, { x: (S.L + S.R) / 2 }); }
  catch (e) { alert('Ошибка в функции: ' + e.message); return false; }
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
  const N = 500, step = (R - L) / N;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = L + i * step;
    pts.push({ i, x, fx: se(f, x), dfx: se(df, x) });
  }

  // Sign changes
  const signChanges = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i+1];
    if (p.fx !== null && n.fx !== null && p.fx * n.fx < 0)
      signChanges.push({ a: p.x, b: n.x, fa: p.fx, fb: n.fx, idxA: i, idxB: i+1 });
  }

  // Critical points f'=0
  const criticals = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i+1];
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

  // Build table
  const scSet = new Set([...signChanges.map(s=>s.idxA), ...signChanges.map(s=>s.idxB)]);
  const critSet = new Set();
  for (const c of criticals) {
    const idx = Math.round((c.x - L) / step);
    for (let d = -2; d <= 2; d++) critSet.add(idx + d);
  }
  const showEvery = Math.max(1, Math.floor(N / 25));
  const tableRows = pts.filter((p, i) =>
    i % showEvery === 0 || scSet.has(i) || critSet.has(i) || i === 0 || i === pts.length - 1
  );

  S.foundIntervals = signChanges.map(sc => ({ a: sc.a, b: sc.b, fa: sc.fa, fb: sc.fb }));

  /* ── RENDER ── */
  let html = `<div class="proc-box">
    <div class="proc-hdr">
      <div class="proc-dot dot-amber"></div>
      <span class="proc-ttl">Аналитический метод · f(x) = ${H(S.expr)} · [${S.L}, ${S.R}]</span>
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
        <div class="ic-lbl">Шаг сетки h</div>
        <div class="ic-val white">${((R-L)/N).toFixed(5)}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--txt2);margin-top:3px">N = ${N} разбиений</div>
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
    Таблица значений · ${tableRows.length} строк из ${N+1}
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
    const isSign = scSet.has(r.i);
    const isCrit = critSet.has(r.i) && !isSign;
    const sgnTxt = r.fx === null ? '—' : (r.fx > 0 ? '+' : (r.fx < 0 ? '−' : '0'));
    const sgnCls = r.fx === null ? '' : (r.fx > 0 ? 'pos' : (r.fx < 0 ? 'neg' : ''));
    let changeTxt = `<span class="nochange">—</span>`;
    if (isSign) {
      // Find the next row in tableRows that has a sign change partner
      const ni = tableRows.findIndex((q, j) => j > i && scSet.has(q.i));
      const nxtFx = ni >= 0 ? tableRows[ni].fx : null;
      const f1 = r.fx !== null ? (r.fx > 0 ? '+' : '−') : '?';
      const f2 = nxtFx !== null ? (nxtFx > 0 ? '+' : '−') : '?';
      changeTxt = `<span class="chg">✓ ${f1}→${f2}</span>`;
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
  const { f, L, R } = S;
  const N = 600, step = (R - L) / N;
  const xs = [], ys = [];
  for (let i = 0; i <= N; i++) { const x = L + i*step; xs.push(x); ys.push(se(f, x)); }

  const autoIvs = [];
  for (let i = 0; i < xs.length - 1; i++) {
    if (ys[i] !== null && ys[i+1] !== null && ys[i] * ys[i+1] < 0)
      autoIvs.push({ a: xs[i], b: xs[i+1], fa: ys[i], fb: ys[i+1] });
  }
  S.foundIntervals = autoIvs;

  let html = `<div class="proc-box">
    <div class="proc-hdr">
      <div class="proc-dot dot-blue"></div>
      <span class="proc-ttl">Графический метод · f(x) = ${H(S.expr)} · [${S.L}, ${S.R}]</span>
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

    const rootData = autoIvs.map(iv => {
      let a = iv.a, b = iv.b;
      for (let k = 0; k < 60; k++) {
        const m = (a+b)/2, fm = se(S.f, m);
        if (fm === null || Math.abs(fm) < 1e-14) break;
        if (se(S.f, a) * fm < 0) b = m; else a = m;
      }
      return { x: (a+b)/2, y: 0 };
    });

    chartInst = new Chart(canvas, {
      type: 'line',
      data: {
        labels: xs,
        datasets: [
          { label: `f(x)`, data: ys, borderColor: '#f0a020', borderWidth: 2,
            fill: false, tension: 0.1, pointRadius: 0, spanGaps: false },
          { label: 'y = 0', data: xs.map(x => ({ x, y: 0 })),
            borderColor: 'rgba(255,255,255,.06)', borderWidth: 1,
            pointRadius: 0, fill: false, showLine: true },
          { label: 'Нули (авто)', data: rootData, type: 'scatter',
            pointRadius: 9, pointHoverRadius: 11,
            pointBackgroundColor: '#4ec885', pointBorderColor: '#07080f', pointBorderWidth: 2,
            showLine: false },
          { label: 'a', data: [], type: 'scatter',
            pointRadius: 10, pointBackgroundColor: '#f0a020',
            pointBorderColor: '#000', pointBorderWidth: 2, showLine: false, id: 'dsA' },
          { label: 'b', data: [], type: 'scatter',
            pointRadius: 10, pointBackgroundColor: '#4da6e8',
            pointBorderColor: '#000', pointBorderWidth: 2, showLine: false, id: 'dsB' },
        ]
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
    firstStep.sr    = sr0;   // итерации Ньютона для отображения
    firstStep.hr    = hr0;   // строки Горнера (только для проверки деления)
    firstStep.rem   = rem0;
    firstStep.qc    = [...qc0];
    cc = [...qc0];           // переходим к Q(x)
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

  /* ── Линейный остаток — последний корень аналитически ── */
  if (cc.length === 2 && Math.abs(cc[0]) > 1e-9) {
    const root = -cc[1]/cc[0];
    if (root >= S.L - 0.5 && root <= S.R + 0.5) {
      const { rows:hr } = hornerEval(cc, root);
      steps.push({ idx: steps.length + 1, root, iv:[S.L,S.R], poly:[...cc], sr:[], hr, rem:0, qc:[cc[0]], isLinear:true });
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

function renderHornerStep(st) {
  const { idx, root, iv, poly, sr, hr, rem, qc, isLinear } = st;
  const deg = poly.length - 1;
  // idx здесь — это номер среди шагов Горнера (2-й корень = idx 1, 3-й = idx 2, ...)
  const rootNum = idx + 1; // номер корня в исходном полиноме
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
  updatePreview();
  $('funcInput').addEventListener('input', updatePreview);
  $('funcInput').addEventListener('keydown', e => { if (e.key === 'Enter') runLocalization(); });
});
