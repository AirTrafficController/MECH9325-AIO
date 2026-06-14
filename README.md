# MECH9325-AIO — Acoustics & Noise Control Calculator

A plug-and-play, fully client-side web app that covers the calculation content from the
course Moodle quizzes. **No build step, no server, no dependencies** — just open
`index.html` in any browser.

## Run it

- Double-click `index.html`, **or**
- Serve the folder: `python3 -m http.server` then visit <http://localhost:8000>

## What it covers

| Tab | Calculations | From |
|-----|--------------|------|
| **Combine** | Add incoherent levels · N identical sources · increase in level when sources are added · error from using only the larger of two RMS signals | Quiz 1 |
| **Subtract** | Remove a source / background · level of one of N identical sources | Quiz 1 |
| **Weighting** | A/B/C weighting of octave or ⅓-octave bands → overall dB(A)/dB(B)/dB(C) and linear total | Quiz 1 |
| **Leq** | L<sub>eq</sub> from levels & durations · L<sub>eq</sub> from discrete events (train/vehicle pass-bys) | Quiz 4, 7 |
| **Noise Dose** | Worker shift L<sub>Aeq</sub>, dose %, OH&S limit check, max permissible time (3 dB exchange, 85 dB(A)) | Quiz 4 |
| **Loudness** | Phons ↔ sones, equal-loudness-contour guidance | Quiz 6 |
| **Speech (PSIL)** | Preferred Speech Interference Level + voice-effort guidance | Quiz 6 |
| **Stats / SEL** | L₁/L₁₀/L₉₀/L₉₉/L<sub>eq</sub>/SEL meanings · SEL ↔ L<sub>eq</sub> · sort values into terms | Quiz 6 |
| **Duct → Voltage** | Sound power in a pipe → intensity → plane-wave pressure → microphone voltage (with higher-order-mode cut-on check) | — |
| **Tables** | Full A/B/C weighting network reference table | — |

Every formula was validated against the worked quiz answers (e.g. dB(A) total = 77.5,
L<sub>Aeq,12h</sub> = 81.07, L<sub>Aeq,24h</sub> = 70.55, 16 sones).

## Key formulas

```
Combine:     L_tot = 10·log10( Σ 10^(Li/10) )   ·   p_rms = 2e-5·10^(L_tot/20) Pa
Larger-only: p_tot = sqrt(p1^2 + p2^2)   ·   Error = 1/sqrt(1 + r^2) − 1,  r = p2/p1
N sources:   L_tot = L1 + 10·log10(N)
Subtract:    L_rem = 10·log10( 10^(Ltot/10) − 10^(Lbg/10) )
Weighted:    L_W   = 10·log10( Σ 10^((Li+Wi)/10) )
Leq:         L_eq  = 10·log10( (1/T)·Σ ti·10^(Li/10) )
Events:      L_eq  = 10·log10( (1/T)·Σ Ni·ti·10^(Li/10) )
Max time:    T     = Tc / 2^((LAeq − Lc)/q)      (Lc=85, q=3, Tc=8)
Sones:       S     = 2^((LL − 40)/10)
PSIL:        PSIL  = (L500 + L1000 + L2000) / 3
SEL:         SEL   = Leq + 10·log10(T / 1s)
Duct→V:      W = Wref·10^(Lw/10) · I = W/A (A=πd²/4) · p = √(I·ρc) · V = p·10^(S/20)
```

## Files

- `index.html` — UI / structure
- `styles.css` — styling
- `data.js` — A/B/C weighting table & reference data
- `app.js` — all calculator logic
