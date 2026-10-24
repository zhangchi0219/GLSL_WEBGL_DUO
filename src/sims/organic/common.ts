import type { ParamDef } from "../../filters/types";
import type { SimBufferDef, SimModule, SimPassDef } from "../types";

export const FIELD_SIZE = 384;
export const dataBuffer = (name: string, side: number): SimBufferDef => ({ name, components: 4, size: [side, side], format: "rgba32f", filter: "nearest" });
export const fieldBuffer = (name: string, nearest = false): SimBufferDef => ({ name, components: 4, size: [FIELD_SIZE, FIELD_SIZE], format: "rgba16f", filter: nearest ? "nearest" : "linear" });
export const number = (name: string, label: string, value: number, min: number, max: number, step = 0.01): ParamDef => ({ name, label, type: "float", value, min, max, step });
export const baseParams = (ink = [0.38, 0.87, 0.68]): ParamDef[] => [
  number("uSpeed", "生长速度", 1, 0, 2),
  number("uSeed", "随机种子 · 重新生长", 42, 0, 9999, 1),
  { name: "uInk", label: "前景色", type: "color", value: ink },
  { name: "uPaper", label: "背景色", type: "color", value: [0.018, 0.027, 0.035] },
];

// The shared code only uses GLSL ES 3.00 operations also available in GLSL 4.60.
// State lookup always uses texelFetch: filtering must never blend IDs/indices.
export const shared = `
uniform float uSeed;
uniform float uSpeed;
uniform vec3 uInk;
uniform vec3 uPaper;
float random01(uint n) {
    n ^= uint(uSeed) * 747796405u + 2891336453u;
    n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
    n *= 3266489917u; n ^= n >> 16u;
    return float(n & 16777215u) / 16777216.0;
}
int itemId(vec2 uv, vec2 res) { ivec2 p = ivec2(uv * res); return p.y * int(res.x) + p.x; }
vec4 item(sampler2D tex, int id) {
    int width = textureSize(tex, 0).x;
    return texelFetch(tex, ivec2(id % width, id / width), 0);
}
vec2 squareUV(vec2 uv, vec2 res) { return (uv - 0.5) * res / min(res.x, res.y) + 0.5; }
vec2 mouseUV() { return squareUV(uMouse, uCanvasResolution); }
float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 d = b - a;
    return length(p - a - d * clamp(dot(p - a, d) / max(dot(d, d), 1e-12), 0.0, 1.0));
}
`;
export const clearPass = (out: string): SimPassDef => ({ name: `clear_${out}`, out, inputs: [], core: "vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(0.0); }" });
export const clockBuffer = dataBuffer("clock", 1);
export const clockInit = clearPass("clock");
export const clockStep: SimPassDef = { name: "clock", out: "clock", inputs: ["self"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float delta = min(uDt, 1.0 / 30.0) * uSpeed;
    float t = min(texture(INPUT0, vec2(0.5)).x + delta, 100000.0);
    return vec4(t, floor(t * 60.0 + 0.0001), delta, 1.0);
}` };

// Sort (tile key, primitive ID) pairs. Each of the N log²N compare/exchange
// operations happens on a small data texture, never at display resolution.
export function spatialIndex(side: number, geometry = "geometry", valid = "g.x >= 0.0", midpoint = true) {
  const bits = Math.log2(side * side), count = side * side;
  const buffers = [dataBuffer("indices", side), dataBuffer("ranges", 16)];
  const step: SimPassDef[] = [
    { name: "index", out: "indices", inputs: [geometry], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res); vec4 g = item(INPUT0, id);
    vec2 p = ${midpoint ? "(g.xy + g.zw) * 0.5" : "g.xy"};
    ivec2 tile = ivec2(clamp(floor(p * 16.0), vec2(0.0), vec2(15.0)));
    return vec4((${valid}) ? float(tile.y * 16 + tile.x) : 1000000.0, float(id), 0.0, 0.0);
}` },
    { name: "sort", out: "indices", inputs: ["self"], iterations: bits * (bits + 1) / 2, core: `${shared}
bool lessPair(vec2 a, vec2 b) { return a.x < b.x || (a.x == b.x && a.y < b.y); }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int stage = int(uIteration), level = 1;
    for (int l = 1; l <= ${bits}; l++) { if (stage < l) { level = l; break; } stage -= l; }
    int stride = 1 << (level - 1 - stage), block = 1 << level;
    int id = itemId(uv, res), partner = id ^ stride;
    vec4 a = item(INPUT0, id), b = item(INPUT0, partner);
    bool keepMin = ((id & block) == 0) == ((id & stride) == 0);
    return (lessPair(a.xy, b.xy) == keepMin) ? a : b;
}` },
    { name: "ranges", out: "ranges", inputs: ["indices"], core: `${shared}
int bound(float key) {
    int lo = 0, hi = ${count};
    for (int k = 0; k < ${bits + 1}; k++) {
        if (lo >= hi) break;
        int mid = (lo + hi) / 2;
        if (item(INPUT0, mid).x < key) lo = mid + 1; else hi = mid;
    }
    return lo;
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float key = float(itemId(uv, res));
    return vec4(float(bound(key)), float(bound(key + 1.0)), 0.0, 0.0);
}` },
  ];
  return { buffers, step };
}

// INPUT0 = primitives, INPUT1 = sorted IDs, INPUT2 = tile ranges.
// A primitive's midpoint lies within one tile of every point on segments <= .1.
// The L-system's very short grammars use a bounded direct path for longer limbs.
export function gather(points: boolean, count: number, radius: string, direct = "false", directCount = "0") {
  const distance = points ? "length(p - g.xy)" : "segmentDistance(p, g.xy, g.zw)";
  return `
float primitiveWeight(vec2 p, int id, float radius) {
    vec4 g = item(INPUT0, id);
    if (g.x < 0.0) return 0.0;
    return 1.0 - smoothstep(radius * 0.35, radius, ${distance});
}
float gatherAt(vec2 p) {
    float radius = ${radius}, total = 0.0;
    if (${direct}) {
        for (int id = 0; id < ${count}; id++) { if (id >= int(${directCount})) break; total += primitiveWeight(p, id, radius); }
        return total;
    }
    ivec2 center = ivec2(floor(p * 16.0));
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        ivec2 cell = center + ivec2(x, y);
        if (any(lessThan(cell, ivec2(0))) || any(greaterThanEqual(cell, ivec2(16)))) continue;
        vec2 span = texelFetch(INPUT2, cell, 0).xy;
        for (int k = 0; k < ${count}; k++) {
            int index = int(span.x) + k; if (index >= int(span.y)) break;
            total += primitiveWeight(p, int(item(INPUT1, index).y), radius);
        }
    }
    return total;
}
`;
}

export const display = (field = "field", intensity = "texture(INPUT0, p).r"): SimPassDef => ({ name: "display", out: "screen", inputs: [field], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 p = squareUV(uv, res);
    if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) return vec4(uPaper, 1.0);
    float ink = clamp(${intensity}, 0.0, 1.0);
    return vec4(mix(uPaper, uInk, ink), 1.0);
}` });

export function organic(id: string, name: string, desc: string, params: ParamDef[], buffers: SimBufferDef[], init: SimPassDef[], step: SimPassDef[], screen = display(), resetOnParams = ["uSeed"]): SimModule {
  return {
    meta: { id: `organic-${id}`, name, group: "Organic Growth", desc, animated: true, heavy: true,
      tdNote: "No source TOP required. Fixed 384 x 384 square domain; fit the display without stretching. Data/indices use nearest sampling and RGBA32F. Reset all feedback together after changing initialization controls. The clock buffer supplies reset-local time; uCanvasResolution must match the display TOP size. Match dt, input and pass scheduling for cross-platform comparison." },
    params, buffers: [clockBuffer, ...buffers], init: [clockInit, ...init], step: [clockStep, ...step], display: screen, needsSource: false, resetOnParams,
  };
}
