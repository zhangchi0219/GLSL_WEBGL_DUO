import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "mosaic",
  name: "Mosaic / Pixelate",
  group: "Pixel",
  desc: "Quantize UVs into a grid of blocks. Roundness turns cells into dots on a backing color.",
};

export const params: ParamDef[] = [
  { name: "uBlock", type: "float", value: 16.0, min: 1.0, max: 120.0, step: 1.0, label: "Block Size (px)" },
  { name: "uRound", type: "float", value: 0.0, min: 0.0, max: 1.4, step: 0.01, label: "Roundness (0=square)" },
  { name: "uBg", type: "color", value: [0.04, 0.04, 0.04], label: "Gap Color" },
];

export const core = /* glsl */ `
uniform float uBlock;
uniform float uRound;
uniform vec3  uBg;

vec4 renderMain(vec2 uv, vec2 res, float time){
    float bs = max(uBlock, 1.0);
    vec2 grid = res / bs;
    vec2 cell = floor(uv * grid);
    vec2 cuv  = (cell + 0.5) / grid;
    vec3 c = texture(INPUT0, cuv).rgb;
    if (uRound > 0.001){
        vec2 f = fract(uv * grid) - 0.5;
        float d = length(f) * 2.0;
        float m = smoothstep(uRound, uRound - 0.12, d);
        c = mix(uBg, c, m);
    }
    return vec4(c, 1.0);
}
`;
