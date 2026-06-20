import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "posterize",
  name: "Posterize / Grade",
  group: "Tone",
  desc: "Quantize into N color bands, plus gamma, contrast, brightness and saturation grading.",
};

export const params: ParamDef[] = [
  { name: "uLevels", type: "float", value: 5.0, min: 2.0, max: 16.0, step: 1.0, label: "Levels" },
  { name: "uGamma", type: "float", value: 1.0, min: 0.2, max: 3.0, step: 0.01, label: "Gamma" },
  { name: "uContrast", type: "float", value: 1.1, min: 0.0, max: 2.5, step: 0.01, label: "Contrast" },
  { name: "uBrightness", type: "float", value: 0.0, min: -0.5, max: 0.5, step: 0.01, label: "Brightness" },
  { name: "uSaturation", type: "float", value: 1.2, min: 0.0, max: 2.5, step: 0.01, label: "Saturation" },
];

export const core = /* glsl */ `
uniform float uLevels;
uniform float uGamma;
uniform float uContrast;
uniform float uBrightness;
uniform float uSaturation;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 c = texture(INPUT0, uv).rgb;
    c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.01)));
    float L = max(uLevels, 2.0);
    c = floor(c * (L - 1.0) + 0.5) / (L - 1.0);
    c = (c - 0.5) * uContrast + 0.5 + uBrightness;
    c = mix(vec3(luma(c)), c, uSaturation);
    return vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;
