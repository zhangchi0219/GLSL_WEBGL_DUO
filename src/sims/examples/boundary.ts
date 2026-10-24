import type { SimModule } from "../types";

const DOMAIN = /* glsl */ `
uniform vec2 uObstacle;
uniform float uRadius;
// 以画面高度为单位保持圆形；矩形容器和圆形障碍物均为不可穿透边界。
bool solid(vec2 uv, float aspect) {
    return any(lessThan(uv, vec2(0.06))) || any(greaterThan(uv, vec2(0.94)))
        || length((uv - uObstacle) * vec2(aspect, 1.0)) < uRadius;
}
`;

export const boundary: SimModule = {
  meta: {
    id: "example-boundary", name: "Boundary", group: "Simulation Examples", animated: true,
    desc: "波纹在容器边缘和圆形障碍物上反射。移动或缩放障碍物、调整波速和阻尼；拖动产生额外波纹。蓝色与橙色分别表示波峰和波谷。",
    tdNote: "No source TOP required. h stores current and previous wave heights. uWaveSpeed is the per-step Courant coefficient (<= 0.68); match frame rates when comparing propagation. Solid neighbors use a zero-normal-gradient reflecting boundary.",
  },
  params: [
    { name: "uObstacle", type: "vec2", value: [0.63, 0.53], min: 0.1, max: 0.9, step: 0.01, label: "障碍物位置" },
    { name: "uRadius", type: "float", value: 0.12, min: 0.025, max: 0.25, step: 0.005, label: "障碍物半径" },
    { name: "uWaveSpeed", type: "float", value: 0.65, min: 0.1, max: 0.68, step: 0.01, label: "波速" },
    { name: "uDamping", type: "float", value: 0.998, min: 0.94, max: 0.9995, step: 0.0005, label: "波纹保留率" },
    { name: "uFrequency", type: "float", value: 1.5, min: 0.2, max: 4, step: 0.1, label: "波源频率" },
    { name: "uPointerForce", type: "float", value: 0.7, min: 0, max: 2, step: 0.05, label: "扰动强度" },
  ],
  buffers: [{ name: "h", components: 2, scale: 0.5 }],
  init: [{ name: "seed", out: "h", inputs: [], core: /* glsl */ `
${DOMAIN}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    if (solid(uv, aspect)) return vec4(0.0);
    vec2 d = (uv - vec2(0.28, 0.5)) * vec2(aspect, 1.0);
    // 预置环形波，暂停加载时也能看到非空的初始状态。
    float h = 0.3 * exp(-pow((length(d) - 0.075) / 0.012, 2.0));
    return vec4(h, h, 0.0, 1.0);
}
` }],
  step: [{ name: "propagate", out: "h", inputs: ["self"], core: /* glsl */ `
${DOMAIN}
uniform float uWaveSpeed;
uniform float uDamping;
uniform float uFrequency;
uniform float uPointerForce;
float neighbor(vec2 uv, float center, float aspect) {
    // 固体邻居使用中心值作为 ghost cell：法向导数为零，波在边界反射。
    return solid(uv, aspect) ? center : texture(INPUT0, uv).r;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    if (solid(uv, aspect)) return vec4(0.0);
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    vec2 h = texture(INPUT0, uv).rg;
    float lap = neighbor(uv + vec2(t.x, 0.0), h.r, aspect)
              + neighbor(uv - vec2(t.x, 0.0), h.r, aspect)
              + neighbor(uv + vec2(0.0, t.y), h.r, aspect)
              + neighbor(uv - vec2(0.0, t.y), h.r, aspect) - 4.0 * h.r;
    // 二维显式波动方程的 CFL 上限为 1/sqrt(2)。
    float speed = clamp(uWaveSpeed, 0.0, 0.68);
    float next = h.r + (h.r - h.g) * uDamping + speed * speed * lap;
    vec2 d = (uv - vec2(0.28, 0.5)) * vec2(aspect, 1.0);
    float source = exp(-dot(d, d) / 0.00022);
    next = mix(next, sin(time * 6.283185 * uFrequency) * 0.65, source * 0.4);
    vec2 mouse = (uv - uMouse) * vec2(aspect, 1.0);
    next += uMouseDown * uPointerForce * exp(-dot(mouse, mouse) / 0.0007) * min(uDt * 60.0, 2.0) * 0.08;
    return vec4(clamp(next, -3.0, 3.0), h.r, 0.0, 1.0);
}
` }],
  display: { name: "display", out: "screen", inputs: ["h"], core: /* glsl */ `
${DOMAIN}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 t = 1.0 / vec2(textureSize(INPUT0, 0));
    float height = texture(INPUT0, uv).r;
    float dx = texture(INPUT0, uv + vec2(t.x, 0.0)).r - texture(INPUT0, uv - vec2(t.x, 0.0)).r;
    float dy = texture(INPUT0, uv + vec2(0.0, t.y)).r - texture(INPUT0, uv - vec2(0.0, t.y)).r;
    vec2 p = uv * vec2(aspect, 1.0);
    vec2 grid = abs(fract(p * 20.0 + 0.5) - 0.5);
    float gridLine = 1.0 - smoothstep(0.01, 0.045, min(grid.x, grid.y));
    vec3 col = vec3(0.018, 0.026, 0.037) + gridLine * vec3(0.016, 0.022, 0.03);
    col += vec3(0.13, 0.75, 1.0) * max(height, 0.0) * 1.8;
    col += vec3(1.0, 0.42, 0.15) * max(-height, 0.0) * 1.8;
    col += vec3(0.16, 0.32, 0.40) * min(length(vec2(dx, dy)) * 3.0, 0.7);
    float circle = length((uv - uObstacle) * vec2(aspect, 1.0)) - uRadius;
    vec2 wall = min(uv - 0.06, 0.94 - uv) * vec2(aspect, 1.0);
    float edge = min(abs(circle), abs(min(wall.x, wall.y)));
    float aa = 1.5 / res.y;
    if (solid(uv, aspect)) col = vec3(0.035, 0.043, 0.055);
    col += (1.0 - smoothstep(aa, aa * 2.5, edge)) * vec3(0.4, 0.50, 0.60);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
` },
  needsSource: false,
};
