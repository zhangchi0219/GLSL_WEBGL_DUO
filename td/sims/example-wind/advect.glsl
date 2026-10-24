// ============================================================
// Wind — pass "advect" → buffer "trail"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_advect; Pixel Shader DAT: shader_advect.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   Input 0: trail current state (see NETWORK.md for its exact producer)
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

uniform float uDecay;

// 均匀分布的固定发射点不断留下细线，颜色随发射位置变化。
vec3 emit(vec2 uv, float aspect) {
    vec2 p = uv * vec2(aspect, 1.0) * 9.0;
    vec2 d = fract(p) - 0.5;
    float dotMask = exp(-dot(d, d) / 0.004);
    float hue = 0.5 + 0.5 * sin(dot(floor(p), vec2(1.1, 1.7)));
    return dotMask * mix(vec3(0.08, 0.48, 0.85), vec3(0.25, 1.0, 0.72), hue);
}

vec4 renderMain(vec2 uv, vec2 res, float time) {
    float aspect = res.x / res.y;
    float dt = clamp(uDt, 0.0001, 1.0 / 30.0);
    vec2 vel = texture(INPUT1, uv).xy;
    // 中点回溯减少轨迹误差；越过边缘后清空，避免边缘纹理被拉成长带。
    vec2 mid = uv - vel * dt * 0.5;
    vec2 previous = uv - texture(INPUT1, mid).xy * dt;
    float inside = step(0.0, previous.x) * step(previous.x, 1.0) * step(0.0, previous.y) * step(previous.y, 1.0);
    vec3 trail = texture(INPUT0, previous).rgb * inside * exp(-uDecay * dt);
    vec3 ink = emit(uv, aspect);
    vec2 d = (uv - uMouse) * vec2(aspect, 1.0);
    ink += uMouseDown * exp(-dot(d, d) / 0.0012) * vec3(0.8, 0.85, 1.0);
    return vec4(clamp(max(trail, ink), 0.0, 1.0), 1.0);
}

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
