import type { FilterMeta, ParamDef } from "./types";

export const meta: FilterMeta = {
  id: "noisewarp",
  name: "Domain-Warped Noise",
  group: "Generative",
  desc: "Procedural marble pattern from fractal noise (fbm) pushed through Inigo-Quilez domain warping: the noise is sampled at coordinates that are themselves displaced by noise. Octaves/lacunarity/gain shape the fractal; warp strength bends it into flowing veins. A base Flow X/Y steers the whole field, and two independent feathered XY regions (A/left, B/right) each impose their own flow velocity and size. Mix blends the pattern over the loaded image.",
  animated: true,
  heavy: true,
};

export const params: ParamDef[] = [
  { name: "uScale", type: "float", value: 3.0, min: 1.0, max: 12.0, step: 0.1, label: "Base Scale" },
  { name: "uOctaves", type: "float", value: 5.0, min: 1.0, max: 8.0, step: 1.0, label: "Octaves" },
  { name: "uLacunarity", type: "float", value: 2.0, min: 1.5, max: 3.0, step: 0.01, label: "Lacunarity" },
  { name: "uGain", type: "float", value: 0.5, min: 0.2, max: 0.8, step: 0.01, label: "Gain" },
  { name: "uWarp", type: "float", value: 4.0, min: 0.0, max: 8.0, step: 0.05, label: "Warp Strength" },
  { name: "uWarp2", type: "bool", value: true, label: "Second Warp" },
  { name: "uContrast", type: "float", value: 1.4, min: 0.5, max: 3.0, step: 0.01, label: "Contrast" },
  { name: "uFlow", type: "vec2", value: [0.0, 0.0], min: -1.0, max: 1.0, step: 0.01, label: "Base Flow X / Y" },
  { name: "uFlowA", type: "vec2", value: [0.4, 0.0], min: -1.0, max: 1.0, step: 0.01, label: "A Flow X / Y" },
  { name: "uRegionACenter", type: "vec2", value: [0.25, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "A Center" },
  { name: "uRegionASize", type: "vec2", value: [0.3, 0.6], min: 0.0, max: 1.0, step: 0.01, label: "A Size" },
  { name: "uFlowB", type: "vec2", value: [-0.4, 0.0], min: -1.0, max: 1.0, step: 0.01, label: "B Flow X / Y" },
  { name: "uRegionBCenter", type: "vec2", value: [0.75, 0.5], min: 0.0, max: 1.0, step: 0.01, label: "B Center" },
  { name: "uRegionBSize", type: "vec2", value: [0.3, 0.6], min: 0.0, max: 1.0, step: 0.01, label: "B Size" },
  { name: "uRegionFeather", type: "float", value: 0.08, min: 0.001, max: 0.5, step: 0.005, label: "Region Edge" },
  { name: "uShowRegion", type: "bool", value: false, label: "Show Regions" },
  { name: "uColorA", type: "color", value: [0.04, 0.12, 0.18], label: "Low Color" },
  { name: "uColorB", type: "color", value: [0.96, 0.82, 0.55], label: "High Color" },
  { name: "uMix", type: "float", value: 0.0, min: 0.0, max: 1.0, step: 0.01, label: "Mix w/ Image" },
];

export const core = /* glsl */ `
uniform float uScale;
uniform float uOctaves;
uniform float uLacunarity;
uniform float uGain;
uniform float uWarp;
uniform float uWarp2;
uniform float uContrast;
uniform vec2  uFlow;
uniform vec2  uFlowA;
uniform vec2  uRegionACenter;
uniform vec2  uRegionASize;
uniform vec2  uFlowB;
uniform vec2  uRegionBCenter;
uniform vec2  uRegionBSize;
uniform float uRegionFeather;
uniform float uShowRegion;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uMix;

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Value noise in [0,1] with a quintic fade for C2-continuous gradients.
float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian motion. Fixed loop bound + break on the uniform octave count
// (a uniform loop bound itself can fail to compile on some GLSL ES 3.00 drivers).
float fbm(vec2 p){
    float sum = 0.0, amp = 0.5, norm = 0.0;
    const int MAX_OCT = 8;
    for (int i = 0; i < MAX_OCT; i++){
        if (float(i) >= uOctaves) break;
        sum  += amp * vnoise(p);
        norm += amp;
        p    *= uLacunarity;
        amp  *= uGain;
    }
    return sum / max(norm, 1e-4);
}

// signed box edge in uv space: <0 inside the rectangle, >0 outside.
float boxEdge(vec2 uv, vec2 c, vec2 s){
    vec2 rd = abs(uv - c) - 0.5 * s;
    return max(rd.x, rd.y);
}

vec4 renderMain(vec2 uv, vec2 res, float time){
    // aspect-correct, centered domain at the chosen base scale
    vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) * uScale;

    // two fast-flow regions, each with its own velocity; soft feathered edges
    float edgeA   = boxEdge(uv, uRegionACenter, uRegionASize);
    float edgeB   = boxEdge(uv, uRegionBCenter, uRegionBSize);
    float insideA = 1.0 - smoothstep(0.0, uRegionFeather, edgeA);
    float insideB = 1.0 - smoothstep(0.0, uRegionFeather, edgeB);

    // per-pixel velocity: base flow, overridden by region A then B where present
    vec2 vel = uFlow;
    vel = mix(vel, uFlowA, insideA);
    vel = mix(vel, uFlowB, insideB);
    vec2 flow = vel * time;

    // domain warping: sample fbm at coords displaced by fbm (Inigo Quilez)
    vec2 q = vec2(fbm(p + flow), fbm(p + flow + vec2(5.2, 1.3)));
    vec2 r = q;
    if (uWarp2 > 0.5){
        r = vec2(fbm(p + uWarp * q + vec2(1.7, 9.2)),
                 fbm(p + uWarp * q + vec2(8.3, 2.8)));
    }
    float f = fbm(p + uWarp * r);

    // contrast around the midpoint, then map through the two-color ramp
    float v = clamp((f - 0.5) * uContrast + 0.5, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, v);
    // depth: darken by the first warp field for veined marble shading
    col *= 0.6 + 0.4 * clamp(q.x, 0.0, 1.0);

    // 0 = pure pattern, 1 = pattern modulates the loaded image
    vec3 src = texture(INPUT0, uv).rgb;
    col = mix(col, col * src, uMix);

    // optional outlines so the slider-defined selections are visible
    if (uShowRegion > 0.5){
        float lineA = 1.0 - smoothstep(0.0, 0.004, abs(edgeA));
        float lineB = 1.0 - smoothstep(0.0, 0.004, abs(edgeB));
        col = mix(col, vec3(1.0, 0.3, 0.0), lineA * 0.9);  // A = orange
        col = mix(col, vec3(0.0, 0.7, 1.0), lineB * 0.9);  // B = cyan
    }

    return vec4(col, 1.0);
}
`;
