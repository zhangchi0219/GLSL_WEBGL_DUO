import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "sobel",
  name: "Sobel Edge",
  group: "Stylize",
  desc: "3×3 Sobel gradient magnitude on luma. Overlay edges on the image, or draw flat edge/background colors.",
};

export const params: ParamDef[] = [
  { name: "uStrength", type: "float", value: 1.5, min: 0.0, max: 6.0, step: 0.01, label: "Strength" },
  { name: "uThreshold", type: "float", value: 0.15, min: 0.0, max: 1.0, step: 0.01, label: "Threshold" },
  { name: "uOverlay", type: "bool", value: false, label: "Overlay On Image" },
  { name: "uInvert", type: "bool", value: false, label: "Invert" },
  { name: "uEdge", type: "color", value: [0.95, 0.93, 0.85], label: "Edge Color" },
  { name: "uBg", type: "color", value: [0.03, 0.03, 0.05], label: "Background" },
];

export const core = /* glsl */ `
uniform float uStrength;
uniform float uThreshold;
uniform float uOverlay;
uniform float uInvert;
uniform vec3  uEdge;
uniform vec3  uBg;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    float tl = luma(texture(INPUT0, uv + vec2(-1.0,-1.0) * t).rgb);
    float tc = luma(texture(INPUT0, uv + vec2( 0.0,-1.0) * t).rgb);
    float tr = luma(texture(INPUT0, uv + vec2( 1.0,-1.0) * t).rgb);
    float ml = luma(texture(INPUT0, uv + vec2(-1.0, 0.0) * t).rgb);
    float mr = luma(texture(INPUT0, uv + vec2( 1.0, 0.0) * t).rgb);
    float bl = luma(texture(INPUT0, uv + vec2(-1.0, 1.0) * t).rgb);
    float bc = luma(texture(INPUT0, uv + vec2( 0.0, 1.0) * t).rgb);
    float br = luma(texture(INPUT0, uv + vec2( 1.0, 1.0) * t).rgb);

    float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
    float gy = -tl - 2.0 * tc - tr + bl + 2.0 * bc + br;
    float g  = sqrt(gx * gx + gy * gy) * uStrength;
    float e  = smoothstep(uThreshold, uThreshold + 0.1, g);
    if (uInvert > 0.5) e = 1.0 - e;

    vec3 col = (uOverlay > 0.5)
        ? mix(texture(INPUT0, uv).rgb, uEdge, e)
        : mix(uBg, uEdge, e);
    return vec4(col, 1.0);
}
`;
