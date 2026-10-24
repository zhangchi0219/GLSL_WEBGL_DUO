import { baseParams, dataBuffer, fieldBuffer, shared, number, organic, spatialIndex, gather, clearPass } from "./common";

const controls = `uniform float uInfluence;
uniform float uKillDistance;
uniform float uStepLength;
uniform float uWidth;
`;
const index = spatialIndex(32);
export const spaceColonization = organic("space-colonization", "Space Colonization",
  "在叶形区域播下 512 个吸引点。已有节点朝附近吸引点的综合方向生长，到达后移除吸引点，形成主干与细脉。最多 1024 个节点；完成后保留成品。",
  [...baseParams(), number("uInfluence", "吸引影响距离", 0.15, 0.05, 0.35), number("uKillDistance", "吸引点到达距离", 0.021, 0.01, 0.06, 0.001), number("uStepLength", "生长步长", 0.014, 0.005, 0.035, 0.001), number("uWidth", "枝条半宽", 0.0018, 0.0008, 0.008, 0.0001)],
  [dataBuffer("nodes", 32), { ...dataBuffer("attractors", 32), size: [32, 16] }, dataBuffer("proposals", 32), dataBuffer("count", 1), dataBuffer("geometry", 32), ...index.buffers, fieldBuffer("field")],
  [{ name: "seed_nodes", out: "nodes", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) { return itemId(uv, res) == 0 ? vec4(0.5, 0.065, -1.0, 1.0) : vec4(0.0); }
` }, { name: "seed_attractors", out: "attractors", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    uint id = uint(itemId(uv, res));
    float a = random01(id * 2u + 1u) * 6.2831853, r = sqrt(random01(id * 2u + 2u));
    vec2 p = vec2(0.5, 0.55) + vec2(cos(a) * 0.36, sin(a) * 0.43) * r;
    return vec4(p, -1.0, 1.0);
}` }, { name: "seed_count", out: "count", inputs: [], core: "vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(1.0, 0.0, 0.0, 1.0); }" }, clearPass("geometry"), clearPass("field"), clearPass("proposals")],
  [{ name: "assign", out: "attractors", inputs: ["self", "nodes", "count"], core: `${shared}${controls}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv); if (a.w < 0.5) return a;
    int count = int(texture(INPUT2, vec2(0.5)).x), nearest = -1; float best = 100.0;
    for (int i = 0; i < 1024; i++) {
        if (i >= count) break; vec2 p = item(INPUT1, i).xy;
        float distance = length(a.xy - p); if (distance < best) { best = distance; nearest = i; }
    }
    return vec4(a.xy, best <= uInfluence ? float(nearest) : -1.0, best < uKillDistance ? 0.0 : 1.0);
}` }, { name: "propose", out: "proposals", inputs: ["nodes", "attractors", "count", "clock"], core: `${shared}${controls}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), count = int(texture(INPUT2, vec2(0.5)).x);
    vec4 clock = texture(INPUT3, vec2(0.5));
    if (id >= count || count >= 1024 || clock.z <= 0.0 || floor(clock.x * 18.0) <= floor(max(0.0, clock.x - clock.z) * 18.0)) return vec4(0.0);
    vec2 p = item(INPUT0, id).xy, direction = vec2(0.0), nearest = vec2(0.0); float best = 100.0, votes = 0.0;
    for (int j = 0; j < 512; j++) {
        vec4 a = item(INPUT1, j); if (a.w < 0.5) continue;
        vec2 d = a.xy - p; float distance = length(d);
        if (distance < best) { best = distance; nearest = d; }
        if (int(a.z) == id && a.z >= 0.0) { direction += d / max(distance, 1e-6); votes += 1.0; }
    }
    // Extend the initial trunk toward the nearest remaining attractor until
    // it reaches the influence envelope, as in the space-colonization model.
    if (votes == 0.0 && count < 20 && id == count - 1 && best < 10.0) direction = nearest;
    if (length(direction) < 1e-6) return vec4(0.0);
    vec2 next = p + normalize(direction) * uStepLength;
    // A new segment may not duplicate an existing node.
    for (int j = 0; j < 1024; j++) {
        if (j >= count) break;
        if (length(item(INPUT0, j).xy - next) < uStepLength * 0.45) return vec4(0.0);
    }
    return vec4(clamp(next, vec2(0.02), vec2(0.98)), 1.0, 1.0);
}` }, { name: "prefix", out: "proposals", inputs: ["self"], iterations: 10, core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), offset = 1 << int(uIteration);
    vec4 proposal = item(INPUT0, id);
    if (id >= offset) proposal.w += item(INPUT0, id - offset).w;
    return proposal;
}` }, { name: "append", out: "nodes", inputs: ["self", "proposals", "count"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    int id = itemId(uv, res), count = int(texture(INPUT2, vec2(0.5)).x);
    if (id < count) return item(INPUT0, id);
    int rank = id - count + 1, total = int(item(INPUT1, 1023).w);
    if (rank > total) return vec4(0.0);
    int lo = 0, hi = 1024;
    for (int k = 0; k < 11; k++) {
        if (lo >= hi) break; int mid = (lo + hi) / 2;
        if (item(INPUT1, mid).w < float(rank)) lo = mid + 1; else hi = mid;
    }
    return vec4(item(INPUT1, lo).xy, float(lo), 1.0);
}` }, { name: "count", out: "count", inputs: ["self", "proposals"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(min(1024.0, texture(INPUT0, vec2(0.5)).x + item(INPUT1, 1023).w), 0.0, 0.0, 1.0); }
` }, { name: "segments", out: "geometry", inputs: ["nodes"], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 node = texture(INPUT0, uv);
    if (node.w < 0.5 || node.z < 0.0) return vec4(-10.0);
    return vec4(item(INPUT0, int(node.z)).xy, node.xy);
}` }, ...index.step,
  { name: "raster", out: "field", inputs: ["geometry", "indices", "ranges"], core: `${shared}${controls}${gather(false, 1024, "uWidth + 0.0013")}
vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(min(gatherAt(uv), 1.0), 0.0, 0.0, 1.0); }
` }]);
