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
  ['leq', 'Leq'], ['dose', 'Noise Dose'], ['loud', 'Loudness'],
  ['speech', 'Speech (PSIL)'], ['stats', 'Stats / SEL'], ['table', 'Tables'],
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

/* ---------------- Search ---------------- */
// Each entry points at a tab. `kw` holds synonyms/keywords (lower-case) so a wide
// range of search terms resolves to the right calculator. `el` (optional) is the id of
// an element to scroll to / flash within the tab.
const SEARCH_INDEX = [
  { tab:'combine', label:'Combine', title:'Add / combine sound levels', el:'combine-list',
    desc:'Total of several levels or octave bands, on an energy basis · RMS pressure (Pa)',
    kw:['combine','add','sum','total','overall level','octave band','octave-band','octave band analysis',
        'one third octave','third octave','rms','rms pressure','sound pressure','pressure pa','pascal',
        'incoherent','energy sum','spl','sound pressure level','lp','overall','logarithmic addition'] },
  { tab:'combine', label:'Combine', title:'N identical sources', el:'ident-out',
    desc:'Total level of N identical machines · L + 10·log₁₀(N)',
    kw:['identical sources','n sources','multiple machines','same source','n identical','10 log n',
        'how many machines','several identical','number of sources'] },
  { tab:'combine', label:'Combine', title:'Increase when sources are added', el:'inc-out',
    desc:'Change in level when more identical sources are added',
    kw:['increase','more sources','added sources','sources added','barking dogs','change in level',
        'level increase','extra sources'] },
  { tab:'subtract', label:'Subtract', title:'Subtract a source / background', el:'sub-out',
    desc:'Remove background or one source from a measured total',
    kw:['subtract','remove','background','background noise','minus','difference','take away',
        'correct for background','machine on off','source vs background','energy subtraction'] },
  { tab:'subtract', label:'Subtract', title:'Level of one of N identical sources', el:'one-out',
    desc:'Back out a single source level from the combined total of N',
    kw:['one of n','single source','one source','per source','level of one','divide sources'] },
  { tab:'weight', label:'Weighting', title:'A / B / C weighting', el:'w-out',
    desc:'Apply A/B/C network to octave or ⅓-octave bands → dB(A)/dB(B)/dB(C) and linear total',
    kw:['weighting','weighted','a weighting','b weighting','c weighting','dba','db(a)','dbc','db(c)','dbb',
        'a-weighted','frequency weighting','network','overall dba','linear','flat','unweighted total',
        'octave weighting','third octave weighting','correction'] },
  { tab:'leq', label:'Leq', title:'Equivalent continuous level (Leq)', el:'leq-list',
    desc:'L_eq from levels & durations',
    kw:['leq','l eq','equivalent level','equivalent continuous','time average','time-average',
        'average level','laeq','energy average','exposure level','duration','varying level'] },
  { tab:'leq', label:'Leq', title:'Leq from discrete events', el:'evt-list',
    desc:'L_eq from pass-bys: trains, vehicles, events per period',
    kw:['events','pass by','pass-by','passby','train','vehicle','flyover','number of events',
        'discrete events','traffic','road noise','rail noise','events per hour'] },
  { tab:'dose', label:'Noise Dose', title:'Noise dose & OH&S limits', el:'dose-out',
    desc:'Shift L_Aeq, dose %, OH&S check, max permissible time (85 dB, 3 dB exchange)',
    kw:['dose','noise dose','daily dose','exposure','occupational','ohs','oh&s','whs','hearing',
        'permissible','max time','maximum time','exchange rate','85 db','90 db','criterion','laeq 8h',
        'shift','worker','allowable exposure','exposure time'] },
  { tab:'loud', label:'Loudness', title:'Loudness — phons ↔ sones', el:'ph2s-out',
    desc:'Convert phons to sones (and back) · equal-loudness contours',
    kw:['loudness','loud','sone','sones','phon','phons','equal loudness','equal-loudness contour',
        'fletcher munson','loudness level','perceived loudness'] },
  { tab:'speech', label:'Speech (PSIL)', title:'Speech interference (PSIL)', el:'psil-out',
    desc:'Preferred Speech Interference Level + voice-effort & distance guidance',
    kw:['psil','speech','speech interference','preferred speech interference','voice','talker','listener',
        'communication','intelligibility','voice effort','distance','sil','conversation'] },
  { tab:'stats', label:'Stats / SEL', title:'Statistical levels & SEL', el:'sort-out',
    desc:'L₁/L₁₀/L₉₀/L₉₉ meanings · SEL ↔ L_eq · percentile levels',
    kw:['stats','statistical','percentile','l1','l10','l90','l99','l50','median','exceedance',
        'sel','sound exposure level','single event','background l90','ambient l90','percentile level'] },
  { tab:'table', label:'Tables', title:'A/B/C weighting reference table', el:'ref-table',
    desc:'Full A/B/C weighting network values by frequency',
    kw:['table','reference','weighting table','network table','values','lookup','a b c values',
        'correction table','frequency table'] },
];

function runSearch(q) {
  const box = $('search-results');
  q = q.trim().toLowerCase();
  if (!q) { box.classList.remove('open'); box.innerHTML = ''; return; }
  const terms = q.split(/\s+/);
  const scored = SEARCH_INDEX.map(item => {
    const hay = (item.title + ' ' + item.label + ' ' + item.desc + ' ' + item.kw.join(' ')).toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (item.kw.some(k => k === t)) score += 5;          // exact keyword
      else if (item.kw.some(k => k.includes(t))) score += 3; // keyword contains term
      else if (hay.includes(t)) score += 1;                  // anywhere
    }
    return { item, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

  if (!scored.length) {
    box.innerHTML = `<div class="none">No match for “${q}”. Try: octave band, dB(A), Leq, dose, sones, PSIL, SEL.</div>`;
    box.classList.add('open');
    return;
  }
  box.innerHTML = scored.map(({ item }, i) =>
    `<div class="hit${i === 0 ? ' active' : ''}" data-tab="${item.tab}" data-el="${item.el || ''}">
       <div class="t"><span class="tag">${item.label}</span>${item.title}</div>
       <div class="d">${item.desc}</div>
     </div>`).join('');
  box.classList.add('open');
  box.querySelectorAll('.hit').forEach(h =>
    h.onmousedown = e => { e.preventDefault(); gotoHit(h.dataset.tab, h.dataset.el); });
}

function gotoHit(tab, el) {
  selectTab(tab);
  const box = $('search-results');
  box.classList.remove('open');
  $('search').value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (el) {
    const target = $(el);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('flash');
      setTimeout(() => target.classList.remove('flash'), 1200);
    }
  }
}

function initSearch() {
  const inp = $('search'), box = $('search-results');
  if (!inp) return;
  inp.addEventListener('input', () => runSearch(inp.value));
  inp.addEventListener('focus', () => { if (inp.value.trim()) runSearch(inp.value); });
  inp.addEventListener('keydown', e => {
    const hits = [...box.querySelectorAll('.hit')];
    if (!hits.length) return;
    let idx = hits.findIndex(h => h.classList.contains('active'));
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, hits.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const h = hits[idx] || hits[0]; gotoHit(h.dataset.tab, h.dataset.el); return; }
    else if (e.key === 'Escape') { box.classList.remove('open'); inp.blur(); return; }
    else return;
    hits.forEach(h => h.classList.remove('active'));
    hits[idx].classList.add('active');
  });
  document.addEventListener('click', e => {
    if (!inp.contains(e.target) && !box.contains(e.target)) box.classList.remove('open');
  });
}

/* ---------------- init ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  buildWeightTable();
  buildRefTable();
  initSearch();
});
