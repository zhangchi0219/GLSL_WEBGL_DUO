import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "oilify",
  name: "Oilify (Oil Paint)",
  group: "Stylize",
  desc: "Classic oil-paint filter: buckets the neighborhood into intensity levels, then fills with the average color of the most common level.",
  heavy: true,
};

export const params: ParamDef[] = [
  { name: "uRadius", type: "float", value: 4.0, min: 1.0, max: 8.0, step: 1.0, label: "Radius (px)" },
  { name: "uLevels", type: "float", value: 16.0, min: 2.0, max: 32.0, step: 1.0, label: "Intensity Levels" },
];

export const core = /* glsl */ `
uniform float uRadius;
uniform float uLevels;

float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    int r = int(clamp(uRadius, 1.0, 8.0));
    int levels = int(clamp(uLevels, 2.0, 32.0));

    int count[32];
    vec3 avg[32];
    for (int i = 0; i < 32; i++){ count[i] = 0; avg[i] = vec3(0.0); }

    for (int y = -8; y <= 8; y++){
        if (y < -r || y > r) continue;
        for (int x = -8; x <= 8; x++){
            if (x < -r || x > r) continue;
            vec3 c = texture(INPUT0, uv + vec2(float(x), float(y)) * t).rgb;
            int lvl = int(luma(c) * float(levels - 1) + 0.5);
            lvl = clamp(lvl, 0, 31);
            count[lvl] += 1;
            avg[lvl] += c;
        }
    }

    int mi = 0, mc = 0;
    for (int i = 0; i < 32; i++){
        if (i >= levels) break;
        if (count[i] > mc){ mc = count[i]; mi = i; }
    }
    return vec4(avg[mi] / float(max(mc, 1)), 1.0);
}
`;
