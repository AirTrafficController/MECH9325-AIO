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

// Seconds per time unit (accepts common spellings/abbreviations).
const TIME_UNITS = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
};
// Parse a duration string like "15 min", "2h", "30s" or bare "3.5" → seconds.
// Bare numbers use defUnit ('h' | 'min' | 's').
function parseTime(str, defUnit) {
  const t = String(str).trim();
  if (t === '') return NaN;
  const mm = t.match(/^([0-9.eE+\-]+)\s*([a-zA-Z]*)$/);
  if (!mm) return NaN;
  const v = parseFloat(mm[1]);
  if (isNaN(v)) return NaN;
  const factor = TIME_UNITS[(mm[2] || defUnit).toLowerCase()];
  return factor === undefined ? NaN : v * factor;
}
// Split "level, duration[, count]" rows, keeping the duration field as text.
function parseLevelRows(text) {
  return text.trim().split('\n')
    .map(l => l.trim()).filter(l => l.length)
    .map(l => l.split(',').map(s => s.trim()));
}
// Pretty-print seconds in a sensible unit.
function fmtSeconds(sec) {
  if (sec >= 3600) return `${fmt(sec / 3600, 3)} h`;
  if (sec >= 60) return `${fmt(sec / 60, 3)} min`;
  return `${fmt(sec, 3)} s`;
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
  ['levels', 'Levels'], ['combine', 'Combine'], ['subtract', 'Subtract'],
  ['waves', 'Waves'], ['dist', 'Distance'], ['room', 'Room Acoustics'],
  ['power', 'Sound Power'], ['weight', 'Weighting'], ['leq', 'Leq'],
  ['dose', 'Noise Dose'], ['loud', 'Loudness'], ['speech', 'Speech (PSIL)'],
  ['community', 'Community'], ['stats', 'Stats / SEL'], ['tl', 'Insulation (TL)'],
  ['muffler', 'Mufflers'], ['table', 'Tables'],
];
// Search keywords/tags per tab (lowercase). Matched against the typed query.
const TAB_TAGS = {
  levels: 'spl lp sound pressure level lw sound power watt li intensity i=p2 p^2 rho c pascal pa rms peak amplitude p_ref reference 20 micropascal decibel db conversion convert tone tones combine watts',
  combine: 'combine add addition sum total decibel db incoherent sources identical n typewriters dogs energy increase more sources louder',
  subtract: 'subtract subtraction remove background source minus one of n decibel db difference',
  waves: 'wave waves wavelength lambda frequency f speed of sound c=fl c celerity temperature gas constant gamma wavenumber k omega angular period t particle velocity displacement xi octave band edges centre frequency third pipe natural frequency resonance modes plane wave',
  dist: 'distance attenuation spreading geometric point source line source traffic 6 db 3 db doubling inverse square lp lw free field hemispherical ground propagation outdoor',
  room: 'room acoustics reverberation rt60 t60 sabine absorption coefficient alpha average room constant r direct reverberant field directivity q room equation lp lw enclosure',
  power: 'sound power measurement lw k1 k2 background correction environmental hemisphere surface area reference source mean spl',
  weight: 'weighting a weighting b c weighted dba db(a) dbb dbc octave third octave band overall level network frequency analysis spectrum',
  leq: 'leq laeq equivalent continuous level time varying duration events train pass by meter periods exposure energy average lateq',
  dose: 'noise dose ohs oh&s occupational exposure limit 85 db permissible time exchange rate hearing shift worker percent percentage criterion',
  loud: 'loudness phon phons sone sones equal loudness contour conversion subjective hearing',
  speech: 'speech psil sil interference voice effort communication distance talker listener 500 1000 2000 articulation',
  community: 'community noise day night ldn lden penalty environmental planning residential',
  stats: 'statistical levels percentile l1 l10 l90 l99 background sel sound exposure level single event ordering max min sort',
  tl: 'insulation transmission loss tl mass law partition wall surface mass impedance ratio interface reflection transmission coefficient alpha t alpha r panel resonance critical frequency sound reduction',
  muffler: 'muffler silencer pipe transmission loss insertion loss noise reduction il nr area change expansion chamber side branch reactive duct exhaust',
  table: 'tables reference a b c weighting values chart lookup data',
};

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

/* ---------------- Tab search / tag filter ---------------- */
function initSearch() {
  const box = $('tab-search'), info = $('search-info');
  if (!box) return;
  const apply = () => {
    const q = box.value.trim().toLowerCase();
    let shown = 0, firstId = null;
    document.querySelectorAll('#tabs button').forEach(b => {
      const id = b.dataset.for;
      const hay = (b.textContent + ' ' + (TAB_TAGS[id] || '')).toLowerCase();
      // Multi-word queries: substring match. Single word: match any token's prefix
      // (so "rev"→reverberation, but "spl" won't hit "displacement").
      const hit = q === '' ||
        (q.includes(' ') ? hay.includes(q) : hay.split(/[^a-z0-9]+/).some(t => t.startsWith(q)));
      b.style.display = hit ? '' : 'none';
      b.classList.toggle('match', q !== '' && hit);
      if (hit) { shown++; if (!firstId) firstId = id; }
    });
    if (q === '') info.textContent = '';
    else if (shown === 0) info.innerHTML = '<span class="nomatch">no calculator matches — try “SPL”, “Leq”, “RT60”, “TL”…</span>';
    else info.textContent = `${shown} match${shown > 1 ? 'es' : ''}`;
    box._first = firstId;
  };
  box.addEventListener('input', apply);
  box.addEventListener('keydown', e => {
    if (e.key === 'Enter' && box._first) { selectTab(box._first); }
    if (e.key === 'Escape') { box.value = ''; apply(); }
  });
  apply();
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
  const def = $('leq-unit').value;
  const rows = parseLevelRows($('leq-list').value);
  let energy = 0, sumT = 0, bad = false;
  rows.forEach(r => {
    const L = Number(r[0]), t = parseTime(r[1], def);
    if (r.length < 2 || isNaN(L) || isNaN(t)) { bad = true; return; }
    energy += t * 10 ** (L / 10); sumT += t;
  });
  if (bad || !rows.length) return show('leq-out',
    'Each row needs: level, duration (e.g. <code>96, 15 min</code>).', 'err');
  let T = parseTime($('leq-T').value, def);
  if (isNaN(T) || T <= 0) T = sumT;
  const leq = 10 * lg(energy / T);
  show('leq-out',
    `L<sub>eq</sub> = <b>${fmt(leq, 3)} dB</b><br>
     <span class="small">Σt = ${fmtSeconds(sumT)} · reference T = ${fmtSeconds(T)}</span>`);
}
function doEvents() {
  const def = $('evt-unit').value;
  const T = parseTime($('evt-T').value, def);
  if (!(T > 0)) return show('evt-out', 'Reference period T must be > 0.', 'err');
  const rows = parseLevelRows($('evt-list').value);
  let energy = 0, bad = false;
  rows.forEach(r => {
    const L = Number(r[0]), t = parseTime(r[1], def), n = Number(r[2]);
    if (r.length < 3 || isNaN(L) || isNaN(t) || isNaN(n)) { bad = true; return; }
    energy += n * t * 10 ** (L / 10);
  });
  if (bad || !rows.length) return show('evt-out',
    'Each row needs: level, single-event duration, number of events.', 'err');
  const leq = 10 * lg(energy / T);
  show('evt-out',
    `L<sub>eq,T</sub> = <b>${fmt(leq, 3)} dB</b><br><span class="small">reference T = ${fmtSeconds(T)}</span>`);
}

/* ---------------- Noise dose ---------------- */
function doDose() {
  const def = $('dose-unit').value;
  const rows = parseLevelRows($('dose-list').value);
  const Lc = Number($('dose-Lc').value), q = Number($('dose-q').value), Tc = Number($('dose-Tc').value);
  let energy = 0, sumT = 0, dose = 0, bad = false;
  rows.forEach(r => {
    const L = Number(r[0]), t = parseTime(r[1], def) / 3600;   // hours
    if (r.length < 2 || isNaN(L) || isNaN(t)) { bad = true; return; }
    energy += t * 10 ** (L / 10); sumT += t;
    const Ti = Tc / 2 ** ((L - Lc) / q);     // allowed time at level L
    dose += t / Ti;
  });
  if (bad || !rows.length) return show('dose-out',
    'Each row needs: level dB(A), duration (e.g. <code>96, 15 min</code>).', 'err');
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

function doMaxTime() {
  const L = Number($('mpt-L').value), Lc = Number($('mpt-Lc').value),
        q = Number($('mpt-q').value), Tc = Number($('mpt-Tc').value);
  if (!(q > 0) || !(Tc > 0)) return show('mpt-out', 'q and Tc must be > 0.', 'err');
  const T = Tc / 2 ** ((L - Lc) / q);
  const exceed = L > Lc;
  show('mpt-out',
    `T = <b>${fmt(T, 4)} h</b> &nbsp;(= ${fmt(T * 60, 1)} min)<br>
     <span class="small">= ${fmt(Tc)} / 2^((${fmt(L)}−${fmt(Lc)})/${fmt(q)})</span><br>
     Level ${exceed ? 'exceeds' : 'is within'} the ${fmt(Lc)} dB(A) criterion.`,
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

/* ---------------- Levels & conversions ---------------- */
function blank(id) { return $(id).value.trim() === ''; }
function doSPL() {
  if (!blank('lp-p')) {
    const p = Number($('lp-p').value);
    if (!(p > 0)) return show('lp-out', 'Pressure must be > 0.', 'err');
    const Lp = 20 * lg(p / P_REF);
    $('lp-val').value = fmt(Lp, 2);
    return show('lp-out', `L<sub>p</sub> = <b>${fmt(Lp, 2)} dB</b> &nbsp;(from p = ${p} Pa)`);
  }
  const Lp = Number($('lp-val').value), p = P_REF * 10 ** (Lp / 20);
  $('lp-p').value = p.toPrecision(4);
  show('lp-out', `p<sub>rms</sub> = <b>${p.toPrecision(4)} Pa</b> &nbsp;(from L<sub>p</sub> = ${Lp} dB)`);
}
function doLw() {
  if (!blank('lw-L')) {
    const L = Number($('lw-L').value), W = W_REF * 10 ** (L / 10);
    $('lw-W').value = W.toPrecision(4);
    return show('lw-out', `W = <b>${W.toPrecision(4)} W</b>`);
  }
  const W = Number($('lw-W').value);
  if (!(W > 0)) return show('lw-out', 'Power must be > 0.', 'err');
  const L = 10 * lg(W / W_REF);
  $('lw-L').value = fmt(L, 2);
  show('lw-out', `L<sub>w</sub> = <b>${fmt(L, 2)} dB</b>`);
}
function doLI() {
  let I;
  if (!blank('li-p')) { const p = Number($('li-p').value); I = p * p / RHO_C; }
  else I = Number($('li-I').value);
  if (!(I > 0)) return show('li-out', 'Enter intensity or pressure.', 'err');
  const LI = 10 * lg(I / I_REF);
  show('li-out', `I = <b>${I.toPrecision(4)} W/m²</b><br>L<sub>I</sub> = <b>${fmt(LI, 2)} dB</b>`);
}
function doRMS() {
  const P = Number($('rms-P').value), p = P / Math.SQRT2;
  show('rms-out', `p<sub>rms</sub> = <b>${p.toPrecision(4)} Pa</b> &nbsp;→ SPL = ${fmt(20 * lg(p / P_REF), 2)} dB`);
}
function doRMScombine() {
  const ps = $('rms-list').value.trim().split('\n').map(s => Number(s.trim())).filter(s => !isNaN(s));
  if (!ps.length) return show('rmsc-out', 'Enter at least one pressure.', 'err');
  const tot = Math.sqrt(ps.reduce((a, p) => a + p * p, 0));
  show('rmsc-out', `p<sub>tot</sub> = <b>${tot.toPrecision(4)} Pa</b> &nbsp;→ SPL = <b>${fmt(20 * lg(tot / P_REF), 2)} dB</b>`);
}

/* ---------------- Waves ---------------- */
function doWave() {
  let c = $('wave-c').value, f = $('wave-f').value, lam = $('wave-lam').value;
  c = c === '' ? null : Number(c); f = f === '' ? null : Number(f); lam = lam === '' ? null : Number(lam);
  const known = [c, f, lam].filter(v => v !== null).length;
  if (known < 2) return show('wave-out', 'Enter at least two of c, f, λ.', 'err');
  if (c === null) c = f * lam; else if (f === null) f = c / lam; else if (lam === null) lam = c / f;
  $('wave-c').value = fmt(c, 3); $('wave-f').value = fmt(f, 3); $('wave-lam').value = fmt(lam, 4);
  const w = 2 * Math.PI * f, k = 2 * Math.PI / lam;
  show('wave-out',
    `c=<b>${fmt(c, 2)} m/s</b> · f=<b>${fmt(f, 2)} Hz</b> · λ=<b>${fmt(lam, 4)} m</b><br>
     T = ${(1 / f).toPrecision(4)} s · ω = ${fmt(w, 1)} rad/s · k = ${fmt(k, 3)} rad/m`);
}
function doSOS() {
  const Tc = Number($('sos-T').value), R = Number($('sos-R').value), g = Number($('sos-g').value);
  const T0 = Tc + 273.2, c = Math.sqrt(g * R * T0);
  show('sos-out',
    `T₀ = ${fmt(T0, 1)} K<br>c = √(${g}·${R}·${fmt(T0, 1)}) = <b>${fmt(c, 2)} m/s</b><br>
     <span class="small">Air shortcut 20.06·√T₀ = ${fmt(20.06 * Math.sqrt(T0), 2)} m/s</span>`);
}
function doParticle() {
  const P = Number($('pv-P').value), f = Number($('pv-f').value), rc = Number($('pv-rc').value);
  const w = 2 * Math.PI * f, u = P / rc, xi = u / w, I = P * P / (2 * rc);
  show('pv-out',
    `Particle velocity u = <b>${u.toExponential(3)} m/s</b><br>
     Displacement ξ = <b>${xi.toExponential(3)} m</b><br>
     Intensity I = <b>${I.toExponential(3)} W/m²</b>`);
}
function doBandEdges() {
  const fc = Number($('be-fc').value), type = $('be-type').value;
  if (!(fc > 0)) return show('be-out', 'Centre frequency must be > 0.', 'err');
  const e = bandEdges(fc, type);
  show('be-out',
    `Lower = <b>${fmt(e.lower, 1)} Hz</b> · Upper = <b>${fmt(e.upper, 1)} Hz</b><br>
     Bandwidth = ${fmt(e.upper - e.lower, 1)} Hz`);
}
function doPipe() {
  const L = Number($('pipe-L').value), c = Number($('pipe-c').value);
  if (!(L > 0)) return show('pipe-out', 'Length must be > 0.', 'err');
  let s = '';
  for (let n = 1; n <= 4; n++) s += `f<sub>${n}</sub> = <b>${fmt((2 * n - 1) * c / (4 * L), 1)} Hz</b><br>`;
  show('pipe-out', s);
}

/* ---------------- Lw → Lp at distance ---------------- */
function doLwLp() {
  const Lw = Number($('lwlp-Lw').value), r = Number($('lwlp-r').value), t = $('lwlp-type').value;
  if (!(r > 0)) return show('lwlp-out', 'Distance must be > 0.', 'err');
  const map = { pf: [20, 11], pg: [20, 8], lf: [10, 8], lg: [10, 5] };
  const [coef, k] = map[t];
  const Lp = Lw - coef * lg(r) - k;
  show('lwlp-out', `L<sub>p</sub> = <b>${fmt(Lp, 2)} dB</b> &nbsp;<span class="small">= ${Lw} − ${coef}·log₁₀(${r}) − ${k}</span>`);
}

/* ---------------- Room acoustics ---------------- */
function doRT() {
  let V = $('rt-V').value, S = $('rt-S').value, a = $('rt-a').value, T = $('rt-T').value;
  V = V === '' ? null : +V; S = S === '' ? null : +S; a = a === '' ? null : +a; T = T === '' ? null : +T;
  const miss = [V, S, a, T].filter(x => x === null).length;
  if (miss !== 1) return show('rt-out', 'Fill exactly three values; leave one blank.', 'err');
  if (T === null) T = 0.161 * V / (a * S);
  else if (a === null) a = 0.161 * V / (T * S);
  else if (S === null) S = 0.161 * V / (T * a);
  else if (V === null) V = T * a * S / 0.161;
  $('rt-V').value = fmt(V, 2); $('rt-S').value = fmt(S, 2); $('rt-a').value = fmt(a, 4); $('rt-T').value = fmt(T, 3);
  show('rt-out',
    `T₆₀ = <b>${fmt(T, 3)} s</b> · ᾱ = <b>${fmt(a, 4)}</b><br>
     Equivalent absorption area A = ᾱ·S = <b>${fmt(a * S, 2)} m²</b>`);
}
function doAvgAbs() {
  const rows = parseRows($('aa-list').value);
  let num = 0, den = 0, bad = false;
  rows.forEach(r => { if (r.length < 2 || r.some(isNaN)) { bad = true; return; } num += r[0] * r[1]; den += r[0]; });
  if (bad || !den) return show('aa-out', 'Each row needs: area, α.', 'err');
  show('aa-out', `ᾱ = <b>${fmt(num / den, 4)}</b><br><span class="small">ΣS = ${fmt(den, 1)} m² · ΣαS = ${fmt(num, 2)} m²</span>`);
}
function doRoomConst() {
  const a = Number($('rc-a').value), S = Number($('rc-S').value);
  if (!(a > 0 && a < 1)) return show('rc-out', 'ᾱ must be between 0 and 1.', 'err');
  show('rc-out', `R = <b>${fmt(a * S / (1 - a), 2)} m²</b>`);
}
function doRoomEq() {
  const Lw = Number($('re-Lw').value), r = Number($('re-r').value), R = Number($('re-R').value), Q = Number($('re-Q').value);
  if (!(r > 0) || !(R > 0)) return show('re-out', 'r and R must be > 0.', 'err');
  const direct = Q / (4 * Math.PI * r * r), rev = 4 / R;
  const Lp = Lw + 10 * lg(direct + rev);
  const dom = direct > rev ? 'direct field dominates' : 'reverberant field dominates';
  show('re-out',
    `L<sub>p</sub> = <b>${fmt(Lp, 2)} dB</b><br>
     <span class="small">direct Q/4πr² = ${direct.toExponential(2)} · reverberant 4/R = ${rev.toExponential(2)} → ${dom}</span>`);
}

/* ---------------- Sound power measurement ---------------- */
function doK1() {
  const st = Number($('k1-st').value), b = Number($('k1-b').value), dL = st - b;
  if (dL <= 0) return show('k1-out', 'Source level must exceed background.', 'err');
  if (dL < 6) return show('k1-out', `ΔL = ${fmt(dL, 1)} dB < 6 dB — measurement invalid (background too high).`, 'warn');
  const K1 = -10 * lg(1 - 10 ** (-dL / 10));
  show('k1-out', `ΔL = ${fmt(dL, 1)} dB · K₁ = <b>${fmt(K1, 3)} dB</b>` +
    (dL >= 15 ? ' (≥15 dB → negligible)' : ''));
}
function doK2() {
  const S = Number($('k2-S').value), A = Number($('k2-A').value);
  if (!(A > 0)) return show('k2-out', 'Absorption area must be > 0.', 'err');
  show('k2-out', `K₂ = <b>${fmt(10 * lg(1 + 4 * S / A), 3)} dB</b>`);
}
function doLwMeas() {
  const lp = Number($('lwm-lp').value), k1 = Number($('lwm-k1').value),
        k2 = Number($('lwm-k2').value), S = Number($('lwm-S').value);
  if (!(S > 0)) return show('lwm-out', 'Surface area must be > 0.', 'err');
  const Lw = (lp - k1 - k2) + 10 * lg(S);
  show('lwm-out', `L<sub>w</sub> = <b>${fmt(Lw, 2)} dB</b> &nbsp;<span class="small">= (${lp}−${k1}−${k2}) + 10·log₁₀(${S})</span>`);
}

/* ---------------- Community noise ---------------- */
function doLdn() {
  const d = Number($('ldn-day').value), n = Number($('ldn-night').value);
  const ldn = 10 * lg((15 * 10 ** (d / 10) + 9 * 10 ** ((n + 10) / 10)) / 24);
  show('ldn-out', `L<sub>dn</sub> = <b>${fmt(ldn, 2)} dB(A)</b>`);
}

/* ---------------- Insulation / TL ---------------- */
function massFromInputs() {
  if (!blank('ml-M')) return Number($('ml-M').value);
  if (!blank('ml-rho') && !blank('ml-t')) return Number($('ml-rho').value) * Number($('ml-t').value) / 1000;
  return NaN;
}
function doMassLaw() {
  const M = massFromInputs(), f = Number($('ml-f').value);
  if (!(M > 0)) return show('ml-out', 'Enter surface mass, or density and thickness.', 'err');
  const TL = 20 * lg(M * f) - 42.4;
  show('ml-out',
    `Surface mass M = ${fmt(M, 3)} kg/m²<br>TL = <b>${fmt(TL, 1)} dB</b> at ${fmt(f)} Hz`);
}
function doInterface() {
  const z1 = Number($('if-z1').value), z2 = Number($('if-z2').value), r = z2 / z1;
  const at = 4 * r / ((r + 1) ** 2), ar = ((r - 1) / (r + 1)) ** 2;
  show('if-out',
    `Impedance ratio r = <b>${fmt(r, 3)}</b><br>
     α<sub>t</sub> = <b>${at.toPrecision(4)}</b> · α<sub>r</sub> = <b>${fmt(ar, 4)}</b><br>
     TL = <b>${fmt(-10 * lg(at), 2)} dB</b>`);
}
function doTLcoef() {
  const a = Number($('tlt-a').value);
  if (!(a > 0 && a <= 1)) return show('tlt-out', 'α must be between 0 and 1.', 'err');
  show('tlt-out', `TL = <b>${fmt(-10 * lg(a), 2)} dB</b>`);
}
function doPanelRes() {
  const K = Number($('pr-K').value), M = Number($('pr-M').value);
  if (!(K > 0 && M > 0)) return show('pr-out', 'K and M must be > 0.', 'err');
  show('pr-out', `f<sub>n</sub> = <b>${fmt(Math.sqrt(K / M) / (2 * Math.PI), 2)} Hz</b>`);
}

/* ---------------- Mufflers ---------------- */
function doAreaChange() {
  const s1 = Number($('ac-s1').value), s2 = Number($('ac-s2').value);
  if (!(s1 > 0 && s2 > 0)) return show('ac-out', 'Areas must be > 0.', 'err');
  const Tt = 4 * s1 * s2 / ((s1 + s2) ** 2);
  show('ac-out', `T<sub>t</sub> = ${fmt(Tt, 4)} · TL = <b>${fmt(-10 * lg(Tt), 2)} dB</b>`);
}
function doExpChamber() {
  const s1 = Number($('ec-s1').value), s2 = Number($('ec-s2').value), L = Number($('ec-L').value),
        f = Number($('ec-f').value), c = Number($('ec-c').value);
  if (!(s1 > 0 && s2 > 0)) return show('ec-out', 'Areas must be > 0.', 'err');
  const m = s2 / s1, kL = 2 * Math.PI * f / c * L;
  const TL = 10 * lg(Math.cos(kL) ** 2 + 0.25 * (m + 1 / m) ** 2 * Math.sin(kL) ** 2);
  const lam = c / f;
  show('ec-out',
    `kL = ${fmt(kL, 3)} rad · TL = <b>${fmt(TL, 2)} dB</b><br>
     <span class="small">m = S₂/S₁ = ${fmt(m, 2)} · λ = ${fmt(lam, 3)} m · λ/4 = ${fmt(lam / 4, 3)} m (peak length)</span>`);
}
function doLevelDiff() {
  const a = Number($('diff-1').value), b = Number($('diff-2').value);
  show('diff-out', `Difference = <b>${fmt(a - b, 2)} dB</b> &nbsp;<span class="small">(TL / IL / NR depending on context)</span>`);
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
  initSearch();
  buildWeightTable();
  buildRefTable();
});
