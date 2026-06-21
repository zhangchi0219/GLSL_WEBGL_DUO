// Shared filter contract. Every filter module exports `meta`, `params`, `core`.
// The `core` GLSL string is the single source of truth: the WebGL2 renderer and
// the TouchDesigner export both consume it unchanged.

export type ParamType = "float" | "vec2" | "color" | "bool";

export interface ParamDef {
  name: string;                       // uniform name (u-prefixed), identical across both targets
  type: ParamType;
  value: number | number[] | boolean; // default
  min?: number;
  max?: number;
  step?: number;
  label: string;                      // UI label / TD setup comment
}

export type FilterGroup = "Pixel" | "Tone" | "Stylize" | "Optical" | "Distort" | "Water" | "Simulation";

export interface FilterMeta {
  id: string;
  name: string;
  group: FilterGroup;
  desc: string;
  animated?: boolean;                 // uses uTime → TD wires absTime.seconds
  heavy?: boolean;                    // many taps/pixel → perf note
  tdNote?: string;                    // extra lines appended to the TD setup block
}

export interface FilterModule {
  meta: FilterMeta;
  params: ParamDef[];
  core: string;
}

export type ParamState = Record<string, number | number[] | boolean>;

export function defaultState(params: ParamDef[]): ParamState {
  const s: ParamState = {};
  for (const p of params) s[p.name] = Array.isArray(p.value) ? [...p.value] : p.value;
  return s;
}
