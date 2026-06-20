import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "halftone",
  name: "Halftone / Dot Screen",
  group: "Pixel",
  desc: "Print-style dot screen. Mono uses one angled grid with ink/paper; Color screens R/G/B at offset angles on black.",
};

export const params: ParamDef[] = [
  { name: "uScale", type: "float", value: 8.0, min: 2.0, max: 40.0, step: 0.5, label: "Dot Cell (px)" },
  { name: "uAngle", type: "float", value: 30.0, min: 0.0, max: 90.0, step: 1.0, label: "Screen Angle" },
  { name: "uColor", type: "bool", value: false, label: "Color (RGB screens)" },
  { name: "uInk", type: "color", value: [0.06, 0.05, 0.05], label: "Ink" },
  { name: "uPaper", type: "color", value: [0.93, 0.91, 0.84], label: "Paper" },
];

export const core = /* glsl */ `
uniform float uScale;
uniform float uAngle;
uniform float uColor;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
mat2 rot2(float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float dotMask(vec2 uv, vec2 res, float cellPx, float angle, float value){
    vec2 p = rot2(angle) * (uv * res);
    vec2 cell = mod(p, cellPx) / cellPx - 0.5;
    float d = length(cell) * 2.0;
    float r = sqrt(clamp(value, 0.0, 1.0));
    return smoothstep(r + 0.08, r - 0.08, d);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 src = texture(INPUT0, uv).rgb;
    float a = radians(uAngle);
    vec3 col;
    if (uColor > 0.5){
        float mr = dotMask(uv, res, uScale, a + radians(15.0), src.r);
        float mg = dotMask(uv, res, uScale, a + radians(75.0), src.g);
        float mb = dotMask(uv, res, uScale, a + radians(45.0), src.b);
        col = vec3(mr, mg, mb);
    } else {
        float m = dotMask(uv, res, uScale, a, 1.0 - luma(src));
        col = mix(uPaper, uInk, m);
    }
    return vec4(col, 1.0);
}
`;
