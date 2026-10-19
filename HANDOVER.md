# Sinumerik Backplot · GROB — technical handover

Version 1.1 · October 2026 · derived from CNC Tools 3.41 · live: https://sosgrob.vercel.app
Application: `src/cnc-backplot.html` (single file, same layout and build as CNC Tools)

## 1. Scope

A public tool for GROB machining centres with a SINUMERIK 840D sl control. It does two things:

1. **Backplot** of Sinumerik programs (R parameters, DEF, IF/WHILE/FOR/REPEAT, GOTOF/GOTOB,
   frames TRANS/ROT/MIRROR/SCALE, CYCLE800, TRAORI, drilling cycles, subprograms), with playback,
   measure, DXF export, tools, machine limits, analytics and the right-click explanations.
2. **CL / CLS → Sinumerik program**: ESPRIT ListCL (`.lst`, `.cl`) and APT CLS (`.cls`), with
   Plot CL and Convert to Sinumerik.

## 2. Removed from CNC Tools 3.41

- Controls other than Sinumerik: the Control box is gone (fixed, hidden `#dialect = sinumerik`),
  every opened file is read as Sinumerik (`autoDialect`). File types: `.mpf .spf .nc .txt .lst .cl .cls`.
- Heidenhain Klartext and Heidenhain ISO execution in the interpreter (`execHH`, `execHHISO` and
  their helpers).
- App tabs Compare, Renumber, Transform (move origin, translate, rotate, scale, mirror, arcs to
  lines, I/J/K → R, feeds ± %, convert to another control) and the macro translator.
- Turning, mill-turn and the environment bar (process fixed to milling), the Lathe ZX view,
  "turning vs milling" colouring, the turning-tool STEP import (occt-import-js is no longer loaded).
- All examples for other controls. Three Sinumerik examples remain until the GROB samples arrive:
  contour and drilling, parametric macro, 3+2 with CYCLE800 (`GM_SAMPLES`, `loadSample`).

File size 1.10 MB → 0.44 MB, 29,160 → about 7,660 lines.

## 3. Still inside, not visible

- The CL path writes the CL as Fanuc-style G-code, reads it with the interpreter and writes
  Sinumerik with `convertProgram('sinumerik', …)`. The Fanuc/ISO reading stays for that reason.
  The ISO, Okuma and Heidenhain branches of `convertProgram` are no longer reachable from the UI;
  they can be cut once the CL path writes Sinumerik directly.
- Turning code inside the interpreter and the tool drawing (lathe cycles, inserts): unused with the
  process fixed to milling.

## 4. Checks done

Headless Chromium, against CNC Tools 3.41 with Control = Sinumerik:
- The three examples plot with the same move count and cycle time, no errors.
- Three test CLs (ESPRIT 3-axis with arcs, ESPRIT with a work frame / CYCLE800, APT 5-axis CLS):
  the converted Sinumerik text is identical character for character; Plot CL works.
- Tabs, playback, ▶T, views, mm/inch, no page errors.

## 5. Deployment

Same as CNC Tools (`build.js`, `protect.mjs`, `vercel.json`), in a new repository / Vercel project.
- Set `CNC_ALLOWED_HOSTS` to the new domain before the first protected build.
- `api/explain.mjs` has its own system prompt: change it to SINUMERIK 840D sl on GROB machines
  (the in-page prompt `AI_SYS` is already changed).

## 6. Open, needs the GROB samples (3-axis, 3+2, 5-axis)

- **Rotary axes A/B.** GROB 5-axis machines use A (swivel) and B (rotary table). The CL output
  and the tool-axis model still use B/C or A/C (`B0. C=DC(0.)` in the end block). The A/B
  kinematics and its sign convention come from the samples.
- **CYCLE800 data**: the swivel data record name (`_TC`, "TC1" now), `_MODE`, `_SPIND`, retract.
- **Start and end blocks**: home position, SUPA moves, tool change, coolant and M codes as the
  GROB post writes them; 5-axis: TRAORI and the orientation words.
- Replace `GM_SAMPLES` with the GROB samples.

## 7. Repository files (1.0)

`build.js`, `protect.mjs`, `api/explain.mjs`, `vercel.json` and `package.json` were rewritten for
this project from the CNC Tools description (handover 3.41), not copied:
- `protect.mjs`: default host `grob-backplot.vercel.app`; the lock is placed after the
  "use strict" directive so strict mode is kept.
- `api/explain.mjs`: system prompt for SINUMERIK 840D sl on GROB machines; returns 405 / 403 /
  501 / 400 / 413 as the page expects.
- `vercel.json`: Content-Security-Policy allows only the page itself and the Gemini API.
Tested: the protected build runs on localhost with the same results as the source; a copy on
another host and a file:// copy are refused.

## 8. Version 1.1 (October 2026)

**Address and protection**
- Site address: `https://sosgrob.vercel.app`. `protect.mjs` locks the page to it (plus localhost);
  every other host, Vercel preview URLs included, and saved copies show "This copy is not
  licensed to run here". `CNC_ALLOWED_HOSTS`, if set in Vercel, replaces this default.
- `api/explain.mjs` answers only requests from the allowed hosts (same list, same variable), so a
  preview deployment cannot use the Gemini key.

**Icon**
- New icon: a swivel cradle (A) with a rotary table (B) and a tilted tool. Inline SVG favicon,
  180 px apple-touch icon and `theme-color` in the page head; source files in `assets/`.

**GROB post: CL / CLS -> SINUMERIK** (`espritToGrob`, `aptToGrob`, section "GROB G-series post")
- Written from the GROB G550 sample (`GrobCLTEMP.LST` and its post output `Grob.nc`). On that CL the
  output has 17,074 lines: 16,393 identical to the post, 677 differ only in the last decimal
  (0.001 mm / 0.001 deg, the CL gives the rotary positions with 4 decimals), 5 differ in whether an
  A/B word repeats. No difference larger than 0.001.
- Kinematics (from the CL machine setup): A about -X (limits -185..45), B about -Y on A, tool along Z.
  Tool axis in G55: (cosA sinB, -sinA, cosA cosB). 3+2: `CYCLE800(0,"TC_GROB",200000,192,X0,Y0,Z0,A,B,0,0,0,0,1,,0)`
  with points in the frame Ra(A).Rb(B).(q - origin); 5-axis: `TRAORI`, X Y Z tool tip in G55, `A.. B=DC(..)`.
- Post rules reproduced: tool list in the header, `T="n"` with the tool comments, `G0 SUPA` home moves,
  CYCLE832 by operation (roughing 0.03 _SEMIFIN, finishing 0.008 _FINISH, 5-axis 0.008 _ORI_FINISH,
  contour and drilling none), G60/G64 around drilling, arcs split at the quadrants with I/J from the
  rounded centre and start, the unused block number after the spindle block, N restarting at 10.
- CLS (APT): GOTO, RAPID, FEDRAT, SPINDL, LOADTL / PPRINT TOOL NUMBER, CUTTER, COOLNT, TLAXIS,
  CIRCLE, UNITS/INCHES, `$` continuation. One tool axis per tool -> 3+2 (CYCLE800 direct), else TRAORI.
  Points are taken in G55. Not yet checked against a real CLS from your CAM.
- CL bar: "Plot CL" draws the GROB program, "Convert to Sinumerik" puts it in the editor (`.mpf`).

**Backplot**
- CYCLE800 MODE 192 (direct rotary positions) uses the GROB kinematics; checked: plotted 3+2 and
  drilling points land on the CL part points in G55.
- Tool axis "GROB A/B (table-table)" (default) for TRAORI.
- `T="5"` is tool 5; CYCLE832 with `_FINISH` / `_SEMIFIN` / `_ORI_FINISH` reads without errors;
  G60 / G9 accepted silently.
- Fit and the Min/Max box use the cutting moves, so the SUPA home moves no longer shrink the view.
