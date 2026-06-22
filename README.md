# MECH9325-AIO — Acoustics & Noise Control Calculator

A plug-and-play, fully client-side web app covering the calculation content from the
course Moodle quizzes **and the full lecture-note formula set (Units 1–8)**.
**No build step, no server, no dependencies** — just open `index.html` in any browser.

## Run it

- Double-click `index.html`, **or**
- Serve the folder: `python3 -m http.server` then visit <http://localhost:8000>

## Find a calculator fast

Use the **search box** above the tabs — it filters tabs by keyword/tag as you type
(e.g. `SPL`, `dB(A)`, `Leq`, `RT60`, `sones`, `mass law`, `Lw`, `K1`, `Ldn`).
Press **Enter** to jump to the first match, **Esc** to clear.

## Time units

In the **Leq**, discrete-events and **Noise Dose** inputs, durations may carry a unit and be
freely mixed: `96, 15 min` · `91, 2 h` · `99, 30 s`. A bare number uses the **default unit**
selector on that card. The reference period T also accepts a unit (e.g. `8 h`, `480 min`, `24 h`).

## What it covers

| Tab | Calculations | Source |
|-----|--------------|--------|
| **Levels** | SPL ↔ pressure · Sound Power Level · Intensity Level · I=p²/ρc · peak↔RMS · combine tone RMS | Unit 1–2 |
| **Combine** | Add incoherent levels · N identical sources · increase when sources are added · error from using only the larger of two RMS signals | Quiz 1 |
| **Subtract** | Remove a source / background · level of one of N identical sources | Quiz 1 |
| **Waves** | c=f·λ, T, ω, k · speed of sound from temperature · particle velocity/displacement · octave band edges · pipe natural frequencies | Unit 1, 6 |
| **Distance** | Point (−6 dB/doubling) vs line (−3 dB/doubling) spreading · L<sub>p</sub> from L<sub>w</sub> (free-field/ground) | Quiz 5, Unit 3 |
| **Room Acoustics** | Sabine T₆₀ (solve any term) · average absorption ᾱ · room constant R · room equation L<sub>p</sub>=L<sub>w</sub>+10log(Q/4πr²+4/R) · reverberant level change from adding/removing absorber panels (ΔL<sub>p</sub>=10log(A₁/A₂)) → overall dB(A) | Unit 3–4, Quiz 4 |
| **Sound Power** | Background correction K₁ · environmental K₂ · L<sub>w</sub> from surface SPL · free-field L<sub>w</sub> from band SPLs (un-weight dB(A)/dB(B)/dB(C) → linear, hemisphere/sphere/custom surface) | Unit 4, Quiz 3 |
| **Duct → Voltage** | Radiated power in a pipe → intensity (W/A) → plane-wave pressure → microphone voltage (with higher-order-mode cut-on check) | Unit 1–2, 4 |
| **Weighting** | A/B/C weighting of octave or ⅓-octave bands → dB(A)/dB(B)/dB(C) and linear total | Quiz 1 |
| **Leq** | L<sub>eq</sub> from levels & durations (incl. meter periods) · from discrete events · **mixed time units** (s/min/h) | Quiz 4, 5, 7, 8 |
| **Noise Dose** | Worker shift L<sub>Aeq</sub>, dose %, OH&S limit check, max permissible time | Quiz 4 |
| **Loudness** | Phons ↔ sones, equal-loudness-contour guidance | Quiz 6 |
| **Speech (PSIL)** | Preferred Speech Interference Level + voice-effort guidance | Quiz 6 |
| **Community** | Day–night level L<sub>dn</sub> (+10 dB night penalty) | Unit 5 |
| **Stats / SEL** | L₁/L₁₀/L₉₀/L₉₉/L<sub>eq</sub>/SEL meanings · SEL ↔ L<sub>eq</sub> · sort values | Quiz 6 |
| **Insulation (TL)** | Mass-law TL · interface impedance ratio & α<sub>t</sub>/α<sub>r</sub> · TL from α<sub>t</sub> · panel resonance | Unit 7 |
| **Mufflers** | Sudden area-change TL · expansion-chamber TL · TL/IL/NR | Unit 8 |
| **Tables** | Full A/B/C weighting network reference table | — |

Every formula was validated against worked answers from the quizzes and lecture notes
(e.g. dB(A) total = 77.5, L<sub>Aeq,24h</sub> = 70.55, 16 sones, 1 Pa → 94 dB,
0.5 W → 117 dB, c(20 °C) = 343 m/s, plywood mass-law TL = 21 dB @ 1 kHz).

## Key formulas

```
Combine:     L_tot = 10·log10( Σ 10^(Li/10) )
N sources:   L_tot = L1 + 10·log10(N)
Subtract:    L_rem = 10·log10( 10^(Ltot/10) − 10^(Lbg/10) )
Point src:   L2    = L1 − 20·log10(r2/r1)
Line src:    L2    = L1 − 10·log10(r2/r1)
Weighted:    L_W   = 10·log10( Σ 10^((Li+Wi)/10) )
Leq:         L_eq  = 10·log10( (1/T)·Σ ti·10^(Li/10) )
Events:      L_eq  = 10·log10( (1/T)·Σ Ni·ti·10^(Li/10) )
Max time:    T     = Tc / 2^((LAeq − Lc)/q)      (Lc=85, q=3, Tc=8)
Sones:       S     = 2^((LL − 40)/10)
PSIL:        PSIL  = (L500 + L1000 + L2000) / 3
SEL:         SEL   = Leq + 10·log10(T / 1s)
SPL:         Lp    = 20·log10(p / 2e-5)          p = 2e-5·10^(Lp/20)
Power level: Lw    = 10·log10(W / 1e-12)
Intensity:   I     = p_rms^2 / (rho*c)           LI = 10·log10(I / 1e-12)
Wave:        c     = f·λ ;  c = sqrt(γ·R·T0) ;   k = 2π/λ
Particle:    u     = P/(rho*c) ;  ξ = u/ω
Lw→Lp:       Lp    = Lw − 20·log10(r) − 11  (point, free field; −8 on ground)
Reverb:      T60   = 0.161·V / (ᾱ·S)             R = ᾱ·S/(1−ᾱ)
Room eq:     Lp    = Lw + 10·log10( Q/(4πr²) + 4/R )
Sound power: K1    = −10·log10(1 − 10^(−ΔL/10))  K2 = 10·log10(1 + 4S/A)
Ldn:         Ldn   = 10·log10( (1/24)[15·10^(Ld/10) + 9·10^((Ln+10)/10)] )
Mass law:    TL    = 20·log10(M·f) − 42.4         (in air, normal incidence)
TL coeff:    TL    = −10·log10(α_t)
Area change: Tt    = 4·S1·S2/(S1+S2)^2 ;  TL = −10·log10(Tt)
```

## Files

- `index.html` — UI / structure
- `styles.css` — styling
- `data.js` — A/B/C weighting table & reference data
- `app.js` — all calculator logic
