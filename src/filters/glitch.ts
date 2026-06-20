import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "glitch",
  name: "Glitch / Datamosh",
  group: "Distort",
  desc: "Time-driven horizontal block displacement, RGB channel shift and scanline noise.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uIntensity", type: "float", value: 0.4, min: 0.0, max: 1.0, step: 0.01, label: "Intensity" },
  { name: "uBlock", type: "float", value: 24.0, min: 2.0, max: 120.0, step: 1.0, label: "Block Height (px)" },
  { name: "uSpeed", type: "float", value: 1.0, min: 0.0, max: 6.0, step: 0.01, label: "Speed" },
  { name: "uColorShift", type: "float", value: 0.5, min: 0.0, max: 3.0, step: 0.01, label: "Color Shift" },
  { name: "uScanNoise", type: "float", value: 0.3, min: 0.0, max: 1.0, step: 0.01, label: "Scan Noise" },
];

export const core = /* glsl */ `
uniform float uIntensity;
uniform float uBlock;
uniform float uSpeed;
uniform float uColorShift;
uniform float uScanNoise;

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    float tq = floor(time * uSpeed * 12.0);

    float row = floor(uv.y * res.y / max(uBlock, 1.0));
    float n = hash21(vec2(row, tq));
    float shift = 0.0;
    if (n > 1.0 - uIntensity)
        shift = (hash21(vec2(row, tq + 7.0)) - 0.5) * uIntensity * 0.25;

    vec2 guv = uv + vec2(shift, 0.0);
    float cs = uColorShift * texel.x * 18.0 * (0.5 + n);
    vec3 col;
    col.r = texture(INPUT0, guv + vec2(cs, 0.0)).r;
    col.g = texture(INPUT0, guv).g;
    col.b = texture(INPUT0, guv - vec2(cs, 0.0)).b;

    float sn = hash21(vec2(floor(uv.y * res.y), tq));
    if (sn > 1.0 - uScanNoise * 0.25)
        col += (hash21(vec2(uv.x * res.x, tq)) - 0.5) * 0.6;

    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
