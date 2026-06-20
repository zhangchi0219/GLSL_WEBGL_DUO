import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "ripple",
  name: "Ripple Displace",
  group: "Distort",
  desc: "Animated concentric ripples that push UVs radially from a center point. Driven by uTime.",
  animated: true,
};

export const params: ParamDef[] = [
  { name: "uAmplitude", type: "float", value: 0.5, min: 0.0, max: 3.0, step: 0.01, label: "Amplitude" },
  { name: "uFrequency", type: "float", value: 30.0, min: 1.0, max: 120.0, step: 1.0, label: "Frequency" },
  { name: "uSpeed", type: "float", value: 2.0, min: 0.0, max: 10.0, step: 0.05, label: "Speed" },
  { name: "uCenter", type: "vec2", value: [0.5, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "Center" },
];

export const core = /* glsl */ `
uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;
uniform vec2  uCenter;

vec4 renderMain(vec2 uv, vec2 res, float time){
    float aspect = res.x / res.y;
    vec2 d = uv - uCenter;
    vec2 da = d * vec2(aspect, 1.0);
    float dist = length(da);
    float wave = sin(dist * uFrequency - time * uSpeed);
    vec2 dir = (dist > 1e-5) ? d / dist : vec2(0.0);
    vec2 suv = uv + dir * wave * uAmplitude * 0.02;
    return vec4(texture(INPUT0, suv).rgb, 1.0);
}
`;
