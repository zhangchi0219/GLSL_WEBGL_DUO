import type { FilterGroup, FilterModule } from "./types";
import type { SimModule } from "../sims/types";

// Central registry. Each entry's `load` is a dynamic import() so a module's code
// is fetched only when selected. Adding one = write the module + add a line here;
// the shell and renderers never change. Static id/name/group/kind let the nav
// render before anything loads; `kind` tells the shell which engine to mount.
export interface FilterEntry {
  kind: "filter";
  id: string;
  name: string;
  group: FilterGroup;
  load: () => Promise<FilterModule>;
}
export interface SimEntry {
  kind: "sim";
  id: string;
  name: string;
  group: FilterGroup;
  load: () => Promise<SimModule>;
}
export type RegistryEntry = FilterEntry | SimEntry;

const f = (m: { meta: FilterModule["meta"]; params: FilterModule["params"]; core: string }): FilterModule => ({
  meta: m.meta,
  params: m.params,
  core: m.core,
});

export const registry: RegistryEntry[] = [
  { kind: "filter", id: "mosaic", name: "Mosaic / Pixelate", group: "Pixel", load: () => import("./mosaic").then(f) },
  { kind: "filter", id: "dither", name: "Bitmap / Dither", group: "Pixel", load: () => import("./dither").then(f) },
  { kind: "filter", id: "pixelsort", name: "Pixel Sort", group: "Pixel", load: () => import("./pixelsort").then(f) },
  { kind: "filter", id: "halftone", name: "Halftone / Dot Screen", group: "Pixel", load: () => import("./halftone").then(f) },
  { kind: "filter", id: "ascii", name: "ASCII Art", group: "Pixel", load: () => import("./ascii").then(f) },

  { kind: "filter", id: "posterize", name: "Posterize / Grade", group: "Tone", load: () => import("./posterize").then(f) },
  { kind: "filter", id: "lut", name: "Gradient Map LUT", group: "Tone", load: () => import("./lut").then(f) },

  { kind: "filter", id: "sobel", name: "Sobel Edge", group: "Stylize", load: () => import("./sobel").then(f) },
  { kind: "filter", id: "kuwahara", name: "Kuwahara (Oil)", group: "Stylize", load: () => import("./kuwahara").then(f) },
  { kind: "filter", id: "oilify", name: "Oilify (Oil Paint)", group: "Stylize", load: () => import("./oilify").then(f) },
  { kind: "filter", id: "sketch", name: "Sketch (Pencil)", group: "Stylize", load: () => import("./sketch").then(f) },

  { kind: "filter", id: "crt", name: "CRT / Scanlines", group: "Optical", load: () => import("./crt").then(f) },
  { kind: "filter", id: "chromatic", name: "Chromatic Aberration", group: "Optical", load: () => import("./chromatic").then(f) },
  { kind: "filter", id: "bloom", name: "Bloom / Glow", group: "Optical", load: () => import("./bloom").then(f) },
  { kind: "filter", id: "blur", name: "Blur (Gauss/Box)", group: "Optical", load: () => import("./blur").then(f) },
  { kind: "filter", id: "sharpen", name: "Sharpen", group: "Optical", load: () => import("./sharpen").then(f) },

  { kind: "filter", id: "voronoi", name: "Voronoi Crystallize", group: "Distort", load: () => import("./voronoi").then(f) },
  { kind: "filter", id: "ripple", name: "Ripple Displace", group: "Distort", load: () => import("./ripple").then(f) },
  { kind: "filter", id: "glitch", name: "Glitch / Datamosh", group: "Distort", load: () => import("./glitch").then(f) },

  { kind: "filter", id: "caustics", name: "Caustic Water", group: "Water", load: () => import("./caustics").then(f) },
  { kind: "filter", id: "gerstner", name: "Gerstner Waves", group: "Water", load: () => import("./gerstner").then(f) },
  { kind: "filter", id: "refract", name: "Refraction Ripple", group: "Water", load: () => import("./refract").then(f) },

  { kind: "sim", id: "ripple-rain", name: "Raindrop Ripples", group: "Simulation", load: () => import("../sims/waterRipple").then((m) => m.rain) },
  { kind: "sim", id: "ripple-pointer", name: "Interactive Ripple", group: "Simulation", load: () => import("../sims/waterRipple").then((m) => m.pointer) },
  { kind: "sim", id: "fluid", name: "2D Fluid (Stable)", group: "Simulation", load: () => import("../sims/fluid").then((m) => m.fluid) },
];

export const GROUP_ORDER: FilterGroup[] = [
  "Pixel", "Tone", "Stylize", "Optical", "Distort", "Water", "Simulation",
];
