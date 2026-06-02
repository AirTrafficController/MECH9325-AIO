/* ===================================================================
   MECH9325 Acoustics & Noise Control — calculator logic
   =================================================================== */

const $ = id => document.getElementById(id);
const fmt = (x, d = 2) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const lg = x => Math.log10(x);

// Parse a textarea into rows of numbers. Splits on commas/whitespace.
function parseRows(text) {
  return text.trim().split('\n')
    .map(l => l.trim()).filter(l => l.length)
    .map(l => l.split(/[,\s]+/).map(Number));
}
// Sum 10^(L/10) energy then back to dB.
function dBsum(levels) {
  return 10 * lg(levels.reduce((a, L) => a + 10 ** (L / 10), 0));
}
function show(id, html, cls = 'ok') {
  const el = $(id);
  el.className = 'result ' + cls;
  el.innerHTML = html;
}

/* ---------------- Tabs ---------------- */
const TABS = [
  ['combine', 'Combine'], ['subtract', 'Subtract'], ['dist', 'Distance'],
  ['weight', 'Weighting'], ['leq', 'Leq'], ['dose', 'Noise Dose'],
  ['loud', 'Loudness'], ['speech', 'Speech (PSIL)'], ['stats', 'Stats / SEL'],
  ['table', 'Tables'],
];
function initTabs() {
  const nav = $('tabs');
  TABS.forEach(([id, label], i) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => selectTab(id);
    b.dataset.for = id;
    nav.appendChild(b);
    if (i === 0) selectTab(id);
  });
}
function selectTab(id) {
  document.querySelectorAll('.tab').forEach(s =>
    s.classList.toggle('active', s.dataset.tab === id));
  document.querySelectorAll('#tabs button').forEach(b =>
    b.classList.toggle('sel', b.dataset.for === id));
}

/* ---------------- Combine ---------------- */
function doCombine() {
  const levels = $('combine-list').value.trim().split('\n')
    .map(s => Number(s.trim())).filter(s => !isNaN(s));
  if (!levels.length) return show('combine-out', 'Enter at least one level.', 'err');
  const tot = dBsum(levels);
  show('combine-out',
    `Combined level = <b>${fmt(tot)} dB</b><br>
     <span class="small">${levels.length} levels combined on an energy basis.</span>`);
}
function doIdentical() {
  const L = Number($('ident-L').value), N = Number($('ident-N').value);
  if (!(N >= 1)) return show('ident-out', 'N must be ≥ 1.', 'err');
  const tot = L + 10 * lg(N);
  show('ident-out',
    `Total of ${N} sources = <b>${fmt(tot)} dB</b><br>
     <span class="small">= ${fmt(L)} + 10·log₁₀(${N}) = ${fmt(L)} + ${fmt(10 * lg(N))} dB</span>`);
}
function doIncrease() {
  const n1 = Number($('inc-n1').value), L1 = Number($('inc-L1').value),
        add = Number($('inc-add').value), n2 = n1 + add;
  if (!(n1 > 0) || !(n2 > 0)) return show('inc-out', 'Counts must be positive.', 'err');
  const dL = 10 * lg(n2 / n1), nl = L1 + dL;
  show('inc-out',
    `N₂ = ${n2}<br>
     Increase ΔL = <b>${fmt(dL, 3)} dB</b><br>
     New total level = <b>${fmt(nl, 3)} dB</b><br>
     <span class="small">ΔL = 10·log₁₀(${n2}/${n1})</span>`);
}

/* ---------------- Subtract ---------------- */
function doSubtract() {
  const tot = Number($('sub-tot').value), bg = Number($('sub-bg').value);
  const diff = 10 ** (tot / 10) - 10 ** (bg / 10);
  if (diff <= 0) return show('sub-out',
    'Total must exceed the level being removed (the source cannot have negative energy).', 'err');
  const rem = 10 * lg(diff);
  show('sub-out', `Remaining level = <b>${fmt(rem)} dB</b>`);
}
function doOneOfN() {
  const tot = Number($('one-tot').value), N = Number($('one-N').value);
  if (!(N >= 1)) return show('one-out', 'N must be ≥ 1.', 'err');
  const one = tot - 10 * lg(N);
  show('one-out',
    `Each source = <b>${fmt(one)} dB</b><br>
     <span class="small">= ${fmt(tot)} − 10·log₁₀(${N})</span>`);
}

/* ---------------- Distance / spreading ---------------- */
function doDistance() {
  const L1 = Number($('dist-L1').value), r1 = Number($('dist-r1').value), r2 = Number($('dist-r2').value);
  if (!(r1 > 0) || !(r2 > 0)) return show('dist-out', 'Distances must be > 0.', 'err');
  const ratio = lg(r2 / r1);
  const pt = L1 - 20 * ratio;   // point / spherical
  const ln = L1 - 10 * ratio;   // line / cylindrical
  show('dist-out',
    `<table class="bands">
       <tr><th>Source type</th><th>Spreading</th><th>L₂ at ${fmt(r2)} m</th></tr>
       <tr><td>Point (isolated vehicle)</td><td>−6 dB/doubling</td><td><b>${fmt(pt)} dB</b></td></tr>
       <tr><td>Line (continuous traffic)</td><td>−3 dB/doubling</td><td><b>${fmt(ln)} dB</b></td></tr>
     </table>
     <span class="small">From ${fmt(L1)} dB at ${fmt(r1)} m · 10·log₁₀(r₂/r₁) = ${fmt(10 * ratio)} dB</span>`);
}

/* ---------------- Weighting ---------------- */
function currentBands() {
  const m = $('w-band').value;
  return m === 'oct' ? OCT_MAIN : m === 'octfull' ? OCT_FULL : THIRD;
}
function buildWeightTable() {
  const bands = currentBands();
  let h = '<table class="bands"><tr><th>Freq (Hz)</th><th>Band level (dB)</th></tr>';
  bands.forEach(f => {
    h += `<tr><td>${f >= 1000 ? f / 1000 + 'k' : f}</td>
      <td><input type="number" step="any" class="wlev" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('w-table-wrap').innerHTML = h;
}
function prefillVehicle() {
  $('w-band').value = 'oct';
  buildWeightTable();
  document.querySelectorAll('.wlev').forEach(inp => {
    const v = VEHICLE_EXAMPLE[Number(inp.dataset.f)];
    if (v !== undefined) inp.value = v;
  });
  $('w-net').value = 'A';
}
function doWeight() {
  const net = $('w-net').value;
  const rows = [];
  document.querySelectorAll('.wlev').forEach(inp => {
    if (inp.value === '') return;
    const f = Number(inp.dataset.f), L = Number(inp.value), w = weightOffset(f, net);
    rows.push({ f, L, w, Lw: L + w });
  });
  if (!rows.length) return show('w-out', 'Enter at least one band level.', 'err');
  const lin = dBsum(rows.map(r => r.L));
  const wtd = dBsum(rows.map(r => r.Lw));
  const tag = net === 'Z' ? 'dB' : `dB(${net})`;
  let t = `<table class="bands"><tr><th>Freq</th><th>Level</th><th>+W</th><th>Weighted</th></tr>`;
  rows.forEach(r => {
    t += `<tr><td>${r.f >= 1000 ? r.f / 1000 + 'k' : r.f}</td>
      <td>${fmt(r.L)}</td><td>${r.w >= 0 ? '+' : ''}${fmt(r.w)}</td><td>${fmt(r.Lw)}</td></tr>`;
  });
  t += '</table>';
  show('w-out',
    `${t}
     <div class="big">Overall: <b>${fmt(wtd, 1)} ${tag}</b></div>
     <span class="small">Linear (unweighted) total = ${fmt(lin, 1)} dB</span>`);
}

/* ---------------- Leq ---------------- */
function doLeq() {
  const rows = parseRows($('leq-list').value);
  let energy = 0, sumT = 0, bad = false;
  rows.forEach(r => {
    if (r.length < 2 || r.some(isNaN)) { bad = true; return; }
    energy += r[1] * 10 ** (r[0] / 10); sumT += r[1];
  });
  if (bad || !rows.length) return show('leq-out', 'Each row needs: level, duration.', 'err');
  let T = Number($('leq-T').value);
  if (!T || T <= 0) T = sumT;
  const leq = 10 * lg(energy / T);
  show('leq-out',
    `L<sub>eq</sub> = <b>${fmt(leq, 3)} dB</b><br>
     <span class="small">Σt = ${fmt(sumT)} · reference T = ${fmt(T)}</span>`);
}
function doEvents() {
  const rows = parseRows($('evt-list').value);
  const T = Number($('evt-T').value);
  if (!(T > 0)) return show('evt-out', 'Reference period T must be > 0.', 'err');
  let energy = 0, bad = false;
  rows.forEach(r => {
    if (r.length < 3 || r.some(isNaN)) { bad = true; return; }
    energy += r[2] * r[1] * 10 ** (r[0] / 10);
  });
  if (bad || !rows.length) return show('evt-out',
    'Each row needs: level, single-event duration, number of events.', 'err');
  const leq = 10 * lg(energy / T);
  show('evt-out', `L<sub>eq,T</sub> = <b>${fmt(leq, 3)} dB</b>`);
}

/* ---------------- Noise dose ---------------- */
function doDose() {
  const rows = parseRows($('dose-list').value);
  const Lc = Number($('dose-Lc').value), q = Number($('dose-q').value), Tc = Number($('dose-Tc').value);
  let energy = 0, sumT = 0, dose = 0, bad = false;
  rows.forEach(r => {
    if (r.length < 2 || r.some(isNaN)) { bad = true; return; }
    const L = r[0], t = r[1];
    energy += t * 10 ** (L / 10); sumT += t;
    const Ti = Tc / 2 ** ((L - Lc) / q);     // allowed time at level L
    dose += t / Ti;
  });
  if (bad || !rows.length) return show('dose-out', 'Each row needs: level dB(A), duration h.', 'err');
  const leq = 10 * lg(energy / Tc);            // normalised to criterion period
  const Tmax = Tc / 2 ** ((leq - Lc) / q);     // permissible time at this Leq
  const exceed = leq > Lc;
  show('dose-out',
    `L<sub>Aeq,${fmt(Tc)}h</sub> = <b>${fmt(leq, 3)} dB(A)</b><br>
     Total exposure time = ${fmt(sumT)} h<br>
     Noise dose = <b>${fmt(dose * 100, 1)} %</b> &nbsp;(100 % = limit)<br>
     Exceeds ${fmt(Lc)} dB(A) limit? <b class="${exceed ? 'bad' : 'good'}">${exceed ? 'YES' : 'No'}</b><br>
     Max permissible time at this L<sub>Aeq</sub> = <b>${fmt(Tmax, 4)} h</b>`,
    exceed ? 'warn' : 'ok');
}

/* ---------------- Loudness ---------------- */
function doPh2S() {
  const p = Number($('ph2s').value);
  const s = 2 ** ((p - 40) / 10);
  show('ph2s-out',
    `Loudness = <b>${fmt(s, 3)} sones</b>` +
    (p < 40 ? '<br><span class="small">Note: formula assumes L<sub>L</sub> ≥ 40 phon.</span>' : ''));
}
function doS2Ph() {
  const s = Number($('s2ph').value);
  if (!(s > 0)) return show('s2ph-out', 'Sones must be > 0.', 'err');
  const p = 40 + 10 * Math.log2(s);
  show('s2ph-out', `Loudness level = <b>${fmt(p, 2)} phons</b>`);
}

/* ---------------- PSIL ---------------- */
function doPSIL() {
  const a = Number($('psil-500').value);
  const b = $('psil-1000').value === '' ? a : Number($('psil-1000').value);
  const c = $('psil-2000').value === '' ? a : Number($('psil-2000').value);
  const dist = Number($('psil-dist').value);
  const psil = (a + b + c) / 3;
  const effort = voiceEffort(psil, dist);
  show('psil-out',
    `PSIL = <b>${fmt(psil, 2)} dB</b><br>
     At ${fmt(dist)} m, voice effort must be: <b>${effort}</b><br>
     <span class="small">Mean of L₅₀₀=${fmt(a)}, L₁₀₀₀=${fmt(b)}, L₂₀₀₀=${fmt(c)}</span>`);
}

/* ---------------- Stats / SEL ---------------- */
function doSEL() {
  const leq = Number($('sel-leq').value), T = Number($('sel-T').value);
  if (!(T > 0)) return show('sel-out', 'T must be > 0.', 'err');
  const sel = leq + 10 * lg(T);
  show('sel-out',
    `SEL = <b>${fmt(sel, 2)} dB</b><br>
     <span class="small">= ${fmt(leq)} + 10·log₁₀(${fmt(T)})</span>`);
}
function doSort() {
  const vals = $('sort-list').value.trim().split('\n')
    .map(s => Number(s.trim())).filter(s => !isNaN(s)).sort((x, y) => y - x);
  if (vals.length < 4) return show('sort-out', 'Enter four values (one per line).', 'err');
  const [sel, l1, leq, l99] = vals;
  show('sort-out',
    `<table class="bands">
       <tr><th>Term</th><th>Value</th></tr>
       <tr><td>SEL (largest)</td><td><b>${fmt(sel)}</b> dB</td></tr>
       <tr><td>L₁</td><td><b>${fmt(l1)}</b> dB</td></tr>
       <tr><td>L<sub>eq</sub></td><td><b>${fmt(leq)}</b> dB</td></tr>
       <tr><td>L₉₉ (smallest)</td><td><b>${fmt(l99)}</b> dB</td></tr>
     </table>`);
}

/* ---------------- Reference table ---------------- */
function buildRefTable() {
  let h = '<table class="ref"><tr><th>Freq (Hz)</th><th>A (dB)</th><th>B (dB)</th><th>C (dB)</th></tr>';
  WEIGHTING.forEach(r => {
    h += `<tr><td>${r[0].toLocaleString()}</td>
      <td>${r[1].toFixed(1)}</td><td>${r[2].toFixed(1)}</td><td>${r[3].toFixed(1)}</td></tr>`;
  });
  h += '</table>';
  $('ref-table').innerHTML = h;
}

/* ---------------- init ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  buildWeightTable();
  buildRefTable();
});
