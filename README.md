# GLSL Filter Lab — WebGL2 + TouchDesigner

Controllable GLSL image filters, delivered as **two synchronized targets from one shared core**:

- **`filters-preview.html`** — self-contained WebGL2 webapp. Open it in any browser (no install, no CDN, works offline). Upload an image (or use the built-in test card), pick a filter, tune the sliders live.
- **`td/*_td.glsl`** — one GLSL TOP file per filter for TouchDesigner. Each file's *shared core* is byte-identical to the matching filter in the webapp; only the platform wrapper differs.

## Filters

| Filter | WebGL filter id | TouchDesigner file |
|---|---|---|
| Mosaic / Pixelate (square or round cells) | `mosaic` | `td/mosaic_td.glsl` |
| Bitmap / Ordered Dither (8×8 Bayer, 1-bit + ink/paper) | `dither` | `td/dither_td.glsl` |
| Pixel Sort (single-pass approximation) | `pixelsort` | `td/pixelsort_td.glsl` |
| Halftone / Dot Screen (mono or RGB) | `halftone` | `td/halftone_td.glsl` |
| Chromatic Aberration (radial RGB split) | `chromatic` | `td/chromatic_td.glsl` |
| Posterize / Color Grade | `posterize` | `td/posterize_td.glsl` |
| Sobel Edge Detect / Outline | `sobel` | `td/sobel_td.glsl` |
| CRT / Scanlines (curve, mask, flicker) | `crt` | `td/crt_td.glsl` |
| Kuwahara (oil / painterly) | `kuwahara` | `td/kuwahara_td.glsl` |
| Glitch / Datamosh (animated) | `glitch` | `td/glitch_td.glsl` |
| ASCII Art (bit-coded glyphs) | `ascii` | `td/ascii_td.glsl` |
| Bloom / Glow (single-pass) | `bloom` | `td/bloom_td.glsl` |
| Blur (Gaussian / Box) | `blur` | `td/blur_td.glsl` |
| Sharpen (unsharp mask) | `sharpen` | `td/sharpen_td.glsl` |
| Voronoi Crystallize | `voronoi` | `td/voronoi_td.glsl` |
| Ripple Displace (animated) | `ripple` | `td/ripple_td.glsl` |
| Oilify (oil paint) | `oilify` | `td/oilify_td.glsl` |
| Gradient Map / Duotone LUT | `lut` | `td/lut_td.glsl` |
| Sketch (pencil + hatching) | `sketch` | `td/sketch_td.glsl` |

## Using in TouchDesigner

1. Create a **GLSL TOP**, set GLSL Version 4.60.
2. Paste a `td/<name>_td.glsl` file into the Pixel Shader.
3. Connect your source TOP to **Input 0**.
4. On the **Vectors page**, add the custom uniforms listed in that file's `TOUCHDESIGNER SETUP` comment block (copy the values you tuned in the browser).
5. `uTime` filters (`crt`, `glitch`) need `uTime` = expression `absTime.seconds`.
6. Use **8-bit fixed RGBA** pixel format to match the browser look.

## Notes

- **Pixel Sort** is a GPU approximation (a true sort is multi-pass). For a stronger result, loop it through a Feedback TOP in TD.
- **Bloom** is single-pass here so it runs in the preview; for big radii / 4K in TD the `bloom_td.glsl` comment block describes the cheaper native Blur-TOP composite chain.
- **Blur** caps at 8px radius (NxN kernel); for larger blurs use TD's separable Blur TOP.
- **Kuwahara / Oilify / Pixel Sort / Bloom / Blur** are the heavy ones — the browser preview is small; at 4K in TD, lower the radius/length or downres first.
- Adding a new filter: append an entry to the `FILTERS` array in `filters-preview.html` (the UI auto-generates), tune it, then copy the `core` into a new `td/<name>_td.glsl` using any existing TD file as the wrapper template.
