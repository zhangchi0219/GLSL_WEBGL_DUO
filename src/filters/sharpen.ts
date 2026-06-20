import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "sharpen",
  name: "Sharpen",
  group: "Optical",
  desc: "Unsharp mask: subtract a local average from the pixel and add the difference back.",
};

export const params: ParamDef[] = [
  { name: "uAmount", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Amount" },
  { name: "uRadius", type: "float", value: 1.0, min: 1.0, max: 5.0, step: 0.5, label: "Radius (px)" },
];

export const core = /* glsl */ `
uniform float uAmount;
uniform float uRadius;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = (1.0 / vec2(textureSize(INPUT0, 0))) * max(uRadius, 1.0);
    vec3 c = texture(INPUT0, uv).rgb;
    vec3 blur = (
        texture(INPUT0, uv + vec2(-1.0, 0.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0, 0.0) * t).rgb +
        texture(INPUT0, uv + vec2( 0.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 0.0, 1.0) * t).rgb +
        texture(INPUT0, uv + vec2(-1.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0, 1.0) * t).rgb +
        texture(INPUT0, uv + vec2( 1.0,-1.0) * t).rgb +
        texture(INPUT0, uv + vec2(-1.0, 1.0) * t).rgb) / 8.0;
    vec3 col = c + (c - blur) * uAmount;
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
