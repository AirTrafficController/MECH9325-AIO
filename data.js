// A / B / C weighting network relative response (dB) by 1/3-octave centre frequency.
// Standard values (IEC 61672 family, as used in the course table).
const WEIGHTING = [
  // freq,   A,     B,     C
  [25,    -44.7, -20.4, -4.4],
  [31.5,  -39.4, -17.1, -3.0],
  [40,    -34.6, -14.2, -2.0],
  [50,    -30.2, -11.6, -1.3],
  [63,    -26.2,  -9.3, -0.8],
  [80,    -22.5,  -7.4, -0.5],
  [100,   -19.1,  -5.6, -0.3],
  [125,   -16.1,  -4.2, -0.2],
  [160,   -13.4,  -3.0, -0.1],
  [200,   -10.9,  -2.0,  0.0],
  [250,    -8.6,  -1.3,  0.0],
  [315,    -6.6,  -0.8,  0.0],
  [400,    -4.8,  -0.5,  0.0],
  [500,    -3.2,  -0.3,  0.0],
  [630,    -1.9,  -0.1,  0.0],
  [800,    -0.8,   0.0,  0.0],
  [1000,    0.0,   0.0,  0.0],
  [1250,    0.6,   0.0,  0.0],
  [1600,    1.0,   0.0, -0.1],
  [2000,    1.2,  -0.1, -0.2],
  [2500,    1.3,  -0.2, -0.3],
  [3150,    1.2,  -0.4, -0.5],
  [4000,    1.0,  -0.7, -0.8],
  [5000,    0.5,  -1.2, -1.3],
  [6300,   -0.1,  -1.9, -2.0],
  [8000,   -1.1,  -2.9, -3.0],
  [10000,  -2.5,  -4.3, -4.4],
  [12500,  -4.3,  -6.1, -6.2],
  [16000,  -6.6,  -8.4, -8.5],
  [20000,  -9.3, -11.1, -11.2],
];

// Look-up: weighting offset for a given frequency & network ('A'|'B'|'C'|'Z').
function weightOffset(freq, net) {
  if (net === 'Z') return 0;
  const col = { A: 1, B: 2, C: 3 }[net];
  const row = WEIGHTING.find(r => r[0] === freq);
  return row ? row[col] : 0;
}

// Standard octave-band centre frequencies.
const OCT_FULL = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const OCT_MAIN = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
const THIRD = WEIGHTING.map(r => r[0]);

// Quiz-1 vehicle example: octave band levels 63 Hz .. 8 kHz.
const VEHICLE_EXAMPLE = { 63:93, 125:89, 250:80, 500:54, 1000:71, 2000:64, 4000:58, 8000:61 };

// Electric-drill example (Quiz 3): A-weighted octave band SPLs, 125 Hz .. 16 kHz,
// measured on a 0.86 m diameter hemisphere (radius 0.43 m), free field on the ground.
const DRILL_EXAMPLE = { 125:43, 250:51, 500:61, 1000:71, 2000:76, 4000:78, 8000:72, 16000:63 };

// Office-panel example (Quiz 4): remove six suspended absorber panels.
// Room 12 x 10 x 3.4 m → V = 408 m³; six panels of 5 x 0.8 m exposed both sides → S_abs = 48 m².
// Per octave band: measured L_p (dB), reverberation time T₆₀ (s), panel absorption coefficient α.
const PANEL_EXAMPLE = {
  V: 408, Sabs: 48, mode: 'remove', net: 'A',
  bands: {
    250:  { Lp: 81, T: 2.1, al: 0.30 },
    500:  { Lp: 84, T: 1.9, al: 0.35 },
    1000: { Lp: 83, T: 1.8, al: 0.37 },
  },
};

// Plant-room example (three motors, concrete room, ceiling coating). Each band
// carries the individual motor L_w values, the bare (concrete) absorption
// coefficient α, and the coating α applied to the ceiling.
const PLANT_EXAMPLE = {
  L: 11.6, W: 5.0, H: 5.0, Scoat: 58, net: 'A',
  bands: {
    500:  { lw: '94 89 82', ab: 0.02, ac: 0.38 },
    1000: { lw: '89 88 75', ab: 0.04, ac: 0.71 },
    2000: { lw: '84 80 76', ab: 0.05, ac: 0.89 },
  },
};

// Table 5.2 (Unit 5) — A-weighted voice levels VLA (dB(A) at 1 m) for each voice
// effort. The largest, peak shouting, is the loudest a human voice can manage;
// a required VLA above it means face-to-face communication is not possible.
const VOICE_LEVELS = [
  // [VLA dB(A) at 1 m, voice effort]
  [57, 'Normal'],
  [65, 'Raised'],
  [74, 'Very loud'],
  [82, 'Shouting'],
  [88, 'Peak shouting (maximum effort)'],
];
const VOICE_MAX = 88; // dB(A) at 1 m — peak shouting

// Given a required A-weighted voice level VLA (dB(A) at 1 m), return the voice
// effort a talker must at least use. Returns null when VLA exceeds peak
// shouting, i.e. communication is not possible.
function voiceEffortForVL(vla) {
  if (vla > VOICE_MAX) return null;
  for (const [lvl, name] of VOICE_LEVELS) if (vla <= lvl) return name;
  return VOICE_LEVELS[VOICE_LEVELS.length - 1][1];
}

// ---- Physical constants & reference values (course defaults) ----
const P_REF = 2e-5;       // reference sound pressure, Pa (20 uPa)
const W_REF = 1e-12;      // reference sound power, W
const I_REF = 1e-12;      // reference sound intensity, W/m^2
const RHO_C = 415;        // characteristic impedance of air, rayls (1.21*343)
const C_AIR = 343;        // speed of sound in air at 20 C, m/s

// Octave / one-third octave band edge factors from a centre frequency.
function bandEdges(fc, type) {
  const k = type === 'third' ? Math.pow(2, 1 / 6) : Math.SQRT2;
  return { lower: fc / k, upper: fc * k };
}
