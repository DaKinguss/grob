# Sinumerik Backplot · GROB — technical handover

Version 3.5 · 17 November 2026 · derived from CNC Tools 3.41 · live: https://sosgrob.vercel.app
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

## 19. Version 1.9: mouse options

- **🖱 Mouse** (view toolbar) opens a small menu: *reverse turning* (drag turns the view the other
  way), *reverse wheel zoom* (wheel up zooms out), *swap buttons* (left button moves the view, right
  button turns it). Middle button or Shift + drag always moves the view. The key lights up when an
  option is on. The choice is kept in the browser (localStorage key `gm_mouse`); reversed turning also
  applies to one-finger turning on touch screens.

## 20. Version 2.0: machine simulation

- **⚙ Machine…** (view toolbar) opens the machine files (STL or STEP, several at once). Groups are
  set from the file names and can be changed in the 3D model tab → Machine: *static* (rails, frame),
  *Z head* (the spindle head), *swivel A* (the cradle), *rotary B* (the table). For the files of
  9 November 2026: Head → Z head; Z-LeftRail, Z-RightRail → static; B-Axis (grey cradle) and
  A-Axis (orange ring under the table) → swivel A; Table (green) → rotary B. The switch **machine**
  shows / hides it. The files are kept in the browser (IndexedDB `gm_machine`) for the next visit;
  they are not part of the site or the repository.
- Geometry taken from the files: table centre on the table face = 0,0,0, spindle along Z, spindle
  nose (HSK face) at X -655, Y 0, Z 0 in the files; the A axis line along Y through X 0, Z 5 (the
  288 mm bearing circle of the cradle); B about the table normal through 0,0. The files show A -90,
  B 0 in the program's values (table facing the spindle). A range -180 … +45 in the program's values
  (= 90° one way and 135° the other from the table facing the spindle); Z home 1105 (spindle nose
  above the table face), as in the CL machine. All editable in the Machine section.
- Pose: from the program's tool tip (G55) and A, B: the table unit turns (B about the table normal,
  then A about the A line); the spindle nose goes to the tip + gauge length along Z (gauge length =
  tool length + shank 3 × radius + holder length of the collision check). "Head moves: Z only" (the
  default, as the head runs on the fixed Z rails): the head moves up / down, the table unit moves
  X / Y under the spindle. "X, Y, Z": the head moves in all three, the table unit only turns. SUPA
  moves send the head to Z home. The whole program frame (path, tool, part model, section plane) is
  drawn through the pose, so the path stays on the part as the table turns.
- G55 zero: by default on the table centre; set the offset (in G55 axes) in the Machine section.
- A outside its range: listed first in Messages and in an event after each plot.
- Not yet: collisions between machine parts (head / table / cradle) and with the tool; the machine
  axes' travel limits other than A.

## 21. Version 2.1: machine limits (GROB G550 data)

- Travels X 800 / Y 1020 / Z 970 mm: X -400 … 400, Y -370 … 650 (as in the CL machine), Z 135 … 1105
  (home 1105, 970 travel). Machine X / Y / Z are the spindle nose measured from the A / B rotation
  centre (both axes through 0,0,0, as in the CL machine): X along the A axis, Z along the spindle.
- Interference diameter 900 mm: the part model (or, without a model, the cutting points) must stay
  within 450 mm of the A axis and of the B axis. Tool length 465 mm (single-disk magazine): tool length
  + shank + holder of each tool. Rapid speeds 65 / 50 / 80 m/min are now the X / Y / Z rapid rates of the
  cycle time (Machine tab; the time estimate applies them to the program axes).
- **Machine check** after each plot (and **Check the program** in the Machine section): A range,
  travels, tool lengths, interference diameter; lines listed first in Messages, an event with the
  totals. The live machine X / Y / Z / A in the Machine section turns red when out of range. All limits
  are editable and kept with the machine.
- ESPRIT CL: the G55 zero is taken from the CL machine setup (MACHINE_SHIFT = the G55 zero from the
  rotation centre; for the sample 227.368 mm along the table normal, i.e. 232.368 mm above the table
  face). The sample program then stays inside all limits.
- SUPA home moves: the head stays at Z home through the rotary moves and the first linear move after
  them (the interpreter keeps the home values as program positions there).

## 22. Version 2.2: built-in machine, tool in the spindle

- The GROB G550 machine files (Head, Z-LeftRail, Z-RightRail, B-Axis, A-Axis, Table; 15 Nov 2026) are
  built into the page (`MACH_BUILTIN`): per part the vertices quantised to 16 bits over the part's box
  (error under 0.01 mm) and the triangles as indices, gzip + base64, about 410 KB; unpacked in the
  browser with DecompressionStream (all current browsers). The machine shows for every visitor
  without loading anything; **machine** switch on by default. The geometry is therefore public.
- Own files still work (**Open own machine files…**; they replace the built-in set and are kept in
  the browser); **Use the built-in GROB G550** goes back; **Remove the machine** hides it for good in
  that browser. Group / colour changes and the settings are kept.
- The tool stays in the spindle: in the machine view the tool is drawn from the spindle nose down by
  the gauge length (tool profile + holder Ø × length of the collision settings), also during home
  moves where the program position is not where the tool is. Gauge length = top of the tool profile
  + holder length.
- Page size: source 0.89 MB, protected build 1.06 MB (was 0.6 MB).

## 23. Version 2.3: better 3D and mouse control

- **Zoom at the cursor**: the point under the mouse stays where it is; the zoom step follows the wheel /
  touchpad amount (smooth on touchpads, limited per event).
- **Turn about the point under the cursor**: on pressing the turning button the nearest toolpath point
  within 40 px (else the point on the plane through the view centre) becomes the centre of turning,
  without moving the picture. Turning is a little slower (0.4°/px) for finer control.
- **Double-click**: centres the view on the point under the cursor.
- Both new options are on by default and can be switched off in the 🖱 Mouse menu (kept in the browser).
- **Smooth shading**: model and machine get averaged normals across faces within 30° (sharp edges
  stay sharp), and per-pixel light: key light, fill light and a soft highlight.
- **The tool in 3D**: the current tool (cutting part, shank and, in the machine view, the holder up to
  the spindle nose) is drawn with WebGL together with the part and the machine, so parts in front of
  it hide it correctly. Without WebGL the old 2D drawing is used; the tool ghosts stay 2D.

## 24. Version 2.4: standard views

- View keys: **3D** (isometric), **Top** (from +Z), **Bottom** (from -Z), **Front** (from -Y), **Back** (from +Y),
  **Left** (from -X), **Right** (from +X). Checked in the browser: in each view the X / Y / Z axes point the
  expected way on screen. The views are of the program axes (G55); in the machine view of the machine's
  own axes (Z = spindle).
- Turning with the mouse now goes all the way to ±180° (so Bottom can be turned from).

## 25. Version 2.5: programs start at home

- Every program starts with the machine at home: A 0, B 0, X / Y / Z home (X 0, Y 310, Z 1105, as in the
  CL machine; editable in the Machine section). The machine stands at home when no position is chosen
  (after a plot, after ⟲), and the first move of the program starts from there; SUPA moves send the
  table unit back to X / Y home and the head to Z home.
- Rotary-only moves (G0 A.. B=DC(..)) now turn smoothly during playback (the playback's own fraction is
  used; before, a move without X / Y / Z jumped to its end). B turns the short way.
- Reminder: A 0 is the table at 90° to the spindle (from the CL kinematics: A -90 = table facing the
  spindle, as the files show). If the real home looks like the files, set "files show A" to 0.

## 26. Version 2.6: operator view, machine drawn upright

- **👤 Operator** (view keys): the view of a person standing at the machine window: machine Y up, the
  spindle (Z) horizontal, pointing to the right, the table on the left (as in GROB's own pictures).
  Click it again for the other side. Without the machine it gives the same orientation in the program
  frame (Y up, Z to the right).
- **Upright** (Machine section, on by default): the machine is drawn as it stands in the shop. Display
  axes: X = machine X (the A axis), Y = -machine Z, Z = machine Y (up), so mouse turning is about the
  real vertical and Top / Front / Left… are the machine's own views. The machine model, the part, the
  tool, the path and the section plane all go through this frame (`machDR`, `machDisp`, `machXf`).
- `setViewBasis(right, up)` sets any view from two screen directions (also used for Operator without
  the machine).

## 27. Version 2.7: better quality of imported 3D models

- STEP / IGES are meshed much finer: chord 0.03 % of the model size and 3° on curved faces (was 0.08 %
  and 6°); the machine files read from STEP 0.05 % / 5°.
- The CAD reader's own surface normals are kept, so curved faces (cylinders, cones, fillets) shade
  smoothly and exactly; STL keeps the averaged normals (30° crease).
- **Edges**: the outline of the faces (edges between faces meeting at more than 25°, and open edges) is
  drawn as thin dark lines on the model and on the machine, for a clear CAD look; switch **edges** in
  the 3D model tab. Faces are drawn with a small depth offset so the lines sit cleanly on them.
- The model is now **opaque by default** (was 85 % see-through, which showed its own back faces through
  itself). Lower opacity still works and now shows only the nearest surface (depth pass first).

## 28. Version 2.8: move the part on the table

- **⇕ Part position** (view toolbar) opens a panel in the 3D view: **up / down** (along the table normal,
  G55 Y), **left / right** (G55 X, along the A axis) and **in / out** (G55 Z), each with − / + (one step)
  and « / » (five steps), a field to type the value, and the step (0.1 / 1 / 10 / 50 mm). **CL position**
  goes back to the position from the CL machine setup, **Table centre** puts the G55 zero on the table
  centre. It moves the part model and its toolpath together (the G55 zero on the table), as raising the
  part on a fixture would; the head and table follow. The machine check (travels, tool lengths,
  interference diameter) and the collision check run again a moment after the last change.
- The value is the "G55 zero from the table centre" of the Machine section (same setting) and is kept in
  the browser. A new CL places the part as its machine setup says; plotting the same CL again keeps the
  position you set.

## 29. Version 3.0: work offsets, tidier interface

- **Offsets** tab: G54 … G59, each with X Y Z (where the program zero sits from the table centre, on
  the table face, in the table's own axes: Y up from the table face at A 0, X along the A axis, Z along
  the spindle at A 0) and A B (rotary offsets: the machine turns to the programmed angle + this value,
  so G54 with A 90 runs the program's A 0 at machine A 90). The part is taken as set up at that table
  position (at the programmed A 0, B 0 its axes are the machine's). Each move uses the offset active in
  the program (G54…G59); offsets in the program are tagged, the one in use is highlighted; "0" clears a
  row, "CL" takes X Y Z from the CL. The machine pose, the A range check (now in machine angles), the
  travels and the interference check use them. Older saved settings: the single offset becomes G55.
- **Part position** edits the X Y Z of the offset in use (its title shows which).
- **Interface**: one toolbar row - **View ▾** (3D, Operator, Top, Bottom, Front, Back, Left, Right; the key
  shows the current view), **Fit**, **Show ▾** (machine, part model, collision check, rapid moves, tool,
  tool ghosts, tool axis, working plane, grid, colour), a red collision badge when there are collisions,
  **Measure**, **Section**, **Part position**, **Open ▾** (part model, machine files), and on the right
  the mouse settings and undock as small icon keys. Menus open under their key, close on a choice
  (views, open) or a click elsewhere / Esc; the Show switches stay open for several changes.
- Bottom tabs, on one line: Tools · Offsets · Machine (machine model, kinematics, limits) · Part model
  (part, collision check) · Feeds & ref. (the former Machine tab) · Planes & colours · Variables · Analytics.

## 30. Version 3.0.1: toolpath follows the table while playing

- Fix: during playback the toolpath was drawn from the cached picture (the fast drawing used while
  running), whose key did not include the machine pose, so the path stayed where it was while the
  table and the part model moved, and jumped into place on pause. With the machine shown the path is
  now drawn directly every frame (and the cache key includes the pose). Checked: 13 cached drawings
  in 2.5 s of playback before, none now; the path moves with the table.

## 31. Version 3.0.2: complex STEP models (blisks, impellers)

- 2.7 meshed STEP / IGES very finely (0.03 % / 3°). Free-form models such as a blisk then produced
  millions of triangles or ran the reader out of memory, and nothing was shown. Now **auto**: normal
  surfaces first (0.08 % / 6°); a small model (under 250,000 triangles) is meshed again fine, a very large
  one (over 1.8 million) lighter (draft 0.2 % / 14°); if the reader fails, it is restarted and the draft
  quality tried. The result and the quality used are in Events.
- Part model tab: **surfaces** auto / fine / normal / draft re-meshes the loaded STEP / IGES (the file is
  kept in memory for this).
- The collision mesh is kept in single precision (half the memory for big models).
- After loading a model the view always fits it in (before, with a program loaded, a model placed away
  from the toolpath could be off screen).
- Checked: a 1.66-million-triangle blisk-like STL loads and shows in 2 s; STEP auto / draft and the
  out-of-memory fallback tested.

## 32. Version 3.0.3: Find works again

- Fix: `gotoLine` still checked the app tabs removed in 1.0 (`APPTAB`, `showApp`) and stopped with an
  error, so **Find** found nothing (and clicking a message to go to its line, e.g. a collision, did not
  move either). The check is gone. Checked: Find (Enter / Shift+Enter, Prev / Next), tool-change jumps,
  "not found", and clicking a message all work.

## 33. Version 3.0.4: full check of every function, time stamp

- Code check (ESLint, browser globals, no-undef / no-redeclare) on the whole script: no undefined names
  left; two dead duplicate functions removed (an older `writeTo` and `saveProgramAs`; the later ones,
  which were the ones in use, stay).
- Functional sweep in the browser, 73 checks, all pass: examples, Plot, skip blocks, DXF export (dialog +
  download), Find (text, Enter / Shift+Enter, tool changes, close, Ctrl+F), play / pause / step / run to
  tool change / Clear path / slider / speed, every view, Fit, every Show switch and colour mode, every
  Measure mode, Section (X Y Z, flip, value, close), Mouse settings, wheel zoom / turn / double-click,
  mm / inch, dark / light, every tab and its controls (tools, offsets, machine, part model, feeds & ref.
  subtabs, planes, variables, analytics click), CL plot and conversion (unchanged output), machine on,
  machine check, machine settings, offsets A/B, part position, playback with the machine, part model
  (STL and STEP), collision check and its settings, model removal, undock / dock with playback, save
  functions, rewind. The protected build was also run on sosgrob.vercel.app with the security headers.
- Time stamp: the header shows "Version 3.0.4 · Last update: <date, time>". The source carries the time
  of this release; every Vercel build stamps its own build time (build.js), so the live site shows when
  it was last deployed.

## 34. Version 3.0.5: axis limits

- A -185 … +45, Y -510 … +510, B no limit (shown as such in the Machine tab; B is never checked).
  Settings saved by an older version get these A and Y limits once (`limVer` 2); other own changes stay.
- X -400 … +400 and Z 135 … 1105 are still provisional (X: 800 mm travel taken symmetric about the A / B
  rotation centre; Z: home 1105 from the CL machine, 970 mm travel). Machine X / Y / Z are measured from
  the spindle nose to the A / B rotation centre. Needed to set them exactly: the X positions at both
  ends of travel relative to the table centre, and the distance from the spindle nose to the table
  face (with A -90, table facing the spindle) at Z min and at Z max - or the same from the machine
  manual / the control's machine data.
- The GROB sample CL stays inside all limits.

## 35. Version 3.1: machine covers

- Three fixed covers added to the built-in GROB G550 (17 Nov 2026 files): TopCover, BottomCover,
  HeadCover (the last one had no file extension; it is a binary STL "esprit STL part"). Group *static*,
  light grey. Built-in machine now 9 parts, 436 KB packed.
- **Show ▾ → machine covers**: switch the covers off to look inside (any machine part whose name holds
  "cover" or "guard"). The switch shows only when the machine has covers.
- Full functional sweep repeated: 73 checks pass.

## 36. Version 3.1.1

- The view key is always named **Views ▾**; the view in use is marked in its list and named in the
  key's tooltip. Full sweep repeated: 73 checks pass.

## 37. Version 3.1.2: the built-in machine with all 9 parts always shows

- All machine files sent are built in: Head, Z-LeftRail, Z-RightRail, B-Axis, A-Axis, Table, TopCover,
  BottomCover, HeadCover. A browser that had loaded the first six as its own files (version 2.0, before
  the machine was built in) kept showing those six, without the covers. Now own files kept in the browser
  that are all part of the built-in set give way to the built-in machine (their groups and colours carried
  over), with a note in Events. Other own machine files are still used. Full sweep: 73 checks pass.

## 38. Version 3.2: X and Z on the head

- GROB G550: X and Z are on the head, Y on the table unit (as in the CL machine: X, Z tool-linear, Y
  table-linear). New head mode **X and Z (table unit moves Y)**, now the default: the head moves along
  machine X (along the A axis) and Z (spindle), the table unit only along machine Y (and turns A / B).
  The other modes stay selectable in the Machine tab. Saved settings switch to the new mode once
  (`limVer` 3). Machine X / Y / Z values and all checks are unchanged (they do not depend on which side
  moves). Checked: the tool tip stays under the spindle nose at the gauge length at every pose; the GROB
  sample stays inside all limits; full sweep 73 checks pass.

## 39. Version 3.3: jog the axes

- **✥ Jog** (view toolbar) opens a panel to move the machine by hand: a slider for each of X, Y, Z, A, B
  (range = the machine limits; B 0…360), − / + (one step) and « / » (five steps), a field to type the value,
  the step (0.1 / 1 / 10 / 50 mm or °), **From program** (the position at the current line) and **Home**.
  Cursor keys while it is open: ← → X, ↑ ↓ Y, PgUp PgDn Z, Shift + ← → B, Shift + ↑ ↓ A. The machine
  stops at its limits (typed or slid values beyond them are clamped). The part and its toolpath go with
  the table (the work offset in use); the tool hangs in the spindle. Opening it starts from the current
  position (no jump); playing a program closes it.
- `machPoseFromAxes(X,Y,Z,A,B)` builds the pose from axis positions; checked against the program pose
  at four positions in all three head modes: identical. Full sweep 74 checks pass.

## 40. Version 3.4: the Z rails ride on the X carriage

- New machine group **X carriage (Z rails)**: moves with the head's X (and Y in the "X, Y, Z" head mode),
  never with Z. Z-LeftRail and Z-RightRail are in it (built-in machine; own files with "rail" in the name
  too). So: Z moves only the head on the rails; X moves the rails and the head together; Y moves the
  table unit. Saved settings that kept the rails "static" switch once (`limVer` 4). Checked with Jog:
  Z 600 → only the head moves; X 200 → rails and head move 200; Y → neither. Full sweep 74 checks pass.

## 41. Version 3.4.1: movable panels

- The Jog panel (and the Part position and Section panels) can be dragged by their title row anywhere
  inside the 3D view; they stay inside it. The place is kept in the browser (`gm_panels`) and used when
  the panel opens again; double-click the title row to put it back. Full sweep 74 checks pass.

## 42. Version 3.4.2: Z travel 85 … 1105 from the table face

- Machine Z is now the distance from the spindle nose to the table face with the table facing the
  spindle (A -90): Z 85 = the closest the head can come, Z 1105 = home / top (as in the CL machine).
  X and Y stay measured from the A / B rotation centre. Z limits 85 … 1105 (saved 135 becomes 85 once,
  `limVer` 5). Checked with Jog: A -90, Z 85 → 85.00 mm between the nose and the table face; Z cannot go
  below 85; program pose and axis pose agree; the GROB sample stays inside all limits. Sweep 74 / 74.
- Still open: X (−400 … +400 assumed symmetric about the table centre).

## 43. Version 3.5: turn and move without a mouse

- **Navigation pad** in the 3D view (bottom left, draggable by its ⠿ grip, kept where you leave it):
  ◀ ▲ ▼ ▶ turn, ← ↑ ↓ → move, + − zoom, ⌖ fit; hold a key to keep turning / moving. Show ▾ →
  "navigation pad" hides it (kept in the browser). The Part position panel now opens above it.
- **Keyboard** (when not typing in the editor or a field, and Jog is closed): arrows turn, Shift + arrows
  move, + / − zoom, Home fits. With Jog open the arrows still jog the axes.
- **Touchpad mode** (🖱 menu): two-finger swipe turns, Shift + two fingers moves, pinch zooms (a pinch
  always zooms, also without the mode). Touch screens keep one finger to turn, two to zoom / move.
- Full sweep: 75 checks pass.
