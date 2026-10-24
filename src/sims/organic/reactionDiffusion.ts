import { baseParams, fieldBuffer, shared, number, organic, display } from "./common";

export const reactionDiffusion = organic("reaction-diffusion", "Reaction–Diffusion",
  "Gray–Scott 反应扩散：两种物质在平面中反应、扩散，形成斑点和迷宫纹样。拖动注入种子；Feed、Kill 改变纹样类型。",
  [...baseParams([0.9, 0.79, 0.5]), number("uFeed", "Feed · 补给率", 0.055, 0.01, 0.08, 0.0001), number("uKill", "Kill · 移除率", 0.062, 0.03, 0.075, 0.0001), number("uDiffusion", "B 扩散比例", 0.5, 0.1, 0.8)],
  [fieldBuffer("chemicals")],
  [{ name: "seed", out: "chemicals", inputs: [], core: `${shared}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float seed = 0.0;
    for (int i = 0; i < 9; i++) {
        vec2 p = vec2(random01(uint(i * 2 + 1)), random01(uint(i * 2 + 2))) * 0.54 + 0.23;
        seed = max(seed, 1.0 - smoothstep(0.02, 0.027, length(uv - p)));
    }
    return vec4(1.0 - seed * 0.5, seed, 0.0, 1.0);
}` }],
  [{ name: "react", out: "chemicals", inputs: ["self", "clock"], iterations: 12, core: `${shared}
uniform float uFeed;
uniform float uKill;
uniform float uDiffusion;
vec4 renderMain(vec2 uv, vec2 res, float time) {
    vec2 c = texture(INPUT0, uv).rg;
    float h = min(texture(INPUT1, vec2(0.5)).z * 60.0 * 0.45, 0.9);
    if (h <= 0.0) return vec4(c, 0.0, 1.0);
    vec2 lap = -c;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        if (x == 0 && y == 0) continue;
        lap += texture(INPUT0, uv + vec2(x, y) * uTexel).rg * ((x == 0 || y == 0) ? 0.2 : 0.05);
    }
    float reaction = c.x * c.y * c.y;
    c += h * vec2(lap.x - reaction + uFeed * (1.0 - c.x), uDiffusion * lap.y + reaction - (uKill + uFeed) * c.y);
    if (uMouseDown > 0.5) c = mix(c, vec2(0.5, 1.0), (1.0 - smoothstep(0.012, 0.025, length(uv - mouseUV()))) * 0.5);
    return vec4(clamp(c, 0.0, 1.0), 0.0, 1.0);
}` }], display("chemicals", "smoothstep(0.05, 0.38, texture(INPUT0, p).g)"));
