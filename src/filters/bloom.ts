import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "bloom",
  name: "Bloom / Glow",
  group: "Optical",
  desc: "Bright-pass threshold plus a 32-tap weighted blur added back over the image. Single-pass approximation; see the TD note for the higher-quality Blur-TOP chain.",
  heavy: true,
  tdNote:
    "Higher-quality native path (recommended for big radii / 4K): source -> Level/Threshold -> Blur TOP (size = radius) -> Composite TOP (Add) over the source.",
};

export const params: ParamDef[] = [
  { name: "uThreshold", type: "float", value: 0.6, min: 0.0, max: 1.0, step: 0.01, label: "Threshold" },
  { name: "uIntensity", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Intensity" },
  { name: "uRadius", type: "float", value: 24.0, min: 1.0, max: 80.0, step: 1.0, label: "Glow Radius (px)" },
];

export const core = /* glsl */ `
uniform float uThreshold;
uniform float uIntensity;
uniform float uRadius;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 brightPass(vec3 c, float th){ return c * smoothstep(th, th + 0.1, luma(c)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    vec3 base = texture(INPUT0, uv).rgb;
    vec3 bloom = vec3(0.0); float wsum = 0.0;
    const int N = 32;
    for (int i = 0; i < N; i++){
        float fi = float(i);
        float a = fi * 2.39996323;            // golden angle
        float rn = sqrt(fi / float(N));        // 0..1
        float r = rn * uRadius;
        float w = exp(-rn * rn * 2.5);
        vec2 off = vec2(cos(a), sin(a)) * r * texel;
        bloom += brightPass(texture(INPUT0, uv + off).rgb, uThreshold) * w;
        wsum += w;
    }
    bloom /= max(wsum, 0.0001);
    return vec4(base + bloom * uIntensity, 1.0);
}
`;
