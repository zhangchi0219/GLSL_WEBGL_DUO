import type { SimModule } from "../types";

// 和布料一样使用位移、速度、strain spring 与半隐式 Euler。
// 材料节点按 19×17 逻辑网格存储；缓冲区 texel 只是节点数据的副本。
// 读取节点中心可避免固定边缘的像素级振荡，显示时再插值节点位置。
const GRID = /* glsl */ `
const vec2 PANEL_MIN = vec2(0.2);
const vec2 PANEL_MAX = vec2(0.8);
vec2 gridSize(sampler2D field) { return min(vec2(19.0, 17.0), vec2(textureSize(field, 0))); }
vec4 nodeValue(sampler2D field, vec2 node) {
    vec2 size = gridSize(field), dimensions = vec2(textureSize(field, 0));
    vec2 uv = (clamp(node, vec2(0.0), size - 1.0) + 0.5) / size;
    return texelFetch(field, min(ivec2(uv * dimensions), ivec2(dimensions) - 1), 0);
}
vec2 restPosition(vec2 node, vec2 size) {
    return PANEL_MIN + node * (PANEL_MAX - PANEL_MIN) / max(size - 1.0, vec2(1.0));
}
`;
const ZERO = /* glsl */ `
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(0.0); }
`;

export const physics: SimModule = {
  meta: {
    id: "example-physics", name: "Physics", group: "Simulation Examples", animated: true,
    desc: "顶边固定的弹簧网格受重力下垂。拖动局部网格后释放，观察振荡和阻尼；青色表示低拉伸，橙色表示高拉伸。",
    tdNote: "No source TOP required. pos.xy stores displacement, pos.z strain; vel.xy stores velocity. Both buffers use feedback. State is a 19 x 17 material node grid replicated across buffer texels, with fewer nodes only if the buffer is smaller. The top row is pinned. Match uDt across platforms.",
  },
  params: [
    { name: "uGravity", type: "float", value: 0.35, min: 0, max: 1.2, step: 0.01, label: "重力" },
    { name: "uStiffness", type: "float", value: 3.5, min: 0.5, max: 12, step: 0.1, label: "弹簧刚度" },
    { name: "uDamping", type: "float", value: 2.5, min: 0.2, max: 8, step: 0.1, label: "阻尼" },
    { name: "uPointerForce", type: "float", value: 12, min: 0, max: 25, step: 0.5, label: "拖拽力度" },
  ],
  buffers: [{ name: "pos", components: 4, scale: 0.25 }, { name: "vel", components: 2, scale: 0.25 }],
  init: [{ name: "seedPos", out: "pos", inputs: [], core: ZERO }, { name: "seedVel", out: "vel", inputs: [], core: ZERO }],
  step: [
    { name: "forces", out: "vel", inputs: ["self", "pos"], core: /* glsl */ `
${GRID}
uniform float uGravity;
uniform float uStiffness;
uniform float uDamping;
uniform float uPointerForce;
vec2 spring(vec2 node, vec2 P, vec2 off, vec2 size, float aspect) {
    vec2 other = node + off;
    if (any(lessThan(other, vec2(0.0))) || any(greaterThan(other, size - 1.0))) return vec2(0.0);
    vec2 metric = vec2(aspect, 1.0);
    vec2 rest = (restPosition(other, size) - restPosition(node, size)) * metric;
    vec2 d = rest + (nodeValue(INPUT1, other).xy - P) * metric;
    float len = max(length(d), 0.00001), restLength = max(length(rest), 0.00001);
    return uStiffness * clamp(len / restLength - 1.0, -1.0, 2.0) * d / len / metric;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 size = gridSize(INPUT1), node = min(floor(uv * size), size - 1.0);
    if (node.y >= size.y - 1.0) return vec4(0.0);
    float aspect = res.x / res.y;
    vec2 P = nodeValue(INPUT1, node).xy;
    vec2 f = vec2(0.0, -uGravity) - P * 1.5;
    f += spring(node, P, vec2(1.0, 0.0), size, aspect);
    f += spring(node, P, vec2(-1.0, 0.0), size, aspect);
    f += spring(node, P, vec2(0.0, 1.0), size, aspect);
    f += spring(node, P, vec2(0.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(1.0, 1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(-1.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(1.0, -1.0), size, aspect);
    f += 0.6 * spring(node, P, vec2(-1.0, 1.0), size, aspect);
    vec2 toMouse = uMouse - (restPosition(node, size) + P);
    vec2 d = toMouse * vec2(aspect, 1.0);
    f += uMouseDown * toMouse * uPointerForce * exp(-dot(d, d) / 0.018);
    float dt = clamp(uDt, 0.0001, 1.0 / 30.0);
    vec2 velocity = (nodeValue(INPUT0, node).xy + clamp(f, vec2(-20.0), vec2(20.0)) * dt) * exp(-uDamping * dt);
    return vec4(clamp(velocity, vec2(-1.5), vec2(1.5)), 0.0, 1.0);
}
` },
    { name: "integrate", out: "pos", inputs: ["self", "vel"], core: /* glsl */ `
${GRID}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 size = gridSize(INPUT0), node = min(floor(uv * size), size - 1.0);
    if (node.y >= size.y - 1.0) return vec4(0.0);
    vec2 P = nodeValue(INPUT0, node).xy;
    vec2 next = clamp(P + nodeValue(INPUT1, node).xy * min(uDt, 1.0 / 30.0), vec2(-0.15), vec2(0.15));
    vec2 off = mix(vec2(1.0), vec2(-1.0), step(size - 1.0, node));
    vec2 spacing = (PANEL_MAX - PANEL_MIN) / max(size - 1.0, vec2(1.0));
    vec2 dx = (nodeValue(INPUT0, node + vec2(off.x, 0.0)).xy - P) / (off.x * spacing.x);
    vec2 dy = (nodeValue(INPUT0, node + vec2(0.0, off.y)).xy - P) / (off.y * spacing.y);
    float stretch = abs(length(vec2(1.0, 0.0) + dx) - 1.0) + abs(length(vec2(0.0, 1.0) + dy) - 1.0);
    return vec4(next, min(stretch, 3.0), 1.0);
}
` },
  ],
  display: { name: "display", out: "screen", inputs: ["pos"], core: /* glsl */ `
${GRID}
// 四个节点双线性插值，同时求出局部位移和 Jacobian。
void material(vec2 q, out vec3 P, out vec2 dx, out vec2 dy) {
    vec2 cells = max(gridSize(INPUT0) - 1.0, vec2(1.0));
    vec2 spacing = (PANEL_MAX - PANEL_MIN) / cells;
    vec2 g = clamp((q - PANEL_MIN) / spacing, vec2(0.0), cells - 0.0001);
    vec2 node = floor(g), f = fract(g);
    vec3 a = nodeValue(INPUT0, node).xyz, b = nodeValue(INPUT0, node + vec2(1.0, 0.0)).xyz;
    vec3 c = nodeValue(INPUT0, node + vec2(0.0, 1.0)).xyz, d = nodeValue(INPUT0, node + vec2(1.0)).xyz;
    P = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    dx = mix(b.xy - a.xy, d.xy - c.xy, f.y) / spacing.x;
    dy = mix(c.xy - a.xy, d.xy - b.xy, f.x) / spacing.y;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 q = clamp(uv, PANEL_MIN, PANEL_MAX);
    vec3 P; vec2 dx, dy;
    // Newton 反查材料坐标，可收敛于固定边缘附近的拉伸网格。
    for (int i = 0; i < 7; i++) {
        material(q, P, dx, dy);
        vec2 e = q + P.xy - uv;
        vec2 jx = vec2(1.0, 0.0) + dx, jy = vec2(0.0, 1.0) + dy;
        float det = jx.x * jy.y - jy.x * jx.y;
        vec2 correction = e * 0.25;
        if (abs(det) > 0.05) correction = vec2(jy.y * e.x - jy.x * e.y, jx.x * e.y - jx.y * e.x) / det;
        q = clamp(q - clamp(correction, vec2(-0.08), vec2(0.08)) * 0.9, PANEL_MIN, PANEL_MAX);
    }
    material(q, P, dx, dy);
    float error = length((q + P.xy - uv) * vec2(res.x / res.y, 1.0));
    vec2 grid = (q - PANEL_MIN) / (PANEL_MAX - PANEL_MIN) * max(gridSize(INPUT0) - 1.0, vec2(1.0));
    vec2 d = abs(fract(grid + 0.5) - 0.5);
    float aa = max(max(fwidth(grid.x), fwidth(grid.y)), 0.015);
    float line = 1.0 - smoothstep(0.018, 0.018 + aa, min(d.x, d.y));
    float dotMask = 1.0 - smoothstep(0.06, 0.06 + aa, length(d));
    float mask = 1.0 - smoothstep(1.0 / res.y, 2.5 / res.y, error);
    vec3 tint = mix(vec3(0.16, 0.82, 0.77), vec3(1.0, 0.39, 0.16), clamp(P.z * 1.3, 0.0, 1.0));
    vec3 col = vec3(0.018, 0.025, 0.034) + mask * tint * (line * 0.75 + dotMask * 0.4);
    float top = 1.0 - smoothstep(1.0 / res.y, 3.0 / res.y, abs(uv.y - PANEL_MAX.y));
    col += top * step(PANEL_MIN.x, uv.x) * step(uv.x, PANEL_MAX.x) * vec3(0.42, 0.48, 0.51);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}
` },
  needsSource: false,
};
