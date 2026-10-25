# Sinumerik Backplot · GROB — technical handover

Version 1.8 · 25 October 2026 · derived from CNC Tools 3.41 · live: https://sosgrob.vercel.app
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

## 9. Version 1.2 (October 2026): 3D model under the toolpath

- **3D model…** button (toolbar), or drop the file on the view: STEP (.step/.stp), IGES (.iges/.igs),
  STL (binary or ASCII), in mm. New tab **3D model**: placement, rotate X/Y/Z, move X/Y/Z,
  opacity, colour, Fit to model, Remove; checkbox **model** shows / hides it.
- STEP and IGES are read in the browser by occt-import-js 0.0.23 (OpenCascade, WebAssembly, about
  8 MB), loaded from cdn.jsdelivr.net the first time a STEP/IGES is opened. STL is read in the page.
  Nothing is uploaded anywhere: the model stays in the browser.
- Drawing: WebGL canvas `#mcv` under the toolpath canvas, with the same orthographic view (shaded,
  depth-tested). The toolpath is drawn over the model; lower the opacity to see moves behind it.
- Placement **Automatic**: when the plotted program comes from an ESPRIT CL, the model is put through
  the CL's machine setup matrix (part -> G55, the same transform as the toolpath), so a model exported
  in the ESPRIT part coordinates lands on the path. For a CLS, or a plain .mpf, the model is used as
  it is in the file (model zero = G55 zero). **As in the file** forces the latter. Checked: a box in
  the CL part frame lands exactly where the GROB conversion puts the part points.
- **Fit** includes the model when it is shown.
- `vercel.json` Content-Security-Policy: `script-src` now allows `https://cdn.jsdelivr.net`,
  `'wasm-unsafe-eval'` and `'unsafe-eval'` (the OpenCascade reader compiles code at run time),
  `connect-src` allows `https://cdn.jsdelivr.net` (the .wasm download). Tested with these headers on
  the protected build: STEP, IGES and STL open without CSP errors.

## 10. Version 1.2.2

- **Clear path** button (next to ▶ T): hides the toolpath drawn up to the current line, so only the
  moves after it are drawn as the simulation goes on. Click again (**Show all**) to bring it back;
  it also comes back by itself on a new Plot, on ⟲, or when the position goes back before the line
  where it was cleared. Works while playing. Code: `PATH_FROM`, `setPathFrom()`; `drawPaths`,
  the tool axes and the tool ghosts start at `PATH_FROM` (the fast cached drawing is used only when
  nothing is cleared).
- Fix: **Remove** on the 3D model tab clears the model from the view (the model canvas and the
  "model" checkbox were kept visible by the general `canvas` / `.chk` display rules).

## 11. Version 1.3: undock the simulation

- **⧉ Undock** (view toolbar) moves the simulation block `#simwrap` (view toolbar, 3D view with the
  model, transport, stats) into its own browser window, to put on a second monitor. The program,
  messages and the bottom tabs stay in the main window, which shows "The simulation is in its own
  window" with **Dock it back here** / **Show that window**. **Dock back** in the simulation window,
  or simply closing it, brings the block back. Closing the main page closes it too.
- How: `window.open('', 'gm_sim', 'popup')` on the same origin, the page's styles copied in, the
  elements moved with `adoptNode`, so listeners, the 2D canvas and the WebGL model keep working.
  `document.getElementById / querySelector / querySelectorAll` also look in that window while it is
  open; mouse-move / mouse-up / key-down are passed to the main window (orbit drag, Esc, Ctrl+F/S);
  Space plays / pauses there. Playback frames come from the simulation window (`simRAF`), so it keeps
  running when the main window is covered. The theme (body class) is mirrored.
- The browser must allow pop-ups for the site (a message in Events says so if it is blocked).
- Tested on the protected build with the Vercel security headers: undock, play, orbit, Space, theme,
  dock back, and closing the window.

## 12. Version 1.3.1: GROB kinematics only

- The tool-axis dropdown is gone: the view toolbar shows "Tool axis: GROB A/B". With TRAORI the
  tool axis is always computed from A and B with the GROB table-table kinematics
  (cosA.sinB, -sinA, cosA.cosB). The B/C, A/C and "from active plane" choices, and the hidden B/C - A/C
  choice of the CL bar, are removed (a hidden `#kin` select with the single value "ab" stays for the code).
- Dead code removed: the old ESPRIT -> generic G-code writer (`espritToNc`, G68.2), the APT -> B/C or
  A/C writer (`aptToNc`) and the convert-to-another-control writer (`convertProgram`, `planeCommands`,
  `CONV_TARGETS`). CL and CLS go only through the GROB post. About 1,000 lines less.
- Checked again: the GROB CL output is unchanged character for character, `Grob.nc` and the examples
  plot as before, the CLS path converts, the tool axis of a 3+2 frame matches the A/B formula.

## 13. Version 1.4: section view, compact keys

- **✂ Section** (view toolbar) opens a panel in the 3D view: plane X / Y / Z, position (slider or mm),
  Flip, "cut toolpath", "show plane", ✕ to close. The side above the position is removed (Flip keeps
  it instead). The model is cut in the WebGL shader (discard beyond the plane); its inside faces show
  in orange, which reads as the cut face, and the model is drawn opaque while cutting. The toolpath is
  clipped at the plane (segments cut exactly at the intersection; the cached fast drawing is skipped
  while cutting). The plane is drawn as a dashed amber frame. The panel moves with Undock.
- The "Control: SINUMERIK 840D sl" label is removed (the hidden `#dialect` select stays for the code).
- Compact keys: smaller padding and font for buttons, selects, switches, transport and tabs, for
  mouse / pen screens (`@media (pointer:fine)`); touch screens keep the bigger keys.

## 14. Version 1.4.1

- The "Tool axis: GROB A/B" label is removed from the view toolbar (the GROB A/B tool axis is still used).

## 15. Version 1.5: blank and material removal

- **▣ Blank…** (view toolbar) opens a menu: *Open blank file (STEP / IGES / STL)…*, *Block around the
  part*, *Cylinder around the part*. The 3D model tab has a **Blank** section: the same three, the
  allowance per side (mm), the cylinder axis (automatic = the shortest side, or X / Y / Z), show,
  opacity, colour, Remove. A blank from a file is placed like the part (CL part frame or as in the
  file); a generated blank is made around the part, or around the cutting moves when there is no part.
  The blank is drawn see-through (it does not hide the part or the path).
- **material removal** (toolbar switch, also in the 3D model tab with the detail Coarse / Normal / Fine
  = 120 / 180 / 260 cells on the longest side). The blank becomes a voxel grid (filled by casting
  columns through the blank's surface); every cutting move removes the cells inside the tool swept
  along it, with that move's tool axis, so 3-axis, 3+2 and 5-axis all cut. Tool shape from the Tools
  tab (diameter, corner radius; the cutting length is the tool length, at most 2 x diameter). Rapid
  moves and SUPA moves do not cut. The surface is rebuilt as cell faces: cut faces light blue, the
  untouched blank in its colour; the section view cuts it too. It follows the simulation: playing
  forward cuts incrementally (time-sliced, the page stays responsive), going back restarts from the
  blank. A new plot, a tool change in the Tools tab, or a new blank restarts it.
  Measured on the GROB sample (19,174 moves, 180 cells): about 1.2 s of cutting in total, 0.3 s per
  surface rebuild.
- Tool sizes from the ESPRIT CL (Tool Diameter, ChamferAngle/Tool Radius, Tool Length) go to the Tools
  tab when the CL is plotted / converted (they win over sizes guessed from comments; tools set by hand
  are kept). Note: the sample CL uses T5 for two different tools; the tool table holds one per number.
- Fix: playback in the undocked window did not advance (the frame time stamps of the other window run
  on that window's clock); the playback now times itself with `performance.now()`.

## 16. Version 1.6 (25 October 2026)

- **Blank and material removal removed** (everything from 1.5: the Blank button and menu, the blank
  section of the 3D model tab, the material-removal switch and the voxel code). The 3D view is back to
  the part model, the toolpath and the section view, as in 1.4.1.
- Kept from 1.5: tool sizes from the ESPRIT CL go to the Tools tab; the playback fix for the undocked
  window.
- **AI removed.** No Gemini, no API key, no `/api/explain`: `api/explain.mjs` is deleted, its entry in
  `vercel.json` is gone, the Content-Security-Policy no longer allows `generativelanguage.googleapis.com`,
  `GEMINI_API_KEY` / `GEMINI_MODEL` are no longer used (they can be deleted in Vercel). The right-click
  menu on a line now offers **Decode line N** (the offline meaning of each word and the machine state at
  that line, from the simulation), Show in the simulation, Copy line. Sections 5, 7 and 8 above that
  mention the AI function are out of date on this point.
- **Version stamp**: `APP_VERSION='1.6'`, shown in the header as "Version 1.6 · Last update: …"
  (the date and time are stamped by build.js at each build); also `<meta name="version">`.
- Checked: the GROB CL output is unchanged, Grob.nc and the examples plot without errors, the 3D model,
  section, undock with playback and Clear path work; the protected build runs on sosgrob.vercel.app
  with the security headers and refuses other hosts.

## 17. Version 1.7: collision check against the 3D model

- With a part model loaded, every move is checked against it (switch **collisions** in the view
  toolbar, with the count; settings in the 3D model tab → **Collision check**: on/off, tolerance
  (default 0.05 mm), holder Ø and length (default Ø40 × 60 mm, Ø 0 leaves it out), Go to the first).
- How: the model (placed as shown) is sampled into points on its surface, spacing about 1/450 of its
  size (0.35–2 mm, at most 2.5 million points), sorted into a grid. The tool profile of the Tools tab
  (cutting part up to the tool length, shank above) plus the holder is moved along each move with the
  move's tool axis, in steps of at most half the tool radius; a surface point inside the tool, beyond
  the tolerance, marks the move. Kinds: cutting part in the model on a feed move = **gouge**; shank or
  holder in the model = **shank / holder**; any rapid (or SUPA) move into the model = **rapid**.
- Shown: the lines get a red band in the editor; Messages lists them first ("line N: collision – …",
  click to go there); the moves are drawn red in 3D with a dot where the tool meets the model; an
  event gives the count and the first line. The check runs in slices after every plot, model load,
  placement change or tool change, with a progress figure, and does not block the page.
- STEP / IGES are now tessellated finer (bounding-box ratio 0.0008, 0.1 rad) so curved faces are
  closer to the true surface and finishing passes are not reported as gouges.
- Fixes: loading an example resets the CL part frame (a model was placed with the last CL's frame);
  1.6 had lost the key styles of the buttons when the AI panel styles were removed (restored).
- Times (headless test machine): basic example + model 2 s; the GROB sample (19,174 moves) with a box
  around the whole part (every move inside it, worst case) 15 s.

## 18. Version 1.8: exact collision check, no line menu

- **Exact collision check** (replaces the surface-point sampling of 1.7). The tool is built from convex
  solids: the cutting part by type (end mill = cylinder; ball = sphere + cylinder; bull nose = disc
  thickened by the corner radius + cylinder; drill / chamfer = cone + cylinder; other types: cones and
  cylinders from the tool profile), the shank (tool Ø, 3 × radius above the tool length) and the
  holder (Ø and length from the 3D model tab). Each solid is swept along the move (the swept solid
  is still convex: support point + the move where it points forward) and tested against every
  triangle near it with GJK (Gilbert-Johnson-Keerthi), an exact intersection test between convex
  shapes. Triangles are found through a grid of cells and a box test first.
- 5-axis moves: the tool axis is turned from the previous move's axis to this move's in steps of at
  most 0.25 deg (each step swept exactly with the mid axis).
- Tolerance: the tool is shrunk by the tolerance (radius, corner radius, tip raised), so touching the
  surface within the tolerance is not reported. Depth: for each touching triangle the largest shrink
  that still touches is found by halving to about 0.001 mm; the deepest is reported ("deep, more than
  R" when it is beyond the tool radius).
- Tested: GJK against brute force on 3,000 random tool / triangle / move cases, all agree. An end mill
  0.03 mm into a face (tolerance 0.05) is not reported, 0.06 mm is reported as 0.060 mm.
- Speed (headless test machine): basic example 0.3 s; the GROB sample with an 80,000-triangle model
  in the middle of every move (worst case) 18 s, in the background with a progress figure.
- **No questioning on lines**: the right-click menu on the program lines, the messages and the
  analytics graphs is removed with its decode panel; right-click gives the browser's normal menu.
