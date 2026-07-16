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
// Pretty-print a duration given in hours as "H h M min" (or s for tiny values).
function fmtHM(hours) {
  if (!isFinite(hours)) return '∞';
  let s = Math.round(hours * 3600);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const parts = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s && !h) parts.push(`${s} s`);
  return parts.length ? parts.join(' ') : '0 min';
}

// Render a step-by-step "Working" block from an array of HTML lines.
function work(steps) {
  return `<div class="work"><div class="work-h">Working</div>` +
    steps.map(s => `<div class="work-l">${s}</div>`).join('') + `</div>`;
}
// Energy term 10^(L/10) as a tidy number.
const e10 = L => 10 ** (L / 10);
// Compact number for working lines.
const sci = (x, d = 4) => {
  if (x !== 0 && (Math.abs(x) >= 1e5 || Math.abs(x) < 1e-3)) return x.toExponential(d - 1);
  return (+x.toPrecision(d)).toString();
};
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
  ['map', '🗺 Formula Map'],
  ['levels', 'Levels'], ['combine', 'Combine'], ['subtract', 'Subtract'],
  ['waves', 'Waves'], ['dist', 'Distance'], ['room', 'Room Acoustics'],
  ['power', 'Sound Power'], ['duct', 'Duct → Voltage'], ['weight', 'Weighting'], ['bands', 'Band Workbench'], ['leq', 'Leq'],
  ['dose', 'Noise Dose'], ['loud', 'Loudness'], ['speech', 'Speech (PSIL)'],
  ['community', 'Community'], ['stats', 'Stats / SEL'], ['tl', 'Insulation (TL)'],
  ['muffler', 'Mufflers'], ['table', 'Tables'],
];
// Search keywords/tags per tab (lowercase). Matched against the typed query.
const TAB_TAGS = {
  map: 'map mapping graph network diagram overview connections relationships related links concept formula visual navigation obsidian explore mind map web',
  levels: 'spl lp sound pressure level lw sound power watt li intensity i=p2 p^2 rho c pascal pa rms peak amplitude p_ref reference 20 micropascal decibel db conversion convert tone tones combine watts psd power spectral density pa2/hz pa^2/hz integrate area trapezoid band linear flat mean square spectrum frequency limits radiated acoustic power point source 4pir2 directivity q sphere hemisphere siren w from intensity',
  combine: 'combine add addition sum total decibel db incoherent sources identical n typewriters dogs energy increase more sources louder error larger signal smaller ignore neglect approximate estimate rms quadrature ratio percent max maximum machines permitted limit how many under night allowed',
  subtract: 'subtract subtraction remove background source minus one of n decibel db difference',
  waves: 'wave waves wavelength lambda frequency f speed of sound c=fl c celerity temperature gas constant gamma wavenumber k omega angular period t particle velocity displacement xi octave band edges centre frequency third pipe natural frequency resonance modes standing wave open both ends closed one end open-open open-closed closed-closed rad/s plane wave bandwidth percentage filter %bw constant percentage 70.7 23.1 temperature from speed time of flight travel time microphones hot air rms velocity fluctuation sound pressure level spl water reference 1 micropascal threshold of hearing just audible',
  dist: 'distance attenuation spreading geometric point source line source traffic 6 db 3 db doubling inverse square lp lw free field hemispherical ground propagation outdoor solve unknown distance two levels back out rifle range y near far increment estimate sound power level from spl reverse lw from lp anechoic chamber omni-directional omnidirectional',
  room: 'room acoustics reverberation rt60 t60 sabine absorption coefficient alpha average room constant r direct reverberant field directivity q room equation lp lw enclosure add remove panels absorber suspended panel both sides increase level reverberant change refurbish office acoustic treatment plant room machinery motors combine sound power watts reverberant field spl ceiling coating surface treatment dba reduction before after reverberation test room upholstered furniture equivalent absorption area 0.161v/t60 mean square pressure pa2 reference source club empty furnished',
  power: 'sound power measurement lw k1 k2 background correction environmental hemisphere sphere surface area reference source mean spl unweighted un-weight a-weighted dba octave band drill free field on the ground total unweighted sound power level',
  duct: 'duct pipe tube voltage microphone mic sensitivity v/pa volts millivolt sound power lw power level watts intensity plane wave rms pressure radiated source anechoic no reflection diameter cross section transducer band spl octave to intensity radiated power per band total sound power level w=ia combine speaker',
  weight: 'weighting a weighting b c weighted dba db(a) dbb dbc octave third octave band overall level network frequency analysis spectrum',
  bands: 'band workbench third octave to octave combine spls overall spl a-weighted dba one third 1/3 octave consecutive bands triplet convert all in one part a b spectrum analysis nine bands',
  leq: 'leq laeq equivalent continuous level time varying duration events train pass by meter periods exposure energy average lateq integral integrate function ramp formula rising noise event percentile ln l10 l90 level exceeded percent five minute',
  dose: 'noise dose ohs oh&s occupational exposure limit 85 db permissible time exchange rate hearing shift worker percent percentage criterion hearing protector ear muff earmuff slc80 slc 80 nrr c-weighted lceq protected attenuation as/nzs 1269 reduce level',
  loud: 'loudness phon phons sone sones equal loudness contour conversion subjective hearing',
  speech: 'speech psil sil interference voice effort communication distance talker listener 500 1000 2000 articulation a-weighted voice level vla required possible face to face shouting raised normal peak eq 5.6 table 5.2',
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
  // The map needs a visible container before it can lay out / animate.
  if (id === 'map') startMap();
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

/* ===================================================================
   Formula Map — Obsidian-style relationship graph
   A force-directed network showing how the calculators relate. Each
   node is a calculator tab; each edge is a shared formula / variable.
   Click a node to jump to that calculator; drag to rearrange; hover to
   highlight its connections and reveal the linking formula.
   =================================================================== */
const SVGNS = 'http://www.w3.org/2000/svg';

// Thematic groups (colour-coded) the calculators fall into.
const MAP_GROUPS = {
  core:       { label: 'Levels & dB arithmetic', color: '#3fa7ff' },
  waves:      { label: 'Waves',                   color: '#9d7bff' },
  prop:       { label: 'Propagation & rooms',     color: '#2bd6a8' },
  freq:       { label: 'Frequency & weighting',   color: '#ffb84d' },
  exposure:   { label: 'Exposure & ratings',      color: '#ff7eb6' },
  insulation: { label: 'Insulation & mufflers',   color: '#ff6b6b' },
};

// Nodes: id must match a tab id so a click can navigate there.
// f = the headline formula(s) shown in the hover tooltip.
const MAP_NODES = [
  { id: 'levels',    label: 'Levels',         group: 'core',       f: 'Lp = 20·log(p/2e-5) · Lw = 10·log(W/1e-12) · LI = 10·log(I/1e-12)' },
  { id: 'combine',   label: 'Combine',        group: 'core',       f: 'L_tot = 10·log( Σ 10^(Lᵢ/10) )' },
  { id: 'subtract',  label: 'Subtract',       group: 'core',       f: 'L_rem = 10·log( 10^(L_tot/10) − 10^(L_bg/10) )' },
  { id: 'waves',     label: 'Waves',          group: 'waves',      f: 'c = f·λ = √(γ·R·T) · k = 2π/λ · u = p/ρc' },
  { id: 'dist',      label: 'Distance',       group: 'prop',       f: 'Point: −6 dB/doubling · Line: −3 dB/doubling · Lp = Lw − 20log r − 11' },
  { id: 'room',      label: 'Room Acoustics', group: 'prop',       f: 'T₆₀ = 0.161V/(ᾱS) · R = ᾱS/(1−ᾱ) · Lp = Lw + 10log(Q/4πr² + 4/R)' },
  { id: 'power',     label: 'Sound Power',    group: 'prop',       f: 'Lw = L̄p + 10log(S/S₀) · K₁ background · K₂ environment' },
  { id: 'duct',      label: 'Duct → Voltage', group: 'prop',       f: 'Lw → I = W/A → p = √(I·ρc) → V = p·sensitivity' },
  { id: 'weight',    label: 'Weighting',      group: 'freq',       f: 'L_W = 10·log( Σ 10^((Lᵢ + Wᵢ)/10) )  →  dB(A)/dB(B)/dB(C)' },
  { id: 'bands',     label: 'Band Workbench', group: 'freq',       f: 'Combine ⅓-octave → octave → overall SPL & dB(A)' },
  { id: 'table',     label: 'Tables',         group: 'freq',       f: 'A / B / C weighting network reference values' },
  { id: 'leq',       label: 'Leq',            group: 'exposure',   f: 'L_eq = 10·log( (1/T)·Σ tᵢ·10^(Lᵢ/10) )' },
  { id: 'dose',      label: 'Noise Dose',     group: 'exposure',   f: 'Dose % · T_max = T_c / 2^((L_Aeq − L_c)/q)' },
  { id: 'loud',      label: 'Loudness',       group: 'exposure',   f: 'S = 2^((L_L − 40)/10)  (phons ↔ sones)' },
  { id: 'speech',    label: 'Speech (PSIL)',  group: 'exposure',   f: 'PSIL = (L₅₀₀ + L₁₀₀₀ + L₂₀₀₀)/3' },
  { id: 'community', label: 'Community',      group: 'exposure',   f: 'L_dn = 10·log( (1/24)[15·10^(Ld/10) + 9·10^((Ln+10)/10)] )' },
  { id: 'stats',     label: 'Stats / SEL',    group: 'exposure',   f: 'SEL = L_eq + 10·log(T/1s) · L₁/L₁₀/L₉₀/L₉₉' },
  { id: 'tl',        label: 'Insulation (TL)',group: 'insulation', f: 'TL = 20·log(M·f) − 42.4 · TL = −10·log(α_t)' },
  { id: 'muffler',   label: 'Mufflers',       group: 'insulation', f: 'τ = 4S₁S₂/(S₁+S₂)² · TL = −10·log(τ) · IL · NR' },
];

// Edges: a–b are node ids, label = the shared formula / quantity.
const MAP_EDGES = [
  { a: 'levels',  b: 'combine',  label: 'Σ 10^(Lᵢ/10)' },
  { a: 'levels',  b: 'subtract', label: 'energy −' },
  { a: 'combine', b: 'subtract', label: 'inverse of' },
  { a: 'levels',  b: 'weight',   label: 'Lᵢ → dB(A)' },
  { a: 'weight',  b: 'bands',    label: 'octave / ⅓-oct' },
  { a: 'weight',  b: 'table',    label: 'A/B/C values' },
  { a: 'weight',  b: 'leq',      label: 'dB(A) levels' },
  { a: 'weight',  b: 'loud',     label: 'spectrum' },
  { a: 'bands',   b: 'speech',   label: '500·1k·2k bands' },
  { a: 'levels',  b: 'dist',     label: 'Lp ↔ Lw' },
  { a: 'levels',  b: 'power',    label: 'Lw' },
  { a: 'levels',  b: 'duct',     label: 'Lw → I → p → V' },
  { a: 'levels',  b: 'leq',      label: 'energy average' },
  { a: 'dist',    b: 'room',     label: 'Lp = Lw + 10log(Q/4πr² + 4/R)' },
  { a: 'dist',    b: 'power',    label: 'Lw from Lp' },
  { a: 'room',    b: 'power',    label: 'R, ᾱ, K₂' },
  { a: 'waves',   b: 'dist',     label: 'c = f·λ' },
  { a: 'waves',   b: 'duct',     label: 'cut-on, plane wave' },
  { a: 'waves',   b: 'tl',       label: 'mass law, f_c' },
  { a: 'waves',   b: 'muffler',  label: 'λ, area change' },
  { a: 'tl',      b: 'muffler',  label: 'transmission loss' },
  { a: 'leq',     b: 'dose',     label: 'L_Aeq, dose %' },
  { a: 'leq',     b: 'stats',    label: 'SEL = Leq + 10logT' },
  { a: 'leq',     b: 'community',label: 'L_dn' },
];

const mapState = { started: false, raf: 0, alpha: 1, drag: null, active: null };

// Lazily build & start the map once its container is visible.
function startMap() {
  if (!mapState.started) buildMap();
  mapState.alpha = Math.max(mapState.alpha, 0.6);   // reheat on (re)entry
  if (!mapState.raf) mapTick();
}

function buildMap() {
  mapState.started = true;
  const svg = $('map-svg');
  const gEdges = $('map-edges'), gNodes = $('map-nodes');
  const W = 1000, H = 620, cx = W / 2, cy = H / 2;

  const byId = {};
  // Seed positions on a circle, ordered by group so it converges tidily.
  MAP_NODES.forEach((n, i) => {
    const ang = (i / MAP_NODES.length) * 2 * Math.PI;
    n.x = cx + 260 * Math.cos(ang);
    n.y = cy + 170 * Math.sin(ang);
    n.vx = 0; n.vy = 0; n.fx = null; n.fy = null;
    n.nbrs = new Set();
    byId[n.id] = n;
  });

  // Resolve edges to node objects + build adjacency.
  const edges = MAP_EDGES.map(e => {
    const A = byId[e.a], B = byId[e.b];
    A.nbrs.add(B.id); B.nbrs.add(A.id);
    return { A, B, label: e.label };
  });
  mapState.nodes = MAP_NODES; mapState.edges = edges; mapState.byId = byId;

  // --- Build SVG: edges (line + hover label) then nodes (circle + text). ---
  edges.forEach(e => {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('class', 'map-edge');
    gEdges.appendChild(ln);
    const lab = document.createElementNS(SVGNS, 'text');
    lab.setAttribute('class', 'map-elabel');
    lab.setAttribute('text-anchor', 'middle');
    lab.textContent = e.label;
    gEdges.appendChild(lab);
    e.ln = ln; e.lab = lab;
  });

  MAP_NODES.forEach(n => {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'map-node');
    g.dataset.id = n.id;
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', 21);
    c.setAttribute('fill', MAP_GROUPS[n.group].color);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('class', 'map-nlabel');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('y', 38);
    t.textContent = n.label;
    g.appendChild(c); g.appendChild(t);
    gNodes.appendChild(g);
    n.g = g; n.circle = c;
    attachNodeHandlers(n);
  });

  buildMapLegend();
  positionMap();
}

// Convert a pointer event to SVG/viewBox coordinates.
function mapPoint(evt) {
  const svg = $('map-svg');
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function attachNodeHandlers(n) {
  const g = n.g;
  // Pointer down → begin a potential drag (distinguished from click on up).
  g.addEventListener('pointerdown', evt => {
    evt.preventDefault();
    const p = mapPoint(evt);
    mapState.drag = { n, moved: false, ox: p.x - n.x, oy: p.y - n.y };
    n.fx = n.x; n.fy = n.y;
    g.setPointerCapture(evt.pointerId);
    setActive(n);
  });
  g.addEventListener('pointermove', evt => {
    const d = mapState.drag;
    if (!d || d.n !== n) return;
    const p = mapPoint(evt);
    n.fx = p.x - d.ox; n.fy = p.y - d.oy;
    n.x = n.fx; n.y = n.fy;
    d.moved = d.moved || Math.hypot(p.x - (n.fx + d.ox), p.y - (n.fy + d.oy)) > 0;
    mapState.alpha = Math.max(mapState.alpha, 0.5);
    if (!mapState.raf) mapTick();
  });
  const end = evt => {
    const d = mapState.drag;
    if (!d || d.n !== n) return;
    n.fx = null; n.fy = null;
    mapState.drag = null;
    // A press that barely moved is a click → open that calculator.
    if (!d.moved) selectTab(n.id);
  };
  g.addEventListener('pointerup', end);
  g.addEventListener('pointercancel', end);
  // Hover highlights connections without navigating.
  g.addEventListener('pointerenter', () => { if (!mapState.drag) setActive(n); });
  g.addEventListener('pointerleave', () => { if (!mapState.drag) setActive(null); });
}

// Highlight a node, its neighbours and the linking edges; dim the rest.
function setActive(n) {
  mapState.active = n;
  const id = n ? n.id : null;
  mapState.nodes.forEach(m => {
    const on = !id || m.id === id || (n && n.nbrs.has(m.id));
    m.g.classList.toggle('dim', !!id && !on);
    m.g.classList.toggle('hot', id && m.id === id);
  });
  mapState.edges.forEach(e => {
    const on = id && (e.A.id === id || e.B.id === id);
    e.ln.classList.toggle('hot', !!on);
    e.ln.classList.toggle('dim', !!id && !on);
    e.lab.classList.toggle('show', !!on);
  });
  const tip = $('map-tip');
  if (tip) {
    if (n) { tip.innerHTML = `<b>${n.label}</b> — ${n.f}<span class="map-tip-go">click to open ›</span>`; tip.classList.add('show'); }
    else tip.classList.remove('show');
  }
}

// Push current node coordinates into the SVG elements.
function positionMap() {
  mapState.edges.forEach(e => {
    e.ln.setAttribute('x1', e.A.x); e.ln.setAttribute('y1', e.A.y);
    e.ln.setAttribute('x2', e.B.x); e.ln.setAttribute('y2', e.B.y);
    e.lab.setAttribute('x', (e.A.x + e.B.x) / 2);
    e.lab.setAttribute('y', (e.A.y + e.B.y) / 2 - 4);
  });
  mapState.nodes.forEach(n => n.g.setAttribute('transform', `translate(${n.x},${n.y})`));
}

// One step of the force simulation: repulsion + edge springs + gravity.
function mapStep() {
  const nodes = mapState.nodes, edges = mapState.edges;
  const W = 1000, H = 620, cx = W / 2, cy = H / 2;
  const REP = 170000, SPRING = 0.02, L0 = 150, GRAV = 0.04, DAMP = 0.85;
  const a = mapState.alpha;

  for (let i = 0; i < nodes.length; i++) {
    const A = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const B = nodes[j];
      let dx = A.x - B.x, dy = A.y - B.y;
      let d2 = dx * dx + dy * dy; if (d2 < 1) { d2 = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
      const f = REP / d2 * a;
      const d = Math.sqrt(d2), ux = dx / d, uy = dy / d;
      A.vx += ux * f; A.vy += uy * f;
      B.vx -= ux * f; B.vy -= uy * f;
    }
  }
  edges.forEach(e => {
    const dx = e.B.x - e.A.x, dy = e.B.y - e.A.y;
    const d = Math.hypot(dx, dy) || 1;
    const f = (d - L0) * SPRING * a;
    const ux = dx / d, uy = dy / d;
    e.A.vx += ux * f; e.A.vy += uy * f;
    e.B.vx -= ux * f; e.B.vy -= uy * f;
  });
  nodes.forEach(n => {
    n.vx += (cx - n.x) * GRAV * a;
    n.vy += (cy - n.y) * GRAV * a;
    if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; return; }
    n.vx *= DAMP; n.vy *= DAMP;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(60, Math.min(W - 60, n.x));
    n.y = Math.max(34, Math.min(H - 44, n.y));
  });
  mapState.alpha *= 0.985;
  if (mapState.alpha < 0.02) mapState.alpha = 0.02;
}

function mapTick() {
  // Pause the loop entirely while the map tab is hidden (saves CPU).
  const sec = document.querySelector('.tab[data-tab="map"]');
  if (!sec || !sec.classList.contains('active')) { mapState.raf = 0; return; }
  for (let k = 0; k < 2; k++) mapStep();   // a couple of steps per frame settles faster
  positionMap();
  mapState.raf = requestAnimationFrame(mapTick);
}

function buildMapLegend() {
  const el = $('map-legend');
  if (!el) return;
  el.innerHTML = Object.values(MAP_GROUPS).map(g =>
    `<span class="map-leg"><i style="background:${g.color}"></i>${g.label}</span>`).join('');
}

/* ---------------- Combine ---------------- */
function doCombine() {
  const levels = $('combine-list').value.trim().split('\n')
    .map(s => Number(s.trim())).filter(s => !isNaN(s));
  if (!levels.length) return show('combine-out', 'Enter at least one level.', 'err');
  const energies = levels.map(e10), sum = energies.reduce((a, b) => a + b, 0), tot = 10 * lg(sum);
  show('combine-out',
    `Combined level = <b>${fmt(tot)} dB</b>` +
    work([
      `L_tot = 10·log₁₀( Σ 10^(Lᵢ/10) )`,
      `= 10·log₁₀( ${levels.map(L => `10^(${fmt(L)}/10)`).join(' + ')} )`,
      `= 10·log₁₀( ${energies.map(x => sci(x)).join(' + ')} )`,
      `= 10·log₁₀( ${sci(sum, 5)} )`,
      `= <b>${fmt(tot)} dB</b>`,
    ]));
}
function doIdentical() {
  const L = Number($('ident-L').value), N = Number($('ident-N').value);
  if (!(N >= 1)) return show('ident-out', 'N must be ≥ 1.', 'err');
  const tot = L + 10 * lg(N);
  show('ident-out',
    `Total of ${N} sources = <b>${fmt(tot)} dB</b>` +
    work([
      `L_tot = L₁ + 10·log₁₀(N)`,
      `= ${fmt(L)} + 10·log₁₀(${N})`,
      `= ${fmt(L)} + ${fmt(10 * lg(N))}`,
      `= <b>${fmt(tot)} dB</b>`,
    ]));
}
function doIncrease() {
  const n1 = Number($('inc-n1').value), L1 = Number($('inc-L1').value),
        add = Number($('inc-add').value), n2 = n1 + add;
  if (!(n1 > 0) || !(n2 > 0)) return show('inc-out', 'Counts must be positive.', 'err');
  const dL = 10 * lg(n2 / n1), nl = L1 + dL;
  show('inc-out',
    `Increase ΔL = <b>${fmt(dL, 3)} dB</b> · New level = <b>${fmt(nl, 3)} dB</b>` +
    work([
      `N₂ = N₁ + added = ${n1} + ${add} = ${n2}`,
      `ΔL = 10·log₁₀(N₂/N₁) = 10·log₁₀(${n2}/${n1})`,
      `= 10·log₁₀(${fmt(n2 / n1, 4)}) = <b>${fmt(dL, 3)} dB</b>`,
      `L_new = L₁ + ΔL = ${fmt(L1)} + ${fmt(dL, 3)} = <b>${fmt(nl, 3)} dB</b>`,
    ]));
}
function doLargerError() {
  const p1 = Number($('err-p1').value), p2 = Number($('err-p2').value);
  const rIn = $('err-ratio').value.trim();
  // The ratio field overrides the two pressures when supplied.
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
    `Total RMS = <b>${sci(ptot, 5)} × p₁</b> · Error using only p₁ = <b>${fmt(err, 2)} %</b> (under-estimate)` +
    work([
      `r = p₂/p₁ = ${sci(r, 4)}`,
      `p_tot = √(p₁² + p₂²) = p₁·√(1 + r²) = p₁·√(1 + ${sci(r * r, 4)}) = <b>${sci(ptot, 5)}·p₁</b>`,
      `Error = (p₁ − p_tot)/p_tot = 1/√(1 + r²) − 1`,
      `= 1/${sci(ptot, 5)} − 1 = <b>${fmt(err, 2)} %</b> (negative ⇒ under-estimate)`,
    ]));
}
function doMaxSources() {
  const N1 = Number($('ms-n1').value), L1 = Number($('ms-L1').value), Lmax = Number($('ms-max').value);
  if (!(N1 >= 1)) return show('ms-out', 'Current number of sources N₁ must be ≥ 1.', 'err');
  const per = L1 - 10 * lg(N1);                  // level of one source
  const Nexact = N1 * 10 ** ((Lmax - L1) / 10);  // N at exactly the limit
  const N = Math.floor(Nexact + 1e-9);           // largest integer N within the limit
  if (N < 1) return show('ms-out',
    `Even one source (${fmt(per, 2)} dB) exceeds the ${fmt(Lmax)} dB limit.`, 'err');
  const Ln = L1 + 10 * lg(N / N1), Ln1 = L1 + 10 * lg((N + 1) / N1);
  show('ms-out',
    `Max sources within limit = <b>${N}</b><br>
     Level at ${N} = <b>${fmt(Ln, 2)} dB</b> (≤ ${fmt(Lmax)} ✓) · at ${N + 1} = ${fmt(Ln1, 2)} dB (✗)` +
    work([
      `One source: L₁ = L_tot − 10·log₁₀(N₁) = ${fmt(L1)} − 10·log₁₀(${fmt(N1)}) = ${fmt(per, 2)} dB`,
      `Need L_tot + 10·log₁₀(N/N₁) ≤ ${fmt(Lmax)}  ⇒  N ≤ N₁·10^((L_max−L_tot)/10)`,
      `= ${fmt(N1)}·10^((${fmt(Lmax)}−${fmt(L1)})/10) = ${fmt(N1)}·10^(${fmt((Lmax - L1) / 10, 3)}) = ${fmt(Nexact, 3)}`,
      `Round down → <b>${N} sources</b> (combined level ${fmt(Ln, 2)} dB)`,
    ]));
}

/* ---------------- Subtract ---------------- */
function doSubtract() {
  const tot = Number($('sub-tot').value), bg = Number($('sub-bg').value);
  const diff = e10(tot) - e10(bg);
  if (diff <= 0) return show('sub-out',
    'Total must exceed the level being removed (the source cannot have negative energy).', 'err');
  const rem = 10 * lg(diff);
  show('sub-out',
    `Remaining level = <b>${fmt(rem)} dB</b>` +
    work([
      `L_rem = 10·log₁₀( 10^(L_tot/10) − 10^(L_bg/10) )`,
      `= 10·log₁₀( 10^(${fmt(tot)}/10) − 10^(${fmt(bg)}/10) )`,
      `= 10·log₁₀( ${sci(e10(tot))} − ${sci(e10(bg))} )`,
      `= 10·log₁₀( ${sci(diff)} )`,
      `= <b>${fmt(rem)} dB</b>`,
    ]));
}
function doOneOfN() {
  const tot = Number($('one-tot').value), N = Number($('one-N').value);
  if (!(N >= 1)) return show('one-out', 'N must be ≥ 1.', 'err');
  const one = tot - 10 * lg(N);
  show('one-out',
    `Each source = <b>${fmt(one)} dB</b>` +
    work([
      `L₁ = L_tot − 10·log₁₀(N)`,
      `= ${fmt(tot)} − 10·log₁₀(${N})`,
      `= ${fmt(tot)} − ${fmt(10 * lg(N))}`,
      `= <b>${fmt(one)} dB</b>`,
    ]));
}

/* ---------------- Distance / spreading ---------------- */
function doDistance() {
  let L1 = Number($('dist-L1').value);
  const r1 = Number($('dist-r1').value), r2 = Number($('dist-r2').value);
  if (!(r1 > 0) || !(r2 > 0)) return show('dist-out', 'Distances must be > 0.', 'err');
  // Optional: fold an extra source (e.g. background) into L₁ at r₁ before spreading.
  const extraRaw = $('dist-extra').value.trim();
  const steps = [];
  if (extraRaw.length) {
    const extra = Number(extraRaw);
    if (isNaN(extra)) return show('dist-out', 'Extra source level must be a number (or left blank).', 'err');
    const L1c = dBsum([L1, extra]);
    steps.push(`Combine at r₁: L₁ = 10·log₁₀(10^(${fmt(L1)}/10) + 10^(${fmt(extra)}/10)) = <b>${fmt(L1c, 2)} dB</b>`);
    L1 = L1c;
  }
  const ratio = lg(r2 / r1);
  const pt = L1 - 20 * ratio;   // point / spherical
  const ln = L1 - 10 * ratio;   // line / cylindrical
  steps.push(
    `log₁₀(r₂/r₁) = log₁₀(${fmt(r2)}/${fmt(r1)}) = ${fmt(ratio, 4)}`,
    `Point: L₂ = L₁ − 20·log₁₀(r₂/r₁) = ${fmt(L1)} − 20·(${fmt(ratio, 4)}) = ${fmt(L1)} − ${fmt(20 * ratio)} = <b>${fmt(pt)} dB</b>`,
    `Line:  L₂ = L₁ − 10·log₁₀(r₂/r₁) = ${fmt(L1)} − 10·(${fmt(ratio, 4)}) = ${fmt(L1)} − ${fmt(10 * ratio)} = <b>${fmt(ln)} dB</b>`,
  );
  show('dist-out',
    `<table class="bands">
       <tr><th>Source type</th><th>Spreading</th><th>L₂ at ${fmt(r2)} m</th></tr>
       <tr><td>Point (isolated vehicle)</td><td>−6 dB/doubling</td><td><b>${fmt(pt)} dB</b></td></tr>
       <tr><td>Line (continuous traffic)</td><td>−3 dB/doubling</td><td><b>${fmt(ln)} dB</b></td></tr>
     </table>` +
    work(steps));
}
function doInvDistance() {
  const L1 = Number($('invd-L1').value), L2 = Number($('invd-L2').value), dr = Number($('invd-dr').value);
  if (!(dr > 0)) return show('invd-out', 'Extra distance Δr must be > 0.', 'err');
  const dL = L1 - L2;
  if (!(dL > 0)) return show('invd-out', 'Near level L₁ must exceed far level L₂.', 'err');
  // Level falls by ΔL over the extra distance Δr; invert the spreading law for the near distance y.
  const Rp = 10 ** (dL / 20), Rl = 10 ** (dL / 10);   // r₂/r₁ for point / line spreading
  const yp = dr / (Rp - 1), yl = dr / (Rl - 1);
  show('invd-out',
    `<table class="bands">
       <tr><th>Source type</th><th>Spreading</th><th>Near distance y</th></tr>
       <tr><td>Point (e.g. rifle, single vehicle)</td><td>−6 dB/doubling</td><td><b>${fmt(yp, 3)} m</b></td></tr>
       <tr><td>Line (continuous traffic)</td><td>−3 dB/doubling</td><td><b>${fmt(yl, 3)} m</b></td></tr>
     </table>` +
    work([
      `ΔL = L₁ − L₂ = ${fmt(L1)} − ${fmt(L2)} = ${fmt(dL)} dB`,
      `Point: ΔL = 20·log₁₀((y+Δr)/y) ⇒ y = Δr/(10^(ΔL/20) − 1) = ${fmt(dr)}/(${sci(Rp, 5)} − 1) = <b>${fmt(yp, 3)} m</b>`,
      `Line:  ΔL = 10·log₁₀((y+Δr)/y) ⇒ y = Δr/(10^(ΔL/10) − 1) = ${fmt(dr)}/(${sci(Rl, 5)} − 1) = <b>${fmt(yl, 3)} m</b>`,
    ]));
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
     <span class="small">Linear (unweighted) total = ${fmt(lin, 1)} dB</span>` +
    work([
      `L_W = 10·log₁₀( Σ 10^((Lᵢ + Wᵢ)/10) )`,
      `= 10·log₁₀( ${rows.map(r => `10^(${fmt(r.Lw)}/10)`).join(' + ')} )`,
      `= 10·log₁₀( ${sci(rows.reduce((a, r) => a + e10(r.Lw), 0), 5)} )`,
      `= <b>${fmt(wtd, 1)} ${tag}</b>`,
    ]));
}

/* ---------------- Band Workbench ---------------- */
function buildBandTable() {
  let h = '<table class="bands"><tr><th>⅓-octave (Hz)</th><th>Band level (dB)</th></tr>';
  THIRD.forEach(f => {
    h += `<tr><td>${f >= 1000 ? f / 1000 + 'k' : f}</td>
      <td><input type="number" step="any" class="baLev" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('ba-table-wrap').innerHTML = h;
}
function doBandAnalysis() {
  const net = $('ba-net').value;
  const lev = {};
  document.querySelectorAll('.baLev').forEach(inp => { if (inp.value !== '') lev[Number(inp.dataset.f)] = Number(inp.value); });
  if (!Object.keys(lev).length) return show('ba-out', 'Enter at least one ⅓-octave band level.', 'err');
  // Group consecutive ⅓-octave triplets into octave bands (centre = middle third).
  const octs = [];
  for (let i = 0; i + 2 < THIRD.length; i += 3) {
    const trio = [THIRD[i], THIRD[i + 1], THIRD[i + 2]].filter(f => f in lev);
    if (!trio.length) continue;
    octs.push({ oc: THIRD[i + 1], spl: dBsum(trio.map(f => lev[f])), thirds: trio.map(f => ({ f, L: lev[f] })) });
  }
  const overall = dBsum(octs.map(o => o.spl));
  const wtd = dBsum(octs.map(o => o.spl + weightOffset(o.oc, net)));
  const tag = net === 'Z' ? 'dB' : `dB(${net})`;
  let t = `<table class="bands"><tr><th>Octave (Hz)</th><th>⅓-octaves</th><th>Octave SPL</th>`;
  if (net !== 'Z') t += `<th>+W</th><th>Weighted</th>`;
  t += `</tr>`;
  octs.forEach(o => {
    const w = weightOffset(o.oc, net);
    t += `<tr><td>${o.oc >= 1000 ? o.oc / 1000 + 'k' : o.oc}</td>
      <td>${o.thirds.map(x => fmt(x.L)).join(' + ')}</td>
      <td><b>${fmt(o.spl, 2)}</b></td>`;
    if (net !== 'Z') t += `<td>${w >= 0 ? '+' : ''}${fmt(w, 1)}</td><td>${fmt(o.spl + w, 2)}</td>`;
    t += `</tr>`;
  });
  t += `</table>`;
  show('ba-out',
    `<b>(a) Octave band SPLs</b>${t}
     <div class="big">(b) Overall SPL = <b>${fmt(overall, 2)} dB</b></div>
     <div class="big">(b) Overall ${net === 'Z' ? 'level' : net + '-weighted'} = <b>${fmt(wtd, 2)} ${tag}</b></div>` +
    work([
      `Each octave SPL = 10·log₁₀( Σ 10^(L_⅓/10) )  over its three ⅓-octaves`,
      `Overall SPL = 10·log₁₀( Σ 10^(L_oct/10) ) = <b>${fmt(overall, 2)} dB</b>`,
      `Overall ${tag} = 10·log₁₀( Σ 10^((L_oct + W_oct)/10) ) = <b>${fmt(wtd, 2)} ${tag}</b>`,
    ]));
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
  const sel = 10 * lg(energy);   // SEL (L_AE): total energy normalised to 1 s (energy is already in s·ratio)
  // Build working using the original time unit for readability.
  const uf = TIME_UNITS[def];
  const terms = rows.map(r => `${fmt(parseTime(r[1], def) / uf, 3)}·10^(${fmt(Number(r[0]))}/10)`);
  show('leq-out',
    `L<sub>eq</sub> = <b>${fmt(leq, 3)} dB</b> &nbsp;<span class="small">(Σt = ${fmtSeconds(sumT)}, T = ${fmtSeconds(T)})</span><br>
     SEL (L<sub>AE</sub>, energy over 1 s) = <b>${fmt(sel, 2)} dB</b>` +
    work([
      `L_eq = 10·log₁₀( (1/T)·Σ tᵢ·10^(Lᵢ/10) )   [times in ${def}]`,
      `= 10·log₁₀( (1/${fmt(T / uf, 3)})·( ${terms.join(' + ')} ) )`,
      `= 10·log₁₀( (1/${fmt(T / uf, 3)})·( ${sci(energy / uf, 5)} ) )`,
      `= 10·log₁₀( ${sci(energy / T, 5)} )`,
      `= <b>${fmt(leq, 3)} dB</b>`,
      `SEL = 10·log₁₀( Σ tᵢ·10^(Lᵢ/10) / 1 s ) = L_eq + 10·log₁₀(T/1s) = ${fmt(leq, 3)} + 10·log₁₀(${fmt(T, 3)}) = <b>${fmt(sel, 2)} dB</b>`,
    ]));
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
  const terms = rows.map(r => `${fmt(Number(r[2]))}·${fmt(parseTime(r[1], def))}·10^(${fmt(Number(r[0]))}/10)`);
  show('evt-out',
    `L<sub>eq,T</sub> = <b>${fmt(leq, 3)} dB</b> &nbsp;<span class="small">(T = ${fmtSeconds(T)})</span>` +
    work([
      `L_eq = 10·log₁₀( (1/T)·Σ Nᵢ·tᵢ·10^(Lᵢ/10) )   [seconds]`,
      `= 10·log₁₀( (1/${fmt(T)})·( ${terms.join(' + ')} ) )`,
      `= 10·log₁₀( (1/${fmt(T)})·( ${sci(energy, 5)} ) )`,
      `= 10·log₁₀( ${sci(energy / T, 5)} )`,
      `= <b>${fmt(leq, 3)} dB</b>`,
    ]));
}

/* ---- Time-varying level: exact L_eq integral + numeric percentile L_N ---- */
// Parse one segment line: "t1,t2,const,L" or "t1,t2,ramp,a,b,c".
function parseSegments(text) {
  const segs = [];
  for (const line of text.trim().split('\n')) {
    const p = line.split(',').map(s => s.trim()).filter(s => s.length);
    if (!p.length) continue;
    const t1 = Number(p[0]), t2 = Number(p[1]), type = (p[2] || '').toLowerCase();
    if (isNaN(t1) || isNaN(t2) || t2 <= t1) return { err: `Bad segment "${line}" — need t1 < t2.` };
    if (type === 'const') {
      const L = Number(p[3]);
      if (isNaN(L)) return { err: `Constant segment "${line}" needs a level L.` };
      segs.push({ t1, t2, type, L });
    } else if (type === 'ramp') {
      const a = Number(p[3]), b = Number(p[4]), c = Number(p[5]);
      if ([a, b, c].some(isNaN)) return { err: `Ramp segment "${line}" needs a, b, c (L = 10·log₁₀(a·t+b)+c).` };
      if (a * t1 + b <= 0 || a * t2 + b <= 0) return { err: `Ramp "${line}": a·t+b must stay > 0 over the segment.` };
      segs.push({ t1, t2, type, a, b, c });
    } else {
      return { err: `Segment "${line}": type must be "const" or "ramp".` };
    }
  }
  if (!segs.length) return { err: 'Enter at least one segment.' };
  return { segs };
}
function segLevel(s, t) { return s.type === 'const' ? s.L : 10 * lg(s.a * t + s.b) + s.c; }
// Closed-form energy integral ∫ 10^(L/10) dt over a segment.
function segEnergy(s) {
  if (s.type === 'const') return (s.t2 - s.t1) * 10 ** (s.L / 10);
  return 10 ** (s.c / 10) * (s.a * (s.t2 * s.t2 - s.t1 * s.t1) / 2 + s.b * (s.t2 - s.t1));
}
function prefillTimeVarying() {
  $('tv-list').value = '0, 1, ramp, 9, 1, 80\n1, 5, const, 80';
  $('tv-N').value = 10;
  $('tv-T').value = '';
}
function doTimeVarying() {
  $('tv-chart').innerHTML = '';
  const parsed = parseSegments($('tv-list').value);
  if (parsed.err) return show('tv-out', parsed.err, 'err');
  const segs = parsed.segs;
  const tStart = Math.min(...segs.map(s => s.t1)), tEnd = Math.max(...segs.map(s => s.t2));
  let T = Number($('tv-T').value);
  if (!(T > 0)) T = tEnd - tStart;

  const E = segs.reduce((a, s) => a + segEnergy(s), 0);
  const leq = 10 * lg(E / T);

  // Numeric percentile L_N over the covered span (midpoint sampling).
  const N = Number($('tv-N').value);
  let LN = NaN;
  if (N > 0 && N < 100) {
    const n = 500000, arr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = tStart + (i + 0.5) / n * (tEnd - tStart);
      const s = segs.find(s => t >= s.t1 && t <= s.t2) || segs[segs.length - 1];
      arr[i] = segLevel(s, t);
    }
    arr.sort();
    LN = arr[Math.floor((1 - N / 100) * (n - 1))];
  }

  const segDesc = segs.map(s => s.type === 'const'
    ? `[${fmt(s.t1)}–${fmt(s.t2)}] const ${fmt(s.L)} dB → ∫ = ${sci(segEnergy(s), 4)}`
    : `[${fmt(s.t1)}–${fmt(s.t2)}] ramp 10·log₁₀(${fmt(s.a)}t+${fmt(s.b)})+${fmt(s.c)} → ∫ = ${sci(segEnergy(s), 4)}`);

  show('tv-out',
    `L<sub>eq</sub> = <b>${fmt(leq, 2)} dB(A)</b>` +
    (isNaN(LN) ? '' : `<br>L<sub>${fmt(N)}%</sub> = <b>${fmt(LN, 2)} dB(A)</b>
       &nbsp;<span class="small">(level exceeded ${fmt(N)}% of the ${fmt(T)} period)</span>`) +
    work([
      `L_eq = 10·log₁₀( (1/T)·Σ ∫ 10^(L(t)/10) dt )`,
      ...segDesc,
      `Σ∫ = ${sci(E, 5)} · T = ${fmt(T)} · L_eq = 10·log₁₀(${sci(E / T, 5)}) = <b>${fmt(leq, 2)} dB(A)</b>`,
      ...(isNaN(LN) ? [] : [`L_${fmt(N)}%: highest level exceeded ${fmt(N)}% of the period = <b>${fmt(LN, 2)} dB(A)</b>`]),
    ]));

  $('tv-chart').innerHTML = svgPlotLevel(segs, tStart, tEnd, isNaN(LN) ? null : LN, N);
}
// "Nice" axis tick values between min and max (~n divisions).
function niceTicks(min, max, n) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / n, mag = 10 ** Math.floor(lg(raw)), norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}
// Inline SVG plot of L(t) vs time for the time-varying segments (theme-adaptive via currentColor).
function svgPlotLevel(segs, tStart, tEnd, LN, N) {
  const W = 560, H = 320, mL = 50, mR = 16, mT = 16, mB = 38;
  const pW = W - mL - mR, pH = H - mT - mB;
  // Sample each segment (constant → endpoints; ramp → smooth); boundary jumps draw as vertical drops.
  const pts = [];
  segs.forEach(s => {
    const steps = s.type === 'const' ? 1 : 48;
    for (let i = 0; i <= steps; i++) { const t = s.t1 + (s.t2 - s.t1) * i / steps; pts.push([t, segLevel(s, t)]); }
  });
  const vals = pts.map(p => p[1]);
  let dMin = Math.min(...vals), dMax = Math.max(...vals);
  if (LN != null) { dMin = Math.min(dMin, LN); dMax = Math.max(dMax, LN); }
  const pad = Math.max(1, (dMax - dMin) * 0.12);
  const yMin = Math.floor((dMin - pad) / 2) * 2, yMax = Math.ceil((dMax + pad) / 2) * 2;
  const tx = t => mL + (t - tStart) / (tEnd - tStart) * pW;
  const ty = L => mT + (yMax - L) / (yMax - yMin) * pH;
  const xt = niceTicks(tStart, tEnd, 6), yt = niceTicks(yMin, yMax, 7);

  const grid =
    yt.map(v => `<line x1="${mL}" y1="${ty(v).toFixed(1)}" x2="${mL + pW}" y2="${ty(v).toFixed(1)}" stroke="currentColor" stroke-opacity=".12"/>`).join('') +
    xt.map(v => `<line x1="${tx(v).toFixed(1)}" y1="${mT}" x2="${tx(v).toFixed(1)}" y2="${mT + pH}" stroke="currentColor" stroke-opacity=".12"/>`).join('');
  const axes =
    `<line x1="${mL}" y1="${mT}" x2="${mL}" y2="${mT + pH}" stroke="currentColor" stroke-opacity=".5"/>` +
    `<line x1="${mL}" y1="${mT + pH}" x2="${mL + pW}" y2="${mT + pH}" stroke="currentColor" stroke-opacity=".5"/>`;
  const yl = yt.map(v => `<text x="${mL - 7}" y="${(ty(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="currentColor" fill-opacity=".8">${fmt(v, 0)}</text>`).join('');
  const xl = xt.map(v => `<text x="${tx(v).toFixed(1)}" y="${mT + pH + 16}" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".8">${fmt(v, Number.isInteger(v) ? 0 : 2)}</text>`).join('');
  const poly = `<polyline points="${pts.map(p => `${tx(p[0]).toFixed(1)},${ty(p[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="#2dd4bf" stroke-width="2"/>`;
  const lnLine = LN == null ? '' :
    `<line x1="${mL}" y1="${ty(LN).toFixed(1)}" x2="${mL + pW}" y2="${ty(LN).toFixed(1)}" stroke="#f59e0b" stroke-width="1.3" stroke-dasharray="5 4"/>` +
    `<text x="${mL + pW - 4}" y="${(ty(LN) - 5).toFixed(1)}" text-anchor="end" font-size="11" fill="#f59e0b">L${fmt(N)}% = ${fmt(LN, 1)}</text>`;
  const titles =
    `<text x="${mL + pW / 2}" y="${H - 3}" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".8">Time</text>` +
    `<text transform="translate(12,${mT + pH / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".8">Level (dB)</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block;margin-top:12px">` +
    grid + axes + lnLine + poly + yl + xl + titles + `</svg>`;
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
  const leqT = 10 * lg(energy / sumT);         // equivalent level over the actual total time T
  const Tmax = Tc / 2 ** ((leqT - Lc) / q);    // permissible time at the actual exposure level L_Aeq,T
  const exceed = leq > Lc;
  const eterms = rows.map(r => `${fmt(parseTime(r[1], def) / 3600, 3)}·10^(${fmt(Number(r[0]))}/10)`);
  const dterms = rows.map(r => {
    const L = Number(r[0]), t = parseTime(r[1], def) / 3600, Ti = Tc / 2 ** ((L - Lc) / q);
    return `${fmt(t, 3)}/${fmt(Ti, 3)}`;
  });
  show('dose-out',
    `L<sub>Aeq,T</sub> (over total T = ${fmt(sumT)} h) = <b>${fmt(leqT, 3)} dB(A)</b><br>
     L<sub>Aeq,${fmt(Tc)}h</sub> = <b>${fmt(leq, 3)} dB(A)</b><br>
     Total exposure time = ${fmt(sumT)} h<br>
     Noise dose = <b>${fmt(dose * 100, 1)} %</b> &nbsp;(100 % = limit)<br>
     Exceeds ${fmt(Lc)} dB(A) limit? <b class="${exceed ? 'bad' : 'good'}">${exceed ? 'YES' : 'No'}</b><br>
     Max permissible time at L<sub>Aeq,T</sub> = <b>${fmt(Tmax, 3)} h</b> (= ${fmtHM(Tmax)})` +
    work([
      `L_Aeq,T = 10·log₁₀( (1/T)·Σ tᵢ·10^(Lᵢ/10) ),  T = Σtᵢ = ${fmt(sumT, 4)} h`,
      `= 10·log₁₀( (1/${fmt(sumT, 4)})·( ${eterms.join(' + ')} ) ) = <b>${fmt(leqT, 3)} dB(A)</b>`,
      `L_Aeq,${fmt(Tc)}h = 10·log₁₀( (1/T_c)·Σ tᵢ·10^(Lᵢ/10) ),  T_c = ${fmt(Tc)} h`,
      `= L_Aeq,T + 10·log₁₀(T/T_c) = ${fmt(leqT, 3)} + 10·log₁₀(${fmt(sumT, 4)}/${fmt(Tc)}) = <b>${fmt(leq, 3)} dB(A)</b>`,
      `Allowed time Tᵢ = T_c / 2^((Lᵢ−${fmt(Lc)})/${fmt(q)})`,
      `Dose = Σ tᵢ/Tᵢ = ${dterms.join(' + ')} = ${fmt(dose, 4)} = <b>${fmt(dose * 100, 1)} %</b>`,
      `T_max = T_c / 2^((L_Aeq,T−L_c)/q) = ${fmt(Tc)} / 2^((${fmt(leqT, 2)}−${fmt(Lc)})/${fmt(q)}) = <b>${fmt(Tmax, 3)} h</b> (= ${fmtHM(Tmax)})`,
    ]),
    exceed ? 'warn' : 'ok');
}

function doMaxTime() {
  const L = Number($('mpt-L').value), Lc = Number($('mpt-Lc').value),
        q = Number($('mpt-q').value), Tc = Number($('mpt-Tc').value);
  if (!(q > 0) || !(Tc > 0)) return show('mpt-out', 'q and Tc must be > 0.', 'err');
  const T = Tc / 2 ** ((L - Lc) / q);
  const exceed = L > Lc;
  show('mpt-out',
    `T = <b>${fmt(T, 3)} h</b> &nbsp;(= ${fmtHM(T)}) — level ${exceed ? 'exceeds' : 'is within'} the ${fmt(Lc)} dB(A) criterion.` +
    work([
      `T = T_c / 2^((L − L_c)/q)`,
      `= ${fmt(Tc)} / 2^((${fmt(L)} − ${fmt(Lc)})/${fmt(q)})`,
      `= ${fmt(Tc)} / 2^(${fmt((L - Lc) / q, 4)})`,
      `= ${fmt(Tc)} / ${fmt(2 ** ((L - Lc) / q), 4)}`,
      `= <b>${fmt(T, 4)} h</b>`,
    ]),
    exceed ? 'warn' : 'ok');
}
/* ---- Hearing protector: SLC₈₀ method — protected L_Aeq = L_Ceq − SLC₈₀ ---- */
function doProtector() {
  const slc = Number($('hp-slc').value);
  if (!isFinite(slc)) return show('hp-out', 'Enter a numeric SLC₈₀ rating.', 'err');
  let Lc; const steps = [];
  if (!blank('hp-Lc')) {
    Lc = Number($('hp-Lc').value);
    if (!isFinite(Lc)) return show('hp-out', 'L_Ceq must be numeric.', 'err');
  } else {
    const valid = parseRows($('hp-bands').value)
      .filter(r => r.length >= 2 && isFinite(r[0]) && isFinite(r[1]));
    if (!valid.length) return show('hp-out', 'Enter L_Ceq, or octave-band “freq, level” rows.', 'err');
    let sum = 0; const parts = [];
    valid.forEach(([f, L]) => {
      const cw = weightOffset(f, 'C');
      sum += 10 ** ((L + cw) / 10);
      parts.push(`${fmt(f, 0)}Hz ${fmt(L, 1)}+(${fmt(cw, 1)})=${fmt(L + cw, 1)}`);
    });
    Lc = 10 * lg(sum);
    $('hp-Lc').value = fmt(Lc, 2);
    steps.push(`Apply C-weighting per band: ${parts.join(' · ')}`);
    steps.push(`L_Ceq = 10·log₁₀( Σ 10^((Lᵢ+Cᵢ)/10) ) = <b>${fmt(Lc, 2)} dB(C)</b>`);
  }
  const prot = Lc - slc;
  steps.push(`L′_Aeq = L_Ceq − SLC₈₀ = ${fmt(Lc, 2)} − ${fmt(slc, 2)} = <b>${fmt(prot, 2)} dB(A)</b>`);
  show('hp-out',
    `Protected level L′<sub>Aeq</sub> = <b>${fmt(prot, 2)} dB(A)</b> ` +
    `<span class="small">(from L<sub>Ceq</sub> = ${fmt(Lc, 2)} dB(C) − SLC₈₀ ${fmt(slc, 1)} dB)</span>` +
    work(steps));
}

/* ---------------- Loudness ---------------- */
function doPh2S() {
  const p = Number($('ph2s').value);
  const s = 2 ** ((p - 40) / 10);
  show('ph2s-out',
    `Loudness = <b>${fmt(s, 3)} sones</b>` +
    (p < 40 ? '<br><span class="small">Note: formula assumes L<sub>L</sub> ≥ 40 phon.</span>' : '') +
    work([
      `S = 2^((L_L − 40)/10)`,
      `= 2^((${fmt(p)} − 40)/10)`,
      `= 2^(${fmt((p - 40) / 10, 3)})`,
      `= <b>${fmt(s, 3)} sones</b>`,
    ]));
}
function doS2Ph() {
  const s = Number($('s2ph').value);
  if (!(s > 0)) return show('s2ph-out', 'Sones must be > 0.', 'err');
  const p = 40 + 10 * Math.log2(s);
  show('s2ph-out', `Loudness level = <b>${fmt(p, 2)} phons</b>` +
    work([
      `L_L = 40 + 10·log₂(S)`,
      `= 40 + 10·log₂(${fmt(s)})`,
      `= 40 + ${fmt(10 * Math.log2(s), 3)}`,
      `= <b>${fmt(p, 2)} phons</b>`,
    ]));
}

/* ---------------- PSIL ---------------- */
function doPSIL() {
  const a = Number($('psil-500').value);
  const b = $('psil-1000').value === '' ? a : Number($('psil-1000').value);
  const c = $('psil-2000').value === '' ? a : Number($('psil-2000').value);
  const dist = Number($('psil-dist').value);
  if (!(dist > 0)) return show('psil-out', 'Distance must be > 0.', 'err');
  const psil = (a + b + c) / 3;
  // Required A-weighted voice level for satisfactory face-to-face communication
  // (Unit 5, Eq 5.6): VLA ≥ (4/3)·(SIL + 20·log₁₀ r) − 36.
  const dTerm = 20 * lg(dist);
  const vla = (4 / 3) * (psil + dTerm) - 36;
  const effort = voiceEffortForVL(vla);
  const possible = effort !== null;
  const verdict = possible
    ? `needs at least a <b>${effort.replace(/ \(.*/, '')}</b> voice`
    : `<b>communication not possible</b> (exceeds peak shouting, ${VOICE_MAX} dB(A) at 1 m)`;
  show('psil-out',
    `PSIL = <b>${fmt(psil, 2)} dB</b> · required VL<sub>A</sub> at ${fmt(dist)} m = <b>${fmt(vla, 2)} dB(A)</b><br>` +
    `Communication ${possible ? '<b>possible</b>' : '<b>NOT possible</b>'} — ${verdict}` +
    work([
      `PSIL = (L₅₀₀ + L₁₀₀₀ + L₂₀₀₀) / 3 = (${fmt(a)} + ${fmt(b)} + ${fmt(c)}) / 3 = <b>${fmt(psil, 2)} dB</b>`,
      `VL_A ≥ (4/3)·(SIL + 20·log₁₀ r) − 36            (Eq 5.6)`,
      `= (4/3)·(${fmt(psil, 2)} + 20·log₁₀(${fmt(dist)})) − 36`,
      `= (4/3)·(${fmt(psil, 2)} + ${fmt(dTerm, 2)}) − 36`,
      `= <b>${fmt(vla, 2)} dB(A)</b>` +
        (possible ? ` → within human range → use a ${effort} voice`
                  : ` → above ${VOICE_MAX} dB(A) (peak shouting) → not achievable`),
    ]));
}

/* ---------------- Stats / SEL ---------------- */
function doSEL() {
  const leq = Number($('sel-leq').value), T = Number($('sel-T').value);
  if (!(T > 0)) return show('sel-out', 'T must be > 0.', 'err');
  const sel = leq + 10 * lg(T);
  show('sel-out',
    `SEL = <b>${fmt(sel, 2)} dB</b>` +
    work([
      `SEL = L_eq + 10·log₁₀(T / 1 s)`,
      `= ${fmt(leq)} + 10·log₁₀(${fmt(T)})`,
      `= ${fmt(leq)} + ${fmt(10 * lg(T), 3)}`,
      `= <b>${fmt(sel, 2)} dB</b>`,
    ]));
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
    return show('lp-out', `L<sub>p</sub> = <b>${fmt(Lp, 2)} dB</b>` +
      work([
        `L_p = 20·log₁₀(p / p_ref)`,
        `= 20·log₁₀(${sci(p)} / 2×10⁻⁵)`,
        `= 20·log₁₀(${sci(p / P_REF)})`,
        `= <b>${fmt(Lp, 2)} dB</b>`,
      ]));
  }
  const Lp = Number($('lp-val').value), p = P_REF * 10 ** (Lp / 20);
  $('lp-p').value = p.toPrecision(4);
  show('lp-out', `p<sub>rms</sub> = <b>${p.toPrecision(4)} Pa</b>` +
    work([
      `p = p_ref · 10^(L_p/20)`,
      `= 2×10⁻⁵ · 10^(${fmt(Lp)}/20)`,
      `= 2×10⁻⁵ · ${sci(10 ** (Lp / 20))}`,
      `= <b>${p.toPrecision(4)} Pa</b>`,
    ]));
}
function doLw() {
  if (!blank('lw-L')) {
    const L = Number($('lw-L').value), W = W_REF * 10 ** (L / 10);
    $('lw-W').value = W.toPrecision(4);
    return show('lw-out', `W = <b>${W.toPrecision(4)} W</b>` +
      work([`W = W_ref · 10^(L_w/10) = 10⁻¹² · 10^(${fmt(L)}/10) = <b>${W.toPrecision(4)} W</b>`]));
  }
  const W = Number($('lw-W').value);
  if (!(W > 0)) return show('lw-out', 'Power must be > 0.', 'err');
  const L = 10 * lg(W / W_REF);
  $('lw-L').value = fmt(L, 2);
  show('lw-out', `L<sub>w</sub> = <b>${fmt(L, 2)} dB</b>` +
    work([
      `L_w = 10·log₁₀(W / W_ref)`,
      `= 10·log₁₀(${sci(W)} / 10⁻¹²)`,
      `= 10·log₁₀(${sci(W / W_REF)})`,
      `= <b>${fmt(L, 2)} dB</b>`,
    ]));
}
function doLI() {
  let I, steps = [];
  if (!blank('li-p')) {
    const p = Number($('li-p').value); I = p * p / RHO_C;
    steps.push(`I = p_rms² / ρc = ${sci(p)}² / ${RHO_C} = ${sci(I)} W/m²`);
  } else I = Number($('li-I').value);
  if (!(I > 0)) return show('li-out', 'Enter intensity or pressure.', 'err');
  const LI = 10 * lg(I / I_REF);
  steps.push(`L_I = 10·log₁₀(I / I_ref) = 10·log₁₀(${sci(I)} / 10⁻¹²) = <b>${fmt(LI, 2)} dB</b>`);
  show('li-out', `I = <b>${I.toPrecision(4)} W/m²</b> · L<sub>I</sub> = <b>${fmt(LI, 2)} dB</b>` + work(steps));
}
function doRadPower() {
  let I, steps = [];
  if (!blank('rp-P')) {
    const P = Number($('rp-P').value), p = P / Math.SQRT2; I = p * p / RHO_C;
    steps.push(`p_rms = P/√2 = ${fmt(P)}/1.4142 = ${p.toPrecision(4)} Pa`);
    steps.push(`I = p_rms²/ρc = ${p.toPrecision(4)}²/${RHO_C} = ${sci(I)} W/m²`);
  } else if (!blank('rp-I')) {
    I = Number($('rp-I').value);
  } else return show('rp-out', 'Enter an intensity or a peak pressure.', 'err');
  if (!(I > 0)) return show('rp-out', 'Intensity must be > 0.', 'err');
  const r = Number($('rp-r').value), Q = Number($('rp-Q').value);
  if (!(r > 0)) return show('rp-out', 'Distance r must be > 0.', 'err');
  const S = 4 * Math.PI * r * r / Q, W = I * S, Lw = 10 * lg(W / W_REF);
  const qName = { 1: 'sphere, S = 4πr²', 2: 'hemisphere, S = 2πr²', 4: 'S = πr²', 8: 'S = ½πr²' }[Q];
  steps.push(`Q = ${Q} (${qName})`);
  steps.push(`S = 4πr²/Q = 4π·${fmt(r)}²/${Q} = ${fmt(S, 4)} m²`);
  steps.push(`W = I·S = ${sci(I)}·${fmt(S, 4)} = <b>${W.toPrecision(4)} W</b>`);
  steps.push(`L_w = 10·log₁₀(W/10⁻¹²) = <b>${fmt(Lw, 2)} dB</b>`);
  show('rp-out', `W = <b>${W.toPrecision(4)} W</b> · L<sub>w</sub> = <b>${fmt(Lw, 2)} dB</b>` + work(steps));
}
function doRMS() {
  const P = Number($('rms-P').value), p = P / Math.SQRT2;
  show('rms-out', `p<sub>rms</sub> = <b>${p.toPrecision(4)} Pa</b>` +
    work([
      `p_rms = P / √2 = ${sci(P)} / 1.4142 = <b>${p.toPrecision(4)} Pa</b>`,
      `SPL = 20·log₁₀(p_rms/p_ref) = <b>${fmt(20 * lg(p / P_REF), 2)} dB</b>`,
    ]));
}
function doRMScombine() {
  const ps = $('rms-list').value.trim().split('\n').map(s => Number(s.trim())).filter(s => !isNaN(s));
  if (!ps.length) return show('rmsc-out', 'Enter at least one pressure.', 'err');
  const sumSq = ps.reduce((a, p) => a + p * p, 0), tot = Math.sqrt(sumSq);
  show('rmsc-out', `p<sub>tot</sub> = <b>${tot.toPrecision(4)} Pa</b> → SPL = <b>${fmt(20 * lg(tot / P_REF), 2)} dB</b>` +
    work([
      `p_tot = √( Σ pᵢ² )`,
      `= √( ${ps.map(p => `${sci(p)}²`).join(' + ')} )`,
      `= √( ${sci(sumSq)} )`,
      `= <b>${tot.toPrecision(4)} Pa</b>`,
    ]));
}
function doPSD() {
  const f1 = Number($('psd-f1').value), f2 = Number($('psd-f2').value);
  const s1 = Number($('psd-s1').value), s2 = Number($('psd-s2').value);
  if (!(f2 > f1)) return show('psd-out', 'Upper frequency must exceed lower frequency.', 'err');
  if (!(s1 >= 0) || !(s2 >= 0)) return show('psd-out', 'PSD values must be ≥ 0.', 'err');
  // Mean-square pressure is the area under the PSD; a linear PSD makes that a trapezoid.
  const bw = f2 - f1, ms = (s1 + s2) / 2 * bw, prms = Math.sqrt(ms), spl = 20 * lg(prms / P_REF);
  const flat = s1 === s2;
  show('psd-out',
    `Mean-square p² = <b>${sci(ms, 4)} Pa²</b> · p<sub>rms</sub> = <b>${prms.toPrecision(4)} Pa</b> · SPL = <b>${fmt(spl, 2)} dB</b>` +
    work([
      `p_rms² = ∫ S(f) df over [${sci(f1)}, ${sci(f2)}] Hz` + (flat ? ` (flat band)` : ` (trapezoid — linear PSD)`),
      `= ½(S₁ + S₂)(f₂ − f₁) = ½(${sci(s1)} + ${sci(s2)})(${sci(bw)})`,
      `= <b>${sci(ms, 4)} Pa²</b>`,
      `p_rms = √(${sci(ms, 4)}) = <b>${prms.toPrecision(4)} Pa</b>`,
      `SPL = 20·log₁₀(p_rms / 2×10⁻⁵) = <b>${fmt(spl, 2)} dB</b>`,
    ]));
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
  const R = Number($('sos-R').value), g = Number($('sos-g').value);
  const hasT = !blank('sos-T'), hasC = !blank('sos-c');
  if (hasT === hasC) return show('sos-out', 'Fill exactly one of Temperature / Speed c and leave the other blank.', 'err');
  if (hasT) {                                    // T → c
    const Tc = Number($('sos-T').value), T0 = Tc + 273.2, c = Math.sqrt(g * R * T0);
    $('sos-c').value = fmt(c, 2);
    show('sos-out',
      `T₀ = ${fmt(T0, 1)} K<br>c = √(${g}·${R}·${fmt(T0, 1)}) = <b>${fmt(c, 2)} m/s</b>` +
      work([
        `c = √(γ·R·T₀) = √(${g}·${R}·${fmt(T0, 1)}) = <b>${fmt(c, 2)} m/s</b>`,
        `Air shortcut 20.06·√T₀ = ${fmt(20.06 * Math.sqrt(T0), 2)} m/s`,
      ]));
  } else {                                       // c → T
    const c = Number($('sos-c').value), T0 = c * c / (g * R), Tc = T0 - 273.2;
    $('sos-T').value = fmt(Tc, 1);
    show('sos-out',
      `T₀ = c²/(γ·R) = ${fmt(c, 2)}²/(${g}·${R}) = ${fmt(T0, 1)} K<br>T = <b>${fmt(Tc, 1)} °C</b>` +
      work([
        `T₀ = c²/(γ·R) = ${fmt(c, 2)}²/(${g}·${R}) = ${fmt(T0, 1)} K`,
        `T = T₀ − 273.2 = <b>${fmt(Tc, 1)} °C</b>`,
      ]));
  }
}
function doTOF() {
  const d = Number($('sos-d').value), t = Number($('sos-t').value) / 1000;   // ms → s
  if (!(d > 0) || !(t > 0)) return show('sos-out', 'Enter positive distance and travel time.', 'err');
  const c = d / t;
  $('sos-c').value = fmt(c, 2); $('sos-T').value = '';
  const R = Number($('sos-R').value), g = Number($('sos-g').value);
  const T0 = c * c / (g * R), Tc = T0 - 273.2;
  $('sos-T').value = fmt(Tc, 1);
  show('sos-out',
    `c = d/t = ${fmt(d, 2)}/${(t).toPrecision(3)} = <b>${fmt(c, 2)} m/s</b><br>T = <b>${fmt(Tc, 1)} °C</b>` +
    work([
      `c = d/t = ${fmt(d, 2)} / ${(t).toPrecision(3)} s = <b>${fmt(c, 2)} m/s</b>`,
      `T₀ = c²/(γ·R) = ${fmt(c, 2)}²/(${g}·${R}) = ${fmt(T0, 1)} K`,
      `T = T₀ − 273.2 = <b>${fmt(Tc, 1)} °C</b>`,
    ]));
}
function pvPreset(medium) {
  $('pv-rc').value = medium === 'water' ? 1.5e6 : 415;
  $('pv-ref').value = medium === 'water' ? '1e-6' : '2e-5';
}
function pvThreshold() {                          // just-audible: p_rms = 20 µPa
  $('pv-P').value = (Math.SQRT2 * 2e-5).toExponential(3);   // peak amplitude
  $('pv-u').value = ''; $('pv-rc').value = 415; $('pv-ref').value = '2e-5';
  if (blank('pv-f')) $('pv-f').value = 4000;
  doParticle();
}
function doParticle() {
  const f = Number($('pv-f').value), rc = Number($('pv-rc').value), pref = Number($('pv-ref').value);
  const hasP = !blank('pv-P'), hasU = !blank('pv-u');
  if (hasP === hasU) return show('pv-out', 'Fill exactly one of Pressure P / RMS velocity u and leave the other blank.', 'err');
  if (!(f > 0) || !(rc > 0)) return show('pv-out', 'Frequency and ρc must be > 0.', 'err');
  let P;                                          // peak pressure amplitude
  if (hasP) { P = Number($('pv-P').value); $('pv-u').value = ''; }
  else { P = Math.SQRT2 * rc * Number($('pv-u').value); $('pv-P').value = P.toExponential(3); }
  const w = 2 * Math.PI * f;
  const uHat = P / rc, uRms = uHat / Math.SQRT2, xi = uHat / w;
  const I = P * P / (2 * rc), pRms = P / Math.SQRT2, spl = 20 * lg(pRms / pref);
  show('pv-out',
    `Particle velocity amplitude û = <b>${uHat.toExponential(3)} m/s</b><br>
     RMS particle velocity u<sub>rms</sub> = <b>${uRms.toExponential(3)} m/s</b><br>
     Displacement amplitude ξ = <b>${xi.toExponential(3)} m</b>${xi < 1e-9 ? ` (${fmt(xi * 1e12, 3)} pm)` : ''}<br>
     Intensity I = <b>${I.toExponential(3)} W/m²</b><br>
     p<sub>rms</sub> = <b>${pRms.toExponential(3)} Pa</b><br>
     SPL = 20·log(${sci(pRms)}/${sci(pref)}) = <b>${fmt(spl, 2)} dB</b> (re ${sci(pref)} Pa)`);
}
function doBandEdges() {
  const fc = Number($('be-fc').value), type = $('be-type').value;
  if (!(fc > 0)) return show('be-out', 'Centre frequency must be > 0.', 'err');
  const e = bandEdges(fc, type);
  const bw = e.upper - e.lower, pct = bw / fc * 100;
  const kStr = type === 'third' ? '2^(1/6)' : '√2';
  const name = type === 'third' ? 'one-third octave' : 'octave';
  const ref = type === 'third' ? '23.1' : '70.7';
  show('be-out',
    `Lower = <b>${fmt(e.lower, 1)} Hz</b> · Upper = <b>${fmt(e.upper, 1)} Hz</b><br>
     Bandwidth = <b>${fmt(bw, 1)} Hz</b> · Percentage bandwidth = <b>${fmt(pct, 1)} %</b>` +
    work([
      `f_lower = f_c / ${kStr},  f_upper = f_c · ${kStr}`,
      `BW = f_upper − f_lower = ${fmt(e.upper, 1)} − ${fmt(e.lower, 1)} = ${fmt(bw, 1)} Hz`,
      `%BW = BW / f_c × 100 = ${fmt(bw, 1)} / ${fmt(fc, 1)} × 100 = <b>${fmt(pct, 1)} %</b>`,
      `(= ${kStr} − 1/${kStr}, constant for any f_c → ${name} ≈ ${ref} %)`,
    ]));
}
function doPipe() {
  const L = Number($('pipe-L').value), c = Number($('pipe-c').value), end = $('pipe-end').value;
  if (!(L > 0) || !(c > 0)) return show('pipe-out', 'Length and speed must be > 0.', 'err');
  const oc = end === 'oc';                        // open–closed uses odd harmonics only
  const name = oc ? 'Open–closed' : end === 'cc' ? 'Closed–closed' : 'Open–open';
  const formula = oc ? 'fₙ = (2n−1)·c/(4L)' : 'fₙ = n·c/(2L)';
  let s = '';
  const steps = [`${name} pipe: ${formula},  ω = 2π·f  (L = ${fmt(L, 3)} m, c = ${fmt(c, 1)} m/s)`];
  for (let n = 1; n <= 3; n++) {
    const f = oc ? (2 * n - 1) * c / (4 * L) : n * c / (2 * L);
    const w = 2 * Math.PI * f;
    s += `n=${n}: f = <b>${fmt(f, 2)} Hz</b> · ω = <b>${fmt(w, 1)} rad/s</b><br>`;
    const sub = oc ? `(2×${n}−1)×${fmt(c, 1)} / (4×${fmt(L, 3)})`
      : `${n}×${fmt(c, 1)} / (2×${fmt(L, 3)})`;
    steps.push(
      `f<sub>${n}</sub> = ${sub} = <b>${fmt(f, 2)} Hz</b> → ω = 2π×${fmt(f, 2)} = <b>${fmt(w, 1)} rad/s</b>`);
  }
  show('pipe-out', s + work(steps));
}

/* ---------------- Lw → Lp at distance ---------------- */
function prefillQ2() {
  $('lwlp-Lw').value = ''; $('lwlp-Lp').value = 88; $('lwlp-r').value = 1.7; $('lwlp-type').value = 'pf';
}
function prefillQ3() {
  $('lwlp-Lw').value = ''; $('lwlp-Lp').value = 69; $('lwlp-r').value = 2; $('lwlp-type').value = 'pc';
}
function doLwLp() {
  const hasLw = $('lwlp-Lw').value !== '', hasLp = $('lwlp-Lp').value !== '';
  const Lw = Number($('lwlp-Lw').value), Lp = Number($('lwlp-Lp').value);
  const r = Number($('lwlp-r').value), t = $('lwlp-type').value;
  if (!(r > 0)) return show('lwlp-out', 'Distance must be > 0.', 'err');
  if (hasLw === hasLp) return show('lwlp-out', 'Fill exactly one of L_w / L_p and leave the other blank.', 'err');
  // Point sources: k = 10·log10(4π/Q) for Q = 1/2/4/8 (free / 1 / 2 / 3 bounding surfaces).
  const kp = Q => 10 * lg(4 * Math.PI / Q);
  const map = { pf: [20, kp(1)], pg: [20, kp(2)], pe: [20, kp(4)], pc: [20, kp(8)], lf: [10, 8], lg: [10, 5] };
  const [coef, k] = map[t];
  const ks = fmt(k, 2);

  if (hasLw) {                                   // forward: L_w → L_p
    const out = Lw - coef * lg(r) - k;
    $('lwlp-Lp').value = fmt(out, 2);
    return show('lwlp-out',
      `L<sub>p</sub> = <b>${fmt(out, 2)} dB</b>` +
      work([
        `L_p = L_w − ${coef}·log₁₀(r) − ${ks}`,
        `= ${fmt(Lw)} − ${coef}·log₁₀(${fmt(r)}) − ${ks}`,
        `= ${fmt(Lw)} − ${fmt(coef * lg(r), 3)} − ${ks}`,
        `= <b>${fmt(out, 2)} dB</b>`,
      ]));
  }
  const out = Lp + coef * lg(r) + k;             // reverse: L_p → L_w
  $('lwlp-Lw').value = fmt(out, 2);
  show('lwlp-out',
    `L<sub>w</sub> = <b>${fmt(out, 2)} dB</b>` +
    work([
      `L_w = L_p + ${coef}·log₁₀(r) + ${ks}`,
      `= ${fmt(Lp)} + ${coef}·log₁₀(${fmt(r)}) + ${ks}`,
      `= ${fmt(Lp)} + ${fmt(coef * lg(r), 3)} + ${ks}`,
      `= <b>${fmt(out, 2)} dB</b>`,
    ]));
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
    `T₆₀ = <b>${fmt(T, 3)} s</b> · ᾱ = <b>${fmt(a, 4)}</b> · A = ᾱ·S = <b>${fmt(a * S, 2)} m²</b>` +
    work([
      `T₆₀ = 0.161·V / (ᾱ·S)`,
      `= 0.161·${fmt(V)} / (${fmt(a, 4)}·${fmt(S)})`,
      `= ${fmt(0.161 * V, 3)} / ${fmt(a * S, 3)}`,
      `= <b>${fmt(T, 3)} s</b>`,
    ]));
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
    `L<sub>p</sub> = <b>${fmt(Lp, 2)} dB</b> &nbsp;<span class="small">(${dom})</span>` +
    work([
      `L_p = L_w + 10·log₁₀( Q/(4πr²) + 4/R )`,
      `= ${fmt(Lw)} + 10·log₁₀( ${fmt(Q)}/(4π·${fmt(r)}²) + 4/${fmt(R)} )`,
      `= ${fmt(Lw)} + 10·log₁₀( ${sci(direct)} + ${sci(rev)} )`,
      `= ${fmt(Lw)} + 10·log₁₀( ${sci(direct + rev)} )`,
      `= ${fmt(Lw)} + (${fmt(10 * lg(direct + rev), 2)})`,
      `= <b>${fmt(Lp, 2)} dB</b>`,
    ]));
}

/* ---- Reverberant level change when absorption is added / removed (panels) ---- */
function buildReverbTable() {
  let h = '<table class="bands"><tr><th>Freq (Hz)</th><th>L<sub>p</sub> (dB)</th><th>T₆₀ (s)</th><th>α</th></tr>';
  OCT_FULL.forEach(f => {
    const fl = f >= 1000 ? f / 1000 + 'k' : f;
    h += `<tr><td>${fl}</td>
      <td><input type="number" step="any" class="rvLp" data-f="${f}" placeholder="—"></td>
      <td><input type="number" step="any" class="rvT"  data-f="${f}" placeholder="—"></td>
      <td><input type="number" step="any" class="rvAl" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('rv-table-wrap').innerHTML = h;
}
function prefillPanels() {
  buildReverbTable();
  $('rv-mode').value = PANEL_EXAMPLE.mode;
  $('rv-net').value = PANEL_EXAMPLE.net;
  $('rv-V').value = PANEL_EXAMPLE.V;
  $('rv-Sabs').value = PANEL_EXAMPLE.Sabs;
  const ex = PANEL_EXAMPLE.bands;
  document.querySelectorAll('.rvLp').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.Lp; });
  document.querySelectorAll('.rvT').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.T; });
  document.querySelectorAll('.rvAl').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.al; });
}
function doReverbChange() {
  const net = $('rv-net').value, mode = $('rv-mode').value;
  const V = Number($('rv-V').value), Sabs = Number($('rv-Sabs').value);
  if (!(V > 0)) return show('rv-out', 'Room volume V must be > 0.', 'err');
  if (!(Sabs > 0)) return show('rv-out', 'Absorber area S_abs must be > 0.', 'err');

  const grab = cls => { const o = {}; document.querySelectorAll('.' + cls).forEach(i => { if (i.value !== '') o[+i.dataset.f] = Number(i.value); }); return o; };
  const Lpv = grab('rvLp'), Tv = grab('rvT'), Alv = grab('rvAl');
  const freqs = Object.keys(Lpv).map(Number).sort((a, b) => a - b);
  if (!freqs.length) return show('rv-out', 'Enter at least one band L_p.', 'err');

  const rows = [];
  for (const f of freqs) {
    if (Tv[f] === undefined || Alv[f] === undefined)
      return show('rv-out', `Band ${f >= 1000 ? f / 1000 + 'k' : f} Hz needs T₆₀ and α as well as L_p.`, 'err');
    if (!(Tv[f] > 0)) return show('rv-out', `T₆₀ at ${f} Hz must be > 0.`, 'err');
    const A1 = 0.161 * V / Tv[f];
    const Aabs = Sabs * Alv[f];
    const A2 = mode === 'remove' ? A1 - Aabs : A1 + Aabs;
    if (!(A2 > 0)) return show('rv-out',
      `Band ${f} Hz: the absorber accounts for more absorption than the room has (A₂ ≤ 0) — check S_abs / α.`, 'err');
    const dL = 10 * lg(A1 / A2);
    rows.push({ f, Lp: Lpv[f], T: Tv[f], al: Alv[f], A1, Aabs, A2, dL, newLp: Lpv[f] + dL });
  }

  const tag = net === 'Z' ? 'dB' : `dB(${net})`;
  const before = dBsum(rows.map(r => r.Lp + weightOffset(r.f, net)));
  const after  = dBsum(rows.map(r => r.newLp + weightOffset(r.f, net)));
  const change = after - before;

  let t = `<table class="bands"><tr><th>Freq</th><th>L<sub>p</sub></th><th>T₆₀</th>` +
    `<th>A₁</th><th>A<sub>abs</sub></th><th>A₂</th><th>ΔL<sub>p</sub></th><th>new L<sub>p</sub></th></tr>`;
  rows.forEach(r => {
    t += `<tr><td>${r.f >= 1000 ? r.f / 1000 + 'k' : r.f}</td><td>${fmt(r.Lp)}</td><td>${fmt(r.T)}</td>
      <td>${fmt(r.A1, 2)}</td><td>${fmt(r.Aabs, 2)}</td><td>${fmt(r.A2, 2)}</td>
      <td>${r.dL >= 0 ? '+' : ''}${fmt(r.dL, 2)}</td><td><b>${fmt(r.newLp, 2)}</b></td></tr>`;
  });
  t += `</table>`;

  const verb = mode === 'remove' ? 'removal' : 'addition';
  show('rv-out',
    `${t}
     <div class="big">(a) Current = <b>${fmt(before, 1)} ${tag}</b></div>
     <div class="big">(b) After ${verb} = <b>${fmt(after, 1)} ${tag}</b></div>
     <div class="big">(c) Change = <b>${change >= 0 ? '+' : ''}${fmt(change, 1)} ${tag}</b></div>` +
    work([
      `Per band: A₁ = 0.161·V/T₆₀ · A_abs = S_abs·α · A₂ = A₁ ${mode === 'remove' ? '−' : '+'} A_abs`,
      `ΔL_p = 10·log₁₀(A₁/A₂) · new L_p = L_p + ΔL_p`,
      `(a) 10·log₁₀( Σ 10^((L_p + W)/10) ) = <b>${fmt(before, 1)} ${tag}</b>`,
      `(b) 10·log₁₀( Σ 10^((new L_p + W)/10) ) = <b>${fmt(after, 1)} ${tag}</b>`,
      `(c) change = (b) − (a) = <b>${change >= 0 ? '+' : ''}${fmt(change, 1)} ${tag}</b>`,
    ]));
}

/* ---- Reverberation test room: T₆₀ → absorption, source W → reverberant ⟨p²⟩ ---- */
function buildTestRoomTable() {
  let h = '<table class="bands"><tr><th>Freq (Hz)</th><th>T₆₀ empty (s)</th>' +
    '<th>T₆₀ furniture (s)</th><th>Source L<sub>w</sub> (dB)</th></tr>';
  PLANT_BANDS.forEach(f => {
    const fl = f >= 1000 ? f / 1000 + 'k' : f;
    h += `<tr><td>${fl}</td>
      <td><input type="number" step="any" class="trTe" data-f="${f}" placeholder="—"></td>
      <td><input type="number" step="any" class="trTf" data-f="${f}" placeholder="—"></td>
      <td><input type="number" step="any" class="trLw" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('tr-table-wrap').innerHTML = h;
}
function prefillTestRoom() {
  buildTestRoomTable();
  $('tr-V').value = TEST_ROOM_EXAMPLE.V; $('tr-S').value = TEST_ROOM_EXAMPLE.S;
  $('tr-rc').value = TEST_ROOM_EXAMPLE.rc; $('tr-net').value = TEST_ROOM_EXAMPLE.net;
  const ex = TEST_ROOM_EXAMPLE.bands;
  document.querySelectorAll('.trTe').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.te; });
  document.querySelectorAll('.trTf').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.tf; });
  document.querySelectorAll('.trLw').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.lw; });
}
function doTestRoom() {
  const V = Number($('tr-V').value), S = Number($('tr-S').value), rc = Number($('tr-rc').value);
  if (!(V > 0)) return show('tr-out', 'Room volume V must be > 0.', 'err');
  if (!(S > 0)) return show('tr-out', 'Surface area S must be > 0.', 'err');
  if (!(rc > 0)) return show('tr-out', 'ρc must be > 0.', 'err');
  const net = $('tr-net').value, tag = net === 'Z' ? 'dB' : `dB(${net})`, pref2 = P_REF * P_REF;

  const teIn = {}, tfIn = {}, lwIn = {};
  document.querySelectorAll('.trTe').forEach(i => { if (i.value !== '') teIn[+i.dataset.f] = Number(i.value); });
  document.querySelectorAll('.trTf').forEach(i => { if (i.value !== '') tfIn[+i.dataset.f] = Number(i.value); });
  document.querySelectorAll('.trLw').forEach(i => { if (i.value !== '') lwIn[+i.dataset.f] = Number(i.value); });
  const freqs = Object.keys(lwIn).map(Number).sort((a, b) => a - b);
  if (!freqs.length) return show('tr-out', 'Enter at least one band with a source L_w.', 'err');

  const rows = []; let anyFurn = false;
  for (const f of freqs) {
    if (teIn[f] === undefined || !(teIn[f] > 0)) return show('tr-out', `Band ${f} Hz: needs the empty-room T₆₀ (> 0).`, 'err');
    const Ae = 0.161 * V / teIn[f], ae = Ae / S, Re = Ae / (1 - ae);
    const W = W_REF * 10 ** (lwIn[f] / 10);
    const p2e = 4 * rc * W / Re, Lpe = 10 * lg(p2e / pref2), dBAe = Lpe + weightOffset(f, net);
    const row = { f, Ae, ae, W, p2e, dBAe, Af: null, af: null, p2f: null, dBAf: null };
    if (tfIn[f] !== undefined && tfIn[f] > 0) {
      const Af = 0.161 * V / tfIn[f], af = Af / S, Rf = Af / (1 - af);
      const p2f = 4 * rc * W / Rf, Lpf = 10 * lg(p2f / pref2);
      Object.assign(row, { Af, af, p2f, dBAf: Lpf + weightOffset(f, net) }); anyFurn = true;
    }
    rows.push(row);
  }

  const emptyOverall = dBsum(rows.map(r => r.dBAe));
  const furnRows = rows.filter(r => r.dBAf != null);
  const furnOverall = anyFurn ? dBsum(furnRows.map(r => r.dBAf)) : null;
  const emptySameBands = anyFurn ? dBsum(furnRows.map(r => r.dBAe)) : null;
  const reduction = anyFurn ? emptySameBands - furnOverall : null;

  const cell = (v, d = 2) => v == null ? '—' : fmt(v, d);
  let t = `<table class="bands"><tr><th>Freq</th><th>A empty</th>${anyFurn ? '<th>A furn</th>' : ''}` +
    `<th>ᾱ empty</th>${anyFurn ? '<th>ᾱ furn</th>' : ''}<th>W (W)</th>` +
    `<th>⟨p²⟩ empty (Pa²)</th>${anyFurn ? '<th>⟨p²⟩ furn (Pa²)</th>' : ''}` +
    `<th>${tag} empty</th>${anyFurn ? `<th>${tag} furn</th>` : ''}</tr>`;
  rows.forEach(r => {
    t += `<tr><td>${r.f >= 1000 ? r.f / 1000 + 'k' : r.f}</td><td>${fmt(r.Ae, 3)}</td>` +
      (anyFurn ? `<td>${cell(r.Af, 3)}</td>` : '') +
      `<td>${fmt(r.ae, 4)}</td>` + (anyFurn ? `<td>${cell(r.af, 4)}</td>` : '') +
      `<td>${r.W.toPrecision(4)}</td><td>${fmt(r.p2e, 4)}</td>` +
      (anyFurn ? `<td>${cell(r.p2f, 4)}</td>` : '') +
      `<td>${fmt(r.dBAe, 2)}</td>` + (anyFurn ? `<td><b>${cell(r.dBAf)}</b></td>` : '') + `</tr>`;
  });
  t += `</table>`;

  let summary = `<div class="big">Overall empty room = <b>${fmt(emptyOverall, 1)} ${tag}</b></div>`;
  if (anyFurn) summary += `<div class="big">Overall with furniture = <b>${fmt(furnOverall, 1)} ${tag}</b></div>
     <div class="big">Reduction = <b>${fmt(reduction, 1)} ${tag}</b></div>`;

  show('tr-out', t + summary + work([
    `Per band: A = 0.161·V/T₆₀ · ᾱ = A/S · R = A/(1−ᾱ)`,
    `W = 10⁻¹²·10^(L_w/10) · ⟨p²⟩ = 4·ρc·W/R   (ρc = ${fmt(rc)} rayls)`,
    `L_p = 10·log₁₀(⟨p²⟩ / p_ref²) · band ${tag} = L_p + weighting`,
    `Overall ${tag} = 10·log₁₀( Σ 10^(band/10) )` +
      (anyFurn ? ` → empty ${fmt(emptyOverall, 1)}, furniture ${fmt(furnOverall, 1)}, Δ = <b>${fmt(reduction, 1)} ${tag}</b>` : ''),
  ]));
}

/* ---- Plant room: combine machine powers → reverberant SPL → surface treatment ---- */
const PLANT_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
function buildPlantTable() {
  let h = '<table class="bands"><tr><th>Freq (Hz)</th><th>Motor L<sub>w</sub> list (dB)</th>' +
    '<th>α base</th><th>α coated</th></tr>';
  PLANT_BANDS.forEach(f => {
    const fl = f >= 1000 ? f / 1000 + 'k' : f;
    h += `<tr><td>${fl}</td>
      <td><input type="text" class="plLw" data-f="${f}" placeholder="—" style="min-width:120px"></td>
      <td><input type="number" step="any" class="plAb" data-f="${f}" placeholder="—"></td>
      <td><input type="number" step="any" class="plAc" data-f="${f}" placeholder="—"></td></tr>`;
  });
  h += '</table>';
  $('pl-table-wrap').innerHTML = h;
}
function prefillPlant() {
  buildPlantTable();
  $('pl-L').value = PLANT_EXAMPLE.L; $('pl-W').value = PLANT_EXAMPLE.W; $('pl-H').value = PLANT_EXAMPLE.H;
  $('pl-Scoat').value = PLANT_EXAMPLE.Scoat; $('pl-net').value = PLANT_EXAMPLE.net;
  const ex = PLANT_EXAMPLE.bands;
  document.querySelectorAll('.plLw').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.lw; });
  document.querySelectorAll('.plAb').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.ab; });
  document.querySelectorAll('.plAc').forEach(i => { const b = ex[+i.dataset.f]; if (b) i.value = b.ac; });
}
function doPlantRoom() {
  const L = Number($('pl-L').value), W = Number($('pl-W').value), H = Number($('pl-H').value);
  if (!(L > 0 && W > 0 && H > 0)) return show('pl-out', 'Room L, W and H must be > 0.', 'err');
  const V = L * W * H, S = 2 * (L * W + L * H + W * H);
  const Scoat = $('pl-Scoat').value === '' ? 0 : Number($('pl-Scoat').value);
  if (Scoat < 0 || Scoat > S) return show('pl-out', `Coated area must be between 0 and the total surface area (${fmt(S, 1)} m²).`, 'err');
  const net = $('pl-net').value, tag = net === 'Z' ? 'dB' : `dB(${net})`;

  const lwIn = {}, abIn = {}, acIn = {};
  document.querySelectorAll('.plLw').forEach(i => { if (i.value.trim() !== '') lwIn[+i.dataset.f] = i.value; });
  document.querySelectorAll('.plAb').forEach(i => { if (i.value !== '') abIn[+i.dataset.f] = Number(i.value); });
  document.querySelectorAll('.plAc').forEach(i => { if (i.value !== '') acIn[+i.dataset.f] = Number(i.value); });
  const freqs = Object.keys(lwIn).map(Number).sort((a, b) => a - b);
  if (!freqs.length) return show('pl-out', 'Enter at least one band with motor L_w values.', 'err');

  const rows = []; let anyCoat = false;
  for (const f of freqs) {
    const list = lwIn[f].split(/[\s,]+/).map(Number).filter(x => !isNaN(x));
    if (!list.length) return show('pl-out', `Band ${f} Hz: enter one or more L_w values.`, 'err');
    const ab = abIn[f];
    if (!(ab > 0 && ab < 1)) return show('pl-out', `Band ${f} Hz: α base must be between 0 and 1.`, 'err');
    const Lw = dBsum(list), Wt = W_REF * 10 ** (Lw / 10);
    const R1 = S * ab / (1 - ab), Lp1 = Lw + 10 * lg(4 / R1);
    let Lp2 = Lp1, coated = false;
    if (Scoat > 0 && acIn[f] != null) {
      const ac = acIn[f];
      if (!(ac > 0 && ac < 1)) return show('pl-out', `Band ${f} Hz: α coated must be between 0 and 1.`, 'err');
      const A2 = Scoat * ac + (S - Scoat) * ab, abar2 = A2 / S, R2 = A2 / (1 - abar2);
      Lp2 = Lw + 10 * lg(4 / R2); coated = true; anyCoat = true;
    }
    rows.push({ f, Lw, Wt, Lp1, Lp2, wo: weightOffset(f, net), coated });
  }

  const overallLw = dBsum(rows.map(r => r.Lw));
  const before = dBsum(rows.map(r => r.Lp1 + r.wo));
  const after = dBsum(rows.map(r => r.Lp2 + r.wo));
  const reduction = before - after;

  let t = `<table class="bands"><tr><th>Freq</th><th>L<sub>w</sub> (dB)</th><th>W (W)</th>` +
    `<th>L<sub>p</sub> rev${anyCoat ? ' (before)' : ''}</th>${anyCoat ? '<th>L<sub>p</sub> rev (after)</th>' : ''}</tr>`;
  rows.forEach(r => {
    t += `<tr><td>${r.f >= 1000 ? r.f / 1000 + 'k' : r.f}</td><td>${fmt(r.Lw, 2)}</td>
      <td>${r.Wt.toPrecision(4)}</td><td>${fmt(r.Lp1, 2)}</td>` +
      (anyCoat ? `<td><b>${fmt(r.Lp2, 2)}</b></td>` : '') + `</tr>`;
  });
  t += `</table>`;

  let summary = `<div class="big">Overall L<sub>w</sub> = <b>${fmt(overallLw, 2)} dB</b></div>
     <div class="big">Total ${anyCoat ? 'before treatment' : ''} = <b>${fmt(before, 1)} ${tag}</b></div>`;
  if (anyCoat) summary += `<div class="big">Total after treatment = <b>${fmt(after, 1)} ${tag}</b></div>
     <div class="big">Reduction = <b>${fmt(reduction, 1)} ${tag}</b></div>`;

  show('pl-out', t + summary + work([
    `Per band: L_w = 10·log₁₀(Σ 10^(L_wi/10)) · W = 10⁻¹²·10^(L_w/10)`,
    `Room: V = ${fmt(V, 1)} m³ · S_total = 2(LW+LH+WH) = ${fmt(S, 1)} m²`,
    `Reverberant field: L_p = L_w + 10·log₁₀(4/R) · R = S·ᾱ/(1−ᾱ)`,
    anyCoat ? `Coated: ᾱ = [S_coat·α_coat + (S−S_coat)·α_base]/S · S_coat = ${fmt(Scoat, 1)} m²` : `(no coating — enter S_coat and α coated to model a treatment)`,
    `Overall L_w = 10·log₁₀( Σ 10^(L_w,band/10) ) = <b>${fmt(overallLw, 2)} dB</b>`,
    `Total = 10·log₁₀( Σ 10^((L_p + weighting)/10) ) = <b>${fmt(before, 1)} ${tag}</b>` +
      (anyCoat ? ` → <b>${fmt(after, 1)} ${tag}</b> after, Δ = <b>${fmt(reduction, 1)} ${tag}</b>` : ''),
  ]));
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

/* ---- L_w from free-field band SPLs: un-weight A/B/C bands, sum, add surface area ---- */
function powerBandSet() {
  const m = $('p-band').value;
  return m === 'oct' ? OCT_MAIN : m === 'octfull' ? OCT_FULL : THIRD;
}
function buildPowerBandTable() {
  const bands = powerBandSet();
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
  buildPowerBandTable();
  document.querySelectorAll('.plev').forEach(inp => {
    const v = DRILL_EXAMPLE[Number(inp.dataset.f)];
    if (v !== undefined) inp.value = v;
  });
  $('p-surf').value = 'hemi';
  $('p-d').value = 0.86; $('p-r').value = ''; $('p-S').value = '';
}
function doPowerFromBands() {
  const net = $('p-net').value;
  const rows = [];
  document.querySelectorAll('.plev').forEach(inp => {
    if (inp.value === '') return;
    const f = Number(inp.dataset.f), given = Number(inp.value), w = weightOffset(f, net);
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
    if (!(r > 0)) return show('p-out', 'Enter a radius or diameter > 0 (or a custom area).', 'err');
    S = (surf === 'sphere' ? 4 : 2) * Math.PI * r * r;
  }

  const Lp = dBsum(rows.map(r => r.lin));        // overall (un-weighted) surface-average SPL
  const rho = Number($('p-rho').value), c = Number($('p-c').value);
  if (!(rho > 0 && c > 0)) return show('p-out', 'Air density ρ and sound speed c must be > 0.', 'err');
  const p2 = P_REF * P_REF * 10 ** (Lp / 10);    // mean-square pressure, Pa²
  const I  = p2 / (rho * c);                     // intensity (free field), W/m²
  const W  = I * S;                              // radiated power, W
  const Lw = 10 * lg(W / W_REF);                 // sound power level, dB re 1e-12 W
  const tag = net === 'Z' ? 'dB' : `dB(${net})`;

  let t = `<table class="bands"><tr><th>Freq</th><th>${net === 'Z' ? 'Level' : 'Given ' + tag}</th>`;
  if (net !== 'Z') t += `<th>−W</th><th>Linear</th>`;
  t += `</tr>`;
  rows.forEach(r => {
    const unW = -weightOffset(r.f, net);
    t += `<tr><td>${r.f >= 1000 ? r.f / 1000 + 'k' : r.f}</td><td>${fmt(r.given)}</td>`;
    if (net !== 'Z') t += `<td>${unW >= 0 ? '+' : ''}${fmt(unW, 1)}</td><td>${fmt(r.lin, 1)}</td>`;
    t += `</tr>`;
  });
  t += `</table>`;

  const surfName = surf === 'custom' ? 'custom surface'
    : surf === 'sphere' ? 'sphere (S = 4πr²)' : 'hemisphere (S = 2πr²)';
  show('p-out',
    `${t}
     <div class="big">L<sub>w</sub> = <b>${fmt(Lw, 1)} dB re 10⁻¹² W</b></div>` +
    work([
      net === 'Z' ? 'Bands already linear — no un-weighting.'
                  : `Un-weight each band: L_lin = L_${net} − W_i`,
      `Overall SPL  L̄_p = 10·log₁₀( Σ 10^(L_lin/10) ) = <b>${fmt(Lp, 2)} dB</b>`,
      `p²_rms = p²_ref·10^(L̄_p/10) = (2×10⁻⁵)²·10^(${fmt(Lp, 2)}/10) = ${sci(p2)} Pa²`,
      `I = p²_rms/(ρc) = ${sci(p2)}/(${fmt(rho)}·${fmt(c)}) = ${sci(I)} W/m²`,
      `${surfName}: S = ${sci(S)} m²`,
      `W = I·S = ${sci(I)}·${sci(S)} = ${sci(W)} W`,
      `L_w = 10·log₁₀(W/W_ref) = 10·log₁₀(${sci(W)}/10⁻¹²) = <b>${fmt(Lw, 1)} dB re 10⁻¹² W</b>`,
    ]));
}

/* ---------------- Duct: sound power → microphone voltage ---------------- */
function doDuct() {
  const Lw   = Number($('duct-Lw').value);          // sound power level, dB re 1e-12 W
  const d    = Number($('duct-d').value) / 1000;    // pipe diameter, mm → m
  const Sdb  = Number($('duct-sens').value);        // mic sensitivity, dB re 1 V/Pa
  const rho  = Number($('duct-rho').value);         // air density, kg/m³
  const c    = Number($('duct-c').value);           // sound speed, m/s
  const fmax = blank('duct-fmax') ? 0 : Number($('duct-fmax').value); // highest freq present, Hz (optional)

  if (!(d > 0))           return show('duct-out', 'Pipe diameter must be > 0.', 'err');
  if (!(rho > 0 && c > 0)) return show('duct-out', 'Density and sound speed must be > 0.', 'err');

  const W   = W_REF * 10 ** (Lw / 10);   // acoustic power, W
  const A   = Math.PI * d * d / 4;       // duct cross-sectional area, m²
  const I   = W / A;                     // plane-wave intensity, W/m²
  const rc  = rho * c;                   // characteristic impedance, rayls
  const p   = Math.sqrt(I * rc);         // RMS pressure (plane wave), Pa
  const Lp  = 20 * lg(p / P_REF);        // SPL, dB re 20 µPa
  const sens = 10 ** (Sdb / 20);         // mic sensitivity, V/Pa
  const V   = p * sens;                  // RMS voltage, V

  // Plane-wave check: first higher-order mode in a circular duct cuts on here.
  const fc = 1.8412 * c / (Math.PI * d);
  let modeNote;
  if (fmax > 0) {
    modeNote = fmax < fc
      ? `<span class="small">Highest frequency ${fmt(fmax, 0)} Hz &lt; cut-on ${fmt(fc, 0)} Hz ⇒ <b class="good">plane waves only</b> — analysis valid.</span>`
      : `<span class="small">Highest frequency ${fmt(fmax, 0)} Hz ≥ cut-on ${fmt(fc, 0)} Hz ⇒ <b class="bad">higher-order modes propagate</b> — plane-wave result is approximate.</span>`;
  } else {
    modeNote = `<span class="small">First higher-order mode cuts on at <b>${fmt(fc, 0)} Hz</b> (plane-wave assumption valid below this).</span>`;
  }

  show('duct-out',
    `RMS voltage = <b>${V.toPrecision(4)} V</b> &nbsp;(${(V * 1000).toPrecision(4)} mV)` +
    work([
      `W = W_ref · 10^(L_w/10) = 10⁻¹² · 10^(${fmt(Lw)}/10) = ${sci(W)} W`,
      `A = πd²/4 = π·(${fmt(d, 4)})²/4 = ${sci(A)} m²`,
      `I = W/A = ${sci(W)} / ${sci(A)} = ${sci(I)} W/m²`,
      `p_rms = √(I·ρc) = √(${sci(I)} · ${fmt(rho)}·${fmt(c)}) = √(${sci(I * rc)}) = <b>${p.toPrecision(4)} Pa</b>`,
      `(SPL L_p = 20·log₁₀(p/p_ref) = ${fmt(Lp, 1)} dB)`,
      `mic sensitivity = 10^(S/20) = 10^(${fmt(Sdb)}/20) = ${sci(sens)} V/Pa`,
      `V = p_rms · 10^(S/20) = ${p.toPrecision(4)} · ${sci(sens)} = <b>${V.toPrecision(4)} V</b>`,
    ]) + modeNote);
}
/* ---- Band SPL → intensity & radiated power (plane wave in a duct) ---- */
function doDuctPower() {
  const d = Number($('dp-d').value) / 1000;            // mm → m
  const rho = Number($('dp-rho').value), c = Number($('dp-c').value);
  if (!(d > 0)) return show('dp-out', 'Pipe diameter must be > 0.', 'err');
  if (!(rho > 0 && c > 0)) return show('dp-out', 'Density and sound speed must be > 0.', 'err');
  const levels = $('dp-list').value.trim().split('\n')
    .map(s => Number(s.trim())).filter(s => !isNaN(s));
  if (!levels.length) return show('dp-out', 'Enter at least one band SPL.', 'err');

  const A = Math.PI * d * d / 4, rc = rho * c;
  let sumW = 0, sumI = 0, rows = '';
  levels.forEach((Lp, i) => {
    const p = P_REF * 10 ** (Lp / 20);                 // RMS pressure, Pa
    const I = p * p / rc;                              // plane-wave intensity, W/m²
    const W = I * A;                                   // radiated power, W
    sumW += W; sumI += I;
    rows += `Band ${i + 1} (${fmt(Lp, 1)} dB): p<sub>rms</sub> = <b>${p.toPrecision(4)} Pa</b> · ` +
      `I = <b>${I.toExponential(3)} W/m²</b> · W = <b>${W.toExponential(3)} W</b><br>`;
  });
  const LpTot = 10 * lg(levels.reduce((a, L) => a + 10 ** (L / 10), 0));
  const LwTot = 10 * lg(sumW / W_REF);

  show('dp-out', rows +
    `<br>Total SPL = <b>${fmt(LpTot, 2)} dB</b> · Total power ΣW = <b>${sumW.toExponential(3)} W</b> · ` +
    `Total L<sub>w</sub> = <b>${fmt(LwTot, 2)} dB</b>` +
    work([
      `A = πd²/4 = π·(${fmt(d, 4)})²/4 = ${sci(A)} m²`,
      `Per band: p_rms = p_ref·10^(Lp/20),  I = p_rms²/ρc  (ρc = ${fmt(rho)}·${fmt(c)} = ${fmt(rc, 1)} rayls),  W = I·A`,
      `L_p,total = 10·log₁₀( Σ 10^(Lp/10) ) = <b>${fmt(LpTot, 2)} dB</b>`,
      `ΣW = ${sci(sumW)} W → L_w,total = 10·log₁₀(ΣW/10⁻¹²) = <b>${fmt(LwTot, 2)} dB</b>`,
    ]));
}

/* ---------------- Community noise ---------------- */
function doLdn() {
  const d = Number($('ldn-day').value), n = Number($('ldn-night').value);
  const ed = 15 * 10 ** (d / 10), en = 9 * 10 ** ((n + 10) / 10);
  const ldn = 10 * lg((ed + en) / 24);
  show('ldn-out', `L<sub>dn</sub> = <b>${fmt(ldn, 2)} dB(A)</b>` +
    work([
      `L_dn = 10·log₁₀( (1/24)·[ 15·10^(L_day/10) + 9·10^((L_night+10)/10) ] )`,
      `= 10·log₁₀( (1/24)·[ 15·10^(${fmt(d)}/10) + 9·10^((${fmt(n)}+10)/10) ] )`,
      `= 10·log₁₀( (1/24)·[ ${sci(ed)} + ${sci(en)} ] )`,
      `= 10·log₁₀( ${sci((ed + en) / 24, 5)} )`,
      `= <b>${fmt(ldn, 2)} dB(A)</b>`,
    ]));
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
    `Surface mass M = ${fmt(M, 3)} kg/m² · TL = <b>${fmt(TL, 1)} dB</b> at ${fmt(f)} Hz` +
    work([
      `TL = 20·log₁₀(M·f) − 42.4`,
      `= 20·log₁₀(${fmt(M, 3)}·${fmt(f)}) − 42.4`,
      `= 20·log₁₀(${sci(M * f, 5)}) − 42.4`,
      `= ${fmt(20 * lg(M * f), 2)} − 42.4`,
      `= <b>${fmt(TL, 1)} dB</b>`,
    ]));
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
  show('ac-out', `T<sub>t</sub> = ${fmt(Tt, 4)} · TL = <b>${fmt(-10 * lg(Tt), 2)} dB</b>` +
    work([
      `T_t = 4·S₁·S₂ / (S₁+S₂)²`,
      `= 4·${sci(s1)}·${sci(s2)} / (${sci(s1)}+${sci(s2)})²`,
      `= ${sci(4 * s1 * s2)} / ${sci((s1 + s2) ** 2)} = ${fmt(Tt, 4)}`,
      `TL = −10·log₁₀(T_t) = −10·log₁₀(${fmt(Tt, 4)}) = <b>${fmt(-10 * lg(Tt), 2)} dB</b>`,
    ]));
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

/* ---------------- Level/Time row editor (grid input) ----------------
   A spreadsheet-style editor that writes back into the existing textarea
   (kept hidden inside a collapsible "bulk paste" box) so all the compute
   functions keep reading the same comma-separated lines unchanged. */
const GRID_CONFIG = {
  'leq-list':     [{ h: 'Level dB(A)', t: 'number' }, { h: 'Time', t: 'text', ph: '0.25 or 15 min' }],
  'dose-list':    [{ h: 'Level dB(A)', t: 'number' }, { h: 'Time', t: 'text', ph: '0.25 or 15 min' }],
  'evt-list':     [{ h: 'Level dB(A)', t: 'number' }, { h: 'Event time', t: 'text', ph: '12 s' }, { h: 'No. events', t: 'number' }],
  'combine-list': [{ h: 'Level dB', t: 'number' }],
  'rms-list':     [{ h: 'RMS pressure (Pa)', t: 'number' }],
  'aa-list':      [{ h: 'Area S (m²)', t: 'number' }, { h: 'α', t: 'number' }],
  'sort-list':    [{ h: 'Value dB', t: 'number' }],
};
function gridRowsFromText(text, ncols) {
  const rows = text.trim().split('\n').map(l => l.trim()).filter(l => l.length)
    .map(l => { const c = l.split(',').map(s => s.trim()); while (c.length < ncols) c.push(''); return c.slice(0, ncols); });
  return rows.length ? rows : [Array(ncols).fill('')];
}
// Flatten every column-group's rows back into the linked textarea (the format
// all the compute functions still read). Labels are cosmetic and not exported.
function syncTextarea(grid) {
  const lines = [];
  // Only active (non-disabled) column groups feed the calculation.
  grid.querySelectorAll('.lt-group:not(.off) tbody tr').forEach(tr => {
    const cells = [...tr.querySelectorAll('input.cell')].map(i => i.value.trim());
    if (cells.some(c => c !== '')) lines.push(cells.join(', '));
  });
  $(grid.dataset.target).value = lines.join('\n');
}
function refreshCols(grid) {
  const gs = grid.querySelectorAll('.lt-group');
  gs.forEach(g => { const b = g.querySelector('.rmcol'); if (b) b.style.display = gs.length > 1 ? 'block' : 'none'; });
}
function addGridRow(group, cols, values) {
  const grid = group.closest('.lt-grid'), tb = group.querySelector('tbody'), tr = document.createElement('tr');
  cols.forEach((col, i) => {
    const td = document.createElement('td'), inp = document.createElement('input');
    inp.className = 'cell';
    inp.type = col.t === 'number' ? 'number' : 'text';
    if (col.t === 'number') inp.step = 'any';
    if (col.ph) inp.placeholder = col.ph;
    inp.value = values && values[i] != null ? values[i] : '';
    inp.addEventListener('input', () => syncTextarea(grid));
    td.appendChild(inp); tr.appendChild(td);
  });
  const td = document.createElement('td'), rm = document.createElement('button');
  rm.type = 'button'; rm.className = 'rm'; rm.textContent = '×'; rm.title = 'Remove row';
  rm.onclick = () => { tr.remove(); if (!tb.querySelector('tr')) addGridRow(group, cols); syncTextarea(grid); };
  td.appendChild(rm); tr.appendChild(td); tb.appendChild(tr);
}
function addGroup(grid, cols, rows, label) {
  const groups = grid.querySelector('.lt-groups'), g = document.createElement('div');
  g.className = 'lt-group';
  const head = document.createElement('div'); head.className = 'ghead';
  const act = document.createElement('label'); act.className = 'gactive';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true;
  cb.addEventListener('change', () => { g.classList.toggle('off', !cb.checked); syncTextarea(grid); });
  act.append(cb, ' Active');
  const lab = document.createElement('input');
  lab.className = 'glabel'; lab.type = 'text'; lab.placeholder = 'Label (optional)';
  if (label) lab.value = label;
  head.append(act, lab); g.appendChild(head);
  const table = document.createElement('table'), thead = document.createElement('thead'), htr = document.createElement('tr');
  cols.forEach(c => { const th = document.createElement('th'); th.textContent = c.h; htr.appendChild(th); });
  htr.appendChild(document.createElement('th'));
  thead.appendChild(htr); table.appendChild(thead);
  const tb = document.createElement('tbody'); table.appendChild(tb); g.appendChild(table);
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'addrow'; add.textContent = '+ Add row';
  add.onclick = () => addGridRow(g, cols);
  g.appendChild(add);
  const dup = document.createElement('button');
  dup.type = 'button'; dup.className = 'dupcol'; dup.textContent = '⧉ Duplicate';
  dup.title = 'Copy this column into a new one (e.g. double the time intervals)';
  dup.onclick = () => {
    const rows = [...g.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('input.cell')].map(i => i.value));
    addGroup(grid, cols, rows, lab.value ? lab.value + ' (copy)' : '');
    syncTextarea(grid);
  };
  g.appendChild(dup);
  const rmc = document.createElement('button');
  rmc.type = 'button'; rmc.className = 'rmcol'; rmc.textContent = '× Remove column';
  rmc.onclick = () => { g.remove(); if (!groups.querySelector('.lt-group')) addGroup(grid, cols); refreshCols(grid); syncTextarea(grid); };
  g.appendChild(rmc);
  groups.appendChild(g);
  (rows && rows.length ? rows : [Array(cols.length).fill('')]).forEach(v => addGridRow(g, cols, v));
  refreshCols(grid);
}
function buildGrid(targetId) {
  const grid = document.querySelector(`.lt-grid[data-target="${targetId}"]`);
  if (!grid) return;
  const cols = GRID_CONFIG[targetId], ta = $(targetId);
  grid.innerHTML = '';
  const groups = document.createElement('div'); groups.className = 'lt-groups'; grid.appendChild(groups);
  addGroup(grid, cols, gridRowsFromText(ta.value, cols.length));
  const addc = document.createElement('button');
  addc.type = 'button'; addc.className = 'addcol'; addc.textContent = '+ Add column';
  addc.onclick = () => addGroup(grid, cols);
  grid.appendChild(addc);
  syncTextarea(grid);
}
function initGrids() {
  Object.keys(GRID_CONFIG).forEach(buildGrid);
  // "Apply to grid" buttons in the bulk-paste box rebuild the grid from pasted text.
  document.querySelectorAll('button[data-applygrid]').forEach(b => {
    b.onclick = () => buildGrid(b.dataset.applygrid);
  });
}

/* ---------------- init ---------------- */
window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSearch();
  buildWeightTable();
  buildBandTable();
  buildPowerBandTable();
  buildReverbTable();
  buildPlantTable();
  buildTestRoomTable();
  buildRefTable();
  initGrids();
});
