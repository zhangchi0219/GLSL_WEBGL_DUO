import { baseParams, dataBuffer, fieldBuffer, shared, number, organic, spatialIndex, gather, display } from "./common";

const index = spatialIndex(32, "walkers", "g.z > 0.5", false);
export const dla = organic("dla", "DLA",
  "扩散限制聚集：1024 个粒子在像素网格上随机游走，接触聚集体后按黏附概率固定，再投放新粒子。聚集体不可逆增长；拖动添加生长种子。",
  [...baseParams([0.86, 0.64, 0.95]), number("uStick", "黏附概率", 1, 0.1, 1)],
  [dataBuffer("walkers", 32), dataBuffer("extent", 1), ...index.buffers, fieldBuffer("aggregate", true)],
  [{ name: "seed_extent", out: "extent", inputs: [], core: "vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(0.008, 0.0, 0.0, 1.0); }" }, { name: "seed_aggregate", out: "aggregate", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(length((uv - 0.5) * res) < 2.0 ? 1.0 : 0.0, 0.0, 0.0, 1.0); }
` }, { name: "seed_walkers", out: "walkers", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    uint id = uint(itemId(uv, res));
    float angle = random01(id * 2u + 1u) * 6.2831853;
    float radius = 0.018 + random01(id * 2u + 2u) * 0.05;
    vec2 p = vec2(0.5) + radius * vec2(cos(angle), sin(angle));
    return vec4((floor(p * 384.0) + 0.5) / 384.0, 0.0, 1.0);
}` }],
  [{ name: "respawn", out: "walkers", inputs: ["self", "clock", "extent"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv), clock = texture(INPUT1, vec2(0.5));
    float extent = texture(INPUT2, vec2(0.5)).x;
    if (clock.z <= 0.0 || (a.z < 0.5 && length(a.xy - 0.5) < extent * 2.0 + 0.08)) return a;
    uint key = uint(itemId(uv, res)) + uint(clock.y) * 4099u;
    float angle = random01(key) * 6.2831853;
    vec2 p = vec2(0.5) + min(0.47, extent + 0.015 + random01(key + 1u) * 0.01) * vec2(cos(angle), sin(angle));
    return vec4((floor(p * 384.0) + 0.5) / 384.0, 0.0, 1.0);
}` }, { name: "walk", out: "walkers", inputs: ["self", "aggregate", "clock"], iterations: 8, core: `${shared}
uniform float uStick;
bool solid(ivec2 p) { return texelFetch(INPUT1, clamp(p, ivec2(0), ivec2(383)), 0).r > 0.5; }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv), clock = texture(INPUT2, vec2(0.5));
    if (a.z > 0.5 || clock.z <= 0.0) return a;
    uint key = uint(itemId(uv, res)) + uint(clock.y) * 4099u + uint(uIteration) * 65537u;
    if (random01(key + 7u) > min(clock.z * 60.0, 1.0)) return a;
    ivec2 cell = ivec2(a.xy * 384.0);
    int direction = int(random01(key) * 4.0);
    ivec2 delta = direction == 0 ? ivec2(1, 0) : direction == 1 ? ivec2(-1, 0) : direction == 2 ? ivec2(0, 1) : ivec2(0, -1);
    ivec2 next = clamp(cell + delta, ivec2(3), ivec2(380));
    if (!solid(next)) cell = next;
    bool touching = solid(cell + ivec2(1, 0)) || solid(cell + ivec2(-1, 0)) || solid(cell + ivec2(0, 1)) || solid(cell + ivec2(0, -1));
    float attached = touching && random01(key + 3u) < uStick ? 1.0 : 0.0;
    return vec4((vec2(cell) + 0.5) / 384.0, attached, 1.0);
}` }, { name: "extent", out: "extent", inputs: ["self", "walkers"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float radius = texture(INPUT0, vec2(0.5)).x;
    for (int i = 0; i < 1024; i++) { vec4 a = item(INPUT1, i); if (a.z > 0.5) radius = max(radius, length(a.xy - 0.5)); }
    return vec4(radius, 0.0, 0.0, 1.0);
}` }, ...index.step,
  { name: "aggregate", out: "aggregate", inputs: ["walkers", "indices", "ranges", "self"], core: `${shared}${gather(true, 1024, "0.00125")}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float occupied = texture(INPUT3, uv).r;
    if (uSpeed > 0.0) occupied = max(occupied, step(0.1, gatherAt(uv)));
    if (uMouseDown > 0.5 && length(uv - mouseUV()) < 0.007) occupied = 1.0;
    return vec4(occupied, 0.0, 0.0, 1.0);
}` }], display("aggregate"));
