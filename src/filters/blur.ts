import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "blur",
  name: "Blur (Gauss/Box)",
  group: "Optical",
  desc: "2D kernel blur. Toggle between equal-weight box and Gaussian falloff. Radius capped at 8px (preview); use a separable Blur TOP in TD for large radii.",
  heavy: true,
  tdNote: "For large blurs, TD's built-in separable Blur TOP is far cheaper than this NxN kernel.",
};

export const params: ParamDef[] = [
  { name: "uRadius", type: "float", value: 4.0, min: 0.0, max: 8.0, step: 1.0, label: "Radius (px)" },
  { name: "uGaussian", type: "bool", value: true, label: "Gaussian (off=Box)" },
];

export const core = /* glsl */ `
uniform float uRadius;
uniform float uGaussian;

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 0.0, 8.0));
    float sigma = max(uRadius * 0.5, 0.001);
    vec3 sum = vec3(0.0); float wsum = 0.0;
    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            float d2 = float(x * x + y * y);
            float w = (uGaussian > 0.5) ? exp(-d2 / (2.0 * sigma * sigma)) : 1.0;
            sum += texture(INPUT0, uv + vec2(float(x), float(y)) * texel).rgb * w;
            wsum += w;
        }
    }
    return vec4(sum / max(wsum, 0.0001), 1.0);
}
`;
