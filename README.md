# GLSL Filter Lab — WebGL2 + TouchDesigner

Controllable GLSL image filters delivered as **two synchronized targets from one shared core**:

- A **Vite + React + TypeScript** web app — live preview with image upload, a grouped filter picker, and an auto-generated parameter UI.
- **Nineteen TouchDesigner GLSL TOP exports** (`td/*_td.glsl`) — generated from the *same* core string the web app compiles, so they are byte-identical by construction.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — open in a browser
npm run build      # static dist/  (base: "./", deploys to any subpath)
npm run gen:td     # regenerate td/*.glsl from the filter modules
```

## Architecture

One generic shell + independent filter modules (see `webapp-build` architecture conventions).

```
src/
  filters/
    types.ts        FilterModule contract { meta, params, core }
    registry.ts     lazy import() per filter — add a filter = 1 module + 1 line
    <id>.ts ×19     the single source of truth: GLSL core + params + meta
  sims/
    types.ts        SimModule contract { buffers, step[], display } (stateful)
    waterRipple.ts  height-field ripple (rain + interactive variants)
    fluid.ts        full stable-fluids pipeline (10 passes + Jacobi solve)
  gl/
    renderer.ts     generic WebGL2 fullscreen-pass engine (filters)
    simRenderer.ts  generic multi-pass engine: ping-pong RGBA16F + pass schedule
    wrappers.ts     WebGL platform wrappers (filter + sim; INPUT0..N macros)
  td/wrapper.ts     wrapTD() (filters) + simTDFiles()/simBundle() (sim kernels)
  components/       Sidebar · Stage · ParamPanel · Controls
  hooks/            useRenderer.ts (filters) · useSimRenderer.ts (sims)
  lib/              testCard.ts (test image + download) · pointer.ts (shared input)
  styles/           tokens.css · base.css (studio-web-ui) · app.css
scripts/gen-td.ts   writes td/*.glsl + td/sims/<id>/* (run via `npm run gen:td`)
td/*.glsl           generated TouchDesigner filter files (committed)
td/sims/<id>/       per-pass sim kernels + NETWORK.md (committed)
```

**Single source of truth.** Each `src/filters/<id>.ts` exports one `core` GLSL string. The WebGL renderer compiles it directly; `wrapTD()` wraps that exact string for TouchDesigner. The same `wrapTD()` powers the in-app **"Download .glsl for TD"** button and the `npm run gen:td` batch — there is no second copy of any shader to keep in sync.

**Lazy modules.** The registry's `load: () => import("./<id>")` means each filter is its own chunk, fetched only when selected (the build shows one `<id>-*.js` per filter).

## Modules (25)

| Group | Filters |
|---|---|
| **Pixel** | Mosaic · Bitmap/Dither · Pixel Sort · Halftone · ASCII |
| **Tone** | Posterize/Grade · Gradient-Map LUT |
| **Stylize** | Sobel Edge · Kuwahara · Oilify · Sketch |
| **Optical** | CRT/Scanlines · Chromatic Aberration · Bloom · Blur · Sharpen |
| **Distort** | Voronoi Crystallize · Ripple · Glitch |
| **Water** | Caustic Water · Gerstner Waves · Refraction Ripple (折射波纹) — analytic, single-pass |
| **Simulation** | Raindrop Ripples · Interactive Ripple · 2D Fluid (Stable) — stateful, multi-pass |

## Using a filter in TouchDesigner

1. Create a **GLSL TOP** (GLSL Version 4.60), paste `td/<id>_td.glsl` into the Pixel Shader.
2. Connect your source TOP to **Input 0**.
3. On the **Vectors page** add the uniforms listed in that file's `TOUCHDESIGNER SETUP` block (copy the values you tuned in the browser).
4. Animated filters (`crt`, `glitch`, `ripple`, the Water group) need `uTime` = expression `absTime.seconds`.
5. Use **8-bit fixed RGBA** to match the browser look.

## Simulations (stateful)

The **Water** group (Caustic / Gerstner / Refraction) is analytic and single-pass —
it behaves exactly like the filters above (drop-in `td/<id>_td.glsl`).

The **Simulation** group is stateful (ping-pong feedback). In the web app, **drag
on the canvas** to inject ripples / fluid; the engine runs many passes per frame
(`src/gl/simRenderer.ts`). These cannot be a single TOP — they export to
`td/sims/<id>/` as one GLSL-TOP kernel per pass plus a **`NETWORK.md`** describing
the Feedback-TOP wiring (buffers, pass order, the 25× Jacobi pressure loop,
16-bit-float formats). The in-app "Download TD kernels" button bundles the same
files. The pass cores are the exact strings the web app runs.

## Notes

- **Pixel Sort** is a single-pass GPU approximation of a multi-pass sort; loop through a Feedback TOP for a stronger result.
- **Bloom** is single-pass here; for big radii / 4K the `bloom_td.glsl` note describes the native Blur-TOP composite chain.
- **Blur / Kuwahara / Oilify / Pixel Sort / Bloom** are the heavy ones — fine in the small preview, but lower radius/length or downres at 4K in TD.
- **2D Fluid** runs at half resolution with a 25-iteration pressure solve; it's the heaviest module. Lower the pressure retention / vorticity or downres if needed.
- **Adding a filter:** create `src/filters/<id>.ts` (export `meta`, `params`, `core`), add one line to `registry.ts`, then `npm run gen:td`. The UI and the TD export are automatic.
- **Adding a sim:** create `src/sims/<id>.ts` (export a `SimModule` with `buffers`/`step`/`display`), add a `kind:"sim"` registry line, then `npm run gen:td`.
- Fonts fall back to the system stack for offline / mainland-China reliability; drop woff2 into `public/fonts/` and uncomment the `@font-face` block in `base.css` for the full grotesque look.
