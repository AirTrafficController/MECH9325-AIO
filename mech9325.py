#!/usr/bin/env python3
"""
MECH9325 - Acoustics & Noise Control calculator (offline Python port)
=====================================================================

A single-file, standard-library-only port of the web app. Built for exam
conditions where only Excel and Python are allowed: no pip installs, no
internet, no dependencies. Works two ways:

  1. Interactive menu:   python3 mech9325.py
  2. As a library:       from mech9325 import combine, leq, weighting, ...
                         (handy inside a Python REPL or Jupyter cell)

Every formula matches the web app and was checked against the worked quiz
answers (e.g. octave-band total = 110.94 dB / 7.05 Pa; dB(A) total = 77.5;
L_Aeq,12h = 81.07; 16 sones).
"""

import math

P_REF = 2e-5          # reference sound pressure, Pa
lg = math.log10


# ===================================================================
#  Core helpers
# ===================================================================
def db_sum(levels):
    """Combine levels (dB) on an energy basis: 10*log10(sum 10^(Li/10))."""
    return 10 * lg(sum(10 ** (L / 10) for L in levels))


def level_to_pressure(L):
    """Sound pressure level (dB) -> RMS pressure (Pa)."""
    return P_REF * 10 ** (L / 20)


def pressure_to_level(p):
    """RMS pressure (Pa) -> sound pressure level (dB)."""
    return 20 * lg(p / P_REF)


# ===================================================================
#  Weighting network data (IEC 61672 family, as used in the course)
# ===================================================================
WEIGHTING = [
    # freq,    A,     B,     C
    (25,    -44.7, -20.4, -4.4),
    (31.5,  -39.4, -17.1, -3.0),
    (40,    -34.6, -14.2, -2.0),
    (50,    -30.2, -11.6, -1.3),
    (63,    -26.2,  -9.3, -0.8),
    (80,    -22.5,  -7.4, -0.5),
    (100,   -19.1,  -5.6, -0.3),
    (125,   -16.1,  -4.2, -0.2),
    (160,   -13.4,  -3.0, -0.1),
    (200,   -10.9,  -2.0,  0.0),
    (250,    -8.6,  -1.3,  0.0),
    (315,    -6.6,  -0.8,  0.0),
    (400,    -4.8,  -0.5,  0.0),
    (500,    -3.2,  -0.3,  0.0),
    (630,    -1.9,  -0.1,  0.0),
    (800,    -0.8,   0.0,  0.0),
    (1000,    0.0,   0.0,  0.0),
    (1250,    0.6,   0.0,  0.0),
    (1600,    1.0,   0.0, -0.1),
    (2000,    1.2,  -0.1, -0.2),
    (2500,    1.3,  -0.2, -0.3),
    (3150,    1.2,  -0.4, -0.5),
    (4000,    1.0,  -0.7, -0.8),
    (5000,    0.5,  -1.2, -1.3),
    (6300,   -0.1,  -1.9, -2.0),
    (8000,   -1.1,  -2.9, -3.0),
    (10000,  -2.5,  -4.3, -4.4),
    (12500,  -4.3,  -6.1, -6.2),
    (16000,  -6.6,  -8.4, -8.5),
    (20000,  -9.3, -11.1, -11.2),
]
_WCOL = {"A": 1, "B": 2, "C": 3}


def weight_offset(freq, net):
    """Weighting offset (dB) for a frequency & network ('A'/'B'/'C'/'Z')."""
    net = net.upper()
    if net == "Z":
        return 0.0
    col = _WCOL.get(net)
    for row in WEIGHTING:
        if row[0] == freq:
            return row[col]
    return 0.0


# ===================================================================
#  Combine / Subtract
# ===================================================================
def combine(levels, verbose=True):
    """Total of several band/source levels. Returns (L_tot_dB, p_rms_Pa)."""
    tot = db_sum(levels)
    p = level_to_pressure(tot)
    if verbose:
        terms = " + ".join(f"10^({L}/10)" for L in levels)
        print(f"  L_tot = 10*log10( {terms} )")
        print(f"        = 10*log10( {sum(10**(L/10) for L in levels):.4e} )")
        print(f"        = {tot:.2f} dB")
        print(f"  RMS pressure p = 2e-5 * 10^(L/20) = {p:.3g} Pa")
    return tot, p


def identical_sources(L1, N):
    """Total level of N identical sources: L1 + 10*log10(N)."""
    return L1 + 10 * lg(N)


def increase_when_added(n1, L1, added):
    """Level after adding identical sources. Returns (n2, delta_dB, new_level)."""
    n2 = n1 + added
    dL = 10 * lg(n2 / n1)
    return n2, dL, L1 + dL


def subtract(total, background):
    """Remove a background/source (energy basis). Returns remaining level (dB)."""
    diff = 10 ** (total / 10) - 10 ** (background / 10)
    if diff <= 0:
        raise ValueError("Total must exceed the level being removed.")
    return 10 * lg(diff)


def one_of_n(total, N):
    """Level of one of N identical sources: total - 10*log10(N)."""
    return total - 10 * lg(N)


# ===================================================================
#  Weighting
# ===================================================================
def weighting(bands, net="A", verbose=True):
    """
    Apply A/B/C/Z weighting to octave/third-octave bands.
    `bands` is a dict {freq_Hz: level_dB}. Returns (weighted_total, linear_total).
    """
    rows = []
    for f, L in bands.items():
        w = weight_offset(f, net)
        rows.append((f, L, w, L + w))
    linear = db_sum([r[1] for r in rows])
    weighted = db_sum([r[3] for r in rows])
    tag = "dB" if net.upper() == "Z" else f"dB({net.upper()})"
    if verbose:
        print(f"  {'Freq':>7} {'Level':>7} {'+W':>6} {'Weighted':>9}")
        for f, L, w, Lw in rows:
            print(f"  {f:>7g} {L:>7g} {w:>+6.1f} {Lw:>9.2f}")
        print(f"  Overall: {weighted:.1f} {tag}")
        print(f"  Linear (unweighted) total = {linear:.1f} dB")
    return weighted, linear


# ===================================================================
#  Leq
# ===================================================================
def leq(rows, T=None):
    """
    Equivalent continuous level from (level, duration) pairs.
    rows = [(L1, t1), (L2, t2), ...]. If T is None, T = sum of durations.
    """
    energy = sum(t * 10 ** (L / 10) for L, t in rows)
    sumT = sum(t for _, t in rows)
    if T is None or T <= 0:
        T = sumT
    return 10 * lg(energy / T)


def leq_events(rows, T):
    """
    Leq over period T from discrete events.
    rows = [(level, single_event_duration, num_events), ...].
    """
    energy = sum(N * t * 10 ** (L / 10) for L, t, N in rows)
    return 10 * lg(energy / T)


# ===================================================================
#  Noise dose & OH&S limits
# ===================================================================
def noise_dose(rows, Lc=85.0, q=3.0, Tc=8.0):
    """
    Worker noise dose. rows = [(level_dBA, duration_h), ...].
    Lc = criterion level, q = exchange rate, Tc = criterion period (h).
    Returns dict with L_Aeq, dose %, exceeds flag, max permissible time.
    """
    energy = sum(t * 10 ** (L / 10) for L, t in rows)
    sumT = sum(t for _, t in rows)
    dose = sum(t / (Tc / 2 ** ((L - Lc) / q)) for L, t in rows)
    L_aeq = 10 * lg(energy / Tc)               # normalised to criterion period
    Tmax = Tc / 2 ** ((L_aeq - Lc) / q)
    return {
        "L_Aeq": L_aeq,
        "total_time_h": sumT,
        "dose_pct": dose * 100,
        "exceeds_limit": L_aeq > Lc,
        "max_time_h": Tmax,
    }


# ===================================================================
#  Loudness
# ===================================================================
def phon_to_sone(phon):
    """Loudness level (phon) -> loudness (sone). Valid for phon >= 40."""
    return 2 ** ((phon - 40) / 10)


def sone_to_phon(sone):
    """Loudness (sone) -> loudness level (phon)."""
    return 40 + 10 * math.log2(sone)


# ===================================================================
#  Speech interference (PSIL)
# ===================================================================
def _voice_effort(psil, dist):
    adj = psil + 20 * lg(max(dist, 0.05) / 1.0)
    if adj < 45:
        return "Normal to Raised"
    if adj < 55:
        return "Raised to Very Loud"
    if adj < 65:
        return "Very Loud to Shouting"
    if adj < 75:
        return "Shouting"
    return "Communication impossible"


def psil(L500, L1000=None, L2000=None, dist=1.0):
    """
    Preferred Speech Interference Level = mean of 500/1000/2000 Hz levels.
    Returns (PSIL_dB, voice_effort_text).
    """
    if L1000 is None:
        L1000 = L500
    if L2000 is None:
        L2000 = L500
    value = (L500 + L1000 + L2000) / 3
    return value, _voice_effort(value, dist)


# ===================================================================
#  Stats / SEL
# ===================================================================
def sel(leq_value, T):
    """Sound Exposure Level from Leq over T seconds: Leq + 10*log10(T)."""
    return leq_value + 10 * lg(T)


def sort_stats(values):
    """
    Sort four measured levels into the standard terms (largest->smallest):
    returns dict SEL / L1 / Leq / L99.
    """
    v = sorted(values, reverse=True)
    if len(v) < 4:
        raise ValueError("Need four values.")
    return {"SEL": v[0], "L1": v[1], "Leq": v[2], "L99": v[3]}


# ===================================================================
#  Interactive menu
# ===================================================================
def _floats(prompt):
    """Read a line of whitespace/comma separated floats."""
    raw = input(prompt).replace(",", " ").split()
    return [float(x) for x in raw]


def _rows(prompt, n):
    """Read multiple rows (blank line to finish); each row has n numbers."""
    print(prompt + "  (one row per line, blank line to finish)")
    out = []
    while True:
        line = input("  > ").replace(",", " ").split()
        if not line:
            break
        nums = [float(x) for x in line]
        if len(nums) < n:
            print(f"    need {n} numbers per row")
            continue
        out.append(tuple(nums[:n]))
    return out


def _menu_combine():
    levels = _floats("Band/source levels (dB), space or comma separated:\n  > ")
    combine(levels)


def _menu_identical():
    L1 = float(input("Level of one source L1 (dB): "))
    N = float(input("Number of identical sources N: "))
    print(f"  Total = {identical_sources(L1, N):.2f} dB")


def _menu_increase():
    n1 = float(input("Initial number of sources N1: "))
    L1 = float(input("Measured level L1 (dB): "))
    add = float(input("Sources added: "))
    n2, dL, nl = increase_when_added(n1, L1, add)
    print(f"  N2 = {n2:g}, increase = {dL:.3f} dB, new total = {nl:.3f} dB")


def _menu_subtract():
    tot = float(input("Measured total level (dB): "))
    bg = float(input("Level to remove (background/source, dB): "))
    print(f"  Remaining level = {subtract(tot, bg):.2f} dB")


def _menu_one_of_n():
    tot = float(input("Combined total level (dB): "))
    N = float(input("Number of identical sources N: "))
    print(f"  Each source = {one_of_n(tot, N):.2f} dB")


def _menu_weighting():
    net = input("Network A/B/C/Z [A]: ").strip() or "A"
    print("Enter 'freq level' per line (e.g. 63 93), blank line to finish:")
    bands = {}
    while True:
        line = input("  > ").replace(",", " ").split()
        if not line:
            break
        bands[float(line[0])] = float(line[1])
    weighting(bands, net)


def _menu_leq():
    rows = _rows("Enter 'level duration' pairs:", 2)
    raw = input("Reference period T (blank = sum of durations): ").strip()
    T = float(raw) if raw else None
    print(f"  Leq = {leq(rows, T):.3f} dB")


def _menu_events():
    rows = _rows("Enter 'level single-event-duration num-events':", 3)
    T = float(input("Reference period T: "))
    print(f"  Leq,T = {leq_events(rows, T):.3f} dB")


def _menu_dose():
    rows = _rows("Enter 'level_dBA duration_h' pairs:", 2)
    Lc = float(input("Criterion level Lc [85]: ") or 85)
    q = float(input("Exchange rate q [3]: ") or 3)
    Tc = float(input("Criterion period Tc (h) [8]: ") or 8)
    r = noise_dose(rows, Lc, q, Tc)
    print(f"  L_Aeq,{Tc:g}h = {r['L_Aeq']:.3f} dB(A)")
    print(f"  Total exposure = {r['total_time_h']:g} h")
    print(f"  Noise dose = {r['dose_pct']:.1f} %  (100 % = limit)")
    print(f"  Exceeds {Lc:g} dB(A)? {'YES' if r['exceeds_limit'] else 'No'}")
    print(f"  Max permissible time at this L_Aeq = {r['max_time_h']:.4f} h")


def _menu_loud():
    print("1) phon -> sone   2) sone -> phon")
    if input("choice: ").strip() == "2":
        s = float(input("Loudness (sones): "))
        print(f"  Loudness level = {sone_to_phon(s):.2f} phons")
    else:
        p = float(input("Loudness level (phons): "))
        print(f"  Loudness = {phon_to_sone(p):.3f} sones")


def _menu_psil():
    a = float(input("L at 500 Hz (dB): "))
    b = input("L at 1000 Hz (blank = same): ").strip()
    c = input("L at 2000 Hz (blank = same): ").strip()
    dist = float(input("Talker-listener distance (m) [1]: ") or 1)
    value, effort = psil(a, float(b) if b else None, float(c) if c else None, dist)
    print(f"  PSIL = {value:.2f} dB")
    print(f"  At {dist:g} m, voice effort: {effort}")


def _menu_sel():
    le = float(input("Leq (dB): "))
    T = float(input("Duration T (s): "))
    print(f"  SEL = {sel(le, T):.2f} dB")


def _menu_sort():
    vals = _floats("Enter four levels (space/comma separated):\n  > ")
    r = sort_stats(vals)
    for k in ("SEL", "L1", "Leq", "L99"):
        print(f"  {k:>3} = {r[k]:g} dB")


def _menu_table():
    print(f"  {'Freq(Hz)':>9} {'A':>7} {'B':>7} {'C':>7}")
    for f, a, b, c in WEIGHTING:
        print(f"  {f:>9g} {a:>7.1f} {b:>7.1f} {c:>7.1f}")


MENU = [
    ("Combine / add levels (octave bands, sources) -> total + RMS pressure", _menu_combine),
    ("N identical sources", _menu_identical),
    ("Increase when more sources added", _menu_increase),
    ("Subtract a source / background", _menu_subtract),
    ("Level of one of N identical sources", _menu_one_of_n),
    ("A/B/C weighting of bands -> dB(A)/dB(B)/dB(C)", _menu_weighting),
    ("Leq from levels & durations", _menu_leq),
    ("Leq from discrete events (pass-bys)", _menu_events),
    ("Noise dose & OH&S limits", _menu_dose),
    ("Loudness (phon <-> sone)", _menu_loud),
    ("Speech interference (PSIL)", _menu_psil),
    ("SEL from Leq & duration", _menu_sel),
    ("Sort 4 levels into SEL / L1 / Leq / L99", _menu_sort),
    ("A/B/C weighting reference table", _menu_table),
]


def main():
    print("=" * 64)
    print(" MECH9325 - Acoustics & Noise Control calculator (offline)")
    print("=" * 64)
    while True:
        print("\nChoose a calculator:")
        for i, (label, _) in enumerate(MENU, 1):
            print(f"  {i:>2}. {label}")
        print("   0. Quit")
        choice = input("\n> ").strip()
        if choice in ("0", "q", "quit", "exit"):
            break
        try:
            idx = int(choice)
            if not 1 <= idx <= len(MENU):
                raise ValueError
        except ValueError:
            print("  Invalid choice.")
            continue
        print()
        try:
            MENU[idx - 1][1]()
        except (ValueError, ZeroDivisionError) as e:
            print(f"  Error: {e}")
        except KeyboardInterrupt:
            print("\n  (cancelled)")


if __name__ == "__main__":
    main()
