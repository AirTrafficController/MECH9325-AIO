# MECH9325-AIO — Acoustics & Noise Control Calculator

A plug-and-play, fully client-side web app that covers the calculation content from the
course Moodle quizzes. **No build step, no server, no dependencies** — just open
`index.html` in any browser.

## Run it

- Double-click `index.html`, **or**
- Serve the folder: `python3 -m http.server` then visit <http://localhost:8000>

## Offline Python version (exam-friendly)

`mech9325.py` is a standard-library-only port of the same calculators — no pip
installs, no internet, no dependencies. Useful where only Excel and Python are
allowed. Two ways to use it:

```bash
python3 mech9325.py          # interactive menu
```

```python
from mech9325 import combine, weighting, leq, noise_dose, phon_to_sone
combine([80, 90, 100, 90, 100, 90, 90, 110, 80, 60])   # -> 110.94 dB, 7.05 Pa
```

It mirrors every tab (combine/subtract, weighting, Leq, events, dose, loudness,
PSIL, SEL/stats, reference table) and is validated against the same quiz answers.

## What it covers

| Tab | Calculations | From |
|-----|--------------|------|
| **Combine** | Add incoherent levels · N identical sources · increase in level when sources are added | Quiz 1 |
| **Subtract** | Remove a source / background · level of one of N identical sources | Quiz 1 |
| **Weighting** | A/B/C weighting of octave or ⅓-octave bands → overall dB(A)/dB(B)/dB(C) and linear total | Quiz 1 |
| **Leq** | L<sub>eq</sub> from levels & durations · L<sub>eq</sub> from discrete events (train/vehicle pass-bys) | Quiz 4, 7 |
| **Noise Dose** | Worker shift L<sub>Aeq</sub>, dose %, OH&S limit check, max permissible time (3 dB exchange, 85 dB(A)) | Quiz 4 |
| **Loudness** | Phons ↔ sones, equal-loudness-contour guidance | Quiz 6 |
| **Speech (PSIL)** | Preferred Speech Interference Level + voice-effort guidance | Quiz 6 |
| **Stats / SEL** | L₁/L₁₀/L₉₀/L₉₉/L<sub>eq</sub>/SEL meanings · SEL ↔ L<sub>eq</sub> · sort values into terms | Quiz 6 |
| **Tables** | Full A/B/C weighting network reference table | — |

Every formula was validated against the worked quiz answers (e.g. dB(A) total = 77.5,
L<sub>Aeq,12h</sub> = 81.07, L<sub>Aeq,24h</sub> = 70.55, 16 sones).

## Key formulas

```
Combine:     L_tot = 10·log10( Σ 10^(Li/10) )   ·   p_rms = 2e-5·10^(L_tot/20) Pa
N sources:   L_tot = L1 + 10·log10(N)
Subtract:    L_rem = 10·log10( 10^(Ltot/10) − 10^(Lbg/10) )
Weighted:    L_W   = 10·log10( Σ 10^((Li+Wi)/10) )
Leq:         L_eq  = 10·log10( (1/T)·Σ ti·10^(Li/10) )
Events:      L_eq  = 10·log10( (1/T)·Σ Ni·ti·10^(Li/10) )
Max time:    T     = Tc / 2^((LAeq − Lc)/q)      (Lc=85, q=3, Tc=8)
Sones:       S     = 2^((LL − 40)/10)
PSIL:        PSIL  = (L500 + L1000 + L2000) / 3
SEL:         SEL   = Leq + 10·log10(T / 1s)
```

## Files

- `index.html` — UI / structure
- `styles.css` — styling
- `data.js` — A/B/C weighting table & reference data
- `app.js` — all calculator logic
