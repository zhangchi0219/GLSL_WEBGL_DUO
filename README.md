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
  gl/
    renderer.ts     generic WebGL2 fullscreen-pass engine (no per-filter state)
    wrappers.ts     WebGL platform wrapper (uTime/uResolution/uMouse, INPUT0 macro)
  td/wrapper.ts     wrapTD(module) → TouchDesigner .glsl + setup block
  components/       Sidebar · Stage · ParamPanel · Controls
  hooks/useRenderer.ts   Renderer lifecycle + rAF loop
  lib/testCard.ts   built-in test image + download helper
  styles/           tokens.css · base.css (studio-web-ui) · app.css
scripts/gen-td.ts   writes td/*.glsl (run via `npm run gen:td`)
td/*.glsl           generated TouchDesigner files (committed)
```

**Single source of truth.** Each `src/filters/<id>.ts` exports one `core` GLSL string. The WebGL renderer compiles it directly; `wrapTD()` wraps that exact string for TouchDesigner. The same `wrapTD()` powers the in-app **"Download .glsl for TD"** button and the `npm run gen:td` batch — there is no second copy of any shader to keep in sync.

**Lazy modules.** The registry's `load: () => import("./<id>")` means each filter is its own chunk, fetched only when selected (the build shows one `<id>-*.js` per filter).

## Filters (19)

| Group | Filters |
|---|---|
| **Pixel** | Mosaic · Bitmap/Dither · Pixel Sort · Halftone · ASCII |
| **Tone** | Posterize/Grade · Gradient-Map LUT |
| **Stylize** | Sobel Edge · Kuwahara · Oilify · Sketch |
| **Optical** | CRT/Scanlines · Chromatic Aberration · Bloom · Blur · Sharpen |
| **Distort** | Voronoi Crystallize · Ripple · Glitch |

## Using a filter in TouchDesigner

1. Create a **GLSL TOP** (GLSL Version 4.60), paste `td/<id>_td.glsl` into the Pixel Shader.
2. Connect your source TOP to **Input 0**.
3. On the **Vectors page** add the uniforms listed in that file's `TOUCHDESIGNER SETUP` block (copy the values you tuned in the browser).
4. Animated filters (`crt`, `glitch`, `ripple`) need `uTime` = expression `absTime.seconds`.
5. Use **8-bit fixed RGBA** to match the browser look.

## Notes

- **Pixel Sort** is a single-pass GPU approximation of a multi-pass sort; loop through a Feedback TOP for a stronger result.
- **Bloom** is single-pass here; for big radii / 4K the `bloom_td.glsl` note describes the native Blur-TOP composite chain.
- **Blur / Kuwahara / Oilify / Pixel Sort / Bloom** are the heavy ones — fine in the small preview, but lower radius/length or downres at 4K in TD.
- **Adding a filter:** create `src/filters/<id>.ts` (export `meta`, `params`, `core`), add one line to `registry.ts`, then `npm run gen:td`. The UI and the TD export are automatic.
- Fonts fall back to the system stack for offline / mainland-China reliability; drop woff2 into `public/fonts/` and uncomment the `@font-face` block in `base.css` for the full grotesque look.
