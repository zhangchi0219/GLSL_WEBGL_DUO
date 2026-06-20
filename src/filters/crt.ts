import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "crt",
  name: "CRT / Scanlines",
  group: "Optical",
  desc: "Barrel curvature, scanlines, RGB aperture mask, edge aberration, vignette and a subtle flicker.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uCurvature", type: "float", value: 0.15, min: 0.0, max: 0.6, step: 0.01, label: "Curvature" },
  { name: "uScanline", type: "float", value: 2.0, min: 1.0, max: 8.0, step: 0.5, label: "Scanline Period" },
  { name: "uScanDepth", type: "float", value: 0.4, min: 0.0, max: 1.0, step: 0.01, label: "Scanline Depth" },
  { name: "uMaskDepth", type: "float", value: 0.3, min: 0.0, max: 1.0, step: 0.01, label: "RGB Mask" },
  { name: "uAberration", type: "float", value: 0.4, min: 0.0, max: 3.0, step: 0.01, label: "Aberration" },
  { name: "uVignette", type: "float", value: 0.5, min: 0.0, max: 2.0, step: 0.01, label: "Vignette" },
  { name: "uFlicker", type: "float", value: 0.1, min: 0.0, max: 1.0, step: 0.01, label: "Flicker" },
];

export const core = /* glsl */ `
uniform float uCurvature;
uniform float uScanline;
uniform float uScanDepth;
uniform float uMaskDepth;
uniform float uAberration;
uniform float uVignette;
uniform float uFlicker;

vec2 crtCurve(vec2 uv, float k){
    uv = uv * 2.0 - 1.0;
    vec2 offset = uv.yx * uv.yx * k;
    uv += uv * offset;
    return uv * 0.5 + 0.5;
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 cuv = crtCurve(uv, uCurvature);
    if (cuv.x < 0.0 || cuv.x > 1.0 || cuv.y < 0.0 || cuv.y > 1.0)
        return vec4(0.0, 0.0, 0.0, 1.0);

    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    float ab = uAberration * texel.x * 6.0;
    vec3 col;
    col.r = texture(INPUT0, cuv + vec2(ab, 0.0)).r;
    col.g = texture(INPUT0, cuv).g;
    col.b = texture(INPUT0, cuv - vec2(ab, 0.0)).b;

    float line = 0.5 + 0.5 * sin(cuv.y * res.y * 3.14159265 / max(uScanline, 1.0));
    col *= mix(1.0, line, uScanDepth);

    float m = mod(floor(cuv.x * res.x), 3.0);
    vec3 mask = vec3(m == 0.0 ? 1.0 : 0.55, m == 1.0 ? 1.0 : 0.55, m == 2.0 ? 1.0 : 0.55);
    col *= mix(vec3(1.0), mask, uMaskDepth);

    col *= 1.0 + uFlicker * 0.12 * (fract(sin(time * 91.7) * 4731.3) - 0.5);

    vec2 d = cuv - 0.5;
    col *= 1.0 - uVignette * dot(d, d);

    return vec4(col, 1.0);
}
`;
