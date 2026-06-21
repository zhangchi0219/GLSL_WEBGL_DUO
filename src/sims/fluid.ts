import type { SimModule, SimPassDef } from "./types";
import type { ParamDef } from "../filters/types";

// 2D incompressible fluid — Jos Stam "Stable Fluids" on the GPU (the standard
// real-time scheme, cf. PavelDoGreat's WebGL-Fluid-Simulation). All buffers run
// at half canvas resolution. Per frame: splat forces/dye → curl → vorticity →
// divergence → pressure decay → Jacobi pressure solve ×N → subtract gradient →
// advect velocity → advect dye. Display shows the dye.

const S = 0.5; // simulation resolution scale
const PRESSURE_ITERS = 25;

const CLEAR = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){ return vec4(0.0); }
`;

const SPLAT_VEL = /* glsl */ `
uniform float uForce;
uniform float uRadius;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 v = texture(INPUT0, uv).xy;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(res.x / res.y, 1.0);
        float f = exp(-dot(d, d) / (uRadius * uRadius));
        v += uMouseVel * uForce * 300.0 * f;
    }
    return vec4(v, 0.0, 1.0);
}
`;

const SPLAT_DYE = /* glsl */ `
uniform float uDyeAmount;
uniform float uRadius;
uniform float uColorShift;
vec3 hsv2rgb(vec3 c){
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 c = texture(INPUT0, uv).rgb;
    if (uMouseDown > 0.5){
        vec2 d = (uv - uMouse) * vec2(res.x / res.y, 1.0);
        float f = exp(-dot(d, d) / (uRadius * uRadius));
        vec3 col = hsv2rgb(vec3(fract(time * 0.12 + uColorShift), 0.7, 1.0));
        c += col * f * uDyeAmount;
    }
    return vec4(c, 1.0);
}
`;

const CURL = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).y;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).y;
    float b = texture(INPUT0, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT0, uv + vec2(0.0, t.y)).x;
    return vec4(0.5 * ((r - l) - (tp - b)), 0.0, 0.0, 1.0);
}
`;

const VORTICITY = /* glsl */ `
uniform float uVorticity;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT1, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT1, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT1, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT1, uv + vec2(0.0, t.y)).x;
    float c = texture(INPUT1, uv).x;
    vec2 force = 0.5 * vec2(abs(tp) - abs(b), abs(r) - abs(l));
    force /= length(force) + 1e-5;
    force *= uVorticity * c;
    force.y *= -1.0;
    vec2 v = texture(INPUT0, uv).xy;
    v += force * uDt;
    return vec4(v, 0.0, 1.0);
}
`;

const DIVERGENCE = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT0, uv - vec2(0.0, t.y)).y;
    float tp = texture(INPUT0, uv + vec2(0.0, t.y)).y;
    return vec4(0.5 * ((r - l) + (tp - b)), 0.0, 0.0, 1.0);
}
`;

const PRESSURE_DECAY = /* glsl */ `
uniform float uPressureDecay;
vec4 renderMain(vec2 uv, vec2 res, float time){
    return vec4(texture(INPUT0, uv).x * uPressureDecay, 0.0, 0.0, 1.0);
}
`;

const PRESSURE = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT0, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT0, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT0, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT0, uv + vec2(0.0, t.y)).x;
    float div = texture(INPUT1, uv).x;
    return vec4((l + r + b + tp - div) * 0.25, 0.0, 0.0, 1.0);
}
`;

const GRADIENT_SUBTRACT = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 t = uTexel;
    float l = texture(INPUT1, uv - vec2(t.x, 0.0)).x;
    float r = texture(INPUT1, uv + vec2(t.x, 0.0)).x;
    float b = texture(INPUT1, uv - vec2(0.0, t.y)).x;
    float tp = texture(INPUT1, uv + vec2(0.0, t.y)).x;
    vec2 v = texture(INPUT0, uv).xy;
    v -= 0.5 * vec2(r - l, tp - b);
    return vec4(v, 0.0, 1.0);
}
`;

const ADVECT_VEL = /* glsl */ `
uniform float uVelDiss;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 v = texture(INPUT0, uv).xy;
    vec2 coord = uv - uDt * v * uTexel;
    return vec4(texture(INPUT0, coord).xy * uVelDiss, 0.0, 1.0);
}
`;

const ADVECT_DYE = /* glsl */ `
uniform float uDyeDiss;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec2 v = texture(INPUT0, uv).xy;
    vec2 coord = uv - uDt * v * uTexel;
    vec3 c = texture(INPUT1, coord).rgb * uDyeDiss;
    return vec4(c, 1.0);
}
`;

const DISPLAY = /* glsl */ `
uniform float uSourceMix;
vec4 renderMain(vec2 uv, vec2 res, float time){
    vec3 dye = texture(INPUT0, uv).rgb;
    vec3 src = texture(INPUT1, uv).rgb;
    vec3 col = mix(dye, src * (0.3 + dye), uSourceMix);
    return vec4(col, 1.0);
}
`;

const step: SimPassDef[] = [
  { name: "splatVel", core: SPLAT_VEL, out: "vel", inputs: ["self"] },
  { name: "splatDye", core: SPLAT_DYE, out: "dye", inputs: ["self"] },
  { name: "curl", core: CURL, out: "curl", inputs: ["vel"] },
  { name: "vorticity", core: VORTICITY, out: "vel", inputs: ["vel", "curl"] },
  { name: "divergence", core: DIVERGENCE, out: "divergence", inputs: ["vel"] },
  { name: "pressureDecay", core: PRESSURE_DECAY, out: "pressure", inputs: ["self"] },
  { name: "pressure", core: PRESSURE, out: "pressure", inputs: ["self", "divergence"], iterations: PRESSURE_ITERS },
  { name: "gradientSubtract", core: GRADIENT_SUBTRACT, out: "vel", inputs: ["vel", "pressure"] },
  { name: "advectVel", core: ADVECT_VEL, out: "vel", inputs: ["self"] },
  { name: "advectDye", core: ADVECT_DYE, out: "dye", inputs: ["vel", "self"] },
];

const params: ParamDef[] = [
  { name: "uForce", type: "float", value: 1.0, min: 0.0, max: 4.0, step: 0.01, label: "Force" },
  { name: "uRadius", type: "float", value: 0.035, min: 0.005, max: 0.15, step: 0.001, label: "Splat Radius" },
  { name: "uDyeAmount", type: "float", value: 1.0, min: 0.0, max: 3.0, step: 0.01, label: "Dye Amount" },
  { name: "uVorticity", type: "float", value: 8.0, min: 0.0, max: 30.0, step: 0.1, label: "Vorticity" },
  { name: "uVelDiss", type: "float", value: 0.992, min: 0.9, max: 1.0, step: 0.001, label: "Velocity Dissipation" },
  { name: "uDyeDiss", type: "float", value: 0.985, min: 0.9, max: 1.0, step: 0.001, label: "Dye Dissipation" },
  { name: "uPressureDecay", type: "float", value: 0.8, min: 0.0, max: 1.0, step: 0.01, label: "Pressure Retention" },
  { name: "uColorShift", type: "float", value: 0.0, min: 0.0, max: 1.0, step: 0.01, label: "Color Shift" },
  { name: "uSourceMix", type: "float", value: 0.0, min: 0.0, max: 1.0, step: 0.01, label: "Image Mix" },
];

export const fluid: SimModule = {
  meta: {
    id: "fluid",
    name: "2D Fluid (Stable)",
    group: "Simulation",
    desc: "Drag to inject dye and velocity into an incompressible 2D fluid (Stam stable-fluids: advection + vorticity + Jacobi pressure solve). Heavy — runs at half resolution.",
    animated: true,
    heavy: true,
  },
  params,
  buffers: [
    { name: "vel", components: 2, scale: S },
    { name: "dye", components: 4, scale: S },
    { name: "pressure", components: 1, scale: S },
    { name: "divergence", components: 1, scale: S },
    { name: "curl", components: 1, scale: S },
  ],
  init: [
    { name: "clearVel", core: CLEAR, out: "vel", inputs: [] },
    { name: "clearDye", core: CLEAR, out: "dye", inputs: [] },
    { name: "clearPressure", core: CLEAR, out: "pressure", inputs: [] },
  ],
  step,
  display: { name: "display", core: DISPLAY, out: "screen", inputs: ["dye", "source"] },
  needsSource: true,
};
