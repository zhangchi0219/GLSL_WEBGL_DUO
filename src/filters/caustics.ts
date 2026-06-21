import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "caustics",
  name: "Caustic Water",
  group: "Water",
  desc: "Animated water surface: a summed-sine height field refracts the image (with chromatic dispersion) and adds moving caustic light bands. Analytic / single-pass.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uSpeed", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Speed" },
  { name: "uScale", type: "float", value: 1.0, min: 0.2, max: 4.0, step: 0.01, label: "Scale" },
  { name: "uStrength", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Refraction" },
  { name: "uCaustic", type: "float", value: 0.4, min: 0.0, max: 2.0, step: 0.01, label: "Caustic Light" },
  { name: "uChroma", type: "float", value: 0.5, min: 0.0, max: 3.0, step: 0.01, label: "Chroma" },
];

export const core = /* glsl */ `
uniform float uSpeed;
uniform float uScale;
uniform float uStrength;
uniform float uCaustic;
uniform float uChroma;

float waterH(vec2 uv, vec2 res, float t){
    vec2 p = (uv * vec2(res.x / res.y, 1.0)) * uScale * 8.0;
    float v = 0.0;
    v += sin(p.x + t);
    v += sin(p.y * 1.2 - t * 1.1);
    v += sin((p.x + p.y) * 0.8 + t * 0.7);
    v += sin(length(p - 4.0) * 1.3 - t * 1.4);
    return v * 0.25;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float t = time * uSpeed;
    float eps = 1.5 / max(res.x, res.y);
    float hx = waterH(uv + vec2(eps, 0.0), res, t) - waterH(uv - vec2(eps, 0.0), res, t);
    float hy = waterH(uv + vec2(0.0, eps), res, t) - waterH(uv - vec2(0.0, eps), res, t);
    vec2 n = vec2(hx, hy) / (2.0 * eps);

    vec2 off = n * uStrength * 0.01;
    float ca = uChroma * 0.01;
    vec3 col;
    col.r = texture(INPUT0, uv + off * (1.0 + ca)).r;
    col.g = texture(INPUT0, uv + off).g;
    col.b = texture(INPUT0, uv + off * (1.0 - ca)).b;

    float hb = waterH(uv, res, t);
    float c = pow(0.5 + 0.5 * sin(hb * 6.2831 * 2.0), 6.0);
    col += uCaustic * c;
    return vec4(col, 1.0);
}
`;
