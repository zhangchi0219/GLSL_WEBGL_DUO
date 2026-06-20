import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "dither",
  name: "Bitmap / Dither",
  group: "Pixel",
  desc: "Ordered (8×8 Bayer) dithering with per-channel quantization. Mono + ink/paper gives the classic 1-bit bitmap look.",
};

export const params: ParamDef[] = [
  { name: "uPixel", type: "float", value: 2.0, min: 1.0, max: 16.0, step: 1.0, label: "Pixel Size (px)" },
  { name: "uLevels", type: "float", value: 2.0, min: 2.0, max: 8.0, step: 1.0, label: "Levels / Channel" },
  { name: "uSpread", type: "float", value: 1.0, min: 0.0, max: 2.0, step: 0.01, label: "Dither Spread" },
  { name: "uMono", type: "bool", value: true, label: "Monochrome" },
  { name: "uUseInk", type: "bool", value: true, label: "Use Ink/Paper" },
  { name: "uInk", type: "color", value: [0.05, 0.05, 0.08], label: "Ink" },
  { name: "uPaper", type: "color", value: [0.92, 0.9, 0.82], label: "Paper" },
];

export const core = /* glsl */ `
uniform float uPixel;
uniform float uLevels;
uniform float uSpread;
uniform float uMono;
uniform float uUseInk;
uniform vec3  uInk;
uniform vec3  uPaper;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float Bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float Bayer4(vec2 a){ return Bayer2(0.5 * a) * 0.25 + Bayer2(a); }
float Bayer8(vec2 a){ return Bayer4(0.5 * a) * 0.25 + Bayer2(a); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    float px = max(uPixel, 1.0);
    vec2 grid = res / px;
    vec2 suv  = (floor(uv * grid) + 0.5) / grid;
    vec3 c = texture(INPUT0, suv).rgb;

    vec2 bp = floor(uv * res / px);
    float t = Bayer8(bp);
    float L = max(uLevels, 2.0);

    vec3 col;
    if (uMono > 0.5){
        float g = luma(c);
        g = floor(g * (L - 1.0) + (t - 0.5) * uSpread + 0.5) / (L - 1.0);
        g = clamp(g, 0.0, 1.0);
        col = (uUseInk > 0.5) ? mix(uPaper, uInk, g) : vec3(g);
    } else {
        col = floor(c * (L - 1.0) + (t - 0.5) * uSpread + 0.5) / (L - 1.0);
        col = clamp(col, 0.0, 1.0);
    }
    return vec4(col, 1.0);
}
`;
