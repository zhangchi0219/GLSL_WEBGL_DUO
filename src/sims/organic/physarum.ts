import { baseParams, dataBuffer, fieldBuffer, shared, number, organic, spatialIndex, gather, clearPass, display } from "./common";

const index = spatialIndex(64, "agents", "g.x >= 0.0", false);
const controls = `uniform float uSensorDistance;
uniform float uSensorAngle;
uniform float uTurnAngle;
uniform float uMoveSpeed;
uniform float uDecay;
uniform float uDiffusion;
`;
export const physarum = organic("physarum", "Physarum",
  "4096 个黏菌粒子读取前方、左前与右前的轨迹浓度，选择方向并留下新轨迹。轨迹扩散与衰减，逐渐形成交织网络；拖动加入吸引轨迹。",
  [...baseParams([0.38, 0.86, 0.88]), number("uSensorDistance", "感知距离", 0.025, 0.005, 0.08, 0.001), number("uSensorAngle", "感知角", 45, 5, 100, 0.1), number("uTurnAngle", "转向角", 38, 1, 100, 0.1), number("uMoveSpeed", "粒子移动速度", 0.08, 0.01, 0.2), number("uDecay", "轨迹衰减", 0.6, 0.05, 3), number("uDiffusion", "轨迹扩散", 0.6, 0, 1)],
  [dataBuffer("agents", 64), ...index.buffers, fieldBuffer("field")],
  [{ name: "seed_agents", out: "agents", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    uint id = uint(itemId(uv, res));
    vec2 p = vec2(random01(id * 3u + 1u), random01(id * 3u + 2u)) * 0.88 + 0.06;
    return vec4(p, random01(id * 3u + 3u) * 6.2831853, 1.0);
}` }, clearPass("field")],
  [{ name: "move", out: "agents", inputs: ["self", "field", "clock"], core: `${shared}${controls}
float sense(vec2 p, float angle) { return texture(INPUT1, clamp(p + uSensorDistance * vec2(cos(angle), sin(angle)), vec2(0.0), vec2(1.0))).r; }
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec4 a = texture(INPUT0, uv), clock = texture(INPUT2, vec2(0.5));
    if (clock.z <= 0.0) return a;
    float sensor = radians(uSensorAngle), f = sense(a.xy, a.z), l = sense(a.xy, a.z + sensor), r = sense(a.xy, a.z - sensor);
    float turn = radians(uTurnAngle) * clock.z * 60.0;
    if (f < l || f < r) {
        if (abs(l - r) < 0.00001) a.z += (random01(uint(itemId(uv, res)) + uint(clock.y) * 4099u) < 0.5 ? -turn : turn);
        else a.z += l > r ? turn : -turn;
    }
    vec2 p = a.xy + vec2(cos(a.z), sin(a.z)) * uMoveSpeed * clock.z;
    if (p.x < 0.02 || p.x > 0.98) { a.z = 3.14159265 - a.z; p.x = clamp(p.x, 0.02, 0.98); }
    if (p.y < 0.02 || p.y > 0.98) { a.z = -a.z; p.y = clamp(p.y, 0.02, 0.98); }
    return vec4(p, mod(a.z, 6.2831853), 1.0);
}` }, ...index.step,
  { name: "deposit", out: "field", inputs: ["agents", "indices", "ranges", "self"], core: `${shared}${controls}${gather(true, 4096, "0.0038")}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    // Integrating with uDt rather than frame count keeps diffusion/decay bounded.
    float delta = min(uDt, 1.0 / 30.0) * uSpeed;
    float old = texture(INPUT3, uv).r; if (delta <= 0.0) return vec4(old, 0.0, 0.0, 1.0);
    float blurred = old * 0.4;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        blurred += texture(INPUT3, uv + vec2(x, y) * uTexel).r * ((x == 0 || y == 0) ? 0.1 : 0.05);
    }
    float trail = mix(old, blurred, min(1.0, uDiffusion * delta * 60.0)) * exp(-uDecay * delta);
    trail += gatherAt(uv) * delta * 3.0;
    if (uMouseDown > 0.5) trail += (1.0 - smoothstep(0.01, 0.035, length(uv - mouseUV()))) * delta * 12.0;
    return vec4(clamp(trail, 0.0, 8.0), 0.0, 0.0, 1.0);
}` }], display("field", "1.0 - exp(-texture(INPUT0, p).r * 2.3)"));
