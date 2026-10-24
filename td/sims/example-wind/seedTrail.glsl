// ============================================================
// Wind — pass "seedTrail" → buffer "trail"
// GLSL TOP kernel (GLSL 4.60). AUTO-GENERATED.
// Target: TouchDesigner 2022.24200+ (Vulkan), GLSL 4.60, Vertex/Pixel.
// TOP: glsl_seed_trail; Pixel Shader DAT: shader_seed_trail.

// Output res = this TOP's res; keep it at the buffer's resolution.
// Connect inputs in this exact order:
//   (no inputs)
// ============================================================

layout(location = 0) out vec4 fragColor;


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

// 均匀分布的固定发射点不断留下细线，颜色随发射位置变化。
vec3 emit(vec2 uv, float aspect) {
    vec2 p = uv * vec2(aspect, 1.0) * 9.0;
    vec2 d = fract(p) - 0.5;
    float dotMask = exp(-dot(d, d) / 0.004);
    float hue = 0.5 + 0.5 * sin(dot(floor(p), vec2(1.1, 1.7)));
    return dotMask * mix(vec3(0.08, 0.48, 0.85), vec3(0.25, 1.0, 0.72), hue);
}

vec4 renderMain(vec2 uv, vec2 res, float time) { return vec4(emit(uv, res.x / res.y), 1.0); }

// =================== END SHARED CORE ===================

void main(){
    fragColor = TDOutputSwizzle(renderMain(vUV.st, uTDOutputInfo.res.zw, uTime));
}
