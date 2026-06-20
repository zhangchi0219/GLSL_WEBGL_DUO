import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "chromatic",
  name: "Chromatic Aberration",
  group: "Optical",
  desc: "Radial RGB split from a center point, growing with distance. Optional lens vignette.",
};

export const params: ParamDef[] = [
  { name: "uAmount", type: "float", value: 0.4, min: 0.0, max: 2.0, step: 0.01, label: "Amount" },
  { name: "uFalloff", type: "float", value: 1.5, min: 0.0, max: 4.0, step: 0.05, label: "Edge Falloff" },
  { name: "uCenter", type: "vec2", value: [0.5, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "Center" },
  { name: "uVignette", type: "float", value: 0.3, min: 0.0, max: 2.0, step: 0.01, label: "Vignette" },
];

export const core = /* glsl */ `
uniform float uAmount;
uniform float uFalloff;
uniform vec2  uCenter;
uniform float uVignette;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 dir  = uv - uCenter;
    float dist = length(dir);
    vec2 off = dir * pow(dist, uFalloff) * uAmount * 0.08;
    float r = texture(INPUT0, uv + off).r;
    float g = texture(INPUT0, uv).g;
    float b = texture(INPUT0, uv - off).b;
    vec3 col = vec3(r, g, b);
    col *= 1.0 - uVignette * dist * dist;
    return vec4(col, 1.0);
}
`;
