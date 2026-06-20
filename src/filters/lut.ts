import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "lut",
  name: "Gradient Map LUT",
  group: "Tone",
  desc: "Color-grade by mapping luminance through a shadow/mid/highlight gradient (duotone/tritone LUT). Optional posterize for hard tonal separation.",
};

export const params: ParamDef[] = [
  { name: "uLevels", type: "float", value: 1.0, min: 1.0, max: 12.0, step: 1.0, label: "Posterize (1=off)" },
  { name: "uShadow", type: "color", value: [0.1, 0.05, 0.2], label: "Shadows" },
  { name: "uMid", type: "color", value: [0.8, 0.25, 0.3], label: "Midtones" },
  { name: "uHigh", type: "color", value: [0.98, 0.9, 0.55], label: "Highlights" },
  { name: "uMix", type: "float", value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: "Mix" },
];

export const core = /* glsl */ `
uniform float uLevels;
uniform vec3  uShadow;
uniform vec3  uMid;
uniform vec3  uHigh;
uniform float uMix;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 src = texture(INPUT0, uv).rgb;
    float g = luma(src);
    if (uLevels > 1.5){ float L = uLevels; g = floor(g * (L - 1.0) + 0.5) / (L - 1.0); }
    vec3 grad = (g < 0.5) ? mix(uShadow, uMid, g * 2.0)
                          : mix(uMid, uHigh, (g - 0.5) * 2.0);
    return vec4(mix(src, grad, uMix), 1.0);
}
`;
