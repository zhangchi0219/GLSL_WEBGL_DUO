import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "pixelsort",
  name: "Pixel Sort",
  group: "Pixel",
  desc: "Per-pixel marches along the sort axis through a luma-masked span and pulls the brightest/darkest sample. A true sort is multi-pass; this is a fast GPU approximation of the streak look.",
  heavy: true,
  tdNote: "A true pixel sort is multi-pass — loop this through a Feedback TOP for a stronger result.",
};

export const params: ParamDef[] = [
  { name: "uLow", type: "float", value: 0.25, min: 0.0, max: 1.0, step: 0.01, label: "Mask Low" },
  { name: "uHigh", type: "float", value: 0.8, min: 0.0, max: 1.0, step: 0.01, label: "Mask High" },
  { name: "uLength", type: "float", value: 120.0, min: 1.0, max: 280.0, step: 1.0, label: "Sort Length (px)" },
  { name: "uVertical", type: "bool", value: false, label: "Vertical" },
  { name: "uReverse", type: "bool", value: false, label: "Reverse Dir" },
  { name: "uMode", type: "bool", value: false, label: "Darkest (off=Bright)" },
];

export const core = /* glsl */ `
uniform float uLow;
uniform float uHigh;
uniform float uLength;
uniform float uVertical;
uniform float uReverse;
uniform float uMode;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 texel = 1.0 / vec2(textureSize(INPUT0, 0));
    vec2 dir = (uVertical > 0.5) ? vec2(0.0, 1.0) : vec2(1.0, 0.0);
    dir *= (uReverse > 0.5) ? -1.0 : 1.0;

    vec4 cur = texture(INPUT0, uv);
    float cl = luma(cur.rgb);
    if (cl < uLow || cl > uHigh) return vec4(cur.rgb, 1.0); // outside mask: untouched

    int maxN = int(clamp(uLength, 1.0, 280.0));
    vec4 best = cur; float bestL = cl;
    for (int i = 1; i < 280; i++){
        if (i > maxN) break;
        vec2 suv = uv + dir * texel * float(i);
        if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;
        vec4 s = texture(INPUT0, suv);
        float l = luma(s.rgb);
        if (l < uLow || l > uHigh) break;              // span boundary
        bool take = (uMode > 0.5) ? (l < bestL) : (l > bestL);
        if (take){ bestL = l; best = s; }
    }
    return vec4(best.rgb, 1.0);
}
`;
