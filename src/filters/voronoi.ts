import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "voronoi",
  name: "Voronoi Crystallize",
  group: "Distort",
  desc: "Shatters the image into jittered Voronoi cells, each filled with the color sampled at its feature point. Edge width draws cell borders.",
};

export const params: ParamDef[] = [
  { name: "uScale", type: "float", value: 24.0, min: 4.0, max: 120.0, step: 1.0, label: "Cell Size (px)" },
  { name: "uJitter", type: "float", value: 1.0, min: 0.0, max: 1.0, step: 0.01, label: "Jitter" },
  { name: "uEdge", type: "float", value: 0.0, min: 0.0, max: 0.3, step: 0.005, label: "Edge Width" },
  { name: "uEdgeColor", type: "color", value: [0.03, 0.03, 0.03], label: "Edge Color" },
];

export const core = /* glsl */ `
uniform float uScale;
uniform float uJitter;
uniform float uEdge;
uniform vec3  uEdgeColor;

vec2 hash22(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    float cellPx = max(uScale, 2.0);
    vec2 grid = res / cellPx;
    vec2 g = uv * grid;
    vec2 gi = floor(g), gf = fract(g);

    float md = 1e9, md2 = 1e9;
    vec2 featAbs = gi;
    for (int y = -1; y <= 1; y++){
        for (int x = -1; x <= 1; x++){
            vec2 o = vec2(float(x), float(y));
            vec2 feat = o + (hash22(gi + o) - 0.5) * uJitter;
            float d = length(gf - feat);
            if (d < md){ md2 = md; md = d; featAbs = gi + feat; }
            else if (d < md2){ md2 = d; }
        }
    }

    vec3 col = texture(INPUT0, featAbs / grid).rgb;
    if (uEdge > 0.0){
        float e = smoothstep(0.0, uEdge, md2 - md);
        col = mix(uEdgeColor, col, e);
    }
    return vec4(col, 1.0);
}
`;
