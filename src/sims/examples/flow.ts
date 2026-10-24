import type { ParamDef } from "../../filters/types";
import type { SimModule } from "../types";

// 两个示例共享半拉格朗日平流：先求速度，再搬运上一帧的示踪颜色。
// 不需要压力求解或源图片；vel 记录当前风场，trail 跨帧反馈。
const POINTER_FIELD = /* glsl */ `
vec2 pointerField(vec2 uv, float aspect) {
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    float fall = exp(-dot(d, d) / 0.012);
    vec2 push = clamp(uMouseVel, vec2(-1.5), vec2(1.5));
    return uMouseDown * fall * (push * 0.4 + vec2(-d.y / aspect, d.x) * 3.0);
}
`;

const WIND_FIELD = /* glsl */ `
// 风向以角度表示。阵风沿空间传播；拖动叠加局部旋转和推力。
uniform float uDirection;
uniform float uStrength;
uniform float uGust;
${POINTER_FIELD}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    float angle = radians(uDirection);
    vec2 axis = vec2(cos(angle), sin(angle));
    vec2 side = vec2(-axis.y, axis.x);
    vec2 p = uv * vec2(aspect, 1.0);
    float swell = sin(dot(p, axis) * 8.0 - time * 1.6);
    float bend = sin(dot(p, side) * 9.0 + time * 0.9);
    vec2 worldVel = uStrength * 0.22 * (axis * (1.0 + uGust * 0.45 * swell) + side * uGust * 0.5 * bend);
    vec2 vel = worldVel / vec2(aspect, 1.0) + pointerField(uv, aspect);
    return vec4(clamp(vel, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}
`;

const NOISE_FIELD = /* glsl */ `
// 三层平滑 value noise 的解析梯度；旋转梯度得到 curl 流场。
uniform float uNoiseScale;
uniform float uStrength;
uniform float uEvolution;
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
vec2 noiseGradient(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 s = f * f * (3.0 - 2.0 * f);
    vec2 ds = 6.0 * f * (1.0 - f);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0));
    return vec2(mix(b - a, d - c, s.y) * ds.x,
                mix(c - a, d - b, s.x) * ds.y);
}
${POINTER_FIELD}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 p = uv * vec2(aspect, 1.0) * uNoiseScale + time * uEvolution * vec2(0.17, -0.11);
    vec2 grad = noiseGradient(p);
    grad += noiseGradient(p * 2.03 + 17.1) * 0.55;
    grad += noiseGradient(p * 4.11 + 31.7) * 0.3;
    vec2 worldVel = vec2(grad.y, -grad.x) * uStrength * 0.17;
    worldVel *= min(1.0, 0.7 / max(length(worldVel), 0.0001));
    vec2 vel = worldVel / vec2(aspect, 1.0) + pointerField(uv, aspect);
    return vec4(clamp(vel, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}
`;

function emission(warm: boolean): string {
  return /* glsl */ `
// 均匀分布的固定发射点不断留下细线，颜色随发射位置变化。
vec3 emit(vec2 uv, float aspect) {
    vec2 p = uv * vec2(aspect, 1.0) * 9.0;
    vec2 d = fract(p) - 0.5;
    float dotMask = exp(-dot(d, d) / 0.004);
    float hue = 0.5 + 0.5 * sin(dot(floor(p), vec2(1.1, 1.7)));
    return dotMask * mix(${warm ? "vec3(0.65, 0.26, 1.0), vec3(1.0, 0.68, 0.25)" : "vec3(0.08, 0.48, 0.85), vec3(0.25, 1.0, 0.72)"}, hue);
}
`;
}

const DISPLAY = /* glsl */ `
// INPUT0 = 示踪颜色，INPUT1 = 速度。箭头只读取已记录的风场，暂停后静止。
uniform float uShowArrows;
float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / max(dot(ab, ab), 0.00001), 0.0, 1.0));
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 p = uv * vec2(aspect, 1.0) * 12.0;
    vec2 cell = floor(p), local = fract(p) - 0.5;
    vec2 center = (cell + 0.5) / (12.0 * vec2(aspect, 1.0));
    vec2 v = texture(INPUT1, center).xy * vec2(aspect, 1.0);
    vec2 dir = v / max(length(v), 0.0001), side = vec2(-dir.y, dir.x);
    vec2 q = vec2(dot(local, dir), dot(local, side));
    float arrow = min(segmentDistance(q, vec2(-0.24, 0.0), vec2(0.24, 0.0)),
                      min(segmentDistance(q, vec2(0.24, 0.0), vec2(0.09, 0.12)),
                          segmentDistance(q, vec2(0.24, 0.0), vec2(0.09, -0.12))));
    float aa = max(fwidth(p.x), fwidth(p.y));
    float ink = (1.0 - smoothstep(0.012, 0.012 + aa, arrow)) * smoothstep(0.0, 0.03, length(v));
    vec3 trail = texture(INPUT0, uv).rgb;
    vec3 col = vec3(0.018, 0.024, 0.034) + trail * 1.35;
    col += uShowArrows * ink * vec3(0.24, 0.30, 0.34);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function makeFlow(name: "Wind" | "Noise", field: string, params: ParamDef[]): SimModule {
  const seed = emission(name === "Noise");
  return {
    meta: {
      id: name === "Wind" ? "example-wind" : "example-noise", name, group: "Simulation Examples", animated: true,
      desc: name === "Wind" ? "风场推动细线状示踪纹理。调整风向、风力和阵风；拖动叠加局部扰动，箭头显示流动方向。" : "平滑分形噪声的 curl 驱动旋涡轨迹。调整噪声尺度、强度和演变速度；拖动注入示踪颜色和局部扰动。",
      tdNote: "No source TOP required. vel is an intermediate field; trail uses cross-frame feedback. Use the same frame time in WebGL and TD.",
    },
    params: [...params,
      { name: "uDecay", type: "float", value: 1.2, min: 0.2, max: 5.0, step: 0.05, label: "拖尾衰减" },
      { name: "uShowArrows", type: "bool", value: true, label: "方向箭头" },
    ],
    buffers: [{ name: "vel", components: 2, scale: 0.5 }, { name: "trail", components: 4, scale: 0.5 }],
    init: [{ name: "seedTrail", out: "trail", inputs: [], core: `${seed}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(emit(uv, res.x / res.y), 1.0); }
` }],
    step: [
      { name: "field", out: "vel", inputs: [], core: field },
      { name: "advect", out: "trail", inputs: ["self", "vel"], core: /* glsl */ `
uniform float uDecay;
${seed}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    float dt = clamp(uDt, 0.0001, 1.0 / 30.0);
    vec2 vel = texture(INPUT1, uv).xy;
    // 中点回溯减少轨迹误差；越过边缘后清空，避免边缘纹理被拉成长带。
    vec2 mid = uv - vel * dt * 0.5;
    vec2 previous = uv - texture(INPUT1, mid).xy * dt;
    float inside = step(0.0, previous.x) * step(previous.x, 1.0) * step(0.0, previous.y) * step(previous.y, 1.0);
    vec3 trail = texture(INPUT0, previous).rgb * inside * exp(-uDecay * dt);
    vec3 ink = emit(uv, aspect);
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    ink += uMouseDown * exp(-dot(d, d) / 0.0012) * vec3(0.8, 0.85, 1.0);
    return vec4(clamp(max(trail, ink), 0.0, 1.0), 1.0);
}
` },
    ],
    display: { name: "display", out: "screen", inputs: ["trail", "vel"], core: DISPLAY },
    needsSource: false,
  };
}

export const wind = makeFlow("Wind", WIND_FIELD, [
  { name: "uDirection", type: "float", value: 15, min: -180, max: 180, step: 1, label: "风向（°）" },
  { name: "uStrength", type: "float", value: 1.0, min: 0, max: 3, step: 0.05, label: "风力" },
  { name: "uGust", type: "float", value: 0.65, min: 0, max: 1, step: 0.01, label: "阵风强度" },
]);

export const noise = makeFlow("Noise", NOISE_FIELD, [
  { name: "uNoiseScale", type: "float", value: 3.5, min: 0.5, max: 12, step: 0.1, label: "噪声尺度" },
  { name: "uStrength", type: "float", value: 1.2, min: 0, max: 3, step: 0.05, label: "噪声强度" },
  { name: "uEvolution", type: "float", value: 0.7, min: 0, max: 3, step: 0.05, label: "演变速度" },
]);
