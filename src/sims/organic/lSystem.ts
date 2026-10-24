import { baseParams, dataBuffer, fieldBuffer, shared, number, organic, spatialIndex, gather, clearPass } from "./common";

const index = spatialIndex(64);
const controls = `uniform float uDepth;
uniform float uAngle;
uniform float uLength;
uniform float uJitter;
uniform float uWidth;
`;
export const lSystem = organic("l-system", "L-system",
  "分枝文法 F → F[+F]F[-F]F。方括号保存与恢复枝条方向；每代替换产生五段，最多五代。逐段生长展示文法生成的结构。",
  [...baseParams(), number("uDepth", "迭代代数 · 重新生长", 4, 1, 5, 1), number("uAngle", "分枝角 · 重新生长", 25, 5, 60, 0.1), number("uLength", "整体长度 · 重新生长", 1, 0.4, 1.1), number("uJitter", "角度随机量 · 重新生长", 4, 0, 15, 0.1), number("uWidth", "枝条半宽", 0.0018, 0.0008, 0.008, 0.0001)],
  [dataBuffer("structure", 64), dataBuffer("geometry", 64), ...index.buffers, fieldBuffer("field")],
  [{ name: "grammar", out: "structure", inputs: [], core: `${shared}${controls}
// Bounded grammar traversal: the base-5 address selects a child F at each
// expansion. The explicit stack records turtle origins and headings.
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), depth = int(uDepth);
    if (float(id) >= pow(5.0, uDepth)) return vec4(-10.0);
    vec2 origins[6]; float headings[6];
    origins[0] = vec2(0.5, 0.08); headings[0] = 1.570796327;
    float unit = 0.76 * uLength / pow(3.0, uDepth);
    int remaining = id; uint path = 1u;
    for (int level = 0; level < 5; level++) {
        if (level >= depth) break;
        int divisor = int(pow(5.0, float(depth - level - 1)) + 0.5);
        int child = remaining / divisor; remaining %= divisor;
        float span = unit * pow(3.0, float(depth - level - 1));
        float offset = child == 0 ? 0.0 : (child <= 2 ? 1.0 : 2.0);
        vec2 axis = vec2(cos(headings[level]), sin(headings[level]));
        origins[level + 1] = origins[level] + axis * span * offset;
        path = path * 5u + uint(child);
        float angle = radians(uAngle + (random01(path) - 0.5) * 2.0 * uJitter);
        headings[level + 1] = headings[level] + (child == 1 ? angle : (child == 3 ? -angle : 0.0));
    }
    vec2 start = origins[depth], end = start + unit * vec2(cos(headings[depth]), sin(headings[depth]));
    return vec4(start, end);
}` }, clearPass("field"), clearPass("geometry")],
  [{ name: "grow", out: "geometry", inputs: ["structure", "clock"], core: `${shared}${controls}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res); vec4 g = item(INPUT0, id);
    float progress = texture(INPUT1, vec2(0.5)).x * pow(5.0, uDepth) / 6.0;
    if (float(id) >= progress || g.x < 0.0) return vec4(-10.0);
    return vec4(g.xy, mix(g.xy, g.zw, clamp(progress - float(id), 0.0, 1.0)));
}` }, ...index.step,
  { name: "raster", out: "field", inputs: ["geometry", "indices", "ranges"], core: `${shared}${controls}${gather(false, 4096, "uWidth + 0.0013", "uDepth <= 2.0", "pow(5.0, uDepth)")}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(min(gatherAt(uv), 1.0), 0.0, 0.0, 1.0); }
` }], undefined, ["uSeed", "uDepth", "uAngle", "uLength", "uJitter"]);
