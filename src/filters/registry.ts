import type { FilterGroup, FilterModule } from "./types";

// Central registry. Each entry's `load` is a dynamic import() so a filter's code
// (its core + params) is fetched only when selected. Adding a filter = write the
// module + add one line here; the shell and renderer never change.
//
// The static id/name/group let the nav render before anything is loaded.
export interface RegistryEntry {
  id: string;
  name: string;
  group: FilterGroup;
  load: () => Promise<FilterModule>;
}

const mod = (m: { meta: FilterModule["meta"]; params: FilterModule["params"]; core: string }): FilterModule => ({
  meta: m.meta,
  params: m.params,
  core: m.core,
});

export const registry: RegistryEntry[] = [
  { id: "mosaic", name: "Mosaic / Pixelate", group: "Pixel", load: () => import("./mosaic").then(mod) },
  { id: "dither", name: "Bitmap / Dither", group: "Pixel", load: () => import("./dither").then(mod) },
  { id: "pixelsort", name: "Pixel Sort", group: "Pixel", load: () => import("./pixelsort").then(mod) },
  { id: "halftone", name: "Halftone / Dot Screen", group: "Pixel", load: () => import("./halftone").then(mod) },
  { id: "ascii", name: "ASCII Art", group: "Pixel", load: () => import("./ascii").then(mod) },

  { id: "posterize", name: "Posterize / Grade", group: "Tone", load: () => import("./posterize").then(mod) },
  { id: "lut", name: "Gradient Map LUT", group: "Tone", load: () => import("./lut").then(mod) },

  { id: "sobel", name: "Sobel Edge", group: "Stylize", load: () => import("./sobel").then(mod) },
  { id: "kuwahara", name: "Kuwahara (Oil)", group: "Stylize", load: () => import("./kuwahara").then(mod) },
  { id: "oilify", name: "Oilify (Oil Paint)", group: "Stylize", load: () => import("./oilify").then(mod) },
  { id: "sketch", name: "Sketch (Pencil)", group: "Stylize", load: () => import("./sketch").then(mod) },

  { id: "crt", name: "CRT / Scanlines", group: "Optical", load: () => import("./crt").then(mod) },
  { id: "chromatic", name: "Chromatic Aberration", group: "Optical", load: () => import("./chromatic").then(mod) },
  { id: "bloom", name: "Bloom / Glow", group: "Optical", load: () => import("./bloom").then(mod) },
  { id: "blur", name: "Blur (Gauss/Box)", group: "Optical", load: () => import("./blur").then(mod) },
  { id: "sharpen", name: "Sharpen", group: "Optical", load: () => import("./sharpen").then(mod) },

  { id: "voronoi", name: "Voronoi Crystallize", group: "Distort", load: () => import("./voronoi").then(mod) },
  { id: "ripple", name: "Ripple Displace", group: "Distort", load: () => import("./ripple").then(mod) },
  { id: "glitch", name: "Glitch / Datamosh", group: "Distort", load: () => import("./glitch").then(mod) },
];

export const GROUP_ORDER: FilterGroup[] = ["Pixel", "Tone", "Stylize", "Optical", "Distort"];
