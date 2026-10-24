// ============================================================
// Noise — pass "display" → buffer "screen"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_display; Pixel Shader DAT: shader_display.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: trail buffer TOP
//   Input 1: vel buffer TOP
// ============================================================

layout(location = 0) out vec4 fragColor;
#define INPUT0 sTD2DInputs[0]
#define INPUT1 sTD2DInputs[1]

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

// INPUT0 = 示踪颜色，INPUT1 = 速度。箭头只读取已记录的风场，暂停后静止。
uniform float uShowArrows;
float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / max(dot(ab, ab), 0.00001), 0.0, 1.0));
}
vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    vec2 p = uv * vec2(aspect, 1.0) * 12.0;
    vec2 cell = floor(p), local = fract(p) - 0.5;
    vec2 center = (cell + 0.5) / (12.0 * vec2(aspect, 1.0));
    vec2 v = texture(INPUT1, center).xy * vec2(aspect, 1.0);
    vec2 dir = v / max(length(v), 0.0001), side = vec2(-dir.y, dir.x);
    vec2 q = vec2(dot(local, dir), dot(local, side));
    float arrow = min(segmentDistance(q, vec2(-0.24, 0.0), vec2(0.24, 0.0)),
                      min(segmentDistance(q, vec2(0.24, 0.0), vec2(0.09, 0.12)),
                          segmentDistance(q, vec2(0.24, 0.0), vec2(0.09, -0.12))));
    float aa = max(fwidth(p.x), fwidth(p.y));
    float ink = (1.0 - smoothstep(0.012, 0.012 + aa, arrow)) * smoothstep(0.0, 0.03, length(v));
    vec3 trail = texture(INPUT0, uv).rgb;
    vec3 col = vec3(0.018, 0.024, 0.034) + trail * 1.35;
    col += uShowArrows * ink * vec3(0.24, 0.30, 0.34);
    return vec4(clamp(col, 0.0, 1.0), 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
