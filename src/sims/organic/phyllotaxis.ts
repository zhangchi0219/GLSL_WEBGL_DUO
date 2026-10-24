import { baseParams, dataBuffer, fieldBuffer, shared, number, organic, spatialIndex, gather, clearPass } from "./common";

const index = spatialIndex(64, "geometry", "g.x >= 0.0", false);
const controls = "uniform float uCount;\nuniform float uAngle;\nuniform float uSpacing;\nuniform float uPointSize;\n";
export const phyllotaxis = organic("phyllotaxis", "Phyllotaxis",
  "叶序 / Vogel 模型：按发散角与平方根半径逐点生长。黄金角产生向日葵般的螺旋；改变角度可观察排列变化。",
  [...baseParams([0.94, 0.68, 0.3]), number("uCount", "点数 · 重新生长", 1600, 64, 4096, 1), number("uAngle", "发散角 · 重新生长", 137.5078, 125, 150, 0.0001), number("uSpacing", "排列尺度 · 重新生长", 1, 0.4, 1.1), number("uPointSize", "圆点半径", 0.0038, 0.0015, 0.018, 0.0001)],
  [dataBuffer("geometry", 64), ...index.buffers, fieldBuffer("field")],
  [clearPass("geometry"), clearPass("field")],
  [{ name: "grow", out: "geometry", inputs: ["clock"], core: `${shared}${controls}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res);
    float visible = min(uCount, 1.0 + texture(INPUT0, vec2(0.5)).x * uCount / 7.0);
    if (float(id) >= visible) return vec4(-10.0);
    float angle = float(id) * radians(uAngle) + random01(5u) * 6.2831853;
    float radius = 0.435 * uSpacing * sqrt(float(id) / max(uCount - 1.0, 1.0));
    vec2 p = vec2(0.5) + radius * vec2(cos(angle), sin(angle));
    return vec4(p, p);
}` }, ...index.step,
  { name: "raster", out: "field", inputs: ["geometry", "indices", "ranges"], core: `${shared}${controls}${gather(true, 4096, "uPointSize")}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(min(gatherAt(uv), 1.0), 0.0, 0.0, 1.0); }
` }], undefined, ["uSeed", "uCount", "uAngle", "uSpacing"]);
