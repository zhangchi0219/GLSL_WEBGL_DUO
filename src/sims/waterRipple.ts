import type { SimModule, SimPassDef } from "./types";
import type { ParamDef } from "../filters/types";

// Height-field water (Hugo-Elias). Buffer `h`: .r = current height, .g = previous.
// Each frame: propagate the wave equation, then splat new disturbances (ambient
// rain + pointer). Display refracts the source image through the surface normal.

const CLEAR = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){ return vec4(0.0); }
`;

const PROPAGATE = /* glsl */ `
uniform float uDamping;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float c = texture(INPUT0, uv).r;
    float p = texture(INPUT0, uv).g;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).r;
    float u = texture(INPUT0, uv + vec2(0.0, t.y)).r;
    float d = texture(INPUT0, uv - vec2(0.0, t.y)).r;
    float nh = (l + r + u + d) * 0.5 - p;
    nh *= uDamping;
    return vec4(nh, c, 0.0, 1.0);
}
`;

const SPLAT = /* glsl */ `
uniform float uDropRadius;
uniform float uRainRate;
uniform float uPointerForce;
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec4 h = texture(INPUT0, uv);
    float aspect = res.x / res.y;
    float add = 0.0;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
        add -= uPointerForce * exp(-dot(d, d) / (uDropRadius * uDropRadius));
    }
    float tq = floor(time * 18.0);
    float spawn = step(1.0 - uRainRate, hash21(vec2(tq, 3.7)));
    vec2 rp = vec2(hash21(vec2(tq, 1.3)), hash21(vec2(tq, 2.1)));
    vec2 dr = (uv - rp) * vec2(aspect, 1.0);
    add -= spawn * 0.5 * exp(-dot(dr, dr) / (uDropRadius * uDropRadius));
    h.r += add;
    return h;
}
`;

const DISPLAY = /* glsl */ `
uniform float uRefraction;
uniform float uSpecular;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).r;
    float u = texture(INPUT0, uv + vec2(0.0, t.y)).r;
    float d = texture(INPUT0, uv - vec2(0.0, t.y)).r;
    vec2 grad = vec2(r - l, u - d);
    vec3 col = texture(INPUT1, uv + grad * uRefraction).rgb;
    vec3 n = normalize(vec3(-grad * 60.0, 1.0));
    float hl = pow(clamp(dot(n, normalize(vec3(0.4, 0.6, 1.0))), 0.0, 1.0), 24.0);
    col += uSpecular * hl;
    return vec4(col, 1.0);
}
`;

const propagate: SimPassDef = { name: "propagate", core: PROPAGATE, out: "h", inputs: ["self"] };
const splat: SimPassDef = { name: "splat", core: SPLAT, out: "h", inputs: ["self"] };
const display: SimPassDef = { name: "display", core: DISPLAY, out: "screen", inputs: ["h", "source"] };

function baseParams(): ParamDef[] {
  return [
    { name: "uDamping", type: "float", value: 0.985, min: 0.9, max: 0.999, step: 0.001, label: "Damping" },
    { name: "uDropRadius", type: "float", value: 0.025, min: 0.005, max: 0.12, step: 0.001, label: "Drop Radius" },
    { name: "uRainRate", type: "float", value: 0.3, min: 0.0, max: 1.0, step: 0.01, label: "Rain Rate" },
    { name: "uPointerForce", type: "float", value: 0.6, min: 0.0, max: 2.0, step: 0.01, label: "Pointer Force" },
    { name: "uRefraction", type: "float", value: 0.25, min: 0.0, max: 1.0, step: 0.01, label: "Refraction" },
    { name: "uSpecular", type: "float", value: 0.5, min: 0.0, max: 2.0, step: 0.01, label: "Specular" },
  ];
}

function make(name: string, desc: string, overrides: Record<string, number>): SimModule {
  const params = baseParams().map((p) =>
    overrides[p.name] !== undefined ? { ...p, value: overrides[p.name] } : p,
  );
  return {
    // shared meta.id → one set of TD kernels for both variants
    meta: { id: "waterRipple", name, group: "Simulation", desc, animated: true },
    params,
    buffers: [{ name: "h", components: 2 }],
    init: [{ name: "clear", core: CLEAR, out: "h", inputs: [] }],
    step: [propagate, splat],
    display,
    needsSource: true,
  };
}

export const rain = make(
  "Raindrop Ripples",
  "Height-field water with ambient random raindrops (plus click/drag). Refracts the source image through the surface.",
  { uRainRate: 0.3, uPointerForce: 0.6 },
);

export const pointer = make(
  "Interactive Ripple",
  "Drag on the canvas to disturb a height-field water surface; waves propagate and decay, refracting the image.",
  { uRainRate: 0.0, uPointerForce: 1.0 },
);
