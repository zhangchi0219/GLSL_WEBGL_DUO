import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "gerstner",
  name: "Gerstner Waves",
  group: "Water",
  desc: "Directional ocean-style traveling waves (three summed crests) build a surface normal that refracts the image and adds a crest highlight. Analytic / single-pass.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uSpeed", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Speed" },
  { name: "uWavelength", type: "float", value: 0.4, min: 0.05, max: 1.5, step: 0.01, label: "Wavelength" },
  { name: "uSteepness", type: "float", value: 1.0, min: 0.0, max: 3.0, step: 0.01, label: "Steepness" },
  { name: "uDirection", type: "float", value: 30.0, min: 0.0, max: 360.0, step: 1.0, label: "Direction" },
  { name: "uStrength", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Refraction" },
  { name: "uHighlight", type: "float", value: 0.4, min: 0.0, max: 2.0, step: 0.01, label: "Crest Light" },
];

export const core = /* glsl */ `
uniform float uSpeed;
uniform float uWavelength;
uniform float uSteepness;
uniform float uDirection;
uniform float uStrength;
uniform float uHighlight;

float waveH(vec2 uv, vec2 res, float t){
    vec2 a = uv * vec2(res.x / res.y, 1.0);
    float ang = radians(uDirection);
    vec2 d1 = vec2(cos(ang), sin(ang));
    vec2 d2 = vec2(cos(ang + 0.6), sin(ang + 0.6));
    vec2 d3 = vec2(cos(ang - 0.5), sin(ang - 0.5));
    float k = 6.2831853 / max(uWavelength, 0.02);
    float h = 0.0;
    h +=        sin(dot(d1, a) * k       - t * 1.0);
    h += 0.6 *  sin(dot(d2, a) * k * 1.7 - t * 1.3);
    h += 0.4 *  sin(dot(d3, a) * k * 2.3 - t * 1.7);
    return h * uSteepness * 0.5;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float t = time * uSpeed;
    float eps = 1.5 / max(res.x, res.y);
    float hx = waveH(uv + vec2(eps, 0.0), res, t) - waveH(uv - vec2(eps, 0.0), res, t);
    float hy = waveH(uv + vec2(0.0, eps), res, t) - waveH(uv - vec2(0.0, eps), res, t);
    vec2 n = vec2(hx, hy) / (2.0 * eps);

    vec2 off = n * uStrength * 0.01;
    vec3 col;
    col.r = texture(INPUT0, uv + off * 1.02).r;
    col.g = texture(INPUT0, uv + off).g;
    col.b = texture(INPUT0, uv + off * 0.98).b;

    float spec = pow(clamp(0.5 + 0.5 * n.y / (1.0 + length(n)), 0.0, 1.0), 8.0);
    col += uHighlight * spec;
    return vec4(col, 1.0);
}
`;
