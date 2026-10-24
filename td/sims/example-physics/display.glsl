// ============================================================
// Physics — pass "display" → buffer "screen"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_display; Pixel Shader DAT: shader_display.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: pos buffer TOP
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]

#define uResolution (uTDOutputInfo.res.zw)
#define uTexel (uTDOutputInfo.res.xy)
#define uIteration float(uTDPass)

// Wire these on the Vectors / CHOP pages (see NETWORK.md):
uniform float uTime;       // absTime.seconds
uniform float uDt;         // 1.0/me.time.rate (or a Constant CHOP)
uniform float uFrame;      // absTime.frame
uniform vec2  uCanvasResolution; // display TOP resolution, even on data passes
uniform vec2  uMouse;      // Mouse In CHOP (normalized, y-up)
uniform vec2  uMouseVel;   // Mouse In CHOP slope (tx,ty)
uniform float uMouseDown;  // Mouse In CHOP left button
// Custom params (uForce, uRadius, …) are declared by the SHARED CORE below —
// add them on the Vectors page with the values from NETWORK.md.

// ===================== SHARED CORE =====================


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

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
