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
  ['combine', 'Combine'], ['subtract', 'Subtract'], ['weight', 'Weighting'],
  ['power', 'Sound Power'],
  ['leq', 'Leq'], ['dose', 'Noise Dose'], ['loud', 'Loudness'],
  ['speech', 'Speech (PSIL)'], ['stats', 'Stats / SEL'],
  ['duct', 'Duct → Voltage'], ['table', 'Tables'],
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
  const pRms = 2e-5 * 10 ** (tot / 20);   // RMS pressure, p = p_ref·10^(L/20), p_ref = 2×10⁻⁵ Pa
  show('combine-out',
    `Combined level = <b>${fmt(tot)} dB</b><br>
     RMS pressure = <b>${Number(pRms.toPrecision(3))} Pa</b><br>
     <span class="small">${levels.length} levels combined on an energy basis ·
     p = 2×10⁻⁵·10^(L/20) Pa</span>`);
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
function doLargerError() {
  const p1 = Number($('err-p1').value), p2 = Number($('err-p2').value);
  const rIn = $('err-ratio').value.trim();
  // Ratio field overrides the two pressures when supplied.
  let r;
  if (rIn.length) {
    r = Number(rIn);
    if (!(r >= 0)) return show('err-out', 'Ratio must be ≥ 0.', 'err');
  } else {
    if (!(p1 > 0) || !(p2 >= 0)) return show('err-out',
      'Enter a positive larger RMS and a non-negative smaller RMS (or a ratio).', 'err');
    r = p2 / p1;
  }
  if (r > 1) return show('err-out',
    'The ratio should be ≤ 1 — p₂ is the <em>smaller</em> signal.', 'err');
  const ptot = Math.sqrt(1 + r * r);          // total RMS as a multiple of the larger signal p₁
  const err = (1 / ptot - 1) * 100;           // (estimate − true)/true, estimate = p₁
  show('err-out',
    `Total RMS = <b>${Number(ptot.toPrecision(5))} × p₁</b> &nbsp;(√(1 + ${Number(r.toPrecision(4))}²))<br>
     Error using only p₁ = <b>${fmt(err, 2)} %</b> &nbsp;(under-estimate)<br>
     <span class="small">|Error| ≈ ${fmt(Math.abs(err), 2)} % · negative ⇒ the larger signal alone
     under-estimates the true total RMS</span>`);
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

/* ---------------- Sound Power (SPL on a measurement surface → Lw) ---------------- */
function powerBands() {
  const m = $('p-band').value;
  return m === 'oct' ? OCT_MAIN : m === 'octfull' ? OCT_FULL : THIRD;
}
function buildPowerTable() {
  const bands = powerBands();
  let h = '<table class="bands"><tr><th>Freq (Hz)</th><th>Band level (dB)</th></tr>';
  bands.forEach(f => {
    h += `<tr><td>${f >= 1000 ? f / 1000 + 'k' : f}</td>
      <td><input type="number" step="any" class="plev" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('p-table-wrap').innerHTML = h;
}
function prefillDrill() {
  $('p-net').value = 'A';
  $('p-band').value = 'octfull';
  buildPowerTable();
  document.querySelectorAll('.plev').forEach(inp => {
    const v = DRILL_EXAMPLE[Number(inp.dataset.f)];
    if (v !== undefined) inp.value = v;
  });
  $('p-surf').value = 'hemi';
  $('p-d').value = 0.86;
  $('p-r').value = '';
  $('p-S').value = '';
}
function doPower() {
  const net = $('p-net').value;        // network the GIVEN levels carry; un-weighted back to linear
  const rows = [];
  document.querySelectorAll('.plev').forEach(inp => {
    if (inp.value === '') return;
    const f = Number(inp.dataset.f), given = Number(inp.value);
    const w = weightOffset(f, net);    // offset that was ADDED to form the weighted level
    rows.push({ f, given, lin: given - w });   // un-weight: linear = weighted − W
  });
  if (!rows.length) return show('p-out', 'Enter at least one band level.', 'err');

  // Measurement-surface area S (m²).
  const surf = $('p-surf').value;
  let S;
  if (surf === 'custom') {
    S = Number($('p-S').value);
    if (!(S > 0)) return show('p-out', 'Enter a custom area S > 0 m².', 'err');
  } else {
    let r = Number($('p-r').value);
    const d = Number($('p-d').value);
    if (!(r > 0) && d > 0) r = d / 2;                 // diameter fallback
    if (!(r > 0)) return show('p-out', 'Enter a radius or diameter > 0 (or pick a custom area).', 'err');
    S = (surf === 'sphere' ? 4 : 2) * Math.PI * r * r;
  }

  const Lp = dBsum(rows.map(r => r.lin));   // overall (un-weighted) surface-average SPL
  const areaTerm = 10 * lg(S);
  const Lw = Lp + areaTerm;
  const tag = net === 'Z' ? 'dB' : `dB(${net})`;

  let t = `<table class="bands"><tr><th>Freq</th><th>${net === 'Z' ? 'Level' : 'Given ' + tag}</th>`;
  if (net !== 'Z') t += `<th>−W</th><th>Linear</th>`;
  t += `</tr>`;
  rows.forEach(r => {
    const fl = r.f >= 1000 ? r.f / 1000 + 'k' : r.f;
    const unW = -weightOffset(r.f, net);
    t += `<tr><td>${fl}</td><td>${fmt(r.given)}</td>`;
    if (net !== 'Z') t += `<td>${unW >= 0 ? '+' : ''}${fmt(unW)}</td><td>${fmt(r.lin)}</td>`;
    t += `</tr>`;
  });
  t += '</table>';

  const surfName = surf === 'custom' ? 'custom surface'
    : surf === 'sphere' ? 'sphere S = 4πr²' : 'hemisphere S = 2πr²';
  show('p-out',
    `${t}
     <div class="big">Sound power level L<sub>W</sub> = <b>${fmt(Lw, 1)} dB re 10⁻¹² W</b></div>
     <span class="small">Overall ${net === 'Z' ? 'linear' : 'un-weighted linear'} SPL
       L̄<sub>p</sub> = ${fmt(Lp, 1)} dB · ${surfName} = ${Number(S.toPrecision(4))} m² ·
       10·log₁₀(S) = ${fmt(areaTerm, 2)} dB</span>`);
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

/* ---------------- Duct: power → microphone voltage ---------------- */
function doDuct() {
  const Lw   = Number($('duct-Lw').value);      // sound power level, dB re 1e-12 W
  const Wref = Number($('duct-Wref').value);    // power reference, W
  const d    = Number($('duct-d').value) / 1000; // pipe diameter, mm → m
  const Sdb  = Number($('duct-sens').value);    // mic sensitivity, dB re 1 V/Pa
  const rho  = Number($('duct-rho').value);     // air density, kg/m³
  const c    = Number($('duct-c').value);       // sound speed, m/s
  const fmax = Number($('duct-fmax').value);    // highest frequency present, Hz (optional)

  if (!(d > 0))   return show('duct-out', 'Pipe diameter must be > 0.', 'err');
  if (!(rho > 0 && c > 0)) return show('duct-out', 'Density and sound speed must be > 0.', 'err');
  if (!(Wref > 0)) return show('duct-out', 'Power reference must be > 0.', 'err');

  const W   = Wref * 10 ** (Lw / 10);           // acoustic power, W
  const A   = Math.PI * d * d / 4;              // cross-sectional area, m²
  const I   = W / A;                            // plane-wave intensity, W/m²
  const p   = Math.sqrt(I * rho * c);           // RMS pressure (plane wave), Pa
  const Lp  = 20 * lg(p / 2e-5);                // SPL, dB re 20 µPa
  const sens = 10 ** (Sdb / 20);               // mic sensitivity, V/Pa
  const V   = p * sens;                         // RMS voltage, V

  // Plane-wave check: first higher-order mode in a circular duct cuts on here.
  const fc = 1.8412 * c / (Math.PI * d);
  let modeNote;
  if (fmax > 0) {
    modeNote = fmax < fc
      ? `Highest frequency ${fmt(fmax,0)} Hz &lt; cut-on ${fmt(fc,0)} Hz ⇒ <b class="good">plane waves only</b> — analysis valid.`
      : `Highest frequency ${fmt(fmax,0)} Hz ≥ cut-on ${fmt(fc,0)} Hz ⇒ <b class="bad">higher-order modes propagate</b> — plane-wave result is approximate.`;
  } else {
    modeNote = `First higher-order mode cuts on at <b>${fmt(fc,0)} Hz</b> (plane-wave assumption valid below this).`;
  }

  show('duct-out',
    `<table class="bands">
       <tr><td>Acoustic power W</td><td><b>${Number(W.toPrecision(4))} W</b></td></tr>
       <tr><td>Duct area A = πd²/4</td><td><b>${Number(A.toPrecision(4))} m²</b></td></tr>
       <tr><td>Intensity I = W/A</td><td><b>${Number(I.toPrecision(4))} W/m²</b></td></tr>
       <tr><td>RMS pressure p = √(I·ρc)</td><td><b>${Number(p.toPrecision(4))} Pa</b></td></tr>
       <tr><td>Sound pressure level L<sub>p</sub></td><td><b>${fmt(Lp,1)} dB</b></td></tr>
       <tr><td>Mic sensitivity</td><td>${Number(sens.toPrecision(4))} V/Pa</td></tr>
     </table>
     <div class="big">RMS voltage = <b>${Number(V.toPrecision(4))} V</b>
       &nbsp;(${Number((V*1000).toPrecision(4))} mV)</div>
     <span class="small">${modeNote}</span>`);
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
  buildPowerTable();
  buildRefTable();
});
