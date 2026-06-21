import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "refract",
  name: "Refraction Ripple",
  group: "Water",
  desc: "折射波纹 — interfering concentric ripples from three drifting centers refract the image through a water-like surface with chromatic dispersion. Analytic / single-pass.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uSpeed", type: "float", value: 1.0, min: 0.0, max: 5.0, step: 0.01, label: "Speed" },
  { name: "uFrequency", type: "float", value: 28.0, min: 2.0, max: 120.0, step: 1.0, label: "Frequency" },
  { name: "uAmplitude", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Amplitude" },
  { name: "uChroma", type: "float", value: 0.6, min: 0.0, max: 3.0, step: 0.01, label: "Chroma" },
];

export const core = /* glsl */ `
uniform float uSpeed;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uChroma;

float ripH(vec2 uv, vec2 res, float t){
    vec2 a = uv * vec2(res.x / res.y, 1.0);
    vec2 c1 = vec2(0.3, 0.4) + 0.12 * vec2(sin(t * 0.7), cos(t * 0.5));
    vec2 c2 = vec2(0.7, 0.6) + 0.12 * vec2(cos(t * 0.6), sin(t * 0.8));
    vec2 c3 = vec2(0.5, 0.2) + 0.12 * vec2(sin(t * 0.9), cos(t * 0.4));
    float h = 0.0;
    h += sin(length(a - c1) * uFrequency - t * 3.0);
    h += sin(length(a - c2) * uFrequency * 1.1 - t * 3.5);
    h += sin(length(a - c3) * uFrequency * 0.9 - t * 2.5);
    return h / 3.0;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float t = time * uSpeed;
    float eps = 1.5 / max(res.x, res.y);
    float hx = ripH(uv + vec2(eps, 0.0), res, t) - ripH(uv - vec2(eps, 0.0), res, t);
    float hy = ripH(uv + vec2(0.0, eps), res, t) - ripH(uv - vec2(0.0, eps), res, t);
    vec2 n = vec2(hx, hy) / (2.0 * eps);

    vec2 off = n * uAmplitude * 0.012;
    float ca = uChroma * 0.012;
    vec3 col;
    col.r = texture(INPUT0, uv + off * (1.0 + ca)).r;
    col.g = texture(INPUT0, uv + off).g;
    col.b = texture(INPUT0, uv + off * (1.0 - ca)).b;
    return vec4(col, 1.0);
}
`;
